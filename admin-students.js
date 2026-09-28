/* แผงควบคุม (admin.html) — จัดการนักเรียน · ขึ้นปีการศึกษาใหม่ · ES5
   ลำดับโหลดใน admin.html: admin-core.js ก่อน แล้วไฟล์ admin-*.js อื่น (ลำดับใดก็ได้) */
// ===== จัดการนักเรียน =====
function viewStudents() {
  var all = [], shown = [];
  main.innerHTML = head('จัดการนักเรียน', 'เลขบัตรประชาชนใช้เป็นรหัสเข้าสู่ระบบของนักเรียนและผู้ปกครอง') +
    '<div class="btn-row" style="margin-bottom:12px"><button type="button" class="btn btn-primary" id="btnAddStu">' + icon('user-plus', 18) + 'เพิ่มนักเรียน</button>' +
    '<button type="button" class="btn" id="btnImport">' + icon('upload', 18) + 'นำเข้าจาก Excel</button><button type="button" class="btn push" id="btnStuCsv">' + icon('download', 18) + 'CSV</button></div>' +
    '<div class="card card-pad" style="margin-bottom:12px"><div class="filters">' + selectField('sLevel', 'ชั้น', [{ v: '', t: 'ทุกชั้น' }].concat(levelList()), '') +
    '<div class="field"><label for="sRoom">ห้อง</label><select class="select" id="sRoom"><option value="">ทุกห้อง</option></select></div>' +
    inputField('sQ', 'ค้นหา', '', 'type="search" placeholder="ชื่อหรือเลขบัตร"') + '</div></div>' +
    '<p class="small muted" id="stuCount"></p><div id="stuTable"></div>';
  $('btnAddStu').onclick = function () { studentForm(null, load); };
  $('btnImport').onclick = function () { importModal(load); };
  $('btnStuCsv').onclick = function () {
    downloadCSV('รายชื่อนักเรียน.csv', [['เลขบัตรประชาชน', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ชั้น', 'ห้อง', 'เลขที่', 'สถานะ']].concat(shown.map(function (s) {
      return ['\t' + s.citizen_id, s.prefix, s.first_name, s.last_name, s.level, s.room, s.number, s.status];
    })));
  };
  $('sLevel').onchange = function () {
    var l = this.value, rooms = [];
    all.forEach(function (s) { if (s.level === l && rooms.indexOf(s.room) < 0) rooms.push(s.room); });
    rooms.sort(function (a, b) { return (Number(a) || 0) - (Number(b) || 0); });
    $('sRoom').innerHTML = '<option value="">ทุกห้อง</option>' + optionsHtml(rooms.map(function (r) { return { v: r, t: 'ห้อง ' + r }; }), '');
    render();
  };
  $('sRoom').onchange = render;
  $('sQ').oninput = render;
  $('stuTable').addEventListener('click', function (e) {
    var tr = closestEl(e.target, '[data-k]');
    if (tr) studentForm(shown[Number(tr.getAttribute('data-k'))], load);
  });
  load();

  function load() {
    retryFn = load;
    $('stuTable').innerHTML = loadingBlock();
    api('list_students').then(function (d) { all = d; render(); }).catch(function (e) { $('stuTable').innerHTML = errorBlock(e.message); });
  }
  function render() {
    var l = $('sLevel').value, r = $('sRoom').value, q = $('sQ').value.trim(), qd = q.replace(/\D/g, '');
    shown = all.filter(function (s) {
      if (l && s.level !== l) return false;
      if (r && s.room !== r) return false;
      if (q && s.name.indexOf(q) < 0 && !(qd.length >= 2 && s.citizen_id.indexOf(qd) > -1)) return false;
      return true;
    });
    $('stuCount').textContent = 'แสดง ' + shown.length + ' จาก ' + all.length + ' คน · แตะที่แถวเพื่อแก้ไข';
    if (!all.length) { $('stuTable').innerHTML = '<div class="card">' + emptyBlock('users', 'ยังไม่มีนักเรียนในระบบ', 'เพิ่มทีละคน หรือนำเข้ารายชื่อทั้งห้องจาก Excel') + '</div>'; return; }
    $('stuTable').innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr><th>ชั้น</th><th class="c">เลขที่</th><th>ชื่อ-สกุล</th><th>เลขบัตร</th><th>สถานะ</th></tr></thead><tbody>' +
      (shown.length ? shown.map(function (s, i) {
        return '<tr class="clickable" data-k="' + i + '" tabindex="0"><td class="nowrap">' + esc(s.class_label) + '</td><td class="c">' + fmtScore(s.number) + '</td><td>' + esc(s.name) + '</td><td class="mono-id nowrap">' + esc(s.masked) + '</td><td>' + stuBadge(s.status) + '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="c muted">ไม่พบนักเรียนตามเงื่อนไข</td></tr>') + '</tbody></table></div>';
  }
}

function studentForm(rec, onSaved) {
  var isEdit = !!rec;
  var v = rec || { citizen_id: '', prefix: '', first_name: '', last_name: '', level: opt.settings.levels[0] || '', room: '', number: '', status: 'กำลังศึกษา' };
  openModal({
    title: isEdit ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียน',
    body: '<form id="stuF"><div class="form-grid">' +
      inputField('stId', 'เลขบัตรประชาชน 13 หลัก', formatId(v.citizen_id), 'inputmode="numeric" autocomplete="off" required', 'full') +
      inputField('stPrefix', 'คำนำหน้า', v.prefix, 'list="prefixList" placeholder="ด.ช. / ด.ญ."') +
      selectField('stStatus', 'สถานะ', STU_STATUS, v.status) +
      inputField('stFirst', 'ชื่อ', v.first_name, 'required') + inputField('stLast', 'นามสกุล', v.last_name, 'required') +
      selectField('stLevel', 'ชั้น', levelList(), v.level) + inputField('stRoom', 'ห้อง', v.room, 'inputmode="numeric" placeholder="1" required') +
      inputField('stNo', 'เลขที่', v.number === null ? '' : v.number, 'inputmode="numeric"') +
      '</div><datalist id="prefixList"><option value="ด.ช."><option value="ด.ญ."><option value="เด็กชาย"><option value="เด็กหญิง"><option value="นาย"><option value="นางสาว"></datalist>' +
      '<div id="stErr" class="form-error" hidden></div></form>',
    foot: (isEdit ? '<button type="button" class="btn btn-danger left" id="stDel">' + icon('trash', 18) + 'ลบ</button>' : '') +
      '<button type="button" class="btn" data-close>ยกเลิก</button><button type="submit" form="stuF" class="btn btn-primary" id="stSave">' + icon('save', 18) + 'บันทึก</button>'
  });
  $('stId').oninput = function () { this.value = formatId(this.value); };
  function fail(msg) { $('stErr').textContent = msg; $('stErr').hidden = false; }
  $('stuF').onsubmit = function (e) {
    e.preventDefault();
    var id = $('stId').value.replace(/\D/g, '');
    if (id.length !== 13) { fail('เลขบัตรประชาชนต้องมี 13 หลัก (กรอกแล้ว ' + id.length + ' หลัก)'); return; }
    var btn = $('stSave');
    setBusy(btn, true, 'กำลังบันทึก');
    api('save_student', {
      original_id: isEdit ? v.citizen_id : '', citizen_id: id, prefix: $('stPrefix').value, first_name: $('stFirst').value, last_name: $('stLast').value,
      level: $('stLevel').value, room: $('stRoom').value, number: $('stNo').value, status: $('stStatus').value
    }).then(function () {
      closeModal(); toast(isEdit ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มนักเรียนแล้ว');
      refreshOptions().then(null, function () { });
      if (onSaved) onSaved();
    }).catch(function (ex) { fail(ex.message); setBusy(btn, false); });
  };
  if (isEdit) $('stDel').onclick = function () {
    confirmBox('ลบนักเรียน', 'ลบ ' + v.name + ' ออกจากรายชื่อ (คะแนนที่บันทึกไว้ยังเก็บอยู่ในชีต Scores)', 'ลบนักเรียน', true).then(function (ok) {
      if (!ok) return;
      api('delete_student', { citizen_id: v.citizen_id }).then(function () {
        toast('ลบนักเรียนแล้ว'); refreshOptions().then(null, function () { }); if (onSaved) onSaved();
      }).catch(function (ex) { toast(ex.message, 'err'); });
    });
  };
}

function parseImport(text) {
  var rows = [];
  text.split(/\r?\n/).forEach(function (line, i) {
    if (!line.trim()) return;
    var cols = (line.indexOf('\t') > -1 ? line.split('\t') : line.split(',')).map(function (c) { return c.trim(); });
    var id = (cols[0] || '').replace(/\D/g, '');
    if (!id && rows.length === 0) return; // แถวหัวตาราง
    rows.push({ line: i + 1, citizen_id: id, prefix: cols[1] || '', first_name: cols[2] || '', last_name: cols[3] || '', level: cols[4] || '', room: cols[5] || '', number: cols[6] || '' });
  });
  return rows;
}

function importModal(onDone) {
  openModal({
    title: 'นำเข้ารายชื่อนักเรียนจาก Excel', wide: true,
    body: '<p style="margin-top:0">คัดลอก 7 คอลัมน์ตามลำดับนี้จาก Excel แล้ววางด้านล่าง (มีแถวหัวตารางได้)</p>' +
      '<div class="pills" style="margin-bottom:12px"><span class="pill">เลขบัตรประชาชน</span><span class="pill">คำนำหน้า</span><span class="pill">ชื่อ</span><span class="pill">นามสกุล</span><span class="pill">ชั้น (ป.3)</span><span class="pill">ห้อง</span><span class="pill">เลขที่</span></div>' +
      dropZone('stuDrop') + '<textarea class="textarea" id="impText" style="min-height:200px" placeholder="1234567890123&#9;ด.ช.&#9;ณัฐวุฒิ&#9;สมบูรณ์ดี&#9;ป.3&#9;1&#9;5"></textarea>' +
      '<p class="hint" id="impInfo">ถ้าเลขบัตรซ้ำกับที่มีอยู่ ระบบจะปรับปรุงข้อมูลคนเดิม</p><div id="impResult"></div>',
    foot: '<button type="button" class="btn" data-close>ปิด</button><button type="button" class="btn btn-primary" id="impGo" disabled>' + icon('upload', 18) + 'นำเข้า</button>'
  });
  $('impText').oninput = function () {
    var n = parseImport(this.value).length;
    $('impInfo').textContent = n ? 'พบข้อมูล ' + n + ' แถว พร้อมนำเข้า' : 'ถ้าเลขบัตรซ้ำกับที่มีอยู่ ระบบจะปรับปรุงข้อมูลคนเดิม';
    $('impGo').disabled = !n;
  };
  var impFile = null;
  bindDrop('stuDrop', function (file) {
    readSheetFile(file).then(function (f) {
      impFile = f;
      $('impText').value = f.tsv;
      $('impText').oninput();
      toast('อ่านไฟล์ ' + f.name + ' แล้ว ตรวจรายชื่อก่อนกดนำเข้า');
    }).catch(function (e) { toast(e.message, 'err'); });
  });
  $('impGo').onclick = function () {
    var rows = parseImport($('impText').value), btn = this;
    setBusy(btn, true, 'กำลังนำเข้า');
    api('import_students', { rows: rows }).then(function (r) {
      setBusy(btn, false);
      $('impResult').innerHTML = '<div class="notice info">' + icon('check-circle', 18) + '<span>เพิ่มใหม่ ' + r.added + ' คน · ปรับปรุง ' + r.updated + ' คน' + (r.errors.length ? ' · ข้ามไป ' + r.errors.length + ' แถว' : '') + '</span></div>' +
        (r.errors.length ? '<div class="notice">' + icon('alert', 18) + '<span>' + r.errors.map(esc).join('<br>') + '</span></div>' : '');
      if (r.added || r.updated) {
        $('impText').value = ''; btn.disabled = true; refreshOptions().then(null, function () { }); onDone();
        if (r.added + r.updated > 5) confetti();
        swal({ icon: r.errors.length ? 'warning' : 'success', title: 'นำเข้ารายชื่อแล้ว', text: 'เพิ่มใหม่ ' + r.added + ' คน · ปรับปรุง ' + r.updated + ' คน' + (r.errors.length ? ' · ข้าม ' + r.errors.length + ' แถว (ดูรายละเอียดในหน้าต่าง)' : ''), timer: r.errors.length ? 0 : 2600 });
        if (impFile) { archive('students', impFile); impFile = null; }
      }
    }).catch(function (e) { setBusy(btn, false); toast(e.message, 'err'); });
  };
}

// ===== ขึ้นปีการศึกษาใหม่ =====
function viewRollover() {
  var info = null, students = [], repeat = {}, leave = {};
  main.innerHTML = head('ขึ้นปีการศึกษาใหม่', 'เลื่อนชั้นนักเรียนทั้งโรงเรียนในครั้งเดียว คะแนนปีเก่ายังดูย้อนหลังได้ครบ') + '<div id="roOut">' + loadingBlock('กำลังเตรียมข้อมูล') + '</div>';
  retryFn = viewRollover;
  var out = $('roOut');
  apiBatch([{ action: 'rollover_info' }, { action: 'list_students' }]).then(function (r) {
    info = r[0]; students = r[1].filter(function (x) { return x.status === 'กำลังศึกษา'; });
    render(true);
  }).catch(function (e) { out.innerHTML = errorBlock(e.message); });

  function plan() {
    var lv = info.levels, from = {}, to = {}, grad = 0, unknown = 0;
    students.forEach(function (x) {
      from[x.level] = (from[x.level] || 0) + 1;
      if (leave[x.key]) return;
      if (repeat[x.key]) { to[x.level] = (to[x.level] || 0) + 1; return; }
      var k = lv.indexOf(x.level);
      if (k < 0) { unknown++; return; }
      if (k === lv.length - 1) grad++; else to[lv[k + 1]] = (to[lv[k + 1]] || 0) + 1;
    });
    return { from: from, to: to, grad: grad, unknown: unknown };
  }
  function render(first) {
    var lv = info.levels, p = plan();
    var nRep = Object.keys(repeat).length, nLeave = Object.keys(leave).length;
    var h = '';
    if (info.can_undo) {
      h += '<div class="notice" style="margin:0 0 14px">' + icon('info', 18) + '<span>ขึ้นปีการศึกษา ' + esc(info.last.from_year) + ' → ' + esc(info.last.to_year) + ' แล้วเมื่อ ' + esc(fmtDateTime(info.last.at)) +
        ' · ถ้าทำผิด ย้อนกลับได้ (คืนรายชื่อและชั้นเดิมทั้งหมด) <button type="button" class="btn btn-sm btn-danger" data-undo style="margin-left:6px">ย้อนกลับการขึ้นปี</button></span></div>';
    }
    h += '<div class="card roll-hero"><div><small>ปีการศึกษาปัจจุบัน</small><b>' + esc(info.current_year) + '</b></div><div class="roll-arrow">' + icon('chevron-right', 34) + '</div>' +
      '<div><small>ปีการศึกษาใหม่</small><b class="new">' + esc(info.next_year) + '</b></div></div>';
    h += '<h2 class="sec-title">' + icon('users', 20) + '1. ตรวจการเลื่อนชั้น (นักเรียนกำลังศึกษา ' + students.length + ' คน)</h2><div class="list">' +
      lv.map(function (l, k) {
        var nxt = k === lv.length - 1 ? '🎓 จบการศึกษา' : lv[k + 1];
        return '<div class="li"><span class="lv-chip">' + esc(l) + '</span><span class="li-main"><span class="li-title">' + (p.from[l] || 0) + ' คน</span></span>' + icon('chevron-right', 18, 'muted') +
          '<span class="lv-chip ' + (k === lv.length - 1 ? 'grad' : 'next') + '">' + esc(nxt) + '</span></div>';
      }).join('') + '</div>' +
      '<p class="small muted">หลังขึ้นปี: ' + lv.map(function (l) { return esc(l) + ' ' + (p.to[l] || 0) + ' คน'; }).join(' · ') + ' · จบการศึกษา ' + p.grad + ' คน' +
      (p.unknown ? ' · <b style="color:var(--amber)">ชั้นไม่อยู่ในรายการตั้งค่า ' + p.unknown + ' คน (จะไม่ถูกเลื่อน)</b>' : '') + '</p>';
    h += '<h2 class="sec-title">' + icon('user-cog', 20) + '2. ข้อยกเว้น (ถ้ามี)</h2><div class="card card-pad">' +
      '<div class="input-wrap"><span class="lead-ic">' + icon('search', 18) + '</span><input class="input" id="roQ" placeholder="ค้นชื่อนักเรียนที่ซ้ำชั้นหรือย้ายออก" autocomplete="off"></div><div id="roRes"></div>' +
      (nRep || nLeave ? '<div class="pills" style="margin-top:12px">' + students.filter(function (x) { return repeat[x.key] || leave[x.key]; }).map(function (x) {
        return '<span class="pill ' + (leave[x.key] ? 'pill-red' : 'pill-amber') + '">' + (leave[x.key] ? 'ย้ายออก' : 'ซ้ำชั้น') + ': ' + esc(x.name) + ' (' + esc(x.class_label) + ') <button type="button" class="pill-x" data-rm="' + esc(x.key) + '" aria-label="เอาออก">' + icon('x', 14) + '</button></span>';
      }).join('') + '</div>' : '<p class="small muted" style="margin:10px 0 0">ไม่มีข้อยกเว้น นักเรียนทุกคนเลื่อนชั้นตามปกติ</p>') + '</div>';
    h += '<h2 class="sec-title">' + icon('settings', 20) + '3. ตัวเลือก</h2><div class="card card-pad">' +
      '<label class="check">' + icon('check-circle', 18, 'ok-ic') + 'สำรองข้อมูลทั้งหมดลง Google Drive ก่อนเปลี่ยน (อัตโนมัติ)</label>' +
      '<label class="check">' + icon('check-circle', 18, 'ok-ic') + 'ตั้งปีการศึกษาปัจจุบันเป็น ' + esc(info.next_year) + ' ภาคเรียนที่ 1</label>' +
      '<label class="check"><input type="checkbox" id="roUnlink">ยกเลิกการผูกบัญชี LINE ส่วนตัวทั้งหมด (ปกติไม่ต้อง เพราะเลขบัตรนักเรียนคนเดิม)</label></div>';
    h += '<h2 class="sec-title">' + icon('shield', 20) + '4. ยืนยัน</h2><div class="card card-pad"><p style="margin-top:0">พิมพ์ <b>' + esc(info.next_year) + '</b> เพื่อยืนยันการขึ้นปีการศึกษา</p>' +
      '<div class="btn-row"><input class="input" id="roConfirm" inputmode="numeric" maxlength="4" placeholder="' + esc(info.next_year) + '" style="max-width:160px;text-align:center;font-size:20px;font-weight:700">' +
      '<button type="button" class="btn btn-primary push" id="roGo" disabled>' + icon('grad', 18) + 'ขึ้นปีการศึกษา ' + esc(info.next_year) + '</button></div></div>';
    out.innerHTML = h;
    if (first) enter(out);
    $('roConfirm').oninput = function () { $('roGo').disabled = this.value.trim() !== info.next_year; };
    $('roQ').oninput = function () {
      var q = this.value.trim();
      if (q.length < 2) { $('roRes').innerHTML = ''; return; }
      var hit = students.filter(function (x) { return x.name.indexOf(q) > -1; }).slice(0, 8);
      $('roRes').innerHTML = hit.length ? '<div class="list" style="margin-top:10px">' + hit.map(function (x) {
        return '<div class="li"><span class="li-main"><span class="li-title">' + esc(x.name) + '</span><span class="li-sub">' + esc(x.class_label) + ' เลขที่ ' + fmtScore(x.number) + '</span></span>' +
          '<button type="button" class="btn btn-sm" data-rep="' + esc(x.key) + '">ซ้ำชั้น</button><button type="button" class="btn btn-sm btn-danger" data-lv="' + esc(x.key) + '">ย้ายออก</button></div>';
      }).join('') + '</div>' : '<p class="small muted">ไม่พบนักเรียน</p>';
    };
  }
  out.addEventListener('click', function (e) {
    var b;
    if ((b = closestEl(e.target, '[data-rep]'))) { var k = b.getAttribute('data-rep'); delete leave[k]; repeat[k] = 1; render(); return; }
    if ((b = closestEl(e.target, '[data-lv]'))) { var k2 = b.getAttribute('data-lv'); delete repeat[k2]; leave[k2] = 1; render(); return; }
    if ((b = closestEl(e.target, '[data-rm]'))) { var k3 = b.getAttribute('data-rm'); delete repeat[k3]; delete leave[k3]; render(); return; }
    if (closestEl(e.target, '[data-undo]')) {
      confirmBox('ย้อนกลับการขึ้นปี', 'คืนรายชื่อ ชั้น และสถานะนักเรียนเป็นเหมือนก่อนขึ้นปี และตั้งปีการศึกษากลับเป็น ' + info.last.from_year + ' (นักเรียนที่เพิ่มหลังขึ้นปีจะหายไป)', 'ย้อนกลับ', true).then(function (ok) {
        if (!ok) return;
        api('rollover_undo', {}, { loader: 'กำลังย้อนกลับการขึ้นปี' }).then(function () {
          clearSwr();
          swal({ icon: 'success', title: 'ย้อนกลับแล้ว', text: 'ปีการศึกษาปัจจุบันคือ ' + info.last.from_year, timer: 2600 });
          refreshOptions().then(viewRollover, viewRollover);
        }).catch(function (ex) { swal({ icon: 'error', title: 'ย้อนกลับไม่สำเร็จ', text: ex.message }); });
      });
      return;
    }
    if (closestEl(e.target, '#roGo')) {
      var p = plan();
      confirmBox('ขึ้นปีการศึกษา ' + info.next_year, 'เลื่อนชั้น ' + (students.length - p.grad - Object.keys(repeat).length - Object.keys(leave).length) + ' คน · จบการศึกษา ' + p.grad + ' คน · ซ้ำชั้น ' + Object.keys(repeat).length + ' คน · ย้ายออก ' + Object.keys(leave).length + ' คน', 'ขึ้นปีการศึกษา').then(function (ok) {
        if (!ok) return;
        api('rollover_run', { to_year: info.next_year, confirm: $('roConfirm').value.trim(), repeat_ids: Object.keys(repeat), leave_ids: Object.keys(leave), unlink_line: $('roUnlink').checked },
          { loader: 'กำลังสำรองข้อมูลและเลื่อนชั้นนักเรียน' }).then(function (d) {
            clearSwr();
            confetti();
            var r = d.result;
            refreshOptions().then(null, function () { });
            swal({ icon: 'success', title: 'ขึ้นปีการศึกษา ' + d.current_year + ' แล้ว', html: '<ul class="swal-list">' +
              '<li><span>⬆️</span><span><b>เลื่อนชั้น ' + r.promoted + ' คน</b></span></li><li><span>🎓</span><span><b>จบการศึกษา ' + r.graduated + ' คน</b></span></li>' +
              (r.repeated ? '<li><span>🔁</span><span><b>ซ้ำชั้น ' + r.repeated + ' คน</b></span></li>' : '') + (r.left ? '<li><span>🚪</span><span><b>ย้ายออก ' + r.left + ' คน</b></span></li>' : '') +
              '</ul><p class="swal-text" style="margin-top:12px">ขั้นต่อไป: นำเข้านักเรียนชั้นแรกเข้าใหม่ และตั้งโครงสร้างคะแนนภาคเรียนที่ 1</p>', confirmText: 'ไปนำเข้านักเรียนใหม่', cancelText: 'ภายหลัง' })
              .then(function (go) { if (go) location.hash = '#students'; else viewRollover(); });
          }).catch(function (ex) { swal({ icon: 'error', title: 'ขึ้นปีไม่สำเร็จ', text: ex.message }); });
      });
    }
  });
}
