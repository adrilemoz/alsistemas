// ============================================================
//  AL Sistemas — Service Worker (Sprint 1)
//  Estratégia: Cache First para assets estáticos,
//              Network First para API, fallback para offline.
//  Nota: rotas públicas do portal (/, /noticia, /eventos, /onibus)
//        NÃO são mais cacheadas — sistema admin-only.
// ============================================================

const CACHE_NAME     = 'alsistemas-v1'
const API_CACHE_NAME = 'alsistemas-api-v1'
// Nota: esses nomes são substituídos por versões com timestamp
// pelo plugin swVersionPlugin em vite.config.js durante o build.
// Ex: 'alsistemas-1745123456789'. Isso garante que cada deploy
// invalide o cache do deploy anterior.

const PRECACHE_URLS = [
  '/login',
  '/manifest.json',
]

// ─── Install ─────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ─── Activate ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Avisa todos os clientes abertos que o SW foi atualizado.
        return self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
      })
      .then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }))
      })
  )
})

// ─── Fetch ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return

  // Rotas públicas do portal — NÃO cachear (portal isolado no Sprint 1)
  const rotasPublicasIsoladas = ['/', '/home', '/noticia', '/eventos', '/onibus']
  if (rotasPublicasIsoladas.some(r => url.pathname === r || url.pathname.startsWith(r + '/'))) return

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstAPI(request))
    return
  }

  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(cacheFirstStatic(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(request))
    return
  }
})

// ─── Estratégias ─────────────────────────────────────────────

async function cacheFirstStatic(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 408 })
  }
}

async function networkFirstAPI(request) {
  const cache = await caches.open(API_CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ erro: 'Sem conexão', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function networkFirstNavigate(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Fallback para /login (não para '/' que era a home pública)
    const cached = await caches.match('/login') || await caches.match(request)
    if (cached) return cached
    return new Response('<h1>Sem conexão</h1><p>Verifique sua internet e tente novamente.</p>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
