# PERF-02 · Mobile PageSpeed regression · 2026-11-03

Objective: diagnose report n1193g0kd6, repair startup/render contention, preserve 154 SKUs, feed, analytics and visual identity; publish and verify public PSI.

Baseline runtime: 09fff3853e21c0ae8022d9d0a6fd2d8e3f38e3a9.
Public PSI mobile: 88, LCP 3792 ms, TBT 43 ms, CLS .001. Desktop: 89, LCP 543 ms, TBT 284 ms.
Mobile observed LCP breakdown: TTFB 20 / resource delay 260 / download 210 / render delay 960 ms. LCP first city banner. Forced reflow homepage design-motion getBoundingClientRect loop: 121 ms; Metrika: 96 ms.
Local public lab baseline 3 samples: 95/96/95; LCP 2440/2390/2242 ms. Different environment, not directly comparable with public PSI.

Root cause in public trace: synchronous animation visibility reads force layout of the full SSR catalogue during startup. Removed startup geometry reads in favor of IntersectionObserver geometry. Added responsive AVIF hero preload, sharing exact transformation options/sizes with the picture; all catalogue rendering/navigation remains unchanged.

Local after: mobile 99/99/99, LCP 2118/2044/2041 ms; desktop 100. check/build/SEO/66 Node tests/catalogue six-width QA PASS. Boundary test caught overlapping preload media at exactly 480px due to browser rounding; changed wide media to the exact complement `(width > 480px)`.

Hero responsive/no-JS QA complete: seven widths 320–1280, one matching preload and one city-banner request, seven stable slide heights, keyboard/reduced motion, all 154 products without JS PASS. Phone/tablet/desktop screenshots reviewed.

Implementation published: 6e75d0d916b786386792f0152a717a882dcef069. CI 41604982285 SUCCESS at 09:14:54 UTC.

Control public PSI before deploy (mkojvupbgy, 10:41 GMT+2): mobile 98 / LCP 2251 ms / TBT 6 ms; desktop 68 / TBT 1358 ms. Same old runtime: substantial lab variance, not a controlled score improvement. Own forced reflow still 70 ms. Google trace has one font 503, manual checks of all fonts 200.

Production verification PASS: 7 inline scripts / 1 inline stylesheet / 6 external JS match local build by SHA256; responsive preload markup matches; four fonts HTTP 200; Worker/Pages release compatibility PASS. Hero at seven widths, all seven scenes, keyboard/reduced motion/no-JS PASS; phone/tablet screenshots reviewed. Initial production hero run timed out waiting for one transition; full diagnostic repeat passed all 49 scene selections with no logged request failures/page errors. Cause of that initial timeout was not captured; no claim of a CDN failure.

Public after 11:15:53 and 11:18:08 GMT+2: mobile 99/99, LCP 2101/2101 ms, TBT 50/12 ms, CLS .005/.001; desktop 100/100, LCP 521/521 ms, TBT 0/0. A11y/BP/SEO all 100 on both devices/reports. Original own startup reflow source absent; first report has unattributed 107 ms, second mobile has no failing reflow insight.

Separate cold production Lighthouse 13.5/Chrome 156: mobile 95/94/96, LCP 2480/2109/2390 ms; desktop 96/LCP 679 ms. Own startup reflow absent in all four traces. Best practices 77 caused by Metrika third-party cookie/DevTools issues, also present in the same local baseline; public PSI best practices 100. Analytics left enabled. Distinct labs are reported separately; no guarantee of a fixed score for every future run.

Status: complete. No required implementation or publication work remains for PERF-02. Evidence in README.md, public-psi.json, lab-comparison.json, production-hero/report.json, published-assets.json and ci.json.
