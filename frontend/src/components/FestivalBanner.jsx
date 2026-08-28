import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Gift, X } from "lucide-react";
import { useFestivalOffer } from "../hooks/useFestivalOffer";
import { trackEvent } from "./AnalyticsTracker";

// A strip across the top of the site for as long as the campaign runs. It says
// one of two things: play, or — if this account already has a code — here is
// your code, go and spend it. The second is the more valuable message, and it
// is the one people forget they are owed.

const DISMISS_KEY = "evolvix_rakhi_banner_closed";

export function FestivalBanner() {
  const offer = useFestivalOffer();
  const location = useLocation();
  const [closed, setClosed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  const dismiss = () => {
    setClosed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* private mode */ }
  };

  if (!offer?.open || closed) return null;
  // Never advertise the game on top of the game, or in the admin panel.
  if (location.pathname.startsWith("/rakhi") || location.pathname.startsWith("/admin")) return null;

  const claimed = offer.claimed;

  return (
    <div className={`fest-banner${claimed ? " fest-banner--claimed" : ""}`} data-testid="festival-banner">
      <Link
        to={claimed ? "/shop" : "/rakhi"}
        className="fest-banner-body"
        onClick={() => trackEvent({ event_type: "click", label: claimed ? "festival-banner-use" : "festival-banner-play" })}
        data-testid="festival-banner-link"
      >
        <span className="fest-banner-icon" aria-hidden="true">{claimed ? "🎁" : "🎀"}</span>
        {claimed ? (
          <span className="fest-banner-text">
            <strong>{claimed.percent}% off is waiting for you</strong>
            <span className="fest-banner-sub">Code {claimed.code} — use it before it expires</span>
          </span>
        ) : (
          <span className="fest-banner-text">
            <strong>Raksha Bandhan — tie a rakhi, win {offer.min_percent}–{offer.max_percent}% off</strong>
            <span className="fest-banner-sub">Everyone who plays wins something. Takes thirty seconds.</span>
          </span>
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

// The popup's campaign slot. Shown instead of the evergreen offer while the
// festival runs, and it disappears by itself when the campaign closes.
export function FestivalPopupOffer({ onNavigate }) {
  const offer = useFestivalOffer();
  if (!offer?.open) return null;
  const claimed = offer.claimed;

  return (
    <Link
      to={claimed ? "/shop" : "/rakhi"}
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
            ? `Your ${claimed.percent}% Raksha Bandhan code is ready`
            : `Raksha Bandhan: win ${offer.min_percent}–${offer.max_percent}% off everything`}
        </strong>
        <span>
          {claimed
            ? `Code ${claimed.code} — spend it in the store`
            : "Tie a rakhi and unwrap your discount. Everyone wins something."}
        </span>
      </span>
      <Gift size={18} className="fest-popup-arrow" />
    </Link>
  );
}
