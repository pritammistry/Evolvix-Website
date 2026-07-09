import { Link } from "react-router-dom";
import { ArrowRight, Boxes } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";
import { useSEO } from "../hooks/useSEO";

function ecosystemPath(name) {
  if (name === "Evolvix LearnAI") return "/shop?category=LearnAI";
  return "/contact";
}

export default function Ecosystem() {
  useSEO({ title: "Evolvix Product Ecosystem — LearnAI, BuildX, Creative & Business", description: "Explore four focused verticals: Evolvix LearnAI for learning, BuildX for development, Creative for design, and Business for consulting and growth.", path: "/ecosystem" });
  const { content } = useSiteContent();
  const ecosystem = content.ecosystem || [];
  return (
    <section className="section page-section" data-testid="ecosystem-page">
      <SectionHeader eyebrow="Evolvix Product Ecosystem" title="Four focused pillars — learning, building, creativity, and business growth." text="Each vertical has a clear purpose, status, and path to action." />
      <div className="ecosystem-grid large" data-testid="ecosystem-page-grid">
        {ecosystem.map((vertical) => <article className="ecosystem-card" key={vertical.name} data-testid={`ecosystem-card-${vertical.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><Boxes size={30} /><span className="ecosystem-status">{vertical.status}</span><h2>{vertical.name}</h2><p>{vertical.description}</p><ul>{vertical.items.map((item) => <li key={item} data-testid={`ecosystem-item-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{item}</li>)}</ul><Link to={ecosystemPath(vertical.name)} className="icon-link" data-testid={`ecosystem-cta-${vertical.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>Explore <ArrowRight size={16} /></Link></article>)}
      </div>
      <div className="related-panel" data-testid="ecosystem-next-step-panel"><h2>Explore LearnAI or request on-demand work.</h2><Link to="/shop" className="secondary-btn" data-testid="ecosystem-shop-link">Browse LearnAI</Link><Link to="/contact?type=Collaboration+inquiry" className="primary-btn" data-testid="ecosystem-contact-link">Start On-Demand Inquiry <ArrowRight size={18} /></Link></div>
    </section>
  );
}