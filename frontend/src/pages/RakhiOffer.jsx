import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Copy, Gift, LogIn, RotateCcw, Share2, Sparkles } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { useAuth } from "../hooks/useAuth";
import { trackEvent } from "../components/AnalyticsTracker";
import { claimFestivalOffer, fetchFestivalOffer } from "../api";
import { deadlineDate } from "../lib/campaign";

// Tie the Rakhi.
//
// A knot travels around the wrist; tap when it crosses the glowing thread. Three
// rounds, each faster and with a narrower target. A miss costs nothing but the
// round — this sits in front of an offer, so it must never become a wall that
// stops somebody reaching it.
//
// Nothing here decides the discount. The game only unlocks the ASK; the server
// rolls the percentage, ties it to the account and returns the code.

const ROUNDS = [
  { speed: 150, half: 26 }, // degrees per second, degrees of tolerance
  { speed: 205, half: 20 },
  { speed: 275, half: 15 },
];
const RING = 132;
const WON_KEY = "evolvix_rakhi_won";

// Shortest angular distance between two bearings, in degrees.
function angleGap(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

function polar(angleDeg, radius, cx = 160, cy = 160) {
  const r = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + Math.cos(r) * radius, cy + Math.sin(r) * radius];
}

// An SVG arc path centred on `mid`, spanning `half` degrees either side.
function arcPath(mid, half, radius) {
  const [x1, y1] = polar(mid - half, radius);
  const [x2, y2] = polar(mid + half, radius);
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${half * 2 > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

export default function RakhiOffer() {
  useSEO({
    title: "Raksha Bandhan — tie the rakhi, unwrap your discount",
    description: "Tie the rakhi and unwrap anything from 15% to 40% off everything at Evolvix. One code per person, yours for 7 days.",
    path: "/rakhi",
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("intro"); // intro | playing | won | claimed
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(90);
  const [flash, setFlash] = useState("");
  const [offer, setOffer] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [reveal, setReveal] = useState(0);

  const knotRef = useRef(null);
  const angleRef = useRef(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const roundRef = useRef(0);
  const targetRef = useRef(90);
  const lockRef = useRef(false);

  // The knot is animated by writing a transform straight to the node. Putting
  // the angle in state would re-render the whole page sixty times a second.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const tick = (now) => {
      // Clamped: rAF stops while the tab is in the background, so the first
      // frame after someone switches back carries a delta of however long they
      // were away. Unclamped, the knot would teleport to a random spot the
      // instant they returned.
      const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0;
      lastRef.current = now;
      angleRef.current = (angleRef.current + ROUNDS[roundRef.current].speed * dt) % 360;
      if (knotRef.current) {
        knotRef.current.setAttribute("transform", `rotate(${angleRef.current} 160 160)`);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, [phase]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Someone who already has a code should see it rather than replay the game.
  useEffect(() => {
    let alive = true;
    fetchFestivalOffer()
      .then(({ data }) => {
        if (!alive) return;
        setCampaign(data);
        if (data.claimed) {
          setOffer(data.claimed);
          setReveal(data.claimed.percent);
          setPhase("claimed");
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [user]);

  const newTarget = useCallback(() => {
    // Kept well away from the knot's current position so a round never opens
    // with the target already under the pointer.
    let next = Math.random() * 360;
    while (angleGap(next, angleRef.current) < 70) next = Math.random() * 360;
    targetRef.current = next;
    setTarget(next);
  }, []);

  const start = () => {
    roundRef.current = 0;
    angleRef.current = 0;
    setRound(0);
    setFlash("");
    setPhase("playing");
    newTarget();
    trackEvent({ event_type: "game_start", label: "tie-the-rakhi" });
  };

  const win = useCallback(() => {
    setPhase("won");
    try { sessionStorage.setItem(WON_KEY, "1"); } catch { /* private mode */ }
    trackEvent({ event_type: "game_complete", label: "tie-the-rakhi" });
  }, []);

  const tap = () => {
    if (phase !== "playing" || lockRef.current) return;
    const hit = angleGap(angleRef.current, targetRef.current) <= ROUNDS[roundRef.current].half;
    lockRef.current = true;
    if (hit) {
      const next = roundRef.current + 1;
      setFlash("hit");
      setTimeout(() => {
        setFlash("");
        lockRef.current = false;
        if (next >= ROUNDS.length) { win(); return; }
        roundRef.current = next;
        setRound(next);
        newTarget();
      }, 480);
    } else {
      setFlash("miss");
      setTimeout(() => {
        setFlash("");
        lockRef.current = false;
        newTarget();
      }, 520);
    }
  };

  const claim = useCallback(async () => {
    setClaiming(true);
    setError("");
    try {
      const { data } = await claimFestivalOffer();
      setOffer(data);
      setPhase("claimed");
      try { sessionStorage.removeItem(WON_KEY); } catch { /* private mode */ }
      trackEvent({ event_type: "offer_claimed", label: "rakhi", metadata: { percent: data.percent } });
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not get your code. Please try again.");
    } finally {
      setClaiming(false);
    }
  }, []);

  // Coming back from the login page: the win survived the round trip, so the
  // code appears without making anyone play a second time.
  useEffect(() => {
    if (authLoading || !user || phase === "claimed" || claiming) return;
    let won = false;
    try { won = sessionStorage.getItem(WON_KEY) === "1"; } catch { /* private mode */ }
    if (won || phase === "won") claim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // Counts the number up on reveal, because a number that lands is worth more
  // than a number that is simply printed.
  //
  // Driven by the clock, not by a frame count. Browsers throttle timers in a
  // background tab, and a frame-counted version stalls partway through — which
  // on this particular screen means showing someone a discount that is not the
  // one on their code. Reading elapsed time means a throttled tick jumps
  // straight to the true number instead of creeping towards it.
  useEffect(() => {
    if (phase !== "claimed" || !offer) return undefined;
    const DURATION = 900;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - startedAt) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      setReveal(Math.round(offer.percent * eased));
      if (p >= 1) clearInterval(id);
    }, 26);
    // Whatever happens to the timer, the true figure is on screen shortly after.
    const settle = setTimeout(() => setReveal(offer.percent), DURATION + 120);
    return () => { clearInterval(id); clearTimeout(settle); };
  }, [phase, offer]);

  const shareText = offer
    ? `I just tied a rakhi and unwrapped ${offer.percent}% off at Evolvix 🎁 Play and get your own — everyone wins something: evolvixtech.in/rakhi`
    : "Tie a rakhi, unwrap 15–40% off everything at Evolvix 🎁 Everyone wins something: evolvixtech.in/rakhi";

  const share = async () => {
    trackEvent({ event_type: "game_share", label: "rakhi" });
    if (navigator.share) {
      try { await navigator.share({ title: "Raksha Bandhan at Evolvix", text: shareText }); return; } catch { /* dismissed */ }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2400);
    } catch { /* the WhatsApp link still works */ }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch { /* they can read it off the screen */ }
  };

  const closed = campaign && !campaign.open && phase !== "claimed";

  return (
    <section className="section page-section rkh-page" data-testid="rakhi-page">
      <div className="rkh-shell">
        <span className="rkh-eyebrow" data-testid="rakhi-eyebrow">
          <Sparkles size={14} /> Raksha Bandhan at Evolvix
        </span>

        {closed ? (
          <div className="rkh-card" data-testid="rakhi-closed">
            <h1>This one has wrapped up</h1>
            <p className="rkh-lede">The Raksha Bandhan offer has closed. Keep an eye out — we do this every festival.</p>
            <Link to="/shop" className="rkh-primary">Browse the store <ArrowRight size={17} /></Link>
          </div>
        ) : (
          <>
            {phase === "intro" && (
              <div className="rkh-card" data-testid="rakhi-intro">
                <h1>Tie the rakhi.<br /><span className="rkh-grad">Unwrap your discount.</span></h1>
                <p className="rkh-lede">
                  Land the knot on the thread three times. Then we open a gift —
                  <strong> somewhere between 15% and 40% off</strong> everything we
                  make. Nobody walks away empty-handed.
                </p>
                <button className="rkh-primary" onClick={start} data-testid="rakhi-start">
                  <Gift size={18} /> Start tying
                </button>
                <p className="rkh-fineprint">
                  Thirty seconds to play. One code per person, good for up to three purchases over {campaign?.valid_days || 7} days
                  {campaign?.closes_at ? ` · offer closes ${deadlineDate(campaign.closes_at)}` : ""}.
                </p>
              </div>
            )}

            {phase === "playing" && (
              <div className="rkh-card rkh-card--play" data-testid="rakhi-playing">
                <div className="rkh-progress" data-testid="rakhi-progress">
                  {ROUNDS.map((_, i) => (
                    <span key={i} className={`rkh-pip${i < round ? " rkh-pip--done" : ""}${i === round ? " rkh-pip--now" : ""}`} />
                  ))}
                  <span className="rkh-progress-label">Knot {round + 1} of {ROUNDS.length}</span>
                </div>

                <button
                  className={`rkh-ring-btn${flash ? ` rkh-ring-btn--${flash}` : ""}`}
                  onClick={tap}
                  data-testid="rakhi-tap"
                  aria-label="Tap to tie the knot"
                >
                  <svg viewBox="0 0 320 320" className="rkh-ring" aria-hidden="true">
                    <circle cx="160" cy="160" r={RING} className="rkh-wrist" />
                    {[...Array(round)].map((_, i) => (
                      <circle key={i} cx="160" cy="160" r={RING - 10 - i * 9} className="rkh-tied" />
                    ))}
                    <path d={arcPath(target, ROUNDS[round].half, RING)} className="rkh-target" />
                    <g ref={knotRef} transform={`rotate(${angleRef.current} 160 160)`}>
                      <circle cx="160" cy={160 - RING} r="11" className="rkh-knot" />
                    </g>
                    <text x="160" y="152" className="rkh-ring-text">{flash === "hit" ? "Tied!" : flash === "miss" ? "Missed" : "TAP"}</text>
                    <text x="160" y="178" className="rkh-ring-sub">
                      {flash === "miss" ? "no penalty — go again" : flash === "hit" ? "" : "when the knot hits the thread"}
                    </text>
                  </svg>
                </button>
              </div>
            )}

            {phase === "won" && (
              <div className="rkh-card rkh-card--won" data-testid="rakhi-won">
                <span className="rkh-bloom" aria-hidden="true">🎀</span>
                <h1>Tied it!</h1>
                <p className="rkh-lede">
                  Your gift is wrapped. Sign in and we'll open it — it is worth
                  somewhere between <strong>15% and 40% off</strong>, and it is
                  yours either way.
                </p>
                {user ? (
                  <button className="rkh-primary" onClick={claim} disabled={claiming} data-testid="rakhi-claim">
                    <Gift size={18} /> {claiming ? "Opening…" : "Open my gift"}
                  </button>
                ) : (
                  <button
                    className="rkh-primary"
                    onClick={() => navigate("/login?next=/rakhi")}
                    data-testid="rakhi-login"
                  >
                    <LogIn size={17} /> Sign in to open it
                  </button>
                )}
                {error && <p className="rkh-error" data-testid="rakhi-error">{error}</p>}
                <p className="rkh-fineprint">
                  {user ? "One code per account." : "Takes a minute to create an account, and your gift is held for you."}
                </p>
              </div>
            )}

            {phase === "claimed" && offer && (
              <div className="rkh-card rkh-card--prize" data-testid="rakhi-claimed">
                <span className="rkh-bloom" aria-hidden="true">🎁</span>
                <p className="rkh-prize-label">You unwrapped</p>
                <p className="rkh-prize" data-testid="rakhi-percent">{reveal}<span>% off</span></p>
                <p className="rkh-lede">On everything — every product and every service we make.</p>

                <button className="rkh-code" onClick={copyCode} data-testid="rakhi-code">
                  <span>{offer.code}</span>
                  {copied ? <Check size={17} /> : <Copy size={16} />}
                </button>
                <p className="rkh-fineprint" data-testid="rakhi-expiry">
                  {copied ? "Copied. " : ""}Valid until {deadlineDate(offer.expires_at)}.
                </p>

                {/* Stated plainly, because all three of these get asked. */}
                <ul className="rkh-terms" data-testid="rakhi-terms">
                  <li>
                    <strong>Works on anything we sell.</strong> Every product in the
                    store and every service we offer — websites, apps, branding,
                    AI consulting and creative work. Not one category.
                  </li>
                  <li>
                    <strong>It is tied to your account.</strong> Sign in with this
                    same login and the discount is applied at checkout. Services are
                    quoted rather than bought online, so tell us the code when you
                    book one.
                  </li>
                  <li>
                    <strong>{offer.uses_left ?? offer.max_uses} of {offer.max_uses} uses left.</strong> Spend it
                    across any mix of products and services.
                  </li>
                </ul>

                <div className="rkh-actions">
                  <Link to="/shop" className="rkh-primary" data-testid="rakhi-shop">
                    Browse everything <ArrowRight size={17} />
                  </Link>
                  <button className="rkh-secondary" onClick={share} data-testid="rakhi-share">
                    <Share2 size={15} /> {shareCopied ? "Copied!" : "Challenge a friend"}
                  </button>
                  <a
                    className="rkh-secondary"
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="rakhi-whatsapp"
                  >
                    Send on WhatsApp
                  </a>
                </div>
              </div>
            )}
          </>
        )}

        {(phase === "intro" || phase === "playing") && (
          <button className="rkh-share-quiet" onClick={share} data-testid="rakhi-share-early">
            <Share2 size={14} /> {shareCopied ? "Link copied!" : "Share this with a brother or sister"}
          </button>
        )}

        {phase === "playing" && (
          <button className="rkh-share-quiet" onClick={start} data-testid="rakhi-restart">
            <RotateCcw size={14} /> Start over
          </button>
        )}
      </div>
    </section>
  );
}
