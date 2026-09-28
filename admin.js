/* แผงควบคุม (admin.html) — ES5 */
(function () {
  var sess = requireRole(['admin', 'teacher']);
  if (!sess) return;
  var isAdmin = sess.role === 'admin';
  var main = $('main');
  var opt = null;
  var dirty = false;
  var lastHash = location.hash, skipNext = false;
  var retryFn = null;
  var TERMS = [{ v: '1', t: 'ภาคเรียนที่ 1' }, { v: '2', t: 'ภาคเรียนที่ 2' }];
  var STU_STATUS = ['กำลังศึกษา', 'ย้ายออก', 'จบการศึกษา', 'พักการเรียน'];

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
    if (!isAdmin && ['announce', 'students', 'settings', 'line', 'rollover'].indexOf(name) > -1) name = 'home';
    var views = { home: viewHome, reviews: viewReviews, scores: viewScores, schemes: viewSchemes, line: viewLine, rollover: viewRollover, report: viewReport, announce: viewAnnounce, students: viewStudents, stats: viewStats, settings: viewSettings, activity: viewActivity };
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

  // ===== หน้าหลัก =====
  function viewHome() {
    var cards = [
      { href: '#scores', ic: 'pencil', tint: 't-blue', title: 'จัดการคะแนน', sub: 'บันทึก/แก้ไขคะแนน' },
      { href: '#announce', ic: 'megaphone', tint: 't-green', title: 'ประกาศผลสอบ', sub: 'เผยแพร่ผลคะแนน', admin: true },
      { href: '#students', ic: 'user-cog', tint: 't-amber', title: 'จัดการนักเรียน', sub: 'ข้อมูล-เลขบัตร ปชช', admin: true },
      { href: '#schemes', ic: 'sheet', tint: 't-blue', title: 'โครงสร้างคะแนน', sub: 'ช่องคะแนน · สิ่งที่จะประกาศ' },
      { href: '#reviews', ic: 'search', tint: 't-red', title: 'คำขอตรวจสอบ', sub: 'ผู้ปกครองขอให้ตรวจคะแนน', id: 'rvCard' },
      { href: '#report', ic: 'printer', tint: 't-amber', title: 'รายงานผลรายห้อง', sub: 'พิมพ์พร้อมลายเซ็น' },
      { href: '#stats', ic: 'chart', tint: 't-cyan', title: 'รายงานสถิติ', sub: 'ดูรายงานผล' },
      { href: 'teacher.html', ic: 'search', tint: 't-cyan', title: 'ดูผลคะแนน', sub: 'เลือกชั้นและรายวิชา', teacher: true },
      { href: '#line', ic: 'chat', tint: 't-green', title: 'แจ้งเตือน LINE', sub: 'ส่งลิงก์ดูคะแนนเข้ากลุ่ม', admin: true },
      { href: '#settings', ic: 'settings', tint: 't-slate', title: 'ตั้งค่าระบบ', sub: 'ปีการศึกษา ภาคเรียน ช่วงชั้น', admin: true }
    ].filter(function (c) { return isAdmin ? !c.teacher : !c.admin; });

    var h = '<section class="hero">' + mathSymbols(10, 11) + '<p class="hi">' + esc(greeting()) + ' <span class="wave" aria-hidden="true">👋</span></p><h1>' + esc(sess.name) + '</h1><p class="lead">' +
      (isAdmin ? 'ยินดีต้อนรับสู่แผงควบคุมผู้ดูแลระบบ จัดการคะแนนและประกาศผลได้ที่นี่' : 'บันทึกคะแนนและดูรายงานรายวิชาที่คุณดูแลได้ที่นี่') +
      '</p><div class="hero-meta"><span>ปีการศึกษา ' + esc(opt.settings.current_year) + '</span><span>ภาคเรียนที่ ' + esc(opt.settings.current_term) + '</span></div></section>';
    h += '<div class="grid-2">' + stat('users', 't-cyan', 'นักเรียนทั้งหมด', 'stStudents', 'คน') + stat('door', 't-green', 'ห้องเรียน', 'stRooms', 'ห้อง') +
      stat('book', 't-amber', 'รายวิชาที่ดูแล', 'stSubjects', 'วิชา') + stat('check-circle', 't-cyan', 'ประกาศผลแล้ว', 'stAnn', 'รายการ') + '</div>';
    h += '<h2 class="sec-title">' + icon('zap', 20) + 'การดำเนินการด่วน</h2><div class="actions">' + cards.map(function (c, i) {
      var span = (cards.length % 2 === 1 && i === cards.length - 1) ? ' span-2' : '';
 return '<a class="action' + span + '" href="' + c.href + '"' + (c.id ? ' id="' + c.id + '"' : '') + '><span class="tint ' + c.tint + '">' + icon(c.ic, 26) + '</span><b>' + esc(c.title) + '</b><span>' + esc(c.sub) + '</span></a>';
    }).join('') + '</div>';
    h += '<h2 class="sec-title">' + icon('search', 20) + 'ค้นหานักเรียน</h2><div class="card card-pad"><div class="input-wrap"><span class="lead-ic">' + icon('search', 20) + '</span>' +
      '<input class="input input-lg" id="q" type="search" placeholder="ค้นหาด้วยเลขบัตรประชาชนหรือชื่อ..." autocomplete="off" aria-label="ค้นหานักเรียน"></div><div id="qres" style="margin-top:12px"></div></div>';
    h += '<h2 class="sec-title">' + icon('clock', 20) + 'กิจกรรมล่าสุด<a class="more" href="#activity">ดูทั้งหมด</a></h2><div class="list" id="actList">' + loadingBlock() + '</div>';
    main.innerHTML = h;

    var timer = null, found = [];
    $('q').addEventListener('input', function () {
      clearTimeout(timer);
      var v = this.value.trim();
      if (v.length < 2) { $('qres').innerHTML = ''; return; }
      timer = setTimeout(function () { doSearch(v); }, 350);
    });
    $('qres').addEventListener('click', function (e) {
      var b = closestEl(e.target, '[data-stu]');
      if (b && found[Number(b.getAttribute('data-stu'))]) studentForm(found[Number(b.getAttribute('data-stu'))].rec, function () { doSearch($('q').value.trim()); });
    });
    function doSearch(q) {
      if (q.length < 2) return;
      $('qres').innerHTML = '<div class="loading small"><span class="spin"></span>กำลังค้นหา</div>';
      api('search_students', { q: q }).then(function (list) {
        if (!$('q') || $('q').value.trim() !== q) return;
        found = list;
        if (!list.length) { $('qres').innerHTML = '<p class="muted small" style="margin:4px 2px">ไม่พบนักเรียนที่ตรงกับ "' + esc(q) + '"</p>'; return; }
        $('qres').innerHTML = '<div class="list">' + list.map(function (s, i) {
          var tag = isAdmin ? 'button type="button" data-stu="' + i + '"' : 'div';
          return '<' + tag + ' class="li"><span class="avatar">' + icon('user', 22) + '</span><span class="li-main"><span class="li-title">' + esc(s.name) + '</span>' +
            '<span class="li-sub">' + esc(s.class_label) + (s.number !== null ? ' · เลขที่ ' + esc(s.number) : '') + '</span></span>' +
            '<span class="li-end"><span class="mono-id">' + esc(s.masked) + '</span>' + stuBadge(s.status) + '</span></' + (isAdmin ? 'button' : 'div') + '>';
        }).join('') + '</div>';
      }).catch(function (e) { $('qres').innerHTML = '<p class="form-error">' + esc(e.message) + '</p>'; });
    }

    swr('dashboard', {}, function (d) {
      if (!$('stStudents')) return;
      if (d.review_new && $('rvCard') && !$('rvBadge')) $('rvCard').insertAdjacentHTML('beforeend', '<span class="action-badge" id="rvBadge">' + d.review_new + ' ใหม่</span>');
      countUp($('stStudents'), d.students);
      countUp($('stRooms'), d.rooms);
      countUp($('stSubjects'), d.subjects);
      $('stAnn').innerHTML = '<span id="stAnnN">0</span><small>/' + d.total_ann + '</small>';
      countUp($('stAnnN'), d.published);
      $('actList').innerHTML = d.activity.length ? d.activity.map(actItem).join('') : emptyBlock('clock', 'ยังไม่มีกิจกรรม', 'เริ่มจากเพิ่มนักเรียนหรือบันทึกคะแนน');
    }).catch(function (e) { toast(e.message, 'err'); if ($('actList')) $('actList').innerHTML = errorBlock(e.message); retryFn = viewHome; });
  }
  function stat(ic, tint, label, id, unit) {
    return '<div class="card stat"><div class="stat-top"><span class="tint ' + tint + '">' + icon(ic, 18) + '</span>' + esc(label) + '</div><div class="stat-val" id="' + id + '"><span class="skel">00</span></div><div class="stat-unit">' + esc(unit) + '</div></div>';
  }

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
    var rows = sheet.d.rows.map(function (r, i) {
      var parts = {};
      comps.forEach(function (c, f) { parts[c.key] = cell(i, f).value.trim(); });
      var o = { key: r.key, parts: parts, label: 'เลขที่ ' + (r.number === null ? '-' : r.number) + ' ' + r.name };
      var sp = $('sheet').querySelector('[data-sp="' + i + '"]');
      if (sp) { o.special = sp.value; o.special_note = sp.value ? $('sheet').querySelector('[data-spn="' + i + '"]').value.trim() : ''; }
      return o;
    });
    var btn = $('btnSave');
    setBusy(btn, true, 'กำลังบันทึก');
    api('save_scores', extend(sheet.q, { rows: rows })).then(function (res) {
      dirty = false;
      swal({ icon: 'success', title: 'บันทึกคะแนนแล้ว', text: 'บันทึก ' + res.saved + ' คน เรียบร้อย' + (res.status === 'published' ? ' (ห้องนี้ประกาศแล้ว ผู้ปกครองเห็นทันที)' : ''), timer: 2200 });
      if (sheet.file) { archive('scores', sheet.file); sheet.file = null; }
      loadSheet();
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

  // ===== แจ้งเตือนผ่าน LINE =====
  function classChoices() {
    var out = [{ v: '*', t: 'ทุกห้อง' }];
    levelList().forEach(function (l) {
      out.push({ v: l, t: 'ทั้งชั้น ' + l });
      roomList(l).forEach(function (r) { out.push({ v: l + '/' + r, t: l + '/' + r }); });
    });
    return out;
  }
  function classPicker(id, selected) {
    return '<div class="chip-row" style="flex-wrap:wrap" id="' + id + '">' + classChoices().map(function (c) {
      return '<button type="button" class="chip" data-cv="' + esc(c.v) + '" aria-pressed="' + (selected.indexOf(c.v) > -1) + '">' + esc(c.t) + '</button>';
    }).join('') + '</div>';
  }
  function bindPicker(id) {
    $(id).onclick = function (e) {
      var b = closestEl(e.target, '[data-cv]');
      if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    };
  }
  function pickerValue(id) {
    var out = [], all = $(id).querySelectorAll('[data-cv][aria-pressed="true"]');
    for (var i = 0; i < all.length; i++) out.push(all[i].getAttribute('data-cv'));
    return out;
  }
  function classesLabel(cl) { return cl.indexOf('*') > -1 ? 'ทุกห้อง' : cl.map(function (c) { return c.indexOf('/') > -1 ? c : 'ทั้งชั้น ' + c; }).join(', '); }

  function viewLine() {
    var info = null;
    var siteGuess = location.href.split('#')[0].replace(/[^\/]*$/, '');
    main.innerHTML = head('แจ้งประกาศผลผ่าน LINE', 'เมื่อประกาศผล ระบบจะส่งลิงก์ดูคะแนนเข้ากลุ่ม LINE ของห้องนั้นให้ทันที (ไม่มีชื่อหรือคะแนนรายคนในกลุ่ม)') + '<div id="lineOut">' + loadingBlock('กำลังตรวจการเชื่อมต่อ LINE') + '</div>';
    retryFn = viewLine;
    var out = $('lineOut');
    out.addEventListener('click', onClick);
    load();

    function load(d) {
      (d ? Promise.resolve(d) : api('line_info', {}, { loader: false })).then(function (x) { info = x; render(); })
        .catch(function (e) { out.innerHTML = errorBlock(e.message); });
    }
    function render() {
      var bot = info.bot;
      var status = !info.configured ? '<span class="badge b-slate">ยังไม่ได้เชื่อมต่อ</span>' :
        (bot && bot.name ? '<span class="badge b-green">เชื่อมต่อแล้ว: ' + esc(bot.name) + '</span>' : '<span class="badge b-red">โทเคนใช้ไม่ได้' + (bot && bot.error ? ': ' + esc(bot.error) : '') + '</span>');
      var hook = info.last_hook;
      var hookHtml = '<div class="notice ' + (hook ? 'info' : '') + '" style="margin:0 0 14px">' + icon(hook ? 'check-circle' : 'alert', 18) + '<span>' +
        (hook ? 'Webhook ทำงาน · ได้รับข้อความล่าสุด ' + esc(relTime(hook.at)) + ' (' + esc(hook.source === 'user' ? 'แชทส่วนตัว' : (hook.source ? 'กลุ่ม' : 'ทดสอบ')) + ')' :
          '<b>ยังไม่เคยได้รับข้อความจาก LINE</b> — ถ้าพิมพ์แล้วได้ข้อความตอบกลับอัตโนมัติของ OA แทน ให้ตรวจ: ① LINE Developers → Webhook URL = ลิงก์ด้านล่าง และเปิด Use webhook ② OA Manager → การตอบกลับ → เปิด Webhook, <b>ปิด</b>ข้อความตอบกลับอัตโนมัติ ③ Apps Script Deploy เวอร์ชันล่าสุดแล้ว') +
        ' <button type="button" class="btn btn-sm" data-recheck style="height:28px">ตรวจอีกครั้ง</button></span></div>';
      var h = '<div class="card card-pad"><div class="prog-top" style="margin-bottom:12px">' + icon('chat', 20) + '<span>บัญชี LINE OA ของโรงเรียน</span><span style="margin-left:auto">' + status + '</span></div>' + hookHtml +
        '<form id="lnF"><div class="field"><label for="lnTok">Channel access token (long-lived)</label><input class="input" id="lnTok" type="password" autocomplete="off" placeholder="' +
        (info.configured ? 'ตั้งค่าแล้ว ••••' + esc(info.token_tail) + ' (เว้นว่างถ้าไม่เปลี่ยน)' : 'วางโทเคนจาก LINE Developers') + '"></div>' +
        '<div class="field"><label for="lnSite">ลิงก์เว็บไซต์ระบบ (GitHub Pages)</label><input class="input" id="lnSite" value="' + esc(info.site_url || siteGuess) + '" placeholder="https://krubankssk3.github.io/score-announce/"></div>' +
        '<label class="switch" style="margin:2px 0 14px"><input type="checkbox" id="lnAuto"' + (info.auto ? ' checked' : '') + '><span></span><em style="min-width:0;color:var(--text-2);font-size:14px">ส่งเข้ากลุ่มอัตโนมัติทุกครั้งที่ประกาศผล (รวมการประกาศตามเวลา)</em></label>' +
        '<div class="line-personal"><p class="label" style="margin:4px 0 8px">' + icon('user', 16) + ' แชทส่วนตัวกับ LINE OA (นักเรียน/ผู้ปกครอง)</p>' +
        '<label class="switch" style="margin:0 0 10px"><input type="checkbox" id="lnPersonal"' + (info.personal ? ' checked' : '') + '><span></span><em style="min-width:0;color:var(--text-2);font-size:14px">ให้ถามคะแนนในแชท: รายวิชา → ภาคเรียน → ปีการศึกษา → เลขบัตร 13 หลัก (มีปุ่มให้กด)</em></label>' +
        '<label class="switch" style="margin:0 0 10px"><input type="checkbox" id="lnAlways"' + (info.always_id !== false ? ' checked' : '') + '><span></span><em style="min-width:0;color:var(--text-2);font-size:14px">ถามเลขบัตรประชาชนทุกครั้ง (ปลอดภัยที่สุด) — ถ้าปิด บัญชีที่เคยยืนยันแล้วไม่ต้องพิมพ์ซ้ำ</em></label>' +
        '<label class="switch" style="margin:0 0 6px"><input type="checkbox" id="lnPush"' + (info.personal_push ? ' checked' : '') + '><span></span><em style="min-width:0;color:var(--text-2);font-size:14px">ประกาศผลแล้ว ส่งคะแนนเข้าแชทของบัญชีที่ผูกไว้ให้ทันที</em></label>' +
        '<p class="small muted" style="margin:0 0 14px">ผูกแล้ว <b>' + (info.linked || 0) + '</b> รายการ · การส่งอัตโนมัติใช้โควตาข้อความ 1 ข้อความต่อบัญชีต่อครั้ง · ค้นด้วยชื่อไม่ได้ เพื่อความปลอดภัยของข้อมูล' +
        (info.linked ? ' · <button type="button" class="btn btn-sm btn-danger" data-unlink style="height:28px;margin-left:4px">ยกเลิกการผูกทั้งหมด</button>' : '') + '</p></div>' +
        '<div class="field"><label>Webhook URL (นำไปวางใน LINE Developers)</label><div class="copy-row"><code>' + esc(APP.API_URL) + '</code><button type="button" class="btn btn-sm" data-copy="' + esc(APP.API_URL) + '">' + icon('copy', 15) + 'คัดลอก</button></div></div>' +
        '<div class="btn-row">' + (info.configured ? '<button type="button" class="btn btn-danger btn-sm" data-clear>ลบโทเคน</button>' : '') +
        '<button type="submit" class="btn btn-primary push">' + icon('save', 18) + 'บันทึกและทดสอบการเชื่อมต่อ</button></div></form>' +
        '<details class="paste" style="margin:14px 0 0;border-top:1px solid var(--line-2)"><summary>' + icon('help', 18) + 'วิธีตั้งค่าครั้งแรก (ทำครั้งเดียว)</summary><div class="paste-body"><ol class="help-steps" style="margin:0;max-width:none">' +
        '<li>LINE Official Account Manager → <b>ตั้งค่า → Messaging API</b> → เปิดใช้งาน (หรือใช้ช่องเดิมที่ใช้กับระบบอื่นก็ได้)</li>' +
        '<li>LINE Developers → เลือก channel → แท็บ <b>Messaging API</b> → <b>Channel access token (long-lived) → Issue</b> → คัดลอกมาวางด้านบน</li>' +
        '<li>ในหน้าเดียวกัน วาง <b>Webhook URL</b> (ปุ่มคัดลอกด้านบน) แล้วเปิด <b>Use webhook</b> — ปุ่ม Verify อาจขึ้นแดงเพราะ Apps Script ตอบแบบ redirect ไม่เป็นไร ให้ทดสอบด้วยการผูกกลุ่มแทน</li>' +
        '<li>LINE OA Manager → <b>การตอบกลับ</b>: เปิด Webhook, ปิดข้อความตอบกลับอัตโนมัติ · <b>บัญชี</b>: เปิด "อนุญาตให้เข้าร่วมแชทกลุ่ม"</li>' +
        '<li>เชิญบัญชี OA เข้ากลุ่ม LINE ของห้อง → กด <b>ผูกกลุ่มใหม่</b> ด้านล่าง → พิมพ์รหัสที่ได้ลงในกลุ่ม</li></ol></div></details></div>';

      h += '<h2 class="sec-title">' + icon('zap', 20) + 'เมนูบอท (ปุ่มให้กด)</h2><div class="card card-pad" id="menuBox"></div>';
      h += '<h2 class="sec-title">' + icon('users', 20) + 'กลุ่มที่ผูกไว้<button type="button" class="btn btn-sm btn-primary more" data-bind style="margin-left:auto">' + icon('plus', 16) + 'ผูกกลุ่มใหม่</button></h2>';
      if (!info.groups.length) {
        h += '<div class="card">' + emptyBlock('chat', 'ยังไม่มีกลุ่มที่ผูกไว้', 'เชิญบัญชี LINE OA เข้ากลุ่มห้องเรียน แล้วกด "ผูกกลุ่มใหม่"') + '</div>';
      } else {
        h += '<div class="stack">' + info.groups.map(function (g, i) {
          return '<div class="card card-pad"><div style="display:flex;gap:14px;align-items:center"><span class="tint ' + (g.active ? 't-green' : 't-slate') + '">' + icon('chat', 20) + '</span>' +
            '<span class="li-main"><span class="li-title" style="font-weight:600">' + esc(g.name || 'กลุ่ม LINE') + '</span><span class="li-sub">รับแจ้ง: ' + esc(classesLabel(g.classes)) +
            (g.last_sent_at ? ' · ส่งล่าสุด ' + esc(relTime(g.last_sent_at)) : '') + '</span></span>' + (g.active ? '<span class="badge b-green">ใช้งาน</span>' : '<span class="badge b-slate">ปิด/บอทออกแล้ว</span>') + '</div>' +
            '<div class="btn-row" style="margin-top:12px"><button type="button" class="btn btn-sm" data-test="' + i + '">' + icon('send', 15) + 'ส่งทดสอบ</button>' +
            '<button type="button" class="btn btn-sm" data-edit="' + i + '">' + icon('settings', 15) + 'แก้ห้องที่รับแจ้ง</button>' +
            '<button type="button" class="btn btn-sm btn-danger push" data-del="' + i + '">' + icon('trash', 15) + 'ยกเลิกผูก</button></div></div>';
        }).join('') + '</div>';
      }
      h += '<h2 class="sec-title">' + icon('eye', 20) + 'ตัวอย่างข้อความในกลุ่ม</h2><div class="line-chat"><div class="line-bubble">' +
        '<div class="lb-head"><b>📣 ประกาศผลคะแนนแล้ว</b><small>' + esc(opt.settings.school_name) + '</small></div><div class="lb-body">' +
        '<div class="lb-row"><span>📐</span><span><b>คณิตศาสตร์พื้นฐาน</b><small>ชั้น ป.3/1 · ภาคเรียนที่ ' + esc(opt.settings.current_term) + '/' + esc(opt.settings.current_year) + '</small></span></div>' +
        '<p>นักเรียน/ผู้ปกครอง เข้าสู่ระบบด้วยเลขบัตรประชาชน 13 หลักของนักเรียน</p></div>' +
        '<div class="lb-foot"><span class="lb-btn">ดูคะแนน</span><span class="lb-link">สถานะการประกาศผลทุกห้อง</span></div></div></div>' +
        '<h2 class="sec-title">' + icon('user', 20) + 'ตัวอย่างแชทส่วนตัว</h2><div class="line-chat">' +
        '<div class="lc-me">อยากรู้คะแนนสอบ</div>' +
        tileCard('📘 เลือกรายวิชา', 'แตะรายวิชาที่ต้องการดูคะแนน', 1, (opt.subjects.length ? opt.subjects : [{ icon: '📐', name: 'คณิตศาสตร์พื้นฐาน', type: 'วิชาแกน' }]).map(function (x) { return [x.icon, x.name, x.type]; })) +
        '<div class="lc-me">คณิตศาสตร์พื้นฐาน</div>' +
        tileCard('📅 เลือกภาคเรียน', '📐 คณิตศาสตร์พื้นฐาน', 2, [['🌱', 'ภาคเรียนที่ 1', opt.settings.term1_label], ['🍂', 'ภาคเรียนที่ 2', opt.settings.term2_label]]) +
        '<div class="lc-me">ภาคเรียนที่ 1</div>' +
        tileCard('🗓️ เลือกปีการศึกษา', '📐 คณิตศาสตร์พื้นฐาน · ภาคเรียนที่ 1', 3, opt.settings.years.slice().reverse().slice(0, 3).map(function (y) { return [y === opt.settings.current_year ? '⭐' : '🗓️', 'ปีการศึกษา ' + y, y === opt.settings.current_year ? 'ปีปัจจุบัน' : '']; })) +
        '<div class="lc-me">ปีการศึกษา ' + esc(opt.settings.current_year) + '</div><div class="lc-bot">🔒 ยืนยันตัวตน (ขั้น 4/4)<br>พิมพ์เลขบัตรประชาชน 13 หลักของนักเรียน</div><div class="lc-me">1234567890123</div>' +
        '<div class="line-bubble" style="max-width:250px"><div class="lb-head"><b>📐 คณิตศาสตร์พื้นฐาน</b><small>ด.ช. ตัวอย่าง · ป.3/1 · ภาคเรียนที่ 1/' + esc(opt.settings.current_year) + '</small></div>' +
        '<div class="lb-body"><div class="lb-kv"><span>คะแนนเก็บ</span><b>40 / 50</b></div><div class="lb-kv"><span>สอบกลางภาค</span><b>15 / 20</b></div><div class="lb-kv total"><span>คะแนนรวม</span><b>55 / 70</b></div></div>' +
        '<div class="lb-foot"><span class="lb-link">ดูรายละเอียดในเว็บ</span></div></div></div>' +
        '<div class="notice info" style="margin-top:12px">' + icon('info', 18) + '<span>แนะนำ: ใน LINE OA Manager สร้าง <b>ริชเมนู</b> ปุ่ม "ดูคะแนน" ตั้งให้ส่งข้อความ <code>คะแนน</code> ผู้ปกครองกดครั้งเดียวก็เห็นผล</span></div>' +
        '<p class="small muted">ข้อความแบบ push นับโควตาข้อความรายเดือนของ LINE OA (ดูได้ใน OA Manager) · ใช้ "ประกาศที่เลือก" ในหน้าประกาศผลเพื่อรวมหลายห้องเป็นข้อความเดียวต่อกลุ่ม</p>';
      out.innerHTML = h;
      menuEd = (info.menu || []).map(function (x) { return { emoji: x.emoji || '', label: x.label, type: x.type, reply: x.reply || '', url: x.url || '' }; });
      bindMenu();
      renderMenu();

      $('lnF').onsubmit = function (e) {
        e.preventDefault();
        api('line_save_config', { channel_token: $('lnTok').value.trim(), site_url: $('lnSite').value.trim(), auto: $('lnAuto').checked, personal: $('lnPersonal').checked, personal_push: $('lnPush').checked, always_id: $('lnAlways').checked }, { loader: 'กำลังทดสอบการเชื่อมต่อ LINE' }).then(function (d) {
          refreshOptions().then(null, function () { });
          swal({ icon: 'success', title: 'บันทึกแล้ว', text: d.bot && d.bot.name ? 'เชื่อมต่อบัญชี "' + d.bot.name + '" สำเร็จ' : 'บันทึกการตั้งค่าแล้ว', timer: 2400 });
          load(d);
        }).catch(function (ex) { swal({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: ex.message }); });
      };
    }
    function onClick(e) {
      var b;
      if ((b = closestEl(e.target, '[data-copy]'))) { copyText(b.getAttribute('data-copy')); return; }
      if (closestEl(e.target, '[data-clear]')) {
        confirmBox('ลบโทเคน LINE', 'ระบบจะหยุดส่งข้อความเข้ากลุ่มจนกว่าจะใส่โทเคนใหม่', 'ลบโทเคน', true).then(function (ok) {
          if (ok) api('line_save_config', { channel_token: 'CLEAR', site_url: $('lnSite').value.trim(), auto: $('lnAuto').checked, personal: $('lnPersonal').checked, personal_push: $('lnPush').checked, always_id: $('lnAlways').checked }, { loader: 'กำลังบันทึก' }).then(function (d) { refreshOptions().then(null, function () { }); load(d); });
        });
        return;
      }
      if (closestEl(e.target, '[data-recheck]')) { api('line_info', {}, { loader: 'กำลังตรวจสอบ' }).then(function (d) { load(d); toast(d.last_hook ? 'ได้รับข้อความล่าสุด ' + relTime(d.last_hook.at) : 'ยังไม่ได้รับข้อความจาก LINE', d.last_hook ? 'ok' : 'err'); }); return; }
      if (closestEl(e.target, '[data-bind]')) { bindModal(); return; }
      if (closestEl(e.target, '[data-unlink]')) {
        confirmBox('ยกเลิกการผูกทั้งหมด', 'บัญชี LINE ที่ผูกไว้ ' + info.linked + ' รายการจะต้องพิมพ์เลขบัตรใหม่ (เหมาะกับการขึ้นปีการศึกษาใหม่)', 'ยกเลิกทั้งหมด', true).then(function (ok) {
          if (ok) api('line_unlink_all', {}, { loader: 'กำลังยกเลิกการผูก' }).then(function (d) { load(d); toast('ยกเลิกการผูกทั้งหมดแล้ว'); }).catch(function (ex) { swal({ icon: 'error', title: 'ไม่สำเร็จ', text: ex.message }); });
        });
        return;
      }
      if ((b = closestEl(e.target, '[data-test]'))) {
        var g = info.groups[Number(b.getAttribute('data-test'))];
        api('line_test', { group_id: g.group_id }, { loader: 'กำลังส่งข้อความทดสอบ' }).then(function () {
          swal({ icon: 'success', title: 'ส่งแล้ว', text: 'ดูข้อความทดสอบในกลุ่ม "' + g.name + '"', timer: 2400 });
        }).catch(function (ex) { swal({ icon: 'error', title: 'ส่งไม่สำเร็จ', text: ex.message }); });
        return;
      }
      if ((b = closestEl(e.target, '[data-edit]'))) { editModal(info.groups[Number(b.getAttribute('data-edit'))]); return; }
      if ((b = closestEl(e.target, '[data-del]'))) {
        var gd = info.groups[Number(b.getAttribute('data-del'))];
        swal({ icon: 'warning', title: 'ยกเลิกผูกกลุ่ม', html: '<p class="swal-text">กลุ่ม "' + esc(gd.name) + '" จะไม่ได้รับแจ้งอีก</p><label class="check" style="justify-content:center"><input type="checkbox" id="lnLeave">ให้บอทออกจากกลุ่มด้วย</label>', confirmText: 'ยกเลิกผูก', cancelText: 'ไม่ใช่', danger: true }).then(function (ok) {
          var leave = !!($('lnLeave') && $('lnLeave').checked);
          if (!ok) return;
          api('line_group_delete', { group_id: gd.group_id, leave: leave }, { loader: 'กำลังยกเลิกผูกกลุ่ม' }).then(function (groups) {
            info.groups = groups; render(); toast('ยกเลิกผูกกลุ่มแล้ว');
          }).catch(function (ex) { swal({ icon: 'error', title: 'ไม่สำเร็จ', text: ex.message }); });
        });
      }
    }
    function tileCard(title, sub, step, items) {
      var cols = items.length > 2 ? 3 : 2;
      return '<div class="tile-card"><div class="tc-head"><b>' + esc(title) + '</b><span>ขั้น ' + step + '/4</span><small>' + esc(sub) + '</small></div>' +
        '<div class="tc-grid" style="grid-template-columns:repeat(' + cols + ',1fr)">' + items.map(function (it, k) {
          return '<div class="tc-tile t' + (k % 6) + '"><i>' + esc(it[0]) + '</i><b>' + esc(it[1]) + '</b>' + (it[2] ? '<small>' + esc(it[2]) + '</small>' : '') + '</div>';
        }).join('') + '</div><div class="tc-foot">ยกเลิก</div></div>';
    }
    // ----- เมนูบอท -----
    var menuEd = [];
    function renderMenu() {
      var box = $('menuBox');
      var types = info.menu_types || {};
      var h = '<p class="small muted" style="margin:0 0 12px">ปุ่มชุดนี้ใช้ทั้ง <b>ปุ่มลัดใต้ข้อความบอท</b> (ใช้ทันทีหลังบันทึก) และ <b>ริชเมนูแถบล่างของแชท</b> (กดติดตั้งหลังแก้ไขทุกครั้ง) · สูงสุด 6 ปุ่ม</p><div class="comp-list">' +
        menuEd.map(function (x, i) {
          return '<div class="menu-row"><input class="input menu-emo" data-m="emoji" data-i="' + i + '" value="' + esc(x.emoji) + '" maxlength="4" aria-label="อีโมจิ">' +
            '<input class="input" data-m="label" data-i="' + i + '" value="' + esc(x.label) + '" maxlength="20" placeholder="ชื่อปุ่ม" aria-label="ชื่อปุ่ม">' +
            '<select class="select" data-m="type" data-i="' + i + '" aria-label="การทำงาน">' + optionsHtml(Object.keys(types).map(function (k) { return { v: k, t: types[k] }; }), x.type) + '</select>' +
            '<span class="comp-act"><button type="button" class="icon-btn sm" data-mup="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="เลื่อนขึ้น">' + icon('chevron-left', 16, 'rot90') + '</button>' +
            '<button type="button" class="icon-btn sm" data-mdel="' + i + '" aria-label="ลบปุ่ม">' + icon('trash', 16) + '</button></span>' +
            (x.type === 'text' ? '<textarea class="textarea menu-extra" data-m="reply" data-i="' + i + '" maxlength="1000" placeholder="ข้อความที่บอทจะตอบเมื่อกดปุ่มนี้" style="min-height:70px">' + esc(x.reply) + '</textarea>' : '') +
            (x.type === 'link' ? '<input class="input menu-extra" data-m="url" data-i="' + i + '" value="' + esc(x.url) + '" placeholder="https://...">' : '') + '</div>';
        }).join('') + '</div>' +
        (menuEd.length < 6 ? '<button type="button" class="btn btn-sm" data-madd style="margin-top:10px">' + icon('plus', 16) + 'เพิ่มปุ่ม</button>' : '') +
        '<p class="label" style="margin:16px 0 8px">ตัวอย่างริชเมนู</p><canvas id="menuCanvas" class="menu-canvas" aria-label="ตัวอย่างริชเมนู"></canvas>' +
        '<div class="btn-row" style="margin-top:12px">' + (info.richmenu ? '<span class="badge b-green">ติดตั้งริชเมนูแล้ว</span><button type="button" class="btn btn-sm btn-danger" data-mremove>ลบริชเมนู</button>' : '<span class="badge b-slate">ยังไม่ได้ติดตั้งริชเมนู</span>') +
        '<button type="button" class="btn push" data-msave>' + icon('save', 18) + 'บันทึกเมนู</button>' +
        '<button type="button" class="btn btn-primary" data-minstall>' + icon('upload', 18) + 'บันทึก + ติดตั้งริชเมนู</button></div>';
      box.innerHTML = h;
      drawMenu();
    }
    function bindMenu() {
      var box = $('menuBox');
      box.addEventListener('input', function (e) {
        var k = e.target.getAttribute('data-m');
        if (!k) return;
        menuEd[Number(e.target.getAttribute('data-i'))][k] = e.target.value;
        if (k === 'type') renderMenu(); else drawMenu();
      });
      box.addEventListener('change', function (e) { if (e.target.getAttribute('data-m') === 'type') { menuEd[Number(e.target.getAttribute('data-i'))].type = e.target.value; renderMenu(); } });
      box.addEventListener('click', function (e) {
        var b;
        if (closestEl(e.target, '[data-madd]')) { menuEd.push({ emoji: '💬', label: '', type: 'text', reply: '', url: '' }); renderMenu(); var ins = box.querySelectorAll('[data-m="label"]'); ins[ins.length - 1].focus(); return; }
        if ((b = closestEl(e.target, '[data-mdel]'))) { menuEd.splice(Number(b.getAttribute('data-mdel')), 1); renderMenu(); return; }
        if ((b = closestEl(e.target, '[data-mup]'))) { var i = Number(b.getAttribute('data-mup')); var t = menuEd[i - 1]; menuEd[i - 1] = menuEd[i]; menuEd[i] = t; renderMenu(); return; }
        if (closestEl(e.target, '[data-msave]')) { saveMenu(false); return; }
        if (closestEl(e.target, '[data-minstall]')) { saveMenu(true); return; }
        if (closestEl(e.target, '[data-mremove]')) {
          confirmBox('ลบริชเมนู', 'แถบเมนูด้านล่างแชทของ LINE OA จะหายไป (ปุ่มลัดใต้ข้อความยังใช้ได้)', 'ลบริชเมนู', true).then(function (ok) {
            if (ok) api('line_richmenu_remove', {}, { loader: 'กำลังลบริชเมนู' }).then(function (d) { load(d); toast('ลบริชเมนูแล้ว'); }).catch(function (ex) { swal({ icon: 'error', title: 'ไม่สำเร็จ', text: ex.message }); });
          });
        }
      });
    }
    /** วาดรูปริชเมนู 2500×843 (1 แถว) หรือ 2500×1686 (2 แถว) และคืนตำแหน่งปุ่ม */
    function drawMenu() {
      var cv = $('menuCanvas');
      if (!cv || !cv.getContext) return null;
      var n = Math.max(1, menuEd.length), rows = n <= 3 ? 1 : 2, W = 2500, H = rows === 1 ? 843 : 1686;
      var perRow = rows === 1 ? [n] : [Math.ceil(n / 2), n - Math.ceil(n / 2)];
      cv.width = W; cv.height = H;
      var c = cv.getContext('2d');
      var g = c.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0e7490'); g.addColorStop(.55, '#0891b2'); g.addColorStop(1, '#06b6d4');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 3;
      for (var gx = 0; gx < W; gx += 70) { c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, H); c.stroke(); }
      for (var gy = 0; gy < H; gy += 70) { c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke(); }
      var areas = [], k = 0, rh = H / rows;
      for (var r = 0; r < rows; r++) {
        var cw = W / perRow[r];
        for (var j = 0; j < perRow[r]; j++, k++) {
          var x = j * cw, y = r * rh, it = menuEd[k] || { emoji: '', label: '' };
          areas.push({ x: x, y: y, w: cw, h: rh });
          var p = 22;
          roundRect(c, x + p, y + p, cw - p * 2, rh - p * 2, 46);
          c.fillStyle = 'rgba(255,255,255,.13)'; c.fill();
          c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 4; c.stroke();
          c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
          c.font = '250px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
          c.fillText(it.emoji || '•', x + cw / 2, y + rh * .40);
          var size = 130;
          do { c.font = '500 ' + size + 'px Mitr, "Noto Sans Thai", sans-serif'; size -= 6; } while (c.measureText(it.label || 'ปุ่ม').width > cw * .84 && size > 50);
          c.fillText(it.label || 'ปุ่ม', x + cw / 2, y + rh * .77);
        }
      }
      return { height: H, areas: areas };
    }
    function roundRect(c, x, y, w, h, r) {
      c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
    }
    function saveMenu(install) {
      api('line_save_menu', { items: menuEd }, { loader: install ? 'กำลังบันทึกเมนู' : 'กำลังบันทึกเมนู' }).then(function (d) {
        info = d;
        if (!install) { swal({ icon: 'success', title: 'บันทึกเมนูแล้ว', text: 'ปุ่มลัดใต้ข้อความบอทใช้ได้ทันที' + (d.richmenu ? ' · กด "บันทึก + ติดตั้งริชเมนู" เพื่ออัปเดตแถบเมนูด้วย' : ''), timer: 2600 }); render(); return; }
        var ready = document.fonts && document.fonts.load ? document.fonts.load('500 100px Mitr') : Promise.resolve();
        return ready.then(function () {
          render();
          var geo = drawMenu();
          var cv = $('menuCanvas'), q = .9, img = cv.toDataURL('image/jpeg', q);
          while (img.length > 1300000 && q > .4) { q -= .1; img = cv.toDataURL('image/jpeg', q); }
          return api('line_richmenu_install', { image: img, height: geo.height, areas: geo.areas }, { loader: 'กำลังติดตั้งริชเมนูใน LINE' }).then(function (d2) {
            load(d2);
            confetti();
            swal({ icon: 'success', title: 'ติดตั้งริชเมนูแล้ว', text: 'เปิดแชท LINE OA ใหม่อีกครั้ง จะเห็นแถบเมนูด้านล่าง', timer: 3200 });
          });
        });
      }).catch(function (ex) { swal({ icon: 'error', title: 'ไม่สำเร็จ', text: ex.message }); });
    }

    function bindModal() {
      openModal({
        title: 'ผูกกลุ่ม LINE ใหม่',
        body: '<p style="margin-top:0">1) เลือกห้องที่กลุ่มนี้จะรับแจ้งประกาศผล</p>' + classPicker('bindPick', []) +
          '<div id="bindCode"></div>',
        foot: '<button type="button" class="btn" data-close>ปิด</button><button type="button" class="btn btn-primary" id="bindGo">' + icon('key', 18) + 'สร้างรหัสผูกกลุ่ม</button>'
      });
      bindPicker('bindPick');
      $('bindGo').onclick = function () {
        var cls = pickerValue('bindPick');
        if (!cls.length) { toast('เลือกห้องอย่างน้อย 1 รายการ', 'err'); return; }
        var btn = this;
        setBusy(btn, true, 'กำลังสร้างรหัส');
        api('line_bind_code', { classes: cls }, { loader: false }).then(function (r) {
          var cmd = 'ผูกกลุ่ม ' + r.code;
          $('bindCode').innerHTML = '<div class="code-card"><p>2) เชิญบัญชี LINE OA เข้ากลุ่ม แล้วพิมพ์ข้อความนี้ในกลุ่ม</p>' +
            '<div class="code-big">' + esc(cmd) + '</div><button type="button" class="btn btn-sm" id="bindCopy">' + icon('copy', 15) + 'คัดลอกข้อความ</button>' +
            '<p class="small muted">รหัสใช้ได้ครั้งเดียว ภายใน 30 นาที · กลุ่มจะรับแจ้ง: ' + esc(classesLabel(cls)) + '</p></div>';
          $('bindCopy').onclick = function () { copyText(cmd); };
          btn.outerHTML = '<button type="button" class="btn btn-primary" id="bindDone">' + icon('check', 18) + 'พิมพ์ในกลุ่มแล้ว ตรวจสอบ</button>';
          $('bindDone').onclick = function () {
            var before = info.groups.length;
            api('line_info', {}, { loader: 'กำลังตรวจสอบ' }).then(function (d) {
              info = d;
              render();
              if (d.groups.length > before) { closeModal(); confetti(); swal({ icon: 'success', title: 'ผูกกลุ่มสำเร็จ!', text: 'กลุ่ม "' + d.groups[d.groups.length - 1].name + '" พร้อมรับแจ้งประกาศผล', timer: 2800 }); }
              else toast('ยังไม่พบกลุ่มใหม่ ตรวจว่าบอทอยู่ในกลุ่มและพิมพ์ข้อความถูกต้อง', 'err');
            });
          };
        }).catch(function (ex) { setBusy(btn, false); toast(ex.message, 'err'); });
      };
    }
    function editModal(g) {
      openModal({
        title: 'แก้ห้องที่รับแจ้ง: ' + (g.name || 'กลุ่ม LINE'),
        body: classPicker('editPick', g.classes) + '<label class="check" style="margin-top:12px"><input type="checkbox" id="edAct"' + (g.active ? ' checked' : '') + '>เปิดรับแจ้งประกาศผล</label>',
        foot: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="button" class="btn btn-primary" id="edSave">' + icon('save', 18) + 'บันทึก</button>'
      });
      bindPicker('editPick');
      $('edSave').onclick = function () {
        api('line_group_save', { group_id: g.group_id, classes: pickerValue('editPick'), active: $('edAct').checked }, { loader: 'กำลังบันทึก' }).then(function (groups) {
          closeModal(); info.groups = groups; render(); toast('บันทึกแล้ว');
        }).catch(function (ex) { toast(ex.message, 'err'); });
      };
    }
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

  // ===== รายงานผลรายห้อง (พิมพ์ A4 พร้อมลายเซ็น) =====
  var GRADES = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0'];
  function viewReport(p) {
    var st = opt.settings, data = null;
    var subs = subjectList('');
    main.innerHTML = head('รายงานผลรายห้อง', 'สรุปคะแนนทุกช่องรายห้อง พร้อมลายเซ็นผู้เกี่ยวข้อง พิมพ์หรือบันทึกเป็น PDF ได้') +
      '<div class="card card-pad no-print"><div class="filters">' + selectField('rpYear', 'ปีการศึกษา', yearList(), p.y || st.current_year) + selectField('rpTerm', 'ภาคเรียน', TERMS, p.t || st.current_term) +
      selectField('rpSubj', 'รายวิชา', subs, p.s || (subs[0] ? subs[0].v : '')) + selectField('rpLevel', 'ชั้น', levelList(), p.l || st.levels[0] || '') +
      '<div class="field"><label for="rpRoom">ห้อง</label><select class="select" id="rpRoom"></select></div>' +
      '<div class="field"><label>&nbsp;</label><label class="check" style="height:46px;margin:0"><input type="checkbox" id="rpGrade" checked>แสดงเกรด</label></div></div>' +
      '<button type="button" class="btn btn-primary btn-block" id="rpGo" style="margin-top:14px">' + icon('printer', 18) + 'สร้างรายงาน</button></div>' +
      '<div id="rpOut" style="margin-top:16px"></div>';
    function rooms() {
      var r = roomList($('rpLevel').value);
      $('rpRoom').innerHTML = '<option value="">ทุกห้องในชั้น (ห้องละ 1 หน้า)</option>' + optionsHtml(r.map(function (x) { return { v: x, t: 'ห้อง ' + x }; }), p.r || '');
    }
    rooms();
    $('rpLevel').onchange = rooms;
    $('rpGo').onclick = load;
    var out = $('rpOut');
    out.addEventListener('click', onClick);
    if (p.l) load();

    function q() { return { year: $('rpYear').value, term: $('rpTerm').value, subject_id: $('rpSubj').value, level: $('rpLevel').value, room: $('rpRoom').value, force_grade: $('rpGrade').checked }; }
    function load() {
      var x = q();
      if (!x.subject_id) { toast('เลือกรายวิชา', 'err'); return; }
      setHashSilently('#report?' + buildQuery({ y: x.year, t: x.term, s: x.subject_id, l: x.level, r: x.room }));
      retryFn = load;
      out.innerHTML = loadingBlock('กำลังสร้างรายงาน');
      api('report_data', x, { loader: false }).then(function (d) { data = d; render(); }).catch(function (e) { out.innerHTML = errorBlock(e.message); });
    }
    function render() {
      var d = data;
      if (!d.classes.length) { out.innerHTML = '<div class="card">' + emptyBlock('users', 'ไม่มีข้อมูลห้องในชั้นนี้', 'บันทึกคะแนนหรือเพิ่มนักเรียนก่อน') + '</div>'; return; }
      var h = '<div class="card card-pad no-print"><div class="prog-top" style="margin-bottom:10px">' + icon('users', 20) + '<span>ครูประจำชั้น (ปีการศึกษา ' + esc(d.year) + ' · สูงสุด 2 คนต่อห้อง)</span></div>' +
        d.classes.map(function (c, i) {
          return '<div class="hr-row"><span class="lv-chip next">' + esc(c.class_label) + '</span>' +
            '<input class="input" id="hr1_' + i + '" value="' + esc(c.homeroom[0] || '') + '" placeholder="ครูประจำชั้นคนที่ 1 เช่น นางนภาพร จันทร์สุข">' +
            '<input class="input" id="hr2_' + i + '" value="' + esc(c.homeroom[1] || '') + '" placeholder="คนที่ 2 (ถ้ามี)">' +
            '<button type="button" class="btn btn-sm" data-hr="' + i + '">' + icon('save', 15) + 'บันทึก</button></div>';
        }).join('') + '</div>';
      if (isAdmin) h += signerEditor(d.signers);
      h += '<div class="btn-row no-print" style="margin:16px 0"><span class="small muted">ตัวอย่างก่อนพิมพ์ ' + d.classes.length + ' หน้า (A4 แนวตั้ง)</span>' +
        '<button type="button" class="btn btn-primary push" data-print>' + icon('printer', 18) + 'พิมพ์ / บันทึก PDF</button></div>' +
        '<div id="reportArea">' + d.classes.map(function (c) { return paper(d, c); }).join('') + '</div>';
      out.innerHTML = h;
    }
    function signerEditor(sg) {
      var rows = [['measure', 'หัวหน้าฝ่ายวัดและประเมินผล'], ['academic', 'หัวหน้าฝ่ายวิชาการ'], ['deputy', 'รองผู้อำนวยการ'], ['director', 'ผู้อำนวยการ'], ['teacher', 'ครูผู้สอน (ไม่บังคับ)']];
      return '<details class="card paste no-print" style="margin-top:12px"><summary>' + icon('pencil', 18) + 'ผู้ลงนาม (ใช้กับทุกรายงาน)</summary><div class="paste-body">' +
        rows.map(function (r) {
          var x = sg[r[0]];
          return '<div class="sig-edit"><span class="small muted">' + r[1] + '</span><input class="input" id="sg_' + r[0] + '_name" value="' + esc(x.name) + '" placeholder="ชื่อ-สกุล">' +
            '<input class="input" id="sg_' + r[0] + '_title" value="' + esc(x.title) + '" placeholder="ตำแหน่งที่พิมพ์ในรายงาน"></div>';
        }).join('') +
        '<label class="check"><input type="checkbox" id="sg_teacher_show"' + (sg.teacher.show ? ' checked' : '') + '>แสดงลายเซ็นครูผู้สอนด้วย</label>' +
        '<button type="button" class="btn btn-primary btn-sm" data-sgsave style="margin-top:8px">' + icon('save', 15) + 'บันทึกผู้ลงนาม</button></div></details>';
    }
    function sig(name, title, stacked) {
      if (!stacked && String(title).length > 14) stacked = true; // ตำแหน่งยาว วางใต้ชื่อให้พอดีกระดาษแนวตั้ง
      return '<div class="sig">' + (stacked ? '<div class="sig-line">ลงชื่อ<span class="dots"></span></div><div class="sig-name">(' + esc(name || '                              ') + ')</div><div class="sig-name">' + esc(title) + '</div>' :
        '<div class="sig-line">ลงชื่อ<span class="dots"></span><span class="sig-title">' + esc(title) + '</span></div><div class="sig-name">(' + esc(name || '                              ') + ')</div>') + '</div>';
    }
    function paper(d, c) {
      var comps = d.scheme.components, s = c.summary, full = d.scheme.full, sg = d.signers, ym = d.year_mode;
      var ycol = ym === 'sum' ? 2 : (ym === 'year' ? 1 : 0);
      var modeLine = ym === 'sum' ? '<div class="rp-mode">เกรดคิดจากคะแนนรวมภาคเรียนที่ 1 (' + d.t1_full + ') + ภาคเรียนที่ 2 (' + full + ') = ' + (d.t1_full + full) + ' คะแนน</div>' :
        (ym === 'year' ? '<div class="rp-mode">เกรดคิดจากร้อยละเฉลี่ยของภาคเรียนที่ 1 และ 2</div>' : '');
      var head1 = '<div class="rp-head"><img src="' + esc(APP.LOGO) + '" alt="" onerror="this.style.display=\'none\'"><div class="rp-title">แบบรายงานผลคะแนน รายวิชา' + esc(d.subject.name) + '</div>' +
        '<div>ชั้น' + esc(c.class_label.replace('ป.', 'ประถมศึกษาปีที่ ')) + ' ภาคเรียนที่ ' + esc(d.term) + ' ปีการศึกษา ' + esc(d.year) + '</div>' +
        '<div>' + esc(d.school) + ' ' + esc(d.district) + '</div>' + modeLine + '</div>';
      var th = '<tr><th rowspan="2" style="width:34px">ที่</th><th rowspan="2" style="width:38px">เลขที่</th><th rowspan="2">ชื่อ - สกุล</th>' +
        comps.map(function (x) { return '<th>' + esc(x.label) + '</th>'; }).join('') + '<th>รวม' + (ycol ? 'เทอม 2' : '') + '</th><th rowspan="2" style="width:46px">ร้อยละ</th>' +
        (ym === 'sum' ? '<th>รวมเทอม 1</th><th>รวมทั้งปี</th>' : '') + (ym === 'year' ? '<th rowspan="2" style="width:56px">ร้อยละเฉลี่ย 2 เทอม</th>' : '') + (d.show_grade ? '<th rowspan="2" style="width:40px">เกรด</th>' : '') + '<th rowspan="2" style="width:' + (d.special_enabled ? 96 : 52) + 'px">หมายเหตุ</th></tr>' +
        '<tr>' + comps.map(function (x) { return '<th>' + x.max + '</th>'; }).join('') + '<th>' + full + '</th>' + (ym === 'sum' ? '<th>' + d.t1_full + '</th><th>' + (d.t1_full + full) + '</th>' : '') + '</tr>';
      var body = c.rows.map(function (r, i) {
        var pass = r.missing_t1 && !r.special ? 'ไม่มีคะแนนเทอม 1' : r.special ? (r.special === '0' ? 'สอบแก้ตัว' : (r.special === 'ร' ? 'รอการตัดสิน' : 'ไม่มีสิทธิ์สอบ')) + (r.special_note ? ': ' + r.special_note : '') : (r.pct === null ? '' : (r.pct >= 50 ? '' : 'ไม่ผ่าน'));
        return '<tr><td class="c">' + (i + 1) + '</td><td class="c">' + fmtScore(r.number) + '</td><td>' + esc(r.name) + '</td>' +
          comps.map(function (x) { return '<td class="c">' + fmtScore(r.parts[x.key]) + '</td>'; }).join('') +
          '<td class="c b">' + fmtScore(r.total) + '</td><td class="c">' + (r.pct === null ? '–' : r.pct.toFixed(1)) + '</td>' +
          (ym === 'sum' ? '<td class="c">' + fmtScore(r.t1_total) + '</td><td class="c b">' + fmtScore(r.year_total) + '</td>' : '') + (ym === 'year' ? '<td class="c">' + fmtScore(r.year_pct) + '</td>' : '') + (d.show_grade ? '<td class="c b">' + fmtScore(r.grade) + '</td>' : '') + '<td class="c rp-note">' + esc(pass) + '</td></tr>';
      }).join('');
      var foot = '<tr class="avg"><td colspan="3" class="c b">ค่าเฉลี่ย</td>' + comps.map(function (x) { return '<td class="c">' + fmtScore(c.avg_parts[x.key]) + '</td>'; }).join('') +
        '<td class="c b">' + fmtScore(s.avg) + '</td><td class="c">' + (s.avg === null || !full ? '–' : (s.avg / full * 100).toFixed(1)) + '</td>' +
        (ym === 'sum' ? '<td class="c">' + fmtScore(c.t1_avg) + '</td><td class="c b">' + fmtScore(c.year_avg) + '</td>' : '') + (ym === 'year' ? '<td></td>' : '') + (d.show_grade ? '<td></td>' : '') + '<td></td></tr>';
      var sumBox = '<div class="rp-sum">' + (ym === 'sum' ? '<div>คะแนนรวมทั้งปีเฉลี่ย <b>' + fmtScore(c.year_avg) + '</b> จาก ' + (d.t1_full + full) + '</div>' : '') + '<div>จำนวนนักเรียน <b>' + s.students + '</b> คน · มีคะแนน <b>' + s.count + '</b> คน · คะแนนเฉลี่ย <b>' + fmtScore(s.avg) + '</b> · สูงสุด <b>' + fmtScore(s.max) + '</b> · ต่ำสุด <b>' + fmtScore(s.min) + '</b> · ผ่านเกณฑ์ร้อยละ 50 <b>' + s.pass + '</b> คน' +
        (s.count ? ' (ร้อยละ ' + (s.pass / s.count * 100).toFixed(1) + ')' : '') + '</div>' +
        (d.show_grade || d.special_enabled ? (function () {
          var gs = GRADES.concat(d.special_enabled ? ['ร', 'มส'] : []), tot = 0;
          gs.forEach(function (g) { tot += c.dist[g] || 0; });
          return '<table class="rp-dist"><tr><th>ระดับผลการเรียน</th>' + gs.map(function (g) { return '<th>' + g + '</th>'; }).join('') + '<th>รวม</th></tr><tr><td>จำนวน (คน)</td>' +
            gs.map(function (g) { return '<td>' + (c.dist[g] || 0) + '</td>'; }).join('') + '<td>' + tot + '</td></tr></table>';
        })() : '') + '</div>';
      var top = [];
      if (sg.teacher.show) top.push(sig(sg.teacher.name, sg.teacher.title));
      (c.homeroom.length ? c.homeroom : ['']).forEach(function (n) { top.push(sig(n, 'ครูประจำชั้น')); });
      top.push(sig(sg.measure.name, sg.measure.title));
      var bottom = [sig(sg.academic.name, sg.academic.title), sig(sg.deputy.name, sg.deputy.title, true), sig(sg.director.name, sg.director.title, true)];
      var dense = c.rows.length > 38 ? ' dense2' : (c.rows.length > 26 ? ' dense' : '');
      return '<section class="paper' + dense + '">' + head1 + '<table class="rp-table">' + th + body + foot + '</table>' + sumBox +
        '<div class="sig-row">' + top.join('') + '</div><div class="sig-row">' + bottom.join('') + '</div>' +
        '<div class="rp-print">พิมพ์เมื่อ ' + esc(fmtDateTime(new Date().toISOString())) + ' · ' + esc(d.printed_by) + '</div></section>';
    }
    function onClick(e) {
      var b;
      if (closestEl(e.target, '[data-print]')) {
        document.body.classList.add('print-report');
        setTimeout(function () { window.print(); }, 50);
        return;
      }
      if ((b = closestEl(e.target, '[data-hr]'))) {
        var i = Number(b.getAttribute('data-hr')), c = data.classes[i];
        api('homeroom_save', { year: data.year, level: data.level, room: c.room, teacher1: $('hr1_' + i).value, teacher2: $('hr2_' + i).value }, { loader: 'กำลังบันทึกครูประจำชั้น' }).then(function (r) {
          c.homeroom = r.teachers; render(); toast('บันทึกครูประจำชั้น ' + r.class_label + ' แล้ว');
        }).catch(function (ex) { swal({ icon: 'error', title: 'ไม่สำเร็จ', text: ex.message }); });
        return;
      }
      if (closestEl(e.target, '[data-sgsave]')) {
        var sgs = {};
        ['teacher', 'measure', 'academic', 'deputy', 'director'].forEach(function (k) { sgs[k] = { name: $('sg_' + k + '_name').value, title: $('sg_' + k + '_title').value }; });
        sgs.teacher.show = $('sg_teacher_show').checked;
        api('report_signers_save', { signers: sgs }, { loader: 'กำลังบันทึกผู้ลงนาม' }).then(function (d) {
          data.signers = d; render(); toast('บันทึกผู้ลงนามแล้ว');
        }).catch(function (ex) { swal({ icon: 'error', title: 'ไม่สำเร็จ', text: ex.message }); });
      }
    }
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('print-report'); });

  // ===== คำขอตรวจสอบคะแนน =====
  var RV_CLS = { new: 'b-amber', in_review: 'b-cyan', fixed: 'b-green', confirmed: 'b-slate' };
  function viewReviews(p) {
    var list = [], filter = p.f || 'open';
    main.innerHTML = head('คำขอตรวจสอบคะแนน', 'ผู้ปกครอง/นักเรียนส่งคำขอจากการ์ดคะแนน ครูตรวจแล้วตอบกลับ ผู้ปกครองเห็นคำตอบในหน้าเว็บ (และ LINE ถ้าผูกบัญชีไว้)') +
      '<div id="rvView"><div class="tabs" role="tablist"><button type="button" class="tab" data-f="open">ยังไม่เสร็จ</button><button type="button" class="tab" data-f="done">ตอบแล้ว</button><button type="button" class="tab" data-f="">ทั้งหมด</button></div><div id="rvList"></div></div>';
    $('rvView').addEventListener('click', onClick);
    load();
    function load() {
      retryFn = load;
      var tabs = $('rvView').querySelectorAll('[data-f]');
      for (var i = 0; i < tabs.length; i++) tabs[i].setAttribute('aria-selected', tabs[i].getAttribute('data-f') === filter ? 'true' : 'false');
      $('rvList').innerHTML = loadingBlock();
      api('review_list', { status: filter }, { loader: false }).then(function (d) {
        list = d;
        if (!d.length) { $('rvList').innerHTML = '<div class="card">' + emptyBlock('check-circle', filter === 'open' ? 'ไม่มีคำขอค้างอยู่' : 'ยังไม่มีคำขอ', '') + '</div>'; return; }
        $('rvList').innerHTML = '<div class="stack">' + d.map(function (v, i) {
          return '<button type="button" class="card item-card review-item" data-rv="' + i + '"><span class="tint ' + (v.status === 'new' ? 't-red' : 't-slate') + '">' + icon('search', 18) + '</span>' +
            '<span class="li-main"><span class="li-title">' + esc(v.student_name) + ' <span class="muted small">' + esc(v.class_label) + ' เลขที่ ' + fmtScore(v.number) + '</span></span>' +
            '<span class="li-sub">' + esc(v.icon + ' ' + v.subject_name) + ' เทอม ' + esc(v.term) + '/' + esc(v.year) + ' · ' + esc(v.topic) + ' · ' + esc(relTime(v.created_at)) + '</span>' +
            '<span class="li-sub rv-snip">"' + esc(v.reason) + '"</span></span><span class="badge ' + (RV_CLS[v.status] || 'b-slate') + '">' + esc(v.status_label) + '</span></button>';
        }).join('') + '</div>';
      }).catch(function (e) { $('rvList').innerHTML = errorBlock(e.message); });
    }
    function onClick(e) {
      var b;
      if ((b = closestEl(e.target, '[data-f]'))) { filter = b.getAttribute('data-f'); setHashSilently('#reviews?' + buildQuery({ f: filter })); load(); return; }
      if ((b = closestEl(e.target, '[data-rv]'))) openDetail(list[Number(b.getAttribute('data-rv'))]);
    }
    function openDetail(v) {
      api('review_detail', { review_id: v.review_id }, { loader: 'กำลังเปิดคำขอ' }).then(function (d) {
        var sc = d.scheme, sco = d.score;
        var tbl = sco ? '<div class="table-wrap" style="margin:8px 0 12px"><table class="tbl"><thead><tr>' + sc.components.map(function (c) { return '<th class="num">' + esc(c.label) + ' (' + c.max + ')</th>'; }).join('') +
          '<th class="num">รวม</th>' + (sco.grade ? '<th class="c">เกรด</th>' : '') + '</tr></thead><tbody><tr>' + sc.components.map(function (c) {
            return '<td class="num' + (d.topic === c.label ? ' hl' : '') + '">' + fmtScore(sco.parts[c.key]) + '</td>';
          }).join('') + '<td class="num strong">' + fmtScore(sco.total) + '</td>' + (sco.grade ? '<td class="c strong">' + esc(sco.grade) + '</td>' : '') + '</tr></tbody></table></div>' : '<p class="muted">ไม่พบคะแนนของนักเรียน</p>';
        var q = buildQuery({ y: d.year, t: d.term, l: d.level, r: d.room, s: d.subject_id });
        openModal({
          title: 'คำขอตรวจสอบคะแนน', wide: true,
          body: '<div class="rv-head"><b>' + esc(d.student_name) + '</b><span class="muted">' + esc(d.class_label) + ' เลขที่ ' + fmtScore(d.number) + ' · ' + esc(d.icon + ' ' + d.subject_name) + ' เทอม ' + esc(d.term) + '/' + esc(d.year) + '</span>' +
            '<span class="badge ' + (RV_CLS[d.status] || 'b-slate') + '">' + esc(d.status_label) + '</span></div>' +
            '<div class="rv-ask"><small>เรื่อง: <b>' + esc(d.topic) + '</b> · ส่งเมื่อ ' + esc(fmtDateTime(d.created_at)) + (d.contact ? ' · ติดต่อ: ' + esc(d.contact) : '') + '</small><p>' + esc(d.reason) + '</p></div>' +
            '<p class="label" style="margin:14px 0 0">คะแนนปัจจุบัน <span class="muted small">(ค่าเฉลี่ยห้อง ' + fmtScore(d.class_avg) + ')</span></p>' + tbl +
            '<a class="btn btn-sm" href="#scores?' + q + '" data-close>' + icon('pencil', 15) + 'ไปแก้คะแนนห้องนี้</a>' +
            (d.history.length ? '<p class="small muted" style="margin:10px 0 0">คำขอก่อนหน้าของนักเรียนคนนี้: ' + d.history.map(function (h) { return esc(h.subject_name + ' ' + h.term + '/' + h.year + ' (' + h.status_label + ')'); }).join(', ') + '</p>' : '') +
            '<div class="field" style="margin-top:16px"><label for="rvReply">คำตอบถึงผู้ปกครอง</label><textarea class="textarea" id="rvReply" maxlength="500" style="min-height:100px" placeholder="เช่น ตรวจแล้ว เพิ่มคะแนนงานชิ้นที่ 2 ให้ 5 คะแนนเรียบร้อย">' + esc(d.reply) + '</textarea></div>' +
            '<div class="chip-row"><button type="button" class="chip" data-tpl="ตรวจสอบแล้ว แก้ไขคะแนนให้เรียบร้อย กรุณาเข้าดูคะแนนล่าสุดอีกครั้ง">แก้ไขแล้ว</button><button type="button" class="chip" data-tpl="ตรวจสอบแล้ว คะแนนถูกต้องตามที่บันทึกไว้">คะแนนถูกต้อง</button><button type="button" class="chip" data-tpl="กรุณาให้นักเรียนนำงานมาส่งที่ครูภายในสัปดาห์นี้">ขอดูงาน</button></div>' +
            '<div id="rvErr2" class="form-error" hidden></div>',
          foot: '<button type="button" class="btn left" data-st="in_review">' + icon('loader', 16) + 'กำลังตรวจสอบ</button>' +
            '<button type="button" class="btn" data-st="confirmed">' + icon('check', 16) + 'ยืนยันคะแนนเดิม</button>' +
            '<button type="button" class="btn btn-green" data-st="fixed">' + icon('check-circle', 16) + 'แก้ไขคะแนนแล้ว</button>'
        });
        $('modal').addEventListener('click', function (ev) {
          var t = closestEl(ev.target, '[data-tpl]');
          if (t) { $('rvReply').value = t.getAttribute('data-tpl'); $('rvReply').focus(); return; }
          var sb = closestEl(ev.target, '[data-st]');
          if (!sb) return;
          api('review_update', { review_id: d.review_id, status: sb.getAttribute('data-st'), reply: $('rvReply').value }, { loader: 'กำลังบันทึก' }).then(function (r) {
            closeModal();
            clearSwr();
            swal({ icon: 'success', title: r.status_label, text: r.status === 'in_review' ? 'ผู้ปกครองจะเห็นว่ากำลังตรวจสอบ' : 'ส่งคำตอบถึงผู้ปกครองแล้ว' + (r.line_sent ? ' (แจ้งทาง LINE ' + r.line_sent + ' บัญชี)' : ''), timer: 2400 });
            load();
          }).catch(function (ex) { $('rvErr2').textContent = ex.message; $('rvErr2').hidden = false; });
        });
      }).catch(function (e) { swal({ icon: 'error', title: 'เปิดไม่ได้', text: e.message }); });
    }
  }

  // ===== ประกาศผลสอบ =====
  function viewAnnounce() {
    var list = [];
    main.innerHTML = head('ประกาศผลสอบ', 'นักเรียนและผู้ปกครองจะเห็นคะแนนเฉพาะห้องที่ประกาศแล้ว รายการจะถูกสร้างอัตโนมัติเมื่อบันทึกคะแนนครั้งแรก') +
      '<div class="btn-row" style="margin-bottom:14px"><select class="select" id="aYear" style="width:auto;min-width:170px" aria-label="ปีการศึกษา">' +
      optionsHtml(yearList().map(function (y) { return { v: y, t: 'ปีการศึกษา ' + y }; }), opt.settings.current_year) + '</select>' +
      '<button type="button" class="btn btn-primary push" id="btnAddAnn">' + icon('plus', 18) + 'เพิ่มรายการ</button></div><div id="annList"></div>';
    $('aYear').onchange = load;
    $('btnAddAnn').onclick = function () { annForm(null, load); };
    $('annList').addEventListener('click', function (e) {
      var b = closestEl(e.target, '[data-act]');
      if (!b) return;
      var a = list[Number(b.getAttribute('data-i'))], act = b.getAttribute('data-act');
      if (act === 'edit') { annForm(a, load); return; }
      if (act === 'delete') {
        confirmBox('ลบรายการประกาศ', 'ลบรายการ ' + a.subject_name + ' ' + a.class_label + ' เทอม ' + a.term + ' (คะแนนยังอยู่ครบ แต่ผู้ปกครองจะไม่เห็นผลของห้องนี้)', 'ลบรายการ', true).then(function (ok) {
          if (ok) api('delete_announcement', { ann_id: a.ann_id }).then(function () { toast('ลบรายการแล้ว'); load(); }).catch(function (ex) { toast(ex.message, 'err'); });
        });
        return;
      }
      var status = { progress: 'in_progress', publish: 'published', unpublish: 'in_progress' }[act];
      var go = function () {
        setBusy(b, true, 'กำลังบันทึก');
        api('set_announcement_status', { ann_id: a.ann_id, status: status }).then(function (r) {
          if (act === 'publish') {
            confetti();
            swal({ icon: 'announce', title: 'ประกาศผลแล้ว!', text: a.subject_name + ' ' + a.class_label + ' ดูคะแนนได้แล้ว' + lineText(r.line), timer: 3600 });
          } else toast(act === 'unpublish' ? 'ยกเลิกประกาศแล้ว' : 'เปลี่ยนสถานะแล้ว');
          load();
        }).catch(function (ex) { toast(ex.message, 'err'); setBusy(b, false); });
      };
      if (act === 'line') {
        api('line_notify', { ann_ids: [a.ann_id] }, { loader: 'กำลังส่งเข้ากลุ่ม LINE' }).then(function (r) {
          swal({ icon: r.sent ? 'success' : 'warning', title: r.sent ? 'ส่งเข้ากลุ่ม LINE แล้ว' : 'ยังไม่ได้ส่ง', text: r.sent ? r.groups.join(', ') : (r.errors[0] || 'ไม่มีกลุ่มที่ผูกกับห้อง ' + a.class_label), timer: r.sent ? 2600 : 0 });
        }).catch(function (ex) { swal({ icon: 'error', title: 'ส่งไม่สำเร็จ', text: ex.message }); });
        return;
      }
      if (act === 'publish') confirmBox('ประกาศผล ' + a.class_label, 'นักเรียนและผู้ปกครองจะเห็นคะแนน' + a.subject_name + ' เทอม ' + a.term + '/' + a.year + ' ทันที' + (opt.line_ready ? ' และส่งลิงก์เข้ากลุ่ม LINE ที่ผูกไว้' : ''), 'ประกาศผล').then(function (ok) { if (ok) go(); });
      else if (act === 'unpublish') confirmBox('ยกเลิกประกาศ ' + a.class_label, 'นักเรียนและผู้ปกครองจะไม่เห็นคะแนนของรายการนี้จนกว่าจะประกาศอีกครั้ง', 'ยกเลิกประกาศ', true).then(function (ok) { if (ok) go(); });
      else go();
    });
    load();

    function load() {
      retryFn = load;
      $('annList').innerHTML = loadingBlock();
      api('list_announcements', { year: $('aYear').value }).then(function (d) {
        list = d;
        if (!d.length) {
          $('annList').innerHTML = '<div class="card">' + emptyBlock('megaphone', 'ยังไม่มีรายการประกาศในปีนี้', 'บันทึกคะแนนของห้องใดห้องหนึ่ง หรือกดเพิ่มรายการเพื่อวางกำหนดการประกาศ') + '</div>';
          return;
        }
        var pub = d.filter(function (a) { return a.status === 'published'; }).length;
        var canBulk = d.length - pub > 1;
        $('annList').innerHTML = '<p class="small muted" style="margin:0 0 10px">ประกาศแล้ว ' + pub + ' จาก ' + d.length + ' รายการ</p>' +
          (canBulk ? '<div class="card card-pad bulk-bar"><label class="check" style="margin:0"><input type="checkbox" id="bulkAll">เลือกทั้งหมดที่ยังไม่ประกาศ</label>' +
            '<button type="button" class="btn btn-green btn-sm push" id="bulkGo" disabled>' + icon('megaphone', 16) + 'ประกาศที่เลือก (<span id="bulkN">0</span>)</button>' +
            '<p class="small muted" style="margin:6px 0 0;flex-basis:100%">ประกาศหลายห้องพร้อมกัน ระบบจะรวมเป็นข้อความเดียวต่อกลุ่ม LINE</p></div>' : '') +
          '<div class="stack">' + d.map(function (a, i) {
          var m = STATUS_META[a.status];
          var sub = a.status === 'published' ? 'ประกาศเมื่อ ' + fmtDateTime(a.published_at) : [a.note, a.expected_date ? 'คาดว่า ' + fmtDate(a.expected_date) : ''].filter(Boolean).join(' · ') || (a.status === 'in_progress' ? 'กำลังบันทึก/ตรวจสอบคะแนน' : 'ยังไม่เริ่ม');
          var sched = a.publish_at ? '<span class="countdown">' + icon('clock', 13) + 'ประกาศอัตโนมัติ ' + esc(fmtDateTime(a.publish_at)) + ' · ' + esc(countdownText(a.publish_at)) + '</span>' : '';
          var primary = a.status === 'pending' ? '<button type="button" class="btn btn-sm" data-act="progress" data-i="' + i + '">' + icon('loader', 16) + 'เริ่มดำเนินการ</button>' :
            a.status === 'in_progress' ? '<button type="button" class="btn btn-sm btn-green" data-act="publish" data-i="' + i + '">' + icon('megaphone', 16) + 'ประกาศผล</button>' :
              '<button type="button" class="btn btn-sm btn-danger" data-act="unpublish" data-i="' + i + '">' + icon('x', 16) + 'ยกเลิกประกาศ</button>';
          var q = buildQuery({ y: a.year, t: a.term, l: a.level, r: a.room, s: a.subject_id });
          var pick = canBulk && a.status !== 'published' ? '<input type="checkbox" class="bulk-pick" data-i="' + i + '" aria-label="เลือกประกาศ ' + esc(a.class_label) + '" style="width:20px;height:20px;accent-color:var(--primary)">' : '';
          return '<div class="card card-pad' + (a.status === 'in_progress' ? ' item-card is-progress' : '') + '" style="display:block"><div style="display:flex;gap:14px;align-items:center">' + pick +
            '<span class="tint ' + m.tint + '">' + icon(m.icon, 20) + '</span><span class="li-main"><span class="li-title" style="font-weight:600">' + esc(a.icon + ' ' + a.subject_name) + ' — ' + esc(a.class_label) + ' เทอม ' + esc(a.term) + '</span>' +
            '<span class="li-sub">' + esc(sub) + '</span>' + sched + '</span>' + statusBadge(a.status) + '</div>' +
            '<div class="btn-row" style="margin-top:12px">' + primary + '<a class="btn btn-sm" href="#scores?' + q + '">' + icon('pencil', 16) + 'คะแนน</a>' +
            (a.status === 'published' && opt.line_ready ? '<button type="button" class="btn btn-sm" data-act="line" data-i="' + i + '">' + icon('chat', 16) + 'แจ้ง LINE</button>' : '') +
            '<button type="button" class="btn btn-sm" data-act="edit" data-i="' + i + '">' + icon('settings', 16) + 'แก้ไข</button>' +
            '<button type="button" class="btn btn-sm btn-danger push" data-act="delete" data-i="' + i + '" aria-label="ลบรายการ">' + icon('trash', 16) + '</button></div></div>';
        }).join('') + '</div>';
        if (canBulk) bindBulk();
      }).catch(function (e) { $('annList').innerHTML = errorBlock(e.message); });
    }
    function picked() {
      var out = [], boxes = $('annList').querySelectorAll('.bulk-pick');
      for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) out.push(list[Number(boxes[i].getAttribute('data-i'))]);
      return out;
    }
    function bindBulk() {
      var upd = function () { var n = picked().length; $('bulkN').textContent = n; $('bulkGo').disabled = !n; };
      $('annList').addEventListener('change', function (e) {
        if (e.target.id === 'bulkAll') {
          var boxes = $('annList').querySelectorAll('.bulk-pick');
          for (var i = 0; i < boxes.length; i++) boxes[i].checked = e.target.checked;
        }
        if ($('bulkN')) upd();
      });
      $('bulkGo').onclick = function () {
        var sel = picked();
        confirmBox('ประกาศผล ' + sel.length + ' รายการ', sel.map(function (a) { return a.subject_name + ' ' + a.class_label; }).join(', ') + (opt.line_ready ? ' — และส่งลิงก์เข้ากลุ่ม LINE (1 ข้อความต่อกลุ่ม)' : ''), 'ประกาศทั้งหมด').then(function (ok) {
          if (!ok) return;
          api('publish_many', { ann_ids: sel.map(function (a) { return a.ann_id; }) }, { loader: 'กำลังประกาศผล ' + sel.length + ' รายการ' }).then(function (r) {
            confetti();
            swal({ icon: 'announce', title: 'ประกาศผลแล้ว ' + r.published + ' รายการ', text: lineText(r.line).replace(/^ · /, ''), timer: 3600 });
            load();
          }).catch(function (ex) { swal({ icon: 'error', title: 'ประกาศไม่สำเร็จ', text: ex.message }); });
        });
      };
    }
  }

  function annForm(a, onSaved) {
    var st = opt.settings;
    var v = a || { year: $('aYear') ? $('aYear').value : st.current_year, term: st.current_term, level: st.levels[0] || '', room: '', subject_id: '', status: 'pending', expected_date: '', note: '' };
    openModal({
      title: a ? 'แก้ไขรายการประกาศ' : 'เพิ่มรายการประกาศ',
      body: '<form id="annF"><div class="form-grid">' + selectField('anYear', 'ปีการศึกษา', yearList(), v.year) + selectField('anTerm', 'ภาคเรียน', TERMS, v.term) +
        selectField('anLevel', 'ชั้น', levelList(), v.level) + '<div class="field"><label for="anRoom">ห้อง</label><select class="select" id="anRoom"></select></div>' +
        '<div class="field full"><label for="anSubj">รายวิชา</label><select class="select" id="anSubj"></select></div>' +
        selectField('anStatus', 'สถานะ', [{ v: 'pending', t: 'รอประกาศ' }, { v: 'in_progress', t: 'กำลังดำเนินการ' }, { v: 'published', t: 'ประกาศแล้ว' }], v.status) +
        inputField('anDate', 'คาดว่าจะประกาศ', v.expected_date, 'type="date"') +
        inputField('anNote', 'หมายเหตุ (แสดงในหน้าสถานะ)', v.note, 'maxlength="80" placeholder="เช่น กำลังตรวจสอบคะแนน"', 'full') +
        '<div class="field full"><label for="anAt">ตั้งเวลาประกาศอัตโนมัติ (ไม่บังคับ)</label><input class="input" id="anAt" type="datetime-local" value="' + esc(toLocalInput(v.publish_at)) + '">' +
        '<p class="hint">' + icon('clock', 15) + 'ถึงเวลาแล้วระบบจะประกาศผลให้เอง (ตรวจทุก 15 นาที) และแสดงนับถอยหลังในหน้าสถานะ</p></div>' +
        '</div><div id="anErr" class="form-error" hidden></div></form>',
      foot: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="submit" form="annF" class="btn btn-primary" id="anSave">' + icon('save', 18) + 'บันทึก</button>'
    });
    function rooms() {
      var r = roomList($('anLevel').value);
      if (v.room && $('anLevel').value === v.level && r.indexOf(v.room) < 0) r.push(v.room);
      $('anRoom').innerHTML = r.length ? optionsHtml(r.map(function (x) { return { v: x, t: 'ห้อง ' + x }; }), v.room) : '<option value="">ยังไม่มีห้องในชั้นนี้</option>';
      $('anSubj').innerHTML = optionsHtml(subjectList($('anLevel').value), v.subject_id);
    }
    rooms();
    $('anLevel').onchange = rooms;
    $('annF').onsubmit = function (e) {
      e.preventDefault();
      var btn = $('anSave');
      setBusy(btn, true, 'กำลังบันทึก');
      api('save_announcement', {
        ann_id: a ? a.ann_id : '', year: $('anYear').value, term: $('anTerm').value, level: $('anLevel').value, room: $('anRoom').value,
        subject_id: $('anSubj').value, status: $('anStatus').value, expected_date: $('anDate').value, note: $('anNote').value, publish_at: $('anAt').value
      }).then(function (r) {
        closeModal();
        if (r.status === 'published') { confetti(); swal({ icon: 'announce', title: 'ประกาศผลแล้ว!', text: r.subject_name + ' ' + r.class_label, timer: 2800 }); }
        else toast(r.publish_at ? 'ตั้งเวลาประกาศ ' + fmtDateTime(r.publish_at) + ' แล้ว' : 'บันทึกรายการประกาศแล้ว');
        onSaved();
      })
        .catch(function (ex) { $('anErr').textContent = ex.message; $('anErr').hidden = false; setBusy(btn, false); });
    };
  }

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

  // ===== รายงานสถิติ =====
  function viewStats() {
    var st = opt.settings, last = null;
    main.innerHTML = head('รายงานสถิติ', 'สรุปคะแนนรายห้องของแต่ละรายวิชา') +
      '<div class="card card-pad"><div class="filters">' + selectField('tYear', 'ปีการศึกษา', yearList(), st.current_year) + selectField('tTerm', 'ภาคเรียน', TERMS, st.current_term) +
      selectField('tSubj', 'รายวิชา', subjectList(''), opt.subjects.length ? opt.subjects[0].subject_id : '') + '</div>' +
      '<button type="button" class="btn btn-primary btn-block" id="tGo" style="margin-top:14px">' + icon('chart', 18) + 'ดูรายงาน</button></div><div id="statOut" style="margin-top:16px"></div>';
    $('tGo').onclick = load;
    $('statOut').addEventListener('click', function (e) { if (closestEl(e.target, '[data-csv]') && last) exportStats(last); });
    if (opt.subjects.length) load();

    function load() {
      if (!$('tSubj').value) { toast('ไม่มีรายวิชาที่คุณดูแล', 'err'); return; }
      retryFn = load;
      $('statOut').innerHTML = loadingBlock('กำลังคำนวณ');
      api('stats', { year: $('tYear').value, term: $('tTerm').value, subject_id: $('tSubj').value }).then(function (d) { last = d; render(d); })
        .catch(function (e) { $('statOut').innerHTML = errorBlock(e.message); });
    }
    function render(d) {
      var o = d.overall;
      if (!d.classes.length) { $('statOut').innerHTML = '<div class="card">' + emptyBlock('chart', 'ยังไม่มีคะแนนของรายวิชานี้', 'บันทึกคะแนนแล้วรายงานจะแสดงที่นี่') + '</div>'; return; }
      var h = '<div class="grid-2" style="grid-template-columns:repeat(4,1fr);gap:8px">' +
        tile('มีคะแนน', o.count) + tile('ค่าเฉลี่ย', o.avg) + tile('สูงสุด/ต่ำสุด', o.count ? o.max + '/' + o.min : null) + tile('ผ่านเกณฑ์', o.count ? Math.round(o.pass / o.count * 100) + '%' : null) + '</div>';
      h += '<h2 class="sec-title">' + icon('door', 20) + 'รายห้อง<span class="more">คะแนนเต็ม ' + o.full + '</span></h2><div class="table-wrap"><table class="tbl"><thead><tr><th>ห้อง</th><th class="num">มีคะแนน</th><th class="num">เฉลี่ย</th><th class="num">สูงสุด</th><th class="num">ต่ำสุด</th><th class="num">ผ่าน 50%</th><th>สถานะ</th></tr></thead><tbody>' +
        d.classes.map(function (c) {
          var s = c.summary;
          return '<tr><td class="strong">' + esc(c.class_label) + '</td><td class="num">' + s.count + '/' + s.students + '</td><td class="num strong">' + fmtScore(s.avg) + '</td><td class="num">' + fmtScore(s.max) + '</td><td class="num">' + fmtScore(s.min) + '</td><td class="num">' + (s.count ? Math.round(s.pass / s.count * 100) + '%' : '–') + '</td><td>' + statusBadge(c.announcement ? c.announcement.status : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      h += '<h2 class="sec-title">' + icon('chart', 20) + 'เปรียบเทียบค่าเฉลี่ยรายห้อง</h2><div class="card card-pad">' + d.classes.map(function (c) {
        var pct = c.summary.avg === null ? 0 : c.summary.avg / o.full * 100;
        return '<div class="dist" style="grid-template-columns:56px 1fr 48px"><span>' + esc(c.class_label) + '</span><div class="bar"><span style="width:' + pct.toFixed(1) + '%"></span></div><span class="num-font">' + fmtScore(c.summary.avg) + '</span></div>';
      }).join('') + '</div>';
      if (d.show_grade) {
        var grades = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0'].concat(['ร', 'มส'].filter(function (g) { return d.overall_dist[g]; })), total = 0, k;
        for (k in d.overall_dist) if (d.overall_dist.hasOwnProperty(k)) total += d.overall_dist[k];
        h += '<h2 class="sec-title">' + icon('pie', 20) + 'การกระจายเกรด (ทุกห้อง)</h2><div class="card card-pad">' + grades.map(function (g) {
          var n = d.overall_dist[g] || 0;
          return '<div class="dist"><span class="strong">' + g + '</span><div class="bar ' + (Number(g) < 1 ? 'amber' : 'green') + '"><span style="width:' + (total ? n / total * 100 : 0).toFixed(1) + '%"></span></div><span class="num-font">' + n + ' คน</span></div>';
        }).join('') + '</div>';
      }
      h += '<div class="btn-row no-print" style="margin-top:16px"><button type="button" class="btn" data-csv>' + icon('download', 18) + 'ดาวน์โหลด CSV</button><button type="button" class="btn" onclick="window.print()">' + icon('printer', 18) + 'พิมพ์</button></div>';
      $('statOut').innerHTML = h;
      enter($('statOut'));
      animateCounts($('statOut'));
    }
    function exportStats(d) {
      downloadCSV('สถิติ_' + d.subject.name + '_เทอม' + d.term + '_' + d.year + '.csv', [['ห้อง', 'นักเรียน', 'มีคะแนน', 'เฉลี่ย', 'สูงสุด', 'ต่ำสุด', 'ผ่าน 50%']].concat(d.classes.map(function (c) {
        var s = c.summary;
        return [c.class_label, s.students, s.count, s.avg, s.max, s.min, s.pass];
      })));
    }
  }
  function tile(label, v) {
    var n = typeof v === 'number' ? ' data-count="' + v + '"' : '';
    return '<div class="card tile"><b' + n + '>' + fmtScore(v) + '</b><span>' + esc(label) + '</span></div>';
  }

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
      h = '<a class="card item-card rollover-cta" href="#rollover"><span class="tint t-amber">' + icon('grad', 22) + '</span><span class="li-main"><span class="li-title">ขึ้นปีการศึกษาใหม่</span>' +
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
      api('save_subject', { is_new: isNew, subject_id: $('sjId').value.trim(), name: $('sjName').value, type: $('sjType').value, icon: emo, levels: lv, grade_term2: $('sjG2').checked, active: $('sjAct').checked },
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

  // ===== กิจกรรมทั้งหมด =====
  function viewActivity() {
    main.innerHTML = head('กิจกรรมทั้งหมด', '100 รายการล่าสุด') + '<div class="list" id="actAll">' + loadingBlock() + '</div>';
    retryFn = viewActivity;
    api('activity', { limit: 100 }).then(function (list) {
      $('actAll').innerHTML = list.length ? list.map(actItem).join('') : emptyBlock('clock', 'ยังไม่มีกิจกรรม', '');
    }).catch(function (e) { $('actAll').innerHTML = errorBlock(e.message); });
  }
})();
