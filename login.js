/* หน้าเข้าสู่ระบบ (index.html) — ES5 */
(function () {
  var s = getSession();
  if (s && s.token) { location.replace(homeOf(s.role)); return; }

  // แถบประกาศผลวิ่ง + ป๊อปอัปประกาศใหม่
  swr('status', { year: '' }, function (d, fromCache) {
    mountTicker($('tickerHost'), d, 'status.html');
    if (!fromCache) setTimeout(function () { announcePopup(d, null); }, 600);
  }, { persist: true }).then(null, function () { });

  var errBox = $('loginError');
  function showError(msg) { errBox.textContent = msg; errBox.hidden = false; }
  function clearError() { errBox.hidden = true; }

  if (location.search.indexOf('expired=1') > -1) showError('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่');

  function selectTab(staff) {
    $('tabStudent').setAttribute('aria-selected', staff ? 'false' : 'true');
    $('tabStaff').setAttribute('aria-selected', staff ? 'true' : 'false');
    $('formStudent').hidden = staff;
    $('formStaff').hidden = !staff;
    $('seg').className = 'seg' + (staff ? ' right' : '');
    clearError();
    (staff ? $('username') : $('citizenId')).focus();
    Store.lset('sa_login_tab', staff ? 'staff' : 'student');
  }
  $('tabStudent').onclick = function () { selectTab(false); };
  $('tabStaff').onclick = function () { selectTab(true); };
  if (Store.lget('sa_login_tab') === 'staff') selectTab(true);

  function bindToggle(btnId, inputId) {
    $(btnId).onclick = function () {
      var inp = $(inputId);
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      this.innerHTML = icon(show ? 'eye-off' : 'eye', 20);
      this.setAttribute('aria-label', show ? 'ซ่อน' : 'แสดง');
    };
  }
  bindToggle('toggleId', 'citizenId');
  bindToggle('togglePw', 'password');

  $('citizenId').addEventListener('input', function () {
    this.value = formatId(this.value);
    clearError();
    var n = this.value.replace(/\D/g, '').length;
    var bars = $('idProg').children;
    for (var i = 0; i < bars.length; i++) bars[i].className = i < n ? 'on' : '';
    $('idProg').className = 'id-progress' + (n === 13 ? ' full' : '');
    $('idHint').textContent = n === 13 ? 'ครบ 13 หลักแล้ว กดเข้าสู่ระบบได้เลย' : (n ? 'กรอกแล้ว ' + n + ' จาก 13 หลัก' : 'ระบบจะตรวจสอบข้อมูลกับฐานข้อมูลนักเรียน');
  });

  $('formStudent').onsubmit = function (e) {
    e.preventDefault();
    var digits = $('citizenId').value.replace(/\D/g, '');
    if (digits.length !== 13) { showError('กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก (กรอกแล้ว ' + digits.length + ' หลัก)'); return; }
    var btn = $('btnStudent');
    setBusy(btn, true, 'กำลังตรวจสอบ');
    clearError();
    api('login_student', { citizenId: digits }).then(function (d) {
      setSession(d);
      location.replace('student.html');
    }).catch(function (err) {
      showError(err.message);
      setBusy(btn, false);
    });
  };

  $('formStaff').onsubmit = function (e) {
    e.preventDefault();
    var u = $('username').value.trim(), p = $('password').value;
    if (!u || !p) { showError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return; }
    var btn = $('btnStaff');
    setBusy(btn, true, 'กำลังตรวจสอบ');
    clearError();
    api('login_staff', { username: u, password: p }).then(function (d) {
      setSession(d);
      location.replace(homeOf(d.role));
    }).catch(function (err) {
      showError(err.message);
      setBusy(btn, false);
    });
  };
})();
