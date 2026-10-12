import Parser from 'rss-parser';
import { writeFile } from 'node:fs/promises';

// Add more feeds here
const FEEDS = [
  { name: 'Autosport', url: 'https://www.autosport.com/rss/feed/all' },
];

const parser = new Parser({
  customFields: { item: [['media:content', 'media'], ['media:thumbnail', 'thumb']] },
});

// Feeds put images in different tags; check the common ones
function findImage(item) {
  return item.enclosure?.url || item.media?.$?.url || item.thumb?.$?.url || null;
}

const articles = [];
for (const feed of FEEDS) {
  try {
    const data = await parser.parseURL(feed.url);
    for (const item of data.items.slice(0, 15)) {
      articles.push({
        title: item.title,
        summary: (item.contentSnippet || '').slice(0, 160),
        url: item.link,
        image: findImage(item),
        source: feed.name,
        date: item.isoDate,
      });
    }
  } catch (err) {
    console.warn(`Skipped ${feed.name}: ${err.message}`);
  }
}

// If every feed failed, keep the existing news.json
if (articles.length === 0) process.exit(0);

articles.sort((a, b) => new Date(b.date) - new Date(a.date));

// The two newest stories with images become the featured headlines
let featuredCount = 0;
const news = articles.slice(0, 20).map((a, i) => {
  const featured = Boolean(a.image) && featuredCount < 2;
  if (featured) featuredCount++;
  return { id: i + 1, ...a, featured };
});

await writeFile('src/data/news.json', JSON.stringify(news, null, 2));
console.log(`Saved ${news.length} articles`);