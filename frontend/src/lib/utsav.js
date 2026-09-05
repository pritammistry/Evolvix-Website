// The Puja season runs as one campaign with three chapters, not three
// campaigns. One code, one URL to promote, and a reason for the same person to
// come back as each festival arrives.
//
// Dates are the 2026 panchang: Durga Puja Shashthi 17 October and Vijaya
// Dashami 20 October, Diwali 8 November, Chhath's Surya Shashthi 15 November.
// Chapters open on a cascade with no dead air between festivals, and once a
// chapter opens it stays open — replaying an earlier one is part of the point.

export const SEASON_ENDS_AT = "2026-11-15T23:59:59+05:30";

export const CHAPTERS = [
  {
    id: "dhunuchi",
    path: "/utsav/dhunuchi",
    festival: "Durga Puja",
    title: "Dhunuchi Naach",
    // What the player does, in one line, on the hub card.
    blurb: "The dhak starts slow and does not stay slow. Move on the beat.",
    // The drum, not a diya — the Diwali chapter owns the lamp, and two cards
    // carrying the same icon reads as a mistake.
    emoji: "🥁",
    opensAt: "2026-09-05T00:00:00+05:30",
  },
  {
    id: "diya",
    path: "/utsav/diya",
    festival: "Diwali",
    title: "One Flame",
    blurb: "One lit diya, a dark courtyard, and a wind that does not help.",
    emoji: "🪔",
    // The day after Vijaya Dashami, so the season never goes quiet between
    // one festival ending and the next beginning.
    opensAt: "2026-10-21T00:00:00+05:30",
  },
  {
    id: "soop",
    path: "/utsav/soop",
    festival: "Chhath",
    title: "Soop Sajao",
    blurb: "Thekua, sugarcane, coconut, diya. Fill the soop, in order.",
    emoji: "🧺",
    // The day after Bhai Dooj, running into Chhath itself.
    opensAt: "2026-11-11T00:00:00+05:30",
  },
];

// ?preview=1 opens everything regardless of the date, so a chapter can be
// reviewed and demonstrated before its festival without moving a real date.
// Same trick the Janmashtami game and the welcome popup use.
function previewing() {
  try {
    return new URLSearchParams(window.location.search).get("preview") === "1";
  } catch {
    return false; // no window, e.g. during a build
  }
}

export function seasonLive() {
  if (previewing()) return true;
  const ends = Date.parse(SEASON_ENDS_AT);
  // An unparseable date counts as finished, so a typo cannot leave a campaign
  // running on the site for ever.
  if (Number.isNaN(ends)) return false;
  return Date.now() < ends;
}

export function chapterOpen(chapter) {
  if (previewing()) return true;
  const opens = Date.parse(chapter.opensAt);
  if (Number.isNaN(opens)) return false;
  return Date.now() >= opens && seasonLive();
}

export function findChapter(id) {
  return CHAPTERS.find((c) => c.id === id) || null;
}

// "17 October" — for the locked cards, so a visitor knows when to come back
// rather than just being told no.
export function opensOnLabel(chapter) {
  const d = new Date(chapter.opensAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
}
