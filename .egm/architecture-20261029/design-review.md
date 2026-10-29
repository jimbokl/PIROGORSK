# Design / Structural / Style review

- Status: completed (scoped review)
- Target: `docs/designs/architecture-improvements-20261029.md`
- Target SHA256: `08edf90ae957351bb71c65b34dc71e839a006a7e9de53f5ac62d5d87c6f17caa`
- Scope reviewed: FeatureRange through the heading `Detailed Implementation Plan`; the detailed plan was read as context. Roles: Design, Structural, Style.
- No target or source files changed.

## Comprehension

**What is proposed.** Keep the static Astro site, anonymous interest Worker, and D1 architecture. Make releases more reproducible by adding backend/browser CI checks, comparing a catalog fingerprint from the built Pages artifact with the public Worker health response, adding a smoke path over generated pages, and documenting database/release operations. Diagnose the reported performance variance separately without asserting a cause in advance.

**How the current system works, according to the document.** Astro builds the catalog and editorial content into static pages on GitHub Pages. Browser code restores and validates a selection, then submits an anonymous versioned interest payload with a stable UUID; the Worker validates the request, recalculates prices from the shared catalog, and atomically applies rate admission and D1 persistence. The browser reports success only after a matching saved acknowledgement, while allowlisted analytics events are sent independently; Worker and Pages are released through separate processes.

## Findings

### D-1-01 — Major — Release compatibility check has a check-to-deploy race

- **Scope:** FeatureRange, A2 design choice and proposed release sequence (lines 42, 53–56; plan context lines 67–78).
- **Observation:** The proposed Pages workflow checks the live Worker `/health` against a locally built `site/release.json` before uploading/deploying Pages. Worker and Pages remain independently released; the documented sequence deploys Worker first and Pages second. There is no shared release lock, immutable Worker revision pin, or post-deploy compatibility check.
- **Evidence:** The existing Pages workflow has a `pages` concurrency group, which serializes Pages runs only. `worker/wrangler.jsonc` configures a separate Worker deployment. In the proposed flow, the live health response is a point-in-time check before the subsequent Pages deploy.
- **Consequence:** A Worker deployment between the preflight and Pages publication can change the served catalog fingerprint after the check passes. Pages can then publish with a manifest that no longer matches the Worker, despite CI passing. Concurrent operator releases can produce the same state. This leaves the central compatibility guarantee vulnerable precisely at the release boundary.
- **Recommendation:** Define an enforceable release serialization/ownership mechanism covering both Worker and Pages, or add a post-deploy check with a bounded rollback/failure procedure and ensure no incompatible Worker rollout can race it. State which workflow/operator owns the lock and what happens if the observed Worker changes during rollout.

## Sources read and checked

- `/Users/dmitrij/.codex/skills/elephant-goldfish/references/rubrics.md` (selected role guidance and comprehension requirements).
- Target document, complete FeatureRange through `Detailed Implementation Plan`, with detailed plan through acceptance as context; target hash verified before review.
- CodeGraph context and source exploration for Worker request validation/persistence and browser interest flow (including `worker/src/index.ts`, `worker/src/catalog.ts`, `src/scripts/interest.ts`, plus related symbols).
- Directly read `.github/workflows/pages.yml`, `worker/wrangler.jsonc`, and `worker/CHECKPOINT.md` to confirm release concurrency, separate Worker config, and migration-history statements.

## Unverified areas

- Did not query the current production Worker or Cloudflare deployment state; the claim is about the proposed workflow's race window, not a claim that production is presently mismatched.
- Did not inspect GitHub environment protection rules, branch rules, or any external/manual release coordination that might serialize Worker and Pages outside the repository. No such mechanism is specified in the reviewed document.
- No implementation readiness, detailed code-reference, or runtime verification review was performed beyond evidence needed for the assigned Design/Structural/Style pass.
