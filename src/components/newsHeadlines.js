import { esc, safeUrl } from '../lib/html.js';

export function renderNewsHeadlines(el, items = [], updated) {
  el.innerHTML = `
    <h2>News</h2>
    ${updated ? `<p class="label">Updated ${esc(new Date(updated).toLocaleString())}</p>` : ''}
    ${items.length ? `
      <ul class="headline-list">
        ${items.map(n => `
          <li class="story">
            ${n.image ? `<img src="${esc(safeUrl(n.image))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
            <div>
              <a href="${esc(safeUrl(n.url))}" target="_blank" rel="noopener">${esc(n.title)}</a>
              <small>${esc(n.source)}${n.date ? ' · ' + esc(new Date(n.date).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) : ''}</small>
            </div>
          </li>`).join('')}
      </ul>` : '<p>No headlines yet. Run <code>npm run fetch</code>.</p>'}`;
}
