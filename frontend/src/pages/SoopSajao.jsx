import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { trackEvent } from "../components/AnalyticsTracker";
import ChapterOutro from "../components/ChapterOutro";
import { chapterOpen, findChapter, seasonLive } from "../lib/utsav";

// Soop Sajao — the Chhath chapter.
//
// This one is deliberately not like the other two, and the reason is worth
// writing down. Chhath is the most austere festival of the three: a thirty-six
// hour waterless fast, standing in a river at dawn. The arghya — the offering
// to the sun — is the act of worship itself, and turning that into a scored,
// leaderboarded game is the one idea in this campaign that could genuinely
// offend the people who keep it, particularly in Bihar and eastern UP.
//
// So the game is about the preparation instead, which is communal, warm and
// genuinely playful: filling the soop. There is no timer, no score and nothing
// to lose. A wrong tap says what the right one would have been and waits. The
// season closes quietly rather than on a scoreboard, which reads as respect
// rather than as a missing feature.

const OFFERINGS = [
  { id: "soop", icon: "🧺", name: "The soop itself", note: "A bamboo winnowing tray. Everything else is arranged in it." },
  { id: "thekua", icon: "🍪", name: "Thekua", note: "Wheat flour, jaggery and ghee, pressed in a wooden mould. The offering Chhath is known by." },
  { id: "sugarcane", icon: "🎋", name: "Sugarcane", note: "Whole stalks, often tied into an arch above the soop." },
  { id: "coconut", icon: "🥥", name: "Coconut", note: "Offered whole, still in its husk." },
  { id: "banana", icon: "🍌", name: "Bananas", note: "A whole hand, never separated into single fruit." },
  { id: "diya", icon: "🪔", name: "The diya", note: "Lit last, and carried to the water at dusk." },
];

export default function SoopSajao() {
  const chapter = findChapter("soop");
  useSEO({
    title: "Soop Sajao — a Chhath game by Evolvix",
    description:
      "Fill the soop in order — thekua, sugarcane, coconut, bananas, the diya. No timer, no score. Finish the season and claim 15–40% off anything Evolvix makes.",
    path: "/utsav/soop",
  });

  const [phase, setPhase] = useState("intro");   // intro | playing | done
  const [placed, setPlaced] = useState([]);
  const [nudge, setNudge] = useState("");
  const [misses, setMisses] = useState(0);
  const [live] = useState(() => seasonLive() && chapterOpen(chapter));

  const start = () => {
    setPlaced([]);
    setNudge("");
    setMisses(0);
    setPhase("playing");
    trackEvent({ event_type: "game_start", label: "soop-sajao" });
  };

  const next = OFFERINGS[placed.length];

  const place = (item) => {
    if (item.id !== next.id) {
      // No failure state: it says what comes next and waits. Being told is the
      // point — most people outside Bihar have never seen a soop filled.
      setMisses((n) => n + 1);
      setNudge(`Not yet — ${next.name.toLowerCase()} goes in first.`);
      return;
    }
    const done = [...placed, item];
    setPlaced(done);
    setNudge("");
    if (done.length === OFFERINGS.length) setPhase("done");
  };

  if (!live) {
    return (
      <section className="section utv-page">
        <div className="utv-shell">
          <Link to="/utsav" className="utv-back"><ArrowLeft size={16} /> All three chapters</Link>
          <div className="utv-card">
            <span className="utv-bloom" aria-hidden="true">🧺</span>
            <h1>Not yet</h1>
            <p className="utv-lede">This chapter opens once you have finished One Flame.</p>
            <Link to="/utsav" className="utv-primary">Back to the season <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section utv-page">
      <div className="utv-shell">
        <Link to="/utsav" className="utv-back"><ArrowLeft size={16} /> All three chapters</Link>
        <span className="utv-eyebrow"><Sparkles size={13} /> CHHATH AT EVOLVIX</span>

        {phase === "intro" && (
          <div className="utv-card" data-testid="soop-intro">
            <span className="utv-bloom" aria-hidden="true">🧺</span>
            <h1>Soop Sajao</h1>
            <p className="utv-lede">
              Before anyone stands in the water at dawn, the soop is filled. Put the
              offerings in, in the order they belong — <strong>there is no timer and
              nothing to lose</strong>.
            </p>
            <ul className="utv-rules">
              <li><strong>Six things, one order.</strong> Get one wrong and it will simply tell you.</li>
              <li><strong>Each one explains itself</strong> as it goes in.</li>
              <li><strong>No score here.</strong> Chhath is a fast, not a competition.</li>
            </ul>
            <button className="utv-primary" onClick={start} data-testid="soop-start">
              Begin <ArrowRight size={17} />
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="utv-card utv-card--soop" data-testid="soop-stage">
            <p className="utv-prize-label">{placed.length} of {OFFERINGS.length} placed</p>
            <h2 className="utv-soop-ask">What goes in {placed.length === 0 ? "first" : "next"}?</h2>

            <ul className="utv-soop-tray" data-testid="soop-tray">
              {OFFERINGS.map((o) => {
                const done = placed.some((p) => p.id === o.id);
                return (
                  <li key={o.id}>
                    <button
                      className={`utv-soop-item${done ? " utv-soop-item--done" : ""}`}
                      onClick={() => place(o)}
                      disabled={done}
                      data-testid={`soop-item-${o.id}`}
                    >
                      <span className="utv-soop-icon" aria-hidden="true">{o.icon}</span>
                      <span className="utv-soop-name">{o.name}</span>
                      {done && <Check size={15} />}
                    </button>
                  </li>
                );
              })}
            </ul>

            {nudge && <p className="utv-soop-nudge" data-testid="soop-nudge">{nudge}</p>}

            {placed.length > 0 && (
              <ol className="utv-soop-log" data-testid="soop-log">
                {placed.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}.</strong> {p.note}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {phase === "done" && (
          <ChapterOutro
            chapterId="soop"
            returnPath="/utsav/soop"
            headline="The soop is ready"
            scoreLine=""
            detail={misses === 0
              ? "Straight through, in the right order. Chhath ki hardik shubhkamnayein."
              : "Filled and ready. Chhath ki hardik shubhkamnayein."}
            onReplay={start}
          />
        )}
      </div>
    </section>
  );
}
