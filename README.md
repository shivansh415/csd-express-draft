# CSD Supply Chain website

Single-page marketing site for CSD Supply Chain (Next.js 16, App Router, static export of `/`).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Deploy

Vercel builds `main` automatically. Set `NEXT_PUBLIC_SITE_URL` to the final domain (for example
`https://www.csdsupplychain.com`) so canonical URLs, the sitemap and social previews point at it;
it falls back to `https://csd-express-draft.vercel.app`.

## What is real and what is placeholder

- **Tracking**: no tracking API yet. Only the sample LR `CSD-BLR-26-04719` replays a journey; any other
  number shows a WhatsApp/phone hand-off (`components/hero/ContainerTracker.tsx`).
- **Book a pickup**: opens WhatsApp to +91 93530 32343 with the request pre-filled; nothing is stored.
- **Routes**: seven two-way routes. Only Hyderabad and Vijayawada have departure/arrival times and lane desks
  (`components/network/geo.ts`).
- **Partner logos**: cut from the company portfolio collage (raster); replace with official files in `public/partners`.

## Map data

`public/map/*` is baked from open elevation data (Mapzen Terrain Tiles on AWS Open Data):

```bash
python3 scripts/fetch-tiles.py /tmp/tiles     # downloads ~30 MB of tiles
python3 scripts/bake-map.py /tmp/tiles public/map   # takes several minutes
```

## Security and performance notes

- Security headers (CSP, HSTS, frame, referrer, permissions) are set in `next.config.mjs`. `script-src` allows
  `'unsafe-inline'` because the App Router injects inline bootstrap scripts; moving to nonces would make the page dynamic.
- The 3D map (three.js + ~2.3 MB of textures) only loads once a visitor scrolls near it.
- The intro animation plays once per browser session.
