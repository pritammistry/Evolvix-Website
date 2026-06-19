import { useParams, Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { products } from "../data/siteContent";
import { createCheckout } from "../api";
import { useSiteContent } from "../hooks/useSiteContent";

export default function ProductDetail() {
  const { slug } = useParams();
  const { content } = useSiteContent();
  const catalog = content.products || products;
  const product = catalog.find((item) => item.slug === slug) || catalog[0] || products[0];
  const buyProduct = async () => { try { const { data } = await createCheckout({ product_id: product.id, origin_url: window.location.origin }); window.location.href = data.url; } catch (error) { toast.error("Checkout could not start. Please contact Evolvix for purchase help."); } };
  const benefits = product.benefits || ["Clear practical value", "Instant digital delivery", "Future-friendly creative use"];
  const included = product.included || ["Core product files", "Usage guide", "Support/contact pathway", "Update notes when available"];
  const fileSlots = product.fileSlots || ["Main download file", "Usage guide", "Bonus resource"];
  return <section className="section page-section" data-testid="product-detail-page"><div className="product-detail-grid"><div className="detail-media" data-testid="product-detail-image-wrap"><img src={product.image} alt={product.title} data-testid="product-detail-image" /></div><div className="detail-copy"><span className="tag" data-testid="product-detail-tag">{product.tag}</span><h1 data-testid="product-detail-title">{product.title}</h1><p data-testid="product-detail-description">{product.description}</p><div className="detail-price" data-testid="product-detail-price">${product.price}</div><button className="primary-btn" onClick={buyProduct} data-testid="product-detail-buy-button">Buy Now <ArrowRight size={18} /></button><p className="delivery-note" data-testid="product-detail-delivery-note">Download / delivery details are shown after checkout confirmation. License notes are included with each product.</p></div></div><div className="detail-info-grid" data-testid="product-detail-info-grid"><article><h2 data-testid="product-benefits-title">Benefits</h2>{benefits.map((item) => <p key={item} data-testid={`product-benefit-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><CheckCircle2 size={17} /> {item}</p>)}</article><article><h2 data-testid="product-included-title">What’s included</h2>{included.map((item) => <p key={item} data-testid={`product-included-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><CheckCircle2 size={17} /> {item}</p>)}</article><article><h2 data-testid="product-files-title">File slots</h2>{fileSlots.map((item) => <p key={item} data-testid={`product-file-slot-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><FileDown size={17} /> {item}</p>)}</article></div><div className="related-panel" data-testid="product-related-panel"><h2 data-testid="product-related-title">Related products</h2><p data-testid="product-related-text">Product file slots are ready so final downloadable files can be attached later.</p><Link to="/shop" data-testid="product-related-shop-link">View all products <ArrowRight size={16} /></Link></div></section>;
}