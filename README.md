# LOCALS · web

Web oficial de **LOCALS**, banda de rock de Cádiz → **https://localsrb.com**

- `index.html` — página principal
- `404.html` — página de error
- `_headers` — caché y cabeceras de seguridad (Cloudflare Pages)
- `img/` — imágenes

Cada cambio en la rama `main` se publica automáticamente en Cloudflare Pages.
- `_worker.js` — sirve la web y el feed de Instagram en `/api/insta` (Behold). Para activarlo: variable `BEHOLD_FEED_URL` en Cloudflare › locals-web › Settings › Variables.
