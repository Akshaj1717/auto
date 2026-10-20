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

// ---------- Comparing a guess with the answer ----------
const makerKey = s => (s ?? '').toLowerCase()
  .replace(/\b(automobiles?|automotive|motor company|motors?|cars|car company|ag|s\.?p\.?a\.?|gmbh|inc\.?|ltd\.?|limited|corporation|co\.?|group|company|n\.?v\.?)\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

// Each tile: { label, value, state: 'green'|'yellow'|'red'|'unknown', arrow?: '↑'|'↓' }
// Arrows point toward the answer (↑ = the answer is higher/later).
export function compareCars(guess, answer) {
  const tiles = [];

  // Manufacturer: green = same; yellow = same parent company or same country (e.g. Ford vs Chevrolet)
  const gm = makerKey(guess.maker), am = makerKey(answer.maker);
  const gp = (guess.parents ?? []).map(makerKey), ap = (answer.parents ?? []).map(makerKey);
  const relatedMaker = gp.some(p => p && (ap.includes(p) || p === am)) || ap.includes(gm);
  tiles.push({
    label: 'Manufacturer', value: guess.maker || '?',
    state: !gm || !am ? 'unknown' : gm === am ? 'green'
      : relatedMaker || (guess.country && guess.country === answer.country) ? 'yellow' : 'red',
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
