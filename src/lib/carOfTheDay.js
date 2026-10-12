// Picks a random Car of the Day that changes at midnight (New York time).
// Every visitor sees the same car on the same day. Cars are shuffled into a
// random order, and every car is shown once before any car repeats.

const TIME_ZONE = 'America/New_York';

// Days since 1970 in the chosen time zone
function dayNumber(date = new Date()) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date); // "2026-10-11"
  return Math.floor(Date.parse(ymd) / 86_400_000);
}

// Small seeded random number generator: same seed → same "random" sequence
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickCarOfTheDay(cars, date = new Date()) {
  const day = dayNumber(date);
  const n = cars.length;
  const cycle = Math.floor(day / n); // a new shuffle every n days
  const rand = seededRandom(cycle * 2654435761);

  const order = [...cars.keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return cars[order[day % n]];
}

// Looks up the car's main photo on Wikipedia and returns it with the
// photographer credit and license, which must be shown with the photo.
// Returns null if there is no freely licensed photo.
const API = 'https://en.wikipedia.org/w/api.php';

async function wiki(params) {
  const res = await fetch(`${API}?${new URLSearchParams({ ...params, format: 'json', origin: '*' })}`);
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return res.json();
}

const textOnly = html =>
  html ? new DOMParser().parseFromString(html, 'text/html').body.textContent.trim() : '';

export async function getCarPhoto(wikiTitle) {
  const pageData = await wiki({
    action: 'query', titles: wikiTitle, redirects: '1', prop: 'pageimages', piprop: 'name',
  });
  const file = Object.values(pageData.query?.pages ?? {})[0]?.pageimage;
  if (!file) return null;

  const fileData = await wiki({
    action: 'query', titles: `File:${file}`, prop: 'imageinfo',
    iiprop: 'url|extmetadata', iiurlwidth: '1200',
  });
  const info = Object.values(fileData.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!info) return null;

  const meta = info.extmetadata ?? {};
  if (meta.NonFree?.value) return null; // skip copyrighted "fair use" images

  return {
    src: info.thumburl || info.url,
    credit: textOnly(meta.Artist?.value) || 'Unknown photographer',
    license: meta.LicenseShortName?.value || '',
    page: info.descriptionurl,
  };
}
