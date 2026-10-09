/* =========================================================
   BAR POCHI — main.js
   ヘッダー / 言語切り替え / 照明演出 / パララックス / スクロール表示
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  window.PochiMain = true; // 読み込み確認用（head 内の予備処理が参照）
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STORAGE_KEY = 'pochi-lang';

  /* ---------- ヘッダーの高さを CSS 変数に反映 ---------- */
  var header = document.querySelector('.site-header');
  function syncHeaderHeight() {
    if (header) root.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  syncHeaderHeight();
  if (header && 'ResizeObserver' in window) {
    new ResizeObserver(syncHeaderHeight).observe(header);
  } else {
    window.addEventListener('resize', syncHeaderHeight);
  }

  /* ---------- スマホのメニュー ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('gnav');
  var NAV_LABEL = {
    open: { ja: 'メニューを開く', en: 'Open menu' },
    close: { ja: 'メニューを閉じる', en: 'Close menu' }
  };
  function setNav(open, moveFocus) {
    document.body.classList.toggle('nav-open', open);
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', String(open));
    var label = open ? NAV_LABEL.close : NAV_LABEL.open;
    toggle.setAttribute('data-ja-aria-label', label.ja);
    toggle.setAttribute('data-en-aria-label', label.en);
    toggle.setAttribute('aria-label', label[root.getAttribute('data-lang') === 'en' ? 'en' : 'ja']);
    if (open && moveFocus) {
      var first = nav.querySelector('a');
      if (first) first.focus();
    }
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      document.body.classList.add('nav-ready');
      setNav(toggle.getAttribute('aria-expanded') !== 'true', true);
    });
    // メニューを開いたままフォーカスがヘッダーの外へ出たら閉じる
    header.addEventListener('focusout', function (e) {
      if (document.body.classList.contains('nav-open') && e.relatedTarget && !header.contains(e.relatedTarget)) {
        setNav(false);
      }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        setNav(false);
        toggle.focus();
      }
    });
    var desktopMQ = window.matchMedia('(min-width: 1024px)');
    var onDesktop = function (mq) {
      document.body.classList.remove('nav-ready');
      if (mq.matches) setNav(false);
    };
    if (desktopMQ.addEventListener) desktopMQ.addEventListener('change', onDesktop);
    else if (desktopMQ.addListener) desktopMQ.addListener(onDesktop);
  }

  /* ---------- Instagram アカウント選択（外側のクリック・Esc・選択で閉じる） ---------- */
  var picks = Array.prototype.slice.call(document.querySelectorAll('.insta-pick'));
  if (picks.length) {
    document.addEventListener('click', function (e) {
      picks.forEach(function (p) { if (p.open && !p.contains(e.target)) p.open = false; });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      picks.forEach(function (p) {
        if (p.open) { p.open = false; p.querySelector('summary').focus(); }
      });
    });
    picks.forEach(function (p) {
      Array.prototype.forEach.call(p.querySelectorAll('.insta-menu a'), function (a) {
        a.addEventListener('click', function () { p.open = false; });
      });
    });
  }

  /* ---------- 言語切り替え（日本語 / English） ----------
     本文:   <span lang="ja">…</span><span lang="en">…</span>
     属性:   data-en-alt / data-en-aria-label / data-en-placeholder / data-en-content など
             （data-en-text は要素の文字そのものを切り替え：select の option 用）
     タイトル: <html data-title-en="…"> */
  var jaTitle = document.title;
  var i18nAttrEls = [];
  Array.prototype.forEach.call(document.querySelectorAll('*'), function (el) {
    var names = [];
    for (var i = 0; i < el.attributes.length; i++) {
      var n = el.attributes[i].name;
      if (n.indexOf('data-en-') === 0) names.push(n.slice(8));
    }
    if (names.length) {
      names.forEach(function (name) {
        if (!el.hasAttribute('data-ja-' + name)) {
          el.setAttribute('data-ja-' + name, name === 'text' ? el.textContent : (el.getAttribute(name) || ''));
        }
      });
      i18nAttrEls.push({ el: el, names: names });
    }
  });

  function applyLang(lang) {
    if (lang !== 'ja' && lang !== 'en') lang = 'ja';
    root.setAttribute('data-lang', lang);
    root.lang = lang;
    i18nAttrEls.forEach(function (item) {
      item.names.forEach(function (name) {
        var v = item.el.getAttribute('data-' + lang + '-' + name);
        if (v === null) return;
        if (name === 'text') item.el.textContent = v;
        else if (item.el.getAttribute(name) !== v) item.el.setAttribute(name, v);
      });
    });
    document.title = lang === 'en' && root.dataset.titleEn ? root.dataset.titleEn : jaTitle;
    Array.prototype.forEach.call(document.querySelectorAll('[data-set-lang]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === lang));
    });
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* 保存できなくても表示は切り替わる */ }
    document.dispatchEvent(new CustomEvent('pochi:lang', { detail: { lang: lang } }));
  }
  applyLang(root.getAttribute('data-lang'));
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-set-lang]');
    if (b) applyLang(b.getAttribute('data-set-lang'));
  });
  // 「戻る」で表示されたページにも、別ページで選んだ言語を反映
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (err) { saved = null; }
    if ((saved === 'ja' || saved === 'en') && saved !== root.getAttribute('data-lang')) applyLang(saved);
  });

  /* ---------- 照明が灯る演出 ---------- */
  var lights = Array.prototype.slice.call(document.querySelectorAll('.lightup'));
  lights.forEach(function (el) {
    if (!el.querySelector('.lamp-glow')) {
      var glow = document.createElement('span');
      glow.className = 'lamp-glow';
      glow.setAttribute('aria-hidden', 'true');
      el.appendChild(glow);
    }
  });
  if (reduceMotion || !('IntersectionObserver' in window)) {
    lights.forEach(function (el) { el.classList.add('is-lit', 'no-anim'); });
  } else {
    var lightIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-lit');
          lightIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });
    lights.forEach(function (el) {
      if (el.hasAttribute('data-light-on-load')) {
        var delay = parseInt(el.getAttribute('data-light-on-load'), 10) || 250;
        setTimeout(function () { el.classList.add('is-lit'); }, delay);
      } else {
        lightIO.observe(el);
      }
    });
  }

  /* ---------- パララックス ---------- */
  var pxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (!reduceMotion && pxEls.length) {
    var ticking = false;
    var updateParallax = function () {
      ticking = false;
      var vh = window.innerHeight;
      pxEls.forEach(function (el) {
        var frame = el.closest('.px-frame') || el.parentElement;
        var r = frame.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = Math.min(parseFloat(el.getAttribute('data-parallax')) || 0.12, 0.15);
        var progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        progress = Math.max(-1, Math.min(1, progress));
        var y = -progress * speed * r.height;
        el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      });
    };
    var onScroll = function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateParallax);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateParallax();
  }

  /* ---------- スクロールでふわっと表示 ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { revealIO.observe(el); });
  }

  /* ---------- 見出しの文字を一つずつゆっくりフェードイン（.char-fade） ---------- */
  var charFades = Array.prototype.slice.call(document.querySelectorAll('.char-fade'));
  if (charFades.length && !reduceMotion && 'IntersectionObserver' in window) {
    charFades.forEach(function (heading) {
      Array.prototype.forEach.call(heading.querySelectorAll(':scope > [lang]'), function (part) {
        // 読み上げ用に元の文章を残し、見た目用の一文字ずつの要素は読み上げ対象から外す
        var sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.setAttribute('lang', part.getAttribute('lang'));
        var plain = part.cloneNode(true);
        Array.prototype.forEach.call(plain.querySelectorAll('br'), function (br) { br.replaceWith(' '); });
        sr.textContent = plain.textContent.replace(/\s+/g, ' ').trim();
        var i = 0;
        var isEn = part.getAttribute('lang') === 'en';
        // 文字を一つずつ包む（.nw などの入れ子の中も。<br> はそのまま）
        var split = function (parent) {
          Array.prototype.slice.call(parent.childNodes).forEach(function (node) {
            if (node.nodeType === 1) { if (node.tagName !== 'BR') split(node); return; }
            if (node.nodeType !== 3) return;
            var frag = document.createDocumentFragment();
            // 英語は単語ごと、日本語は一文字ずつ（英単語の途中で改行しないように）
            var pieces = isEn ? node.textContent.split(/(\s+)/) : Array.from(node.textContent);
            pieces.forEach(function (piece) {
              if (!piece) return;
              if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(' ')); return; }
              var ch = document.createElement('span');
              ch.className = 'cf-ch';
              ch.textContent = piece;
              ch.style.setProperty('--d', (i * (isEn ? 0.22 : 0.11)).toFixed(2) + 's');
              i++;
              frag.appendChild(ch);
            });
            parent.replaceChild(frag, node);
          });
        };
        split(part);
        part.setAttribute('aria-hidden', 'true');
        heading.insertBefore(sr, part);
      });
      heading.classList.add('is-ready');
    });
    var cfIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          cfIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    charFades.forEach(function (el) { cfIO.observe(el); });
  }

  /* ---------- 数字のカウントアップ（最大50名様） ---------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count-to]'));
  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countIO.unobserve(entry.target);
        var el = entry.target;
        var to = parseInt(el.getAttribute('data-count-to'), 10) || 0;
        var t0 = null, dur = 1800;
        var step = function (now) {
          if (t0 === null) t0 = now;
          var p = Math.min(1, (now - t0) / dur);
          el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) {
      el.textContent = '0';
      countIO.observe(el);
    });
    // 印刷・PDF保存では最終の数字を表示
    window.addEventListener('beforeprint', function () {
      counters.forEach(function (el) {
        countIO.unobserve(el);
        el.textContent = el.getAttribute('data-count-to');
      });
    });
  }

  /* ---------- フッターの年 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
