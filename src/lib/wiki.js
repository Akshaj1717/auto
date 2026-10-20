// Talks to Wikipedia from the visitor's browser (Wikipedia allows this with origin=*).
// Used by the Explore page: search for a car, then load everything about it.
import { readInfobox, cleanValue } from './infobox.js';
import { cylindersFrom, yearFrom } from './cardle.js';

const API = 'https://en.wikipedia.org/w/api.php';
const REST = 'https://en.wikipedia.org/api/rest_v1';

async function api(params) {
  const res = await fetch(`${API}?${new URLSearchParams({ ...params, format: 'json', formatversion: '2', origin: '*' })}`);
  if (!res.ok) throw new Error(`Wikipedia error ${res.status}`);
  return res.json();
}
async function rest(path) {
  const res = await fetch(`${REST}${path}`);
  if (!res.ok) throw new Error(`Wikipedia error ${res.status}`);
  return res.json();
}
const pathTitle = t => encodeURIComponent(t.replace(/ /g, '_'));

// ---------- Search ----------
// Only articles that have a car info panel, so "f40" finds the Ferrari F40, not the F40 highway.
export async function searchCars(query, limit = 10) {
  const run = async q => (await api({
    action: 'query', generator: 'search', gsrsearch: q, gsrlimit: String(limit), gsrnamespace: '0',
    prop: 'pageimages|description', piprop: 'thumbnail', pithumbsize: '240',
  })).query?.pages ?? [];
  let pages = await run(`${query} hastemplate:"Infobox automobile"`);
  if (!pages.length) pages = await run(`${query} car`); // fallback for odd articles
  return pages
    .sort((a, b) => a.index - b.index)
    .map(p => ({ title: p.title, description: p.description ?? '', thumb: p.thumbnail?.source ?? null }));
}

// ---------- Everything about one car ----------
const SKIP_SECTIONS = /^(see also|references|notes|external links|further reading|bibliography|sources|citations|footnotes)$/i;

// Readable labels for the info panel; anything not listed is shown with a tidied-up name
const FIELD_LABELS = {
  manufacturer: 'Manufacturer', aka: 'Also called', production: 'Production', model_years: 'Model years',
  assembly: 'Assembly', designer: 'Designer', class: 'Class', body_style: 'Body style', layout: 'Layout',
  platform: 'Platform', related: 'Related', engine: 'Engine', motor: 'Electric motor', power: 'Power output',
  transmission: 'Transmission', battery: 'Battery', range: 'Range', electric_range: 'Electric range',
  wheelbase: 'Wheelbase', length: 'Length', width: 'Width', height: 'Height', weight: 'Curb weight',
  curb_weight: 'Curb weight', predecessor: 'Predecessor', successor: 'Successor', sp: null, image: null,
  caption: null, name: null, alt: null, image_size: null, uk: null, us: null, sp_layout: null, boxstyle: null,
};
const prettyKey = k => k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

function specsFrom(wikitext) {
  const box = readInfobox(wikitext);
  return Object.entries(box)
    .filter(([k]) => FIELD_LABELS[k] !== null && !/image|caption|logo|alt$/i.test(k))
    .map(([k, v]) => [FIELD_LABELS[k] ?? prettyKey(k), cleanValue(v, 400)])
    .filter(([, v]) => v);
}

// Turns the plain-text article into sections: [{ title, level, paragraphs }]
function sectionsFrom(text) {
  const out = [{ title: 'Overview', level: 2, paragraphs: [] }];
  for (const line of text.split('\n')) {
    const h = line.match(/^(={2,4})\s*(.+?)\s*\1$/);
    if (h) out.push({ title: h[2], level: h[1].length, paragraphs: [] });
    else if (line.trim()) out.at(-1).paragraphs.push(line.trim());
  }
  // drop reference-style sections and their sub-sections, and empty ones
  const kept = [];
  let skipLevel = 0;
  for (const s of out) {
    if (skipLevel && s.level > skipLevel) continue;
    skipLevel = SKIP_SECTIONS.test(s.title) ? s.level : 0;
    if (!skipLevel && s.paragraphs.length) kept.push(s);
  }
  return kept;
}

const stripHtml = s => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// Up to `max` freely licensed photos from the article, each with its credit
async function photosFrom(title, max = 12) {
  const media = await rest(`/page/media-list/${pathTitle(title)}`);
  const files = (media.items ?? [])
    .filter(i => i.type === 'image' && !/\.svg$/i.test(i.title) && !/logo|icon|flag|map|diagram/i.test(i.title))
    .map(i => i.title)
    .slice(0, max);
  if (!files.length) return [];
  const data = await api({
    action: 'query', titles: files.join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1280',
  });
  const byTitle = Object.fromEntries((data.query?.pages ?? []).map(p => [p.title, p.imageinfo?.[0]]));
  const norm = t => t.replace(/_/g, ' ');
  return files
    .map(f => ({ file: f, info: byTitle[norm(f)] ?? byTitle[f] }))
    .filter(({ info }) => info && !info.extmetadata?.NonFree?.value) // skip copyrighted "fair use" images
    .map(({ file, info }) => ({
      file,
      src: info.thumburl || info.url,
      credit: stripHtml(info.extmetadata?.Artist?.value) || 'Unknown photographer',
      license: info.extmetadata?.LicenseShortName?.value || '',
      caption: stripHtml(info.extmetadata?.ImageDescription?.value).slice(0, 140),
      page: info.descriptionurl,
    }));
}

export async function loadCar(title) {
  const [summary, wikitext, extract, photos] = await Promise.all([
    rest(`/page/summary/${pathTitle(title)}`),
    api({ action: 'parse', page: title, redirects: '1', prop: 'wikitext', section: '0' })
      .then(d => d.parse?.wikitext ?? '').catch(() => ''),
    api({ action: 'query', titles: title, redirects: '1', prop: 'extracts', explaintext: '1', exsectionformat: 'wiki' })
      .then(d => d.query?.pages?.[0]?.extract ?? '').catch(() => ''),
    photosFrom(title).catch(() => []),
  ]);
  // Lead photo: the article's main image if it's freely licensed, otherwise the first free photo
  const mainFile = summary.originalimage?.source?.split('/').pop();
  const hero = photos.find(p => mainFile && decodeURIComponent(p.file).replace(/ /g, '_').endsWith(decodeURIComponent(mainFile))) ?? photos[0] ?? null;
  return {
    title: summary.title,
    description: summary.description ?? '',
    summary: summary.extract ?? '',
    url: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${pathTitle(title)}`,
    hero,
    photos: photos.filter(p => p !== hero),
    specs: specsFrom(wikitext),
    sections: sectionsFrom(extract).slice(1), // section 0 repeats the summary
  };
}

// ---------- Facts for the "Guess the Car" game ----------
// Year of production and cylinder count, read from the car's info panel

const factsCache = new Map();
export function getCarFacts(title) {
  if (!factsCache.has(title)) {
    factsCache.set(title, api({ action: 'parse', page: title, redirects: '1', prop: 'wikitext', section: '0' })
      .then(d => {
        const box = readInfobox(d.parse?.wikitext ?? '');
        const text = k => cleanValue(box[k] ?? '', 1000);
        return {
          year: yearFrom(text('production'), text('model_years')),
          cylinders: cylindersFrom(text('engine') || text('motor')),
        };
      })
      .catch(() => ({ year: null, cylinders: null })));
  }
  return factsCache.get(title);
}
