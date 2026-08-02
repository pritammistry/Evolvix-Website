import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Tag } from "lucide-react";
import { activeCampaign, daysRemaining } from "../lib/campaign";
import { toast } from "sonner";
import { products } from "../data/siteContent";
import { ProductCard } from "../components/ProductCard";
import { FilterPills } from "../components/FilterPills";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { CheckoutPanel } from "../components/CheckoutPanel";
import { useSEO } from "../hooks/useSEO";
import { consumePendingBuyProductId, consumePendingPromoCode } from "../lib/authRedirect";

export default function Shop() {
  useSEO({ title: "Evolvix Store — Digital Products & Services", description: "Browse prompt packs, AI guides, digital learning kits, and service quotes. Instant delivery with GST invoice included.", path: "/shop" });
  const { content, loading } = useSiteContent();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shopProducts = useMemo(() => loading ? [] : (content.products || products), [loading, content.products]);
  const learningCategories = content.learning_categories || [];
  const categories = useMemo(() => ["All", ...new Set(shopProducts.map((product) => product.category))], [shopProducts]);
  const [active, setActive] = useState(() => new URLSearchParams(location.search).get("category") || "All");
  const [query, setQuery] = useState("");
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [pendingPromo, setPendingPromo] = useState("");
  const campaign = activeCampaign(content.welcome_popup);
  const daysLeft = campaign ? daysRemaining(campaign.ends_at) : 0;
  const filtered = useMemo(() => shopProducts.filter((product) => (active === "All" || product.category === active) && product.title.toLowerCase().includes(query.toLowerCase())), [active, query, shopProducts]);
  // Open to everyone: the panel shows the price and accepts a promo code
  // without an account. Login is only required at the Pay step.
  const buyProduct = (productId, promoCode) => {
    const product = shopProducts.find((item) => item.id === productId);
    if (!product) {
      toast.error("That product is no longer available.");
      return;
    }
    setPendingPromo(promoCode || "");
    setCheckoutProduct(product);
  };
  useEffect(() => {
    if (!user) return;
    const pendingProductId = consumePendingBuyProductId();
    if (pendingProductId) buyProduct(pendingProductId, consumePendingPromoCode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  return <section className="section page-section" data-testid="shop-page"><SectionHeader eyebrow="Evolvix Store" title="Products, services, and digital tools — all in one place." text="Browse ready-made digital packs you can download today, or request a custom service quote from any of Evolvix's four verticals: LearnAI, BuildX, Creative, and Business." />{campaign && <div className="shop-promo-banner" data-testid="shop-promo-banner"><Tag size={16} /><span><strong>{campaign.eyebrow}</strong> — {campaign.offer}{campaign.code && <> Use code <b>{campaign.code}</b> at checkout.</>}</span>{daysLeft > 0 && <em>{daysLeft === 1 ? "Last day" : `${daysLeft} days left`}</em>}</div>}<div className="shop-toolbar" data-testid="shop-toolbar"><label className="search-box" data-testid="shop-search-label"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products and services" data-testid="shop-search-input" /></label><FilterPills items={categories} active={active} setActive={setActive} testPrefix="shop" /></div><div className="product-grid" data-testid="shop-product-grid">{loading ? [1,2,3].map((i) => <div key={i} className="product-card product-card--skeleton" aria-hidden="true"><div className="skeleton-thumb" /><div className="skeleton-body"><div className="skeleton-line" style={{height:10,width:"40%"}} /><div className="skeleton-line" style={{height:20,width:"75%"}} /><div className="skeleton-line" style={{height:14,width:"90%"}} /></div></div>) : filtered.map((product) => <ProductCard key={product.id} product={product} onBuy={buyProduct} />)}</div><aside className="upsell-panel" data-testid="shop-upsell-panel"><h2 data-testid="shop-upsell-title">More coming soon</h2><p data-testid="shop-upsell-text">New digital packs and service bundles are added regularly. Service prices are shared on request — contact us for a custom quote tailored to your needs.</p></aside>{checkoutProduct && <CheckoutPanel key={`${checkoutProduct.id}-${pendingPromo}`} product={checkoutProduct} initialCode={pendingPromo} onClose={() => setCheckoutProduct(null)} />}</section>;
}