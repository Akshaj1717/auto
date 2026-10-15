// Explore page: search any car and show everything Wikipedia knows about it.
// The address bar keeps the state (explore.html?car=Ferrari_F40), so pages can be shared
// and the back button works.
import { renderNav } from './components/nav.js';
import { renderNewsSidebar } from './components/newsSidebar.js';
import { searchCars, loadCar } from './lib/wiki.js';
import { esc, safeUrl } from './lib/html.js';
import live from './data/live.json';

renderNav(document.getElementById('nav'));
renderNewsSidebar(document.getElementById('news-sidebar'), live.events);

const form = document.getElementById('explore-form');
const input = document.getElementById('explore-input');
const resultsEl = document.getElementById('explore-results');
const carEl = document.getElementById('explore-car');

let lastResults = [];
let searchToken = 0;

// ---------- Search as you type ----------
let debounce;
input.addEventListener('input', () => {
  clearTimeout(debounce);
  const q = input.value.trim();
  if (q.length < 2) { resultsEl.innerHTML = ''; return; }
  debounce = setTimeout(() => runSearch(q), 300);
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  clearTimeout(debounce);
  const results = await runSearch(q);
  if (results?.length) openCar(results[0].title); // Enter opens the best match
});

async function runSearch(q) {
  const token = ++searchToken;
  resultsEl.innerHTML = '<p class="label">Searching…</p>';
  try {
    const results = await searchCars(q);
    if (token !== searchToken) return null; // a newer search started; ignore this one
    lastResults = results;
    resultsEl.innerHTML = results.length
      ? `<ul class="explore-results">${results.map((r, i) => `
          <li><button type="button" data-i="${i}">
            ${r.thumb ? `<img src="${esc(safeUrl(r.thumb))}" alt="" loading="lazy" />` : '<span class="explore-noimg"></span>'}
            <span><strong>${esc(r.title)}</strong><small>${esc(r.description)}</small></span>
          </button></li>`).join('')}</ul>`
      : `<p>No cars found for “${esc(q)}”. Try the make and model, like “Ferrari F40”.</p>`;
    return results;
  } catch (err) {
    if (token === searchToken) resultsEl.innerHTML = `<p>Search failed (${esc(err.message)}). Check your connection and try again.</p>`;
    return null;
  }
}

resultsEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-i]');
  if (btn) openCar(lastResults[+btn.dataset.i].title);
});

// ---------- One car ----------
async function openCar(title, { push = true } = {}) {
  resultsEl.innerHTML = '';
  if (push) history.pushState({ car: title }, '', `?car=${encodeURIComponent(title.replace(/ /g, '_'))}`);
  carEl.innerHTML = `<p class="label">Loading ${esc(title)}…</p>`;
  try {
    const car = await loadCar(title);
    renderCar(car);
    document.title = `${car.title} · Explore · Auto`;
  } catch (err) {
    carEl.innerHTML = `<p>Couldn't load “${esc(title)}” (${esc(err.message)}).</p>`;
  }
}

const credit = p => `<a href="${esc(safeUrl(p.page))}" target="_blank" rel="noopener">${esc(p.credit)}</a>${p.license ? ` · ${esc(p.license)}` : ''}`;

function renderCar(car) {
  carEl.innerHTML = `
    <article class="explore-car">
      <header class="explore-hero">
        ${car.hero ? `
          <figure>
            <img src="${esc(safeUrl(car.hero.src))}" alt="${esc(car.title)}" />
            <figcaption class="credit">Photo: ${credit(car.hero)} · via Wikimedia Commons</figcaption>
          </figure>` : ''}
        <h2>${esc(car.title)}</h2>
        ${car.description ? `<p class="label">${esc(car.description)}</p>` : ''}
        <p class="explore-summary">${esc(car.summary)}</p>
      </header>

      ${car.specs.length ? `
        <section class="box">
          <h3>Specifications</h3>
          <div class="grid">
            ${car.specs.map(([k, v]) => `<div class="cell"><strong>${esc(k)}</strong><br>${esc(v)}</div>`).join('')}
          </div>
        </section>` : ''}

      ${car.photos.length ? `
        <section class="box">
          <h3>Photos</h3>
          <div class="explore-gallery">
            ${car.photos.map(p => `
              <figure>
                <a href="${esc(safeUrl(p.page))}" target="_blank" rel="noopener"><img src="${esc(safeUrl(p.src))}" alt="${esc(p.caption || car.title)}" loading="lazy" /></a>
                <figcaption class="credit">${credit(p)}</figcaption>
              </figure>`).join('')}
          </div>
        </section>` : ''}

      ${car.sections.length ? `
        <section class="box explore-sections">
          <h3>In depth</h3>
          ${car.sections.map((s, i) => `
            <details ${i < 2 ? 'open' : ''} class="level-${s.level}">
              <summary>${esc(s.title)}</summary>
              ${s.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}
            </details>`).join('')}
        </section>` : ''}

      <p class="credit explore-attribution">
        Text and specifications from the Wikipedia article
        <a href="${esc(safeUrl(car.url))}" target="_blank" rel="noopener">“${esc(car.title)}”</a>,
        available under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>.
        Photos from Wikimedia Commons, credited individually.
      </p>
    </article>`;
}

// ---------- Address bar: ?car=… or ?q=… ----------
function fromUrl() {
  const params = new URLSearchParams(location.search);
  const car = params.get('car');
  const q = params.get('q');
  if (car) { input.value = ''; openCar(car.replace(/_/g, ' '), { push: false }); }
  else if (q) { input.value = q; runSearch(q); }
  else carEl.innerHTML = '';
}
window.addEventListener('popstate', fromUrl);
fromUrl();
