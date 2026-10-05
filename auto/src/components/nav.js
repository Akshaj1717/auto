const LINKS = [
  { label: 'News', href: '#news' },
  { label: 'Sports', href: '#sports' },
  { label: 'Letter', href: '#letter' },
  { label: 'Explore', href: '#explore' },
];

export function renderNav(el) {
  el.innerHTML = LINKS.map(l => `<a href="${l.href}">${l.label}</a>`).join('');
}
