import { esc, safeUrl } from '../lib/html.js';

export function renderHeadlines(el, items) {
  if (!items.length) { el.hidden = true; return; }
  el.innerHTML = `
    <div class="section-head">
      <h2>Top stories</h2>
      <a class="text-link" href="./news.html">All news</a>
    </div>
    <div class="headline-grid">
      ${items.map(n => `
        <article class="headline">
          ${n.image ? `<img src="${esc(safeUrl(n.image))}" alt="" loading="lazy" />` : ''}
          <p class="headline-source">${esc(n.source)}${n.date ? `, ${esc(new Date(n.date).toLocaleDateString([], { month: 'short', day: 'numeric' }))}` : ''}</p>
          <h3><a href="${esc(safeUrl(n.url))}" target="_blank" rel="noopener">${esc(n.title)}</a></h3>
          ${n.summary ? `<p class="headline-summary">${esc(n.summary)}</p>` : ''}
        </article>`).join('')}
    </div>`;
}
