import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { products } from "../data/siteContent";
import { ProductCard } from "../components/ProductCard";
import { FilterPills } from "../components/FilterPills";
import { SectionHeader } from "../components/SectionHeader";
import { createCheckout } from "../api";
import { useSiteContent } from "../hooks/useSiteContent";

export default function Shop() {
  const { content } = useSiteContent();
  const shopProducts = content.products || products;
  const categories = useMemo(() => ["All", ...new Set(shopProducts.map((product) => product.category))], [shopProducts]);
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => shopProducts.filter((product) => (active === "All" || product.category === active) && product.title.toLowerCase().includes(query.toLowerCase())), [active, query, shopProducts]);
  const buyProduct = async (productId) => { try { const { data } = await createCheckout({ product_id: productId, origin_url: window.location.origin }); window.location.href = data.url; } catch (error) { toast.error("Checkout could not start. Please use the contact page for help."); } };
  return <section className="section page-section" data-testid="shop-page"><SectionHeader eyebrow="EVOLVIX LearnAI" title="Prompt packs, learning resources, business packs, career packs, creator packs, and productivity packs." text="Search by need, browse by category, or start checkout from a product card." /><div className="shop-toolbar" data-testid="shop-toolbar"><label className="search-box" data-testid="shop-search-label"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search LearnAI products" data-testid="shop-search-input" /></label><FilterPills items={categories} active={active} setActive={setActive} testPrefix="shop" /></div><div className="product-grid" data-testid="shop-product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} onBuy={buyProduct} />)}</div><aside className="upsell-panel" data-testid="shop-upsell-panel"><h2 data-testid="shop-upsell-title">Gumroad-ready ecosystem</h2><p data-testid="shop-upsell-text">LearnAI product cards are structured for prompt packs, career packs, creator packs, business packs, and productivity downloads.</p></aside></section>;
}