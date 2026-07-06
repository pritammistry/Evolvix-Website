import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone, Send, ShoppingBag, Star, Twitter, Youtube } from "lucide-react";
import { toast } from "sonner";
import { contactDetails } from "../data/siteContent";
import { submitContact } from "../api";
import { SectionHeader } from "../components/SectionHeader";
import { trackFormSubmit } from "../components/AnalyticsTracker";
import { useSiteContent } from "../hooks/useSiteContent";
import { useSEO } from "../hooks/useSEO";

const VALID_TYPES = ["Business inquiry","AI Business Consulting","Creative Digital Services","Website / App / Software","Learning and Growth Product Support","Music for Creators","Branding / Portfolio / Resume","Collaboration inquiry"];

const comingSoonSocials = [
  { label: "LinkedIn", Icon: Linkedin },
  { label: "Instagram", Icon: Instagram },
  { label: "YouTube", Icon: Youtube },
  { label: "X", Icon: Twitter },
];

const PHONE_RE = /^\+[1-9]\d{6,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const MSG_MIN = 20;

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.phone.trim()) errors.phone = "Phone number is required.";
  else if (!PHONE_RE.test(form.phone.replace(/[\s\-()]/g, "")))
    errors.phone = "Enter a valid number with country code, e.g. +91 98765 43210.";
  if (!form.email.trim()) errors.email = "Email address is required.";
  else if (!EMAIL_RE.test(form.email)) errors.email = "Enter a valid email address.";
  if (form.message.trim().length < MSG_MIN)
    errors.message = `Message must be at least ${MSG_MIN} characters (${form.message.trim().length}/${MSG_MIN}).`;
  return errors;
}

export default function Contact() {
  useSEO({ title: "Contact Evolvix Tech Media", description: "Reach out for AI consulting, website development, digital products, branding, or creative services. Based in Bardhaman, serving clients across India.", path: "/contact" });
  const { content } = useSiteContent();
  const contact = content.contact || contactDetails;
  const [searchParams] = useSearchParams();
  const prefillType = VALID_TYPES.includes(searchParams.get("type")) ? searchParams.get("type") : "Business inquiry";
  const prefillService = searchParams.get("service") || "";
  const [form, setForm] = useState({ name: "", phone: "", email: "", inquiry_type: prefillType, message: prefillService ? `Hi, I’m interested in ${prefillService}.` : "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (touched[key]) setErrors((prev) => ({ ...prev, ...validate({ ...form, [key]: value }) }));
  };

  const blur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, ...validate(form) }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const allTouched = { name: true, phone: true, email: true, message: true };
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) { toast.error("Please fix the errors before sending."); return; }
    try {
      await submitContact(form);
      trackFormSubmit("contact-form", window.location.pathname, { inquiry_type: form.inquiry_type });
      toast.success("Your message has been received.");
      setForm({ name: "", phone: "", email: "", inquiry_type: "Business inquiry", message: "" });
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
      <SectionHeader eyebrow="Contact" title="Let’s build a smarter future together." text="Reach out for AI consulting, creative services, websites, applications, Learning and Growth products, automation, music, or business transformation." />
      <div className="contact-grid">
        <form onSubmit={submit} className="contact-form" noValidate data-testid="contact-form">
          {prefillService && <div className="contact-prefill-chip" data-testid="contact-prefill-chip"><span>Inquiring about:</span> {prefillService}</div>}
          {field("name", <input value={form.name} onChange={(e) => setField("name", e.target.value)} onBlur={() => blur("name")} placeholder="Your full name *" data-testid="contact-name-input" required />)}
          {field("phone", <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} onBlur={() => blur("phone")} placeholder="+91 98765 43210 *" data-testid="contact-phone-input" type="tel" required />)}
          {field("email", <input value={form.email} onChange={(e) => setField("email", e.target.value)} onBlur={() => blur("email")} placeholder="Email address *" data-testid="contact-email-input" type="email" required />)}
          <select value={form.inquiry_type} onChange={(e) => setField("inquiry_type", e.target.value)} data-testid="contact-inquiry-select" required>
            <option>Business inquiry</option>
            <option>AI Business Consulting</option>
            <option>Creative Digital Services</option>
            <option>Website / App / Software</option>
            <option>Learning and Growth Product Support</option>
            <option>Music for Creators</option>
            <option>Branding / Portfolio / Resume</option>
            <option>Collaboration inquiry</option>
          </select>
          {field("message", <textarea value={form.message} onChange={(e) => setField("message", e.target.value)} onBlur={() => blur("message")} placeholder={`Tell me what you need (min ${MSG_MIN} characters) *`} data-testid="contact-message-textarea" required />)}
          <button type="submit" className="primary-btn" data-testid="contact-submit-button">Send Message <Send size={18} /></button>
        </form>
        <aside className="contact-panel" data-testid="contact-details-panel">
          <div className="quick-action-grid" data-testid="contact-quick-actions">
            <a href={`tel:${contact.phone}`} className="quick-action" data-testid="contact-call-link"><Phone size={16} /> Call</a>
            <a href={`https://wa.me/${String(contact.whatsapp || "").replace(/\D/g, "")}`} className="quick-action" data-testid="contact-whatsapp-link"><MessageCircle size={16} /> WhatsApp</a>
            <a href={contact.facebook} className="quick-action" data-testid="contact-facebook-link"><Facebook size={16} /> Facebook</a>
            <a href={contact.google_location} className="quick-action" data-testid="contact-google-reviews-link"><Star size={16} /> Reviews</a>
            <a href={contact.google_location} className="quick-action" data-testid="contact-google-location-link"><MapPin size={16} /> Location</a>
            <a href={contact.gumroad} className="quick-action" data-testid="contact-gumroad-link"><ShoppingBag size={16} /> Gumroad</a>
          </div>
          <a href={`mailto:${contact.email}`} data-testid="contact-email-link"><Mail size={19} /> {contact.email}</a>
          <p data-testid="contact-address-text">{contact.address}</p>
          <div className="social-coming-soon" data-testid="contact-social-coming-soon">
            {comingSoonSocials.map(({ label, Icon }) => <span key={label} data-testid={`contact-social-coming-soon-${label.toLowerCase()}`}><Icon size={16} /> {label} <small>Coming Soon</small></span>)}
          </div>
          <p data-testid="contact-business-note">GST Registered • Udyam Registered MSME • IEC Registered • GST Invoice Available</p>
          <iframe title="Evolvix Tech Media location" className="contact-map-embed" data-testid="contact-map-embed" src={`https://maps.google.com/maps?q=${encodeURIComponent("Evolvix Tech Media, " + (contact.address || ""))}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </aside>
      </div>
    </section>
  );
}