import { esc, safeUrl } from '../lib/html.js';
import { getCarPhoto } from '../lib/carOfTheDay.js';

const PLACEHOLDER = 'images/cars/placeholder.svg';

export function renderCarOfTheDay(el, car) {
  el.innerHTML = `
    <div class="box cotd">
      <span class="label">Car of the Day</span>
      <a class="cotd-link" href="#under-the-hood">
        <img class="cotd-img" src="${esc(car.image || PLACEHOLDER)}" alt="${esc(car.name)}" />
        <strong>${esc(car.year)} ${esc(car.name)}</strong>
        <span>${esc(car.blurb)}</span>
        <span class="cotd-more">See what's under the hood →</span>
      </a>
      <small class="credit"></small>
    </div>`;

  // Your own artwork (an "image" in cars.json) wins; otherwise load a Wikimedia photo
  if (car.image || !car.wiki) return;

  getCarPhoto(car.wiki)
    .then(photo => {
      if (!photo) return;
      el.querySelector('.cotd-img').src = photo.src;
      el.querySelector('.credit').innerHTML =
        `Photo: <a href="${safeUrl(photo.page)}" target="_blank" rel="noopener">${esc(photo.credit)}</a>` +
        (photo.license ? ` · ${esc(photo.license)}` : '') + ' · via Wikimedia Commons';
    })
    .catch(err => console.warn('Car photo unavailable:', err.message));
}
