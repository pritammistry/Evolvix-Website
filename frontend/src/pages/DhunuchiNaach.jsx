import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { trackEvent } from "../components/AnalyticsTracker";
import { useFestivalOffer } from "../hooks/useFestivalOffer";
import ChapterOutro from "../components/ChapterOutro";
import { chapterOpen, findChapter, seasonLive } from "../lib/utsav";
import { DhakKit } from "../lib/dhakAudio";
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
// Finishing this chapter unlocks the next one. The code arrives only once all
// three are done, and the score is pride rather than a gate — this is a
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

  // Read-only here: claiming belongs to ChapterOutro, and running the claim
  // hook in both places would fetch the campaign twice on every mount.
  const campaign = useFestivalOffer();
  const offer = campaign?.claimed;

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
    if (!g.puff) {
      // One soft sprite, rendered once and reused for every puff. Building a
      // radial gradient per particle per frame would cost far more than it is
      // worth at a few hundred particles.
      const make = (r, gr, b) => {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const cc = c.getContext("2d");
        const grad = cc.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, `rgba(${r},${gr},${b},.85)`);
        grad.addColorStop(0.45, `rgba(${r},${gr},${b},.34)`);
        grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
        cc.fillStyle = grad;
        cc.fillRect(0, 0, 64, 64);
        return c;
      };
      g.puff = make(214, 198, 196);        // cool, for smoke that has risen
      g.puffWarm = make(255, 196, 132);    // lit by the coals, near the pot
    }
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

  // The kit is built on the visitor's tap, which is the gesture browsers
  // require before any audio may start, and torn down with the page.
  useEffect(() => () => { audioRef.current?.close?.(); }, []);

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

  // Muting mid-dance without stopping the routine: the beats stay scheduled so
  // the rhythm does not shift, they simply stop being audible.
  const mute = useCallback(() => {
    const kit = audioRef.current;
    if (kit) kit.master.gain.value = 0;
    setSoundOn(false);
  }, []);

  const finish = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    // Anything still scheduled would otherwise keep drumming over the result.
    audioRef.current?.stop();
    setPhase("done");
    // ChapterOutro records the completion and decides whether the season is
    // finished — this only has to stop the game.
  }, []);

  const start = () => {
    const { beats, endsAt } = buildSchedule();
    const g = gameRef.current;
    g.beats = beats.map((b) => ({ ...b, judged: false, sounded: false }));
    g.endsAt = endsAt;
    g.startedAt = performance.now();
    // Scheduled against the AudioContext clock rather than fired frame by
    // frame, so the rhythm cannot drift when the renderer stutters.
    const kit = audioRef.current;
    if (kit) {
      kit.stop();
      kit.master.gain.value = soundOn ? 0.9 : 0;
      kit.schedule(g.beats, kit.now + 0.06);
    }
    g.combo = 0; g.hits = 0; g.perfects = 0; g.best = 0;
    g.embers = []; g.shake = 0; g.glow = 0; g.swing = 0;
    // Pre-aged puffs, so the pot is already smoking when the routine starts —
    // a dhunuchi is lit well before anybody dances with it.
    g.smoke = Array.from({ length: 70 }, () => {
      const life = 0.15 + Math.random() * 0.85;
      return {
        x: 0.5 + rand(-0.02, 0.02), y: 0.38 - (1 - life) * 0.3,
        vx: rand(-0.014, 0.014), vy: rand(-0.26, -0.15),
        life, size: 7 + (1 - life) * 60, seed: Math.random() * 10,
      };
    });
    sectionRef.current = 0;
    setHits(0); setPerfects(0); setCombo(0); setBest(0); setJudgement(""); setSection(0);
    setPhase("playing");
    trackEvent({ event_type: "game_start", label: "dhunuchi-naach" });
  };

  const startWithSound = () => {
    try {
      if (!audioRef.current) audioRef.current = new DhakKit();
      audioRef.current.resume();
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
          // Sound is already scheduled on the audio clock; this only drives the
          // dancer, so the figure moves on the beat even when muted.
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

      const cx = w / 2;
      const cy = h * 0.38;                 // the raised dhunuchi, and the target
      const R = Math.min(w, h) * 0.082;
      const floorY = h * 0.86;
      // The whole scene is lit by the embers, so light level drives colour
      // everywhere rather than each element glowing on its own.
      const lit = 0.55 + g.glow * 0.45;

      // Pandal interior: a draped ceiling falling to a lit floor.
      const room = ctx.createLinearGradient(0, 0, 0, h);
      room.addColorStop(0, "#25091f");
      room.addColorStop(0.42, "#3a1020");
      room.addColorStop(0.8, "#200a16");
      room.addColorStop(1, "#12060f");
      ctx.fillStyle = room;
      ctx.fillRect(-20, -20, w + 40, h + 40);

      // Cloth drapes gathered at the ceiling — the scalloped roof every pandal has.
      ctx.fillStyle = "rgba(96,18,42,.55)";
      const scallops = 7;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 0; i <= scallops; i += 1) {
        const x0 = (i / scallops) * w;
        ctx.quadraticCurveTo(x0 + w / scallops / 2, h * 0.115, x0 + w / scallops, 0);
      }
      ctx.lineTo(w, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,196,110,.3)";
      ctx.lineWidth = 1.4 * k;
      ctx.stroke();

      // A string of lamps along the drape line.
      for (let i = 0; i <= scallops; i += 1) {
        const x0 = (i / scallops) * w + w / scallops / 2;
        const y0 = h * 0.113;
        const tw = 0.6 + 0.4 * Math.sin(t / 420 + i);
        const lg = ctx.createRadialGradient(x0, y0, 0, x0, y0, 16 * k);
        lg.addColorStop(0, `rgba(255,214,140,${0.85 * tw})`);
        lg.addColorStop(1, "rgba(255,150,40,0)");
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(x0, y0, 16 * k, 0, Math.PI * 2); ctx.fill();
      }

      // The idol behind the dancer: a silhouetted crown and halo, kept vague on
      // purpose — suggesting the deity rather than drawing her.
      ctx.save();
      ctx.globalAlpha = 0.5;
      const halo = ctx.createRadialGradient(cx, h * 0.36, R * 0.4, cx, h * 0.36, R * 3.4);
      halo.addColorStop(0, `rgba(255,190,96,${0.2 * lit})`);
      halo.addColorStop(1, "rgba(255,150,40,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, h * 0.36, R * 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(40,8,26,.85)";
      ctx.beginPath();
      ctx.moveTo(cx - R * 1.5, h * 0.3);
      for (let i = 0; i < 7; i += 1) {
        const px = cx - R * 1.5 + (i / 6) * R * 3;
        ctx.lineTo(px, h * 0.3 - (i % 2 ? R * 0.55 : R * 0.28));
        ctx.lineTo(px + R * 0.25, h * 0.3);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();

      // Floor, catching the ember light.
      const fl = ctx.createLinearGradient(0, floorY - h * 0.05, 0, h);
      fl.addColorStop(0, `rgba(120,44,20,${0.22 * lit})`);
      fl.addColorStop(1, "rgba(10,4,8,0)");
      ctx.fillStyle = fl;
      ctx.fillRect(0, floorY - h * 0.05, w, h * 0.25);

      // Crowd at the edge of the light.
      ctx.fillStyle = "rgba(8,3,10,.8)";
      for (let i = 0; i < 11; i += 1) {
        const px = (i / 10) * w + Math.sin(i * 3.1) * 8 * k;
        const hh = (18 + (i % 3) * 7) * k;
        ctx.beginPath();
        ctx.arc(px, h * 0.955 - hh, 7.5 * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px, h * 0.985, 13 * k, hh, 0, Math.PI, 0);
        ctx.fill();
      }

      // Shiuli drifting through the light.
      g.petals.forEach((p) => {
        p.y += p.vy * dt;
        if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
        const px = (p.x + Math.sin(t / 1000 * p.sway + p.p) * 0.03) * w;
        ctx.fillStyle = `rgba(255,244,222,${0.28 + 0.3 * lit})`;
        ctx.beginPath();
        ctx.ellipse(px, p.y * h, p.s * k * 1.5, p.s * k * 0.8, p.p, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── the dancer ──────────────────────────────────────────────────────
      // Proportions are set from the floor rather than from the pot, so the
      // figure stays human at any canvas size. Hips and shoulders counter-
      // rotate and the knees give on each stroke, which is what separates a
      // dancing figure from a swinging stick.
      const beatPhase = g.swing;
      const sway = Math.sin(t / 300);
      const unit = (floorY - cy) / 5.4;            // one head-height, roughly
      const hipY = floorY - unit * 2.05 + beatPhase * unit * 0.1;
      const shoulderY = floorY - unit * 3.55 + beatPhase * unit * 0.07;
      const headY = floorY - unit * 4.15;
      const hipX = cx + sway * unit * 0.22;
      const shoulderX = cx - sway * unit * 0.16;

      // Drawn twice: once fat in warm light for the rim the embers throw, then
      // dark on top. Without the rim the figure is black on a dark ground and
      // simply disappears.
      const limbs = (stroke, widthMul) => {
        ctx.strokeStyle = stroke;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.lineWidth = unit * 0.3 * widthMul;
        [-1, 1].forEach((side) => {
          const kneeX = hipX + side * unit * (0.52 + sway * side * 0.12);
          const kneeY = hipY + unit * 1.02;
          const footX = hipX + side * unit * 0.82;
          ctx.beginPath();
          ctx.moveTo(hipX, hipY);
          ctx.quadraticCurveTo(kneeX, kneeY, footX, floorY);
          ctx.stroke();
        });

        ctx.lineWidth = unit * 0.42 * widthMul;
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(shoulderX, shoulderY);
        ctx.stroke();

        // Right arm reaching the raised pot, left arm out low with the second.
        ctx.lineWidth = unit * 0.24 * widthMul;
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.quadraticCurveTo(shoulderX + unit * 0.95, shoulderY - unit * 0.5, cx, cy + R * 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.quadraticCurveTo(shoulderX - unit * 1.05, shoulderY + unit * 0.5, lowX, lowY - R * 0.5);
        ctx.stroke();
      };

      const lowX = cx - unit * 2.0 - sway * unit * 0.2;
      const lowY = floorY - unit * 2.5;

      ctx.save();
      // Rim first, at a wider stroke, in the colour of the firelight.
      limbs(`rgba(255,150,64,${0.34 + g.glow * 0.3})`, 1.5);
      limbs("rgba(26,9,14,.97)", 1);

      // Dhoti, flaring with the movement.
      ctx.fillStyle = "rgba(26,9,14,.97)";
      ctx.beginPath();
      ctx.moveTo(hipX - unit * 0.4, hipY - unit * 0.12);
      ctx.quadraticCurveTo(hipX + sway * unit * 0.3, hipY + unit * 0.95, hipX + unit * 0.62, hipY + unit * 0.8);
      ctx.lineTo(hipX - unit * 0.66, hipY + unit * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(255,150,64,${0.28 + g.glow * 0.24})`;
      ctx.lineWidth = unit * 0.05;
      ctx.stroke();

      // Head, with the firelight catching one side of it.
      ctx.fillStyle = "rgba(26,9,14,.97)";
      ctx.beginPath();
      ctx.arc(shoulderX - sway * unit * 0.05, headY, unit * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,160,70,${0.4 + g.glow * 0.3})`;
      ctx.lineWidth = unit * 0.06;
      ctx.beginPath();
      ctx.arc(shoulderX - sway * unit * 0.05, headY, unit * 0.32, Math.PI * 1.15, Math.PI * 1.95);
      ctx.stroke();
      ctx.restore();

      // ── the dhunuchi ────────────────────────────────────────────────────
      // A real dhunuchi is a stemmed clay cone: wide ember bowl, pinched waist,
      // flared foot. Drawing it properly is most of what makes the frame read
      // as a pandal rather than as a diagram.
      const drawDhunuchi = (x, y, r, glowLevel) => {
        ctx.save();
        // Heat and smoke light spilling upward.
        const spill = ctx.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y - r * 0.2, r * 3.2);
        spill.addColorStop(0, `rgba(255,206,132,${0.4 * glowLevel})`);
        spill.addColorStop(0.4, `rgba(255,124,40,${0.16 * glowLevel})`);
        spill.addColorStop(1, "rgba(255,90,20,0)");
        ctx.fillStyle = spill;
        ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 3.2, 0, Math.PI * 2); ctx.fill();

        // Clay body.
        const clay = ctx.createLinearGradient(x - r, y, x + r, y + r * 1.8);
        clay.addColorStop(0, "#7d3a1c");
        clay.addColorStop(0.45, "#b5602f");
        clay.addColorStop(1, "#5d2712");
        ctx.fillStyle = clay;
        ctx.beginPath();
        ctx.moveTo(x - r, y);
        ctx.lineTo(x - r * 0.24, y + r * 1.05);
        ctx.lineTo(x - r * 0.24, y + r * 1.35);
        ctx.lineTo(x - r * 0.72, y + r * 1.75);
        ctx.lineTo(x + r * 0.72, y + r * 1.75);
        ctx.lineTo(x + r * 0.24, y + r * 1.35);
        ctx.lineTo(x + r * 0.24, y + r * 1.05);
        ctx.lineTo(x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255,190,120,.35)";
        ctx.lineWidth = 1.2 * k;
        ctx.stroke();

        // Rim, and the coconut husk burning in the bowl.
        ctx.fillStyle = "#8f451f";
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        const coals = ctx.createRadialGradient(x, y, 0, x, y, r);
        coals.addColorStop(0, `rgba(255,246,206,${0.95 * glowLevel})`);
        coals.addColorStop(0.45, `rgba(255,158,48,${0.9 * glowLevel})`);
        coals.addColorStop(1, `rgba(150,32,8,${0.85 * glowLevel})`);
        ctx.fillStyle = coals;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.86, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        // Individual coals, breathing at their own rates.
        for (let i = 0; i < 7; i += 1) {
          const a = (i / 7) * Math.PI * 2 + t / 1400;
          const br = 0.5 + 0.5 * Math.sin(t / 260 + i * 1.7);
          ctx.fillStyle = `rgba(255,${150 + Math.round(br * 90)},60,${(0.4 + br * 0.5) * glowLevel})`;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.14, r * 0.15, r * 0.07, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };

      drawDhunuchi(lowX, lowY, R * 0.6, 0.75);
      drawDhunuchi(cx, cy, R, lit);

      // ── approach rings ──────────────────────────────────────────────────
      // Rings of heat rather than a UI overlay: warm, soft, and thinning as
      // they close, so they belong to the scene.
      g.beats.forEach((b) => {
        if (b.judged) return;
        const lead = b.t - t;
        if (lead > APPROACH_MS || lead < -GOOD_MS) return;
        const p = Math.max(0, lead / APPROACH_MS);
        const rr = R * (1 + p * 2.8);
        ctx.strokeStyle = b.countIn
          ? `rgba(255,255,255,${0.16 + (1 - p) * 0.2})`
          : `rgba(255,${170 + Math.round((1 - p) * 60)},${90 + Math.round((1 - p) * 60)},${0.14 + (1 - p) * 0.72})`;
        ctx.lineWidth = (1.4 + (1 - p) * 2.4) * k;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      });

      // ── smoke ───────────────────────────────────────────────────────────
      // Layered puffs on a curl, so the column twists and widens the way real
      // smoke does instead of rising as a straight grey pipe. This is the
      // signature of the dance — a thin wisp reads as a bug, so it is generous
      // by default and thickens further as the combo runs.
      const density = reduced ? 0.35 : 1;
      const want = (3 + Math.min(g.combo, 24) / 5) * density;
      for (let i = 0; i < want; i += 1) {
        g.smoke.push({
          x: cx / w + rand(-0.018, 0.018), y: cy / h - 0.008,
          vx: rand(-0.014, 0.014), vy: rand(-0.26, -0.15),
          life: 1, size: rand(7, 17), seed: Math.random() * 10,
        });
      }
      if (g.smoke.length > 420) g.smoke.splice(0, g.smoke.length - 420);
      g.smoke = g.smoke.filter((sm) => {
        sm.life -= dt * 0.34;
        if (sm.life <= 0) return false;
        // Curl: horizontal drift on the particle's own seed, which is what
        // turns a column into a plume.
        sm.x += (sm.vx + Math.sin(t / 780 + sm.seed) * 0.055 * (1 - sm.life)) * dt;
        sm.y += sm.vy * dt;
        sm.size += dt * 34;
        // Dense at the source and thinning as it disperses — the opposite of
        // fading in, which left the base of the plume invisible.
        const age = 1 - sm.life;
        ctx.globalAlpha = Math.min(1, sm.life * 1.4) * 0.3;
        const sprite = age < 0.3 ? g.puffWarm : g.puff;
        const r = sm.size * k;
        ctx.drawImage(sprite, sm.x * w - r, sm.y * h - r, r * 2, r * 2);
        return true;
      });
      ctx.globalAlpha = 1;

      // Sparks thrown on a clean strike. Additive, but only these — making the
      // whole scene additive bleaches it to white.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      g.embers = g.embers.filter((p) => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += dt * 0.2; p.life -= dt * 1.35;
        if (p.life <= 0) return false;
        ctx.fillStyle = `rgba(255,${150 + Math.round(p.life * 90)},70,${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.size * k, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
      ctx.restore();

      ctx.restore();

      if (t >= g.endsAt) { finish(); return; }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, reduced, miss, finish]);

  const accuracy = Math.round((hits / TOTAL_BEATS) * 100);
  const verdict = accuracy >= 90 ? "The dhaki would be proud"
    : accuracy >= 70 ? "Well danced"
    : accuracy >= 45 ? "You found the beat"
    : "The dhak got away from you";

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
                : <li><strong>Finish to unlock the next chapter.</strong> All three, and the code is yours — 15% to 40% off.</li>}
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
            <p className="utv-fineprint">
              Tap anywhere on the frame, or press space.
              {soundOn && (
                <>
                  {" · "}
                  <button type="button" className="utv-inline-btn" onClick={mute} data-testid="dhunuchi-mute">
                    <VolumeX size={12} /> Mute the dhak
                  </button>
                </>
              )}
            </p>
          </div>
        )}

        {phase === "done" && (
          <ChapterOutro
            chapterId="dhunuchi"
            returnPath="/utsav/dhunuchi"
            headline={verdict}
            scoreLine={<><strong>{hits}</strong> of {TOTAL_BEATS} beats</>}
            detail={`${perfects} perfect, best run of ${best} in a row.`}
            onReplay={start}
          />
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
