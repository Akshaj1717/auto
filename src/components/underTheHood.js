import { esc } from '../lib/html.js';

export function renderUnderTheHood(el, car) {
  const s = car.specs;
  const rows = [
    ['Manufacturer', car.manufacturer],
    ['Head Engineer', car.headEngineer],
    ['Engine', s.engine],
    ['Horsepower', `${s.horsepower} hp`],
    ['Torque', `${s.torque} lb-ft`],
    ['Top Speed', `${s.topSpeed} mph`],
    ['0–60 mph', `${s.zeroToSixty} s`],
    ['Drivetrain', s.drivetrain],
    ['Transmission', s.transmission],
  ];
  el.innerHTML = `
    <h2>Under the Hood: ${esc(car.year)} ${esc(car.name)}</h2>
    <div class="grid">
      ${rows.map(([k, v]) => `<div class="cell"><strong>${esc(k)}</strong><br>${esc(v)}</div>`).join('')}
    </div>`;
}
