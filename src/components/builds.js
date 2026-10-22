import { esc } from '../lib/html.js';

export function renderBuilds(el, builds) {
  el.innerHTML = `
    <div class="section-head"><h2>Builds</h2></div>
    <div class="builds">
      ${builds.map(b => `
        <article class="build">
          <img src="${esc(b.image)}" alt="${esc(b.car)} build by ${esc(b.builder)}" loading="lazy" />
          <h3>${esc(b.car)}</h3>
          <p class="build-by">by ${esc(b.builder)}</p>
          <p>${esc(b.description)}</p>
        </article>`).join('')}
    </div>`;
}
