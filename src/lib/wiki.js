// Talks to Wikipedia from the visitor's browser (Wikipedia allows this with origin=*).
// Used by the Explore page: search for a car, then load everything about it.
import { readInfobox, cleanValue } from './infobox.js';
import { cylindersFrom, yearFrom, brandInfo, groupOf, CONTINENTS } from './cardle.js';

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
// For any car article: year and cylinders from the Wikipedia info panel, and
// manufacturer, parent company, country and continent from Wikidata.
const WIKIDATA = 'https://www.wikidata.org/w/api.php';

async function wikidata(ids, props) {
  const list = [...new Set(ids.filter(Boolean))];
  if (!list.length) return {};
  const res = await fetch(`${WIKIDATA}?${new URLSearchParams({
    action: 'wbgetentities', ids: list.slice(0, 50).join('|'), props, languages: 'en', format: 'json', origin: '*' })}`);
  if (!res.ok) throw new Error(`Wikidata error ${res.status}`);
  return (await res.json()).entities ?? {};
}
// IDs of the items a property points to, e.g. claimIds(car, 'P176') → ['Q81965']
const claimIds = (entity, prop) => (entity?.claims?.[prop] ?? [])
  .filter(c => c.rank !== 'deprecated')
  .map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const claimYear = (entity, prop) => {
  const t = entity?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.time; // "+1987-00-00T00:00:00Z"
  return t ? +t.slice(1, 5) : null;
};
const labelOf = e => e?.labels?.en?.value ?? null;

async function wikidataFacts(title) {
  const page = (await api({ action: 'query', titles: title, redirects: '1', prop: 'pageprops', ppprop: 'wikibase_item' }))
    .query?.pages?.[0];
  const canonical = page?.title ?? title;
  const qid = page?.pageprops?.wikibase_item;
  if (!qid) return { canonical };

  const car = (await wikidata([qid], 'claims'))[qid];
  const brands = claimIds(car, 'P1716');         // brand, e.g. Chevrolet
  const makers = claimIds(car, 'P176');          // manufacturer, e.g. General Motors
  const makerId = brands[0] ?? makers[0];
  const originId = claimIds(car, 'P495')[0];     // country of origin

  const level1 = await wikidata([makerId, ...makers, originId], 'labels|claims');
  const maker = level1[makerId];
  const countryId = originId ?? claimIds(maker, 'P17')[0];
  const parentIds = [...makers.filter(m => m !== makerId), ...claimIds(maker, 'P749'), ...claimIds(maker, 'P127')];

  const level2 = await wikidata([...parentIds, countryId], 'labels|claims');
  const country = level1[countryId] ?? level2[countryId];
  const continentIds = claimIds(country, 'P30');
  const level3 = await wikidata(continentIds, 'labels');

  return {
    canonical,
    maker: labelOf(maker),
    parents: parentIds.map(id => labelOf(level1[id] ?? level2[id])).filter(Boolean),
    country: labelOf(country),
    continents: continentIds.map(id => labelOf(level3[id])).filter(Boolean),
    wikidataYear: claimYear(car, 'P571') ?? claimYear(car, 'P580'),
  };
}

async function infoboxFacts(title) {
  const d = await api({ action: 'parse', page: title, redirects: '1', prop: 'wikitext', section: '0' });
  const box = readInfobox(d.parse?.wikitext ?? '');
  const text = k => cleanValue(box[k] ?? '', 1000);
  return {
    year: yearFrom(text('production'), text('model_years')),
    cylinders: cylindersFrom(text('engine') || text('motor')),
    makerText: text('manufacturer').split(',')[0] || null,
  };
}

const factsCache = new Map();
// → { canonical, maker, group, parents, country, continents, year, cylinders } (unknown values are null)
// The brand comes from the car's name when it's a known brand ("SEAT León" → SEAT), and its owner
// from the BRAND_GROUPS table in cardle.js, so every SEAT is treated the same way. Wikidata only
// fills in brands the table doesn't know.
export function getCarFacts(title) {
  if (!factsCache.has(title)) {
    factsCache.set(title, Promise.all([
      wikidataFacts(title).catch(() => ({ canonical: title })),
      infoboxFacts(title).catch(() => ({})),
    ]).then(([wd, box]) => {
      const known = brandInfo(wd.canonical ?? title, wd.maker, box.makerText);
      return {
      canonical: wd.canonical ?? title,
      maker: known?.brand ?? wd.maker ?? box.makerText ?? null,
      group: known ? known.group : groupOf(wd.maker),
      parents: known ? [] : wd.parents ?? [],
      country: known?.country ?? wd.country ?? null,
      continents: known?.country ? CONTINENTS[known.country] ?? wd.continents ?? [] : wd.continents ?? [],
      year: box.year ?? wd.wikidataYear ?? null,
      cylinders: box.cylinders ?? null,
      };
    }));
  }
  return factsCache.get(title);
}
