# Browser QA assumptions for the shorter homepage

## Catalog ownership

The prior browser fixture asserted 78 Holland Bakery and 61 pirogi39 cards on `/`, and exercised supplier filters there. With the new homepage containing four sample ProductCards, those assumptions move to `/menu/`. `#catalog-data` must continue to serialize all 153 entries on the homepage because the selection dialog and intent flow use it.

The homepage smoke assertion should expect four interactive product cards, no `[data-supplier-catalog]` and no `.extras-section`; legacy `#holland`, `#pirogi39`, `#extras` anchors remain as links to the complete menu. The menu must still expose all 78/61 supplier cards, Holland pagination/search/filtering, and the six dough positions.

## Deep links and return path

Confirmed by root: `/menu/?group=mini-pies#holland` and the Holland groups `bread`, `desserts`, `bake`, `dough`; fresh supplier group names continue to use their existing `data-supplier-filter` values and `#pirogi39`. A valid group is applied on initial page load only to the matching section. Invalid groups remain on `all`.

A department link on the homepage should carry its group to `/menu/`. A supplier product link in the menu should carry `interest` and selected `variant` to `/`, where the same item/format appears in the open selection dialog. The browser fixture verifies persistence through the resulting selection and an actual mixed home selection (one mini pie + one first-party pie) through the Worker/SQLite fixture.

## Other checks retained

Calculator transfer, malformed transfer rejection, delivery/pickup totals, submission idempotency, fresh 2kg selection, viewport overflow, and no failed external resources remain part of the existing fixture.

## Homepage slider and sample products

The browser fixture also checks the three hero scenes, next/previous controls, keyboard ArrowRight, slide CTA target, the four sample product cards, and that the embedded selection catalogue still contains 153 entries. It uses only the existing headless QA harness.

`node --check worker/scripts/qa-site.mjs` passes. Root runs the complete fixture after the current build is available.

## Independent source review

- The homepage skip link targets the existing `#pirogi` first-party product section.
- `storefront.ts` resolves supplier items from the full embedded `#catalog-data`, so a variant can be selected even when its product has no homepage card. Adding an already-selected `(product, variant)` from a repeated deep link is idempotent.
- Menu group query handling follows the agreed contract: a known group is applied only when its hash identifies the matching catalog root; invalid groups fall back to `all`.
- FAQ schema is generated from the FAQ content rendered on the page; canonical URLs omit query strings and fragments.
- Browser harness was not run during this review because the shared build was still waiting on the slider TypeScript fix. The current QA script has stale assertions that homepage IDs `#holland` and `#pirogi39` are absent. Both IDs are now present on homepage navigation links to `/menu/`; check for absence of catalog cards instead. Root was notified to fix these assertions before running the fixture.
