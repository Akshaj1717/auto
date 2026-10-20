// Builds the car list for the "Guess the Car" game: src/data/cardle-pool.json.
// Source: Wikidata (the database behind Wikipedia). Only car models with an English
// Wikipedia article that are well known (many language editions) are included.
// Year and cylinders are read live from each car's Wikipedia info panel during the game.
//
// If Wikidata is unreachable, the existing list is kept.

import { writeFile } from 'node:fs/promises';

const OUT = new URL('../src/data/cardle-pool.json', import.meta.url);
const UA = 'auto-site-cardle/1.0 (https://github.com/Akshaj1717/auto)';
const MIN_SITELINKS = 15; // lower = more (and more obscure) cars

const SPARQL = `
SELECT ?item ?title ?makerLabel ?parentLabel ?countryLabel ?continentLabel WHERE {
  ?item wdt:P31 wd:Q3231690 ;            # automobile model
        wikibase:sitelinks ?links ;
        wdt:P176 ?maker .                 # manufacturer
  FILTER(?links >= ${MIN_SITELINKS})
  ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title .
  OPTIONAL { ?maker wdt:P749 ?parent }    # parent company
  OPTIONAL { ?item wdt:P495 ?origin }     # country of origin
  OPTIONAL { ?maker wdt:P17 ?makerCountry }
  BIND(COALESCE(?origin, ?makerCountry) AS ?country)
  OPTIONAL { ?country wdt:P30 ?continent }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

try {
  const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(SPARQL)}`, {
    headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' }, signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const rows = (await res.json()).results.bindings;

  // One row per combination of parent/continent; merge them into one entry per car
  const cars = new Map();
  for (const r of rows) {
    const id = r.item.value.split('/').pop();
    const label = k => r[k]?.value && !/^Q\d+$/.test(r[k].value) ? r[k].value : null; // skip unlabeled IDs
    const car = cars.get(id) ?? { title: r.title.value, maker: label('makerLabel'), parents: [], country: label('countryLabel'), continents: [] };
    for (const [key, list] of [['parentLabel', car.parents], ['continentLabel', car.continents]]) {
      const v = label(key);
      if (v && !list.includes(v)) list.push(v);
    }
    cars.set(id, car);
  }
  const pool = [...cars.values()]
    .filter(c => c.maker && !/^List of/i.test(c.title))
    .sort((a, b) => a.title.localeCompare(b.title));
  if (pool.length < 20) throw new Error(`only ${pool.length} cars returned`);

  await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), cars: pool }, null, 1) + '\n');
  console.log(`Guess the Car: saved ${pool.length} cars.`);
} catch (e) {
  console.warn(`Guess the Car pool fetch failed (${e.message}); keeping the existing list.`);
}
