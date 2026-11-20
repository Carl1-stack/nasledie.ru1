/* Наследие app service worker: the app shell works offline; a lesson saved with «حمّل الدرس» plays offline.
   Bump VERSION after changing app files so phones fetch the new shell. */
var VERSION = 'nasl-shell-v4';
var SHELL = ['./', 'index.html', 'app.css', 'app.js', 'config.js', 'manifest.webmanifest', 'data/index.json', 'data/credits.json',
  'img/logo.png', 'img/icon-192.png', 'img/u1.jpg', 'img/u2.jpg', 'img/u3.jpg', 'img/u4.jpg', 'img/u5.jpg', 'img/u6.jpg', 'img/l2.jpg', 'img/l3.jpg',
  'img/lera.jpg', 'img/omar.jpg', 'img/olga.jpg', 'img/learner_m.jpg'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('nasl-shell-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  var isApi = /\.workers\.dev$/.test(url.hostname) && url.pathname.indexOf('/c/') === 0;
  if (isApi) { e.respondWith(caches.match(req, { ignoreVary: true }).then(function (hit) { return hit || fetch(req); })); return; }
  if (url.origin !== location.origin && !isFont) return;
  if (req.headers.get('range')) return;   // let the browser stream audio ranges itself
  var shellFile = url.origin === location.origin && (/\/(index\.html|app\.css|app\.js|config\.js)?$/.test(url.pathname) || /\/data\/[^/]+\.json$/.test(url.pathname));
  if (shellFile) {   // network first, so updates arrive; cache when offline
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(function (r) { var c = r.clone(); if (r.ok) caches.open(VERSION).then(function (ca) { ca.put(req, c); }); return r; })
      .catch(function () { return caches.match(req); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (r) {
      if (isFont && (r.ok || r.type === 'opaque')) { var c = r.clone(); caches.open(VERSION).then(function (ca) { ca.put(req, c); }); }
      return r;
    });
  }));
});
