import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, Gauge, Layers, Palette } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { trackEvent } from "../components/AnalyticsTracker";
import { webglAvailable } from "../lib/webglSupport";
import { activePanel, sectionProgress } from "../lib/scrollProgress";

// A scroll-driven 3D product page, built as a demo we can show prospects.
//
// The reference the client brought was a studio site shipping 9.3MB of assets
// and taking five seconds to become usable. That works for an agency whose
// buyers are creative directors on fast machines. It does not work here, where
// the buyer is a shop owner on a mid-range Android phone, and where our own
// pitch is that we build things that load on a cheap phone with two bars of
// signal. So this deliberately takes the opposite route to the same effect:
// geometry generated in code rather than downloaded, no textures, no model
// files, and the whole 3D library kept out of the main bundle so it is only
// fetched by someone who opens this page.
//
// Everything below the canvas is ordinary HTML. If WebGL is missing or the
// visitor has asked for reduced motion, the page still reads start to finish.

const SECTIONS = [
  {
    icon: <Eye size={20} />,
    eyebrow: "01 — The idea",
    title: "Your product, turning in the browser",
    body: "No app to install, no plugin, no viewer. This frame is being drawn live on your device right now — and it is a few kilobytes of instructions, not a downloaded model.",
  },
  {
    icon: <Layers size={20} />,
    eyebrow: "02 — Every part",
    title: "Take it apart while they read",
    body: "Scroll and the product opens up. Rims, lenses, temples, bridge. For a customer deciding between two frames, this answers questions a photograph cannot.",
  },
  {
    icon: <Palette size={20} />,
    eyebrow: "03 — Every finish",
    title: "One model, every colourway",
    body: "Change a value, not a photoshoot. Adding a new finish to a catalogue like this costs a line of code instead of a studio day.",
  },
  {
    icon: <Gauge size={20} />,
    eyebrow: "04 — The point",
    title: "Built to run on the phone your customer owns",
    body: "The site that inspired this ships 9.3MB and takes five seconds. This page draws its geometry in code, loads the 3D engine only when you open it, and falls back to a flat page on devices that cannot handle it.",
  },
];

export default function ImmersiveDemo() {
  useSEO({
    title: "Immersive 3D Product Demo — Evolvix",
    description:
      "A scroll-driven 3D product page running live in the browser. No app, no plugin, no downloaded models — built to work on the phone your customer actually owns.",
    path: "/demo/immersive",
  });

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const sceneRef = useRef(null);
  const rafRef = useRef(0);
  const targetRef = useRef(0);
  const smoothRef = useRef(0);

  const [supported] = useState(() => webglAvailable());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  const reduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const mobile = typeof window !== "undefined" && window.innerWidth < 820;

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sceneRef.current) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w && h) sceneRef.current.resize(w, h);
  }, []);

  useEffect(() => {
    if (!supported) return undefined;
    let alive = true;
    let cleanup = () => {};

    // The 3D engine is imported here rather than at the top of the file, so it
    // lands in its own chunk and nobody who never opens this page pays for it.
    import("../lib/eyewearScene")
      .then(({ createEyewearScene }) => {
        if (!alive || !canvasRef.current) return;
        let scene;
        try {
          scene = createEyewearScene(canvasRef.current, { mobile });
        } catch {
          setFailed(true);           // context creation can fail on weak GPUs
          return;
        }
        sceneRef.current = scene;
        resize();
        setReady(true);

        let last = performance.now();
        const loop = (now) => {
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;
          // Eased towards the scroll position rather than snapped to it, which
          // is most of what makes a scene like this feel expensive.
          const k = reduced ? 1 : 1 - Math.pow(0.0015, dt);
          smoothRef.current += (targetRef.current - smoothRef.current) * k;
          scene.update(smoothRef.current, reduced ? 0 : dt);
          scene.render();
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);

        window.addEventListener("resize", resize);
        cleanup = () => {
          cancelAnimationFrame(rafRef.current);
          window.removeEventListener("resize", resize);
          scene.dispose();
          sceneRef.current = null;
        };
        trackEvent({ event_type: "demo_view", label: "immersive-3d" });
      })
      .catch(() => setFailed(true));

    return () => { alive = false; cleanup(); };
  }, [supported, mobile, reduced, resize]);

  // Scroll position drives everything. Read from the section's own box rather
  // than from window.scrollY, so the page can sit anywhere in the document.
  useEffect(() => {
    if (!supported) return undefined;
    const onScroll = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = sectionProgress(rect.top, rect.height, window.innerHeight);
      targetRef.current = p;
      setActive(activePanel(p, SECTIONS.length));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [supported]);

  const flat = !supported || failed;

  return (
    <div className="im3-page">
      <div className="im3-topbar">
        <Link to="/demo" className="im3-back"><ArrowLeft size={16} /> All demos</Link>
        <span className="im3-badge">Live 3D · running on your device</span>
      </div>

      {flat ? (
        <section className="section im3-flat" data-testid="im3-fallback">
          <h1>Immersive 3D product pages</h1>
          <p className="im3-lede">
            This demo needs WebGL, which your browser or device has not made
            available — so here it is written down instead. Everything below is
            what the 3D version shows.
          </p>
          <ul className="im3-flat-list">
            {SECTIONS.map((s) => (
              <li key={s.eyebrow}>
                <span className="im3-eyebrow">{s.icon} {s.eyebrow}</span>
                <h2>{s.title}</h2>
                <p>{s.body}</p>
              </li>
            ))}
          </ul>
          <Link to="/contact?service=Website%20%2F%20App%20%2F%20Software" className="im3-cta">
            Talk to us about one <ArrowRight size={17} />
          </Link>
        </section>
      ) : (
        <>
          <div className="im3-scroll" ref={wrapRef} data-testid="im3-scroll">
            <div className="im3-sticky">
              <canvas ref={canvasRef} className="im3-canvas" data-testid="im3-canvas" />
              {!ready && <div className="im3-loading" data-testid="im3-loading">Building the scene…</div>}

              <div className="im3-copy" data-testid="im3-copy">
                {SECTIONS.map((s, i) => (
                  <div
                    key={s.eyebrow}
                    className={`im3-panel${i === active ? " im3-panel--on" : ""}`}
                    aria-hidden={i !== active}
                  >
                    <span className="im3-eyebrow">{s.icon} {s.eyebrow}</span>
                    <h2>{s.title}</h2>
                    <p>{s.body}</p>
                  </div>
                ))}
              </div>

              <div className="im3-progress" aria-hidden="true">
                {SECTIONS.map((s, i) => (
                  <span key={s.eyebrow} className={i === active ? "im3-dot im3-dot--on" : "im3-dot"} />
                ))}
              </div>
              <span className="im3-hint" data-testid="im3-hint">Scroll</span>
            </div>
          </div>

          <section className="section im3-outro">
            <h2>This is a demo. Yours would show your products.</h2>
            <p className="im3-lede">
              Frames, furniture, machinery, jewellery — anything a customer wants
              to turn over in their hands before they buy. Built on your catalogue,
              in your brand, and light enough to open on a phone with two bars of
              signal.
            </p>
            <div className="im3-outro-actions">
              <Link to="/contact?service=Website%20%2F%20App%20%2F%20Software" className="im3-cta">
                Talk to us about one <ArrowRight size={17} />
              </Link>
              <Link to="/demo" className="im3-cta im3-cta--ghost">See the other demos</Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
