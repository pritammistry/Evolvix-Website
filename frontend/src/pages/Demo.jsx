import { useState, useEffect } from "react";
import { BarChart3, ArrowRight, ExternalLink, Monitor, Smartphone, ShoppingBag, BookOpen, Utensils, Stethoscope, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { redirectToLoginForDemo, consumePendingDemo } from "../lib/authRedirect";

const ICON_MAP = {
  shopping: <ShoppingBag size={28} />,
  monitor: <Monitor size={28} />,
  book: <BookOpen size={28} />,
  food: <Utensils size={28} />,
  health: <Stethoscope size={28} />,
  phone: <Smartphone size={28} />,
  chart: <BarChart3 size={28} />,
  zap: <Zap size={28} />,
};

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
  {
    id: "invoice-management",
    title: "Invoice & Billing Management App",
    industry: "Finance / Accounting",
    description: "A smart billing dashboard for small businesses — generate GST invoices, track payments, manage clients, and export reports.",
    features: ["GST invoice generation", "Payment tracking", "Client management", "Report export"],
    url: "",
    icon: <BarChart3 size={28} />,
    status: "Coming Soon",
  },
  {
    id: "saas-crm-automation",
    title: "SaaS CRM & Automation Demo",
    industry: "SaaS / Tech Products",
    description: "A full CRM with lead pipeline, automated follow-ups, task management, and team dashboard — built for SaaS and service businesses.",
    features: ["Lead pipeline board", "Automated follow-ups", "Task & team management", "Analytics dashboard"],
    url: "",
    icon: <Zap size={28} />,
    status: "Coming Soon",
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

function getDemoIcon(demo) {
  if (demo.icon) return demo.icon;
  return ICON_MAP[demo.icon_key] || <Monitor size={28} />;
}

function statusBadgeClass(status) {
  if (status === "Coming Soon") return "demo-live-badge demo-badge--coming-soon";
  if (status === "Now Building") return "demo-live-badge demo-badge--now-building";
  return "demo-live-badge";
}

export default function Demo() {
  useSEO({ title: "Live Product Demos — See Before You Commit", description: "Explore live demos of Evolvix-built web products across retail, SaaS, and more. Request a custom demo for your business before spending a rupee.", path: "/demo" });
  const { content } = useSiteContent();
  const { user } = useAuth();
  const navigate = useNavigate();
  const demos = (content?.demos?.length ? content.demos.filter((d) => d.visible !== false) : null) || DEMO_SITES;
  const [highlighted, setHighlighted] = useState(null);

  useEffect(() => {
    if (!user) return;
    const pending = consumePendingDemo();
    if (!pending) return;
    window.open(pending.url, "_blank", "noopener,noreferrer");
    toast.success("Demo opened in a new tab.");
    setHighlighted(pending.id);
    const t = setTimeout(() => setHighlighted(null), 4000);
    return () => clearTimeout(t);
  }, [user]);

  function handleDemoClick(demo) {
    if (!user) {
      redirectToLoginForDemo(navigate, demo.id, demo.url);
      return;
    }
    window.open(demo.url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="section page-section" data-testid="demo-page">
      <SectionHeader
        eyebrow="Live Demos"
        title="See it before you commit."
        text="Every Evolvix project starts with a working demo — real design, real functionality, built for your industry. Browse live examples below, then tell us what you want built."
      />

      <div className="demo-cards" data-testid="demo-cards">
        {demos.map((demo) => (
          <article className={`demo-card${highlighted === demo.id ? " demo-card--highlighted" : ""}`} key={demo.id} data-testid={`demo-card-${demo.id}`}>
            <div className="demo-card-meta">
              <span className="demo-card-icon">{getDemoIcon(demo)}</span>
              <div>
                <span className="eyebrow" style={{ marginBottom: 4 }}>{demo.industry}</span>
                <h2>{demo.title}</h2>
              </div>
              <span className={statusBadgeClass(demo.status)}>{demo.status}</span>
            </div>
            <p>{demo.description}</p>
            <ul className="demo-feature-list">
              {(demo.features || []).map((f) => <li key={f}>{f}</li>)}
            </ul>
            <div className="demo-card-actions">
              {demo.status === "Live Demo" ? (
                <button onClick={() => handleDemoClick(demo)} className="primary-btn" data-testid={`demo-visit-${demo.id}`}>
                  View Live Demo <ExternalLink size={16} />
                </button>
              ) : (
                <span className="primary-btn demo-btn--disabled" data-testid={`demo-visit-${demo.id}`}>
                  {demo.status === "Now Building" ? "In Progress" : "Coming Soon"}
                </span>
              )}
              <Link to={`/contact?${new URLSearchParams({ type: "Business inquiry", service: `Demo – ${demo.title}` }).toString()}`} className="secondary-btn" data-testid={`demo-contact-${demo.id}`}>
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
        <Link to="/contact?type=Business+inquiry&service=Custom+Demo+Build" className="primary-btn" data-testid="demo-contact-cta">
          Get Your Free Demo <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
