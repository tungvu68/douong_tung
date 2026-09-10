const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    // CORS restricts browser use; this is a public gag-site counter, not authentication.
    if (origin === env.ALLOWED_ORIGIN) headers.set('Access-Control-Allow-Origin', origin);
    const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
    if (new URL(request.url).pathname !== '/spins') return json({ error: 'Not found' }, 404);
    if (origin && origin !== env.ALLOWED_ORIGIN) return json({ error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      headers.set('Access-Control-Max-Age', '86400');
      return new Response(null, { status: 204, headers });
    }
    try {
      if (request.method === 'GET') {
        const cacheKey = new Request(`${new URL(request.url).origin}/spins?edge-cache=1`);
        const edgeCache = await caches.open('truanayangi-counter');
        const cached = await edgeCache.match(cacheKey);
        if (cached) return cached;
        const row = await env.DB.prepare('SELECT spins FROM totals WHERE id = 1').first<{ spins: number }>();
        const responseHeaders = new Headers(headers);
        responseHeaders.set('Cache-Control', 'public, max-age=5');
        const response = Response.json({ count: row?.spins ?? 0 }, { headers: responseHeaders });
        ctx.waitUntil(edgeCache.put(cacheKey, response.clone()));
        return response;
      }
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      const rateKey = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.SPIN_RATE_LIMITER.limit({ key: rateKey });
      if (!success) {
        headers.set('Retry-After', '60');
        return json({ error: 'Too many spins' }, 429);
      }
      if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') return json({ error: 'Expected JSON' }, 415);
      // Bound the actual stream, rather than trusting a Content-Length header.
      const reader = request.body?.getReader();
      if (!reader) return json({ error: 'Missing body' }, 400);
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 256) { await reader.cancel(); return json({ error: 'Body too large' }, 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      let body: unknown;
      try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!body || typeof body !== 'object' || !('id' in body) || typeof body.id !== 'string' || !uuid.test(body.id) || Object.keys(body).length !== 1) return json({ error: 'Invalid spin ID' }, 400);
      // One atomic row update keeps the hot path at one D1 row written per spin.
      // The browser deliberately sends once, so a permanent event ledger is not
      // worth tripling write usage and growing the database during viral bursts.
      const row = await env.DB.prepare('UPDATE totals SET spins = spins + 1 WHERE id = 1 RETURNING spins').first<{ spins: number }>();
      return json({ count: row?.spins ?? 0 });
    } catch (error) {
      console.error(JSON.stringify({ message: 'Counter storage request failed', error: error instanceof Error ? error.message : 'Unknown error' }));
      return json({ error: 'Counter temporarily unavailable' }, 503);
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;
