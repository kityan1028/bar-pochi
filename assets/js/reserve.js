/* =========================================================
   BAR POCHI — reserve.js
   予約フォーム：木曜日はお食事の有無を表示 / 入力チェック / FormSubmit へ送信
   ========================================================= */
(function () {
  'use strict';

  var form = document.getElementById('reserve-form');
  if (!form) return;
  // JS が動くときは独自の入力チェックを使う（JS なしの場合はブラウザ標準のチェックが働く）
  form.noValidate = true;

  // 送信先（FormSubmit）。有効化後に発行されるランダム文字列に置き換えると
  // メールアドレスをページに載せずに済みます（README参照）。
  var ENDPOINT = 'https://formsubmit.co/ajax/sz7.hahahahani@gmail.com';

  var lang = function () { return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'ja'; };
  var T = {
    required: { ja: '入力してください', en: 'This field is required.' },
    choose: { ja: '選択してください', en: 'Please choose one.' },
    email: { ja: 'メールアドレスの形式で入力してください', en: 'Enter a valid email address.' },
    tel: { ja: '電話番号を正しく入力してください（数字10〜11桁）', en: 'Enter a valid phone number.' },
    pastDate: { ja: '本日以降の日付を選んでください', en: 'Choose today or a later date.' },
    sending: { ja: '送信しています…', en: 'Sending…' },
    check: { ja: '入力内容をご確認ください', en: 'Please check the highlighted fields.' },
    inactive: {
      ja: '現在フォームの準備中のため送信できませんでした。お手数ですが Instagram の DM からご連絡ください。',
      en: 'The form is not ready yet, so your request could not be sent. Please send us a DM on Instagram.'
    },
    failed: {
      ja: '送信できませんでした。時間をおいて再度お試しいただくか、Instagram の DM からご連絡ください。',
      en: 'Sorry, your request could not be sent. Please try again later or send us a DM on Instagram.'
    }
  };
  var WEEK = { ja: ['日', '月', '火', '水', '木', '金', '土'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };

  var dateInput = form.querySelector('#r-date');
  var dayLabel = form.querySelector('#r-date-day');
  var sundayNote = form.querySelector('#r-date-note');
  var mealField = form.querySelector('#meal-field');
  var mealRadios = mealField ? Array.prototype.slice.call(mealField.querySelectorAll('input[type="radio"]')) : [];
  var telInput = form.querySelector('#r-tel');
  var submitBtn = form.querySelector('[type="submit"]');
  var statusEl = document.getElementById('form-status');
  var thanks = document.getElementById('thanks');

  /* ---------- 日付まわり ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayStr() {
    var t = new Date();
    return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
  }
  // "YYYY-MM-DD" を端末のタイムゾーンで解釈（UTC ずれ防止）
  function parseDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.getMonth() === Number(m[2]) - 1 ? d : null;
  }
  function isThursday(v) {
    var d = parseDate(v);
    return !!d && d.getDay() === 4;
  }

  if (dateInput) dateInput.min = todayStr();

  function updateDate() {
    var d = parseDate(dateInput.value);
    if (dayLabel) dayLabel.textContent = d ? (lang() === 'en' ? ' (' + WEEK.en[d.getDay()] + ')' : '（' + WEEK.ja[d.getDay()] + '）') : '';
    // 日曜日は定休日（ご相談により営業）のお知らせ。表示中だけ読み上げ対象にする
    var isSun = !!(d && d.getDay() === 0);
    if (sundayNote) {
      sundayNote.hidden = !isSun;
      dateInput.setAttribute('aria-describedby', isSun ? 'r-date-note r-date-err' : 'r-date-err');
    }
    var thu = isThursday(dateInput.value);
    if (mealField) {
      mealField.hidden = !thu;
      mealRadios.forEach(function (r) {
        r.disabled = !thu;
        r.required = thu;
        if (!thu) r.checked = false;
      });
      if (!thu) clearError(mealField);
    }
  }
  if (dateInput) {
    dateInput.addEventListener('change', updateDate);
    dateInput.addEventListener('input', updateDate);
    updateDate();
  }
  document.addEventListener('pochi:lang', function () {
    if (dateInput) updateDate();
    // 表示中のエラーメッセージ・送信状況も切り替える
    var invalid = '.input[aria-invalid="true"], .select[aria-invalid="true"], .textarea[aria-invalid="true"], fieldset[aria-invalid="true"]';
    Array.prototype.forEach.call(form.querySelectorAll(invalid), function (el) { validateField(el); });
    if (statusKey) setStatus(statusKey, statusEl.classList.contains('is-error'));
  });

  /* ---------- URL で席の希望を選択（例: reserve.html?seat=party） ---------- */
  try {
    var seat = new URLSearchParams(window.location.search).get('seat');
    if (seat) {
      var seatRadio = form.querySelector('input[name="席の希望"][data-key="' + seat + '"]');
      if (seatRadio) seatRadio.checked = true;
    }
  } catch (e) { /* 無視 */ }

  /* ---------- 全角数字を半角に ---------- */
  if (telInput) {
    telInput.addEventListener('blur', function () {
      telInput.value = telInput.value
        .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); })
        .replace(/[ー－―‐]/g, '-')
        .trim();
    });
  }

  /* ---------- 入力チェック ---------- */
  function errorBox(el) {
    var field = el.closest('.field');
    return field ? field.querySelector('.field-error') : null;
  }
  function setError(el, msg) {
    var box = errorBox(el);
    var targets = el.matches('fieldset') ? el.querySelectorAll('input') : [el];
    Array.prototype.forEach.call(targets, function (t) { t.setAttribute('aria-invalid', 'true'); });
    if (el.matches('fieldset')) el.setAttribute('aria-invalid', 'true');
    if (box) box.textContent = msg;
  }
  function clearError(el) {
    var box = errorBox(el);
    var targets = el.matches('fieldset') ? el.querySelectorAll('input') : [el];
    Array.prototype.forEach.call(targets, function (t) { t.removeAttribute('aria-invalid'); });
    if (el.matches('fieldset')) el.removeAttribute('aria-invalid');
    if (box) box.textContent = '';
  }

  function validateField(el) {
    var L = lang();
    if (el.matches('fieldset')) {
      var radios = el.querySelectorAll('input[type="radio"]');
      var required = Array.prototype.some.call(radios, function (r) { return r.required && !r.disabled; });
      var checked = Array.prototype.some.call(radios, function (r) { return r.checked; });
      if (required && !checked) { setError(el, T.choose[L]); return false; }
      clearError(el);
      return true;
    }
    var v = (el.value || '').trim();
    if (el.required && !v) { setError(el, el.tagName === 'SELECT' ? T.choose[L] : T.required[L]); return false; }
    if (v && el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setError(el, T.email[L]); return false; }
    if (v && el.id === 'r-tel') {
      var digits = v.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); }).replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) { setError(el, T.tel[L]); return false; }
    }
    if (v && el === dateInput && v < todayStr()) { setError(el, T.pastDate[L]); return false; }
    clearError(el);
    return true;
  }

  function fieldsToCheck() {
    var list = Array.prototype.slice.call(form.querySelectorAll('.input, .select, .textarea'));
    if (mealField && !mealField.hidden) list.push(mealField);
    return list;
  }

  form.addEventListener('blur', function (e) {
    if (e.target.matches('.input, .select, .textarea') && e.target.value) validateField(e.target);
  }, true);
  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true') {
      var fs = e.target.closest('fieldset.field');
      validateField(fs && e.target.type === 'radio' ? fs : e.target);
    }
  });
  form.addEventListener('change', function (e) {
    if (e.target.type === 'radio') {
      var fs = e.target.closest('fieldset.field');
      if (fs && fs.getAttribute('aria-invalid') === 'true') validateField(fs);
    }
  });

  /* ---------- 送信 ---------- */
  var statusKey = null;
  var sending = false;
  function setStatus(key, isError) {
    statusKey = key || null;
    statusEl.textContent = key ? T[key][lang()] : '';
    statusEl.classList.toggle('is-error', !!isError);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return; // 送信中の二重送信を防ぐ（Enter キー連打など）
    setStatus(null);

    var firstBad = null;
    fieldsToCheck().forEach(function (el) {
      if (!validateField(el) && !firstBad) firstBad = el;
    });
    if (firstBad) {
      setStatus('check', true);
      var focusTarget = firstBad.matches('fieldset') ? firstBad.querySelector('input') : firstBad;
      focusTarget.focus();
      return;
    }

    // ロボット対策（見えない欄に入力があれば送らない）
    var honey = form.querySelector('input[name="_honey"]');
    if (honey && honey.value) { showThanks(); return; }

    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (key === '_honey') return;
      data[key] = typeof value === 'string' ? value.trim() : value;
    });
    var d = parseDate(data['来店日']);
    if (d) data['来店日'] = data['来店日'] + '（' + WEEK.ja[d.getDay()] + '）';
    data['表示言語'] = lang() === 'en' ? '英語' : '日本語';
    data._subject = '【BAR POCHI】ご予約リクエスト ' + (data['来店日'] || '') + ' ' + (data['お名前'] || '') + '様';
    data._template = 'table';
    data._captcha = 'false';

    sending = true;
    submitBtn.setAttribute('aria-busy', 'true');
    setStatus('sending');

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) {
          if (!res.ok || String(json.success) !== 'true') {
            throw new Error(json.message || ('HTTP ' + res.status));
          }
        });
      })
      .then(function () {
        setStatus(null);
        showThanks();
      })
      .catch(function (err) {
        var msg = (err && err.message) || '';
        if (window.console) console.warn('[reserve] FormSubmit:', msg);
        // FormSubmit の有効化（最初の確認メール）が済んでいない場合
        setStatus(/activat/i.test(msg) ? 'inactive' : 'failed', true);
      })
      .then(function () {
        sending = false;
        submitBtn.removeAttribute('aria-busy');
      });
  });

  function showThanks() {
    form.reset();
    updateDate();
    form.hidden = true;
    thanks.hidden = false;
    thanks.setAttribute('tabindex', '-1');
    thanks.focus();
    thanks.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }
})();
