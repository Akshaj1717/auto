import { esc, safeUrl } from '../lib/html.js';
import { getCarPhoto } from '../lib/carOfTheDay.js';

const PLACEHOLDER = 'images/cars/placeholder.svg';

// car: { name, blurb, photo?, image?, wiki? }
export function renderCarOfTheDay(el, car) {
  el.innerHTML = `
    <div class="box cotd">
      <span class="label">Car of the Day</span>
      <a class="cotd-link" href="#under-the-hood">
        <img class="cotd-img" src="${esc(car.photo?.src || car.image || PLACEHOLDER)}" alt="${esc(car.name)}" />
        <strong>${esc(car.name)}</strong>
        <span>${esc(car.blurb)}</span>
        <span class="cotd-more">See what's under the hood →</span>
      </a>
      <small class="credit"></small>
    </div>`;

  const showCredit = photo => {
    el.querySelector('.credit').innerHTML =
      `Photo: <a href="${esc(safeUrl(photo.page))}" target="_blank" rel="noopener">${esc(photo.credit)}</a>` +
      (photo.license ? ` · ${esc(photo.license)}` : '') + ' · via Wikimedia Commons';
  };

  if (car.photo) return showCredit(car.photo);   // automatic car: photo already fetched
  if (car.image || !car.wiki) return;            // your own artwork

  // Car from cars.json without artwork: look up a photo now
  getCarPhoto(car.wiki)
    .then(photo => {
      if (!photo) return;
      el.querySelector('.cotd-img').src = photo.src;
      showCredit(photo);
    })
    .catch(err => console.warn('Car photo unavailable:', err.message));
}
