import { useState } from "react";
import { portfolioItems } from "../data/siteContent";
import { FilterPills } from "../components/FilterPills";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";

export default function Portfolio() {
  const { content } = useSiteContent();
  const items = content.portfolio || portfolioItems;
  const categories = ["All", ...new Set(items.map((item) => item.category))];
  const [active, setActive] = useState("All");
  const filtered = active === "All" ? items : items.filter((item) => item.category === active);
  return <section className="section page-section" data-testid="portfolio-page"><SectionHeader eyebrow="Portfolio" title="Browse projects, case studies, products, AI/music work, and brand assets." text="A flexible showcase designed for clients, customers, collaborators, and future expansion." /><FilterPills items={categories} active={active} setActive={setActive} testPrefix="portfolio" /><div className="preview-grid portfolio-grid" data-testid="portfolio-grid">{filtered.map((item) => <article className="visual-card" key={item.id} data-testid={`portfolio-card-${item.id}`}><img src={item.image} alt={item.title} data-testid={`portfolio-image-${item.id}`} /><span data-testid={`portfolio-category-${item.id}`}>{item.category}</span><h3 data-testid={`portfolio-title-${item.id}`}>{item.title}</h3><p data-testid={`portfolio-summary-${item.id}`}>{item.summary}</p></article>)}</div></section>;
}