// Entry point: loads data and renders each section of the home page.
import { renderNav } from './components/nav.js';
import { renderNewsSidebar } from './components/newsSidebar.js';
import { renderCarOfTheDay } from './components/carOfTheDay.js';
import { renderHeadlines } from './components/headlines.js';
import { renderUnderTheHood } from './components/underTheHood.js';
import { renderBuilds } from './components/builds.js';
import { pickCarOfTheDay } from './lib/carOfTheDay.js';


import news from './data/news.json';
import cars from './data/cars.json';
import builds from './data/builds.json';
import live from './data/live.json';

// A random car each day, the same for every visitor (changes at midnight New York time)
const car = pickCarOfTheDay(cars);

renderNav(document.getElementById('nav'));
renderNewsSidebar(document.getElementById('news-sidebar'), news);
renderCarOfTheDay(document.getElementById('car-of-the-day'), car);
renderHeadlines(document.getElementById('headlines'), news.filter(n => n.featured).slice(0, 2));
renderUnderTheHood(document.getElementById('under-the-hood'), car);
renderBuilds(document.getElementById('builds'), builds);
renderNewsSidebar(document.getElementById('news-sidebar'), {
  events: live.events,
  news: live.news.length ? live.news : news,   // falls back to your manual news.json
});
