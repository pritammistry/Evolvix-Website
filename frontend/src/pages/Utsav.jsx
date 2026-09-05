import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Lock, Sparkles } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { useFestivalOffer } from "../hooks/useFestivalOffer";
import { CHAPTERS, chapterOpen, opensOnLabel, seasonLive } from "../lib/utsav";
import { deadlineDate, timeLeft } from "../lib/campaign";

// The season hub. Three chapters, one code, one URL to promote for ten weeks.
//
// Locked chapters are shown rather than hidden, with the date they open. A
// visitor who arrives in September should leave knowing there is a reason to
// come back in November — that is the whole argument for running the festivals
// as one campaign instead of three.

export default function Utsav() {
  useSEO({
    title: "Puja season at Evolvix — play, and take 15–40% off",
    description:
      "Three games across Durga Puja, Diwali and Chhath. Play any one of them and claim a single personal discount code, good for 15–40% off anything we make, all season.",
    path: "/utsav",
  });

  const offer = useFestivalOffer();
  const live = seasonLive();
  const urgency = offer?.closes_at ? timeLeft(offer.closes_at) : null;

  return (
    <section className="section utv-page">
      <div className="utv-shell">
        <Link to="/playground" className="utv-back"><ArrowLeft size={16} /> Back to Playground</Link>
        <span className="utv-eyebrow"><Sparkles size={13} /> PUJA SEASON AT EVOLVIX</span>

        <div className="utv-card utv-card--hub">
          <span className="utv-bloom" aria-hidden="true">🪔</span>
          <h1>Three festivals, one gift</h1>
          <p className="utv-lede">
            Durga Puja, Diwali and Chhath, with a game for each. Play{" "}
            <strong>any one of them</strong> and the code is yours — somewhere
            between <strong>15% and 40% off</strong> anything we make, good for
            three purchases, right through the season.
          </p>
          {offer?.claimed ? (
            <p className="utv-hub-note" data-testid="utsav-has-code">
              You already have <strong>{offer.claimed.code}</strong> at{" "}
              <strong>{offer.claimed.percent}% off</strong>. The other chapters are
              for the fun of it — your discount does not change.
            </p>
          ) : (
            <p className="utv-hub-note">
              One code per person for the whole season, not one per festival.
              {live && offer?.closes_at ? ` Claim it by ${deadlineDate(offer.closes_at)}.` : ""}
            </p>
          )}
          {urgency?.urgent && <p className="utv-urgent">{urgency.label}</p>}
        </div>

        <ul className="utv-chapters" data-testid="utsav-chapters">
          {CHAPTERS.map((c, i) => {
            const open = chapterOpen(c) && live;
            const body = (
              <>
                <span className="utv-chapter-emoji" aria-hidden="true">{c.emoji}</span>
                <span className="utv-chapter-festival">{c.festival}</span>
                <h2>{c.title}</h2>
                <p>{c.blurb}</p>
                <span className="utv-chapter-cta">
                  {open
                    ? <>Play chapter {i + 1} <ArrowRight size={15} /></>
                    : <><Lock size={13} /> Opens {opensOnLabel(c)}</>}
                </span>
              </>
            );
            // A card that lifts on hover has to be clickable — so a locked one
            // is a plain element, not a link that goes nowhere.
            return (
              <li key={c.id} className={`utv-chapter${open ? "" : " utv-chapter--locked"}`} data-testid={`utsav-chapter-${c.id}`}>
                {open ? <Link to={c.path} className="utv-chapter-link">{body}</Link> : <div className="utv-chapter-link">{body}</div>}
              </li>
            );
          })}
        </ul>

        {!live && (
          <p className="utv-fineprint" data-testid="utsav-closed">
            The season has finished and the offer has closed. The games stay in the
            Playground.
          </p>
        )}
      </div>
    </section>
  );
}
