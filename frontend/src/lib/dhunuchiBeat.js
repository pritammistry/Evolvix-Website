// The beat map for Dhunuchi Naach, kept out of the component so it can be
// reasoned about and tested on its own. Nothing here touches React or canvas.
//
// The dhak genuinely accelerates towards a crescendo, so the tempo climbs
// rather than sitting at one speed — that is the shape of the real dance and it
// gives the game its difficulty curve for free.

export const PHASES = [
  { bpm: 84, beats: 8, name: "Aarti" },
  { bpm: 104, beats: 8, name: "The dhak wakes" },
  { bpm: 126, beats: 10, name: "Faster now" },
  { bpm: 150, beats: 12, name: "Crescendo" },
];

export const COUNT_IN = 4;        // unjudged beats, so nobody is scored before finding the tempo
export const APPROACH_MS = 1500;  // how long a ring is visible before its beat lands
export const PERFECT_MS = 120;
export const GOOD_MS = 240;

export const TOTAL_BEATS = PHASES.reduce((n, p) => n + p.beats, 0);

// Times are absolute milliseconds from the start of the routine. Building the
// whole map up front rather than scheduling beat-by-beat means a dropped frame
// cannot make the rhythm drift: every beat already knows when it belongs.
export function buildSchedule() {
  const beats = [];
  const lead = 60000 / PHASES[0].bpm;
  let t = 1200;
  for (let i = 0; i < COUNT_IN; i += 1) { beats.push({ t, phase: 0, countIn: true }); t += lead; }
  PHASES.forEach((ph, pi) => {
    const step = 60000 / ph.bpm;
    for (let i = 0; i < ph.beats; i += 1) { beats.push({ t, phase: pi, countIn: false }); t += step; }
  });
  return { beats, endsAt: t + 1100 };
}

// Which beat a strike belongs to, or null when it lands nowhere near one.
// Extra strikes between beats are free — only a beat that goes by untouched
// costs anything, so mashing cannot be punished but neither does it help.
export function judgeStrike(beats, now) {
  let bestIdx = -1;
  let bestGap = Infinity;
  for (let i = 0; i < beats.length; i += 1) {
    const b = beats[i];
    if (b.judged || b.countIn) continue;
    const gap = Math.abs(now - b.t);
    if (gap < bestGap) { bestGap = gap; bestIdx = i; }
  }
  if (bestIdx < 0 || bestGap > GOOD_MS) return null;
  return { index: bestIdx, delta: now - beats[bestIdx].t, perfect: bestGap <= PERFECT_MS };
}
