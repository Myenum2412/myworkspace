self.addEventListener("install", (_event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (_event) => {
  // Nothing to clean up
});

self.addEventListener("push", (event: any) => {
  const data = event.data?.json() || {};
  const title = data.title || "Notification";
  const options: NotificationOptions = {
    body: data.body || data.message || "",
    icon: data.icon || "/web-app-manifest-192x192.png",
    badge: data.badge || "/web-app-manifest-192x192.png",
    tag: data.tag || "default",
    data: {
      url: data.url || data.link || "/notifications",
      actions: data.actions || [],
    },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: data.actions?.map((a: any) => ({
      action: a.action || "view",
      title: a.title || "View",
    })),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/notifications";

  if (event.action) {
    const action = event.notification.data?.actions?.find(
      (a: any) => a.action === event.action
    );
    if (action?.url) {
      event.waitUntil(clients.openWindow(action.url));
      return;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener("notificationclose", (_event) => {
  // Analytics tracking could go here
});
