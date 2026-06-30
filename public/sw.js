const CACHE_NAME = "myworkspace-upload-cache-v1";
const UPLOAD_SYNC_INTERVAL = 30000;

const PRECACHE_URLS = [];

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname.includes("/api/files-tus")) {
    event.respondWith(handleTusUpload(request));
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});

async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleTusUpload(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    return new Response(JSON.stringify({ error: "Upload queued offline" }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function syncPendingUploads() {
  const cache = await caches.open(CACHE_NAME);
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "SYNC_UPLOADS" });
  });
}

setInterval(syncPendingUploads, UPLOAD_SYNC_INTERVAL);

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CACHE_UPLOAD") {
    syncPendingUploads();
  }
});
