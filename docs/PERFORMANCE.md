# Website performance (early stage)

## Applied 2026-07-30

| Change | Why |
|---|---|
| Removed Google Fonts CDN | Was render-blocking; system font stack is instant |
| Code-split recharts | ~500KB chart lib only loads on dashboard, not homepage |
| Vite `optimizeDeps` + client warmup | Faster cold start for marketing routes |
| Build `manualChunks` | Charts / icons / react / tanstack separated for production builds |
| nginx gzip | Smaller HTML/JS/CSS over the wire |
| nginx `/assets/` long cache | Repeat visits reuse fingerprinted assets |
| nginx `/api/` no-store | Correct for auth/wallet |
| systemd warm-up curl | First public visitor hits a warm process |

## Measured (droplet)

After warm-up, public homepage often **<150ms TTFB** over HTTPS with gzip.

Cold Vite process can still take ~2s on first transform (dev server still used for API middleware).

## Still on the roadmap (bigger win)

Today the droplet runs **`vite dev`** so custom `/api/*` plugins work.  
Next step for max speed:

1. Production `node-server` Nitro build for HTML/JS  
2. Standalone Node process only for `/api/*` + edge proxy  
3. nginx splits `/api` vs static/SSR  

That removes on-the-fly transforms entirely.
