# Interest form checkpoint

Updated: 2026-10-23, Europe/Kaliningrad.

Objective: anonymous, persisted prelaunch demand; no contact data; server acknowledgement before conversion. Owner details are postponed by the user. No name, phone, email, Telegram, address or comments in the form/API.

Implemented: form/component/styles, five agreed Metrica goals with counter disabled by default, Worker validation/CORS/bounded body, atomic D1 admission + save, idempotent retry, transient hashed rate keys, SQL migration, privacy/terms, API and deployment documentation. Worker uses the shared canonical catalog including extras and stores price snapshots.

Production: root deployed https://pirogorsk-interest.mmotorin.workers.dev through Cloudflare Dashboard. API /api/interest is set in src/config/analytics.ts (this documentation turn does not edit src). D1 pirogorsk-interest UUID 4d614db7-3ae1-4972-b76e-197f8174d758; DB binding and ALLOW_LOCALHOST=false confirmed. Workers Logs OFF confirmed. Cron */10 * * * * was saved; root is independently rechecking it, and actual scheduled execution is not yet evidenced. Public existing-resource config is worker/wrangler.jsonc; no secrets.

Production verification reported by root: GET /health returned {"ok":true,"storage":"d1","mode":"intent"}. Two POSTs with request_id bae9085e-2379-4c2b-9c32-c9f6f9c7dad8 produced one row; independent D1 read-back returned duplicate_count=1 and value_total=1640. This UUID is QA and must be excluded from real demand metrics. Deletion is not confirmed. ANALYTICS.md contains exact health/read-back checks and SQL excluding this UUID. Published-page end-to-end verification remains separate from this API/storage evidence.

Metrica: metricaId remains 0. Counter creation reaches an agreement acceptance step; that step has not been performed in this task. Five goals agreed: catalog_add, order_form_open, order_form_start, order_submit, order_submit_error. No live Metrica events were sent by the local QA.

Local verification: this follow-up re-ran node worker/scripts/verify.mjs on 2026-10-23; Worker typecheck PASS, browser script typecheck PASS, all 14 API/SQL tests PASS. Log: worker/dist/verify-production-docs.log. Tests use real SQLite and the migration. Earlier browser QA covered actual form + deployable Worker bundle, mobile 320px, validation/focus, double submit, lost acknowledgement after commit, retry with the same ID, one conversion/event, Escape/focus restore and empty endpoint. The synchronous chrome.kill() cleanup hint was fixed. Re-run node worker/scripts/verify.mjs for scoped typechecks/API tests; node worker/scripts/bundle.mjs and node --check worker/dist/worker.js for bundle; node worker/scripts/qa-browser.mjs for browser integration. Generated output is ignored in Git.

This follow-up edits only ANALYTICS.md, this checkpoint and worker config, then runs local backend checks. No production POST, src edit, commit, deploy, agreement acceptance or QA deletion. Remote Wrangler migration history is not confirmed because the production schema was applied through D1 Console.

Cron recheck completed by root at 2026-10-23 20:03 UTC: Dashboard reload shows Every 10 minutes and Next 20:10 UTC; unsaved changes bar absent. Actual scheduled execution remains unverified. Remaining: published-page verification and any QA cleanup. Counter setup remains pending. Record new evidence without treating anonymous interest or value_total as paid orders/revenue.
