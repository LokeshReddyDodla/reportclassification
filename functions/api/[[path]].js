/**
 * Cloudflare Pages Function — production stand-in for the Vite dev proxy.
 *
 * In `npm run dev`, vite.config.js proxies `/api/*` to the backend. That proxy
 * is dev-only, so on the deployed Pages site `/api/*` would hit the static host
 * and 405. This catch-all forwards every `/api/*` request to the backend at the
 * edge, server-to-server — so the browser stays same-origin (no CORS) and the
 * backend's own CORS config is never touched.
 *
 * The frontend calls `/api/v1/...`; this strips the `/api` prefix and forwards
 * to `<API_BASE>/v1/...`, preserving method, headers, query, and body.
 */
export async function onRequest(context) {
  const { request, params, env } = context
  const apiBase = (env.AIH_API || 'https://api.aihealth.clinic').replace(/\/$/, '')

  // `[[path]]` captures the segments after /api/ as an array (or string).
  const rest = Array.isArray(params.path) ? params.path.join('/') : params.path || ''
  const search = new URL(request.url).search
  const target = `${apiBase}/${rest}${search}`

  // Drop hop-by-hop / origin-specific headers; let fetch set Host from the URL.
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('connection')

  const method = request.method
  const hasBody = method !== 'GET' && method !== 'HEAD'
  // Buffer the body rather than stream it — these payloads are tiny (login
  // JSON) and buffering avoids the half-duplex streaming caveats of edge fetch.
  const body = hasBody ? await request.arrayBuffer() : undefined

  const resp = await fetch(target, {
    method,
    headers,
    body,
    redirect: 'manual',
  })

  // Pass the upstream response straight through.
  const outHeaders = new Headers(resp.headers)
  outHeaders.delete('content-encoding')
  outHeaders.delete('content-length')
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: outHeaders,
  })
}
