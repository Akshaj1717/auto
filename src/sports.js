import { renderNav } from './components/nav.js';
import { renderNewsSidebar } from './components/newsSidebar.js';
import live from './data/live.json';

renderNav(document.getElementById('nav'));
renderNewsSidebar(document.getElementById('news-sidebar'), live.events);
