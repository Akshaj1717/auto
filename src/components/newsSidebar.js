const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https?:\/\//.test(u) || u === '#') ? u : '#';
const when = iso => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function renderNewsSidebar(el, { events = [], news = [] }) {
  const upcoming = events.filter(e => new Date(e.end) > new Date()).slice(0, 5);
  el.innerHTML = `
    <h2 class="label">Motorsport News</h2>
    <ul>
      ${news.map(n => `<li><a href="${n.url}">${n.title}</a><small>${n.date}</small></li>`).join('')}
    </ul>`;
}
