/* แผงควบคุม (admin.html) — จัดการคะแนน · โครงสร้างคะแนน · ES5
   ลำดับโหลดใน admin.html: admin-core.js ก่อน แล้วไฟล์ admin-*.js อื่น (ลำดับใดก็ได้) */
// ===== จัดการคะแนน =====
var sheet = null;
function viewScores(p) {
  var st = opt.settings;
  var s = { year: p.y || st.current_year, term: p.t || st.current_term, level: p.l || st.levels[0] || '', room: p.r || '', subject_id: p.s || '' };
  main.innerHTML = head('จัดการคะแนน', 'เลือกห้องและรายวิชา แล้วกรอกคะแนนเก็บและคะแนนสอบ') +
    '<div class="card card-pad"><div class="filters">' + selectField('fYear', 'ปีการศึกษา', yearList(), s.year) + selectField('fTerm', 'ภาคเรียน', TERMS, s.term) +
    selectField('fLevel', 'ชั้น', levelList(), s.level) + selectField('fRoom', 'ห้อง', [], '') +
    '<div class="field" style="grid-column:span 2"><label for="fSubject">รายวิชา</label><select class="select" id="fSubject"></select></div></div>' +
    '<button type="button" class="btn btn-primary btn-block" id="btnLoad" style="margin-top:14px">' + icon('users', 18) + 'แสดงรายชื่อและคะแนน</button></div><div id="sheet" style="margin-top:16px"></div>';
  fillRooms(s.room);
  fillSubjects(s.subject_id);
  $('fLevel').onchange = function () { fillRooms(''); fillSubjects($('fSubject').value); };
  $('btnLoad').onclick = function () {
    if (dirty && !window.confirm('มีคะแนนที่ยังไม่ได้บันทึก ต้องการโหลดใหม่หรือไม่')) return;
    dirty = false; loadSheet();
  };
  if (p.l && p.r && p.s) loadSheet();
}
function fillRooms(val) {
  var rooms = roomList($('fLevel').value);
  if (val && rooms.indexOf(val) < 0) rooms.push(val);
  $('fRoom').innerHTML = rooms.length ? optionsHtml(rooms.map(function (r) { return { v: r, t: 'ห้อง ' + r }; }), val || rooms[0]) : '<option value="">ยังไม่มีนักเรียนในชั้นนี้</option>';
}
function fillSubjects(val) {
  var list = subjectList($('fLevel').value);
  $('fSubject').innerHTML = list.length ? optionsHtml(list, val) : '<option value="">ไม่มีรายวิชาที่คุณดูแลในชั้นนี้</option>';
}
function curSel() {
  return { year: $('fYear').value, term: $('fTerm').value, level: $('fLevel').value, room: $('fRoom').value, subject_id: $('fSubject').value };
}
function loadSheet() {
  var q = curSel();
  if (!q.room || !q.subject_id) { toast('เลือกห้องและรายวิชาให้ครบ', 'err'); return; }
  setHashSilently('#scores?' + buildQuery({ y: q.year, t: q.term, l: q.level, r: q.room, s: q.subject_id }));
  var box = $('sheet');
  box.innerHTML = loadingBlock('กำลังโหลดรายชื่อ');
  retryFn = loadSheet;
  api('get_score_sheet', q).then(function (d) { sheet = { q: q, d: d }; dirty = false; renderSheet(); })
    .catch(function (e) { box.innerHTML = errorBlock(e.message); });
}
function renderSheet() {
  var d = sheet.d, q = sheet.q, subj = d.subject, sc = d.scheme, a = d.announcement, box = $('sheet');
  var comps = sc.components;
  var yearCols = sc.show_grade && q.term === '2' && sc.grade_mode === 'sum';
  var h = '<div class="card item-card" style="margin-bottom:12px"><span class="emoji sm" aria-hidden="true">' + esc(subj.icon) + '</span><div class="li-main"><span class="li-title">' + esc(subj.name) + ' ห้อง ' + esc(q.level + '/' + q.room) + '</span>' +
    '<span class="li-sub">เทอม ' + esc(q.term) + '/' + esc(q.year) + ' · ' + comps.map(function (c) { return esc(c.label) + ' ' + c.max; }).join(' + ') + ' = ' + sc.full + ' คะแนน' +
    (sc.is_default ? ' <span class="badge b-slate">ค่าเริ่มต้น</span>' : '') + '</span></div>' + statusBadge(a ? a.status : '') + '</div>' +
    '<div class="btn-row" style="margin:-4px 0 12px"><a class="btn btn-sm" href="#schemes?' + buildQuery({ y: q.year, t: q.term, s: subj.subject_id }) + '">' + icon('settings', 16) + 'ปรับช่องคะแนน / สิ่งที่จะประกาศ</a>' +
    '<span class="small muted">ผู้ปกครองเห็น: ' + comps.filter(function (c) { return c.visible; }).map(function (c) { return esc(c.label); }).join(', ') +
    (sc.show_total ? ', คะแนนรวม' : '') + (sc.show_grade ? ', เกรด' : '') + '</span></div>';
  if (!d.rows.length) {
    box.innerHTML = h + '<div class="card">' + emptyBlock('users', 'ไม่มีรายชื่อนักเรียนในห้องนี้', isAdmin ? 'เพิ่มนักเรียนก่อน แล้วกลับมากรอกคะแนน' : 'แจ้งผู้ดูแลระบบให้เพิ่มรายชื่อนักเรียน', isAdmin ? '<a class="btn btn-primary" href="#students">' + icon('user-plus', 18) + 'ไปหน้าจัดการนักเรียน</a>' : '') + '</div>';
    return;
  }
  h += '<details class="card paste no-print"><summary>' + icon('clipboard', 18) + 'วางคะแนนจาก Excel</summary><div class="paste-body">' +
    '<p class="small muted" style="margin-top:0">เรียงคอลัมน์ใน Excel เป็น: <b>เลขที่ · ' + comps.map(function (c) { return esc(c.label); }).join(' · ') + '</b> แล้ววางด้านล่าง ระบบจะเติมตามเลขที่</p>' +
    dropZone('scoreDrop') + '<textarea class="textarea" id="pasteBox" placeholder="1&#9;' + comps.map(function (c) { return Math.round(c.max * .8); }).join('&#9;') + '"></textarea>' +
    '<button type="button" class="btn btn-sm" id="btnPaste" style="margin-top:10px">' + icon('check', 16) + 'เติมคะแนนลงตาราง</button></div></details>';
  h += '<div class="table-wrap"><table class="tbl"><thead><tr><th class="c">เลขที่</th><th>ชื่อ-สกุล</th>' +
    comps.map(function (c) { return '<th class="c" title="' + (c.visible ? 'ประกาศให้ผู้ปกครองเห็น' : 'ไม่ประกาศ (ครูเห็นอย่างเดียว)') + '">' + esc(c.label) + ' (' + c.max + ')' + (c.visible ? '' : ' 🔒') + '</th>'; }).join('') +
    '<th class="num">รวม (' + sc.full + ')</th>' + (yearCols ? '<th class="num">เทอม 1</th><th class="num">รวมปี</th>' : '') + (sc.show_grade ? '<th class="c">เกรด</th>' : '') + (d.special_enabled ? '<th class="c">ผลพิเศษ / หมายเหตุ</th>' : '') + '</tr></thead><tbody>' +
    d.rows.map(function (r, i) {
      var n = r.number === null ? '-' : r.number;
      return '<tr><td class="c">' + esc(n) + '</td><td class="nowrap">' + esc(r.name) + '</td>' +
        comps.map(function (c, ci) {
          var v = r.parts[c.key];
          return '<td class="c"><input class="input score-in" data-f="' + ci + '" data-i="' + i + '" inputmode="decimal" autocomplete="off" value="' + (v === null || v === undefined ? '' : v) + '" aria-label="' + esc(c.label) + ' เลขที่ ' + esc(n) + '"></td>';
        }).join('') +
        '<td class="num strong" id="tot' + i + '">' + fmtScore(r.total) + '</td>' +
        (yearCols ? '<td class="num muted">' + fmtScore(r.t1_total) + '</td><td class="num strong">' + (r.missing_t1 ? '<span class="badge b-amber" title="ไม่มีคะแนนเทอม 1">ไม่มีเทอม 1</span>' : fmtScore(r.year_total) + '<small class="muted">/' + r.year_full + '</small>') + '</td>' : '') +
        (sc.show_grade ? '<td class="c strong">' + fmtScore(r.grade) + '</td>' : '') +
        (d.special_enabled ? '<td class="sp-cell"><select class="select sp-sel' + (r.special ? ' on' : '') + '" data-sp="' + i + '" aria-label="ผลพิเศษ เลขที่ ' + esc(n) + '">' +
          '<option value="">—</option>' + ['0', 'ร', 'มส'].map(function (k) { return '<option value="' + k + '"' + (r.special === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select>' +
          '<input class="input sp-note" data-spn="' + i + '" value="' + esc(r.special_note || '') + '" placeholder="หมายเหตุ"' + (r.special ? '' : ' hidden') + ' maxlength="200"></td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div>';
  if (d.special_enabled) h += '<p class="small muted">ผลพิเศษ: <b>0</b> = ไม่ผ่านเกณฑ์ (สอบแก้ตัว) · <b>ร</b> = รอการตัดสิน · <b>มส</b> = ไม่มีสิทธิ์เข้ารับการวัดผลปลายภาค — เลือกแล้วใส่หมายเหตุให้นักเรียนเห็น เช่น "ยังไม่ส่งงานชิ้นที่ 3", "เวลาเรียน 70%"</p>';
  if (sc.show_grade) h += '<p class="small muted">เกรดจะคำนวณใหม่หลังบันทึก' + (sc.grade_mode === 'year' && q.term === '2' ? ' (เฉลี่ยร้อยละของเทอม 1 และเทอม 2)' : ' (จากร้อยละของเทอมนี้)') + '</p>';
  h += '<div class="save-bar"><span class="grow" id="fillInfo"></span>';
  if (isAdmin && a && a.status !== 'published') h += '<button type="button" class="btn btn-green" id="btnPublish">' + icon('megaphone', 18) + 'ประกาศผลห้องนี้</button>';
  if (a && a.status === 'published') h += '<span class="badge b-green">ผู้ปกครองเห็นคะแนนแล้ว</span>';
  h += '<button type="button" class="btn btn-primary" id="btnSave">' + icon('save', 18) + 'บันทึกคะแนน</button></div>';
  if (a && a.status === 'published') h += '<p class="small muted">ห้องนี้ประกาศผลแล้ว คะแนนที่บันทึกใหม่จะแสดงให้ผู้ปกครองเห็นทันที</p>';
  box.innerHTML = h;
  updateInfo();

  box.onchange = function (e) {
    var sel = e.target;
    if (!sel.getAttribute || sel.getAttribute('data-sp') === null) return;
    var note = box.querySelector('[data-spn="' + sel.getAttribute('data-sp') + '"]');
    note.hidden = !sel.value;
    sel.classList.toggle('on', !!sel.value);
    if (sel.value) note.focus();
    dirty = true; updateInfo();
  };
  box.oninput = function (e) {
    var inp = e.target;
    if (inp.getAttribute && inp.getAttribute('data-spn') !== null) { dirty = true; return; }
    if (!inp.classList || !inp.classList.contains('score-in')) return;
    validateCell(inp);
    recalc(Number(inp.getAttribute('data-i')));
    dirty = true;
    updateInfo();
  };
  box.onkeydown = function (e) {
    var inp = e.target;
    if (!inp.classList || !inp.classList.contains('score-in')) return;
    var f = Number(inp.getAttribute('data-f')), i = Number(inp.getAttribute('data-i')), next = null;
    if (e.key === 'Enter' || e.key === 'ArrowDown') next = cell(i + 1, f);
    else if (e.key === 'ArrowUp') next = cell(i - 1, f);
    else if (e.key === 'ArrowRight' && inp.selectionStart === inp.value.length) next = cell(i, f + 1);
    else if (e.key === 'ArrowLeft' && inp.selectionStart === 0) next = cell(i, f - 1);
    else return;
    e.preventDefault();
    if (next) { next.focus(); next.select(); }
  };
  $('btnPaste').onclick = applyPaste;
  bindDrop('scoreDrop', function (file) {
    readSheetFile(file).then(function (f) {
      $('pasteBox').value = f.tsv;
      sheet.file = f;
      applyPaste();
    }).catch(function (e) { toast(e.message, 'err'); });
  });
  $('btnSave').onclick = saveSheet;
  document.onkeydown = function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S') && $('btnSave') && !$('sa-swal')) { e.preventDefault(); saveSheet(); }
  };
  if ($('btnPublish')) $('btnPublish').onclick = publishRoom;
}
function cell(i, f) { return $('sheet').querySelector('.score-in[data-f="' + f + '"][data-i="' + i + '"]'); }
function validateCell(inp) {
  var c = sheet.d.scheme.components[Number(inp.getAttribute('data-f'))];
  var v = inp.value.trim();
  var n = Number(v);
  var bad = v !== '' && (!isFinite(n) || n < 0 || n > c.max);
  inp.classList.toggle('bad', bad);
  inp.title = bad ? 'ใส่ได้ 0–' + c.max : '';
  return !bad;
}
function rowSum(i) {
  var comps = sheet.d.scheme.components, sum = 0, any = false;
  for (var f = 0; f < comps.length; f++) {
    var v = cell(i, f).value.trim();
    if (v !== '') { sum += Number(v) || 0; any = true; }
  }
  return any ? Math.round(sum * 10) / 10 : null;
}
function recalc(i) { $('tot' + i).textContent = fmtScore(rowSum(i)); }
function updateInfo() {
  var rows = sheet.d.rows, filled = 0, sum = 0;
  for (var i = 0; i < rows.length; i++) { var t = rowSum(i); if (t !== null) { filled++; sum += t; } }
  $('fillInfo').innerHTML = 'กรอกแล้ว <b>' + filled + '/' + rows.length + '</b> คน' + (filled ? ' · เฉลี่ย <b>' + (Math.round(sum / filled * 10) / 10) + '</b>' : '') +
    (dirty ? ' · <span style="color:var(--amber)">ยังไม่ได้บันทึก</span>' : '') + ' <span class="kbd">Ctrl+S</span>';
}
function applyPaste() {
  var lines = $('pasteBox').value.split(/\r?\n/), rows = sheet.d.rows, nc = sheet.d.scheme.components.length, done = 0, miss = [];
  lines.forEach(function (line) {
    if (!line.trim()) return;
    var cols = line.split(/\t|,/).map(function (c) { return c.trim(); });
    if (cols.length < 2) cols = line.trim().split(/\s+/);
    var num = Number(cols[0]);
    if (!cols[0] || !isFinite(num)) return;
    var idx = -1;
    for (var i = 0; i < rows.length; i++) { if (rows[i].number === num) { idx = i; break; } }
    if (idx < 0) { miss.push(cols[0]); return; }
    // ข้ามคอลัมน์ชื่อ (ถ้ามี) ให้อัตโนมัติ
    var vals = cols.slice(1);
    if (vals.length > nc && !isFinite(Number(vals[0]))) vals = vals.slice(1);
    for (var f = 0; f < nc && f < vals.length; f++) { cell(idx, f).value = vals[f]; validateCell(cell(idx, f)); }
    recalc(idx);
    done++;
  });
  if (done) { dirty = true; updateInfo(); }
  toast('เติมคะแนนแล้ว ' + done + ' คน' + (miss.length ? ' · ไม่พบเลขที่ ' + miss.join(', ') : ''), miss.length ? 'err' : 'ok');
}
function saveSheet() {
  var bad = $('sheet').querySelectorAll('.score-in.bad');
  if (bad.length) { swal({ icon: 'warning', title: 'ตรวจคะแนนอีกครั้ง', text: 'มีคะแนนเกินคะแนนเต็มหรือไม่ถูกต้อง ' + bad.length + ' ช่อง (ช่องสีแดง)' }); bad[0].focus(); return; }
  var comps = sheet.d.scheme.components;
  var nv = function (v) { var n = (v === null || v === undefined || v === '') ? NaN : Number(v); return isFinite(n) ? String(Math.round(n * 10) / 10) : ''; };
  // ส่งเฉพาะช่องที่แก้ พร้อมค่าเดิม (base) — ถ้าครูอื่นแก้ช่องเดียวกันไปก่อน ระบบจะไม่เขียนทับ
  var rows = [];
  sheet.d.rows.forEach(function (r, i) {
    var o = { key: r.key, parts: {}, base: {}, label: 'เลขที่ ' + (r.number === null ? '-' : r.number) + ' ' + r.name }, changed = false;
    comps.forEach(function (c, f) {
      var v = cell(i, f).value.trim();
      if (nv(v) !== nv(r.parts[c.key])) { o.parts[c.key] = v; o.base[c.key] = r.parts[c.key] === null || r.parts[c.key] === undefined ? '' : r.parts[c.key]; changed = true; }
    });
    var sp = $('sheet').querySelector('[data-sp="' + i + '"]');
    if (sp) {
      var note = sp.value ? $('sheet').querySelector('[data-spn="' + i + '"]').value.trim() : '';
      if (sp.value !== (r.special || '') || note !== (r.special_note || '')) { o.special = sp.value; o.special_note = note; o.special_base = r.special || ''; changed = true; }
    }
    if (changed) rows.push(o);
  });
  if (!rows.length) { dirty = false; updateInfo(); toast('ไม่มีคะแนนที่เปลี่ยนแปลง'); return; }
  var btn = $('btnSave');
  setBusy(btn, true, 'กำลังบันทึก');
  api('save_scores', extend(sheet.q, { rows: rows })).then(function (res) {
    dirty = false;
    if (sheet.file) { archive('scores', sheet.file); sheet.file = null; }
    if (res.sheet) { sheet.d = res.sheet; renderSheet(); } else loadSheet();
    var cf = res.conflicts || [];
    if (cf.length) {
      swal({ icon: 'warning', title: 'บันทึกแล้ว ' + (res.saved - 0) + ' คน · มี ' + cf.length + ' ช่องที่ครูท่านอื่นแก้ไปก่อน',
        html: '<p class="swal-text">ระบบไม่เขียนทับช่องเหล่านี้ และแสดงค่าล่าสุดในตารางแล้ว กรุณาตรวจอีกครั้ง</p><ul class="swal-list">' + cf.slice(0, 8).map(function (c) {
          return '<li><span>⚠️</span><span><b>' + esc(c.who) + ' · ' + esc(c.field) + '</b><small>ค่าที่คุณกรอก ' + esc(c.yours) + ' · ค่าล่าสุดในระบบ ' + esc(c.current) + '</small></span></li>';
        }).join('') + '</ul>' + (cf.length > 8 ? '<p class="small muted">และอีก ' + (cf.length - 8) + ' ช่อง</p>' : '') });
    } else {
      swal({ icon: 'success', title: 'บันทึกคะแนนแล้ว', text: 'บันทึก ' + res.saved + ' คน เรียบร้อย' + (res.status === 'published' ? ' (ห้องนี้ประกาศแล้ว ผู้ปกครองเห็นทันที)' : ''), timer: 2200 });
    }
  }).catch(function (e) { swal({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: e.message }); setBusy(btn, false); });
}
function publishRoom() {
  var a = sheet.d.announcement, q = sheet.q;
  if (dirty) { toast('บันทึกคะแนนก่อนประกาศผล', 'err'); return; }
  if (!a) { toast('บันทึกคะแนนอย่างน้อย 1 ครั้งก่อนประกาศผล', 'err'); return; }
  confirmBox('ประกาศผลห้อง ' + q.level + '/' + q.room, 'นักเรียนและผู้ปกครองห้องนี้จะเห็นคะแนน' + sheet.d.subject.name + ' เทอม ' + q.term + '/' + q.year + ' ทันทีหลังประกาศ' + (opt.line_ready ? ' และระบบจะส่งลิงก์ดูคะแนนเข้ากลุ่ม LINE ที่ผูกไว้' : ''), 'ประกาศผล').then(function (ok) {
    if (!ok) return;
    api('set_announcement_status', { ann_id: a.ann_id, status: 'published' }).then(function (r) {
      confetti();
      swal({ icon: 'announce', title: 'ประกาศผลแล้ว!', text: 'ห้อง ' + q.level + '/' + q.room + ' ดูคะแนนได้แล้ว' + lineText(r.line), timer: 3600 });
      loadSheet();
    }).catch(function (e) { toast(e.message, 'err'); });
  });
}

// ===== โครงสร้างคะแนน =====
var PRESETS = [
  { name: 'เก็บ 70 · สอบ 30', comps: [['work', 'คะแนนเก็บ', 70, true], ['exam', 'คะแนนสอบ', 30, true]], total: true },
  { name: 'เก็บ 50 · กลางภาค 20 · ปลายภาค 30', comps: [['work', 'คะแนนเก็บ', 50, true], ['mid', 'สอบกลางภาค', 20, true], ['final', 'สอบปลายภาค', 30, true]], total: true },
  { name: 'เก็บ 60 · กลางภาค 20 · ปลายภาค 20', comps: [['work', 'คะแนนเก็บ', 60, true], ['mid', 'สอบกลางภาค', 20, true], ['final', 'สอบปลายภาค', 20, true]], total: true },
  { name: 'ประถม เทอมละ 50 (รวมปี 100)', comps: [['work', 'คะแนนเก็บ', 35, true], ['exam', 'คะแนนสอบ', 15, true]], total: true, primary: true },
  { name: 'ประกาศเฉพาะเก็บ + กลางภาค', comps: [['work', 'คะแนนเก็บ', 50, true], ['mid', 'สอบกลางภาค', 20, true], ['final', 'สอบปลายภาค', 30, false]], total: false, grade: false }
];
function viewSchemes(p) {
  var st = opt.settings, ed = null, info = null;
  var subs = subjectList('');
  main.innerHTML = head('โครงสร้างคะแนนและการประกาศ', 'กำหนดช่องคะแนน คะแนนเต็ม และเลือกว่าจะประกาศอะไรให้ผู้ปกครองเห็น แยกตามภาคเรียนและรายวิชา') +
    '<div class="card card-pad"><div class="filters">' + selectField('xYear', 'ปีการศึกษา', yearList(), p.y || st.current_year) +
    selectField('xTerm', 'ภาคเรียน', TERMS, p.t || st.current_term) + selectField('xSubj', 'รายวิชา', subs, p.s || (subs[0] ? subs[0].v : '')) + '</div></div>' +
    '<div id="schemeOut" style="margin-top:16px"></div>';
  ['xYear', 'xTerm', 'xSubj'].forEach(function (id) { $(id).onchange = load; });
  var out = $('schemeOut');
  out.addEventListener('click', onClick);
  out.addEventListener('input', onInput);
  out.addEventListener('change', onInput);
  if (subs.length) load(); else out.innerHTML = '<div class="card">' + emptyBlock('book', 'ไม่มีรายวิชาที่คุณดูแล', '') + '</div>';

  function q() { return { year: $('xYear').value, term: $('xTerm').value, subject_id: $('xSubj').value }; }
  function load() {
    retryFn = load;
    setHashSilently('#schemes?' + buildQuery({ y: q().year, t: q().term, s: q().subject_id }));
    out.innerHTML = loadingBlock('กำลังโหลดโครงสร้างคะแนน');
    api('get_scheme', q()).then(function (d) {
      info = d;
      ed = clone(d.scheme);
      render(true);
    }).catch(function (e) { out.innerHTML = errorBlock(e.message); });
  }
  function clone(sc) {
    return {
      is_default: sc.is_default, show_total: sc.show_total, show_grade: sc.show_grade, grade_mode: sc.grade_mode, note: sc.note || '', no_zero: !!sc.no_zero,
      components: sc.components.map(function (c) { return { key: c.key, label: c.label, max: c.max, visible: c.visible }; })
    };
  }
  function sums() {
    var f = 0, v = 0;
    ed.components.forEach(function (c) { var m = Number(c.max) || 0; f += m; if (c.visible) v += m; });
    return { full: f, vis: v };
  }
  function render(first) {
    var t = q().term, sm = sums();
    var h = '<div class="card card-pad"><div class="prog-top" style="margin-bottom:6px">' + icon('sheet', 20) + '<span>' + esc(info.subject.icon + ' ' + info.subject.name) + ' · เทอม ' + esc(t) + '/' + esc(q().year) + '</span>' +
      (ed.is_default ? '<span class="badge b-slate" style="margin-left:auto">ยังใช้ค่าเริ่มต้น</span>' : '<span class="badge b-cyan" style="margin-left:auto">กำหนดเองแล้ว</span>') + '</div>' +
      (info.scored ? '<div class="notice info">' + icon('info', 18) + '<span>มีคะแนนบันทึกไว้แล้ว ' + info.scored + ' รายการ · แก้ชื่อหรือคะแนนเต็มได้ คะแนนเดิมยังอยู่ · ถ้าลบช่อง คะแนนของช่องนั้นจะไม่ถูกนำมาคิด (กู้คืนได้โดยเพิ่มช่องเดิมกลับ)</span></div>' : '') +
      specialCard() +
      '<p class="label" style="margin:16px 0 8px">แบบสำเร็จรูป</p><div class="chip-row">' + PRESETS.map(function (pr, i) { return '<button type="button" class="chip" data-preset="' + i + '">' + esc(pr.name) + '</button>'; }).join('') +
      (!info.other.is_default ? '<button type="button" class="chip" data-copy>' + icon('clipboard', 14) + ' คัดลอกจากเทอม ' + (t === '1' ? '2' : '1') + '</button>' : '') + '</div>' +
      '<p class="label" style="margin:14px 0 8px">ช่องคะแนน</p><div class="comp-list">' + ed.components.map(function (c, i) {
        return '<div class="comp-row' + (c.visible ? '' : ' hidden-comp') + '"><span class="comp-no">' + (i + 1) + '</span>' +
          '<input class="input" data-c="label" data-i="' + i + '" value="' + esc(c.label) + '" maxlength="40" placeholder="ชื่อช่อง เช่น สอบกลางภาค" aria-label="ชื่อช่องคะแนน">' +
          '<input class="input comp-max" data-c="max" data-i="' + i + '" value="' + esc(c.max) + '" inputmode="decimal" aria-label="คะแนนเต็ม">' +
          '<label class="switch" title="ประกาศให้ผู้ปกครองเห็น"><input type="checkbox" data-c="visible" data-i="' + i + '"' + (c.visible ? ' checked' : '') + '><span></span><em>' + (c.visible ? 'ประกาศ' : 'ซ่อน') + '</em></label>' +
          '<span class="comp-act"><button type="button" class="icon-btn sm" data-mv="-1" data-i="' + i + '" aria-label="เลื่อนขึ้น"' + (i ? '' : ' disabled') + '>' + icon('chevron-left', 16, 'rot90') + '</button>' +
          '<button type="button" class="icon-btn sm" data-del="' + i + '" aria-label="ลบช่อง">' + icon('trash', 16) + '</button></span></div>';
      }).join('') + '</div>' +
      '<button type="button" class="btn btn-sm" data-add style="margin-top:10px">' + icon('plus', 16) + 'เพิ่มช่องคะแนน</button>' +
      '<p class="small" style="margin:12px 0 0">คะแนนเต็มรวม <b>' + sm.full + '</b> · ประกาศให้เห็น <b>' + sm.vis + '</b>' + (sm.full !== 100 ? ' <span class="badge b-amber">รวมไม่เท่ากับ 100</span>' : '') + '</p>' +
      '<p class="label" style="margin:18px 0 8px">สิ่งที่ผู้ปกครองจะเห็นเพิ่ม</p>' +
      '<label class="check"><input type="checkbox" data-o="show_total"' + (ed.show_total ? ' checked' : '') + '>แสดงคะแนนรวม (เฉพาะช่องที่ประกาศ)</label>' +
      '<label class="check"><input type="checkbox" data-o="show_grade"' + (ed.show_grade ? ' checked' : '') + '>แสดงเกรด</label>' +
      (ed.show_grade ? '<div class="seg-mini">' +
        (t === '2' ? '<label><input type="radio" name="gm" data-o="grade_mode" value="sum"' + (ed.grade_mode === 'sum' ? ' checked' : '') + '>รวมคะแนนเทอม 1 + เทอม 2 แล้วตัดเกรด (ประถม)</label>' : '') +
        '<label><input type="radio" name="gm" data-o="grade_mode" value="year"' + (ed.grade_mode === 'year' ? ' checked' : '') + '>' + (t === '2' ? 'เฉลี่ยร้อยละเทอม 1 และ 2' : 'เกรดทั้งปี (เทอม 1 ใช้คะแนนเทอมนี้)') + '</label>' +
        '<label><input type="radio" name="gm" data-o="grade_mode" value="term"' + (ed.grade_mode === 'term' ? ' checked' : '') + '>เกรดเฉพาะเทอมนี้</label></div>' +
        (t === '2' && ed.grade_mode === 'sum' ? '<div class="notice info" style="margin:10px 0 0 26px">' + icon('info', 18) + '<span>คะแนนเต็ม เทอม 1 <b>' + info.other.full + '</b> + เทอม 2 <b>' + sm.full + '</b> = <b>' + (info.other.full + sm.full) + '</b>' +
          (info.other.full + sm.full === 100 ? ' ✓' : ' — ระบบคิดเป็นร้อยละให้ (แนะนำให้รวมได้ 100 เช่น เทอมละ 50)') + (info.other.is_default ? '<br>เทอม 1 ยังใช้โครงสร้างเริ่มต้น ตั้งเทอม 1 ให้ตรงกันด้วย' : '') + '</span></div>' : '') +
        '<label class="check" style="margin:8px 0 0 26px"><input type="checkbox" data-o="no_zero"' + (ed.no_zero ? ' checked' : '') + '>ไม่ติด 0 — ต่ำกว่าร้อยละ 50 ให้ได้เกรด 1 (ประถม)</label>' : '') +
      '<div class="field" style="margin-top:12px"><label for="xNote">ข้อความถึงผู้ปกครอง (ไม่บังคับ)</label><input class="input" id="xNote" data-o="note" value="' + esc(ed.note) + '" maxlength="160" placeholder="เช่น เทอมนี้ประกาศคะแนนเก็บและกลางภาค เกรดจะแจ้งปลายปี"></div>' +
      '<div class="btn-row" style="margin-top:8px">' + (!ed.is_default ? '<button type="button" class="btn btn-danger" data-reset>' + icon('trash', 16) + 'คืนค่าเริ่มต้น</button>' : '') +
      '<button type="button" class="btn btn-primary push" data-save>' + icon('save', 18) + 'บันทึกโครงสร้างคะแนน</button></div></div>' +
      '<h2 class="sec-title">' + icon('eye', 20) + 'ตัวอย่างที่ผู้ปกครองจะเห็น</h2>' + preview();
    out.innerHTML = h;
    if (first) enter(out);
  }
  function specialCard() {
    var lv = opt.settings.special_levels || [];
    return '<details class="special-card"' + (lv.length ? '' : '') + '><summary>' + icon('alert', 18) + '<span>ผลการเรียนพิเศษ <b>0 · ร · มส</b> — ใช้กับ ' + (lv.length ? esc(lv.join(', ')) : 'ยังไม่มีชั้นที่เปิดใช้') + ' (ทุกรายวิชา)</span></summary>' +
      '<div class="special-body"><ul class="special-list"><li><b>0</b> ไม่ผ่านเกณฑ์ — ต้องสอบแก้ตัว</li><li><b>ร</b> รอการตัดสิน — ส่งงาน/สอบไม่ครบ</li><li><b>มส</b> ไม่มีสิทธิ์เข้ารับการวัดผลปลายภาค — เวลาเรียนไม่ถึงร้อยละ 80</li></ul>' +
      '<p class="small muted">ครูเลือกผลพิเศษรายคนพร้อมหมายเหตุได้ในหน้า <b>จัดการคะแนน</b> ผลพิเศษจะแสดงแทนเกรด ทั้งในหน้าผู้ปกครอง LINE และรายงาน · ค่าเริ่มต้นใช้กับทุกชั้นที่ขึ้นต้นด้วย "ม."</p>' +
      (isAdmin ? '<p class="label" style="margin:10px 0 6px">ชั้นที่ใช้ผลพิเศษ</p><div class="chip-row" style="flex-wrap:wrap" id="spLv">' + levelList().map(function (l) {
        return '<button type="button" class="chip" data-splv="' + esc(l) + '" aria-pressed="' + (lv.indexOf(l) > -1) + '">' + esc(l) + '</button>';
      }).join('') + '</div><button type="button" class="btn btn-sm btn-primary" data-spsave>' + icon('save', 15) + 'บันทึกชั้นที่ใช้</button>' +
        (levelList().some(function (l) { return /^ม/.test(l); }) ? '' : '<p class="small muted" style="margin-top:8px">ยังไม่มีชั้นมัธยมในระบบ เพิ่มได้ที่ ตั้งค่าระบบ → ชั้นเรียน เช่น <code>ป.1,…,ป.6,ม.1,ม.2,ม.3</code></p>') : '') + '</div></details>';
  }
  function preview() {
    var vis = ed.components.filter(function (c) { return c.visible && Number(c.max) > 0; });
    if (!vis.length) return '<div class="card">' + emptyBlock('eye-off', 'ยังไม่มีช่องที่ประกาศ', 'ผู้ปกครองจะเห็นเฉพาะชื่อวิชาและข้อความ') + '</div>';
    var tot = 0, full = 0;
    var boxes = vis.map(function (c) { var v = Math.round(Number(c.max) * .8 * 10) / 10; tot += v; full += Number(c.max); return '<div class="sbox"><span>' + esc(c.label) + '</span><b>' + v + '</b><small>/' + c.max + '</small><div class="bar mini"><span style="width:80%"></span></div></div>'; }).join('');
    return '<article class="card result"><div class="result-head"><span class="emoji" aria-hidden="true">' + esc(info.subject.icon) + '</span><div><h3>' + esc(info.subject.name) + '</h3><span class="muted small">ตัวอย่างคะแนนสมมติ 80%</span></div>' + statusBadge('published') + '</div>' +
      (ed.note ? '<p class="cheer">' + esc(ed.note) + '</p>' : '') +
      '<div class="scores" style="grid-template-columns:repeat(' + Math.min(vis.length + (ed.show_total && vis.length > 1 ? 1 : 0), 3) + ',1fr)">' + boxes +
      (ed.show_total && vis.length > 1 ? '<div class="sbox total"><span>รวม</span><b>' + (Math.round(tot * 10) / 10) + '</b><small>/' + full + '</small></div>' : '') + '</div>' +
      (ed.show_grade ? '<div class="grade-box"><span>' + (ed.grade_mode !== 'term' ? 'ผลการเรียนรายปี' : 'เกรดภาคเรียนนี้') + '<small>' + (ed.grade_mode === 'sum' && q().term === '2' ? 'เทอม 1: 40/' + info.other.full + ' + เทอม 2: ' + (Math.round(tot * 10) / 10) + '/' + full + ' = ' + (Math.round((40 + tot) * 10) / 10) + '/' + (info.other.full + full) : 'คำนวณจากคะแนนทุกช่อง') + '</small></span><span class="grade-stamp">4</span></div>' : '') + '</article>';
  }
  function applyPreset(pr) {
    ed.components = pr.comps.map(function (c) { return { key: c[0], label: c[1], max: c[2], visible: c[3] }; });
    ed.show_total = pr.total !== false;
    if (pr.grade === false) ed.show_grade = false;
    if (pr.primary) {
      if (q().term === '2') { ed.show_grade = true; ed.grade_mode = 'sum'; ed.no_zero = true; } else ed.show_grade = false;
    }
    render();
  }
  function onClick(e) {
    var b;
    if ((b = closestEl(e.target, '[data-splv]'))) { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); return; }
    if (closestEl(e.target, '[data-spsave]')) {
      var lv = [], on = out.querySelectorAll('[data-splv][aria-pressed="true"]');
      for (var z = 0; z < on.length; z++) lv.push(on[z].getAttribute('data-splv'));
      api('special_levels_save', { levels: lv }, { loader: 'กำลังบันทึก' }).then(function (st2) {
        opt.settings = st2; render(); toast('บันทึกชั้นที่ใช้ผลพิเศษแล้ว');
      }).catch(function (x) { swal({ icon: 'error', title: 'ไม่สำเร็จ', text: x.message }); });
      return;
    }
    if ((b = closestEl(e.target, '[data-preset]'))) { applyPreset(PRESETS[Number(b.getAttribute('data-preset'))]); return; }
    if (closestEl(e.target, '[data-copy]')) { var o = clone(info.other); o.is_default = ed.is_default; ed = o; render(); toast('คัดลอกโครงสร้างจากอีกเทอมแล้ว กดบันทึกเพื่อใช้งาน'); return; }
    if (closestEl(e.target, '[data-add]')) { ed.components.push({ key: '', label: '', max: 10, visible: true }); render(); var ins = out.querySelectorAll('[data-c="label"]'); ins[ins.length - 1].focus(); return; }
    if ((b = closestEl(e.target, '[data-del]'))) { ed.components.splice(Number(b.getAttribute('data-del')), 1); render(); return; }
    if ((b = closestEl(e.target, '[data-mv]'))) {
      var i = Number(b.getAttribute('data-i'));
      var tmp = ed.components[i - 1]; ed.components[i - 1] = ed.components[i]; ed.components[i] = tmp; render(); return;
    }
    if (closestEl(e.target, '[data-reset]')) {
      confirmBox('คืนค่าเริ่มต้น', 'ใช้โครงสร้างเริ่มต้นของรายวิชา (เก็บ + สอบ) สำหรับเทอมนี้ คะแนนที่บันทึกไว้ในช่องอื่นจะไม่ถูกลบ', 'คืนค่า', true).then(function (ok) {
        if (ok) api('reset_scheme', q(), { loader: 'กำลังคืนค่าเริ่มต้น' }).then(function (d) { info = d; ed = clone(d.scheme); render(); toast('คืนค่าเริ่มต้นแล้ว'); }).catch(function (x) { swal({ icon: 'error', title: 'ไม่สำเร็จ', text: x.message }); });
      });
      return;
    }
    if (closestEl(e.target, '[data-save]')) save();
  }
  function onInput(e) {
    var el = e.target, c = el.getAttribute('data-c'), o = el.getAttribute('data-o');
    if (c) {
      var comp = ed.components[Number(el.getAttribute('data-i'))];
      if (c === 'visible') { comp.visible = el.checked; render(); return; }
      comp[c] = c === 'max' ? el.value.replace(/[^\d.]/g, '') : el.value;
      if (c === 'max' && e.type === 'change') render();
      else if (c === 'label' && e.type === 'change') { var pv = out.querySelector('.result'); if (pv) pv.outerHTML = preview(); }
      return;
    }
    if (o === 'note') { ed.note = el.value; if (e.type === 'change') render(); return; }
    if (o === 'grade_mode') { ed.grade_mode = el.value; render(); return; }
    if (o) { ed[o] = el.checked; render(); }
  }
  function save() {
    api('save_scheme', extend(q(), {
      components: ed.components.map(function (c) { return { key: c.key, label: c.label, max: Number(c.max), visible: c.visible }; }),
      show_total: ed.show_total, show_grade: ed.show_grade, grade_mode: ed.grade_mode, note: ed.note, no_zero: ed.no_zero
    }), { loader: 'กำลังบันทึกโครงสร้างคะแนน' }).then(function (d) {
      info = d; ed = clone(d.scheme); render();
      swal({ icon: 'success', title: 'บันทึกโครงสร้างคะแนนแล้ว', text: 'หน้ากรอกคะแนนและหน้าผู้ปกครองจะใช้โครงสร้างนี้ทันที', timer: 2400 });
    }).catch(function (x) { swal({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: x.message }); });
  }
}
