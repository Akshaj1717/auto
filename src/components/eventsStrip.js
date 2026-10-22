// Home page: the next race weekends as a horizontal strip
import { esc } from '../lib/html.js';

const day = iso => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

export function renderEventsStrip(el, events = []) {
  const now = new Date();
  const upcoming = events
    .filter(e => new Date(e.end) > now)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 4);
  if (!upcoming.length) { el.hidden = true; return; }

  el.innerHTML = `
    <div class="section-head">
      <h2>Race weekends</h2>
      <a class="text-link" href="./sports.html">Standings</a>
    </div>
    <ol class="events-strip">
      ${upcoming.map(e => {
        const range = day(e.start) === day(e.end) ? day(e.start) : `${day(e.start)} – ${day(e.end)}`;
        return `
        <li>
          <span class="event-series">${esc(e.series)}</span>
          <strong>${esc(e.name || e.title)}</strong>
          <span class="event-date">${esc(range)}</span>
        </li>`;
      }).join('')}
    </ol>`;
}
