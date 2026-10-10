// LOCALS · localsrb.com
// Sirve la web y, en /api/insta, las últimas publicaciones de Instagram (vía Behold).
//
// CÓMO ACTIVAR EL FEED DE INSTAGRAM
// 1. Crea una cuenta gratis en https://behold.so y conecta @locals.rb
//    (la cuenta de Instagram tiene que ser "Profesional": Creador o Empresa).
// 2. Crea un feed de tipo "JSON" y copia su "JSON Feed URL".
// 3. Pégala entre las comillas de abajo y vuelve a subir la carpeta a Cloudflare.
//    (También vale definirla en Cloudflare › locals-web › Settings › Variables
//     como BEHOLD_FEED_URL, sin tocar este archivo.)
// Mientras esté vacía, la web usa las fotos guardadas en /img.

const BEHOLD_FEED_URL = '';

// El plan gratis de Behold permite 1.200 lecturas al mes: guardamos la
// respuesta 6 horas en la caché de Cloudflare para no gastarlas.
const CACHE_SECONDS = 6 * 60 * 60;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/insta') return insta(request, env, ctx);
    const res = await env.ASSETS.fetch(request);
    return withHeaders(res, url.pathname);
  },
};

function withHeaders(res, path) {
  const out = new Response(res.body, res);
  out.headers.set('X-Content-Type-Options', 'nosniff');
  out.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (path.startsWith('/img/') && res.status === 200) {
    out.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  return out;
}

async function insta(request, env, ctx) {
  const feed = String(env.BEHOLD_FEED_URL || BEHOLD_FEED_URL || '').trim();
  if (!feed) return empty();

  const cache = caches.default;
  const key = new Request(new URL('/api/insta', request.url).toString(), { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;

  try {
    const r = await fetch(feed, { headers: { Referer: 'https://localsrb.com/' } });
    if (!r.ok) return empty();
    const data = await r.json();
    const posts = (Array.isArray(data.posts) ? data.posts : [])
      .map((p) => ({
        href: typeof p.permalink === 'string' ? p.permalink : 'https://www.instagram.com/locals.rb/',
        alt: String(p.altText || p.prunedCaption || '').slice(0, 140),
        img:
          (p.sizes && p.sizes.medium && p.sizes.medium.mediaUrl) ||
          p.thumbnailUrl ||
          (p.mediaType !== 'VIDEO' ? p.mediaUrl : ''),
      }))
      .filter((p) => typeof p.img === 'string' && p.img.startsWith('https://'))
      .slice(0, 12);
    if (!posts.length) return empty();

    const res = new Response(JSON.stringify({ posts }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=' + CACHE_SECONDS,
        'X-Content-Type-Options': 'nosniff',
      },
    });
    ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) {
    return empty();
  }
}

function empty() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
