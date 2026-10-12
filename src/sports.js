import { renderNav } from './components/nav.js';
import { renderNewsSidebar } from './components/newsSidebar.js';
import { renderSportsHeadlines } from './components/sportsHeadlines.js';
import live from './data/live.json';
import news from './data/news.json';

renderNav(document.getElementById('nav'));
renderNewsSidebar(document.getElementById('news-sidebar'), {
  events: live.events,
  news: live.news.length ? live.news : news,
});
renderSportsHeadlines(document.getElementById('sports-headlines'), live.sports, live.updated);
