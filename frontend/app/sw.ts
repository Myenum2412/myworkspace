import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, NetworkFirst, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: any;

const CACHE_VERSION = "v3";
const CACHE_NAMES = {
  static: `static-assets-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
  api: `api-responses-${CACHE_VERSION}`,
  fonts: `fonts-${CACHE_VERSION}`,
  fallback: `fallback-${CACHE_VERSION}`,
};

// ── Cache First: static assets (JS, CSS, HTML shell, fonts, icons, manifest) ──
const staticCache = new CacheFirst({
  cacheName: CACHE_NAMES.static,
  plugins: [
    {
      cacheWillUpdate: async ({ response }) => {
        if (!response || response.status >= 400) return null;
        return response;
      },
    },
  ],
});

// ── Cache First: images, with offline placeholder ──
const imageCache = new CacheFirst({
  cacheName: CACHE_NAMES.images,
  plugins: [
    {
      cacheWillUpdate: async ({ response }) => {
        if (!response || response.status >= 400) return null;
        return response;
      },
    },
  ],
});

// ── Network First: API calls that need fresh data ──
const apiCache = new NetworkFirst({
  cacheName: CACHE_NAMES.api,
  networkTimeoutSeconds: 5,
  plugins: [
    {
      cacheWillUpdate: async ({ response }) => {
        if (!response || response.status >= 400) return null;
        return response;
      },
    },
  ],
});

// ── Stale-While-Revalidate: frequently accessed, non-critical endpoints ──
const staleWhileRevalidateCache = new StaleWhileRevalidate({
  cacheName: CACHE_NAMES.api,
});

// ── Cache First: fonts ──
const fontCache = new CacheFirst({
  cacheName: CACHE_NAMES.fonts,
  plugins: [
    {
      cacheWillUpdate: async ({ response }) => {
        if (!response || response.status >= 400) return null;
        return response;
      },
    },
  ],
});

function createOfflineImageResponse(): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect fill="#f3f4f6" width="400" height="300"/>
    <text fill="#9ca3af" font-family="sans-serif" font-size="16" text-anchor="middle" x="200" y="140">Offline</text>
    <text fill="#9ca3af" font-family="sans-serif" font-size="12" text-anchor="middle" x="200" y="165">Image unavailable</text>
  </svg>`;
  return new Response(svg, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
  });
}

const FALLBACK_PATHS = ["/offline.html", "/offline"];

async function handleOfflineFallback(request: Request): Promise<Response> {
  const cache = await self.caches.open(CACHE_NAMES.fallback);
  const cachedFallback = await cache.match("/offline.html");
  if (cachedFallback) return cachedFallback;

  const networkFallback = await fetch("/offline.html").catch(() => null);
  if (networkFallback && networkFallback.ok) {
    const cacheCopy = networkFallback.clone();
    self.caches.open(CACHE_NAMES.fallback).then((c: any) => c.put("/offline.html", cacheCopy));
    return networkFallback;
  }

  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8f9fa;color:#1a1a2e;margin:0}.container{text-align:center;padding:2rem}h1{font-size:1.5rem;margin-bottom:.75rem}p{color:#64748b;line-height:1.5;margin-bottom:2rem}.btn{padding:.75rem 2rem;background:#1a1a2e;color:#fff;border:none;border-radius:8px;cursor:pointer}</style></head><body><div class="container"><h1>No internet connection</h1><p>You are offline. Please check your connection and try again.</p><button class="btn" onclick="window.location.reload()">Try again</button></div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function isApiRequest(url: URL): boolean {
  return url.pathname.startsWith("/api/");
}

function isStaticAsset(url: URL): boolean {
  return /\.(js|css|svg|png|jpg|jpeg|gif|ico|webp|avif|woff2?|ttf|eot|otf|pdf|json)$/i.test(url.pathname);
}

function isImageRequest(url: URL): boolean {
  return /\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/i.test(url.pathname);
}

function isFontRequest(url: URL): boolean {
  return /\.(woff2?|ttf|eot|otf)$/i.test(url.pathname);
}

function isNavigationRequest(request: Request): boolean {
  return request.mode === "navigate";
}

function shouldUseNetworkFirst(url: URL): boolean {
  if (!isApiRequest(url)) return false;
  const writeMethods = /^\/(api\/(files(-tus)?|auth|billing\/webhook|chat|settings))/i;
  const freshEndpoints = /^\/(api\/(dashboard|tasks|projects|sessions|time-entries|teams|notifications|activity|search))/i;
  if (writeMethods.test(url.pathname)) return true;
  if (freshEndpoints.test(url.pathname)) return true;
  return false;
}

function shouldUseStaleWhileRevalidate(url: URL): boolean {
  if (!isApiRequest(url)) return false;
  const staleEndpoints = /^\/(api\/(user|users|profile|organizations|clients|folders|shares|settings|admin|billing|reports|file-approval|calendar))/i;
  if (staleEndpoints.test(url.pathname)) return true;
  return false;
}

new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => isFontRequest(url),
      handler: fontCache,
    },
    {
      matcher: ({ url }) => isStaticAsset(url) && !isImageRequest(url),
      handler: staticCache,
    },
    {
      matcher: ({ url }) => isImageRequest(url),
      handler: imageCache,
    },
    {
      matcher: ({ url }) => shouldUseNetworkFirst(url),
      handler: apiCache,
    },
    {
      matcher: ({ url }) => shouldUseStaleWhileRevalidate(url),
      handler: staleWhileRevalidateCache,
    },
    ...defaultCache,
  ],
}).addEventListeners();

// ── Fetch event — offline fallback for navigations and images ──
self.addEventListener("fetch", (event: any) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (isNavigationRequest(request) && FALLBACK_PATHS.includes(url.pathname)) {
    event.respondWith(handleOfflineFallback(request));
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response: Response) => {
          if (response.status === 404) {
            return handleOfflineFallback(request);
          }
          return response;
        })
        .catch(() => handleOfflineFallback(request)),
    );
    return;
  }

  if (isImageRequest(url)) {
    event.respondWith(
      caches.match(request)
        .then((cached: Response | undefined) => {
          if (cached) return cached;
          return fetch(request)
            .then((response: Response) => {
              if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAMES.images).then((cache) => cache.put(request, copy));
              }
              return response;
            })
            .catch(() => buildOfflineImagePlaceholder());
        }),
    );
    return;
  }

  if (url.pathname === "/manifest.json") {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request).then((cached: Response | undefined) => cached)),
    );
    return;
  }
});

function buildOfflineImagePlaceholder(): Response {
  return createOfflineImageResponse();
}

// ── Push event listener ──
self.addEventListener("push", (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, icon, badge, data: payloadData, actions, tag, vibrate } = data;

    const options: any = {
      body: body || "",
      icon: icon || "/web-app-manifest-192x192.png",
      badge: badge || "/web-app-manifest-192x192.png",
      tag: tag || "default",
      vibrate: vibrate || [200, 100, 200],
      data: payloadData || {},
    };

    if (actions && actions.length > 0) {
      options.actions = actions;
    }

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const title = event.data.text();
    event.waitUntil(
      self.registration.showNotification(title, {
        icon: "/web-app-manifest-192x192.png",
        badge: "/web-app-manifest-192x192.png",
      }),
    );
  }
});

// ── Notification click event listener ──
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;
  const url = notificationData.url || notificationData.link || "/notifications";

  if (action && notificationData.actions) {
    const matchedAction = notificationData.actions.find((a: any) => a.action === action);
    if (matchedAction?.url) {
      event.waitUntil(self.clients.openWindow(matchedAction.url));
      return;
    }
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList: any[]) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            client.focus();
            if (url) client.navigate(url);
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});

self.addEventListener("message", (event: any) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CACHE_URLS") {
    const urls: string[] = event.data.payload;
    event.waitUntil(
      Promise.all(
        urls.map((url) =>
          fetch(url)
            .then((res: Response) => {
              if (res.ok) {
                const copy = res.clone();
                caches.open(CACHE_NAMES.api).then((cache) => cache.put(url, copy));
              }
            })
            .catch(() => {}),
        ),
      ),
    );
  }
});