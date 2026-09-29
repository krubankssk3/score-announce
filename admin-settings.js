/* แผงควบคุม (admin.html) — ตั้งค่าระบบ · ผู้ใช้ · รายวิชา · Google Drive · ES5
   ลำดับโหลดใน admin.html: admin-core.js ก่อน แล้วไฟล์ admin-*.js อื่น (ลำดับใดก็ได้) */
// ===== ตั้งค่าระบบ =====
function viewSettings() {
  main.innerHTML = head('ตั้งค่าระบบ', 'ปีการศึกษา ภาคเรียน ช่วงชั้น และบัญชีครูผู้ใช้งาน') + '<div id="setOut">' + loadingBlock() + '</div>';
  retryFn = viewSettings;
  apiBatch([{ action: 'get_settings' }, { action: 'list_users' }]).then(function (r) { render(r[0], r[1]); })
    .catch(function (e) { $('setOut').innerHTML = errorBlock(e.message); });

  function render(cfg, users) {
    var s = cfg.settings, subjects = cfg.subjects;
    var h = '<form class="card card-pad" id="setF"><h2 class="sec-title" style="margin-top:0">' + icon('settings', 20) + 'ทั่วไป</h2><div class="form-grid">' +
      inputField('cfSchool', 'ชื่อโรงเรียน', s.school_name, '', 'full') +
      inputField('cfYear', 'ปีการศึกษาปัจจุบัน', s.current_year, 'inputmode="numeric" maxlength="4" required') + selectField('cfTerm', 'ภาคเรียนปัจจุบัน', TERMS, s.current_term) +
      inputField('cfYears', 'ปีการศึกษาที่แสดง (คั่นด้วยจุลภาค)', s.years.join(','), 'placeholder="2568,2569"', 'full') +
      inputField('cfLevels', 'ชั้นเรียน (คั่นด้วยจุลภาค)', s.levels.join(','), 'placeholder="ป.1,ป.2,ป.3"', 'full') +
      inputField('cfT1', 'ช่วงเดือนภาคเรียนที่ 1', s.term1_label) + inputField('cfT2', 'ช่วงเดือนภาคเรียนที่ 2', s.term2_label) +
      '</div><h3 class="sec-title" style="font-size:16px;margin:10px 0 10px">' + icon('megaphone', 18) + 'แถบประกาศผลวิ่ง (หน้าเข้าสู่ระบบ และหน้าสถานะ)</h3><div class="form-grid">' +
      selectField('cfTicker', 'รูปแบบการแสดง', [{ v: 'rtl', t: 'วิ่งจากขวาไปซ้าย' }, { v: 'ltr', t: 'วิ่งจากซ้ายไปขวา' }, { v: 'static', t: 'อยู่นิ่ง สลับทีละรายการ' }, { v: 'off', t: 'ปิดแถบประกาศ' }], s.ticker_mode) +
      inputField('cfTickDays', 'แสดงรายการที่ประกาศภายใน (วัน)', s.ticker_days, 'type="number" min="1" max="90"') +
      inputField('cfTickText', 'ข้อความเพิ่มเติม (ไม่บังคับ)', s.ticker_text, 'maxlength="160" placeholder="เช่น ผู้ปกครองดูผลสอบกลางภาคได้แล้ววันนี้"', 'full') +
      '</div><p class="label" style="margin-bottom:6px">ตัวอย่าง</p><div class="ticker-preview" id="tickPreview"></div>' +
      '<button type="submit" class="btn btn-primary" id="cfSave">' + icon('save', 18) + 'บันทึกการตั้งค่า</button></form>';
    h += '<h2 class="sec-title">' + icon('users', 20) + 'บัญชีผู้ใช้<button type="button" class="btn btn-sm more" id="btnAddUser" style="margin-left:auto">' + icon('plus', 16) + 'เพิ่มครู</button></h2><div class="list" id="userList">' +
      users.map(function (u, i) {
        var subs = u.subjects.length ? u.subjects.map(function (id) { for (var j = 0; j < subjects.length; j++) if (subjects[j].subject_id === id) return subjects[j].name; return id; }).join(', ') : 'ทุกรายวิชา';
        return '<button type="button" class="li" data-u="' + i + '"><span class="avatar">' + icon(u.role === 'admin' ? 'shield' : 'user', 20) + '</span><span class="li-main"><span class="li-title">' + esc(u.display_name) + ' <span class="muted small">@' + esc(u.username) + '</span></span>' +
          '<span class="li-sub">' + esc(roleLabel(u.role)) + ' · ' + esc(subs) + '</span></span>' + (u.active ? '' : '<span class="badge b-slate">ปิดใช้งาน</span>') + icon('chevron-right', 18, 'muted') + '</button>';
      }).join('') + '</div>';
    h += '<h2 class="sec-title">' + icon('book', 20) + 'รายวิชา<button type="button" class="btn btn-sm more" id="btnAddSubj" style="margin-left:auto">' + icon('plus', 16) + 'เพิ่มรายวิชา</button></h2><div class="list" id="subjList">' + subjects.map(function (x, si) {
      return '<button type="button" class="li" data-sj="' + si + '"><span class="emoji sm" aria-hidden="true">' + esc(x.icon) + '</span><span class="li-main"><span class="li-title">' + esc(x.name) + ' <span class="muted small">' + esc(x.subject_id) + '</span></span>' +
        '<span class="li-sub">' + esc(x.type) + ' · ' + (x.levels.length ? esc(x.levels.join(', ')) : 'ทุกชั้น') + (x.grade_term2 ? ' · มีเกรดเทอม 2' : '') + '</span></span>' + (x.active ? '' : '<span class="badge b-slate">ปิดใช้งาน</span>') + icon('chevron-right', 18, 'muted') + '</button>';
    }).join('') + '</div><p class="small muted">ช่องคะแนนและคะแนนเต็มของแต่ละเทอม ตั้งได้ที่เมนู <a href="#schemes">โครงสร้างคะแนน</a></p>';
    h = '<a class="card item-card rollover-cta setup-cta" href="#theme"><span class="tint t-cyan">' + icon('sparkles', 22) + '</span><span class="li-main"><span class="li-title">ปรับแต่งหน้าตา (สี · ไอคอน)</span>' +
      '<span class="li-sub">สีหลักของเว็บ แถบประกาศ การ์ด LINE ริชเมนู และไอคอนจากลิงก์รูป</span></span>' + icon('chevron-right', 20, 'muted') + '</a>' +
      '<a class="card item-card rollover-cta setup-cta" href="#setup"><span class="tint t-cyan">' + icon('check-circle', 22) + '</span><span class="li-main"><span class="li-title">ตัวช่วยตั้งค่าระบบ</span>' +
      '<span class="li-sub">ตรวจอัตโนมัติว่าตั้งค่าอะไรครบแล้ว และพาไปหน้าที่ต้องทำต่อ</span></span>' + icon('chevron-right', 20, 'muted') + '</a>' +
      '<a class="card item-card rollover-cta" href="#rollover"><span class="tint t-amber">' + icon('grad', 22) + '</span><span class="li-main"><span class="li-title">ขึ้นปีการศึกษาใหม่</span>' +
      '<span class="li-sub">เลื่อนชั้นนักเรียนทั้งโรงเรียน · ป.' + '6 จบการศึกษา · สำรองข้อมูลก่อนอัตโนมัติ · ย้อนกลับได้</span></span>' + icon('chevron-right', 20, 'muted') + '</a>' +
      '<h2 class="sec-title" style="margin-top:6px">' + icon('cloud', 20) + 'ฐานข้อมูลและไฟล์ใน Google Drive</h2><div class="card card-pad" id="driveBox">' + loadingBlock('กำลังเชื่อมต่อ Google Drive') + '</div>' + h;
    $('setOut').innerHTML = h;
    enter($('setOut'));
    loadDrive();

    function preview() {
      var now = new Date().toISOString();
      mountTicker($('tickPreview'), {
        ticker: { mode: $('cfTicker').value, days: 14, text: $('cfTickText').value },
        items: [{ ann_id: 'p1', status: 'published', subject_name: 'คณิตศาสตร์พื้นฐาน', class_label: 'ป.3/1', term: s.current_term, year: s.current_year, published_at: now },
          { ann_id: 'p2', status: 'published', subject_name: 'วิชาเสริมทักษะคณิตศาสตร์', class_label: 'ป.5/2', term: s.current_term, year: s.current_year, published_at: now }]
      }, '#');
      if (!$('tickPreview').innerHTML) $('tickPreview').innerHTML = '<p class="small muted">ปิดแถบประกาศ หน้าสาธารณะจะไม่แสดงแถบนี้</p>';
      document.body.classList.remove('has-ticker');
    }
    preview();
    $('cfTicker').onchange = preview;
    $('cfTickText').oninput = preview;
    $('setF').onsubmit = function (e) {
      e.preventDefault();
      var btn = $('cfSave');
      setBusy(btn, true, 'กำลังบันทึก');
      api('save_settings', {
        school_name: $('cfSchool').value, current_year: $('cfYear').value, current_term: $('cfTerm').value,
        years: $('cfYears').value, levels: $('cfLevels').value, term1_label: $('cfT1').value, term2_label: $('cfT2').value,
        ticker_mode: $('cfTicker').value, ticker_days: $('cfTickDays').value, ticker_text: $('cfTickText').value
      }).then(function () { swal({ icon: 'success', title: 'บันทึกการตั้งค่าแล้ว', timer: 1800 }); return refreshOptions(); }).then(function () { setBusy(btn, false); })
        .catch(function (ex) { toast(ex.message, 'err'); setBusy(btn, false); });
    };
    $('btnAddUser').onclick = function () { userForm(null, subjects, viewSettings); };
    $('btnAddSubj').onclick = function () { subjectForm(null); };
    $('subjList').onclick = function (e) {
      var b = closestEl(e.target, '[data-sj]');
      if (b) subjectForm(subjects[Number(b.getAttribute('data-sj'))]);
    };
    $('userList').onclick = function (e) {
      var b = closestEl(e.target, '[data-u]');
      if (b) userForm(users[Number(b.getAttribute('data-u'))], subjects, viewSettings);
    };
  }
}

function loadDrive(data) {
  var box = $('driveBox');
  if (!box) return;
  var p = data ? Promise.resolve(data) : api('drive_info');
  p.then(function (d) {
    var h = '<div class="btn-row"><a class="btn" href="' + esc(d.folder_url) + '" target="_blank" rel="noopener">' + icon('folder', 18) + 'เปิดโฟลเดอร์ระบบ</a>' +
      '<a class="btn" href="' + esc(d.sheet_url) + '" target="_blank" rel="noopener">' + icon('sheet', 18) + 'เปิด Google Sheet</a>' +
      '<button type="button" class="btn" id="btnCache" title="ใช้เมื่อแก้ข้อมูลในชีตแล้วหน้าเว็บยังไม่อัปเดต">' + icon('loader', 18) + 'ล้างแคชข้อมูล</button>' +
      '<button type="button" class="btn btn-primary push" id="btnBackup">' + icon('cloud', 18) + 'สำรองข้อมูลตอนนี้</button></div>' +
      '<div class="notice ' + (d.auto_backup ? 'info' : '') + '">' + icon(d.auto_backup ? 'check-circle' : 'alert', 18) + '<span>' +
      (d.auto_backup ? 'สำรองอัตโนมัติทุกวันเวลาประมาณ 02:00 น. เป็นไฟล์ .xlsx และเก็บ 30 ชุดล่าสุด' : 'ยังไม่ได้ตั้งสำรองอัตโนมัติ ให้รันฟังก์ชัน installTriggers ใน Apps Script') + '</span></div>' +
      '<div class="notice ' + (d.auto_publish ? 'info' : '') + '">' + icon(d.auto_publish ? 'clock' : 'alert', 18) + '<span>' +
      (d.auto_publish ? 'ระบบประกาศผลตามเวลาที่ตั้งไว้ทำงานอยู่ (ตรวจทุก 15 นาที)' : 'ยังไม่ได้เปิดการประกาศผลตามเวลา ให้รันฟังก์ชัน installTriggers ใน Apps Script') + '</span></div>';
    h += '<p class="label" style="margin:16px 0 8px">ไฟล์สำรองล่าสุด</p>' + (d.backups.length ? '<div class="list">' + d.backups.map(function (b) {
      return '<a class="li" href="' + esc(b.url) + '" target="_blank" rel="noopener"><span class="tint t-green">' + icon('file', 18) + '</span><span class="li-main"><span class="li-title">' + esc(b.name) + '</span>' +
        '<span class="li-sub">' + esc(fmtDateTime(b.date)) + ' · ' + Math.max(1, Math.round(b.size / 1024)) + ' KB</span></span>' + icon('chevron-right', 18, 'muted') + '</a>';
    }).join('') + '</div>' : '<p class="small muted">ยังไม่มีไฟล์สำรอง กดสำรองข้อมูลตอนนี้เพื่อสร้างชุดแรก</p>');
    box.innerHTML = h;
    $('btnCache').onclick = function () {
      api('clear_cache', {}, { loader: 'กำลังล้างแคช' }).then(function () {
        clearSwr();
        swal({ icon: 'success', title: 'ล้างแคชแล้ว', text: 'ครั้งต่อไประบบจะอ่านข้อมูลล่าสุดจาก Google Sheet', timer: 2000 });
      }).catch(function (e) { swal({ icon: 'error', title: 'ไม่สำเร็จ', text: e.message }); });
    };
    $('btnBackup').onclick = function () {
      var btn = this;
      setBusy(btn, true, 'กำลังสำรองข้อมูล');
      api('backup_now').then(function (nd) { swal({ icon: 'success', title: 'สำรองข้อมูลแล้ว', text: 'บันทึกไฟล์ ' + (nd.backups[0] ? nd.backups[0].name : '') + ' ลง Google Drive', timer: 2600 }); loadDrive(nd); })
        .catch(function (e) { toast(e.message, 'err'); setBusy(btn, false); });
    };
  }).catch(function (e) {
    box.innerHTML = '<div class="notice">' + icon('alert', 18) + '<span>เชื่อมต่อ Google Drive ไม่สำเร็จ: ' + esc(e.message) + ' — ตรวจว่ารัน setup และอนุญาตสิทธิ์ Drive แล้ว</span></div>';
  });
}

function subjectForm(x) {
  var isNew = !x;
  var v = x || { subject_id: '', name: '', type: 'วิชาแกน', icon: '📐', levels: [], grade_term2: false, active: true };
  var EMO = ['📐', '🧮', '➗', '🔢', '📊', '📘', '🧠', '✏️', '📏', '🎯'];
  openModal({
    title: isNew ? 'เพิ่มรายวิชา' : 'แก้ไขรายวิชา',
    body: '<form id="sjF"><div class="form-grid">' +
      inputField('sjId', 'รหัสวิชา (อังกฤษ)', v.subject_id, (isNew ? '' : 'readonly ') + 'placeholder="เช่น MATH, MATHX" autocapitalize="characters" required') +
      selectField('sjType', 'ประเภท', ['วิชาแกน', 'วิชาเสริม', 'กิจกรรม'], v.type) +
      inputField('sjName', 'ชื่อรายวิชา', v.name, 'required placeholder="เช่น คณิตศาสตร์พื้นฐาน"', 'full') +
      '</div><p class="label">ไอคอน</p><div class="chip-row" id="sjEmo">' + EMO.map(function (e) { return '<button type="button" class="chip" data-emo="' + e + '" aria-pressed="' + (v.icon === e) + '">' + e + '</button>'; }).join('') + '</div>' +
      inputField('sjIconUrl', 'หรือใช้รูปจากลิงก์ (ไม่บังคับ)', v.icon_url || '', 'placeholder="https://.../icon.png" inputmode="url"') +
      '<p class="label" style="margin-top:6px">ชั้นที่เรียน <span class="muted small">(ไม่เลือก = ทุกชั้น)</span></p><div class="chip-row" style="flex-wrap:wrap">' +
      levelList().map(function (l) { return '<label class="check" style="margin-right:12px"><input type="checkbox" name="sjLv" value="' + esc(l) + '"' + (v.levels.indexOf(l) > -1 ? ' checked' : '') + '>' + esc(l) + '</label>'; }).join('') + '</div>' +
      '<label class="check"><input type="checkbox" id="sjG2"' + (v.grade_term2 ? ' checked' : '') + '>ค่าเริ่มต้น: แสดงเกรดในเทอม 2</label>' +
      '<label class="check"><input type="checkbox" id="sjAct"' + (v.active ? ' checked' : '') + '>เปิดใช้งานรายวิชานี้</label>' +
      '<div id="sjErr" class="form-error" hidden></div></form>',
    foot: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="submit" form="sjF" class="btn btn-primary" id="sjSave">' + icon('save', 18) + 'บันทึก</button>'
  });
  var emo = v.icon;
  $('sjEmo').onclick = function (e) {
    var b = closestEl(e.target, '[data-emo]');
    if (!b) return;
    emo = b.getAttribute('data-emo');
    var all = this.querySelectorAll('[data-emo]');
    for (var i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', all[i] === b ? 'true' : 'false');
  };
  $('sjF').onsubmit = function (e) {
    e.preventDefault();
    var lv = [], boxes = document.querySelectorAll('input[name="sjLv"]');
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) lv.push(boxes[i].value);
    api('save_subject', { is_new: isNew, subject_id: $('sjId').value.trim(), name: $('sjName').value, type: $('sjType').value, icon: emo, icon_url: $('sjIconUrl').value.trim(), levels: lv, grade_term2: $('sjG2').checked, active: $('sjAct').checked },
      { loader: 'กำลังบันทึกรายวิชา' }).then(function () {
        closeModal();
        swal({ icon: 'success', title: 'บันทึกรายวิชาแล้ว', timer: 1800 });
        refreshOptions().then(viewSettings, viewSettings);
      }).catch(function (ex) { $('sjErr').textContent = ex.message; $('sjErr').hidden = false; });
  };
}

function userForm(u, subjects, onSaved) {
  var isNew = !u;
  var v = u || { username: '', display_name: '', role: 'teacher', subjects: [], active: true };
  openModal({
    title: isNew ? 'เพิ่มบัญชีครู' : 'แก้ไขบัญชี ' + v.username,
    body: '<form id="usrF"><div class="form-grid">' +
      inputField('usName', 'ชื่อผู้ใช้ (a-z, 0-9)', v.username, (isNew ? '' : 'readonly ') + 'autocapitalize="off" spellcheck="false" required') +
      inputField('usDisplay', 'ชื่อที่แสดง', v.display_name, 'placeholder="ครูสมศรี"') +
      selectField('usRole', 'สิทธิ์', [{ v: 'teacher', t: 'ครูผู้สอน' }, { v: 'admin', t: 'ผู้ดูแลระบบ' }], v.role) +
      inputField('usPw', isNew ? 'รหัสผ่าน (อย่างน้อย 6 ตัว)' : 'ตั้งรหัสผ่านใหม่', '', 'type="password" autocomplete="new-password"' + (isNew ? ' required' : ' placeholder="เว้นว่างถ้าไม่เปลี่ยน"')) +
      '</div><p class="label">รายวิชาที่ดูแล <span class="muted small">(ไม่เลือก = ทุกรายวิชา)</span></p>' +
      subjects.map(function (x) {
        return '<label class="check"><input type="checkbox" name="usSubj" value="' + esc(x.subject_id) + '"' + (v.subjects.indexOf(x.subject_id) > -1 ? ' checked' : '') + '>' + esc(x.icon + ' ' + x.name) + '</label>';
      }).join('') +
      '<label class="check" style="margin-top:14px"><input type="checkbox" id="usActive"' + (v.active ? ' checked' : '') + '>เปิดใช้งานบัญชีนี้</label>' +
      '<div id="usErr" class="form-error" hidden></div></form>',
    foot: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="submit" form="usrF" class="btn btn-primary" id="usSave">' + icon('save', 18) + 'บันทึก</button>'
  });
  $('usrF').onsubmit = function (e) {
    e.preventDefault();
    var subs = [], boxes = document.querySelectorAll('input[name="usSubj"]');
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) subs.push(boxes[i].value);
    var btn = $('usSave');
    setBusy(btn, true, 'กำลังบันทึก');
    api('save_user', {
      is_new: isNew, username: $('usName').value.trim().toLowerCase(), display_name: $('usDisplay').value, role: $('usRole').value,
      password: $('usPw').value, subjects: subs, active: $('usActive').checked
    }).then(function () { closeModal(); toast(isNew ? 'เพิ่มบัญชีแล้ว' : 'บันทึกบัญชีแล้ว'); onSaved(); })
      .catch(function (ex) { $('usErr').textContent = ex.message; $('usErr').hidden = false; setBusy(btn, false); });
  };
}
