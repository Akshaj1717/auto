import { renderNav } from './components/nav.js';
import { renderNewsSidebar } from './components/newsSidebar.js';
import { renderStandings } from './components/standings.js';
import live from './data/live.json';
import standings from './data/standings.json';

renderNav(document.getElementById('nav'));
renderNewsSidebar(document.getElementById('news-sidebar'), live.events);
renderStandings(document.getElementById('standings'), standings);
