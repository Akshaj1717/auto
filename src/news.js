import { renderNav } from './components/nav.js';
import { renderNewsSidebar } from './components/newsSidebar.js';
import { renderNewsHeadlines } from './components/newsHeadlines.js';
import live from './data/live.json';

renderNav(document.getElementById('nav'));
renderNewsSidebar(document.getElementById('news-sidebar'), live.events);
renderNewsHeadlines(document.getElementById('news-headlines'), live.articles, live.updated);
