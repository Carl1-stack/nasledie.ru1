/* Наследие app service worker: the app shell works offline; a lesson saved with «حمّل الدرس» plays offline.
   Bump VERSION after changing app files so phones fetch the new shell. */
var VERSION = 'nasl-shell-v29';
var SHELL = ['./', 'index.html', 'app.css', 'app.js', 'pdd.js', 'pdd.css', 'cases.js', 'cases.css', 'tour.js', 'data/cases/index.json', 'data/grammar/index.json', 'config.js', 'manifest.webmanifest', 'data/index.json', 'data/credits.json',
  'img/logo.png', 'img/logo_cine.jpg', 'img/icon-192.png', 'img/u1.jpg', 'img/u2.jpg', 'img/u3.jpg', 'img/u4.jpg', 'img/u5.jpg', 'img/u6.jpg', 'img/l2.jpg', 'img/l3.jpg',
  'img/lera.jpg', 'img/omar.jpg', 'img/olga.jpg', 'img/learner_m.jpg', 'img/learner_fh.jpg', 'img/learner_f.jpg', 'vendor/adhan.min.js', 'data/season.json'];
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
  if (/\.workers\.dev$/.test(url.hostname) && url.pathname.indexOf('/v/') === 0) {   // a lesson video saved for offline (Android): answer range requests from the saved copy
    e.respondWith(caches.open('nasl-video').then(function (c) { return c.match(req.url, { ignoreVary: true }); }).then(function (hit) {
      if (!hit) return fetch(req);
      return hit.blob().then(function (b) {
        var m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range') || '');
        if (!m) return new Response(b, { headers: { 'content-type': 'video/mp4', 'content-length': String(b.size), 'accept-ranges': 'bytes' } });
        var a0 = +m[1], a1 = m[2] ? Math.min(+m[2], b.size - 1) : b.size - 1;
        return new Response(b.slice(a0, a1 + 1), { status: 206, headers: { 'content-type': 'video/mp4', 'content-range': 'bytes ' + a0 + '-' + a1 + '/' + b.size, 'content-length': String(a1 - a0 + 1), 'accept-ranges': 'bytes' } });
      });
    }));
    return;
  }
  if (isApi) {   // lessons: the fresh copy first (new videos, fixes); the saved copy only when offline
    e.respondWith(fetch(req).then(function (r) { return r.ok || r.status === 401 || r.status === 403 ? r : caches.match(req, { ignoreVary: true }).then(function (hit) { return hit || r; }); })
      .catch(function () { return caches.match(req, { ignoreVary: true }); })); return; }
  if (url.origin !== location.origin && !isFont) return;
  if (req.headers.get('range')) return;   // let the browser stream audio ranges itself
  var shellFile = url.origin === location.origin && (/\/(index\.html|[\w-]+\.css|[\w-]+\.js|manifest\.webmanifest)?$/.test(url.pathname) || /\/data\/.+\.json$/.test(url.pathname));
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
/* daily reminder (sent by the gatekeeper's hourly cron when the student has not practised today) */
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  /* sound (2026-11-20): every message gets its own tag + renotify, so the phone rings and vibrates instead of silently replacing the last one */
  var opts = { body: d.body || '', icon: 'img/icon-192.png', badge: 'img/badge-96.png', dir: 'rtl', lang: 'ar', tag: d.tag || ('n' + Date.now()), renotify: true, silent: false,
    vibrate: [180, 90, 180], requireInteraction: d.kind === 'reply' || d.kind === 'zoom', timestamp: Date.now(), data: { url: d.url || './', kind: d.kind || '' } };
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    cs.forEach(function (c) { c.postMessage({ type: 'note', kind: d.kind || '', title: d.title || '', body: d.body || '' }); });
    return self.registration.showNotification(d.title || 'Насле́дие', opts);
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if (cs[i].url.indexOf(self.registration.scope) === 0 && 'focus' in cs[i]) { cs[i].navigate(url); return cs[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
