export function renderUnderTheHood(el, car) {
  const s = car.specs;
  const rows = [
    ['Manufacturer', car.manufacturer],
    ['Head Engineer', car.headEngineer],
    ['Engine', s.engine],
    ['Horsepower / Torque', `${s.horsepower} hp / ${s.torque} lb-ft`],
    ['Top Speed', `${s.topSpeed} mph`],
    ['0–60', `${s.zeroToSixty} s`],
  ];
  el.innerHTML = `
    <h2>Under the Hood: ${car.name}</h2>
    <div class="grid">
      ${rows.map(([k, v]) => `<div class="cell"><strong>${k}</strong><br>${v}</div>`).join('')}
    </div>`;
}
