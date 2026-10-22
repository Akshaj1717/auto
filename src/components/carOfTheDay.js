// Home page hero: the brand logo, the car's name, and the car's photo (edges fade into the page).
import { esc, safeUrl } from '../lib/html.js';
import { getCarPhoto } from '../lib/carOfTheDay.js';
import { getBrandLogo } from '../lib/wiki.js';
import { brandInfo } from '../lib/cardle.js';

const PLACEHOLDER = 'images/cars/placeholder.svg';
const wikiTitle = car => car.wiki ?? (car.url ? decodeURIComponent(car.url.split('/wiki/').pop()).replace(/_/g, ' ') : null);

// car: { name, blurb, photo?, image?, wiki?/url? }
export function renderCarOfTheDay(el, car) {
  const title = wikiTitle(car);
  const brand = brandInfo(title, car.name)?.brand ?? '';
  const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  el.innerHTML = `
    <div class="hero-top">
      <div class="hero-brand" aria-label="${esc(brand)}">${brand ? `<span class="hero-brand-text">${esc(brand)}</span>` : ''}</div>
      <p class="hero-kicker">Car of the Day, ${esc(today)}</p>
    </div>
    <h1 class="hero-name">${esc(car.name)}</h1>
    <figure class="hero-car">
      <img src="${esc(car.photo?.src || car.image || PLACEHOLDER)}" alt="${esc(car.name)}" fetchpriority="high" />
    </figure>
    <div class="hero-foot">
      <p class="hero-blurb">${esc(car.blurb)}</p>
      <a class="button" href="#under-the-hood">See what's under the hood</a>
    </div>
    <p class="credit hero-credit"></p>`;

  const img = el.querySelector('.hero-car img');
  img.addEventListener('load', () => el.classList.add('is-loaded'), { once: true });
  if (img.complete) el.classList.add('is-loaded');

  const showCredit = photo => {
    el.querySelector('.hero-credit').innerHTML =
      `Photo: <a href="${esc(safeUrl(photo.page))}" target="_blank" rel="noopener">${esc(photo.credit)}</a>` +
      (photo.license ? `, ${esc(photo.license)}` : '') + ', via Wikimedia Commons';
  };
  if (car.photo) showCredit(car.photo);
  else if (!car.image && title) {
    getCarPhoto(title).then(photo => { if (photo) { img.src = photo.src; showCredit(photo); } }).catch(() => {});
  }

  // Brand logo from Wikimedia Commons; the brand name stays as text if there's no logo
  if (title) {
    getBrandLogo(title).then(logo => {
      if (!logo) return;
      const box = el.querySelector('.hero-brand');
      const logoImg = new Image();
      logoImg.alt = `${logo.name ?? brand} logo`;
      logoImg.onload = () => { box.innerHTML = ''; box.append(logoImg); };
      logoImg.src = logo.src;
    }).catch(() => {});
  }
}
