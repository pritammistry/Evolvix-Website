import { Link } from "react-router-dom";
import { logos } from "../data/siteContent";

export function BrandLogo({ compact = false, footer = false }) {
  return (
    <Link to="/" className={`brand-logo ${footer ? "footer-logo" : ""}`} data-testid={footer ? "footer-brand-logo-link" : "header-brand-logo-link"}>
      <img src={compact ? logos.icon : logos.horizontal} alt="Evolvix Tech Media logo" className={compact ? "brand-logo-icon-only" : "brand-logo-official"} data-testid={compact ? "brand-logo-icon-image" : "brand-logo-official-image"} />
    </Link>
  );
}