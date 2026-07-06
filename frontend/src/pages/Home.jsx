import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BrainCircuit, BriefcaseBusiness, Download, MapPin, Palette, Rocket, ShieldCheck, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { logos } from "../data/siteContent";
import { SectionHeader } from "../components/SectionHeader";
import { ProductCard } from "../components/ProductCard";
import { trackNewsletterSubmit } from "../components/AnalyticsTracker";
import { submitNewsletter, createCheckout } from "../api";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { openRazorpayCheckout } from "../lib/razorpay";
import { redirectToLoginForBuy, consumePendingBuyProductId } from "../lib/authRedirect";
import { HeroParticle } from "../components/HeroParticle";
import { TestimonialsCarousel } from "../components/TestimonialsCarousel";

export default function Home() {
  const [email, setEmail] = useState("");
  const { content } = useSiteContent();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const brand = content.brand || {};
  const products = content.products || [];
  const portfolioItems = content.portfolio || [];
  const ecosystem = content.ecosystem || [];
  const whyChoose = content.why_choose || [];
  const trust = content.trust_strip || [];
  const testimonials = (content.testimonials || []).filter((item) => item.visible !== false);
  const customSections = (content.custom_sections || []).filter((section) => section.visible !== false);
  const buyProduct = async (productId) => {
    if (!user) {
      redirectToLoginForBuy(navigate, productId, `${location.pathname}${location.search}`);
      return;
    }
    try {
      const { data: order } = await createCheckout({ product_id: productId, origin_url: window.location.origin });
      const product = products.find((item) => item.id === productId) || {};
      await openRazorpayCheckout({
        order,
        product,
        onSuccess: () => { window.location.href = `/checkout/success?session_id=${order.session_id}&product=${product.slug || productId}`; },
        onDismiss: () => toast.error("Checkout was cancelled."),
      });
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Checkout could not start. Please try again or contact Evolvix.");
    }
  };
  useEffect(() => {
    if (!user) return;
    const pendingProductId = consumePendingBuyProductId();
    if (pendingProductId) buyProduct(pendingProductId);
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
        <div className="reach-panel" data-testid="home-local-value-panel">
          {[
            { Icon: Sparkles, label: "Students", sub: "Learning & skill-building" },
            { Icon: BriefcaseBusiness, label: "Professionals", sub: "Career growth" },
            { Icon: Palette, label: "Creators", sub: "Content & media" },
            { Icon: Rocket, label: "Small Businesses", sub: "Local to regional" },
            { Icon: BrainCircuit, label: "Enterprises", sub: "Scale & transform" },
          ].map(({ Icon, label, sub }, i) => (
            <div key={label} className="reach-node" style={{ animationDelay: `${i * 0.18}s` }} data-testid={`reach-node-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <Icon size={22} />
              <span>{label}</span>
              <small>{sub}</small>
            </div>
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
        <div className="ecosystem-grid" data-testid="home-ecosystem-grid">{ecosystem.slice(0, 4).map((item) => <article className="ecosystem-card" key={item.name} data-testid={`home-ecosystem-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><span>{item.status}</span><h3>{item.name}</h3><p>{item.description}</p></article>)}</div>
      </section>
      <section className="section" data-testid="home-portfolio-preview-section">
        <SectionHeader eyebrow="Portfolio preview" title="Selected work with a clear future-facing point of view." />
        <div className="preview-grid">{portfolioItems.slice(0, 3).map((item) => <article className="visual-card" key={item.id} data-testid={`home-portfolio-card-${item.id}`}><img src={item.image} alt={item.title} /><span>{item.category}</span><h3>{item.title}</h3><p>{item.summary}</p></article>)}</div>
      </section>
      <section className="section" data-testid="home-shop-preview-section">
        <SectionHeader eyebrow="Featured products / services" title="Actionable AI resources and creator-ready digital products." />
        <div className="product-grid">{products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} onBuy={buyProduct} />)}</div>
      </section>
      <section className="section mood-band" data-testid="home-why-choose-section">
        <SectionHeader eyebrow="Why choose Evolvix" title="AI-first, personalized, future-ready, and business-focused." text="The brand is designed to support people and businesses end-to-end — with practical innovation and creative excellence." />
        <div className="mood-row" data-testid="home-why-row">{whyChoose.map((item) => <span key={item} data-testid={`home-why-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><BriefcaseBusiness size={15} /> {item}</span>)}</div>
        <Link to="/contact?type=Business+inquiry" className="primary-btn" data-testid="home-start-project-cta">Start a Project <ArrowRight size={18} /></Link>
      </section>
      {testimonials.length > 0 && <section className="section" data-testid="home-testimonials-section"><SectionHeader eyebrow="Customer proof" title="Trust signals from people building, learning, and launching with Evolvix." /><TestimonialsCarousel testimonials={testimonials} /></section>}
      <section className="section contact-cta-band" data-testid="home-contact-cta-section"><h2>Ready to create, innovate, and elevate?</h2><p>Tell Evolvix what you want to build, learn, automate, design, or launch.</p><Link to="/contact" className="primary-btn" data-testid="home-final-contact-cta">Contact Us <ArrowRight size={18} /></Link></section>
      {customSections.map((section, index) => <section className="section custom-public-section" key={`${section.title}-${index}`} data-testid={`custom-section-${index}`}><SectionHeader eyebrow={section.eyebrow || "Custom"} title={section.title} text={section.description} /><div className="custom-card-grid" data-testid={`custom-section-cards-${index}`}>{(section.cards || []).map((card, cardIndex) => <article className="pillar-card" key={`${card.title}-${cardIndex}`} data-testid={`custom-section-${index}-card-${cardIndex}`}><Sparkles size={24} /><h3>{card.title}</h3><p>{card.text}</p></article>)}</div>{section.cta_label && <Link to={section.cta_url || "/contact"} className="primary-btn" data-testid={`custom-section-${index}-cta`}>{section.cta_label} <ArrowRight size={18} /></Link>}</section>)}
      <section className="section trust-newsletter" data-testid="home-newsletter-section">
        <div><span className="eyebrow">Trust & updates</span><h2 data-testid="home-newsletter-title">Stay close to launches, resources, and new creative drops.</h2><p data-testid="home-newsletter-text">Room for future testimonials, client wins, reviews, and credibility markers is built into the brand system.</p></div>
        <form onSubmit={join} className="newsletter-form" data-testid="newsletter-form"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" data-testid="newsletter-email-input" /><button type="submit" data-testid="newsletter-submit-button">Join Updates</button></form>
      </section>
      <section className="section home-micro-strip" data-testid="home-micro-strip">
        {["Innovate", "Automate", "Transform", "Grow"].map((word) => <span key={word} data-testid={`home-micro-strip-${word.toLowerCase()}`}>{word}</span>)}
      </section>
    </>
  );
}