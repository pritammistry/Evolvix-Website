import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BrainCircuit, Download, Music2, ShoppingBag, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { logos, products, portfolioItems, musicMoods } from "../data/siteContent";
import { SectionHeader } from "../components/SectionHeader";
import { ProductCard } from "../components/ProductCard";
import { submitNewsletter, createCheckout } from "../api";

export default function Home() {
  const [email, setEmail] = useState("");
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
          <span className="eyebrow" data-testid="home-hero-eyebrow">Premium AI-era digital brand platform</span>
          <h1 data-testid="home-hero-headline">Create, innovate, and elevate in the AI era.</h1>
          <p data-testid="home-hero-subheadline">Evolvix Tech Media helps students, creators, professionals, families, and growing businesses use technology with clarity, confidence, and imagination.</p>
          <div className="hero-actions" data-testid="home-hero-actions">
            <Link className="primary-btn" to="/portfolio" data-testid="home-explore-portfolio-cta">Explore Portfolio <ArrowRight size={18} /></Link>
            <Link className="secondary-btn" to="/shop" data-testid="home-shop-products-cta">Shop Products</Link>
            <Link className="text-btn" to="/contact" data-testid="home-contact-cta">Get in Touch</Link>
          </div>
          <div className="trust-strip" data-testid="home-trust-strip">
            <span data-testid="trust-item-products"><Download size={16} /> Digital products</span>
            <span data-testid="trust-item-accessible"><Users size={16} /> Accessible learning</span>
            <span data-testid="trust-item-secure"><ShieldCheck size={16} /> Buyer-first clarity</span>
          </div>
        </div>
        <div className="hero-logo-stage" data-testid="home-hero-logo-stage"><img src={logos.circular} alt="Evolvix Tech Media circular logo" data-testid="home-hero-logo-image" /></div>
      </section>
      <section className="section split-section" data-testid="home-intro-section">
        <SectionHeader eyebrow="Vision" title="Technology should feel understandable, useful, and empowering." text="Evolvix blends learning, products, creative assets, portfolio work, and mood-based AI media into one premium brand experience." />
        <div className="mission-panel" data-testid="home-vision-panel"><p data-testid="home-vision-text">From students exploring AI for the first time to elderly users needing patient digital support, the mission is simple: make the future feel human.</p></div>
      </section>
      <section className="section" data-testid="home-pillars-section">
        <SectionHeader eyebrow="Core pillars" title="A connected platform for learning, buying, creating, and trusting." />
        <div className="pillar-grid">
          {[[ShoppingBag, "Digital Products", "Downloadable resources and creator-ready bundles."], [BrainCircuit, "AI Tools / Learning", "Plain-language guidance for the AI-driven world."], [Music2, "AI Music", "Mood-based creative experiences for emotion and story."], [ShieldCheck, "Portfolio", "A trust-building showcase for work and brand assets."]].map(([Icon, title, text]) => <article className="pillar-card" key={title} data-testid={`home-pillar-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><Icon size={28} /><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>
      <section className="section" data-testid="home-portfolio-preview-section">
        <SectionHeader eyebrow="Portfolio preview" title="Selected work with a clear future-facing point of view." />
        <div className="preview-grid">{portfolioItems.slice(0, 3).map((item) => <article className="visual-card" key={item.id} data-testid={`home-portfolio-card-${item.id}`}><img src={item.image} alt={item.title} /><span>{item.category}</span><h3>{item.title}</h3><p>{item.summary}</p></article>)}</div>
      </section>
      <section className="section" data-testid="home-shop-preview-section">
        <SectionHeader eyebrow="Featured products" title="Digital products designed for confidence, clarity, and creative momentum." />
        <div className="product-grid">{products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} onBuy={buyProduct} />)}</div>
      </section>
      <section className="section mood-band" data-testid="home-music-mood-section">
        <SectionHeader eyebrow="AI music / creative lab" title="Choose a feeling. Shape a sound world." text="Mood-based AI-assisted music concepts turn emotion into creative direction for calm, focus, nostalgia, cinematic moments, and more." />
        <div className="mood-row" data-testid="home-mood-row">{musicMoods.slice(0, 5).map((mood) => <span key={mood.mood} data-testid={`home-mood-${mood.mood.toLowerCase()}`}>{mood.mood}</span>)}</div>
        <Link to="/creative-lab" className="primary-btn" data-testid="home-creative-lab-cta">Enter Creative Lab <ArrowRight size={18} /></Link>
      </section>
      <section className="section trust-newsletter" data-testid="home-newsletter-section">
        <div><span className="eyebrow">Trust & updates</span><h2 data-testid="home-newsletter-title">Stay close to launches, resources, and new creative drops.</h2><p data-testid="home-newsletter-text">Room for future testimonials, client wins, reviews, and credibility markers is built into the brand system.</p></div>
        <form onSubmit={join} className="newsletter-form" data-testid="newsletter-form"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" data-testid="newsletter-email-input" /><button type="submit" data-testid="newsletter-submit-button">Join Updates</button></form>
      </section>
    </>
  );
}