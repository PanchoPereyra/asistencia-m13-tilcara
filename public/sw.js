// Service worker de limpieza: se desregistra a sí mismo y borra las cachés
// existentes. Es necesario mantenerlo un tiempo para que los dispositivos que
// ya tenían el SW viejo instalado queden limpios automáticamente.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await self.registration.unregister();
      const clientList = await self.clients.matchAll({ type: "window" });
      for (const client of clientList) {
        if ("navigate" in client) {
          client.navigate(client.url);
        }
      }
    })()
  );
});
