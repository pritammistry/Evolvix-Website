import { useState } from "react";
import { blogPosts } from "../data/siteContent";
import { SectionHeader } from "../components/SectionHeader";
import { FilterPills } from "../components/FilterPills";

export default function Blog() {
  const categories = ["All", ...new Set(blogPosts.map((post) => post.category))];
  const [active, setActive] = useState("All");
  const filtered = active === "All" ? blogPosts : blogPosts.filter((post) => post.category === active);
  return <section className="section page-section" data-testid="blog-page"><SectionHeader eyebrow="Blog / Insights" title="Readable insights for AI tools, digital creativity, productivity, and music." text="A premium publishing layout built for future SEO-friendly articles and categorized learning content." /><FilterPills items={categories} active={active} setActive={setActive} testPrefix="blog" /><div className="blog-list blog-grid" data-testid="blog-list">{filtered.map((post) => <article className="blog-card" key={post.id} data-testid={`blog-card-${post.id}`}><span data-testid={`blog-category-${post.id}`}>{post.category}</span><h2 data-testid={`blog-title-${post.id}`}>{post.title}</h2><p data-testid={`blog-excerpt-${post.id}`}>{post.excerpt}</p><small data-testid={`blog-meta-${post.id}`}>{post.date} • {post.readTime}</small></article>)}</div></section>;
}