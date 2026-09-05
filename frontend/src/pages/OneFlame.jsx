import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { trackEvent } from "../components/AnalyticsTracker";
import ChapterOutro from "../components/ChapterOutro";
import { chapterOpen, findChapter, seasonLive } from "../lib/utsav";

// One Flame — the Diwali chapter.
//
// The mechanic is the meaning of the festival, which is rare enough to be worth
// building around: one light becomes many, and the dark is pushed back. You
// start with a single lit diya and can only light what is within reach of
// something already burning, so the flame genuinely spreads rather than being
// painted on.
//
// The wind is what makes it a game. It sweeps in from one side and takes the
// lamps most exposed to it, so a careless player watches their own progress go
// out. It will never take the last flame — losing everything to a random gust
// is not a challenge, it is a reason to close the tab.
//
// Deliberately no firecrackers. They are contested enough in India that they
// would cost goodwill with part of the audience for no gain.

const REF = 520;
const REACH = 0.23;            // how far a flame can pass, as a fraction of the short side
const GUST_EVERY = [5.5, 9];   // seconds between gusts, randomised in this range

function rand(a, b) { return a + Math.random() * (b - a); }

// A rangoli of lamps: a centre, an inner ring and an outer ring. Laid out on
// rings rather than a grid because a courtyard rangoli is round, and because
// rings make "within reach" read naturally.
function buildLamps() {
  const lamps = [{ x: 0.5, y: 0.55, lit: true }];
  const rings = [{ n: 6, r: 0.17 }, { n: 10, r: 0.3 }, { n: 12, r: 0.42 }];
  rings.forEach((ring, ri) => {
    for (let i = 0; i < ring.n; i += 1) {
      const a = (i / ring.n) * Math.PI * 2 + (ri % 2 ? Math.PI / ring.n : 0);
      lamps.push({ x: 0.5 + Math.cos(a) * ring.r * 0.86, y: 0.55 + Math.sin(a) * ring.r * 0.62, lit: false });
    }
  });
  return lamps;
}

export default function OneFlame() {
  const chapter = findChapter("diya");
  useSEO({
    title: "One Flame — a Diwali game by Evolvix",
    description:
      "One lit diya, a dark courtyard and a wind that does not help. Spread the light to every lamp, then claim 15–40% off anything Evolvix makes.",
    path: "/utsav/diya",
  });

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(0);

  const [phase, setPhase] = useState("intro");   // intro | playing | done
  const [lit, setLit] = useState(1);
  const [total, setTotal] = useState(0);
  const [blownOut, setBlownOut] = useState(0);
  const [live] = useState(() => seasonLive() && chapterOpen(chapter));

  const reduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const gameRef = useRef({ lamps: [], sparks: [], gustAt: 0, gust: null, blown: 0, startedAt: 0 });

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const w = Math.max(280, Math.min(wrap.clientWidth, 620));
    const maxH = Math.max(380, window.innerHeight - 320);
    const h = Math.round(Math.min(w * 1.05, maxH));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  // `phase` is a dependency because the canvas does not exist on the intro
  // screen — without it fit() finds nothing and the canvas keeps its intrinsic
  // 300x150 default for the whole game.
  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit, phase]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  useEffect(() => {
    if (phase === "intro") return;
    if (phase === "playing" && wrapRef.current) {
      wrapRef.current.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
  }, [phase, reduced]);

  const start = () => {
    const g = gameRef.current;
    g.lamps = buildLamps();
    g.sparks = [];
    g.blown = 0;
    g.gust = null;
    g.startedAt = performance.now();
    g.gustAt = performance.now() + rand(...GUST_EVERY) * 1000;
    setLit(1);
    setTotal(g.lamps.length);
    setBlownOut(0);
    setPhase("playing");
    trackEvent({ event_type: "game_start", label: "one-flame" });
  };

  const finish = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase("done");
  }, []);

  const touch = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    const g = gameRef.current;
    const reach = REACH;

    let target = -1;
    let best = Infinity;
    g.lamps.forEach((l, i) => {
      if (l.lit) return;
      const d = Math.hypot(l.x - px, (l.y - py) * 0.8);
      if (d < best) { best = d; target = i; }
    });
    // Generous tap radius — these are small targets on a phone.
    if (target < 0 || best > 0.075) return;

    // Only reachable from something already burning: that is the whole game.
    const near = g.lamps.some((l, i) => l.lit && i !== target
      && Math.hypot(l.x - g.lamps[target].x, l.y - g.lamps[target].y) <= reach);
    if (!near) return;

    g.lamps[target].lit = true;
    for (let i = 0; i < (reduced ? 4 : 14); i += 1) {
      const a = rand(0, Math.PI * 2);
      g.sparks.push({ x: g.lamps[target].x, y: g.lamps[target].y, vx: Math.cos(a) * rand(0.02, 0.12), vy: Math.sin(a) * rand(0.02, 0.1) - 0.06, life: 1, size: rand(1.2, 2.8) });
    }
    const litNow = g.lamps.filter((l) => l.lit).length;
    setLit(litNow);
    if (litNow === g.lamps.length) finish();
  };

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let last = performance.now();

    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = gameRef.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const k = h / REF;
      const litCount = g.lamps.filter((l) => l.lit).length;
      const progress = litCount / g.lamps.length;

      // ── the wind ────────────────────────────────────────────────────────
      if (!g.gust && now >= g.gustAt) {
        const fromLeft = Math.random() < 0.5;
        g.gust = { x: fromLeft ? -0.2 : 1.2, dir: fromLeft ? 1 : -1, hit: false };
      }
      if (g.gust) {
        g.gust.x += g.gust.dir * dt * 0.85;
        // It takes the lamps it is passing over, but never the last flame —
        // being wiped out by chance is not a challenge.
        if (!g.gust.hit && ((g.gust.dir > 0 && g.gust.x > 0.45) || (g.gust.dir < 0 && g.gust.x < 0.55))) {
          g.gust.hit = true;
          const litOnes = g.lamps.map((l, i) => ({ l, i })).filter((o) => o.l.lit);
          if (litOnes.length > 2) {
            // The windward ones — those the gust reached first.
            litOnes.sort((a, b) => (g.gust.dir > 0 ? a.l.x - b.l.x : b.l.x - a.l.x));
            const take = Math.min(litOnes.length - 1, 1 + Math.floor(progress * 2));
            litOnes.slice(0, take).forEach((o) => { g.lamps[o.i].lit = false; g.blown += 1; });
            setLit(g.lamps.filter((l) => l.lit).length);
            setBlownOut(g.blown);
          }
        }
        if (g.gust.x > 1.3 || g.gust.x < -0.3) {
          g.gust = null;
          g.gustAt = now + rand(...GUST_EVERY) * 1000;
        }
      }

      // ── paint ───────────────────────────────────────────────────────────
      // The whole courtyard lifts out of the dark as more lamps catch, which is
      // the point of the festival and the point of the mechanic.
      const night = ctx.createLinearGradient(0, 0, 0, h);
      night.addColorStop(0, `rgb(${8 + progress * 26},${5 + progress * 12},${18 + progress * 14})`);
      night.addColorStop(1, `rgb(${14 + progress * 40},${7 + progress * 22},${16 + progress * 12})`);
      ctx.fillStyle = night;
      ctx.fillRect(-20, -20, w + 40, h + 40);

      // The rangoli under the lamps, readable only once there is light to see it.
      ctx.save();
      ctx.strokeStyle = `rgba(255,186,96,${0.05 + progress * 0.3})`;
      ctx.lineWidth = 1.2 * k;
      for (let ring = 1; ring <= 3; ring += 1) {
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.55, w * 0.145 * ring, h * 0.105 * ring, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + Math.cos(a) * w * 0.05, h * 0.55 + Math.sin(a) * h * 0.036);
        ctx.lineTo(w * 0.5 + Math.cos(a) * w * 0.43, h * 0.55 + Math.sin(a) * h * 0.31);
        ctx.stroke();
      }
      ctx.restore();

      // Reach hints: a soft halo around every lamp that could be lit next, so
      // the rule is visible rather than something to be worked out by failing.
      g.lamps.forEach((l) => {
        if (l.lit) return;
        const reachable = g.lamps.some((o) => o.lit && Math.hypot(o.x - l.x, o.y - l.y) <= REACH);
        if (!reachable) return;
        const pulse = 0.5 + 0.5 * Math.sin(now / 380);
        ctx.strokeStyle = `rgba(255,206,140,${0.18 + pulse * 0.22})`;
        ctx.lineWidth = 1.4 * k;
        ctx.beginPath();
        ctx.arc(l.x * w, l.y * h, 15 * k, 0, Math.PI * 2);
        ctx.stroke();
      });

      // ── the lamps ───────────────────────────────────────────────────────
      g.lamps.forEach((l, i) => {
        const x = l.x * w;
        const y = l.y * h;
        if (l.lit) {
          const flick = 0.82 + 0.18 * Math.sin(now / 90 + i * 2.3);
          const glow = ctx.createRadialGradient(x, y - 7 * k, 0, x, y - 7 * k, 46 * k * flick);
          glow.addColorStop(0, `rgba(255,224,150,${0.6 * flick})`);
          glow.addColorStop(0.4, `rgba(255,150,50,${0.2 * flick})`);
          glow.addColorStop(1, "rgba(255,110,20,0)");
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(x, y - 7 * k, 46 * k * flick, 0, Math.PI * 2); ctx.fill();
        }
        // The clay lamp: a shallow bowl with a pinched lip.
        ctx.fillStyle = l.lit ? "#a4552a" : "#4a2a20";
        ctx.beginPath();
        ctx.ellipse(x, y, 11 * k, 5 * k, 0, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = l.lit ? "#c2703a" : "#573026";
        ctx.beginPath();
        ctx.ellipse(x, y, 11 * k, 3.4 * k, 0, 0, Math.PI * 2);
        ctx.fill();
        if (l.lit) {
          const fl = 0.8 + 0.2 * Math.sin(now / 70 + i * 1.7);
          const wob = Math.sin(now / 130 + i) * 1.4 * k;
          ctx.fillStyle = "rgba(255,238,190,.95)";
          ctx.beginPath();
          ctx.moveTo(x - 2.6 * k, y - 2 * k);
          ctx.quadraticCurveTo(x + wob, y - 16 * k * fl, x + 2.6 * k, y - 2 * k);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(255,166,50,.75)";
          ctx.beginPath();
          ctx.moveTo(x - 4 * k, y - 1.5 * k);
          ctx.quadraticCurveTo(x + wob * 1.4, y - 22 * k * fl, x + 4 * k, y - 1.5 * k);
          ctx.closePath();
          ctx.fill();
        }
      });

      // ── the gust ────────────────────────────────────────────────────────
      if (g.gust) {
        const gx = g.gust.x * w;
        const band = ctx.createLinearGradient(gx - 90 * k, 0, gx + 90 * k, 0);
        band.addColorStop(0, "rgba(190,220,255,0)");
        band.addColorStop(0.5, "rgba(190,220,255,.16)");
        band.addColorStop(1, "rgba(190,220,255,0)");
        ctx.fillStyle = band;
        ctx.fillRect(gx - 90 * k, 0, 180 * k, h);
        ctx.strokeStyle = "rgba(210,232,255,.4)";
        ctx.lineWidth = 1.3 * k;
        for (let i = 0; i < 7; i += 1) {
          const yy = h * (0.15 + i * 0.11);
          ctx.beginPath();
          ctx.moveTo(gx - 70 * k * g.gust.dir, yy);
          ctx.quadraticCurveTo(gx, yy - 10 * k, gx + 60 * k * g.gust.dir, yy + 4 * k);
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      g.sparks = g.sparks.filter((p) => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += dt * 0.14; p.life -= dt * 1.3;
        if (p.life <= 0) return false;
        ctx.fillStyle = `rgba(255,${180 + Math.round(p.life * 60)},90,${p.life})`;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.size * k, 0, Math.PI * 2); ctx.fill();
        return true;
      });
      ctx.restore();

      // The win is decided in touch(); the loop only has to stop drawing.
      if (litCount === g.lamps.length) return;
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, reduced, finish]);

  if (!live) {
    return (
      <section className="section utv-page">
        <div className="utv-shell">
          <Link to="/utsav" className="utv-back"><ArrowLeft size={16} /> All three chapters</Link>
          <div className="utv-card">
            <span className="utv-bloom" aria-hidden="true">🪔</span>
            <h1>Not yet</h1>
            <p className="utv-lede">
              This chapter opens once you have finished Dhunuchi Naach. It will be
              waiting.
            </p>
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
        <span className="utv-eyebrow"><Sparkles size={13} /> DIWALI AT EVOLVIX</span>

        {phase === "intro" && (
          <div className="utv-card" data-testid="diya-intro">
            <span className="utv-bloom" aria-hidden="true">🪔</span>
            <h1>One Flame</h1>
            <p className="utv-lede">
              A dark courtyard and one lit diya. Light the rest —{" "}
              <strong>but a flame only passes to a lamp near one already burning</strong>,
              so the light has to spread rather than jump.
            </p>
            <ul className="utv-rules">
              <li><strong>Tap a lamp with a ring around it.</strong> The ring means it is close enough to catch.</li>
              <li><strong>The wind comes and goes.</strong> It takes the lamps most exposed to it — never your last one.</li>
              <li><strong>Light them all</strong> and the chapter is done.</li>
            </ul>
            <button className="utv-primary" onClick={start} data-testid="diya-start">
              Light the first one <ArrowRight size={17} />
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="utv-stage" ref={wrapRef} data-testid="diya-stage">
            <div className="utv-hud" data-testid="diya-hud">
              <span className="utv-hud-phase">{lit} of {total} lit</span>
              <span className="utv-judge utv-judge--missed">
                {blownOut ? `${blownOut} blown out` : ""}
              </span>
              <span className="utv-hud-right">
                <span className="utv-combo">{Math.round((lit / Math.max(total, 1)) * 100)}</span>
                <span className="utv-hud-label">%</span>
              </span>
            </div>
            <button
              className="utv-canvas-btn"
              onClick={(e) => touch(e.clientX, e.clientY)}
              aria-label="Light a lamp"
              data-testid="diya-canvas"
            >
              <canvas ref={canvasRef} className="utv-canvas" />
            </button>
            <p className="utv-fineprint">Tap any lamp with a ring around it.</p>
          </div>
        )}

        {phase === "done" && (
          <ChapterOutro
            chapterId="diya"
            returnPath="/utsav/diya"
            headline={blownOut === 0 ? "Not one lamp lost" : "The courtyard is lit"}
            scoreLine={`${total} lamps`}
            detail={blownOut === 0
              ? "You outran the wind completely."
              : `The wind took ${blownOut} along the way, and you lit them again.`}
            onReplay={start}
          />
        )}
      </div>
    </section>
  );
}
