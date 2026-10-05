export function renderBuilds(el, builds) {
  el.innerHTML = `
    <h2>Builds</h2>
    <div class="grid">
      ${builds.map(b => `
        <article class="cell">
          <img src="${b.image}" alt="${b.car} build by ${b.builder}" />
          <h3>${b.car}</h3>
          <p><em>by ${b.builder}</em></p>
          <p>${b.description}</p>
        </article>`).join('')}
    </div>`;
}
