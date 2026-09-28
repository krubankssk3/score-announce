/* แผงควบคุม (admin.html) — หน้าหลัก · ตัวช่วยตั้งค่า · กิจกรรมทั้งหมด · ES5
   ลำดับโหลดใน admin.html: admin-core.js ก่อน แล้วไฟล์ admin-*.js อื่น (ลำดับใดก็ได้) */
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
  if (isAdmin) h += '<div id="setupBanner"></div>';
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

  if (isAdmin) swr('setup_status', {}, function (d) {
    var b = $('setupBanner');
    if (!b) return;
    if (d.done >= d.total) { b.innerHTML = ''; return; }
    var pct = Math.round(d.done / d.total * 100);
    b.innerHTML = '<a class="card setup-banner" href="#setup">' + gauge(pct, 64, 7, '<b style="font-size:16px">' + pct + '%</b>') +
      '<span class="li-main"><span class="li-title">ตั้งค่าระบบให้พร้อมใช้งาน</span><span class="li-sub">เสร็จแล้ว ' + d.done + ' จาก ' + d.total + ' ขั้นที่จำเป็น — แตะเพื่อดูว่าเหลืออะไร</span></span>' + icon('chevron-right', 20, 'muted') + '</a>';
    animateGauges(b);
  }).then(null, function () { });
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

// ===== ตัวช่วยตั้งค่าครั้งแรก =====
function viewSetup() {
  main.innerHTML = head('ตัวช่วยตั้งค่าระบบ', 'ระบบตรวจให้อัตโนมัติว่าตั้งค่าอะไรครบแล้ว แตะแต่ละข้อเพื่อไปทำต่อ') + '<div id="suOut">' + loadingBlock('กำลังตรวจการตั้งค่า') + '</div>';
  retryFn = viewSetup;
  api('setup_status', {}, { loader: false }).then(function (d) {
    var pct = Math.round(d.done / d.total * 100);
    var groups = [], by = {};
    d.items.forEach(function (x) { if (!by[x.group]) { by[x.group] = []; groups.push(x.group); } by[x.group].push(x); });
    var nextItem = d.items.filter(function (x) { return x.ok === 'todo' && !x.optional; })[0];
    var h = '<div class="card setup-hero">' + gauge(pct, 132, 12, '<b data-count="' + pct + '">0</b><span>% พร้อมใช้งาน</span>', pct === 100 ? ['#059669', '#34d399'] : null) +
      '<div><b class="su-big">' + (pct === 100 ? 'พร้อมใช้งานแล้ว 🎉' : 'เหลืออีก ' + (d.total - d.done) + ' ขั้น') + '</b>' +
      '<p class="muted" style="margin:4px 0 12px">ขั้นที่จำเป็นเสร็จ ' + d.done + '/' + d.total + ' · รวมขั้นเสริม ' + d.all_done + '/' + d.all_total + '</p>' +
      (nextItem ? '<a class="btn btn-primary" href="' + esc(nextItem.href) + '">' + icon('chevron-right', 18) + 'ทำขั้นต่อไป: ' + esc(nextItem.title) + '</a>' : '<button type="button" class="btn" data-retry>' + icon('loader', 16) + 'ตรวจอีกครั้ง</button>') + '</div></div>';
    var n = 0;
    groups.forEach(function (g) {
      h += '<h2 class="sec-title">' + esc(g) + '</h2><div class="list">' + by[g].map(function (x) {
        n++;
        var ic = x.ok === 'ok' ? '<span class="su-ic ok">' + icon('check', 18) + '</span>' : (x.ok === 'warn' ? '<span class="su-ic warn">!</span>' : '<span class="su-ic todo">' + n + '</span>');
        return '<a class="li su-item ' + x.ok + '" href="' + esc(x.href || '#setup') + '">' + ic + '<span class="li-main"><span class="li-title">' + esc(x.title) +
          (x.optional ? ' <span class="badge b-slate">ไม่บังคับ</span>' : '') + '</span><span class="li-sub">' + esc(x.detail) + '</span></span>' + icon('chevron-right', 18, 'muted') + '</a>';
      }).join('') + '</div>';
    });
    h += '<p class="small muted" style="margin-top:16px">รายการที่ต้องทำใน Apps Script (เช่น งานอัตโนมัติ) ให้เปิดโปรเจ็กต์ → เลือกฟังก์ชัน <code>setup</code> → เรียกใช้ แล้ว Deploy เวอร์ชันใหม่</p>';
    $('suOut').innerHTML = h;
    enter($('suOut'));
    animateGauges($('suOut'));
    animateCounts($('suOut'));
    if (pct === 100) confetti();
  }).catch(function (e) { $('suOut').innerHTML = errorBlock(e.message); });
}

// ===== กิจกรรมทั้งหมด =====
function viewActivity() {
  main.innerHTML = head('กิจกรรมทั้งหมด', '100 รายการล่าสุด') + '<div class="list" id="actAll">' + loadingBlock() + '</div>';
  retryFn = viewActivity;
  api('activity', { limit: 100 }).then(function (list) {
    $('actAll').innerHTML = list.length ? list.map(actItem).join('') : emptyBlock('clock', 'ยังไม่มีกิจกรรม', '');
  }).catch(function (e) { $('actAll').innerHTML = errorBlock(e.message); });
}
