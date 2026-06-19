import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Facebook, Menu, Phone, X, Mail } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { useSiteContent } from "../hooks/useSiteContent";

const navItems = [["Home", "/"], ["Services", "/services"], ["Ecosystem", "/ecosystem"], ["LearnAI", "/shop"], ["Portfolio", "/portfolio"], ["Blog", "/blog"], ["FAQ", "/faq"], ["Contact", "/contact"]];

export function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { content } = useSiteContent();
  const contact = content.contact || {};
  return (
    <div className="site-shell" data-testid="site-shell">
      <header className="topbar" data-testid="site-header">
        <BrandLogo />
        <nav className="desktop-nav" aria-label="Primary navigation" data-testid="desktop-navigation">
          {navItems.map(([label, path]) => <NavLink key={path} to={path} data-testid={`nav-link-${label.toLowerCase().replaceAll(" ", "-")}`}>{label}</NavLink>)}
        </nav>
        <Link to="/contact" className="nav-cta" data-testid="header-contact-cta-link">Start a Project</Link>
        <button className="mobile-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu" data-testid="mobile-menu-toggle-button">{open ? <X size={22} /> : <Menu size={22} />}</button>
      </header>
      {open && <nav className="mobile-nav" aria-label="Mobile navigation" data-testid="mobile-navigation-menu">{navItems.map(([label, path]) => <NavLink key={path} to={path} onClick={() => setOpen(false)} data-testid={`mobile-nav-link-${label.toLowerCase().replaceAll(" ", "-")}`}>{label}</NavLink>)}</nav>}
      <main data-testid="main-content">{children}</main>
      <footer className="site-footer" data-testid="site-footer">
        <div className="footer-grid">
          <div><BrandLogo footer /><p data-testid="footer-brand-statement">{content.brand?.tagline} | {content.brand?.headline}</p><p data-testid="footer-gstin-text">GSTIN: {content.brand?.gstin}</p></div>
          <div className="footer-links" data-testid="footer-quick-links"><h3>Explore</h3>{navItems.slice(1, 7).map(([label, path]) => <Link key={path} to={path} data-testid={`footer-link-${label.toLowerCase().replaceAll(" ", "-")}`}>{label}</Link>)}</div>
          <div className="footer-links" data-testid="footer-policy-links"><h3>Policies</h3><Link to="/terms" data-testid="footer-terms-link">Terms</Link><Link to="/privacy" data-testid="footer-privacy-link">Privacy</Link><Link to="/refund" data-testid="footer-refund-link">Refund Policy</Link></div>
          <div className="footer-links" data-testid="footer-contact-links"><h3>Connect</h3><a href={`mailto:${contact.email}`} data-testid="footer-email-link"><Mail size={16} /> {contact.email}</a><a href={`tel:${contact.phone}`} data-testid="footer-phone-link"><Phone size={16} /> {contact.phone}</a><a href={contact.facebook} data-testid="footer-facebook-link"><Facebook size={16} /> Facebook</a><span data-testid="footer-address-text">{contact.address}</span></div>
        </div>
        <div className="footer-bottom" data-testid="footer-copyright">© 2026 Evolvix Tech Media. Create • Innovate • Elevate.</div>
      </footer>
    </div>
  );
}