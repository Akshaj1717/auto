export function renderHeadlines(el, items) {
  el.innerHTML = items.map(n => `
    <article class="box">
      <span class="label">Headline</span>
      <h3><a href="${n.url}">${n.title}</a></h3>
      <p>${n.summary}</p>
    </article>`).join('');
}
