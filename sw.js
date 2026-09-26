/* Service worker — ให้ติดตั้งเป็นแอปได้ และเปิดหน้าเว็บได้แม้เน็ตช้า (ไม่เก็บข้อมูลคะแนน) — ES5 */
var CACHE = 'sa-shell-v3';
var SHELL = ['./', 'index.html', 'student.html', 'teacher.html', 'admin.html', 'status.html', 'style.css', 'app.js',
  'login.js', 'student.js', 'teacher.js', 'admin.js', 'status.js', 'manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// ไฟล์ของเว็บ: ดึงใหม่ก่อน ถ้าออฟไลน์ใช้ของที่เก็บไว้ · คำขอไปยัง Apps Script ไม่ผ่าน cache
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
    return res;
  }).catch(function () {
    return caches.match(req).then(function (r) { return r || caches.match('index.html'); });
  }));
});
