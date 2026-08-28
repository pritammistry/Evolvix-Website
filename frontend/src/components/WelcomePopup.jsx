import { useState, useEffect, useRef, useCallback } from "react";
import { X, Sparkles, ArrowRight, Check, Rocket, Palette, Bot, ShieldCheck, Clock } from "lucide-react";
import { submitContact } from "../api";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { trackFormSubmit } from "./AnalyticsTracker";
import { markLeadCaptured, hasLeadBeenCaptured } from "../lib/leadCapture";
import { activeCampaign, daysRemaining } from "../lib/campaign";
import { FestivalPopupOffer } from "./FestivalBanner";

// sessionStorage, not localStorage: the popup returns once per browser session,
// so a visitor who comes back in a new tab or a new browsing session sees it
// again. It still will not re-fire on a plain reload of the same tab. Once they
// actually submit, the permanent lead-captured flag stops it for good.
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
  // A time-boxed campaign that temporarily replaces the copy above. It reverts
  // on its own the moment ends_at passes — nobody has to remember to switch it
  // back, which is the whole point of storing an end date rather than a flag.
  campaign: {
    enabled: true,
    // Offer runs until the end of 15 August 2026, IST.
    ends_at: "2026-08-16T00:00:00+05:30",
    eyebrow: "80th Independence Day · Freedom Week",
    title: "Celebrating freedom.",
    highlight: "Up to 20% off everything.",
    subtitle: "Our Freedom Week offer runs on every product and every service — websites, apps, branding, AI consulting and the full digital store.",
    offer: "Up to 20% off all products and services. Offer ends midnight, 15 August.",
    cta_label: "Claim My Freedom Week Offer",
    code: "FREEDOM20",
    bullets: [
      "Up to 20% off websites, apps and automation",
      "Up to 20% off branding, resumes and creative work",
      "Up to 20% off every digital product in the store",
    ],
  },
};

const BULLET_ICONS = [Rocket, Palette, Bot];

// Copy fields a campaign is allowed to take over. Behaviour fields (enabled,
// delay_seconds) deliberately stay under the main config.
const CAMPAIGN_COPY_FIELDS = ["eyebrow", "title", "highlight", "subtitle", "offer", "cta_label", "bullets"];


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

  // While a campaign is live its copy replaces the evergreen copy; once the end
  // date passes this silently returns null and the popup is itself again.
  const campaign = activeCampaign(cfg);
  const copy = { ...cfg };
  if (campaign) {
    for (const field of CAMPAIGN_COPY_FIELDS) {
      if (campaign[field]) copy[field] = campaign[field];
    }
  }
  const bullets = copy.bullets?.length ? copy.bullets : DEFAULTS.bullets;
  const daysLeft = campaign ? daysRemaining(campaign.ends_at) : 0;

  // Read once at mount — the query string does not change under the SPA router.
  const [forced] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("welcome") === "1"; } catch { return false; }
  });

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
  // ?welcome=1 forces it open every time, for testing and live demos: it
  // ignores all the gates and never writes the "already seen" flag.
  useEffect(() => {
    if (authLoading) return;
    if (!forced) {
      if (user || cfg.enabled === false) return;
      if (hasLeadBeenCaptured()) return;
      let seen = false;
      try { seen = !!sessionStorage.getItem(STORAGE_KEY); } catch {}
      if (seen) return;
    }
    const delay = forced ? 0 : Math.max(0, Number(cfg.delay_seconds) || 0) * 1000;
    const timer = setTimeout(() => {
      setVisible(true);
      if (!forced) {
        try { sessionStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [authLoading, user, cfg.enabled, cfg.delay_seconds, forced]);

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
        // Tag campaign leads so you can tell in the Leads panel which enquiries
        // the Freedom Week offer actually brought in.
        message: campaign
          ? `Welcome popup enquiry (${campaign.eyebrow || "campaign"}${campaign.code ? ` · code ${campaign.code}` : ""}) — interested in ${form.interest}.`
          : `Welcome popup enquiry — interested in ${form.interest}. Requested a free consultation from the website.`,
      });
      trackFormSubmit("welcome-popup", window.location.pathname, { inquiry_type: form.interest, campaign: campaign?.code || "none" });
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
      <div className={`welcome-card${campaign ? " is-campaign" : ""}`} onClick={(e) => e.stopPropagation()} data-testid="welcome-popup">
        <span className="welcome-orb welcome-orb--a" aria-hidden="true" />
        <span className="welcome-orb welcome-orb--b" aria-hidden="true" />

        <button className="welcome-close" onClick={close} aria-label="Close welcome message" data-testid="welcome-popup-close">
          <X size={17} />
        </button>

        <div className="welcome-pitch">
          <span className="welcome-eyebrow" style={{ "--i": 0 }} data-testid="welcome-popup-eyebrow">
            <Sparkles size={13} /> {copy.eyebrow}
          </span>
          <h2 className="welcome-title" id="welcome-popup-title" style={{ "--i": 1 }} data-testid="welcome-popup-title">
            {copy.title} <span className="welcome-title-accent">{copy.highlight}</span>
          </h2>
          <p className="welcome-sub" style={{ "--i": 2 }} data-testid="welcome-popup-subtitle">{copy.subtitle}</p>

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

          {campaign && (
            <p className="welcome-deadline" style={{ "--i": 7 }} data-testid="welcome-popup-deadline">
              <Clock size={14} />
              {daysLeft <= 1 ? "Last day — offer ends at midnight" : `Ends midnight, 15 August · ${daysLeft} days left`}
              {campaign.code && <> · use code <strong>{campaign.code}</strong></>}
            </p>
          )}

          {/* Driven by the live campaign on the server rather than the content
              editor, so it needs no copy change to appear and none to go away. */}
          <FestivalPopupOffer onNavigate={close} />

          <p className="welcome-trust" style={{ "--i": 8 }} data-testid="welcome-popup-trust">
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
              <p className="welcome-offer" data-testid="welcome-popup-offer">{copy.offer}</p>
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
                  {state === "submitting" ? "Sending…" : <>{copy.cta_label} <ArrowRight size={16} /></>}
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
