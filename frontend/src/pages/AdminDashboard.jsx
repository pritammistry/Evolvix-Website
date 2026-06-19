import { useEffect, useMemo, useState } from "react";
import { Lock, Save, RotateCcw, Plus, Trash2, Sparkles, Database, Layers3, Package, Newspaper, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { adminLogin, fetchAdminDashboard, resetAdminContent, saveAdminContent, saveAdminList } from "../api";

const blankProduct = { title: "New Product", slug: "new-product", price: 0, category: "Learning and Growth", tag: "New", description: "Short product outcome.", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80", benefits: [], included: [], file_slots: [] };
const blankPortfolio = { title: "New Showcase", category: "Digital Products", summary: "Short showcase description.", image: "https://images.unsplash.com/photo-1609921212029-bb5a28e60960?auto=format&fit=crop&w=1200&q=80" };
const blankBlog = { title: "New Insight", category: "AI Tools", excerpt: "Short SEO-friendly excerpt.", date: new Date().toISOString().slice(0, 10), read_time: "5 min" };

function TextField({ label, value, onChange, testId, multiline = false }) {
  return <label className="admin-field" data-testid={`${testId}-field`}><span>{label}</span>{multiline ? <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={testId} /> : <input value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={testId} />}</label>;
}

function ArrayEditor({ title, items, onChange, placeholder, testPrefix }) {
  const list = items || [];
  return <div className="admin-array" data-testid={`${testPrefix}-array`}><h4>{title}</h4>{list.map((item, index) => <div className="admin-row" key={`${item}-${index}`}><input value={item} placeholder={placeholder} onChange={(e) => onChange(list.map((entry, i) => i === index ? e.target.value : entry))} data-testid={`${testPrefix}-item-${index}`} /><button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} data-testid={`${testPrefix}-remove-${index}`}><Trash2 size={15} /></button></div>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...list, placeholder])} data-testid={`${testPrefix}-add-button`}><Plus size={15} /> Add</button></div>;
}

function ServiceListEditor({ title, items, onChange, testPrefix }) {
  const update = (index, key, value) => onChange(items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  return <section className="admin-editor-card" data-testid={`${testPrefix}-editor`}><h3>{title}</h3>{items.map((item, index) => <div className="admin-pair" key={`${item.title}-${index}`}><TextField label="Title" value={item.title} onChange={(value) => update(index, "title", value)} testId={`${testPrefix}-title-${index}`} /><TextField label="Description" value={item.text} onChange={(value) => update(index, "text", value)} testId={`${testPrefix}-text-${index}`} /><button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} data-testid={`${testPrefix}-delete-${index}`}><Trash2 size={16} /> Remove</button></div>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...items, { title: "New Service", text: "Service description." }])} data-testid={`${testPrefix}-add-button`}><Plus size={16} /> Add Service</button></section>;
}

function EcosystemEditor({ items, onChange }) {
  const update = (index, key, value) => onChange(items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  return <section className="admin-editor-card" data-testid="ecosystem-editor"><h3>Ecosystem Verticals</h3>{items.map((item, index) => <div className="admin-pair" key={`${item.name}-${index}`}><TextField label="Name" value={item.name} onChange={(value) => update(index, "name", value)} testId={`ecosystem-name-${index}`} /><TextField label="Status" value={item.status} onChange={(value) => update(index, "status", value)} testId={`ecosystem-status-${index}`} /><TextField label="Description" value={item.description} onChange={(value) => update(index, "description", value)} testId={`ecosystem-description-${index}`} multiline /><ArrayEditor title="Items" items={item.items || []} onChange={(value) => update(index, "items", value)} placeholder="New item" testPrefix={`ecosystem-items-${index}`} /><button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} data-testid={`ecosystem-delete-${index}`}><Trash2 size={16} /> Remove</button></div>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...items, { name: "New Vertical", status: "On-Demand", description: "Short description.", items: [] }])} data-testid="ecosystem-add-button"><Plus size={16} /> Add Vertical</button></section>;
}

function CatalogEditor({ title, icon: Icon, items, onChange, kind }) {
  const template = kind === "products" ? blankProduct : kind === "portfolio" ? blankPortfolio : blankBlog;
  const fields = kind === "products" ? ["title", "slug", "category", "tag", "price", "description", "image"] : kind === "portfolio" ? ["title", "category", "summary", "image"] : ["title", "category", "excerpt", "date", "read_time"];
  const update = (index, key, value) => onChange(items.map((item, i) => i === index ? { ...item, [key]: key === "price" ? Number(value) : value } : item));
  return <section className="admin-editor-card catalog-card" data-testid={`${kind}-editor`}><h3><Icon size={20} /> {title}</h3>{items.map((item, index) => <details className="admin-catalog-item" key={`${item.id || item.title}-${index}`} open={index === 0}><summary data-testid={`${kind}-summary-${index}`}>{item.title || `Item ${index + 1}`}</summary><div className="admin-form-grid">{fields.map((field) => <TextField key={field} label={field.replaceAll("_", " ")} value={item[field]} onChange={(value) => update(index, field, value)} testId={`${kind}-${field}-${index}`} multiline={field === "description" || field === "summary" || field === "excerpt"} />)}</div>{kind === "products" && <><ArrayEditor title="Benefits" items={item.benefits || []} onChange={(value) => update(index, "benefits", value)} placeholder="Benefit" testPrefix={`${kind}-benefits-${index}`} /><ArrayEditor title="Included" items={item.included || []} onChange={(value) => update(index, "included", value)} placeholder="Included item" testPrefix={`${kind}-included-${index}`} /><ArrayEditor title="File slots" items={item.file_slots || item.fileSlots || []} onChange={(value) => update(index, "file_slots", value)} placeholder="Download file slot" testPrefix={`${kind}-files-${index}`} /></>}<button type="button" className="danger-btn" onClick={() => onChange(items.filter((_, i) => i !== index))} data-testid={`${kind}-delete-${index}`}><Trash2 size={16} /> Remove</button></details>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...items, { ...template, id: `${kind}-${Date.now()}` }])} data-testid={`${kind}-add-button`}><Plus size={16} /> Add {kind}</button></section>;
}

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("evolvix_admin_token") || "");
  const [content, setContent] = useState(null);
  const [products, setProducts] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [blog, setBlog] = useState([]);
  const [active, setActive] = useState("brand");
  const tabs = useMemo(() => ["brand", "services", "ecosystem", "learning", "music", "products", "portfolio", "blog"], []);

  const loadDashboard = async (authToken = token) => {
    if (!authToken) return;
    const { data } = await fetchAdminDashboard(authToken);
    setContent(data.content);
    setProducts(data.products || []);
    setPortfolio(data.portfolio || []);
    setBlog(data.blog || []);
  };

  useEffect(() => { if (token) loadDashboard().catch(() => localStorage.removeItem("evolvix_admin_token")); }, [token]);

  const login = async (event) => {
    event.preventDefault();
    try { const { data } = await adminLogin({ password }); localStorage.setItem("evolvix_admin_token", data.token); setToken(data.token); toast.success("Admin unlocked"); } catch { toast.error("Invalid admin password"); }
  };

  const updateContent = (path, value) => {
    setContent((prev) => {
      const next = structuredClone(prev);
      let cursor = next;
      path.slice(0, -1).forEach((key) => { cursor = cursor[key]; });
      cursor[path[path.length - 1]] = value;
      return next;
    });
  };

  const saveAll = async () => {
    try { await saveAdminContent(token, content); await saveAdminList(token, "products", products); await saveAdminList(token, "portfolio", portfolio); await saveAdminList(token, "blog", blog); toast.success("Admin content saved"); } catch { toast.error("Could not save admin content"); }
  };

  const resetAll = async () => {
    try { await resetAdminContent(token); await loadDashboard(token); toast.success("Defaults restored"); } catch { toast.error("Could not reset content"); }
  };

  if (!token || !content) {
    return <section className="admin-shell" data-testid="admin-login-page"><div className="admin-login-card"><Sparkles size={34} /><h1>EVOLVIX Admin Command Center</h1><p>Secure content control for the AI-first brand ecosystem.</p><form onSubmit={login} data-testid="admin-login-form"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" data-testid="admin-password-input" /><button type="submit" data-testid="admin-login-button"><Lock size={18} /> Unlock Dashboard</button></form></div></section>;
  }

  return <section className="admin-shell" data-testid="admin-dashboard-page"><aside className="admin-sidebar"><h2>EVOLVIX OS</h2><p>3D Content Control</p>{tabs.map((tab) => <button key={tab} className={active === tab ? "active" : ""} onClick={() => setActive(tab)} data-testid={`admin-tab-${tab}`}>{tab}</button>)}<button className="admin-save" onClick={saveAll} data-testid="admin-save-all-button"><Save size={16} /> Save All</button><button className="admin-reset" onClick={resetAll} data-testid="admin-reset-button"><RotateCcw size={16} /> Reset Defaults</button></aside><main className="admin-main"><div className="admin-hero"><span>Admin Dashboard</span><h1>Manage every Evolvix section from one futuristic control panel.</h1></div>{active === "brand" && <section className="admin-editor-card"><h3><Database size={20} /> Brand, Contact & Trust</h3><div className="admin-form-grid"><TextField label="Brand Name" value={content.brand.name} onChange={(value) => updateContent(["brand", "name"], value)} testId="admin-brand-name" /><TextField label="Headline" value={content.brand.headline} onChange={(value) => updateContent(["brand", "headline"], value)} testId="admin-brand-headline" /><TextField label="Subheadline" value={content.brand.subheadline} onChange={(value) => updateContent(["brand", "subheadline"], value)} testId="admin-brand-subheadline" /><TextField label="GSTIN" value={content.brand.gstin} onChange={(value) => updateContent(["brand", "gstin"], value)} testId="admin-brand-gstin" /><TextField label="Email" value={content.contact.email} onChange={(value) => updateContent(["contact", "email"], value)} testId="admin-contact-email" /><TextField label="Phone" value={content.contact.phone} onChange={(value) => updateContent(["contact", "phone"], value)} testId="admin-contact-phone" /><TextField label="WhatsApp" value={content.contact.whatsapp} onChange={(value) => updateContent(["contact", "whatsapp"], value)} testId="admin-contact-whatsapp" /><TextField label="Address" value={content.contact.address} onChange={(value) => updateContent(["contact", "address"], value)} testId="admin-contact-address" /><TextField label="Facebook" value={content.contact.facebook} onChange={(value) => updateContent(["contact", "facebook"], value)} testId="admin-contact-facebook" /><TextField label="Google Location" value={content.contact.google_location} onChange={(value) => updateContent(["contact", "google_location"], value)} testId="admin-contact-google" /><TextField label="Gumroad" value={content.contact.gumroad} onChange={(value) => updateContent(["contact", "gumroad"], value)} testId="admin-contact-gumroad" /></div><ArrayEditor title="Trust Strip" items={content.trust_strip || []} onChange={(value) => updateContent(["trust_strip"], value)} placeholder="Trust item" testPrefix="admin-trust" /></section>}{active === "services" && <><ServiceListEditor title="Creative Digital Services" items={content.creative_services || []} onChange={(value) => updateContent(["creative_services"], value)} testPrefix="admin-creative" /><ServiceListEditor title="AI Business & Technology Services" items={content.technology_services || []} onChange={(value) => updateContent(["technology_services"], value)} testPrefix="admin-technology" /></>}{active === "ecosystem" && <EcosystemEditor items={content.ecosystem || []} onChange={(value) => updateContent(["ecosystem"], value)} />}{active === "learning" && <section className="admin-editor-card"><h3><Layers3 size={20} /> Learning and Growth Categories</h3><ArrayEditor title="Categories" items={content.learning_categories || []} onChange={(value) => updateContent(["learning_categories"], value)} placeholder="Learning category" testPrefix="admin-learning" /></section>}{active === "music" && <section className="admin-editor-card"><h3><Sparkles size={20} /> Music Services</h3><ArrayEditor title="Music Services" items={content.music_services || []} onChange={(value) => updateContent(["music_services"], value)} placeholder="Music service" testPrefix="admin-music" /></section>}{active === "products" && <CatalogEditor title="Products" icon={Package} items={products} onChange={setProducts} kind="products" />}{active === "portfolio" && <CatalogEditor title="Portfolio / Showcase" icon={ImageIcon} items={portfolio} onChange={setPortfolio} kind="portfolio" />}{active === "blog" && <CatalogEditor title="Blog / Insights" icon={Newspaper} items={blog} onChange={setBlog} kind="blog" />}</main></section>;
}