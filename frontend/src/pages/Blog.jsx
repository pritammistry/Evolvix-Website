import { useState } from "react";
import { Link } from "react-router-dom";
import { blogPosts } from "../data/siteContent";
import { useSEO } from "../hooks/useSEO";
import { SectionHeader } from "../components/SectionHeader";
import { FilterPills } from "../components/FilterPills";
import { useSiteContent } from "../hooks/useSiteContent";

export default function Blog() {
  useSEO({ title: "Blog & Insights — AI, Business, Creativity & Learning", description: "Practical articles on AI tools, learning strategies, business growth, and digital creativity from Evolvix Tech Media.", path: "/blog" });
  const { content } = useSiteContent();
  const [active, setActive] = useState("All");
  const posts = content.blog || blogPosts;
  const categories = ["All", ...new Set(posts.map((post) => post.category))];
  const filtered = active === "All" ? posts : posts.filter((post) => post.category === active);
  return <section className="section page-section" data-testid="blog-page"><SectionHeader eyebrow="Blog / Insights" title="Readable, SEO-friendly insights for AI tools, learning, business, music, accessibility, and creator growth." text="A premium educational content hub built for future articles and search visibility." /><FilterPills items={categories} active={active} setActive={setActive} testPrefix="blog" /><div className="blog-list blog-grid" data-testid="blog-list">{filtered.map((post) => <article className="blog-card" key={post.id} data-testid={`blog-card-${post.id}`}><span data-testid={`blog-category-${post.id}`}>{post.category}</span><h2 data-testid={`blog-title-${post.id}`}>{post.title}</h2><p data-testid={`blog-excerpt-${post.id}`}>{post.excerpt}</p><div className="blog-card-footer"><small data-testid={`blog-meta-${post.id}`}>{post.date} • {post.readTime || post.read_time}</small><Link to={`/blog/${post.slug || post.id}`} className="icon-link" data-testid={`blog-read-link-${post.id}`}>Read insight</Link></div></article>)}</div></section>;
}
