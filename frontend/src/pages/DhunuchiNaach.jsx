import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { trackEvent } from "../components/AnalyticsTracker";
import { useFestivalClaim } from "../hooks/useFestivalClaim";
import { FestivalPrize, FestivalWon } from "../components/FestivalPrize";
import { chapterOpen, findChapter, seasonLive } from "../lib/utsav";
import { APPROACH_MS, GOOD_MS, PERFECT_MS, PHASES, TOTAL_BEATS, buildSchedule, judgeStrike } from "../lib/dhunuchiBeat";

const REF = 520;             // art is authored against this height

// Dhunuchi Naach — Durga Puja chapter of the Puja season campaign.
//
// A rhythm game, which is a form none of the other Playground games use: Mind
// the Shop is interpretation, Tomorrow's Order is prediction, Rangoli is
// drawing, Dahi Handi is aim. This one is about time.
//
// The choice is not arbitrary. Dhunuchi naach is already a competition — pandals
// hold them every year — so scoring the dance is how the thing actually works
// rather than something imposed on a ritual. And the dhak genuinely accelerates
// towards a crescendo, so the difficulty curve is the real one.
//
// Everyone who finishes claims a code. The score is pride, not a gate: this is a
// campaign, and a discount nobody can reach is worth nothing to anyone.

function rand(a, b) { return a + Math.random() * (b - a); }

export default function DhunuchiNaach() {
  const chapter = findChapter("dhunuchi");
  useSEO({
    title: "Dhunuchi Naach — a Durga Puja game by Evolvix",
    description:
      "The dhak starts slow and does not stay slow. Dance the dhunuchi on the beat, then claim 15–40% off anything Evolvix makes. Free, playable in your browser.",
    path: "/utsav/dhunuchi",
  });

  const claimState = useFestivalClaim({ label: "dhunuchi-naach", returnPath: "/utsav/dhunuchi" });
  const { user, campaign, offer, claiming, error, reveal, claim, recordWin, loginPath } = claimState;

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(0);
  const audioRef = useRef(null);

  const [phase, setPhase] = useState("intro");   // intro | playing | done
  const [soundOn, setSoundOn] = useState(false);
  const [hits, setHits] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [judgement, setJudgement] = useState("");
  const [section, setSection] = useState(0);
  const [live] = useState(() => seasonLive() && chapterOpen(chapter));

  const reduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Everything the loop touches lives in refs. Putting the beat clock in state
  // would re-render the page sixty times a second.
  const gameRef = useRef({
    beats: [], endsAt: 0, startedAt: 0, next: 0,
    combo: 0, hits: 0, perfects: 0, best: 0,
    smoke: [], embers: [], petals: [], shake: 0, glow: 0, swing: 0,
  });
  // Kept out of the loop's dependency list on purpose: reading the section from
  // a ref means a tempo change does not tear the animation loop down and build
  // it again mid-dance.
  const sectionRef = useRef(0);

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const w = Math.max(280, Math.min(wrap.clientWidth, 620));
    // Bounded by the room actually left on screen, so the frame never runs past
    // the fold — the same trap the Janmashtami canvas fell into.
    const maxH = Math.max(380, window.innerHeight - 320);
    const h = Math.round(Math.min(w * 1.18, maxH));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = gameRef.current;
    if (!g.petals.length) {
      g.petals = Array.from({ length: reduced ? 5 : 16 }, () => ({
        x: Math.random(), y: Math.random(), vy: rand(0.018, 0.05), sway: rand(0.4, 1.2), p: Math.random() * 6, s: rand(3, 6.5),
      }));
    }
  }, [reduced]);

  // `phase` is a dependency because the canvas does not exist on the intro
  // screen. Without it fit() runs once, finds no element, returns early, and the
  // canvas keeps its intrinsic 300x150 default for the whole game.
  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit, phase]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Bring the panel that just appeared into view. Starting the game swaps the
  // intro card for the stage and the browser keeps its scroll offset, which
  // otherwise leaves the player looking at the wrong part of the page.
  useEffect(() => {
    if (phase === "intro") return;
    const el = phase === "playing" ? wrapRef.current : null;
    if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [phase, reduced]);

  // A synthesised dhak: a low body that drops in pitch, plus a slap of noise.
  // Synthesised rather than a sample so the page ships no audio asset, and
  // created only once the visitor has asked for sound.
  const thump = useCallback((accent) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(accent ? 150 : 118, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    gain.gain.setValueAtTime(accent ? 0.5 : 0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  }, []);

  const judge = useCallback((delta) => {
    const g = gameRef.current;
    const abs = Math.abs(delta);
    if (abs <= PERFECT_MS) {
      g.hits += 1; g.perfects += 1; g.combo += 1; g.glow = 1;
      g.shake = reduced ? 0 : 5;
      for (let i = 0; i < (reduced ? 5 : 16); i += 1) {
        const a = rand(0, Math.PI * 2);
        g.embers.push({ x: 0.5, y: 0.44, vx: Math.cos(a) * rand(0.04, 0.2), vy: Math.sin(a) * rand(0.04, 0.2) - 0.05, life: 1, size: rand(1.6, 3.6) });
      }
      setJudgement("Perfect");
    } else {
      g.hits += 1; g.combo += 1; g.glow = 0.6;
      setJudgement("Good");
    }
    if (g.combo > g.best) g.best = g.combo;
    setHits(g.hits); setPerfects(g.perfects); setCombo(g.combo); setBest(g.best);
  }, [reduced]);

  const miss = useCallback(() => {
    const g = gameRef.current;
    g.combo = 0;
    setCombo(0);
    setJudgement("Missed");
  }, []);

  const strike = useCallback(() => {
    const g = gameRef.current;
    if (!g.startedAt) return;
    const verdict = judgeStrike(g.beats, performance.now() - g.startedAt);
    if (verdict) {
      g.beats[verdict.index].judged = true;
      judge(verdict.delta);
    }
    g.swing = 1;
  }, [judge]);

  const finish = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase("done");
    recordWin();
  }, [recordWin]);

  const start = () => {
    const { beats, endsAt } = buildSchedule();
    const g = gameRef.current;
    g.beats = beats.map((b) => ({ ...b, judged: false, sounded: false }));
    g.endsAt = endsAt;
    g.startedAt = performance.now();
    g.combo = 0; g.hits = 0; g.perfects = 0; g.best = 0;
    g.smoke = []; g.embers = []; g.shake = 0; g.glow = 0; g.swing = 0;
    sectionRef.current = 0;
    setHits(0); setPerfects(0); setCombo(0); setBest(0); setJudgement(""); setSection(0);
    setPhase("playing");
    trackEvent({ event_type: "game_start", label: "dhunuchi-naach" });
  };

  const startWithSound = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      // Created inside the tap, which is the gesture browsers require.
      if (Ctx && !audioRef.current) audioRef.current = new Ctx();
      audioRef.current?.resume?.();
      setSoundOn(true);
    } catch { /* no audio available; the game is playable without it */ }
    start();
  };

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const onKey = (e) => {
      if (e.code === "Space" || e.key === " " || e.code === "Enter") { e.preventDefault(); strike(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, strike]);

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let last = performance.now();

    const loop = (now) => {
      // dt is clamped because rAF stops in a background tab, and the first frame
      // back would otherwise carry however long the visitor was away.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = gameRef.current;
      const t = now - g.startedAt;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const k = h / REF;

      // Beats that have gone past their window without a tap are misses, and
      // the sound plays off the same clock so audio cannot drift from visuals.
      let sec = 0;
      for (let i = 0; i < g.beats.length; i += 1) {
        const b = g.beats[i];
        if (!b.sounded && t >= b.t) {
          b.sounded = true;
          if (soundOn) thump(b.countIn || b.phase >= 2);
          g.swing = Math.max(g.swing, 0.55);
        }
        if (!b.judged && !b.countIn && t > b.t + GOOD_MS) { b.judged = true; miss(); }
        if (t >= b.t && !b.countIn) sec = b.phase;
      }
      if (sec !== sectionRef.current) { sectionRef.current = sec; setSection(sec); }

      g.shake *= 0.86;
      g.glow = Math.max(0, g.glow - dt * 1.8);
      g.swing = Math.max(0, g.swing - dt * 2.4);

      // ── paint ───────────────────────────────────────────────────────────
      ctx.save();
      if (g.shake > 0.4) ctx.translate(rand(-g.shake, g.shake), rand(-g.shake, g.shake));

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#1a0b24");
      sky.addColorStop(0.55, "#2c0f22");
      sky.addColorStop(1, "#160713");
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, w + 40, h + 40);

      // Pandal arch behind everything, so the frame reads as a place.
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "rgba(255,186,84,.34)";
      ctx.lineWidth = 2 * k;
      for (let i = 0; i < 3; i += 1) {
        const r = w * (0.42 + i * 0.13);
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.92, r, Math.PI * 1.06, Math.PI * 1.94);
        ctx.stroke();
      }
      ctx.restore();

      // Shiuli drifting through.
      ctx.fillStyle = "rgba(255,244,222,.62)";
      g.petals.forEach((p) => {
        p.y += p.vy * dt;
        if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
        const px = (p.x + Math.sin(t / 1000 * p.sway + p.p) * 0.03) * w;
        ctx.beginPath();
        ctx.ellipse(px, p.y * h, p.s * k * 1.5, p.s * k * 0.8, p.p, 0, Math.PI * 2);
        ctx.fill();
      });

      const cx = w / 2;
      const cy = h * 0.44;
      const R = Math.min(w, h) * 0.15;

      // Approach rings: one per upcoming beat, collapsing onto the target.
      g.beats.forEach((b) => {
        if (b.judged) return;
        const lead = b.t - t;
        if (lead > APPROACH_MS || lead < -GOOD_MS) return;
        const p = Math.max(0, lead / APPROACH_MS);
        const r = R * (1 + p * 2.4);
        ctx.strokeStyle = b.countIn ? "rgba(255,255,255,.3)" : `rgba(255,196,96,${0.22 + (1 - p) * 0.7})`;
        ctx.lineWidth = (b.countIn ? 1.6 : 2.6) * k;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // The target: the ember mouth of the dhunuchi.
      const pulse = 1 + g.glow * 0.16;
      const gl = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.5 * pulse);
      gl.addColorStop(0, `rgba(255,214,140,${0.5 + g.glow * 0.45})`);
      gl.addColorStop(0.5, `rgba(255,132,44,${0.22 + g.glow * 0.3})`);
      gl.addColorStop(1, "rgba(255,90,20,0)");
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.5 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,226,168,${0.65 + g.glow * 0.35})`;
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.arc(cx, cy, R * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Smoke, thicker the longer the combo runs — the visible reward for
      // staying on the beat.
      const density = reduced ? 0.5 : 1;
      if (Math.random() < (0.35 + Math.min(g.combo, 20) / 26) * density) {
        g.smoke.push({ x: 0.5 + rand(-0.03, 0.03), y: 0.44, vx: rand(-0.02, 0.02), vy: rand(-0.14, -0.07), life: 1, size: rand(10, 26) });
      }
      ctx.save();
      g.smoke = g.smoke.filter((s) => {
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 0.42; s.size += dt * 20;
        if (s.life <= 0) return false;
        ctx.fillStyle = `rgba(226,206,214,${s.life * 0.15})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size * k, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
      ctx.restore();

      // Embers thrown on a perfect strike. Additive, but only the embers —
      // making the whole scene additive bleaches it to white.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      g.embers = g.embers.filter((p) => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += dt * 0.16; p.life -= dt * 1.5;
        if (p.life <= 0) return false;
        ctx.fillStyle = `rgba(255,${170 + Math.round(p.life * 70)},90,${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.size * k, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
      ctx.restore();

      // The dancer, in silhouette. The swing is driven by the beat, so the
      // figure moves with the dhak rather than on a timer of its own.
      const sway = Math.sin(t / 240) * 0.5 + g.swing * 0.5;
      const baseY = h * 0.88;
      ctx.fillStyle = "rgba(12,4,14,.9)";
      ctx.beginPath();
      ctx.ellipse(cx, baseY, w * 0.2, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(14,5,16,.94)";
      ctx.lineCap = "round";
      ctx.lineWidth = 13 * k;
      ctx.beginPath();
      ctx.moveTo(cx, baseY - h * 0.02);
      ctx.lineTo(cx + sway * 6 * k, cy + R * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + sway * 8 * k, cy + R * 1.16, 13 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 9 * k;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(cx + sway * 6 * k, cy + R * 1.62);
        ctx.lineTo(cx + side * (R * 1.5 + sway * 10 * k), cy + R * 0.62);
        ctx.stroke();
        // The dhunuchi in each hand, still glowing between beats.
        const hx = cx + side * (R * 1.5 + sway * 10 * k);
        const hy = cy + R * 0.62;
        const hg = ctx.createRadialGradient(hx, hy, 1, hx, hy, 22 * k);
        hg.addColorStop(0, `rgba(255,206,130,${0.75 + g.glow * 0.25})`);
        hg.addColorStop(1, "rgba(255,110,30,0)");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(hx, hy, 22 * k, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      if (t >= g.endsAt) { finish(); return; }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, soundOn, reduced, thump, miss, finish]);

  const accuracy = Math.round((hits / TOTAL_BEATS) * 100);
  const verdict = accuracy >= 90 ? "The dhaki would be proud"
    : accuracy >= 70 ? "Well danced"
    : accuracy >= 45 ? "You found the beat"
    : "The dhak got away from you";

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/utsav` : "https://evolvixtech.in/utsav";
  const shareText = "I danced the dhunuchi and won a Puja discount from Evolvix. See if you can beat my combo.";

  if (!live) {
    return (
      <section className="section utv-page">
        <div className="utv-shell">
          <Link to="/playground" className="utv-back"><ArrowLeft size={16} /> Back to Playground</Link>
          <div className="utv-card">
            <span className="utv-bloom" aria-hidden="true">🪔</span>
            <h1>This one has finished</h1>
            <p className="utv-lede">
              The Puja season offer has closed. There is usually another one on the
              way — the Playground is where they appear.
            </p>
            <Link to="/playground" className="utv-primary">Open the Playground <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section utv-page">
      <div className="utv-shell">
        <Link to="/utsav" className="utv-back"><ArrowLeft size={16} /> All three chapters</Link>
        <span className="utv-eyebrow"><Sparkles size={13} /> DURGA PUJA AT EVOLVIX</span>

        {phase === "intro" && (
          <div className="utv-card" data-testid="dhunuchi-intro">
            <span className="utv-bloom" aria-hidden="true">🥁</span>
            <h1>Dhunuchi Naach</h1>
            <p className="utv-lede">
              The dhak sets the pace and the dancer follows. Strike when the ring
              closes on the embers — <strong>the beat gets faster, and it does not
              slow down again.</strong>
            </p>
            <ul className="utv-rules">
              <li><strong>Four counts to find the tempo</strong>, then thirty-eight beats.</li>
              <li><strong>Tap, click or press space.</strong> An extra strike costs nothing; a missed beat breaks your run.</li>
              {offer
                ? <li><strong>Your code is already yours.</strong> Playing again is for the fun of it — the discount does not change.</li>
                : <li><strong>Finish and the code is yours</strong> — 15% to 40% off, whatever your score.</li>}
            </ul>
            <div className="utv-startrow">
              <button className="utv-primary" onClick={startWithSound} data-testid="dhunuchi-start-sound">
                <Volume2 size={17} /> Play with the dhak
              </button>
              <button className="utv-secondary" onClick={start} data-testid="dhunuchi-start-muted">
                <VolumeX size={15} /> Play silently
              </button>
            </div>
            <p className="utv-fineprint">
              The rings are enough to play by, so sound is optional — pick silent
              if you are somewhere you would rather not be heard.
            </p>
          </div>
        )}

        {phase === "playing" && (
          <div className="utv-stage" ref={wrapRef} data-testid="dhunuchi-stage">
            <div className="utv-hud" data-testid="dhunuchi-hud">
              <span className="utv-hud-phase">{PHASES[section].name}</span>
              <span className={`utv-judge utv-judge--${judgement.toLowerCase() || "none"}`}>{judgement}</span>
              <span className="utv-hud-right">
                <span className="utv-combo" data-testid="dhunuchi-combo">{combo}</span>
                <span className="utv-hud-label">combo</span>
              </span>
            </div>
            <button
              className="utv-canvas-btn"
              onClick={strike}
              aria-label="Strike on the beat"
              data-testid="dhunuchi-strike"
            >
              <canvas ref={canvasRef} className="utv-canvas" />
            </button>
            <p className="utv-fineprint">Tap anywhere on the frame, or press space.</p>
          </div>
        )}

        {phase === "done" && !offer && (
          <>
            <div className="utv-card utv-card--score" data-testid="dhunuchi-score">
              <h2>{verdict}</h2>
              <p className="utv-score"><strong>{hits}</strong> of {TOTAL_BEATS} beats</p>
              <p className="utv-lede">
                {perfects} perfect, best run of {best} in a row.
              </p>
              <button className="utv-secondary" onClick={start} data-testid="dhunuchi-again">
                <RotateCcw size={15} /> Dance it again
              </button>
            </div>
            <FestivalWon
              claim={claim}
              claiming={claiming}
              error={error}
              user={user}
              loginPath={loginPath}
              headline="Your Puja gift is wrapped"
              lede={
                <>
                  It is worth somewhere between <strong>15% and 40% off</strong> anything
                  we make, it lasts the whole season, and it is yours whatever your score.
                </>
              }
            />
          </>
        )}

        {offer && phase !== "playing" && (
          <FestivalPrize offer={offer} reveal={reveal} shareText={shareText} shareUrl={shareUrl} />
        )}

        {campaign && !campaign.open && !offer && (
          <p className="utv-fineprint" data-testid="dhunuchi-closed">
            The offer has closed, but the game is still here to play.
          </p>
        )}
      </div>
    </section>
  );
}
