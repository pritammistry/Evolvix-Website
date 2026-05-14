import { SectionHeader } from "../components/SectionHeader";

const copy = {
  terms: ["Terms and Conditions", "Use this website and its digital products respectfully. Product files, templates, and resources are provided for the license stated on each product page."],
  privacy: ["Privacy Policy", "Contact forms and newsletter signups collect only the details needed to respond, provide updates, or support customer requests."],
  refund: ["Refund Policy", "Digital products are generally non-refundable after delivery. If access fails, a duplicate purchase occurs, or support is needed, contact Evolvix Tech Media for assistance."],
};

export default function Legal({ type }) {
  const [title, text] = copy[type] || copy.terms;
  return <section className="section page-section legal-page" data-testid={`${type}-page`}><SectionHeader eyebrow="Policy" title={title} /><article className="legal-copy" data-testid={`${type}-copy`}><p>{text}</p><p>This page is a launch-ready template and can be updated with final business, jurisdiction, and compliance details.</p></article></section>;
}