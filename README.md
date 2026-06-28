# EONET Globe

**Live:** [eonet-globe.netlify.app](https://eonet-globe.netlify.app)

An interactive 3D globe (and flat map) visualizing NASA's [Earth Observatory Natural Event Tracker (EONET)](https://eonet.gsfc.nasa.gov/) — live natural events such as wildfires, storms, volcanoes, and sea/lake ice changes rendered in real time on a WebGL map.

## Features

- **Live event data** — fetches open natural events from the EONET v3 API
- **Persistent cache** — events are saved to `localStorage` so the map loads instantly on revisit while refreshing in the background
- **Globe / flat map toggle** — switch between a 3D globe projection and a standard Mercator map
- **Category filters** — toggle individual event categories on/off via the filter panel
- **Wildfire clustering** — wildfire events are grouped into interactive cluster circles that expand on click; all other events render as individual icons
- **Event popups** — click any marker or cluster to see the event title and a link to its source; click anywhere else to dismiss
- **Icon credits** — attributions panel accessible from the bottom-right corner, closable by clicking outside it

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) |
| Language | TypeScript |
| Build tool | [Vite](https://vitejs.dev/) |
| Map engine | [MapLibre GL JS](https://maplibre.org/) |
| Map style | [OpenFreeMap](https://openfreemap.org/) Liberty style |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Data source | [NASA EONET API v3](https://eonet.gsfc.nasa.gov/docs/v3) |

## Project structure

```
src/
├── api/
│   └── eonet.ts          # EONET API client (fetchEvents, fetchCategories)
├── composables/
│   ├── useEonetEvents.ts  # Event state, localStorage cache, category filtering
│   └── useMapLibre.ts     # Map instance lifecycle, mapReady signal
├── types/
│   └── eonet.ts           # EonetEvent, EonetGeometry TypeScript types
├── utils/
│   └── geojson.ts         # Converts EONET events to GeoJSON FeatureCollections
└── components/
    └── GlobeMap.vue       # Main component: map layers, popups, UI controls
```

## Getting started

### Prerequisites

- Node.js 18+
- npm (or pnpm / yarn)

### Install

```bash
npm install
```

### Development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production build

```bash
npm run build
```

Output is written to `dist/`. Serve with any static file host or preview locally:

```bash
npm run preview
```

## Data notes

Event data is sourced from **NASA EONET v3** (`status=open`, `limit=1000`). EONET aggregates reports primarily from US agencies (USFS, USGS, NWS), which means wildfire coverage skews heavily toward North America. This is a limitation of the upstream data source.

Cached data is stored under the `eonet-cache` key in `localStorage`. Clear it via the browser DevTools Application tab if you need to force a fresh fetch.

## License

This project is for personal / educational use. NASA EONET data is public domain.
