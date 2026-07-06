import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone, Send, ShoppingBag, Star, Twitter, Youtube } from "lucide-react";
import { toast } from "sonner";
import { contactDetails } from "../data/siteContent";
import { submitContact } from "../api";
import { SectionHeader } from "../components/SectionHeader";
import { trackFormSubmit } from "../components/AnalyticsTracker";
import { useSiteContent } from "../hooks/useSiteContent";

const VALID_TYPES = ["Business inquiry","AI Business Consulting","Creative Digital Services","Website / App / Software","Learning and Growth Product Support","Music for Creators","Branding / Portfolio / Resume","Collaboration inquiry"];

const comingSoonSocials = [
  { label: "LinkedIn", Icon: Linkedin },
  { label: "Instagram", Icon: Instagram },
  { label: "YouTube", Icon: Youtube },
  { label: "X", Icon: Twitter },
];

export default function Contact() {
  const { content } = useSiteContent();
  const contact = content.contact || contactDetails;
  const [searchParams] = useSearchParams();
  const prefillType = VALID_TYPES.includes(searchParams.get("type")) ? searchParams.get("type") : "Business inquiry";
  const prefillService = searchParams.get("service") || "";
  const [form, setForm] = useState({ name: "", phone: "", email: "", inquiry_type: prefillType, message: prefillService ? `Hi, I’m interested in ${prefillService}.` : "" });
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = async (event) => { event.preventDefault(); try { await submitContact(form); trackFormSubmit("contact-form", window.location.pathname, { inquiry_type: form.inquiry_type }); toast.success("Your message has been received."); setForm({ name: "", phone: "", email: "", inquiry_type: "Business inquiry", message: "" }); } catch (error) { toast.error("Please complete every field before sending."); } };
  return <section className="section page-section" data-testid="contact-page"><SectionHeader eyebrow="Contact" title="Let’s build a smarter future together." text="Reach out for AI consulting, creative services, websites, applications, Learning and Growth products, automation, music, or business transformation." /><div className="contact-grid"><form onSubmit={submit} className="contact-form" data-testid="contact-form">{prefillService && <div className="contact-prefill-chip" data-testid="contact-prefill-chip"><span>Inquiring about:</span> {prefillService}</div>}<input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Your name" data-testid="contact-name-input" /><input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="Phone / WhatsApp number" data-testid="contact-phone-input" type="tel" /><input value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="Email address" data-testid="contact-email-input" /><select value={form.inquiry_type} onChange={(e) => setField("inquiry_type", e.target.value)} data-testid="contact-inquiry-select"><option>Business inquiry</option><option>AI Business Consulting</option><option>Creative Digital Services</option><option>Website / App / Software</option><option>Learning and Growth Product Support</option><option>Music for Creators</option><option>Branding / Portfolio / Resume</option><option>Collaboration inquiry</option></select><textarea value={form.message} onChange={(e) => setField("message", e.target.value)} placeholder="Tell me what you need" data-testid="contact-message-textarea" /><button type="submit" className="primary-btn" data-testid="contact-submit-button">Send Message <Send size={18} /></button></form><aside className="contact-panel" data-testid="contact-details-panel"><div className="quick-action-grid" data-testid="contact-quick-actions"><a href={`tel:${contact.phone}`} className="quick-action" data-testid="contact-call-link"><Phone size={16} /> Call</a><a href={`https://wa.me/${String(contact.whatsapp || "").replace(/\D/g, "")}`} className="quick-action" data-testid="contact-whatsapp-link"><MessageCircle size={16} /> WhatsApp</a><a href={contact.facebook} className="quick-action" data-testid="contact-facebook-link"><Facebook size={16} /> Facebook</a><a href={contact.google_location} className="quick-action" data-testid="contact-google-reviews-link"><Star size={16} /> Reviews</a><a href={contact.google_location} className="quick-action" data-testid="contact-google-location-link"><MapPin size={16} /> Location</a><a href={contact.gumroad} className="quick-action" data-testid="contact-gumroad-link"><ShoppingBag size={16} /> Gumroad</a></div><a href={`mailto:${contact.email}`} data-testid="contact-email-link"><Mail size={19} /> {contact.email}</a><p data-testid="contact-address-text">{contact.address}</p><div className="social-coming-soon" data-testid="contact-social-coming-soon">{comingSoonSocials.map(({ label, Icon }) => <span key={label} data-testid={`contact-social-coming-soon-${label.toLowerCase()}`}><Icon size={16} /> {label} <small>Coming Soon</small></span>)}</div><p data-testid="contact-business-note">GST Registered • Udyam Registered MSME • IEC Registered • GST Invoice Available</p><iframe title="Evolvix Tech Media location" className="contact-map-embed" data-testid="contact-map-embed" src={`https://maps.google.com/maps?q=${encodeURIComponent("Evolvix Tech Media, " + (contact.address || ""))}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></aside></div></section>;
}