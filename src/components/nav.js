const LINKS = [
  { label: 'News', href: './news.html' },
  { label: 'Sports', href: './sports.html' },
  { label: 'Letter', href: './#letter' },
  { label: 'Explore', href: './explore.html' },
  { label: 'Game', href: './game.html' },
];

export function renderNav(el) {
  el.innerHTML = LINKS.map(l => `<a href="${l.href}">${l.label}</a>`).join('');
}
