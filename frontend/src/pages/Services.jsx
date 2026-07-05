import { ArrowRight, BrainCircuit, MapPin, Palette, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";

export default function Services() {
  const { content } = useSiteContent();
  const creative = content.creative_services || [];
  const tech = content.technology_services || [];
  const howWeWork = content.how_we_work || [];
  const industries = content.industries_served || [];
  return (
    <section className="section page-section" data-testid="services-page">
      <SectionHeader eyebrow="Services" title="Creative digital services plus AI business and technology solutions." text="From brand identity and pitch decks to AI workflow design, websites, apps, software, automation, and digital marketing." />
      <div className="service-hero-strip" data-testid="services-hero-strip">
        <article><Palette size={28} /><h3>Creative Digital Services</h3><p>Design, media, branding, and presentation services for people and businesses.</p></article>
        <article><BrainCircuit size={28} /><h3>AI Business Consulting</h3><p>Strategy, workflows, automation, CRM thinking, and digital transformation support.</p></article>
        <article><Rocket size={28} /><h3>Technology Solutions</h3><p>Websites, apps, SaaS, business software, and AI-powered products.</p></article>
      </div>
      <SectionHeader eyebrow="Creative" title="Creative Digital Services" />
      <div className="service-grid" data-testid="creative-services-grid">{creative.map((service) => <article className="service-card" key={service.title} data-testid={`creative-service-${service.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><h3>{service.title}</h3><p>{service.text}</p></article>)}</div>
      <SectionHeader eyebrow="AI + Technology" title="AI Business Consulting & Technology Solutions" />
      <div className="service-grid" data-testid="technology-services-grid">{tech.map((service) => <article className="service-card" key={service.title} data-testid={`technology-service-${service.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><h3>{service.title}</h3><p>{service.text}</p></article>)}</div>
      <SectionHeader eyebrow="For Local Businesses" title="Digital enablement for local business" text="For small and mid-size businesses in and around Bardhaman who aren't sure where to start with AI or digital tools — plain-language guidance, not jargon." />
      <div className="mission-panel" data-testid="local-enablement-panel">
        <p data-testid="local-enablement-text"><MapPin size={24} /> We've helped local retailers modernize how they reach and manage customers with CRM automation built specifically for their day-to-day — and we can do the same for yours, one practical step at a time.</p>
      </div>
      <SectionHeader eyebrow="Process" title="How we work" text="Five steps that set expectations before you reach out." />
      <div className="how-we-work-grid" data-testid="how-we-work-grid">{howWeWork.map((item, index) => <article className="how-we-work-card" key={item.step} data-testid={`how-we-work-${index}`}><span className="how-we-work-index" data-testid={`how-we-work-index-${index}`}>{String(index + 1).padStart(2, "0")}</span><h3>{item.step}</h3><p>{item.text}</p></article>)}</div>
      <SectionHeader eyebrow="Industries" title="Industries we serve" />
      <div className="trust-strip" data-testid="industries-served-strip">{industries.map((industry) => <span key={industry} data-testid={`industry-${industry.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{industry}</span>)}<span data-testid="industry-and-more">And more</span></div>
      <div className="related-panel" data-testid="services-contact-panel"><h2>Need something custom?</h2><p>Send a business, creative, or technology inquiry and Evolvix can shape the right solution.</p><Link to="/contact" className="primary-btn" data-testid="services-contact-cta">Request a Service <ArrowRight size={18} /></Link></div>
    </section>
  );
}