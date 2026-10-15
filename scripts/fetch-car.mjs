// Picks a random Car of the Day from Wikipedia/Wikidata and saves it to
// src/data/car-of-the-day.json. Runs in the GitHub Action every hour, but the
// pick only changes once a day (midnight New York time).
//
// Where the data comes from:
//   - Wikidata: the list of car models (popular ones, with a photo and an English article)
//   - Wikipedia: the summary text, the infobox specs, and a freely licensed photo + credit
//   - src/data/cars.json: if today's car is in your hand-written list, its fuller specs are used

import { readFile, writeFile } from 'node:fs/promises';
import { todayET, normalizeCurated } from '../src/lib/cars.js';

const OUT = new URL('../src/data/car-of-the-day.json', import.meta.url);
const CURATED = JSON.parse(await readFile(new URL('../src/data/cars.json', import.meta.url), 'utf8'));
// Wikimedia asks scripts to identify themselves
const UA = 'auto-site-car-of-the-day/1.0 (https://github.com/Akshaj1717/auto)';

// Only cars with at least this many Wikipedia language editions (keeps it to well-known cars)
const MIN_SITELINKS = 15;

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`${res.status} ${url.slice(0, 120)}`);
  return res.json();
}

const wikiApi = params =>
  getJson(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`);

// ---------- 1. Candidate cars from Wikidata ----------
async function getCandidates() {
  const sparql = `
    SELECT ?item ?title WHERE {
      ?item wdt:P31 wd:Q3231690 ;           # instance of: automobile model
            wdt:P18 ?image ;                # has a photo
            wikibase:sitelinks ?links .
      FILTER(?links >= ${MIN_SITELINKS})
      ?article schema:about ?item ;
               schema:isPartOf <https://en.wikipedia.org/> ;
               schema:name ?title .
    }`;
  const data = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`);
  return data.results.bindings.map(b => ({ id: b.item.value.split('/').pop(), title: b.title.value }));
}

// Same date → same order. A car keeps its spot even if Wikidata's list changes a little.
function hash(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  return h >>> 0;
}
const rankForDay = (cars, day) => [...cars].sort((a, b) => hash(day + b.id) - hash(day + a.id));

// ---------- 2. Photo with credit ----------
const stripHtml = s => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function getPhoto(title) {
  const page = (await wikiApi({ action: 'query', titles: title, redirects: '1', prop: 'pageimages', piprop: 'name' }))
    .query?.pages?.[0];
  if (!page?.pageimage) return null;
  const info = (await wikiApi({
    action: 'query', titles: `File:${page.pageimage}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1280',
  })).query?.pages?.[0]?.imageinfo?.[0];
  const meta = info?.extmetadata ?? {};
  if (!info || meta.NonFree?.value) return null; // skip copyrighted "fair use" images
  return {
    src: info.thumburl || info.url,
    credit: stripHtml(meta.Artist?.value) || 'Unknown photographer',
    license: meta.LicenseShortName?.value || '',
    page: info.descriptionurl,
  };
}

// ---------- 3. Specs from the Wikipedia infobox ----------
export function readInfobox(wikitext) {
  const start = wikitext.search(/\{\{\s*Infobox[ _]automobile/i);
  if (start < 0) return {};
  // find the matching closing braces
  let depth = 0, end = start;
  for (; end < wikitext.length - 1; end++) {
    if (wikitext.startsWith('{{', end)) { depth++; end++; }
    else if (wikitext.startsWith('}}', end)) { depth--; end++; if (depth === 0) break; }
  }
  const body = wikitext.slice(start + 2, end - 1);
  // split on | that are not inside {{ }} or [[ ]]
  const parts = []; let d = 0, cur = '';
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') { d++; cur += two; i++; continue; }
    if (two === '}}' || two === ']]') { d--; cur += two; i++; continue; }
    if (body[i] === '|' && d === 0) { parts.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  parts.push(cur);
  const fields = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq > 0) fields[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
  }
  return fields;
}

const UNITS = { hp: 'hp', bhp: 'bhp', PS: 'PS', kW: 'kW', lbft: 'lb-ft', 'lb.ft': 'lb-ft', 'lbf.ft': 'lb-ft', Nm: 'N·m', 'N.m': 'N·m',
  mph: 'mph', 'km/h': 'km/h', kph: 'km/h', kg: 'kg', lb: 'lb', L: 'L', cc: 'cc', mm: 'mm', in: 'in' };
const LIST_TEMPLATES = /^(plainlist|plain list|ubl|unbulleted list|hlist|flatlist|bulleted list|ublist)$/i;
const KEEP_TEMPLATES = /^(nowrap|nobr|small|lang|circa|start date|end date)$/i;

export function cleanValue(v) {
  let s = v
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');
  // unwrap remaining templates from the inside out
  for (let i = 0; i < 10 && /\{\{/.test(s); i++) {
    s = s.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => {
      const [name, ...args] = inner.split('|').map(x => x.trim());
      const values = args.filter(a => !/^\w+\s*=/.test(a));
      // {{convert|1220|kg}}, {{cvt|...}}, and ranges like {{convert|1220|-|1300|kg}}
      if (/^(convert|cvt)$/i.test(name)) {
        const [n, second, n2, unit] = values;
        if (/^(-|–|to|and)$/.test(second ?? '')) return `${n}–${n2} ${UNITS[unit] ?? unit ?? ''}`.trim();
        return `${n} ${UNITS[second] ?? second ?? ''}`.trim();
      }
      if (LIST_TEMPLATES.test(name)) return values.join('\n');
      if (KEEP_TEMPLATES.test(name)) return values.join(' ');
      return '';
    });
  }
  s = s
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;/g, ' ')
    .split('\n').map(l => l.replace(/^\s*[*#]\s*/, '').trim()).filter(Boolean).join(', ')
    .replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim();
  return s.length > 160 ? s.slice(0, 160).replace(/[,\s]+\S*$/, '') + '…' : s;
}

const INFOBOX_FIELDS = [
  ['Manufacturer', ['manufacturer']],
  ['Production', ['production', 'model_years']],
  ['Designer', ['designer']],
  ['Class', ['class']],
  ['Layout', ['layout']],
  ['Engine', ['engine']],
  ['Power', ['power', 'power_output']],
  ['Transmission', ['transmission']],
  ['Curb weight', ['weight', 'curb_weight']],
];

async function getSpecs(title) {
  const wikitext = (await wikiApi({ action: 'parse', page: title, redirects: '1', prop: 'wikitext', section: '0' }))
    .parse?.wikitext ?? '';
  const box = readInfobox(wikitext);
  return INFOBOX_FIELDS
    .map(([label, keys]) => [label, cleanValue(keys.map(k => box[k]).find(Boolean) ?? '')])
    .filter(([, v]) => v);
}

// ---------- 4. Summary ----------
async function getSummary(title) {
  const s = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  const sentences = (s.extract || '').match(/[^.!?]+[.!?]+/g) || [];
  return { name: s.title, blurb: sentences.slice(0, 2).join('').trim(), url: s.content_urls?.desktop?.page };
}

// ---------- Run ----------
const day = todayET();
try {
  const candidates = await getCandidates();
  console.log(`Wikidata: ${candidates.length} candidate cars`);
  if (!candidates.length) throw new Error('no candidates');

  let car = null;
  for (const c of rankForDay(candidates, day).slice(0, 8)) {
    try {
      const photo = await getPhoto(c.title);
      if (!photo) { console.log(`Skipping ${c.title}: no free photo`); continue; }
      const [summary, specs] = await Promise.all([getSummary(c.title), getSpecs(c.title)]);
      // Use your hand-written specs if this car is in cars.json
      const curated = CURATED.find(k => k.wiki?.toLowerCase() === c.title.toLowerCase());
      car = {
        date: day,
        name: summary.name || c.title,
        blurb: curated?.blurb || summary.blurb,
        url: summary.url,
        photo,
        specs: curated ? normalizeCurated(curated).specs : specs,
        source: curated ? 'cars.json + Wikipedia' : 'Wikipedia',
      };
      break;
    } catch (e) {
      console.log(`Skipping ${c.title}: ${e.message}`);
    }
  }
  if (!car) throw new Error('no usable car found');

  await writeFile(OUT, JSON.stringify(car, null, 2) + '\n');
  console.log(`Car of the Day for ${day}: ${car.name} (${car.specs.length} specs)`);
} catch (e) {
  // Never break the deploy: the site falls back to a car from cars.json
  console.warn(`Car of the Day fetch failed (${e.message}); site will use cars.json instead.`);
}
