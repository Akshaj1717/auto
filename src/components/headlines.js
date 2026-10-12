export function renderHeadlines(el, items) {
  el.innerHTML = items.map(n => `
    <article class="box">
      ${n.image ? `<img src="${n.image}" alt="" loading="lazy" />` : ''}
      <span class="label">${n.source}</span>
      <h3><a href="${n.url}" target="_blank" rel="noopener">${n.title}</a></h3>
      <p>${n.summary}</p>
    </article>`).join('');
}
