import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { trackEvent } from "../components/AnalyticsTracker";
import ChapterOutro from "../components/ChapterOutro";
import { chapterOpen, findChapter, seasonLive } from "../lib/utsav";

// Ghat Chalo — the Chhath chapter.
//
// The first version of this was a list you tapped in the right order, which is
// a quiz, not a game. This one is the procession: the soop rides on your head
// and the ghat is a long walk through a crowd at dusk.
//
// That choice also solves the problem this chapter has always had. Chhath is
// the most austere festival of the three — a thirty-six hour waterless fast,
// standing in a river at dawn — and the arghya is the act of worship itself.
// Scoring that would be the one thing in this campaign that could genuinely
// offend the people who keep it. The walk to the ghat is the opposite: it is
// communal, noisy and joyful, women singing the whole way. So the game is the
// procession, and the worship is left alone.
//
// Nobody fails. You always reach the water — the question is how much of the
// soop is still in it when you do.

const REF = 520;
const WALK_SECONDS = 38;
// Tuned by simulating the physics against a model of how a person actually
// plays — holding and releasing in bursts, which averages to proportional
// control, with a reaction delay. The first attempt was an inverted pendulum
// with a torque that reached 3.5 rad/s: it was unwinnable at every skill level,
// because one bump was worth more tilt than the whole allowance.
//
// The tray now wants to be level and the bumps knock it off. Doing nothing
// loses about four of the six; a slow hand loses about three; anyone reacting
// normally loses under one. Over-correcting late is worse than not correcting
// at all, which is exactly how carrying something on your head really behaves.
const MAX_TILT = 0.58;        // radians before something slides off
const RESTORE = 2.0;          // the tray's own tendency back to level
const INPUT_TORQUE = 3.0;
const VEL_DAMP = 0.5;         // velocity retained per second
const BUMP_EVERY = [1.5, 3.0];
const BUMP_FORCE = [0.6, 2.6];
const GRACE = 1.2;            // seconds of safety after a drop

const CARGO = [
  { id: "thekua", icon: "🍪", name: "Thekua", note: "Wheat flour, jaggery and ghee, pressed in a wooden mould." },
  { id: "sugarcane", icon: "🎋", name: "Sugarcane", note: "Whole stalks, tied into an arch above the soop." },
  { id: "coconut", icon: "🥥", name: "Coconut", note: "Offered whole, still in its husk." },
  { id: "banana", icon: "🍌", name: "Bananas", note: "A whole hand, never split into single fruit." },
  { id: "diya", icon: "🪔", name: "The diya", note: "Lit last, and carried to the water at dusk." },
  { id: "sindoor", icon: "🔴", name: "Sindoor", note: "Applied at the ghat, from the nose to the parting." },
];

function rand(a, b) { return a + Math.random() * (b - a); }

export default function SoopSajao() {
  const chapter = findChapter("soop");
  useSEO({
    title: "Ghat Chalo — a Chhath game by Evolvix",
    description:
      "The soop rides on your head and the ghat is a long walk. Keep it level through the crowd, then claim 15–40% off anything Evolvix makes.",
    path: "/utsav/soop",
  });

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(0);
  const inputRef = useRef(0);       // -1 lean left, +1 lean right, 0 nothing

  const [phase, setPhase] = useState("intro");   // intro | playing | done
  const [kept, setKept] = useState(CARGO.length);
  const [dropped, setDropped] = useState([]);
  const [progress, setProgress] = useState(0);
  const [live] = useState(() => seasonLive() && chapterOpen(chapter));

  const reduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const gameRef = useRef({
    angle: 0, vel: 0, cargo: [], startedAt: 0, bumpAt: 0, safeUntil: 0, walkers: [], spill: [], shake: 0,
  });

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const w = Math.max(280, Math.min(wrap.clientWidth, 620));
    const maxH = Math.max(380, window.innerHeight - 330);
    const h = Math.round(Math.min(w * 1.1, maxH));
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
    if (phase === "playing" && wrapRef.current) {
      wrapRef.current.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
  }, [phase, reduced]);

  const start = () => {
    const g = gameRef.current;
    g.angle = 0; g.vel = 0; g.shake = 0;
    g.cargo = CARGO.map((c) => ({ ...c }));
    g.spill = [];
    g.startedAt = performance.now();
    g.bumpAt = performance.now() + 1800;
    g.safeUntil = 0;
    g.walkers = Array.from({ length: 7 }, () => ({ x: Math.random(), s: rand(0.7, 1.1), p: Math.random() * 6 }));
    inputRef.current = 0;
    setKept(CARGO.length);
    setDropped([]);
    setProgress(0);
    setPhase("playing");
    trackEvent({ event_type: "game_start", label: "ghat-chalo" });
  };

  const finish = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase("done");
  }, []);

  // Held, not tapped: leaning is a continuous correction, so the control has to
  // be continuous too.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const down = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") inputRef.current = -1;
      if (e.key === "ArrowRight" || e.key === "d") inputRef.current = 1;
    };
    const up = (e) => {
      if (["ArrowLeft", "a", "ArrowRight", "d"].includes(e.key)) inputRef.current = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [phase]);

  const press = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    inputRef.current = clientX - rect.left < rect.width / 2 ? -1 : 1;
  };
  const release = () => { inputRef.current = 0; };

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
      const walked = Math.min(1, (now - g.startedAt) / 1000 / WALK_SECONDS);
      setProgress(walked);

      // ── balance ─────────────────────────────────────────────────────────
      // An inverted load: the further it leans the harder it wants to keep
      // leaning, which is what makes carrying anything on your head a skill.
      const safe = now < g.safeUntil;
      if (now >= g.bumpAt) {
        g.bumpAt = now + rand(...BUMP_EVERY) * 1000;
        // No fresh knock while she is still steadying from the last one.
        if (!safe) {
          g.vel += rand(-1, 1) * rand(...BUMP_FORCE);
          g.shake = reduced ? 0 : 4;
        }
      }
      // Holding left leans left: input of -1 has to reduce the angle, and in
      // the first version it increased it, so the controls were inverted.
      g.vel += (-Math.sin(g.angle) * RESTORE + inputRef.current * INPUT_TORQUE) * dt;
      g.vel *= Math.pow(VEL_DAMP, dt);
      g.angle += g.vel * dt;

      if (Math.abs(g.angle) > MAX_TILT && g.cargo.length && !safe) {
        const lost = g.cargo.pop();
        setKept(g.cargo.length);
        setDropped((d) => [...d, lost]);
        // Steadied, and briefly safe. Without this one bad swing cascades into
        // losing the whole tray in a second, which is where the fun goes.
        g.angle *= 0.15;
        g.vel = 0;
        g.safeUntil = now + GRACE * 1000;
        g.shake = reduced ? 0 : 9;
        for (let i = 0; i < (reduced ? 4 : 12); i += 1) {
          g.spill.push({ x: 0.5, y: 0.34, vx: rand(-0.25, 0.25), vy: rand(-0.1, 0.05), life: 1 });
        }
      }
      g.shake *= 0.88;

      // ── paint ───────────────────────────────────────────────────────────
      // Dusk over the river, walked into as the ghat comes closer.
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, `rgb(${28 + walked * 40},${18 + walked * 22},${52 - walked * 10})`);
      sky.addColorStop(0.5, `rgb(${112 + walked * 60},${52 + walked * 30},${58 + walked * 6})`);
      sky.addColorStop(0.72, `rgb(${196 + walked * 40},${104 + walked * 40},${52})`);
      sky.addColorStop(1, `rgb(${44 + walked * 20},${22 + walked * 12},${36})`);
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, w + 40, h + 40);

      // The sun going down over the water — the thing the whole festival is for.
      const sunY = h * (0.66 - walked * 0.04);
      const sunR = h * 0.075;
      const sg = ctx.createRadialGradient(w * 0.5, sunY, 0, w * 0.5, sunY, sunR * 4);
      sg.addColorStop(0, "rgba(255,226,150,.95)");
      sg.addColorStop(0.22, "rgba(255,168,70,.55)");
      sg.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(w * 0.5, sunY, sunR * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,214,132,.95)";
      ctx.beginPath(); ctx.arc(w * 0.5, sunY, sunR, 0, Math.PI * 2); ctx.fill();

      // River, with the sun laid across it.
      const waterTop = h * 0.68;
      ctx.fillStyle = `rgba(${60 + walked * 30},${34},${46},.9)`;
      ctx.fillRect(0, waterTop, w, h - waterTop);
      for (let i = 0; i < 16; i += 1) {
        const yy = waterTop + (i / 16) * (h - waterTop);
        const wob = Math.sin(now / 620 + i * 0.9) * (10 + i) * k;
        ctx.fillStyle = `rgba(255,${170 - i * 4},90,${0.3 - i * 0.016})`;
        ctx.fillRect(w * 0.5 - 30 * k + wob, yy, 60 * k + i * 3 * k, 2.4 * k);
      }

      // The crowd walking with you.
      g.walkers.forEach((wk) => {
        wk.x -= dt * 0.03 * wk.s;
        if (wk.x < -0.1) { wk.x = 1.1; wk.p = Math.random() * 6; }
        const px = wk.x * w;
        const py = h * 0.72 + Math.sin(now / 300 + wk.p) * 2 * k;
        const hh = 42 * k * wk.s;
        ctx.fillStyle = "rgba(26,10,22,.72)";
        ctx.beginPath(); ctx.ellipse(px, py - hh, 9 * k * wk.s, 9 * k * wk.s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(px, py, 15 * k * wk.s, hh, 0, Math.PI, 0); ctx.fill();
      });

      // ── the carrier ─────────────────────────────────────────────────────
      ctx.save();
      if (g.shake > 0.4) ctx.translate(rand(-g.shake, g.shake), rand(-g.shake, g.shake));
      const cx = w * 0.5;
      const feetY = h * 0.83;
      const unit = h * 0.055;
      const bob = Math.sin(now / 210) * unit * 0.06;

      ctx.strokeStyle = "rgba(20,8,18,.96)";
      ctx.fillStyle = "rgba(20,8,18,.96)";
      ctx.lineCap = "round";
      ctx.lineWidth = unit * 0.3;
      [-1, 1].forEach((side) => {
        const step = Math.sin(now / 210 + (side > 0 ? Math.PI : 0)) * unit * 0.42;
        ctx.beginPath();
        ctx.moveTo(cx, feetY - unit * 1.9 + bob);
        ctx.lineTo(cx + step, feetY);
        ctx.stroke();
      });
      // Sari, swinging opposite the step.
      ctx.beginPath();
      ctx.moveTo(cx - unit * 0.5, feetY - unit * 2.3 + bob);
      ctx.quadraticCurveTo(cx - Math.sin(now / 210) * unit * 0.3, feetY - unit * 0.5, cx + unit * 0.62, feetY - unit * 0.55);
      ctx.lineTo(cx - unit * 0.62, feetY - unit * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = unit * 0.42;
      ctx.beginPath();
      ctx.moveTo(cx, feetY - unit * 1.9 + bob);
      ctx.lineTo(cx, feetY - unit * 3.5 + bob);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, feetY - unit * 3.9 + bob, unit * 0.34, 0, Math.PI * 2);
      ctx.fill();
      // Both arms up steadying the tray, which is how it is actually carried.
      ctx.lineWidth = unit * 0.2;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(cx, feetY - unit * 3.3 + bob);
        ctx.quadraticCurveTo(cx + side * unit * 0.9, feetY - unit * 3.9 + bob, cx + side * unit * 0.7, feetY - unit * 4.5 + bob);
        ctx.stroke();
      });

      // ── the soop ────────────────────────────────────────────────────────
      const headY = feetY - unit * 4.35 + bob;
      ctx.save();
      ctx.translate(cx, headY);
      ctx.rotate(g.angle);
      const trayW = unit * 2.3;
      ctx.fillStyle = "#c79553";
      ctx.beginPath();
      ctx.ellipse(0, 0, trayW, unit * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(90,56,22,.8)";
      ctx.lineWidth = unit * 0.07;
      ctx.stroke();
      // Woven bamboo.
      ctx.strokeStyle = "rgba(120,78,32,.45)";
      ctx.lineWidth = unit * 0.035;
      for (let i = -3; i <= 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo((i / 3.6) * trayW, -unit * 0.3);
        ctx.lineTo((i / 3.6) * trayW, unit * 0.3);
        ctx.stroke();
      }
      // What is still in it.
      g.cargo.forEach((item, i) => {
        const slot = (i - (g.cargo.length - 1) / 2) * (trayW * 0.52);
        ctx.font = `${unit * 0.78}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(item.icon, slot, -unit * 0.28);
      });
      ctx.restore();

      if (safe) {
        ctx.strokeStyle = `rgba(150,230,190,${0.25 + 0.2 * Math.sin(now / 160)})`;
        ctx.lineWidth = 2 * k;
        ctx.beginPath();
        ctx.arc(cx, headY, unit * 3.1, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Tilt warning: the tray browning towards the edge of what it can hold.
      const risk = Math.min(1, Math.abs(g.angle) / MAX_TILT);
      if (risk > 0.55) {
        ctx.strokeStyle = `rgba(255,${Math.round(180 - risk * 120)},80,${(risk - 0.55) * 1.6})`;
        ctx.lineWidth = 2.5 * k;
        ctx.beginPath();
        ctx.arc(cx, headY, unit * 2.9, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      g.spill = g.spill.filter((p) => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += dt * 0.5; p.life -= dt * 1.1;
        if (p.life <= 0) return false;
        ctx.fillStyle = `rgba(255,200,120,${p.life})`;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 2.6 * k, 0, Math.PI * 2); ctx.fill();
        return true;
      });
      ctx.restore();

      // The ghat steps arriving from the right as the walk ends.
      if (walked > 0.72) {
        const inSight = (walked - 0.72) / 0.28;
        ctx.fillStyle = "rgba(38,18,30,.9)";
        for (let i = 0; i < 5; i += 1) {
          const sx = w * (1.05 - inSight * 0.55) + i * 14 * k;
          ctx.fillRect(sx, h * 0.7 + i * 9 * k, w * 0.5, 9 * k);
        }
      }

      if (walked >= 1) { finish(); return; }
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
            <h1>Ghat Chalo</h1>
            <p className="utv-lede">
              The soop rides on your head and the river is a long walk away. The
              crowd knocks, the road is uneven, and{" "}
<strong>a late correction is worse than none at all</strong>.
            </p>
            <ul className="utv-rules">
              <li><strong>Hold the left or right side</strong> of the picture to lean that way. Arrow keys work too.</li>
              <li><strong>Tilt too far and something slides off.</strong> You will be told what you lost.</li>
              <li><strong>You always reach the water.</strong> The only question is how much of the soop arrives with you.</li>
            </ul>
            <button className="utv-primary" onClick={start} data-testid="soop-start">
              Set off for the ghat <ArrowRight size={17} />
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="utv-stage" ref={wrapRef} data-testid="soop-stage">
            <div className="utv-hud" data-testid="soop-hud">
              <span className="utv-hud-phase">{kept} of {CARGO.length} still on the tray</span>
              <span className="utv-judge utv-judge--missed">
                {dropped.length ? `lost ${dropped[dropped.length - 1].name}` : ""}
              </span>
              <span className="utv-hud-right">
                <span className="utv-timer">{Math.round(progress * 100)}%</span>
              </span>
            </div>
            <button
              className="utv-canvas-btn"
              onMouseDown={(e) => press(e.clientX)}
              onMouseUp={release}
              onMouseLeave={release}
              onTouchStart={(e) => press(e.touches[0].clientX)}
              onTouchEnd={release}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Hold left or right to lean"
              data-testid="soop-canvas"
            >
              <canvas ref={canvasRef} className="utv-canvas" />
            </button>
            <p className="utv-fineprint">Hold the left or right side to lean. Let go to straighten.</p>
          </div>
        )}

        {phase === "done" && (
          <ChapterOutro
            chapterId="soop"
            returnPath="/utsav/soop"
            headline={kept === CARGO.length ? "Every last thing arrived" : kept === 0 ? "You reached the water" : "You reached the ghat"}
            scoreLine={`${kept} of ${CARGO.length} arrived`}
            detail={dropped.length
              ? `The road took ${dropped.map((d) => d.name.toLowerCase()).join(", ")}. Chhath ki hardik shubhkamnayein.`
              : "Not a thing lost on the way. Chhath ki hardik shubhkamnayein."}
            onReplay={start}
          />
        )}
      </div>
    </section>
  );
}
