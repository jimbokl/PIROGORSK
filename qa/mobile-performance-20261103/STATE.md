# PERF-02 · Mobile PageSpeed regression · 2026-11-03

Objective: diagnose report n1193g0kd6, repair startup/render contention, preserve 154 SKUs, feed, analytics and visual identity; publish and verify public PSI.

Baseline runtime: 09fff3853e21c0ae8022d9d0a6fd2d8e3f38e3a9.
Public PSI mobile: 88, LCP 3792 ms, TBT 43 ms, CLS .001. Desktop: 89, LCP 543 ms, TBT 284 ms.
Mobile observed LCP breakdown: TTFB 20 / resource delay 260 / download 210 / render delay 960 ms. LCP first city banner. Forced reflow homepage design-motion getBoundingClientRect loop: 121 ms; Metrika: 96 ms.
Local public lab baseline 3 samples: 95/96/95; LCP 2440/2390/2242 ms. Different environment, not directly comparable with public PSI.

Root cause in public trace: synchronous animation visibility reads force layout of the full SSR catalogue during startup. Removed startup geometry reads in favor of IntersectionObserver geometry. Added responsive AVIF hero preload, sharing exact transformation options/sizes with the picture; all catalogue rendering/navigation remains unchanged.

Local after: mobile 99/99/99, LCP 2118/2044/2041 ms; desktop 100. check/build/SEO/66 Node tests/catalogue six-width QA PASS. Boundary test caught overlapping preload media at exactly 480px due to browser rounding; changed wide media to the exact complement `(width > 480px)`.

Remaining: final hero responsive/no-JS QA and visual review; deploy, CI, public PSI mobile+desktop; final proof.
