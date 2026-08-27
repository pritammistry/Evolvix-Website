import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, LogIn, RotateCcw, Share2, Store, Trophy } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { useAuth } from "../hooks/useAuth";
import { trackEvent } from "../components/AnalyticsTracker";
import { buildRounds, maxScoreFor, rankFor, ROUNDS_PER_GAME, SECONDS_PER_ROUND } from "../data/mindTheShop";

// Scoring: a correct answer is worth 100, plus 10 for every whole second left.
// Speed matters, but a slow correct answer still beats a fast wrong one. Harder
// rounds allow less time, so the ceiling per round varies — the maximum is
// computed from the actual rounds drawn rather than assumed.
const POINTS_CORRECT = 100;
const POINTS_PER_SECOND = 10;

// How long the reveal stays up before moving on. The explanation is the part
// that teaches, so this has to be long enough to actually read a sentence of
// it; players who don't want to wait can tap through.
const REVEAL_MS = 3600;

export default function MindTheShop() {
  useSEO({
    title: "Mind the Shop — a 60-second game by Evolvix",
    description: "Customers never say what they mean. Read between the lines and hand over the right thing before the timer runs out. Free with an Evolvix account.",
    path: "/playground/mind-the-shop",
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rounds, setRounds] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState(null);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_ROUND);
  const [copied, setCopied] = useState(false);
  const advanceTimer = useRef(null);

  const round = rounds[index];
  const revealed = picked !== null;

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const start = () => {
    const fresh = buildRounds();
    setRounds(fresh);
    setTimeLeft(fresh[0].seconds);
    setIndex(0);
    setScore(0);
    setCorrectCount(0);
    setPicked(null);
    setPhase("playing");
    trackEvent({ event_type: "game_start", label: "mind-the-shop" });
  };

  // The clock is set here, in the same batch as the index, rather than by an
  // effect watching the index. An effect runs a step too late: the new round
  // would render with the previous round's expired clock still at zero, and the
  // timer below would fire "time's up" and reveal the answer before the player
  // had seen the question.
  const next = useCallback(() => {
    if (index + 1 >= rounds.length) {
      setPhase("done");
      return;
    }
    setPicked(null);
    setIndex(index + 1);
    setTimeLeft(rounds[index + 1].seconds);
  }, [index, rounds]);

  // `answer` is called with null when the clock runs out, which scores zero but
  // still reveals the right item — being told the answer is the point.
  const answer = useCallback((option) => {
    if (picked !== null) return;
    const isCorrect = Boolean(option?.correct);
    setPicked(option ?? { label: "__timeout__" });
    if (isCorrect) {
      setScore((s) => s + POINTS_CORRECT + Math.max(0, timeLeft) * POINTS_PER_SECOND);
      setCorrectCount((c) => c + 1);
    }
    advanceTimer.current = setTimeout(next, REVEAL_MS);
  }, [picked, timeLeft, next]);

  // Tapping through cancels the pending auto-advance, so the two can't both
  // fire and skip a customer.
  const skipAhead = useCallback(() => {
    clearTimeout(advanceTimer.current);
    next();
  }, [next]);

  // One interval per round; cleared on answer so the clock stops on reveal.
  useEffect(() => {
    if (phase !== "playing" || revealed) return undefined;
    if (timeLeft <= 0) { answer(null); return undefined; }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, revealed, timeLeft, answer]);

  useEffect(() => {
    if (phase === "done") {
      trackEvent({ event_type: "game_complete", label: "mind-the-shop", metadata: { score, correct: correctCount } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const rank = rankFor(score, maxScoreFor(rounds.length ? rounds : []));
  const shareText = `I scored ${score} at Mind the Shop — "${rank.title}" (${correctCount}/${ROUNDS_PER_GAME} customers understood). Think you can read a customer better? evolvixtech.in/playground/mind-the-shop`;

  const share = async () => {
    trackEvent({ event_type: "game_share", label: "mind-the-shop", metadata: { score } });
    if (navigator.share) {
      try { await navigator.share({ title: "Mind the Shop", text: shareText }); return; } catch { /* dismissed */ }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch { /* clipboard blocked — the WhatsApp link below still works */ }
  };

  return (
    <section className="section page-section mts-page" data-testid="mind-the-shop-page">
      <Link to="/playground" className="mts-back" data-testid="mts-back-link">
        <ArrowLeft size={16} /> Back to Playground
      </Link>

      {!authLoading && !user && (
        <div className="mts-card mts-intro" data-testid="mts-login-gate">
          <span className="mts-eyebrow"><Store size={14} /> Evolvix Playground</span>
          <h1>Mind the Shop</h1>
          <p className="mts-lede">
            Customers never say what they actually want. Read between the lines,
            hand over the right thing, and beat the clock.
          </p>
          <p className="mts-lede">
            Sign in with a free Evolvix account to play and keep your score.
          </p>
          <button
            className="mts-primary"
            onClick={() => navigate("/login?next=/playground/mind-the-shop")}
            data-testid="mts-login-button"
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
        <div className="mts-card mts-intro" data-testid="mts-intro">
          <span className="mts-eyebrow"><Store size={14} /> Evolvix Playground</span>
          <h1>Mind the Shop</h1>
          <p className="mts-lede">
            You're behind the counter. Customers never say what they actually want —
            they say what's on their mind. Work out what they need and hand it over
            before the clock runs out.
          </p>
          <ul className="mts-rules">
            <li><strong>{ROUNDS_PER_GAME} customers</strong>, and they get harder as you go.</li>
            <li><strong>Less time on the tough ones</strong> — 12 seconds down to 8.</li>
            <li><strong>Faster is worth more</strong> — but a wrong answer is worth nothing.</li>
          </ul>
          <button className="mts-primary" onClick={start} data-testid="mts-start-button">
            Open the Shop <ArrowRight size={17} />
          </button>
        </div>
      )}

      {user && phase === "playing" && round && (
        <div className="mts-card" data-testid="mts-playing">
          <div className="mts-hud">
            <span data-testid="mts-progress">Customer {index + 1} / {rounds.length}</span>
            <span className={`mts-clock${timeLeft <= 3 && !revealed ? " mts-clock--urgent" : ""}`} data-testid="mts-clock">
              <Clock size={14} /> {Math.max(0, timeLeft)}s
            </span>
            <span data-testid="mts-score">{score}</span>
          </div>

          <div className="mts-bubble" data-testid="mts-request">
            <span className="mts-bubble-face" aria-hidden="true">🧑</span>
            <p>{round.request}</p>
          </div>

          <div className="mts-shelf" data-testid="mts-options">
            {round.options.map((option) => {
              let state = "";
              if (revealed) {
                if (option.correct) state = " mts-item--right";
                else if (picked?.label === option.label) state = " mts-item--wrong";
                else state = " mts-item--dim";
              }
              return (
                <button
                  key={option.label}
                  className={`mts-item${state}`}
                  onClick={() => answer(option)}
                  disabled={revealed}
                  data-testid={`mts-option-${option.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                >
                  <span className="mts-item-icon" aria-hidden="true">{option.icon}</span>
                  <span className="mts-item-label">{option.label}</span>
                </button>
              );
            })}
          </div>

          {revealed && (
            <>
              <p className="mts-feedback" data-testid="mts-feedback">
                {picked?.correct
                  ? <><strong>Right — {round.options.find((o) => o.correct).label.toLowerCase()}.</strong> {round.note}</>
                  : <><strong>They wanted the {round.options.find((o) => o.correct).label.toLowerCase()}.</strong> {round.note}</>}
              </p>
              <button className="mts-skip" onClick={skipAhead} data-testid="mts-skip-button">
                {index + 1 >= rounds.length ? "See your score" : "Next customer"} <ArrowRight size={15} />
              </button>
            </>
          )}
        </div>
      )}

      {user && phase === "done" && (
        <div className="mts-card mts-result" data-testid="mts-result">
          <span className="mts-trophy"><Trophy size={26} /></span>
          <p className="mts-eyebrow">{rank.title}</p>
          <p className="mts-final-score" data-testid="mts-final-score">{score}</p>
          <p className="mts-result-line">
            {correctCount} of {ROUNDS_PER_GAME} customers left happy. {rank.line}
          </p>

          <div className="mts-result-actions">
            <button className="mts-primary" onClick={share} data-testid="mts-share-button">
              <Share2 size={16} /> {copied ? "Copied — now paste it" : "Share your score"}
            </button>
            <a
              className="mts-secondary"
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="mts-whatsapp-button"
            >
              Send on WhatsApp
            </a>
            <button className="mts-secondary" onClick={start} data-testid="mts-replay-button">
              <RotateCcw size={16} /> Play again
            </button>
          </div>

          <div className="mts-pitch" data-testid="mts-pitch">
            <p><strong>Enjoyed that?</strong> We build things like this for businesses — branded games, storefronts, booking systems and apps.</p>
            <Link to="/demo" className="mts-pitch-link" data-testid="mts-pitch-link">
              See what we've built <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
