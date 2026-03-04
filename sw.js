var CACHE_NAME = 'ironlog-v4';
var APP_FILES = ['./', './index.html', './icon.svg', './manifest.json'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(APP_FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  // CDN scripts: network first, cache fallback (for offline)
  if (url.indexOf('jsdelivr.net') !== -1 || url.indexOf('unpkg.com') !== -1 || url.indexOf('googleapis.com') !== -1 || url.indexOf('gstatic.com') !== -1) {
    e.respondWith(
      fetch(e.request).then(function(r) {
        var clone = r.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        return r;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }
  // App files: cache first
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request);
    })
  );
});
