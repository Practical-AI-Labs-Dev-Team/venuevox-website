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

## Concierge demo (`/concierge-demo`)

A chat-first party-booking concierge for a fictional eatertainment venue ("Apex Social"),
built to show prospects a live, guardrailed booking agent. `noindex`. Manrope, light + dark.

**Live-on-rails:** the browser calls `/api/concierge` (a Vercel serverless function) which
holds the system prompt **and** the Anthropic key server-side and proxies the Anthropic
Messages API. The key is never shipped to the client; the client can't override the prompt.
The model returns a reply with a trailing `CAPTURE_STATE: {…}` line that drives the live
Booking-Capture panel. All availability/pricing/deposits are mocked — nothing is sent or charged.

**Env vars (set in Vercel → Project → Settings → Environment Variables):**

```
ANTHROPIC_API_KEY     = sk-ant-...        # required for the live chat
CONCIERGE_MODEL       = claude-sonnet-4-6 # optional, default shown
CONCIERGE_ACCESS_CODE = ashish            # optional gate; if set, callers must pass it
AI_PROVIDER           = anthropic         # optional, default; swap providers in lib/aiClient.js
```

Without `ANTHROPIC_API_KEY` the page still loads and the chat degrades to a graceful fallback.
Local live testing needs `vercel dev` (a plain static server can't run the function).

**Access gate.** If `CONCIERGE_ACCESS_CODE` is set, share the link with the code pre-filled —
`venuevox.us/concierge-demo?access=ashish` — so the recipient never sees a prompt. The page
stores the code, strips it from the URL bar, and sends it as the `x-demo-access` header; the
function rejects calls without it (401). Leave the env var unset to disable the gate.

**Rate limiting.** The function applies a best-effort per-IP throttle (20 req/min), but
serverless instances are ephemeral — for real protection enable Vercel WAF rate-limiting / BotID.

**Provider-swappable.** The model call lives in `lib/aiClient.js` behind `generateReply()`.
Add OpenAI or the Vercel AI Gateway there without touching the route or the page.

## Files

```
index.html              — main marketing page
styles.css              — design system + all component styles
script.js               — theme toggle, smooth scroll, demo player
favicon.svg             — VenueVox pathways mark
concierge-demo/         — the /concierge-demo page (index.html, styles.css, app.js)
api/concierge.js        — serverless route: system prompt, access gate, rate limit, sanitization
lib/aiClient.js         — provider-agnostic model client (holds the key; swap providers here)
project/                — original prototype from Claude Design (reference only)
```
