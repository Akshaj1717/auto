// Site colours. The page is always neutral: warm off-white by day, warm graphite by night.
// The chosen brand paint colour is the accent (buttons, active states, spec bars, underlines).
// The Night ↔ Day slider snaps to either end; at night the Miata's headlights pop up.

export const PAINTS = [
  { id: 'rr-black', name: 'Diamond Black', brand: 'Rolls-Royce', hex: '#000000' },
  { id: 'am-green', name: 'Racing Green', brand: 'Aston Martin', hex: '#00352C' },
  { id: 'rosso-corsa', name: 'Rosso Corsa', brand: 'Ferrari', hex: '#D40000' },
  { id: 'giallo-modena', name: 'Giallo Modena', brand: 'Ferrari', hex: '#F6C700' },
  { id: 'papaya', name: 'Papaya', brand: 'McLaren', hex: '#FF8000' },
  { id: 'miami-blue', name: 'Miami Blue', brand: 'Porsche', hex: '#00A0D6' },
  { id: 'verde-mantis', name: 'Verde Mantis', brand: 'Lamborghini', hex: '#74C043' },
  { id: 'soul-red', name: 'Soul Red', brand: 'Mazda', hex: '#9E1B32' },
  { id: 'bayside-blue', name: 'Bayside Blue', brand: 'Nissan', hex: '#1B4F9C' },
  { id: 'wr-blue', name: 'World Rally Blue', brand: 'Subaru', hex: '#003DA5' },
  { id: 'gulf-blue', name: 'Gulf Blue', brand: 'Ford GT40', hex: '#8AC6E8' },
  { id: 'french-blue', name: 'French Racing Blue', brand: 'Bugatti', hex: '#1F4E9C' },
  { id: 'silver-arrow', name: 'Silver Arrow', brand: 'Mercedes-Benz', hex: '#A7A9AC' },
  { id: 'alpine-white', name: 'Alpine White', brand: 'BMW', hex: '#EDEDED' },
];

const STORE = 'auto-theme';
const DEFAULT = { paint: 'rosso-corsa', level: 100 };
export const DAY = { bg: '#EEE8DD', ink: '#1C1A17' };   // off-white beige, warm near-black text
export const NIGHT = { bg: '#1C1A17', ink: '#EEE8DD' };

// ---------- colour maths ----------
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const luminance = rgb => {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

export function readTheme() {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return { ...DEFAULT }; }
}

export function applyTheme({ paint, level }) {
  const p = PAINTS.find(x => x.id === paint) ?? PAINTS[0];
  const night = level < 50;
  const { bg, ink } = night ? NIGHT : DAY;
  const bgRgb = hexToRgb(bg), paintRgb = hexToRgb(p.hex);
  const visible = contrast(paintRgb, bgRgb) >= 2.2; // can the paint be read on this background?
  const root = document.documentElement;
  root.style.setProperty('--bg', bg);
  root.style.setProperty('--ink', ink);
  root.style.setProperty('--paint', p.hex);
  // accent = the paint when it stands out from the background, otherwise the text colour
  root.style.setProperty('--accent', visible ? p.hex : ink);
  root.style.setProperty('--on-accent', visible
    ? (contrast(paintRgb, [255, 255, 255]) >= contrast(paintRgb, [0, 0, 0]) ? '#ffffff' : '#000000') : bg);
  root.dataset.mode = night ? 'night' : 'day';
  root.dataset.lights = night ? 'on' : 'off';
  root.style.colorScheme = night ? 'dark' : 'light';
}

export function saveTheme(theme) {
  try { localStorage.setItem(STORE, JSON.stringify(theme)); } catch { /* private mode: just don't remember */ }
}

// ---------- the controls in the top bar ----------
const MIATA = `
<svg class="miata" viewBox="0 0 120 50" aria-hidden="true">
  <path class="glass" d="M36 1 H84 L92 15 H28 Z"/>
  <circle class="glow" cx="31" cy="13" r="10"/><circle class="glow" cx="89" cy="13" r="10"/>
  <g class="pod"><rect x="19" y="7" width="24" height="13"/><circle class="lamp" cx="31" cy="13" r="4"/></g>
  <g class="pod"><rect x="77" y="7" width="24" height="13"/><circle class="lamp" cx="89" cy="13" r="4"/></g>
  <path class="body" d="M7 24 Q9 18 24 18 H96 Q111 18 113 24 L117 40 H3 Z"/>
  <ellipse class="mouth" cx="60" cy="32" rx="13" ry="3"/>
  <rect class="signal" x="12" y="28" width="10" height="3"/><rect class="signal" x="98" y="28" width="10" height="3"/>
  <rect class="tyre" x="11" y="40" width="17" height="7"/><rect class="tyre" x="92" y="40" width="17" height="7"/>
</svg>`;

export function renderThemeControls(el) {
  const theme = readTheme();
  const current = () => PAINTS.find(p => p.id === theme.paint) ?? PAINTS[0];

  el.innerHTML = `
    <div class="paint">
      <button type="button" class="paint-button" aria-haspopup="true" aria-expanded="false">
        <span class="swatch" style="background:${current().hex}"></span><span class="paint-name">${current().name}</span>
      </button>
      <div class="paint-menu" hidden role="menu" aria-label="Choose a paint colour">
        ${PAINTS.map(p => `
          <button type="button" role="menuitemradio" aria-checked="${p.id === theme.paint}" data-paint="${p.id}">
            <span class="swatch" style="background:${p.hex}"></span>
            <span><strong>${p.name}</strong><small>${p.brand}</small></span>
          </button>`).join('')}
      </div>
    </div>
    <label class="lights">
      ${MIATA}
      <span class="visually-hidden">Night or day</span>
      <input type="range" min="0" max="100" step="1" value="${theme.level < 50 ? 0 : 100}" aria-valuetext="${describe(theme.level)}" />
    </label>`;

  const button = el.querySelector('.paint-button');
  const menu = el.querySelector('.paint-menu');
  const slider = el.querySelector('input[type=range]');

  const update = () => {
    applyTheme(theme);
    saveTheme(theme);
    button.querySelector('.swatch').style.background = current().hex;
    button.querySelector('.paint-name').textContent = current().name;
    menu.querySelectorAll('[data-paint]').forEach(b => b.setAttribute('aria-checked', b.dataset.paint === theme.paint));
    slider.setAttribute('aria-valuetext', describe(theme.level));
  };
  const toggleMenu = open => { menu.hidden = !open; button.setAttribute('aria-expanded', open); };

  button.addEventListener('click', () => toggleMenu(menu.hidden));
  menu.addEventListener('click', e => {
    const b = e.target.closest('[data-paint]');
    if (b) { theme.paint = b.dataset.paint; update(); toggleMenu(false); button.focus(); }
  });
  document.addEventListener('click', e => { if (!el.querySelector('.paint').contains(e.target)) toggleMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { toggleMenu(false); button.focus(); } });
  // drag to switch (it flips at the middle); on release it snaps to Night or Day
  slider.addEventListener('input', () => { theme.level = +slider.value < 50 ? 0 : 100; update(); });
  slider.addEventListener('change', () => { slider.value = theme.level; });
  update();
}

const describe = v => (v < 50 ? 'Night, headlights on' : 'Day');
