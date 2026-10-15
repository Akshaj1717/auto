import { esc, safeUrl } from '../lib/html.js';

const PREVIEW_ROWS = 5;

// data: { series: [{ id, name, season, round?, source, sourceUrl, updated, tables: [{ title, rows }] }] }
export function renderStandings(el, data) {
  const series = data?.series ?? [];
  if (!series.length) {
    el.innerHTML = '<h2>Standings</h2><p>No standings yet. Run <code>npm run fetch</code>.</p>';
    return;
  }

  el.innerHTML = `
    <h2>Standings</h2>
    <div class="standings-grid">
      ${series.map(s => `
        <article class="box standings-card" data-series="${esc(s.id)}">
          <header>
            <h3>${esc(s.name)}</h3>
            <span class="label">${esc(s.season)}${s.round ? ` · after round ${esc(s.round)}` : ''}</span>
          </header>
          ${s.tables.length > 1 ? `
            <div class="standings-tabs">
              ${s.tables.map((t, i) => `<button type="button" data-tab="${i}" class="${i === 0 ? 'active' : ''}">${esc(t.title)}</button>`).join('')}
            </div>` : `<p class="label">${esc(s.tables[0].title)}</p>`}
          ${s.tables.map((t, i) => tableHtml(t, i)).join('')}
          <button type="button" class="standings-toggle">Show full standings</button>
          <small class="label">Source: <a href="${esc(safeUrl(s.sourceUrl))}" target="_blank" rel="noopener">${esc(s.source)}</a></small>
        </article>`).join('')}
    </div>`;

  // One click handler for every card: switch tabs, expand/collapse
  el.addEventListener('click', e => {
    const card = e.target.closest('.standings-card');
    if (!card) return;
    if (e.target.matches('[data-tab]')) {
      card.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === e.target));
      card.querySelectorAll('.standings-table').forEach(t => { t.hidden = t.dataset.table !== e.target.dataset.tab; });
    }
    if (e.target.matches('.standings-toggle')) {
      const open = card.classList.toggle('expanded');
      e.target.textContent = open ? 'Show less' : 'Show full standings';
    }
  });
}

function tableHtml(t, i) {
  const hasTeam = t.rows.some(r => r.team);
  return `
    <table class="standings-table" data-table="${i}" ${i ? 'hidden' : ''}>
      <thead><tr><th>Pos</th><th>${esc(t.title.replace(/s$/, '').replace(/^Hypercar /, ''))}</th>${hasTeam ? '<th>Team</th>' : ''}<th>Pts</th></tr></thead>
      <tbody>
        ${t.rows.map((r, n) => `
          <tr class="${n >= PREVIEW_ROWS ? 'extra' : ''}">
            <td>${esc(r.pos ?? '–')}</td>
            <td>${esc(r.name)}</td>
            ${hasTeam ? `<td>${esc(r.team ?? '')}</td>` : ''}
            <td>${esc(r.points)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}
