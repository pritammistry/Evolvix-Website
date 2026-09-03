import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, RotateCcw, Share2, Sparkles } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { trackEvent } from "../components/AnalyticsTracker";
import { useFestivalOffer } from "../hooks/useFestivalOffer";
import { janmashtamiLive, JANMASHTAMI_ENDS_AT } from "../lib/janmashtami";

// Dahi Handi.
//
// The pot swings on a rope; one tap throws straight up from the centre. So the
// skill is not reflex but prediction — you release early, judging where the pot
// will be by the time the throw arrives. The rhythm is learnable within a
// couple of attempts, which is what makes it worth repeating.
//
// No account, no score kept anywhere, no server involved. Everything below runs
// in the page.

const HANDIS = [
  { yFrac: 0.34, amp: 0.15, speed: 1.45, r: 40 },
  { yFrac: 0.29, amp: 0.21, speed: 1.85, r: 36 },
  { yFrac: 0.24, amp: 0.26, speed: 2.25, r: 32 },
  { yFrac: 0.19, amp: 0.31, speed: 2.7, r: 29 },
  { yFrac: 0.15, amp: 0.35, speed: 3.15, r: 26 },
];

const LAUNCH_Y = 0.87;      // where the throw leaves from, as a fraction of height
const BALL_SPEED = 1.2;     // heights per second, so it feels identical at any size
const CLAY = "#c2673a";
const CLAY_DARK = "#8f421f";
const REF_H = 560;          // radii are authored against this height

function rand(a, b) { return a + Math.random() * (b - a); }

export default function DahiHandi() {
  useSEO({
    title: "Dahi Handi — a Janmashtami game by Evolvix",
    description: "The pot swings, you get one throw. Break five handis and see how few throws it takes. Free, no sign-up, playable in your browser.",
    path: "/janmashtami",
  });

  const offer = useFestivalOffer();
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  // Everything the loop touches lives in refs — putting the pot's position in
  // state would re-render the page sixty times a second.
  const stateRef = useRef({
    phase: "ready",       // ready | flying | breaking | done
    level: 0,
    t: 0,
    potY: 0,
    ball: null,
    parts: [],
    shake: 0,
    cheer: 0,
    stars: [],
    petals: [],
  });

  const [phase, setPhase] = useState("intro");   // intro | playing | done
  const [level, setLevel] = useState(0);
  const [throws, setThrows] = useState(0);
  const [flash, setFlash] = useState("");
  const [copied, setCopied] = useState(false);
  const [live] = useState(() => janmashtamiLive());

  const reduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const w = Math.max(260, Math.min(wrap.clientWidth, 520));
    const h = Math.round(w * 1.18);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = stateRef.current;
    if (!s.stars.length) {
      s.stars = Array.from({ length: 34 }, () => ({ x: Math.random(), y: rand(0.03, 0.55), r: rand(0.6, 1.7), p: Math.random() * 6 }));
      s.petals = Array.from({ length: reduced ? 4 : 12 }, () => ({ x: Math.random(), y: Math.random(), vy: rand(0.02, 0.06), sway: rand(0.4, 1.3), p: Math.random() * 6, s: rand(3, 6) }));
    }
  }, [reduced]);

  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const startLevel = (idx) => {
    const s = stateRef.current;
    s.level = idx;
    s.phase = "ready";
    s.ball = null;
    s.parts = [];
    s.potY = HANDIS[idx].yFrac;
    setLevel(idx);
  };

  const start = () => {
    setThrows(0);
    setFlash("");
    startLevel(0);
    setPhase("playing");
    trackEvent({ event_type: "game_start", label: "dahi-handi" });
  };

  const burst = (x, y, r) => {
    const s = stateRef.current;
    const n = reduced ? 10 : 1;
    for (let i = 0; i < 14 * n / (reduced ? 10 : 1) * (reduced ? 0.5 : 1); i += 1) {
      const a = rand(0, Math.PI * 2);
      s.parts.push({ kind: "shard", x, y, vx: Math.cos(a) * rand(40, 210), vy: Math.sin(a) * rand(40, 190) - 60, rot: rand(0, 6), vr: rand(-7, 7), size: rand(r * 0.16, r * 0.4), life: 1 });
    }
    for (let i = 0; i < (reduced ? 8 : 24); i += 1) {
      s.parts.push({ kind: "curd", x: x + rand(-r * .5, r * .5), y: y + rand(-r * .3, r * .5), vx: rand(-110, 110), vy: rand(-40, 130), size: rand(2.5, 7.5), life: 1 });
    }
    for (let i = 0; i < (reduced ? 5 : 16); i += 1) {
      s.parts.push({ kind: "petal", x: x + rand(-r, r), y: y + rand(-r, r), vx: rand(-70, 70), vy: rand(-150, -30), rot: rand(0, 6), vr: rand(-4, 4), size: rand(3.5, 7), life: 1, hue: rand(18, 48) });
    }
    s.shake = reduced ? 0 : 1;
    s.cheer = 1;
  };

  const throwBall = () => {
    const s = stateRef.current;
    if (s.phase !== "ready") return;
    const canvas = canvasRef.current;
    const h = canvas.clientHeight;
    s.ball = { x: 0.5, y: LAUNCH_Y, trail: [] };
    s.phase = "flying";
    setThrows((n) => n + 1);
    void h;
  };

  // One loop for the whole game. dt is clamped because rAF stops in a
  // background tab, and the first frame back would otherwise carry however long
  // the visitor was away and teleport everything.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const tick = (now) => {
      const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0;
      lastRef.current = now;
      const s = stateRef.current;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const cfg = HANDIS[s.level];
      const scale = H / REF_H;
      const potR = cfg.r * scale;

      s.t += dt;
      // The pot eases up to its height when a level begins, rather than jumping.
      s.potY += (cfg.yFrac - s.potY) * Math.min(1, dt * 4);
      const potX = 0.5 + cfg.amp * Math.sin(s.t * cfg.speed);

      if (s.phase === "flying" && s.ball) {
        s.ball.y -= BALL_SPEED * dt;
        s.ball.trail.unshift({ x: s.ball.x, y: s.ball.y });
        if (s.ball.trail.length > 10) s.ball.trail.pop();
        // Contact is judged at the pot's height: the throw goes straight up, so
        // the only question is where the pot has swung to by the time it lands.
        if (s.ball.y <= s.potY) {
          const gap = Math.abs(potX - 0.5) * W;
          if (gap <= potR * 1.05) {
            burst(potX * W, s.potY * H, potR);
            s.ball = null;
            s.phase = "breaking";
            setFlash("hit");
            const next = s.level + 1;
            setTimeout(() => {
              setFlash("");
              if (next >= HANDIS.length) { s.phase = "done"; setPhase("done"); return; }
              startLevel(next);
            }, 1250);
          } else {
            s.ball = null;
            s.phase = "ready";
            setFlash("miss");
            setTimeout(() => setFlash(""), 520);
          }
        }
      }

      // ── paint ──────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);
      const shakeX = s.shake > 0 ? rand(-4, 4) * s.shake : 0;
      const shakeY = s.shake > 0 ? rand(-4, 4) * s.shake : 0;
      s.shake = Math.max(0, s.shake - dt * 3.2);
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // night sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#120b2e");
      sky.addColorStop(0.55, "#1b1038");
      sky.addColorStop(1, "#2a1330");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // moon
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.12, 26 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,236,190,.16)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.12, 17 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,240,205,.55)";
      ctx.fill();

      // stars
      s.stars.forEach((st) => {
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(s.t * 1.6 + st.p));
        ctx.beginPath();
        ctx.arc(st.x * W, st.y * H, st.r * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,245,220,${0.25 + tw * 0.5})`;
        ctx.fill();
      });

      // drifting petals in the background
      s.petals.forEach((p) => {
        p.y += p.vy * dt;
        if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
        const px = (p.x + Math.sin(s.t * p.sway + p.p) * 0.02) * W;
        ctx.save();
        ctx.translate(px, p.y * H);
        ctx.rotate(Math.sin(s.t * p.sway + p.p) * 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.s * scale, p.s * 0.55 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,176,92,.22)";
        ctx.fill();
        ctx.restore();
      });

      // rope, with a slight curve so it reads as slack rather than a wire
      const px = potX * W;
      const py = s.potY * H;
      ctx.beginPath();
      ctx.moveTo(W * 0.5, 0);
      ctx.quadraticCurveTo((W * 0.5 + px) / 2, py * 0.45, px, py - potR * 0.9);
      ctx.strokeStyle = "rgba(255,214,150,.5)";
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // the handi
      if (s.phase !== "breaking" && s.phase !== "done") drawPot(ctx, px, py, potR, scale, s.t);

      // particles
      s.parts = s.parts.filter((p) => p.life > 0);
      s.parts.forEach((p) => {
        p.vy += 420 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * (p.kind === "curd" ? 0.8 : 0.6);
        if (p.rot !== undefined) p.rot += p.vr * dt;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.translate(p.x, p.y);
        if (p.kind === "shard") {
          ctx.rotate(p.rot);
          ctx.fillStyle = CLAY;
          ctx.beginPath();
          ctx.moveTo(-p.size, -p.size * .6);
          ctx.lineTo(p.size, -p.size * .3);
          ctx.lineTo(p.size * .4, p.size * .8);
          ctx.closePath();
          ctx.fill();
        } else if (p.kind === "curd") {
          ctx.fillStyle = "#fdfaf2";
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.rotate(p.rot);
          ctx.fillStyle = `hsl(${p.hue},92%,62%)`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * .55, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // the throw
      if (s.ball) {
        s.ball.trail.forEach((pt, i) => {
          ctx.beginPath();
          ctx.arc(pt.x * W, pt.y * H, (7 - i * 0.55) * scale, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,225,170,${0.32 - i * 0.03})`;
          ctx.fill();
        });
        ctx.beginPath();
        ctx.arc(s.ball.x * W, s.ball.y * H, 8 * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#fff6df";
        ctx.fill();
      }

      // thrower: a pair of hands reaching up from the crowd line
      drawGround(ctx, W, H, scale, s.t);

      // "Govinda" flourish on a break
      if (s.cheer > 0) {
        s.cheer = Math.max(0, s.cheer - dt * 0.9);
        ctx.save();
        ctx.globalAlpha = s.cheer;
        ctx.translate(W / 2, H * 0.5 - (1 - s.cheer) * 40 * scale);
        ctx.font = `800 ${Math.round(34 * scale)}px "Rajdhani","Space Grotesk",sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd479";
        ctx.fillText("Govinda", 0, 0);
        ctx.restore();
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); lastRef.current = 0; };
  }, [phase, reduced]);

  const perfect = throws === HANDIS.length;
  const shareText = `I broke all ${HANDIS.length} handis in ${throws} throws${perfect ? " — not one wasted" : ""}. Happy Janmashtami 🪈 Try it: evolvixtech.in/janmashtami`;

  const share = async () => {
    trackEvent({ event_type: "game_share", label: "dahi-handi", metadata: { throws } });
    if (navigator.share) {
      try { await navigator.share({ title: "Dahi Handi", text: shareText }); return; } catch { /* dismissed */ }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch { /* the WhatsApp link still works */ }
  };

  useEffect(() => {
    if (phase === "done") trackEvent({ event_type: "game_complete", label: "dahi-handi", metadata: { throws } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!live) {
    return (
      <section className="section page-section jnm-page" data-testid="janmashtami-page">
        <Link to="/playground" className="mts-back"><ArrowLeft size={16} /> Back to Playground</Link>
        <div className="jnm-card" data-testid="jnm-closed">
          <h1>This one has wrapped up</h1>
          <p className="jnm-lede">The Janmashtami game has finished for this year. There is more to play in the Playground.</p>
          <Link to="/playground" className="jnm-primary">Open the Playground <ArrowRight size={17} /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section page-section jnm-page" data-testid="janmashtami-page">
      <Link to="/playground" className="mts-back" data-testid="jnm-back-link">
        <ArrowLeft size={16} /> Back to Playground
      </Link>

      <span className="jnm-eyebrow"><Sparkles size={14} /> Janmashtami at Evolvix</span>

      {phase === "intro" && (
        <div className="jnm-card" data-testid="jnm-intro">
          <span className="jnm-pot" aria-hidden="true">🫕</span>
          <h1>Dahi Handi</h1>
          <p className="jnm-lede">
            The handi swings above you. You throw straight up, so the trick is
            letting go <strong>before</strong> the pot arrives — judge where it
            will be, not where it is.
          </p>
          <ul className="jnm-rules">
            <li><strong>Five handis</strong>, each hung higher and swinging faster.</li>
            <li><strong>Throw as often as you like.</strong> Nothing to lose but a count.</li>
            <li><strong>Five throws is perfect.</strong> Anything under ten is good.</li>
          </ul>
          <button className="jnm-primary" onClick={start} data-testid="jnm-start-button">
            Start throwing <ArrowRight size={17} />
          </button>
          <p className="jnm-fine">No sign-up, nothing saved. Just a game.</p>
        </div>
      )}

      {phase !== "intro" && (
        <div className="jnm-stage" ref={wrapRef} data-testid="jnm-stage">
          <div className="jnm-hud" data-testid="jnm-hud">
            <span>Handi {Math.min(level + 1, HANDIS.length)} / {HANDIS.length}</span>
            <span className="jnm-pips">
              {HANDIS.map((_, i) => (
                <i key={i} className={i < level ? "jnm-pip jnm-pip--done" : i === level ? "jnm-pip jnm-pip--now" : "jnm-pip"} />
              ))}
            </span>
            <span className="jnm-throws" data-testid="jnm-throws">{throws} {throws === 1 ? "throw" : "throws"}</span>
          </div>

          <button
            className={`jnm-canvas-btn${flash ? ` jnm-canvas-btn--${flash}` : ""}`}
            onClick={throwBall}
            disabled={phase === "done"}
            aria-label="Throw"
            data-testid="jnm-throw-button"
          >
            <canvas ref={canvasRef} className="jnm-canvas" />
            {phase === "playing" && (
              <span className="jnm-tap-hint" data-testid="jnm-hint">
                {flash === "miss" ? "Just missed — go again" : flash === "hit" ? "" : "Tap to throw"}
              </span>
            )}
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="jnm-card jnm-result" data-testid="jnm-result">
          <span className="jnm-pot" aria-hidden="true">🎉</span>
          <h2>{perfect ? "Not one throw wasted" : throws <= 8 ? "Cleanly done" : "All five down"}</h2>
          <p className="jnm-score" data-testid="jnm-final">{throws}<span>{throws === 1 ? " throw" : " throws"}</span></p>
          <p className="jnm-lede">
            {perfect
              ? "Five handis, five throws. That is as good as it gets."
              : `Five handis broken. Perfect is ${HANDIS.length} — worth another go.`}
          </p>

          <div className="jnm-actions">
            <button className="jnm-primary" onClick={start} data-testid="jnm-replay">
              <RotateCcw size={16} /> Play again
            </button>
            <button className="jnm-secondary" onClick={share} data-testid="jnm-share">
              <Share2 size={15} /> {copied ? "Copied — now paste it" : "Share your score"}
            </button>
            <a
              className="jnm-secondary"
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="jnm-whatsapp"
            >
              Send on WhatsApp
            </a>
          </div>

          {/* The Raksha Bandhan offer is still open, so it is worth a mention —
              and it disappears from here by itself when that campaign closes. */}
          {offer?.open && (
            <Link to="/rakhi" className="jnm-cross" data-testid="jnm-rakhi-cross">
              🎀 The Raksha Bandhan offer is still running — {offer.min_percent}–{offer.max_percent}% off everything
              <ArrowRight size={15} />
            </Link>
          )}

          <div className="jnm-pitch">
            <p><strong>We build things like this for businesses.</strong> Storefronts, apps, branded games and AI tools.</p>
            <Link to="/demo" className="jnm-pitch-link" data-testid="jnm-pitch-link">
              See what we have built <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

// A clay pot: rounded belly, narrow neck, flared rim, with a peacock feather
// tucked into it and a garland line across the middle.
function drawPot(ctx, x, y, r, scale, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 1.1) * 0.06);

  // feather
  ctx.save();
  ctx.translate(r * 0.32, -r * 0.95);
  ctx.rotate(0.5 + Math.sin(t * 1.4) * 0.06);
  ctx.strokeStyle = "#1f8f7a";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.92, r * 0.16, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#1f8f7a";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.94, r * 0.08, r * 0.13, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#0e3b57";
  ctx.fill();
  ctx.restore();

  // belly
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, "#d97c4a");
  g.addColorStop(0.55, CLAY);
  g.addColorStop(1, CLAY_DARK);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.1, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // neck and rim
  ctx.fillStyle = CLAY_DARK;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.72, r * 0.46, r * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e08a55";
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.8, r * 0.5, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // garland
  ctx.strokeStyle = "rgba(255,214,120,.85)";
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.12, r * 0.92, r * 0.3, 0, 0, Math.PI);
  ctx.stroke();

  // highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.12, r * 0.16, r * 0.3, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,.16)";
  ctx.fill();
  ctx.restore();
}

// The crowd line and two hands reaching up, so the throw has somewhere to come
// from rather than appearing out of the bottom edge.
function drawGround(ctx, W, H, scale, t) {
  const base = H * 0.93;
  ctx.fillStyle = "rgba(10,6,26,.85)";
  ctx.beginPath();
  ctx.moveTo(0, base + 12 * scale);
  for (let i = 0; i <= 10; i += 1) {
    const x = (i / 10) * W;
    ctx.lineTo(x, base + Math.sin(i * 1.7) * 5 * scale);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,200,130,.5)";
  ctx.lineWidth = 3.4 * scale;
  ctx.lineCap = "round";
  [-1, 1].forEach((side) => {
    const lift = Math.sin(t * 3 + side) * 4 * scale;
    ctx.beginPath();
    ctx.moveTo(W * 0.5 + side * 15 * scale, base + 6 * scale);
    ctx.lineTo(W * 0.5 + side * 9 * scale, base - 26 * scale + lift);
    ctx.stroke();
  });
}
