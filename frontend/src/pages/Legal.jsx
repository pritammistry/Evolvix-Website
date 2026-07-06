import { SectionHeader } from "../components/SectionHeader";
import { legalContent } from "../data/siteContent";
import { useSEO } from "../hooks/useSEO";

const LEGAL_SEO = {
  terms:   { title: "Terms of Service",            description: "Terms and conditions governing use of evolvixtech.in and all Evolvix products and services." },
  privacy: { title: "Privacy Policy",              description: "How Evolvix Tech Media collects, uses, and protects your personal data when you use evolvixtech.in." },
  refund:  { title: "Refund & Cancellation Policy", description: "Understand when refunds apply for Evolvix digital products and services." },
};

export default function Legal({ type }) {
  const seo = LEGAL_SEO[type] || LEGAL_SEO.terms;
  useSEO({ title: seo.title, description: seo.description, path: `/${type}` });
  const content = legalContent[type] || legalContent.terms;
  return (
    <section className="section page-section legal-page" data-testid={`${type}-page`}>
      <SectionHeader eyebrow="Policy" title={content.title} />
      <article className="legal-copy" data-testid={`${type}-copy`}>
        <p className="legal-updated" data-testid={`${type}-last-updated`}>{content.lastUpdated}</p>
        {content.intro.map((paragraph, index) => <p key={`intro-${index}`} data-testid={`${type}-intro-${index}`}>{paragraph}</p>)}
        {content.sections.map((section, sectionIndex) => (
          <div className="legal-section" key={section.heading} data-testid={`${type}-section-${sectionIndex}`}>
            <h2 data-testid={`${type}-section-heading-${sectionIndex}`}>{section.heading}</h2>
            {section.blocks.map((block, blockIndex) => block.type === "list" ? (
              <ul key={`block-${blockIndex}`} data-testid={`${type}-section-${sectionIndex}-list-${blockIndex}`}>
                {block.items.map((item, itemIndex) => <li key={itemIndex} data-testid={`${type}-section-${sectionIndex}-item-${itemIndex}`}>{item}</li>)}
              </ul>
            ) : (
              <p key={`block-${blockIndex}`} data-testid={`${type}-section-${sectionIndex}-p-${blockIndex}`}>{block.text}</p>
            ))}
          </div>
        ))}
      </article>
    </section>
  );
}
