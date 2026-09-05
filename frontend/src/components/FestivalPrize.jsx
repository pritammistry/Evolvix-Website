import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, Gift, LogIn, Share2 } from "lucide-react";
import { deadlineDate } from "../lib/campaign";

// What every Puja chapter shows once its game is finished: sign in, open the
// code, and then the terms people actually ask about. Shared so the three
// chapters cannot drift into telling visitors three different things about the
// same code.

export function FestivalWon({ claim, claiming, error, user, loginPath, headline, lede }) {
  return (
    <div className="utv-card utv-card--won" data-testid="utsav-won">
      <span className="utv-bloom" aria-hidden="true">🎁</span>
      <h2>{headline}</h2>
      <p className="utv-lede">{lede}</p>
      {user ? (
        <button className="utv-primary" onClick={claim} disabled={claiming} data-testid="utsav-claim">
          <Gift size={18} /> {claiming ? "Opening…" : "Open my gift"}
        </button>
      ) : (
        <Link className="utv-primary" to={loginPath} data-testid="utsav-login">
          <LogIn size={17} /> Sign in to open it
        </Link>
      )}
      {error && <p className="utv-error" data-testid="utsav-error">{error}</p>}
      <p className="utv-fineprint">
        {user
          ? "One code for the whole season — Durga Puja, Diwali and Chhath."
          : "Takes a minute to create an account, and your gift is held for you."}
      </p>
    </div>
  );
}

export function FestivalPrize({ offer, reveal, shareText, shareUrl }) {
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard blocked; the code is on screen to read */ }
  };

  const share = async () => {
    // The native sheet where there is one — it is the only route to WhatsApp,
    // Instagram and the rest on a phone. Clipboard is the desktop fallback.
    if (navigator.share) {
      try {
        await navigator.share({ title: "Evolvix Puja offer", text: shareText, url: shareUrl });
        return;
      } catch { /* dismissed, fall through to copying */ }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2200);
    } catch { /* nothing else to try */ }
  };

  return (
    <div className="utv-card utv-card--prize" data-testid="utsav-claimed">
      <span className="utv-bloom" aria-hidden="true">🎁</span>
      <p className="utv-prize-label">You unwrapped</p>
      <p className="utv-prize" data-testid="utsav-percent">{reveal}<span>% off</span></p>
      <p className="utv-lede">On everything — every product and every service we make.</p>

      <button className="utv-code" onClick={copyCode} data-testid="utsav-code">
        <span>{offer.code}</span>
        {copied ? <Check size={17} /> : <Copy size={16} />}
      </button>
      <p className="utv-fineprint" data-testid="utsav-expiry">
        {copied ? "Copied. " : ""}Good until {deadlineDate(offer.expires_at)} — the whole festival season.
      </p>

      {/* Stated plainly, because all three of these get asked. */}
      <ul className="utv-terms" data-testid="utsav-terms">
        <li>
          <strong>Works on anything we sell.</strong> Every product in the store and
          every service we offer — websites, apps, branding, AI consulting and
          creative work. Not one category.
        </li>
        <li>
          <strong>It is tied to your account.</strong> Sign in with this same login
          and the discount is applied at checkout. Services are quoted rather than
          bought online, so tell us the code when you book one.
        </li>
        <li>
          <strong>{offer.uses_left ?? offer.max_uses} of {offer.max_uses} uses left.</strong> Spend it across any
          mix of products and services, any time this season.
        </li>
        <li>
          <strong>One code for all three festivals.</strong> Playing the Diwali and
          Chhath chapters when they open is for the fun of it — your discount is
          already yours, and it does not get better or worse.
        </li>
      </ul>

      <div className="utv-actions">
        <Link to="/" className="utv-primary" data-testid="utsav-shop">
          Browse everything <ArrowRight size={17} />
        </Link>
        <button className="utv-secondary" onClick={share} data-testid="utsav-share">
          <Share2 size={15} /> {shareCopied ? "Copied!" : "Challenge a friend"}
        </button>
        <a
          className="utv-secondary"
          href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="utsav-whatsapp"
        >
          Send on WhatsApp
        </a>
      </div>
    </div>
  );
}
