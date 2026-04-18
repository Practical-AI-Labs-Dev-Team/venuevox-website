# VenueVox Website

Static marketing site for [venuevox.us](https://venuevox.us) — the front-end revenue layer for entertainment venues.

## Stack

- **HTML/CSS/JS** — No framework. Static site.
- **Fonts** — Inter Tight, Inter, IBM Plex Sans, IBM Plex Mono (Google Fonts)
- **Calendar** — Cal.com inline embed
- **Theme** — Dark (default) + Light mode with localStorage persistence

## Development

Open `index.html` in a browser, or serve locally:

```bash
npx serve .
```

## Deploy

Deploy to any static host (Vercel, Netlify, Cloudflare Pages, etc.) pointing at the root directory.

## Files

```
index.html      — main page
styles.css      — design system + all component styles
script.js       — theme toggle, smooth scroll, demo player
favicon.svg     — VenueVox pathways mark
project/        — original prototype from Claude Design (reference only)
```
