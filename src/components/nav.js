const LINKS = [
  { label: 'News', href: './news.html' },
  { label: 'Sports', href: './sports.html' },
  { label: 'News', href: './#news' },
  { label: 'Sports', href: './sports.html' },
  { label: 'Letter', href: './#letter' },
  { label: 'Explore', href: './#explore' },
];

export function renderNav(el) {
  el.innerHTML = LINKS.map(l => `<a href="${l.href}">${l.label}</a>`).join('');
}
