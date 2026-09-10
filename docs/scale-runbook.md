# Viral traffic runbook

Last audited: 2026-09-09 16:50 ICT.

## Current architecture

- GitHub Pages serves the static app and media.
- `truanayangi-counter` is a Cloudflare Worker on `workers.dev`.
- D1 atomically increments the single `totals.spins` row. The pre-viral event ledger remains in the database for historical continuity but is no longer written.
- The counter is deliberately non-critical: frontend errors are swallowed and never block a spin.

## Snapshot during the viral burst

- Counter: 44,509 completed spins before D1 rejected further writes.
- Arrival rate: 4,802 spins / 5 minutes; 27,193 / 15 minutes; 34,497 / hour.
- Worker sample: successful outcomes, 0–1 ms CPU; wall time mostly D1 network latency.
- D1: APAC primary, about 4.5 MB, 119,154 read queries, 44,504 write queries and 133,512 rows written in the previous 24 hours.
- Active incident: D1 Free's 100,000 rows-written daily allowance is exhausted. POST `/spins` returns 503 while the app itself remains available. The allowance resets at 00:00 UTC (07:00 ICT), but the current traffic will exhaust it again without a paid plan or a different counting model.

## Protections

- Browser counter refresh: five minutes, with a one-minute minimum between visibility refreshes. POST responses still update the initiating browser immediately.
- GET `/spins`: five-second Cloudflare edge cache to collapse bursts before D1.
- POST `/spins`: 120 requests/minute/source-IP edge rate limiter before body parsing and D1. A legitimate UI cannot complete more than about eight spins/minute. The source IP is not stored by application code.
- UUID validation, 256-byte body cap and exact CORS allowlist remain enabled. The frontend sends each completed spin once.
- Worker logs are sampled at 10%; errors use structured JSON.

## Capacity and cost triggers

- GitHub Pages documents a soft 100 GB/month bandwidth limit. Move static assets to Cloudflare Pages/R2 or a custom-domain CDN if bandwidth warnings appear.
- Workers Free documents 100,000 requests/day. Workers Standard includes 10 million requests/month, then $0.30/million.
- D1 Free documents 100,000 rows written/day. The original ledger schema used roughly three rows per spin; the production hot path now uses one atomic row update per spin. D1 Paid includes 50 million rows written/month, then $1/million.
- The account is confirmed to be on the free D1 allowance: production writes began returning the documented limit error at 44,509 spins.
- At the observed peak, Paid plus the one-row counter provides substantial headroom. Track the monthly projection because sustained traffic above 50 million spins/month incurs D1 overage.

## Monitor policy

Check the public page and GET `/spins` every five minutes. Notify on non-200 status, malformed/non-monotonic count, or latency above three seconds for two consecutive checks. Once per hour, inspect D1 size and recent usage; notify on Worker/D1 limit errors, rapidly rising error rate, database size above 400 MB, or projected paid overage above the expected viral budget. Healthy checks stay quiet.

Sources: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
