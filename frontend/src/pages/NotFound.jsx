import { Link } from "react-router-dom";
import { ArrowRight, SearchX } from "lucide-react";
import { useSEO } from "../hooks/useSEO";

export default function NotFound() {
  useSEO({ title: "Page Not Found", description: "This page doesn't exist. Head back to Evolvix Tech Media." });
  return (
    <section className="section page-section" style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center" }} data-testid="not-found-page">
      <div>
        <SearchX size={56} style={{ color: "var(--cyan)", margin: "0 auto 24px", display: "block", opacity: 0.7 }} />
        <span className="eyebrow">404 — Not Found</span>
        <h1 style={{ fontSize: "clamp(2.4rem,5vw,4.8rem)", marginTop: 12 }}>This page doesn't exist.</h1>
        <p style={{ maxWidth: 480, margin: "0 auto 32px" }}>The link may be broken or the page may have moved. Head back and you'll find everything you need.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/" className="primary-btn" data-testid="not-found-home-link">Back to Home <ArrowRight size={18} /></Link>
          <Link to="/contact" className="secondary-btn" data-testid="not-found-contact-link">Contact Us</Link>
        </div>
      </div>
    </section>
  );
}
