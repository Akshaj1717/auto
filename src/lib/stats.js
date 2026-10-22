// Turns a car's spec rows ([label, value] pairs) into up to four headline numbers
// for the rolling spec counters, e.g. { value: 471, decimals: 0, unit: 'hp', label: 'Horsepower' }.
// Works for hand-written specs (cars.json) and for specs read from Wikipedia.

const num = s => {
  const m = String(s ?? '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
};
const find = (specs, re) => specs.find(([label]) => re.test(label))?.[1];

export function headlineStats(specs = []) {
  const out = [];
  const add = (value, decimals, unit, label) => { if (value != null && isFinite(value) && value > 0) out.push({ value, decimals, unit, label }); };

  // Power → horsepower (converts PS and kW)
  const power = find(specs, /^(horsepower|power)/i);
  if (power) {
    const n = num(power);
    const hp = /kW/.test(power) && !/hp|PS/.test(power) ? n * 1.341 : /PS/.test(power) && !/hp/.test(power) ? n * 0.986 : n;
    add(hp && Math.round(hp), 0, 'hp', 'Horsepower');
  }
  const torque = find(specs, /^torque/i);
  if (torque) add(num(torque), 0, /N·?m/.test(torque) ? 'N·m' : 'lb-ft', 'Torque');
  const top = find(specs, /^top speed/i);
  if (top) add(num(top), 0, /km\/h/.test(top) ? 'km/h' : 'mph', 'Top speed');
  const sprint = find(specs, /^0.?60/i);
  if (sprint) add(num(sprint), 1, 's', '0–60 mph');

  // Fill the remaining spots from whatever else is known
  const engine = find(specs, /^engine/i);
  if (out.length < 4 && engine) add(num((engine.match(/(\d+(?:\.\d+)?)\s?L\b/) || [])[1]), 1, 'L', 'Engine');
  const weight = find(specs, /weight/i);
  if (out.length < 4 && weight) add(num(weight), 0, /lb/.test(weight) && !/kg/.test(weight) ? 'lb' : 'kg', 'Curb weight');
  const production = find(specs, /^(production|model years)/i);
  if (out.length < 4 && production) {
    const y = String(production).match(/\b(18|19|20)\d{2}\b/);
    if (y) add(+y[0], 0, '', 'First built');
  }
  return out.slice(0, 4);
}
