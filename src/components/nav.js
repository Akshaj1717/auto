import { renderThemeControls } from '../lib/theme.js';

const LINKS = [
  { label: 'News', href: './news.html' },
  { label: 'Sports', href: './sports.html' },
  { label: 'Letter', href: './#letter' },
  { label: 'Explore', href: './explore.html' },
  { label: 'Game', href: './game.html' },
];

export function renderNav(el) {
  const here = location.pathname.split('/').pop() || 'index.html';
  el.innerHTML = `
    <div class="nav-links">
      ${LINKS.map(l => `<a href="${l.href}"${l.href.endsWith(here) ? ' aria-current="page"' : ''}>${l.label}</a>`).join('')}
    </div>
    <div class="nav-controls"></div>`;
  renderThemeControls(el.querySelector('.nav-controls'));
}
