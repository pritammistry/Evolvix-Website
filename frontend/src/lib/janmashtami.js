// Janmashtami is a one-off, so the game retires itself rather than waiting to
// be taken down by hand. Change this single date to extend or end it; the
// route, the Playground card and the game screen all read it.
export const JANMASHTAMI_ENDS_AT = "2026-09-02T23:59:59+05:30";

export function janmashtamiLive() {
  const ends = Date.parse(JANMASHTAMI_ENDS_AT);
  // An unparseable date counts as finished, so a typo cannot leave a festival
  // game running on the site for ever.
  if (Number.isNaN(ends)) return false;
  return Date.now() < ends;
}
