// Janmashtami is a one-off, so the game retires itself rather than waiting to
// be taken down by hand. Change this single date to extend or end it; the
// route, the Playground card and the game screen all read it.
export const JANMASHTAMI_ENDS_AT = "2026-09-06T23:59:59+05:30";

export function janmashtamiLive() {
  // ?preview=1 forces the game open regardless of the date, so it can be
  // reviewed and demonstrated outside the festival window without moving the
  // real end date. Same trick the welcome popup uses with ?welcome=1.
  try {
    if (new URLSearchParams(window.location.search).get("preview") === "1") return true;
  } catch { /* no window, e.g. during a build */ }

  const ends = Date.parse(JANMASHTAMI_ENDS_AT);
  // An unparseable date counts as finished, so a typo cannot leave a festival
  // game running on the site for ever.
  if (Number.isNaN(ends)) return false;
  return Date.now() < ends;
}
