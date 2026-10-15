// Fetches championship standings and saves them to src/data/standings.json.
// Runs in the GitHub Action with the other fetch scripts.
//
// Sources:
//   - Formula 1: Jolpica F1 API (free, the successor to the Ergast API)
//   - MotoGP:    the official MotoGP results API
//   - WEC, IndyCar: the standings tables on each season's Wikipedia page
//
// If one series fails, its previous standings are kept, so the page never goes blank.
// To add a series that has a Wikipedia standings table, add an entry to WIKI_SERIES.

import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../src/data/standings.json', import.meta.url);
const UA = 'auto-site-standings/1.0 (https://github.com/Akshaj1717/auto)';
const YEAR = new Date().getFullYear();

const WIKI_SERIES = [
  { id: 'wec', name: 'WEC', page: y => `${y} FIA World Endurance Championship`, tables: [
    { title: 'Hypercar Drivers', header: /driver/i },
    { title: 'Hypercar Manufacturers', header: /manufacturer/i },
  ] },
  { id: 'indycar', name: 'IndyCar', page: y => `${y} IndyCar Series`, tables: [
    { title: 'Drivers', header: /driver/i },
  ] },
];

async function get(url, as = 'json') {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} ${url.slice(0, 100)}`);
  return as === 'json' ? res.json() : res.text();
}

// ---------- Formula 1 ----------
async function f1() {
  const base = 'https://api.jolpi.ca/ergast/f1/current';
  const [d, c] = await Promise.all([get(`${base}/driverStandings.json`), get(`${base}/constructorStandings.json`)]);
  const dl = d.MRData.StandingsTable.StandingsLists[0];
  const cl = c.MRData.StandingsTable.StandingsLists[0];
  return {
    id: 'f1', name: 'Formula 1', season: +dl.season, round: +dl.round,
    source: 'Jolpica F1 API', sourceUrl: 'https://www.formula1.com/en/results',
    tables: [
      { title: 'Drivers', rows: dl.DriverStandings.map(s => ({
        pos: +s.position || null, name: `${s.Driver.givenName} ${s.Driver.familyName}`,
        team: s.Constructors.map(k => k.name).join(' / '), points: +s.points, wins: +s.wins,
      })) },
      { title: 'Constructors', rows: cl.ConstructorStandings.map(s => ({
        pos: +s.position || null, name: s.Constructor.name, points: +s.points, wins: +s.wins,
      })) },
    ],
  };
}

// ---------- MotoGP ----------
async function motogp() {
  const api = 'https://api.motogp.pulselive.com/motogp/v1/results';
  const seasons = await get(`${api}/seasons`);
  const season = seasons.find(s => s.current) ?? seasons.sort((a, b) => b.year - a.year)[0];
  const categories = await get(`${api}/categories?seasonUuid=${season.id}`);
  const cat = categories.find(c => /^motogp/i.test(c.name));
  const data = await get(`${api}/standings?seasonUuid=${season.id}&categoryUuid=${cat.id}`);
  return {
    id: 'motogp', name: 'MotoGP', season: season.year,
    source: 'MotoGP.com', sourceUrl: 'https://www.motogp.com/en/world-standing',
    tables: [
      { title: 'Riders', rows: data.classification.map(r => ({
        pos: r.position, name: r.rider?.full_name, team: r.team?.name, points: r.points, wins: r.race_wins,
      })) },
    ],
  };
}

// ---------- Wikipedia standings tables (WEC, IndyCar, ...) ----------
const decodeEntities = s => s
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));

export const cellText = html => decodeEntities(html
  .replace(/<sup[\s\S]*?<\/sup>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<br\s*\/?>/gi, ', ')
  .replace(/<[^>]+>/g, ''))
  .replace(/\s+/g, ' ').replace(/(,\s*)+$/, '').replace(/^\s*,\s*/, '').trim();

// Returns every <table class="wikitable"> (including tables nested in layout tables)
export function findTables(html) {
  const tables = [];
  const re = /<table\b[^>]*>|<\/table>/gi;
  const stack = [];
  let m;
  while ((m = re.exec(html))) {
    if (m[0][1] !== '/') stack.push({ start: m.index, open: m[0] });
    else {
      const t = stack.pop();
      if (t && /wikitable/.test(t.open)) tables.push(html.slice(t.start, re.lastIndex));
    }
  }
  return tables.sort((a, b) => html.indexOf(a) - html.indexOf(b));
}

// Each row = list of cells { text, th }. th = header-style cell, which Wikipedia uses for "Pos".
const rowsOf = table => (table.match(/<tr\b[\s\S]*?<\/tr>/gi) || [])
  .map(tr => (tr.match(/<(th|td)\b[^>]*>[\s\S]*?<\/\1>/gi) || []).map(c => ({
    text: cellText(c.replace(/^<[^>]+>|<\/t[hd]>$/gi, '')),
    th: /^<th/i.test(c),
  })));

// Race-result codes that appear in the round columns, never as a driver/team name
const RESULT_CODE = /^(ret|dnf|dns|dsq|dq|nc|wd|ex|exc|dnq|dnp|dnpq|inj|c|ns|nt|tbd|–|-)$/i;
const isName = s => /\p{L}/u.test(s) && !RESULT_CODE.test(s);

// Standings table = header starts with "Pos" and ends with "Points"/"Pts"
export function readStandingsTable(table) {
  const rows = rowsOf(table);
  const header = (rows[0] ?? []).map(c => c.text);
  if (!/^pos/i.test(header[0] ?? '') || !/^(pts|points)/i.test(header.at(-1) ?? '')) return null;
  const teamCol = header.findIndex((h, i) => i > 1 && /^(team|entrant|car)/i.test(h));
  const body = rows.slice(1);
  // If positions are header-style cells (usual on Wikipedia), only trust those as positions.
  const posIsTh = body.some(r => r[0]?.th && /^\d+$/.test(r[0].text));

  const out = [];
  for (const r of body) {
    const first = r[0]?.text ?? '';
    const isPositionRow = /^\d+$/.test(first) && (!posIsTh || r[0].th) && r.length >= 3
      && isName(r[1]?.text ?? '') && +first >= (out.at(-1)?.pos ?? 0);

    if (!isPositionRow) {
      // A row that continues the entry above (merged cells). In endurance racing a crew
      // shares one position, so add the other drivers' names; ignore rows of results.
      const prev = out.at(-1);
      if (prev && /^[^\d]+\s[^\d]+$/.test(first) && isName(first) && !prev.name.includes(first)) prev.name += `, ${first}`;
      continue;
    }
    const points = parseFloat((r.at(-1)?.text || '').replace(/[^\d.]/g, ''));
    out.push({
      pos: +first, name: r[1].text, ...(teamCol > 0 && r[teamCol]?.text ? { team: r[teamCol].text } : {}),
      points: isNaN(points) ? 0 : points,
    });
  }
  return { header, rows: out };
}

async function wikiSeries(cfg) {
  for (const year of [YEAR, YEAR - 1]) { // early in a year, the new season page may not exist yet
    const title = cfg.page(year);
    let html;
    try {
      const data = await get(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({
        action: 'parse', page: title, prop: 'text', redirects: '1', format: 'json', formatversion: '2' })}`);
      html = data.parse?.text;
    } catch { continue; }
    if (!html) continue;

    const parsed = findTables(html).map(readStandingsTable).filter(t => t?.rows.length);
    const tables = [];
    for (const want of cfg.tables) {
      const t = parsed.find(p => want.header.test(p.header[1] ?? '') && !tables.some(x => x._src === p));
      if (t) tables.push({ title: want.title, rows: t.rows, _src: t });
    }
    if (!tables.length) continue;
    return {
      id: cfg.id, name: cfg.name, season: year, source: 'Wikipedia',
      sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      tables: tables.map(({ _src, ...t }) => t),
    };
  }
  throw new Error(`no standings table found for ${cfg.name}`);
}

// ---------- Run ----------
let previous = {};
try { previous = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

const jobs = [
  ['f1', f1],
  ['motogp', motogp],
  ...WIKI_SERIES.map(cfg => [cfg.id, () => wikiSeries(cfg)]),
];

const series = await Promise.all(jobs.map(async ([id, fn]) => {
  try {
    const s = await fn();
    console.log(`${s.name}: ${s.tables.map(t => `${t.rows.length} ${t.title.toLowerCase()}`).join(', ')}`);
    return { ...s, updated: new Date().toISOString() };
  } catch (e) {
    const old = previous.series?.find(s => s.id === id);
    console.warn(`${id} FAILED (${e.message})${old ? ' – keeping previous standings' : ''}`);
    return old ?? null;
  }
}));

const ok = series.filter(Boolean);
if (ok.length) {
  await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), series: ok }, null, 2) + '\n');
  console.log(`Saved standings for ${ok.length} series.`);
} else {
  console.warn('No standings fetched; leaving standings.json untouched.');
}
