import { esc } from '../lib/html.js';

const SERIES = ['F1', 'WEC', 'NASCAR', 'MotoGP'];
const when = iso => new Date(iso).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
const day = iso => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
const range = e => day(e.start) === day(e.end) ? day(e.start) : `${day(e.start)} – ${day(e.end)}`;

export function renderNewsSidebar(el, events = []) {
  const now = new Date();
  const upcoming = events
    .filter(e => SERIES.includes(e.series) && Array.isArray(e.sessions) && new Date(e.end) > now)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const opened = new Set();

  el.innerHTML = `
    <h2 class="label">Upcoming events</h2>
    ${upcoming.length ? upcoming.map(e => {
      const open = !opened.has(e.series);
      opened.add(e.series);
      const showList = e.sessions.length > 1 || e.sessions[0].title !== e.name;
      return `
        <details class="weekend"${open ? ' open' : ''}>
          <summary><strong>${esc(e.name || e.series)}</strong><small>${esc(e.series)} · ${esc(range(e))}</small></summary>
          ${showList ? `<ul class="sessions">
            ${e.sessions.map(s => `<li class="${new Date(s.end) < now ? 'past' : ''}">${esc(s.title)}<small>${esc(when(s.start))}</small></li>`).join('')}
          </ul>` : ''}
        </details>`;
    }).join('') : '<p>No upcoming events.</p>'}`;
}
