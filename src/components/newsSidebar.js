import { esc } from '../lib/html.js';

const SERIES = ['F1', 'WEC', 'NASCAR', 'MotoGP'];
const when = iso => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function renderNewsSidebar(el, events = []) {
  const now = new Date();
  const upcoming = events.filter(e => SERIES.includes(e.series) && new Date(e.end) > now);
  el.innerHTML = `
    <h2 class="label">Upcoming events</h2>
    ${upcoming.length ? `
      <ul>
        ${upcoming.map(e => `<li>${esc(e.title)}<small>${esc(e.series)} · ${esc(when(e.start))}</small></li>`).join('')}
      </ul>` : '<p>No upcoming events.</p>'}`;
}
