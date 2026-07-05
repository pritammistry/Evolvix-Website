import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export function ProductCard({ product, onBuy }) {
  const gallery = (product.images?.length ? product.images : [product.image]).filter(Boolean).slice(0, 5);
  return (
    <article className="product-card reveal-card" data-testid={`product-card-${product.slug}`}>
      <div className="product-media" data-testid={`product-image-wrap-${product.slug}`}>
        <div className={gallery.length > 1 ? `product-card-slider is-animated slides-${gallery.length}` : "product-card-slider"} data-testid={`product-card-slider-${product.slug}`}>
          {(gallery.length ? gallery : [product.image]).map((image, index) => <img key={`${product.slug}-slide-${index}`} src={image} alt={`${product.title} preview ${index + 1}`} data-testid={`product-card-slide-${product.slug}-${index}`} />)}
        </div>
        {gallery.length > 1 && <div className="product-slider-dots" data-testid={`product-slider-dots-${product.slug}`}>{gallery.map((_, index) => <span key={`${product.slug}-dot-${index}`} data-testid={`product-slider-dot-${product.slug}-${index}`} />)}</div>}
        <span className="tag" data-testid={`product-tag-${product.slug}`}><Sparkles size={13} /> {product.tag}</span>
      </div>
      <div className="product-body"><p className="mini" data-testid={`product-category-${product.slug}`}>{product.category}</p><h3 data-testid={`product-title-${product.slug}`}>{product.title}</h3><p data-testid={`product-description-${product.slug}`}>{product.description}</p><div className="product-actions"><span className="price" data-testid={`product-price-${product.slug}`}>₹{product.price}</span><button onClick={() => onBuy(product.id)} className="ghost-buy" data-testid={`product-buy-button-${product.slug}`}>Buy Now</button><Link to={`/products/${product.slug}`} className="icon-link" data-testid={`product-detail-link-${product.slug}`}>Details <ArrowRight size={16} /></Link></div></div>
    </article>
  );
}