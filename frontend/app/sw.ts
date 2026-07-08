import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: any;

new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
}).addEventListeners();

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
    // Fallback for plain text payloads
    const title = event.data.text();
    event.waitUntil(
      self.registration.showNotification(title, {
        icon: "/web-app-manifest-192x192.png",
        badge: "/web-app-manifest-192x192.png",
      })
    );
  }
});

// ── Notification click event listener ──
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;
  const url = notificationData.url || notificationData.link || "/notifications";

  // Check if there's an action-specific URL
  if (action && notificationData.actions) {
    const matchedAction = notificationData.actions.find(
      (a: any) => a.action === action
    );
    if (matchedAction?.url) {
      event.waitUntil(self.clients.openWindow(matchedAction.url));
      return;
    }
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList: any[]) => {
        // If a window client is already focused, focus it and navigate
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            client.focus();
            if (url) {
              client.navigate(url);
            }
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

self.addEventListener("message", (event: any) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
