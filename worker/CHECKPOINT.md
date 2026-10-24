# Interest form checkpoint

Updated: 2026-10-24 after scheduled cleanup canary verification.

Objective: persisted anonymous prelaunch demand. The user postponed owner details and contact collection. The form/API have no name, phone, email, Telegram, address or comments. This is intent, not payment or confirmed delivery.

Production: https://pirogorsk-interest.mmotorin.workers.dev, API `/api/interest`, health `{"ok":true,"storage":"d1","mode":"intent"}`. D1 `pirogorsk-interest`, UUID `4d614db7-3ae1-4972-b76e-197f8174d758`, binding `DB`, `ALLOW_LOCALHOST=false`. Workers Logs/Traces/Issues OFF. Cron `*/10 * * * *` saved and independently confirmed after Dashboard reload; actual scheduled execution verified on 24 October at 14:50 UTC: an expired canary was removed while its future-dated control survived; no API calls or manual cleanup occurred between reads. Cron Events UI still shows no events; see ../qa/cron-verification-20261024.md. Config `worker/wrangler.jsonc` contains existing resource IDs, no secrets. Schema was applied through D1 Console; Wrangler migration history remains unconfirmed, so do not reapply the original CREATE TABLE migration blindly.

Verified:
- Independent production D1 read at 20:46 UTC: `submission_tokens` contains 0 rows, 0 expired rows, oldest expiry NULL. This confirms no remaining temporary tokens, not which cleanup path ran. Internal screenshot: `qa/screenshots/production-d1-token-cleanup-20261023.png` (ignored).
- Two production API submissions with UUID `bae9085e-2379-4c2b-9c32-c9f6f9c7dad8` produced one D1 row, total 1640.
- Full production UI submission from https://pirogorsk.ru/ returned UUID `1d6b3ff8-e23e-44cb-bcdb-5d98cc84c578`. Independent D1 SELECT returned one matching row: Зеленоградск, 2027-05-16, delivery, total 690, meat/500 × 1. Browser console has no errors.
- Both UUIDs are QA and excluded from demand queries in ANALYTICS.md. They have not been deleted.
- Worker/client typechecks and all 14 real SQLite/API tests PASS. Earlier browser QA verified validation/focus, 320px viewport, double submit, lost acknowledgement after commit, same-ID retry, one conversion event, Escape/focus restoration and disabled empty endpoint.

Implemented: canonical 13-item catalog validation, price snapshots, atomic D1 admission/save, idempotency, transient hashed rate keys, bounded body/CORS, scheduled cleanup. Server acknowledgement of the same UUID precedes success and `order_submit`. Unknown fields are rejected. Contact data is never sent to analytics.

Updated 2026-10-24: Metrica counter **113767847** is enabled in production (application commit `b7cc1a3`). Five exact-match goals are created; `order_submit` **674123845** was verified through the production UI, an independent D1 read, the official debugger and the Metrica conversion report: one QA row and one goal reach. All three QA request IDs are excluded from both demand SQL reports in [ANALYTICS.md](../ANALYTICS.md), which is the current source of truth. See [sanitized evidence](../qa/metrica-verification-20261024.md). The form remains anonymous and has no payment or contact fields. Cron configuration and the deployed handler are confirmed; actual scheduled execution is now verified by the controlled D1 canary; see [evidence](../qa/cron-verification-20261024.md).

Scoped verification: `node worker/scripts/verify.mjs`; bundle: `node worker/scripts/bundle.mjs` and `node --check worker/dist/worker.js`; browser integration: `node worker/scripts/qa-browser.mjs`. Generated reports are ignored. API/storage evidence and published-page screenshots are recorded in ANALYTICS.md.
