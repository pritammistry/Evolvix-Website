import { useCallback, useEffect, useRef, useState } from "react";
import { claimFestivalOffer, fetchFestivalOffer } from "../api";
import { trackEvent } from "../components/AnalyticsTracker";
import { useAuth } from "./useAuth";

// The claim half of a festival game, lifted out of the Rakhi page so all three
// Puja chapters share one flow rather than each growing its own copy. The games
// differ; what happens after you win does not.
//
// Two things here are less obvious than they look:
//
// Winning is remembered in sessionStorage, because claiming needs an account
// and signing in navigates away. Without it, everyone who was not already
// logged in would come back to a page that had forgotten they won and be made
// to play a second time.
//
// The reveal counts up on the clock rather than on a frame count. Browsers
// throttle timers in a background tab and a frame-counted version stalls part
// way — which on this screen means showing someone a discount that is not the
// one on their code.

const WON_KEY = "utsav-won";

export function useFestivalClaim({ label, returnPath }) {
  const { user, loading: authLoading } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [offer, setOffer] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState(0);
  const claimedRef = useRef(false);

  // Someone who already holds a code should see it rather than replay anything.
  useEffect(() => {
    let alive = true;
    fetchFestivalOffer()
      .then(({ data }) => {
        if (!alive) return;
        setCampaign(data);
        if (data.claimed) {
          claimedRef.current = true;
          setOffer(data.claimed);
          setReveal(data.claimed.percent);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [user]);

  const claim = useCallback(async () => {
    if (claimedRef.current) return;
    setClaiming(true);
    setError("");
    try {
      const { data } = await claimFestivalOffer();
      claimedRef.current = true;
      setOffer(data);
      try { sessionStorage.removeItem(WON_KEY); } catch { /* private mode */ }
      trackEvent({ event_type: "offer_claimed", label, metadata: { percent: data.percent } });
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not get your code. Please try again.");
    } finally {
      setClaiming(false);
    }
  }, [label]);

  // Call this the moment the game is won, before any sign-in detour.
  const recordWin = useCallback(() => {
    try { sessionStorage.setItem(WON_KEY, "1"); } catch { /* private mode */ }
    trackEvent({ event_type: "game_complete", label });
  }, [label]);

  // Coming back from the login page: the win survived the round trip, so the
  // code appears without making anyone play again.
  useEffect(() => {
    if (authLoading || !user || claimedRef.current || claiming) return;
    let won = false;
    try { won = sessionStorage.getItem(WON_KEY) === "1"; } catch { /* private mode */ }
    if (won) claim();
  }, [authLoading, user, claiming, claim]);

  useEffect(() => {
    if (!offer) return undefined;
    const DURATION = 900;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - startedAt) / DURATION);
      setReveal(Math.round(offer.percent * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) clearInterval(id);
    }, 26);
    // Whatever happens to the timer, the true figure is on screen shortly after.
    const settle = setTimeout(() => setReveal(offer.percent), DURATION + 120);
    return () => { clearInterval(id); clearTimeout(settle); };
  }, [offer]);

  return {
    user,
    authLoading,
    campaign,
    offer,
    claiming,
    error,
    reveal,
    claim,
    recordWin,
    loginPath: `/login?next=${encodeURIComponent(returnPath)}`,
  };
}
