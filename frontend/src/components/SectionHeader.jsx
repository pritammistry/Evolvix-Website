export function SectionHeader({ eyebrow, title, text, align = "left" }) {
  return (
    <div className={`section-header ${align === "center" ? "center" : ""}`} data-testid={`section-header-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <span className="eyebrow" data-testid="section-header-eyebrow">{eyebrow}</span>
      <h2 data-testid="section-header-title">{title}</h2>
      {text && <p data-testid="section-header-text">{text}</p>}
    </div>
  );
}