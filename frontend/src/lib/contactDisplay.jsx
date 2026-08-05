import {
  Phone, MessageCircle, Facebook, Star, MapPin, ShoppingBag, Mail, Globe,
  Linkedin, Instagram, Youtube, Twitter, Send, Calendar, FileText, Download,
} from "lucide-react";

// Keys the admin picks from. Kept in one place so the dropdown in the admin
// panel and the icons on the page can never disagree.
export const CONTACT_ICONS = {
  phone: Phone,
  whatsapp: MessageCircle,
  facebook: Facebook,
  star: Star,
  map: MapPin,
  shopping: ShoppingBag,
  mail: Mail,
  globe: Globe,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  send: Send,
  calendar: Calendar,
  document: FileText,
  download: Download,
};

export const CONTACT_ICON_OPTIONS = [
  ["phone", "Phone / Call"], ["whatsapp", "WhatsApp / Chat"], ["facebook", "Facebook"],
  ["star", "Star / Reviews"], ["map", "Map / Location"], ["shopping", "Shop / Store"],
  ["mail", "Email"], ["globe", "Website / Link"], ["linkedin", "LinkedIn"],
  ["instagram", "Instagram"], ["youtube", "YouTube"], ["twitter", "X / Twitter"],
  ["send", "Send / Telegram"], ["calendar", "Calendar / Booking"],
  ["document", "Document"], ["download", "Download"],
];

export function contactIcon(iconKey, size = 16) {
  const Icon = CONTACT_ICONS[iconKey] || Globe;
  return <Icon size={size} />;
}

// URLs may contain {phone}, {whatsapp}, {email}, {facebook}, {google_location},
// {gumroad} and {address}, filled from the Brand & Contact section so a number
// only ever has to be changed in one place.
export function resolveContactUrl(url, contact) {
  if (!url) return "";
  const values = {
    phone: contact?.phone || "",
    whatsapp: String(contact?.whatsapp || "").replace(/\D/g, ""),
    email: contact?.email || "",
    facebook: contact?.facebook || "",
    google_location: contact?.google_location || "",
    gumroad: contact?.gumroad || "",
    address: contact?.address || "",
  };
  return url.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

// An action is only shown if it is visible and actually resolves to a link —
// otherwise removing a value in Brand & Contact would leave a dead button.
export function usableActions(actions, contact) {
  return (actions || [])
    .filter((item) => item.visible !== false)
    .map((item) => ({ ...item, href: resolveContactUrl(item.url, contact) }))
    .filter((item) => item.href && !/\{\w+\}/.test(item.href) && item.href !== "tel:" && item.href !== "mailto:");
}
