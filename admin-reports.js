/* แผงควบคุม (admin.html) — รายงานผลรายห้อง · รายงานสถิติ · ES5
   ลำดับโหลดใน admin.html: admin-core.js ก่อน แล้วไฟล์ admin-*.js อื่น (ลำดับใดก็ได้) */
// ===== รายงานผลรายห้อง (พิมพ์ A4 พร้อมลายเซ็น) =====
var GRADES = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0'];
function viewReport(p) {
  var st = opt.settings, data = null;
  var subs = subjectList('');
  main.innerHTML = head('รายงานผลรายห้อง', 'สรุปคะแนนทุกช่องรายห้อง พร้อมลายเซ็นผู้เกี่ยวข้อง พิมพ์หรือบันทึกเป็น PDF ได้') +
    '<div class="card card-pad no-print"><div class="filters">' + selectField('rpYear', 'ปีการศึกษา', yearList(), p.y || st.current_year) + selectField('rpTerm', 'ภาคเรียน', TERMS, p.t || st.current_term) +
    selectField('rpSubj', 'รายวิชา', subs, p.s || (subs[0] ? subs[0].v : '')) +
    '<div class="field"><label for="rpLevel">ชั้นที่สอน</label><select class="select" id="rpLevel"></select></div>' +
    '<div class="field"><label for="rpRoom">ห้อง</label><select class="select" id="rpRoom"></select></div></div>' +
    '<p class="small muted" id="rpGradeHint" style="margin:10px 2px 0"></p>' +
    '<button type="button" class="btn btn-primary btn-block" id="rpGo" style="margin-top:14px">' + icon('printer', 18) + 'สร้างรายงาน</button></div>' +
    '<div id="rpOut" style="margin-top:16px"></div>';
  // รายวิชา → ชั้นที่สอน → ห้อง (เชื่อมกันตามที่ตั้งไว้ในรายวิชา)
  function subjOf(id) { for (var i = 0; i < opt.subjects.length; i++) if (opt.subjects[i].subject_id === id) return opt.subjects[i]; return null; }
  function levels() {
    var sj = subjOf($('rpSubj').value);
    var lv = levelList().filter(function (l) { return !sj || !sj.levels.length || sj.levels.indexOf(l) > -1; });
    var cur = $('rpLevel').value || p.l || '';
    $('rpLevel').innerHTML = lv.length ? optionsHtml(lv.map(function (l) { return { v: l, t: l + (roomList(l).length ? '' : ' (ยังไม่มีนักเรียน)') }; }), lv.indexOf(cur) > -1 ? cur : lv[0]) : '<option value="">รายวิชานี้ยังไม่ได้กำหนดชั้นที่สอน</option>';
    rooms();
  }
  function rooms() {
    var r = roomList($('rpLevel').value);
    $('rpRoom').innerHTML = '<option value="">ทุกห้องในชั้น (ห้องละ 1 หน้า)</option>' + optionsHtml(r.map(function (x) { return { v: x, t: 'ห้อง ' + x }; }), p.r || '');
    gradeHint();
  }
  function gradeHint() {
    var sj = subjOf($('rpSubj').value), l = $('rpLevel').value;
    var sp = (st.special_levels || []).indexOf(l) > -1;
    $('rpGradeHint').innerHTML = icon('info', 14) + ' เกรดแสดงอัตโนมัติตาม <a href="#schemes?' + buildQuery({ y: $('rpYear').value, t: $('rpTerm').value, s: $('rpSubj').value }) + '">โครงสร้างคะแนน</a>' +
      (sp ? ' · ชั้น ' + esc(l) + ' ใช้ 0/ร/มส จึงแสดงเกรดเสมอ' : (sj && sj.grade_term2 ? ' · ค่าเริ่มต้นของวิชานี้: แสดงเกรดเฉพาะภาคเรียนที่ 2' : ''));
  }
  levels();
  $('rpSubj').onchange = levels;
  $('rpLevel').onchange = rooms;
  $('rpTerm').onchange = gradeHint;
  $('rpYear').onchange = gradeHint;
  $('rpGo').onclick = load;
  var out = $('rpOut');
  out.addEventListener('click', onClick);
  if (p.l) load();

  function q() { return { year: $('rpYear').value, term: $('rpTerm').value, subject_id: $('rpSubj').value, level: $('rpLevel').value, room: $('rpRoom').value }; }
  function load() {
    var x = q();
    if (!x.subject_id) { toast('เลือกรายวิชา', 'err'); return; }
    if (!x.level) { toast('รายวิชานี้ยังไม่ได้กำหนดชั้นที่สอน (ตั้งค่าระบบ → รายวิชา)', 'err'); return; }
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
    var gr = { scheme: ['b-green', 'แสดงเกรดตามโครงสร้างคะแนน' + (d.year_mode === 'sum' ? ' (รวมเทอม 1 + 2)' : (d.year_mode === 'year' ? ' (เฉลี่ย 2 เทอม)' : ''))], special: ['b-cyan', 'แสดงเกรด (ชั้นมัธยม 0/ร/มส)'], none: ['b-slate', 'ไม่แสดงเกรด — ภาคเรียนนี้ไม่ได้เปิดเกรดในโครงสร้างคะแนน'] }[d.grade_reason || 'none'];
    h += '<div class="btn-row no-print" style="margin:16px 0"><span class="badge ' + gr[0] + '">' + esc(gr[1]) + '</span><span class="small muted">ตัวอย่างก่อนพิมพ์ ' + d.classes.length + ' หน้า (A4 แนวตั้ง)</span>' +
      '<button type="button" class="btn btn-primary push" data-print>' + icon('printer', 18) + 'พิมพ์ / บันทึก PDF</button></div>' +
      '<div id="reportArea">' + d.classes.map(function (c) { return paper(d, c); }).join('') + '</div>';
    out.innerHTML = h;
    fitAll();
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
    var head1 = '<div class="rp-head"><img src="' + esc(APP.LOGO) + '" alt="ตราโรงเรียน" loading="eager" onerror="if(!this.dataset.r){this.dataset.r=1;this.src=this.src+\'?r=\'+Date.now();}else{this.style.visibility=\'hidden\';}"><div class="rp-title">แบบรายงานผลคะแนน รายวิชา' + esc(d.subject.name) + '</div>' +
      '<div>ชั้น' + esc(c.class_label.replace('ป.', 'ประถมศึกษาปีที่ ')) + ' ภาคเรียนที่ ' + esc(d.term) + ' ปีการศึกษา ' + esc(d.year) + '</div>' +
      '<div>' + esc(d.school) + ' ' + esc(d.district) + '</div>' + modeLine + '</div>';
    var th = '<tr><th rowspan="2" style="width:34px">ที่</th><th rowspan="2" style="width:38px">เลขที่</th><th rowspan="2">ชื่อ - สกุล</th>' +
      comps.map(function (x) { return '<th>' + esc(x.label) + '</th>'; }).join('') + '<th>รวม' + (ycol ? 'เทอม 2' : '') + '</th><th rowspan="2" style="width:46px">ร้อยละ</th>' +
      (ym === 'sum' ? '<th>รวมเทอม 1</th><th>รวมทั้งปี</th>' : '') + (ym === 'year' ? '<th rowspan="2" style="width:56px">ร้อยละเฉลี่ย 2 เทอม</th>' : '') + (d.show_grade ? '<th rowspan="2" style="width:40px">เกรด</th>' : '') + '<th rowspan="2" style="width:' + (d.special_enabled ? 96 : 52) + 'px">หมายเหตุ</th></tr>' +
      '<tr>' + comps.map(function (x) { return '<th>' + x.max + '</th>'; }).join('') + '<th>' + full + '</th>' + (ym === 'sum' ? '<th>' + d.t1_full + '</th><th>' + (d.t1_full + full) + '</th>' : '') + '</tr>';
    var body = c.rows.map(function (r, i) {
      var pass = r.missing_t1 && !r.special ? 'ไม่มีคะแนนเทอม 1' : r.special ? (r.special === '0' ? 'สอบแก้ตัว' : (r.special === 'ร' ? 'รอการตัดสิน' : 'ไม่มีสิทธิ์สอบ')) + (r.special_note ? ': ' + r.special_note : '') : (r.pct === null ? '' : (r.pct >= 50 ? '' : 'ไม่ผ่าน'));
      return '<tr><td class="c">' + (i + 1) + '</td><td class="c">' + fmtScore(r.number) + '</td><td class="nm">' + esc(r.name) + '</td>' +
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
    return '<section class="paper fit"><div class="paper-in">' + head1 + '<table class="rp-table">' + th + body + foot + '</table>' + sumBox +
      '<div class="sig-row">' + top.join('') + '</div><div class="sig-row">' + bottom.join('') + '</div>' +
      '<div class="rp-print">พิมพ์เมื่อ ' + esc(fmtDateTime(new Date().toISOString())) + ' · ' + esc(d.printed_by) + '</div></div></section>';
  }
  /**
   * ปรับขนาดตัวอักษร/ระยะห่างให้เนื้อหาเต็มหน้า A4 พอดี (ค้นหาแบบแบ่งครึ่ง)
   * ห้องคนน้อย → ตัวใหญ่ขึ้นและแถวห่างขึ้น · ห้องคนเยอะ → ย่อลงเท่าที่จำเป็น
   */
  function setScale(p, k) {
    var g = Math.max(0, k - 1);
    p.style.setProperty('--fs', (12.5 * k).toFixed(2) + 'px');
    p.style.setProperty('--fsh', (11 * Math.min(k, 1.35)).toFixed(2) + 'px');
    p.style.setProperty('--padv', (1 + g * 7).toFixed(2) + 'px');
    p.style.setProperty('--lh', (1.2 + Math.min(g, .4) * .3).toFixed(3));
    p.style.setProperty('--fsum', (13 * Math.min(Math.max(k, .8), 1.25)).toFixed(2) + 'px');
    p.style.setProperty('--fsig', (14 * Math.min(Math.max(k, .85), 1.2)).toFixed(2) + 'px');
    p.style.setProperty('--sigm', (10 + Math.min(g, 1) * 26).toFixed(1) + 'px');
    p.style.setProperty('--logo', Math.round(40 + Math.min(Math.max(k - .6, 0), .8) * 30) + 'px');
    p.style.setProperty('--ftitle', (16 + Math.min(g, .5) * 6).toFixed(1) + 'px');
  }
  function fitPaper(p) {
    var inner = p.querySelector('.paper-in');
    if (!inner) return;
    var cs = window.getComputedStyle(p);
    var mm = 96 / 25.4;
    // เผื่อระยะ ~7 มม. เพราะตอนพิมพ์ตัวอักษรอาจสูงกว่าบนจอเล็กน้อย
    var avail = 297 * mm - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 26;
    var tbl = inner.querySelector('.rp-table');
    // ต้องพอดีทั้งความสูงและความกว้าง (ถ้าตารางกว้างเกิน เบราว์เซอร์จะย่อทั้งหน้าตอนพิมพ์)
    var fits = function () { return inner.offsetHeight <= avail && (!tbl || tbl.scrollWidth <= inner.clientWidth + 1); };
    var lo = .55, hi = 1.45, best = lo;
    for (var i = 0; i < 14; i++) {
      var mid = (lo + hi) / 2;
      setScale(p, mid);
      if (fits()) { best = mid; lo = mid; } else hi = mid;
    }
    setScale(p, best);
    // ตัวอักษรใหญ่สุดเท่าที่ความกว้าง/ความสูงยอมแล้ว ยังเหลือที่ → เพิ่มความสูงแถวและระยะลายเซ็นให้เต็มหน้า
    if (inner.offsetHeight < avail - 4) {
      var base = parseFloat(p.style.getPropertyValue("--padv")) || 1, lo2 = 0, hi2 = 40, b2 = 0;
      for (var j = 0; j < 10; j++) {
        var m2 = (lo2 + hi2) / 2;
        p.style.setProperty('--padv', (base + m2).toFixed(2) + 'px');
        if (fits()) { b2 = m2; lo2 = m2; } else hi2 = m2;
      }
      p.style.setProperty('--padv', (base + b2).toFixed(2) + 'px');
      // เศษที่เหลือ → กระจายให้ระยะลายเซ็น
      var left = avail - inner.offsetHeight;
      if (left > 6) p.style.setProperty('--sigm', ((parseFloat(p.style.getPropertyValue('--sigm')) || 10) + Math.min(left / 3, 40)).toFixed(1) + 'px');
      if (!fits()) p.style.setProperty('--sigm', '10px');
    }
  }
  function fitAll() {
    var run = function () { var ps = document.querySelectorAll('#reportArea .paper.fit'); for (var i = 0; i < ps.length; i++) fitPaper(ps[i]); };
    run();
    // วัดใหม่เมื่อฟอนต์/โลโก้โหลดเสร็จ (ขนาดจริงอาจเปลี่ยน)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    var imgs = document.querySelectorAll('#reportArea .rp-head img');
    for (var i = 0; i < imgs.length; i++) if (!imgs[i].complete) imgs[i].addEventListener('load', run);
  }

  function onClick(e) {
    var b;
    if (closestEl(e.target, '[data-print]')) {
      document.body.classList.add('print-report');
      // รอโลโก้โรงเรียนโหลดครบทุกหน้าก่อนเปิดหน้าต่างพิมพ์ (สูงสุด 4 วินาที)
      var imgs = document.querySelectorAll('#reportArea .rp-head img'), left = 0, done = false;
      var go = function () { if (done) return; done = true; setTimeout(function () { window.print(); }, 80); };
      for (var ii = 0; ii < imgs.length; ii++) {
        if (!imgs[ii].complete) { left++; imgs[ii].addEventListener('load', function () { if (--left <= 0) go(); }); imgs[ii].addEventListener('error', function () { if (--left <= 0) go(); }); }
      }
      if (!left) go(); else setTimeout(go, 4000);
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
