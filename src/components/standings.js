import { esc } from '../lib/html.js';

const PREVIEW_ROWS = 5;

// data: { series: [{ id, name, season, round?, tables: [{ title, rows }] }] }
export function renderStandings(el, data) {
  const series = data?.series ?? [];
  if (!series.length) {
    el.innerHTML = '<h2>Standings</h2><p>No standings yet. Run <code>npm run fetch</code>.</p>';
    return;
  }

  el.innerHTML = `
    <h2>Standings</h2>
    <div class="standings-grid">
      ${series.map((s, si) => `
        <article class="box standings-card" data-series="${esc(s.id)}" data-index="${si}">
          ${headerHtml(s)}
          ${tabsHtml(s)}
          <div class="standings-tables">${s.tables.map((t, i) => tableHtml(t, i, PREVIEW_ROWS)).join('')}</div>
          <button type="button" class="standings-toggle">Show full standings</button>
        </article>`).join('')}
    </div>
    <dialog class="standings-dialog" aria-label="Full standings">
      <div class="standings-dialog-body"></div>
    </dialog>`;

  // Reserve room for each box's tallest tab, so switching tabs never moves other boxes
  const reserveTabHeight = () => el.querySelectorAll('.standings-card .standings-tables').forEach(wrap => {
    wrap.style.minHeight = '';
    const tables = [...wrap.querySelectorAll('.standings-table')];
    const shown = tables.map(t => t.hidden);
    const tallest = Math.max(...tables.map(t => { t.hidden = false; const h = t.offsetHeight; return h; }));
    tables.forEach((t, i) => { t.hidden = shown[i]; });
    wrap.style.minHeight = `${tallest}px`;
  });
  reserveTabHeight();
  window.addEventListener('resize', reserveTabHeight);

  const dialog = el.querySelector('.standings-dialog');
  const dialogBody = el.querySelector('.standings-dialog-body');

  // Opens the full standings in a popup; the boxes on the page never move
  const openFull = (s, tab) => {
    dialogBody.innerHTML = `
      <button type="button" class="standings-close" aria-label="Close">✕</button>
      ${headerHtml(s)}
      ${tabsHtml(s, tab)}
      ${s.tables.map((t, i) => tableHtml(t, i, Infinity, tab)).join('')}`;
    dialog.showModal();
  };

  const switchTab = (container, tab) => {
    container.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    container.querySelectorAll('.standings-table').forEach(t => { t.hidden = t.dataset.table !== tab; });
  };

  el.addEventListener('click', e => {
    const card = e.target.closest('.standings-card');
    if (card && e.target.matches('[data-tab]')) switchTab(card, e.target.dataset.tab);
    if (card && e.target.matches('.standings-toggle')) {
      const activeTab = card.querySelector('[data-tab].active')?.dataset.tab ?? '0';
      openFull(series[+card.dataset.index], activeTab);
    }
    if (e.target.closest('.standings-dialog') && e.target.matches('[data-tab]')) switchTab(dialogBody, e.target.dataset.tab);
    if (e.target.matches('.standings-close') || e.target === dialog) dialog.close(); // ✕ or click outside
  });
}

const headerHtml = s => `
  <header>
    <h3>${esc(s.name)}</h3>
    <span class="label">${esc(s.season)}${s.round ? ` · after round ${esc(s.round)}` : ''}</span>
  </header>`;

const tabsHtml = (s, active = '0') => s.tables.length > 1
  ? `<div class="standings-tabs">${s.tables.map((t, i) =>
      `<button type="button" data-tab="${i}" class="${String(i) === active ? 'active' : ''}">${esc(t.title)}</button>`).join('')}</div>`
  : `<p class="label">${esc(s.tables[0].title)}</p>`;

function tableHtml(t, i, limit, active = '0') {
  const rows = t.rows.slice(0, limit);
  const hasTeam = rows.some(r => r.team);
  return `
    <table class="standings-table" data-table="${i}" ${String(i) !== active ? 'hidden' : ''}>
      <thead><tr><th>Pos</th><th>${esc(t.title.replace(/s$/, '').replace(/^Hypercar /, ''))}</th>${hasTeam ? '<th>Team</th>' : ''}<th>Pts</th></tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${esc(r.pos ?? '–')}</td>
            <td>${esc(r.name)}</td>
            ${hasTeam ? `<td>${esc(r.team ?? '')}</td>` : ''}
            <td>${esc(r.points)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}
