// Self-destructing Service Worker
// This will replace any active service worker, unregister itself, clear all caches, and reload clients.

self.addEventListener('install', (event) => {
  console.log('Self-destructing SW: Installing and skipping waiting...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Self-destructing SW: Activating and cleaning up...');
  
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('Self-destructing SW: Deleting cache', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      console.log('Self-destructing SW: Unregistering...');
      return self.registration.unregister();
    }).then(() => {
      console.log('Self-destructing SW: Notifying clients to reload...');
      return self.clients.matchAll();
    }).then((clients) => {
      clients.forEach((client) => {
        if (client.url) {
          console.log('Self-destructing SW: Reloading client', client.url);
          client.navigate(client.url);
        }
      });
    })
  );
});
