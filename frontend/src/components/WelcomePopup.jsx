import { useState, useEffect, useRef, useCallback } from "react";
import { X, Sparkles, ArrowRight, Check, Rocket, Palette, Bot, ShieldCheck } from "lucide-react";
import { submitContact } from "../api";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { trackFormSubmit } from "./AnalyticsTracker";
import { markLeadCaptured, hasLeadBeenCaptured } from "../lib/leadCapture";

const STORAGE_KEY = "evolvix_welcome_seen_v1";

// Defaults live here so the popup still works if the backend content is missing.
// Everything below is overridable from Admin → Store Settings → Welcome Popup.
const DEFAULTS = {
  enabled: true,
  delay_seconds: 2,
  eyebrow: "Welcome to Evolvix Tech Media",
  title: "Your idea deserves a",
  highlight: "proper build",
  subtitle: "AI, web, creative and business solutions — planned, designed and delivered by one team.",
  offer: "Free 20-minute consultation. No obligation, no sales script.",
  cta_label: "Get My Free Consultation",
  bullets: [
    "Websites, apps and automation built end to end",
    "Branding, resumes, catalogs and creative design",
    "AI consulting sized for a small business budget",
  ],
};

const BULLET_ICONS = [Rocket, Palette, Bot];

const INTERESTS = [
  "Business inquiry",
  "Website / App / Software",
  "Creative Digital Services",
  "AI Business Consulting",
  "Branding / Portfolio / Resume",
  "Learning and Growth Product Support",
  "Music for Creators",
];

export function WelcomePopup() {
  const { content } = useSiteContent();
  const { user, loading: authLoading } = useAuth();
  const cfg = { ...DEFAULTS, ...(content.welcome_popup || {}) };
  const bullets = cfg.bullets?.length ? cfg.bullets : DEFAULTS.bullets;

  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", interest: INTERESTS[0] });
  const [state, setState] = useState("idle"); // idle | submitting | done
  const [error, setError] = useState("");
  const firstFieldRef = useRef(null);
  const closeTimer = useRef(null);

  const close = useCallback(() => {
    setClosing(true);
    closeTimer.current = setTimeout(() => { setVisible(false); setClosing(false); }, 260);
  }, []);

  // Show once per browser, after a short delay so the page paints first.
  // Skipped entirely for logged-in visitors — they are already customers.
  useEffect(() => {
    if (authLoading || user || cfg.enabled === false) return;
    if (hasLeadBeenCaptured()) return;
    let seen = false;
    try { seen = !!localStorage.getItem(STORAGE_KEY); } catch {}
    if (seen) return;
    const delay = Math.max(0, Number(cfg.delay_seconds) || 0) * 1000;
    const timer = setTimeout(() => {
      setVisible(true);
      try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    }, delay);
    return () => clearTimeout(timer);
  }, [authLoading, user, cfg.enabled, cfg.delay_seconds]);

  // Lock page scroll, focus the first field, close on Escape.
  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    const focusTimer = setTimeout(() => firstFieldRef.current?.focus(), 420);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      clearTimeout(focusTimer);
    };
  }, [visible, close]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setError("");
    setState("submitting");
    try {
      await submitContact({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        inquiry_type: form.interest,
        message: `Welcome popup enquiry — interested in ${form.interest}. Requested a free consultation from the website.`,
      });
      trackFormSubmit("welcome-popup", window.location.pathname, { inquiry_type: form.interest });
      markLeadCaptured();
      setState("done");
      closeTimer.current = setTimeout(close, 2600);
    } catch {
      setError("Couldn't send right now. Please try the Contact page.");
      setState("idle");
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`welcome-overlay${closing ? " is-closing" : ""}`}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-popup-title"
      data-testid="welcome-popup-overlay"
    >
      <div className="welcome-card" onClick={(e) => e.stopPropagation()} data-testid="welcome-popup">
        <span className="welcome-orb welcome-orb--a" aria-hidden="true" />
        <span className="welcome-orb welcome-orb--b" aria-hidden="true" />

        <button className="welcome-close" onClick={close} aria-label="Close welcome message" data-testid="welcome-popup-close">
          <X size={17} />
        </button>

        <div className="welcome-pitch">
          <span className="welcome-eyebrow" style={{ "--i": 0 }} data-testid="welcome-popup-eyebrow">
            <Sparkles size={13} /> {cfg.eyebrow}
          </span>
          <h2 className="welcome-title" id="welcome-popup-title" style={{ "--i": 1 }} data-testid="welcome-popup-title">
            {cfg.title} <span className="welcome-title-accent">{cfg.highlight}</span>
          </h2>
          <p className="welcome-sub" style={{ "--i": 2 }} data-testid="welcome-popup-subtitle">{cfg.subtitle}</p>

          <ul className="welcome-bullets" data-testid="welcome-popup-bullets">
            {bullets.slice(0, 4).map((text, index) => {
              const Icon = BULLET_ICONS[index % BULLET_ICONS.length];
              return (
                <li key={index} style={{ "--i": 3 + index }} data-testid={`welcome-popup-bullet-${index}`}>
                  <span className="welcome-bullet-icon"><Icon size={15} /></span>
                  {text}
                </li>
              );
            })}
          </ul>

          <p className="welcome-trust" style={{ "--i": 7 }} data-testid="welcome-popup-trust">
            <ShieldCheck size={14} /> GST Registered · Udyam MSME · Kolkata based
          </p>
        </div>

        <div className="welcome-form-panel" style={{ "--i": 4 }}>
          {state === "done" ? (
            <div className="welcome-success" data-testid="welcome-popup-success">
              <span className="welcome-success-mark"><Check size={26} /></span>
              <h3>Thank you, {form.name.split(" ")[0]}!</h3>
              <p>We've got your details. Someone from the team will reach out within one working day.</p>
            </div>
          ) : (
            <>
              <p className="welcome-offer" data-testid="welcome-popup-offer">{cfg.offer}</p>
              <form className="welcome-form" onSubmit={handleSubmit} data-testid="welcome-popup-form">
                <input
                  ref={firstFieldRef}
                  className="welcome-input"
                  placeholder="Your name *"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  maxLength={80}
                  data-testid="welcome-popup-name"
                />
                <input
                  className="welcome-input"
                  type="email"
                  placeholder="Email address *"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  data-testid="welcome-popup-email"
                />
                <input
                  className="welcome-input"
                  placeholder="Phone (optional)"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  maxLength={20}
                  data-testid="welcome-popup-phone"
                />
                <select
                  className="welcome-input"
                  value={form.interest}
                  onChange={(e) => setField("interest", e.target.value)}
                  data-testid="welcome-popup-interest"
                >
                  {INTERESTS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>

                {error && <p className="welcome-error" data-testid="welcome-popup-error">{error}</p>}

                <button type="submit" className="welcome-submit" disabled={state === "submitting"} data-testid="welcome-popup-submit">
                  {state === "submitting" ? "Sending…" : <>{cfg.cta_label} <ArrowRight size={16} /></>}
                </button>
                <button type="button" className="welcome-skip" onClick={close} data-testid="welcome-popup-skip">
                  I'll explore the site first
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
