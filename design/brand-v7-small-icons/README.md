# Small pie / sun mark

Requested on 2026-10-31: use a simple round pie, like a little sun, for every small brand icon.

`pie-sun.svg` is the canonical vector source: a golden fluted crust, a lighter filling and five large pastry vents. No text, raster image, filters or external resources. The transparent silhouette stays visible against both light and dark browser chrome.

Regenerate with:

```sh
node design/brand-v7-small-icons/export-icons.mjs
```

Outputs: SVG favicon, ICO with 16/32/48 px frames, PNG favicons at the same sizes, 512 px brand symbol (PNG + SVG), and an opaque 180 px Apple touch icon. `SeoHead.astro` uses version `20261031-7` to refresh browser caches. The v6 wordmark exporter delegates small icons here, so regenerating the full brand cannot restore the old favicon.

Visual proof: `qa/small-icons-20261031/size-proof.png`. Each row shows the actual sizes and 2× nearest-neighbour enlargements on white and dark navy.
