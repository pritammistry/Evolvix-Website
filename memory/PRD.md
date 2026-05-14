# Evolvix Tech Media PRD

## Original Problem Statement
Build a professional, premium, futuristic website for Evolvix Tech Media using the provided brand logos. The site must combine brand portfolio, digital product sales, direct purchase flow, downloadable/digital product delivery messaging, AI/tech storytelling, AI music / mood-based creative media, blog insights, FAQ, contact, and legal policy pages. The design direction is black/deep charcoal with white/off-white text and purple, cyan, electric blue, and subtle magenta accents; premium, futuristic, trustworthy, warm, accessible, and scalable.

## Architecture Decisions
- Frontend: React with reusable layout, brand components, page components, central editable content in `src/data/siteContent.js`.
- Backend: FastAPI with MongoDB via existing `MONGO_URL`; static editable product catalog and content endpoints.
- Payments: Stripe checkout via `emergentintegrations`, with `payment_transactions` records and safe status polling fallback.
- Persistence: Contact form submissions, newsletter signups, and payment transactions stored in MongoDB.
- Branding: Uploaded Evolvix logo assets used in header, hero, footer, favicon/social metadata.

## User Personas
- Students and beginners learning AI.
- Young creators and music lovers exploring AI-assisted creative media.
- Professionals and small businesses needing digital clarity.
- Parents and elderly users who want simple, accessible tech support.
- Buyers of digital templates, creator assets, learning kits, and bundles.

## Core Requirements
- Premium responsive site with Home, About, Portfolio, Shop, Product Detail, AI Music/Creative Lab, Blog, FAQ, Contact, Terms, Privacy, and Refund pages.
- Direct purchase flow with product catalog, filters, search, product details, Stripe checkout initiation, and checkout status page.
- Contact and newsletter forms connected to backend storage.
- Editable product cards, portfolio entries, blog posts, music moods, contact details, footer links, copy, and brand content.
- SEO/social metadata and accessible navigation across desktop/mobile.

## Implemented — 2026-05-14
- Built full React website structure with premium futuristic Evolvix visual identity and responsive desktop/mobile layouts.
- Added complete pages: Home, About/Vision, Portfolio filters, Shop filters/search, Product Detail, Creative Lab mood interaction, Blog, FAQ, Contact, Terms, Privacy, Refund, Checkout Result.
- Implemented FastAPI endpoints: `/api/`, `/api/site-content`, `/api/products`, `/api/products/{slug}`, `/api/contact`, `/api/newsletter`, `/api/payments/checkout`, `/api/payments/status/{session_id}`, `/api/webhook/stripe`.
- Added Stripe checkout session creation and MongoDB `payment_transactions` tracking with safe status polling behavior.
- Added contact/newsletter persistence and public product catalog including `digital-forward-2` contract.
- Verified with linting, API curl tests, desktop/mobile Playwright screenshots, and backend regression tests: 9 passed.

## Implemented — 2026-05-14 Content Expansion
- Expanded product catalog from 5 to 8 products, adding AI Confidence Workbook, Mood-to-Music Creation Kit, and Creator Store Launch Vault.
- Added delivery/file slots for product downloads so final assets can be attached later per product.
- Expanded portfolio from 6 to 12 entries across Learning, Music, Digital Products, Business, Accessibility, and Brand Assets.
- Expanded blog from 3 to 10 insight topics across AI tools, student-friendly tech, digital products, creator resources, productivity, and music creativity.
- Added blog category filtering and richer product detail content using product-specific benefits, inclusions, and file slots.

## Prioritized Backlog
### P0 Remaining
- Replace placeholder contact details with final email, WhatsApp, and social URLs when available.
- Replace example external purchase URLs with final business links if needed.
- Attach real downloadable product files to prepared file slots.

### P1 Remaining
- Add an owner-friendly admin/editor interface for updating products, posts, portfolio, testimonials, and music moods without editing code.
- Add real downloadable file delivery links or object storage for purchased digital products.
- Expand legal templates with final jurisdiction/business terms.

### P2 Remaining
- Add testimonial/review management.
- Add full blog article detail pages and SEO schema.
- Add audio previews for AI music/mood cards.
- Add analytics-ready event tracking for product views, checkout clicks, and contact conversions.

## Next Tasks
1. Collect final contact/social details and replace placeholders.
2. Add real product files and delivery mechanism.
3. Add admin customization panel for non-technical updates.
4. Expand product catalog and portfolio with real brand work.
