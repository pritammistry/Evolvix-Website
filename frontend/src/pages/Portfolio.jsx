import { useState } from "react";
import { portfolioItems } from "../data/siteContent";
import { FilterPills } from "../components/FilterPills";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";
import { HeroParticle } from "../components/HeroParticle";

export default function Portfolio() {
  const { content, loading } = useSiteContent();
  const [active, setActive] = useState("All");

  if (loading) {
    return (
      <section className="section page-section sphere-loader-page" data-testid="portfolio-loading">
        <div className="sphere-loader">
          <HeroParticle />
          <p className="sphere-loader-text">Loading showcase…</p>
        </div>
      </section>
    );
  }

  const items = content.portfolio || portfolioItems;
  const categories = ["All", ...new Set(items.map((item) => item.category))];
  const filtered = active === "All" ? items : items.filter((item) => item.category === active);
  return <section className="section page-section" data-testid="portfolio-page"><SectionHeader eyebrow="Portfolio / Showcase" title="A refined showcase of products, projects, assets, learning visuals, music concepts, and business resources." text="Filter by vertical to explore Evolvix proof-of-work categories." /><FilterPills items={categories} active={active} setActive={setActive} testPrefix="portfolio" /><div className="preview-grid portfolio-grid" data-testid="portfolio-grid">{filtered.map((item) => <article className="visual-card" key={item.id} data-testid={`portfolio-card-${item.id}`}><img src={item.image} alt={item.title} data-testid={`portfolio-image-${item.id}`} /><span data-testid={`portfolio-category-${item.id}`}>{item.category}</span><h3 data-testid={`portfolio-title-${item.id}`}>{item.title}</h3><p data-testid={`portfolio-summary-${item.id}`}>{item.summary}</p><button className="ghost-buy" data-testid={`portfolio-cta-${item.id}`}>View Showcase</button></article>)}</div></section>;
}
