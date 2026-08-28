import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSEO } from "../hooks/useSEO";
import { ArrowRight, BrainCircuit, BriefcaseBusiness, Download, MapPin, Palette, Rocket, ShieldCheck, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { logos } from "../data/siteContent";
import { SectionHeader } from "../components/SectionHeader";
import { ProductCard } from "../components/ProductCard";
import { trackNewsletterSubmit } from "../components/AnalyticsTracker";
import { submitNewsletter } from "../api";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { CheckoutPanel } from "../components/CheckoutPanel";
import { getDemoIcon, statusBadgeClass, visibleDemos } from "../lib/demoDisplay";
import { consumePendingBuyProductId, consumePendingPromoCode } from "../lib/authRedirect";
import { HeroParticle } from "../components/HeroParticle";
import { FestivalCodeStrip } from "../components/FestivalBanner";

export default function Home() {
  useSEO({ title: "AI Consulting, Digital Products & Creative Services in India", description: "Evolvix Tech Media helps students, professionals, and businesses learn AI, build digital products, and grow with creative and technology services.", path: "/" });
  const [email, setEmail] = useState("");
  const { content, loading } = useSiteContent();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const brand = content.brand || {};
  const products = loading ? [] : (content.products || []);
  // Empty while loading so placeholder demos never render and then swap.
  const previewDemos = loading ? [] : visibleDemos(content.demos).slice(0, 3);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [pendingPromo, setPendingPromo] = useState("");
  const ecosystem = content.ecosystem || [];
  const whyChoose = content.why_choose || [];
  const trust = content.trust_strip || [];
  const customSections = (content.custom_sections || []).filter((section) => section.visible !== false);
  // Same flow as the Store: open the confirmation panel so a promo code can be
  // applied here too. Login is only required at the Pay step.
  const buyProduct = (productId, promoCode) => {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      toast.error("That product is no longer available.");
      return;
    }
    setPendingPromo(promoCode || "");
    setCheckoutProduct(product);
  };
  useEffect(() => {
    if (!user) return;
    const pendingProductId = consumePendingBuyProductId();
    if (pendingProductId) buyProduct(pendingProductId, consumePendingPromoCode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  const join = async (event) => {
    event.preventDefault();
    try {
      await submitNewsletter({ email });
      trackNewsletterSubmit(window.location.pathname);
      toast.success("You're on the Evolvix update list.");
      setEmail("");
    } catch (error) {
      toast.error("Please enter a valid email address.");
    }
  };
  return (
    <>
      <FestivalCodeStrip />
      <section className="hero-section" data-testid="home-hero-section">
        <div className="hero-copy">
          <div className="hero-logo-block">
            <img className="hero-mini-logo" src={logos.horizontal} alt="Evolvix Tech Media" data-testid="home-large-logo" />
            <span className="eyebrow" data-testid="home-hero-eyebrow">{brand.tagline}</span>
          </div>
          <h1 data-testid="home-hero-headline">{brand.headline}</h1>
          <p className="hero-subline" data-testid="home-hero-subheadline">{brand.subheadline}</p>
          <p className="hero-vision" data-testid="home-hero-vision">{brand.vision}</p>
          <div className="hero-actions" data-testid="home-hero-actions">
            <Link className="primary-btn" to="/services" data-testid="home-services-cta">Explore Services <ArrowRight size={18} /></Link>
            <Link className="secondary-btn" to="/playground" data-testid="home-products-cta">Browse Free Resources</Link>
            <Link className="text-btn" to="/contact" data-testid="home-contact-cta">Talk to Us</Link>
          </div>
        </div>
        <div className="hero-logo-stage" data-testid="home-hero-logo-stage">
          <HeroParticle />
          <img src={logos.circular} alt="Evolvix Tech Media circular logo" className="hero-logo-overlay" data-testid="home-hero-logo-image" />
        </div>
      </section>
      <section className="section trust-rail" data-testid="home-trust-strip">
        {trust.map((item) => <span key={item} data-testid={`trust-item-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><ShieldCheck size={16} /> {item}</span>)}
      </section>
      <section className="section split-section" data-testid="home-intro-section">
        <SectionHeader eyebrow="Tier-2 Cities & Beyond" title="AI-powered solutions for students, professionals, creators, and local businesses." text="For individuals, local businesses, and small-to-medium-sized businesses — Evolvix makes AI strategy, creative services, tech solutions, and digital products practical and within reach." />
        {/* Each audience goes to the page most likely to convert it, rather than
            all five repeating the same destination. These lift on hover, so they
            have to be real links — see the note in App.css. */}
        <div className="reach-panel" data-testid="home-local-value-panel">
          {[
            { Icon: Sparkles, label: "Students", sub: "Learning & skill-building", to: "/shop?category=Learning and Growth" },
            { Icon: BriefcaseBusiness, label: "Professionals", sub: "Career growth", to: "/services" },
            { Icon: Palette, label: "Creators", sub: "Content & media", to: "/playground" },
            { Icon: Rocket, label: "Small Businesses", sub: "Local to regional", to: "/demo" },
            { Icon: BrainCircuit, label: "Enterprises", sub: "Scale & transform", to: "/contact" },
          ].map(({ Icon, label, sub, to }, i) => (
            <Link
              key={label}
              to={to}
              className="reach-node"
              style={{ animationDelay: `${i * 0.18}s` }}
              data-testid={`reach-node-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span className="reach-node-icon"><Icon size={22} /></span>
              <span className="reach-node-label">{label}</span>
              <small>{sub}</small>
              <span className="reach-node-go" aria-hidden="true"><ArrowRight size={15} /></span>
            </Link>
          ))}
        </div>
      </section>
      <section className="section" data-testid="home-pillars-section">
        <SectionHeader eyebrow="Core service pillars" title="Creative services, technology solutions, digital products, and business consulting." />
        <div className="pillar-grid">
          {[[Palette, "Creative Digital Services", "Resumes, portfolios, branding, catalogs, presentations, and social creatives.", "/services"], [BrainCircuit, "AI Business Consulting & Technology", "AI strategy, workflows, automation, websites, apps, SaaS, and business software.", "/services"], [Download, "Learning and Growth", "Prompt packs, AI guides, cheat sheets, workbooks, routines, and future courses.", "/playground"], [Rocket, "Product Ecosystem", "Learning, BuildX, Creative, Business, Accessibility, Music, and Brand Assets.", "/ecosystem"]].map(([Icon, title, text, href]) => <article className="pillar-card" key={title} data-testid={`home-pillar-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><Icon size={28} /><h3>{title}</h3><p>{text}</p><Link to={href} className="icon-link" data-testid={`home-pillar-link-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>Explore <ArrowRight size={16} /></Link></article>)}
        </div>
      </section>
      <section className="section" data-testid="home-ecosystem-preview-section">
        <SectionHeader eyebrow="Product ecosystem" title="A scalable AI-first architecture for learning, building, creativity, business, access, music, and assets." />
        <div className="ecosystem-grid" data-testid="home-ecosystem-grid">{ecosystem.slice(0, 4).map((item) => <article className="ecosystem-card" key={item.name} data-testid={`home-ecosystem-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><span>{item.status}</span><h3>{item.name}</h3><p>{item.description}</p><Link to={item.name === "Evolvix LearnAI" ? "/shop?category=LearnAI" : "/ecosystem"} className="icon-link" data-testid={`home-ecosystem-link-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>Explore <ArrowRight size={16} /></Link></article>)}</div>
      </section>
      {(loading || previewDemos.length > 0) && (
        <section className="section" data-testid="home-demos-preview-section">
          <SectionHeader eyebrow="Live demos" title="Real, working builds you can open right now." text="Every Evolvix project starts as a working demo — not a mockup. Here is what we have built so far." />
          <div className="preview-grid" data-testid="home-demos-grid">
            {loading && [1, 2, 3].map((i) => (
              <article className="visual-card home-demo-card home-demo-card--skeleton" key={`home-demo-skeleton-${i}`} aria-hidden="true">
                <div className="home-demo-top"><span className="skeleton-block skeleton-icon" /></div>
                <span className="skeleton-line" style={{ height: 9, width: "34%", display: "block" }} />
                <span className="skeleton-line" style={{ height: 18, width: "70%", display: "block", marginTop: 4 }} />
                <span className="skeleton-line" style={{ height: 11, width: "94%", display: "block", marginTop: 10 }} />
                <span className="skeleton-line" style={{ height: 11, width: "78%", display: "block", marginTop: 7 }} />
              </article>
            ))}
            {previewDemos.map((demo) => (
              <article className="visual-card home-demo-card" key={demo.id} data-testid={`home-demo-card-${demo.id}`}>
                <div className="home-demo-top">
                  <span className="home-demo-icon">{getDemoIcon(demo, 24)}</span>
                  <span className={statusBadgeClass(demo.status)}>{demo.status}</span>
                </div>
                <span className="mini">{demo.industry}</span>
                <h3>{demo.title}</h3>
                <p>{demo.description}</p>
                {demo.status === "Live Demo" && demo.url
                  ? <Link to="/demo" className="icon-link" data-testid={`home-demo-link-${demo.id}`}>Open demo <ArrowRight size={16} /></Link>
                  : <Link to="/contact" className="icon-link" data-testid={`home-demo-link-${demo.id}`}>Talk to us about this <ArrowRight size={16} /></Link>}
              </article>
            ))}
          </div>
          <div className="home-demo-footer"><Link to="/demo" className="secondary-btn" data-testid="home-demos-all-link">See all demos <ArrowRight size={16} /></Link></div>
        </section>
      )}
      <section className="section" data-testid="home-shop-preview-section">
        <SectionHeader eyebrow="Featured products / services" title="Actionable AI resources and creator-ready digital products." />
        <div className="product-grid">{loading ? [1,2,3].map((i) => <div key={i} className="product-card product-card--skeleton" aria-hidden="true"><div className="skeleton-thumb" /><div className="skeleton-body"><div className="skeleton-line" style={{height:10,width:"40%"}} /><div className="skeleton-line" style={{height:20,width:"75%"}} /><div className="skeleton-line" style={{height:14,width:"90%"}} /></div></div>) : products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} onBuy={buyProduct} />)}</div>
      </section>
      <section className="section mood-band" data-testid="home-why-choose-section">
        <SectionHeader eyebrow="Why choose Evolvix" title="AI-first, personalized, future-ready, and business-focused." text="The brand is designed to support people and businesses end-to-end — with practical innovation and creative excellence." />
        <div className="mood-row" data-testid="home-why-row">{whyChoose.map((item) => <span key={item} data-testid={`home-why-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><BriefcaseBusiness size={15} /> {item}</span>)}</div>
        <Link to="/contact?type=Business+inquiry" className="primary-btn" data-testid="home-start-project-cta">Start a Project <ArrowRight size={18} /></Link>
      </section>
      <section className="section contact-cta-band" data-testid="home-contact-cta-section"><h2>Ready to create, innovate, and elevate?</h2><p>Tell Evolvix what you want to build, learn, automate, design, or launch.</p><Link to="/contact" className="primary-btn" data-testid="home-final-contact-cta">Contact Us <ArrowRight size={18} /></Link></section>
      {customSections.map((section, index) => <section className="section custom-public-section" key={`${section.title}-${index}`} data-testid={`custom-section-${index}`}><SectionHeader eyebrow={section.eyebrow || "Custom"} title={section.title} text={section.description} /><div className="custom-card-grid" data-testid={`custom-section-cards-${index}`}>{(section.cards || []).map((card, cardIndex) => <article className="pillar-card" key={`${card.title}-${cardIndex}`} data-testid={`custom-section-${index}-card-${cardIndex}`}><Sparkles size={24} /><h3>{card.title}</h3><p>{card.text}</p></article>)}</div>{section.cta_label && <Link to={section.cta_url || "/contact"} className="primary-btn" data-testid={`custom-section-${index}-cta`}>{section.cta_label} <ArrowRight size={18} /></Link>}</section>)}
      <section className="section trust-newsletter" data-testid="home-newsletter-section">
        <div><span className="eyebrow">Trust & updates</span><h2 data-testid="home-newsletter-title">Stay close to launches, resources, and new creative drops.</h2><p data-testid="home-newsletter-text">Room for future testimonials, client wins, reviews, and credibility markers is built into the brand system.</p></div>
        <form onSubmit={join} className="newsletter-form" data-testid="newsletter-form"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" data-testid="newsletter-email-input" /><button type="submit" data-testid="newsletter-submit-button">Join Updates</button></form>
      </section>
      <section className="section home-micro-strip" data-testid="home-micro-strip">
        {["Innovate", "Automate", "Transform", "Grow"].map((word) => <span key={word} data-testid={`home-micro-strip-${word.toLowerCase()}`}>{word}</span>)}
      </section>
      {checkoutProduct && <CheckoutPanel key={`${checkoutProduct.id}-${pendingPromo}`} product={checkoutProduct} initialCode={pendingPromo} onClose={() => setCheckoutProduct(null)} />}
    </>
  );
}