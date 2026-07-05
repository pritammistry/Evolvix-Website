import { ArrowRight, ExternalLink, Monitor, Smartphone, ShoppingBag, BookOpen, Utensils, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionHeader } from "../components/SectionHeader";

const DEMO_SITES = [
  {
    id: "optical-catalog",
    title: "Smart Store — Spectacle Shop",
    industry: "Retail / Optical",
    description: "A fully branded digital catalog for an optical retailer. Customers browse frames, lenses, and accessories with a 'Show Interest' flow that feeds directly into a live leads dashboard.",
    features: ["Product catalog with categories", "Show Interest / enquiry flow", "Live leads dashboard", "Mobile-first design"],
    url: "https://evolvix-catalog-demo.vercel.app",
    icon: <ShoppingBag size={28} />,
    status: "Live Demo",
  },
];

const VERTICALS = [
  { icon: <BookOpen size={22} />, label: "Education & Coaching" },
  { icon: <Utensils size={22} />, label: "Restaurants & Cafés" },
  { icon: <Stethoscope size={22} />, label: "Clinics & Wellness" },
  { icon: <ShoppingBag size={22} />, label: "Retail & Local Shops" },
  { icon: <Monitor size={22} />, label: "SaaS & Tech Products" },
  { icon: <Smartphone size={22} />, label: "Service Businesses" },
];

export default function Demo() {
  return (
    <section className="section page-section" data-testid="demo-page">
      <SectionHeader
        eyebrow="Live Demos"
        title="See it before you commit."
        text="Every Evolvix project starts with a working demo — real design, real functionality, built for your industry. Browse live examples below, then tell us what you want built."
      />

      <div className="demo-cards" data-testid="demo-cards">
        {DEMO_SITES.map((demo) => (
          <article className="demo-card" key={demo.id} data-testid={`demo-card-${demo.id}`}>
            <div className="demo-card-meta">
              <span className="demo-card-icon">{demo.icon}</span>
              <div>
                <span className="eyebrow" style={{ marginBottom: 4 }}>{demo.industry}</span>
                <h2>{demo.title}</h2>
              </div>
              <span className="demo-live-badge">{demo.status}</span>
            </div>
            <p>{demo.description}</p>
            <ul className="demo-feature-list">
              {demo.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <div className="demo-card-actions">
              <a href={demo.url} target="_blank" rel="noopener noreferrer" className="primary-btn" data-testid={`demo-visit-${demo.id}`}>
                View Live Demo <ExternalLink size={16} />
              </a>
              <Link to="/contact" className="secondary-btn" data-testid={`demo-contact-${demo.id}`}>
                Request This for My Business
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="demo-verticals-block" data-testid="demo-verticals">
        <h2>We build demos for every industry</h2>
        <p className="demo-verticals-sub">Don't see your industry? We'll build a custom demo for you — no commitment needed.</p>
        <div className="demo-verticals-grid">
          {VERTICALS.map(({ icon, label }) => (
            <div className="demo-vertical-chip" key={label}>
              {icon}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="related-panel" data-testid="demo-cta-panel">
        <h2>Want a demo built for your business?</h2>
        <p>Tell us your industry, your products, and your idea — we'll show you a working prototype before you spend a rupee.</p>
        <Link to="/contact" className="primary-btn" data-testid="demo-contact-cta">
          Get Your Free Demo <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
