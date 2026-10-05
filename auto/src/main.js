// Entry point: loads data and renders each section of the home page.
import { renderNav } from './components/nav.js';
import { renderNewsSidebar } from './components/newsSidebar.js';
import { renderCarOfTheDay } from './components/carOfTheDay.js';
import { renderHeadlines } from './components/headlines.js';
import { renderUnderTheHood } from './components/underTheHood.js';
import { renderBuilds } from './components/builds.js';

import news from './data/news.json';
import cars from './data/cars.json';
import builds from './data/builds.json';

// Pick today's car: rotates through the list one per day.
function getCarOfTheDay(list) {
  const day = Math.floor(Date.now() / 86_400_000);
  return list[day % list.length];
}

const car = getCarOfTheDay(cars);

renderNav(document.getElementById('nav'));
renderNewsSidebar(document.getElementById('news-sidebar'), news);
renderCarOfTheDay(document.getElementById('car-of-the-day'), car);
renderHeadlines(document.getElementById('headlines'), news.filter(n => n.featured).slice(0, 2));
renderUnderTheHood(document.getElementById('under-the-hood'), car);
renderBuilds(document.getElementById('builds'), builds);
