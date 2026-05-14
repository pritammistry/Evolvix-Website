import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Instagram, Youtube, Mail } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { contactDetails } from "../data/siteContent";

const navItems = [["Home", "/"], ["About", "/about"], ["Portfolio", "/portfolio"], ["Shop", "/shop"], ["AI Music", "/creative-lab"], ["Blog", "/blog"], ["FAQ", "/faq"], ["Contact", "/contact"]];

export function Layout({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="site-shell" data-testid="site-shell">
      <header className="topbar" data-testid="site-header">
        <BrandLogo />
        <nav className="desktop-nav" aria-label="Primary navigation" data-testid="desktop-navigation">
          {navItems.map(([label, path]) => <NavLink key={path} to={path} data-testid={`nav-link-${label.toLowerCase().replaceAll(" ", "-")}`}>{label}</NavLink>)}
        </nav>
        <Link to="/shop" className="nav-cta" data-testid="header-shop-cta-link">Shop Products</Link>
        <button className="mobile-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu" data-testid="mobile-menu-toggle-button">{open ? <X size={22} /> : <Menu size={22} />}</button>
      </header>
      {open && <nav className="mobile-nav" aria-label="Mobile navigation" data-testid="mobile-navigation-menu">{navItems.map(([label, path]) => <NavLink key={path} to={path} onClick={() => setOpen(false)} data-testid={`mobile-nav-link-${label.toLowerCase().replaceAll(" ", "-")}`}>{label}</NavLink>)}</nav>}
      <main data-testid="main-content">{children}</main>
      <footer className="site-footer" data-testid="site-footer">
        <div className="footer-grid">
          <div><BrandLogo footer /><p data-testid="footer-brand-statement">Helping people adapt, learn, create, and thrive in the digital AI era.</p></div>
          <div className="footer-links" data-testid="footer-quick-links"><h3>Explore</h3>{navItems.slice(1, 7).map(([label, path]) => <Link key={path} to={path} data-testid={`footer-link-${label.toLowerCase().replaceAll(" ", "-")}`}>{label}</Link>)}</div>
          <div className="footer-links" data-testid="footer-policy-links"><h3>Policies</h3><Link to="/terms" data-testid="footer-terms-link">Terms</Link><Link to="/privacy" data-testid="footer-privacy-link">Privacy</Link><Link to="/refund" data-testid="footer-refund-link">Refund Policy</Link></div>
          <div className="footer-links" data-testid="footer-contact-links"><h3>Connect</h3><a href={`mailto:${contactDetails.email}`} data-testid="footer-email-link"><Mail size={16} /> {contactDetails.email}</a><a href={contactDetails.instagram} data-testid="footer-instagram-link"><Instagram size={16} /> Instagram</a><a href={contactDetails.youtube} data-testid="footer-youtube-link"><Youtube size={16} /> YouTube</a></div>
        </div>
        <div className="footer-bottom" data-testid="footer-copyright">© 2026 Evolvix Tech Media. Create • Innovate • Elevate.</div>
      </footer>
    </div>
  );
}