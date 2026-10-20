// Builds the list of possible answers for the "Guess the Car" game: src/data/cardle-pool.json.
// Source: Wikidata (the database behind Wikipedia): car models that have an English
// Wikipedia article and a photo. Players can guess ANY car on Wikipedia; this list only
// decides which cars can be the mystery answer. The hints are looked up live in the game.
//
// If Wikidata is unreachable, the existing list (or the starter list) is kept.

import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../src/data/cardle-pool.json', import.meta.url);
const UA = 'auto-site-cardle/1.0 (https://github.com/Akshaj1717/auto)';
// How well known a car must be: the number of Wikipedia language editions with an article.
// Lower = more cars (and more obscure ones). 6 gives several thousand.
const MIN_SITELINKS = 6;

const SPARQL = `
SELECT DISTINCT ?title WHERE {
  ?item wdt:P31 wd:Q3231690 ;          # automobile model
        wdt:P18 ?image ;               # has a photo
        wikibase:sitelinks ?links .
  FILTER(?links >= ${MIN_SITELINKS})
  ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title .
}`;

try {
  const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(SPARQL)}`, {
    headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' }, signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const fetched = (await res.json()).results.bindings.map(b => b.title.value)
    .filter(t => !/^(List of|Template:)/i.test(t));
  if (fetched.length < 100) throw new Error(`only ${fetched.length} cars returned`);

  // keep the hand-picked starter cars too, so famous cars are always possible answers
  let starter = [];
  try { starter = JSON.parse(await readFile(new URL('../src/data/cardle-starter.json', import.meta.url), 'utf8')); } catch {}
  const titles = [...new Set([...starter, ...fetched])].sort((a, b) => a.localeCompare(b));

  await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), cars: titles.map(title => ({ title })) }) + '\n');
  console.log(`Guess the Car: saved ${titles.length} possible answers.`);
} catch (e) {
  console.warn(`Guess the Car list fetch failed (${e.message}); keeping the existing list.`);
}
