import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { products } from "../data/siteContent";
import { ProductCard } from "../components/ProductCard";
import { FilterPills } from "../components/FilterPills";
import { SectionHeader } from "../components/SectionHeader";
import { createCheckout } from "../api";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { openRazorpayCheckout } from "../lib/razorpay";
import { redirectToLoginForBuy, consumePendingBuyProductId } from "../lib/authRedirect";

export default function Shop() {
  const { content } = useSiteContent();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shopProducts = content.products || products;
  const learningCategories = content.learning_categories || [];
  const categories = useMemo(() => ["All", ...new Set(shopProducts.map((product) => product.category))], [shopProducts]);
  const [active, setActive] = useState(() => new URLSearchParams(location.search).get("category") || "All");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => shopProducts.filter((product) => (active === "All" || product.category === active) && product.title.toLowerCase().includes(query.toLowerCase())), [active, query, shopProducts]);
  const buyProduct = async (productId) => {
    if (!user) {
      redirectToLoginForBuy(navigate, productId, `${location.pathname}${location.search}`);
      return;
    }
    try {
      const { data: order } = await createCheckout({ product_id: productId, origin_url: window.location.origin });
      const product = shopProducts.find((item) => item.id === productId) || {};
      await openRazorpayCheckout({
        order,
        product,
        onSuccess: () => { window.location.href = `/checkout/success?session_id=${order.session_id}&product=${product.slug || productId}`; },
        onDismiss: () => toast.error("Checkout was cancelled."),
      });
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Checkout could not start. Please use the contact page for help.");
    }
  };
  useEffect(() => {
    if (!user) return;
    const pendingProductId = consumePendingBuyProductId();
    if (pendingProductId) buyProduct(pendingProductId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  return <section className="section page-section" data-testid="shop-page"><SectionHeader eyebrow="Evolvix Store" title="Products, services, and digital tools — all in one place." text="Browse ready-made digital packs you can download today, or request a custom service quote from any of Evolvix's four verticals: LearnAI, BuildX, Creative, and Business." /><div className="shop-toolbar" data-testid="shop-toolbar"><label className="search-box" data-testid="shop-search-label"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products and services" data-testid="shop-search-input" /></label><FilterPills items={categories} active={active} setActive={setActive} testPrefix="shop" /></div><div className="product-grid" data-testid="shop-product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} onBuy={buyProduct} />)}</div><aside className="upsell-panel" data-testid="shop-upsell-panel"><h2 data-testid="shop-upsell-title">More coming soon</h2><p data-testid="shop-upsell-text">New digital packs and service bundles are added regularly. Service prices are shared on request — contact us for a custom quote tailored to your needs.</p></aside></section>;
}