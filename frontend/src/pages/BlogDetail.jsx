import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";
import { blogPosts } from "../data/siteContent";
import { useSiteContent } from "../hooks/useSiteContent";

export default function BlogDetail() {
  const { slug } = useParams();
  const { content } = useSiteContent();
  const posts = content.blog || blogPosts;
  const post = posts.find((item) => item.slug === slug || item.id === slug) || posts[0] || blogPosts[0];
  const body = post.body || `${post.excerpt}\n\nThis insight is ready for a full editorial version from the admin dashboard. Add article sections, examples, calls to action, and SEO-friendly guidance as the Evolvix content library grows.`;
  return <section className="section page-section blog-detail-page" data-testid="blog-detail-page"><Link to="/blog" className="icon-link" data-testid="blog-detail-back-link"><ArrowLeft size={16} /> Back to insights</Link><article className="blog-detail-copy" data-testid="blog-detail-article"><span data-testid="blog-detail-category">{post.category}</span><h1 data-testid="blog-detail-title">{post.title}</h1><div className="blog-detail-meta" data-testid="blog-detail-meta"><span><CalendarDays size={16} /> {post.date}</span><span><Clock3 size={16} /> {post.readTime || post.read_time}</span></div><p className="blog-detail-excerpt" data-testid="blog-detail-excerpt">{post.excerpt}</p>{body.split("\n").filter(Boolean).map((paragraph, index) => <p key={`${post.id}-paragraph-${index}`} data-testid={`blog-detail-paragraph-${index}`}>{paragraph}</p>)}</article><aside className="related-panel" data-testid="blog-detail-cta-panel"><h2 data-testid="blog-detail-cta-title">Need help turning this into action?</h2><p data-testid="blog-detail-cta-text">Evolvix can shape AI learning, business workflows, creative assets, or digital products around your goal.</p><Link to="/contact" className="primary-btn" data-testid="blog-detail-contact-link">Contact Evolvix</Link></aside></section>;
}