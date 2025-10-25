# Texas Music Atlas

Static directory of Texas songwriter festivals for 2025–2026. The site runs entirely in the browser: it fetches a single JSON dataset, renders searchable cards, and offers an optional calendar view plus detail pages.

## Quick start

```bash
npm install
npm test          # Playwright smoke checks (Chromium + mobile emulation)
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
```

Then open http://127.0.0.1:4173/events/ in your browser.

## Project layout

- `public/events/` – main directory UI and festival detail template  
- `public/assets/css/` – global styling (no build step)  
- `public/assets/js/` – ES modules for data loading, list/calendar logic, and detail rendering  
- `public/data/texas_songwriter_festivals_2025_2026.json` – authoritative dataset (client-side fetched)  
- `tests/` – Playwright specs covering directory interactions and slug detail rendering  
- `public/about/` – project background page

## Contributing

Pull requests welcome. Keep JSON changes valid (`python3 -m json.tool data/texas_songwriter_festivals_2025_2026.json`) and run `npm test` before submitting. The companion guide in `AGENTS.md` documents directory structure, coding style, and deployment expectations.

## Licensing

- Code: Apache License 2.0 (`LICENSE`)  
- Dataset: Creative Commons Attribution 4.0 (`DATA_LICENSE`)
