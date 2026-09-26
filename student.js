/* หน้าผลคะแนนนักเรียน/ผู้ปกครอง (student.html) — ES5 */
(function () {
  var sess = requireRole(['student']);
  if (!sess) return;

  var data = null;
  var period = null;

  $('btnLogout').onclick = logout;
  $('btnPrint').onclick = function () { window.print(); };
  $('content').addEventListener('click', function (e) { if (closestEl(e.target, '[data-retry]')) load(); });
  $('periods').addEventListener('click', function (e) {
    var b = closestEl(e.target, '[data-period]');
    if (!b) return;
    period = b.getAttribute('data-period');
    renderPeriods();
    renderResults();
  });

  load();

  function load() {
    $('content').innerHTML = loadingBlock('กำลังโหลดผลคะแนน');
    api('my_results').then(function (d) {
      data = d;
      renderHead();
      var list = periodsOf();
      period = list.length ? list[0].key : null;
      renderPeriods();
      renderResults();
      newResultsPopup();
    }).catch(function (err) {
      $('content').innerHTML = errorBlock(err.message);
    });
  }

  function renderHead() {
    var s = data.student;
    $('stuHi').innerHTML = esc(greeting()) + ' <span class="wave" aria-hidden="true">👋</span>';
    $('stuName').textContent = s.name;
    $('stuLead').textContent = data.results.length ? 'ผลคะแนนคณิตศาสตร์ที่ครูประกาศแล้ว พร้อมเทียบกับค่าเฉลี่ยของห้อง' : 'ยังไม่มีผลคะแนนที่ประกาศ';
    $('stuMeta').innerHTML = '<span>ชั้น ' + esc(s.class_label) + '</span>' +
      (s.number !== null && s.number !== undefined ? '<span>เลขที่ ' + esc(s.number) + '</span>' : '') +
      '<span>' + esc(s.masked) + '</span>';
    document.title = s.name + ' · ผลคะแนน';
  }

  function periodsOf() {
    var seen = {}, out = [];
    data.results.forEach(function (r) {
      var k = r.year + '|' + r.term;
      if (!seen[k]) { seen[k] = 1; out.push({ key: k, year: r.year, term: r.term }); }
    });
    return out;
  }

  function renderPeriods() {
    var list = periodsOf();
    if (list.length < 2) { $('periods').innerHTML = ''; return; }
    $('periods').innerHTML = '<div class="tabs no-print" role="tablist" aria-label="ภาคเรียน">' + list.map(function (p) {
      return '<button type="button" class="tab" role="tab" data-period="' + esc(p.key) + '" aria-selected="' + (p.key === period ? 'true' : 'false') + '">เทอม ' + esc(p.term) + '/' + esc(p.year) + '</button>';
    }).join('') + '</div>';
  }

  function cheer(pct) {
    if (pct >= 80) return 'ยอดเยี่ยมมาก! รักษามาตรฐานนี้ไว้นะ 🏆';
    if (pct >= 70) return 'ทำได้ดีมาก อีกนิดเดียวก็ถึงระดับสูงสุด ✨';
    if (pct >= 50) return 'ผ่านเกณฑ์แล้ว ฝึกเพิ่มอีกนิดจะดียิ่งขึ้น 💪';
    return 'ยังไม่ถึงเกณฑ์ ลองปรึกษาครูเพื่อทบทวนเพิ่มเติม 📘';
  }

  function renderResults() {
    var box = $('content');
    if (!period) {
      box.innerHTML = '<div class="card">' + emptyBlock('clock', 'ยังไม่มีผลคะแนนที่ประกาศ', 'เมื่อครูประกาศผลของห้องเรียนแล้ว คะแนนจะแสดงที่หน้านี้') + '</div>';
      return;
    }
    var parts = period.split('|');
    var items = data.results.filter(function (r) { return r.year === parts[0] && r.term === parts[1]; });
    box.innerHTML = '<h2 class="sec-title">' + icon('book-open', 20) + 'ภาคเรียนที่ ' + esc(parts[1]) + ' ปีการศึกษา ' + esc(parts[0]) + '</h2>' + items.map(card).join('') + trendSection();
    enter(box);
    animateGauges(box);
    animateCounts(box);
    var best = 0;
    items.forEach(function (r) { if (r.total !== null) best = Math.max(best, r.total / (r.work_max + r.exam_max) * 100); });
    var key = 'sa_cheer_' + period;
    if (best >= 80 && !Store.get(key)) { Store.set(key, 1); setTimeout(confetti, 700); }
  }

  function card(r) {
    var full = r.work_max + r.exam_max;
    var pct = r.total === null ? 0 : Math.max(0, Math.min(100, r.total / full * 100));
    var col = pct >= 80 ? ['#059669', '#34d399'] : (pct >= 50 ? null : ['#d97706', '#fbbf24']);
    var center = '<b' + (r.total !== null ? ' data-count="' + r.total + '"' : '') + '>' + fmtScore(r.total) + '</b><span>จาก ' + full + '</span>';
    var h = '<article class="card result">' +
      '<div class="result-head"><span class="emoji" aria-hidden="true">' + esc(r.icon) + '</span>' +
      '<div><h3>' + esc(r.subject_name) + '</h3><span class="muted small">' + esc(r.type) + ' · ชั้น ' + esc(r.class_label) + '</span></div>' +
      statusBadge('published') + '</div>' +
      (r.total !== null ? '<p class="cheer">' + esc(cheer(pct)) + '</p>' : '') +
      '<div class="result-body">' + gauge(pct, 132, 12, center, col) +
      '<div class="scores">' + sbox('คะแนนเก็บ', r.work, r.work_max) + sbox('คะแนนสอบ', r.exam, r.exam_max) + '</div></div>';
    if (r.class_avg !== null && r.total !== null) {
      var me = Math.min(100, r.total / full * 100), avg = Math.min(100, r.class_avg / full * 100);
      h += '<div class="compare"><div class="compare-track" role="img" aria-label="คะแนนของฉัน ' + r.total + ' ค่าเฉลี่ยห้อง ' + r.class_avg + '">' +
        '<span class="avg" style="left:' + avg.toFixed(1) + '%"><span class="tag">เฉลี่ยห้อง ' + r.class_avg + '</span></span>' +
        '<span class="me" style="left:' + me.toFixed(1) + '%"><span class="tag">ฉัน ' + r.total + '</span></span></div>' +
        (r.total >= r.class_avg ? 'สูงกว่าค่าเฉลี่ยของห้อง ' + (Math.round((r.total - r.class_avg) * 10) / 10) + ' คะแนน' : 'ต่ำกว่าค่าเฉลี่ยของห้อง ' + (Math.round((r.class_avg - r.total) * 10) / 10) + ' คะแนน') + '</div>';
    }
    h += '<p class="result-foot">' + icon('calendar', 15) + ' ประกาศเมื่อ ' + esc(fmtDate(r.published_at)) + '</p>';
    if (r.show_grade && r.grade !== null) {
      h += '<div class="grade-box"><span>ผลการเรียนรายปี<small>คิดจากคะแนนรวมเฉลี่ยของภาคเรียนที่ 1 และ 2</small></span><span class="grade-stamp">' + esc(r.grade) + '</span></div>';
    }
    return h + '</article>';
  }

  /** กราฟพัฒนาการคะแนนรวม (%) ข้ามภาคเรียน แยกรายวิชา */
  function trendSection() {
    var bySubj = {}, order = [];
    data.results.slice().reverse().forEach(function (r) {
      if (r.total === null) return;
      if (!bySubj[r.subject_id]) { bySubj[r.subject_id] = { name: r.subject_name, icon: r.icon, pts: [] }; order.push(r.subject_id); }
      bySubj[r.subject_id].pts.push({ label: 'ท.' + r.term + '/' + String(r.year).slice(2), pct: Math.round(r.total / (r.work_max + r.exam_max) * 1000) / 10 });
    });
    var charts = order.filter(function (k) { return bySubj[k].pts.length >= 2; });
    if (!charts.length) return '';
    return '<h2 class="sec-title">' + icon('chart', 20) + 'พัฒนาการของฉัน</h2>' + charts.map(function (k) {
      var sj = bySubj[k], W = 320, H = 130, pad = 26, n = sj.pts.length;
      var xs = function (i) { return pad + (W - pad * 2) * (n === 1 ? .5 : i / (n - 1)); };
      var ys = function (p) { return H - 24 - (H - 48) * p / 100; };
      var line = sj.pts.map(function (p, i) { return (i ? 'L' : 'M') + xs(i).toFixed(1) + ' ' + ys(p.pct).toFixed(1); }).join(' ');
      var area = line + ' L' + xs(n - 1).toFixed(1) + ' ' + (H - 24) + ' L' + xs(0).toFixed(1) + ' ' + (H - 24) + ' Z';
      var diff = sj.pts[n - 1].pct - sj.pts[n - 2].pct;
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="กราฟพัฒนาการ ' + esc(sj.name) + '">' +
        '<defs><linearGradient id="trendGrad" x1="0" x2="1"><stop offset="0" stop-color="#0891b2"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>' +
        '<linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".5"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs>' +
        '<line class="grid" x1="' + pad + '" x2="' + (W - pad) + '" y1="' + ys(50) + '" y2="' + ys(50) + '"/><text class="lbl" x="' + (W - pad) + '" y="' + (ys(50) - 4) + '" text-anchor="end">เกณฑ์ 50%</text>' +
        '<path class="area" d="' + area + '"/><path class="ln" d="' + line + '"/>' +
        sj.pts.map(function (p, i) {
          return '<circle class="pt" cx="' + xs(i).toFixed(1) + '" cy="' + ys(p.pct).toFixed(1) + '" r="5"/><text class="val" x="' + xs(i).toFixed(1) + '" y="' + (ys(p.pct) - 10).toFixed(1) + '" text-anchor="middle">' + p.pct + '%</text>' +
            '<text class="lbl" x="' + xs(i).toFixed(1) + '" y="' + (H - 4) + '" text-anchor="middle">' + esc(p.label) + '</text>';
        }).join('') + '</svg>';
      return '<div class="card trend"><div class="prog-top"><span aria-hidden="true">' + esc(sj.icon) + '</span>' + esc(sj.name) +
        '<span class="pct" style="color:' + (diff >= 0 ? 'var(--green)' : 'var(--amber)') + '">' + (diff >= 0 ? '▲ +' : '▼ ') + (Math.round(diff * 10) / 10) + '%</span></div>' + svg + '</div>';
    }).join('');
  }

  /** แจ้งเมื่อมีผลคะแนนใหม่ภายใน 3 วัน (ครั้งเดียวต่อการเปิดเบราว์เซอร์) */
  function newResultsPopup() {
    var now = Date.now();
    var fresh = data.results.filter(function (r) { var t = parseDate(r.published_at); return t && now - t.getTime() <= 3 * 86400000; });
    if (!fresh.length || Store.get('sa_new_seen')) return;
    Store.set('sa_new_seen', 1);
    setTimeout(function () {
      swal({
        icon: 'announce', title: 'ผลคะแนนใหม่มาแล้ว!',
        html: '<ul class="swal-list">' + fresh.map(function (r) {
          return '<li><span aria-hidden="true">' + esc(r.icon) + '</span><span><b>' + esc(r.subject_name) + '</b><small>เทอม ' + esc(r.term) + '/' + esc(r.year) + ' · ประกาศ' + esc(relTime(r.published_at)) + '</small></span></li>';
        }).join('') + '</ul>',
        confirmText: 'ดูคะแนนเลย'
      });
    }, 500);
  }

  function sbox(label, v, max) {
    var p = v === null ? 0 : Math.min(100, v / max * 100);
    return '<div class="sbox"><span>' + label + '</span><b' + (v !== null ? ' data-count="' + v + '"' : '') + '>' + fmtScore(v) + '</b><small>/' + max + '</small>' +
      '<div class="bar mini"><span style="width:' + p.toFixed(1) + '%"></span></div></div>';
  }
})();
