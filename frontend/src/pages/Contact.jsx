import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { contactDetails } from "../data/siteContent";
import { submitContact } from "../api";
import { SectionHeader } from "../components/SectionHeader";
import { trackFormSubmit } from "../components/AnalyticsTracker";
import { useSiteContent } from "../hooks/useSiteContent";
import { useSEO } from "../hooks/useSEO";
import { contactIcon, resolveContactUrl, usableActions } from "../lib/contactDisplay";

const PHONE_RE = /^\+[1-9]\d{6,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

// Validation follows the admin's form settings, so changing the minimum length
// or turning the phone field off cannot leave a rule behind that blocks submit.
const OTHER = "Other";

function validate(form, cfg) {
  const min = Number(cfg.message_min_length) || 0;
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (cfg.show_phone !== false) {
    if (cfg.phone_required !== false && !form.phone.trim()) errors.phone = "Phone number is required.";
    else if (form.phone.trim() && !PHONE_RE.test(form.phone.replace(/[\s\-()]/g, "")))
      errors.phone = "Enter a valid number with country code, e.g. +91 98765 43210.";
  }
  if (!form.email.trim()) errors.email = "Email address is required.";
  else if (!EMAIL_RE.test(form.email)) errors.email = "Enter a valid email address.";
  if (!form.business_name.trim()) errors.business_name = "Business name is required.";
  if (!form.business_type) errors.business_type = "Please choose a business type.";
  // "Other" on its own tells us nothing, so it has to be spelled out.
  if (form.business_type === OTHER && !form.business_type_other.trim())
    errors.business_type_other = "Tell us what kind of business it is.";
  if (form.business_industry === OTHER && !form.business_industry_other.trim())
    errors.business_industry_other = "Tell us which industry.";
  if (min > 0 && form.message.trim().length < min)
    errors.message = `Message must be at least ${min} characters (${form.message.trim().length}/${min}).`;
  return errors;
}

export default function Contact() {
  useSEO({ title: "Contact Evolvix Tech Media", description: "Reach out for AI consulting, website development, digital products, branding, or creative services. Based in Bardhaman, serving clients across India.", path: "/contact" });
  const { content, loading } = useSiteContent();
  const contact = content.contact || contactDetails;
  const page = content.contact_page || {};
  const formCfg = page.form || {};
  const inquiryTypes = page.inquiry_types?.length ? page.inquiry_types : ["Business inquiry"];
  const businessTypes = page.business_types?.length ? page.business_types : [OTHER];
  const businessIndustries = page.business_industries?.length ? page.business_industries : [OTHER];
  // Empty while loading: the fallback content lists every default button, so
  // rendering it would show buttons you have hidden and then snatch them away
  // once the real content lands.
  const actions = loading ? [] : usableActions(page.quick_actions, contact);
  const socials = loading ? [] : (page.social_links || []).filter((item) => item.visible !== false);
  const [searchParams] = useSearchParams();
  const prefillType = inquiryTypes.includes(searchParams.get("type")) ? searchParams.get("type") : inquiryTypes[0];
  const prefillService = searchParams.get("service") || "";
  const [form, setForm] = useState({ name: "", phone: "+91 ", email: "", business_name: "", business_type: "", business_type_other: "", business_industry: "", business_industry_other: "", inquiry_type: prefillType, message: prefillService ? `Hi, I’m interested in ${prefillService}.` : "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setField = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    if (touched[key]) setErrors(validate(next, formCfg));
  };

  const blur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors(validate(form, formCfg));
  };

  const submit = async (event) => {
    event.preventDefault();
    const allTouched = { name: true, phone: true, email: true, message: true, business_name: true, business_type: true, business_type_other: true, business_industry_other: true };
    setTouched(allTouched);
    const errs = validate(form, formCfg);
    setErrors(errs);
    if (Object.keys(errs).length > 0) { toast.error("Please fix the errors before sending."); return; }
    try {
      // "Other" is sent as what they actually typed, so the lead is readable
      // without cross-referencing a second column.
      const resolve = (choice, typed) => (choice === OTHER ? `Other — ${typed.trim()}` : choice);
      await submitContact({
        name: form.name,
        phone: form.phone,
        email: form.email,
        inquiry_type: form.inquiry_type,
        message: form.message,
        business_name: form.business_name.trim(),
        business_type: resolve(form.business_type, form.business_type_other),
        business_industry: form.business_industry ? resolve(form.business_industry, form.business_industry_other) : "",
      });
      trackFormSubmit("contact-form", window.location.pathname, { inquiry_type: form.inquiry_type, business_type: form.business_type });
      toast.success("Your message has been received.");
      setForm({ name: "", phone: "+91 ", email: "", business_name: "", business_type: "", business_type_other: "", business_industry: "", business_industry_other: "", inquiry_type: inquiryTypes[0], message: "" });
      setTouched({});
      setErrors({});
    } catch { toast.error("Something went wrong. Please try again."); }
  };

  const field = (key, el) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {el}
      {touched[key] && errors[key] && <span style={{ color: "#ff6b6b", fontSize: "0.78rem" }} data-testid={`contact-${key}-error`}>{errors[key]}</span>}
    </div>
  );

  return (
    <section className="section page-section" data-testid="contact-page">
      <SectionHeader eyebrow={page.eyebrow || "Contact"} title={page.title || "Let’s build a smarter future together."} text={page.intro} />
      <div className="contact-grid">
        <form onSubmit={submit} className="contact-form" noValidate data-testid="contact-form">
          {prefillService && <div className="contact-prefill-chip" data-testid="contact-prefill-chip"><span>Inquiring about:</span> {prefillService}</div>}
          {field("name", <input value={form.name} onChange={(e) => setField("name", e.target.value)} onBlur={() => blur("name")} placeholder={formCfg.name_placeholder || "Your full name *"} data-testid="contact-name-input" required />)}
          {formCfg.show_phone !== false && field("phone", <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} onBlur={() => blur("phone")} placeholder={formCfg.phone_placeholder || "+91 98765 43210 *"} data-testid="contact-phone-input" type="tel" required={formCfg.phone_required !== false} />)}
          {field("email", <input value={form.email} onChange={(e) => setField("email", e.target.value)} onBlur={() => blur("email")} placeholder={formCfg.email_placeholder || "Email address *"} data-testid="contact-email-input" type="email" required />)}
          {field("business_name", <input value={form.business_name} onChange={(e) => setField("business_name", e.target.value)} onBlur={() => blur("business_name")} placeholder="Business name *" data-testid="contact-business-name-input" required />)}
          {field("business_type", (
            <select value={form.business_type} onChange={(e) => setField("business_type", e.target.value)} onBlur={() => blur("business_type")} data-testid="contact-business-type-select" required>
              <option value="" disabled>Business type *</option>
              {businessTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          ))}
          {form.business_type === OTHER && field("business_type_other", <input value={form.business_type_other} onChange={(e) => setField("business_type_other", e.target.value)} onBlur={() => blur("business_type_other")} placeholder="What kind of business? *" data-testid="contact-business-type-other-input" required />)}
          {field("business_industry", (
            <select value={form.business_industry} onChange={(e) => setField("business_industry", e.target.value)} data-testid="contact-business-industry-select">
              <option value="">Industry (optional)</option>
              {businessIndustries.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          ))}
          {form.business_industry === OTHER && field("business_industry_other", <input value={form.business_industry_other} onChange={(e) => setField("business_industry_other", e.target.value)} onBlur={() => blur("business_industry_other")} placeholder="Which industry? *" data-testid="contact-business-industry-other-input" required />)}
          <select value={form.inquiry_type} onChange={(e) => setField("inquiry_type", e.target.value)} data-testid="contact-inquiry-select" required>
            {inquiryTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          {field("message", <textarea value={form.message} onChange={(e) => setField("message", e.target.value)} onBlur={() => blur("message")} placeholder={(formCfg.message_placeholder || "Tell me what you need *").replace("{min}", Number(formCfg.message_min_length) || 0)} data-testid="contact-message-textarea" required />)}
          <button type="submit" className="primary-btn" data-testid="contact-submit-button">{formCfg.submit_label || "Send Message"} <Send size={18} /></button>
        </form>
        <aside className="contact-panel" data-testid="contact-details-panel">
          {loading && (
            <div className="quick-action-grid" data-testid="contact-actions-skeleton" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => <span key={i} className="quick-action quick-action--skeleton" />)}
            </div>
          )}
          {actions.length > 0 && (
            <div className="quick-action-grid" data-testid="contact-quick-actions">
              {actions.map((action) => (
                <a
                  key={action.id || action.label}
                  href={action.href}
                  className="quick-action"
                  target={action.href.startsWith("http") ? "_blank" : undefined}
                  rel={action.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  data-testid={`contact-action-${(action.label || "link").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                >
                  {contactIcon(action.icon_key)} {action.label}
                </a>
              ))}
            </div>
          )}
          {page.show_email !== false && contact.email && <a href={`mailto:${contact.email}`} data-testid="contact-email-link"><Mail size={19} /> {contact.email}</a>}
          {page.show_address !== false && contact.address && <p data-testid="contact-address-text">{contact.address}</p>}
          {socials.length > 0 && (
            <div className="social-coming-soon" data-testid="contact-social-coming-soon">
              {socials.map((social) => {
                const href = resolveContactUrl(social.url, contact);
                const live = social.status !== "Coming Soon" && href;
                const testId = `contact-social-${(social.label || "link").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                const inner = <>{contactIcon(social.icon_key)} {social.label} {!live && <small>{social.status || "Coming Soon"}</small>}</>;
                return live
                  ? <a key={social.id || social.label} href={href} target="_blank" rel="noopener noreferrer" data-testid={testId}>{inner}</a>
                  : <span key={social.id || social.label} data-testid={testId}>{inner}</span>;
              })}
            </div>
          )}
          {page.business_note && <p data-testid="contact-business-note">{page.business_note}</p>}
          {page.show_map !== false && contact.address && <iframe title="Evolvix Tech Media location" className="contact-map-embed" data-testid="contact-map-embed" src={`https://maps.google.com/maps?q=${encodeURIComponent("Evolvix Tech Media, " + contact.address)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />}
        </aside>
      </div>
    </section>
  );
}