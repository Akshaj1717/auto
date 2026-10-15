import { esc, safeUrl } from '../lib/html.js';

export function renderHeadlines(el, items) {
  el.innerHTML = items.map(n => `
    <article class="box headline">
      ${n.image ? `<img src="${esc(safeUrl(n.image))}" alt="" loading="lazy" />` : ''}
      <span class="label">${esc(n.source)}${n.date ? ' · ' + esc(new Date(n.date).toLocaleDateString()) : ''}</span>
      <h3><a href="${esc(safeUrl(n.url))}" target="_blank" rel="noopener">${esc(n.title)}</a></h3>
      ${n.summary ? `<p>${esc(n.summary)}</p>` : ''}
    </article>`).join('');
}
