/* Service worker — ให้ติดตั้งเป็นแอปได้ และเปิดหน้าเว็บได้แม้เน็ตช้า (ไม่เก็บข้อมูลคะแนน) — ES5 */
var CACHE = 'sa-shell-v7';
var SHELL = ['index.html', 'student.html', 'teacher.html', 'admin.html', 'status.html', 'style.css', 'app.js',
  'login.js', 'student.js', 'teacher.js', 'status.js', 'manifest.webmanifest',
  'admin-core.js', 'admin-home.js', 'admin-scores.js', 'admin-announce.js', 'admin-students.js', 'admin-reports.js', 'admin-line.js', 'admin-settings.js', 'admin-theme.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // เก็บทีละไฟล์ ไฟล์ไหนหายก็ข้าม ไม่ทำให้ทั้งชุดล้ม
    return Promise.all(SHELL.map(function (u) {
      return fetch(u, { cache: 'no-cache' }).then(function (res) { if (res.ok) return c.put(u, res); }).catch(function () { });
    }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// ไฟล์ของเว็บ: ดึงใหม่ก่อน ถ้าเน็ตหลุดใช้ของที่เก็บไว้
// เก็บเฉพาะคำตอบที่สำเร็จ (200) — ไม่เก็บหน้า 404 · คำขอไปยัง Apps Script ไม่ผ่าน service worker
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (r) {
      if (r) return r;
      if (req.mode === 'navigate') return caches.match('index.html');
      return Response.error();
    });
  }));
});
