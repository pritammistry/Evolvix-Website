import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Save, RotateCcw, Plus, Trash2, Sparkles, Database, Layers3, Package, Newspaper, Image as ImageIcon, LogOut, UploadCloud, BarChart3, Star, DownloadCloud, FileDown, Gamepad2, Monitor, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { adminLogin, adminLogout, createPlaygroundItem, deletePlaygroundItem, deleteProductFile, exportAdminAnalytics, fetchAdminAnalytics, fetchAdminAnalyticsOptions, fetchAdminDashboard, fetchAdminPlayground, resetAdminContent, resetAdminSection, saveAdminContent, saveAdminList, updatePlaygroundItem, uploadProductFile, setVisitorAuthToken, fetchAdminLeadsContacts, exportAdminLeadsContacts, fetchAdminLeadsNewsletter, exportAdminLeadsNewsletter } from "../api";

const blankProduct = { title: "New Product", slug: "new-product", price: 0, category: "Learning and Growth", tag: "New", summary: "One-line store card summary.", description: "Full product description for the detail page.", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80", images: [], benefits: [], included: [], file_slots: [] };
const blankPortfolio = { title: "New Showcase", category: "Digital Products", summary: "Short showcase description.", image: "https://images.unsplash.com/photo-1609921212029-bb5a28e60960?auto=format&fit=crop&w=1200&q=80" };
const blankBlog = { title: "New Insight", slug: "new-insight", category: "AI Tools", excerpt: "Short SEO-friendly excerpt.", body: "Write the full blog article here.", date: new Date().toISOString().slice(0, 10), read_time: "5 min" };
const blankTestimonial = { name: "New Customer", role: "Customer", quote: "Share a clear customer result or review here.", rating: 5, visible: true };
const blankMusicPreview = { mood: "Calm", title: "New audio preview", description: "Short preview description.", audio_url: "", visible: true };
const blankDemo = { title: "New Demo", industry: "Retail / Optical", description: "Demo description.", features: ["Feature 1", "Feature 2"], url: "", icon_key: "monitor", status: "Coming Soon", visible: true };

function TextField({ label, value, onChange, testId, multiline = false }) {
  return <label className="admin-field" data-testid={`${testId}-field`}><span>{label}</span>{multiline ? <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={testId} /> : <input value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={testId} />}</label>;
}

function ArrayEditor({ title, items, onChange, placeholder, testPrefix }) {
  const list = items || [];
  return <div className="admin-array" data-testid={`${testPrefix}-array`}><h4>{title}</h4>{list.map((item, index) => <div className="admin-row" key={`${item}-${index}`}><input value={item} placeholder={placeholder} onChange={(e) => onChange(list.map((entry, i) => i === index ? e.target.value : entry))} data-testid={`${testPrefix}-item-${index}`} /><button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} data-testid={`${testPrefix}-remove-${index}`}><Trash2 size={15} /></button></div>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...list, placeholder])} data-testid={`${testPrefix}-add-button`}><Plus size={15} /> Add</button></div>;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(size = 0) {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function compressImageFile(file, maxSize = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getProductImages(product) {
  if (product.images?.length) return product.images;
  if (product.image) return [product.image];
  return [];
}

function ProductImageUploader({ product, index, onUpdate }) {
  const images = getProductImages(product);
  const handleFiles = async (files) => {
    const selected = Array.from(files || []).slice(0, Math.max(0, 5 - images.length));
    if (!selected.length) return;
    const encoded = await Promise.all(selected.map((file) => compressImageFile(file).catch(() => fileToDataUrl(file))));
    const nextImages = [...images, ...encoded].slice(0, 5);
    onUpdate(index, { images: nextImages, image: nextImages[0] || "" });
  };
  const removeImage = (imageIndex) => {
    const nextImages = images.filter((_, i) => i !== imageIndex).slice(0, 5);
    onUpdate(index, { images: nextImages, image: nextImages[0] || "" });
  };
  return <div className="admin-uploader" data-testid={`product-image-uploader-${index}`}><div className="admin-upload-head"><h4>Product photos / thumbnails</h4><span data-testid={`product-upload-count-${index}`}>{images.length}/5 uploaded</span></div><label className={`upload-dropzone ${images.length >= 5 ? "is-full" : ""}`} data-testid={`product-upload-label-${index}`}><UploadCloud size={24} /><strong>{images.length >= 5 ? "Maximum 5 photos uploaded" : "Upload up to 5 photos"}</strong><small>First image becomes product thumbnail. PNG/JPG/WebP supported.</small><input type="file" accept="image/*" multiple disabled={images.length >= 5} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} data-testid={`product-image-upload-${index}`} /></label>{images.length > 0 && <div className="admin-image-grid" data-testid={`product-image-grid-${index}`}>{images.slice(0, 5).map((image, imageIndex) => <div className="admin-image-preview" key={`${image.slice(0, 24)}-${imageIndex}`}><img src={image} alt={`Product ${index + 1} upload ${imageIndex + 1}`} data-testid={`product-upload-preview-${index}-${imageIndex}`} /><button type="button" onClick={() => removeImage(imageIndex)} aria-label={`Remove product ${index + 1} image ${imageIndex + 1}`} data-testid={`product-upload-remove-${index}-${imageIndex}`}><Trash2 size={14} /></button>{imageIndex === 0 && <span data-testid={`product-upload-thumbnail-badge-${index}`}>Thumbnail</span>}</div>)}</div>}</div>;
}

function ProductFileManager({ product, index, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const files = product.download_files || [];
  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.size > 8 * 1024 * 1024) {
      toast.error("Please upload a file smaller than 8 MB for MongoDB storage.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(selectedFile);
      await uploadProductFile(product.id || product.slug, { filename: selectedFile.name, content_type: selectedFile.type || "application/octet-stream", data_url: dataUrl });
      toast.success("Download file attached");
      await onRefresh();
    } catch (error) {
      toast.error("Could not upload product file");
    } finally {
      setUploading(false);
    }
  };
  const removeFile = async (fileId) => {
    try {
      await deleteProductFile(product.id || product.slug, fileId);
      toast.success("Download file removed");
      await onRefresh();
    } catch (error) {
      toast.error("Could not remove product file");
    }
  };
  return <div className="admin-uploader product-file-manager" data-testid={`product-file-manager-${index}`}><div className="admin-upload-head"><h4><FileDown size={15} /> Delivery files</h4><span data-testid={`product-file-count-${index}`}>{files.length} attached</span></div><label className="upload-dropzone file-dropzone" data-testid={`product-file-upload-label-${index}`}><DownloadCloud size={24} /><strong>{uploading ? "Uploading..." : "Attach purchased download file"}</strong><small>Stored in MongoDB. Recommended: PDF, ZIP, DOCX, CSV under 8 MB.</small><input type="file" disabled={uploading} onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} data-testid={`product-file-upload-${index}`} /></label>{files.length > 0 && <div className="admin-file-list" data-testid={`product-file-list-${index}`}>{files.map((file, fileIndex) => <div className="admin-file-row" key={file.id} data-testid={`product-file-row-${index}-${fileIndex}`}><div><strong data-testid={`product-file-name-${index}-${fileIndex}`}>{file.filename}</strong><span data-testid={`product-file-meta-${index}-${fileIndex}`}>{formatBytes(file.size)} • {file.content_type}</span></div><button type="button" onClick={() => removeFile(file.id)} data-testid={`product-file-remove-${index}-${fileIndex}`}><Trash2 size={15} /> Remove</button></div>)}</div>}</div>;
}

function ServiceListEditor({ title, items, onChange, testPrefix }) {
  const update = (index, key, value) => onChange(items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  return <section className="admin-editor-card" data-testid={`${testPrefix}-editor`}><h3>{title}</h3>{items.map((item, index) => <div className="admin-pair" key={`${item.title}-${index}`}><TextField label="Title" value={item.title} onChange={(value) => update(index, "title", value)} testId={`${testPrefix}-title-${index}`} /><TextField label="Description" value={item.text} onChange={(value) => update(index, "text", value)} testId={`${testPrefix}-text-${index}`} /><button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} data-testid={`${testPrefix}-delete-${index}`}><Trash2 size={16} /> Remove</button></div>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...items, { title: "New Service", text: "Service description." }])} data-testid={`${testPrefix}-add-button`}><Plus size={16} /> Add Service</button></section>;
}

function EcosystemEditor({ items, onChange }) {
  const update = (index, key, value) => onChange(items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  return <section className="admin-editor-card" data-testid="ecosystem-editor"><h3>Ecosystem Verticals</h3>{items.map((item, index) => <div className="admin-pair" key={`${item.name}-${index}`}><TextField label="Name" value={item.name} onChange={(value) => update(index, "name", value)} testId={`ecosystem-name-${index}`} /><TextField label="Status" value={item.status} onChange={(value) => update(index, "status", value)} testId={`ecosystem-status-${index}`} /><TextField label="Description" value={item.description} onChange={(value) => update(index, "description", value)} testId={`ecosystem-description-${index}`} multiline /><ArrayEditor title="Items" items={item.items || []} onChange={(value) => update(index, "items", value)} placeholder="New item" testPrefix={`ecosystem-items-${index}`} /><button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} data-testid={`ecosystem-delete-${index}`}><Trash2 size={16} /> Remove</button></div>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...items, { name: "New Vertical", status: "On-Demand", description: "Short description.", items: [] }])} data-testid="ecosystem-add-button"><Plus size={16} /> Add Vertical</button></section>;
}

function CustomSectionsEditor({ items, onChange }) {
  const sections = items || [];
  const update = (index, key, value) => onChange(sections.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const updateCard = (sectionIndex, cardIndex, key, value) => {
    const section = sections[sectionIndex];
    const cards = (section.cards || []).map((card, i) => i === cardIndex ? { ...card, [key]: value } : card);
    update(sectionIndex, "cards", cards);
  };
  return <section className="admin-editor-card" data-testid="custom-sections-editor"><h3><Layers3 size={20} /> Custom Website Sections</h3><p>Create any new homepage section, announcement block, offer group, or custom card layout. Toggle visibility whenever needed.</p>{sections.map((section, index) => <div className="admin-pair custom-section-editor" key={`${section.title}-${index}`}><TextField label="Eyebrow" value={section.eyebrow} onChange={(value) => update(index, "eyebrow", value)} testId={`custom-section-eyebrow-${index}`} /><TextField label="Title" value={section.title} onChange={(value) => update(index, "title", value)} testId={`custom-section-title-${index}`} /><TextField label="Description" value={section.description} onChange={(value) => update(index, "description", value)} testId={`custom-section-description-${index}`} multiline /><TextField label="CTA Label" value={section.cta_label} onChange={(value) => update(index, "cta_label", value)} testId={`custom-section-cta-label-${index}`} /><TextField label="CTA URL" value={section.cta_url} onChange={(value) => update(index, "cta_url", value)} testId={`custom-section-cta-url-${index}`} /><label className="admin-check"><input type="checkbox" checked={section.visible !== false} onChange={(e) => update(index, "visible", e.target.checked)} data-testid={`custom-section-visible-${index}`} /> Visible on website</label><div className="admin-array"><h4>Cards</h4>{(section.cards || []).map((card, cardIndex) => <div className="admin-pair" key={`${card.title}-${cardIndex}`}><TextField label="Card title" value={card.title} onChange={(value) => updateCard(index, cardIndex, "title", value)} testId={`custom-section-card-title-${index}-${cardIndex}`} /><TextField label="Card text" value={card.text} onChange={(value) => updateCard(index, cardIndex, "text", value)} testId={`custom-section-card-text-${index}-${cardIndex}`} multiline /><button type="button" onClick={() => update(index, "cards", (section.cards || []).filter((_, i) => i !== cardIndex))} data-testid={`custom-section-card-remove-${index}-${cardIndex}`}><Trash2 size={16} /> Remove Card</button></div>)}<button type="button" className="admin-mini-btn" onClick={() => update(index, "cards", [...(section.cards || []), { title: "New Card", text: "New card description." }])} data-testid={`custom-section-card-add-${index}`}><Plus size={16} /> Add Card</button></div><button type="button" className="danger-btn" onClick={() => onChange(sections.filter((_, i) => i !== index))} data-testid={`custom-section-delete-${index}`}><Trash2 size={16} /> Delete Section</button></div>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...sections, { title: "New Custom Section", eyebrow: "Custom", description: "Section description.", cta_label: "Learn More", cta_url: "/contact", visible: true, cards: [{ title: "New Card", text: "Card description." }] }])} data-testid="custom-section-add-button"><Plus size={16} /> Create New Section</button></section>;
}

function TestimonialsEditor({ items, onChange }) {
  const testimonials = items || [];
  const update = (index, key, value) => onChange(testimonials.map((item, i) => i === index ? { ...item, [key]: key === "rating" ? Number(value) : value } : item));
  return <section className="admin-editor-card" data-testid="testimonials-editor"><h3><Star size={20} /> Testimonials</h3>{testimonials.map((item, index) => <div className="admin-pair" key={`${item.name}-${index}`}><div className="admin-form-grid"><TextField label="Name" value={item.name} onChange={(value) => update(index, "name", value)} testId={`testimonial-name-${index}`} /><TextField label="Role" value={item.role} onChange={(value) => update(index, "role", value)} testId={`testimonial-role-${index}`} /><TextField label="Rating" value={item.rating} onChange={(value) => update(index, "rating", value)} testId={`testimonial-rating-${index}`} /><TextField label="Quote" value={item.quote} onChange={(value) => update(index, "quote", value)} testId={`testimonial-quote-${index}`} multiline /></div><label className="admin-check"><input type="checkbox" checked={item.visible !== false} onChange={(event) => update(index, "visible", event.target.checked)} data-testid={`testimonial-visible-${index}`} /> Visible on website</label><button type="button" className="danger-btn" onClick={() => onChange(testimonials.filter((_, i) => i !== index))} data-testid={`testimonial-delete-${index}`}><Trash2 size={16} /> Remove</button></div>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...testimonials, { ...blankTestimonial, id: `testimonial-${Date.now()}` }])} data-testid="testimonial-add-button"><Plus size={16} /> Add Testimonial</button></section>;
}

function MusicPreviewsEditor({ items, onChange }) {
  const previews = items || [];
  const update = (index, key, value) => onChange(previews.map((item, i) => i === index ? { ...item, [key]: value } : item));
  return <section className="admin-editor-card" data-testid="music-previews-editor"><h3><FileDown size={20} /> Audio Previews</h3>{previews.map((item, index) => <div className="admin-pair" key={`${item.title}-${index}`}><div className="admin-form-grid"><TextField label="Mood" value={item.mood} onChange={(value) => update(index, "mood", value)} testId={`music-preview-mood-${index}`} /><TextField label="Title" value={item.title} onChange={(value) => update(index, "title", value)} testId={`music-preview-title-${index}`} /><TextField label="Audio URL" value={item.audio_url} onChange={(value) => update(index, "audio_url", value)} testId={`music-preview-url-${index}`} /><TextField label="Description" value={item.description} onChange={(value) => update(index, "description", value)} testId={`music-preview-description-${index}`} multiline /></div><label className="admin-check"><input type="checkbox" checked={item.visible !== false} onChange={(event) => update(index, "visible", event.target.checked)} data-testid={`music-preview-visible-${index}`} /> Visible on website</label><button type="button" className="danger-btn" onClick={() => onChange(previews.filter((_, i) => i !== index))} data-testid={`music-preview-delete-${index}`}><Trash2 size={16} /> Remove</button></div>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...previews, { ...blankMusicPreview, id: `music-preview-${Date.now()}` }])} data-testid="music-preview-add-button"><Plus size={16} /> Add Audio Preview</button></section>;
}

function AnalyticsPanel({ reportSettings, onReportChange }) {
  const [filters, setFilters] = useState({ start_date: "", end_date: "", event_type: "all", page: "all", product_id: "all" });
  const [analytics, setAnalytics] = useState(null);
  const [options, setOptions] = useState({ event_types: [], pages: [], products: [] });
  const loadAnalytics = useCallback(async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value && value !== "all"));
    const [{ data }, { data: optionData }] = await Promise.all([fetchAdminAnalytics(params), fetchAdminAnalyticsOptions()]);
    setAnalytics(data);
    setOptions(optionData);
  }, [filters]);
  useEffect(() => { loadAnalytics().catch(() => toast.error("Could not load analytics")); }, [loadAnalytics]);
  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const exportAnalytics = async (format) => {
    const params = Object.fromEntries(Object.entries({ ...filters, format }).filter(([, value]) => value && value !== "all"));
    try {
      const { data } = await exportAdminAnalytics(params);
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `evolvix-analytics.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Could not export analytics");
    }
  };
  const exportChartData = (format) => {
    const chartData = { generated_at: new Date().toISOString(), filters, charts: { by_page: analytics?.by_page || [], by_section: analytics?.by_section || [], by_event_type: analytics?.by_event_type || [], by_product: analytics?.by_product || [] } };
    const content = format === "json" ? JSON.stringify(chartData, null, 2) : ["chart,name,events,users", ...Object.entries(chartData.charts).flatMap(([chart, rows]) => rows.map((row) => `${chart},"${String(row.name).replaceAll('"', '""')}",${row.events},${row.users}`))].join("\n");
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `evolvix-chart-data.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const saveReportSettings = () => {
    toast.success("Scheduled report settings staged. Click Save Changes to persist.");
  };
  const updateReport = (key, value) => onReportChange({ ...(reportSettings || {}), [key]: value });
  const summary = analytics?.summary || {};
  return <section className="admin-editor-card analytics-panel" data-testid="analytics-panel"><h3><BarChart3 size={20} /> Website Analytics</h3><div className="analytics-filters" data-testid="analytics-filters"><input type="date" value={filters.start_date} onChange={(event) => updateFilter("start_date", event.target.value)} data-testid="analytics-start-date-input" /><input type="date" value={filters.end_date} onChange={(event) => updateFilter("end_date", event.target.value)} data-testid="analytics-end-date-input" /><select value={filters.event_type} onChange={(event) => updateFilter("event_type", event.target.value)} data-testid="analytics-event-filter"><option value="all">All events</option>{options.event_types.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={filters.page} onChange={(event) => updateFilter("page", event.target.value)} data-testid="analytics-page-filter"><option value="all">All pages</option>{options.pages.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={filters.product_id} onChange={(event) => updateFilter("product_id", event.target.value)} data-testid="analytics-product-filter"><option value="all">All products</option>{options.products.map((item) => <option key={item} value={item}>{item}</option>)}</select><button type="button" className="admin-save" onClick={loadAnalytics} data-testid="analytics-apply-button">Apply Filters</button></div><div className="analytics-export-actions" data-testid="analytics-export-actions"><button type="button" className="admin-mini-btn" onClick={() => exportAnalytics("csv")} data-testid="analytics-export-csv-button"><DownloadCloud size={16} /> Export CSV</button><button type="button" className="admin-mini-btn" onClick={() => exportAnalytics("json")} data-testid="analytics-export-json-button"><DownloadCloud size={16} /> Export JSON</button><button type="button" className="admin-mini-btn" onClick={() => exportChartData("csv")} data-testid="analytics-export-chart-csv-button"><DownloadCloud size={16} /> Export Chart CSV</button><button type="button" className="admin-mini-btn" onClick={() => exportChartData("json")} data-testid="analytics-export-chart-json-button"><DownloadCloud size={16} /> Export Chart JSON</button></div><div className="analytics-stat-grid" data-testid="analytics-summary-grid">{[["Site visits", summary.visits || 0], ["Clicks", summary.clicks || 0], ["Form fills", summary.forms || 0], ["Unique users", summary.unique_users || 0], ["Total events", summary.total_events || 0]].map(([label, value]) => <article key={label} className="analytics-stat" data-testid={`analytics-stat-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><span>{label}</span><strong>{value}</strong></article>)}</div><div className="analytics-chart-grid" data-testid="analytics-chart-grid"><AnalyticsChart title="Page visits" rows={analytics?.by_page || []} testId="analytics-page-chart" /><AnalyticsChart title="Section views" rows={analytics?.by_section || []} testId="analytics-section-chart" /><AnalyticsChart title="Event mix" rows={analytics?.by_event_type || []} testId="analytics-event-chart" /><AnalyticsChart title="Product activity" rows={analytics?.by_product || []} testId="analytics-product-chart" /></div><div className="analytics-grid"><AnalyticsList title="Pages visited" rows={analytics?.by_page || []} testId="analytics-pages" /><AnalyticsList title="Sections viewed" rows={analytics?.by_section || []} testId="analytics-sections" /><AnalyticsList title="Event types" rows={analytics?.by_event_type || []} testId="analytics-events" /><AnalyticsList title="Products" rows={analytics?.by_product || []} testId="analytics-products" /></div><div className="report-settings" data-testid="scheduled-report-settings"><h4>Scheduled report settings</h4><label data-testid="report-enabled-field"><input type="checkbox" checked={!!reportSettings?.enabled} onChange={(event) => updateReport("enabled", event.target.checked)} data-testid="report-enabled-checkbox" /> Enable in-dashboard reminder</label><select value={reportSettings?.frequency || "weekly"} onChange={(event) => updateReport("frequency", event.target.value)} data-testid="report-frequency-select"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select><input value={reportSettings?.owner || ""} onChange={(event) => updateReport("owner", event.target.value)} placeholder="Report owner / note" data-testid="report-owner-input" /><textarea value={reportSettings?.sections || "Visits, clicks, forms, sections, products"} onChange={(event) => updateReport("sections", event.target.value)} data-testid="report-sections-textarea" /><button type="button" className="admin-mini-btn" onClick={saveReportSettings} data-testid="report-settings-save-button"><Save size={16} /> Stage Report Settings</button></div><div className="admin-array" data-testid="analytics-recent-events"><h4>Recent activity</h4>{(analytics?.recent_events || []).map((event) => <div className="analytics-event-row" key={event.id} data-testid={`analytics-event-${event.id}`}><strong>{event.event_type}</strong><span>{event.path}</span><small>{event.label || event.section_id || event.product_id || "—"} • {event.created_at}</small></div>)}</div></section>;
}

function AnalyticsList({ title, rows, testId }) {
  return <div className="analytics-list" data-testid={testId}><h4>{title}</h4>{rows.length ? rows.map((row) => <div key={row.name} data-testid={`${testId}-${String(row.name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><span>{row.name}</span><strong>{row.events}</strong><small>{row.users} users</small></div>) : <p data-testid={`${testId}-empty`}>No activity yet.</p>}</div>;
}

function AnalyticsChart({ title, rows, testId }) {
  const max = Math.max(1, ...rows.map((row) => row.events || 0));
  return <div className="analytics-chart" data-testid={testId}><h4 data-testid={`${testId}-title`}>{title}</h4>{rows.length ? rows.slice(0, 6).map((row, index) => <div className="chart-row" key={`${row.name}-${index}`} data-testid={`${testId}-row-${index}`}><span data-testid={`${testId}-label-${index}`}>{row.name}</span><div><i style={{ width: `${Math.max(6, ((row.events || 0) / max) * 100)}%` }} data-testid={`${testId}-bar-${index}`} /></div><strong data-testid={`${testId}-value-${index}`}>{row.events}</strong></div>) : <p data-testid={`${testId}-empty`}>No chart data yet.</p>}</div>;
}

function LeadsPanel() {
  const [contacts, setContacts] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAdminLeadsContacts(), fetchAdminLeadsNewsletter()])
      .then(([c, n]) => { setContacts(c.data.contacts || []); setSubscribers(n.data.subscribers || []); })
      .catch(() => toast.error("Could not load leads"))
      .finally(() => setLoading(false));
  }, []);

  const download = async (fn, filename) => {
    try {
      const { data } = await fn();
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
  };

  if (loading) return <section className="admin-editor-card"><p>Loading leads…</p></section>;

  return (
    <section className="admin-editor-card" data-testid="leads-panel">
      <h3><DownloadCloud size={20} /> Leads — Contacts & Newsletter</h3>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <strong>{contacts.length} contact enquiries</strong>
        <button className="admin-mini-btn" onClick={() => download(exportAdminLeadsContacts, "evolvix-contacts.csv")}><DownloadCloud size={15} /> Export Contacts CSV</button>
        <strong style={{ marginLeft: "1rem" }}>{subscribers.length} newsletter subscribers</strong>
        <button className="admin-mini-btn" onClick={() => download(exportAdminLeadsNewsletter, "evolvix-newsletter.csv")}><DownloadCloud size={15} /> Export Newsletter CSV</button>
      </div>

      <h4 style={{ marginBottom: "0.75rem" }}>Contact Enquiries</h4>
      {contacts.length === 0 ? <p style={{ opacity: 0.5, marginBottom: "2rem" }}>No contact submissions yet.</p> : (
        <div style={{ overflowX: "auto", marginBottom: "2rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)", textAlign: "left" }}>
              {["Date", "Name", "Email", "Phone", "Type", "Message"].map(h => <th key={h} style={{ padding: "8px 10px", opacity: 0.6, fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>{contacts.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: "8px 10px", whiteSpace: "nowrap", opacity: 0.6 }}>{c.created_at?.slice(0, 10)}</td>
                <td style={{ padding: "8px 10px", fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: "8px 10px" }}><a href={`mailto:${c.email}`} style={{ color: "var(--cyan)" }}>{c.email}</a></td>
                <td style={{ padding: "8px 10px" }}>{c.phone || "—"}</td>
                <td style={{ padding: "8px 10px", opacity: 0.7 }}>{c.inquiry_type || "—"}</td>
                <td style={{ padding: "8px 10px", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.message}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <h4 style={{ marginBottom: "0.75rem" }}>Newsletter Subscribers</h4>
      {subscribers.length === 0 ? <p style={{ opacity: 0.5 }}>No subscribers yet.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)", textAlign: "left" }}>
              {["Date", "Email", "Source"].map(h => <th key={h} style={{ padding: "8px 10px", opacity: 0.6, fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>{subscribers.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: "8px 10px", whiteSpace: "nowrap", opacity: 0.6 }}>{s.created_at?.slice(0, 10)}</td>
                <td style={{ padding: "8px 10px" }}><a href={`mailto:${s.email}`} style={{ color: "var(--cyan)" }}>{s.email}</a></td>
                <td style={{ padding: "8px 10px", opacity: 0.7 }}>{s.source || "website"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function seoSuggestions(post) {
  const title = post.seo_title || post.title || "";
  const description = post.seo_description || post.excerpt || "";
  const keywords = post.seo_keywords || "";
  const body = post.body || "";
  const suggestions = [];
  if (title.length < 45 || title.length > 65) suggestions.push("Keep SEO title between 45–65 characters.");
  if (description.length < 120 || description.length > 160) suggestions.push("Keep SEO description between 120–160 characters.");
  if (!keywords.includes(",")) suggestions.push("Add 3–6 comma-separated SEO keywords.");
  if (body.length < 450) suggestions.push("Add more article body depth for stronger search value.");
  if (!description.toLowerCase().includes("evolvix")) suggestions.push("Mention Evolvix or the service angle in the description.");
  return suggestions.length ? suggestions : ["SEO basics look good. Add internal links when final content is ready."];
}

function seoScore(post) {
  return Math.max(20, 100 - (seoSuggestions(post).filter((item) => !item.startsWith("SEO basics")).length * 15));
}

function BlogSeoTools({ post, index }) {
  const score = seoScore(post);
  const suggestions = seoSuggestions(post);
  return <div className="seo-tools" data-testid={`blog-seo-tools-${index}`}><div className="seo-score" data-testid={`blog-seo-score-${index}`}><span>SEO score</span><strong>{score}/100</strong></div><div className="seo-snippet" data-testid={`blog-seo-snippet-${index}`}><span data-testid={`blog-seo-url-${index}`}>evolvixtechmedia.com/blog/{post.slug || post.id}</span><h4 data-testid={`blog-seo-preview-title-${index}`}>{post.seo_title || post.title}</h4><p data-testid={`blog-seo-preview-description-${index}`}>{post.seo_description || post.excerpt}</p></div><div className="seo-suggestions" data-testid={`blog-seo-suggestions-${index}`}>{suggestions.map((suggestion, suggestionIndex) => <p key={suggestion} data-testid={`blog-seo-suggestion-${index}-${suggestionIndex}`}>{suggestion}</p>)}</div></div>;
}

function getCatalogTemplate(kind) {
  if (kind === "products") return blankProduct;
  if (kind === "portfolio") return blankPortfolio;
  return blankBlog;
}

function getCatalogFields(kind) {
  if (kind === "products") return ["title", "slug", "category", "tag", "price", "summary", "description", "external_purchase_url"];
  if (kind === "portfolio") return ["title", "category", "summary", "image"];
  return ["title", "slug", "category", "excerpt", "body", "seo_title", "seo_description", "seo_keywords", "date", "read_time"];
}

function CatalogEditor({ title, icon: Icon, items, onChange, kind, onRefresh }) {
  const template = getCatalogTemplate(kind);
  const fields = getCatalogFields(kind);
  const update = (index, key, value) => onChange(items.map((item, i) => {
    if (i !== index) return item;
    if (typeof key === "object") return { ...item, ...key };
    return { ...item, [key]: key === "price" ? Number(value) : value };
  }));
  const resetSection = async () => {
    if (!window.confirm(`Reset ${title} to code defaults? Any admin edits to this section will be lost.`)) return;
    try { await resetAdminSection(kind); if (onRefresh) await onRefresh(); toast.success(`${title} reset to defaults`); }
    catch { toast.error(`Could not reset ${title}`); }
  };
  return <section className="admin-editor-card catalog-card" data-testid={`${kind}-editor`}><h3><Icon size={20} /> {title}<button type="button" className="admin-reset" style={{marginLeft:"auto",fontSize:12,padding:"4px 10px"}} onClick={resetSection} data-testid={`${kind}-reset-button`}><RotateCcw size={13} /> Reset {kind}</button></h3>{items.map((item, index) => <details className="admin-catalog-item" key={`${item.id || item.title}-${index}`} open={index === 0}><summary data-testid={`${kind}-summary-${index}`}>{item.title || `Item ${index + 1}`}</summary>{kind === "products" && <ProductImageUploader product={item} index={index} onUpdate={update} />}{kind === "products" && <ProductFileManager product={item} index={index} onRefresh={onRefresh} />}<div className="admin-form-grid">{fields.map((field) => <TextField key={field} label={field.replaceAll("_", " ")} value={item[field]} onChange={(value) => update(index, field, value)} testId={`${kind}-${field}-${index}`} multiline={field === "description" || field === "summary" || field === "excerpt" || field === "body" || field === "seo_description"} />)}</div>{kind === "blog" && <BlogSeoTools post={item} index={index} />}{kind === "products" && <><ArrayEditor title="Benefits" items={item.benefits || []} onChange={(value) => update(index, "benefits", value)} placeholder="Benefit" testPrefix={`${kind}-benefits-${index}`} /><ArrayEditor title="Included" items={item.included || []} onChange={(value) => update(index, "included", value)} placeholder="Included item" testPrefix={`${kind}-included-${index}`} /><ArrayEditor title="File slots" items={item.file_slots || item.fileSlots || []} onChange={(value) => update(index, "file_slots", value)} placeholder="Download file slot" testPrefix={`${kind}-files-${index}`} /></>}<button type="button" className="danger-btn" onClick={() => onChange(items.filter((_, i) => i !== index))} data-testid={`${kind}-delete-${index}`}><Trash2 size={16} /> Remove</button></details>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...items, { ...template, id: `${kind}-${Date.now()}` }])} data-testid={`${kind}-add-button`}><Plus size={16} /> Add {kind}</button></section>;
}

function DemosEditor({ items, onChange }) {
  const demos = items || [];
  const update = (index, key, value) => onChange(demos.map((item, i) => i === index ? { ...item, [key]: value } : item));
  return <section className="admin-editor-card" data-testid="demos-editor"><h3><Monitor size={20} /> Live Demos</h3><p style={{color:"var(--muted)",marginBottom:18}}>Manage demo cards on the Demos page. Set status to "Coming Soon" to show placeholder cards without a live link.</p>{demos.map((item, index) => <div className="admin-pair" key={`${item.title}-${index}`}><div className="admin-form-grid"><TextField label="Title" value={item.title} onChange={(value) => update(index, "title", value)} testId={`demo-title-${index}`} /><TextField label="Industry / Category" value={item.industry} onChange={(value) => update(index, "industry", value)} testId={`demo-industry-${index}`} /><TextField label="Description" value={item.description} onChange={(value) => update(index, "description", value)} testId={`demo-description-${index}`} multiline /><TextField label="Live URL (blank for Coming Soon)" value={item.url} onChange={(value) => update(index, "url", value)} testId={`demo-url-${index}`} /><label className="admin-field" data-testid={`demo-status-${index}-field`}><span>Status</span><select value={item.status || "Coming Soon"} onChange={(e) => update(index, "status", e.target.value)} data-testid={`demo-status-${index}`}><option>Live Demo</option><option>Coming Soon</option><option>Now Building</option></select></label><label className="admin-field" data-testid={`demo-icon-${index}-field`}><span>Icon</span><select value={item.icon_key || "monitor"} onChange={(e) => update(index, "icon_key", e.target.value)} data-testid={`demo-icon-${index}`}><option value="shopping">Shopping / Retail</option><option value="monitor">Monitor / Tech</option><option value="book">Book / Education</option><option value="food">Food / Restaurant</option><option value="health">Health / Clinic</option><option value="phone">Mobile / Services</option><option value="chart">Chart / Finance</option><option value="zap">Zap / Automation</option></select></label></div><ArrayEditor title="Features" items={item.features || []} onChange={(value) => update(index, "features", value)} placeholder="Feature" testPrefix={`demo-features-${index}`} /><label className="admin-check"><input type="checkbox" checked={item.visible !== false} onChange={(e) => update(index, "visible", e.target.checked)} data-testid={`demo-visible-${index}`} /> Visible on website</label><button type="button" className="danger-btn" onClick={() => onChange(demos.filter((_, i) => i !== index))} data-testid={`demo-delete-${index}`}><Trash2 size={16} /> Remove</button></div>)}<button type="button" className="admin-mini-btn" onClick={() => onChange([...demos, { ...blankDemo, id: `demo-${Date.now()}` }])} data-testid="demo-add-button"><Plus size={16} /> Add Demo</button></section>;
}

function PlaygroundEditor() {
  const BLANK = { category: "music", title: "", description: "", url: "", thumbnail: "", visible: true };
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const load = useCallback(async () => {
    try { const { data } = await fetchAdminPlayground(); setItems(data.items || []); } catch { toast.error("Could not load playground items"); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const handleSave = async () => {
    if (!form.title || !form.url) { toast.error("Title and URL are required"); return; }
    try {
      if (editId) { await updatePlaygroundItem(editId, form); toast.success("Item updated"); }
      else { await createPlaygroundItem(form); toast.success("Item added"); }
      setForm(BLANK); setEditId(null); load();
    } catch { toast.error("Could not save item"); }
  };
  const handleEdit = (item) => { setForm({ category: item.category, title: item.title, description: item.description, url: item.url, thumbnail: item.thumbnail || "", visible: item.visible }); setEditId(item.id); };
  const handleDelete = async (id) => { try { await deletePlaygroundItem(id); toast.success("Item removed"); load(); } catch { toast.error("Could not remove item"); } };
  const catLabel = { music: "Music Downloads", freebie: "Freebie Books", game: "Games" };
  return <section className="admin-editor-card" data-testid="playground-editor"><h3><Gamepad2 size={20} /> Playground Items</h3><p style={{ color: "var(--muted)", marginBottom: 18 }}>Add songs, freebie books, or games. Visitors must sign in to access download links.</p><div className="admin-form-grid"><label className="admin-field" data-testid="playground-form-category-field"><span>Category</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="playground-form-category"><option value="music">Music Download</option><option value="freebie">Freebie / Prompt Book</option><option value="game">Game / Interactive</option></select></label><TextField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} testId="playground-form-title" /><TextField label="Download / Access URL" value={form.url} onChange={(v) => setForm({ ...form, url: v })} testId="playground-form-url" /><TextField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} testId="playground-form-desc" multiline /><TextField label="Thumbnail URL (optional)" value={form.thumbnail} onChange={(v) => setForm({ ...form, thumbnail: v })} testId="playground-form-thumb" /></div><label className="admin-check"><input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} data-testid="playground-form-visible" /> Visible on Playground</label><div style={{ display: "flex", gap: 10, marginTop: 12 }}><button type="button" className="admin-save" onClick={handleSave} data-testid="playground-form-save">{editId ? <><Save size={16} /> Update Item</> : <><Plus size={16} /> Add Item</>}</button>{editId && <button type="button" className="danger-btn" onClick={() => { setEditId(null); setForm(BLANK); }} data-testid="playground-form-cancel">Cancel</button>}</div>{["music", "freebie", "game"].map((cat) => { const catItems = items.filter((item) => item.category === cat); return <div key={cat} style={{ marginTop: 28 }} data-testid={`playground-section-${cat}`}><h4 style={{ color: "var(--cyan)", textTransform: "uppercase", fontSize: 12, letterSpacing: "0.1em", marginBottom: 10 }}>{catLabel[cat]}</h4>{catItems.length === 0 ? <p style={{ color: "var(--muted)", fontSize: 13 }} data-testid={`playground-empty-${cat}`}>No items yet.</p> : catItems.map((item) => <div className="admin-pair" key={item.id} data-testid={`playground-item-${item.id}`}><div><strong style={{ color: "white" }}>{item.title}</strong><span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 10 }}>{item.visible ? "Visible" : "Hidden"}</span></div><div style={{ display: "flex", gap: 8 }}><button type="button" className="admin-mini-btn" onClick={() => handleEdit(item)} data-testid={`playground-edit-${item.id}`}><Save size={14} /> Edit</button><button type="button" className="danger-btn" onClick={() => handleDelete(item.id)} data-testid={`playground-delete-${item.id}`}><Trash2 size={14} /> Remove</button></div></div>)}</div>; })}</section>;
}

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [content, setContent] = useState(null);
  const [products, setProducts] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [blog, setBlog] = useState([]);
  const [active, setActive] = useState("brand");
  const [saving, setSaving] = useState(false);
  const tabs = useMemo(() => ["brand", "about", "services", "ecosystem", "learning", "music", "custom", "demos", "products", "portfolio", "blog", "testimonials", "playground", "leads", "analytics"], []);

  const loadDashboard = useCallback(async () => {
    const { data } = await fetchAdminDashboard();
    setContent(data.content);
    setProducts(data.products || []);
    setPortfolio(data.portfolio || []);
    setBlog(data.blog || []);
  }, []);

  useEffect(() => { loadDashboard().then(() => setAuthenticated(true)).catch(() => setAuthenticated(false)); }, [loadDashboard]);

  const login = async (event) => {
    event.preventDefault();
    try { const { data } = await adminLogin({ password }); setVisitorAuthToken(data.token); await loadDashboard(); setAuthenticated(true); toast.success("Admin unlocked"); } catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Login failed"); }
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
    setSaving(true);
    try { await saveAdminContent(content); await saveAdminList("products", products); await saveAdminList("portfolio", portfolio); await saveAdminList("blog", blog); toast.success("Admin content saved"); } catch { toast.error("Could not save admin content"); } finally { setSaving(false); }
  };

  const resetAll = async () => {
    if (!window.confirm("Reset ALL sections (brand, services, products, blog, portfolio…) to code defaults? This cannot be undone.")) return;
    try { await resetAdminContent(); await loadDashboard(); toast.success("All content reset to defaults"); } catch { toast.error("Could not reset content"); }
  };

  const logout = () => {
    adminLogout().catch(() => {});
    setVisitorAuthToken(null);
    setAuthenticated(false);
    setContent(null);
    setPassword("");
    toast.success("Logged out");
  };

  if (!authenticated || !content) {
    return (
      <section className="admin-login-shell" data-testid="admin-login-page">
        <div className="admin-login-card">
          <Sparkles size={34} />
          <span>EVOLVIX OS</span>
          <h1>Admin Command Center</h1>
          <p>Secure content control for the AI-first brand ecosystem.</p>
          <form onSubmit={login} data-testid="admin-login-form">
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                data-testid="admin-password-input"
                style={{ paddingRight: "2.8rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--cyan)", padding: 0, display: "flex", alignItems: "center" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="submit" data-testid="admin-login-button"><Lock size={18} /> Unlock Dashboard</button>
          </form>
        </div>
      </section>
    );
  }

  return <section className="admin-shell" data-testid="admin-dashboard-page"><aside className="admin-sidebar"><h2>EVOLVIX OS</h2><p>3D Content Control</p>{tabs.map((tab) => <button key={tab} className={active === tab ? "active" : ""} onClick={() => setActive(tab)} data-testid={`admin-tab-${tab}`}>{tab}</button>)}</aside><main className="admin-main"><div className="admin-topbar" data-testid="admin-action-bar"><div><span>Admin Dashboard</span><h1>Manage every Evolvix section from one command center.</h1></div><div className="admin-action-buttons"><button className="admin-save" onClick={saveAll} disabled={saving} data-testid="admin-save-all-button"><Save size={16} /> {saving ? "Saving…" : "Save Changes"}</button><button className="admin-reset" onClick={resetAll} data-testid="admin-reset-button"><RotateCcw size={16} /> Reset</button><button className="admin-logout" onClick={logout} data-testid="admin-logout-button"><LogOut size={16} /> Logout</button></div></div>{active === "brand" && <section className="admin-editor-card"><h3><Database size={20} /> Brand, Contact & Trust</h3><div className="admin-form-grid"><TextField label="Brand Name" value={content.brand.name} onChange={(value) => updateContent(["brand", "name"], value)} testId="admin-brand-name" /><TextField label="Headline" value={content.brand.headline} onChange={(value) => updateContent(["brand", "headline"], value)} testId="admin-brand-headline" /><TextField label="Subheadline" value={content.brand.subheadline} onChange={(value) => updateContent(["brand", "subheadline"], value)} testId="admin-brand-subheadline" /><TextField label="GSTIN" value={content.brand.gstin} onChange={(value) => updateContent(["brand", "gstin"], value)} testId="admin-brand-gstin" /><TextField label="Email" value={content.contact.email} onChange={(value) => updateContent(["contact", "email"], value)} testId="admin-contact-email" /><TextField label="Phone" value={content.contact.phone} onChange={(value) => updateContent(["contact", "phone"], value)} testId="admin-contact-phone" /><TextField label="WhatsApp" value={content.contact.whatsapp} onChange={(value) => updateContent(["contact", "whatsapp"], value)} testId="admin-contact-whatsapp" /><TextField label="Address" value={content.contact.address} onChange={(value) => updateContent(["contact", "address"], value)} testId="admin-contact-address" /><TextField label="Facebook" value={content.contact.facebook} onChange={(value) => updateContent(["contact", "facebook"], value)} testId="admin-contact-facebook" /><TextField label="Google Location" value={content.contact.google_location} onChange={(value) => updateContent(["contact", "google_location"], value)} testId="admin-contact-google" /><TextField label="Gumroad" value={content.contact.gumroad} onChange={(value) => updateContent(["contact", "gumroad"], value)} testId="admin-contact-gumroad" /></div><ArrayEditor title="Trust Strip" items={content.trust_strip || []} onChange={(value) => updateContent(["trust_strip"], value)} placeholder="Trust item" testPrefix="admin-trust" /></section>}{active === "about" && <section className="admin-editor-card" data-testid="admin-about-editor"><h3><Database size={20} /> About Page</h3><div className="admin-form-grid"><TextField label="Hero title" value={content.about?.title} onChange={(value) => updateContent(["about", "title"], value)} testId="admin-about-title" /><TextField label="Hero intro paragraph" value={content.about?.intro} onChange={(value) => updateContent(["about", "intro"], value)} testId="admin-about-intro" multiline /><TextField label="Description paragraph" value={content.about?.description} onChange={(value) => updateContent(["about", "description"], value)} testId="admin-about-description" multiline /></div><div className="admin-form-grid" style={{marginTop:"1.5rem"}}><TextField label="Story panel 1 — title" value={content.about?.why_title} onChange={(value) => updateContent(["about", "why_title"], value)} testId="admin-about-why-title" /><TextField label="Story panel 1 — text" value={content.about?.why_text} onChange={(value) => updateContent(["about", "why_text"], value)} testId="admin-about-why-text" multiline /><TextField label="Story panel 2 — title" value={content.about?.mission_title} onChange={(value) => updateContent(["about", "mission_title"], value)} testId="admin-about-mission-title" /><TextField label="Story panel 2 — text" value={content.about?.mission_text} onChange={(value) => updateContent(["about", "mission_text"], value)} testId="admin-about-mission-text" multiline /><TextField label="Story panel 3 — title" value={content.about?.creative_title} onChange={(value) => updateContent(["about", "creative_title"], value)} testId="admin-about-creative-title" /><TextField label="Story panel 3 — text" value={content.about?.creative_text} onChange={(value) => updateContent(["about", "creative_text"], value)} testId="admin-about-creative-text" multiline /></div><div style={{marginTop:"1.5rem"}}><ArrayEditor title="Values" items={content.about?.values || []} onChange={(value) => updateContent(["about", "values"], value)} placeholder="Value" testPrefix="admin-about-values" /></div></section>}{active === "about" && <ServiceListEditor title="What We Do" items={content.about?.what_we_do || []} onChange={(value) => updateContent(["about", "what_we_do"], value)} testPrefix="admin-about-what-we-do" />}{active === "services" && <><ServiceListEditor title="Creative Digital Services" items={content.creative_services || []} onChange={(value) => updateContent(["creative_services"], value)} testPrefix="admin-creative" /><ServiceListEditor title="AI Business & Technology Services" items={content.technology_services || []} onChange={(value) => updateContent(["technology_services"], value)} testPrefix="admin-technology" /></>}{active === "ecosystem" && <EcosystemEditor items={content.ecosystem || []} onChange={(value) => updateContent(["ecosystem"], value)} />}{active === "learning" && <section className="admin-editor-card"><h3><Layers3 size={20} /> Learning and Growth Categories</h3><ArrayEditor title="Categories" items={content.learning_categories || []} onChange={(value) => updateContent(["learning_categories"], value)} placeholder="Learning category" testPrefix="admin-learning" /></section>}{active === "music" && <><section className="admin-editor-card"><h3><Sparkles size={20} /> Music Services</h3><ArrayEditor title="Music Services" items={content.music_services || []} onChange={(value) => updateContent(["music_services"], value)} placeholder="Music service" testPrefix="admin-music" /></section><MusicPreviewsEditor items={content.music_previews || []} onChange={(value) => updateContent(["music_previews"], value)} /></>}{active === "custom" && <CustomSectionsEditor items={content.custom_sections || []} onChange={(value) => updateContent(["custom_sections"], value)} />}{active === "demos" && <DemosEditor items={content.demos || []} onChange={(value) => updateContent(["demos"], value)} />}{active === "products" && <CatalogEditor title="Products" icon={Package} items={products} onChange={setProducts} kind="products" onRefresh={loadDashboard} />}{active === "portfolio" && <CatalogEditor title="Portfolio / Showcase" icon={ImageIcon} items={portfolio} onChange={setPortfolio} kind="portfolio" onRefresh={loadDashboard} />}{active === "blog" && <CatalogEditor title="Blog / Insights" icon={Newspaper} items={blog} onChange={setBlog} kind="blog" onRefresh={loadDashboard} />}{active === "testimonials" && <TestimonialsEditor items={content.testimonials || []} onChange={(value) => updateContent(["testimonials"], value)} />}{active === "playground" && <PlaygroundEditor />}{active === "leads" && <LeadsPanel />}{active === "analytics" && <AnalyticsPanel reportSettings={content.analytics_report_settings || {}} onReportChange={(value) => updateContent(["analytics_report_settings"], value)} />}</main></section>;
}