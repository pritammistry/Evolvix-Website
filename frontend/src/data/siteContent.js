export const logos = {
  circular: "https://customer-assets.emergentagent.com/job_bcabf990-5ebd-4edc-8af2-8a7a2d447789/artifacts/ru37gizu_ChatGPT%20Image%20May%2013%2C%202026%2C%2001_31_02%20PM.png",
  horizontal: "https://customer-assets.emergentagent.com/job_digital-forward-2/artifacts/hgz9bgfb_ChatGPT%20Image%20Jun%2019%2C%202026%2C%2005_36_06%20PM.png",
  icon: "https://customer-assets.emergentagent.com/job_bcabf990-5ebd-4edc-8af2-8a7a2d447789/artifacts/cfnxszjf_ChatGPT%20Image%20May%2013%2C%202026%2C%2001_29_17%20PM.png",
};

export const contactDetails = {
  address: "Chhotonilpur, Bardhaman, West Bengal 713103",
  phone: "+91 98318 42869",
  whatsapp: "+91 98318 42869",
  email: "evolvixtech0pm@gmail.com",
  facebook: "https://facebook.com/evolvixtech",
  google_location: "https://www.google.com/maps?cid=2428437874850568706",
  gumroad: "https://gumroad.com/",
};

export const products = [
  // Evolvix LearnAI — ready-made digital products
  { id: "learnai-starter-pack", slug: "learnai-starter-pack", type: "product", title: "AI Starter Pack for Everyday Use", category: "LearnAI", tag: "Best Seller", description: "Prompt systems, checklists, and calm workflows for everyday AI confidence — beginner-friendly.", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80", benefits: ["Use AI without overwhelm", "Save time on daily tasks", "Start with plain-language prompts"], included: ["Beginner AI guide", "Prompt library", "Daily checklist"], fileSlots: ["AI Starter Workbook PDF", "Prompt Library CSV", "Quick Start Checklist PDF"] },
  { id: "learnai-student-toolkit", slug: "learnai-student-toolkit", type: "product", title: "Student AI Productivity Toolkit", category: "LearnAI", tag: "New", description: "Study smarter, write better, and research faster — a complete AI toolkit built for students.", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80", benefits: ["Structured study routines", "AI-powered writing aids", "Research prompt templates"], included: ["Study planner", "Writing prompt kit", "Research workflow guide"], fileSlots: ["Student Toolkit PDF", "Writing Prompts DOCX", "Research Guide PDF"] },
  { id: "learnai-business-pack", slug: "learnai-business-pack", type: "product", title: "Business AI Prompt Pack", category: "LearnAI", tag: "Featured", description: "50+ business-specific prompts for emails, proposals, reporting, strategy, and client communication.", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80", benefits: ["Write faster proposals", "Sharper client emails", "AI-powered reporting"], included: ["Business prompt library", "Email templates", "Reporting framework"], fileSlots: ["Business Prompts PDF", "Email Templates DOCX", "Reporting Framework"] },
  { id: "learnai-career-pack", slug: "learnai-career-pack", type: "product", title: "Career Growth AI Pack", category: "LearnAI", tag: "New", description: "Resume prompts, interview prep, LinkedIn optimization, and career positioning powered by AI.", image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=1200&q=80", benefits: ["AI-powered resume writing", "Interview prep prompts", "LinkedIn strategy guide"], included: ["Resume prompt kit", "Interview prep guide", "LinkedIn template pack"], fileSlots: ["Career Pack PDF", "Resume Templates DOCX", "LinkedIn Guide PDF"] },

  // Evolvix BuildX — on-demand services
  { id: "buildx-business-website", slug: "buildx-business-website", type: "service", title: "Business Website", category: "BuildX", tag: "On-Demand", description: "A fully custom, mobile-first website built for your business — fast, modern, and AI-ready.", image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80", benefits: ["Mobile-first design", "Fast delivery", "Admin panel included"], included: ["Custom design", "CMS setup", "SEO basics", "1 month support"], fileSlots: [] },
  { id: "buildx-mobile-app", slug: "buildx-mobile-app", type: "service", title: "Mobile App Development", category: "BuildX", tag: "On-Demand", description: "Android & iOS apps built to your spec — from employee tools to customer-facing products.", image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80", benefits: ["Cross-platform builds", "Custom workflows", "API integrations"], included: ["UI/UX design", "Development", "Testing", "Deployment support"], fileSlots: [] },
  { id: "buildx-saas-product", slug: "buildx-saas-product", type: "service", title: "Custom SaaS Product", category: "BuildX", tag: "On-Demand", description: "End-to-end SaaS builds — from idea to production with payments, auth, dashboards, and admin.", image: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80", benefits: ["Full-stack builds", "Scalable architecture", "Payment integration"], included: ["Product design", "Development", "Deployment", "Post-launch support"], fileSlots: [] },
  { id: "buildx-ai-product", slug: "buildx-ai-product", type: "service", title: "AI-Powered Digital Product", category: "BuildX", tag: "On-Demand", description: "Custom AI-integrated tools — chatbots, automation workflows, smart dashboards, and AI features.", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80", benefits: ["LLM integration", "Custom AI workflows", "Automation setup"], included: ["Discovery call", "Architecture plan", "Build", "Testing & delivery"], fileSlots: [] },

  // Evolvix Creative — mixed
  { id: "creative-brand-identity", slug: "creative-brand-identity", type: "service", title: "Brand Identity Design", category: "Creative", tag: "On-Demand", description: "Logo, color palette, typography, and brand guidelines — a complete visual identity for your business.", image: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=80", benefits: ["Professional logo design", "Full brand guidelines", "Print & digital ready"], included: ["Logo design", "Color palette", "Typography system", "Brand guidelines PDF"], fileSlots: [] },
  { id: "creative-social-kit", slug: "creative-social-kit", type: "service", title: "Social Media Design Kit", category: "Creative", tag: "On-Demand", description: "On-brand templates for Instagram, Facebook, LinkedIn, and YouTube — designed for your business.", image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1200&q=80", benefits: ["Consistent visual identity", "Platform-specific formats", "Editable source files"], included: ["Post templates", "Story templates", "Cover designs", "Icons & elements"], fileSlots: [] },
  { id: "creative-pitch-deck", slug: "creative-pitch-deck", type: "service", title: "Pitch Deck Design", category: "Creative", tag: "On-Demand", description: "Investor-ready or client-ready decks — clean, persuasive, and designed to close.", image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1200&q=80", benefits: ["Structured narrative", "Professional design", "Data visuals"], included: ["Content structuring", "Slide design", "Data visuals", "Editable file"], fileSlots: [] },
  { id: "creative-digital-assets", slug: "creative-digital-assets", type: "product", title: "Digital Creator Asset Pack", category: "Creative", tag: "Featured", description: "Launch graphics, overlays, and brand blocks for digital creators — ready to edit and publish.", image: "https://images.unsplash.com/photo-1635776063043-ab23b4c226f6?auto=format&fit=crop&w=1200&q=80", benefits: ["Speed up content production", "Consistent visual identity", "Multi-platform ready"], included: ["Launch cover templates", "Overlay pack", "Social promo blocks"], fileSlots: ["Template Pack ZIP", "Overlay PNG Folder", "Usage Guide PDF"] },

  // Evolvix Business — on-demand services
  { id: "business-ai-consulting", slug: "business-ai-consulting", type: "service", title: "AI Business Consulting", category: "Business", tag: "On-Demand", description: "Strategy sessions to identify where AI can save time, cut costs, and drive growth in your business.", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80", benefits: ["AI readiness audit", "Custom implementation plan", "ROI-focused strategy"], included: ["Discovery session", "AI audit report", "Roadmap document", "Follow-up call"], fileSlots: [] },
  { id: "business-automation", slug: "business-automation", type: "service", title: "Business Process Automation", category: "Business", tag: "On-Demand", description: "Automate repetitive workflows — from lead capture to reporting — so your team focuses on what matters.", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80", benefits: ["Reduce manual work", "Faster turnaround", "Integration with existing tools"], included: ["Process audit", "Automation setup", "Testing", "Training"], fileSlots: [] },
  { id: "business-crm", slug: "business-crm", type: "service", title: "CRM & Lead Management Setup", category: "Business", tag: "On-Demand", description: "Set up a CRM that captures leads, tracks pipeline, and drives conversions for your business.", image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80", benefits: ["Centralized lead tracking", "Automated follow-up", "Sales pipeline clarity"], included: ["CRM setup", "Lead flow design", "Team training", "30-day support"], fileSlots: [] },
  { id: "business-growth-strategy", slug: "business-growth-strategy", type: "service", title: "Growth Strategy Session", category: "Business", tag: "On-Demand", description: "A focused strategy session for businesses planning their next digital move — offers, positioning, and growth.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80", benefits: ["Clear growth roadmap", "Offer & positioning clarity", "Actionable next steps"], included: ["2-hour strategy call", "Written brief", "Action plan", "Resource list"], fileSlots: [] },
];

export const portfolioItems = [
  { id: "p1", title: "AI Learning Journey", category: "Learning and Growth", summary: "Beginner-friendly AI education for everyday users.", image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1200&q=80" },
  { id: "p2", title: "Mood Sound Worlds", category: "Music", summary: "Emotion-based concepts for AI-assisted music storytelling.", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80" },
  { id: "p3", title: "Creator Launch Kit", category: "Digital Products", summary: "Reusable assets and store-ready product visuals.", image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=1200&q=80" },
  { id: "p4", title: "Small Business Tech Clarity", category: "Business", summary: "Digital transformation support for non-technical teams.", image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80" },
  { id: "p5", title: "Accessible AI Guides", category: "Accessibility", summary: "Readable guides designed for older users and families.", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80" },
  { id: "p6", title: "Brand Identity Lab", category: "Brand Assets", summary: "Futuristic visual systems for high-trust creator brands.", image: "https://images.unsplash.com/photo-1609921212029-bb5a28e60960?auto=format&fit=crop&w=1200&q=80" },
  { id: "p7", title: "Evolvix Brand Launch System", category: "Brand Assets", summary: "A polished identity rollout framework for logo usage, color, tone, and premium trust signals.", image: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=80" },
  { id: "p8", title: "Student AI Productivity Map", category: "Learning and Growth", summary: "A practical study workflow concept that turns assignments, revision, and planning into guided AI routines.", image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80" },
  { id: "p9", title: "Creator Storefront Blueprint", category: "Digital Products", summary: "Product packaging, pricing, and sales-page structure for creators selling digital downloads.", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80" },
  { id: "p10", title: "Calm Focus Mood Collection", category: "Music", summary: "A mood-first creative direction set for calm, focused, reflective, and late-night AI-assisted sound worlds.", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80" },
  { id: "p11", title: "Elder-Friendly Tech Support Kit", category: "Accessibility", summary: "Simple scripts, visual aids, and confidence-building support flows for older users navigating digital tools.", image: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1200&q=80" },
  { id: "p12", title: "Small Business AI Readiness Audit", category: "Business", summary: "A clear checklist-based audit for small teams deciding where AI can save time and improve service.", image: "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=80" },
];

export const musicMoods = [
  { mood: "Calm", tone: "soft pads, gentle pulses, reflective movement" },
  { mood: "Energetic", tone: "bright rhythm, forward drive, bold hooks" },
  { mood: "Focused", tone: "minimal textures, clean tempo, productive atmosphere" },
  { mood: "Nostalgic", tone: "warm chords, memory-like ambience, cinematic dust" },
  { mood: "Cinematic", tone: "wide builds, dramatic transitions, story-first scale" },
  { mood: "Reflective", tone: "quiet details, emotional space, late-night clarity" },
];

export const blogPosts = [
  { id: "b1", slug: "learning-ai-without-overwhelm", title: "Learning AI Without Overwhelm", category: "AI Tools", excerpt: "A clear path for students, parents, and professionals entering the AI era.", body: "Start with one everyday problem, then use AI to make that task easier. The best learning path is not about using every tool; it is about building confidence through small, repeatable wins. Evolvix learning resources are structured to help beginners ask better questions, organize outputs, and apply AI safely.", readTime: "5 min", date: "May 13, 2026" },
  { id: "b2", slug: "mood-based-creative-media", title: "Mood-Based Creative Media", category: "Music Creativity", excerpt: "How emotion can guide music prompts, digital art direction, and story worlds.", body: "Creative work becomes stronger when the mood is clear before the tool is opened. Colors, memories, scenes, and emotional words can become a practical brief for music, visuals, and storytelling. This approach helps creators produce media that feels intentional instead of random.", readTime: "4 min", date: "May 10, 2026" },
  { id: "b3", slug: "digital-products-that-build-trust", title: "Digital Products That Build Trust", category: "Creator Resources", excerpt: "What buyers need to see before purchasing downloads, bundles, and templates.", body: "A digital product should clearly show what is included, who it is for, how it helps, and what happens after payment. Strong previews, simple delivery notes, and honest usage terms reduce hesitation. Evolvix product pages are designed around those trust signals.", readTime: "6 min", date: "May 8, 2026" },
  { id: "b4", slug: "five-ai-habits-for-students", title: "Five AI Habits for Students", category: "Student-Friendly Tech", excerpt: "Simple study, research, and revision routines that keep AI helpful instead of distracting.", body: "Students can use AI for planning, summarizing, practice questions, revision schedules, and clearer explanations. The habit that matters most is checking outputs and learning from them, not copying them. Used well, AI becomes a study partner rather than a shortcut.", readTime: "5 min", date: "May 6, 2026" },
  { id: "b5", slug: "how-to-package-a-digital-download", title: "How to Package a Digital Download", category: "Digital Products", excerpt: "A buyer-first checklist for naming, previewing, pricing, and delivering digital products clearly.", body: "A strong download package includes clear file names, a quick-start guide, organized folders, and visible value before checkout. Buyers should know exactly what they will receive. This structure also makes support easier for the seller.", readTime: "7 min", date: "May 4, 2026" },
  { id: "b6", slug: "ai-for-parents-and-older-users", title: "AI for Parents and Older Users", category: "AI Tools", excerpt: "A warm guide to making new technology feel safe, useful, and less intimidating at home.", body: "AI support for families should use plain language, familiar examples, and safety reminders. The goal is not to impress with jargon; it is to make everyday digital tasks feel less stressful. Confidence grows when users can repeat simple steps independently.", readTime: "6 min", date: "May 2, 2026" },
  { id: "b7", slug: "mood-memory-and-music-prompts", title: "Mood, Memory, and Music Prompts", category: "Music Creativity", excerpt: "How nostalgia, calm, focus, and cinematic emotion can become stronger creative briefs.", body: "Music prompts work best when they describe emotional texture, pace, instruments, and scene. A memory can become a sonic palette; a mood can become a structure. This helps AI-assisted music feel more personal and useful for creators.", readTime: "4 min", date: "April 30, 2026" },
  { id: "b8", slug: "creator-productivity-without-burnout", title: "Creator Productivity Without Burnout", category: "Productivity", excerpt: "A practical operating rhythm for creators balancing learning, content, products, and rest.", body: "Creator productivity is not just output volume. A healthy rhythm includes idea capture, batching, templates, review time, and recovery. AI can reduce repetitive work so creators can spend more energy on judgment and originality.", readTime: "5 min", date: "April 28, 2026" },
  { id: "b9", slug: "trust-signals-every-small-digital-brand-needs", title: "Trust Signals Every Small Digital Brand Needs", category: "Creator Resources", excerpt: "The visual, copy, support, and policy details that help visitors feel safe buying from you.", body: "Small brands earn trust with consistency: clear contact details, visible policies, recognizable identity, product previews, and support pathways. These details make a website feel like a real business rather than a temporary page.", readTime: "6 min", date: "April 25, 2026" },
  { id: "b10", slug: "from-prompt-to-product", title: "From Prompt to Product", category: "Digital Creativity", excerpt: "A simple framework for turning AI-assisted ideas into useful templates, kits, and content systems.", body: "A prompt becomes a product when it solves a repeatable problem for a clear audience. Package the process, add examples, create a guide, and make the result easy to use. The value is in the system, not just the generated text.", readTime: "8 min", date: "April 22, 2026" },
  { id: "b11", slug: "grow-yourself-using-ai", title: "Grow Yourself Using AI", category: "Learning and Growth", excerpt: "A practical path for using AI to improve learning, career planning, creativity, and daily routines.", body: "Personal growth with AI can include better study habits, clearer goals, stronger resumes, smarter routines, and creative exploration. The best results come from combining AI suggestions with human reflection and consistent action.", readTime: "5 min", date: "April 20, 2026" },
  { id: "b12", slug: "ai-consulting-for-small-business", title: "AI Consulting for Small Business", category: "Business Consulting", excerpt: "How small businesses can start with AI workflows, automation, digital tools, and better customer systems.", body: "Small businesses should begin with time-consuming workflows: customer replies, content planning, internal checklists, reporting, and lead follow-up. AI consulting helps identify where automation can support real business outcomes without overwhelming the team.", readTime: "6 min", date: "April 18, 2026" },
  { id: "b13", slug: "accessible-ai-for-everyday-users", title: "Accessible AI for Everyday Users", category: "Accessibility", excerpt: "Why AI support should feel simple, safe, and useful for beginners, families, and older users.", body: "Accessible AI is about clarity, safety, and usefulness. Interfaces and learning resources should avoid intimidation and focus on everyday tasks. When support is patient and practical, more people can benefit from technology.", readTime: "4 min", date: "April 16, 2026" },
];

export const legalContent = {
  terms: {
    title: "Terms of Service",
    lastUpdated: "Last updated: [insert launch date]",
    intro: [
      "These Terms of Service (\"Terms\") govern your use of the website evolvixtech.in (\"Site\") and all products and services offered by Evolvix Tech Media (\"we,\" \"us,\" \"our\"), a sole proprietorship business operated by Pritam Mistry, registered address Chhotonilpur, Bardhaman, West Bengal 713103, India (GSTIN: 19BVTPM1874M1ZK).",
      "By accessing or using the Site, creating an account, or purchasing any product or service from us, you agree to be bound by these Terms. If you do not agree, please do not use the Site.",
    ],
    sections: [
      {
        heading: "1. Who We Are and What We Offer",
        blocks: [
          { type: "p", text: "Evolvix Tech Media provides:" },
          { type: "list", items: [
            "Digital products sold directly through our Store (AI prompt packs, learning resources, eBooks, and similar downloadable products)",
            "Custom digital and creative services (web/mobile application development, business software, branding and design, AI business consulting, and related work) delivered under a separate quote or scope of work agreed directly with you",
            "Free resources (music, prompt samples, and interactive tools) made available through Evolvix Lab",
          ] },
        ],
      },
      {
        heading: "2. Accounts",
        blocks: [
          { type: "p", text: "Some parts of the Site — including downloading free resources, viewing product demos, and purchasing from the Store — require creating an account. You agree to provide accurate information when registering and to keep your login credentials confidential. You're responsible for all activity under your account." },
        ],
      },
      {
        heading: "3. Digital Products and Licensing",
        blocks: [
          { type: "p", text: "When you purchase a digital product (such as a prompt pack or eBook) from our Store, you are granted a personal, non-exclusive, non-transferable license to use that product for your own personal or business purposes. Unless explicitly stated otherwise on the product page, you may not:" },
          { type: "list", items: [
            "Resell, redistribute, or share the product file itself with others",
            "Repackage and resell the content as your own product",
            "Claim authorship of the underlying prompt packs, templates, or creative assets",
          ] },
          { type: "p", text: "You may use outputs you personally generate using our prompt packs (e.g., content, resumes, or designs you create using our prompts) freely for your own purposes." },
        ],
      },
      {
        heading: "4. Custom Services",
        blocks: [
          { type: "p", text: "Services under Evolvix BuildX, Evolvix Creative, and Evolvix Business (web/mobile applications, business software, branding, consulting, etc.) are quoted and delivered individually and are governed by the specific scope, timeline, and payment terms agreed with you directly — typically over email or WhatsApp — rather than by these general Terms alone. In case of any conflict, the terms of your specific agreement with us take precedence over this document for that engagement." },
        ],
      },
      {
        heading: "5. Payments",
        blocks: [
          { type: "p", text: "All payments on the Site are processed securely through Razorpay. We do not store your card, UPI, or banking details ourselves — these are handled directly by Razorpay in accordance with their own security standards and privacy policy. Prices on the Site are listed in Indian Rupees (INR) and are inclusive/exclusive of applicable GST as indicated at checkout." },
        ],
      },
      {
        heading: "6. Prohibited Use",
        blocks: [
          { type: "p", text: "You agree not to use the Site to:" },
          { type: "list", items: [
            "Violate any applicable law or regulation",
            "Attempt to gain unauthorized access to our systems, other users' accounts, or non-public areas of the Site",
            "Upload or transmit malicious code",
            "Use our free resources, demos, or products for any unlawful or harmful purpose",
          ] },
        ],
      },
      {
        heading: "7. Intellectual Property",
        blocks: [
          { type: "p", text: "All content on the Site — including our logo, brand name, designs, written content, and software (excluding purchased digital products licensed to you under Section 3) — remains the property of Evolvix Tech Media and may not be copied or used without our written permission." },
        ],
      },
      {
        heading: "8. Disclaimer of Warranties",
        blocks: [
          { type: "p", text: "The Site and all products/services are provided \"as is.\" While we take care in what we build and sell, we do not guarantee that the Site will be uninterrupted, error-free, or that any digital product will meet every specific requirement you may have. Custom services carry their own specific deliverable expectations as set out in your individual agreement with us." },
        ],
      },
      {
        heading: "9. Limitation of Liability",
        blocks: [
          { type: "p", text: "To the maximum extent permitted by law, Evolvix Tech Media shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Site or our products/services, beyond the amount you actually paid us for the specific product or service in question." },
        ],
      },
      {
        heading: "10. Governing Law",
        blocks: [
          { type: "p", text: "These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of the Site shall be subject to the exclusive jurisdiction of the courts at Bardhaman, West Bengal." },
        ],
      },
      {
        heading: "11. Changes to These Terms",
        blocks: [
          { type: "p", text: "We may update these Terms from time to time. Continued use of the Site after changes are posted constitutes acceptance of the revised Terms." },
        ],
      },
      {
        heading: "12. Contact",
        blocks: [
          { type: "p", text: "Questions about these Terms can be sent to:" },
          { type: "list", items: [
            "Evolvix Tech Media",
            "Chhotonilpur, Bardhaman, West Bengal 713103",
            "Email: evolvixtech0pm@gmail.com",
            "Phone/WhatsApp: +91 98318 42869",
          ] },
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: [insert launch date]",
    intro: [
      "Evolvix Tech Media (\"we,\" \"us,\" \"our\") respects your privacy. This Privacy Policy explains what personal data we collect through evolvixtech.in, why we collect it, and what rights you have over it.",
    ],
    sections: [
      {
        heading: "1. What We Collect",
        blocks: [
          { type: "list", items: [
            "Account information: name, email address, and password (encrypted) when you sign up",
            "Contact form submissions: name, email, phone number, and message content when you reach out to us or request a quote",
            "Order information: what you purchased and when — we do not collect or store your card or bank details; these are handled directly by Razorpay",
            "Usage data: pages visited, buttons clicked, and general site interactions, collected to understand how the Site is used and improve it",
            "Cookies: small files used to keep you logged in and to power analytics (see Section 5)",
          ] },
        ],
      },
      {
        heading: "2. How We Use Your Data",
        blocks: [
          { type: "p", text: "We use the information above to:" },
          { type: "list", items: [
            "Create and manage your account",
            "Process and deliver your orders",
            "Respond to enquiries and quote requests",
            "Understand which parts of the Site are useful, so we can improve it",
            "Send you updates about products or services you've shown interest in — only where you've consented to this",
          ] },
          { type: "p", text: "We do not sell your personal data to third parties." },
        ],
      },
      {
        heading: "3. Who We Share Data With",
        blocks: [
          { type: "p", text: "We share limited data with trusted service providers who help us run the Site:" },
          { type: "list", items: [
            "Razorpay — processes your payment directly; governed by Razorpay's own privacy policy",
            "MongoDB Atlas — securely stores our application's data",
            "Vercel / Render — host the Site's frontend and backend",
            "Google Analytics (where enabled) — helps us understand aggregate site usage",
          ] },
          { type: "p", text: "We do not share your data with anyone else except where required by law." },
        ],
      },
      {
        heading: "4. Your Rights",
        blocks: [
          { type: "p", text: "You have the right to:" },
          { type: "list", items: [
            "Ask us what personal data we hold about you",
            "Request correction of inaccurate data",
            "Request deletion of your account and associated data",
            "Withdraw consent for marketing communications at any time",
          ] },
          { type: "p", text: "To exercise any of these rights, email us at evolvixtech0pm@gmail.com. We'll respond within a reasonable time." },
        ],
      },
      {
        heading: "5. Cookies",
        blocks: [
          { type: "p", text: "We use cookies to keep you logged in and to understand site usage through analytics. You can control or disable cookies through your browser settings, though this may affect some site functionality (like staying logged in)." },
        ],
      },
      {
        heading: "6. Children's Privacy",
        blocks: [
          { type: "p", text: "Some of our products (such as kids' activity content) are intended for use by children under the guidance of a parent or guardian. Accounts and purchases on the Site must be made by an adult. We do not knowingly collect personal data directly from children without parental involvement." },
        ],
      },
      {
        heading: "7. Data Security",
        blocks: [
          { type: "p", text: "We take reasonable technical and organizational measures to protect your personal data, including encrypted connections and access controls on our systems. No online system can be guaranteed 100% secure, but we work to keep your data safe and will notify affected users promptly in the event of any data breach affecting their personal information." },
        ],
      },
      {
        heading: "8. Data Retention",
        blocks: [
          { type: "p", text: "We retain your personal data for as long as your account is active, or as needed to fulfill the purposes described in this policy, unless a longer retention period is required by law (for example, GST-related records)." },
        ],
      },
      {
        heading: "9. Grievance Officer",
        blocks: [
          { type: "p", text: "In accordance with Indian law, our Grievance Officer for privacy-related concerns is:" },
          { type: "list", items: [
            "Pritam Mistry",
            "Evolvix Tech Media, Chhotonilpur, Bardhaman, West Bengal 713103",
            "Email: evolvixtech0pm@gmail.com",
          ] },
        ],
      },
      {
        heading: "10. Changes to This Policy",
        blocks: [
          { type: "p", text: "We may update this Privacy Policy periodically. Material changes will be reflected by an updated \"Last updated\" date at the top of this page." },
        ],
      },
      {
        heading: "11. Contact",
        blocks: [
          { type: "p", text: "For any privacy questions, reach us at evolvixtech0pm@gmail.com or +91 98318 42869." },
        ],
      },
    ],
  },
  refund: {
    title: "Refund & Cancellation Policy",
    lastUpdated: "Last updated: [insert launch date]",
    intro: [],
    sections: [
      {
        heading: "1. Digital Products (Store)",
        blocks: [
          { type: "p", text: "Because digital products (prompt packs, eBooks, and similar downloads) are delivered instantly and cannot be \"returned\" in the traditional sense, all Store purchases are generally final and non-refundable once the product has been successfully delivered." },
          { type: "p", text: "Exceptions — we will provide a full refund if:" },
          { type: "list", items: [
            "The file you received is corrupted, incomplete, or does not match the product description",
            "A technical error on our end prevented delivery of the product you paid for",
            "You were charged but did not receive access to the product due to a payment/webhook error",
          ] },
          { type: "p", text: "To request a refund under these circumstances, email evolvixtech0pm@gmail.com within 48 hours of your purchase, including your order ID and a description of the issue. We'll review and respond within 2-3 business days." },
        ],
      },
      {
        heading: "2. Custom Services (BuildX, Creative, Business Consulting)",
        blocks: [
          { type: "p", text: "Refunds and cancellations for custom, quoted work are governed by the specific agreement made with you at the time of engagement, since these involve individually scoped timelines, milestones, and deliverables. Please refer to your project agreement, or contact us directly to discuss." },
        ],
      },
      {
        heading: "3. Refund Processing",
        blocks: [
          { type: "p", text: "Approved refunds are processed back to your original payment method via Razorpay. Depending on your bank or payment provider, refunds typically reflect within 5-7 business days of approval." },
        ],
      },
      {
        heading: "4. Failed or Duplicate Transactions",
        blocks: [
          { type: "p", text: "If you were charged more than once for the same order, or a payment failed but funds were deducted, contact us immediately with your payment reference — we'll investigate and refund any erroneous charge promptly." },
        ],
      },
      {
        heading: "5. Contact for Refund Requests",
        blocks: [
          { type: "list", items: [
            "Evolvix Tech Media",
            "Email: evolvixtech0pm@gmail.com",
            "Phone/WhatsApp: +91 98318 42869",
            "Chhotonilpur, Bardhaman, West Bengal 713103",
          ] },
        ],
      },
    ],
  },
};

export const faqs = [
  ["What does Evolvix Tech Media do?", "Evolvix provides AI learning products, creative digital services, business consulting, software solutions, and creator-focused music/audio services."],
  ["What products are available now?", "Learning and Growth products such as prompt packs, AI starter resources, creator assets, music kits, and business templates are structured for direct purchase."],
  ["How do digital downloads work?", "After checkout, delivery details are shown and product file slots are ready for downloadable assets."],
  ["Can I request custom work?", "Yes. You can request creative services, websites, apps, business software, AI consulting, automation, music packs, or branding work through Contact."],
  ["What is Learning and Growth?", "It is Evolvix’s AI learning and self-growth hub: prompts, guides, cheat sheets, templates, workbooks, routines, and future courses."],
  ["Who is the music vertical for?", "It is designed for social media content creators, video makers, brands, podcasters, and storytellers who need background music and audio identity."],
  ["Do you support business clients?", "Yes. Evolvix supports business clients with AI consulting, digital transformation, automation, websites, software, SaaS thinking, and marketing support."],
  ["Are you GST registered?", "Yes. Evolvix Tech Media displays its GSTIN in the footer and trust sections."],
  ["How do I contact Evolvix?", "Use the Contact page for phone, WhatsApp, email, Facebook, Google location, Gumroad, and the inquiry form."],
  ["Do I need to create an account to buy something?", "Yes. Browsing the Store is open to everyone, but you'll need a free account (email and password, verified once by a code sent to your inbox) before checkout — this is what lets us deliver your files and invoice to the right place."],
  ["How do I get my GST invoice after purchase?", "A GST-compliant invoice is generated automatically the moment your payment is confirmed, with the correct CGST+SGST or IGST split based on your billing state. You'll find a link to view and download it on your order confirmation page."],
  ["What if I don't receive my verification code or download email?", "Check your spam or promotions folder first — verification codes and delivery emails are sent from our domain via Resend. You can request a new code from the login screen if a few minutes pass with nothing in your inbox. If it still doesn't arrive, contact us and we'll sort it out directly."],
  ["Is my payment information stored on Evolvix's servers?", "No. Payments are handled entirely by Razorpay — Evolvix never sees or stores your card, UPI, or bank details. See our Privacy Policy for the full details on what we do and don't store."],
  ["What's your refund policy for digital products?", "Our Refund & Cancellation Policy covers exactly when refunds apply for digital products — since files are delivered instantly, refund eligibility is generally limited to genuine access or delivery failures on our end. Read the full policy for specifics before purchasing."],
];

export const fallbackSiteContent = {
  brand: {
    name: "Evolvix Tech Media",
    tagline: "CREATE • INNOVATE • ELEVATE",
    headline: "Empowering People & Businesses Through AI.",
    subheadline: "From creative digital services to intelligent business solutions.",
    gstin: "19BVTPM1874M1ZK",
    core_areas: ["AI", "Digital", "Business", "Creative Solutions"],
  },
  contact: {
    address: "Chhotonilpur, Bardhaman, West Bengal 713103",
    phone: "+91 98318 42869",
    whatsapp: "+91 98318 42869",
    email: "evolvixtech0pm@gmail.com",
    facebook: "https://facebook.com/evolvixtech",
    google_location: "https://www.google.com/maps?cid=2428437874850568706",
    gumroad: "https://gumroad.com/",
    website_status: "Coming Soon",
  },
  trust_strip: ["GST Registered Business", "Udyam Registered MSME", "IEC Registered", "Facebook", "Google Location", "Bardhaman, West Bengal"],
  creative_services: [
    { title: "AI Resume & CV Design", text: "Stand out. Get noticed." },
    { title: "Professional Portfolio Design", text: "Showcase your best work." },
    { title: "Company Profile Design", text: "Build trust. Create impact." },
    { title: "Logo & Brand Identity", text: "Create identity. Build brand." },
    { title: "AI Photo Enhancement", text: "Clean, sharpen, and upgrade images with AI-supported editing." },
    { title: "Old Photo Restoration", text: "Restore damaged, faded, or old memories with careful digital enhancement." },
    { title: "Posters, Banners & Social Media Creatives", text: "Engage. Impress. Convert." },
    { title: "Product Catalog Design", text: "Showcase your products beautifully." },
    { title: "Presentation & Pitch Deck Design", text: "Present with impact. Win more." },
  ],
  technology_services: [
    { title: "AI Business Consulting", text: "Smart strategies. Real growth." },
    { title: "Digital Transformation", text: "Transform ideas into digital reality." },
    { title: "Business Process Automation", text: "Automate. Optimize. Scale." },
    { title: "AI Workflow Design", text: "Work smarter. Save time." },
    { title: "Website Development", text: "Business portfolio and e-commerce websites." },
    { title: "Web Applications", text: "Custom, scalable, and secure applications." },
    { title: "Mobile Applications", text: "Android, iOS, and cross-platform solutions." },
    { title: "SaaS Solutions", text: "Cloud-based, scalable, future-ready product systems." },
    { title: "Business Software", text: "Custom tools for operations, workflow, teams, and business growth." },
    { title: "Digital Marketing", text: "Grow online. Reach more." },
  ],
  ecosystem: [
    { name: "Evolvix LearnAI", status: "Now on Gumroad", description: "AI Learning & Productivity Packs — everything you need to learn, grow, and work smarter with AI. Ready to buy and use immediately.", items: ["AI Prompt Packs", "Learning Resources", "Business Packs", "Career Packs", "Creator Packs", "Productivity Packs"] },
    { name: "Evolvix BuildX", status: "On-Demand", description: "AI Powered Digital Products — custom-built web apps, mobile applications, business software, enterprise SaaS, and AI-powered digital products.", items: ["Web Applications", "Mobile Applications", "Business Software", "Enterprise SaaS", "AI Powered Products"] },
    { name: "Evolvix Creative", status: "On-Demand", description: "Branding, Design & Creative Solutions — identity systems, graphic design, digital assets, multimedia design, and presentation decks built for impact.", items: ["Branding & Identity", "Graphic Design", "Digital Assets", "Multimedia Design", "Pitch Decks"] },
    { name: "Evolvix Business", status: "On-Demand", description: "AI Business Consulting & Automation — smart strategies, process automation, CRM solutions, SaaS planning, and growth strategy for forward-thinking businesses.", items: ["AI Business Consulting", "Business Automation", "CRM Solutions", "SaaS Solutions", "Growth Strategy"] },
  ],
  learning_categories: ["AI Prompt Packs", "Business Prompt Packs", "Career Prompt Packs", "Student Prompt Packs", "Creator Prompt Packs", "Productivity Prompt Packs", "Marketing Prompt Packs", "Coding Prompt Packs", "AI Learning Guides", "AI Cheat Sheets", "AI Templates", "AI Workbooks", "AI Support for Everyday Learning", "Grow Yourself Using AI", "AI Learning for Beginners", "Smart AI Routines", "Future AI Courses", "Future Certifications"],
  music_services: ["AI Background Music for Reels", "Social Media Creator Music Packs", "Mood-Based Background Tracks", "AI Music for Videos", "Short-form Content Music", "Brand Theme Music", "Podcast Intros", "Ambient Music", "Sound Design", "Creator Audio Branding"],
  custom_sections: [
    {
      title: "Custom Evolvix Section",
      eyebrow: "Editable Section",
      description: "Use the admin dashboard to create any new website section, update its cards, or hide it whenever needed.",
      cta_label: "Contact Evolvix",
      cta_url: "/contact",
      visible: true,
      cards: [
        { title: "Fully editable", text: "Create custom cards, service groups, offers, or announcements from the admin panel." },
        { title: "Backend controlled", text: "Changes are stored in MongoDB and reflected on the public website." },
      ],
    },
  ],
  testimonials: [
    { id: "t1", name: "Local Business Owner", role: "Small Business", quote: "Evolvix makes AI and digital growth feel practical, clear, and business-ready.", rating: 5, visible: true },
    { id: "t2", name: "Creator Client", role: "Digital Creator", quote: "The creative direction feels premium, futuristic, and easy to turn into real content.", rating: 5, visible: true },
    { id: "t3", name: "Learning User", role: "AI Beginner", quote: "The learning resources are structured in a simple way that builds confidence step by step.", rating: 5, visible: true },
  ],
  why_choose: ["AI-first approach", "Personalized solutions", "Future-ready technology", "Business-focused innovation", "Creative excellence", "End-to-end support"],
  products,
  portfolio: portfolioItems,
  blog: blogPosts,
};