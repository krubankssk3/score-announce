/* ระบบประกาศผลคะแนน — สคริปต์กลางของทุกหน้า (ES5) */

// ===== แจ้งเตือนเมื่อไฟล์สคริปต์หายหรืออัปโหลดไม่ครบ =====
window.addEventListener('error', function (e) {
  var msg = String(e.message || '');
  if (!/Unexpected token '?<'?|Unexpected token </.test(msg) || !e.filename) return;
  var file = e.filename.split('/').pop().split('?')[0];
  var show = function () {
    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:999;background:#991b1b;color:#fff;padding:14px 16px;border-radius:14px;font:14px/1.6 sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.35)';
    box.innerHTML = '<b>ไฟล์ ' + file.replace(/[<>&]/g, '') + ' โหลดไม่ได้</b><br>ไฟล์นี้ไม่มีบน GitHub หรือชื่อไม่ตรง (ต้องชื่อ <code>' + file.replace(/[<>&]/g, '') + '</code> ตัวพิมพ์เล็ก อยู่โฟลเดอร์เดียวกับ index.html) อัปโหลดแล้วกด Ctrl+Shift+R';
    document.body.appendChild(box);
  };
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
});

// ===== ธีมสว่าง/มืด (ตั้งก่อนวาดหน้า) =====
(function () {
  var t = null;
  try { t = localStorage.getItem('sa_theme'); } catch (e) { }
  if (t !== 'light' && t !== 'dark') t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
})();

// ===== ตั้งค่า: วาง URL ของ Web App (ลงท้ายด้วย /exec) =====
var APP = {
  API_URL: 'https://script.google.com/macros/s/AKfycby5-ZFYjGZHavkWsNPjT2kwLeDpZrqgax_8WsrvAO-Ql9kqNO-g_PQpW1p7dEoHbbza/exec',
  LOGO: 'https://img2.pic.in.th/pic/Logo-7aecb8e321ff2955.png',
  SCHOOL: 'โรงเรียนบ้านละลม',
  FOOTER: 'พัฒนาโดย นายชิติพัทธ์ นิลวรรณ ตำแหน่ง ครู โรงเรียนบ้านละลม สพป.ศรีสะเกษ เขต 3'
};

var ICONS = {
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  door: '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.56v16.16a1 1 0 0 1-1.24.97L5 20V5.56a2 2 0 0 1 1.52-1.94l4-1A2 2 0 0 1 13 4.56Z"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><polyline points="10 2 10 10 13 7 16 10 16 2"/>',
  'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.85z"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  'user-cog': '<circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/><path d="m16.6 18.7.3-.9"/><path d="m19.1 12.2.3-.9"/><path d="m19.6 18.7-.4-1"/><path d="m16.8 12.3-.4-1"/><path d="m14.3 16.6 1-.4"/><path d="m20.7 13.8 1-.4"/>',
  'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  'calendar-clock': '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/>',
  grad: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  loader: '<path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  school: '<path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.13 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  sheet: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>',
  cloud: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
};

function icon(name, size, cls) {
  var s = size || 20;
  return '<svg class="ic ' + (cls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
}

function $(id) { return document.getElementById(id); }

function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function closestEl(el, sel) {
  while (el && el.nodeType === 1) {
    var m = el.matches || el.msMatchesSelector || el.webkitMatchesSelector;
    if (m && m.call(el, sel)) return el;
    el = el.parentNode;
  }
  return null;
}

// ===== พื้นที่จัดเก็บในเบราว์เซอร์ =====
var Store = {
  get: function (k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
  set: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { } },
  lget: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  lset: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
};
function getSession() { return Store.get('sa_session'); }
function setSession(s) { clearSwr(); Store.set('sa_session', s); }
function clearSession() { clearSwr(); Store.del('sa_session'); }

// ===== โหลดเร็ว: แสดงข้อมูลที่เคยโหลดไว้ทันที แล้วอัปเดตเบื้องหลัง =====
function clearSwr() {
  try {
    for (var i = sessionStorage.length - 1; i >= 0; i--) {
      var k = sessionStorage.key(i);
      if (k && k.indexOf('swr:') === 0) sessionStorage.removeItem(k);
    }
  } catch (e) { }
}
/**
 * swr(action, data, render, opts) — render(data, fromCache) ถูกเรียก 1–2 ครั้ง:
 * ครั้งแรกจากข้อมูลที่เก็บไว้ (ถ้ามี) และอีกครั้งเมื่อข้อมูลใหม่ต่างจากเดิม
 * opts.persist = true เก็บข้ามการเปิดเบราว์เซอร์ (ใช้กับข้อมูลสาธารณะเท่านั้น)
 */
function swr(action, data, render, opts) {
  opts = opts || {};
  var key = 'swr:' + action + ':' + JSON.stringify(data || {});
  var store = opts.persist ? window.localStorage : window.sessionStorage;
  var cached = null;
  try { cached = store.getItem(key); } catch (e) { }
  if (cached) {
    try { render(JSON.parse(cached), true); } catch (e) { cached = null; }
  }
  return api(action, data, { loader: false }).then(function (d) {
    var str = JSON.stringify(d);
    try { store.setItem(key, str); } catch (e) { }
    if (str !== cached) render(d, false);
    return d;
  }, function (e) {
    if (!cached) throw e;
    toast('แสดงข้อมูลล่าสุดที่บันทึกไว้ (' + e.message + ')', 'err');
  });
}
/** รวมหลายคำสั่งเป็นการเรียกเดียว → คืน array ของข้อมูล (โยน error ถ้ามีคำสั่งใดล้ม) */
function apiBatch(calls, opts) {
  return api('batch', { calls: calls }, opts || { loader: false }).then(function (list) {
    return list.map(function (x) {
      if (!x.ok) {
        if (x.code === 'AUTH') { clearSession(); location.replace('index.html?expired=1'); }
        throw new Error(x.error);
      }
      return x.data;
    });
  });
}

function homeOf(role) {
  if (role === 'admin') return 'admin.html';
  if (role === 'teacher') return 'teacher.html';
  return 'student.html';
}

function requireRole(roles) {
  var s = getSession();
  if (!s || !s.token || roles.indexOf(s.role) < 0) {
    location.replace('index.html');
    return null;
  }
  return s;
}

function roleLabel(role) {
  return role === 'admin' ? 'ผู้ดูแลระบบ' : (role === 'teacher' ? 'ครูผู้สอน' : 'นักเรียน/ผู้ปกครอง');
}

// ===== เรียก backend =====
var LOADER_TEXT = {
  login_student: 'กำลังตรวจสอบเลขบัตรประชาชน', login_staff: 'กำลังเข้าสู่ระบบ', save_scores: 'กำลังบันทึกคะแนน',
  save_announcement: 'กำลังบันทึกรายการประกาศ', set_announcement_status: 'กำลังอัปเดตการประกาศผล', delete_announcement: 'กำลังลบรายการ',
  save_student: 'กำลังบันทึกข้อมูลนักเรียน', delete_student: 'กำลังลบข้อมูลนักเรียน', import_students: 'กำลังนำเข้ารายชื่อนักเรียน',
  save_settings: 'กำลังบันทึกการตั้งค่า', save_user: 'กำลังบันทึกบัญชีผู้ใช้', backup_now: 'กำลังสำรองข้อมูลลง Google Drive',
  change_password: 'กำลังเปลี่ยนรหัสผ่าน'
};

/** เรียก backend — คำสั่งที่เปลี่ยนข้อมูลจะแสดงหน้าต่างโหลดวงล้ออัตโนมัติ (opts.loader กำหนดเองได้, false = ไม่แสดง) */
function api(action, data, opts) {
  opts = opts || {};
  var text = opts.loader === false ? null : (typeof opts.loader === 'string' ? opts.loader : LOADER_TEXT[action]);
  if (!text) return apiRaw(action, data);
  var h = showLoader(text);
  return apiRaw(action, data).then(function (d) { hideLoader(h); return d; }, function (e) { hideLoader(h); throw e; });
}

function apiRaw(action, data) {
  if (APP.API_URL.indexOf('https://script.google.com/') !== 0) {
    return Promise.reject(new Error('ยังไม่ได้ตั้งค่า API_URL ในไฟล์ app.js'));
  }
  var body = { action: action };
  var s = getSession();
  if (s && s.token) body.token = s.token;
  if (data) {
    for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k)) body[k] = data[k]; }
  }
  return fetch(APP.API_URL, { method: 'POST', body: JSON.stringify(body), redirect: 'follow' })
    .then(function (r) {
      if (r.status === 404) throw new Error('ไม่พบ Web App (404) — ตรวจการ Deploy ของ Apps Script');
      if (!r.ok) throw new Error('เซิร์ฟเวอร์ตอบกลับผิดพลาด (' + r.status + ')');
      return r.json();
    }, function () {
      throw new Error('เชื่อมต่อ Web App ไม่ได้ (อินเทอร์เน็ตหรือการ Deploy ของ Apps Script)');
    })
    .then(function (res) {
      if (!res.ok) {
        if (res.code === 'AUTH') {
          clearSession();
          location.replace('index.html?expired=1');
        }
        throw new Error(res.error || 'เกิดข้อผิดพลาด');
      }
      return res.data;
    });
}

function logout() {
  var done = function () { clearSession(); location.href = 'index.html'; };
  api('logout').then(done, done);
}

// ===== รูปแบบข้อมูล =====
var TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function parseDate(v) {
  if (!v) return null;
  var s = String(v);
  var d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDate(v) {
  var d = parseDate(v);
  return d ? d.getDate() + ' ' + TH_MONTHS[d.getMonth()] + ' ' + (d.getFullYear() + 543) : '';
}
function fmtDateShort(v) {
  var d = parseDate(v);
  return d ? d.getDate() + ' ' + TH_MONTHS[d.getMonth()] : '';
}
function fmtDateTime(v) {
  var d = parseDate(v);
  if (!d) return '';
  var hh = ('0' + d.getHours()).slice(-2), mm = ('0' + d.getMinutes()).slice(-2);
  return fmtDate(d) + ' · ' + hh + ':' + mm + ' น.';
}
function relTime(v) {
  var d = parseDate(v);
  if (!d) return '';
  var m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return m + ' นาทีที่แล้ว';
  var h = Math.floor(m / 60);
  if (h < 24) return h + ' ชั่วโมงที่แล้ว';
  if (h < 48) return 'เมื่อวาน';
  var day = Math.floor(h / 24);
  if (day < 30) return day + ' วันที่แล้ว';
  return fmtDate(d);
}
function fmtScore(v) { return (v === null || v === undefined || v === '') ? '–' : String(v); }
function formatId(d) {
  d = String(d || '').replace(/\D/g, '').slice(0, 13);
  var parts = [d.slice(0, 1), d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d.slice(12, 13)];
  var out = [];
  for (var i = 0; i < parts.length; i++) { if (parts[i]) out.push(parts[i]); }
  return out.join('-');
}
function termLabel(term) { return 'ภาคเรียนที่ ' + term; }
function termRange(settings, term, year) {
  if (!settings) return '';
  return String(term) === '2' ? settings.term2_label + ' ' + (Number(year) + 1) : settings.term1_label + ' ' + year;
}

var STATUS_META = {
  published: { label: 'ประกาศแล้ว', cls: 'b-green', tint: 't-green', icon: 'check-circle' },
  in_progress: { label: 'ดำเนินการ', cls: 'b-amber', tint: 't-amber', icon: 'loader' },
  pending: { label: 'รอประกาศ', cls: 'b-slate', tint: 't-slate', icon: 'clock' }
};
function statusBadge(status) {
  var m = STATUS_META[status] || { label: 'ยังไม่มีรายการประกาศ', cls: 'b-slate' };
  return '<span class="badge ' + m.cls + '">' + esc(m.label) + '</span>';
}

function parseQuery(q) {
  var o = {};
  String(q || '').split('&').forEach(function (p) {
    if (!p) return;
    var i = p.indexOf('=');
    var k = decodeURIComponent(i < 0 ? p : p.slice(0, i));
    o[k] = i < 0 ? '' : decodeURIComponent(p.slice(i + 1));
  });
  return o;
}
function buildQuery(o) {
  var out = [];
  for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k) && o[k] !== '' && o[k] !== null && o[k] !== undefined) out.push(encodeURIComponent(k) + '=' + encodeURIComponent(o[k])); }
  return out.join('&');
}

// ===== ส่วนแสดงผลที่ใช้ร่วมกัน =====
/** วงล้อหมุน: โลโก้ตรงกลาง + วงแหวนหมุนสองชั้น + สัญลักษณ์คณิตโคจร */
function logoWheel(size) {
  size = size || 120;
  var sy = ['π', '+', '√', '×', '∑', '÷', '∞', '='];
  var orbit = '';
  for (var i = 0; i < sy.length; i++) {
    orbit += '<span style="transform:rotate(' + (i * 45) + 'deg) translateY(-' + (size / 2 + 4) + 'px)"><i style="transform:rotate(-' + (i * 45) + 'deg)">' + sy[i] + '</i></span>';
  }
  return '<div class="wheel" style="--s:' + size + 'px" aria-hidden="true"><div class="wheel-orbit">' + orbit + '</div>' +
    '<div class="wheel-ring r1"></div><div class="wheel-ring r2"></div>' +
    '<div class="wheel-logo">' + icon('school', Math.round(size * .36)) + '<img src="' + APP.LOGO + '" alt="" onerror="this.style.display=\'none\'"></div></div>';
}
function loadingBlock(text) {
  return '<div class="loading" role="status">' + logoWheel(92) + '<span class="loading-text">' + esc(text || 'กำลังโหลดข้อมูล') + '<span class="dots"><i>.</i><i>.</i><i>.</i></span></span></div>';
}

var loaderCount = 0, loaderTimer = null, loaderShownAt = 0;
function showLoader(text) {
  loaderCount++;
  var ov = $('sa-loader');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'sa-loader';
    ov.className = 'loader-overlay';
    ov.setAttribute('role', 'alert');
    ov.setAttribute('aria-live', 'assertive');
    ov.innerHTML = '<div class="loader-box">' + logoWheel(128) + '<p class="loader-title" id="sa-loader-text"></p><p class="loader-sub">กรุณารอสักครู่ อย่าปิดหน้านี้</p></div>';
    document.body.appendChild(ov);
  }
  $('sa-loader-text').textContent = text || 'กำลังดำเนินการ';
  clearTimeout(loaderTimer);
  if (!ov.classList.contains('show')) {
    loaderTimer = setTimeout(function () { ov.classList.add('show'); loaderShownAt = Date.now(); }, 120);
  }
  return loaderCount;
}
function hideLoader() {
  loaderCount = Math.max(0, loaderCount - 1);
  if (loaderCount) return;
  clearTimeout(loaderTimer);
  var ov = $('sa-loader');
  if (!ov || !ov.classList.contains('show')) return;
  var wait = Math.max(0, 200 - (Date.now() - loaderShownAt));
  setTimeout(function () { if (!loaderCount) ov.classList.remove('show'); }, wait);
}

/** กล่องข้อความแบบ Sweet Alert — คืน Promise<boolean> */
var SWAL_ICONS = {
  success: '<svg viewBox="0 0 52 52"><circle class="swal-c" cx="26" cy="26" r="24"/><path class="swal-p" d="M15 27l7 7 15-16"/></svg>',
  error: '<svg viewBox="0 0 52 52"><circle class="swal-c" cx="26" cy="26" r="24"/><path class="swal-p" d="M18 18l16 16M34 18L18 34"/></svg>',
  warning: '<svg viewBox="0 0 52 52"><circle class="swal-c" cx="26" cy="26" r="24"/><path class="swal-p" d="M26 14v15"/><circle class="swal-dot" cx="26" cy="37" r="2.2"/></svg>',
  question: '<svg viewBox="0 0 52 52"><circle class="swal-c" cx="26" cy="26" r="24"/><path class="swal-p" d="M20 20a6 6 0 1 1 8.5 5.5c-1.7.8-2.5 2-2.5 3.8"/><circle class="swal-dot" cx="26" cy="37" r="2.2"/></svg>',
  announce: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS.megaphone + '</svg>'
};
function swal(o) {
  return new Promise(function (resolve) {
    var old = $('sa-swal');
    if (old) old.parentNode.removeChild(old);
    var wrap = document.createElement('div');
    wrap.id = 'sa-swal';
    wrap.className = 'swal-backdrop';
    var kind = o.icon || 'success';
    wrap.innerHTML = '<div class="swal" role="alertdialog" aria-modal="true" aria-labelledby="swalTitle">' +
      '<div class="swal-icon swal-' + kind + '">' + (SWAL_ICONS[kind] || SWAL_ICONS.success) + '</div>' +
      '<h2 id="swalTitle">' + esc(o.title || '') + '</h2>' + (o.html ? '<div class="swal-text">' + o.html + '</div>' : (o.text ? '<p class="swal-text">' + esc(o.text) + '</p>' : '')) +
      '<div class="swal-actions">' + (o.cancelText ? '<button type="button" class="btn" data-v="0">' + esc(o.cancelText) + '</button>' : '') +
      '<button type="button" class="btn ' + (o.danger ? 'btn-danger-solid' : 'btn-primary') + '" data-v="1">' + esc(o.confirmText || 'ตกลง') + '</button></div>' +
      (o.timer ? '<div class="swal-timer" style="animation-duration:' + o.timer + 'ms"></div>' : '') + '</div>';
    document.body.appendChild(wrap);
    var prev = document.activeElement, t = null, done = false;
    function close(v) {
      if (done) return;
      done = true;
      clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      wrap.classList.add('out');
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); if (prev && prev.focus) prev.focus(); }, 180);
      resolve(v);
    }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(false); } }
    document.addEventListener('keydown', onKey, true);
    wrap.addEventListener('click', function (e) {
      var b = closestEl(e.target, '[data-v]');
      if (b) close(b.getAttribute('data-v') === '1');
      else if (e.target === wrap && !o.cancelText) close(true);
    });
    var focusBtn = wrap.querySelector('[data-v="1"]');
    if (focusBtn) focusBtn.focus();
    if (o.timer) t = setTimeout(function () { close(true); }, o.timer);
  });
}
function emptyBlock(ic, title, text, actionHtml) {
  return '<div class="empty"><div class="tint t-slate">' + icon(ic, 26) + '</div><b>' + esc(title) + '</b>' +
    (text ? '<p>' + esc(text) + '</p>' : '') + (actionHtml || '') + '</div>';
}
function isConnError(msg) { return /เชื่อมต่อ|API_URL|ตอบกลับผิดพลาด|404|Failed to fetch/i.test(String(msg)); }
function connHelp() {
  return '<ol class="help-steps">' +
    '<li>เปิด <a href="' + esc(APP.API_URL) + '" target="_blank" rel="noopener">ลิงก์ Web App</a> ในหน้าต่างไม่ระบุตัวตน ต้องเห็นข้อความ <code>"ok":true</code></li>' +
    '<li>ถ้าขึ้น 404 หรือหน้าให้ล็อกอิน: Apps Script → การทำให้ใช้งานได้ → จัดการ → แก้ไข → ผู้มีสิทธิ์เข้าถึง = <b>ทุกคน</b>, ดำเนินการในฐานะ = <b>ฉัน</b> → เวอร์ชันใหม่</li>' +
    '<li>บัญชีโรงเรียน (Google Workspace) บางแห่งห้ามเผยแพร่ให้ "ทุกคน" ให้ใช้บัญชี Gmail ส่วนตัวสร้างสคริปต์แทน</li>' +
    '<li>ตรวจว่า <code>API_URL</code> ใน app.js ตรงกับลิงก์ที่ลงท้ายด้วย <code>/exec</code></li></ol>';
}
function errorBlock(msg) {
  return '<div class="empty"><div class="tint t-red">' + icon('alert', 26) + '</div><b>โหลดข้อมูลไม่สำเร็จ</b><p>' + esc(msg) + '</p>' +
    '<button type="button" class="btn" data-retry>' + icon('loader', 18) + 'ลองอีกครั้ง</button>' + (isConnError(msg) ? connHelp() : '') + '</div>';
}

function setBusy(btn, busy, text) {
  if (!btn) return;
  if (busy) {
    btn.setAttribute('data-html', btn.innerHTML);
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span>' + esc(text || 'กำลังดำเนินการ');
  } else {
    btn.disabled = false;
    var h = btn.getAttribute('data-html');
    if (h !== null) btn.innerHTML = h;
  }
}

function toast(msg, type) {
  var root = $('toast-root');
  if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
  var el = document.createElement('div');
  el.className = 'toast ' + (type || 'ok');
  el.setAttribute('role', type === 'err' ? 'alert' : 'status');
  el.innerHTML = icon(type === 'err' ? 'alert' : 'check-circle', 18) + '<span>' + esc(msg) + '</span>';
  root.appendChild(el);
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, type === 'err' ? 5000 : 3000);
}

var lastFocus = null;
function openModal(opts) {
  closeModal();
  lastFocus = document.activeElement;
  var wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.id = 'modal';
  wrap.innerHTML = '<div class="modal' + (opts.wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
    '<div class="modal-head"><h2 id="modalTitle">' + esc(opts.title) + '</h2><button type="button" class="icon-btn" data-close aria-label="ปิด">' + icon('x', 18) + '</button></div>' +
    '<div class="modal-body">' + opts.body + '</div>' + (opts.foot ? '<div class="modal-foot">' + opts.foot + '</div>' : '') + '</div>';
  wrap.addEventListener('click', function (e) {
    if (e.target === wrap || closestEl(e.target, '[data-close]')) closeModal();
  });
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');
  var f = wrap.querySelector('.modal-body input, .modal-body select, .modal-body textarea');
  if (f) f.focus();
  return wrap;
}
function closeModal() {
  var m = $('modal');
  if (m) {
    m.parentNode.removeChild(m);
    document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

function confirmBox(title, message, okText, danger) {
  return swal({ icon: danger ? 'warning' : 'question', title: title, text: message, confirmText: okText || 'ยืนยัน', cancelText: 'ยกเลิก', danger: !!danger });
}

function mountUserMenu(btn, sess) {
  if (!btn) return;
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var old = $('userMenu');
    if (old) { old.parentNode.removeChild(old); return; }
    var menu = document.createElement('div');
    menu.className = 'menu';
    menu.id = 'userMenu';
    menu.innerHTML = '<div class="menu-head"><b>' + esc(sess.name) + '</b><span>' + esc(roleLabel(sess.role)) + '</span></div>' +
      (sess.role !== 'student' ? '<button type="button" data-act="pw">' + icon('key', 18) + 'เปลี่ยนรหัสผ่าน</button>' : '') +
      '<a href="status.html">' + icon('activity', 18) + 'สถานะการประกาศผล</a>' +
      '<button type="button" data-act="out">' + icon('logout', 18) + 'ออกจากระบบ</button>';
    btn.parentNode.appendChild(menu);
    menu.addEventListener('click', function (ev) {
      var b = closestEl(ev.target, '[data-act]');
      if (!b) return;
      if (b.getAttribute('data-act') === 'out') logout();
      if (b.getAttribute('data-act') === 'pw') { menu.parentNode.removeChild(menu); changePasswordModal(); }
    });
  });
  document.addEventListener('click', function (e) {
    var m = $('userMenu');
    if (m && !closestEl(e.target, '#userMenu')) m.parentNode.removeChild(m);
  });
}

function changePasswordModal() {
  openModal({
    title: 'เปลี่ยนรหัสผ่าน',
    body: '<form id="pwForm"><div class="field"><label for="pwOld">รหัสผ่านเดิม</label><input class="input" id="pwOld" type="password" autocomplete="current-password" required></div>' +
      '<div class="field"><label for="pwNew">รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label><input class="input" id="pwNew" type="password" autocomplete="new-password" minlength="6" required></div>' +
      '<div class="field"><label for="pwNew2">ยืนยันรหัสผ่านใหม่</label><input class="input" id="pwNew2" type="password" autocomplete="new-password" required></div>' +
      '<div id="pwErr" class="form-error" hidden></div></form>',
    foot: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="submit" form="pwForm" class="btn btn-primary" id="pwSave">' + icon('save', 18) + 'บันทึกรหัสผ่าน</button>'
  });
  $('pwForm').onsubmit = function (e) {
    e.preventDefault();
    var err = $('pwErr');
    err.hidden = true;
    if ($('pwNew').value !== $('pwNew2').value) { err.textContent = 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'; err.hidden = false; return; }
    setBusy($('pwSave'), true, 'กำลังบันทึก');
    api('change_password', { old_password: $('pwOld').value, new_password: $('pwNew').value }).then(function () {
      closeModal();
      toast('เปลี่ยนรหัสผ่านแล้ว');
    }).catch(function (ex) {
      err.textContent = ex.message; err.hidden = false;
      setBusy($('pwSave'), false);
    });
  };
}

function copyText(text) {
  var done = function () { toast('คัดลอกแล้ว'); };
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, function () { fallback(); }); return; }
  fallback();
  function fallback() {
    var t = document.createElement('textarea');
    t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('คัดลอกไม่ได้ กรุณาคัดลอกเอง', 'err'); }
    document.body.removeChild(t);
  }
}

function downloadCSV(filename, rows) {
  var csv = rows.map(function (r) {
    return r.map(function (c) {
      var s = c === null || c === undefined ? '' : String(c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\r\n');
  var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 500);
}


// ===== ลูกเล่นของหน้า =====
function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

/** สัญลักษณ์คณิตศาสตร์ลอยในพื้นหลัง (ตำแหน่งคงที่ต่อ seed) */
function mathSymbols(n, seed) {
  var sy = ['π', '∑', '√', '÷', '×', '∞', '≈', '%', '△', 'x²', '+', '=', '½', '∠'];
  var h = '', x = seed || 7;
  function rnd() { x = (x * 9301 + 49297) % 233280; return x / 233280; }
  for (var i = 0; i < (n || 8); i++) {
    h += '<span class="sym" style="left:' + (rnd() * 92).toFixed(1) + '%;top:' + (rnd() * 85).toFixed(1) + '%;font-size:' + (18 + rnd() * 22).toFixed(0) + 'px;animation-delay:-' + (rnd() * 9).toFixed(1) + 's">' + sy[Math.floor(rnd() * sy.length)] + '</span>';
  }
  return '<div class="hero-sym" aria-hidden="true">' + h + '</div>';
}

function greeting() {
  var h = new Date().getHours();
  if (h < 11) return 'อรุณสวัสดิ์';
  if (h < 13) return 'สวัสดีตอนเที่ยง';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

/** นับเลขขึ้นให้ element ที่มี data-count */
function countUp(el, to, dec) {
  to = Number(to);
  if (!isFinite(to)) { el.textContent = '–'; return; }
  dec = dec === undefined ? (Math.round(to) === to ? 0 : 1) : dec;
  if (reducedMotion()) { el.textContent = to.toFixed(dec); return; }
  var start = null, dur = 900;
  function step(t) {
    if (!start) start = t;
    var p = Math.min(1, (t - start) / dur);
    var e = 1 - Math.pow(1 - p, 3);
    el.textContent = (to * e).toFixed(dec);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function animateCounts(root) {
  var els = (root || document).querySelectorAll('[data-count]');
  for (var i = 0; i < els.length; i++) countUp(els[i], els[i].getAttribute('data-count'));
}

/** ให้ลูกของ container ค่อยๆ ปรากฏต่อกัน (ใช้ครั้งเดียวต่อหน้า) */
function enter(root) {
  if (!root || reducedMotion()) return;
  var kids = root.children, n = 0;
  for (var i = 0; i < kids.length && n < 14; i++) {
    if (kids[i].classList.contains('sticky-cta') || kids[i].classList.contains('save-bar')) continue;
    kids[i].classList.remove('enter-item');
    void kids[i].offsetWidth;
    kids[i].style.animationDelay = (n * 45) + 'ms';
    kids[i].classList.add('enter-item');
    n++;
  }
}

/** วงแหวนเปอร์เซ็นต์ เคลื่อนไหวเมื่อเรียก animateGauges */
function gauge(pct, size, stroke, centerHtml, color) {
  size = size || 120; stroke = stroke || 11;
  var r = (size - stroke) / 2, c = 2 * Math.PI * r;
  var id = 'g' + Math.floor(Math.random() * 1e8);
  pct = Math.max(0, Math.min(100, Number(pct) || 0));
  return '<div class="gauge" style="width:' + size + 'px;height:' + size + 'px" role="img" aria-label="' + Math.round(pct) + ' เปอร์เซ็นต์">' +
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="' + (color ? color[0] : '#0891b2') + '"/><stop offset="1" stop-color="' + (color ? color[1] : '#22d3ee') + '"/></linearGradient></defs>' +
    '<circle class="track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
    '<circle class="val" data-off="' + (c * (1 - pct / 100)).toFixed(2) + '" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="url(#' + id + ')" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + c.toFixed(2) + '"/></svg>' +
    '<div class="gauge-center">' + (centerHtml || '') + '</div></div>';
}
function animateGauges(root) {
  var els = (root || document).querySelectorAll('circle.val[data-off]');
  setTimeout(function () {
    for (var i = 0; i < els.length; i++) els[i].setAttribute('stroke-dashoffset', els[i].getAttribute('data-off'));
  }, 60);
}

/** พลุกระดาษ + สัญลักษณ์คณิต สำหรับช่วงเวลาดีใจ */
function confetti() {
  if (reducedMotion()) return;
  var cv = document.createElement('canvas');
  cv.className = 'confetti';
  var dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  document.body.appendChild(cv);
  var ctx = cv.getContext && cv.getContext('2d');
  if (!ctx) { cv.parentNode.removeChild(cv); return; }
  ctx.scale(dpr, dpr);
  var colors = ['#06b6d4', '#0891b2', '#10b981', '#f59e0b', '#fbbf24', '#a5f3fc', '#f472b6'];
  var syms = ['π', '√', '∑', '×', '+', '★'];
  var parts = [];
  for (var i = 0; i < 130; i++) {
    parts.push({
      x: innerWidth / 2 + (Math.random() - .5) * 160, y: innerHeight * .35,
      vx: (Math.random() - .5) * 13, vy: -Math.random() * 13 - 4, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: colors[i % colors.length],
      s: i % 7 === 0 ? syms[i % syms.length] : null
    });
  }
  var t0 = Date.now();
  (function frame() {
    var t = Date.now() - t0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(function (p) {
      p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t / 2800); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      if (p.s) { ctx.font = '600 20px Mitr, sans-serif'; ctx.fillText(p.s, -6, 6); } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (t < 2800) requestAnimationFrame(frame); else if (cv.parentNode) cv.parentNode.removeChild(cv);
  })();
}

/** คลื่นเมื่อกดปุ่ม */
document.addEventListener('pointerdown', function (e) {
  var b = closestEl(e.target, '.btn, .choice, .subj, .action, .seg button');
  if (!b || reducedMotion()) return;
  var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
  var s = document.createElement('span');
  s.className = 'ripple';
  s.style.width = s.style.height = d + 'px';
  s.style.left = (e.clientX - r.left - d / 2) + 'px';
  s.style.top = (e.clientY - r.top - d / 2) + 'px';
  b.appendChild(s);
  setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 650);
});

function toggleTheme() {
  var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('sa_theme', next); } catch (e) { }
}
function mountThemeToggle() {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'icon-btn theme-btn no-print';
  btn.setAttribute('aria-label', 'สลับโหมดสว่าง/มืด');
  btn.title = 'สลับโหมดสว่าง/มืด';
  btn.innerHTML = icon('sun', 19, 'ic-sun') + icon('moon', 19, 'ic-moon');
  btn.onclick = toggleTheme;
  var bar = document.querySelector('.topbar-in');
  if (bar) {
    var brand = bar.querySelector('.brand');
    bar.insertBefore(btn, brand ? brand.nextSibling : bar.firstChild);
  } else {
    btn.className += ' theme-fab';
    document.body.appendChild(btn);
  }
}

// ===== แถบประกาศผลวิ่ง (หน้าสาธารณะ) =====
function recentPublished(d) {
  var days = (d.ticker && d.ticker.days) || 14, now = Date.now();
  return (d.items || []).filter(function (a) {
    var t = parseDate(a.published_at);
    return a.status === 'published' && t && now - t.getTime() <= days * 86400000;
  }).sort(function (a, b) { return a.published_at < b.published_at ? 1 : -1; });
}
function tickerHtml(d, link) {
  var mode = (d.ticker && d.ticker.mode) || 'rtl';
  if (mode === 'off') return '';
  var list = recentPublished(d), now = Date.now();
  var items = [];
  if (d.ticker && d.ticker.text) items.push('<span class="ticker-item custom">📣 ' + esc(d.ticker.text) + '</span>');
  list.forEach(function (a) {
    var isNew = now - parseDate(a.published_at).getTime() <= 3 * 86400000;
    items.push('<a class="ticker-item" href="' + esc(link || 'index.html') + '"><span aria-hidden="true">🎉</span>ประกาศผลแล้ว <b>' + esc(a.subject_name) + ' ' + esc(a.class_label) + '</b> เทอม ' + esc(a.term) + '/' + esc(a.year) +
      (isNew ? ' <span class="ticker-new">ใหม่</span>' : '') + ' <span class="ticker-when">' + esc(relTime(a.published_at)) + '</span></a>');
  });
  if (!items.length) return '';
  var body;
  if (mode === 'static') {
    body = '<div class="ticker-static">' + items.map(function (h, i) { return '<div class="ticker-slide' + (i === 0 ? ' show' : '') + '">' + h + '</div>'; }).join('') + '</div>';
  } else {
    var group = items.join('<span class="ticker-sep" aria-hidden="true">✦</span>') + '<span class="ticker-sep" aria-hidden="true">✦</span>';
    body = '<div class="ticker-viewport"><div class="ticker-track" style="animation-duration:' + Math.max(18, items.length * 9) + 's">' +
      '<div class="ticker-group">' + group + '</div><div class="ticker-group" aria-hidden="true">' + group + '</div></div></div>';
  }
  return '<div class="ticker ticker-' + mode + ' no-print" role="region" aria-label="ประกาศผลล่าสุด">' +
    '<div class="ticker-label"><span class="ticker-ic">' + icon('megaphone', 18) + '</span><span class="ticker-lbl-text">ประกาศผล</span></div>' + body + '</div>';
}
var tickerTimer = null;
function mountTicker(host, d, link) {
  if (!host) return;
  host.innerHTML = tickerHtml(d, link);
  document.body.classList.toggle('has-ticker', !!host.innerHTML);
  clearInterval(tickerTimer);
  var slides = host.querySelectorAll('.ticker-slide');
  if (slides.length > 1) {
    var i = 0;
    tickerTimer = setInterval(function () {
      slides[i].classList.remove('show');
      i = (i + 1) % slides.length;
      slides[i].classList.add('show');
    }, 4200);
  }
}
/** ป๊อปอัปประกาศผลใหม่ (ภายใน 3 วัน) แสดงครั้งเดียวต่อการเปิดเบราว์เซอร์ */
function announcePopup(d, loginLink) {
  var now = Date.now();
  var fresh = recentPublished(d).filter(function (a) { return now - parseDate(a.published_at).getTime() <= 3 * 86400000; });
  if (!fresh.length) return;
  var key = 'sa_popup_' + fresh.map(function (a) { return a.ann_id; }).join('.');
  if (Store.get(key)) return;
  Store.set(key, 1);
  var more = fresh.length > 5 ? '<p class="small muted">และอีก ' + (fresh.length - 5) + ' รายการ</p>' : '';
  swal({
    icon: 'announce', title: 'ประกาศผลคะแนนแล้ว!',
    html: '<ul class="swal-list">' + fresh.slice(0, 5).map(function (a) {
      return '<li><span aria-hidden="true">' + esc(a.icon) + '</span><span><b>' + esc(a.subject_name) + ' ' + esc(a.class_label) + '</b><small>เทอม ' + esc(a.term) + '/' + esc(a.year) + ' · ' + esc(relTime(a.published_at)) + '</small></span></li>';
    }).join('') + '</ul>' + more,
    confirmText: loginLink ? 'เข้าสู่ระบบดูคะแนน' : 'รับทราบ', cancelText: loginLink ? 'ไว้ทีหลัง' : null
  }).then(function (ok) { if (ok && loginLink) location.href = loginLink; });
}

/** นับถอยหลังเป็นข้อความ */
function countdownText(iso) {
  var d = parseDate(iso);
  if (!d) return '';
  var ms = d.getTime() - Date.now();
  if (ms <= 0) return 'ถึงเวลาแล้ว';
  var m = Math.floor(ms / 60000), day = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  if (day) return 'อีก ' + day + ' วัน ' + h + ' ชม.';
  if (h) return 'อีก ' + h + ' ชม. ' + mm + ' นาที';
  return 'อีก ' + mm + ' นาที';
}

// ===== เติมไอคอน โลโก้ และส่วนท้ายอัตโนมัติ =====
function hydrate(root) {
  var els = (root || document).querySelectorAll('[data-icon]');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    el.outerHTML = icon(el.getAttribute('data-icon'), Number(el.getAttribute('data-size')) || 20);
  }
}
document.addEventListener('DOMContentLoaded', function () {
  hydrate(document);
  var f = document.querySelectorAll('.footer-text');
  for (var i = 0; i < f.length; i++) f[i].textContent = APP.FOOTER;
  var logos = document.querySelectorAll('img[data-logo]');
  for (var j = 0; j < logos.length; j++) {
    logos[j].onerror = function () { this.outerHTML = '<span style="color:var(--primary)">' + icon('school', 64) + '</span>'; };
    logos[j].src = APP.LOGO;
  }
  var bg = document.querySelectorAll('[data-math]');
  for (var k = 0; k < bg.length; k++) bg[k].insertAdjacentHTML('beforeend', mathSymbols(Number(bg[k].getAttribute('data-math')) || 10, k + 3));
  mountThemeToggle();
  var mf = document.createElement('link');
  mf.rel = 'manifest'; mf.href = 'manifest.webmanifest';
  document.head.appendChild(mf);
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').then(null, function () { });
  }
});
