import { useEffect, useRef } from "react";

const PHI = (1 + Math.sqrt(5)) / 2;
const N = 900;

// Fibonacci sphere: evenly distributed points on unit sphere
const BASE = Array.from({ length: N }, (_, i) => {
  const theta = Math.acos(1 - 2 * (i + 0.5) / N);
  const psi = 2 * Math.PI * i / PHI;
  return [
    Math.sin(theta) * Math.cos(psi),
    Math.sin(theta) * Math.sin(psi),
    Math.cos(theta),
  ];
});

// Brand palette: cyan-dominant with purple/magenta/white accents
const PALETTE = [
  "#13dff4", "#13dff4", "#13dff4", "#13dff4",
  "#8a31ff", "#8a31ff", "#8a31ff",
  "#f12dff", "#f12dff",
  "#ffffff", "#dce4ff",
];
const PT_COLORS = BASE.map(() => PALETTE[Math.floor(Math.random() * PALETTE.length)]);

const TILT_COS = Math.cos(Math.PI * 0.12);
const TILT_SIN = Math.sin(Math.PI * 0.12);

export function HeroParticle() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let angle = 0;
    let raf;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const s = Math.min(parent.offsetWidth, 520);
      canvas.width = s;
      canvas.height = s;
    };
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = () => {
      const S = canvas.width;
      if (!S) { raf = requestAnimationFrame(draw); return; }

      const R = S * 0.41;
      const cx = S * 0.5;
      const cy = S * 0.5;

      ctx.clearRect(0, 0, S, S);
      angle += 0.003;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const proj = BASE.map(([x, y, z], i) => {
        // Rotate around Y axis
        const rx = x * cosA + z * sinA;
        const ry = y;
        const rz = -x * sinA + z * cosA;
        // Tilt around X axis for 3-D depth cue
        const ty = ry * TILT_COS - rz * TILT_SIN;
        const tz = ry * TILT_SIN + rz * TILT_COS;
        // Perspective
        const d = 1.8 / (1.8 - tz * 0.5);
        return { sx: cx + rx * R * d, sy: cy + ty * R * d, r: d * 1.3, bright: (tz + 1) / 2, z: tz, c: PT_COLORS[i] };
      });

      // Painter's algorithm: draw back-to-front
      proj.sort((a, b) => a.z - b.z);

      proj.forEach((p) => {
        if (p.bright < 0.06) return;
        ctx.globalAlpha = Math.pow(p.bright, 1.4) * 0.88;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(0.4, p.r), 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-particle-canvas" aria-hidden="true" />;
}
