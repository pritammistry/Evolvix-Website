import { useState, useEffect } from "react";
import { BarChart3, ArrowRight, ExternalLink, Monitor, Smartphone, ShoppingBag, BookOpen, Utensils, Stethoscope, Zap, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { redirectToLoginForDemo, consumePendingDemo } from "../lib/authRedirect";
import { useSEO } from "../hooks/useSEO";
import { getDemoIcon, statusBadgeClass } from "../lib/demoDisplay";

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
    id: "unlock-file-delivery",
    title: "Unlock — Payment-Locked File Delivery",
    industry: "Freelancers / Digital Services",
    description: "Stop chasing payments after delivery. Send your client a personal link where their files stay locked until you confirm payment — then unlock instantly with a 15-day download window. Built for anyone delivering digital work.",
    features: ["Files locked until payment is confirmed", "WhatsApp order confirmation with invoice link", "15-day download window with live countdown", "Multiple orders per customer", "Special permission — 2-day grace access", "Admin dashboard with payment-due tracking"],
    url: "https://evolvix-unlock-demo.vercel.app/c/demo-rahul-sharma/cv-package-locked",
    primary_label: "View Customer Experience",
    secondary_url: "https://evolvix-unlock-demo.vercel.app/admin/login",
    secondary_label: "View Admin Panel",
    note: "Admin demo login — demo@evolvixtech.in / demo1234",
    icon: <Lock size={28} />,
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

export default function Demo() {
  useSEO({ title: "Live Product Demos — See Before You Commit", description: "Explore live demos of Evolvix-built web products across retail, SaaS, and more. Request a custom demo for your business before spending a rupee.", path: "/demo" });
  const { content, loading } = useSiteContent();
  const { user } = useAuth();
  const navigate = useNavigate();
  // While the real list is still in flight, show skeletons rather than the
  // built-in defaults — otherwise the placeholder demos render first and visibly
  // swap for the real ones a second later.
  const demos = loading
    ? []
    : ((content?.demos?.length ? content.demos.filter((d) => d.visible !== false) : null) || DEMO_SITES);
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

  // `url` is passed explicitly so a card can offer more than one destination
  // (e.g. the customer-facing view and the admin panel of the same product).
  function handleDemoClick(demo, url = demo.url) {
    if (!user) {
      redirectToLoginForDemo(navigate, demo.id, url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="section page-section" data-testid="demo-page">
      <SectionHeader
        eyebrow="Live Demos"
        title="See it before you commit."
        text="Every Evolvix project starts with a working demo — real design, real functionality, built for your industry. Browse live examples below, then tell us what you want built."
      />
      <div className="demo-cards" data-testid="demo-cards">
        {loading && [1, 2, 3].map((i) => (
          <article className="demo-card demo-card--skeleton" key={`demo-skeleton-${i}`} aria-hidden="true">
            <div className="demo-card-meta">
              <span className="skeleton-block skeleton-icon" />
              <div style={{ flex: 1 }}>
                <span className="skeleton-line" style={{ height: 10, width: "28%", display: "block", marginBottom: 8 }} />
                <span className="skeleton-line" style={{ height: 20, width: "56%", display: "block" }} />
              </div>
            </div>
            <span className="skeleton-line" style={{ height: 12, width: "92%", display: "block", marginTop: 14 }} />
            <span className="skeleton-line" style={{ height: 12, width: "74%", display: "block", marginTop: 8 }} />
            <span className="skeleton-line" style={{ height: 38, width: 190, display: "block", marginTop: 18, borderRadius: 999 }} />
          </article>
        ))}
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
                <>
                  <button onClick={() => handleDemoClick(demo, demo.url)} className="primary-btn" data-testid={`demo-visit-${demo.id}`}>
                    {demo.primary_label || "View Live Demo"} <ExternalLink size={16} />
                  </button>
                  {demo.secondary_url && (
                    <button onClick={() => handleDemoClick(demo, demo.secondary_url)} className="secondary-btn" data-testid={`demo-visit-secondary-${demo.id}`}>
                      {demo.secondary_label || "View Admin Panel"} <ExternalLink size={16} />
                    </button>
                  )}
                </>
              ) : (
                <span className="primary-btn demo-btn--disabled" data-testid={`demo-visit-${demo.id}`}>
                  {demo.status === "Now Building" ? "In Progress" : "Coming Soon"}
                </span>
              )}
              <Link to={`/contact?${new URLSearchParams({ type: "Business inquiry", service: `Demo – ${demo.title}` }).toString()}`} className="secondary-btn" data-testid={`demo-contact-${demo.id}`}>
                Request This for My Business
              </Link>
            </div>
            {demo.note && <p className="demo-card-note" data-testid={`demo-note-${demo.id}`}>{demo.note}</p>}
          </article>
        ))}
      </div>
      <div className="demo-verticals-block" data-testid="demo-verticals">
        <h2>We build demos for every industry</h2>
        <p className="demo-verticals-sub">Don't see your industry? We'll build a custom demo for you — no commitment needed.</p>
        <div className="demo-verticals-grid">
          {VERTICALS.map(({ icon, label }) => (
            <div className="demo-vertical-chip" key={label}>{icon}<span>{label}</span></div>
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
