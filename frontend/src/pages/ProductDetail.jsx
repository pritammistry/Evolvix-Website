import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { toast } from "sonner";
import { products } from "../data/siteContent";
import { createCheckout } from "../api";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { openRazorpayCheckout } from "../lib/razorpay";
import { redirectToLoginForBuy, consumePendingBuyProductId } from "../lib/authRedirect";
import { HeroParticle } from "../components/HeroParticle";

export default function ProductDetail() {
  // All hooks declared unconditionally before any early return
  const { slug } = useParams();
  const { content, loading } = useSiteContent();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeImage, setActiveImage] = useState(0);

  const catalog = loading ? [] : (content.products?.length ? content.products : products);
  const product = catalog.find((item) => item.slug === slug);

  const buyProduct = async () => {
    if (!user) {
      redirectToLoginForBuy(navigate, product.id, `${location.pathname}${location.search}`);
      return;
    }
    try {
      const { data: order } = await createCheckout({ product_id: product.id, origin_url: window.location.origin });
      await openRazorpayCheckout({
        order,
        product,
        onSuccess: () => { window.location.href = `/checkout/success?session_id=${order.session_id}&product=${product.slug}`; },
        onDismiss: () => toast.error("Checkout was cancelled."),
      });
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Checkout could not start. Please contact Evolvix for purchase help.");
    }
  };

  useEffect(() => {
    if (!user || !product) return;
    const pendingProductId = consumePendingBuyProductId();
    if (pendingProductId && pendingProductId === product.id) buyProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, product?.id]);

  // Show sphere while API fetch is in flight — prevents stale Unsplash thumbnail flash
  if (loading || !product) {
    return (
      <section className="section page-section sphere-loader-page" data-testid="product-detail-loading">
        <div className="sphere-loader">
          <HeroParticle />
          <p className="sphere-loader-text">Loading product…</p>
        </div>
      </section>
    );
  }

  const benefits = product.benefits || ["Clear practical value", "Instant digital delivery", "Future-friendly creative use"];
  const included = product.included || ["Core product files", "Usage guide", "Support/contact pathway", "Update notes when available"];
  const fileSlots = product.fileSlots || product.file_slots || ["Main download file", "Usage guide", "Bonus resource"];
  const gallery = (product.images?.length ? product.images : [product.image]).filter(Boolean).slice(0, 5);
  const activeGalleryIndex = Math.min(activeImage, Math.max(0, gallery.length - 1));
  const goToImage = (direction) => setActiveImage((current) => (current + direction + gallery.length) % gallery.length);

  return <section className="section page-section" data-testid="product-detail-page"><div className="product-detail-grid"><div className="detail-media" data-testid="product-detail-image-wrap"><div className="product-detail-carousel" data-testid="product-detail-carousel"><img src={gallery[activeGalleryIndex]} alt={`${product.title} preview ${activeGalleryIndex + 1}`} data-testid="product-detail-image" />{gallery.length > 1 && <><button type="button" className="gallery-arrow gallery-prev" onClick={() => goToImage(-1)} aria-label="Previous product image" data-testid="product-gallery-prev-button"><ChevronLeft size={20} /></button><button type="button" className="gallery-arrow gallery-next" onClick={() => goToImage(1)} aria-label="Next product image" data-testid="product-gallery-next-button"><ChevronRight size={20} /></button><div className="gallery-counter" data-testid="product-gallery-counter">{activeGalleryIndex + 1}/{gallery.length}</div></>}</div>{gallery.length > 1 && <div className="product-gallery-strip" data-testid="product-gallery-strip">{gallery.map((image, index) => <button type="button" className={index === activeGalleryIndex ? "active" : ""} key={`${image}-${index}`} onClick={() => setActiveImage(index)} aria-label={`Show product image ${index + 1}`} data-testid={`product-gallery-thumb-button-${index}`}><img src={image} alt={`${product.title} thumbnail ${index + 1}`} data-testid={`product-gallery-image-${index}`} /></button>)}</div>}</div><div className="detail-copy"><span className="tag" data-testid="product-detail-tag">{product.tag}</span><h1 data-testid="product-detail-title">{product.title}</h1><p data-testid="product-detail-description">{product.description}</p><div className="detail-price" data-testid="product-detail-price">{product.price >= 1 ? `₹${product.price}` : "Coming Soon"}</div><button className="primary-btn" onClick={product.price >= 1 ? buyProduct : () => toast("Coming soon — payments launching shortly.")} style={product.price >= 1 ? {} : { opacity: 0.45, cursor: "not-allowed" }} data-testid="product-detail-buy-button">{product.price >= 1 ? <> Buy Now <ArrowRight size={18} /></> : "Coming Soon"}</button><p className="delivery-note" data-testid="product-detail-delivery-note">Download / delivery details are shown after checkout confirmation. License notes are included with each product.</p></div></div><div className="detail-info-grid" data-testid="product-detail-info-grid"><article><h2 data-testid="product-benefits-title">Benefits</h2>{benefits.map((item) => <p key={item} data-testid={`product-benefit-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><CheckCircle2 size={17} /> {item}</p>)}</article><article><h2 data-testid="product-included-title">What's included</h2>{included.map((item) => <p key={item} data-testid={`product-included-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><CheckCircle2 size={17} /> {item}</p>)}</article><article><h2 data-testid="product-files-title">File slots</h2>{fileSlots.map((item) => <p key={item} data-testid={`product-file-slot-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><FileDown size={17} /> {item}</p>)}</article></div><div className="related-panel" data-testid="product-related-panel"><h2 data-testid="product-related-title">Related products</h2><p data-testid="product-related-text">Product file slots are ready so final downloadable files can be attached later.</p><Link to="/shop" data-testid="product-related-shop-link">View all products <ArrowRight size={16} /></Link></div></section>;
}
