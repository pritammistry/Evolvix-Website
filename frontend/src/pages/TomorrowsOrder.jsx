import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, ClipboardList, Clock, LogIn, RotateCcw, Share2, Trophy } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { useAuth } from "../hooks/useAuth";
import { trackEvent } from "../components/AnalyticsTracker";
import {
  ITEMS,
  PICKS_PER_NIGHT,
  NIGHTS_PER_GAME,
  SECONDS_PER_NIGHT,
  buildGame,
  maxScoreFor,
  rankFor,
  scoreNight,
} from "../data/tomorrowsOrder";

// Each shelf item ends the night in one of four states, and the reveal shows
// all four — what you got right, what you wasted money on, and crucially what
// sold out while you weren't stocking it.
function itemState(id, night, picks) {
  const wanted = night.demand.includes(id);
  const picked = picks.includes(id);
  if (wanted && picked) return "sold";
  if (wanted) return "missed";
  if (picked) return "unsold";
  return "idle";
}

const STATE_TAG = { sold: "Sold out", missed: "Ran out", unsold: "Unsold" };

export default function TomorrowsOrder() {
  useSEO({
    title: "Tomorrow's Order — a shopkeeping game by Evolvix",
    description: "Rain tomorrow. A wedding two lanes over. What do you stock tonight? Read the signals and place tomorrow's order before the shutter comes down. Free with an Evolvix account.",
    path: "/playground/tomorrows-order",
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [nights, setNights] = useState([]);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState([]);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [nightScore, setNightScore] = useState(0);
  const [soldTotal, setSoldTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_NIGHT);
  const [copied, setCopied] = useState(false);

  const night = nights[index];

  const start = () => {
    setNights(buildGame());
    setIndex(0);
    setPicks([]);
    setLocked(false);
    setScore(0);
    setSoldTotal(0);
    setPhase("playing");
    trackEvent({ event_type: "game_start", label: "tomorrows-order" });
  };

  const toggle = (id) => {
    if (locked) return;
    setPicks((current) => {
      if (current.includes(id)) return current.filter((p) => p !== id);
      if (current.length >= PICKS_PER_NIGHT) return current;
      return [...current, id];
    });
  };

  // Locking is also what the clock does at zero, so a night always resolves —
  // with however few items the player managed to choose. The `locked` guard is
  // read from state rather than set inside an updater, so a double-invoked
  // render in StrictMode can't score the same night twice.
  const lockOrder = useCallback(() => {
    if (locked || !nights[index]) return;
    const sold = picks.filter((id) => nights[index].demand.includes(id)).length;
    const earned = scoreNight(sold, timeLeft);
    setNightScore(earned);
    setScore((s) => s + earned);
    setSoldTotal((t) => t + sold);
    setLocked(true);
  }, [locked, picks, nights, index, timeLeft]);

  const nextNight = () => {
    if (index + 1 >= nights.length) { setPhase("done"); return; }
    setIndex(index + 1);
    setPicks([]);
    setLocked(false);
  };

  // The clock is reset by the night on screen rather than by the handlers, so
  // a tier with a tighter limit gets its own time without threading it through.
  useEffect(() => {
    if (phase === "playing" && nights[index]) setTimeLeft(nights[index].seconds);
  }, [phase, index, nights]);

  useEffect(() => {
    if (phase !== "playing" || locked) return undefined;
    if (timeLeft <= 0) { lockOrder(); return undefined; }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, locked, timeLeft, lockOrder]);

  useEffect(() => {
    if (phase === "done") {
      trackEvent({ event_type: "game_complete", label: "tomorrows-order", metadata: { score, sold: soldTotal } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const totalItems = NIGHTS_PER_GAME * PICKS_PER_NIGHT;
  const rank = rankFor(score, maxScoreFor(nights));
  const shareText = `I scored ${score} at Tomorrow's Order — "${rank.title}" (${soldTotal}/${totalItems} sold out). Think you can read a shop day better? evolvixtech.in/playground/tomorrows-order`;

  const share = async () => {
    trackEvent({ event_type: "game_share", label: "tomorrows-order", metadata: { score } });
    if (navigator.share) {
      try { await navigator.share({ title: "Tomorrow's Order", text: shareText }); return; } catch { /* dismissed */ }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch { /* clipboard blocked — the WhatsApp link below still works */ }
  };

  return (
    <section className="section page-section mts-page" data-testid="tomorrows-order-page">
      <Link to="/playground" className="mts-back" data-testid="tmo-back-link">
        <ArrowLeft size={16} /> Back to Playground
      </Link>

      {!authLoading && !user && (
        <div className="mts-card mts-intro" data-testid="tmo-login-gate">
          <span className="mts-eyebrow"><ClipboardList size={14} /> Evolvix Playground</span>
          <h1>Tomorrow's Order</h1>
          <p className="mts-lede">
            You're closing the shop. Three things you noticed today tell you what
            tomorrow looks like. Stock the right shelves before the shutter comes down.
          </p>
          <p className="mts-lede">Sign in with a free Evolvix account to play and keep your score.</p>
          <button
            className="mts-primary"
            onClick={() => navigate("/login?next=/playground/tomorrows-order")}
            data-testid="tmo-login-button"
          >
            <LogIn size={17} /> Log in to play
          </button>
          <p className="mts-gate-note">
            No account yet? Creating one takes a minute and also unlocks the live
            demos and free downloads.
          </p>
        </div>
      )}

      {user && phase === "intro" && (
        <div className="mts-card mts-intro" data-testid="tmo-intro">
          <span className="mts-eyebrow"><ClipboardList size={14} /> Evolvix Playground</span>
          <h1>Tomorrow's Order</h1>
          <p className="mts-lede">
            Every shopkeeper guesses tomorrow before they lock up tonight. Rain in
            the forecast. A wedding two lanes over. A crew starting work on the
            corner plot. Read the signals and stock what will actually sell.
          </p>
          <ul className="mts-rules">
            <li><strong>{NIGHTS_PER_GAME} nights</strong>, and the signals get quieter each time.</li>
            <li><strong>Pick {PICKS_PER_NIGHT} items</strong> a night — exactly {PICKS_PER_NIGHT} of them sell out.</li>
            <li><strong>Money left on the shelf earns nothing.</strong> Neither does taking too long.</li>
          </ul>
          <button className="mts-primary" onClick={start} data-testid="tmo-start-button">
            Close the Shutter <ArrowRight size={17} />
          </button>
        </div>
      )}

      {user && phase === "playing" && night && (
        <div className="mts-card" data-testid="tmo-playing">
          <div className="mts-hud">
            <span data-testid="tmo-progress">Night {index + 1} / {nights.length}</span>
            <span className={`mts-clock${timeLeft <= 4 && !locked ? " mts-clock--urgent" : ""}`} data-testid="tmo-clock">
              <Clock size={14} /> {Math.max(0, timeLeft)}s
            </span>
            <span data-testid="tmo-score">{score}</span>
          </div>

          <div className="tmo-signals" data-testid="tmo-signals">
            <span className="tmo-signals-label">What you noticed today</span>
            {night.signals.map((signal) => (
              <p key={signal.text} className="tmo-signal">
                <span className="tmo-signal-icon" aria-hidden="true">{signal.icon}</span>
                {signal.text}
              </p>
            ))}
          </div>

          <div className="tmo-order-bar" data-testid="tmo-order-bar">
            <span>{locked ? "Tomorrow's takings" : `Stock up on ${PICKS_PER_NIGHT}`}</span>
            <span className="tmo-counter" data-testid="tmo-counter">
              {locked ? `+${nightScore}` : `${picks.length} / ${PICKS_PER_NIGHT}`}
            </span>
          </div>

          <div className="tmo-shelf" data-testid="tmo-shelf">
            {night.shelf.map((id) => {
              const item = ITEMS[id];
              // "open" only exists before the reveal: it is the plain, fully
              // legible shelf state. Dimming is reserved for the reveal, where
              // it means "nobody asked for this".
              const state = locked ? itemState(id, night, picks) : (picks.includes(id) ? "chosen" : "open");
              return (
                <button
                  key={id}
                  className={`tmo-item tmo-item--${state}`}
                  onClick={() => toggle(id)}
                  disabled={locked}
                  aria-pressed={picks.includes(id)}
                  data-testid={`tmo-item-${id}`}
                >
                  <span className="tmo-item-icon" aria-hidden="true">{item.icon}</span>
                  <span className="tmo-item-label">{item.label}</span>
                  {locked && STATE_TAG[state] && <span className="tmo-item-tag">{STATE_TAG[state]}</span>}
                </button>
              );
            })}
          </div>

          {!locked && (
            <button
              className="mts-primary tmo-lock"
              onClick={() => lockOrder()}
              disabled={picks.length < PICKS_PER_NIGHT}
              data-testid="tmo-lock-button"
            >
              Place the order <ArrowRight size={16} />
            </button>
          )}

          {locked && (
            <>
              <p className="mts-feedback" data-testid="tmo-verdict">
                <strong>{nightScore > 0 ? "Day's end." : "A quiet day."}</strong> {night.verdict}
              </p>
              <button className="mts-primary tmo-lock" onClick={nextNight} data-testid="tmo-next-button">
                {index + 1 >= nights.length ? "See the week" : "Next night"} <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      )}

      {user && phase === "done" && (
        <div className="mts-card mts-result" data-testid="tmo-result">
          <span className="mts-trophy"><Trophy size={26} /></span>
          <p className="mts-eyebrow">{rank.title}</p>
          <p className="mts-final-score" data-testid="tmo-final-score">{score}</p>
          <p className="mts-result-line">
            {soldTotal} of {totalItems} items sold out. {rank.line}
          </p>

          <div className="mts-result-actions">
            <button className="mts-primary" onClick={share} data-testid="tmo-share-button">
              <Share2 size={16} /> {copied ? "Copied — now paste it" : "Share your score"}
            </button>
            <a
              className="mts-secondary"
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="tmo-whatsapp-button"
            >
              Send on WhatsApp
            </a>
            <button className="mts-secondary" onClick={start} data-testid="tmo-replay-button">
              <RotateCcw size={16} /> Play again
            </button>
          </div>

          <div className="mts-pitch" data-testid="tmo-pitch">
            <p>
              <strong>Real shops guess this every night.</strong> The ones with a
              system don't — they look at what actually sold last Tuesday, last
              festival, last time it rained. That's the sort of thing we build.
            </p>
            <Link to="/demo" className="mts-pitch-link" data-testid="tmo-pitch-link">
              See what we've built <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
