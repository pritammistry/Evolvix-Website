import { faqs } from "../data/siteContent";
import { SectionHeader } from "../components/SectionHeader";
import { useSEO } from "../hooks/useSEO";

export default function FAQ() {
  useSEO({ title: "FAQs — Products, Services & Support", description: "Answers to common questions about Evolvix products, services, payment, delivery, and project process.", path: "/faq" });
  return <section className="section page-section" data-testid="faq-page"><SectionHeader eyebrow="FAQ" title="Answers for buyers, collaborators, learners, and music lovers." /><div className="faq-list" data-testid="faq-list">{faqs.map(([question, answer], index) => <details key={question} data-testid={`faq-item-${index}`}><summary data-testid={`faq-question-${index}`}>{question}</summary><p data-testid={`faq-answer-${index}`}>{answer}</p></details>)}</div></section>;
}