export function renderCarOfTheDay(el, car) {
  el.innerHTML = `
    <a class="box cotd" href="#under-the-hood">
      <span class="label">Car of the Day</span>
      <img src="${car.image}" alt="Artwork of the ${car.name}" />
      <strong>${car.name}</strong>
      <span>Click to learn more →</span>
    </a>`;
}
