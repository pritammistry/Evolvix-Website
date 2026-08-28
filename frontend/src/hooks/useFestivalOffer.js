import { useEffect, useState } from "react";
import { fetchFestivalOffer } from "../api";
import { useAuth } from "./useAuth";

// The festival campaign's single source of truth is the server, so the banner,
// the welcome popup and the game itself can never disagree about whether an
// offer is running — and none of them needs a content edit to switch off. When
// the campaign closes, every one of them stops mentioning it on its own.
//
// The request is shared: several components mount at once on a cold page, and
// one in-flight promise serves all of them.
//
// The cache is keyed on who is asking. Logging in is a client-side transition
// with no page reload, so without the key the banner would keep offering the
// game to someone who had just signed in and already owned a code.

let inflight = null;
let cached = null;
let cachedFor = Symbol("nobody");

function load(key) {
  if (inflight && cachedFor === key) return inflight;
  cachedFor = key;
  cached = null;
  inflight = fetchFestivalOffer()
    .then(({ data }) => { cached = data; return data; })
    // A campaign nobody can reach is better than a broken banner: on any
    // failure the whole thing simply stays hidden.
    .catch(() => { cached = { open: false }; return cached; });
  return inflight;
}

export function refreshFestivalOffer() {
  inflight = null;
  cached = null;
  cachedFor = Symbol("stale");
}

export function useFestivalOffer() {
  const { user, loading } = useAuth();
  const key = user?.id || null;
  const [state, setState] = useState(() => (cachedFor === key ? cached : null));

  useEffect(() => {
    // Waiting for auth to settle avoids a fetch as the anonymous visitor
    // followed immediately by a second one as the signed-in account.
    if (loading) return undefined;
    let alive = true;
    load(key).then((data) => { if (alive) setState(data); });
    return () => { alive = false; };
  }, [key, loading]);

  return state;
}
