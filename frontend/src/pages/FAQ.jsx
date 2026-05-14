import { faqs } from "../data/siteContent";
import { SectionHeader } from "../components/SectionHeader";

export default function FAQ() {
  return <section className="section page-section" data-testid="faq-page"><SectionHeader eyebrow="FAQ" title="Answers for buyers, collaborators, learners, and music lovers." /><div className="faq-list" data-testid="faq-list">{faqs.map(([question, answer], index) => <details key={question} data-testid={`faq-item-${index}`}><summary data-testid={`faq-question-${index}`}>{question}</summary><p data-testid={`faq-answer-${index}`}>{answer}</p></details>)}</div></section>;
}