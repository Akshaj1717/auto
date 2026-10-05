export function renderNewsSidebar(el, news) {
  el.innerHTML = `
    <h2 class="label">Motorsport News</h2>
    <ul>
      ${news.map(n => `<li><a href="${n.url}">${n.title}</a><small>${n.date}</small></li>`).join('')}
    </ul>`;
}
