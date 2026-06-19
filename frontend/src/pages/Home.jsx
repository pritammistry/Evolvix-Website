import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BrainCircuit, BriefcaseBusiness, Download, Palette, Rocket, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { logos } from "../data/siteContent";
import { SectionHeader } from "../components/SectionHeader";
import { ProductCard } from "../components/ProductCard";
import { submitNewsletter, createCheckout } from "../api";
import { useSiteContent } from "../hooks/useSiteContent";

export default function Home() {
  const [email, setEmail] = useState("");
  const { content } = useSiteContent();
  const brand = content.brand || {};
  const products = content.products || [];
  const portfolioItems = content.portfolio || [];
  const ecosystem = content.ecosystem || [];
  const whyChoose = content.why_choose || [];
  const buyProduct = async (productId) => {
    try {
      const { data } = await createCheckout({ product_id: productId, origin_url: window.location.origin });
      window.location.href = data.url;
    } catch (error) {
      toast.error("Checkout could not start. Please try again or contact Evolvix.");
    }
  };
  const join = async (event) => {
    event.preventDefault();
    try {
      await submitNewsletter({ email });
      toast.success("You’re on the Evolvix update list.");
      setEmail("");
    } catch (error) {
      toast.error("Please enter a valid email address.");
    }
  };
  return (
    <>
      <section className="hero-section" data-testid="home-hero-section">
        <div className="hero-copy">
          <span className="eyebrow" data-testid="home-hero-eyebrow">{brand.tagline}</span>
          <h1 data-testid="home-hero-headline">{brand.headline}</h1>
          <p data-testid="home-hero-subheadline">{brand.subheadline}</p>
          <div className="hero-actions" data-testid="home-hero-actions">
            <Link className="primary-btn" to="/services" data-testid="home-services-cta">Explore Services <ArrowRight size={18} /></Link>
            <Link className="secondary-btn" to="/ecosystem" data-testid="home-ecosystem-cta">Product Ecosystem</Link>
            <Link className="text-btn" to="/contact" data-testid="home-contact-cta">Get in Touch</Link>
          </div>
          <div className="trust-strip" data-testid="home-trust-strip">
            {(brand.core_areas || []).map((area) => <span key={area} data-testid={`trust-item-${area.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><Sparkles size={16} /> {area}</span>)}
            <span data-testid="trust-item-gstin"><ShieldCheck size={16} /> GSTIN: {brand.gstin}</span>
          </div>
        </div>
        <div className="hero-logo-stage" data-testid="home-hero-logo-stage"><img src={logos.circular} alt="Evolvix Tech Media circular logo" data-testid="home-hero-logo-image" /></div>
      </section>
      <section className="section split-section" data-testid="home-intro-section">
        <SectionHeader eyebrow="AI • Digital • Business • Creative" title="One brand for digital products, custom services, and future-ready transformation." text="Evolvix combines AI consulting, creative design, productized learning, software development, automation, and digital growth support." />
        <div className="mission-panel" data-testid="home-vision-panel"><p data-testid="home-vision-text">Let’s build a smarter future together — from resumes and portfolios to SaaS, automation, business software, and AI-powered products.</p></div>
      </section>
      <section className="section" data-testid="home-pillars-section">
        <SectionHeader eyebrow="Core service pillars" title="Creative services, technology solutions, digital products, and business consulting." />
        <div className="pillar-grid">
          {[[Palette, "Creative Digital Services", "Resumes, portfolios, company profiles, branding, catalogs, pitch decks, and social creatives."], [BrainCircuit, "AI Business Consulting", "AI strategy, workflows, process automation, CRM thinking, and transformation support."], [Rocket, "Technology Solutions", "Websites, e-commerce, web apps, mobile apps, SaaS, and business software."], [Download, "LearnAI Products", "Prompt packs, learning resources, business packs, career packs, creator packs, and productivity packs."]].map(([Icon, title, text]) => <article className="pillar-card" key={title} data-testid={`home-pillar-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><Icon size={28} /><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>
      <section className="section" data-testid="home-ecosystem-preview-section">
        <SectionHeader eyebrow="Product ecosystem" title="Four Evolvix verticals built for different needs." />
        <div className="ecosystem-grid" data-testid="home-ecosystem-grid">{ecosystem.map((item) => <article className="ecosystem-card" key={item.name} data-testid={`home-ecosystem-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><span>{item.status}</span><h3>{item.name}</h3><p>{item.description}</p></article>)}</div>
      </section>
      <section className="section" data-testid="home-portfolio-preview-section">
        <SectionHeader eyebrow="Portfolio preview" title="Selected work with a clear future-facing point of view." />
        <div className="preview-grid">{portfolioItems.slice(0, 3).map((item) => <article className="visual-card" key={item.id} data-testid={`home-portfolio-card-${item.id}`}><img src={item.image} alt={item.title} /><span>{item.category}</span><h3>{item.title}</h3><p>{item.summary}</p></article>)}</div>
      </section>
      <section className="section" data-testid="home-shop-preview-section">
        <SectionHeader eyebrow="LearnAI preview" title="Digital resources for prompts, careers, creators, business, and productivity." />
        <div className="product-grid">{products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} onBuy={buyProduct} />)}</div>
      </section>
      <section className="section mood-band" data-testid="home-why-choose-section">
        <SectionHeader eyebrow="Why choose Evolvix" title="AI-first, personalized, future-ready, and business-focused." text="The brand is designed to support people and businesses end-to-end — with practical innovation and creative excellence." />
        <div className="mood-row" data-testid="home-why-row">{whyChoose.map((item) => <span key={item} data-testid={`home-why-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><BriefcaseBusiness size={15} /> {item}</span>)}</div>
        <Link to="/contact" className="primary-btn" data-testid="home-start-project-cta">Start a Project <ArrowRight size={18} /></Link>
      </section>
      <section className="section trust-newsletter" data-testid="home-newsletter-section">
        <div><span className="eyebrow">Trust & updates</span><h2 data-testid="home-newsletter-title">Stay close to launches, resources, and new creative drops.</h2><p data-testid="home-newsletter-text">Room for future testimonials, client wins, reviews, and credibility markers is built into the brand system.</p></div>
        <form onSubmit={join} className="newsletter-form" data-testid="newsletter-form"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" data-testid="newsletter-email-input" /><button type="submit" data-testid="newsletter-submit-button">Join Updates</button></form>
      </section>
    </>
  );
}