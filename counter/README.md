# Global spin counter

Standalone Cloudflare Worker + D1. The public frontend stays on GitHub Pages;
this backend has no Sites or OpenAI service dependency.

GET /spins returns `{ "count": 0 }`. POST /spins accepts `{ "id": "<UUID v4>" }`.
The client calls POST once after a completed roll and a single SQL update
increments the shared total atomically. No user accounts, IPs, spin IDs, or food
selections are stored on the active path. This is an anonymous activity counter,
not a fraud-proof analytics system. Historical spins are not available.

GET responses are cached at the edge for five seconds. The frontend refreshes
the shared count every five minutes and immediately after its own completed
spin, rather than polling D1 every 30 seconds. POST bursts are limited to 120
per minute per source IP and Cloudflare only uses the IP as an ephemeral rate
limit key; the Worker does not store it. The UI takes at least 7.5 seconds to
complete one spin, so this leaves ample headroom for shared networks while
cutting off accidental or simplistic request floods before D1.

## Deploy

Run from the repository root:

1. `npx wrangler login`
2. `npx wrangler d1 create truanayangi-counter`
3. Copy the returned database_id into counter/wrangler.jsonc's D1 binding.
4. `npx wrangler d1 migrations apply DB --remote --config counter/wrangler.jsonc`
5. `npx wrangler deploy --config counter/wrangler.jsonc`
6. Set counter/public-config.json apiUrl to the returned HTTPS worker URL + /spins.
7. Rebuild and publish the GitHub Pages frontend.

Never put Cloudflare credentials in frontend code. public-config.json contains
only the public endpoint. An empty endpoint hides the counter.

## Local testing

`npx wrangler d1 migrations apply DB --local --config counter/wrangler.jsonc`

`npx wrangler dev --config counter/wrangler.jsonc --var ALLOWED_ORIGIN:http://127.0.0.1:4173 --port 8788`

`node counter/tests/api.mjs`

`NEXT_PUBLIC_COUNTER_API_URL=http://127.0.0.1:8788/spins npx vite build --config vite.pages.config.ts`

The tests write only to local D1 by default. Do not run write/load tests against
the production counter. Back up D1 before any schema change that removes data.
