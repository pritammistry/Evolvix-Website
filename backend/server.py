from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
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


DEFAULT_SITE_CONTENT: Dict[str, Any] = {
    "brand": {
        "name": "Evolvix Tech Media",
        "tagline": "CREATE • INNOVATE • ELEVATE",
        "headline": "Empowering People & Businesses Through AI.",
        "subheadline": "From creative digital services to intelligent business solutions.",
        "gstin": "19BVTPM1874M1ZK",
        "core_areas": ["AI", "Digital", "Business", "Creative Solutions"],
    },
    "contact": {
        "address": "Chhotonilpur, Bardhaman, West Bengal 713103",
        "phone": "+91 98318 42869",
        "whatsapp": "+91 98318 42869",
        "email": "evolvixtech0pm@gmail.com",
        "facebook": "https://facebook.com/evolvixtech",
        "google_location": "https://maps.google.com/?q=Bardhaman%2C%20West%20Bengal%20713103",
        "gumroad": "https://gumroad.com/",
        "website_status": "Coming Soon",
    },
    "trust_strip": ["GST Registered Business", "Udyam Registered MSME", "IEC Registered", "Facebook", "Google Location", "Bardhaman, West Bengal"],
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
        {"name": "Learning and Growth", "status": "Now Available", "description": "AI prompt packs, learning guides, cheat sheets, workbooks, smart routines, and future courses.", "items": ["AI Prompt Packs", "Career Packs", "Student Packs", "Creator Packs", "AI Workbooks", "Future Courses"]},
        {"name": "BuildX", "status": "On-Demand", "description": "Custom technology products for web, mobile, business software, SaaS, and AI-powered ideas.", "items": ["Web Applications", "Mobile Applications", "Business Software", "SaaS", "AI Powered Products"]},
        {"name": "Creative", "status": "On-Demand", "description": "Branding, identity, graphic design, social creatives, presentations, catalogs, and digital assets.", "items": ["Branding", "Design", "Digital Assets", "Pitch Decks", "Social Creatives"]},
        {"name": "Business", "status": "On-Demand", "description": "AI consulting, automation, CRM thinking, digital transformation, and growth strategy.", "items": ["AI Consulting", "Automation", "CRM Solutions", "Digital Transformation", "Growth Strategy"]},
        {"name": "Accessibility", "status": "On-Demand", "description": "Simple digital support, beginner-friendly AI guidance, and accessible resources for everyday users.", "items": ["Beginner Guides", "Family Support", "Elder-Friendly Tech", "Simple AI Help"]},
        {"name": "Music", "status": "On-Demand", "description": "AI background music, mood-based tracks, creator music packs, podcast intros, and audio branding.", "items": ["Reels Music", "Shorts Audio", "Mood Tracks", "Podcast Intros", "Brand Music"]},
        {"name": "Brand Assets", "status": "On-Demand", "description": "Premium identity kits, creator assets, launch visuals, product mockups, and brand-ready design systems.", "items": ["Logo Systems", "Mockups", "Launch Assets", "Creator Kits"]},
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
}


def merged_site_content(custom_content: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    merged = {**DEFAULT_SITE_CONTENT, **(custom_content or {})}
    merged["brand"] = {**DEFAULT_SITE_CONTENT["brand"], **(custom_content or {}).get("brand", {})}
    merged["contact"] = {**DEFAULT_SITE_CONTENT["contact"], **(custom_content or {}).get("contact", {})}
    merged["analytics_report_settings"] = {**DEFAULT_SITE_CONTENT["analytics_report_settings"], **(custom_content or {}).get("analytics_report_settings", {})}
    for list_key in ["trust_strip", "creative_services", "technology_services", "ecosystem", "learning_categories", "music_services", "music_previews", "custom_sections", "testimonials", "why_choose"]:
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
    {"id": "b1", "slug": "learning-ai-without-overwhelm", "title": "Learning AI Without Overwhelm", "category": "AI Tools", "excerpt": "A clear path for students, parents, and professionals entering the AI era.", "read_time": "5 min", "date": "2026-05-13"},
    {"id": "b2", "slug": "mood-based-creative-media", "title": "Mood-Based Creative Media", "category": "Music Creativity", "excerpt": "How emotion can guide music prompts, digital art direction, and story worlds.", "read_time": "4 min", "date": "2026-05-10"},
    {"id": "b3", "slug": "digital-products-that-build-trust", "title": "Digital Products That Build Trust", "category": "Creator Resources", "excerpt": "What buyers need to see before purchasing downloads, bundles, and templates.", "read_time": "6 min", "date": "2026-05-08"},
    {"id": "b4", "slug": "five-ai-habits-for-students", "title": "Five AI Habits for Students", "category": "Student-Friendly Tech", "excerpt": "Simple study, research, and revision routines that keep AI helpful instead of distracting.", "read_time": "5 min", "date": "2026-05-06"},
    {"id": "b5", "slug": "how-to-package-a-digital-download", "title": "How to Package a Digital Download", "category": "Digital Products", "excerpt": "A buyer-first checklist for naming, previewing, pricing, and delivering digital products clearly.", "read_time": "7 min", "date": "2026-05-04"},
    {"id": "b6", "slug": "ai-for-parents-and-older-users", "title": "AI for Parents and Older Users", "category": "AI Tools", "excerpt": "A warm guide to making new technology feel safe, useful, and less intimidating at home.", "read_time": "6 min", "date": "2026-05-02"},
    {"id": "b7", "slug": "mood-memory-and-music-prompts", "title": "Mood, Memory, and Music Prompts", "category": "Music Creativity", "excerpt": "How nostalgia, calm, focus, and cinematic emotion can become stronger creative briefs.", "read_time": "4 min", "date": "2026-04-30"},
    {"id": "b8", "slug": "creator-productivity-without-burnout", "title": "Creator Productivity Without Burnout", "category": "Productivity", "excerpt": "A practical operating rhythm for creators balancing learning, content, products, and rest.", "read_time": "5 min", "date": "2026-04-28"},
    {"id": "b9", "slug": "trust-signals-every-small-digital-brand-needs", "title": "Trust Signals Every Small Digital Brand Needs", "category": "Creator Resources", "excerpt": "The visual, copy, support, and policy details that help visitors feel safe buying from you.", "read_time": "6 min", "date": "2026-04-25"},
    {"id": "b10", "slug": "from-prompt-to-product", "title": "From Prompt to Product", "category": "Digital Creativity", "excerpt": "A simple framework for turning AI-assisted ideas into useful templates, kits, and content systems.", "read_time": "8 min", "date": "2026-04-22"},
    {"id": "b11", "slug": "grow-yourself-using-ai", "title": "Grow Yourself Using AI", "category": "Learning and Growth", "excerpt": "A practical path for using AI to improve learning, career planning, creativity, and daily routines.", "read_time": "5 min", "date": "2026-04-20"},
    {"id": "b12", "slug": "ai-consulting-for-small-business", "title": "AI Consulting for Small Business", "category": "Business Consulting", "excerpt": "How small businesses can start with AI workflows, automation, digital tools, and better customer systems.", "read_time": "6 min", "date": "2026-04-18"},
    {"id": "b13", "slug": "accessible-ai-for-everyday-users", "title": "Accessible AI for Everyday Users", "category": "Accessibility", "excerpt": "Why AI support should feel simple, safe, and useful for beginners, families, and older users.", "read_time": "4 min", "date": "2026-04-16"}
]


class ContactMessageCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
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
    if payload.password != os.environ["ADMIN_PASSWORD"]:
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
    return {"id": doc["id"], "message": "Thanks — your message has been received."}


@api_router.post("/newsletter")
async def create_newsletter_signup(payload: NewsletterCreate):
    doc = {"id": str(uuid.uuid4()), "email": payload.email, "created_at": now_iso(), "source": "website"}
    await db.newsletter_signups.update_one({"email": payload.email}, {"$setOnInsert": doc}, upsert=True)
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
    return {"received": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()