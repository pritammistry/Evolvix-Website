import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Check, Copy, Gift, X } from "lucide-react";
import { useFestivalOffer } from "../hooks/useFestivalOffer";
import { useAuth } from "../hooks/useAuth";
import { timeLeft, deadlineDate } from "../lib/campaign";
import { trackEvent } from "./AnalyticsTracker";

// A strip across the top of the site for as long as the campaign runs. It says
// one of two things: play, or — if this account already has a code — here is
// your code, go and spend it. The second is the more valuable message, and it
// is the one people forget they are owed.

const DISMISS_KEY = "evolvix_rakhi_banner_closed";

// Re-reads the deadline once a minute. Anything faster would be a stopwatch on
// a page nobody is watching; anything slower and "1 hour left" could sit there
// after it stopped being true.
function useCountdown(endsAt) {
  // The tick exists only to force a re-render; timeLeft reads the clock itself.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!endsAt) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, [endsAt]);
  return endsAt ? timeLeft(endsAt) : null;
}

export function FestivalBanner() {
  const offer = useFestivalOffer();
  const location = useLocation();
  const [closed, setClosed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  const claimed = offer?.claimed;
  // Someone holding a code cares about their own expiry, not the campaign's.
  const deadline = claimed ? claimed.expires_at : offer?.closes_at;
  const left = useCountdown(offer?.open ? deadline : null);

  const dismiss = () => {
    setClosed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* private mode */ }
  };

  if (!offer?.open || closed) return null;
  // Never advertise the game on top of the game, or in the admin panel.
  if (location.pathname.startsWith("/rakhi") || location.pathname.startsWith("/admin")) return null;

  const softDate = deadlineDate(deadline);

  return (
    <div className={`fest-banner${claimed ? " fest-banner--claimed" : ""}${left?.urgent ? " fest-banner--urgent" : ""}`} data-testid="festival-banner">
      <Link
        to={claimed ? "/" : "/rakhi"}
        className="fest-banner-body"
        onClick={() => trackEvent({ event_type: "click", label: claimed ? "festival-banner-use" : "festival-banner-play" })}
        data-testid="festival-banner-link"
      >
        <span className="fest-banner-icon" aria-hidden="true">{claimed ? "🎁" : "🎀"}</span>
        {claimed ? (
          <span className="fest-banner-text">
            <strong>
              {claimed.uses_left === claimed.max_uses
                ? `Your ${claimed.percent}% off is still unused`
                : `${claimed.percent}% off — ${claimed.uses_left} ${claimed.uses_left === 1 ? "use" : "uses"} left`}
            </strong>
            <span className="fest-banner-sub">
              Code {claimed.code} · works on everything we sell
            </span>
          </span>
        ) : (
          <span className="fest-banner-text">
            <strong>Raksha Bandhan — tie a rakhi, win {offer.min_percent}–{offer.max_percent}% off</strong>
            <span className="fest-banner-sub">
              Thirty seconds, and nobody walks away empty-handed{softDate ? ` · ends ${softDate}` : ""}
            </span>
          </span>
        )}
        {left?.label && (
          <span className="fest-banner-clock" data-testid="festival-banner-countdown">{left.label}</span>
        )}
        <span className="fest-banner-cta">
          {claimed ? "Spend it" : "Play"} <ArrowRight size={15} />
        </span>
      </Link>
      <button className="fest-banner-close" onClick={dismiss} aria-label="Dismiss offer banner" data-testid="festival-banner-close">
        <X size={16} />
      </button>
    </div>
  );
}

// The code and its terms, for whoever is holding one. Sits on the home page —
// where the banner and the prize screen both send people — and again at the top
// of the store. Off the store it carries its own way through to the products and
// the services, since the point being made is that the code covers both.
export function FestivalCodeStrip() {
  const offer = useFestivalOffer();
  const { user } = useAuth();
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const claimed = offer?.claimed;
  if (!offer?.open || !claimed) return null;
  const inStore = location.pathname.startsWith("/shop");

  const left = claimed.uses_left ?? claimed.max_uses;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(claimed.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch { /* they can read it off the screen */ }
  };

  return (
    <div className="fest-strip" data-testid="festival-code-strip">
      <div className="fest-strip-head">
        <span className="fest-strip-icon" aria-hidden="true">🎁</span>
        <div className="fest-strip-lead">
          <strong>Your Raksha Bandhan code — {claimed.percent}% off</strong>
          <span>
            {left > 0
              ? `${left} of ${claimed.max_uses} ${left === 1 ? "use" : "uses"} left · valid until ${deadlineDate(claimed.expires_at)}`
              : `All ${claimed.max_uses} uses spent`}
          </span>
        </div>
        <button className="fest-strip-code" onClick={copy} data-testid="festival-strip-code">
          {claimed.code} {copied ? <Check size={15} /> : <Copy size={14} />}
        </button>
      </div>
      <ul className="fest-strip-terms" data-testid="festival-strip-terms">
        <li>
          <strong>Everything we sell, not one category.</strong> Every product in
          the store, and every service we offer — websites, apps, branding,
          AI consulting and creative work.
        </li>
        <li>
          <strong>It belongs to your account.</strong> Stay signed in as{" "}
          {user?.email || "this account"} and the discount is applied at checkout.
          Services are quoted rather than bought here, so{" "}
          <Link to="/contact" className="fest-strip-link">tell us the code when you book one</Link>.
        </li>
        <li>
          <strong>Up to {claimed.max_uses} redemptions</strong>, in any mix of
          products and services.
        </li>
      </ul>
      {!inStore && (
        <div className="fest-strip-actions">
          <Link to="/shop" className="fest-strip-btn" data-testid="festival-strip-shop">
            Browse the store <ArrowRight size={15} />
          </Link>
          <Link to="/services" className="fest-strip-ghost" data-testid="festival-strip-services">
            See the services
          </Link>
        </div>
      )}
    </div>
  );
}

// The popup's campaign slot. Shown instead of the evergreen offer while the
// festival runs, and it disappears by itself when the campaign closes.
export function FestivalPopupOffer({ onNavigate }) {
  const offer = useFestivalOffer();
  const claimed = offer?.claimed;
  const left = useCountdown(offer?.open ? (claimed ? claimed.expires_at : offer?.closes_at) : null);
  if (!offer?.open) return null;

  return (
    <Link
      to={claimed ? "/" : "/rakhi"}
      className="fest-popup-offer"
      onClick={() => {
        trackEvent({ event_type: "click", label: claimed ? "welcome-popup-festival-use" : "welcome-popup-festival-play" });
        onNavigate?.();
      }}
      data-testid="welcome-popup-festival"
    >
      <span className="fest-popup-icon" aria-hidden="true">{claimed ? "🎁" : "🎀"}</span>
      <span className="fest-popup-copy">
        <strong>
          {claimed
            ? `Your ${claimed.percent}% Raksha Bandhan code is unused`
            : `Raksha Bandhan: win ${offer.min_percent}–${offer.max_percent}% off everything`}
        </strong>
        <span>
          {claimed
            ? `Code ${claimed.code} — works on everything we sell`
            : "Tie a rakhi and unwrap your discount. Nobody leaves empty-handed."}
          {left?.label ? ` · ${left.label}` : ""}
        </span>
      </span>
      <Gift size={18} className="fest-popup-arrow" />
    </Link>
  );
}
