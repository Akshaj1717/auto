// Entry point: loads data and renders each section of the home page.
import { renderNav } from './components/nav.js';
import { renderNewsSidebar } from './components/newsSidebar.js';
import { renderCarOfTheDay } from './components/carOfTheDay.js';
import { renderHeadlines } from './components/headlines.js';
import { renderUnderTheHood } from './components/underTheHood.js';
import { renderBuilds } from './components/builds.js';
import { pickCarOfTheDay } from './lib/carOfTheDay.js';
import { todayET, normalizeCurated } from './lib/cars.js';

import news from './data/news.json';
import cars from './data/cars.json';
import builds from './data/builds.json';
import live from './data/live.json';
import autoCar from './data/car-of-the-day.json';

// Car of the Day: the automatic pick from Wikipedia (scripts/fetch-car.mjs).
// If it's missing or from an earlier day, use a random car from cars.json instead.
const car = autoCar.date === todayET() ? autoCar : normalizeCurated(pickCarOfTheDay(cars));

// Big headlines: the two newest feed stories with photos (scripts/fetch-feeds.mjs)
const featured = live.featured?.length ? live.featured : news.filter(n => n.featured).slice(0, 2);

renderNav(document.getElementById('nav'));
renderNewsSidebar(document.getElementById('news-sidebar'), {
  events: live.events,
  news: live.news.length ? live.news : news,   // falls back to your manual news.json
});
renderCarOfTheDay(document.getElementById('car-of-the-day'), car);
renderHeadlines(document.getElementById('headlines'), featured);
renderUnderTheHood(document.getElementById('under-the-hood'), car);
renderBuilds(document.getElementById('builds'), builds);
