import { esc, safeUrl } from '../lib/html.js';

// car: { name, specs: [[label, value], ...], url? }
export function renderUnderTheHood(el, car) {
  el.innerHTML = `
    <div class="section-head">
      <h2>Under the hood</h2>
      ${car.url ? `<a class="text-link" href="${esc(safeUrl(car.url))}" target="_blank" rel="noopener">Read the full history on Wikipedia</a>` : ''}
    </div>
    <dl class="spec-list">
      ${car.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
    </dl>`;
}
