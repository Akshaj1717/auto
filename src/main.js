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

// Big headlines: two feed stories with photos that change every 12 hours (scripts/fetch-feeds.mjs).
// The sample news.json is only used if the feeds haven't been fetched yet (run `npm run fetch`).
const fromFeeds = live.featured?.length ? live.featured : (live.articles ?? []).filter(a => a.image).slice(0, 2);
const featured = fromFeeds.length ? fromFeeds : news.filter(n => n.featured).slice(0, 2);

renderNav(document.getElementById('nav'));
renderNewsSidebar(document.getElementById('news-sidebar'), live.events);
renderCarOfTheDay(document.getElementById('car-of-the-day'), car);
renderHeadlines(document.getElementById('headlines'), featured);
renderUnderTheHood(document.getElementById('under-the-hood'), car);
renderBuilds(document.getElementById('builds'), builds);
