import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Share2, Sparkles, Trash2, Undo2 } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { useAuth } from "../hooks/useAuth";
import { trackEvent } from "../components/AnalyticsTracker";

// Rangoli is a drawing toy, not a puzzle: one finger, no timer, nothing to get
// wrong. Every stroke is repeated around the circle, so an unsteady line still
// comes out symmetrical — the drawing always looks better than the input, which
// is the whole reason it is fun to keep going.

const PALETTE = [
  { name: "Marigold", hue: 38, sat: 95 },
  { name: "Flame", hue: 10, sat: 92 },
  { name: "Rose", hue: 338, sat: 88 },
  { name: "Indigo", hue: 258, sat: 85 },
  { name: "Peacock", hue: 186, sat: 92 },
  { name: "Leaf", hue: 142, sat: 78 },
  { name: "Moon", hue: 210, sat: 12 },
];

const SYMMETRIES = [6, 8, 12, 16];
const BRUSHES = [
  { label: "Fine", width: 2 },
  { label: "Medium", width: 5 },
  { label: "Bold", width: 11 },
];

const GROUND = "#080a14";
// Colour drifts along a stroke so a single line is a gradient rather than one
// flat hue. The drift must be a function of the point index alone: live drawing
// and a later redraw have to agree, or a stroke would change colour the moment
// someone hit undo.
const HUE_RUN = 40;
const hueDrift = (i) => Math.min(1, i / HUE_RUN);
const EXPORT_SIZE = 1080;
// Widths are authored against a 560px canvas and scaled by the real radius, so
// a stroke keeps its proportions on a phone and in the exported image alike.
const REFERENCE_RADIUS = 280;

// A stroke is stored as points normalised to the radius rather than pixels, so
// the same list redraws correctly at any canvas size.
function paint(ctx, size, strokes, { background = false, watermark = false } = {}) {
  const c = size / 2;
  const R = size / 2;

  ctx.clearRect(0, 0, size, size);
  if (background) {
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, size, size);
  }

  strokes.forEach((stroke) => {
    for (let i = 1; i < stroke.points.length; i += 1) {
      drawSegment(ctx, R, c, stroke, stroke.points[i - 1], stroke.points[i], hueDrift(i));
    }
  });

  if (watermark) {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(255,255,255,.34)";
    ctx.font = `600 ${Math.round(size * 0.022)}px "Space Grotesk", system-ui, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText("evolvixtech.in", size - size * 0.045, size - size * 0.045);
  }
  ctx.globalCompositeOperation = "source-over";
}

// One segment, repeated around the circle. Drawn twice per copy: a wide faint
// pass for the glow and a narrow bright one for the core. Two cheap strokes
// look better than one shadowBlur and cost far less on a phone.
//
// Only the glow is additive. Making the core additive too looked better for the
// first few strokes and then betrayed anyone who kept drawing: overlapping
// copies summed past white and the whole rangoli bleached out. The core paints
// normally, so colour survives however long someone stays.
function drawSegment(ctx, R, c, stroke, from, to, t) {
  const { hue, sat, width, symmetry, mirror } = stroke;
  const h = (hue + t * 34) % 360;
  const lw = Math.max(0.6, (width * R) / REFERENCE_RADIUS);
  const step = (Math.PI * 2) / symmetry;
  const flips = mirror ? [1, -1] : [1];

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 0; i < symmetry; i += 1) {
    const rot = i * step;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    flips.forEach((m) => {
      const ax = c + (from.x * m * cos - from.y * sin) * R;
      const ay = c + (from.x * m * sin + from.y * cos) * R;
      const bx = c + (to.x * m * cos - to.y * sin) * R;
      const by = c + (to.x * m * sin + to.y * cos) * R;

      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `hsla(${h}, ${sat}%, 52%, 0.045)`;
      ctx.lineWidth = lw * 4;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = `hsla(${h}, ${sat}%, ${sat < 30 ? 86 : 62}%, 0.92)`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    });
  }
  ctx.globalCompositeOperation = "source-over";
}

export default function Rangoli() {
  useSEO({
    title: "Rangoli — draw with perfect symmetry",
    description: "One finger, no rules, no timer. Every line you draw is mirrored around the circle, so it always comes out beautiful. Free to play, sign in to keep your artwork.",
    path: "/playground/rangoli",
  });

  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const strokesRef = useRef([]);
  const activeRef = useRef(null);
  const startedRef = useRef(false);

  const [color, setColor] = useState(PALETTE[0]);
  const [symmetry, setSymmetry] = useState(8);
  const [mirror, setMirror] = useState(true);
  const [brush, setBrush] = useState(BRUSHES[1]);
  const [strokeCount, setStrokeCount] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState("");

  // The canvas is square and backed at device resolution, so lines stay crisp
  // on a phone. A resize replays the strokes rather than stretching pixels.
  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const side = Math.max(240, Math.min(wrap.clientWidth, 560));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${side}px`;
    canvas.style.height = `${side}px`;
    canvas.width = Math.round(side * dpr);
    canvas.height = Math.round(side * dpr);
    paint(canvas.getContext("2d"), canvas.width, strokesRef.current);
  }, []);

  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) paint(canvas.getContext("2d"), canvas.width, strokesRef.current);
  }, []);

  const pointFrom = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const R = rect.width / 2;
    return {
      x: (event.clientX - rect.left - R) / R,
      y: (event.clientY - rect.top - R) / R,
    };
  };

  const onPointerDown = (event) => {
    event.preventDefault();
    // Capture keeps a fast drag that leaves the circle attached to the canvas.
    // It throws for a pointer id the browser isn't tracking, which is harmless.
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* not capturable */ }
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent({ event_type: "game_start", label: "rangoli" });
    }
    activeRef.current = {
      hue: color.hue,
      sat: color.sat,
      width: brush.width,
      symmetry,
      mirror,
      points: [pointFrom(event)],
    };
    setConfirmClear(false);
  };

  const onPointerMove = (event) => {
    const stroke = activeRef.current;
    if (!stroke) return;
    event.preventDefault();
    const next = pointFrom(event);
    const last = stroke.points[stroke.points.length - 1];
    // Ignore sub-pixel jitter; it costs draw calls and adds nothing visible.
    if (Math.hypot(next.x - last.x, next.y - last.y) < 0.004) return;
    stroke.points.push(next);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    // points.length - 1 is the index this segment ends on, which is the index a
    // later redraw will use for it.
    drawSegment(ctx, canvas.width / 2, canvas.width / 2, stroke, last, next, hueDrift(stroke.points.length - 1));
  };

  const onPointerUp = () => {
    const stroke = activeRef.current;
    activeRef.current = null;
    if (!stroke || stroke.points.length < 2) return;
    strokesRef.current = [...strokesRef.current, stroke];
    setStrokeCount(strokesRef.current.length);
  };

  const undo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    redraw();
  };

  const clear = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    strokesRef.current = [];
    setStrokeCount(0);
    setConfirmClear(false);
    redraw();
  };

  // Exported at a fixed 1080px by replaying the strokes at that scale rather
  // than upscaling the on-screen canvas, so the saved image is genuinely sharp.
  const toBlob = () => new Promise((resolve) => {
    const out = document.createElement("canvas");
    out.width = EXPORT_SIZE;
    out.height = EXPORT_SIZE;
    paint(out.getContext("2d"), EXPORT_SIZE, strokesRef.current, { background: true, watermark: true });
    out.toBlob(resolve, "image/png");
  });

  const requireAccount = () => {
    if (user) return false;
    navigate("/login?next=/playground/rangoli");
    return true;
  };

  const download = async () => {
    if (requireAccount()) return;
    setBusy("saving");
    const blob = await toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-rangoli.png";
    // Firefox only follows an anchor that is in the document, and revoking the
    // URL in the same tick cancels the download in more than one browser — so
    // the link is attached, clicked, and cleaned up a moment later.
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 4000);
    setBusy("");
    trackEvent({ event_type: "playground_download", label: "rangoli", metadata: { strokes: strokeCount } });
  };

  const share = async () => {
    if (requireAccount()) return;
    const text = "I made this on the Evolvix Playground — draw your own: evolvixtech.in/playground/rangoli";
    setBusy("sharing");
    const blob = await toBlob();
    const file = new File([blob], "my-rangoli.png", { type: "image/png" });
    trackEvent({ event_type: "game_share", label: "rangoli", metadata: { strokes: strokeCount } });
    setBusy("");
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return; } catch { /* dismissed */ }
    }
    // No file sharing here — hand them the image instead, which they can attach.
    download();
  };

  const empty = strokeCount === 0 && !activeRef.current;

  return (
    <section className="section page-section rng-page" data-testid="rangoli-page">
      <Link to="/playground" className="mts-back" data-testid="rng-back-link">
        <ArrowLeft size={16} /> Back to Playground
      </Link>

      <div className="rng-head">
        <span className="mts-eyebrow"><Sparkles size={14} /> Evolvix Playground</span>
        <h1>Rangoli</h1>
        <p className="rng-lede">
          Drag anywhere on the circle. Every line is repeated all the way around,
          so whatever you draw comes out symmetrical. There is nothing to get
          wrong here — just keep going until you like it.
        </p>
      </div>

      <div className="rng-stage" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="rng-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          data-testid="rng-canvas"
        />
        {empty && (
          <p className="rng-hint" data-testid="rng-hint">Draw here</p>
        )}
      </div>

      <div className="rng-controls" data-testid="rng-controls">
        <div className="rng-row" data-testid="rng-colours">
          {PALETTE.map((swatch) => (
            <button
              key={swatch.name}
              className={`rng-swatch${swatch.name === color.name ? " rng-swatch--on" : ""}`}
              style={{ background: `hsl(${swatch.hue}, ${swatch.sat}%, ${swatch.sat < 30 ? 86 : 60}%)` }}
              onClick={() => setColor(swatch)}
              aria-label={swatch.name}
              aria-pressed={swatch.name === color.name}
              data-testid={`rng-colour-${swatch.name.toLowerCase()}`}
            />
          ))}
        </div>

        <div className="rng-row rng-row--wrap">
          <span className="rng-label">Petals</span>
          {SYMMETRIES.map((n) => (
            <button
              key={n}
              className={`rng-chip${n === symmetry ? " rng-chip--on" : ""}`}
              onClick={() => setSymmetry(n)}
              aria-pressed={n === symmetry}
              data-testid={`rng-symmetry-${n}`}
            >
              {n}
            </button>
          ))}
          <button
            className={`rng-chip${mirror ? " rng-chip--on" : ""}`}
            onClick={() => setMirror(!mirror)}
            aria-pressed={mirror}
            data-testid="rng-mirror"
          >
            Mirror
          </button>
        </div>

        <div className="rng-row rng-row--wrap">
          <span className="rng-label">Brush</span>
          {BRUSHES.map((b) => (
            <button
              key={b.label}
              className={`rng-chip${b.label === brush.label ? " rng-chip--on" : ""}`}
              onClick={() => setBrush(b)}
              aria-pressed={b.label === brush.label}
              data-testid={`rng-brush-${b.label.toLowerCase()}`}
            >
              {b.label}
            </button>
          ))}
          <button className="rng-chip" onClick={undo} disabled={strokeCount === 0} data-testid="rng-undo">
            <Undo2 size={14} /> Undo
          </button>
          <button
            className={`rng-chip${confirmClear ? " rng-chip--warn" : ""}`}
            onClick={clear}
            disabled={strokeCount === 0}
            data-testid="rng-clear"
          >
            <Trash2 size={14} /> {confirmClear ? "Sure?" : "Clear"}
          </button>
        </div>

        <div className="rng-actions">
          <button className="mts-primary" onClick={download} disabled={empty || busy !== ""} data-testid="rng-save">
            <Download size={16} /> {busy === "saving" ? "Saving…" : "Save your rangoli"}
          </button>
          <button className="mts-secondary" onClick={share} disabled={empty || busy !== ""} data-testid="rng-share">
            <Share2 size={15} /> Share
          </button>
        </div>

        <p className="rng-note" data-testid="rng-note">
          {user
            ? "Saves as a 1080px image, ready to post."
            : "Free to draw. Sign in when you want to save or share what you made."}
        </p>
      </div>
    </section>
  );
}
