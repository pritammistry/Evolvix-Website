// Scenario bank for Mind the Shop.
//
// Written by hand rather than generated at runtime: the customer's request does
// not react to the player, so there is nothing an AI call could add during play.
// Pre-written means zero cost per play and no rate limiting to worry about.
//
// Rules for adding scenarios:
//   - The request must be indirect. "Give me a pen" is not a puzzle.
//   - Exactly one option must be clearly right. If two are arguable, rewrite it.
//   - The wrong options should be plausible shop items, not obvious filler.
//   - Keep it readable for a ten-year-old and familiar to a sixty-year-old.

export const SCENARIOS = [
  // ── Warm-up: the link between request and item is direct ──
  {
    request: "There's no salt left and the curry is already on the stove.",
    difficulty: 1,
    options: [
      { label: "Salt", icon: "🧂", correct: true },
      { label: "Sugar", icon: "🍬" },
      { label: "Flour", icon: "🌾" },
      { label: "Cooking oil", icon: "🫗" },
    ],
    note: "Straight to the point — the easy ones don't last.",
  },
  {
    request: "It's started raining and I've come out without mine.",
    difficulty: 1,
    options: [
      { label: "Umbrella", icon: "☂️", correct: true },
      { label: "Torch", icon: "🔦" },
      { label: "Slippers", icon: "🩴" },
      { label: "Cap", icon: "🧢" },
    ],
    note: "\"Mine\" is doing all the work in that sentence. Rain plus a thing you own and forgot means one thing.",
  },
  {
    request: "The bathroom light went out last night.",
    difficulty: 1,
    options: [
      { label: "Bulb", icon: "💡", correct: true },
      { label: "Candle", icon: "🕯️" },
      { label: "Matchbox", icon: "🔥" },
      { label: "Extension wire", icon: "🔌" },
    ],
    note: "A light that goes out and stays out is a dead bulb. A candle would only prove the point.",
  },
  {
    request: "Guests are coming for tea — I need something to put out with it.",
    difficulty: 1,
    options: [
      { label: "Biscuits", icon: "🍪", correct: true },
      { label: "Rice", icon: "🍚" },
      { label: "Soap", icon: "🧼" },
      { label: "Batteries", icon: "🔋" },
    ],
    note: "They have the tea. What they need is the thing that goes beside it on the plate.",
  },

  // ── Middle: one step of inference ──
  {
    request: "My son's pen ran out right in the middle of his exam.",
    difficulty: 2,
    options: [
      { label: "Pen", icon: "🖊️", correct: true },
      { label: "Notebook", icon: "📓" },
      { label: "Eraser", icon: "🧽" },
      { label: "Glue stick", icon: "🖇️" },
    ],
    note: "He needs the thing that failed him, not stationery in general.",
  },
  {
    request: "Mosquitoes have been eating us alive since the rain.",
    difficulty: 2,
    options: [
      { label: "Mosquito coil", icon: "🌀", correct: true },
      { label: "Room freshener", icon: "🌸" },
      { label: "Table fan", icon: "🌬️" },
      { label: "Soap", icon: "🧼" },
    ],
    note: "A fan moves them around and a freshener perfumes the room. Only one of these kills anything.",
  },
  {
    request: "I spilled curry down my white shirt at lunch.",
    difficulty: 2,
    options: [
      { label: "Detergent", icon: "🧴", correct: true },
      { label: "Bath soap", icon: "🧼" },
      { label: "Shampoo", icon: "🧖" },
      { label: "Floor cleaner", icon: "🪣" },
    ],
    note: "Four things that clean. Only one is for clothes.",
  },
  {
    request: "My head has been paining since morning.",
    difficulty: 2,
    options: [
      { label: "Pain balm", icon: "🧴", correct: true },
      { label: "Cough syrup", icon: "🍯" },
      { label: "Bandage", icon: "🩹" },
      { label: "Face cream", icon: "🧴" },
    ],
    note: "Cough syrup treats a cough and a bandage covers a cut. A headache needs the one you rub on.",
  },
  {
    request: "Cricket match tonight — a few friends are coming over.",
    difficulty: 2,
    options: [
      { label: "Chips", icon: "🍟", correct: true },
      { label: "Rice", icon: "🍚" },
      { label: "Flour", icon: "🌾" },
      { label: "Washing powder", icon: "🧴" },
    ],
    note: "Nobody watches a match over a bowl of rice. Friends in the room means something to open and share.",
  },
  {
    request: "The milk finished and my husband is waiting for his tea.",
    difficulty: 2,
    options: [
      { label: "Milk", icon: "🥛", correct: true },
      { label: "Tea leaves", icon: "🍵" },
      { label: "Sugar", icon: "🍬" },
      { label: "Biscuits", icon: "🍪" },
    ],
    note: "He has tea. He has sugar. He's missing one thing.",
  },
  {
    request: "Tomorrow is the puja at home.",
    difficulty: 2,
    options: [
      { label: "Incense sticks", icon: "🪔", correct: true },
      { label: "Tea leaves", icon: "🍵" },
      { label: "Salt", icon: "🧂" },
      { label: "Notebook", icon: "📓" },
    ],
    note: "A puja needs what you light and offer, not what you cook. Incense is the one item no puja skips.",
  },
  {
    request: "I cut my finger chopping onions.",
    difficulty: 2,
    options: [
      { label: "Bandage", icon: "🩹", correct: true },
      { label: "Pain balm", icon: "🧴" },
      { label: "Cough syrup", icon: "🍯" },
      { label: "Soap", icon: "🧼" },
    ],
    note: "It is an open cut, not an ache. Balm on a fresh cut would only sting.",
  },
  {
    request: "The kids have holidays and they're driving me mad with boredom.",
    difficulty: 2,
    options: [
      { label: "Colouring book", icon: "🖍️", correct: true },
      { label: "Notebook", icon: "📓" },
      { label: "Newspaper", icon: "📰" },
      { label: "Pen", icon: "🖊️" },
    ],
    note: "A notebook is for school, which is exactly what they are escaping. They need something to do, not homework.",
  },
  {
    request: "My neighbour's son is getting married next week.",
    difficulty: 2,
    options: [
      { label: "Box of sweets", icon: "🍬", correct: true },
      { label: "Rice", icon: "🍚" },
      { label: "Soap", icon: "🧼" },
      { label: "Notebook", icon: "📓" },
    ],
    note: "You are not invited into the kitchen, you are turning up at the door. Sweets are what you carry.",
  },
  {
    request: "It's my turn to bring something for the office on Friday.",
    difficulty: 2,
    options: [
      { label: "Chocolates", icon: "🍫", correct: true },
      { label: "Rice", icon: "🍚" },
      { label: "Detergent", icon: "🧴" },
      { label: "Bulb", icon: "💡" },
    ],
    note: "It has to be shareable, need no plates, and survive a desk drawer. Chocolates do all three.",
  },
  {
    request: "The tea tastes bitter without it.",
    difficulty: 2,
    options: [
      { label: "Sugar", icon: "🍬", correct: true },
      { label: "Salt", icon: "🧂" },
      { label: "Milk", icon: "🥛" },
      { label: "Tea leaves", icon: "🍵" },
    ],
    note: "The tea already exists — the leaves and the milk are in it. Bitter without it points at exactly one missing thing.",
  },

  // ── Harder: the request names a constraint, not the item ──
  {
    request: "Something sweet for my father — but he's diabetic.",
    difficulty: 3,
    options: [
      { label: "Sugar-free biscuits", icon: "🍪", correct: true },
      { label: "Box of sweets", icon: "🍬" },
      { label: "Chocolate", icon: "🍫" },
      { label: "Sugar", icon: "🧂" },
    ],
    note: "Three of these would land him in hospital.",
  },
  {
    request: "I'm travelling overnight and there's no plug point on the train.",
    difficulty: 3,
    options: [
      { label: "Power bank", icon: "🔋", correct: true },
      { label: "Charger cable", icon: "🔌" },
      { label: "Extension board", icon: "🔗" },
      { label: "Bulb", icon: "💡" },
    ],
    note: "A charger is no use with nothing to plug it into.",
  },
  {
    request: "The power keeps going at night and the children get frightened.",
    difficulty: 3,
    options: [
      { label: "Torch", icon: "🔦", correct: true },
      { label: "Bulb", icon: "💡" },
      { label: "Table fan", icon: "🌬️" },
      { label: "Extension board", icon: "🔗" },
    ],
    note: "A bulb needs the electricity that just went.",
  },
  {
    request: "My son says everyone in his class has the one with a spiral.",
    difficulty: 3,
    options: [
      { label: "Notebook", icon: "📓", correct: true },
      { label: "Pen", icon: "🖊️" },
      { label: "School bag", icon: "🎒" },
      { label: "Eraser", icon: "🧽" },
    ],
    note: "The spiral is the clue, and the only stationery it describes is a notebook's binding.",
  },
  {
    request: "I need to send some papers to the bank tomorrow.",
    difficulty: 2,
    options: [
      { label: "Envelope", icon: "✉️", correct: true },
      { label: "Notebook", icon: "📓" },
      { label: "Stapler", icon: "📎" },
      { label: "Cello tape", icon: "🎞️" },
    ],
    note: "The papers already exist. What they lack is something to travel in.",
  },
  {
    request: "Winter is starting and my mother's knees trouble her again.",
    difficulty: 2,
    options: [
      { label: "Pain balm", icon: "🧴", correct: true },
      { label: "Cough syrup", icon: "🍯" },
      { label: "Face cream", icon: "🧴" },
      { label: "Bandage", icon: "🩹" },
    ],
    note: "Old joints in the cold want heat rubbed in. A bandage holds a wound, not an ache.",
  },
  {
    request: "The floor has gone sticky after yesterday's function.",
    difficulty: 3,
    options: [
      { label: "Floor cleaner", icon: "🪣", correct: true },
      { label: "Detergent", icon: "🧴" },
      { label: "Dish soap", icon: "🍽️" },
      { label: "Shampoo", icon: "🧖" },
    ],
    note: "Everything here cleans something. Only one cleans floors.",
  },
  {
    request: "Her birthday is Sunday and I've bought the present already.",
    difficulty: 3,
    options: [
      { label: "Wrapping paper", icon: "🎁", correct: true },
      { label: "Chocolates", icon: "🍫" },
      { label: "Notebook", icon: "📓" },
      { label: "Cello tape", icon: "🎞️" },
    ],
    note: "The gift is bought. Something is still missing.",
  },
  {
    request: "The neighbours have started complaining about the smell from the bin.",
    difficulty: 3,
    options: [
      { label: "Garbage bags", icon: "🗑️", correct: true },
      { label: "Room freshener", icon: "🌸" },
      { label: "Floor cleaner", icon: "🪣" },
      { label: "Soap", icon: "🧼" },
    ],
    note: "Freshener hides the smell. Bags stop it.",
  },
  {
    request: "I keep forgetting to take them after lunch.",
    difficulty: 3,
    options: [
      { label: "Pill box", icon: "💊", correct: true },
      { label: "Cough syrup", icon: "🍯" },
      { label: "Notebook", icon: "📓" },
      { label: "Water bottle", icon: "🍶" },
    ],
    note: "He already has the medicine. He needs a way to remember it.",
  },
  {
    request: "There's a function at home tomorrow and the fan is thick with dust.",
    difficulty: 3,
    options: [
      { label: "Cleaning cloth", icon: "🧻", correct: true },
      { label: "Floor cleaner", icon: "🪣" },
      { label: "Detergent", icon: "🧴" },
      { label: "Room freshener", icon: "🌸" },
    ],
    note: "You can't mop a ceiling fan.",
  },
  {
    request: "The children will only finish their milk if it tastes of something.",
    difficulty: 3,
    options: [
      { label: "Health drink powder", icon: "🥤", correct: true },
      { label: "Milk", icon: "🥛" },
      { label: "Sugar", icon: "🍬" },
      { label: "Biscuits", icon: "🍪" },
    ],
    note: "They have milk. It needs flavouring, not more milk.",
  },
  // ── More warm-ups: the item is all but named ──
  {
    request: "The soap in the bathroom has finished.",
    difficulty: 1,
    options: [
      { label: "Bath soap", icon: "🧼", correct: true },
      { label: "Shampoo", icon: "🧖" },
      { label: "Detergent", icon: "🧴" },
      { label: "Toothpaste", icon: "🪥" },
    ],
    note: "Four things lather. Only one of them is what sits by a bathroom tap.",
  },
  {
    request: "My toothpaste tube is completely empty.",
    difficulty: 1,
    options: [
      { label: "Toothpaste", icon: "🪥", correct: true },
      { label: "Bath soap", icon: "🧼" },
      { label: "Shampoo", icon: "🧖" },
      { label: "Face cream", icon: "🧴" },
    ],
    note: "The thing that ran out is named in the sentence. Not every customer makes you work for it.",
  },
  {
    request: "The rice is over and we haven't cooked yet.",
    difficulty: 1,
    options: [
      { label: "Rice", icon: "🍚", correct: true },
      { label: "Flour", icon: "🌾" },
      { label: "Salt", icon: "🧂" },
      { label: "Cooking oil", icon: "🫗" },
    ],
    note: "Nothing else on the shelf becomes dinner in the next hour.",
  },
  {
    request: "There's no shampoo left and I have to wash my hair.",
    difficulty: 1,
    options: [
      { label: "Shampoo", icon: "🧖", correct: true },
      { label: "Bath soap", icon: "🧼" },
      { label: "Detergent", icon: "🧴" },
      { label: "Face cream", icon: "🧴" },
    ],
    note: "Bath soap on hair is what people do when the shop has failed them.",
  },
  {
    request: "We've run out of cooking oil halfway through frying.",
    difficulty: 1,
    options: [
      { label: "Cooking oil", icon: "🫗", correct: true },
      { label: "Salt", icon: "🧂" },
      { label: "Flour", icon: "🌾" },
      { label: "Sugar", icon: "🍬" },
    ],
    note: "Mid-fry means it is urgent, and it has to be the same thing rather than a substitute.",
  },
  {
    request: "I need something to write the shopping list on.",
    difficulty: 1,
    options: [
      { label: "Notepad", icon: "📓", correct: true },
      { label: "Pen", icon: "🖊️" },
      { label: "Envelope", icon: "✉️" },
      { label: "Newspaper", icon: "📰" },
    ],
    note: "They have the shop and the list in their head. What is missing is the paper.",
  },
  {
    request: "I want to boil a few eggs for the children's breakfast.",
    difficulty: 1,
    options: [
      { label: "Eggs", icon: "🥚", correct: true },
      { label: "Milk", icon: "🥛" },
      { label: "Bread", icon: "🍞" },
      { label: "Rice", icon: "🍚" },
    ],
    note: "Everything needed to boil them is already at home. The eggs themselves are not.",
  },
  {
    request: "It's her birthday and the cake is ready, but bare on top.",
    difficulty: 1,
    options: [
      { label: "Candles", icon: "🕯️", correct: true },
      { label: "Matchbox", icon: "🔥" },
      { label: "Chocolates", icon: "🍫" },
      { label: "Wrapping paper", icon: "🎁" },
    ],
    note: "The cake is baked and iced. What a bare top is missing is the thing you light.",
  },

  // ── More middles ──
  {
    request: "The torch is fine but nothing happens when I press it.",
    difficulty: 2,
    options: [
      { label: "Batteries", icon: "🔋", correct: true },
      { label: "Torch", icon: "🔦" },
      { label: "Bulb", icon: "💡" },
      { label: "Extension wire", icon: "🔌" },
    ],
    note: "The torch works. Something inside it doesn't.",
  },
  {
    request: "My daughter's bottle leaked all over her school bag again.",
    difficulty: 2,
    options: [
      { label: "Water bottle", icon: "🍶", correct: true },
      { label: "School bag", icon: "🎒" },
      { label: "Tiffin box", icon: "🍱" },
      { label: "Napkin", icon: "🧻" },
    ],
    note: "Replace what leaked, not what it leaked into.",
  },
  {
    request: "I want the sweets to still be good on Sunday.",
    difficulty: 2,
    options: [
      { label: "Airtight container", icon: "🫙", correct: true },
      { label: "Paper bag", icon: "🛍️" },
      { label: "Newspaper", icon: "📰" },
      { label: "Cello tape", icon: "🎞️" },
    ],
    note: "The sweets are already bought. Keeping them is an air problem, not a cold problem.",
  },
  {
    request: "The children's school shoes have gone dull and grey.",
    difficulty: 2,
    options: [
      { label: "Shoe polish", icon: "🥾", correct: true },
      { label: "Detergent", icon: "🧴" },
      { label: "Floor cleaner", icon: "🪣" },
      { label: "Bath soap", icon: "🧼" },
    ],
    note: "Dull is not dirty. Washing them leaves them clean and still grey — polish is what brings the colour back.",
  },

  // ── More hard ones: the answer is never the noun in the sentence ──
  {
    request: "The tap has been dripping all night and nobody can sleep.",
    difficulty: 3,
    options: [
      { label: "Tap washer", icon: "🔧", correct: true },
      { label: "Bucket", icon: "🪣" },
      { label: "Cleaning cloth", icon: "🧻" },
      { label: "Bath soap", icon: "🧼" },
    ],
    note: "A bucket catches it. Only one of these stops it.",
  },
  {
    request: "My mother complains the tea is never hot by the time she drinks it.",
    difficulty: 3,
    options: [
      { label: "Flask", icon: "🫖", correct: true },
      { label: "Tea leaves", icon: "🍵" },
      { label: "Milk", icon: "🥛" },
      { label: "Sugar", icon: "🍬" },
    ],
    note: "Nothing wrong with the tea. It's the waiting.",
  },
  {
    request: "His lunch is packed by seven but he only eats it at one.",
    difficulty: 3,
    options: [
      { label: "Insulated tiffin", icon: "🍱", correct: true },
      { label: "Tiffin box", icon: "🥡" },
      { label: "Aluminium foil", icon: "🎞️" },
      { label: "Napkin", icon: "🧻" },
    ],
    note: "An ordinary box holds it. It doesn't keep it warm.",
  },
  {
    request: "The clothes in the almirah have started smelling of damp.",
    difficulty: 3,
    options: [
      { label: "Naphthalene balls", icon: "⚪", correct: true },
      { label: "Room freshener", icon: "🌸" },
      { label: "Detergent", icon: "🧴" },
      { label: "Bath soap", icon: "🧼" },
    ],
    note: "Freshener perfumes the room, not the cupboard.",
  },
  {
    request: "I've bought the sweets but the box got crushed on the way home.",
    difficulty: 3,
    options: [
      { label: "Gift box", icon: "🎁", correct: true },
      { label: "Box of sweets", icon: "🍬" },
      { label: "Wrapping paper", icon: "🎀" },
      { label: "Cello tape", icon: "🎞️" },
    ],
    note: "The sweets are fine. The box isn't.",
  },
  {
    request: "I've written the address on the parcel but it keeps coming open.",
    difficulty: 3,
    options: [
      { label: "Packing tape", icon: "📦", correct: true },
      { label: "Envelope", icon: "✉️" },
      { label: "Glue stick", icon: "🖇️" },
      { label: "Stapler", icon: "📎" },
    ],
    note: "Glue won't hold a parcel shut.",
  },
];

export const ROUNDS_PER_GAME = 8;

// How many rounds come from each difficulty tier, in order of play. The game
// opens easy so nobody bounces on round one, then gets genuinely harder.
export const DIFFICULTY_CURVE = [1, 1, 2, 2, 2, 3, 3, 3];

// Harder rounds also get less time, so the pressure rises with the puzzle.
export const SECONDS_BY_DIFFICULTY = { 1: 12, 2: 10, 3: 8 };
export const SECONDS_PER_ROUND = SECONDS_BY_DIFFICULTY[2];

// Fisher-Yates, so a game is a fresh sample rather than the same first eight.
export function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Scenarios seen in recent games, oldest first. Without this a fresh shuffle
// each game means the same scenario can land in three plays running, which is
// what makes a small pool feel smaller than it is.
const RECENT_KEY = "evolvix_mts_recent";
const RECENT_MEMORY = 24; // roughly the last three games

function readRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}

export function rememberRounds(rounds) {
  try {
    const merged = [...readRecent(), ...rounds.map((r) => r.request)];
    localStorage.setItem(RECENT_KEY, JSON.stringify(merged.slice(-RECENT_MEMORY)));
  } catch {
    // Storage unavailable — the game still works, it just repeats sooner.
  }
}

// Unseen scenarios first, then the ones seen longest ago. Shuffled beforehand
// so scenarios with equal staleness don't always come out in the same order.
function freshestFirst(pool, recent) {
  return shuffle(pool).sort(
    (a, b) => recent.indexOf(a.request) - recent.indexOf(b.request)
  );
}

// Draws one scenario per step of the curve, preferring ones the player has not
// seen lately. Falls back across tiers if a tier ever runs dry, so a game is
// never returned short.
export function buildRounds() {
  const recent = readRecent();
  const pools = {
    1: freshestFirst(SCENARIOS.filter((s) => s.difficulty === 1), recent),
    2: freshestFirst(SCENARIOS.filter((s) => s.difficulty === 2), recent),
    3: freshestFirst(SCENARIOS.filter((s) => s.difficulty === 3), recent),
  };
  const used = new Set();
  const rounds = DIFFICULTY_CURVE.map((tier) => {
    let scenario = pools[tier].find((s) => !used.has(s.request));
    if (!scenario) scenario = SCENARIOS.find((s) => !used.has(s.request));
    used.add(scenario.request);
    return {
      ...scenario,
      seconds: SECONDS_BY_DIFFICULTY[scenario.difficulty] || SECONDS_PER_ROUND,
      options: shuffle(scenario.options),
    };
  });
  rememberRounds(rounds);
  return rounds;
}

export function maxScoreFor(rounds) {
  return rounds.reduce((total, r) => total + 100 + r.seconds * 10, 0);
}

export function rankFor(score, maxScore) {
  const pct = maxScore ? score / maxScore : 0;
  if (pct >= 0.9) return { title: "Shop Legend", line: "You could run this place blindfolded." };
  if (pct >= 0.7) return { title: "Sharp Shopkeeper", line: "Barely a customer left confused." };
  if (pct >= 0.45) return { title: "Getting the Hang of It", line: "A few puzzled faces, but you managed." };
  return { title: "First Day on the Job", line: "The customers are being very patient with you." };
}
