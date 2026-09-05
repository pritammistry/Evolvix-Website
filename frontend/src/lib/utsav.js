// The Puja season runs as one campaign with three chapters, not three
// campaigns. One code, one URL to promote, and a reason for the same person to
// come back as each festival arrives.
//
// Chapters unlock by being earned: finish one and the next opens. The code is
// claimable only once all three are done, and it is claimable once — replaying
// afterwards changes nothing, which the copy says plainly so nobody grinds for
// a better number.
//
// Progress lives in localStorage rather than on the server, because nobody is
// signed in while playing — the login only happens at the claim. That means the
// gate is an engagement gate, not a security boundary: someone determined can
// forge it. That is a deliberate trade. Demanding an account before the first
// game would cost far more players than the forgery costs us, and the previous
// campaign made the same trade.

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
  },
  {
    id: "diya",
    path: "/utsav/diya",
    festival: "Diwali",
    title: "One Flame",
    blurb: "One lit diya, a dark courtyard, and a wind that does not help.",
    emoji: "🪔",
  },
  {
    id: "soop",
    path: "/utsav/soop",
    festival: "Chhath",
    title: "Ghat Chalo",
    blurb: "The soop rides on your head. The ghat is a long walk through a crowd.",
    emoji: "🧺",
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

const PROGRESS_KEY = "utsav-progress";

export function completedChapters() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((id) => CHAPTERS.some((c) => c.id === id)) : [];
  } catch {
    return []; // private mode, or something else wrote nonsense to the key
  }
}

export function markComplete(id) {
  try {
    const done = new Set(completedChapters());
    done.add(id);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...done]));
  } catch { /* private mode; the chapter simply will not be remembered */ }
}

export function isComplete(id) {
  return completedChapters().includes(id);
}

// The first chapter is always open. After that, a chapter opens once the one
// before it is done, so the season is walked in order.
export function chapterOpen(chapter) {
  if (previewing()) return true;
  if (!seasonLive()) return false;
  const i = CHAPTERS.findIndex((c) => c.id === chapter.id);
  if (i <= 0) return i === 0;
  return isComplete(CHAPTERS[i - 1].id);
}

export function allComplete() {
  return CHAPTERS.every((c) => completedChapters().includes(c.id));
}

// The chapter to send someone to next: the first one they have not finished.
export function nextChapter() {
  return CHAPTERS.find((c) => !isComplete(c.id)) || null;
}

export function findChapter(id) {
  return CHAPTERS.find((c) => c.id === id) || null;
}

// What a locked card should say instead of a date: which chapter has to be
// finished first.
export function unlockedByLabel(chapter) {
  const i = CHAPTERS.findIndex((c) => c.id === chapter.id);
  if (i <= 0) return "";
  return CHAPTERS[i - 1].title;
}
