import { Link } from "react-router-dom";
import { ArrowRight, Boxes } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";

export default function Ecosystem() {
  const { content } = useSiteContent();
  const ecosystem = content.ecosystem || [];
  return (
    <section className="section page-section" data-testid="ecosystem-page">
      <SectionHeader eyebrow="Evolvix Product Ecosystem" title="LearnAI, BuildX, Creative, and Business — four connected verticals." text="Each vertical is built to serve a different need, from downloadable learning packs to on-demand software, design, and consulting." />
      <div className="ecosystem-grid large" data-testid="ecosystem-page-grid">
        {ecosystem.map((vertical) => <article className="ecosystem-card" key={vertical.name} data-testid={`ecosystem-card-${vertical.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><Boxes size={30} /><span>{vertical.status}</span><h2>{vertical.name}</h2><p>{vertical.description}</p><ul>{vertical.items.map((item) => <li key={item} data-testid={`ecosystem-item-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{item}</li>)}</ul></article>)}
      </div>
      <div className="related-panel" data-testid="ecosystem-next-step-panel"><h2>Explore LearnAI or request on-demand work.</h2><Link to="/shop" className="secondary-btn" data-testid="ecosystem-shop-link">Browse LearnAI</Link><Link to="/contact" className="primary-btn" data-testid="ecosystem-contact-link">Start On-Demand Inquiry <ArrowRight size={18} /></Link></div>
    </section>
  );
}