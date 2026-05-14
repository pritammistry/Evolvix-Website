import { blogPosts } from "../data/siteContent";
import { SectionHeader } from "../components/SectionHeader";

export default function Blog() {
  return <section className="section page-section" data-testid="blog-page"><SectionHeader eyebrow="Blog / Insights" title="Readable insights for AI tools, digital creativity, productivity, and music." text="A premium publishing layout built for future SEO-friendly articles and categorized learning content." /><div className="blog-list" data-testid="blog-list">{blogPosts.map((post) => <article className="blog-card" key={post.id} data-testid={`blog-card-${post.id}`}><span data-testid={`blog-category-${post.id}`}>{post.category}</span><h2 data-testid={`blog-title-${post.id}`}>{post.title}</h2><p data-testid={`blog-excerpt-${post.id}`}>{post.excerpt}</p><small data-testid={`blog-meta-${post.id}`}>{post.date} • {post.readTime}</small></article>)}</div></section>;
}