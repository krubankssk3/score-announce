/**
 * ระบบประกาศผลคะแนน รายวิชาคณิตศาสตร์ — โรงเรียนบ้านละลม
 * Backend: Google Apps Script | ฐานข้อมูล: Google Sheets + Google Drive
 * พัฒนาโดย นายชิติพัทธ์ นิลวรรณ ตำแหน่ง ครู โรงเรียนบ้านละลม สพป.ศรีสะเกษ เขต 3
 *
 * ครั้งแรก: เลือกฟังก์ชัน setup แล้วกด "เรียกใช้" (Run) 1 ครั้ง
 *   - ระบบสร้างโฟลเดอร์ใน Drive: ฐานข้อมูล (Sheet), สำรองข้อมูล, ไฟล์นำเข้า
 *   - ติดตั้งการสำรองข้อมูลอัตโนมัติทุกวันเวลา 02:00 น. (เก็บ 30 ชุดล่าสุด)
 *   - ติดตั้งตัวตรวจประกาศผลตามเวลาที่ตั้งไว้ ทุก 15 นาที
 * เพิ่มคอลัมน์ใหม่: เพิ่มชื่อคอลัมน์ต่อท้าย SCHEMA แล้วรัน migrate
 */

// ===== โครงสร้างชีต (เพิ่มคอลัมน์ใหม่ต่อท้ายเท่านั้น) =====
const SCHEMA = {
  Settings: ['key', 'value'],
  Users: ['username', 'password_hash', 'salt', 'display_name', 'role', 'subjects', 'active', 'created_at'],
  Students: ['citizen_id', 'prefix', 'first_name', 'last_name', 'level', 'room', 'number', 'status', 'updated_at'],
  Subjects: ['subject_id', 'name', 'type', 'icon', 'levels', 'work_max', 'exam_max', 'grade_term2', 'active'],
  Scores: ['year', 'term', 'citizen_id', 'level', 'room', 'subject_id', 'work', 'exam', 'total', 'updated_by', 'updated_at', 'parts'],
  Schemes: ['scheme_id', 'year', 'term', 'subject_id', 'components', 'show_total', 'show_grade', 'grade_mode', 'note', 'updated_by', 'updated_at'],
  Announcements: ['ann_id', 'year', 'term', 'level', 'room', 'subject_id', 'status', 'expected_date', 'published_at', 'note', 'updated_at', 'publish_at'],
  Activity: ['timestamp', 'username', 'type', 'message'],
  LineGroups: ['group_id', 'name', 'classes', 'active', 'bound_by', 'bound_at', 'last_sent_at'],
  LineUsers: ['user_id', 'citizen_id', 'linked_at', 'last_push_at'],
  Homerooms: ['year', 'level', 'room', 'teacher1', 'teacher2', 'updated_at']
};

// คอลัมน์ที่ต้องเก็บเป็นข้อความ (กันเลขบัตรกลายเป็นตัวเลข/รายการคั่นจุลภาคถูกแปลง)
const TEXT_COLUMNS = {
  Settings: ['value'],
  Users: ['username', 'subjects'],
  Students: ['citizen_id', 'room'],
  Subjects: ['subject_id', 'levels'],
  Scores: ['citizen_id', 'room', 'subject_id', 'parts'],
  Schemes: ['scheme_id', 'subject_id', 'components', 'note'],
  LineGroups: ['group_id', 'classes'],
  LineUsers: ['user_id', 'citizen_id'],
  Homerooms: ['room'],
  Announcements: ['ann_id', 'room', 'subject_id', 'expected_date']
};

const DEFAULT_SETTINGS = {
  school_name: 'โรงเรียนบ้านละลม',
  current_year: '2569',
  current_term: '1',
  years: '2568,2569',
  levels: 'ป.1,ป.2,ป.3,ป.4,ป.5,ป.6',
  term1_label: 'พ.ค. — ก.ย.',
  term2_label: 'พ.ย. — มี.ค.',
  ticker_mode: 'rtl',
  ticker_days: '14',
  ticker_text: '',
  line_site_url: '',
  line_auto: 'TRUE',
  line_personal: 'TRUE',
  line_personal_push: 'FALSE',
  line_always_id: 'TRUE',
  line_menu: '',
  report_signers: ''
};
const TICKER_MODES = ['rtl', 'ltr', 'static', 'off'];

const DEFAULT_SUBJECTS = [
  { subject_id: 'MATH', name: 'คณิตศาสตร์พื้นฐาน', type: 'วิชาแกน', icon: '📐', levels: 'ป.1,ป.2,ป.3,ป.4,ป.5,ป.6', work_max: 70, exam_max: 30, grade_term2: true, active: true },
  { subject_id: 'MATHX', name: 'วิชาเสริมทักษะคณิตศาสตร์', type: 'วิชาเสริม', icon: '🧮', levels: 'ป.1,ป.2,ป.3,ป.4,ป.5,ป.6', work_max: 70, exam_max: 30, grade_term2: false, active: true }
];

const STATUSES = ['pending', 'in_progress', 'published'];
const STATUS_TH = { pending: 'รอประกาศ', in_progress: 'กำลังดำเนินการ', published: 'ประกาศแล้ว' };
const SESSION_TTL = 21600; // 6 ชั่วโมง
const STAFF = ['admin', 'teacher'];
const ADMIN = ['admin'];
const STUDENT = ['student'];

// ===== ติดตั้ง / ปรับโครงสร้าง =====
function setup() {
  const ss = ss_(true);
  Object.keys(SCHEMA).forEach(function (name) {
    if (!ss.getSheetByName(name)) {
      const sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold').setBackground('#ecfeff');
      sh.setFrozenRows(1);
    }
  });
  migrate();

  const st = readTable_('Settings');
  const have = {};
  st.rows.forEach(function (r) { have[S(r.key)] = true; });
  let changed = false;
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
    if (!have[k]) { st.rows.push({ key: k, value: DEFAULT_SETTINGS[k] }); changed = true; }
  });
  if (changed) writeTable_(st);

  const sub = readTable_('Subjects');
  if (!sub.rows.length) { sub.rows = DEFAULT_SUBJECTS.slice(); writeTable_(sub); }

  const us = readTable_('Users');
  if (!us.rows.some(function (u) { return S(u.role) === 'admin'; })) {
    const salt = Utilities.getUuid();
    us.rows.push({ username: 'admin', password_hash: hash_('admin1234', salt), salt: salt, display_name: 'ครูแบงค์', role: 'admin', subjects: '', active: true, created_at: new Date() });
    writeTable_(us);
  }
  const root = rootFolder_();
  backupFolder_();
  importFolder_();
  try {
    const file = DriveApp.getFileById(ss.getId());
    let inside = false;
    const parents = file.getParents();
    while (parents.hasNext()) { if (parents.next().getId() === root.getId()) inside = true; }
    if (!inside) file.moveTo(root);
  } catch (e) { Logger.log('ย้าย Sheet เข้าโฟลเดอร์ไม่สำเร็จ: ' + e.message); }
  installTriggers();
  Logger.log('โฟลเดอร์ระบบใน Drive: ' + root.getUrl());
  Logger.log('ติดตั้งเรียบร้อย — ผู้ใช้เริ่มต้น admin / admin1234 (เปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบ)');
}

function migrate() {
  const ss = ss_();
  Object.keys(SCHEMA).forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const lastCol = Math.max(sh.getLastColumn(), 1);
    const head = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return S(h); });
    const missing = SCHEMA[name].filter(function (h) { return head.indexOf(h) < 0; });
    if (missing.length) {
      const empty = head.every(function (h) { return !h; });
      sh.getRange(1, empty ? 1 : lastCol + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    }
  });
  applyTextFormats_();
}

/** ใช้เมื่อลืมรหัสผ่านผู้ดูแล: รีเซ็ตผู้ใช้ admin เป็น admin1234 */
function resetAdminPassword() {
  const us = readTable_('Users');
  let u = us.rows.filter(function (x) { return S(x.username) === 'admin'; })[0];
  if (!u) { u = { username: 'admin', display_name: 'ผู้ดูแลระบบ', role: 'admin', subjects: '', created_at: new Date() }; us.rows.push(u); }
  u.salt = Utilities.getUuid();
  u.password_hash = hash_('admin1234', u.salt);
  u.active = true;
  u.role = 'admin';
  writeTable_(us);
  Logger.log('รีเซ็ตรหัสผ่าน admin เป็น admin1234 แล้ว');
}

// ===== ฐานข้อมูล (Google Sheets) และไฟล์ (Google Drive) =====
let SS_CACHE = null;
function ss_(create) {
  if (SS_CACHE) return SS_CACHE;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SPREADSHEET_ID');
  if (id) { SS_CACHE = SpreadsheetApp.openById(id); return SS_CACHE; }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) { props.setProperty('SPREADSHEET_ID', active.getId()); SS_CACHE = active; return active; }
  if (!create) throw new Error('ยังไม่ได้เชื่อมฐานข้อมูล กรุณารันฟังก์ชัน setup ใน Apps Script');
  SS_CACHE = SpreadsheetApp.create('ฐานข้อมูล - ระบบประกาศผลคะแนน');
  props.setProperty('SPREADSHEET_ID', SS_CACHE.getId());
  return SS_CACHE;
}

function folder_(prop, name, parent) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(prop);
  if (id) {
    try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) { /* สร้างใหม่ */ }
  }
  const f = parent ? parent.createFolder(name) : DriveApp.createFolder(name);
  props.setProperty(prop, f.getId());
  return f;
}
function rootFolder_() { return folder_('ROOT_FOLDER_ID', 'ระบบประกาศผลคะแนน - โรงเรียนบ้านละลม'); }
function backupFolder_() { return folder_('BACKUP_FOLDER_ID', 'สำรองข้อมูล', rootFolder_()); }
function importFolder_() { return folder_('IMPORT_FOLDER_ID', 'ไฟล์นำเข้า', rootFolder_()); }

function hasTrigger_(fn) {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === fn; });
}
/** ติดตั้งงานอัตโนมัติ: สำรองข้อมูลรายวัน + ประกาศผลตามเวลา (setup เรียกให้แล้ว) */
function installTriggers() {
  if (!hasTrigger_('dailyBackup')) ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(2).create();
  if (!hasTrigger_('autoPublish')) ScriptApp.newTrigger('autoPublish').timeBased().everyMinutes(15).create();
  if (!hasTrigger_('onSheetEdit')) ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(ss_().getId()).onEdit().create();
}
function installBackupTrigger() { installTriggers(); }

/** ประกาศผลรายการที่ตั้งเวลาไว้และถึงเวลาแล้ว (ทำงานทุก 15 นาที) */
function autoPublish() {
  const done = withLock_(function () {
    const ctx = new Ctx(true);
    const at = ctx.t('Announcements');
    if (at.headers.indexOf('publish_at') < 0) return [];
    const now = new Date();
    const done = [];
    at.rows.forEach(function (a) {
      if (!(a.publish_at instanceof Date) || S(a.status) === 'published' || a.publish_at > now) return;
      a.status = 'published';
      a.published_at = now;
      a.updated_at = now;
      a.publish_at = '';
      done.push(annOut_(a, ctx));
    });
    if (!done.length) return done;
    writeTable_(at);
    done.forEach(function (o) { log_('ระบบอัตโนมัติ', 'announce', 'ประกาศผลตามเวลาที่ตั้งไว้ ' + o.subject_name + ' ' + o.class_label + ' เทอม ' + o.term); });
    return done;
  });
  if (done.length) lineAutoNotify_(done);
}
function parseLocalDateTime_(v) {
  const str = S(v);
  if (!str) return '';
  const d = Utilities.parseDate(str.slice(0, 16), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm");
  if (isNaN(d.getTime())) throw new Error('รูปแบบวันเวลาประกาศอัตโนมัติไม่ถูกต้อง');
  return d;
}
function dailyBackup() { backup_('อัตโนมัติ'); }

/** สำรองทั้งไฟล์เป็น .xlsx ลงโฟลเดอร์ "สำรองข้อมูล" (ไม่คัดลอกสคริปต์ติดไปด้วย) */
function backup_(label) {
  const ss = ss_();
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  const res = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('สำรองข้อมูลไม่สำเร็จ (รหัส ' + res.getResponseCode() + ')');
  const file = backupFolder_().createFile(res.getBlob().setName('สำรอง_' + stamp + (label ? '_' + label : '') + '.xlsx'));
  pruneBackups_(30);
  return { name: file.getName(), url: file.getUrl(), date: new Date().toISOString() };
}
function listBackups_(n) {
  const out = [];
  const it = backupFolder_().getFiles();
  while (it.hasNext()) {
    const f = it.next();
    out.push({ name: f.getName(), url: f.getUrl(), date: f.getDateCreated().toISOString(), size: f.getSize() });
  }
  out.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  return n ? out.slice(0, n) : out;
}
function pruneBackups_(keep) {
  const files = [];
  const it = backupFolder_().getFiles();
  while (it.hasNext()) files.push(it.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  files.slice(keep).forEach(function (f) { f.setTrashed(true); });
}

function driveInfo_() {
  return {
    folder_url: rootFolder_().getUrl(), sheet_url: ss_().getUrl(), backups: listBackups_(8),
    auto_backup: hasTrigger_('dailyBackup'), auto_publish: hasTrigger_('autoPublish')
  };
}
function backupNow_(req, sess) {
  const b = backup_('ด้วยตนเอง');
  log_(sess.username, 'settings', 'สำรองข้อมูลลง Google Drive (' + b.name + ')');
  return driveInfo_();
}

/** เก็บไฟล์ต้นฉบับที่อัปโหลด (Excel/CSV) ไว้ใน Drive เพื่อตรวจย้อนหลัง */
function archiveFile_(req, sess) {
  const kind = S(req.kind) === 'students' ? 'students' : 'scores';
  if (kind === 'students' && sess.role !== 'admin') throw codeErr_('FORBIDDEN', 'บัญชีนี้ไม่มีสิทธิ์นำเข้ารายชื่อนักเรียน');
  const b64 = String(req.data || '');
  if (!b64) throw new Error('ไม่พบข้อมูลไฟล์');
  if (b64.length > 7000000) throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 5 MB');
  const safe = S(req.name).replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'upload';
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  const sub = kind === 'students' ? folder_('IMPORT_STUDENTS_ID', 'รายชื่อนักเรียน', importFolder_()) : folder_('IMPORT_SCORES_ID', 'คะแนน', importFolder_());
  const file = sub.createFile(Utilities.newBlob(Utilities.base64Decode(b64), S(req.mime) || 'application/octet-stream', stamp + '_' + sess.username + '_' + safe));
  log_(sess.username, kind === 'students' ? 'student' : 'score', 'อัปโหลดไฟล์ ' + safe + ' เก็บไว้ใน Drive');
  return { name: file.getName(), url: file.getUrl() };
}

function applyTextFormats_() {
  const ss = ss_();
  Object.keys(TEXT_COLUMNS).forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastColumn() < 1) return;
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return S(h); });
    TEXT_COLUMNS[name].forEach(function (col) {
      const c = head.indexOf(col) + 1;
      if (c > 0) sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat('@');
    });
  });
}

// ===== Web App =====
function doGet() {
  return json_({ ok: true, data: ping_() });
}
function ping_() {
  const o = { service: 'score-announce', version: '2026.09', time: new Date().toISOString(), database: false };
  try { o.database = !!ss_().getSheetByName('Students'); } catch (e) { o.database_error = e.message; }
  return o;
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (Array.isArray(req.events) && req.destination !== undefined) return json_({ ok: true, data: lineWebhook_(req) });
    out = { ok: true, data: route_(req) };
  } catch (err) {
    out = { ok: false, error: (err && err.message) || String(err), code: (err && err.code) || '' };
  }
  return json_(out);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

const ROUTES = {
  login_student: { fn: loginStudent_ },
  login_staff: { fn: loginStaff_ },
  logout: { fn: logout_ },
  status: { fn: status_ },
  my_results: { roles: STUDENT, fn: myResults_ },
  options: { roles: STAFF, fn: options_ },
  dashboard: { roles: STAFF, fn: dashboard_ },
  view_results: { roles: STAFF, fn: viewResults_ },
  get_score_sheet: { roles: STAFF, fn: getScoreSheet_ },
  save_scores: { roles: STAFF, fn: saveScores_ },
  search_students: { roles: STAFF, fn: searchStudents_ },
  stats: { roles: STAFF, fn: stats_ },
  activity: { roles: STAFF, fn: activity_ },
  change_password: { roles: STAFF, fn: changePassword_ },
  list_announcements: { roles: ADMIN, fn: listAnnouncements_ },
  save_announcement: { roles: ADMIN, fn: saveAnnouncement_ },
  set_announcement_status: { roles: ADMIN, fn: setAnnouncementStatus_ },
  delete_announcement: { roles: ADMIN, fn: deleteAnnouncement_ },
  list_students: { roles: ADMIN, fn: listStudents_ },
  save_student: { roles: ADMIN, fn: saveStudent_ },
  delete_student: { roles: ADMIN, fn: deleteStudent_ },
  import_students: { roles: ADMIN, fn: importStudents_ },
  get_settings: { roles: ADMIN, fn: getSettingsAdmin_ },
  save_settings: { roles: ADMIN, fn: saveSettings_ },
  list_users: { roles: ADMIN, fn: listUsers_ },
  save_user: { roles: ADMIN, fn: saveUser_ },
  save_subject: { roles: ADMIN, fn: saveSubject_ },
  get_scheme: { roles: STAFF, fn: getScheme_ },
  save_scheme: { roles: STAFF, fn: saveScheme_ },
  reset_scheme: { roles: STAFF, fn: resetScheme_ },
  ping: { fn: ping_ },
  line_info: { roles: ADMIN, fn: lineInfo_ },
  line_save_config: { roles: ADMIN, fn: lineSaveConfig_ },
  line_bind_code: { roles: ADMIN, fn: lineBindCode_ },
  line_group_save: { roles: ADMIN, fn: lineGroupSave_ },
  line_group_delete: { roles: ADMIN, fn: lineGroupDelete_ },
  line_test: { roles: ADMIN, fn: lineTest_ },
  line_notify: { roles: ADMIN, fn: lineNotifyManual_ },
  line_unlink_all: { roles: ADMIN, fn: lineUnlinkAll_ },
  line_save_menu: { roles: ADMIN, fn: lineSaveMenu_ },
  rollover_info: { roles: ADMIN, fn: rolloverInfo_ },
  report_data: { roles: STAFF, fn: reportData_ },
  report_signers_save: { roles: ADMIN, fn: reportSignersSave_ },
  homeroom_save: { roles: STAFF, fn: homeroomSave_ },
  rollover_run: { roles: ADMIN, fn: rolloverRun_ },
  rollover_undo: { roles: ADMIN, fn: rolloverUndo_ },
  line_richmenu_install: { roles: ADMIN, fn: lineRichMenuInstall_ },
  line_richmenu_remove: { roles: ADMIN, fn: lineRichMenuRemove_ },
  publish_many: { roles: ADMIN, fn: publishMany_ },
  batch: { fn: batch_ },
  clear_cache: { roles: ADMIN, fn: function (req, sess) { clearCache(); log_(sess.username, 'settings', 'ล้างแคชข้อมูล'); return true; } },
  drive_info: { roles: ADMIN, fn: driveInfo_ },
  backup_now: { roles: ADMIN, fn: backupNow_ },
  archive_file: { roles: STAFF, fn: archiveFile_ }
};

/** รวมหลายคำสั่งในการเรียกครั้งเดียว (ลดเวลารอเครือข่าย) */
function batch_(req) {
  return (req.calls || []).slice(0, 8).map(function (c) {
    try {
      if (!c || c.action === 'batch') throw new Error('คำสั่งไม่ถูกต้อง');
      const one = {};
      Object.keys(c.data || {}).forEach(function (k) { one[k] = c.data[k]; });
      one.action = c.action;
      one.token = req.token;
      return { ok: true, data: route_(one) };
    } catch (e) {
      return { ok: false, error: (e && e.message) || String(e), code: (e && e.code) || '' };
    }
  });
}

function route_(req) {
  const r = ROUTES[req.action];
  if (!r) throw new Error('ไม่รู้จักคำสั่ง: ' + req.action);
  let sess = null;
  if (r.roles) {
    sess = getSession_(req.token);
    if (!sess) throw codeErr_('AUTH', 'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่');
    if (r.roles.indexOf(sess.role) < 0) throw codeErr_('FORBIDDEN', 'บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้');
  }
  return r.fn(req, sess);
}

// ===== ตัวช่วยทั่วไป =====
function S(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function normId_(v) { return S(v).replace(/\D/g, ''); }
function maskId_(id) { id = normId_(id); return id ? id.charAt(0) + '-xxxx-xxxxx-xx-x' : ''; }
function truthy_(v) { return v === true || v === 1 || /^(true|1|yes|y|ใช่)$/i.test(S(v)); }
function num_(v) { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return isFinite(n) ? n : null; }
function round1_(n) { return Math.round(n * 10) / 10; }
function iso_(v) { if (v instanceof Date) return v.toISOString(); return S(v); }
function dateOnly_(v) { if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd'); return S(v); }
function splitList_(v) { return S(v).split(/[,\n]/).map(function (x) { return x.trim(); }).filter(String); }
function codeErr_(code, msg) { const e = new Error(msg); e.code = code; return e; }
function newId_(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36); }
function isActiveStudent_(s) { const st = S(s.status); return !!normId_(s.citizen_id) && (!st || st === 'กำลังศึกษา'); }
function classLabel_(l, r) { return S(l) + '/' + S(r); }
function annKey_(y, t, l, r, sid) { return [S(y), S(t), S(l), S(r), S(sid)].join('|'); }
function roomCmp_(a, b) { return (Number(a) || 0) - (Number(b) || 0) || String(a).localeCompare(String(b)); }
function fullName_(s) {
  const p = S(s.prefix);
  return (p ? p + (/\.$/.test(p) ? ' ' : '') : '') + S(s.first_name) + ' ' + S(s.last_name);
}
function hash_(pw, salt) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '::' + pw, Utilities.Charset.UTF_8);
  return raw.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function gradeOf_(pct) {
  if (pct >= 80) return '4';
  if (pct >= 75) return '3.5';
  if (pct >= 70) return '3';
  if (pct >= 65) return '2.5';
  if (pct >= 60) return '2';
  if (pct >= 55) return '1.5';
  if (pct >= 50) return '1';
  return '0';
}
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function log_(user, type, msg) {
  try { getSheet_('Activity').appendRow([new Date(), user, type, msg]); invalidate_('Activity'); } catch (e) { /* ไม่ให้ log ทำให้งานหลักล้ม */ }
}

// ===== อ่าน/เขียนตาราง =====
function getSheet_(name) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh && SCHEMA[name]) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold').setBackground('#ecfeff');
    sh.setFrozenRows(1);
    (TEXT_COLUMNS[name] || []).forEach(function (col) {
      const c = SCHEMA[name].indexOf(col) + 1;
      if (c > 0) sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat('@');
    });
  }
  if (!sh) throw new Error('ไม่พบชีต ' + name + ' กรุณารันฟังก์ชัน setup ใน Apps Script ก่อน');
  return sh;
}

function readTable_(name) {
  const sh = getSheet_(name);
  const values = sh.getDataRange().getValues();
  const headers = (values[0] || []).map(function (h) { return S(h); });
  // เติมคอลัมน์ที่ขาดต่อท้ายอัตโนมัติ (กันข้อมูลใหม่หายเมื่อยังไม่ได้รัน migrate)
  const missing = (SCHEMA[name] || []).filter(function (h) { return headers.indexOf(h) < 0; });
  if (missing.length) {
    const empty = headers.every(function (h) { return !h; });
    const start = empty ? 1 : headers.length + 1;
    sh.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold');
    (TEXT_COLUMNS[name] || []).forEach(function (col) {
      const k = missing.indexOf(col);
      if (k > -1) sh.getRange(1, start + k, sh.getMaxRows(), 1).setNumberFormat('@');
    });
    if (empty) headers.length = 0;
    missing.forEach(function (h) { headers.push(h); });
  }
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r.some(function (c) { return c !== '' && c !== null; })) continue;
    const o = {};
    headers.forEach(function (h, k) { if (h) o[h] = k < r.length ? r[k] : ''; });
    Object.defineProperty(o, '__row', { value: i + 1, enumerable: false, writable: true, configurable: true });
    rows.push(o);
  }
  return { name: name, sh: sh, headers: headers, rows: rows };
}

function writeTable_(t) {
  const sh = t.sh, h = t.headers, n = h.length;
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, n).clearContent();
  if (t.rows.length) {
    const data = t.rows.map(function (o) { return rowVals_(o, h); });
    sh.getRange(2, 1, data.length, n).setValues(data);
    t.rows.forEach(function (o, k) { Object.defineProperty(o, '__row', { value: k + 2, enumerable: false, writable: true, configurable: true }); });
  }
  invalidate_(t.name);
}
function rowVals_(o, h) {
  return h.map(function (k) { return (k && o[k] !== undefined && o[k] !== null) ? o[k] : ''; });
}
/** เขียนเฉพาะแถวที่เปลี่ยน (เร็วกว่าเขียนทั้งตารางมากเมื่อข้อมูลเยอะ) */
function writeRows_(t, changed) {
  const sh = t.sh, h = t.headers, n = h.length;
  const old = changed.filter(function (o) { return o.__row; });
  const neu = changed.filter(function (o) { return !o.__row; });
  if (old.length) {
    const byRow = {};
    t.rows.forEach(function (o) { if (o.__row) byRow[o.__row] = o; });
    const nums = old.map(function (o) { return o.__row; });
    const min = Math.min.apply(null, nums), max = Math.max.apply(null, nums);
    const data = [];
    for (let r = min; r <= max; r++) data.push(byRow[r] ? rowVals_(byRow[r], h) : h.map(function () { return ''; }));
    sh.getRange(min, 1, data.length, n).setValues(data);
  }
  if (neu.length) {
    const start = sh.getLastRow() + 1;
    sh.getRange(start, 1, neu.length, n).setValues(neu.map(function (o) { return rowVals_(o, h); }));
    neu.forEach(function (o, k) { Object.defineProperty(o, '__row', { value: start + k, enumerable: false, writable: true, configurable: true }); });
  }
  invalidate_(t.name);
}

// ===== แคชข้อมูล (ทำให้โหลดเร็ว: อ่านชีตจริงเฉพาะเมื่อข้อมูลเปลี่ยน) =====
const MEM = {};
const CACHE_TTL = 21600;
const CHUNK = 25000;
function tableVer_(name) {
  const c = CacheService.getScriptCache();
  let v = c.get('tv:' + name);
  if (!v) { v = Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); c.put('tv:' + name, v, CACHE_TTL); }
  return v;
}
function invalidate_(name) {
  delete MEM[name];
  try { CacheService.getScriptCache().remove('tv:' + name); } catch (e) { /* ไม่เป็นไร */ }
}
/** ล้างแคชทั้งหมด (รันเองได้ หรือกดปุ่มในหน้าตั้งค่า) */
function clearCache() {
  Object.keys(SCHEMA).forEach(invalidate_);
  return true;
}
/** ทริกเกอร์: มีคนแก้ Google Sheet ด้วยมือ → ล้างแคชให้ข้อมูลตรงเสมอ */
function onSheetEdit() { clearCache(); }

function cachedTable_(name) {
  if (MEM[name]) return MEM[name];
  const c = CacheService.getScriptCache();
  const base = 't:' + name + ':' + tableVer_(name);
  try {
    const meta = c.get(base);
    if (meta) {
      const keys = [];
      for (let i = 0; i < Number(meta); i++) keys.push(base + ':' + i);
      const got = c.getAll(keys);
      if (keys.every(function (k) { return got[k] !== undefined && got[k] !== null; })) {
        const obj = JSON.parse(keys.map(function (k) { return got[k]; }).join(''), function (k, v) {
          return (v && typeof v === 'object' && typeof v.$d === 'number') ? new Date(v.$d) : v;
        });
        MEM[name] = { name: name, sh: null, headers: obj.h, rows: obj.r, cached: true };
        return MEM[name];
      }
    }
  } catch (e) { /* อ่านจากชีตแทน */ }
  const t = readTable_(name);
  try {
    const str = JSON.stringify({ h: t.headers, r: t.rows }, function (k, v) {
      const o = this[k];
      return o instanceof Date ? { $d: o.getTime() } : v;
    });
    if (str.length < CHUNK * 150) {
      const put = {};
      let n = 0;
      for (let i = 0; i < str.length; i += CHUNK) put[base + ':' + (n++)] = str.slice(i, i + CHUNK);
      put[base] = String(n);
      c.putAll(put, CACHE_TTL);
    }
  } catch (e) { /* แคชไม่ได้ก็ไม่เป็นไร */ }
  MEM[name] = t;
  return t;
}

class Ctx {
  /** fresh = true สำหรับงานเขียนข้อมูล (อ่านจากชีตจริงภายใต้ lock) */
  constructor(fresh) { this.c = {}; this.m = {}; this.fresh = !!fresh; }
  t(name) { return this.c[name] || (this.c[name] = this.fresh ? readTable_(name) : cachedTable_(name)); }
  memo(key, fn) { if (!(key in this.m)) this.m[key] = fn(); return this.m[key]; }
}

function getSettings_(ctx) {
  const s = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { s[k] = DEFAULT_SETTINGS[k]; });
  ctx.t('Settings').rows.forEach(function (r) { if (S(r.key)) s[S(r.key)] = S(r.value); });
  return s;
}

function publicSettings_(s) {
  const years = splitList_(s.years);
  if (years.indexOf(S(s.current_year)) < 0) years.push(S(s.current_year));
  years.sort();
  return {
    school_name: s.school_name, current_year: S(s.current_year), current_term: S(s.current_term) === '2' ? '2' : '1',
    years: years, levels: splitList_(s.levels), term1_label: s.term1_label, term2_label: s.term2_label,
    ticker_mode: TICKER_MODES.indexOf(S(s.ticker_mode)) > -1 ? S(s.ticker_mode) : 'rtl',
    ticker_days: Math.min(Math.max(Number(s.ticker_days) || 14, 1), 90), ticker_text: S(s.ticker_text)
  };
}

function subjects_(ctx) {
  return ctx.memo('subjects', function () {
    return ctx.t('Subjects').rows.filter(function (r) { return S(r.subject_id); }).map(function (r) {
      const w = num_(r.work_max), x = num_(r.exam_max);
      return {
        subject_id: S(r.subject_id), name: S(r.name), type: S(r.type) || 'วิชาแกน', icon: S(r.icon) || '📘',
        levels: splitList_(r.levels), work_max: w === null ? 70 : w, exam_max: x === null ? 30 : x,
        grade_term2: truthy_(r.grade_term2), active: S(r.active) === '' ? true : truthy_(r.active)
      };
    });
  });
}
function subjectMap_(ctx) {
  return ctx.memo('subjectMap', function () {
    const m = {};
    subjects_(ctx).forEach(function (x) { m[x.subject_id] = x; });
    return m;
  });
}
function subjectById_(ctx, id) {
  const s = subjectMap_(ctx)[S(id)];
  if (!s) throw new Error('ไม่พบรายวิชา ' + id);
  return s;
}
function canSubject_(sess, id) {
  if (sess.role === 'admin') return true;
  const list = sess.subjects || [];
  return !list.length || list.indexOf(S(id)) > -1;
}
function assertSubject_(sess, id) {
  if (!canSubject_(sess, id)) throw codeErr_('FORBIDDEN', 'คุณไม่ได้รับสิทธิ์ดูแลรายวิชานี้');
}
function showGrade_(subj, term) { return subj.grade_term2 && S(term) === '2'; }

function studentMap_(ctx) {
  return ctx.memo('studentMap', function () {
    const m = {};
    ctx.t('Students').rows.forEach(function (s) { const id = normId_(s.citizen_id); if (id) m[id] = s; });
    return m;
  });
}

function annMap_(ctx) {
  return ctx.memo('annMap', function () {
    const m = {};
    ctx.t('Announcements').rows.forEach(function (a) { m[annKey_(a.year, a.term, a.level, a.room, a.subject_id)] = a; });
    return m;
  });
}
function annOut_(a, ctx) {
  const subj = subjectMap_(ctx)[S(a.subject_id)] || { name: S(a.subject_id), icon: '📘' };
  const st = STATUSES.indexOf(S(a.status)) > -1 ? S(a.status) : 'pending';
  return {
    ann_id: S(a.ann_id), year: S(a.year), term: S(a.term), level: S(a.level), room: S(a.room),
    class_label: classLabel_(a.level, a.room), subject_id: S(a.subject_id), subject_name: subj.name, icon: subj.icon,
    status: st, status_label: STATUS_TH[st], expected_date: dateOnly_(a.expected_date), published_at: iso_(a.published_at),
    note: S(a.note), updated_at: iso_(a.updated_at), publish_at: a.publish_at instanceof Date ? a.publish_at.toISOString() : ''
  };
}
function annOf_(ctx, y, t, l, r, sid) {
  const a = annMap_(ctx)[annKey_(y, t, l, r, sid)];
  return a ? annOut_(a, ctx) : null;
}

// ===== โครงสร้างคะแนน (กำหนดได้อิสระต่อ ปีการศึกษา/ภาคเรียน/รายวิชา) =====
function defaultScheme_(subj, term) {
  return {
    scheme_id: '', is_default: true,
    components: [
      { key: 'work', label: 'คะแนนเก็บ', max: subj.work_max, visible: true },
      { key: 'exam', label: 'คะแนนสอบ', max: subj.exam_max, visible: true }
    ],
    show_total: true, show_grade: showGrade_(subj, term), grade_mode: 'year', note: ''
  };
}
function normScheme_(sc) {
  sc.components = (sc.components || []).filter(function (c) { return S(c.key) && num_(c.max) !== null && num_(c.max) > 0; })
    .map(function (c) { return { key: S(c.key), label: S(c.label) || S(c.key), max: num_(c.max), visible: !(c.visible === false || S(c.visible) === 'false') }; });
  sc.full = sc.components.reduce(function (a, c) { return a + c.max; }, 0);
  sc.visible_full = sc.components.filter(function (c) { return c.visible; }).reduce(function (a, c) { return a + c.max; }, 0);
  sc.grade_mode = sc.grade_mode === 'term' ? 'term' : 'year';
  sc.show_total = sc.show_total !== false;
  sc.show_grade = !!sc.show_grade;
  return sc;
}
function schemeFor_(ctx, year, term, subj) {
  return ctx.memo('sc|' + year + '|' + term + '|' + subj.subject_id, function () {
    const r = ctx.t('Schemes').rows.filter(function (x) {
      return S(x.year) === S(year) && S(x.term) === S(term) && S(x.subject_id) === subj.subject_id;
    })[0];
    if (!r) return normScheme_(defaultScheme_(subj, term));
    let comps = [];
    try { comps = JSON.parse(S(r.components) || '[]'); } catch (e) { comps = []; }
    const sc = normScheme_({
      scheme_id: S(r.scheme_id), is_default: false, components: comps,
      show_total: S(r.show_total) === '' ? true : truthy_(r.show_total), show_grade: truthy_(r.show_grade),
      grade_mode: S(r.grade_mode), note: S(r.note)
    });
    return sc.components.length ? sc : normScheme_(defaultScheme_(subj, term));
  });
}
function partsOf_(r) {
  const raw = S(r.parts);
  if (raw) {
    try { const o = JSON.parse(raw); if (o && typeof o === 'object') return o; } catch (e) { /* ใช้ค่าเดิม */ }
  }
  const o = {};
  if (num_(r.work) !== null) o.work = num_(r.work);
  if (num_(r.exam) !== null) o.exam = num_(r.exam);
  return o;
}
function sumParts_(parts, comps, onlyVisible) {
  let sum = 0, any = false;
  comps.forEach(function (c) {
    if (onlyVisible && !c.visible) return;
    const v = num_(parts[c.key]);
    if (v !== null) { sum += v; any = true; }
  });
  return any ? round1_(sum) : null;
}
function term1PctMap_(ctx, year, subj) {
  return ctx.memo('t1|' + year + '|' + subj.subject_id, function () {
    const sc = schemeFor_(ctx, year, '1', subj);
    const m = {};
    ctx.t('Scores').rows.forEach(function (r) {
      if (S(r.year) !== S(year) || S(r.term) !== '1' || S(r.subject_id) !== subj.subject_id) return;
      const t = sumParts_(partsOf_(r), sc.components, false);
      if (t !== null && sc.full) m[normId_(r.citizen_id)] = t / sc.full * 100;
    });
    return m;
  });
}
function gradeFor_(sc, term, pct, t1pct) {
  if (pct === null || pct === undefined) return null;
  let p = pct;
  if (sc.grade_mode === 'year' && S(term) === '2' && t1pct !== null && t1pct !== undefined) p = (pct + t1pct) / 2;
  return gradeOf_(p);
}

function summarize_(rows, full, field) {
  field = field || 'total';
  const t = rows.map(function (r) { return r[field]; }).filter(function (v) { return v !== null && v !== undefined; });
  if (!t.length) return { students: rows.length, count: 0, avg: null, max: null, min: null, pass: 0, full: full };
  return {
    students: rows.length, count: t.length,
    avg: round1_(t.reduce(function (a, b) { return a + b; }, 0) / t.length),
    max: Math.max.apply(null, t), min: Math.min.apply(null, t),
    pass: full ? t.filter(function (v) { return v / full * 100 >= 50; }).length : 0, full: full
  };
}

function buildClass_(ctx, st, q, subj) {
  const sc = schemeFor_(ctx, q.year, q.term, subj);
  const scores = ctx.t('Scores').rows.filter(function (r) {
    return S(r.year) === S(q.year) && S(r.term) === S(q.term) && S(r.level) === S(q.level) &&
      S(r.room) === S(q.room) && S(r.subject_id) === subj.subject_id;
  });
  const byId = {};
  scores.forEach(function (r) { byId[normId_(r.citizen_id)] = r; });
  const stu = studentMap_(ctx);
  const ids = [];
  if (S(q.year) === S(st.current_year)) {
    ctx.t('Students').rows.forEach(function (s) {
      if (S(s.level) === S(q.level) && S(s.room) === S(q.room) && isActiveStudent_(s)) ids.push(normId_(s.citizen_id));
    });
  }
  Object.keys(byId).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });

  const t1 = (sc.show_grade && sc.grade_mode === 'year' && S(q.term) === '2') ? term1PctMap_(ctx, q.year, subj) : {};
  const rows = ids.map(function (id) {
    const s = stu[id] || {};
    const parts = partsOf_(byId[id] || {});
    const vals = {};
    sc.components.forEach(function (c) { vals[c.key] = num_(parts[c.key]); });
    const total = sumParts_(parts, sc.components, false);
    const pct = (total === null || !sc.full) ? null : total / sc.full * 100;
    return {
      key: id, masked: maskId_(id), number: num_(s.number),
      name: s.first_name ? fullName_(s) : '(ไม่พบข้อมูลนักเรียน)',
      parts: vals, total: total, vtotal: sumParts_(parts, sc.components, true),
      pct: pct === null ? null : round1_(pct), grade: sc.show_grade ? gradeFor_(sc, q.term, pct, t1[id]) : null
    };
  });
  rows.sort(function (a, b) {
    return (a.number === null ? 999 : a.number) - (b.number === null ? 999 : b.number) || a.name.localeCompare(b.name, 'th');
  });
  return { rows: rows, summary: summarize_(rows, sc.full), vsummary: summarize_(rows, sc.visible_full, 'vtotal'), scheme: sc, withGrade: sc.show_grade };
}

// ===== เซสชันและการเข้าสู่ระบบ =====
function newSession_(data) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('s_' + token, JSON.stringify(data), SESSION_TTL);
  return token;
}
function getSession_(token) {
  if (!token || !/^[a-f0-9]{64}$/.test(String(token))) return null;
  const c = CacheService.getScriptCache();
  const v = c.get('s_' + token);
  if (!v) return null;
  c.put('s_' + token, v, SESSION_TTL);
  return JSON.parse(v);
}
function checkThrottle_() {
  const n = Number(CacheService.getScriptCache().get('login_fail') || 0);
  if (n >= 20) throw new Error('มีการกรอกข้อมูลผิดหลายครั้ง กรุณารอ 5 นาทีแล้วลองใหม่');
}
function addFail_() {
  const c = CacheService.getScriptCache();
  c.put('login_fail', String(Number(c.get('login_fail') || 0) + 1), 300);
}

function loginStudent_(req) {
  checkThrottle_();
  const id = normId_(req.citizenId);
  if (id.length !== 13) throw new Error('กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก');
  const ctx = new Ctx();
  const s = studentMap_(ctx)[id];
  if (!s) {
    addFail_();
    throw new Error('ไม่พบเลขบัตรประชาชนนี้ในระบบ ตรวจสอบตัวเลขอีกครั้ง หรือติดต่อครูผู้สอน');
  }
  const name = fullName_(s);
  const token = newSession_({ role: 'student', citizen_id: id, name: name });
  return { token: token, role: 'student', name: name, class_label: classLabel_(s.level, s.room) };
}

function loginStaff_(req) {
  checkThrottle_();
  const username = S(req.username).toLowerCase();
  const pw = String(req.password || '');
  if (!username || !pw) throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  const u = readTable_('Users').rows.filter(function (x) { return S(x.username).toLowerCase() === username; })[0];
  if (!u || !truthy_(u.active === '' ? true : u.active) || hash_(pw, S(u.salt)) !== S(u.password_hash)) {
    addFail_();
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  const role = S(u.role) === 'admin' ? 'admin' : 'teacher';
  const name = S(u.display_name) || username;
  const token = newSession_({ role: role, username: username, name: name, subjects: splitList_(u.subjects) });
  return { token: token, role: role, name: name, username: username };
}

function logout_(req) {
  if (req.token && /^[a-f0-9]{64}$/.test(String(req.token))) CacheService.getScriptCache().remove('s_' + req.token);
  return true;
}

function changePassword_(req, sess) {
  const pw = String(req.new_password || '');
  if (pw.length < 6) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
  return withLock_(function () {
    const us = readTable_('Users');
    const u = us.rows.filter(function (x) { return S(x.username).toLowerCase() === sess.username; })[0];
    if (!u || hash_(String(req.old_password || ''), S(u.salt)) !== S(u.password_hash)) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
    u.salt = Utilities.getUuid();
    u.password_hash = hash_(pw, u.salt);
    writeTable_(us);
    log_(sess.username, 'user', 'เปลี่ยนรหัสผ่านของตนเอง');
    return true;
  });
}

// ===== สาธารณะ: สถานะการประกาศผล =====
function status_(req) {
  const ctx = new Ctx();
  const st = publicSettings_(getSettings_(ctx));
  const year = st.years.indexOf(S(req.year)) > -1 ? S(req.year) : st.current_year;
  const items = ctx.t('Announcements').rows.filter(function (a) { return S(a.year) === year; })
    .map(function (a) { return annOut_(a, ctx); });
  const counts = { published: 0, in_progress: 0, pending: 0, total: items.length };
  const bySubj = {};
  let updated = '';
  items.forEach(function (a) {
    counts[a.status]++;
    if (!bySubj[a.subject_id]) bySubj[a.subject_id] = { subject_id: a.subject_id, name: a.subject_name, icon: a.icon, done: 0, total: 0 };
    bySubj[a.subject_id].total++;
    if (a.status === 'published') bySubj[a.subject_id].done++;
    [a.updated_at, a.published_at].forEach(function (d) { if (d && d > updated) updated = d; });
  });
  const order = { published: 0, in_progress: 1, pending: 2 };
  items.sort(function (a, b) {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    if (a.status === 'published') return a.published_at < b.published_at ? 1 : -1;
    return (a.expected_date || '9999').localeCompare(b.expected_date || '9999') || a.class_label.localeCompare(b.class_label);
  });
  const subjects = Object.keys(bySubj).map(function (k) {
    const s = bySubj[k];
    s.pct = s.total ? Math.round(s.done / s.total * 100) : 0;
    return s;
  });
  const students = ctx.t('Students').rows.filter(isActiveStudent_).length;
  return {
    school: st.school_name, year: year, years: st.years, counts: counts,
    ticker: { mode: st.ticker_mode, days: st.ticker_days, text: st.ticker_text }, now: new Date().toISOString(),
    percent: counts.total ? Math.round(counts.published / counts.total * 100) : 0,
    subjects: subjects, items: items, total_students: students, updated_at: updated
  };
}

// ===== นักเรียน/ผู้ปกครอง =====
function myResults_(req, sess) {
  const out = studentResults_(new Ctx(), sess.citizen_id);
  if (!out) throw codeErr_('AUTH', 'ไม่พบข้อมูลนักเรียน กรุณาเข้าสู่ระบบใหม่');
  return out;
}

/** ผลคะแนนที่ประกาศแล้วของนักเรียน 1 คน (เฉพาะช่องที่ตั้งให้ประกาศ) — ใช้ทั้งเว็บและ LINE */
function studentResults_(ctx, citizenId) {
  const sess = { citizen_id: normId_(citizenId) };
  const st = getSettings_(ctx);
  const s = studentMap_(ctx)[sess.citizen_id];
  if (!s) return null;
  const anns = annMap_(ctx);
  const subjMap = subjectMap_(ctx);
  const results = [];
  ctx.t('Scores').rows.forEach(function (r) {
    if (normId_(r.citizen_id) !== sess.citizen_id) return;
    const a = anns[annKey_(r.year, r.term, r.level, r.room, r.subject_id)];
    if (!a || S(a.status) !== 'published') return;
    const subj = subjMap[S(r.subject_id)];
    if (!subj) return;
    const cls = buildClass_(ctx, st, { year: r.year, term: r.term, level: r.level, room: r.room }, subj);
    const me = cls.rows.filter(function (x) { return x.key === sess.citizen_id; })[0];
    if (!me) return;
    const sc = cls.scheme;
    const vis = sc.components.filter(function (c) { return c.visible; });
    results.push({
      year: S(r.year), term: S(r.term), class_label: classLabel_(r.level, r.room),
      subject_id: subj.subject_id, subject_name: subj.name, icon: subj.icon, type: subj.type,
      components: vis.map(function (c) { return { label: c.label, max: c.max, value: me.parts[c.key] }; }),
      show_total: sc.show_total && vis.length > 1, total: me.vtotal, full: sc.visible_full,
      show_grade: sc.show_grade, grade: sc.show_grade ? me.grade : null, grade_mode: sc.grade_mode,
      class_avg: cls.vsummary.avg, note: sc.note, published_at: iso_(a.published_at)
    });
  });
  results.sort(function (a, b) {
    return Number(b.year) - Number(a.year) || Number(b.term) - Number(a.term) || a.subject_name.localeCompare(b.subject_name, 'th');
  });
  return {
    school: st.school_name,
    student: { name: fullName_(s), class_label: classLabel_(s.level, s.room), number: num_(s.number), masked: maskId_(sess.citizen_id) },
    results: results
  };
}

// ===== ครู/แอดมิน =====
function options_(req, sess) {
  const ctx = new Ctx();
  const levelCounts = {}, rooms = {};
  ctx.t('Students').rows.forEach(function (s) {
    if (!isActiveStudent_(s)) return;
    const l = S(s.level), r = S(s.room);
    if (!l) return;
    levelCounts[l] = (levelCounts[l] || 0) + 1;
    rooms[l] = rooms[l] || [];
    if (r && rooms[l].indexOf(r) < 0) rooms[l].push(r);
  });
  Object.keys(rooms).forEach(function (l) { rooms[l].sort(roomCmp_); });
  return {
    settings: publicSettings_(getSettings_(ctx)),
    subjects: subjects_(ctx).filter(function (x) { return x.active && canSubject_(sess, x.subject_id); }),
    levelCounts: levelCounts, rooms: rooms, line_ready: lineReady_(ctx),
    user: { name: sess.name, role: sess.role, username: sess.username }
  };
}

function recentActivity_(ctx, n) {
  const rows = ctx.t('Activity').rows;
  return rows.slice(Math.max(0, rows.length - n)).reverse().map(function (r) {
    return { time: iso_(r.timestamp), username: S(r.username), type: S(r.type), message: S(r.message) };
  });
}

function dashboard_(req, sess) {
  const ctx = new Ctx();
  const st = publicSettings_(getSettings_(ctx));
  const active = ctx.t('Students').rows.filter(isActiveStudent_);
  const rooms = {};
  active.forEach(function (s) { rooms[classLabel_(s.level, s.room)] = 1; });
  const anns = ctx.t('Announcements').rows.filter(function (a) { return S(a.year) === st.current_year; });
  return {
    settings: st, students: active.length, rooms: Object.keys(rooms).length,
    subjects: subjects_(ctx).filter(function (x) { return x.active && canSubject_(sess, x.subject_id); }).length,
    published: anns.filter(function (a) { return S(a.status) === 'published'; }).length,
    total_ann: anns.length, activity: recentActivity_(ctx, 5)
  };
}

function activity_(req) {
  const n = Math.min(Math.max(Number(req.limit) || 50, 1), 200);
  return recentActivity_(new Ctx(), n);
}

function viewResults_(req, sess) {
  assertSubject_(sess, req.subject_id);
  const ctx = new Ctx();
  const st = getSettings_(ctx);
  const subj = subjectById_(ctx, req.subject_id);
  const y = S(req.year), t = S(req.term), l = S(req.level);
  const sc = schemeFor_(ctx, y, t, subj);
  const roomSet = {};
  if (y === S(st.current_year)) {
    ctx.t('Students').rows.forEach(function (s) { if (S(s.level) === l && isActiveStudent_(s)) roomSet[S(s.room)] = 1; });
  }
  ctx.t('Scores').rows.forEach(function (r) {
    if (S(r.year) === y && S(r.term) === t && S(r.level) === l && S(r.subject_id) === subj.subject_id) roomSet[S(r.room)] = 1;
  });
  const rooms = Object.keys(roomSet).sort(roomCmp_).map(function (room) {
    const c = buildClass_(ctx, st, { year: y, term: t, level: l, room: room }, subj);
    return {
      room: room, class_label: classLabel_(l, room), announcement: annOf_(ctx, y, t, l, room, subj.subject_id),
      rows: c.rows.map(function (r) { return { number: r.number, name: r.name, masked: r.masked, parts: r.parts, total: r.total, grade: r.grade }; }),
      summary: c.summary
    };
  });
  return { subject: subj, scheme: sc, show_grade: sc.show_grade, year: y, term: t, level: l, rooms: rooms };
}

function getScoreSheet_(req, sess) {
  assertSubject_(sess, req.subject_id);
  const ctx = new Ctx();
  const st = getSettings_(ctx);
  const subj = subjectById_(ctx, req.subject_id);
  const q = { year: S(req.year), term: S(req.term), level: S(req.level), room: S(req.room) };
  const c = buildClass_(ctx, st, q, subj);
  return {
    subject: subj, scheme: c.scheme, show_grade: c.withGrade, rows: c.rows, summary: c.summary,
    announcement: annOf_(ctx, q.year, q.term, q.level, q.room, subj.subject_id)
  };
}

function parseScore_(v, max, label, who) {
  if (v === '' || v === null || v === undefined) return '';
  const n = Number(v);
  if (!isFinite(n) || n < 0) throw new Error(who + ': ' + label + 'ไม่ถูกต้อง');
  if (n > max) throw new Error(who + ': ' + label + 'เกินคะแนนเต็ม (' + max + ')');
  return round1_(n);
}

function saveScores_(req, sess) {
  assertSubject_(sess, req.subject_id);
  return withLock_(function () {
    const ctx = new Ctx(true);
    const subj = subjectById_(ctx, req.subject_id);
    const y = S(req.year), t = S(req.term), l = S(req.level), r = S(req.room);
    if (!/^\d{4}$/.test(y) || (t !== '1' && t !== '2') || !l || !r) throw new Error('ข้อมูลปีการศึกษา ภาคเรียน ชั้น หรือห้องไม่ครบ');
    const sc = schemeFor_(ctx, y, t, subj);
    const table = ctx.t('Scores');
    const idx = {};
    table.rows.forEach(function (row) { idx[[S(row.year), S(row.term), normId_(row.citizen_id), S(row.subject_id)].join('|')] = row; });
    const now = new Date();
    let saved = 0;
    const changed = [];
    (req.rows || []).forEach(function (inp, i) {
      const id = normId_(inp.key);
      if (id.length !== 13) return;
      const who = S(inp.label) || ('แถวที่ ' + (i + 1));
      const given = inp.parts || { work: inp.work, exam: inp.exam };
      const k = [y, t, id, subj.subject_id].join('|');
      let row = idx[k];
      const parts = row ? partsOf_(row) : {};
      let any = false;
      sc.components.forEach(function (c) {
        if (!(c.key in given)) return;
        const v = parseScore_(given[c.key], c.max, c.label, who);
        if (v === '') delete parts[c.key]; else parts[c.key] = v;
      });
      sc.components.forEach(function (c) { if (num_(parts[c.key]) !== null) any = true; });
      if (!row) {
        if (!any) return;
        row = { year: y, term: t, citizen_id: id, subject_id: subj.subject_id };
        table.rows.push(row);
        idx[k] = row;
      }
      row.level = l;
      row.room = r;
      row.parts = JSON.stringify(parts);
      row.work = '';
      row.exam = '';
      const total = sumParts_(parts, sc.components, false);
      row.total = total === null ? '' : total;
      row.updated_by = sess.username;
      row.updated_at = now;
      changed.push(row);
      saved++;
    });
    if (changed.length) writeRows_(table, changed);

    const at = ctx.t('Announcements');
    const key = annKey_(y, t, l, r, subj.subject_id);
    let a = at.rows.filter(function (x) { return annKey_(x.year, x.term, x.level, x.room, x.subject_id) === key; })[0];
    if (!a) {
      a = { ann_id: newId_('A'), year: y, term: t, level: l, room: r, subject_id: subj.subject_id, status: 'in_progress', expected_date: '', published_at: '', note: '', updated_at: now };
      at.rows.push(a);
      writeRows_(at, [a]);
    } else if (S(a.status) === 'pending' || !S(a.status)) {
      a.status = 'in_progress';
      a.updated_at = now;
      writeRows_(at, [a]);
    }
    log_(sess.username, 'score', 'บันทึกคะแนน' + subj.name + ' ' + classLabel_(l, r) + ' เทอม ' + t + '/' + y + ' (' + saved + ' คน)');
    return { saved: saved, status: S(a.status) };
  });
}

function searchStudents_(req, sess) {
  const q = S(req.q);
  if (q.length < 2) return [];
  const digits = q.replace(/\D/g, '');
  const byId = /^[\d\s-]+$/.test(q) && digits.length >= 2;
  const ctx = new Ctx();
  return ctx.t('Students').rows.filter(function (s) {
    if (!normId_(s.citizen_id)) return false;
    return byId ? normId_(s.citizen_id).indexOf(digits) > -1 : fullName_(s).indexOf(q) > -1;
  }).slice(0, 20).map(function (s) {
    const o = {
      masked: maskId_(s.citizen_id), name: fullName_(s), class_label: classLabel_(s.level, s.room),
      number: num_(s.number), status: S(s.status) || 'กำลังศึกษา'
    };
    if (sess.role === 'admin') o.rec = studentOut_(s);
    return o;
  });
}

function stats_(req, sess) {
  assertSubject_(sess, req.subject_id);
  const ctx = new Ctx();
  const st = getSettings_(ctx);
  const subj = subjectById_(ctx, req.subject_id);
  const y = S(req.year), t = S(req.term);
  const sc = schemeFor_(ctx, y, t, subj);
  const groups = {};
  ctx.t('Scores').rows.forEach(function (r) {
    if (S(r.year) === y && S(r.term) === t && S(r.subject_id) === subj.subject_id) groups[S(r.level) + '|' + S(r.room)] = [S(r.level), S(r.room)];
  });
  const all = [];
  const overallDist = {};
  const classes = Object.keys(groups).map(function (k) { return groups[k]; })
    .sort(function (a, b) { return a[0].localeCompare(b[0], 'th') || roomCmp_(a[1], b[1]); })
    .map(function (g) {
      const c = buildClass_(ctx, st, { year: y, term: t, level: g[0], room: g[1] }, subj);
      const dist = {};
      c.rows.forEach(function (r) {
        all.push(r);
        if (sc.show_grade && r.grade !== null) {
          dist[r.grade] = (dist[r.grade] || 0) + 1;
          overallDist[r.grade] = (overallDist[r.grade] || 0) + 1;
        }
      });
      return { class_label: classLabel_(g[0], g[1]), level: g[0], room: g[1], summary: c.summary, dist: dist, announcement: annOf_(ctx, y, t, g[0], g[1], subj.subject_id) };
    });
  return {
    subject: subj, scheme: sc, show_grade: sc.show_grade, year: y, term: t, classes: classes,
    overall: summarize_(all, sc.full), overall_dist: overallDist
  };
}

// ===== แอดมิน: ประกาศผล =====
function listAnnouncements_(req) {
  const ctx = new Ctx();
  const y = S(req.year);
  return ctx.t('Announcements').rows.filter(function (a) { return !y || S(a.year) === y; })
    .map(function (a) { return annOut_(a, ctx); })
    .sort(function (a, b) {
      return Number(b.year) - Number(a.year) || Number(a.term) - Number(b.term) ||
        a.subject_name.localeCompare(b.subject_name, 'th') || a.level.localeCompare(b.level, 'th') || roomCmp_(a.room, b.room);
    });
}

function saveAnnouncement_(req, sess) {
  let was = '';
  const o = withLock_(function () {
    const ctx = new Ctx(true);
    const y = S(req.year), t = S(req.term), l = S(req.level), r = S(req.room);
    const subj = subjectById_(ctx, req.subject_id);
    const status = STATUSES.indexOf(S(req.status)) > -1 ? S(req.status) : 'pending';
    if (!/^\d{4}$/.test(y) || (t !== '1' && t !== '2') || !l || !r) throw new Error('กรอกปีการศึกษา ภาคเรียน ชั้น และห้องให้ครบ');
    const at = ctx.t('Announcements');
    const key = annKey_(y, t, l, r, subj.subject_id);
    const dup = at.rows.filter(function (a) { return annKey_(a.year, a.term, a.level, a.room, a.subject_id) === key && S(a.ann_id) !== S(req.ann_id); })[0];
    if (dup) throw new Error('มีรายการประกาศของห้องและรายวิชานี้อยู่แล้ว');
    let a = null;
    if (S(req.ann_id)) {
      a = at.rows.filter(function (x) { return S(x.ann_id) === S(req.ann_id); })[0];
      if (!a) throw new Error('ไม่พบรายการประกาศนี้');
    } else {
      a = { ann_id: newId_('A') };
      at.rows.push(a);
    }
    was = S(a.status);
    const now = new Date();
    a.year = y; a.term = t; a.level = l; a.room = r; a.subject_id = subj.subject_id;
    a.status = status; a.expected_date = S(req.expected_date); a.note = S(req.note); a.updated_at = now;
    a.publish_at = status === 'published' ? '' : parseLocalDateTime_(req.publish_at);
    if (a.publish_at && a.publish_at <= now) throw new Error('เวลาประกาศอัตโนมัติต้องเป็นเวลาในอนาคต');
    if (status === 'published' && was !== 'published') a.published_at = now;
    if (status !== 'published') a.published_at = '';
    writeTable_(at);
    log_(sess.username, 'announce', (status === 'published' && was !== 'published' ? 'ประกาศผล' : 'แก้ไขรายการประกาศ') + subj.name + ' ' + classLabel_(l, r) + ' เทอม ' + t);
    return annOut_(a, ctx);
  });
  if (o.status === 'published' && was !== 'published' && req.notify !== false) o.line = lineAutoNotify_([o]);
  return o;
}

function setAnnouncementStatus_(req, sess) {
  const status = S(req.status);
  if (STATUSES.indexOf(status) < 0) throw new Error('สถานะไม่ถูกต้อง');
  let was = '';
  const o = withLock_(function () {
    const ctx = new Ctx(true);
    const at = ctx.t('Announcements');
    const a = at.rows.filter(function (x) { return S(x.ann_id) === S(req.ann_id); })[0];
    if (!a) throw new Error('ไม่พบรายการประกาศนี้');
    was = S(a.status);
    const now = new Date();
    a.status = status;
    a.updated_at = now;
    if (status === 'published') a.publish_at = '';
    if (status === 'published' && was !== 'published') a.published_at = now;
    if (status !== 'published') a.published_at = '';
    writeTable_(at);
    const o = annOut_(a, ctx);
    const msg = status === 'published' ? 'ประกาศผล' : (was === 'published' ? 'ยกเลิกประกาศ' : 'เปลี่ยนสถานะเป็น' + STATUS_TH[status] + ' ');
    log_(sess.username, 'announce', msg + o.subject_name + ' ' + o.class_label + ' เทอม ' + o.term);
    return o;
  });
  if (o.status === 'published' && was !== 'published' && req.notify !== false) o.line = lineAutoNotify_([o]);
  return o;
}

function deleteAnnouncement_(req, sess) {
  return withLock_(function () {
    const ctx = new Ctx(true);
    const at = ctx.t('Announcements');
    const before = at.rows.length;
    at.rows = at.rows.filter(function (x) { return S(x.ann_id) !== S(req.ann_id); });
    if (at.rows.length === before) throw new Error('ไม่พบรายการประกาศนี้');
    writeTable_(at);
    log_(sess.username, 'announce', 'ลบรายการประกาศ 1 รายการ');
    return true;
  });
}

// ===== แอดมิน: นักเรียน =====
function studentOut_(s) {
  const id = normId_(s.citizen_id);
  return {
    key: id, citizen_id: id, masked: maskId_(id), prefix: S(s.prefix), first_name: S(s.first_name), last_name: S(s.last_name),
    name: fullName_(s), level: S(s.level), room: S(s.room), number: num_(s.number),
    class_label: classLabel_(s.level, s.room), status: S(s.status) || 'กำลังศึกษา'
  };
}

function listStudents_() {
  return new Ctx().t('Students').rows.filter(function (s) { return normId_(s.citizen_id); }).map(studentOut_)
    .sort(function (a, b) {
      return a.level.localeCompare(b.level, 'th') || roomCmp_(a.room, b.room) ||
        (a.number === null ? 999 : a.number) - (b.number === null ? 999 : b.number);
    });
}

function applyStudent_(s, src, now) {
  s.prefix = S(src.prefix);
  s.first_name = S(src.first_name);
  s.last_name = S(src.last_name);
  s.level = S(src.level);
  s.room = S(src.room);
  const n = num_(src.number);
  s.number = n === null ? '' : n;
  s.status = S(src.status) || S(s.status) || 'กำลังศึกษา';
  s.updated_at = now;
}

function validateStudent_(src) {
  const id = normId_(src.citizen_id);
  if (id.length !== 13) return 'เลขบัตรประชาชนต้องมี 13 หลัก';
  if (!S(src.first_name) || !S(src.last_name)) return 'กรอกชื่อและนามสกุล';
  if (!S(src.level) || !S(src.room)) return 'กรอกชั้นและห้อง';
  return '';
}

function saveStudent_(req, sess) {
  const err = validateStudent_(req);
  if (err) throw new Error(err);
  return withLock_(function () {
    const ctx = new Ctx(true);
    const tb = ctx.t('Students');
    const id = normId_(req.citizen_id);
    const orig = normId_(req.original_id);
    const exists = tb.rows.filter(function (s) { return normId_(s.citizen_id) === id; })[0];
    if (exists && id !== orig) throw new Error('มีเลขบัตรประชาชนนี้ในระบบแล้ว (' + fullName_(exists) + ')');
    let s = null;
    if (orig) {
      s = tb.rows.filter(function (x) { return normId_(x.citizen_id) === orig; })[0];
      if (!s) throw new Error('ไม่พบนักเรียนที่ต้องการแก้ไข');
    } else {
      s = {};
      tb.rows.push(s);
    }
    s.citizen_id = id;
    applyStudent_(s, req, new Date());
    writeTable_(tb);
    if (orig && orig !== id) {
      const sc = ctx.t('Scores');
      let moved = 0;
      sc.rows.forEach(function (r) { if (normId_(r.citizen_id) === orig) { r.citizen_id = id; moved++; } });
      if (moved) writeTable_(sc);
    }
    log_(sess.username, 'student', (orig ? 'แก้ไขข้อมูลนักเรียน ' : 'เพิ่มนักเรียน ') + fullName_(s) + ' ' + classLabel_(s.level, s.room));
    return studentOut_(s);
  });
}

function deleteStudent_(req, sess) {
  return withLock_(function () {
    const tb = readTable_('Students');
    const id = normId_(req.citizen_id);
    const s = tb.rows.filter(function (x) { return normId_(x.citizen_id) === id; })[0];
    if (!s) throw new Error('ไม่พบนักเรียนนี้');
    tb.rows = tb.rows.filter(function (x) { return x !== s; });
    writeTable_(tb);
    log_(sess.username, 'student', 'ลบนักเรียน ' + fullName_(s) + ' (คะแนนเดิมยังเก็บไว้)');
    return true;
  });
}

function importStudents_(req, sess) {
  const input = req.rows || [];
  if (!input.length) throw new Error('ไม่พบข้อมูลที่จะนำเข้า');
  if (input.length > 2000) throw new Error('นำเข้าได้ครั้งละไม่เกิน 2,000 คน');
  return withLock_(function () {
    const tb = readTable_('Students');
    const idx = {};
    tb.rows.forEach(function (s) { idx[normId_(s.citizen_id)] = s; });
    const now = new Date();
    let added = 0, updated = 0;
    const errors = [];
    input.forEach(function (src, i) {
      const line = src.line || (i + 1);
      const err = validateStudent_(src);
      if (err) { errors.push('บรรทัด ' + line + ': ' + err); return; }
      const id = normId_(src.citizen_id);
      let s = idx[id];
      if (s) { updated++; } else { s = { citizen_id: id }; tb.rows.push(s); idx[id] = s; added++; }
      applyStudent_(s, src, now);
    });
    if (added || updated) writeTable_(tb);
    if (added) log_(sess.username, 'student', 'เพิ่มนักเรียนใหม่ ' + added + ' คน' + (updated ? ' และปรับปรุง ' + updated + ' คน' : ''));
    else if (updated) log_(sess.username, 'student', 'ปรับปรุงข้อมูลนักเรียน ' + updated + ' คน');
    return { added: added, updated: updated, errors: errors };
  });
}

// ===== แอดมิน: ตั้งค่าและผู้ใช้ =====
// ===== แจ้งประกาศผลผ่านกลุ่ม LINE (LINE Messaging API) =====
// โทเคนเก็บใน Script Properties (ไม่อยู่ในชีต) · ข้อความในกลุ่มไม่มีชื่อหรือคะแนนรายคน
const LINE_API = 'https://api.line.me/v2/bot';

function lineToken_() { return PropertiesService.getScriptProperties().getProperty('LINE_TOKEN') || ''; }
function lineSettings_(ctx) {
  const st = getSettings_(ctx || new Ctx());
  return {
    site: S(st.line_site_url).replace(/\/+$/, '') + '/', auto: S(st.line_auto) === '' ? true : truthy_(st.line_auto), school: st.school_name,
    personal: S(st.line_personal) === '' ? true : truthy_(st.line_personal), personal_push: truthy_(st.line_personal_push),
    always_id: S(st.line_always_id) === '' ? true : truthy_(st.line_always_id)
  };
}
function lineReady_(ctx) {
  const c = lineSettings_(ctx);
  return !!lineToken_() && /^https:\/\//.test(c.site);
}
function lineCall_(method, path, payload) {
  const opt = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + lineToken_() } };
  if (payload) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(payload); }
  const res = UrlFetchApp.fetch(LINE_API + path, opt);
  let body = {};
  try { body = JSON.parse(res.getContentText() || '{}'); } catch (e) { body = {}; }
  return { code: res.getResponseCode(), body: body };
}
function lineReply_(token, text) {
  if (!token || !lineToken_()) return;
  lineCall_('post', '/message/reply', { replyToken: token, messages: [{ type: 'text', text: text }] });
}
function lineGroupName_(src) {
  if (src.type !== 'group') return 'แชทกลุ่ม';
  const r = lineCall_('get', '/group/' + src.groupId + '/summary');
  return r.code === 200 ? S(r.body.groupName) : 'กลุ่ม LINE';
}
function classMatch_(classes, a) {
  return classes.indexOf('*') > -1 || classes.indexOf(a.level) > -1 || classes.indexOf(a.class_label) > -1;
}
function classesText_(classes) {
  return classes.indexOf('*') > -1 ? 'ทุกห้อง' : classes.join(', ');
}

/** รับ webhook จาก LINE: ผูกกลุ่มด้วยรหัส 6 หลัก, ตอบสถานะ, บันทึกเมื่อบอทออกจากกลุ่ม */
function lineWebhook_(body) {
  try {
    const ev0 = (body.events || [])[0];
    PropertiesService.getScriptProperties().setProperty('LINE_LAST_HOOK', JSON.stringify({
      at: new Date().toISOString(), type: ev0 ? ev0.type : 'verify', source: ev0 && ev0.source ? ev0.source.type : ''
    }));
  } catch (e) { /* ไม่เป็นไร */ }
  (body.events || []).forEach(function (ev) {
    try {
      const src = ev.source || {};
      if (src.type === 'user' && src.userId) { linePersonal_(ev, src.userId); return; }
      const gid = src.groupId || src.roomId;
      if (!gid) return;
      if (ev.type === 'join') {
        lineReply_(ev.replyToken, 'สวัสดีครับ 👋 บอทแจ้งประกาศผลคะแนน\nครูพิมพ์ "ผูกกลุ่ม" ตามด้วยรหัส 6 หลักจากหน้าแอดมิน เช่น\nผูกกลุ่ม 123456');
        return;
      }
      if (ev.type === 'leave') {
        withLock_(function () {
          const tb = readTable_('LineGroups');
          const g = tb.rows.filter(function (x) { return S(x.group_id) === gid; })[0];
          if (g) { g.active = false; writeTable_(tb); log_('LINE', 'settings', 'บอทถูกนำออกจากกลุ่ม ' + S(g.name)); }
        });
        return;
      }
      if (ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return;
      const text = S(ev.message.text);
      let m = text.match(/^ผูกกลุ่ม\s*(\d{6})$/);
      if (m) {
        const c = CacheService.getScriptCache();
        const raw = c.get('lb:' + m[1]);
        if (!raw) { lineReply_(ev.replyToken, '❌ รหัสไม่ถูกต้องหรือหมดอายุ (ใช้ได้ 30 นาที) สร้างรหัสใหม่ได้ที่หน้าแอดมิน'); return; }
        const info = JSON.parse(raw);
        c.remove('lb:' + m[1]);
        const name = lineGroupName_(src);
        withLock_(function () {
          const tb = readTable_('LineGroups');
          let g = tb.rows.filter(function (x) { return S(x.group_id) === gid; })[0];
          if (!g) { g = { group_id: gid }; tb.rows.push(g); }
          g.name = name; g.classes = info.classes.join(','); g.active = true; g.bound_by = info.by; g.bound_at = new Date();
          writeTable_(tb);
        });
        log_(info.by, 'settings', 'ผูกกลุ่ม LINE "' + name + '" กับ ' + classesText_(info.classes));
        lineReply_(ev.replyToken, '✅ ผูกกลุ่มเรียบร้อย\nกลุ่มนี้จะได้รับแจ้งเมื่อประกาศผลคะแนนของ: ' + classesText_(info.classes));
        return;
      }
      if (/^(สถานะกลุ่ม|สถานะบอท)$/.test(text)) {
        const g = readTable_('LineGroups').rows.filter(function (x) { return S(x.group_id) === gid && truthy_(x.active); })[0];
        lineReply_(ev.replyToken, g ? '📣 กลุ่มนี้รับแจ้งประกาศผลของ: ' + classesText_(splitList_(g.classes)) : 'กลุ่มนี้ยังไม่ได้ผูกกับระบบประกาศผลคะแนน');
      }
    } catch (e) { log_('LINE', 'settings', 'webhook ผิดพลาด: ' + e.message); }
  });
  return true;
}

/** ข้อความ Flex: หัวข้อ + รายการห้องที่ประกาศ + ปุ่มดูคะแนน (ไม่มีข้อมูลรายบุคคล) */
function lineFlex_(anns, cfg) {
  const rows = anns.slice(0, 12).map(function (a) {
    return {
      type: 'box', layout: 'horizontal', spacing: 'sm', margin: 'md', contents: [
        { type: 'text', text: a.icon || '📘', flex: 0, size: 'md' },
        { type: 'box', layout: 'vertical', flex: 1, contents: [
          { type: 'text', text: a.subject_name, weight: 'bold', size: 'sm', wrap: true, color: '#0c2530' },
          { type: 'text', text: 'ชั้น ' + a.class_label + ' · ภาคเรียนที่ ' + a.term + '/' + a.year, size: 'xs', color: '#5f7a85', wrap: true }
        ] }
      ]
    };
  });
  if (anns.length > 12) rows.push({ type: 'text', text: 'และอีก ' + (anns.length - 12) + ' รายการ', size: 'xs', color: '#5f7a85', margin: 'md' });
  const title = anns.length === 1 ? anns[0].subject_name + ' ' + anns[0].class_label : anns.length + ' รายการ';
  return {
    type: 'flex', altText: '📣 ประกาศผลคะแนนแล้ว: ' + title,
    contents: {
      type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#0891b2', paddingAll: '18px', contents: [
        { type: 'text', text: '📣 ประกาศผลคะแนนแล้ว', color: '#ffffff', weight: 'bold', size: 'lg' },
        { type: 'text', text: cfg.school, color: '#e6f9fc', size: 'xs', margin: 'sm' }
      ] },
      body: { type: 'box', layout: 'vertical', contents: rows.concat([
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: 'นักเรียน/ผู้ปกครอง เข้าสู่ระบบด้วยเลขบัตรประชาชน 13 หลักของนักเรียน', size: 'xs', color: '#5f7a85', wrap: true, margin: 'lg' }
      ]) },
      footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
        { type: 'button', style: 'primary', color: '#0891b2', height: 'sm', action: { type: 'uri', label: 'ดูคะแนน', uri: cfg.site + 'index.html' } },
        { type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: 'สถานะการประกาศผลทุกห้อง', uri: cfg.site + 'status.html' } }
      ] }
    }
  };
}

/** ส่งแจ้งไปทุกกลุ่มที่ผูกกับห้องของประกาศเหล่านี้ (1 ข้อความต่อกลุ่ม) */
function lineNotify_(anns, who) {
  const res = { sent: 0, groups: [], errors: [] };
  if (!anns.length) return res;
  if (!lineToken_()) { res.errors.push('ยังไม่ได้ตั้งค่า Channel access token'); return res; }
  const ctx = new Ctx();
  const cfg = lineSettings_(ctx);
  if (!/^https:\/\//.test(cfg.site)) { res.errors.push('ยังไม่ได้ตั้งค่าลิงก์เว็บไซต์ (https://...)'); return res; }
  const tb = readTable_('LineGroups');
  const now = new Date();
  const changed = [];
  tb.rows.forEach(function (g) {
    if (!truthy_(g.active)) return;
    const classes = splitList_(g.classes);
    const mine = anns.filter(function (a) { return classMatch_(classes, a); });
    if (!mine.length) return;
    const r = lineCall_('post', '/message/push', { to: S(g.group_id), messages: [lineFlex_(mine, cfg)] });
    if (r.code === 200) {
      res.sent++; res.groups.push(S(g.name));
      g.last_sent_at = now; changed.push(g);
    } else {
      res.errors.push(S(g.name) + ': ' + (r.body.message || ('รหัส ' + r.code)));
    }
  });
  if (changed.length) writeRows_(tb, changed);
  if (res.sent) log_(who || 'ระบบ', 'announce', 'แจ้งประกาศผลเข้ากลุ่ม LINE ' + res.sent + ' กลุ่ม (' + res.groups.join(', ') + ')');
  if (res.errors.length) log_(who || 'ระบบ', 'announce', 'แจ้ง LINE ไม่สำเร็จ: ' + res.errors.join(' | ').slice(0, 300));
  return res;
}
function lineAutoNotify_(anns) {
  try {
    if (!lineReady_()) return null;
    const cfg = lineSettings_();
    const res = cfg.auto ? lineNotify_(anns, 'ระบบ') : { sent: 0, groups: [], errors: [] };
    if (cfg.personal && cfg.personal_push) res.personal = linePushPersonal_(anns);
    return cfg.auto || res.personal ? res : null;
  } catch (e) {
    log_('ระบบ', 'announce', 'แจ้ง LINE ผิดพลาด: ' + e.message);
    return { sent: 0, groups: [], errors: [e.message] };
  }
}

function lineGroupsOut_() {
  return readTable_('LineGroups').rows.map(function (g) {
    return { group_id: S(g.group_id), name: S(g.name), classes: splitList_(g.classes), active: truthy_(g.active), bound_at: iso_(g.bound_at), last_sent_at: iso_(g.last_sent_at) };
  });
}
function lineInfo_() {
  const tok = lineToken_();
  const cfg = lineSettings_();
  const out = {
    configured: !!tok, token_tail: tok ? tok.slice(-4) : '', site_url: cfg.site === '/' ? '' : cfg.site, auto: cfg.auto, bot: null, groups: lineGroupsOut_(),
    personal: cfg.personal, personal_push: cfg.personal_push, always_id: cfg.always_id, linked: readTable_('LineUsers').rows.length,
    menu: lineMenu_(), menu_types: LINE_MENU_TYPES, richmenu: !!PropertiesService.getScriptProperties().getProperty('LINE_RICHMENU'),
    last_hook: JSON.parse(PropertiesService.getScriptProperties().getProperty('LINE_LAST_HOOK') || 'null')
  };
  if (tok) {
    try {
      const r = lineCall_('get', '/info');
      out.bot = r.code === 200 ? { name: r.body.displayName, picture: r.body.pictureUrl || '', basic_id: r.body.basicId || '' } : { error: r.body.message || ('รหัส ' + r.code) };
    } catch (e) { out.bot = { error: e.message }; }
  }
  return out;
}
function lineSaveConfig_(req, sess) {
  const props = PropertiesService.getScriptProperties();
  const tok = S(req.channel_token);
  if (tok === 'CLEAR') props.deleteProperty('LINE_TOKEN');
  else if (tok) {
    const old = props.getProperty('LINE_TOKEN');
    props.setProperty('LINE_TOKEN', tok);
    const r = lineCall_('get', '/info');
    if (r.code !== 200) {
      if (old) props.setProperty('LINE_TOKEN', old); else props.deleteProperty('LINE_TOKEN');
      throw new Error('Channel access token ไม่ถูกต้อง (' + (r.body.message || r.code) + ')');
    }
  }
  const site = S(req.site_url);
  if (site && !/^https:\/\/[^\s]+$/.test(site)) throw new Error('ลิงก์เว็บไซต์ต้องขึ้นต้นด้วย https://');
  withLock_(function () {
    const tb = readTable_('Settings');
    [['line_site_url', site.replace(/\/+$/, '')], ['line_auto', req.auto !== false ? 'TRUE' : 'FALSE'],
      ['line_personal', req.personal !== false ? 'TRUE' : 'FALSE'], ['line_personal_push', req.personal_push ? 'TRUE' : 'FALSE'],
      ['line_always_id', req.always_id !== false ? 'TRUE' : 'FALSE']].forEach(function (kv) {
      const row = tb.rows.filter(function (x) { return S(x.key) === kv[0]; })[0];
      if (row) row.value = kv[1]; else tb.rows.push({ key: kv[0], value: kv[1] });
    });
    writeTable_(tb);
  });
  log_(sess.username, 'settings', 'ตั้งค่าการแจ้งประกาศผลผ่าน LINE');
  return lineInfo_();
}
function lineBindCode_(req, sess) {
  const classes = (req.classes || []).map(S).filter(String);
  if (!classes.length) throw new Error('เลือกห้องที่กลุ่มนี้จะรับแจ้งอย่างน้อย 1 รายการ');
  const code = String(Math.floor(100000 + Math.random() * 900000));
  CacheService.getScriptCache().put('lb:' + code, JSON.stringify({ classes: classes, by: sess.username }), 1800);
  return { code: code, classes: classes, expires: new Date(Date.now() + 1800000).toISOString() };
}
function lineGroupSave_(req, sess) {
  return withLock_(function () {
    const tb = readTable_('LineGroups');
    const g = tb.rows.filter(function (x) { return S(x.group_id) === S(req.group_id); })[0];
    if (!g) throw new Error('ไม่พบกลุ่มนี้');
    const classes = (req.classes || []).map(S).filter(String);
    if (!classes.length) throw new Error('เลือกห้องอย่างน้อย 1 รายการ');
    g.classes = classes.join(',');
    g.active = req.active !== false;
    writeTable_(tb);
    log_(sess.username, 'settings', 'แก้ไขกลุ่ม LINE "' + S(g.name) + '" → ' + classesText_(classes));
    return lineGroupsOut_();
  });
}
function lineGroupDelete_(req, sess) {
  let name = '';
  withLock_(function () {
    const tb = readTable_('LineGroups');
    const g = tb.rows.filter(function (x) { return S(x.group_id) === S(req.group_id); })[0];
    if (!g) throw new Error('ไม่พบกลุ่มนี้');
    name = S(g.name);
    tb.rows = tb.rows.filter(function (x) { return x !== g; });
    writeTable_(tb);
  });
  if (req.leave && lineToken_()) {
    try { lineCall_('post', (/^R/.test(S(req.group_id)) ? '/room/' : '/group/') + S(req.group_id) + '/leave'); } catch (e) { /* ไม่เป็นไร */ }
  }
  log_(sess.username, 'settings', 'ยกเลิกผูกกลุ่ม LINE "' + name + '"' + (req.leave ? ' และให้บอทออกจากกลุ่ม' : ''));
  return lineGroupsOut_();
}
function lineTest_(req, sess) {
  if (!lineToken_()) throw new Error('ยังไม่ได้ตั้งค่า Channel access token');
  const cfg = lineSettings_();
  if (!/^https:\/\//.test(cfg.site)) throw new Error('ยังไม่ได้ตั้งค่าลิงก์เว็บไซต์');
  const sample = { icon: '📐', subject_name: 'ทดสอบการแจ้งเตือน', class_label: 'ตัวอย่าง', term: '1', year: getSettings_(new Ctx()).current_year };
  const r = lineCall_('post', '/message/push', { to: S(req.group_id), messages: [lineFlex_([sample], cfg)] });
  if (r.code !== 200) throw new Error('ส่งไม่สำเร็จ: ' + (r.body.message || r.code));
  log_(sess.username, 'settings', 'ส่งข้อความทดสอบเข้ากลุ่ม LINE');
  return true;
}
function lineNotifyManual_(req, sess) {
  const ctx = new Ctx();
  const ids = (req.ann_ids || []).map(S);
  const anns = ctx.t('Announcements').rows.filter(function (a) { return ids.indexOf(S(a.ann_id)) > -1 && S(a.status) === 'published'; })
    .map(function (a) { return annOut_(a, ctx); });
  if (!anns.length) throw new Error('แจ้งได้เฉพาะรายการที่ประกาศแล้ว');
  if (!lineReady_(ctx)) throw new Error('ยังตั้งค่า LINE ไม่ครบ (โทเคน และลิงก์เว็บไซต์)');
  return lineNotify_(anns, sess.username);
}
/** ประกาศหลายห้องพร้อมกัน → แจ้ง LINE ครั้งเดียวต่อกลุ่ม (ประหยัดโควตาข้อความ) */
function publishMany_(req, sess) {
  const ids = (req.ann_ids || []).map(S);
  if (!ids.length) throw new Error('เลือกรายการที่จะประกาศ');
  const done = withLock_(function () {
    const ctx = new Ctx(true);
    const at = ctx.t('Announcements');
    const now = new Date();
    const list = [];
    at.rows.forEach(function (a) {
      if (ids.indexOf(S(a.ann_id)) < 0 || S(a.status) === 'published') return;
      a.status = 'published'; a.published_at = now; a.updated_at = now; a.publish_at = '';
      list.push(annOut_(a, ctx));
    });
    if (list.length) writeTable_(at);
    list.forEach(function (o) { log_(sess.username, 'announce', 'ประกาศผล' + o.subject_name + ' ' + o.class_label + ' เทอม ' + o.term); });
    return list;
  });
  return { published: done.length, line: req.notify !== false && done.length ? lineAutoNotify_(done) : null };
}

// ===== เมนูบอท (ปุ่มให้กด) — ตั้งค่าได้จากหน้าแอดมิน ใช้ทั้งริชเมนูและปุ่มลัด =====
const LINE_MENU_TYPES = {
  scores: 'ถามคะแนน (เลือกวิชา → ภาคเรียน → ปี → เลขบัตร)',
  latest: 'คะแนนภาคเรียนล่าสุด (ขอแค่เลขบัตร)',
  status: 'สถานะการประกาศผล',
  website: 'เปิดเว็บไซต์ระบบ',
  link: 'เปิดลิงก์ที่กำหนด',
  text: 'ตอบข้อความที่กำหนดเอง',
  help: 'วิธีใช้'
};
const LINE_MENU_DEFAULT = [
  { emoji: '📊', label: 'ดูคะแนน', type: 'scores' },
  { emoji: '⚡', label: 'คะแนนล่าสุด', type: 'latest' },
  { emoji: '📣', label: 'สถานะประกาศผล', type: 'status' },
  { emoji: '🌐', label: 'เปิดเว็บไซต์', type: 'website' },
  { emoji: '❓', label: 'วิธีใช้', type: 'help' },
  { emoji: '☎️', label: 'ติดต่อครู', type: 'text', reply: 'ติดต่อครูผู้สอนคณิตศาสตร์ได้ที่ห้องพักครู หรือฝากข้อความผ่านครูประจำชั้น' }
];
function lineMenu_(ctx) {
  let m = null;
  try { m = JSON.parse(S(getSettings_(ctx || new Ctx()).line_menu) || 'null'); } catch (e) { m = null; }
  return Array.isArray(m) && m.length ? m : LINE_MENU_DEFAULT;
}
function lineMenuQuick_(menu, site) {
  return menu.map(function (x) {
    const label = (x.emoji ? x.emoji + ' ' : '') + x.label;
    if (x.type === 'website' && /^https:\/\//.test(site)) return { label: label, uri: site + 'index.html' };
    if (x.type === 'link' && /^https:\/\//.test(x.url || '')) return { label: label, uri: x.url };
    return { label: label, text: x.label };
  });
}
function lineMenuFind_(text, menu) {
  const t = S(text).replace(/\s+/g, ' ');
  return menu.filter(function (x) { return t === x.label || t === (x.emoji + ' ' + x.label) || t === (x.emoji + x.label); })[0] || null;
}
function lineStatusText_(ctx, cfg) {
  const d = status_({});
  const recent = d.items.filter(function (a) { return a.status === 'published'; }).slice(0, 5);
  return '📣 สถานะการประกาศผล ปีการศึกษา ' + d.year + '\nประกาศแล้ว ' + d.counts.published + ' จาก ' + d.counts.total + ' รายการ (' + d.percent + '%)' +
    (recent.length ? '\n\nล่าสุด:\n' + recent.map(function (a) { return '• ' + a.subject_name + ' ' + a.class_label + ' เทอม ' + a.term; }).join('\n') : '') +
    (/^https:\/\//.test(cfg.site) ? '\n\nดูทุกห้อง: ' + cfg.site + 'status.html' : '');
}

function lineSaveMenu_(req, sess) {
  const used = {};
  const items = (req.items || []).map(function (x, i) {
    const label = S(x.label).slice(0, 20);
    if (!label) throw new Error('ปุ่มที่ ' + (i + 1) + ' ยังไม่มีชื่อ');
    if (used[label]) throw new Error('ชื่อปุ่ม "' + label + '" ซ้ำกัน');
    used[label] = true;
    const type = LINE_MENU_TYPES[S(x.type)] ? S(x.type) : 'help';
    const o = { emoji: S(x.emoji).slice(0, 4), label: label, type: type };
    if (type === 'text') { o.reply = S(x.reply).slice(0, 1000); if (!o.reply) throw new Error('ปุ่ม "' + label + '" ต้องมีข้อความตอบกลับ'); }
    if (type === 'link') { o.url = S(x.url); if (!/^https:\/\/\S+$/.test(o.url)) throw new Error('ปุ่ม "' + label + '" ต้องมีลิงก์ที่ขึ้นต้นด้วย https://'); }
    return o;
  });
  if (!items.length) throw new Error('ต้องมีปุ่มอย่างน้อย 1 ปุ่ม');
  if (items.length > 6) throw new Error('ใส่ได้สูงสุด 6 ปุ่ม (ขนาดริชเมนูของ LINE)');
  withLock_(function () {
    const tb = readTable_('Settings');
    const row = tb.rows.filter(function (r) { return S(r.key) === 'line_menu'; })[0];
    const val = JSON.stringify(items);
    if (row) row.value = val; else tb.rows.push({ key: 'line_menu', value: val });
    writeTable_(tb);
  });
  log_(sess.username, 'settings', 'ปรับเมนูบอท LINE (' + items.map(function (x) { return x.label; }).join(', ') + ')');
  return lineInfo_();
}

/** ติดตั้งริชเมนู: รับรูปจากหน้าแอดมิน (วาดด้วย canvas) + ตำแหน่งปุ่ม แล้วตั้งเป็นเมนูหลักของ OA */
function lineRichMenuInstall_(req, sess) {
  if (!lineToken_()) throw new Error('ยังไม่ได้ตั้งค่า Channel access token');
  const menu = lineMenu_();
  const cfg = lineSettings_();
  const areas = req.areas || [];
  const h = Number(req.height) === 843 ? 843 : 1686;
  if (areas.length !== menu.length) throw new Error('จำนวนปุ่มในรูปไม่ตรงกับเมนู กรุณาบันทึกเมนูแล้วลองใหม่');
  const b64 = String(req.image || '').replace(/^data:image\/\w+;base64,/, '');
  if (!b64 || b64.length > 1350000) throw new Error('รูปเมนูต้องไม่เกิน 1 MB');
  const body = {
    size: { width: 2500, height: h }, selected: true, name: 'score-announce-menu', chatBarText: 'เมนู ▲',
    areas: menu.map(function (x, i) {
      const a = areas[i];
      const bounds = { x: Math.round(a.x), y: Math.round(a.y), width: Math.round(a.w), height: Math.round(a.h) };
      let action = { type: 'message', label: x.label, text: x.label };
      if (x.type === 'website' && /^https:\/\//.test(cfg.site)) action = { type: 'uri', label: x.label, uri: cfg.site + 'index.html' };
      if (x.type === 'link') action = { type: 'uri', label: x.label, uri: x.url };
      return { bounds: bounds, action: action };
    })
  };
  const created = lineCall_('post', '/richmenu', body);
  if (created.code !== 200) throw new Error('สร้างริชเมนูไม่สำเร็จ: ' + (created.body.message || created.code) + (created.body.details ? ' ' + JSON.stringify(created.body.details).slice(0, 200) : ''));
  const id = created.body.richMenuId;
  const up = UrlFetchApp.fetch('https://api-data.line.me/v2/bot/richmenu/' + id + '/content', {
    method: 'post', contentType: 'image/jpeg', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + lineToken_() },
    payload: Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', 'menu.jpg').getBytes()
  });
  if (up.getResponseCode() !== 200) {
    lineCall_('delete', '/richmenu/' + id);
    throw new Error('อัปโหลดรูปเมนูไม่สำเร็จ (' + up.getResponseCode() + ') ' + up.getContentText().slice(0, 150));
  }
  const def = lineCall_('post', '/user/all/richmenu/' + id);
  if (def.code !== 200) throw new Error('ตั้งเป็นเมนูหลักไม่สำเร็จ: ' + (def.body.message || def.code));
  const props = PropertiesService.getScriptProperties();
  const old = props.getProperty('LINE_RICHMENU');
  if (old && old !== id) lineCall_('delete', '/richmenu/' + old);
  props.setProperty('LINE_RICHMENU', id);
  log_(sess.username, 'settings', 'ติดตั้งริชเมนู LINE ' + menu.length + ' ปุ่ม');
  return lineInfo_();
}
function lineRichMenuRemove_(req, sess) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('LINE_RICHMENU');
  lineCall_('delete', '/user/all/richmenu');
  if (id) lineCall_('delete', '/richmenu/' + id);
  props.deleteProperty('LINE_RICHMENU');
  log_(sess.username, 'settings', 'ลบริชเมนู LINE');
  return lineInfo_();
}

// ===== LINE แชทส่วนตัว: ดูคะแนนของตัวเอง (ผูกด้วยเลขบัตรครั้งแรก แล้วพิมพ์ "คะแนน") =====
const LINE_MAX_LINK = 5; // ผู้ปกครอง 1 บัญชีผูกลูกได้สูงสุด 5 คน

function lineUserIds_(userId) {
  return readTable_('LineUsers').rows.filter(function (x) { return S(x.user_id) === userId; }).map(function (x) { return normId_(x.citizen_id); });
}
function lineReplyQ_(token, text, options) {
  if (!token || !lineToken_()) return;
  const msg = { type: 'text', text: text };
  if (options && options.length) {
    msg.quickReply = { items: options.slice(0, 13).map(function (o) {
      const label0 = typeof o === 'string' ? o : o.label;
      const label = label0.length > 20 ? label0.slice(0, 19) + '…' : label0;
      if (o && o.uri) return { type: 'action', action: { type: 'uri', label: label, uri: o.uri } };
      return { type: 'action', action: { type: 'message', label: label, text: typeof o === 'string' ? o : o.text } };
    }) };
  }
  lineCall_('post', '/message/reply', { replyToken: token, messages: [msg] });
}
function lineHelpText_() {
  return '📘 วิธีใช้\n• กดปุ่มเมนูด้านล่าง หรือพิมพ์ "คะแนน" แล้วเลือกรายวิชา → ภาคเรียน → ปีการศึกษา → พิมพ์เลขบัตรประชาชน 13 หลักของนักเรียน\n• ถามครั้งเดียวได้ เช่น "คะแนนคณิตศาสตร์พื้นฐาน เทอม 1 ปี 2569"\n• พิมพ์ "ยกเลิก" เพื่อเริ่มใหม่ · "ยกเลิกผูก" เพื่อลบการเชื่อมบัญชีนี้';
}

function linePersonal_(ev, userId) {
  const cfg = lineSettings_();
  const menu = lineMenu_();
  const quick = lineMenuQuick_(menu, cfg.site);
  if (ev.type === 'follow') {
    lineReplyQ_(ev.replyToken, 'สวัสดีครับ 👋 ' + cfg.school + '\n' + (cfg.personal ? 'กดปุ่มด้านล่างเพื่อเลือกสิ่งที่ต้องการได้เลย' : 'บัญชีนี้ใช้แจ้งประกาศผลคะแนน'), cfg.personal ? quick : null);
    return;
  }
  if (ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return;
  if (!cfg.personal) return;
  const text = S(ev.message.text).replace(/[๐-๙]/g, function (d) { return String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)); });
  const c = CacheService.getScriptCache();
  const stKey = 'ls:' + userId;
  let st = null;
  try { st = JSON.parse(c.get(stKey) || 'null'); } catch (e) { st = null; }
  const save = function (o) { c.put(stKey, JSON.stringify(o), 900); };
  const clear = function () { c.remove(stKey); };

  if (/^(ยกเลิกผูก|เลิกผูก)$/.test(text)) {
    clear();
    let n = 0;
    withLock_(function () {
      const tb = readTable_('LineUsers');
      const before = tb.rows.length;
      tb.rows = tb.rows.filter(function (x) { return S(x.user_id) !== userId; });
      n = before - tb.rows.length;
      if (n) writeTable_(tb);
    });
    lineReply_(ev.replyToken, n ? '✅ ยกเลิกการผูกแล้ว (' + n + ' คน)' : 'บัญชีนี้ยังไม่ได้ผูกกับนักเรียน');
    return;
  }
  if (/^(ยกเลิก|เริ่มใหม่|cancel)$/i.test(text)) { clear(); lineReplyQ_(ev.replyToken, 'ยกเลิกแล้ว เลือกเมนูได้เลย 👇', quick); return; }
  if (/^(ช่วยเหลือ|help|เมนู)$/i.test(text)) { lineReplyQ_(ev.replyToken, lineHelpText_(), quick); return; }

  // ปุ่มจากเมนูบอท
  const item = lineMenuFind_(text, menu);
  if (item && !(st && st.step === 'id')) {
    if (item.type === 'help') { clear(); lineReplyQ_(ev.replyToken, lineHelpText_(), quick); return; }
    if (item.type === 'text') { clear(); lineReplyQ_(ev.replyToken, item.reply, quick); return; }
    if (item.type === 'status') { clear(); lineReplyQ_(ev.replyToken, lineStatusText_(null, cfg), quick); return; }
    if (item.type === 'website' || item.type === 'link') {
      const url = item.type === 'link' ? item.url : cfg.site + 'index.html';
      lineReplyQ_(ev.replyToken, '🌐 ' + item.label + '\n' + url, quick);
      return;
    }
    if (item.type === 'latest') {
      const linked0 = lineUserIds_(userId);
      if (!cfg.always_id && linked0.length) { clear(); lineReplyResults_(ev.replyToken, linked0, false); return; }
      save({ step: 'id', mode: 'latest' });
      lineReply_(ev.replyToken, '⚡ คะแนนภาคเรียนล่าสุด\n🔒 พิมพ์เลขบัตรประชาชน 13 หลักของนักเรียน');
      return;
    }
  }
  if (/^ผูกกลุ่ม/.test(text)) { lineReply_(ev.replyToken, 'คำสั่ง "ผูกกลุ่ม" ใช้ในกลุ่ม LINE ของห้องเท่านั้น (สำหรับครู)\n\n' + lineHelpText_()); return; }

  const ctx = new Ctx();
  const settings = publicSettings_(getSettings_(ctx));
  const subs = subjects_(ctx).filter(function (x) { return x.active; });
  const digits = text.replace(/(ดู)?(ผล)?คะแนน/g, '').replace(/[\s-]/g, '');

  // เริ่มบทสนทนาใหม่ เมื่อข้อความพูดถึงคะแนน/ผลสอบ (ดึงวิชา/เทอม/ปีจากประโยคถ้ามี)
  if ((item && item.type === 'scores') || /คะแนน|ผลสอบ|ผลการเรียน|เกรด/.test(text) && !/^\d{13}$/.test(text.replace(/(ดู)?(ผล)?คะแนน/g, '').replace(/[\s-]/g, ''))) {
    st = { step: 'subject' };
    const sj = lineFindSubject_(text, subs);
    if (sj) st.subject_id = sj.subject_id;
    const tm = text.match(/(?:เทอม|ภาคเรียน(?:ที่)?)\s*([12])/);
    if (tm) st.term = tm[1];
    const yr = text.match(/(25\d\d)/);
    if (yr) st.year = yr[1];
    return lineAskNext_(ev, userId, st, save, clear, subs, settings, cfg);
  }

  if (st) {
    if (st.step === 'subject') {
      const sj = lineFindSubject_(text, subs);
      if (!sj) return lineAskNext_(ev, userId, st, save, clear, subs, settings, cfg, 'ไม่พบรายวิชานี้ กรุณาเลือกจากปุ่มด้านล่าง');
      st.subject_id = sj.subject_id;
    } else if (st.step === 'term') {
      const m = text.match(/([12])/) || (/หนึ่ง/.test(text) ? [0, '1'] : (/สอง/.test(text) ? [0, '2'] : null));
      if (!m) return lineAskNext_(ev, userId, st, save, clear, subs, settings, cfg, 'กรุณาเลือกภาคเรียนที่ 1 หรือ 2');
      st.term = m[1];
    } else if (st.step === 'year') {
      const m = text.match(/(25\d\d)/);
      if (!m) return lineAskNext_(ev, userId, st, save, clear, subs, settings, cfg, 'กรุณาเลือกปีการศึกษา เช่น ' + settings.current_year);
      st.year = m[1];
    } else if (st.step === 'id') {
      if (!/^\d{13}$/.test(digits)) {
        if (/^\d+$/.test(digits)) { lineReply_(ev.replyToken, 'เลขบัตรประชาชนต้องมี 13 หลัก (พิมพ์มา ' + digits.length + ' หลัก) ลองใหม่อีกครั้ง หรือพิมพ์ "ยกเลิก"'); return; }
        lineReply_(ev.replyToken, 'กรุณาพิมพ์เลขบัตรประชาชน 13 หลักของนักเรียน หรือพิมพ์ "ยกเลิก"');
        return;
      }
      const stu = lineVerifyId_(ev, userId, digits, ctx);
      if (!stu) return;
      clear();
      if (st.mode === 'latest') lineReplyResults_(ev.replyToken, [digits], false);
      else lineSendFiltered_(ev.replyToken, [digits], st);
      return;
    }
    return lineAskNext_(ev, userId, st, save, clear, subs, settings, cfg);
  }

  // ไม่มีบทสนทนาค้าง: พิมพ์เลขบัตรมาเลย → ผลภาคเรียนล่าสุด
  if (/^\d{13}$/.test(digits.replace(/(ดู)?(ผล)?คะแนน/g, ''))) {
    const id = digits.replace(/(ดู)?(ผล)?คะแนน/g, '');
    if (lineVerifyId_(ev, userId, id, ctx)) lineReplyResults_(ev.replyToken, [id], false);
    return;
  }
  if (/^\d[\d\s-]*$/.test(text)) { lineReply_(ev.replyToken, 'เลขบัตรประชาชนต้องมี 13 หลัก (พิมพ์มา ' + digits.length + ' หลัก) ลองใหม่อีกครั้ง'); return; }
  if (/^[ก-๙a-zA-Z.\s]{4,60}$/.test(text) && /\s/.test(text)) {
    lineReply_(ev.replyToken, '🔒 เพื่อความปลอดภัย ระบบไม่ค้นหาด้วยชื่อ (ใครก็รู้ชื่อเพื่อนได้)\nพิมพ์ "คะแนน" แล้วทำตามขั้นตอน โดยใช้เลขบัตรประชาชน 13 หลักของนักเรียน');
    return;
  }
  lineReplyQ_(ev.replyToken, 'เลือกเมนูได้เลย 👇 หรือพิมพ์ "คะแนน"', quick);
}

function lineFindSubject_(text, subs) {
  const t = text.replace(/\s/g, '');
  let best = null;
  subs.forEach(function (x) {
    const name = x.name.replace(/\s/g, '');
    if (t.indexOf(name) > -1 || t.toUpperCase() === x.subject_id) { if (!best || name.length > best.name.length) best = x; }
  });
  if (best) return best;
  // คำย่อ: "เสริม" → วิชาเสริม, "พื้นฐาน" → วิชาแกน/พื้นฐาน, "คณิต" เมื่อมีวิชาเดียวที่ขึ้นต้นด้วยคณิต
  const hit = subs.filter(function (x) {
    if (/เสริม/.test(t)) return /เสริม/.test(x.name);
    if (/พื้นฐาน/.test(t)) return /พื้นฐาน/.test(x.name);
    return false;
  });
  return hit.length === 1 ? hit[0] : null;
}

/** ถามขั้นถัดไปที่ยังขาด: รายวิชา → ภาคเรียน → ปีการศึกษา → เลขบัตร */
/** การ์ดปุ่มใหญ่แบบริชเมนู (Flex) สำหรับเลือกคำตอบในแต่ละขั้น */
const TILE_COLORS = [['#e6f9fc', '#0e7490'], ['#fff7e6', '#b45309'], ['#e8faf2', '#047857'], ['#edf3ff', '#1d4ed8'], ['#fdf2f8', '#be185d'], ['#f1f5f9', '#334155']];
function lineChoiceFlex_(title, subtitle, step, items, cols) {
  cols = cols || 2;
  const tiles = items.map(function (it, k) {
    const col = TILE_COLORS[(it.color === undefined ? k : it.color) % TILE_COLORS.length];
    const inner = [
      { type: 'text', text: it.emoji || '•', size: '3xl', align: 'center' },
      { type: 'text', text: it.label, size: 'sm', weight: 'bold', align: 'center', wrap: true, color: col[1], margin: 'sm' }
    ];
    if (it.sub) inner.push({ type: 'text', text: it.sub, size: 'xxs', align: 'center', wrap: true, color: '#5f7a85', margin: 'xs' });
    return {
      type: 'box', layout: 'vertical', flex: 1, backgroundColor: col[0], cornerRadius: '14px', paddingAll: '14px',
      justifyContent: 'center', borderWidth: '1px', borderColor: '#dce8ec', contents: inner,
      action: { type: 'message', label: it.label.slice(0, 20), text: it.text || it.label }
    };
  });
  const rows = [];
  for (let k = 0; k < tiles.length; k += cols) {
    const row = tiles.slice(k, k + cols);
    while (row.length < cols) row.push({ type: 'box', layout: 'vertical', flex: 1, contents: [{ type: 'text', text: ' ', size: 'xxs' }] });
    rows.push({ type: 'box', layout: 'horizontal', spacing: 'md', margin: k ? 'md' : 'none', contents: row });
  }
  return {
    type: 'flex', altText: title + ' — ' + items.map(function (x) { return x.label; }).join(' / '),
    contents: {
      type: 'bubble', size: 'mega',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#0891b2', paddingAll: '16px', contents: [
        { type: 'box', layout: 'horizontal', contents: [
          { type: 'text', text: title, color: '#ffffff', weight: 'bold', size: 'lg', flex: 1, wrap: true },
          { type: 'text', text: 'ขั้น ' + step + '/4', color: '#e6f9fc', size: 'xs', flex: 0, gravity: 'center' }
        ] },
        { type: 'text', text: subtitle, color: '#e6f9fc', size: 'xs', wrap: true, margin: 'sm' }
      ] },
      body: { type: 'box', layout: 'vertical', paddingAll: '14px', contents: rows },
      footer: { type: 'box', layout: 'vertical', paddingTop: '0px', contents: [
        { type: 'button', style: 'link', height: 'sm', color: '#93aab2', action: { type: 'message', label: 'ยกเลิก', text: 'ยกเลิก' } }
      ] }
    }
  };
}
function lineReplyFlex_(token, flex, warn, quickOptions) {
  const msgs = warn ? [{ type: 'text', text: warn }, flex] : [flex];
  if (quickOptions && quickOptions.length) {
    msgs[msgs.length - 1].quickReply = { items: quickOptions.slice(0, 13).map(function (o) {
      const label = o.label.length > 20 ? o.label.slice(0, 19) + '…' : o.label;
      return { type: 'action', action: { type: 'message', label: label, text: o.text } };
    }) };
  }
  lineCall_('post', '/message/reply', { replyToken: token, messages: msgs });
}

/** ถามขั้นถัดไปที่ยังขาด: รายวิชา → ภาคเรียน → ปีการศึกษา → เลขบัตร (แสดงเป็นการ์ดปุ่มใหญ่) */
function lineAskNext_(ev, userId, st, save, clear, subs, settings, cfg, warn) {
  const subj = subs.filter(function (x) { return x.subject_id === st.subject_id; })[0];
  if (!subj) {
    st.step = 'subject'; save(st);
    const items = subs.map(function (x) { return { emoji: x.icon, label: x.name, sub: x.type, text: x.name }; });
    return lineReplyFlex_(ev.replyToken, lineChoiceFlex_('📘 เลือกรายวิชา', 'แตะรายวิชาที่ต้องการดูคะแนน', 1, items, 2), warn,
      items.map(function (x) { return { label: x.emoji + ' ' + x.label, text: x.text }; }));
  }
  if (!st.term) {
    st.step = 'term'; save(st);
    const items = [
      { emoji: '🌱', label: 'ภาคเรียนที่ 1', sub: settings.term1_label, text: 'ภาคเรียนที่ 1', color: 2 },
      { emoji: '🍂', label: 'ภาคเรียนที่ 2', sub: settings.term2_label, text: 'ภาคเรียนที่ 2', color: 1 }
    ];
    return lineReplyFlex_(ev.replyToken, lineChoiceFlex_('📅 เลือกภาคเรียน', subj.icon + ' ' + subj.name, 2, items, 2), warn,
      items.map(function (x) { return { label: x.label, text: x.text }; }));
  }
  if (!st.year) {
    st.step = 'year'; save(st);
    const items = settings.years.slice().reverse().slice(0, 6).map(function (y, k) {
      return { emoji: y === settings.current_year ? '⭐' : '🗓️', label: 'ปีการศึกษา ' + y, sub: y === settings.current_year ? 'ปีปัจจุบัน' : '', text: 'ปีการศึกษา ' + y, color: k ? 5 : 0 };
    });
    return lineReplyFlex_(ev.replyToken, lineChoiceFlex_('🗓️ เลือกปีการศึกษา', subj.icon + ' ' + subj.name + ' · ภาคเรียนที่ ' + st.term, 3, items, items.length > 2 ? 3 : 2), warn,
      items.map(function (x) { return { label: x.label, text: x.text }; }));
  }
  const linked = lineUserIds_(userId);
  if (!cfg.always_id && linked.length) {
    clear();
    return lineSendFiltered_(ev.replyToken, linked, st);
  }
  st.step = 'id'; save(st);
  return lineCall_('post', '/message/reply', { replyToken: ev.replyToken, messages: [{
    type: 'flex', altText: 'พิมพ์เลขบัตรประชาชน 13 หลักของนักเรียน',
    contents: { type: 'bubble', size: 'mega', body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
      { type: 'box', layout: 'horizontal', contents: [
        { type: 'text', text: '🔒 ยืนยันตัวตน', weight: 'bold', size: 'lg', color: '#0e7490', flex: 1 },
        { type: 'text', text: 'ขั้น 4/4', size: 'xs', color: '#93aab2', flex: 0, gravity: 'center' }
      ] },
      { type: 'box', layout: 'vertical', margin: 'md', backgroundColor: '#e6f9fc', cornerRadius: '12px', paddingAll: '12px', contents: [
        { type: 'text', text: subj.icon + ' ' + subj.name, weight: 'bold', size: 'sm', wrap: true, color: '#0c2530' },
        { type: 'text', text: 'ภาคเรียนที่ ' + st.term + ' ปีการศึกษา ' + st.year, size: 'xs', color: '#5f7a85', margin: 'xs' }
      ] },
      { type: 'text', text: 'พิมพ์เลขบัตรประชาชน 13 หลักของนักเรียนในช่องแชทได้เลย', size: 'sm', wrap: true, margin: 'lg', color: '#2c4652' },
      { type: 'text', text: 'เช่น 1234567890123', size: 'xs', color: '#93aab2', margin: 'sm' }
    ] } }
  }] });
}

function lineVerifyId_(ev, userId, digits, ctx) {
  const c = CacheService.getScriptCache();
  const failKey = 'lf:' + userId;
  const fails = Number(c.get(failKey) || 0);
  if (fails >= 5) { lineReply_(ev.replyToken, '⏳ กรอกผิดหลายครั้ง กรุณารอ 10 นาทีแล้วลองใหม่'); return null; }
  try { checkThrottle_(); } catch (e) { lineReply_(ev.replyToken, '⏳ ' + e.message); return null; }
  const stu = studentMap_(ctx)[digits];
  if (!stu) {
    c.put(failKey, String(fails + 1), 600);
    addFail_();
    lineReply_(ev.replyToken, '❌ ไม่พบเลขบัตรนี้ในระบบ ตรวจตัวเลขอีกครั้ง (เหลือ ' + (4 - fails) + ' ครั้ง) หรือพิมพ์ "ยกเลิก"');
    return null;
  }
  const linked = lineUserIds_(userId);
  if (linked.indexOf(digits) < 0 && linked.length < LINE_MAX_LINK) {
    withLock_(function () {
      const tb = readTable_('LineUsers');
      const row = { user_id: userId, citizen_id: digits, linked_at: new Date(), last_push_at: '' };
      tb.rows.push(row);
      writeRows_(tb, [row]);
    });
    log_('LINE', 'student', 'ผูกบัญชี LINE กับนักเรียน ' + classLabel_(stu.level, stu.room) + ' (1 บัญชี)');
  }
  return stu;
}

/** ส่งผลตามรายวิชา/ภาคเรียน/ปีที่เลือก ถ้ายังไม่ประกาศ บอกภาคเรียนที่มีผลให้เลือกแทน */
function lineSendFiltered_(replyToken, ids, st) {
  const want = function (r) { return r.subject_id === st.subject_id && r.term === st.term && r.year === st.year; };
  const msgs = lineResultMessages_(ids, want);
  if (msgs.length) { lineCall_('post', '/message/reply', { replyToken: replyToken, messages: withQuick_(msgs) }); return; }
  const ctx = new Ctx();
  const avail = [];
  ids.forEach(function (id) {
    const d = studentResults_(ctx, id);
    if (!d) return;
    d.results.forEach(function (r) {
      const k = r.subject_name + ' ภาคเรียนที่ ' + r.term + ' ปี ' + r.year;
      if (avail.some(function (x) { return x.text === 'คะแนน' + k; })) return;
      const short = r.subject_name.replace('วิชา', '').replace('คณิตศาสตร์', 'คณิต');
      avail.push({ label: (short.length > 11 ? short.slice(0, 10) + '…' : short) + ' ' + r.term + '/' + r.year, text: 'คะแนน' + k });
    });
  });
  lineReplyQ_(replyToken, 'ยังไม่มีผลที่ประกาศของรายวิชานี้ ภาคเรียนที่ ' + st.term + '/' + st.year +
    (avail.length ? '\n\nผลที่ประกาศแล้ว เลือกดูได้เลย 👇' : '\nเมื่อครูประกาศผลแล้วถามใหม่อีกครั้งได้เลย'),
    avail.slice(0, 12));
}

function lineResultBubble_(name, r, cfg) {
  const rows = r.components.map(function (c) {
    return { type: 'box', layout: 'horizontal', margin: 'sm', contents: [
      { type: 'text', text: c.label, size: 'sm', color: '#5f7a85', flex: 3, wrap: true },
      { type: 'text', text: (c.value === null ? '–' : String(c.value)) + ' / ' + c.max, size: 'sm', color: '#0c2530', align: 'end', flex: 2, weight: 'bold' }
    ] };
  });
  if (r.show_total && r.total !== null) {
    rows.push({ type: 'separator', margin: 'md' });
    rows.push({ type: 'box', layout: 'horizontal', margin: 'md', contents: [
      { type: 'text', text: 'คะแนนรวม', size: 'md', weight: 'bold', color: '#0e7490', flex: 3 },
      { type: 'text', text: r.total + ' / ' + r.full, size: 'md', weight: 'bold', color: '#0e7490', align: 'end', flex: 2 }
    ] });
  }
  if (r.show_grade && r.grade !== null) {
    rows.push({ type: 'box', layout: 'horizontal', margin: 'md', backgroundColor: '#e8faf2', cornerRadius: '10px', paddingAll: '10px', contents: [
      { type: 'text', text: r.grade_mode === 'year' && r.term === '2' ? 'ผลการเรียนรายปี' : 'เกรดภาคเรียนนี้', size: 'sm', color: '#059669', flex: 3, gravity: 'center' },
      { type: 'text', text: String(r.grade), size: 'xxl', weight: 'bold', color: '#059669', align: 'end', flex: 1 }
    ] });
  }
  if (r.class_avg !== null && (r.show_total || r.components.length === 1)) rows.push({ type: 'text', text: 'ค่าเฉลี่ยของห้อง ' + r.class_avg, size: 'xs', color: '#93aab2', margin: 'md' });
  if (r.note) rows.push({ type: 'text', text: r.note, size: 'xs', color: '#c26a05', wrap: true, margin: 'md' });
  const bubble = {
    type: 'bubble', size: 'kilo',
    header: { type: 'box', layout: 'vertical', backgroundColor: '#0891b2', paddingAll: '14px', contents: [
      { type: 'text', text: (r.icon || '📘') + ' ' + r.subject_name, color: '#ffffff', weight: 'bold', size: 'md', wrap: true },
      { type: 'text', text: name + ' · ' + r.class_label, color: '#e6f9fc', size: 'xs', wrap: true },
      { type: 'text', text: 'ภาคเรียนที่ ' + r.term + '/' + r.year, color: '#e6f9fc', size: 'xs' }
    ] },
    body: { type: 'box', layout: 'vertical', contents: rows }
  };
  if (/^https:\/\//.test(cfg.site)) bubble.footer = { type: 'box', layout: 'vertical', contents: [
    { type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: 'ดูรายละเอียดในเว็บ', uri: cfg.site + 'index.html' } }
  ] };
  return bubble;
}

/** รวมผลของนักเรียนหลายคน → carousel (ภาคเรียนล่าสุดของแต่ละคน, สูงสุด 12 การ์ด) */
function lineResultMessages_(ids, filterFn) {
  const ctx = new Ctx();
  const cfg = lineSettings_(ctx);
  const bubbles = [];
  const names = [];
  ids.forEach(function (id) {
    const d = studentResults_(ctx, id);
    if (!d) return;
    let list = d.results;
    if (filterFn) list = list.filter(filterFn);
    else if (list.length) list = list.filter(function (r) { return r.year === list[0].year && r.term === list[0].term; });
    if (!list.length) return;
    names.push(d.student.name);
    list.forEach(function (r) { if (bubbles.length < 12) bubbles.push(lineResultBubble_(d.student.name, r, cfg)); });
  });
  if (!bubbles.length) return [];
  return [{ type: 'flex', altText: '📊 ผลคะแนน ' + names.join(', '), contents: bubbles.length === 1 ? bubbles[0] : { type: 'carousel', contents: bubbles } }];
}

function withQuick_(messages) {
  const items = lineMenuQuick_(lineMenu_(), lineSettings_().site).slice(0, 13).map(function (o) {
    const label = o.label.length > 20 ? o.label.slice(0, 19) + '…' : o.label;
    return { type: 'action', action: o.uri ? { type: 'uri', label: label, uri: o.uri } : { type: 'message', label: label, text: o.text } };
  });
  if (messages.length && items.length) messages[messages.length - 1].quickReply = { items: items };
  return messages;
}
function lineReplyResults_(replyToken, ids, first) {
  const msgs = lineResultMessages_(ids, null);
  const head = first ? '✅ ผูกบัญชีเรียบร้อย ครั้งต่อไปพิมพ์ "คะแนน" ได้เลย' : null;
  if (!msgs.length) {
    lineReply_(replyToken, (head ? head + '\n\n' : '') + 'ยังไม่มีผลคะแนนที่ประกาศ เมื่อครูประกาศผลแล้วพิมพ์ "คะแนน" อีกครั้ง');
    return;
  }
  const messages = head ? [{ type: 'text', text: head }].concat(msgs) : msgs;
  lineCall_('post', '/message/reply', { replyToken: replyToken, messages: withQuick_(messages) });
}

/** ประกาศผลแล้ว → ส่งผลรายบุคคลให้บัญชีที่ผูกไว้ (เปิดได้ในหน้าแอดมิน · นับโควตาข้อความ 1 ข้อความ/บัญชี) */
function linePushPersonal_(anns) {
  const res = { sent: 0, errors: 0 };
  const ctx = new Ctx();
  const keys = {};
  anns.forEach(function (a) { keys[[a.year, a.term, a.level, a.room, a.subject_id].join('|')] = 1; });
  const ids = {};
  ctx.t('Scores').rows.forEach(function (r) {
    if (keys[[S(r.year), S(r.term), S(r.level), S(r.room), S(r.subject_id)].join('|')]) ids[normId_(r.citizen_id)] = 1;
  });
  const byUser = {};
  readTable_('LineUsers').rows.forEach(function (u) {
    const id = normId_(u.citizen_id);
    if (!ids[id]) return;
    (byUser[S(u.user_id)] = byUser[S(u.user_id)] || []).push(id);
  });
  const annSet = {};
  anns.forEach(function (a) { annSet[a.year + '|' + a.term + '|' + a.subject_id] = 1; });
  const filter = function (r) { return !!annSet[r.year + '|' + r.term + '|' + r.subject_id]; };
  Object.keys(byUser).forEach(function (uid) {
    const msgs = lineResultMessages_(byUser[uid], filter);
    if (!msgs.length) return;
    const r = lineCall_('post', '/message/push', { to: uid, messages: [{ type: 'text', text: '📣 ประกาศผลคะแนนแล้ว' }].concat(msgs) });
    if (r.code === 200) res.sent++; else res.errors++;
  });
  if (res.sent || res.errors) log_('ระบบ', 'announce', 'ส่งผลคะแนนทาง LINE ส่วนตัว ' + res.sent + ' บัญชี' + (res.errors ? ' (ไม่สำเร็จ ' + res.errors + ')' : ''));
  return res;
}

function lineUnlinkAll_(req, sess) {
  let n = 0;
  withLock_(function () {
    const tb = readTable_('LineUsers');
    n = tb.rows.length;
    tb.rows = [];
    writeTable_(tb);
  });
  log_(sess.username, 'settings', 'ยกเลิกการผูกบัญชี LINE ส่วนตัวทั้งหมด (' + n + ' รายการ)');
  return lineInfo_();
}

// ===== ขึ้นปีการศึกษาใหม่ (เลื่อนชั้นทั้งโรงเรียน + ย้อนกลับได้) =====
function rolloverLast_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('LAST_ROLLOVER') || 'null'); } catch (e) { return null; }
}
function rolloverInfo_() {
  const st = publicSettings_(getSettings_(new Ctx()));
  const last = rolloverLast_();
  return {
    current_year: st.current_year, next_year: String(Number(st.current_year) + 1), current_term: st.current_term,
    levels: st.levels, last: last, can_undo: !!(last && last.to_year === st.current_year)
  };
}
function setSettingValues_(pairs) {
  const tb = readTable_('Settings');
  Object.keys(pairs).forEach(function (k) {
    const row = tb.rows.filter(function (r) { return S(r.key) === k; })[0];
    if (row) row.value = pairs[k]; else tb.rows.push({ key: k, value: pairs[k] });
  });
  writeTable_(tb);
}

function rolloverRun_(req, sess) {
  const st = publicSettings_(getSettings_(new Ctx(true)));
  const from = st.current_year;
  const to = S(req.to_year);
  if (!/^\d{4}$/.test(to) || Number(to) <= Number(from)) throw new Error('ปีการศึกษาใหม่ต้องมากกว่า ' + from);
  if (S(req.confirm) !== to) throw new Error('พิมพ์ปีการศึกษา ' + to + ' ในช่องยืนยันให้ตรง');
  const levels = st.levels;
  if (levels.length < 2) throw new Error('ตั้งค่าชั้นเรียนอย่างน้อย 2 ชั้นก่อน (ตั้งค่าระบบ → ชั้นเรียน)');
  const repeat = (req.repeat_ids || []).map(normId_);
  const leave = (req.leave_ids || []).map(normId_);

  // สำรองทั้งไฟล์ลง Drive ก่อนเปลี่ยนข้อมูล
  let backup = null;
  try { backup = backup_('ก่อนขึ้นปี' + to); } catch (e) { throw new Error('สำรองข้อมูลก่อนขึ้นปีไม่สำเร็จ จึงยังไม่เปลี่ยนแปลงข้อมูล: ' + e.message); }

  const result = withLock_(function () {
    const tb = readTable_('Students');
    // เก็บสำเนารายชื่อเดิมไว้สำหรับย้อนกลับ
    const snap = { from_year: from, to_year: to, term: st.current_term, years: st.years.join(','), rows: tb.rows.map(function (r) {
      const o = {};
      tb.headers.forEach(function (h) { if (h) o[h] = r[h] instanceof Date ? r[h].toISOString() : r[h]; });
      return o;
    }) };
    const file = backupFolder_().createFile(Utilities.newBlob(JSON.stringify(snap), 'application/json', 'rollover_' + from + '_to_' + to + '.json'));
    const now = new Date();
    const sum = { promoted: 0, graduated: 0, repeated: 0, left: 0, byLevel: {} };
    tb.rows.forEach(function (s) {
      if (!isActiveStudent_(s)) return;
      const id = normId_(s.citizen_id);
      if (leave.indexOf(id) > -1) { s.status = 'ย้ายออก'; s.updated_at = now; sum.left++; return; }
      if (repeat.indexOf(id) > -1) { s.updated_at = now; sum.repeated++; return; }
      const k = levels.indexOf(S(s.level));
      if (k < 0) return; // ชั้นที่ไม่อยู่ในรายการ ไม่แตะ
      if (k === levels.length - 1) { s.status = 'จบการศึกษา'; sum.graduated++; }
      else { s.level = levels[k + 1]; sum.promoted++; sum.byLevel[levels[k + 1]] = (sum.byLevel[levels[k + 1]] || 0) + 1; }
      s.updated_at = now;
    });
    writeTable_(tb);
    const years = st.years.slice();
    if (years.indexOf(to) < 0) years.push(to);
    setSettingValues_({ current_year: to, current_term: '1', years: years.sort().join(',') });
    let unlinked = 0;
    if (req.unlink_line) {
      const lu = readTable_('LineUsers');
      unlinked = lu.rows.length;
      lu.rows = [];
      writeTable_(lu);
    }
    sum.unlinked = unlinked;
    PropertiesService.getScriptProperties().setProperty('LAST_ROLLOVER', JSON.stringify({
      from_year: from, to_year: to, at: now.toISOString(), by: sess.username, file_id: file.getId(), file_url: file.getUrl(),
      backup_url: backup ? backup.url : '', summary: { promoted: sum.promoted, graduated: sum.graduated, repeated: sum.repeated, left: sum.left }
    }));
    return sum;
  });
  clearCache();
  log_(sess.username, 'settings', 'ขึ้นปีการศึกษา ' + from + ' → ' + to + ' (เลื่อนชั้น ' + result.promoted + ', จบ ' + result.graduated + ', ซ้ำชั้น ' + result.repeated + ', ย้ายออก ' + result.left + ')');
  const info = rolloverInfo_();
  info.result = result;
  return info;
}

function rolloverUndo_(req, sess) {
  const last = rolloverLast_();
  const st = publicSettings_(getSettings_(new Ctx(true)));
  if (!last || last.to_year !== st.current_year) throw new Error('ไม่มีการขึ้นปีที่ย้อนกลับได้ (ย้อนได้เฉพาะครั้งล่าสุด ขณะที่ปีปัจจุบันยังเป็นปีที่ขึ้นใหม่)');
  const snap = JSON.parse(DriveApp.getFileById(last.file_id).getBlob().getDataAsString());
  withLock_(function () {
    const tb = readTable_('Students');
    tb.rows = snap.rows;
    writeTable_(tb);
    setSettingValues_({ current_year: snap.from_year, current_term: snap.term || '2', years: snap.years });
    PropertiesService.getScriptProperties().deleteProperty('LAST_ROLLOVER');
  });
  clearCache();
  log_(sess.username, 'settings', 'ย้อนกลับการขึ้นปีการศึกษา ' + last.from_year + ' → ' + last.to_year);
  return rolloverInfo_();
}

// ===== รายงานผลรายห้อง + ลายเซ็น =====
function defaultSigners_(school) {
  return {
    teacher: { show: false, name: '', title: 'ครูผู้สอน' },
    measure: { name: '', title: 'หัวหน้าฝ่ายวัดและประเมินผล' },
    academic: { name: '', title: 'หัวหน้าฝ่ายวิชาการ' },
    deputy: { name: '', title: 'รองผู้อำนวยการ' + school },
    director: { name: '', title: 'ผู้อำนวยการ' + school }
  };
}
function reportSigners_(ctx) {
  const st = getSettings_(ctx);
  const def = defaultSigners_(st.school_name);
  let saved = {};
  try { saved = JSON.parse(S(st.report_signers) || '{}') || {}; } catch (e) { saved = {}; }
  Object.keys(def).forEach(function (k) {
    if (saved[k]) Object.keys(def[k]).forEach(function (f) { if (saved[k][f] !== undefined && saved[k][f] !== '') def[k][f] = saved[k][f]; });
  });
  def.teacher.show = !!(saved.teacher && saved.teacher.show);
  return def;
}
function reportSignersSave_(req, sess) {
  const src = req.signers || {};
  const out = {};
  ['teacher', 'measure', 'academic', 'deputy', 'director'].forEach(function (k) {
    const x = src[k] || {};
    out[k] = { name: S(x.name).slice(0, 80), title: S(x.title).slice(0, 80) };
  });
  out.teacher.show = !!(src.teacher && src.teacher.show);
  withLock_(function () { setSettingValues_({ report_signers: JSON.stringify(out) }); });
  log_(sess.username, 'settings', 'ปรับรายชื่อผู้ลงนามในรายงานผล');
  return reportSigners_(new Ctx());
}
function homeroomMap_(ctx, year) {
  const m = {};
  ctx.t('Homerooms').rows.forEach(function (r) {
    if (S(r.year) === S(year)) m[classLabel_(r.level, r.room)] = [S(r.teacher1), S(r.teacher2)].filter(String);
  });
  return m;
}
function homeroomSave_(req, sess) {
  const y = S(req.year), l = S(req.level), r = S(req.room);
  if (!/^\d{4}$/.test(y) || !l || !r) throw new Error('ระบุปีการศึกษา ชั้น และห้องให้ครบ');
  const t1 = S(req.teacher1).slice(0, 80), t2 = S(req.teacher2).slice(0, 80);
  withLock_(function () {
    const tb = readTable_('Homerooms');
    let row = tb.rows.filter(function (x) { return S(x.year) === y && S(x.level) === l && S(x.room) === r; })[0];
    if (!row) { row = { year: y, level: l, room: r }; tb.rows.push(row); }
    row.teacher1 = t1 || t2; row.teacher2 = t1 ? t2 : ''; row.updated_at = new Date();
    writeTable_(tb);
  });
  log_(sess.username, 'settings', 'กำหนดครูประจำชั้น ' + classLabel_(l, r) + ' ปี ' + y);
  return { class_label: classLabel_(l, r), teachers: [t1, t2].filter(String) };
}

/** ข้อมูลรายงานผลรายห้อง (ทุกช่องคะแนน) — ห้องเดียวหรือทุกห้องในชั้น */
function reportData_(req, sess) {
  assertSubject_(sess, req.subject_id);
  const ctx = new Ctx();
  const st = getSettings_(ctx);
  const subj = subjectById_(ctx, req.subject_id);
  const y = S(req.year), t = S(req.term), l = S(req.level);
  const sc = schemeFor_(ctx, y, t, subj);
  let rooms = [];
  if (S(req.room)) rooms = [S(req.room)];
  else {
    const set = {};
    if (y === S(st.current_year)) ctx.t('Students').rows.forEach(function (s) { if (S(s.level) === l && isActiveStudent_(s)) set[S(s.room)] = 1; });
    ctx.t('Scores').rows.forEach(function (r) { if (S(r.year) === y && S(r.term) === t && S(r.level) === l && S(r.subject_id) === subj.subject_id) set[S(r.room)] = 1; });
    rooms = Object.keys(set).sort(roomCmp_);
  }
  const hr = homeroomMap_(ctx, y);
  const grades = sc.show_grade || truthy_(req.force_grade);
  const t1 = grades && sc.grade_mode === 'year' && t === '2' ? term1PctMap_(ctx, y, subj) : {};
  const classes = rooms.map(function (room) {
    const c = buildClass_(ctx, st, { year: y, term: t, level: l, room: room }, subj);
    const dist = {};
    c.rows.forEach(function (r) {
      if (grades && r.grade === null && r.pct !== null) r.grade = gradeFor_(sc, t, r.pct, t1[r.key]);
      if (r.grade !== null && r.grade !== undefined) dist[r.grade] = (dist[r.grade] || 0) + 1;
    });
    const avgParts = {};
    sc.components.forEach(function (comp) {
      const v = c.rows.map(function (r) { return r.parts[comp.key]; }).filter(function (x) { return x !== null && x !== undefined; });
      avgParts[comp.key] = v.length ? round1_(v.reduce(function (a, b) { return a + b; }, 0) / v.length) : null;
    });
    return {
      class_label: classLabel_(l, room), room: room, homeroom: hr[classLabel_(l, room)] || [],
      rows: c.rows.map(function (r) { return { number: r.number, name: r.name, parts: r.parts, total: r.total, pct: r.pct, grade: grades ? r.grade : null }; }),
      summary: c.summary, avg_parts: avgParts, dist: dist, announcement: annOf_(ctx, y, t, l, room, subj.subject_id)
    };
  });
  return {
    school: st.school_name, district: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาศรีสะเกษ เขต 3', year: y, term: t, level: l,
    subject: subj, scheme: sc, show_grade: grades, classes: classes, signers: reportSigners_(ctx), printed_by: sess.name
  };
}

// ===== จัดการโครงสร้างคะแนน =====
function getScheme_(req, sess) {
  assertSubject_(sess, req.subject_id);
  const ctx = new Ctx();
  const subj = subjectById_(ctx, req.subject_id);
  const y = S(req.year), t = S(req.term) === '2' ? '2' : '1';
  const scored = ctx.t('Scores').rows.filter(function (r) { return S(r.year) === y && S(r.term) === t && S(r.subject_id) === subj.subject_id; }).length;
  return { subject: subj, year: y, term: t, scheme: schemeFor_(ctx, y, t, subj), other: schemeFor_(ctx, y, t === '1' ? '2' : '1', subj), scored: scored };
}

function saveScheme_(req, sess) {
  assertSubject_(sess, req.subject_id);
  const y = S(req.year), t = S(req.term);
  if (!/^\d{4}$/.test(y) || (t !== '1' && t !== '2')) throw new Error('ระบุปีการศึกษาและภาคเรียนให้ถูกต้อง');
  const used = {};
  const comps = (req.components || []).map(function (c, i) {
    const label = S(c.label).slice(0, 40);
    const max = num_(c.max);
    if (!label) throw new Error('ช่องคะแนนลำดับที่ ' + (i + 1) + ' ยังไม่มีชื่อ');
    if (max === null || max <= 0 || max > 1000) throw new Error('คะแนนเต็มของ "' + label + '" ต้องอยู่ระหว่าง 1–1000');
    let key = S(c.key);
    if (!/^[a-z0-9_]{1,24}$/.test(key) || used[key]) key = 'c' + Date.now().toString(36).slice(-4) + i;
    used[key] = true;
    return { key: key, label: label, max: max, visible: c.visible !== false };
  });
  if (!comps.length) throw new Error('ต้องมีช่องคะแนนอย่างน้อย 1 ช่อง');
  return withLock_(function () {
    const ctx = new Ctx(true);
    const subj = subjectById_(ctx, req.subject_id);
    const tb = ctx.t('Schemes');
    let row = tb.rows.filter(function (x) { return S(x.year) === y && S(x.term) === t && S(x.subject_id) === subj.subject_id; })[0];
    if (!row) { row = { scheme_id: newId_('S'), year: y, term: t, subject_id: subj.subject_id }; tb.rows.push(row); }
    row.components = JSON.stringify(comps);
    row.show_total = req.show_total !== false;
    row.show_grade = !!req.show_grade;
    row.grade_mode = S(req.grade_mode) === 'term' ? 'term' : 'year';
    row.note = S(req.note).slice(0, 160);
    row.updated_by = sess.username;
    row.updated_at = new Date();
    writeTable_(tb);
    log_(sess.username, 'settings', 'ปรับโครงสร้างคะแนน' + subj.name + ' เทอม ' + t + '/' + y + ' (' + comps.map(function (c) { return c.label + ' ' + c.max; }).join(', ') + ')');
    return getScheme_({ year: y, term: t, subject_id: subj.subject_id }, sess);
  });
}

function resetScheme_(req, sess) {
  assertSubject_(sess, req.subject_id);
  return withLock_(function () {
    const tb = readTable_('Schemes');
    tb.rows = tb.rows.filter(function (x) { return !(S(x.year) === S(req.year) && S(x.term) === S(req.term) && S(x.subject_id) === S(req.subject_id)); });
    writeTable_(tb);
    log_(sess.username, 'settings', 'คืนค่าโครงสร้างคะแนนเริ่มต้น ' + S(req.subject_id) + ' เทอม ' + S(req.term) + '/' + S(req.year));
    return getScheme_(req, sess);
  });
}

// ===== แอดมิน: รายวิชา =====
function saveSubject_(req, sess) {
  const id = S(req.subject_id).toUpperCase();
  if (!/^[A-Z0-9_-]{2,20}$/.test(id)) throw new Error('รหัสวิชาใช้ A-Z 0-9 _ - ยาว 2–20 ตัว เช่น MATH');
  if (!S(req.name)) throw new Error('กรอกชื่อรายวิชา');
  return withLock_(function () {
    const tb = readTable_('Subjects');
    let row = tb.rows.filter(function (x) { return S(x.subject_id).toUpperCase() === id; })[0];
    if (row && req.is_new) throw new Error('มีรหัสวิชา ' + id + ' อยู่แล้ว');
    if (!row) { row = { subject_id: id, work_max: 70, exam_max: 30 }; tb.rows.push(row); }
    row.name = S(req.name).slice(0, 80);
    row.type = S(req.type) || 'วิชาแกน';
    row.icon = S(req.icon).slice(0, 4) || '📘';
    row.levels = (req.levels || []).map(S).filter(String).join(',');
    row.grade_term2 = !!req.grade_term2;
    row.active = req.active !== false;
    writeTable_(tb);
    log_(sess.username, 'settings', (req.is_new ? 'เพิ่มรายวิชา ' : 'แก้ไขรายวิชา ') + row.name);
    return subjects_(new Ctx());
  });
}

function getSettingsAdmin_() {
  const ctx = new Ctx();
  const s = getSettings_(ctx);
  return { settings: publicSettings_(s), raw: { years: s.years, levels: s.levels }, subjects: subjects_(ctx) };
}

function saveSettings_(req, sess) {
  const v = {
    school_name: S(req.school_name) || DEFAULT_SETTINGS.school_name,
    current_year: S(req.current_year),
    current_term: S(req.current_term),
    years: splitList_(req.years).join(','),
    levels: splitList_(req.levels).join(','),
    term1_label: S(req.term1_label) || DEFAULT_SETTINGS.term1_label,
    term2_label: S(req.term2_label) || DEFAULT_SETTINGS.term2_label,
    ticker_mode: TICKER_MODES.indexOf(S(req.ticker_mode)) > -1 ? S(req.ticker_mode) : 'rtl',
    ticker_days: String(Math.min(Math.max(Number(req.ticker_days) || 14, 1), 90)),
    ticker_text: S(req.ticker_text).slice(0, 160)
  };
  if (!/^\d{4}$/.test(v.current_year)) throw new Error('ปีการศึกษาปัจจุบันต้องเป็นตัวเลข 4 หลัก เช่น 2569');
  if (v.current_term !== '1' && v.current_term !== '2') throw new Error('ภาคเรียนต้องเป็น 1 หรือ 2');
  if (!v.levels) throw new Error('กรอกชั้นเรียนอย่างน้อย 1 ชั้น');
  const years = splitList_(v.years).filter(function (y) { return /^\d{4}$/.test(y); });
  if (years.indexOf(v.current_year) < 0) years.push(v.current_year);
  v.years = years.sort().join(',');
  return withLock_(function () {
    const tb = readTable_('Settings');
    Object.keys(v).forEach(function (k) {
      const row = tb.rows.filter(function (r) { return S(r.key) === k; })[0];
      if (row) row.value = v[k]; else tb.rows.push({ key: k, value: v[k] });
    });
    writeTable_(tb);
    log_(sess.username, 'settings', 'ปรับตั้งค่าระบบ ปีการศึกษา ' + v.current_year + ' ภาคเรียนที่ ' + v.current_term);
    return getSettingsAdmin_();
  });
}

function listUsers_() {
  return readTable_('Users').rows.filter(function (u) { return S(u.username); }).map(function (u) {
    return {
      username: S(u.username), display_name: S(u.display_name), role: S(u.role) === 'admin' ? 'admin' : 'teacher',
      subjects: splitList_(u.subjects), active: S(u.active) === '' ? true : truthy_(u.active), created_at: iso_(u.created_at)
    };
  });
}

function saveUser_(req, sess) {
  const username = S(req.username).toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3–32 ตัว');
  const role = S(req.role) === 'admin' ? 'admin' : 'teacher';
  const active = req.active !== false;
  const pw = String(req.password || '');
  return withLock_(function () {
    const us = readTable_('Users');
    let u = us.rows.filter(function (x) { return S(x.username).toLowerCase() === username; })[0];
    const isNew = !u;
    if (isNew && req.is_new !== true) throw new Error('ไม่พบผู้ใช้นี้');
    if (!isNew && req.is_new === true) throw new Error('มีชื่อผู้ใช้นี้แล้ว');
    if (isNew && pw.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    if (!isNew && pw && pw.length < 6) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
    if (username === sess.username && (!active || role !== 'admin')) throw new Error('ไม่สามารถปิดใช้งานหรือลดสิทธิ์บัญชีของตนเองได้');
    if (isNew) { u = { username: username, created_at: new Date() }; us.rows.push(u); }
    u.display_name = S(req.display_name) || username;
    u.role = role;
    u.subjects = (req.subjects || []).map(S).filter(String).join(',');
    u.active = active;
    if (pw) { u.salt = Utilities.getUuid(); u.password_hash = hash_(pw, u.salt); }
    const admins = us.rows.filter(function (x) { return S(x.role) === 'admin' && (S(x.active) === '' || truthy_(x.active)); });
    if (!admins.length) throw new Error('ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 บัญชี');
    writeTable_(us);
    log_(sess.username, 'user', (isNew ? 'เพิ่มผู้ใช้ ' : 'แก้ไขผู้ใช้ ') + username + (pw && !isNew ? ' (ตั้งรหัสผ่านใหม่)' : ''));
    return listUsers_();
  });
}
