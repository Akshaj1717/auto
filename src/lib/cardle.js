// Game rules for "Guess the Car". No browser-only code here, so it can be tested in Node.

// ---------- Names and letter boxes ----------
// "Mazda MX-5 (NA)" → "Mazda MX-5" (drop Wikipedia's disambiguation in brackets)
export const displayName = title => title.replace(/\s*\([^)]*\)\s*$/, '').trim();

// Only letters and digits get boxes; spaces and dashes are shown as gaps
const isSlot = ch => /[\p{L}\p{N}]/u.test(ch);
const fold = ch => ch.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
export const slotsOf = name => [...name].filter(isSlot).map(fold);

// Layout of the answer's boxes: [{ slot: index } | { gap: ' ' | '-' }]
export function boxLayout(name) {
  let i = 0;
  return [...name].map(ch => (isSlot(ch) ? { slot: i++ } : { gap: ch === ' ' ? ' ' : ch }));
}

// Wordle scoring: guess letters are lined up with the answer's boxes.
// green = right letter, right box; yellow = letter is in the answer elsewhere; red = not in the answer
export function scoreLetters(guessName, answerName) {
  const answer = slotsOf(answerName);
  const guess = slotsOf(guessName).slice(0, answer.length);
  const result = answer.map((_, i) => ({ letter: guess[i] ?? '', state: guess[i] ? 'red' : 'empty' }));
  const left = {};
  answer.forEach((ch, i) => { if (guess[i] === ch) result[i].state = 'green'; else left[ch] = (left[ch] ?? 0) + 1; });
  guess.forEach((ch, i) => {
    if (result[i].state !== 'green' && left[ch] > 0) { result[i].state = 'yellow'; left[ch]--; }
  });
  return result;
}

// ---------- Facts read from the Wikipedia info panel ----------
const NUMBER_WORDS = { one: 1, single: 1, two: 2, twin: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10, twelve: 12, sixteen: 16 };
const toNumber = w => (/^\d+$/.test(w) ? +w : NUMBER_WORDS[w.toLowerCase()]);

// "6.1 L BMW S70/2 V12" → 12; "2.0 L inline-four" → 4; electric → 'Electric'; Wankel → 'Rotary'
export function cylindersFrom(engine = '') {
  const patterns = [
    /\b[VW]\s?-?(\d{1,2})\b/,
    /\b[IL]-?([2-8])\b/,
    /\b(?:inline|straight|flat|boxer|opposed|horizontally[- ]opposed)[- ](\w+)/i,
    /\b(\w+)[- ]cylinders?\b/i,
  ];
  let best = null;
  for (const re of patterns) {
    const m = engine.match(re);
    const n = m && toNumber(m[1]);
    if (n && n <= 16 && (!best || m.index < best.index)) best = { index: m.index, n };
  }
  if (best) return best.n;
  if (/wankel|rotary/i.test(engine)) return 'Rotary';
  if (/electric|battery|kWh/i.test(engine)) return 'Electric';
  return null;
}

// First production year: "1987–1992, 1,315 produced" → 1987
export function yearFrom(...values) {
  for (const v of values) {
    const m = (v ?? '').match(/\b(18[89]\d|19\d\d|20\d\d)\b/);
    if (m) return +m[1];
  }
  return null;
}

// ---------- Brands and who owns them ----------
// Wikidata records ownership inconsistently (one SEAT model says "SEAT", another says
// "Volkswagen Group"), so the game uses this fixed table of today's owners.
// To add a brand, put it under its group; brands not listed fall back to Wikidata.
export const BRAND_GROUPS = {
  'Volkswagen Group': ['Volkswagen', 'Audi', 'SEAT', 'Cupra', 'Škoda', 'Porsche', 'Lamborghini', 'Bentley', 'Scout'],
  'Stellantis': ['Chrysler', 'Dodge', 'Jeep', 'Ram', 'Plymouth', 'Fiat', 'Abarth', 'Alfa Romeo', 'Lancia', 'Maserati',
    'Peugeot', 'Citroën', 'DS', 'Opel', 'Vauxhall', 'Imperial', 'DeSoto'],
  'General Motors': ['Chevrolet', 'Cadillac', 'GMC', 'Buick', 'Pontiac', 'Oldsmobile', 'Saturn', 'Hummer', 'Holden', 'LaSalle'],
  'Ford Motor Company': ['Ford', 'Lincoln', 'Mercury', 'Edsel'],
  'BMW Group': ['BMW', 'Mini', 'Rolls-Royce'],
  'Mercedes-Benz Group': ['Mercedes-Benz', 'Mercedes-AMG', 'Maybach', 'Mercedes-Maybach'],
  'Toyota Group': ['Toyota', 'Lexus', 'Daihatsu', 'Scion'],
  'Nissan': ['Nissan', 'Infiniti', 'Datsun'],
  'Honda': ['Honda', 'Acura'],
  'Hyundai Motor Group': ['Hyundai', 'Kia', 'Genesis'],
  'Renault Group': ['Renault', 'Dacia', 'Alpine'],
  'Geely': ['Geely', 'Volvo', 'Polestar', 'Lotus', 'Lynk & Co', 'Zeekr', 'Proton', 'Smart'],
  'Tata Motors': ['Tata', 'Jaguar', 'Land Rover', 'Range Rover'],
  'SAIC Motor': ['MG', 'Roewe', 'Wuling'],
  'Bugatti Rimac': ['Bugatti', 'Rimac'],
};
// Each brand's home country, so every car of a brand gets the same Country hint
// (Wikidata sometimes gives the parent company's country instead, e.g. SEAT → Germany).
const COUNTRY_BRANDS = {
  'Germany': ['Volkswagen', 'Audi', 'Porsche', 'Opel', 'BMW', 'Mercedes-Benz', 'Mercedes-AMG', 'Maybach', 'Mercedes-Maybach', 'Smart', 'Gumpert'],
  'Spain': ['SEAT', 'Cupra'], 'Czech Republic': ['Škoda'], 'Romania': ['Dacia'], 'Croatia': ['Rimac'], 'Netherlands': ['Spyker'], 'Russia': ['Lada'],
  'Italy': ['Lamborghini', 'Fiat', 'Abarth', 'Alfa Romeo', 'Lancia', 'Maserati', 'Ferrari', 'Pagani', 'De Tomaso'],
  'France': ['Peugeot', 'Citroën', 'DS', 'Renault', 'Alpine', 'Bugatti'],
  'United Kingdom': ['Bentley', 'Vauxhall', 'Mini', 'Rolls-Royce', 'Lotus', 'Jaguar', 'Land Rover', 'Range Rover', 'MG', 'McLaren', 'Aston Martin',
    'Caterham', 'Morgan', 'TVR', 'Noble', 'AC', 'Austin', 'Triumph'],
  'Sweden': ['Volvo', 'Polestar', 'Koenigsegg', 'Saab'],
  'United States': ['Scout', 'Chrysler', 'Dodge', 'Jeep', 'Ram', 'Plymouth', 'Imperial', 'DeSoto', 'Chevrolet', 'Cadillac', 'GMC', 'Buick', 'Pontiac',
    'Oldsmobile', 'Saturn', 'Hummer', 'LaSalle', 'Ford', 'Lincoln', 'Mercury', 'Edsel', 'Tesla', 'DeLorean', 'Rivian', 'Lucid', 'Studebaker', 'Packard',
    'AMC', 'Shelby', 'Hennessey', 'SSC'],
  'Australia': ['Holden'],
  'Japan': ['Toyota', 'Lexus', 'Daihatsu', 'Scion', 'Nissan', 'Infiniti', 'Datsun', 'Honda', 'Acura', 'Mazda', 'Subaru', 'Mitsubishi', 'Suzuki', 'Isuzu'],
  'South Korea': ['Hyundai', 'Kia', 'Genesis'],
  'China': ['Geely', 'Lynk & Co', 'Zeekr', 'Roewe', 'Wuling', 'BYD', 'NIO', 'Xpeng'],
  'India': ['Tata'], 'Malaysia': ['Proton'],
};
export const CONTINENTS = {
  'Germany': ['Europe'], 'Spain': ['Europe'], 'Czech Republic': ['Europe'], 'Romania': ['Europe'], 'Croatia': ['Europe'], 'Netherlands': ['Europe'],
  'Italy': ['Europe'], 'France': ['Europe'], 'United Kingdom': ['Europe'], 'Sweden': ['Europe'], 'Russia': ['Europe', 'Asia'],
  'United States': ['North America'], 'Australia': ['Oceania'], 'Japan': ['Asia'], 'South Korea': ['Asia'], 'China': ['Asia'], 'India': ['Asia'], 'Malaysia': ['Asia'],
};
const COUNTRY_OF = Object.fromEntries(Object.entries(COUNTRY_BRANDS).flatMap(([country, brands]) => brands.map(b => [b, country])));

const fold2 = s => (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9&]+/g, ' ').trim();
const BRANDS = Object.entries(BRAND_GROUPS).flatMap(([group, brands]) => brands.map(brand => ({ brand, group, key: fold2(brand) })))
  .sort((a, b) => b.key.length - a.key.length); // longest first, so "Mercedes-AMG" wins over "Mercedes"
// Other common brands (no group), so they're still read from the car's name
const STANDALONE = ['Ferrari', 'McLaren', 'Aston Martin', 'Mazda', 'Subaru', 'Mitsubishi', 'Suzuki', 'Tesla', 'Koenigsegg',
  'Pagani', 'De Tomaso', 'DeLorean', 'Lada', 'Saab', 'Isuzu', 'Rivian', 'Lucid', 'BYD', 'Caterham', 'Morgan', 'TVR', 'Noble',
  'AC', 'Austin', 'Triumph', 'Studebaker', 'Packard', 'AMC', 'Shelby', 'Hennessey', 'SSC', 'Gumpert', 'Spyker', 'NIO', 'Xpeng']
  .map(brand => ({ brand, group: null, key: fold2(brand) })).sort((a, b) => b.key.length - a.key.length);

// "SEAT León" → { brand: 'SEAT', group: 'Volkswagen Group', country: 'Spain' }; also accepts a Wikidata maker label
export function brandInfo(...names) {
  for (const name of names) {
    const n = fold2(name);
    if (!n) continue;
    const hit = [...BRANDS, ...STANDALONE].find(b => n === b.key || n.startsWith(b.key + ' '));
    if (hit) return { brand: hit.brand, group: hit.group, country: COUNTRY_OF[hit.brand] ?? null };
  }
  return null;
}
// The group that owns a brand, e.g. groupOf('Cupra') → 'Volkswagen Group'
export const groupOf = brand => BRANDS.find(b => b.key === fold2(brand))?.group ?? null;

// ---------- Comparing a guess with the answer ----------
const makerKey = s => fold2(s)
  .replace(/\b(automobiles?|automotive|motor company|motors?|cars|car company|ag|s ?p ?a|gmbh|inc|ltd|limited|corporation|co|group|company|n ?v)\b/g, '')
  .replace(/\s+/g, ' ').trim();

// Each tile: { label, value, detail?, state: 'green'|'yellow'|'red'|'unknown', arrow?: '↑'|'↓' }
// Arrows point toward the answer (↑ = the answer is higher/later).
export function compareCars(guess, answer) {
  const tiles = [];

  // Manufacturer: green = same brand; yellow = same owner group (SEAT vs Volkswagen) or same country (Ford vs Chevrolet)
  const gb = makerKey(guess.maker), ab = makerKey(answer.maker);
  const family = c => new Set([c.group, ...(c.parents ?? [])].filter(Boolean).map(makerKey));
  const gf = family(guess), af = family(answer);
  const sameGroup = [...gf].some(x => af.has(x)) || af.has(gb) || gf.has(ab);
  tiles.push({
    label: 'Manufacturer', value: guess.maker || '?', detail: guess.group && guess.group !== guess.maker ? guess.group : '',
    state: !gb || !ab ? 'unknown' : gb === ab ? 'green'
      : sameGroup || (guess.country && guess.country === answer.country) ? 'yellow' : 'red',
  });

  // Country: green = same; yellow = same continent
  const sameContinent = (guess.continents ?? []).some(c => (answer.continents ?? []).includes(c));
  tiles.push({
    label: 'Country', value: guess.country || '?',
    state: !guess.country || !answer.country ? 'unknown'
      : guess.country === answer.country ? 'green' : sameContinent ? 'yellow' : 'red',
  });

  // Year: green = same; yellow = within 5 years
  tiles.push(numberTile('Year', guess.year, answer.year, 5));

  // Cylinders: green = same; yellow = within 2 (Electric and Rotary only match themselves)
  if (typeof guess.cylinders === 'number' && typeof answer.cylinders === 'number') {
    tiles.push(numberTile('Cylinders', guess.cylinders, answer.cylinders, 2));
  } else {
    tiles.push({
      label: 'Cylinders', value: guess.cylinders ?? '?',
      state: guess.cylinders == null || answer.cylinders == null ? 'unknown'
        : guess.cylinders === answer.cylinders ? 'green' : 'red',
    });
  }
  return tiles;
}

function numberTile(label, g, a, closeWithin) {
  if (g == null || a == null) return { label, value: g ?? '?', state: 'unknown' };
  if (g === a) return { label, value: g, state: 'green' };
  return { label, value: g, state: Math.abs(g - a) <= closeWithin ? 'yellow' : 'red', arrow: a > g ? '↑' : '↓' };
}

export const MAX_GUESSES = 6;
