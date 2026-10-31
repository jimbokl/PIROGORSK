# Domino’s adaptation sprint · 2026-10-31

DOM-01–04 implemented: shared editable selection on home and internal pages; persistent goods subtotal dock; six filling filters across all 153 SKUs; URL/back/reset/empty states; allowlisted source/surface analytics without search text. Delivery remains separate and is charged once. Existing identity and anonymous interest API contract are preserved.

## Decisions

- One catalog/state/selection dialog for cards, bundles, add-ons and planner. Storage events, focus/pageshow sync, corruption recovery and memory fallback preserve a working current visit.
- Mixed fillings have multiple tags. Tags use known ingredient descriptions, with explicit corrections for chicken liver, tuna quiche, pork kurnik, cheeseburger and cherry/poppy. Untagged bread, chocolate/nut/cream pastry and accessories remain searchable through All. Mapping: `fillings.json`.
- All products remain in server HTML. Progressive batches only affect enhanced display. Query uses replaceState; explicit filling changes use pushState; Back restores filters/groups. Analytics receives only closed enums, result count and search-used boolean.
- Anonymous intent success still requires saved:true and matching requestId; lost-ack retries reuse the same ID. QA mode suppresses production goals. No production application submissions are required for QA.

## Local acceptance

- Astro check: 0 errors, 0 warnings; build: 247 HTML pages.
- 45 Node tests; Worker/API tests; actual built browser + Worker/in-memory SQLite fixture PASS.
- Seven SEO/content/product validators PASS: 153 product routes, 242 sitemap URLs, 53 articles; all local links and artwork validated.
- Full browser fixture PASS at 320/390/1280: bundles/add-ons/variants/quantities/totals, form handoff, planner, two-tab synchronization, filtering every filling across all 153 SKUs, search beyond initial batch, reset/empty/history, internal-page dialog, focus/city handoff, storage errors and deduplication.
- 65 responsive views (13 templates × 320/390/768/1024/1280), no overflow or browser/HTTP errors; no-JS full 153 catalog and reduced motion PASS.
- Shared registry strict PASS; drift=false. Existing global registry warnings are unrelated.
- Before-deploy production Lighthouse: three mobile runs, simulated LCP 1.81–2.06 s (median 1.90 s); desktop 0.64 s. Raw evidence in `performance-before/`.

## Publication

Pending CI deployment and independent production verification. This section will be updated with runtime, CI, responsive/function checks and performance after deployment.

## Next queue

DOM-05 editable bundles, DOM-06 saved favorite compositions, DOM-07 contextual portions, DOM-08 shareable composition, DOM-09 verified product details. Real checkout/status/reorder depend on the actual selling operation. CRM remains postponed by user instruction.
