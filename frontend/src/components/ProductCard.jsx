import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export function ProductCard({ product, onBuy }) {
  return (
    <article className="product-card reveal-card" data-testid={`product-card-${product.slug}`}>
      <div className="product-media" data-testid={`product-image-wrap-${product.slug}`}><img src={product.image} alt={product.title} data-testid={`product-image-${product.slug}`} /><span className="tag" data-testid={`product-tag-${product.slug}`}><Sparkles size={13} /> {product.tag}</span></div>
      <div className="product-body"><p className="mini" data-testid={`product-category-${product.slug}`}>{product.category}</p><h3 data-testid={`product-title-${product.slug}`}>{product.title}</h3><p data-testid={`product-description-${product.slug}`}>{product.description}</p><div className="product-actions"><span className="price" data-testid={`product-price-${product.slug}`}>${product.price}</span><button onClick={() => onBuy(product.id)} className="ghost-buy" data-testid={`product-buy-button-${product.slug}`}>Buy Now</button><Link to={`/products/${product.slug}`} className="icon-link" data-testid={`product-detail-link-${product.slug}`}>Details <ArrowRight size={16} /></Link></div></div>
    </article>
  );
}