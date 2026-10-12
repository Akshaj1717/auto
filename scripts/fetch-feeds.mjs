import { writeFile } from 'node:fs/promises';

const NEWS_FEEDS = [
  { source: 'Formula 1', url: 'https://www.formula1.com/en/latest/all.xml' },
  { source: 'Motorsport.com', url: 'https://www.motorsport.com/rss/all/news/' },
];
const CALENDARS = [
  { series: 'F1', url: 'https://smartcalendars.ai/cal/0871a229ef25c0974967bee010cee350a01731fc5c70c1243881e8228b2a0321.ics' },
  // add more { series, url } .ics feeds here
];
const MAX_NEWS = 10;
const MAX_EVENTS = 8;
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
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&amp;/g, '&')
  .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
};

function parseRss(xml, source) {
  return (xml.match(/<item[\s>][\s\S]*?<\/item>/g) || []).map(item => {
    const d = new Date(tag(item, 'pubDate'));
    return {
      title: tag(item, 'title'),
      url: tag(item, 'link'),
      source,
      date: isNaN(d) ? null : d.toISOString(),
    };
  }).filter(n => n.title && n.url);
}

function icsDate(v) {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  // Z or floating times are treated as UTC (good enough for now)
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)).toISOString();
}

function parseIcs(text, series) {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  return (unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []).map(ev => {
    const field = n => (ev.match(new RegExp(`^${n}[^:\\n]*:(.*)$`, 'm')) || [])[1]?.trim() || '';
    const start = icsDate(field('DTSTART'));
    const end = icsDate(field('DTEND')) || start;
    return {
      title: field('SUMMARY').replace(/\\,/g, ',').replace(/\\n/g, ' '),
      series, start, end,
    };
  }).filter(e => e.title && e.start);
}

const results = { news: [], events: [] };

await Promise.all([
  ...NEWS_FEEDS.map(async f => {
    try { results.news.push(...parseRss(await get(f.url), f.source)); }
    catch (e) { console.warn('news feed failed:', e.message); }
  }),
  ...CALENDARS.map(async c => {
    try { results.events.push(...parseIcs(await get(c.url), c.series)); }
    catch (e) { console.warn('calendar failed:', e.message); }
  }),
]);

const now = Date.now();
const news = results.news
  .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  .slice(0, MAX_NEWS);
const events = results.events
  .filter(e => new Date(e.end) > now)
  .sort((a, b) => new Date(a.start) - new Date(b.start))
  .slice(0, MAX_EVENTS);

if (!news.length && !events.length) {
  console.warn('Nothing fetched; leaving live.json untouched.');
} else {
  await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), events, news }, null, 2));
  console.log(`Wrote ${news.length} news items, ${events.length} events.`);
}
