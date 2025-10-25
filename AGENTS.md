# Repository Guidelines

## Project Structure & Module Organization
Keep the repo lean and static. Place shared styles in `assets/css`, plain ES modules in `assets/js`, and any imagery in `assets/images`. Event data lives in `data/texas_songwriter_festivals_2025_2026.json`; reference it through small data helpers rather than duplicating fields. Landing, list, and detail views should live under the root `index.html` and `events/` directory as outlined in `Planning.md`, with reusable templates instead of one-off pages.

## Build, Test, and Development Commands
Run `python3 -m http.server 4000` from the repo root to preview the static site locally. Use `python3 -m json.tool data/texas_songwriter_festivals_2025_2026.json` before commits to ensure the data file stays valid and consistently formatted. When adding lightweight tooling, prefer zero-install commands (for example, `npx serve` or `npx html-validate`) so contributors are not forced into a full build pipeline.

## Coding Style & Naming Conventions
Favor semantic HTML, modern CSS features, and vanilla JS with ES modules. Indent HTML, CSS, and JS with two spaces; format JSON with two-space indentation as well. Use kebab-case for file names (`events/list-page.js`) and camelCase for JS identifiers. Derive event slugs with lowercase kebab-case (e.g., `dripping-springs-songwriters-festival`) to keep URLs predictable. If Tailwind is introduced, keep utility classes readable and documented in component comments.

## Testing Guidelines
This project is currently manual-test heavy. Verify every change by loading the site locally, exercising search, filters, and detail routing in both desktop and mobile breakpoints. Validate the JSON structure against the contracts in `Planning.md`, and add Playwright or Lighthouse scripts only when the interaction surface expands. Name any future test files alongside their page/module (`events/list-page.test.js`) to keep intent obvious.

## Commit & Pull Request Guidelines
There is no established history yet, so adopt Conventional Commits (`feat: add year filter`) to document intent clearly. Scope commits to a single concern, including regenerated JSON or assets in the same change. PRs should restate the user impact, note any content updates, and include before/after screenshots when altering layout or styling. Link to the relevant section of `Planning.md` whenever you diverge from or refine the documented architecture.

## Data & Content Updates
Treat `data/texas_songwriter_festivals_2025_2026.json` as the source of truth. Keep `generated_at`, `timezone`, and `scope` accurate, and ensure each festival’s slug logic still matches the detail view expectations. When adding new fields, document them in both the JSON file header (as comments in a companion README block) and `Planning.md` so the rendering code stays synchronized.
