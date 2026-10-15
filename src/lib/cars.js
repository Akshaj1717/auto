// Shared by the website and scripts/fetch-car.mjs (no browser-only code here).

export const TIME_ZONE = 'America/New_York';

// Today's date in New York, e.g. "2026-10-14". The car changes when this changes.
export const todayET = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date);

// Turns a car from cars.json into the same shape the automatic car uses:
// { name, blurb, wiki, image, specs: [[label, value], ...] }
export function normalizeCurated(car) {
  const s = car.specs ?? {};
  const rows = [
    ['Manufacturer', car.manufacturer],
    ['Head Engineer', car.headEngineer],
    ['Engine', s.engine],
    ['Horsepower', s.horsepower && `${s.horsepower} hp`],
    ['Torque', s.torque && `${s.torque} lb-ft`],
    ['Top Speed', s.topSpeed && `${s.topSpeed} mph`],
    ['0–60 mph', s.zeroToSixty && `${s.zeroToSixty} s`],
    ['Drivetrain', s.drivetrain],
    ['Transmission', s.transmission],
  ];
  return {
    name: [car.year, car.name].filter(Boolean).join(' '),
    blurb: car.blurb ?? '',
    wiki: car.wiki,
    image: car.image,
    specs: rows.filter(([, v]) => v),
  };
}
