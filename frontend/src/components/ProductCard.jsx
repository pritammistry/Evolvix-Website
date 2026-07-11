import { useState } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { toast } from "sonner";


export function ProductCard({ product, onBuy }) {
  const [showModal, setShowModal] = useState(false);
  const gallery = (product.images?.length ? product.images : [product.image]).filter(Boolean).slice(0, 5);
  const waText = encodeURIComponent(`Hi! I'm interested in ${product.title} from Evolvix Tech Media. Could you please share more details and pricing?`);
  const whatsappUrl = `https://wa.me/919831842869?text=${waText}`;
  const descText = product.summary || product.description || "";
  const isLong = descText.length > 100;
  return (
    <>
    <article className="product-card reveal-card" data-testid={`product-card-${product.slug}`}>
      <div className="product-media" data-testid={`product-image-wrap-${product.slug}`}>
        <div className={gallery.length > 1 ? `product-card-slider is-animated slides-${gallery.length}` : "product-card-slider"} data-testid={`product-card-slider-${product.slug}`}>
          {(gallery.length ? gallery : [product.image]).map((image, index) => <img key={`${product.slug}-slide-${index}`} src={image} alt={`${product.title} preview ${index + 1}`} data-testid={`product-card-slide-${product.slug}-${index}`} />)}
        </div>
        {gallery.length > 1 && <div className="product-slider-dots" data-testid={`product-slider-dots-${product.slug}`}>{gallery.map((_, index) => <span key={`${product.slug}-dot-${index}`} data-testid={`product-slider-dot-${product.slug}-${index}`} />)}</div>}
        <span className="tag" data-testid={`product-tag-${product.slug}`}><Sparkles size={13} /> {product.tag}</span>
      </div>
      <div className="product-body"><p className="mini" data-testid={`product-category-${product.slug}`}>{product.category}</p><h3 data-testid={`product-title-${product.slug}`}>{product.title}</h3><p className="product-card-desc" data-testid={`product-description-${product.slug}`}>{descText}</p>{isLong && <button className="product-card-read-more" onClick={(e) => { e.preventDefault(); setShowModal(true); }}>Read More</button>}<div className="product-actions">{product.type === "service" ? (<><span className="price price--quote" data-testid={`product-price-${product.slug}`}>On Request</span><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="ghost-buy" data-testid={`product-buy-button-${product.slug}`}>Get Quote</a></>) : (() => { const comingSoon = !product.price || product.price < 1; return (<><span className={`price ${comingSoon ? "price--tbd" : ""}`} data-testid={`product-price-${product.slug}`}>{comingSoon ? "— — —" : `₹${product.price}`}</span><button onClick={() => comingSoon ? toast("Coming soon — payments launching shortly.") : onBuy(product.id)} className={`ghost-buy${comingSoon ? " ghost-buy--disabled" : ""}`} style={comingSoon ? { opacity: 0.45, cursor: "not-allowed" } : {}} data-testid={`product-buy-button-${product.slug}`}>{comingSoon ? "Coming Soon" : "Buy Now"}</button></>); })()}<Link to={`/products/${product.slug}`} className="icon-link" data-testid={`product-detail-link-${product.slug}`}>Details <ArrowRight size={16} /></Link></div></div>
    </article>
    {showModal && ReactDOM.createPortal(
      <div className="product-modal-backdrop" onClick={() => setShowModal(false)} data-testid="product-modal-backdrop">
        <div className="product-modal" onClick={(e) => e.stopPropagation()} data-testid="product-modal">
          <button className="product-modal-close" onClick={() => setShowModal(false)} aria-label="Close"><X size={18} /></button>
          <p className="mini">{product.category}</p>
          <h3>{product.title}</h3>
          <p className="product-modal-body">{descText}</p>
          <div className="product-modal-actions">
            <Link to={`/products/${product.slug}`} className="primary-btn" onClick={() => setShowModal(false)}>View Details <ArrowRight size={16} /></Link>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}