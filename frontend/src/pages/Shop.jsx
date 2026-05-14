import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { products } from "../data/siteContent";
import { ProductCard } from "../components/ProductCard";
import { FilterPills } from "../components/FilterPills";
import { SectionHeader } from "../components/SectionHeader";
import { createCheckout } from "../api";

export default function Shop() {
  const categories = ["All", ...new Set(products.map((product) => product.category))];
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => products.filter((product) => (active === "All" || product.category === active) && product.title.toLowerCase().includes(query.toLowerCase())), [active, query]);
  const buyProduct = async (productId) => { try { const { data } = await createCheckout({ product_id: productId, origin_url: window.location.origin }); window.location.href = data.url; } catch (error) { toast.error("Checkout could not start. Please use the contact page for help."); } };
  return <section className="section page-section" data-testid="shop-page"><SectionHeader eyebrow="Shop / Products" title="Direct digital products for learning, creativity, and brand growth." text="Search by need, browse by category, or start checkout from a product card." /><div className="shop-toolbar" data-testid="shop-toolbar"><label className="search-box" data-testid="shop-search-label"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" data-testid="shop-search-input" /></label><FilterPills items={categories} active={active} setActive={setActive} testPrefix="shop" /></div><div className="product-grid" data-testid="shop-product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} onBuy={buyProduct} />)}</div><aside className="upsell-panel" data-testid="shop-upsell-panel"><h2 data-testid="shop-upsell-title">Bundle idea</h2><p data-testid="shop-upsell-text">Pair the AI Starter Kit with Creator Assets for a practical learning-and-launch package.</p></aside></section>;
}