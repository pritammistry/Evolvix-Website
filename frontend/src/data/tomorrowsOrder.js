// Scenario bank for Tomorrow's Order.
//
// The player is a shopkeeper closing up for the night. Three signals about
// tomorrow are on the table; they pick three things to stock up on, then watch
// the day play out.
//
// Rules for adding a night:
//   - The signals must imply the answer without naming it.
//   - Exactly three shelf items sell out. The other five must be plausible
//     things this shop would stock, not filler.
//   - At least one wrong option should be a trap a hasty player would take —
//     the obvious word in the signal, or something the situation quietly rules
//     out (no ice cream on a day the power is off).
//   - The verdict explains the reasoning in one sentence. That sentence is the
//     whole point of the round; write it before writing the shelf.

export const ITEMS = {
  umbrella: { label: "Umbrella", icon: "☂️" },
  raincoat: { label: "Raincoat", icon: "🧥" },
  torch: { label: "Torch", icon: "🔦" },
  ice_cream: { label: "Ice cream", icon: "🍦" },
  sunscreen: { label: "Sunscreen", icon: "☀️" },
  cold_drinks: { label: "Cold drinks", icon: "🥤" },
  kite: { label: "Kites", icon: "🪁" },
  sunglasses: { label: "Sunglasses", icon: "🕶️" },
  diyas: { label: "Diyas", icon: "🪔" },
  sweets: { label: "Sweet boxes", icon: "🍬" },
  gift_wrap: { label: "Gift wrap", icon: "🎁" },
  notebooks: { label: "Notebooks", icon: "📓" },
  detergent: { label: "Detergent", icon: "🧴" },
  mosquito_coil: { label: "Mosquito coils", icon: "🌀" },
  rice: { label: "Rice", icon: "🍚" },
  soap: { label: "Bath soap", icon: "🧼" },
  pens: { label: "Pens", icon: "🖊️" },
  geometry_box: { label: "Geometry box", icon: "📐" },
  water_bottles: { label: "Water bottles", icon: "💧" },
  woollens: { label: "Woollens", icon: "🧣" },
  candles: { label: "Candles", icon: "🕯️" },
  hot_water_bag: { label: "Hot water bag", icon: "♨️" },
  flowers: { label: "Flowers", icon: "🌼" },
  phenyl: { label: "Phenyl", icon: "🪣" },
  batteries: { label: "Batteries", icon: "🔋" },
  chips: { label: "Chips", icon: "🍟" },
  biscuits: { label: "Biscuits", icon: "🍪" },
  incense: { label: "Incense", icon: "🌫️" },
  mosquito_net: { label: "Mosquito net", icon: "🛏️" },
  hand_fan: { label: "Hand fans", icon: "🪭" },
  curd: { label: "Curd", icon: "🥣" },
  flour: { label: "Flour", icon: "🌾" },
  cooking_oil: { label: "Cooking oil", icon: "🫗" },
  school_bag: { label: "School bags", icon: "🎒" },
  fruits: { label: "Fruit", icon: "🍎" },
  sabudana: { label: "Sabudana", icon: "🍥" },
  milk: { label: "Milk", icon: "🥛" },
  tea: { label: "Tea leaves", icon: "🍵" },
  cold_cream: { label: "Cold cream", icon: "🫙" },
  lip_balm: { label: "Lip balm", icon: "💄" },
  glucose: { label: "Glucose powder", icon: "🧃" },
  gulal: { label: "Gulal colours", icon: "🎨" },
  pichkari: { label: "Pichkaris", icon: "💦" },
  coconut_oil: { label: "Coconut oil", icon: "🥥" },
  chocolates: { label: "Chocolates", icon: "🍫" },
  tarpaulin: { label: "Tarpaulin sheet", icon: "⛺" },
  paper_plates: { label: "Paper plates", icon: "🍽️" },
  wet_wipes: { label: "Wet wipes", icon: "🧻" },
  floor_cleaner: { label: "Floor cleaner", icon: "🧽" },
  shampoo: { label: "Shampoo", icon: "🧖" },
  halogen_tablets: { label: "Water purifying tablets", icon: "🧪" },
  bread: { label: "Bread", icon: "🍞" },
  eggs: { label: "Eggs", icon: "🥚" },
  pain_balm: { label: "Pain balm", icon: "💊" },
  cough_syrup: { label: "Cough syrup", icon: "🍯" },
  bandage: { label: "Bandages", icon: "🩹" },
  sanitiser: { label: "Sanitiser", icon: "🫧" },
  thermometer: { label: "Thermometer", icon: "🌡️" },
  dates: { label: "Dates", icon: "🌴" },
  newspaper: { label: "Newspapers", icon: "📰" },
  hair_oil: { label: "Hair oil", icon: "💆" },
};

export const NIGHTS = [
  // ── Tier 1: the signals point almost straight at the answer ──
  {
    id: "wet-week",
    difficulty: 1,
    signals: [
      { icon: "🌧️", text: "Heavy rain forecast from early morning" },
      { icon: "🏫", text: "The school has not declared a holiday" },
      { icon: "💡", text: "Power has gone every evening this week" },
    ],
    shelf: ["umbrella", "raincoat", "torch", "ice_cream", "sunscreen", "cold_drinks", "kite", "sunglasses"],
    demand: ["umbrella", "raincoat", "torch"],
    verdict: "Children still have to reach school in the rain, and the evening cut sells a torch every single time.",
  },
  {
    id: "diwali-eve",
    difficulty: 1,
    signals: [
      { icon: "🪔", text: "Diwali is tomorrow" },
      { icon: "🚂", text: "Three families have relatives arriving" },
      { icon: "🧒", text: "Children have been asking about lights all week" },
    ],
    shelf: ["diyas", "sweets", "gift_wrap", "notebooks", "detergent", "mosquito_coil", "rice", "soap"],
    demand: ["diyas", "sweets", "gift_wrap"],
    verdict: "Nobody buys detergent on Diwali eve. They buy what they can light, eat and hand over.",
  },
  {
    id: "board-exams",
    difficulty: 1,
    signals: [
      { icon: "📅", text: "Board exams start on Monday" },
      { icon: "📋", text: "The school circulated a stationery list" },
      { icon: "🌙", text: "Half the lane's lights are on past midnight" },
    ],
    shelf: ["pens", "notebooks", "geometry_box", "kite", "detergent", "ice_cream", "mosquito_coil", "cold_drinks"],
    demand: ["pens", "notebooks", "geometry_box"],
    verdict: "A stationery list before an exam is an order form. Stock what's printed on it.",
  },
  {
    id: "heatwave",
    difficulty: 1,
    signals: [
      { icon: "🌡️", text: "42 degrees forecast, no clouds" },
      { icon: "🚰", text: "Municipal water supply cut till evening" },
      { icon: "🏏", text: "Children out playing all afternoon regardless" },
    ],
    shelf: ["cold_drinks", "water_bottles", "ice_cream", "woollens", "umbrella", "candles", "mosquito_coil", "hot_water_bag"],
    demand: ["cold_drinks", "water_bottles", "ice_cream"],
    verdict: "A water cut in a heatwave turns bottled water into the fastest-moving thing on the shelf.",
  },
  {
    id: "wedding-lane",
    difficulty: 1,
    signals: [
      { icon: "💒", text: "A wedding two lanes over tomorrow" },
      { icon: "✉️", text: "Half the street has been invited" },
      { icon: "🚚", text: "The decorators arrived this evening" },
    ],
    shelf: ["gift_wrap", "flowers", "sweets", "notebooks", "phenyl", "mosquito_coil", "batteries", "rice"],
    demand: ["gift_wrap", "flowers", "sweets"],
    verdict: "Everyone invited needs something to carry in their hands, and they'll buy it on the way.",
  },
  {
    id: "the-final",
    difficulty: 1,
    signals: [
      { icon: "🏏", text: "India play the final at seven tomorrow" },
      { icon: "🪑", text: "The tea shop has put out extra chairs" },
      { icon: "📺", text: "Neighbours are planning to watch together" },
    ],
    shelf: ["chips", "cold_drinks", "biscuits", "notebooks", "detergent", "umbrella", "incense", "rice"],
    demand: ["chips", "cold_drinks", "biscuits"],
    verdict: "Nobody watches a final empty-handed. Six people in one room is six packets of something.",
  },
  {
    id: "after-the-rain",
    difficulty: 1,
    signals: [
      { icon: "🌧️", text: "It rained all of last week" },
      { icon: "🦟", text: "Water standing near the drain" },
      { icon: "🤒", text: "Two children in the lane down with fever" },
    ],
    shelf: ["mosquito_coil", "phenyl", "mosquito_net", "kite", "sunscreen", "ice_cream", "hair_oil", "chocolates"],
    demand: ["mosquito_coil", "phenyl", "mosquito_net"],
    verdict: "Standing water plus fever in the lane means every mother is thinking about mosquitoes tonight.",
  },

  // ── Tier 2: one step of inference, with a trap ──
  {
    id: "daytime-cut",
    difficulty: 2,
    signals: [
      { icon: "⚡", text: "Notice: power off nine to five tomorrow" },
      { icon: "🌡️", text: "Hot and humid all day" },
      { icon: "🥛", text: "The dairy van comes at noon" },
    ],
    shelf: ["hand_fan", "water_bottles", "batteries", "ice_cream", "curd", "cold_drinks", "umbrella", "notebooks"],
    demand: ["hand_fan", "water_bottles", "batteries"],
    verdict: "With the power off all day nothing stays cold — the ice cream would have melted in your own freezer.",
  },
  {
    id: "bandh",
    difficulty: 2,
    signals: [
      { icon: "🚫", text: "A bandh has been called for tomorrow" },
      { icon: "🚛", text: "No delivery trucks will run" },
      { icon: "🏠", text: "Everyone will be at home all day" },
    ],
    shelf: ["flour", "cooking_oil", "biscuits", "gift_wrap", "school_bag", "sunscreen", "kite", "hair_oil"],
    demand: ["flour", "cooking_oil", "biscuits"],
    verdict: "A shut-down day sends people to the kitchen shelf, not the gift shelf.",
  },
  {
    id: "fasting-day",
    difficulty: 2,
    signals: [
      { icon: "🌙", text: "Tomorrow is a fasting day" },
      { icon: "🏘️", text: "Most of the lane observes it" },
      { icon: "🌇", text: "They eat only after sunset" },
    ],
    shelf: ["fruits", "sabudana", "milk", "rice", "flour", "biscuits", "chips", "cooking_oil"],
    demand: ["fruits", "sabudana", "milk"],
    verdict: "Grain is exactly what they cannot eat. Stock the things that are allowed instead.",
  },
  {
    id: "cold-snap",
    difficulty: 2,
    signals: [
      { icon: "🌡️", text: "Temperature dropped eight degrees overnight" },
      { icon: "☕", text: "The chai stall doubled its order" },
      { icon: "🍃", text: "Dry wind blowing since morning" },
    ],
    shelf: ["tea", "cold_cream", "lip_balm", "ice_cream", "cold_drinks", "sunscreen", "mosquito_coil", "umbrella"],
    demand: ["tea", "cold_cream", "lip_balm"],
    verdict: "Dry cold cracks skin before it makes anyone ill — it sells cream and balm long before medicine.",
  },
  {
    id: "corner-plot",
    difficulty: 2,
    signals: [
      { icon: "🏗️", text: "A crew started work on the corner plot" },
      { icon: "🕐", text: "They break for lunch at one" },
      { icon: "🚱", text: "There's no tap on the site" },
    ],
    shelf: ["water_bottles", "biscuits", "glucose", "hair_oil", "gift_wrap", "shampoo", "ice_cream", "sweets"],
    demand: ["water_bottles", "biscuits", "glucose"],
    verdict: "Twelve men working in the sun with no tap. They'll be at your counter by eleven.",
  },
  {
    id: "holi-eve",
    difficulty: 2,
    signals: [
      { icon: "🎨", text: "Holi tomorrow" },
      { icon: "🕛", text: "Everyone plays till noon" },
      { icon: "👕", text: "Old clothes coming out of every almirah" },
    ],
    shelf: ["gulal", "pichkari", "coconut_oil", "umbrella", "notebooks", "mosquito_coil", "incense", "batteries"],
    demand: ["gulal", "pichkari", "coconut_oil"],
    verdict: "The oil goes on before the colour does. That's the one everybody forgets to stock.",
  },
  {
    id: "pay-day",
    difficulty: 2,
    signals: [
      { icon: "📅", text: "Tomorrow is the first of the month" },
      { icon: "💰", text: "Salaries came in today" },
      { icon: "📒", text: "Two customers cleared their credit book" },
    ],
    shelf: ["rice", "cooking_oil", "detergent", "chocolates", "ice_cream", "kite", "hair_oil", "sunglasses"],
    demand: ["rice", "cooking_oil", "detergent"],
    verdict: "Pay day is when the whole monthly list gets filled at once. Stock the bulk, not the treats.",
  },

  // ── Tier 3: the answer is nowhere in the words ──
  {
    id: "procession-rain",
    difficulty: 3,
    signals: [
      { icon: "💒", text: "A wedding procession passes tomorrow evening" },
      { icon: "🌧️", text: "Rain likely after six" },
      { icon: "🎪", text: "The caterer has already sent the sweets and flowers" },
    ],
    shelf: ["umbrella", "tarpaulin", "gift_wrap", "sweets", "flowers", "cold_drinks", "ice_cream", "sunscreen"],
    demand: ["umbrella", "tarpaulin", "gift_wrap"],
    verdict: "The caterer covered the food. What nobody plans for is rain landing on a procession.",
  },
  {
    id: "pipeline-repair",
    difficulty: 3,
    signals: [
      { icon: "🚱", text: "Pipeline repair — no water for two days" },
      { icon: "🧺", text: "Tomorrow is wash day for most homes" },
      { icon: "🍽️", text: "A lane full of families still has to eat" },
    ],
    shelf: ["water_bottles", "paper_plates", "wet_wipes", "detergent", "phenyl", "soap", "floor_cleaner", "shampoo"],
    demand: ["water_bottles", "paper_plates", "wet_wipes"],
    verdict: "Five cleaning products on that shelf and not a drop of water to use them with. People buy what saves washing.",
  },
  {
    id: "hottest-night",
    difficulty: 3,
    signals: [
      { icon: "🌡️", text: "Hottest night of the year forecast" },
      { icon: "⚡", text: "Load shedding from eleven at night" },
      { icon: "📚", text: "Exams start on Monday" },
    ],
    shelf: ["candles", "batteries", "mosquito_coil", "cold_drinks", "ice_cream", "notebooks", "pens", "umbrella"],
    demand: ["candles", "batteries", "mosquito_coil"],
    verdict: "Windows open all night with no fan. It's a mosquito problem before it's a light problem.",
  },
  {
    id: "red-alert",
    difficulty: 3,
    signals: [
      { icon: "🌊", text: "This lane floods whenever it rains this hard" },
      { icon: "📢", text: "Red alert issued for tomorrow" },
      { icon: "📦", text: "Shops on the low side are stacking stock up high" },
    ],
    shelf: ["candles", "halogen_tablets", "biscuits", "kite", "sunscreen", "school_bag", "hair_oil", "gift_wrap"],
    demand: ["candles", "halogen_tablets", "biscuits"],
    verdict: "When the lane floods the tap water is the first thing people stop trusting — and the stove is the second.",
  },
  {
    id: "chemist-opposite",
    difficulty: 3,
    signals: [
      { icon: "🏪", text: "A chemist opened opposite yesterday" },
      { icon: "💊", text: "Half your medicine shelf hasn't moved since" },
      { icon: "🌅", text: "You still open two hours before they do" },
    ],
    shelf: ["bread", "eggs", "milk", "pain_balm", "cough_syrup", "bandage", "sanitiser", "thermometer"],
    demand: ["bread", "eggs", "milk"],
    verdict: "You can't beat a chemist at medicine. You can beat them at breakfast.",
  },
  {
    id: "ramzan-eve",
    difficulty: 3,
    signals: [
      { icon: "🌙", text: "Ramzan begins tomorrow" },
      { icon: "🕓", text: "The lane will be awake at four in the morning" },
      { icon: "🌇", text: "Nothing eaten between dawn and sunset" },
    ],
    shelf: ["dates", "milk", "fruits", "kite", "shampoo", "school_bag", "hair_oil", "chips"],
    demand: ["dates", "milk", "fruits"],
    verdict: "Two meals, both outside daylight — and the fast opens with dates almost everywhere.",
  },
  {
    id: "the-bus-stop",
    difficulty: 3,
    signals: [
      { icon: "🚌", text: "The bus stop moves to the end of your lane tomorrow" },
      { icon: "🕗", text: "The office crowd passes at eight" },
      { icon: "⏱️", text: "They'll have four minutes to spare, not forty" },
    ],
    shelf: ["tea", "biscuits", "newspaper", "phenyl", "school_bag", "hair_oil", "incense", "rice"],
    demand: ["tea", "biscuits", "newspaper"],
    verdict: "A bus stop at your door brings a breakfast crowd, not a grocery crowd. Nobody carries rice onto a bus.",
  },
];

export const PICKS_PER_NIGHT = 3;
export const DIFFICULTY_CURVE = [1, 1, 2, 2, 3];
export const NIGHTS_PER_GAME = DIFFICULTY_CURVE.length;

// Later nights are harder and shorter, so the pressure rises with the puzzle.
export const SECONDS_BY_DIFFICULTY = { 1: 22, 2: 18, 3: 15 };
export const SECONDS_PER_NIGHT = SECONDS_BY_DIFFICULTY[2];

export const POINTS_PER_ITEM = 100;
export const POINTS_PER_SECOND = 10;

export function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Nights seen in recent games, oldest first. Without this a fresh shuffle each
// game can land the same night in three plays running, which makes a small
// pool feel smaller than it is.
const RECENT_KEY = "evolvix_tmo_recent";
const RECENT_MEMORY = 12; // roughly the last two and a half games

function readRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}

export function rememberNights(nights) {
  try {
    const merged = [...readRecent(), ...nights.map((n) => n.id)];
    localStorage.setItem(RECENT_KEY, JSON.stringify(merged.slice(-RECENT_MEMORY)));
  } catch {
    // Storage unavailable — the game still works, it just repeats sooner.
  }
}

// Unseen nights first, then the ones seen longest ago. Shuffled beforehand so
// nights with equal staleness don't always come out in the same order.
function freshestFirst(pool, recent) {
  return shuffle(pool).sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id));
}

export function buildGame() {
  const recent = readRecent();
  const pools = {
    1: freshestFirst(NIGHTS.filter((n) => n.difficulty === 1), recent),
    2: freshestFirst(NIGHTS.filter((n) => n.difficulty === 2), recent),
    3: freshestFirst(NIGHTS.filter((n) => n.difficulty === 3), recent),
  };
  const used = new Set();
  const drawn = DIFFICULTY_CURVE.map((tier) => {
    let night = pools[tier].find((n) => !used.has(n.id));
    if (!night) night = NIGHTS.find((n) => !used.has(n.id));
    used.add(night.id);
    return {
      ...night,
      seconds: SECONDS_BY_DIFFICULTY[night.difficulty] || SECONDS_PER_NIGHT,
      shelf: shuffle(night.shelf),
    };
  });
  rememberNights(drawn);
  return drawn;
}

// A night pays per item sold out, plus a speed bonus — but only if the player
// read the day at all. Three wrong guesses in two seconds should score nothing.
export function scoreNight(correctCount, secondsLeft) {
  if (correctCount === 0) return 0;
  return correctCount * POINTS_PER_ITEM + Math.max(0, secondsLeft) * POINTS_PER_SECOND;
}

export function maxScoreFor(nights) {
  return nights.reduce(
    (total, n) => total + PICKS_PER_NIGHT * POINTS_PER_ITEM + n.seconds * POINTS_PER_SECOND,
    0
  );
}

export function rankFor(score, maxScore) {
  const pct = maxScore ? score / maxScore : 0;
  if (pct >= 0.85) return { title: "Reads the Street", line: "You knew what was coming before it walked in." };
  if (pct >= 0.62) return { title: "Sharp Buyer", line: "Very little left on the shelf at closing time." };
  if (pct >= 0.38) return { title: "Learning the Season", line: "You got the big days right. The quiet signals slipped past." };
  return { title: "Overstocked and Underslept", line: "A lot of money sitting on that shelf. Tomorrow you'll read them better." };
}
