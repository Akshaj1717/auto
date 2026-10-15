import { esc, safeUrl } from '../lib/html.js';

// car: { name, specs: [[label, value], ...], url? }
export function renderUnderTheHood(el, car) {
  el.innerHTML = `
    <h2>Under the Hood: ${esc(car.name)}</h2>
    <div class="grid">
      ${car.specs.map(([k, v]) => `<div class="cell"><strong>${esc(k)}</strong><br>${esc(v)}</div>`).join('')}
    </div>
    ${car.url ? `<p><a href="${esc(safeUrl(car.url))}" target="_blank" rel="noopener">Read more on Wikipedia →</a></p>` : ''}`;
}
