const CACHE_PREFIX = 'tara-trabaho-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const APP_SHELL_URLS = [
  new URL('./', self.registration.scope).href,
  new URL('./index.html', self.registration.scope).href
];
const CACHEABLE_DESTINATIONS = new Set(['script', 'style', 'image', 'font']);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      await precacheAppShell();
    } catch (error) {
      console.warn('TARA-TRABAHO app shell could not be fully cached.', error);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (isApiRequest(requestUrl)) {
    if (isPublicListingRequest(requestUrl)) {
      event.respondWith(networkFirst(request, false));
    }
    return;
  }

  if (request.mode === 'navigate' || CACHEABLE_DESTINATIONS.has(request.destination)) {
    event.respondWith(networkFirst(request, request.mode === 'navigate'));
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (_error) {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'TARA-TRABAHO update';
  const options = {
    body: payload.body || 'A new local opportunity is available.',
    data: { url: payload.url || '/' },
    tag: payload.tag || (payload.listing_id ? `listing-${payload.listing_id}` : 'tara-update')
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = String(event.notification.data?.url || './').replace(/^\/+/, '');
  const target = new URL(path || './', self.registration.scope).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url === target && 'focus' in client);
    if (existing) return existing.focus();
    return clients.openWindow(target);
  }));
});

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  for (const url of APP_SHELL_URLS) {
    const response = await fetch(url, { cache: 'reload' });
    if (!response.ok) continue;

    await cache.put(url, response.clone());
    if (url !== APP_SHELL_URLS[0]) continue;

    const html = await response.text();
    const assetPattern = /(?:src|href)=["']([^"']+\.(?:m?js|jsx|css)(?:\?[^"']*)?)["']/gi;
    const assetUrls = new Set();
    for (const match of html.matchAll(assetPattern)) {
      const assetUrl = new URL(match[1], self.registration.scope);
      if (assetUrl.origin === self.location.origin) assetUrls.add(assetUrl.href);
    }

    await Promise.all([...assetUrls].map(async (assetUrl) => {
      const assetResponse = await fetch(assetUrl, { cache: 'reload' });
      if (assetResponse.ok) await cache.put(assetUrl, assetResponse);
    }));
  }
}

async function networkFirst(request, isNavigation) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

    if (isNavigation) {
      for (const shellUrl of APP_SHELL_URLS) {
        const shellResponse = await cache.match(shellUrl);
        if (shellResponse) return shellResponse;
      }
    }

    throw error;
  }
}

function isApiRequest(url) {
  return /\/api(?:\/|$)/i.test(url.pathname);
}

function isPublicListingRequest(url) {
  return /\/api\/(?:jobs|trainings)\/?$/i.test(url.pathname);
}