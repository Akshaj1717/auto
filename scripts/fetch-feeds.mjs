import { readFile, writeFile } from 'node:fs/promises';

const FEEDS = [
  { source: 'Formula 1', url: 'https://www.formula1.com/en/latest/all.xml' },
  { source: 'Motorsport.com', url: 'https://www.motorsport.com/rss/all/news/' },
  { source: 'Motorsport.com MotoGP', url: 'https://www.motorsport.com/rss/motogp/news/' },
  { source: 'Motorsport.com IndyCar', url: 'https://www.motorsport.com/rss/indycar/news/' },
  { source: 'Motorsport.com WEC', url: 'https://www.motorsport.com/rss/wec/news/' },
  { source: 'Autosport', url: 'https://www.autosport.com/rss/f1/news' },
  { source: 'RaceFans', url: 'https://www.racefans.net/feed/' },
  { source: 'Grandprix.com', url: 'https://www.grandprix.com/rss.xml' },
  { source: 'Joe Saward', url: 'https://joesaward.wordpress.com/feed' },
  { source: 'Adam Cooper', url: 'https://adamcooperf1.com/feed' },
];

// Paste each series' .ics URL into its slot. Empty slots are skipped.
const CALENDARS = [
  { series: 'F1', url: 'https://smartcalendars.ai/cal/0871a229ef25c0974967bee010cee350a01731fc5c70c1243881e8228b2a0321.ics' },
  { series: 'WEC', url: '' },
  { series: 'NASCAR', url: '' },
  { series: 'MotoGP', url: '' },
].filter(c => c.url);

const MAX_ARTICLES = 40;
const MAX_PER_SOURCE = 8;
const MAX_EVENTS_PER_SERIES = 3;
const OUT = new URL('../src/data/live.json', import.meta.url);

async function get(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'auto-site-feed-fetcher/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

const decode = s => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&')
  .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
};

function findImage(block) {
  const m =
    block.match(/<media:content[^>]*url="([^"]+)"/) ||
    block.match(/<media:thumbnail[^>]*url="([^"]+)"/) ||
    block.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image[^"]*"/) ||
    block.match(/<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/) ||
    decode(block).match(/<img[^>]+src=["']([^"']+)["']/);
  if (!m) return '';
  return decode(m[1]).replace(/^http:\/\//, 'https://');
}

// Handles RSS (<item>) and Atom (<entry>)
function parseFeed(xml, source) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/g) || [];
  return blocks.map(b => {
    const url = tag(b, 'link') || (b.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
    const d = new Date(tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated'));
    return {
      title: tag(b, 'title'),
      url: decode(url),
      image: findImage(b),
      source,
      date: isNaN(d) ? null : d.toISOString(),
    };
  }).filter(n => n.title && /^https?:\/\//.test(n.url));
}

function icsDate(v) {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)).toISOString();
}

function parseIcs(text, series) {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  return (unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []).map(ev => {
    const field = n => (ev.match(new RegExp(`^${n}[^:\\n]*:(.*)$`, 'm')) || [])[1]?.trim() || '';
    const start = icsDate(field('DTSTART'));
    const end = icsDate(field('DTEND')) || start;
    return { title: field('SUMMARY').replace(/\\,/g, ',').replace(/\\n/g, ' '), series, start, end };
  }).filter(e => e.title && e.start);
}

const articles = [];
const events = [];
const okSeries = new Set();

await Promise.all([
  ...FEEDS.map(async f => {
    try {
      const items = parseFeed(await get(f.url), f.source);
      console.log(`${f.source}: ${items.length} items, ${items.filter(i => i.image).length} with images`);
      articles.push(...items);
    } catch (e) { console.warn(`${f.source} FAILED:`, e.message); }
  }),
  ...CALENDARS.map(async c => {
    try {
      const items = parseIcs(await get(c.url), c.series);
      console.log(`${c.series} calendar: ${items.length} events`);
      if (items.length) { okSeries.add(c.series); events.push(...items); }
    } catch (e) { console.warn(`${c.series} calendar FAILED:`, e.message); }
  }),
]);

const now = Date.now();

// articles: newest first, drop duplicate links, cap per source
const seen = new Set();
const perSource = {};
const sorted = articles
  .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  .filter(a => !seen.has(a.url) && seen.add(a.url));
const topArticles = sorted
  .filter(a => (perSource[a.source] = (perSource[a.source] || 0) + 1) <= MAX_PER_SOURCE)
  .slice(0, MAX_ARTICLES);

// events: next few per series; if a series failed this run, keep its previous events
let prev = {};
try { prev = JSON.parse(await readFile(OUT, 'utf8')); } catch {}
const perSeries = {};
const fresh = events
  .filter(e => new Date(e.end) > now)
  .sort((a, b) => new Date(a.start) - new Date(b.start))
  .filter(e => (perSeries[e.series] = (perSeries[e.series] || 0) + 1) <= MAX_EVENTS_PER_SERIES);
const carried = (prev.events || []).filter(e => !okSeries.has(e.series) && new Date(e.end) > now);
const upcoming = [...fresh, ...carried].sort((a, b) => new Date(a.start) - new Date(b.start));

if (!topArticles.length && !upcoming.length) {
  console.warn('Nothing fetched; leaving live.json untouched.');
} else {
  await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), events: upcoming, articles: topArticles }, null, 2));
  console.log(`Wrote ${topArticles.length} articles and ${upcoming.length} events.`);
}
