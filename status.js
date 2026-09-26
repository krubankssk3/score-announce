/* หน้าสถานะการประกาศผล (status.html) — สาธารณะ, ES5 */
(function () {
  var main = $('main');
  var year = '';
  var NOTIFY_KEY = 'sa_notify', SEEN_KEY = 'sa_seen';
  var timer = null;

  var s = getSession();
  if (s && s.token) { $('btnEnter').textContent = 'กลับหน้าหลัก'; $('btnEnter').href = homeOf(s.role); }

  main.addEventListener('click', function (e) {
    if (closestEl(e.target, '[data-retry]')) load();
    if (closestEl(e.target, '#btnNotify')) toggleNotify();
  });
  main.addEventListener('change', function (e) {
    if (e.target.id === 'yearSel') { year = e.target.value; load(); }
  });

  load();
  if (notifyOn()) startPolling();

  function load(silent) {
    if (!silent) main.innerHTML = loadingBlock('กำลังโหลดสถานะ');
    return api('status', { year: year }).then(function (d) {
      year = d.year;
      render(d, silent);
      checkNew(d);
    }).catch(function (e) { if (!silent) main.innerHTML = errorBlock(e.message); });
  }

  function ring(pct) {
    return gauge(pct, 156, 14, '<b data-count="' + pct + '">0</b><span>% ประกาศแล้ว</span>');
  }

  function itemTitle(a) { return a.subject_name + ' — ' + a.class_label + ' เทอม ' + a.term; }
  function itemSub(a) {
    if (a.status === 'published') return 'ประกาศเมื่อ ' + fmtDate(a.published_at);
    var parts = [a.note || (a.status === 'in_progress' ? 'กำลังตรวจสอบคะแนน' : 'เร็วๆ นี้')];
    if (a.expected_date) parts.push('คาดว่า ' + fmtDate(a.expected_date));
    return parts.join(' · ');
  }

  function render(d, silent) {
    var c = d.counts;
    var h = '';
    if (d.years.length > 1) {
      h += '<div class="btn-row" style="margin-bottom:12px"><label class="small muted" for="yearSel">ปีการศึกษา</label><select class="select" id="yearSel" style="width:auto;min-width:120px">' +
        d.years.slice().reverse().map(function (y) { return '<option value="' + esc(y) + '"' + (y === d.year ? ' selected' : '') + '>' + esc(y) + '</option>'; }).join('') + '</select></div>';
    }
    h += '<section class="card ring-card"><h2>ความคืบหน้าโดยรวม ปีการศึกษา ' + esc(d.year) + '</h2><div class="ring-wrap">' + ring(d.percent) +
      '<ul class="legend"><li><span class="dot" style="background:#10b981"></span>ประกาศแล้ว <b>' + c.published + '</b></li>' +
      '<li><span class="dot" style="background:#f59e0b"></span>กำลังดำเนินการ <b>' + c.in_progress + '</b></li>' +
      '<li><span class="dot" style="background:#cbd5e1"></span>รอดำเนินการ <b>' + c.pending + '</b></li></ul></div>' +
      '<p class="updated">' + (d.updated_at ? 'อัปเดตล่าสุด: ' + esc(fmtDateTime(d.updated_at)) : 'ยังไม่มีการอัปเดต') + '</p></section>';

    if (!c.total) {
      h += '<div class="card" style="margin-top:16px">' + emptyBlock('calendar-clock', 'ยังไม่มีกำหนดการประกาศผลในปีนี้', 'เมื่อครูเริ่มบันทึกคะแนน รายการจะแสดงที่หน้านี้') + '</div>';
      main.innerHTML = h;
      animateGauges(main);
      return;
    }

    h += '<h2 class="sec-title">' + icon('chart', 20) + 'ความคืบหน้ารายวิชา</h2><div class="stack">' + d.subjects.map(function (s, i) {
      var amber = s.pct < 60;
      return '<div class="card prog-card"><div class="prog-top"><span aria-hidden="true">' + esc(s.icon) + '</span>' + esc(s.name) +
        '<span class="pct" style="color:' + (amber ? 'var(--amber)' : 'var(--green)') + '">' + s.pct + '%</span></div>' +
        '<div class="bar' + (amber ? ' amber' : '') + '"><span style="width:' + s.pct + '%"></span></div><p>' + s.done + ' จาก ' + s.total + ' รายการประกาศแล้ว</p></div>';
    }).join('') + '</div>';

    h += '<h2 class="sec-title">' + icon('megaphone', 20) + 'สถานะการประกาศ</h2><div class="stack">' + d.items.map(function (a) {
      var m = STATUS_META[a.status];
      return '<div class="card item-card' + (a.status === 'in_progress' ? ' is-progress' : '') + '"><span class="tint ' + m.tint + '">' + icon(m.icon, 20) + '</span>' +
        '<span class="li-main"><span class="li-title">' + esc(itemTitle(a)) + '</span><span class="li-sub">' + esc(itemSub(a)) + '</span></span>' + statusBadge(a.status) + '</div>';
    }).join('') + '</div>';

    h += '<h2 class="sec-title">' + icon('pie', 20) + 'สรุปภาพรวม</h2><div class="grid-2">' +
      sumTile('check-circle', 't-green', c.published, 'ประกาศแล้ว') + sumTile('loader', 't-amber', c.in_progress, 'กำลังดำเนินการ') +
      sumTile('users', 't-cyan', d.total_students, 'นักเรียนทั้งหมด') + sumTile('calendar', 't-slate', c.total, 'รายการทั้งหมด') + '</div>';

    h += '<h2 class="sec-title">' + icon('calendar-clock', 20) + 'ไทม์ไลน์การประกาศ</h2><ul class="card timeline">' + d.items.map(function (a) {
      var label = a.status === 'published' ? 'ประกาศแล้ว · ' + fmtDate(a.published_at) : (a.status === 'in_progress' ? (a.note || 'กำลังดำเนินการ') : 'รอประกาศ') +
        (a.status !== 'published' && a.expected_date ? ' · คาดว่า ' + fmtDateShort(a.expected_date) : '');
      return '<li class="tl ' + a.status + '"><b>' + esc(a.subject_name + ' ' + a.class_label + ' เทอม ' + a.term) + '</b><span>' + esc(label) + '</span></li>';
    }).join('') + '</ul>';

    var on = notifyOn();
    var supported = 'Notification' in window;
    h += '<section class="card card-pad" style="margin-top:24px;background:var(--primary-soft);border-color:var(--primary-line)"><div style="display:flex;gap:14px;align-items:flex-start">' +
      '<span class="tint t-cyan" style="background:var(--card)">' + icon('bell', 20) + '</span><div><b style="color:var(--primary-dark)">แจ้งเตือนเมื่อประกาศผล</b>' +
      '<p class="small muted" style="margin:2px 0 12px">' + (supported ? 'เบราว์เซอร์จะแจ้งเตือนเมื่อมีห้องประกาศผลใหม่ ขณะที่เปิดหน้านี้ค้างไว้ (ตรวจทุก 5 นาที)' : 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน') + '</p>' +
      (supported ? '<button type="button" class="btn ' + (on ? '' : 'btn-primary') + ' btn-sm" id="btnNotify">' + (on ? 'ปิดการแจ้งเตือน' : 'เปิดการแจ้งเตือน') + '</button>' : '') +
      '</div></div></section>';
    main.innerHTML = h;
    if (!silent) enter(main);
    animateGauges(main);
    animateCounts(main);
  }

  function sumTile(ic, tint, n, label) {
    return '<div class="card tile"><span class="tint ' + tint + '">' + icon(ic, 20) + '</span><b data-count="' + n + '">' + n + '</b><span>' + esc(label) + '</span></div>';
  }

  // ===== แจ้งเตือน (ทำงานขณะเปิดหน้านี้) =====
  function notifyOn() { return Store.lget(NOTIFY_KEY) === true && 'Notification' in window && Notification.permission === 'granted'; }
  function startPolling() { if (!timer) timer = setInterval(function () { load(true); }, 5 * 60 * 1000); }
  function toggleNotify() {
    if (notifyOn()) {
      Store.lset(NOTIFY_KEY, false);
      clearInterval(timer); timer = null;
      toast('ปิดการแจ้งเตือนแล้ว');
      load(true);
      return;
    }
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') { toast('เบราว์เซอร์ไม่อนุญาตการแจ้งเตือน เปิดสิทธิ์ได้ที่การตั้งค่าเว็บไซต์', 'err'); return; }
      Store.lset(NOTIFY_KEY, true);
      startPolling();
      toast('เปิดการแจ้งเตือนแล้ว');
      load(true);
    });
  }
  function checkNew(d) {
    var ids = d.items.filter(function (a) { return a.status === 'published'; }).map(function (a) { return a.ann_id; });
    var seen = Store.lget(SEEN_KEY + '_' + d.year);
    if (seen && notifyOn()) {
      d.items.forEach(function (a) {
        if (a.status === 'published' && seen.indexOf(a.ann_id) < 0) {
          try { new Notification('ประกาศผลแล้ว: ' + a.class_label, { body: a.subject_name + ' ภาคเรียนที่ ' + a.term + '/' + a.year, icon: APP.LOGO }); } catch (e) { }
        }
      });
    }
    Store.lset(SEEN_KEY + '_' + d.year, ids);
  }
})();
