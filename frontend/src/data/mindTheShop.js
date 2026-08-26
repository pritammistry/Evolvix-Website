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
    options: [
      { label: "Umbrella", icon: "☂️", correct: true },
      { label: "Torch", icon: "🔦" },
      { label: "Slippers", icon: "🩴" },
      { label: "Cap", icon: "🧢" },
    ],
  },
  {
    request: "The bathroom light went out last night.",
    options: [
      { label: "Bulb", icon: "💡", correct: true },
      { label: "Candle", icon: "🕯️" },
      { label: "Matchbox", icon: "🔥" },
      { label: "Extension wire", icon: "🔌" },
    ],
  },
  {
    request: "Guests are coming for tea — I need something to put out with it.",
    options: [
      { label: "Biscuits", icon: "🍪", correct: true },
      { label: "Rice", icon: "🍚" },
      { label: "Soap", icon: "🧼" },
      { label: "Batteries", icon: "🔋" },
    ],
  },

  // ── Middle: one step of inference ──
  {
    request: "My son's pen ran out right in the middle of his exam.",
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
    options: [
      { label: "Mosquito coil", icon: "🌀", correct: true },
      { label: "Room freshener", icon: "🌸" },
      { label: "Table fan", icon: "🌬️" },
      { label: "Soap", icon: "🧼" },
    ],
  },
  {
    request: "I spilled curry down my white shirt at lunch.",
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
    options: [
      { label: "Pain balm", icon: "🧴", correct: true },
      { label: "Cough syrup", icon: "🍯" },
      { label: "Bandage", icon: "🩹" },
      { label: "Face cream", icon: "🧴" },
    ],
  },
  {
    request: "Cricket match tonight — a few friends are coming over.",
    options: [
      { label: "Chips", icon: "🍟", correct: true },
      { label: "Rice", icon: "🍚" },
      { label: "Flour", icon: "🌾" },
      { label: "Washing powder", icon: "🧴" },
    ],
  },
  {
    request: "The milk finished and my husband is waiting for his tea.",
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
    options: [
      { label: "Incense sticks", icon: "🪔", correct: true },
      { label: "Tea leaves", icon: "🍵" },
      { label: "Salt", icon: "🧂" },
      { label: "Notebook", icon: "📓" },
    ],
  },
  {
    request: "I cut my finger chopping onions.",
    options: [
      { label: "Bandage", icon: "🩹", correct: true },
      { label: "Pain balm", icon: "🧴" },
      { label: "Cough syrup", icon: "🍯" },
      { label: "Soap", icon: "🧼" },
    ],
  },
  {
    request: "The kids have holidays and they're driving me mad with boredom.",
    options: [
      { label: "Colouring book", icon: "🖍️", correct: true },
      { label: "Notebook", icon: "📓" },
      { label: "Newspaper", icon: "📰" },
      { label: "Pen", icon: "🖊️" },
    ],
  },
  {
    request: "My neighbour's son is getting married next week.",
    options: [
      { label: "Box of sweets", icon: "🍬", correct: true },
      { label: "Rice", icon: "🍚" },
      { label: "Soap", icon: "🧼" },
      { label: "Notebook", icon: "📓" },
    ],
  },
  {
    request: "It's my turn to bring something for the office on Friday.",
    options: [
      { label: "Chocolates", icon: "🍫", correct: true },
      { label: "Rice", icon: "🍚" },
      { label: "Detergent", icon: "🧴" },
      { label: "Bulb", icon: "💡" },
    ],
  },
  {
    request: "The tea tastes bitter without it.",
    options: [
      { label: "Sugar", icon: "🍬", correct: true },
      { label: "Salt", icon: "🧂" },
      { label: "Milk", icon: "🥛" },
      { label: "Tea leaves", icon: "🍵" },
    ],
  },

  // ── Harder: the request names a constraint, not the item ──
  {
    request: "Something sweet for my father — but he's diabetic.",
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
    options: [
      { label: "Notebook", icon: "📓", correct: true },
      { label: "Pen", icon: "🖊️" },
      { label: "School bag", icon: "🎒" },
      { label: "Eraser", icon: "🧽" },
    ],
  },
  {
    request: "I need to send some papers to the bank tomorrow.",
    options: [
      { label: "Envelope", icon: "✉️", correct: true },
      { label: "Notebook", icon: "📓" },
      { label: "Stapler", icon: "📎" },
      { label: "Cello tape", icon: "🎞️" },
    ],
  },
  {
    request: "Winter is starting and my mother's knees trouble her again.",
    options: [
      { label: "Pain balm", icon: "🧴", correct: true },
      { label: "Cough syrup", icon: "🍯" },
      { label: "Face cream", icon: "🧴" },
      { label: "Bandage", icon: "🩹" },
    ],
  },
  {
    request: "The floor has gone sticky after yesterday's function.",
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
    options: [
      { label: "Wrapping paper", icon: "🎁", correct: true },
      { label: "Chocolates", icon: "🍫" },
      { label: "Notebook", icon: "📓" },
      { label: "Cello tape", icon: "🎞️" },
    ],
    note: "The gift is bought. Something is still missing.",
  },
];

export const ROUNDS_PER_GAME = 8;
export const SECONDS_PER_ROUND = 10;

// Fisher-Yates, so a game is a fresh sample rather than the same first eight.
export function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildRounds() {
  return shuffle(SCENARIOS)
    .slice(0, ROUNDS_PER_GAME)
    .map((scenario) => ({ ...scenario, options: shuffle(scenario.options) }));
}

export function rankFor(score, maxScore) {
  const pct = maxScore ? score / maxScore : 0;
  if (pct >= 0.9) return { title: "Shop Legend", line: "You could run this place blindfolded." };
  if (pct >= 0.7) return { title: "Sharp Shopkeeper", line: "Barely a customer left confused." };
  if (pct >= 0.45) return { title: "Getting the Hang of It", line: "A few puzzled faces, but you managed." };
  return { title: "First Day on the Job", line: "The customers are being very patient with you." };
}
