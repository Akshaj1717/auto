// Rolling spec numbers: while you scroll through this section it stays pinned on screen and
// each number rolls up like an odometer, settling on the car's real value.
import { esc } from '../lib/html.js';
import { headlineStats } from '../lib/stats.js';

const reel = () => `<span class="reel"><span>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<span>${d}</span>`).join('')}</span></span>`;
const format = (v, decimals) => v.toFixed(decimals);

export function renderSpecStats(el, car) {
  const stats = headlineStats(car.specs);
  if (!stats.length) { el.hidden = true; return; }

  el.innerHTML = `
    <div class="stats-pin">
      <h2 class="stats-title">${esc(car.name)} in numbers</h2>
      <ul class="stats">
        ${stats.map(s => {
          const text = format(s.value, s.decimals);
          return `
          <li class="stat" aria-label="${esc(s.label)}: ${esc(text)} ${esc(s.unit)}">
            <span class="stat-number" aria-hidden="true">${[...text].map(ch => (ch === '.' ? '<span class="dot">.</span>' : reel())).join('')}</span>
            <span class="stat-unit" aria-hidden="true">${esc(s.unit)}</span>
            <span class="stat-label" aria-hidden="true">${esc(s.label)}</span>
            <span class="stat-bar" aria-hidden="true"><span></span></span>
          </li>`;
        }).join('')}
      </ul>
    </div>`;

  const items = [...el.querySelectorAll('.stat')].map((li, i) => ({
    stat: stats[i],
    digits: [...li.querySelectorAll('.reel > span')],
    bar: li.querySelector('.stat-bar > span'),
  }));

  const ease = t => 1 - (1 - t) ** 3;
  const clamp = t => Math.min(1, Math.max(0, t));

  // Show the number for progress p (0 → 1), like a real odometer: the last digit spins
  // smoothly, and each higher digit only turns over while the digits below it roll past 9.
  // At p = 1 every digit lands exactly on the final value.
  const draw = (item, p) => {
    const { value, decimals } = item.stat;
    const scale = 10 ** decimals;
    const current = Math.round(value * scale) * ease(p); // e.g. 3.8 s → 38 tenths
    const places = item.digits.length;
    item.digits.forEach((strip, i) => {
      const power = places - 1 - i;
      const unit = 10 ** power;
      const below = current % unit;                       // what the lower digits show
      const turning = power === 0 ? 0 : Math.max(0, below - (unit - 1)); // 0 → 1 while they roll 9 → 0
      const pos = power === 0 ? current % 10 : (Math.floor(current / unit) % 10) + turning;
      strip.style.transform = `translateY(${-pos / 11 * 100}%)`;
    });
    item.bar.style.transform = `scaleX(${ease(p)})`;
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { el.classList.add('is-static'); items.forEach(it => draw(it, 1)); return; }

  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = el.getBoundingClientRect();
    const travel = el.offsetHeight - innerHeight;              // how far the pinned part scrolls
    const p = clamp(-rect.top / Math.max(1, travel * 0.8));    // finish a bit before the end
    items.forEach((it, i) => draw(it, clamp((p - i * 0.08) / 0.6)));  // slight stagger; all settle by ~70% of the section
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}
