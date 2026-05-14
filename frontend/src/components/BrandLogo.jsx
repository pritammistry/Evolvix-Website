import { Link } from "react-router-dom";
import { logos } from "../data/siteContent";

export function BrandLogo({ compact = false, footer = false }) {
  return (
    <Link to="/" className={`brand-logo ${footer ? "footer-logo" : ""}`} data-testid={footer ? "footer-brand-logo-link" : "header-brand-logo-link"}>
      <img src={logos.icon} alt="Evolvix Tech Media logo" className="brand-logo-icon" data-testid={compact ? "brand-logo-icon-image" : "brand-logo-horizontal-image"} />
      <span className="brand-wordmark" data-testid="brand-wordmark-text"><strong>Evolvix</strong><small>Tech Media</small></span>
    </Link>
  );
}