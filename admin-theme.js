/* แผงควบคุม (admin.html) — ปรับแต่งหน้าตา: สี · ไอคอน · ES5
   ลำดับโหลดใน admin.html: admin-core.js ก่อน แล้วไฟล์ admin-*.js อื่น (ลำดับใดก็ได้) */
// ===== ปรับแต่งหน้าตา =====
var THEME_PRESETS = [
  { name: 'ฟ้าน้ำทะเล', primary: '#0891b2', primary2: '#06b6d4', accent: '#f59e0b', tiles: ['#e6f9fc', '#fff7e6', '#e8faf2', '#edf3ff', '#fdf2f8', '#f1f5f9'] },
  { name: 'เขียวใบไม้', primary: '#059669', primary2: '#34d399', accent: '#f59e0b', tiles: ['#ecfdf5', '#fef9c3', '#e0f2fe', '#fef3c7', '#fce7f3', '#f1f5f9'] },
  { name: 'ม่วงลาเวนเดอร์', primary: '#7c3aed', primary2: '#a78bfa', accent: '#ec4899', tiles: ['#f3e8ff', '#fce7f3', '#e0e7ff', '#fef3c7', '#dcfce7', '#f1f5f9'] },
  { name: 'ชมพูซากุระ', primary: '#db2777', primary2: '#f472b6', accent: '#8b5cf6', tiles: ['#fce7f3', '#ede9fe', '#fff7ed', '#ecfeff', '#f0fdf4', '#f1f5f9'] },
  { name: 'ส้มพระอาทิตย์', primary: '#ea580c', primary2: '#fb923c', accent: '#0ea5e9', tiles: ['#fff7ed', '#fef9c3', '#e0f2fe', '#fce7f3', '#ecfdf5', '#f1f5f9'] },
  { name: 'น้ำเงินกรมท่า', primary: '#1e3a8a', primary2: '#3b82f6', accent: '#facc15', tiles: ['#dbeafe', '#fef9c3', '#e0e7ff', '#dcfce7', '#fce7f3', '#f1f5f9'] },
  { name: 'แดงเลือดหมู', primary: '#9f1239', primary2: '#e11d48', accent: '#f59e0b', tiles: ['#ffe4e6', '#fef3c7', '#fce7f3', '#e0f2fe', '#ecfdf5', '#f1f5f9'] }
];
var ICON_FIELDS = [
  ['ticker_icon', 'ไอคอนแถบประกาศผล', 'เว้นว่าง = ไอคอนโทรโข่งเดิม'],
  ['term1', 'ภาคเรียนที่ 1', 'การ์ดเลือกภาคเรียนใน LINE'],
  ['term2', 'ภาคเรียนที่ 2', 'การ์ดเลือกภาคเรียนใน LINE'],
  ['year', 'ปีการศึกษา', 'การ์ดเลือกปีใน LINE'],
  ['year_current', 'ปีการศึกษาปัจจุบัน', 'การ์ดเลือกปีใน LINE']
];

/** สีตัวอักษรบนพื้นปุ่ม (เข้มจากสีพื้น) — คำนวณแบบเดียวกับฝั่ง Apps Script */
function tileTextColor(hex) {
  var c = hexRgb(hex), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0;
  if (mx !== mn) {
    var d = mx - mn;
    s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
    h /= 6;
  }
  s = Math.max(s, .55); l = .3;
  function f(n) { var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return ('0' + Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16)).slice(-2); }
  return '#' + f(0) + f(8) + f(4);
}
function themeFull(t) {
  var o = JSON.parse(JSON.stringify(t));
  o.tile_pairs = o.tiles.map(function (c) { return [c, tileTextColor(c)]; });
  return o;
}

function viewTheme() {
  var original = opt.settings.theme;
  var ed = JSON.parse(JSON.stringify(original));
  var saved = false;
  main.innerHTML = head('ปรับแต่งหน้าตา', 'เปลี่ยนสีและไอคอนได้อิสระ มีผลกับหน้าเว็บทุกหน้า แถบประกาศ การ์ดใน LINE และริชเมนู') + '<div id="thOut"></div>';
  var out = $('thOut');

  // ออกจากหน้านี้โดยไม่บันทึก → คืนสีเดิม
  var onLeave = function () {
    window.removeEventListener('hashchange', onLeave);
    if (!saved) applyTheme(themeFull(original), false);
  };
  window.addEventListener('hashchange', onLeave);

  render(true);

  function colorField(key, label, hint) {
    return '<label class="color-field"><input type="color" data-c="' + key + '" value="' + esc(ed[key]) + '"><span><b>' + esc(label) + '</b><small>' + esc(ed[key]) + '</small>' +
      (hint ? '<span class="small muted" style="display:block">' + esc(hint) + '</span>' : '') + '</span></label>';
  }
  function iconVal(k) { return k === 'ticker_icon' ? (ed.ticker_icon || '') : (ed.icons[k] || ''); }
  function render(first) {
    var h = '<h2 class="sec-title" style="margin-top:0">' + icon('sparkles', 20) + 'ชุดสีสำเร็จรูป</h2><div class="preset-row">' + THEME_PRESETS.map(function (p, i) {
      return '<button type="button" class="preset" data-preset="' + i + '"><i style="background:linear-gradient(135deg,' + p.primary + ',' + p.primary2 + ');box-shadow:inset -8px 0 0 ' + p.accent + '"></i>' + esc(p.name) + '</button>';
    }).join('') + '</div>';
    h += '<h2 class="sec-title">' + icon('pencil', 20) + 'สีหลัก</h2><div class="theme-grid">' +
      colorField('primary', 'สีหลัก', 'หัวข้อ ปุ่ม หัวการ์ด LINE') + colorField('primary2', 'สีไล่ระดับ', 'ปลายแถบสี / ส่วนหัวเว็บ') + colorField('accent', 'สีเน้น', 'ป้าย "ประกาศผล" บนแถบวิ่ง') + '</div>';
    h += '<h2 class="sec-title">' + icon('chat', 20) + 'สีพื้นปุ่มในการ์ด LINE</h2><div class="card card-pad"><div class="tile-swatches">' + ed.tiles.map(function (c, i) {
      return '<input type="color" data-tile="' + i + '" value="' + esc(c) + '" title="ปุ่มที่ ' + (i + 1) + '" aria-label="สีพื้นปุ่มที่ ' + (i + 1) + '">';
    }).join('') + '</div><p class="small muted" style="margin:8px 0 0">ใช้กับปุ่มเลือกวิชา/ภาคเรียน/ปีการศึกษา เรียงตามลำดับ สีตัวอักษรคำนวณให้อัตโนมัติ</p></div>';
    h += '<h2 class="sec-title">' + icon('file', 20) + 'ไอคอน (อีโมจิ หรือลิงก์รูป)</h2><div class="card card-pad">' + ICON_FIELDS.map(function (f) {
      var v = iconVal(f[0]);
      return '<div class="icon-field"><span class="icon-prev" id="ip_' + f[0] + '">' + (v ? iconHtml(v, v) : icon('megaphone', 22)) + '</span>' +
        '<div class="field" style="margin:0"><label for="if_' + f[0] + '">' + esc(f[1]) + ' <span class="muted small">' + esc(f[2]) + '</span></label>' +
        '<input class="input" id="if_' + f[0] + '" data-icon-key="' + f[0] + '" value="' + esc(v) + '" placeholder="😀 หรือ https://.../icon.png"></div></div>';
    }).join('') +
      '<p class="small muted" style="margin:4px 0 0">ไอคอนรายวิชาตั้งได้ที่ ตั้งค่าระบบ → รายวิชา · ไอคอนปุ่มริชเมนูตั้งได้ในหน้าแจ้งเตือน LINE → เมนูบอท · ลิงก์รูปควรเป็น PNG/JPG พื้นหลังโปร่งใส (LINE ไม่รองรับ SVG)</p></div>';
    h += '<h2 class="sec-title">' + icon('eye', 20) + 'ตัวอย่าง</h2><div class="card card-pad">' +
      '<div class="ticker-preview" id="thTicker"></div>' +
      '<div class="line-chat" style="margin-top:12px">' + previewCard() + '</div>' +
      '<div class="btn-row" style="margin-top:12px"><button type="button" class="btn btn-primary btn-sm">ปุ่มหลัก</button><span class="badge b-cyan">ป้ายสถานะ</span><span class="pill">ชิป</span></div></div>';
    h += '<div class="save-bar"><button type="button" class="btn btn-danger" data-reset>' + icon('trash', 16) + 'คืนค่าเริ่มต้น</button>' +
      '<span class="grow">เปลี่ยนแล้วเห็นผลทันทีในหน้านี้ · กดบันทึกเพื่อใช้กับทุกหน้าและ LINE</span>' +
      '<button type="button" class="btn btn-primary" data-save>' + icon('save', 18) + 'บันทึกธีม</button></div>';
    out.innerHTML = h;
    if (first) enter(out);
    livePreview();
  }
  function previewCard() {
    var t = themeFull(ed);
    var items = [['📐', 'คณิตศาสตร์พื้นฐาน'], ['🧮', 'วิชาเสริมทักษะ'], [ed.icons.term1, 'ภาคเรียนที่ 1'], [ed.icons.term2, 'ภาคเรียนที่ 2'], [ed.icons.year_current, 'ปีปัจจุบัน'], [ed.icons.year, 'ปีการศึกษา']];
    return '<div class="tile-card" style="max-width:340px"><div class="tc-head" style="background:' + t.primary + '"><b>📘 เลือกรายวิชา</b><span>ขั้น 1/4</span><small>ตัวอย่างสีปุ่มทั้ง 6 สี</small></div>' +
      '<div class="tc-grid" style="grid-template-columns:repeat(3,1fr)">' + items.map(function (it, k) {
        return '<div class="tc-tile" style="background:' + t.tile_pairs[k][0] + '"><i>' + iconHtml(it[0], it[0]) + '</i><b style="color:' + t.tile_pairs[k][1] + '">' + esc(it[1]) + '</b></div>';
      }).join('') + '</div><div class="tc-foot">ยกเลิก</div></div>';
  }
  function livePreview() {
    applyTheme(themeFull(ed), false);
    var now = new Date().toISOString();
    mountTicker($('thTicker'), { theme: ed, ticker: { mode: 'rtl', days: 14, text: '' }, items: [
      { ann_id: 'p1', status: 'published', subject_name: 'คณิตศาสตร์พื้นฐาน', class_label: 'ป.3/1', term: '1', year: opt.settings.current_year, published_at: now },
      { ann_id: 'p2', status: 'published', subject_name: 'วิชาเสริมทักษะคณิตศาสตร์', class_label: 'ป.5/2', term: '1', year: opt.settings.current_year, published_at: now }] }, '#');
    document.body.classList.remove('has-ticker');
  }
  function refreshCard() {
    var lc = out.querySelector('.line-chat');
    if (lc) lc.innerHTML = previewCard();
  }

  out.addEventListener('input', function (e) {
    var el = e.target, k;
    if ((k = el.getAttribute('data-c'))) {
      ed[k] = el.value;
      var sm = el.parentNode.querySelector('small');
      if (sm) sm.textContent = el.value;
      livePreview(); refreshCard();
    } else if ((k = el.getAttribute('data-tile')) !== null) {
      ed.tiles[Number(k)] = el.value; refreshCard();
    } else if ((k = el.getAttribute('data-icon-key'))) {
      var v = el.value.trim();
      if (k === 'ticker_icon') ed.ticker_icon = v; else ed.icons[k] = v;
      $('ip_' + k).innerHTML = v ? iconHtml(v, v) : icon('megaphone', 22);
      livePreview(); refreshCard();
    }
  });
  out.addEventListener('click', function (e) {
    var b;
    if ((b = closestEl(e.target, '[data-preset]'))) {
      var p = THEME_PRESETS[Number(b.getAttribute('data-preset'))];
      ed.primary = p.primary; ed.primary2 = p.primary2; ed.accent = p.accent; ed.tiles = p.tiles.slice();
      render(false);
      return;
    }
    if (closestEl(e.target, '[data-save]')) {
      api('theme_save', { theme: { primary: ed.primary, primary2: ed.primary2, accent: ed.accent, tiles: ed.tiles, ticker_icon: ed.ticker_icon, icons: ed.icons } }, { loader: 'กำลังบันทึกธีม' }).then(function (st) {
        saved = true;
        opt.settings = st;
        applyTheme(st.theme, true);
        clearSwr();
        confetti();
        swal({ icon: 'success', title: 'บันทึกธีมแล้ว', html: '<p class="swal-text">หน้าเว็บ แถบประกาศ และการ์ดใน LINE ใช้สีใหม่ทันที</p><p class="swal-text"><b>ริชเมนู:</b> ไปหน้าแจ้งเตือน LINE แล้วกด "บันทึก + ติดตั้งริชเมนู" อีกครั้งเพื่อวาดสีใหม่</p>' });
      }).catch(function (x) { swal({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: x.message }); });
      return;
    }
    if (closestEl(e.target, '[data-reset]')) {
      confirmBox('คืนค่าธีมเริ่มต้น', 'กลับไปใช้สีฟ้าน้ำทะเลและไอคอนเดิมทั้งหมด', 'คืนค่า', true).then(function (ok) {
        if (!ok) return;
        api('theme_save', { reset: true }, { loader: 'กำลังคืนค่า' }).then(function (st) {
          saved = true;
          opt.settings = st;
          original = st.theme;
          ed = JSON.parse(JSON.stringify(st.theme));
          applyTheme(st.theme, true);
          clearSwr();
          render(false);
          toast('คืนค่าธีมเริ่มต้นแล้ว');
        }).catch(function (x) { swal({ icon: 'error', title: 'ไม่สำเร็จ', text: x.message }); });
      });
    }
  });
}
