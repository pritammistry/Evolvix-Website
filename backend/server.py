from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Evolvix Tech Media API")
api_router = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


PRODUCTS: Dict[str, Dict[str, Any]] = {
    "ai-starter-kit": {
        "id": "ai-starter-kit", "slug": "ai-starter-kit", "title": "AI Starter Kit for Everyday Productivity",
        "price": 29.00, "currency": "usd", "category": "Learning", "tag": "Best Seller",
        "description": "Simple prompt systems, checklists, and workflows for students, professionals, parents, and beginners.",
        "benefits": ["Understand AI without overwhelm", "Save hours on common tasks", "Use plain-language templates"],
        "included": ["Prompt library", "Beginner guide", "Productivity checklist", "Update notes"],
        "delivery": "Instant digital delivery after successful checkout.",
        "license": "Personal and small-team use. Redistribution is not included.",
        "image": "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://example.com/evolvix-ai-starter-kit"
    },
    "creator-assets-bundle": {
        "id": "creator-assets-bundle", "slug": "creator-assets-bundle", "title": "Creator Assets Glow Bundle",
        "price": 39.00, "currency": "usd", "category": "Assets", "tag": "Featured",
        "description": "Premium digital overlays, launch graphics, and brand blocks for social posts and digital products.",
        "benefits": ["Build a polished visual presence", "Speed up product launches", "Reusable across campaigns"],
        "included": ["Editable graphics", "Social templates", "Cover art textures", "Usage guide"],
        "delivery": "Download link delivered after payment confirmation.",
        "license": "Commercial use for your own brand or client work; resale as a template pack is not included.",
        "image": "https://images.unsplash.com/photo-1635776063043-ab23b4c226f6?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://example.com/evolvix-creator-assets"
    },
    "mood-music-pack": {
        "id": "mood-music-pack", "slug": "mood-music-pack", "title": "Mood Music Prompt Pack",
        "price": 19.00, "currency": "usd", "category": "Music", "tag": "New",
        "description": "Emotion-led creative prompts for AI-assisted music ideas, scene moods, and storytelling sound palettes.",
        "benefits": ["Translate feelings into creative directions", "Explore calm, focus, cinematic, and nostalgic moods", "Ideal for creators and music lovers"],
        "included": ["Mood prompt cards", "Creative briefs", "Track naming ideas", "Expansion notes"],
        "delivery": "Digital PDF and editable notes delivered after checkout.",
        "license": "Personal creative use. Generated outputs belong to the user subject to platform terms.",
        "image": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://example.com/evolvix-mood-music"
    },
    "digital-brand-audit": {
        "id": "digital-brand-audit", "slug": "digital-brand-audit", "title": "Digital Brand Audit Template",
        "price": 49.00, "currency": "usd", "category": "Business", "tag": "Bundle",
        "description": "A structured audit kit for small businesses to improve trust, content, offers, and digital presence.",
        "benefits": ["Identify trust gaps", "Improve your product presentation", "Plan your next content moves"],
        "included": ["Audit worksheet", "Scorecard", "Action plan board", "Client-ready summary template"],
        "delivery": "Instant digital delivery after payment confirmation.",
        "license": "Use internally or with clients. Public resale is not included.",
        "image": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://example.com/evolvix-brand-audit"
    },
    "digital-forward-2": {
        "id": "digital-forward-2", "slug": "digital-forward-2", "title": "Digital Forward 2.0 Bundle",
        "price": 59.00, "currency": "usd", "category": "Bundle", "tag": "Featured",
        "description": "A premium future-readiness pack combining AI prompts, digital planning sheets, and creator/business clarity tools.",
        "benefits": ["Plan your next digital move", "Package learning and creation together", "Build confidence for AI-era workflows"],
        "included": ["AI readiness workbook", "Creator product planner", "Digital support scripts", "Launch checklist"],
        "delivery": "Digital bundle delivery details are shown after payment confirmation.",
        "license": "Personal, creator, and small-business use. Resale as a standalone bundle is not included.",
        "image": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://example.com/evolvix-digital-forward-2",
        "file_slots": ["Digital Forward Workbook PDF", "Creator Planner Spreadsheet", "Support Script Library"]
    },
    "ai-confidence-workbook": {
        "id": "ai-confidence-workbook", "slug": "ai-confidence-workbook", "title": "AI Confidence Workbook",
        "price": 24.00, "currency": "usd", "category": "Learning", "tag": "New",
        "description": "A gentle step-by-step workbook for beginners, parents, and elderly users learning AI safely.",
        "benefits": ["Learn AI at a calm pace", "Understand everyday use cases", "Reduce fear around new tools"],
        "included": ["Guided workbook", "Safety checklist", "Family support prompts"],
        "delivery": "Digital workbook delivery details are shown after payment confirmation.",
        "license": "Personal and family learning use. Redistribution is not included.",
        "image": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://example.com/evolvix-ai-confidence-workbook",
        "file_slots": ["AI Confidence Workbook PDF", "Safe AI Checklist PDF", "Family Help Cards PDF"]
    },
    "mood-to-music-creation-kit": {
        "id": "mood-to-music-creation-kit", "slug": "mood-to-music-creation-kit", "title": "Mood-to-Music Creation Kit",
        "price": 27.00, "currency": "usd", "category": "Music", "tag": "Featured",
        "description": "A creative system for turning emotion, color, and story into AI-assisted music directions.",
        "benefits": ["Map emotions into sonic palettes", "Build stronger creative prompts", "Develop music concepts by mood"],
        "included": ["Mood map", "Sound palette cards", "Story-to-song worksheet"],
        "delivery": "Creative kit delivery details are shown after payment confirmation.",
        "license": "Personal creative use and client ideation use. Resale is not included.",
        "image": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://example.com/evolvix-mood-to-music-kit",
        "file_slots": ["Mood Map PDF", "Sound Palette Card Deck", "Story-to-Song Worksheet"]
    },
    "creator-store-launch-vault": {
        "id": "creator-store-launch-vault", "slug": "creator-store-launch-vault", "title": "Creator Store Launch Vault",
        "price": 69.00, "currency": "usd", "category": "Bundle", "tag": "Best Seller",
        "description": "A premium launch kit for creators preparing digital products, sales pages, and promo content.",
        "benefits": ["Prepare a cleaner product launch", "Write stronger product page copy", "Organize social launch content"],
        "included": ["Store launch planner", "Product copy kit", "Promo calendar"],
        "delivery": "Launch vault delivery details are shown after payment confirmation.",
        "license": "Personal creator and small-business use. Resale as a vault is not included.",
        "image": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80",
        "external_purchase_url": "https://example.com/evolvix-creator-store-vault",
        "file_slots": ["Launch Planner PDF", "Product Copy Templates DOCX", "30-Day Promo Calendar Spreadsheet"]
    }
}

PORTFOLIO = [
    {"id": "p1", "title": "AI Learning Journey", "category": "Learning", "summary": "Beginner-friendly AI education system for everyday users.", "image": "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p2", "title": "Mood Sound Worlds", "category": "Music", "summary": "Emotion-based concept collections for AI-assisted music storytelling.", "image": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p3", "title": "Creator Launch Kit", "category": "Digital Products", "summary": "Reusable creator assets and store-ready product visuals.", "image": "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p4", "title": "Small Business Tech Clarity", "category": "Business", "summary": "Practical digital transformation support for non-technical teams.", "image": "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p5", "title": "Accessible AI Guides", "category": "Accessibility", "summary": "Warm, readable guides designed for older users and families.", "image": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p6", "title": "Brand Identity Lab", "category": "Brand Assets", "summary": "Futuristic visual systems for high-trust creator brands.", "image": "https://images.unsplash.com/photo-1609921212029-bb5a28e60960?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p7", "title": "Evolvix Brand Launch System", "category": "Brand Assets", "summary": "A polished identity rollout framework for logo usage, color, tone, and premium trust signals.", "image": "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=80"},
    {"id": "p8", "title": "Student AI Productivity Map", "category": "Learning", "summary": "A practical study workflow concept that turns assignments, revision, and planning into guided AI routines.", "image": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"},
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
    {"id": "b10", "slug": "from-prompt-to-product", "title": "From Prompt to Product", "category": "Digital Creativity", "excerpt": "A simple framework for turning AI-assisted ideas into useful templates, kits, and content systems.", "read_time": "8 min", "date": "2026-04-22"}
]


class ContactMessageCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    inquiry_type: str = Field(..., max_length=80)
    message: str = Field(..., min_length=10, max_length=2500)


class NewsletterCreate(BaseModel):
    email: EmailStr


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
    external_purchase_url: str
    file_slots: List[str] = Field(default_factory=list)


@api_router.get("/")
async def root():
    return {"message": "Evolvix Tech Media API is online", "status": "ready"}


@api_router.get("/site-content")
async def get_site_content():
    return {
        "brand": "Evolvix Tech Media",
        "headline": "Create, innovate, and elevate in the AI era.",
        "products": list(PRODUCTS.values()),
        "portfolio": PORTFOLIO,
        "blog": BLOG_POSTS,
    }


@api_router.get("/products", response_model=List[ProductResponse])
async def get_products():
    return list(PRODUCTS.values())


@api_router.get("/products/{slug}", response_model=ProductResponse)
async def get_product(slug: str):
    product = PRODUCTS.get(slug)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@api_router.get("/products/{slug}/delivery-slots")
async def get_product_delivery_slots(slug: str):
    product = PRODUCTS.get(slug)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "product_id": product["id"],
        "title": product["title"],
        "delivery_status": "file_slots_ready",
        "file_slots": product.get("file_slots", ["Main download file", "Usage guide", "Bonus resource"]),
        "note": "Attach final files to these slots when real product assets are ready.",
    }


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


def get_stripe_checkout(request: Request) -> StripeCheckout:
    api_key = os.environ["STRIPE_API_KEY"]
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)


@api_router.post("/payments/checkout")
async def create_checkout_session(payload: CheckoutCreate, request: Request):
    product = PRODUCTS.get(payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not payload.origin_url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid origin URL")

    success_url = f"{payload.origin_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}&product={product['slug']}"
    cancel_url = f"{payload.origin_url}/products/{product['slug']}?checkout=cancelled"
    metadata = {"product_id": product["id"], "product_title": product["title"], "source": "evolvix_website"}
    checkout_request = CheckoutSessionRequest(
        amount=float(product["price"]),
        currency=product["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await get_stripe_checkout(request).create_checkout_session(checkout_request)
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "product_id": product["id"],
        "amount": float(product["price"]),
        "currency": product["currency"],
        "metadata": metadata,
        "status": "initiated",
        "payment_status": "pending",
        "processed": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.payment_transactions.insert_one(transaction)
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")

    try:
        status = await get_stripe_checkout(request).get_checkout_status(session_id)
    except Exception as exc:
        logger.warning("Stripe status lookup failed for %s: %s", session_id, exc)
        fallback_status = "open"
        fallback_payment_status = "unpaid"
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": fallback_status, "payment_status": fallback_payment_status, "provider_status_error": str(exc), "updated_at": now_iso()}},
        )
        product = PRODUCTS.get(transaction.get("product_id"), {})
        return {
            "status": fallback_status,
            "payment_status": fallback_payment_status,
            "amount_total": int(float(transaction.get("amount", 0)) * 100),
            "currency": transaction.get("currency", "usd"),
            "metadata": transaction.get("metadata", {}),
            "delivery": product.get("delivery", "Digital delivery will be prepared after payment confirmation."),
            "provider_status": "pending_verification",
        }

    update_doc = {"status": status.status, "payment_status": status.payment_status, "updated_at": now_iso()}
    if status.payment_status == "paid" and not transaction.get("processed"):
        update_doc["processed"] = True
        update_doc["delivered_at"] = now_iso()
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update_doc})
    product_id = transaction.get("product_id") or status.metadata.get("product_id")
    product = PRODUCTS.get(product_id, {})
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "metadata": status.metadata,
        "delivery": product.get("delivery", "Digital delivery will be prepared after payment confirmation."),
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    webhook_response = await get_stripe_checkout(request).handle_webhook(await request.body(), request.headers.get("Stripe-Signature"))
    await db.payment_transactions.update_one(
        {"session_id": webhook_response.session_id},
        {"$set": {"payment_status": webhook_response.payment_status, "event_type": webhook_response.event_type, "updated_at": now_iso()}},
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