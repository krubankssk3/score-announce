/* หน้าผลคะแนนนักเรียน/ผู้ปกครอง (student.html) — ES5 */
(function () {
  var sess = requireRole(['student']);
  if (!sess) return;

  var data = null;
  var period = null;

  $('btnLogout').onclick = logout;
  $('btnPrint').onclick = function () { window.print(); };
  $('content').addEventListener('click', function (e) {
    if (closestEl(e.target, '[data-retry]')) load();
    var b = closestEl(e.target, '[data-review]');
    if (b) reviewForm(data.results[Number(b.getAttribute('data-review'))]);
  });
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
    swr('my_results', {}, function (d, fromCache) {
      data = d;
      renderHead();
      var list = periodsOf();
      var keys = list.map(function (p) { return p.key; });
      if (!period || keys.indexOf(period) < 0) period = list.length ? list[0].key : null;
      renderPeriods();
      renderResults();
      if (!fromCache) newResultsPopup();
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
    box.innerHTML = '<h2 class="sec-title">' + icon('book-open', 20) + 'ภาคเรียนที่ ' + esc(parts[1]) + ' ปีการศึกษา ' + esc(parts[0]) + '</h2>' + items.map(card).join('') + trendSection() + reviewSection();
    enter(box);
    animateGauges(box);
    animateCounts(box);
    var best = 0;
    items.forEach(function (r) { var hl = headline(r); if (hl) best = Math.max(best, hl.v / hl.max * 100); });
    var key = 'sa_cheer_' + period;
    if (best >= 80 && !Store.get(key)) { Store.set(key, 1); setTimeout(confetti, 700); }
  }

  /** คะแนนหลักของการ์ด: คะแนนรวม (ถ้าประกาศ) หรือช่องเดียวที่ประกาศ */
  function headline(r) {
    if (r.show_total && r.total !== null) return { v: r.total, max: r.full, label: 'คะแนนรวม' };
    if (r.components.length === 1 && r.components[0].value !== null) return { v: r.components[0].value, max: r.components[0].max, label: r.components[0].label };
    return null;
  }

  function card(r) {
    var hl = headline(r);
    var pct = hl ? Math.max(0, Math.min(100, hl.v / hl.max * 100)) : null;
    var col = pct === null ? null : (pct >= 80 ? ['#059669', '#34d399'] : (pct >= 50 ? null : ['#d97706', '#fbbf24']));
    var h = '<article class="card result">' +
      '<div class="result-head"><span class="emoji" aria-hidden="true">' + esc(r.icon) + '</span>' +
      '<div><h3>' + esc(r.subject_name) + '</h3><span class="muted small">' + esc(r.type) + ' · ชั้น ' + esc(r.class_label) + '</span></div>' +
      statusBadge('published') + '</div>' +
      (r.note ? '<div class="notice info" style="margin:0 0 14px">' + icon('info', 18) + '<span>' + esc(r.note) + '</span></div>' : '') +
      (pct !== null ? '<p class="cheer">' + esc(cheer(pct)) + '</p>' : '');
    var boxes = '<div class="scores"' + (hl ? '' : ' style="grid-template-columns:repeat(' + Math.min(r.components.length, 3) + ',1fr)"') + '>' +
      r.components.map(function (c) { return sbox(c.label, c.value, c.max); }).join('') + '</div>';
    if (hl) {
      var center = '<b data-count="' + hl.v + '">' + fmtScore(hl.v) + '</b><span>จาก ' + hl.max + '</span>';
      h += '<div class="result-body">' + gauge(pct, 132, 12, center, col) + (r.components.length > 1 || !r.show_total ? boxes : '<div class="sbox"><span>' + esc(hl.label) + '</span><b>' + fmtScore(hl.v) + '</b><small>/' + hl.max + '</small></div>') + '</div>';
    } else {
      h += boxes;
    }
    if (hl && r.class_avg !== null) {
      var me = Math.min(100, hl.v / hl.max * 100), avg = Math.min(100, r.class_avg / hl.max * 100);
      var diff = Math.round((hl.v - r.class_avg) * 10) / 10;
      h += '<div class="compare"><div class="compare-track" role="img" aria-label="คะแนนของฉัน ' + hl.v + ' ค่าเฉลี่ยห้อง ' + r.class_avg + '">' +
        '<span class="avg" style="left:' + avg.toFixed(1) + '%"><span class="tag">เฉลี่ยห้อง ' + r.class_avg + '</span></span>' +
        '<span class="me" style="left:' + me.toFixed(1) + '%"><span class="tag">ฉัน ' + hl.v + '</span></span></div>' +
        (diff >= 0 ? 'สูงกว่าค่าเฉลี่ยของห้อง ' + diff + ' คะแนน' : 'ต่ำกว่าค่าเฉลี่ยของห้อง ' + (-diff) + ' คะแนน') + '</div>';
    }
    var idx = data.results.indexOf(r);
    var open = (data.reviews || []).filter(function (v) { return v.subject_id === r.subject_id && v.year === r.year && v.term === r.term && (v.status === 'new' || v.status === 'in_review'); })[0];
    h += '<div class="result-foot foot-row"><span>' + icon('calendar', 15) + ' ประกาศเมื่อ ' + esc(fmtDate(r.published_at)) + '</span>' +
      (open ? '<span class="badge b-amber">คำขอตรวจสอบ: ' + esc(open.status_label) + '</span>' :
        '<button type="button" class="btn btn-sm no-print" data-review="' + idx + '">' + icon('search', 15) + 'ขอตรวจสอบคะแนน</button>') + '</div>';
    if (r.special) {
      h += '<div class="special-box"><span class="grade-stamp">' + esc(r.special) + '</span><span><b>' + esc(r.special_label) + '</b>' +
        '<small>' + esc(r.special_note || r.special_hint) + '</small><small class="muted">กรุณาติดต่อครูผู้สอนเพื่อดำเนินการให้เรียบร้อย</small></span></div>';
    } else if (r.year_detail && r.year_detail.mode === 'sum') {
      var y = r.year_detail;
      h += '<div class="year-box"><div class="yb-head">🏆 ผลการเรียนทั้งปี</div><div class="yb-grid">' +
        '<div><small>ภาคเรียนที่ 1</small><b>' + fmtScore(y.t1_total) + '</b><span>/' + y.t1_full + '</span></div><i>+</i>' +
        '<div><small>ภาคเรียนที่ 2</small><b>' + fmtScore(y.t2_total) + '</b><span>/' + y.t2_full + '</span></div><i>=</i>' +
        '<div class="sum"><small>รวมทั้งปี</small><b>' + fmtScore(y.year_total) + '</b><span>/' + y.year_full + '</span></div></div>' +
        (r.grade !== null ? '<div class="yb-grade"><span>เกรดทั้งปี</span><span class="grade-stamp">' + esc(r.grade) + '</span></div>' : '<p class="small" style="margin:10px 0 0;color:var(--amber)">ยังไม่มีคะแนนภาคเรียนที่ 1 ในระบบ กรุณาติดต่อครูผู้สอน</p>') + '</div>';
    } else if (r.show_grade && r.grade !== null) {
      var yr = r.grade_mode !== 'term' && r.term === '2';
      h += '<div class="grade-box"><span>' + (yr ? 'ผลการเรียนรายปี' : 'ผลการเรียนภาคเรียนนี้') + '<small>' + (yr ? 'คิดจากคะแนนเฉลี่ยของภาคเรียนที่ 1 และ 2' : 'คิดจากคะแนนทุกส่วนของภาคเรียนนี้') + '</small></span><span class="grade-stamp">' + esc(r.grade) + '</span></div>';
    }
    return h + '</article>';
  }

  function reviewSection() {
    var list = data.reviews || [];
    if (!list.length) return '';
    var cls = { new: 'b-amber', in_review: 'b-cyan', fixed: 'b-green', confirmed: 'b-slate' };
    return '<h2 class="sec-title">' + icon('search', 20) + 'คำขอตรวจสอบคะแนนของฉัน</h2><div class="stack">' + list.map(function (v) {
      return '<div class="card card-pad review-card"><div class="rv-top"><span aria-hidden="true">' + esc(v.icon) + '</span><span class="li-main"><span class="li-title">' + esc(v.subject_name) + ' · ' + esc(v.topic) + '</span>' +
        '<span class="li-sub">ภาคเรียนที่ ' + esc(v.term) + '/' + esc(v.year) + ' · ส่งเมื่อ ' + esc(fmtDateTime(v.created_at)) + '</span></span><span class="badge ' + (cls[v.status] || 'b-slate') + '">' + esc(v.status_label) + '</span></div>' +
        '<p class="rv-reason">"' + esc(v.reason) + '"</p>' +
        (v.reply ? '<div class="rv-reply"><b>' + icon('check-circle', 16) + ' ครูตอบกลับ</b><p>' + esc(v.reply) + '</p><small>' + esc(fmtDateTime(v.handled_at)) + '</small></div>' : '<p class="small muted" style="margin:6px 0 0">ครูจะตรวจสอบและตอบกลับที่หน้านี้</p>') + '</div>';
    }).join('') + '</div>';
  }

  function reviewForm(r) {
    var topics = r.components.map(function (c) { return c.label; }).concat(r.show_total ? ['คะแนนรวม'] : [], r.show_grade ? ['เกรด'] : [], ['อื่น ๆ']);
    openModal({
      title: 'ขอตรวจสอบคะแนน',
      body: '<form id="rvF"><div class="notice info" style="margin:0 0 14px">' + icon('info', 18) + '<span>' + esc(r.icon + ' ' + r.subject_name) + ' ภาคเรียนที่ ' + esc(r.term) + '/' + esc(r.year) + '</span></div>' +
        '<p class="label">ต้องการให้ตรวจสอบส่วนไหน</p><div class="chip-row" style="flex-wrap:wrap" id="rvTopic">' + topics.map(function (t, i) {
          return '<button type="button" class="chip" data-t="' + esc(t) + '" aria-pressed="' + (i === 0) + '">' + esc(t) + '</button>';
        }).join('') + '</div>' +
        '<div class="field"><label for="rvReason">รายละเอียด</label><textarea class="textarea" id="rvReason" maxlength="500" style="min-height:110px" placeholder="เช่น งานชิ้นที่ 2 ส่งแล้วแต่ยังไม่มีคะแนน" required></textarea></div>' +
        '<div class="field"><label for="rvContact">ช่องทางติดต่อกลับ (ไม่บังคับ)</label><input class="input" id="rvContact" maxlength="60" placeholder="เช่น ผู้ปกครอง 08x-xxx-xxxx"></div>' +
        '<div id="rvErr" class="form-error" hidden></div></form>',
      foot: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="submit" form="rvF" class="btn btn-primary">' + icon('send', 18) + 'ส่งคำขอ</button>'
    });
    $('rvTopic').onclick = function (e) {
      var b = closestEl(e.target, '[data-t]');
      if (!b) return;
      var all = this.querySelectorAll('[data-t]');
      for (var i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', all[i] === b ? 'true' : 'false');
    };
    $('rvF').onsubmit = function (e) {
      e.preventDefault();
      var t = $('rvTopic').querySelector('[aria-pressed="true"]');
      api('review_submit', { year: r.year, term: r.term, subject_id: r.subject_id, topic: t ? t.getAttribute('data-t') : '', reason: $('rvReason').value, contact: $('rvContact').value }, { loader: 'กำลังส่งคำขอ' })
        .then(function (list) {
          data.reviews = list;
          clearSwr();
          closeModal();
          renderResults();
          swal({ icon: 'success', title: 'ส่งคำขอแล้ว', text: 'ครูจะตรวจสอบและตอบกลับที่หน้านี้', timer: 2600 });
        }).catch(function (ex) { $('rvErr').textContent = ex.message; $('rvErr').hidden = false; });
    };
  }

  /** กราฟพัฒนาการคะแนนรวม (%) ข้ามภาคเรียน แยกรายวิชา */
  function trendSection() {
    var bySubj = {}, order = [];
    data.results.slice().reverse().forEach(function (r) {
      var hl = headline(r);
      if (!hl) return;
      if (!bySubj[r.subject_id]) { bySubj[r.subject_id] = { name: r.subject_name, icon: r.icon, pts: [] }; order.push(r.subject_id); }
      bySubj[r.subject_id].pts.push({ label: 'ท.' + r.term + '/' + String(r.year).slice(2), pct: Math.round(hl.v / hl.max * 1000) / 10 });
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
