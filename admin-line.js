/* แผงควบคุม (admin.html) — แจ้งเตือนผ่าน LINE · เมนูบอท · ริชเมนู · ES5
   ลำดับโหลดใน admin.html: admin-core.js ก่อน แล้วไฟล์ admin-*.js อื่น (ลำดับใดก็ได้) */
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

    h += '<a class="card item-card setup-cta" href="#theme" style="margin-top:16px"><span class="tint t-cyan">' + icon('sparkles', 22) + '</span><span class="li-main"><span class="li-title">ปรับสีและไอคอน</span><span class="li-sub">สีการ์ด LINE ริชเมนู แถบประกาศ และไอคอนภาคเรียน/ปี</span></span>' + icon('chevron-right', 20, 'muted') + '</a>';
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
        return '<div class="menu-row"><input class="input menu-emo" data-m="emoji" data-i="' + i + '" value="' + esc(x.emoji) + '" maxlength="490" placeholder="😀 หรือลิงก์รูป" title="อีโมจิ หรือวางลิงก์รูป https://..." aria-label="ไอคอน: อีโมจิหรือลิงก์รูป">' +
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
  // รูปไอคอนจากลิงก์ → ดึงผ่าน Apps Script เป็น data URL (วาดลง canvas แล้วส่งออกได้)
  var IMG = {};
  function menuImg(url) {
    if (IMG[url]) return IMG[url];
    var rec = { img: null, promise: null, failed: false };
    IMG[url] = rec;
    rec.promise = api('proxy_image', { url: url }, { loader: false }).then(function (d) {
      return new Promise(function (ok) {
        var im = new Image();
        im.onload = function () { rec.img = im; ok(); drawMenu(); };
        im.onerror = function () { rec.failed = true; ok(); };
        im.src = d.data_url;
      });
    }, function (e) { rec.failed = true; toast('โหลดรูปไอคอนไม่ได้: ' + e.message, 'err'); });
    return rec;
  }
  function menuImagesReady() {
    return Promise.all(menuEd.filter(function (x) { return /^https:\/\//.test(x.emoji || ''); }).map(function (x) { return menuImg(x.emoji).promise; }));
  }
  function drawMenu() {
    var cv = $('menuCanvas');
    if (!cv || !cv.getContext) return null;
    var n = Math.max(1, menuEd.length), rows = n <= 3 ? 1 : 2, W = 2500, H = rows === 1 ? 843 : 1686;
    var perRow = rows === 1 ? [n] : [Math.ceil(n / 2), n - Math.ceil(n / 2)];
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    var g = c.createLinearGradient(0, 0, W, H);
    var tc = themeColors();
    g.addColorStop(0, mixHex(tc[0], '#000000', .3)); g.addColorStop(.55, tc[0]); g.addColorStop(1, tc[1]);
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
        if (/^https:\/\//.test(it.emoji || '')) {
          var rec = menuImg(it.emoji), sz = Math.min(cw, rh) * .38;
          if (rec.img) {
            var sc = Math.min(sz / rec.img.width, sz / rec.img.height);
            c.drawImage(rec.img, x + cw / 2 - rec.img.width * sc / 2, y + rh * .40 - rec.img.height * sc / 2, rec.img.width * sc, rec.img.height * sc);
          } else {
            c.font = '160px sans-serif';
            c.fillText(rec.failed ? '⚠️' : '…', x + cw / 2, y + rh * .40);
          }
        } else {
          c.font = '250px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
          c.fillText(it.emoji || '•', x + cw / 2, y + rh * .40);
        }
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
      return Promise.all([ready, menuImagesReady()]).then(function () {
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
