/* แผงควบคุม (admin.html) — ประกาศผลสอบ · คำขอตรวจสอบคะแนน · ES5
   ลำดับโหลดใน admin.html: admin-core.js ก่อน แล้วไฟล์ admin-*.js อื่น (ลำดับใดก็ได้) */
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
          '<span class="li-main"><span class="li-title">' + esc(v.student_name) + ' <span class="muted small">' + esc(v.class_label) + ' เลขที่ ' + fmtScore(v.number) + '</span>' + (v.source === 'line' ? ' <span class="src-line">LINE</span>' : '') + '</span>' +
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
          (d.source === 'line' ? '<span class="src-line">ส่งจาก LINE</span>' : '') + '<span class="badge ' + (RV_CLS[d.status] || 'b-slate') + '">' + esc(d.status_label) + '</span></div>' +
          (d.source === 'line' ? '<div class="notice info" style="margin:10px 0 0">' + icon('chat', 18) + '<span>เมื่อกด <b>ยืนยันคะแนนเดิม</b> หรือ <b>แก้ไขคะแนนแล้ว</b> ระบบจะส่งคำตอบพร้อม<b>การ์ดคะแนนล่าสุด</b>เข้าแชท LINE ของผู้ขอทันที (แก้คะแนนก่อนแล้วค่อยกด)</span></div>' : '') +
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
          swal({ icon: 'success', title: r.status_label, text: r.status === 'in_review' ? 'ผู้ปกครองจะเห็นว่ากำลังตรวจสอบ' : 'ส่งคำตอบถึงผู้ปกครองแล้ว' + (r.line_sent ? ' · ส่งคำตอบพร้อมคะแนนล่าสุดเข้า LINE แล้ว ' + r.line_sent + ' บัญชี' : ''), timer: 2800 });
          load();
        }).catch(function (ex) { $('rvErr2').textContent = ex.message; $('rvErr2').hidden = false; });
      });
    }).catch(function (e) { swal({ icon: 'error', title: 'เปิดไม่ได้', text: e.message }); });
  }
}
