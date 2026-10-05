# Auto

A car enthusiast site featuring motorsport news, a daily featured car, technical deep dives, and community builds. Built with plain JavaScript and [Vite](https://vitejs.dev).

## Getting started

```bash
npm install
npm run dev      # live-reloading dev server at http://localhost:5173
npm run build    # production build into dist/
```

## File structure

```
auto/
├── index.html              # page skeleton (empty sections filled by JS)
├── package.json
├── public/
│   └── images/
│       ├── cars/           # Car of the Day artwork
│       └── builds/         # community build photos
└── src/
    ├── main.js             # entry point: loads data, renders sections
    ├── components/         # one file per page section
    │   ├── nav.js
    │   ├── newsSidebar.js
    │   ├── carOfTheDay.js
    │   ├── headlines.js
    │   ├── underTheHood.js
    │   └── builds.js
    ├── data/               # all site content lives here
    │   ├── news.json       # headlines ("featured": true → top 2 headlines)
    │   ├── cars.json       # Car of the Day pool + specs
    │   └── builds.json     # community builds
    └── styles/
        └── main.css
```

## Updating content

- **News:** add an entry to `src/data/news.json`. Set `"featured": true` to show it in the two headlines under Car of the Day.
- **Car of the Day:** add a car to `src/data/cars.json` and its artwork to `public/images/cars/`. The site rotates through the list one car per day.
- **Builds:** add an entry to `src/data/builds.json` and a photo to `public/images/builds/`.

Images must be original artwork or AI-generated, with no copyrighted photos.

## Layout

```
+-----------+---------------------------------------------------+
|   LOGO    |  [ News ] [ Sports ] [ Letter ] [ Explore ]       |
+-----------+---------------------------------------------------+
| Motorsport|  [   CAR OF THE DAY (car artwork, clickable)     ]  |
| News      +---------------------------------------------------+
|           |  [ News headline 1 ]   [ News headline 2 ]        |
|           +---------------------------------------------------+
| - item    |  UNDER THE HOOD (specs of today's car)            |
| - item    +---------------------------------------------------+
| - item    |  BUILDS  [card] [card] [card]                     |
+-----------+---------------------------------------------------+
```

## Roadmap

1. Static site with placeholder content ← **current**
2. Content in data files ✅ (started)
3. Backend + database (Supabase or Firebase) for live updates
4. User features: newsletter sign-up, user-submitted builds, comments
5. Polish: search in Explore, SEO, analytics, custom domain
