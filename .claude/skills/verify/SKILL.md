---
name: verify
description: Drive the storefront in a headless browser to verify UI changes end-to-end (screenshots + interaction probes).
---

# Verify storefront changes

The dev server usually already runs on http://localhost:3000 (`npm run dev` here if not — check with `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/shop`).

No Playwright package is installed in this repo, but Playwright's Chromium IS cached on this machine:

- Browser: `c:/Users/bdcalling/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe`
- In a scratch dir: `npm i playwright-core@1.57.0`, then `chromium.launch({ executablePath: <path above>, headless: true })`.

## Flows worth driving

- `/shop?sale=1` — desktop 1440×950: filter rail (accordion sections all open), toggle "In stock only" → URL gains `instock=1`, chip appears (`getByRole("button", { name: /Remove filter/ })`), grid dims (`[aria-busy="true"]`) instead of skeleton-flashing.
- Price inputs: fill + press Enter applies (form submit); reversed min/max auto-swaps.
- Sticky rail: only has room to stick when the grid is TALL (unfiltered). `scrollTo(0, 300)` → `aside` boundingBox top ≈ 144. Short filtered grids legitimately pin to container end (negative top) — not a bug.
- Mobile 390×844: "Filters" button → bottom sheet (role dialog); toggling a filter updates the footer CTA to a live count ("Show N results"); Reset appears; CTA closes sheet.
- `/search?q=shirt` — same rail; rating buttons are `getByRole("button", { name: "4 stars and up" })`.
- Cart flow (guest): open a PDP (e.g. `/product/soundmax-studio-monitor-silver`), click the visible "Add to cart" (`getByRole("button", { name: /add to cart/i }).locator("visible=true").first()`) → side drawer opens as confirmation and `localStorage["gcl.cart.session"]` is minted; Escape closes it. Wait ~1.5s after the click — the add occasionally hasn't landed server-side yet and the next navigation shows an empty cart (flaky, not a bug). Mobile 390×844: bottom-nav Cart tab is a `Link` to `/cart` (no drawer); the tab bar publishes its height as `--bottom-nav-h` on `<html>` (empty on PDPs where the bar unmounts), and the cart page's mobile checkout bar is the `div.sticky` containing "Checkout". API is at `localhost:4000/v1/*`.

## Gotchas

- Headless Chromium paints overlay scrollbars and hides them from screenshots — you cannot visually verify scrollbar styling there. Instead assert the compiled rules exist via `document.styleSheets` (grep rule cssText for `::-webkit-scrollbar`), and check layout side effects (e.g. `getComputedStyle(el).scrollbarGutter`).

- Facets load async; give pages ~800ms after `networkidle` before asserting.
- `sale=1` counts as an active Availability filter (badge "1" on the section header is correct).
- Verify per app with `npx tsc --noEmit` and `npx eslint <files>` (fast), but the real evidence is the driven browser.
