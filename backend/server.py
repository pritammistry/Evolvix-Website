from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
import asyncio
import anthropic as _anthropic
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import logging
import base64
import io
import csv
import json
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any, Optional
import uuid
import hashlib
import secrets
import bcrypt
from datetime import datetime, timezone, timedelta
from starlette.responses import StreamingResponse
import razorpay
import resend


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Evolvix Tech Media API")
api_router = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


IST_OFFSET = timedelta(hours=5, minutes=30)


def now_ist() -> datetime:
    return datetime.now(timezone.utc) + IST_OFFSET


def slugify(value: str) -> str:
    return "-".join("".join(ch.lower() if ch.isalnum() else " " for ch in value).split())


def admin_token() -> str:
    raw = f"{os.environ['ADMIN_PASSWORD']}:{os.environ['ADMIN_TOKEN_SECRET']}"
    return hashlib.sha256(raw.encode()).hexdigest()


def verify_admin_request(request: Request) -> None:
    header = request.headers.get("Authorization", "")
    expected = f"Bearer {admin_token()}"
    cookie_token = request.cookies.get("evolvix_admin_token")
    if header != expected and cookie_token != admin_token():
        raise HTTPException(status_code=401, detail="Admin authentication required")


SESSION_DURATION_DAYS = 30


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {"id": user["id"], "email": user["email"], "name": user.get("name", "")}


async def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    await db.sessions.insert_one({
        "token": token,
        "user_id": user_id,
        "created_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=SESSION_DURATION_DAYS)).isoformat(),
    })
    return token


def session_token_from_request(request: Request) -> Optional[str]:
    token = request.cookies.get("evolvix_session_token")
    if token:
        return token
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:]
    return None


async def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    token = session_token_from_request(request)
    if not token:
        return None
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    if session.get("expires_at", "") < now_iso():
        await db.sessions.delete_one({"token": token})
        return None
    return await db.users.find_one({"id": session["user_id"]})


async def require_user(request: Request) -> Dict[str, Any]:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    return user


OTP_TTL_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 30
OTP_MAX_ATTEMPTS = 5
EMAIL_VERIFICATION_ENABLED = bool(os.environ.get("RESEND_API_KEY"))

if EMAIL_VERIFICATION_ENABLED:
    resend.api_key = os.environ["RESEND_API_KEY"]


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


async def issue_otp(user: Dict[str, Any]) -> None:
    otp = generate_otp()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "otp_hash": hash_otp(otp),
            "otp_expires_at": (datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)).isoformat(),
            "otp_attempts": 0,
            "otp_sent_at": now_iso(),
        }},
    )
    try:
        resend.Emails.send({
            "from": os.environ.get("RESEND_FROM_EMAIL", "Evolvix Tech Media <onboarding@resend.dev>"),
            "to": [user["email"]],
            "subject": "Your Evolvix verification code",
            "html": f"<p>Your Evolvix Tech Media verification code is:</p><h2 style=\"letter-spacing:4px\">{otp}</h2><p>This code expires in {OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>",
        })
    except Exception as exc:
        logger.warning("Failed to send OTP email to %s: %s", user["email"], exc)
        raise HTTPException(status_code=502, detail="Could not send verification email. Please try again in a moment.") from exc


async def issue_reset_otp(user: Dict[str, Any]) -> None:
    if not EMAIL_VERIFICATION_ENABLED:
        raise HTTPException(status_code=503, detail="Email service is not configured. Please contact support.")
    otp = generate_otp()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "otp_hash": hash_otp(otp),
            "otp_expires_at": (datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)).isoformat(),
            "otp_attempts": 0,
            "otp_sent_at": now_iso(),
        }},
    )
    try:
        resend.Emails.send({
            "from": os.environ.get("RESEND_FROM_EMAIL", "Evolvix Tech Media <onboarding@resend.dev>"),
            "to": [user["email"]],
            "subject": "Reset your Evolvix password",
            "html": f"<p>Your Evolvix Tech Media password reset code is:</p><h2 style=\"letter-spacing:4px\">{otp}</h2><p>This code expires in {OTP_TTL_MINUTES} minutes. If you didn't request this, you can safely ignore this email.</p>",
        })
    except Exception as exc:
        logger.warning("Failed to send reset email to %s: %s", user["email"], exc)
        raise HTTPException(status_code=502, detail="Could not send reset email. Please try again in a moment.") from exc


OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "evolvixtech0pm@gmail.com")
FROM_EMAIL = lambda: os.environ.get("RESEND_FROM_EMAIL", "Evolvix Tech Media <onboarding@resend.dev>")


def send_notification_email(to: str, subject: str, html: str) -> None:
    if not EMAIL_VERIFICATION_ENABLED:
        return
    try:
        resend.Emails.send({"from": FROM_EMAIL(), "to": [to], "subject": subject, "html": html})
    except Exception as exc:
        logger.warning("Notification email to %s failed: %s", to, exc)


ORDERS_FROM_EMAIL = lambda: os.environ.get("RESEND_ORDERS_FROM_EMAIL", os.environ.get("RESEND_FROM_EMAIL", "Evolvix Store <onboarding@resend.dev>"))

_PURCHASE_CONFIRMATION_HTML = """\
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f0f2f7">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation"
             style="max-width:600px;width:100%;background:#0a0f1c;border-radius:14px;overflow:hidden">
        <tr><td style="background:#13dff4;padding:28px 32px;text-align:center">
          <p style="color:#0a0f1c;font-size:20px;font-weight:800;margin:0;letter-spacing:0.05em">EVOLVIX TECH MEDIA</p>
          <p style="color:#0a0f1c;font-size:13px;margin:6px 0 0;opacity:0.75">Order Confirmed ✓</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 6px">Hi {customer_name},</p>
          <p style="color:#9ca3af;font-size:14px;margin:0 0 28px;line-height:1.6">Thank you for your purchase! Your digital download is ready and waiting for you.</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                 style="background:#111827;border-radius:10px;margin-bottom:28px">
            <tr><td style="padding:22px 24px">
              <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 6px">PRODUCT</p>
              <p style="color:#ffffff;font-size:16px;font-weight:700;margin:0 0 18px">{product_title}</p>
              <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 6px">AMOUNT PAID</p>
              <p style="color:#13dff4;font-size:26px;font-weight:800;margin:0">&#8377;{amount}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px">
            <tr><td align="center" style="padding-bottom:16px">
              <a href="{download_url}"
                 style="display:inline-block;background:#13dff4;color:#0a0f1c;text-decoration:none;font-weight:800;font-size:15px;padding:15px 36px;border-radius:9px;letter-spacing:0.02em">
                Access Your Download &rarr;
              </a>
            </td></tr>
            <tr><td align="center">
              <a href="{invoice_url}"
                 style="display:inline-block;color:#13dff4;text-decoration:none;font-size:13px;padding:10px 22px;border:1.5px solid rgba(19,223,244,0.4);border-radius:8px">
                Download GST Invoice (PDF)
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:22px 32px;border-top:1px solid #1a2035">
          <p style="color:#6b7280;font-size:13px;margin:0 0 8px">Questions? We&rsquo;re here:</p>
          <p style="color:#9ca3af;font-size:13px;margin:0">
            &#128222; +91 98318 42869 &nbsp;&middot;&nbsp;
            <a href="https://wa.me/919831842869?text=Hi!%20I%20have%20a%20question%20about%20my%20Evolvix%20purchase."
               style="color:#13dff4;text-decoration:none">&#128172; WhatsApp us</a>
          </p>
          <p style="color:#4b5563;font-size:11px;margin:14px 0 0">
            Evolvix Tech Media &middot; evolvixtech.in &middot; Bardhaman, West Bengal, India
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_purchase_confirmation(session_id: str) -> None:
    if not EMAIL_VERIFICATION_ENABLED:
        return
    try:
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction or transaction.get("confirmation_email_sent"):
            return
        user = await db.users.find_one({"id": transaction.get("user_id")})
        if not user or not user.get("email"):
            logger.warning("No user/email for purchase confirmation: %s", session_id)
            return
        catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
        products = normalize_catalog_items(
            catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values()), "products"
        )
        product_id = transaction.get("product_id")
        product = next(
            (p for p in products if p.get("id") == product_id or p.get("slug") == product_id), {}
        )
        product_title = product.get("title", "Your Evolvix Product")
        amount = transaction.get("amount", 0)
        amount_str = f"{float(amount):.0f}" if amount else "—"
        origin = os.environ.get("FRONTEND_URL", "https://evolvixtech.in")
        download_url = f"{origin}/checkout/success?session_id={session_id}&product={product.get('slug', product_id or '')}"
        invoice_url = f"https://evolvix-website.onrender.com/api/payments/{session_id}/invoice"
        customer_name = user.get("name") or user["email"].split("@")[0].capitalize()
        html = _PURCHASE_CONFIRMATION_HTML.format(
            customer_name=customer_name,
            product_title=product_title,
            amount=amount_str,
            download_url=download_url,
            invoice_url=invoice_url,
        )
        send_result = resend.Emails.send({
            "from": ORDERS_FROM_EMAIL(),
            "to": [user["email"]],
            "subject": f"Your Evolvix purchase is confirmed — {product_title}",
            "html": html,
        })
        logger.info("Purchase confirmation sent to %s for session %s (resend id: %s)", user["email"], session_id, send_result)
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"confirmation_email_sent": True, "confirmation_email_sent_at": now_iso()}},
        )
    except Exception as exc:
        logger.error("PURCHASE CONFIRMATION EMAIL FAILED for session %s → from=%s to=%s error=%s", session_id, ORDERS_FROM_EMAIL(), user.get("email"), exc)


DEFAULT_SITE_CONTENT: Dict[str, Any] = {
    "brand": {
        "name": "Evolvix Tech Media",
        "tagline": "CREATE • INNOVATE • ELEVATE",
        "headline": "Empowering People & Businesses Through AI.",
        "subheadline": "AI • Digital • Business • Creative Solutions",
        "vision": "We're a technology and creative solutions company helping individuals and businesses turn ideas into intelligent digital outcomes — combining creativity, technology, and AI to drive real growth, efficiency, and impact.",
        "gstin": "19BVTPM1874M1ZK",
        "core_areas": ["AI", "Digital", "Business", "Creative Solutions"],
    },
    "contact": {
        "address": "Chhotonilpur, Bardhaman, West Bengal 713103",
        "phone": "+91 98318 42869",
        "whatsapp": "+91 98318 42869",
        "email": "evolvixtech0pm@gmail.com",
        "facebook": "https://facebook.com/evolvixtech",
        "google_location": "https://www.google.com/maps?cid=2428437874850568706",
        "gumroad": "https://gumroad.com/",
        "website_status": "Coming Soon",
    },
    "about": {
        "title": "Humanizing the digital AI era.",
        "intro": "Evolvix Tech Media exists because the future should not feel confusing, cold, or reserved for experts. It should feel approachable, useful, and creative for every age and skill level.",
        "description": "Evolvix Tech Media is a technology and creative solutions company helping individuals and businesses transform ideas into intelligent digital outcomes. We combine creativity, technology, and AI to deliver solutions that drive growth, efficiency, and real impact.",
        "why_title": "Why Evolvix exists",
        "why_text": "The brand helps people cope with change, learn practical AI skills, discover useful digital products, and experience creative media that speaks to emotion and mood.",
        "mission_title": "The mission",
        "mission_text": "Simplify technology without reducing its power. Give students, professionals, parents, elderly users, and creators tools that make growth feel possible.",
        "creative_title": "The creative side",
        "creative_text": "AI music and mood-based digital expression bring feeling into the technology conversation, connecting calm, focus, nostalgia, energy, romance, and reflection.",
        "values": ["Clarity", "Creativity", "Innovation", "Accessibility", "Trust"],
        "what_we_do": [
            {"title": "We Create", "text": "Design, content, and digital experiences that bring ideas to life."},
            {"title": "We Build", "text": "Websites, apps, software, and AI-powered products built to last."},
            {"title": "We Automate", "text": "Workflows and business processes that save time and reduce friction."},
            {"title": "We Grow", "text": "Strategy and support that turns early traction into lasting growth."},
        ],
    },
    "trust_strip": ["AI – Smarter Solutions", "Digital – Powerful Experiences", "Business – Scalable Growth", "Creative – Impactful Designs"],
    "how_we_work": [
        {"step": "Discover", "text": "We learn your goals, audience, and constraints before proposing anything."},
        {"step": "Strategize", "text": "We map the right mix of creative, technology, and AI for your specific situation."},
        {"step": "Design & Develop", "text": "We build the actual deliverable — designs, code, workflows, or content."},
        {"step": "Deploy & Test", "text": "We launch, verify everything works as intended, and fix what needs fixing."},
        {"step": "Grow & Support", "text": "We stay involved after launch — updates, support, and next steps."},
    ],
    "industries_served": ["Education", "Healthcare", "Real Estate", "E-commerce", "Manufacturing", "Startups", "Corporate", "Retail", "Finance"],
    "creative_services": [
        {"title": "AI Resume & CV Design", "text": "Stand out. Get noticed."},
        {"title": "Professional Portfolio Design", "text": "Showcase your best work."},
        {"title": "Company Profile Design", "text": "Build trust. Create impact."},
        {"title": "Logo & Brand Identity", "text": "Create identity. Build brand."},
        {"title": "AI Photo Enhancement", "text": "Clean, sharpen, and upgrade images with AI-supported editing."},
        {"title": "Old Photo Restoration", "text": "Restore damaged, faded, or old memories with careful digital enhancement."},
        {"title": "Posters, Banners & Social Media Creatives", "text": "Engage. Impress. Convert."},
        {"title": "Product Catalog Design", "text": "Showcase your products beautifully."},
        {"title": "Presentation & Pitch Deck Design", "text": "Present with impact. Win more."},
    ],
    "technology_services": [
        {"title": "AI Business Consulting", "text": "Smart strategies. Real growth."},
        {"title": "Digital Transformation", "text": "Transform ideas into digital reality."},
        {"title": "Business Process Automation", "text": "Automate. Optimize. Scale."},
        {"title": "AI Workflow Design", "text": "Work smarter. Save time."},
        {"title": "Website Development", "text": "Business portfolio and e-commerce websites."},
        {"title": "Web Applications", "text": "Custom, scalable, and secure applications."},
        {"title": "Mobile Applications", "text": "Android, iOS, and cross-platform solutions."},
        {"title": "SaaS Solutions", "text": "Cloud-based, scalable, future-ready product systems."},
        {"title": "Business Software", "text": "Custom tools for operations, workflow, teams, and business growth."},
        {"title": "Digital Marketing", "text": "Grow online. Reach more."},
    ],
    "ecosystem": [
        {"name": "Evolvix LearnAI", "status": "Now on Gumroad", "description": "AI Learning & Productivity Packs — everything you need to learn, grow, and work smarter with AI. Ready to buy and use immediately.", "items": ["AI Prompt Packs", "Learning Resources", "Business Packs", "Career Packs", "Creator Packs", "Productivity Packs"]},
        {"name": "Evolvix BuildX", "status": "On-Demand", "description": "AI Powered Digital Products — custom-built web apps, mobile applications, business software, enterprise SaaS, and AI-powered digital products.", "items": ["Web Applications", "Mobile Applications", "Business Software", "Enterprise SaaS", "AI Powered Products"]},
        {"name": "Evolvix Creative", "status": "On-Demand", "description": "Branding, Design & Creative Solutions — identity systems, graphic design, digital assets, multimedia design, and presentation decks built for impact.", "items": ["Branding & Identity", "Graphic Design", "Digital Assets", "Multimedia Design", "Pitch Decks", "ATS-Friendly Resume Building", "Resume Design"]},
        {"name": "Evolvix Business", "status": "On-Demand", "description": "AI Business Consulting & Automation — smart strategies, process automation, CRM solutions, SaaS planning, and growth strategy for forward-thinking businesses.", "items": ["AI Business Consulting", "Business Automation", "CRM Solutions", "SaaS Solutions", "Growth Strategy"]},
    ],
    "learning_categories": ["AI Prompt Packs", "Business Prompt Packs", "Career Prompt Packs", "Student Prompt Packs", "Creator Prompt Packs", "Productivity Prompt Packs", "Marketing Prompt Packs", "Coding Prompt Packs", "AI Learning Guides", "AI Cheat Sheets", "AI Templates", "AI Workbooks", "AI Support for Everyday Learning", "Grow Yourself Using AI", "AI Learning for Beginners", "Smart AI Routines", "Future AI Courses", "Future Certifications"],
    "music_services": ["AI Background Music for Reels", "Social Media Creator Music Packs", "Mood-Based Background Tracks", "AI Music for Videos", "Short-form Content Music", "Brand Theme Music", "Podcast Intros", "Ambient Music", "Sound Design", "Creator Audio Branding"],
    "music_previews": [
        {"id": "mp-pin-drop-chaos", "mood": "Featured Creator", "title": "Pin Drop Chaos", "description": "Original tracks and creative audio drops from Pin Drop Chaos — follow on YouTube and Facebook for new releases.", "audio_url": "https://www.youtube.com/@PinDropChaos-t8i", "secondary_url": "https://www.facebook.com/people/Pin-Drop-Chaos/61589625935745", "secondary_label": "Facebook", "visible": True},
        {"id": "mp-ember-sounds-by-pritam", "mood": "Featured Creator", "title": "Ember Sounds by Pritam", "description": "New music releases from Ember Sounds by Pritam — follow on YouTube for the latest drops.", "audio_url": "https://www.youtube.com/@EmberSoundsbyPritam", "visible": True},
    ],
    "analytics_report_settings": {"enabled": False, "frequency": "weekly", "owner": "", "sections": "Visits, clicks, forms, sections, products"},
    "custom_sections": [
        {
            "title": "Custom Evolvix Section",
            "eyebrow": "Editable Section",
            "description": "Use the admin dashboard to create any new website section, update its cards, or hide it whenever needed.",
            "cta_label": "Contact Evolvix",
            "cta_url": "/contact",
            "visible": True,
            "cards": [
                {"title": "Fully editable", "text": "Create custom cards, service groups, offers, or announcements from the admin panel."},
                {"title": "Backend controlled", "text": "Changes are stored in MongoDB and reflected on the public website."},
            ],
        }
    ],
    "testimonials": [
        {"id": "t1", "name": "Local Business Owner", "role": "Small Business", "quote": "Evolvix makes AI and digital growth feel practical, clear, and business-ready.", "rating": 5, "visible": True},
        {"id": "t2", "name": "Creator Client", "role": "Digital Creator", "quote": "The creative direction feels premium, futuristic, and easy to turn into real content.", "rating": 5, "visible": True},
        {"id": "t3", "name": "Learning User", "role": "AI Beginner", "quote": "The learning resources are structured in a simple way that builds confidence step by step.", "rating": 5, "visible": True},
    ],
    "why_choose": ["AI-first approach", "Personalized solutions", "Future-ready technology", "Business-focused innovation", "Creative excellence", "End-to-end support"],
    "demos": [
        {"id": "optical-catalog", "title": "Smart Store — Spectacle Shop", "industry": "Retail / Optical", "description": "A fully branded digital catalog for an optical retailer. Customers browse frames, lenses, and accessories with a 'Show Interest' flow that feeds directly into a live leads dashboard.", "features": ["Product catalog with categories", "Show Interest / enquiry flow", "Live leads dashboard", "Mobile-first design"], "url": "https://evolvix-catalog-demo.vercel.app", "icon_key": "shopping", "status": "Live Demo", "visible": True},
        {"id": "invoice-management", "title": "Invoice & Billing Management App", "industry": "Finance / Accounting", "description": "A smart billing dashboard for small businesses — generate GST invoices, track payments, manage clients, and export reports.", "features": ["GST invoice generation", "Payment tracking", "Client management", "Report export"], "url": "", "icon_key": "chart", "status": "Coming Soon", "visible": True},
        {"id": "saas-crm-automation", "title": "SaaS CRM & Automation Demo", "industry": "SaaS / Tech Products", "description": "A full CRM with lead pipeline, automated follow-ups, task management, and team dashboard — built for SaaS and service businesses.", "features": ["Lead pipeline board", "Automated follow-ups", "Task & team management", "Analytics dashboard"], "url": "", "icon_key": "zap", "status": "Coming Soon", "visible": True},
    ],
}


def merged_site_content(custom_content: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    merged = {**DEFAULT_SITE_CONTENT, **(custom_content or {})}
    merged["brand"] = {**DEFAULT_SITE_CONTENT["brand"], **(custom_content or {}).get("brand", {})}
    merged["contact"] = {**DEFAULT_SITE_CONTENT["contact"], **(custom_content or {}).get("contact", {})}
    merged["about"] = {**DEFAULT_SITE_CONTENT["about"], **(custom_content or {}).get("about", {})}
    if not merged["about"].get("what_we_do"):
        merged["about"]["what_we_do"] = DEFAULT_SITE_CONTENT["about"]["what_we_do"]
    if not merged["about"].get("values"):
        merged["about"]["values"] = DEFAULT_SITE_CONTENT["about"]["values"]
    merged["analytics_report_settings"] = {**DEFAULT_SITE_CONTENT["analytics_report_settings"], **(custom_content or {}).get("analytics_report_settings", {})}
    for list_key in ["trust_strip", "how_we_work", "industries_served", "creative_services", "technology_services", "ecosystem", "learning_categories", "music_services", "music_previews", "custom_sections", "testimonials", "why_choose", "demos"]:
        if not merged.get(list_key):
            merged[list_key] = DEFAULT_SITE_CONTENT[list_key]
    return merged


PRODUCTS: Dict[str, Dict[str, Any]] = {
    "ai-starter-kit": {
        "id": "ai-starter-kit", "slug": "ai-starter-kit", "title": "AI Starter Kit for Everyday Productivity",
        "price": 29.00, "currency": "inr", "category": "Learning and Growth", "tag": "Best Seller",
        "description": "Simple prompt systems, checklists, and workflows for students, professionals, parents, and beginners.",
        "benefits": ["Understand AI without overwhelm", "Save hours on common tasks", "Use plain-language templates"],
        "included": ["Prompt library", "Beginner guide", "Productivity checklist", "Update notes"],
        "delivery": "Instant digital delivery after successful checkout.",
        "license": "Personal and small-team use. Redistribution is not included.",
        "image": "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://gumroad.com/"
    },
    "creator-assets-bundle": {
        "id": "creator-assets-bundle", "slug": "creator-assets-bundle", "title": "Creator Assets Glow Bundle",
        "price": 39.00, "currency": "inr", "category": "Brand Assets", "tag": "Featured",
        "description": "Premium digital overlays, launch graphics, and brand blocks for social posts and digital products.",
        "benefits": ["Build a polished visual presence", "Speed up product launches", "Reusable across campaigns"],
        "included": ["Editable graphics", "Social templates", "Cover art textures", "Usage guide"],
        "delivery": "Download link delivered after payment confirmation.",
        "license": "Commercial use for your own brand or client work; resale as a template pack is not included.",
        "image": "https://images.unsplash.com/photo-1635776063043-ab23b4c226f6?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://gumroad.com/"
    },
    "mood-music-pack": {
        "id": "mood-music-pack", "slug": "mood-music-pack", "title": "Mood Music Prompt Pack",
        "price": 19.00, "currency": "inr", "category": "Music", "tag": "New",
        "description": "Emotion-led creative prompts for AI-assisted music ideas, scene moods, and storytelling sound palettes.",
        "benefits": ["Translate feelings into creative directions", "Explore calm, focus, cinematic, and nostalgic moods", "Ideal for creators and music lovers"],
        "included": ["Mood prompt cards", "Creative briefs", "Track naming ideas", "Expansion notes"],
        "delivery": "Digital PDF and editable notes delivered after checkout.",
        "license": "Personal creative use. Generated outputs belong to the user subject to platform terms.",
        "image": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://gumroad.com/"
    },
    "digital-brand-audit": {
        "id": "digital-brand-audit", "slug": "digital-brand-audit", "title": "Digital Brand Audit Template",
        "price": 49.00, "currency": "inr", "category": "Business", "tag": "Bundle",
        "description": "A structured audit kit for small businesses to improve trust, content, offers, and digital presence.",
        "benefits": ["Identify trust gaps", "Improve your product presentation", "Plan your next content moves"],
        "included": ["Audit worksheet", "Scorecard", "Action plan board", "Client-ready summary template"],
        "delivery": "Instant digital delivery after payment confirmation.",
        "license": "Use internally or with clients. Public resale is not included.",
        "image": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://gumroad.com/"
    },
    "digital-forward-2": {
        "id": "digital-forward-2", "slug": "digital-forward-2", "title": "Digital Forward 2.0 Bundle",
        "price": 59.00, "currency": "inr", "category": "Bundle", "tag": "Featured",
        "description": "A premium future-readiness pack combining AI prompts, digital planning sheets, and creator/business clarity tools.",
        "benefits": ["Plan your next digital move", "Package learning and creation together", "Build confidence for AI-era workflows"],
        "included": ["AI readiness workbook", "Creator product planner", "Digital support scripts", "Launch checklist"],
        "delivery": "Digital bundle delivery details are shown after payment confirmation.",
        "license": "Personal, creator, and small-business use. Resale as a standalone bundle is not included.",
        "image": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://gumroad.com/",
        "file_slots": ["Digital Forward Workbook PDF", "Creator Planner Spreadsheet", "Support Script Library"]
    },
    "ai-confidence-workbook": {
        "id": "ai-confidence-workbook", "slug": "ai-confidence-workbook", "title": "AI Confidence Workbook",
        "price": 24.00, "currency": "inr", "category": "Learning and Growth", "tag": "New",
        "description": "A gentle step-by-step workbook for beginners, parents, and elderly users learning AI safely.",
        "benefits": ["Learn AI at a calm pace", "Understand everyday use cases", "Reduce fear around new tools"],
        "included": ["Guided workbook", "Safety checklist", "Family support prompts"],
        "delivery": "Digital workbook delivery details are shown after payment confirmation.",
        "license": "Personal and family learning use. Redistribution is not included.",
        "image": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://gumroad.com/",
        "file_slots": ["AI Confidence Workbook PDF", "Safe AI Checklist PDF", "Family Help Cards PDF"]
    },
    "mood-to-music-creation-kit": {
        "id": "mood-to-music-creation-kit", "slug": "mood-to-music-creation-kit", "title": "Mood-to-Music Creation Kit",
        "price": 27.00, "currency": "inr", "category": "Music", "tag": "Featured",
        "description": "A creative system for turning emotion, color, and story into AI-assisted music directions.",
        "benefits": ["Map emotions into sonic palettes", "Build stronger creative prompts", "Develop music concepts by mood"],
        "included": ["Mood map", "Sound palette cards", "Story-to-song worksheet"],
        "delivery": "Creative kit delivery details are shown after payment confirmation.",
        "license": "Personal creative use and client ideation use. Resale is not included.",
        "image": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://gumroad.com/",
        "file_slots": ["Mood Map PDF", "Sound Palette Card Deck", "Story-to-Song Worksheet"]
    },
    "creator-store-launch-vault": {
        "id": "creator-store-launch-vault", "slug": "creator-store-launch-vault", "title": "Creator Store Launch Vault",
        "price": 69.00, "currency": "inr", "category": "Bundle", "tag": "Best Seller",
        "description": "A premium launch kit for creators preparing digital products, sales pages, and promo content.",
        "benefits": ["Prepare a cleaner product launch", "Write stronger product page copy", "Organize social launch content"],
        "included": ["Store launch planner", "Product copy kit", "Promo calendar"],
        "delivery": "Launch vault delivery details are shown after payment confirmation.",
        "license": "Personal creator and small-business use. Resale as a vault is not included.",
        "image": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://gumroad.com/",
        "file_slots": ["Launch Planner PDF", "Product Copy Templates DOCX", "30-Day Promo Calendar Spreadsheet"]
    }
}

PORTFOLIO = [
    {"id": "p1", "title": "AI Learning Journey", "category": "Learning and Growth", "summary": "Beginner-friendly AI education system for everyday users.", "image": "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p2", "title": "Mood Sound Worlds", "category": "Music", "summary": "Emotion-based concept collections for AI-assisted music storytelling.", "image": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p3", "title": "Creator Launch Kit", "category": "Digital Products", "summary": "Reusable creator assets and store-ready product visuals.", "image": "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p4", "title": "Small Business Tech Clarity", "category": "Business", "summary": "Practical digital transformation support for non-technical teams.", "image": "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p5", "title": "Accessible AI Guides", "category": "Accessibility", "summary": "Warm, readable guides designed for older users and families.", "image": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p6", "title": "Brand Identity Lab", "category": "Brand Assets", "summary": "Futuristic visual systems for high-trust creator brands.", "image": "https://images.unsplash.com/photo-1609921212029-bb5a28e60960?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p7", "title": "Evolvix Brand Launch System", "category": "Brand Assets", "summary": "A polished identity rollout framework for logo usage, color, tone, and premium trust signals.", "image": "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p8", "title": "Student AI Productivity Map", "category": "Learning and Growth", "summary": "A practical study workflow concept that turns assignments, revision, and planning into guided AI routines.", "image": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p9", "title": "Creator Storefront Blueprint", "category": "Digital Products", "summary": "Product packaging, pricing, and sales-page structure for creators selling digital downloads.", "image": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p10", "title": "Calm Focus Mood Collection", "category": "Music", "summary": "A mood-first creative direction set for calm, focused, reflective, and late-night AI-assisted sound worlds.", "image": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p11", "title": "Elder-Friendly Tech Support Kit", "category": "Accessibility", "summary": "Simple scripts, visual aids, and confidence-building support flows for older users navigating digital tools.", "image": "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p12", "title": "Small Business AI Readiness Audit", "category": "Business", "summary": "A clear checklist-based audit for small teams deciding where AI can save time and improve service.", "image": "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=80"}
]

BLOG_POSTS = [
    {"id": "b1", "slug": "five-ai-prompts-every-job-seeker-in-india-should-know", "title": "5 AI Prompts Every Job Seeker in India Should Know", "category": "Career & Learning", "read_time": "6 min", "date": "2026-06-18", "excerpt": "Five practical prompts that turn a blank resume or nervous interview prep into a clear, structured plan — the same ones inside our Career Launch Prompt Pack.",
     "seo_title": "5 AI Prompts Every Job Seeker in India Should Know | Evolvix", "seo_description": "Struggling to get noticed in India\'s job market? These 5 AI prompts fix your resume, prep your interviews, and help you negotiate salary — in minutes.", "seo_keywords": "AI prompts job seekers India, AI resume writing, AI interview prep, career AI tools, job search India AI, LinkedIn AI optimization, salary negotiation AI",
     "body": "Job hunting in India right now means competing with hundreds of applicants for the same listing, often with no feedback on why an application went nowhere. AI won\'t get you hired on its own, but used well, it removes the blank-page problem at every stage.\n\nHere are five prompts worth keeping on hand. \U0001f680\n\n1️⃣ Resume tailoring: \"Here is my resume and this job description. Rewrite my summary and top 3 bullet points to speak directly to what this role is asking for, without inventing any experience I don\'t have.\" This forces the AI to work from your real background, not generic filler.\n\n2️⃣ Interview story structure: \"Help me turn this rough work story into a structured STAR-format answer (Situation, Task, Action, Result) for a behavioral interview question about teamwork.\" Most candidates have the right stories but tell them in a rambling order — this fixes that.\n\n3️⃣ Cover letter without the clichés: \"Write a short, specific cover letter for this role. Avoid generic phrases like \'passionate\' or \'hard-working\' — focus on one concrete reason I\'m a fit.\" Being explicit about banning clichés genuinely changes the output.\n\n4️⃣ LinkedIn headline and summary: \"Rewrite my LinkedIn headline and About section to target recruiters searching for [your target role], based on my actual skills below.\" Recruiters search LinkedIn like a database — this prompt optimizes for that.\n\n5️⃣ Salary conversation prep: \"I\'ve been offered ₹X for this role in [city]. Help me research a reasonable range and draft three ways to ask for more without sounding confrontational.\" Negotiation is uncomfortable precisely because people don\'t prepare language in advance.\n\nThese five prompts, plus about a dozen more organized by career stage, are what make up the Career Launch Prompt Pack in the Store — built for exactly this kind of practical, no-nonsense job search support. \U0001f4bc"},
    {"id": "b2", "slug": "ai-photo-restoration-reviving-old-family-photos", "title": "AI Photo Restoration: Reviving Old Family Photos", "category": "Creative Services", "read_time": "5 min", "date": "2026-06-11", "excerpt": "How AI-supported restoration brings faded, torn, or water-damaged family photographs back to life — and what to expect before you send one in.",
     "seo_title": "AI Photo Restoration: Reviving Old Family Photos | Evolvix Tech Media", "seo_description": "How AI-supported restoration brings faded, torn, or water-damaged family photographs back to life — and what to realistically expect from the process.", "seo_keywords": "AI photo restoration India, old photo restoration service, restore damaged family photos, AI photo enhancement, photo repair India, faded photo restoration",
     "body": "\U0001f4f8 Almost every family has a box of old photographs somewhere — a wedding picture with a crease through the middle, a childhood photo faded almost to nothing, a group photo with a water stain across one corner. These aren\'t just images, they\'re the only copies of moments that can\'t be recreated.\n\nAI-supported restoration has gotten genuinely good at specific kinds of damage: color fading and yellowing, minor tears and creases, low resolution and blur, and scratches or dust spots from old prints. What it\'s less reliable at, at least without careful manual correction, is reconstructing large missing sections or guessing details that were never actually visible in the original.\n\n✨ The honest way to think about it: AI tools do the heavy lifting on tone, clarity, and damage removal very fast, but the difference between a restoration that looks right and one that looks slightly uncanny is almost always in the manual review afterward — checking that skin tones look natural, that reconstructed edges make sense, that nothing has drifted from what the photo actually showed.\n\nThat\'s the step we add on top of the automated tools for every restoration — a human pass to make sure the result looks like a real memory, not an AI\'s best guess at one. \U0001f5bc️\n\nIf you have a photo you\'ve been meaning to restore, the AI Photo Enhancement and Old Photo Restoration service on our Services page is exactly built for this — send over the original scan or photo of the photo, and we\'ll walk you through what\'s realistically achievable before any work starts."},
    {"id": "b3", "slug": "behind-pin-drop-chaos-ai-and-human-feeling", "title": "Behind Pin Drop Chaos: How AI and Human Feeling Make Music Together", "category": "Music & Sound", "read_time": "5 min", "date": "2026-06-04", "excerpt": "A look at how Pin Drop Chaos blends AI-assisted composition with real emotional direction — and why neither half works alone.",
     "seo_title": "Behind Pin Drop Chaos: How AI and Human Feeling Make Music | Evolvix", "seo_description": "How Pin Drop Chaos and Ember Sounds by Pritam blend AI-assisted composition with human emotion — and why neither half of the process works alone.", "seo_keywords": "AI music India, Pin Drop Chaos, Ember Sounds by Pritam, AI music composition, AI assisted songwriting, music creator India, AI generated music human emotion",
     "body": "\U0001f3b5 Pin Drop Chaos started as an experiment: what happens if you use AI music tools not to replace songwriting, but to get past the parts of songwriting that usually stall a track before it\'s finished — a chord progression that goes nowhere, a production idea that\'s hard to execute alone, a mood that\'s clear in your head but hard to translate into an actual arrangement.\n\nThe AI half of the process is fast. It can generate variations, suggest instrumentation, and get a rough version of an idea onto a timeline in minutes instead of hours. But left alone, AI-generated music tends toward technically correct and emotionally flat — it doesn\'t know what a track is supposed to feel like to the person who imagined it. \U0001f3db️\n\nThat\'s where the human half comes in: deciding which generated idea actually captures the feeling, rejecting the ones that are close but wrong, and manually shaping the parts — a vocal take, a specific transition, a deliberately imperfect moment — that make a track feel like it was made by someone rather than generated for someone.\n\n\U0001f3b8 Ember Sounds by Pritam works the same way, on a quieter, more atmospheric side of the same idea — using the same AI-assisted process but aimed at mood and ambient texture rather than the more energetic direction Pin Drop Chaos leans into.\n\nBoth projects live under Evolvix\'s Creative pillar, and honestly, that\'s the whole point of putting music here at all: creative work benefits from AI the same way business work does, as long as a person stays in charge of what actually matters — the feeling. \U0001f3b6 You can follow both projects\' latest releases from the Music page."},
    {"id": "b4", "slug": "gst-for-digital-products-in-india", "title": "GST for Digital Products in India: What Small Businesses Need to Know", "category": "Business & Compliance", "read_time": "7 min", "date": "2026-05-28", "excerpt": "CGST+SGST or IGST? Here\'s a plain-language walkthrough of how GST actually applies when you sell digital products online in India.",
     "seo_title": "GST for Digital Products in India: What Sellers Need to Know | Evolvix", "seo_description": "CGST+SGST or IGST? A plain-language guide to how GST applies when you sell digital products online in India — for small businesses and solo creators.", "seo_keywords": "GST digital products India, GST online sellers India, digital product tax India, CGST SGST IGST, SAC code digital products, GST compliance small business India, GST invoice digital",
     "body": "\U0001f4cb If you sell digital products in India — e-books, prompt packs, courses, templates — GST still applies, and getting the tax split wrong on invoices is a common, avoidable mistake for small sellers.\n\nThe core rule is simpler than it sounds: if your business and your customer are in the same state, you charge CGST + SGST, split evenly (9% + 9% for an 18% product, for example). If your customer is in a different state than your registered business address, you charge IGST instead, at the full rate (18%). This is determined by the customer\'s billing state versus your business\'s registered state — not by where the payment happens to be processed from. \U0001f5fa️\n\nDigital products are usually classified under an SAC (Services Accounting Code) rather than an HSN code, since they\'re treated as a service supply rather than physical goods. The exact SAC depends on the specific product category, and it\'s worth confirming yours with a GST practitioner — but the important part is that it\'s recorded on your internal records for GST return filing.\n\n\U0001f4c4 Every invoice you issue should show: your business name, address, and GSTIN; a sequential invoice number; the invoice date; the customer\'s name and email; a description of what was sold; the taxable value; the GST rate applied; the tax breakdown (CGST+SGST or IGST); and the total amount charged.\n\nWe went through exactly this process building GST-compliant invoicing into our own Store checkout — capturing the customer\'s state at signup, computing the correct split automatically, and generating a properly numbered invoice the moment a payment is confirmed. If you\'re building something similar and want a second opinion on the setup, that\'s a conversation we\'re happy to have. \U0001f4ac"},
    {"id": "b5", "slug": "five-signs-your-business-needs-business-process-automation", "title": "5 Signs Your Business Needs Business Process Automation", "category": "Business Consulting", "read_time": "5 min", "date": "2026-05-21", "excerpt": "If your team is still doing this manually, automation will pay for itself faster than you think. Five signs it\'s time.",
     "seo_title": "5 Signs Your Small Business Needs Business Process Automation | Evolvix", "seo_description": "Still managing follow-ups and data re-entry manually? These 5 warning signs say business process automation will pay for itself faster than you think.", "seo_keywords": "business process automation India, BPA small business, automate business workflow India, CRM automation India, business efficiency AI, manual process automation",
     "body": "Automation has a reputation for being something only large companies need. In practice, it\'s often small and mid-size businesses that benefit fastest, because a few hours saved per week matters more when your team is smaller. ⚡\n\nHere are five signs it\'s worth a real look:\n\n⚠️ 1. Someone is manually re-typing the same information into two different places — an order into a spreadsheet, then again into an invoice tool, then again into a customer record. Every manual re-entry is a chance for a typo and a few minutes you won\'t get back.\n\n⚠️ 2. Follow-ups depend on someone remembering to do them. If a lead goes cold because nobody circled back in time, that\'s not a people problem, it\'s a systems problem — and it\'s exactly what automated reminders and CRM workflows solve.\n\n⚠️ 3. Growth is outpacing headcount. If the business is getting busier but you can\'t hire fast enough to keep up manually, automation is often cheaper and faster to put in place than a new hire, especially for repetitive tasks.\n\n⚠️ 4. Errors keep happening at the same handoff point. When work passes from one person or system to another manually, that\'s where mistakes cluster — automating the handoff itself usually fixes more than retraining the people involved.\n\n⚠️ 5. Nobody can answer how you\'re doing this month without pulling together numbers from three different places. If reporting takes half a day to assemble, it\'s not something anyone will do consistently, which means decisions get made on gut feeling instead of real numbers.\n\nIf two or more of these sound familiar, it\'s usually a sign that a focused automation project — not a full system overhaul — would pay for itself within a few months. That\'s the starting point for most of the Business Process Automation work we do. \U0001f680"},
    {"id": "b6", "slug": "rebuilding-a-local-retailers-product-catalog", "title": "Rebuilding a Local Retailer\'s Product Catalog for the Digital Shelf", "category": "Case Study", "read_time": "6 min", "date": "2026-05-14", "excerpt": "A behind-the-scenes look at turning a small retailer\'s product photos into a consistent, browsable digital catalog — without a big production budget.",
     "seo_title": "Rebuilding a Local Retailer\'s Product Catalog for the Digital Shelf | Evolvix", "seo_description": "How we turned inconsistent phone photos from a small local retailer into a consistent, browsable digital catalog — without a big photography budget.", "seo_keywords": "digital catalog local business India, retail catalog design, product photography catalog India, digital catalog small business, spectacle shop digital catalog, product catalog template India",
     "body": "\U0001f6d2 A local optical retailer came to us with a familiar problem: dozens of eyewear frames, inconsistent photos taken at different times on different phones, and no simple way for customers to browse what was actually in stock without visiting in person.\n\nThe brief was straightforward but the execution mattered a lot: every frame needed to look like it belonged in the same catalog, even though the source photos didn\'t. We settled on a repeatable format — five consistent studio-style angles per frame (front, both sides, three-quarter, and a detail shot), then a second pass turning the cleanest of those into styled lifestyle collages that gave each product visual context instead of sitting on a plain background. \U0001f4f8\n\nThe real work wasn\'t the photography itself, it was the system behind it: a naming and organization convention so the retailer could add new frames later without needing us involved every time, and a template that scaled — the fifth frame took the same amount of setup time as the fiftieth. \U0001f4e6\n\nThe result is now a format any optical retailer could picture their own inventory in, not a one-off design tied to a single shop\'s branding. That reusability was the actual goal from the start — a catalog structure that works as a template, not just a project.\n\nIf your business has a similar problem — real products, inconsistent photos, no easy way for customers to browse what you actually carry — this is exactly the kind of Digital Enablement for Local Business work we do, and we\'re glad to walk through what a version of this would look like for you. \U0001f4ac"},
    {"id": "b7", "slug": "mood-memory-and-music-prompts", "title": "Mood, Memory, and Music Prompts", "category": "Music Creativity", "read_time": "4 min", "date": "2026-04-30", "excerpt": "How nostalgia, calm, focus, and cinematic emotion can become stronger creative briefs.",
     "seo_title": "Mood, Memory and Music Prompts: How Emotion Drives Better AI Music | Evolvix", "seo_description": "Nostalgia, calm, focus, and cinematic emotion make stronger AI music briefs. Here\'s how mood-first thinking creates music that feels intentional, not generated.", "seo_keywords": "AI music prompts India, mood music AI, AI music creation, music mood brief, Mood Music Prompt Pack, AI assisted music, creative music brief AI",
     "body": "\U0001f3b5 The most reliable creative briefs are usually the emotional ones. Not \'make something that sounds sad\' but \'make something that sounds like that moment when a long road trip is almost over and it\'s starting to rain\' — specific enough that you can hear a version of it before a single note is played.\n\nMood is what makes that kind of brief work. Nostalgia, calm, focus, tension, cinematic weight — each of these has a physical texture to it: the tempo it tends toward, the frequency range it sits in, the instruments that feel right, the parts that feel wrong the moment you hear them. When you\'re working with AI music tools, this emotional clarity is the difference between a prompt that produces something generic and one that gets you close to the idea on the first pass. \U0001f3db️\n\nSome moods that tend to travel well as creative briefs:\n\n\U0001f319 Nostalgia is slow and mid-range, slightly imperfect, often built around something that sounds like memory rather than presence — it resists anything too clean or quantized.\n\n\U0001f30a Calm is spacious, low-end anchored, unhurried; it tends to fall apart when too many elements compete.\n\n\U0001f9e0 Focus music benefits from a structural loop and minimal variation — the brain needs something predictable to work against, not something interesting.\n\n\U0001f3ac Cinematic emotion depends almost entirely on space and dynamic range: it needs room to expand.\n\nThese distinctions are the foundation of the Mood Music Prompt Pack in the Store — a set of prompts built specifically around these emotional textures, designed to give AI music tools a more precise brief so the result feels intentional rather than generated. \U0001f3b6"},
    {"id": "b8", "slug": "creator-productivity-without-burnout", "title": "Creator Productivity Without Burnout", "category": "Productivity", "read_time": "5 min", "date": "2026-04-28", "excerpt": "A practical operating rhythm for creators balancing learning, content, products, and rest.",
     "seo_title": "Creator Productivity Without Burnout: A Practical Rhythm | Evolvix", "seo_description": "Stop mixing learning, creating, and admin — they drain each other. A practical operating rhythm for creators that lets you ship consistently without burning out.", "seo_keywords": "creator productivity India, creator burnout prevention, digital creator workflow, content creator schedule, creator productivity tips, creator operating rhythm",
     "body": "\U0001f525 Most creator burnout doesn\'t come from working too much — it comes from not separating different kinds of work, so everything bleeds into everything else and none of it feels done.\n\nLearning, creating, producing, and maintaining a store or audience are four genuinely different modes of work. They use different parts of your attention and they don\'t stack well. Trying to learn a new tool, write new content, and answer customer questions in the same two-hour block is how you end up with half a blog post, three browser tabs of notes you\'ll never revisit, and the feeling that you\'ve been busy without actually finishing anything. ⚡\n\nA rhythm that holds up over time usually involves separating these into distinct blocks:\n\n\U0001f4da Learning time — new tools, other people\'s work, reference material. Consuming only, no creating.\n\n\U0001f3a8 Making time — writing, designing, recording, building. No messages, no admin.\n\n\U0001f4cb Admin time — responding to messages, updating listings, checking numbers. Keep it short.\n\n\U0001f634 Real rest — not scrolling a different feed. Actual disconnection.\n\nThe specific schedule matters less than the separation. What doesn\'t tend to work is mixing all four modes throughout the day without intention — it\'s not a pace problem, it\'s a switching cost problem.\n\n✅ A short shutdown ritual at the end of a making session (even just writing down where you stopped and what comes next) makes it easier to re-enter the next time without rebuilding momentum from zero.\n\nThe Creator Assets Glow Bundle and Creator Store Launch Vault in the Store are built around this kind of thinking — structures that let a small creator actually ship things consistently without running out of energy. \U0001f680"},
    {"id": "b9", "slug": "trust-signals-every-small-digital-brand-needs", "title": "Trust Signals Every Small Digital Brand Needs", "category": "Creator Resources", "read_time": "6 min", "date": "2026-04-25", "excerpt": "The visual, copy, support, and policy details that help visitors feel safe buying from you.",
     "seo_title": "Trust Signals Every Small Digital Brand Needs to Convert Buyers | Evolvix", "seo_description": "Visual, copy, support, and policy details that help online visitors feel safe buying from a small digital brand — practical trust signals any creator can add today.", "seo_keywords": "trust signals digital brand India, small business trust online, digital product trust, refund policy digital downloads, brand consistency online store India, convert visitors buyers",
     "body": "\U0001f6e1️ Trust is what converts a visitor who\'s interested into a buyer who actually completes the purchase. For a small digital brand, especially one that\'s early-stage, trust is mostly built through signals — small details that communicate that this is a real business run by real people who will actually help you if something goes wrong.\n\nHere are the ones that matter most:\n\n\U0001f4c4 A real refund policy, written in plain language. Not a legal wall of text, and not a vague \'we\'ll figure something out\' — a specific, honest statement of what you will and won\'t do. Even a strict no-refunds policy builds trust when it\'s stated clearly, because it tells the visitor that you\'ve thought about this and aren\'t going to be surprised by the question.\n\n✉️ Visible contact options. This doesn\'t mean a full phone support team — it means a real email address (not a contact form that goes into a void), a WhatsApp number that actually gets answered, and a response time you can genuinely commit to. \'Reply within 24 hours\' is fine. Not mentioning contact at all is not.\n\n\U0001f3a8 Consistent visual branding. Consistent doesn\'t mean expensive. It means your product thumbnails look like they came from the same place, your fonts and colors don\'t change between pages, and your logo doesn\'t look different on mobile. Inconsistency signals that someone assembled this in a hurry and might not be around to support it.\n\n\U0001f4dd Real product descriptions, not AI-sounding filler. \'A comprehensive toolkit that offers unparalleled value\' is not a description, it\'s a red flag. Tell people specifically what\'s in the download, how many files, in what format, and what a reasonable person would actually do with it.\n\n\U0001f3e2 A physical location or registration detail. Even just a city, a GSTIN, or a registered business name gives the site something to hold onto that feels verifiable. For Indian digital sellers especially, showing a GSTIN on the checkout confirms that tax is being handled properly — many buyers notice this even if they don\'t consciously register it.\n\nNone of these are expensive to add. Brand identity, policy copy, and consistent product presentation are all things we help small digital businesses get right — and they tend to have a measurable effect on conversion before anything more complicated is considered. ✅"},
    {"id": "b10", "slug": "from-prompt-to-product", "title": "From Prompt to Product", "category": "Digital Creativity", "read_time": "8 min", "date": "2026-04-22", "excerpt": "A simple framework for turning AI-assisted ideas into useful templates, kits, and content systems.",
     "seo_title": "From Prompt to Product: How to Turn AI Ideas into Digital Downloads | Evolvix", "seo_description": "A 5-step framework for turning an AI-assisted idea into a digital product someone will actually pay for — prompt packs, templates, guides, and workbooks.", "seo_keywords": "create digital products AI India, AI product creation, digital download creation, prompt pack creation, AI template creator, digital product business India, sell AI products India",
     "body": "\U0001f4a1 The gap between having a great AI-assisted idea and having a product someone can buy is where most digital product projects stall. Not because the idea was bad, but because turning an idea into a product requires a set of steps that aren\'t obvious the first time.\n\nHere\'s a framework that works for most small digital product types: templates, prompt packs, guides, workbooks, and similar things that can be packaged as a file download.\n\n✅ Step 1: Validate before you build. Before spending significant time building anything, ask: does this solve a specific problem for a specific person, or does it solve a vague problem for everyone? \'Productivity tips\' solves a vague problem. \'A prompt sequence for getting a rough first draft of a job application out of your head in 20 minutes\' solves a specific one. The specific version is harder to headline, but much easier to sell.\n\n✅ Step 2: Build the minimum useful version. What\'s the smallest thing you could deliver that genuinely solves the problem? For a prompt pack, this might be eight to ten well-tested prompts, not forty loosely curated ones. For a workbook, it\'s the exercises that actually move someone forward, not every possible reflection question.\n\n✅ Step 3: Test it on yourself first. A prompt that looks clear when you write it often turns out to be confusing when you try to follow it a week later. Going through your own product as a user, before adding any polish, catches most of the fundamental problems.\n\n✅ Step 4: Package for scanning, not reading. Most digital product buyers scan before they commit to reading carefully. This means a clear filename, a first page that states what this is and who it\'s for, visually distinct sections, and an obvious place to start. \U0001f4e6\n\n✅ Step 5: Match the product page promise to the product reality. The biggest disconnect in small digital product stores is usually between what the page promises and what the file delivers. Oversell and the buyer is disappointed regardless of quality. Undersell and fewer people buy.\n\nThis five-step process is what informed the products in our own Store — and it\'s the approach behind the Creator Store Launch Vault, which packages this thinking into a reusable system for creators who want to build a store that keeps selling. \U0001f3af"},
    {"id": "b11", "slug": "grow-yourself-using-ai", "title": "Grow Yourself Using AI", "category": "Learning and Growth", "read_time": "5 min", "date": "2026-04-20", "excerpt": "A practical path for using AI to improve learning, career planning, creativity, and daily routines.",
     "seo_title": "How to Use AI for Personal Growth: Learning, Career, and Daily Life | Evolvix", "seo_description": "Practical, specific ways AI tools actually help with learning, career planning, creative development, and daily routines — without the hype or vague advice.", "seo_keywords": "use AI personal growth India, AI for learning, AI career planning India, AI self improvement, AI daily routine, grow with AI tools, AI productivity India",
     "body": "\U0001f331 The phrase \'use AI to grow\' gets thrown around a lot without much specificity. Here\'s what it actually looks like in practice, across four areas of personal development.\n\n\U0001f4da For learning: AI tools are genuinely useful for the early stages of understanding something new. A conversation that starts with \'explain this as if I\'ve never heard of it\' and then \'okay, now explain the part about Y in more detail\' gets you oriented faster than most tutorials, and you can ask follow-up questions you\'d feel self-conscious asking in a classroom. The limitation is that AI can\'t tell you what to learn or why it matters — that direction still has to come from you.\n\n\U0001f4bc For career planning: AI is useful for gap analysis (here\'s where I am, here\'s where I want to be — what\'s the realistic distance between them?) and for preparing specific situations — interviews, salary conversations, difficult professional emails. It\'s less useful for strategic career decisions, which require knowing yourself and your actual options in ways an AI can\'t simulate.\n\n\U0001f3a8 For creative development: the value is in generating more options faster at the beginning of a project, when blank-page paralysis is most expensive. Once you have a draft or a rough version of something, your own judgment matters more than the AI\'s variations — and it\'s easy to fall into a loop of generating and not committing, which is the opposite of creative growth.\n\n\U0001f4c5 For daily routines: simple scheduling and planning prompts — \'I have these commitments this week and these goals, help me block time for the important things\' — can surface conflicts and inefficiencies faster than most people would catch on their own. This is a practical, low-risk way to start using AI regularly without any technical knowledge.\n\nThe AI Starter Kit for Everyday Productivity in the Store is built around exactly these use cases — practical, specific, and designed for people who want results from the tools, not just familiarity with them. \U0001f680"},
    {"id": "b12", "slug": "ai-consulting-for-small-business", "title": "AI Consulting for Small Business", "category": "Business Consulting", "read_time": "6 min", "date": "2026-04-18", "excerpt": "How small businesses can start with AI workflows, automation, digital tools, and better customer systems.",
     "seo_title": "AI Consulting for Small Business: Where to Start in India | Evolvix", "seo_description": "Not sure where AI fits in your business? Here are the 4 areas that give small businesses the fastest returns from AI — plus what to avoid when getting started.", "seo_keywords": "AI consulting small business India, AI for small business India, business AI implementation, AI automation India, AI workflow small team, AI business consulting Kolkata",
     "body": "\U0001f916 Most small business owners encounter AI as a list of things they could theoretically do with it, without a clear sense of which of those things would actually help their specific business first. The gap between \'I should be using AI\' and \'I am using AI and it\'s saving me time\' is almost always a question of where to start.\n\nHere are the areas that tend to produce the fastest returns:\n\n\U0001f4ac Customer communication. If your team is writing similar emails or WhatsApp replies from scratch — quotes, follow-ups, booking confirmations, FAQ responses — AI can generate a first draft in seconds that you edit and send. The time saving is small per message but significant across a week, and the consistency is noticeably better.\n\n\U0001f4f1 Content production. Social posts, product descriptions, and promotional copy are the areas where small businesses most often skip content entirely because they don\'t have time to write it. AI doesn\'t replace judgment about what to say, but it removes the friction of getting words on a page. A short prompt describing a product, a context, and a tone gets you something workable in seconds.\n\n\U0001f4cb Internal documentation. Standard operating procedures, onboarding notes, process checklists — things that are valuable to have but time-consuming to write — are well-suited to AI drafting. You describe how something works, the AI structures it, you correct anything that\'s wrong. This is especially useful for businesses preparing to hire or delegate.\n\n\U0001f4ca Data interpretation. Asking an AI to summarize what a month\'s worth of sales, customer feedback, or support tickets is actually telling you is faster and often more useful than staring at the numbers yourself. AI can surface the pattern so the decision is clearer.\n\n⚠️ What doesn\'t work well as a starting point: replacing your most complex, judgment-heavy work; building elaborate AI systems before simpler things are stable; or adopting tools because they\'re impressive rather than because they solve a specific problem.\n\nOur AI Business Consulting service is built around exactly this kind of starting-point work — identifying the two or three places in your business where AI would have the most practical impact, and implementing those first. \U0001f3af"},
    {"id": "b13", "slug": "accessible-ai-for-everyday-users", "title": "Accessible AI for Everyday Users", "category": "Accessibility", "read_time": "4 min", "date": "2026-04-16", "excerpt": "Why AI support should feel simple, safe, and useful for beginners, families, and older users.",
     "seo_title": "Accessible AI for Everyday Users: Older Adults, Families & Beginners | Evolvix", "seo_description": "Why AI support needs to feel simple and safe for everyday users — not just tech-savvy early adopters. Confidence-first design for families and older adults in India.", "seo_keywords": "accessible AI India, AI for elderly India, AI for beginners India, AI for families, accessible technology India, beginner AI tools, AI for non-technical users India",
     "body": "♿ A significant portion of people who could benefit from AI tools aren\'t using them — not because the tools are too expensive or technically complex, but because the way most AI products are presented assumes a level of comfort with technology that a large part of the population simply doesn\'t have yet.\n\n\U0001f475 For older adults, many of whom are comfortable with smartphones and messaging apps but less comfortable with new software interfaces, the barrier is usually not understanding what the tool does — it\'s not knowing what to type, not trusting that something won\'t break, and not knowing what to do if something unexpected happens. These are confidence problems, not capability problems.\n\n\U0001f46a For families, the practical questions are usually about safety and trust: is the information accurate? Is my data private? Can my child use this unsupervised? These are legitimate questions that most AI product documentation doesn\'t answer in plain language.\n\nWhat makes AI feel accessible to this group is different from what makes it feel impressive to early adopters:\n\n✅ Smaller starting prompts, not open-ended ones.\n\n✅ Output that explains itself rather than just delivering a result.\n\n✅ A human contact point when the AI isn\'t working the way someone expected. \U0001f4de\n\nDesigning for everyday users — people who aren\'t chasing the latest tech, but who would genuinely benefit from the right tool explained well — is something we care about specifically. The AI Starter Kit in our Store is written with exactly this user in mind: clear, warm, practical, and never assuming more than it should. \U0001f31f"}
]


class ContactMessageCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: Optional[str] = Field(None, max_length=20)
    email: EmailStr
    inquiry_type: str = Field(..., max_length=80)
    message: str = Field(..., min_length=10, max_length=2500)


class NewsletterCreate(BaseModel):
    email: EmailStr


class SiteContentUpdate(BaseModel):
    content: Dict[str, Any]


class AdminLogin(BaseModel):
    password: str


INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
]
INDIAN_STATES_SET = set(INDIAN_STATES)
BUSINESS_STATE = "West Bengal"


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: Optional[str] = Field(default=None, max_length=120)
    state: str = Field(..., max_length=64)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class ResendOtpRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=128)


class AdminContentUpdate(BaseModel):
    content: Dict[str, Any]


class AdminListUpdate(BaseModel):
    items: List[Dict[str, Any]]


class ProductFileUpload(BaseModel):
    filename: str = Field(..., min_length=1, max_length=180)
    content_type: str = Field(default="application/octet-stream", max_length=120)
    data_url: str = Field(..., min_length=20)


class AnalyticsEventCreate(BaseModel):
    event_type: str = Field(..., min_length=2, max_length=80)
    path: str = Field(..., min_length=1, max_length=400)
    label: Optional[str] = Field(default=None, max_length=220)
    section_id: Optional[str] = Field(default=None, max_length=180)
    product_id: Optional[str] = Field(default=None, max_length=180)
    session_id: str = Field(..., min_length=8, max_length=120)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CheckoutCreate(BaseModel):
    product_id: str
    origin_url: str


class ProductResponse(BaseModel):
    id: str
    slug: str
    title: str
    price: float
    currency: str
    category: str
    tag: str
    description: str
    benefits: List[str]
    included: List[str]
    delivery: str
    license: str
    image: str
    images: List[str] = Field(default_factory=list)
    external_purchase_url: str
    file_slots: List[str] = Field(default_factory=list)
    download_files: List[Dict[str, Any]] = Field(default_factory=list)


def parse_data_url(data_url: str) -> tuple[bytes, str]:
    file_bytes: Optional[bytes] = None
    if "," not in data_url:
        raise HTTPException(status_code=400, detail="Invalid file data")
    header, encoded = data_url.split(",", 1)
    content_type = "application/octet-stream"
    if header.startswith("data:") and ";" in header:
        content_type = header[5:].split(";", 1)[0] or content_type
    try:
        file_bytes = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="File data must be base64 encoded") from exc
    if file_bytes is None:
        raise HTTPException(status_code=400, detail="File data could not be decoded")
    if len(file_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File is too large for MongoDB storage")
    return file_bytes, content_type


def safe_filename(filename: str) -> str:
    clean = "".join(ch for ch in filename.strip() if ch.isalnum() or ch in {".", "-", "_", " "}).strip()
    return clean[:180] or "evolvix-download.bin"


@api_router.get("/")
async def root():
    return {"message": "Evolvix Tech Media API is online", "status": "ready"}


@api_router.get("/meta/states")
async def get_states():
    return {"states": INDIAN_STATES}


@api_router.get("/site-content")
async def get_site_content():
    custom = await db.site_content.find_one({"id": "primary"}, {"_id": 0})
    editable_content = merged_site_content(custom.get("content") if custom else None)
    catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
    return {
        **editable_content,
        "products": normalize_catalog_items(catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values()), "products"),
        "portfolio": catalog.get("portfolio", PORTFOLIO) if catalog else PORTFOLIO,
        "blog": normalize_catalog_items(catalog.get("blog", BLOG_POSTS) if catalog else BLOG_POSTS, "blog"),
    }


@api_router.put("/site-content")
async def update_site_content(payload: SiteContentUpdate):
    doc = {"id": "primary", "content": payload.content, "updated_at": now_iso()}
    await db.site_content.update_one({"id": "primary"}, {"$set": doc}, upsert=True)
    return {"message": "Site content updated", "updated_at": doc["updated_at"]}


@api_router.post("/admin/login")
async def admin_login(payload: AdminLogin, response: Response):
    if payload.password.strip() != os.environ["ADMIN_PASSWORD"].strip():
        raise HTTPException(status_code=401, detail="Invalid admin password")
    token = admin_token()
    response.set_cookie(key="evolvix_admin_token", value=token, httponly=True, secure=True, samesite="lax", max_age=60 * 60 * 8, path="/")
    return {"token": token, "message": "Admin login successful"}


@api_router.post("/admin/logout")
async def admin_logout(response: Response):
    response.delete_cookie(key="evolvix_admin_token", path="/")
    return {"message": "Admin session cleared"}


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(key="evolvix_session_token", value=token, httponly=True, secure=True, samesite="lax", max_age=60 * 60 * 24 * SESSION_DURATION_DAYS, path="/")


async def start_session(response: Response, user: Dict[str, Any]) -> Dict[str, Any]:
    token = await create_session(user["id"])
    set_session_cookie(response, token)
    return {"token": token, "user": public_user(user)}


@api_router.post("/auth/signup")
async def signup(payload: SignupRequest, response: Response):
    email = payload.email.lower()
    state = payload.state.strip()
    if state not in INDIAN_STATES_SET:
        raise HTTPException(status_code=400, detail="Please select a valid state/UT")
    existing = await db.users.find_one({"email": email})
    if existing and existing.get("email_verified"):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    if not EMAIL_VERIFICATION_ENABLED:
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        user_doc = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": (payload.name or "").strip(),
            "password_hash": hash_password(payload.password),
            "state": state,
            "email_verified": True,
            "created_at": now_iso(),
        }
        await db.users.insert_one(user_doc)
        return await start_session(response, user_doc)

    # Email verification enabled: create (or reuse a still-unverified pending signup) and send an OTP
    if existing:
        user_doc = existing
        await db.users.update_one({"id": existing["id"]}, {"$set": {
            "name": (payload.name or "").strip(),
            "password_hash": hash_password(payload.password),
            "state": state,
        }})
        user_doc["state"] = state
    else:
        user_doc = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": (payload.name or "").strip(),
            "password_hash": hash_password(payload.password),
            "state": state,
            "email_verified": False,
            "created_at": now_iso(),
        }
        await db.users.insert_one(user_doc)

    await issue_otp(user_doc)
    return {"status": "verification_required", "email": email}


@api_router.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if EMAIL_VERIFICATION_ENABLED and not user.get("email_verified"):
        await issue_otp(user)
        return {"status": "verification_required", "email": user["email"]}
    return await start_session(response, user)


@api_router.post("/auth/verify-email")
async def verify_email(payload: VerifyEmailRequest, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.get("email_verified"):
        return await start_session(response, user)

    if not user.get("otp_hash") or not user.get("otp_expires_at"):
        raise HTTPException(status_code=400, detail="No verification code pending. Please request a new one.")
    if user["otp_expires_at"] < now_iso():
        raise HTTPException(status_code=400, detail="This code has expired. Please request a new one.")
    if user.get("otp_attempts", 0) >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect attempts. Please request a new code.")

    if hash_otp(payload.otp) != user["otp_hash"]:
        await db.users.update_one({"id": user["id"]}, {"$inc": {"otp_attempts": 1}})
        raise HTTPException(status_code=400, detail="Incorrect code. Please try again.")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"email_verified": True}, "$unset": {"otp_hash": "", "otp_expires_at": "", "otp_attempts": "", "otp_sent_at": ""}},
    )
    user["email_verified"] = True
    return await start_session(response, user)


@api_router.post("/auth/resend-otp")
async def resend_otp(payload: ResendOtpRequest):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="This account is already verified. Please log in.")

    last_sent = user.get("otp_sent_at")
    if last_sent:
        elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(last_sent)).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            raise HTTPException(status_code=429, detail="Please wait a few seconds before requesting another code.")

    await issue_otp(user)
    return {"status": "verification_required", "email": email}


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = session_token_from_request(request)
    if token:
        await db.sessions.delete_one({"token": token})
    response.delete_cookie(key="evolvix_session_token", path="/")
    return {"message": "Logged out"}


@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await require_user(request)
    return {"user": public_user(user)}


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("email_verified"):
        return {"status": "ok", "message": "If an account with this email exists, a reset code has been sent."}
    last_sent = user.get("otp_sent_at")
    if last_sent:
        elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(last_sent)).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            raise HTTPException(status_code=429, detail="Please wait before requesting another code.")
    await issue_reset_otp(user)
    return {"status": "ok", "message": "If an account with this email exists, a reset code has been sent."}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if not user.get("otp_hash") or not user.get("otp_expires_at"):
        raise HTTPException(status_code=400, detail="No reset code pending. Please request a new one.")
    if user["otp_expires_at"] < now_iso():
        raise HTTPException(status_code=400, detail="This code has expired. Please request a new one.")
    if user.get("otp_attempts", 0) >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect attempts. Please request a new code.")
    if hash_otp(payload.otp) != user["otp_hash"]:
        await db.users.update_one({"id": user["id"]}, {"$inc": {"otp_attempts": 1}})
        raise HTTPException(status_code=400, detail="Incorrect code. Please try again.")
    new_hash = hash_password(payload.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": new_hash},
         "$unset": {"otp_hash": "", "otp_expires_at": "", "otp_attempts": "", "otp_sent_at": ""}},
    )
    user["password_hash"] = new_hash
    return await start_session(response, user)


@api_router.get("/visitor/orders")
async def get_visitor_orders(request: Request):
    user = await require_user(request)
    cursor = db.payment_transactions.find(
        {"user_id": user["id"], "payment_status": "paid"},
        {"_id": 0, "id": 1, "session_id": 1, "product_id": 1, "amount": 1, "currency": 1, "metadata": 1, "created_at": 1},
    ).sort("created_at", -1)
    orders = await cursor.to_list(length=50)
    return {"orders": orders}


@api_router.get("/admin/dashboard")
async def admin_dashboard(request: Request):
    verify_admin_request(request)
    custom = await db.site_content.find_one({"id": "primary"}, {"_id": 0})
    catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
    return {
        "content": merged_site_content(custom.get("content") if custom else None),
        "products": normalize_catalog_items(catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values()), "products"),
        "portfolio": catalog.get("portfolio", PORTFOLIO) if catalog else PORTFOLIO,
        "blog": normalize_catalog_items(catalog.get("blog", BLOG_POSTS) if catalog else BLOG_POSTS, "blog"),
        "updated_at": max(custom.get("updated_at", "") if custom else "", catalog.get("updated_at", "") if catalog else ""),
    }


@api_router.put("/admin/content")
async def admin_update_content(payload: AdminContentUpdate, request: Request):
    verify_admin_request(request)
    doc = {"id": "primary", "content": payload.content, "updated_at": now_iso()}
    await db.site_content.update_one({"id": "primary"}, {"$set": doc}, upsert=True)
    return {"message": "Content sections saved", "updated_at": doc["updated_at"]}


def normalize_download_files(files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized_files = []
    for file_item in files or []:
        if not file_item.get("id"):
            continue
        normalized_files.append(
            {
                "id": str(file_item.get("id")),
                "filename": safe_filename(str(file_item.get("filename") or "Evolvix download")),
                "content_type": str(file_item.get("content_type") or "application/octet-stream"),
                "size": int(file_item.get("size") or 0),
                "uploaded_at": str(file_item.get("uploaded_at") or now_iso()),
            }
        )
    return normalized_files


def normalize_product_item(clean: Dict[str, Any], title: str) -> Dict[str, Any]:
    clean.setdefault("slug", slugify(title) or clean["id"])
    clean["price"] = float(clean.get("price") or 0)
    clean.setdefault("currency", "inr")
    clean.setdefault("category", "Learning and Growth")
    clean.setdefault("tag", "Available")
    clean.setdefault("description", "Editable Evolvix product.")
    clean.setdefault("benefits", [])
    clean.setdefault("included", [])
    clean.setdefault("delivery", "Digital delivery details are shown after checkout.")
    clean.setdefault("license", "Usage terms can be customized.")
    clean.setdefault("image", "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80")
    images = clean.get("images") or ([clean.get("image")] if clean.get("image") else [])
    clean["images"] = [image for image in images if image][:5]
    if clean["images"]:
        clean["image"] = clean["images"][0]
    clean.setdefault("external_purchase_url", "https://gumroad.com/")
    if "example.com" in str(clean.get("external_purchase_url", "")):
        clean["external_purchase_url"] = "https://gumroad.com/"
    clean.setdefault("file_slots", [])
    clean["download_files"] = normalize_download_files(clean.get("download_files", []))
    return clean


def normalize_portfolio_item(clean: Dict[str, Any]) -> Dict[str, Any]:
    clean.setdefault("category", "Digital Products")
    clean.setdefault("summary", "Editable showcase item.")
    clean.setdefault("image", "https://images.unsplash.com/photo-1609921212029-bb5a28e60960?auto=format&fit=crop&w=1200&q=80")
    return clean


def normalize_blog_item(clean: Dict[str, Any], title: str) -> Dict[str, Any]:
    clean["slug"] = clean.get("slug") or slugify(title) or clean["id"]
    clean["category"] = clean.get("category") or "AI Tools"
    clean["excerpt"] = clean.get("excerpt") or "Editable insight article summary."
    clean["body"] = clean.get("body") or clean.get("excerpt") or "Editable insight article summary."
    clean["seo_title"] = clean.get("seo_title") or clean.get("title") or title
    clean["seo_description"] = clean.get("seo_description") or clean.get("excerpt") or "Editable insight article summary."
    clean["seo_keywords"] = clean.get("seo_keywords") or "AI, Evolvix Tech Media, digital products, learning"
    clean["date"] = clean.get("date") or now_iso()[:10]
    clean["read_time"] = clean.get("read_time") or clean.get("readTime") or "5 min"
    return clean


def normalize_catalog_item(item: Dict[str, Any], kind: str, index: int) -> Dict[str, Any]:
    clean = {**item}
    title = str(clean.get("title") or clean.get("name") or f"{kind}-{index + 1}")
    clean.setdefault("id", slugify(title) or f"{kind}-{index + 1}")
    normalizers = {
        "products": lambda value: normalize_product_item(value, title),
        "portfolio": normalize_portfolio_item,
        "blog": lambda value: normalize_blog_item(value, title),
    }
    return normalizers.get(kind, lambda value: value)(clean)


def normalize_catalog_items(items: List[Dict[str, Any]], kind: str) -> List[Dict[str, Any]]:
    return [normalize_catalog_item(item, kind, index) for index, item in enumerate(items)]


def event_match_filter(start_date: Optional[str], end_date: Optional[str], event_type: Optional[str], page: Optional[str], product_id: Optional[str]) -> Dict[str, Any]:
    match: Dict[str, Any] = {}
    if start_date or end_date:
        created_range: Dict[str, str] = {}
        if start_date:
            created_range["$gte"] = start_date
        if end_date:
            created_range["$lte"] = f"{end_date}T23:59:59.999999+00:00" if len(end_date) == 10 else end_date
        match["created_at"] = created_range
    if event_type and event_type != "all":
        match["event_type"] = event_type
    if page and page != "all":
        match["path"] = page
    if product_id and product_id != "all":
        match["product_id"] = product_id
    return match


async def record_analytics_event(event_type: str, path: str, session_id: str, request: Request, label: Optional[str] = None, section_id: Optional[str] = None, product_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> None:
    doc = {
        "id": str(uuid.uuid4()),
        "event_type": event_type,
        "path": path,
        "label": label,
        "section_id": section_id,
        "product_id": product_id,
        "session_id": session_id,
        "metadata": metadata or {},
        "user_agent": request.headers.get("user-agent", "")[:500],
        "created_at": now_iso(),
    }
    await db.analytics_events.insert_one(doc)


@api_router.put("/admin/{kind}")
async def admin_update_catalog(kind: str, payload: AdminListUpdate, request: Request):
    verify_admin_request(request)
    if kind not in {"products", "portfolio", "blog"}:
        raise HTTPException(status_code=400, detail="Unsupported admin catalog type")
    items = normalize_catalog_items(payload.items, kind)
    await db.editable_catalog.update_one(
        {"id": "primary"},
        {"$set": {kind: items, "updated_at": now_iso(), "id": "primary"}},
        upsert=True,
    )
    return {"message": f"{kind.title()} saved", "count": len(items)}


@api_router.post("/admin/products/{product_id}/files")
async def admin_upload_product_file(product_id: str, payload: ProductFileUpload, request: Request):
    verify_admin_request(request)
    file_bytes, detected_content_type = parse_data_url(payload.data_url)
    file_id = str(uuid.uuid4())
    content_type = payload.content_type or detected_content_type
    file_doc = {
        "id": file_id,
        "product_id": product_id,
        "filename": safe_filename(payload.filename),
        "content_type": content_type,
        "data_base64": base64.b64encode(file_bytes).decode(),
        "size": len(file_bytes),
        "uploaded_at": now_iso(),
    }
    await db.product_files.insert_one(file_doc)

    catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
    products = catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values())
    file_meta = {key: file_doc[key] for key in ["id", "filename", "content_type", "size", "uploaded_at"]}
    for product in products:
        if product.get("id") == product_id or product.get("slug") == product_id:
            existing_files = [item for item in product.get("download_files", []) if item.get("id") != file_id]
            product["download_files"] = [*existing_files, file_meta]
            product.setdefault("file_slots", [])
            if file_meta["filename"] not in product["file_slots"]:
                product["file_slots"] = [*product["file_slots"], file_meta["filename"]]
            break
    else:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.editable_catalog.update_one(
        {"id": "primary"},
        {"$set": {"id": "primary", "products": normalize_catalog_items(products, "products"), "updated_at": now_iso()}},
        upsert=True,
    )
    return {"message": "Product file uploaded", "file": file_meta}


@api_router.delete("/admin/products/{product_id}/files/{file_id}")
async def admin_delete_product_file(product_id: str, file_id: str, request: Request):
    verify_admin_request(request)
    catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
    products = catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values())
    found_product = False
    for product in products:
        if product.get("id") == product_id or product.get("slug") == product_id:
            found_product = True
            product["download_files"] = [item for item in product.get("download_files", []) if item.get("id") != file_id]
            break
    if not found_product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.product_files.delete_one({"id": file_id, "product_id": product_id})
    await db.editable_catalog.update_one(
        {"id": "primary"},
        {"$set": {"id": "primary", "products": normalize_catalog_items(products, "products"), "updated_at": now_iso()}},
        upsert=True,
    )
    return {"message": "Product file removed"}


@api_router.post("/admin/reset")
async def admin_reset(request: Request):
    verify_admin_request(request)
    await db.site_content.update_one({"id": "primary"}, {"$set": {"id": "primary", "content": DEFAULT_SITE_CONTENT, "updated_at": now_iso()}}, upsert=True)
    await db.editable_catalog.update_one(
        {"id": "primary"},
        {"$set": {"id": "primary", "products": list(PRODUCTS.values()), "portfolio": PORTFOLIO, "blog": BLOG_POSTS, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"message": "Admin content reset to Evolvix defaults"}


CONTENT_SECTION_MAP: Dict[str, List[str]] = {
    "brand": ["brand", "contact", "trust_strip"],
    "about": ["about"],
    "services": ["creative_services", "technology_services"],
    "ecosystem": ["ecosystem"],
    "learning": ["learning_categories"],
    "music": ["music_services", "music_previews"],
    "custom": ["custom_sections"],
    "demos": ["demos"],
    "testimonials": ["testimonials"],
}


@api_router.post("/admin/reset/{kind}")
async def admin_reset_section(kind: str, request: Request):
    verify_admin_request(request)
    catalog_kinds = {"products", "portfolio", "blog"}
    content_kinds = set(CONTENT_SECTION_MAP.keys())
    if kind not in catalog_kinds and kind not in content_kinds:
        raise HTTPException(status_code=400, detail=f"Invalid section. Valid: {', '.join(sorted(catalog_kinds | content_kinds))}")
    if kind in catalog_kinds:
        section_defaults = {"products": list(PRODUCTS.values()), "portfolio": PORTFOLIO, "blog": BLOG_POSTS}
        await db.editable_catalog.update_one(
            {"id": "primary"},
            {"$set": {kind: section_defaults[kind], "updated_at": now_iso()}},
            upsert=True,
        )
    else:
        set_fields = {f"content.{key}": DEFAULT_SITE_CONTENT.get(key, []) for key in CONTENT_SECTION_MAP[kind]}
        set_fields["updated_at"] = now_iso()
        await db.site_content.update_one(
            {"id": "primary"},
            {"$set": set_fields},
            upsert=True,
        )
    return {"message": f"{kind} reset to Evolvix defaults"}


@api_router.post("/site-content/reset")
async def reset_site_content():
    await db.site_content.update_one(
        {"id": "primary"},
        {"$set": {"id": "primary", "content": DEFAULT_SITE_CONTENT, "updated_at": now_iso()}},
        upsert=True,
    )
    await db.editable_catalog.update_one(
        {"id": "primary"},
        {"$set": {"id": "primary", "products": list(PRODUCTS.values()), "portfolio": PORTFOLIO, "blog": BLOG_POSTS, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"message": "Site content reset to Evolvix defaults"}


@api_router.get("/products", response_model=List[ProductResponse])
async def get_products():
    catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
    return normalize_catalog_items(catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values()), "products")


@api_router.get("/products/{slug}", response_model=ProductResponse)
async def get_product(slug: str):
    catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
    products = normalize_catalog_items(catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values()), "products")
    product = next((item for item in products if item.get("slug") == slug or item.get("id") == slug), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@api_router.get("/products/{slug}/delivery-slots")
async def get_product_delivery_slots(slug: str):
    catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
    products = normalize_catalog_items(catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values()), "products")
    product = next((item for item in products if item.get("slug") == slug or item.get("id") == slug), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "product_id": product["id"],
        "title": product["title"],
        "delivery_status": "file_slots_ready",
        "file_slots": product.get("file_slots", ["Main download file", "Usage guide", "Bonus resource"]),
        "note": "Attach final files to these slots when real product assets are ready.",
    }


@api_router.get("/payments/{session_id}/downloads")
async def get_payment_downloads(session_id: str):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
    if transaction.get("payment_status") != "paid":
        return {"payment_status": transaction.get("payment_status", "pending"), "downloads": [], "message": "Downloads unlock after payment confirmation."}
    catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
    products = normalize_catalog_items(catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values()), "products")
    product = next((item for item in products if item.get("id") == transaction.get("product_id") or item.get("slug") == transaction.get("product_id")), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    downloads = [
        {
            "id": file_item["id"],
            "filename": file_item["filename"],
            "size": file_item.get("size", 0),
            "content_type": file_item.get("content_type", "application/octet-stream"),
            "url": f"/api/payments/{session_id}/downloads/{file_item['id']}",
        }
        for file_item in product.get("download_files", [])
        if file_item.get("id")
    ]
    return {"payment_status": "paid", "product_title": product.get("title"), "downloads": downloads, "message": "Your Evolvix digital files are ready."}


@api_router.get("/payments/{session_id}/downloads/{file_id}")
async def download_paid_file(session_id: str, file_id: str, request: Request):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
    if transaction.get("payment_status") != "paid":
        raise HTTPException(status_code=403, detail="Downloads unlock after payment confirmation")
    file_doc = await db.product_files.find_one({"id": file_id, "product_id": transaction.get("product_id")}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="Download file not found")
    file_bytes = base64.b64decode(file_doc["data_base64"])
    await record_analytics_event(
        event_type="download",
        path="/checkout/success",
        session_id=session_id,
        request=request,
        label=file_doc.get("filename"),
        product_id=transaction.get("product_id"),
        metadata={"file_id": file_id},
    )
    headers = {"Content-Disposition": f"attachment; filename=\"{safe_filename(file_doc['filename'])}\""}
    return StreamingResponse(io.BytesIO(file_bytes), media_type=file_doc.get("content_type", "application/octet-stream"), headers=headers)


@api_router.get("/payments/{session_id}/invoice")
async def get_payment_invoice(session_id: str):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
    if transaction.get("payment_status") != "paid":
        raise HTTPException(status_code=403, detail="Invoice unlocks after payment confirmation")
    html = await render_invoice_for_transaction(transaction)
    return Response(content=html, media_type="text/html")


@api_router.post("/contact")
async def create_contact_message(payload: ContactMessageCreate):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now_iso(), "status": "new"})
    await db.contact_messages.insert_one(doc)
    send_notification_email(
        to=OWNER_EMAIL,
        subject=f"New enquiry [{doc.get('inquiry_type', 'Contact')}] from {doc.get('name', 'Unknown')}",
        html=f"""
<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
  <h2 style="color:#13dff4;margin-bottom:4px">New Contact Form Submission</h2>
  <p style="color:#666;margin-top:0">Received on evolvixtech.in</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px">
    <tr><td style="padding:10px 14px;background:#f5f5f5;font-weight:700;width:130px">Name</td><td style="padding:10px 14px;border-bottom:1px solid #eee">{doc.get('name', '—')}</td></tr>
    <tr><td style="padding:10px 14px;background:#f5f5f5;font-weight:700">Phone</td><td style="padding:10px 14px;border-bottom:1px solid #eee">{doc.get('phone', '—')}</td></tr>
    <tr><td style="padding:10px 14px;background:#f5f5f5;font-weight:700">Email</td><td style="padding:10px 14px;border-bottom:1px solid #eee"><a href="mailto:{doc.get('email')}">{doc.get('email', '—')}</a></td></tr>
    <tr><td style="padding:10px 14px;background:#f5f5f5;font-weight:700">Type</td><td style="padding:10px 14px;border-bottom:1px solid #eee">{doc.get('inquiry_type', '—')}</td></tr>
    <tr><td style="padding:10px 14px;background:#f5f5f5;font-weight:700;vertical-align:top">Message</td><td style="padding:10px 14px">{doc.get('message', '—')}</td></tr>
  </table>
  <p style="margin-top:20px"><a href="https://evolvixtech.in/admin" style="background:#13dff4;color:#020204;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700">View in Admin Dashboard</a></p>
</div>""",
    )
    return {"id": doc["id"], "message": "Thanks — your message has been received."}


@api_router.post("/newsletter")
async def create_newsletter_signup(payload: NewsletterCreate):
    doc = {"id": str(uuid.uuid4()), "email": payload.email, "created_at": now_iso(), "source": "website"}
    result = await db.newsletter_signups.update_one({"email": payload.email}, {"$setOnInsert": doc}, upsert=True)
    if result.upserted_id:
        send_notification_email(
            to=payload.email,
            subject="You’re on the Evolvix update list",
            html=f"""
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;text-align:center;padding:32px 20px">
  <h2 style="color:#13dff4">You’re in.</h2>
  <p style="color:#444;line-height:1.7">Thanks for joining the Evolvix Tech Media update list.<br>You’ll be the first to know about new products, launches, and creative drops.</p>
  <a href="https://evolvixtech.in" style="display:inline-block;margin-top:20px;background:#13dff4;color:#020204;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:700">Visit Evolvix</a>
  <p style="margin-top:28px;color:#999;font-size:12px">To unsubscribe, reply with "unsubscribe" to this email.</p>
</div>""",
        )
        send_notification_email(
            to=OWNER_EMAIL,
            subject=f"New newsletter signup: {payload.email}",
            html=f"<p style=\"font-family:sans-serif\"><strong>{payload.email}</strong> just joined the Evolvix update list.</p>",
        )
    return {"message": "You’re on the Evolvix update list."}


@api_router.post("/analytics/events")
async def create_analytics_event(payload: AnalyticsEventCreate, request: Request):
    await record_analytics_event(
        event_type=payload.event_type,
        path=payload.path,
        session_id=payload.session_id,
        request=request,
        label=payload.label,
        section_id=payload.section_id,
        product_id=payload.product_id,
        metadata=payload.metadata,
    )
    return {"message": "Analytics event recorded"}


@api_router.get("/admin/analytics")
async def admin_analytics(request: Request, start_date: Optional[str] = None, end_date: Optional[str] = None, event_type: Optional[str] = None, page: Optional[str] = None, product_id: Optional[str] = None):
    verify_admin_request(request)
    match = event_match_filter(start_date, end_date, event_type, page, product_id)
    total_events = await db.analytics_events.count_documents(match)
    unique_users = len(await db.analytics_events.distinct("session_id", match))
    visits = await db.analytics_events.count_documents({**match, "event_type": "page_view"})
    clicks = await db.analytics_events.count_documents({**match, "event_type": "click"})
    forms = await db.analytics_events.count_documents({**match, "event_type": {"$in": ["form_submit", "newsletter_submit"]}})

    async def aggregate_group(field: str, limit: int = 12):
        pipeline = [{"$match": match}, {"$group": {"_id": f"${field}", "events": {"$sum": 1}, "users": {"$addToSet": "$session_id"}}}, {"$sort": {"events": -1}}, {"$limit": limit}]
        rows = []
        async for row in db.analytics_events.aggregate(pipeline):
            rows.append({"name": row.get("_id") or "Unknown", "events": row.get("events", 0), "users": len(row.get("users", []))})
        return rows

    recent = []
    async for event in db.analytics_events.find(match, {"_id": 0}).sort("created_at", -1).limit(25):
        recent.append(event)
    return {
        "summary": {"total_events": total_events, "unique_users": unique_users, "visits": visits, "clicks": clicks, "forms": forms},
        "by_event_type": await aggregate_group("event_type"),
        "by_page": await aggregate_group("path"),
        "by_section": await aggregate_group("section_id"),
        "by_product": await aggregate_group("product_id"),
        "recent_events": recent,
    }


@api_router.get("/admin/analytics/options")
async def admin_analytics_options(request: Request):
    verify_admin_request(request)
    return {
        "event_types": sorted([item for item in await db.analytics_events.distinct("event_type") if item]),
        "pages": sorted([item for item in await db.analytics_events.distinct("path") if item]),
        "products": sorted([item for item in await db.analytics_events.distinct("product_id") if item]),
    }


@api_router.get("/admin/analytics/export")
async def admin_analytics_export(request: Request, format: str = "csv", start_date: Optional[str] = None, end_date: Optional[str] = None, event_type: Optional[str] = None, page: Optional[str] = None, product_id: Optional[str] = None):
    verify_admin_request(request)
    match = event_match_filter(start_date, end_date, event_type, page, product_id)
    events = []
    async for event in db.analytics_events.find(match, {"_id": 0}).sort("created_at", -1).limit(5000):
        events.append(event)
    if format.lower() == "json":
        payload = json.dumps(events, ensure_ascii=False, indent=2).encode()
        return StreamingResponse(io.BytesIO(payload), media_type="application/json", headers={"Content-Disposition": "attachment; filename=\"evolvix-analytics.json\""})
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["created_at", "event_type", "path", "label", "section_id", "product_id", "session_id", "metadata", "user_agent"])
    writer.writeheader()
    for event in events:
        writer.writerow({
            "created_at": event.get("created_at", ""),
            "event_type": event.get("event_type", ""),
            "path": event.get("path", ""),
            "label": event.get("label", ""),
            "section_id": event.get("section_id", ""),
            "product_id": event.get("product_id", ""),
            "session_id": event.get("session_id", ""),
            "metadata": json.dumps(event.get("metadata", {}), ensure_ascii=False),
            "user_agent": event.get("user_agent", ""),
        })
    payload = output.getvalue().encode()
    return StreamingResponse(io.BytesIO(payload), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=\"evolvix-analytics.csv\""})



# --- Leads (contacts + newsletter) ---

@api_router.get("/admin/leads/contacts")
async def admin_leads_contacts(request: Request):
    verify_admin_request(request)
    docs = []
    async for doc in db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).limit(200):
        docs.append(doc)
    return {"contacts": docs, "total": len(docs)}

@api_router.get("/admin/leads/contacts/export")
async def admin_leads_contacts_export(request: Request):
    verify_admin_request(request)
    docs = []
    async for doc in db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1):
        docs.append(doc)
    fields = ["id", "name", "email", "phone", "inquiry_type", "message", "status", "created_at"]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for doc in docs:
        writer.writerow({k: doc.get(k, "") for k in fields})
    payload = output.getvalue().encode("utf-8")
    return StreamingResponse(io.BytesIO(payload), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=\"evolvix-contacts.csv\""})

@api_router.get("/admin/leads/newsletter")
async def admin_leads_newsletter(request: Request):
    verify_admin_request(request)
    docs = []
    async for doc in db.newsletter_signups.find({}, {"_id": 0}).sort("created_at", -1).limit(1000):
        docs.append(doc)
    return {"subscribers": docs, "total": len(docs)}

@api_router.get("/admin/leads/newsletter/export")
async def admin_leads_newsletter_export(request: Request):
    verify_admin_request(request)
    docs = []
    async for doc in db.newsletter_signups.find({}, {"_id": 0}).sort("created_at", -1):
        docs.append(doc)
    fields = ["id", "email", "source", "created_at"]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for doc in docs:
        writer.writerow({k: doc.get(k, "") for k in fields})
    payload = output.getvalue().encode("utf-8")
    return StreamingResponse(io.BytesIO(payload), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=\"evolvix-newsletter.csv\""})


# --- Playground ---

class PlaygroundItemCreate(BaseModel):
    category: str  # "music" | "freebie" | "game"
    title: str
    description: str
    url: str
    thumbnail: str = ""
    preview_url: str = ""
    visible: bool = True


class PlaygroundReorder(BaseModel):
    ids: List[str]


@api_router.get("/playground")
async def get_playground_items():
    items = []
    async for doc in db.playground_items.find({"visible": True}, {"_id": 0}).sort(
        [("position", 1), ("created_at", 1)]
    ):
        items.append(doc)
    return {"items": items}


@api_router.get("/admin/playground")
async def admin_get_playground(request: Request):
    verify_admin_request(request)
    items = []
    async for doc in db.playground_items.find({}, {"_id": 0}).sort(
        [("position", 1), ("created_at", 1)]
    ):
        items.append(doc)
    return {"items": items}


@api_router.post("/admin/playground/reorder")
async def admin_reorder_playground(payload: PlaygroundReorder, request: Request):
    verify_admin_request(request)
    for i, item_id in enumerate(payload.ids):
        await db.playground_items.update_one({"id": item_id}, {"$set": {"position": i}})
    return {"message": "Reordered"}


@api_router.post("/admin/playground")
async def admin_create_playground_item(payload: PlaygroundItemCreate, request: Request):
    verify_admin_request(request)
    count = await db.playground_items.count_documents({})
    item = {
        "id": f"pg-{uuid.uuid4().hex[:10]}",
        "category": payload.category,
        "title": payload.title,
        "description": payload.description,
        "url": payload.url,
        "thumbnail": payload.thumbnail,
        "preview_url": payload.preview_url,
        "visible": payload.visible,
        "position": count,
        "created_at": now_iso(),
    }
    await db.playground_items.insert_one(item)
    item.pop("_id", None)
    return {"item": item}


@api_router.put("/admin/playground/{item_id}")
async def admin_update_playground_item(item_id: str, payload: PlaygroundItemCreate, request: Request):
    verify_admin_request(request)
    update = {
        "category": payload.category,
        "title": payload.title,
        "description": payload.description,
        "url": payload.url,
        "thumbnail": payload.thumbnail,
        "preview_url": payload.preview_url,
        "visible": payload.visible,
        "updated_at": now_iso(),
    }
    result = await db.playground_items.update_one({"id": item_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item updated"}


@api_router.delete("/admin/playground/{item_id}")
async def admin_delete_playground_item(item_id: str, request: Request):
    verify_admin_request(request)
    result = await db.playground_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}


def get_razorpay_client() -> razorpay.Client:
    return razorpay.Client(auth=(os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"]))


# ── Invoicing ──────────────────────────────────────────────────────────────────

SAC_CODE_DIGITAL_PRODUCTS = "998431"  # AI prompt packs / e-books / digital activity books — internal GST-reporting use only, never rendered on the customer invoice
GST_RATE = 0.18


async def next_invoice_number() -> str:
    # GST invoices only (series 26) — this business has no non-GST invoice path.
    # Atomic Mongo counter avoids the race condition the offline desktop tool's
    # "scan all bills for the max, then +1" approach would have under concurrent orders.
    year = datetime.now(timezone.utc).year
    series = 26
    counter_id = f"invoice-{year}-{series}"
    result = await db.counters.find_one_and_update(
        {"id": counter_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    seq = series * 1000 + result["seq"]
    return f"ETM-{year}-{seq}"


def compute_invoice_totals(charged_amount: float, customer_state: str) -> Dict[str, Any]:
    # Product prices are treated as GST-inclusive (charged_amount is exactly what Razorpay
    # collects), so the taxable value is back-calculated rather than adding GST on top.
    # tax_total is the residual (charged - taxable), not an independently-rounded 18% figure,
    # so taxable_value + tax always foots exactly to charged_amount with no rounding drift.
    taxable_value = round(charged_amount / (1 + GST_RATE), 2)
    tax_total = round(charged_amount - taxable_value, 2)
    is_intra_state = customer_state == BUSINESS_STATE
    if is_intra_state:
        cgst = round(tax_total / 2, 2)
        sgst = round(tax_total - cgst, 2)
        igst = 0.0
    else:
        cgst = 0.0
        sgst = 0.0
        igst = tax_total
    return {
        "taxable_value": taxable_value,
        "cgst": cgst,
        "sgst": sgst,
        "igst": igst,
        "is_intra_state": is_intra_state,
        "total": charged_amount,
    }


def render_invoice_html(
    business_name: str,
    business_address: str,
    business_gstin: str,
    invoice_number: str,
    invoice_date: str,
    customer_name: str,
    customer_email: str,
    product_title: str,
    product_description: str,
    taxable_value: float,
    is_intra_state: bool,
    cgst: float,
    sgst: float,
    igst: float,
    total: float,
    signed_at: str,
) -> str:
    # Customer-facing invoice: no SAC/HSN code shown anywhere (kept internal for GST reporting only)
    if is_intra_state:
        tax_rows = (
            f'<tr><td style="padding:4px 0;color:#555">CGST @ 9%</td><td style="text-align:right;padding:4px 0;color:#555">₹{cgst:,.2f}</td></tr>'
            f'<tr><td style="padding:4px 0;color:#555">SGST @ 9%</td><td style="text-align:right;padding:4px 0;color:#555">₹{sgst:,.2f}</td></tr>'
        )
    else:
        tax_rows = f'<tr><td style="padding:4px 0;color:#555">IGST @ 18%</td><td style="text-align:right;padding:4px 0;color:#555">₹{igst:,.2f}</td></tr>'

    return f"""
<div style="max-width:700px;margin:0 auto;background:white;color:#222;padding:32px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;border:1px solid #eee">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #7c3aed;padding-bottom:16px;margin-bottom:20px">
    <div>
      <div style="font-size:20px;font-weight:700;color:#7c3aed">{business_name}</div>
      <div style="font-size:11px;color:#666;margin-top:4px;max-width:260px">{business_address}</div>
      <div style="font-size:11px;color:#666;margin-top:4px"><strong>GSTIN:</strong> {business_gstin}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:22px;font-weight:700;color:#7c3aed">TAX INVOICE</div>
      <div style="font-size:12px;color:#666;margin-top:8px"><strong>#</strong> {invoice_number}</div>
      <div style="font-size:12px;color:#666"><strong>Date:</strong> {invoice_date}</div>
    </div>
  </div>
  <div style="margin-bottom:20px">
    <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:4px">Billed To</div>
    <div style="font-size:14px;font-weight:700">{customer_name}</div>
    <div style="font-size:12px;color:#555">{customer_email}</div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px">
    <thead>
      <tr style="background:#7c3aed;color:white">
        <th style="text-align:left;padding:8px 10px">Description</th>
        <th style="text-align:right;padding:8px 10px">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee">
          <div style="font-weight:600">{product_title}</div>
          <div style="font-size:11px;color:#777;margin-top:2px">{product_description}</div>
        </td>
        <td style="text-align:right;padding:10px;border-bottom:1px solid #eee;vertical-align:top">₹{taxable_value:,.2f}</td>
      </tr>
    </tbody>
  </table>
  <div style="display:flex;justify-content:flex-end">
    <table style="width:280px;font-size:12px">
      <tr><td style="padding:4px 0;color:#555">Taxable Value</td><td style="text-align:right;padding:4px 0;color:#555">₹{taxable_value:,.2f}</td></tr>
      {tax_rows}
      <tr style="font-weight:700;font-size:14px">
        <td style="padding-top:8px;border-top:2px solid #7c3aed">Total Amount</td>
        <td style="text-align:right;padding-top:8px;border-top:2px solid #7c3aed">₹{total:,.2f}</td>
      </tr>
    </table>
  </div>
  <div style="display:flex;justify-content:flex-end;margin-top:28px">
    <div style="text-align:center;border:1px solid #eee;border-radius:8px;padding:10px 20px">
      <div style="font-family:'Brush Script MT',cursive;font-size:19px;color:#7c3aed">{business_name}</div>
      <div style="font-size:9px;color:#999;margin-top:3px;letter-spacing:0.5px">DIGITALLY SIGNED</div>
      <div style="font-size:10px;color:#777;margin-top:1px">{signed_at}</div>
    </div>
  </div>
  <div style="margin-top:16px;text-align:center;font-size:9px;color:#bbb;border-top:1px solid #f0f0f0;padding-top:10px">
    Computer-generated invoice — {business_name}
  </div>
</div>
"""


async def build_invoice_for_transaction(transaction: Dict[str, Any], product: Dict[str, Any]) -> Dict[str, Any]:
    user = await db.users.find_one({"id": transaction.get("user_id")}, {"_id": 0})
    customer_state = transaction.get("customer_state") or (user or {}).get("state") or BUSINESS_STATE
    totals = compute_invoice_totals(float(transaction["amount"]), customer_state)
    moment = now_ist()
    invoice_number = await next_invoice_number()
    return {
        "invoice_number": invoice_number,
        "invoice_date": moment.strftime("%d %b %Y"),
        "signed_at": moment.strftime("%d %b %Y, %H:%M:%S IST"),
        "sac_code": transaction.get("sac_code", SAC_CODE_DIGITAL_PRODUCTS),
        "customer_state": customer_state,
        "gst_rate": GST_RATE,
        "customer_name": (user or {}).get("name") or (user or {}).get("email") or transaction.get("metadata", {}).get("user_email", "Customer"),
        "customer_email": (user or {}).get("email") or transaction.get("metadata", {}).get("user_email", ""),
        "product_title": product.get("title") or transaction.get("metadata", {}).get("product_title", "Evolvix product"),
        "product_description": product.get("description", ""),
        **totals,
    }


async def render_invoice_for_transaction(transaction: Dict[str, Any]) -> str:
    invoice = transaction.get("invoice")
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not available yet")
    custom = await db.site_content.find_one({"id": "primary"}, {"_id": 0})
    content = merged_site_content(custom.get("content") if custom else None)
    return render_invoice_html(
        business_name=content["brand"]["name"],
        business_address=content["contact"]["address"],
        business_gstin=content["brand"]["gstin"],
        invoice_number=invoice["invoice_number"],
        invoice_date=invoice["invoice_date"],
        customer_name=invoice["customer_name"],
        customer_email=invoice["customer_email"],
        product_title=invoice["product_title"],
        product_description=invoice["product_description"],
        taxable_value=invoice["taxable_value"],
        is_intra_state=invoice["is_intra_state"],
        cgst=invoice["cgst"],
        sgst=invoice["sgst"],
        igst=invoice["igst"],
        total=invoice["total"],
        signed_at=invoice["signed_at"],
    )


@api_router.post("/payments/checkout")
async def create_checkout_session(payload: CheckoutCreate, request: Request):
    user = await require_user(request)
    catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
    products = normalize_catalog_items(catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values()), "products")
    product = next((item for item in products if item.get("id") == payload.product_id or item.get("slug") == payload.product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not payload.origin_url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid origin URL")

    currency = str(product["currency"]).upper()
    amount_subunits = int(round(float(product["price"]) * 100))
    metadata = {"product_id": product["id"], "product_title": product["title"], "source": "evolvix_website", "user_id": user["id"], "user_email": user["email"]}
    order = get_razorpay_client().order.create({
        "amount": amount_subunits,
        "currency": currency,
        "receipt": f"evolvix-{uuid.uuid4().hex[:16]}",
        "notes": metadata,
    })
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": order["id"],
        "product_id": product["id"],
        "user_id": user["id"],
        "amount": float(product["price"]),
        "currency": currency,
        "metadata": metadata,
        "status": "initiated",
        "payment_status": "pending",
        "processed": False,
        # Snapshotted at order time so a later profile change never rewrites a past invoice's tax basis.
        "customer_state": user.get("state") or BUSINESS_STATE,
        "sac_code": SAC_CODE_DIGITAL_PRODUCTS,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.payment_transactions.insert_one(transaction)
    return {
        "session_id": order["id"],
        "order_id": order["id"],
        "amount": amount_subunits,
        "currency": currency,
        "key_id": os.environ["RAZORPAY_KEY_ID"],
        "product_title": product["title"],
    }


@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")

    order: Optional[Dict[str, Any]] = None
    payments: List[Dict[str, Any]] = []
    try:
        client = get_razorpay_client()
        order = client.order.fetch(session_id)
        payments = client.order.payments(session_id).get("items", [])
    except Exception as exc:
        logger.warning("Razorpay status lookup failed for %s: %s", session_id, exc)
        existing_payment_status = transaction.get("payment_status") or "pending"
        existing_status = transaction.get("status") or "initiated"
        fallback_payment_status = "paid" if existing_payment_status == "paid" or transaction.get("processed") else existing_payment_status
        fallback_status = "complete" if fallback_payment_status == "paid" else existing_status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": fallback_status, "payment_status": fallback_payment_status, "provider_status_error": str(exc), "updated_at": now_iso()}},
        )
        catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
        products = normalize_catalog_items(catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values()), "products")
        product = next((item for item in products if item.get("id") == transaction.get("product_id") or item.get("slug") == transaction.get("product_id")), {})
        return {
            "status": fallback_status,
            "payment_status": fallback_payment_status,
            "amount_total": int(float(transaction.get("amount", 0)) * 100),
            "currency": transaction.get("currency", "INR"),
            "metadata": transaction.get("metadata", {}),
            "delivery": product.get("delivery", "Digital delivery will be prepared after payment confirmation."),
            "provider_status": "pending_verification",
        }

    captured = any(item.get("status") == "captured" for item in payments)
    payment_status = "paid" if captured else ("unpaid" if order.get("status") in ("created", "attempted") else order.get("status", "unpaid"))
    status_value = "complete" if captured else "open"
    catalog = await db.editable_catalog.find_one({"id": "primary"}, {"_id": 0})
    products = normalize_catalog_items(catalog.get("products", list(PRODUCTS.values())) if catalog else list(PRODUCTS.values()), "products")
    product_id = transaction.get("product_id") or transaction.get("metadata", {}).get("product_id")
    product = next((item for item in products if item.get("id") == product_id or item.get("slug") == product_id), {})

    update_doc = {"status": status_value, "payment_status": payment_status, "updated_at": now_iso()}
    if payment_status == "paid" and not transaction.get("processed"):
        update_doc["processed"] = True
        update_doc["delivered_at"] = now_iso()
    if payment_status == "paid" and not transaction.get("invoice"):
        update_doc["invoice"] = await build_invoice_for_transaction(transaction, product)
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update_doc})
    return {
        "status": status_value,
        "payment_status": payment_status,
        "amount_total": order.get("amount", int(float(transaction.get("amount", 0)) * 100)),
        "currency": order.get("currency", transaction.get("currency", "INR")),
        "metadata": transaction.get("metadata", {}),
        "delivery": product.get("delivery", "Digital delivery will be prepared after payment confirmation."),
    }


@api_router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    try:
        get_razorpay_client().utility.verify_webhook_signature(body.decode(), signature, os.environ["RAZORPAY_WEBHOOK_SECRET"])
    except razorpay.errors.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook signature") from exc

    event = json.loads(body)
    event_type = event.get("event", "")
    payload_entity = event.get("payload", {})
    entity = payload_entity.get("payment", {}).get("entity") or payload_entity.get("order", {}).get("entity") or {}
    order_id = entity.get("order_id") or entity.get("id")

    payment_status = {"payment.captured": "paid", "order.paid": "paid", "payment.failed": "failed"}.get(event_type)
    if order_id and payment_status:
        await db.payment_transactions.update_one(
            {"session_id": order_id},
            {"$set": {"payment_status": payment_status, "event_type": event_type, "updated_at": now_iso()}},
        )
        if payment_status == "paid":
            asyncio.create_task(send_purchase_confirmation(order_id))
    return {"received": True}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


EVOLVIX_SYSTEM_PROMPT = """You are the Evolvix Tech Media virtual assistant — friendly, concise, and helpful.

About Evolvix Tech Media:
- A technology and creative solutions company based in Bardhaman, West Bengal, India
- GST Registered, Udyam Registered MSME, IEC Registered, GST Invoice available
- Contact: +91 98318 42869 (call & WhatsApp), Facebook page available
- Website: evolvixtech.in

What Evolvix offers (four pillars):

1. Evolvix LearnAI (ready to buy at evolvixtech.in/shop):
   - AI Prompt Packs, Learning Resources, Business Packs, Career Packs, Creator Packs, Productivity Packs
   - Digital downloads — instant delivery after purchase

2. Evolvix BuildX (on-demand, custom quote):
   - Web Applications, Mobile Applications, Business Software, Enterprise SaaS, AI-Powered Products
   - Custom websites, e-commerce, CRM, automation systems

3. Evolvix Creative (on-demand, custom quote):
   - Branding & Identity, Graphic Design, Digital Assets, Multimedia Design, Pitch Decks
   - ATS-Friendly Resume Building, Resume Design (for freshers, professionals, career changers)
   - Turnaround: typically 2–3 working days for resume/design work

4. Evolvix Business (on-demand, custom quote):
   - AI Business Consulting, Business Automation, CRM Solutions, SaaS Solutions, Growth Strategy
   - Suitable for local businesses and startups in and around Bardhaman

Pricing policy (IMPORTANT):
- NEVER state specific prices or ranges — always say pricing depends on specific requirements and the team will share a custom quote.
- For LearnAI products: pricing is available in the Evolvix Store at evolvixtech.in/shop

Response rules:
- Keep replies short — 2 to 4 sentences, or a brief list if listing items. Never write a wall of text.
- If the user asks what services Evolvix offers, list each service on its OWN line with a blank line between them. Do not put all four in one paragraph.
- Never use markdown asterisks (**bold**) or other symbols — plain text only.
- When listing items, use this format exactly (newline between each):
  1. Name — short description
  2. Name — short description
- If asked something you are not confident about, say "Let me connect you with the Evolvix team — they can give you a precise answer."
- Always end a conversation branch by offering to connect via WhatsApp or Call when the user seems ready to take action.
- Do not make up services, timelines, or guarantees not listed above.
- If the user sends a greeting (hi, hello, hey), respond warmly and ask how you can help — do not list all services upfront.
"""

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@api_router.post("/chat")
async def chat_stream(payload: ChatRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="Chat service not configured.")

    anthropic_client = _anthropic.Anthropic(api_key=api_key)
    messages = [{"role": m.role, "content": m.content} for m in payload.messages if m.role in ("user", "assistant")]

    async def generate():
        with anthropic_client.messages.stream(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            system=EVOLVIX_SYSTEM_PROMPT,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()