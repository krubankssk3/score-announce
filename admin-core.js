/* แผงควบคุม (admin.html) — แกนหลัก: สถานะ การนำทาง ตัวช่วยฟอร์ม อ่านไฟล์ Excel · ES5
   ลำดับโหลดใน admin.html: admin-core.js ก่อน แล้วไฟล์ admin-*.js อื่น (ลำดับใดก็ได้) */
var sess = requireRole(['admin', 'teacher']);
var isAdmin = !!sess && sess.role === 'admin';
var main = $('main');
var opt = null;
var dirty = false;
var lastHash = location.hash, skipNext = false;
var retryFn = null;
var TERMS = [{ v: '1', t: 'ภาคเรียนที่ 1' }, { v: '2', t: 'ภาคเรียนที่ 2' }];
var STU_STATUS = ['กำลังศึกษา', 'ย้ายออก', 'จบการศึกษา', 'พักการเรียน'];

/** เริ่มแผงควบคุม — เรียกหลังโหลดสคริปต์ admin-*.js ครบทุกไฟล์ */
function admStart() {
  $('whoName').textContent = sess.name;
  $('whoRole').textContent = roleLabel(sess.role);
  if (!isAdmin) $('brandTitle').textContent = 'แผงควบคุมครูผู้สอน';
  $('btnLogout').onclick = logout;
  mountUserMenu($('btnUser'), sess);

  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('hashchange', function () {
    if (skipNext) { skipNext = false; return; }
    if (dirty && !window.confirm('มีคะแนนที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่')) {
      skipNext = true; location.hash = lastHash; return;
    }
    dirty = false; lastHash = location.hash; route();
  });
  main.addEventListener('click', function (e) { if (closestEl(e.target, '[data-retry]') && retryFn) retryFn(); });

  boot();
}
document.addEventListener('DOMContentLoaded', function () { if (sess) admStart(); });

function boot() {
  retryFn = boot;
  main.innerHTML = loadingBlock();
  swr('options', {}, function (o) {
    var first = !opt;
    opt = o;
    if (first) route();
  }).catch(function (e) { main.innerHTML = errorBlock(e.message); });
}
function refreshOptions() { return api('options').then(function (o) { opt = o; }); }

function route() {
  var h = location.hash.replace(/^#/, '');
  var parts = h.split('?');
  var name = parts[0] || 'home';
  var params = parseQuery(parts[1] || '');
  if (!isAdmin && ['announce', 'students', 'settings', 'line', 'rollover', 'setup'].indexOf(name) > -1) name = 'home';
  var views = { home: viewHome, setup: viewSetup, reviews: viewReviews, scores: viewScores, schemes: viewSchemes, line: viewLine, rollover: viewRollover, report: viewReport, announce: viewAnnounce, students: viewStudents, stats: viewStats, settings: viewSettings, activity: viewActivity };
  document.onkeydown = null;
  document.body.classList.remove('print-report');
  document.body.classList.toggle('wide', ['scores', 'report'].indexOf(name) > -1);
  (views[name] || viewHome)(params);
  enter(main);
  window.scrollTo(0, 0);
}

// ===== ตัวช่วยฟอร์ม =====
function extend(a, b) { var o = {}, k; for (k in a) if (a.hasOwnProperty(k)) o[k] = a[k]; for (k in b) if (b.hasOwnProperty(k)) o[k] = b[k]; return o; }
function norm(list) { return list.map(function (x) { return typeof x === 'object' ? x : { v: x, t: x }; }); }
function optionsHtml(list, val) {
  return norm(list).map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(val) ? ' selected' : '') + '>' + esc(o.t) + '</option>'; }).join('');
}
function selectField(id, label, list, val, cls) {
  return '<div class="field ' + (cls || '') + '"><label for="' + id + '">' + esc(label) + '</label><select class="select" id="' + id + '">' + optionsHtml(list, val) + '</select></div>';
}
function inputField(id, label, val, attrs, cls) {
  return '<div class="field ' + (cls || '') + '"><label for="' + id + '">' + esc(label) + '</label><input class="input" id="' + id + '" value="' + esc(val === null || val === undefined ? '' : val) + '" ' + (attrs || '') + '></div>';
}
function toLocalInput(iso) {
  var d = parseDate(iso);
  if (!d) return '';
  function p2(n) { return ('0' + n).slice(-2); }
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes());
}
function yearList() { return opt.settings.years.slice().reverse(); }
function levelList() { return opt.settings.levels.slice(); }
function roomList(level) { return (opt.rooms[level] || []).slice(); }
function subjectList(level) {
  return opt.subjects.filter(function (s) { return !level || !s.levels.length || s.levels.indexOf(level) > -1; })
    .map(function (s) { return { v: s.subject_id, t: s.icon + ' ' + s.name }; });
}
function lineText(line) {
  if (!line) return '';
  var p = line.personal && line.personal.sent ? ' · ส่งผลรายบุคคลทาง LINE ' + line.personal.sent + ' บัญชี' : '';
  if (line.sent) return ' · แจ้งกลุ่ม LINE แล้ว ' + line.sent + ' กลุ่ม' + p;
  if (p) return p;
  if (line.errors && line.errors.length) return ' · แจ้ง LINE ไม่สำเร็จ: ' + line.errors[0];
  return ' · ไม่มีกลุ่ม LINE ที่ผูกกับห้องนี้';
}
function head(title, sub) {
  return '<a class="back" href="#home">' + icon('chevron-left', 18) + 'กลับหน้าหลัก</a><h1 class="page-title">' + esc(title) + '</h1>' + (sub ? '<p class="page-sub">' + esc(sub) + '</p>' : '');
}
function setHashSilently(h) {
  if (history.replaceState) { history.replaceState(null, '', h); lastHash = location.hash; }
}
function actIcon(type) {
  return ({ score: ['pencil', 't-blue'], announce: ['megaphone', 't-green'], student: ['user-plus', 't-amber'], settings: ['settings', 't-slate'], user: ['key', 't-slate'] })[type] || ['activity', 't-cyan'];
}
function actItem(a) {
  var m = actIcon(a.type);
  return '<div class="li"><span class="tint ' + m[1] + '">' + icon(m[0], 18) + '</span><span class="li-main"><span class="li-title">' + esc(a.message) + '</span><span class="li-sub">' + esc(relTime(a.time)) + (a.username ? ' · ' + esc(a.username) : '') + '</span></span></div>';
}
function stuBadge(st) { return '<span class="badge ' + (st === 'กำลังศึกษา' ? 'b-green' : 'b-slate') + '">' + esc(st) + '</span>'; }

// ===== อ่านไฟล์ Excel/CSV และเก็บต้นฉบับใน Drive =====
function readSheetFile(file) {
  return new Promise(function (resolve, reject) {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { reject(new Error('รองรับเฉพาะไฟล์ .xlsx .xls หรือ .csv')); return; }
    if (file.size > 5 * 1024 * 1024) { reject(new Error('ไฟล์ต้องมีขนาดไม่เกิน 5 MB')); return; }
    var fr = new FileReader();
    fr.onerror = function () { reject(new Error('อ่านไฟล์ไม่สำเร็จ')); };
    fr.onload = function () {
      try {
        if (!window.XLSX) throw new Error('ตัวอ่านไฟล์ Excel ยังโหลดไม่เสร็จ ลองใหม่อีกครั้ง');
        var buf = new Uint8Array(fr.result);
        var wb = window.XLSX.read(buf, { type: 'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var tsv = window.XLSX.utils.sheet_to_csv(ws, { FS: '\t', blankrows: false, rawNumbers: true });
        var bin = '', CH = 0x8000;
        for (var i = 0; i < buf.length; i += CH) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
        resolve({ tsv: tsv, base64: btoa(bin), name: file.name, mime: file.type || 'application/octet-stream' });
      } catch (e) { reject(e); }
    };
    fr.readAsArrayBuffer(file);
  });
}
function dropZone(id) {
  return '<label class="drop" id="' + id + '"><input type="file" accept=".xlsx,.xls,.csv">' + icon('upload', 26) +
    '<b>ลากไฟล์ Excel/CSV มาวาง หรือแตะเพื่อเลือกไฟล์</b><span class="small">ไฟล์ต้นฉบับจะถูกเก็บไว้ในโฟลเดอร์ของระบบบน Google Drive</span></label>';
}
function bindDrop(id, onFile) {
  var z = $(id);
  if (!z) return;
  var inp = z.querySelector('input');
  inp.onchange = function () { if (inp.files[0]) onFile(inp.files[0]); inp.value = ''; };
  z.addEventListener('dragover', function (e) { e.preventDefault(); z.classList.add('over'); });
  z.addEventListener('dragleave', function () { z.classList.remove('over'); });
  z.addEventListener('drop', function (e) {
    e.preventDefault(); z.classList.remove('over');
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  });
}
function archive(kind, f) {
  if (!f) return;
  api('archive_file', { kind: kind, name: f.name, mime: f.mime, data: f.base64 })
    .then(function () { toast('เก็บไฟล์ต้นฉบับ ' + f.name + ' ไว้ใน Google Drive แล้ว'); })
    .catch(function (e) { toast('เก็บไฟล์ใน Drive ไม่สำเร็จ: ' + e.message, 'err'); });
}
