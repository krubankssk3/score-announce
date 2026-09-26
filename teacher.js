/* หน้าครู: เลือกเงื่อนไขแล้วดูผลคะแนน (teacher.html) — ES5 */
(function () {
  var sess = requireRole(['teacher', 'admin']);
  if (!sess) return;

  var main = $('main');
  var opt = null, result = null, roomIdx = 0, mode = 'picker';
  var sel = { year: '', term: '', level: '', subject_id: '' };
  var RECENT_KEY = 'sa_recent_' + (sess.username || 'staff');

  mountUserMenu($('btnUser'), sess);
  main.addEventListener('click', onClick);
  init();

  function init() {
    mode = 'picker';
    main.innerHTML = loadingBlock();
    api('options').then(function (o) {
      opt = o;
      var st = o.settings;
      sel.year = st.current_year;
      sel.term = st.current_term;
      sel.level = st.levels[0] || '';
      fixSubject();
      renderPicker(true);
    }).catch(function (e) { main.innerHTML = errorBlock(e.message); });
  }

  function subjectsFor(level) {
    return opt.subjects.filter(function (s) { return !s.levels.length || s.levels.indexOf(level) > -1; });
  }
  function subjById(id) {
    for (var i = 0; i < opt.subjects.length; i++) { if (opt.subjects[i].subject_id === id) return opt.subjects[i]; }
    return null;
  }
  function fixSubject() {
    var list = subjectsFor(sel.level);
    var ok = list.some(function (s) { return s.subject_id === sel.subject_id; });
    if (!ok) sel.subject_id = list.length ? list[0].subject_id : '';
  }

  function choice(key, val, label, small, extraCls) {
    var on = String(sel[key]) === String(val);
    return '<button type="button" class="choice ' + (extraCls || '') + '" data-pick="' + key + '" data-val="' + esc(val) + '" aria-pressed="' + on + '">' +
      '<span>' + esc(label) + '</span>' + (small ? '<small>' + esc(small) + '</small>' : '') + '<span class="chk">' + icon('check-circle', 20) + '</span></button>';
  }
  function secTitle(ic, text) {
    return '<h2 class="sec-title big"><span class="boxed">' + icon(ic, 20) + '</span>' + esc(text) + '</h2>';
  }

  function renderPicker(first) {
    mode = 'picker';
    var st = opt.settings;
    var subj = subjById(sel.subject_id);
    var h = '<section class="hero">' + mathSymbols(9, 5) + '<p class="hi">' + esc(greeting()) + ' <span class="wave" aria-hidden="true">👋</span></p><h1>' + esc(sess.name) + '</h1>' +
      '<p class="lead">เลือกเงื่อนไขด้านล่างเพื่อดูผลสอบและคะแนนงานของนักเรียน</p></section>';

    h += secTitle('calendar', 'ปีการศึกษา') + '<div class="choice-grid">' +
      st.years.map(function (y) { return choice('year', y, y); }).join('') + '</div>';

    h += secTitle('book-open', 'ภาคเรียน') + '<div class="choice-grid two">' +
      choice('term', '1', 'ภาคเรียนที่ 1', termRange(st, 1, sel.year), 'tall') +
      choice('term', '2', 'ภาคเรียนที่ 2', termRange(st, 2, sel.year), 'tall') + '</div>' +
      '<div class="notice">' + icon('info', 18) + '<span>เทอม 1: แสดงเฉพาะคะแนนสอบและคะแนนงาน · เทอม 2 (ประถม): แสดงเกรดเพิ่มเติมสำหรับวิชาคณิตศาสตร์พื้นฐาน</span></div>';

    h += secTitle('users', 'ชั้นเรียน') + '<div class="choice-grid">' +
      st.levels.map(function (l) { return choice('level', l, l); }).join('') + '</div>';

    var subs = subjectsFor(sel.level);
    h += secTitle('book', 'รายวิชา');
    if (!subs.length) {
      h += '<div class="card">' + emptyBlock('book', 'ยังไม่มีรายวิชาสำหรับชั้นนี้', 'เพิ่มรายวิชาได้ที่ชีต Subjects') + '</div>';
    } else {
      h += subs.map(function (s) {
        var on = s.subject_id === sel.subject_id;
        var sub = s.type + ' · ' + (s.grade_term2 ? 'มีเกรดเทอม 2 (ประถม)' : 'คะแนนสอบและงาน');
        return '<button type="button" class="subj" data-pick="subject_id" data-val="' + esc(s.subject_id) + '" aria-pressed="' + on + '">' +
          '<span class="emoji" aria-hidden="true">' + esc(s.icon) + '</span><span><span class="subj-name">' + esc(s.name) + '</span><span class="subj-sub">' + esc(sub) + '</span></span>' +
          '<span class="radio">' + (on ? icon('check', 18) : '') + '</span></button>';
      }).join('');
    }

    var count = sel.year === st.current_year ? (opt.levelCounts[sel.level] || 0) : null;
    h += '<div class="card card-pad" style="margin-top:6px"><h3 class="sec-title" style="margin:0 0 12px;font-size:15.5px;color:var(--muted)">' + icon('clipboard', 18) + 'สรุปการเลือก</h3>' +
      '<div class="pills"><span class="pill">' + icon('calendar', 16) + 'ปี ' + esc(sel.year) + '</span><span class="pill">' + icon('book-open', 16) + 'เทอม ' + esc(sel.term) + '</span>' +
      '<span class="pill">' + icon('users', 16) + esc(sel.level) + '</span>' + (subj ? '<span class="pill">' + icon('book', 16) + esc(subj.name) + '</span>' : '') + '</div>' +
      (count !== null ? '<p class="small muted" style="margin:12px 0 0">นักเรียนที่ลงทะเบียน: <b style="color:var(--text)">' + count + ' คน</b></p>' : '') + '</div>';

    var recent = Store.lget(RECENT_KEY) || [];
    if (recent.length) {
      h += '<h2 class="sec-title" style="font-size:15.5px;color:var(--muted)">' + icon('clock', 18) + 'ค้นหาล่าสุด</h2><div class="stack">' +
        recent.map(function (r, i) {
          return '<button type="button" class="card item-card li" data-recent="' + i + '" style="border:1px solid var(--line)">' +
            '<span class="emoji sm" aria-hidden="true">' + esc(r.icon) + '</span><span class="li-main"><span class="li-title">' + esc(r.subject_name) + ' — ' + esc(r.level) + ' เทอม ' + esc(r.term) + '/' + esc(r.year) + '</span>' +
            '<span class="li-sub">' + esc(relTime(r.at)) + '</span></span>' + icon('chevron-right', 20, 'muted') + '</button>';
        }).join('') + '</div>';
    }

    h += '<div class="sticky-cta"><button type="button" class="btn btn-primary btn-lg" id="btnView"' + (subj ? '' : ' disabled') + '>' + icon('search', 22) + 'ดูผลคะแนน</button>' +
      '<p>ปีการศึกษา ' + esc(sel.year) + ' · เทอม ' + esc(sel.term) + ' · ' + esc(sel.level) + (subj ? ' · ' + esc(subj.name) : '') + '</p></div>';
    main.innerHTML = h;
    if (first) enter(main);
  }

  function pushRecent() {
    var subj = subjById(sel.subject_id);
    var list = (Store.lget(RECENT_KEY) || []).filter(function (r) {
      return !(r.year === sel.year && r.term === sel.term && r.level === sel.level && r.subject_id === sel.subject_id);
    });
    list.unshift({ year: sel.year, term: sel.term, level: sel.level, subject_id: sel.subject_id, subject_name: subj ? subj.name : '', icon: subj ? subj.icon : '📘', at: new Date().toISOString() });
    Store.lset(RECENT_KEY, list.slice(0, 4));
  }

  function view() {
    if (!sel.subject_id) { toast('เลือกรายวิชาก่อน', 'err'); return; }
    mode = 'results';
    main.innerHTML = loadingBlock('กำลังโหลดผลคะแนน');
    window.scrollTo(0, 0);
    api('view_results', sel).then(function (d) {
      result = d;
      roomIdx = 0;
      pushRecent();
      renderResults();
      enter(main);
    }).catch(function (e) { main.innerHTML = errorBlock(e.message); });
  }

  function renderResults() {
    var d = result, st = opt.settings;
    var h = '<button type="button" class="btn btn-sm no-print" data-back>' + icon('chevron-left', 18) + 'เปลี่ยนเงื่อนไข</button>' +
      '<h1 class="page-title" style="display:flex;align-items:center;gap:10px;margin-top:14px"><span aria-hidden="true">' + esc(d.subject.icon) + '</span>' + esc(d.subject.name) + '</h1>' +
      '<p class="page-sub">ชั้น ' + esc(d.level) + ' · ภาคเรียนที่ ' + esc(d.term) + ' ปีการศึกษา ' + esc(d.year) + ' (' + esc(termRange(st, d.term, d.year)) + ')</p>';
    if (!d.rooms.length) {
      main.innerHTML = h + '<div class="card">' + emptyBlock('users', 'ยังไม่มีนักเรียนหรือคะแนนของชั้นนี้', 'เพิ่มนักเรียนหรือบันทึกคะแนนได้ที่หน้าจัดการคะแนน', '<a class="btn btn-primary" href="admin.html#scores">' + icon('pencil', 18) + 'ไปหน้าจัดการคะแนน</a>') + '</div>';
      return;
    }
    if (d.rooms.length > 1) {
      h += '<div class="tabs no-print" role="tablist" aria-label="ห้องเรียน">' + d.rooms.map(function (r, i) {
        return '<button type="button" class="tab" role="tab" data-room="' + i + '" aria-selected="' + (i === roomIdx) + '">' + esc(r.class_label) + '</button>';
      }).join('') + '</div>';
    }
    var room = d.rooms[roomIdx];
    var s = room.summary, a = room.announcement;
    var annText = a ? (a.status === 'published' ? 'ประกาศเมื่อ ' + fmtDate(a.published_at) : (a.note || (a.expected_date ? 'คาดว่าประกาศ ' + fmtDate(a.expected_date) : 'ยังไม่ประกาศให้ผู้ปกครองเห็น'))) : 'ยังไม่มีรายการประกาศ';
    h += '<div class="card item-card" style="margin-bottom:12px"><div class="tint t-cyan">' + icon('door', 20) + '</div><div class="li-main"><span class="li-title" style="font-weight:700">ห้อง ' + esc(room.class_label) + '</span><span class="li-sub">' + esc(annText) + '</span></div>' + statusBadge(a ? a.status : '') + '</div>';

    h += '<div class="grid-2" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">' +
      tile('ค่าเฉลี่ย', s.avg) + tile('สูงสุด', s.max) + tile('ต่ำสุด', s.min) + tile('ผ่านเกณฑ์ 50%', s.count ? s.pass + '/' + s.count : null) + '</div>' +
      '<p class="small muted" style="margin:0 0 10px">มีคะแนนแล้ว ' + s.count + ' จาก ' + s.students + ' คน · คะแนนเต็ม ' + s.full + '</p>';

    h += '<div class="table-wrap"><table class="tbl"><thead><tr><th class="c">เลขที่</th><th>ชื่อ-สกุล</th><th class="num">เก็บ (' + d.subject.work_max + ')</th><th class="num">สอบ (' + d.subject.exam_max + ')</th><th class="num">รวม</th>' +
      (d.show_grade ? '<th class="c">เกรด</th>' : '') + '</tr></thead><tbody>' +
      (room.rows.length ? room.rows.map(function (r) {
        return '<tr><td class="c">' + fmtScore(r.number) + '</td><td>' + esc(r.name) + '</td><td class="num">' + fmtScore(r.work) + '</td><td class="num">' + fmtScore(r.exam) + '</td><td class="num strong ' + scoreCls(r.total, s.full) + '">' + fmtScore(r.total) + '</td>' +
          (d.show_grade ? '<td class="c">' + gradeChip(r.grade) + '</td>' : '') + '</tr>';
      }).join('') : '<tr><td colspan="6" class="c muted">ไม่มีรายชื่อนักเรียน</td></tr>') +
      '</tbody></table></div>';
    if (d.show_grade) h += '<p class="small muted">เกรดคำนวณจากคะแนนรวมเฉลี่ยของภาคเรียนที่ 1 และ 2 (80 ขึ้นไป = 4, ลดลงทีละ 0.5 ทุก 5 คะแนน, ต่ำกว่า 50 = 0)</p>';

    var q = buildQuery({ y: d.year, t: d.term, l: d.level, r: room.room, s: d.subject.subject_id });
    h += '<div class="btn-row no-print" style="margin-top:16px"><button type="button" class="btn" data-print>' + icon('printer', 18) + 'พิมพ์</button>' +
      '<button type="button" class="btn" data-csv>' + icon('download', 18) + 'ดาวน์โหลด CSV</button>' +
      '<a class="btn btn-primary push" href="admin.html#scores?' + q + '">' + icon('pencil', 18) + 'แก้ไขคะแนนห้องนี้</a></div>';
    main.innerHTML = h;
    animateCounts(main);
  }

  function scoreCls(t, full) {
    if (t === null) return '';
    var p = t / full * 100;
    return p >= 80 ? 'hi-score' : (p < 50 ? 'lo-score' : '');
  }
  function gradeChip(g) {
    if (g === null || g === undefined) return '–';
    return '<span class="grade-chip' + (g === '4' ? ' g4' : (g === '0' ? ' g0' : '')) + '">' + esc(g) + '</span>';
  }
  function tile(label, v) {
    var n = typeof v === 'number' ? ' data-count="' + v + '"' : '';
    return '<div class="card tile"><b' + n + '>' + fmtScore(v) + '</b><span>' + esc(label) + '</span></div>';
  }

  function exportCSV() {
    var d = result, room = d.rooms[roomIdx];
    var head = ['เลขที่', 'ชื่อ-สกุล', 'คะแนนเก็บ', 'คะแนนสอบ', 'คะแนนรวม'];
    if (d.show_grade) head.push('เกรด');
    var rows = [head].concat(room.rows.map(function (r) {
      var x = [r.number, r.name, r.work, r.exam, r.total];
      if (d.show_grade) x.push(r.grade);
      return x;
    }));
    downloadCSV('คะแนน_' + d.subject.name + '_' + room.class_label.replace('/', '-') + '_เทอม' + d.term + '_' + d.year + '.csv', rows);
  }

  function onClick(e) {
    var t;
    if ((t = closestEl(e.target, '[data-pick]'))) {
      sel[t.getAttribute('data-pick')] = t.getAttribute('data-val');
      if (t.getAttribute('data-pick') === 'level') fixSubject();
      renderPicker();
      return;
    }
    if ((t = closestEl(e.target, '[data-recent]'))) {
      var r = (Store.lget(RECENT_KEY) || [])[Number(t.getAttribute('data-recent'))];
      if (r && subjById(r.subject_id)) {
        sel = { year: r.year, term: r.term, level: r.level, subject_id: r.subject_id };
        view();
      } else {
        toast('รายวิชานี้ไม่อยู่ในสิทธิ์ของคุณแล้ว', 'err');
      }
      return;
    }
    if (closestEl(e.target, '#btnView')) { view(); return; }
    if (closestEl(e.target, '[data-back]')) { renderPicker(); window.scrollTo(0, 0); return; }
    if ((t = closestEl(e.target, '[data-room]'))) { roomIdx = Number(t.getAttribute('data-room')); renderResults(); return; }
    if (closestEl(e.target, '[data-print]')) { window.print(); return; }
    if (closestEl(e.target, '[data-csv]')) { exportCSV(); return; }
    if (closestEl(e.target, '[data-retry]')) { if (!opt) init(); else if (mode === 'results') view(); else renderPicker(); }
  }
})();
