/* =========================================================
   BAR POCHI — sparkle.js
   店名「BAR POCHI」のキラキラ演出（5パターン）

   使い方:
     <h1 class="sparkle-title" data-sparkle="stars">
       <span class="sr-only">BAR POCHI</span>
       <span class="st-text" aria-hidden="true">BAR POCHI</span>
     </h1>
   data-sparkle = shimmer | stars | lamp | bubbles | foil
                  grace（やわらかな星）| sheen（光のヴェール）| glint（ひと粒のきらめき） … 上品版
   data-sparkle-delay = 開始までの待ち時間(ms)
   data-sparkle-start="visible" = 画面に入ったときに開始
   data-sparkle-url があると ?sparkle=xxx でパターンを上書き（比較用）
   ========================================================= */
(function () {
  'use strict';

  var PATTERNS = ['shimmer', 'stars', 'lamp', 'bubbles', 'foil', 'grace', 'sheen', 'glint'];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STAR_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" ' +
    'd="M12 0c.9 6.6 3.4 9.9 12 12-8.6 2.1-11.1 5.4-12 12-.9-6.6-3.4-9.9-12-12C8.6 9.9 11.1 6.6 12 0z"/></svg>';

  var override = null;
  try { override = new URLSearchParams(window.location.search).get('sparkle'); } catch (e) { override = null; }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function Sparkle(el) {
    this.el = el;
    if (override && PATTERNS.indexOf(override) !== -1 && el.hasAttribute('data-sparkle-url')) {
      el.setAttribute('data-sparkle', override);
    }
    this.pattern = el.getAttribute('data-sparkle');
    this.text = el.querySelector('.st-text');
    this.fx = document.createElement('span');
    this.fx.className = 'st-fx';
    this.fx.setAttribute('aria-hidden', 'true');
    el.appendChild(this.fx);
    this.started = false;
    this.visible = true;
    this.timers = [];
    this.raf = 0;
    this.startedAt = 0;
    if (this.pattern === 'lamp') this.splitLetters();
    this.observe();
  }

  Sparkle.prototype.fontSize = function () {
    return parseFloat(window.getComputedStyle(this.el).fontSize) || 100;
  };

  Sparkle.prototype.active = function () {
    return this.started && this.visible && !document.hidden;
  };

  Sparkle.prototype.observe = function () {
    var self = this;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        if (self.visible) self.resume(); else self.pause();
      }, { threshold: 0 }).observe(this.el);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) self.pause(); else self.resume();
    });
  };

  Sparkle.prototype.later = function (fn, ms) {
    var self = this;
    var id = setTimeout(function () {
      var i = self.timers.indexOf(id);
      if (i !== -1) self.timers.splice(i, 1);
      fn();
    }, ms);
    this.timers.push(id);
    return id;
  };

  Sparkle.prototype.clearTimers = function () {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  /* ---------- 開始 / 再生し直し ---------- */
  Sparkle.prototype.start = function () {
    this.clearTimers();
    this.fx.innerHTML = '';
    this.el.classList.remove('is-on');
    void this.el.offsetWidth; // アニメーションを最初から
    this.el.classList.add('is-on');
    this.started = true;
    this.startedAt = performance.now();
    if (this.pattern === 'lamp') this.resetLetters();
    if (reduceMotion) return;
    this.resume();
  };

  Sparkle.prototype.pause = function () {
    this.clearTimers();
  };

  Sparkle.prototype.resume = function () {
    if (!this.active() || reduceMotion) return;
    this.clearTimers();
    switch (this.pattern) {
      case 'stars': this.loopStars(); break;
      case 'lamp': this.loopFlicker(); break;
      case 'bubbles': this.loopBubbles(); break;
      case 'foil': this.loopFoil(); break;
      case 'grace': this.loopGrace(); break;
      case 'sheen': this.loopSheen(); break;
      case 'glint': this.loopGlint(); break;
      default: break; // shimmer は CSS のみ
    }
  };

  /* ---------- 星（stars / foil で使用） ---------- */
  Sparkle.prototype.spawnStar = function (big) {
    if (!this.text || this.fx.childElementCount > 28) return;
    var fr = this.fx.getBoundingClientRect();
    var tr = this.text.getBoundingClientRect();
    if (!tr.width) return;
    var fs = this.fontSize();
    var star = document.createElement('span');
    star.className = 'st-star';
    star.innerHTML = STAR_SVG;
    var size = big ? fs * rand(0.26, 0.36) : fs * rand(0.07, 0.19);
    star.style.left = (tr.left - fr.left + rand(0.02, 0.98) * tr.width) + 'px';
    star.style.top = (tr.top - fr.top + rand(0.1, 0.9) * tr.height) + 'px';
    star.style.setProperty('--s', size.toFixed(1) + 'px');
    star.style.setProperty('--t', (big ? rand(1.6, 2.2) : rand(1, 1.8)).toFixed(2) + 's');
    star.addEventListener('animationend', function () { star.remove(); });
    this.fx.appendChild(star);
  };

  Sparkle.prototype.loopStars = function () {
    var self = this;
    var sinceStart = performance.now() - this.startedAt;
    // 登場直後はたくさん、その後は控えめに
    var burst = sinceStart < 2600;
    var tick = function () {
      if (!self.active()) return;
      var elapsed = performance.now() - self.startedAt;
      var isBurst = elapsed < 2600;
      self.spawnStar(Math.random() < (isBurst ? 0.14 : 0.1));
      if (Math.random() < 0.5) self.spawnStar(false);
      self.later(tick, isBurst ? rand(60, 130) : rand(110, 230));
    };
    this.later(tick, burst ? Math.max(0, 700 - sinceStart) : 200);
  };

  /* ---------- 上品版：共通の小さな光 ---------- */
  // opts: size [min,max]（文字サイズ比）, dur [min,max]（秒）, x / y [min,max]（文字の幅・高さ比）, cls
  Sparkle.prototype.spawnLight = function (opts) {
    if (!this.text || this.fx.childElementCount > 6) return;
    var fr = this.fx.getBoundingClientRect();
    var tr = this.text.getBoundingClientRect();
    if (!tr.width) return;
    var fs = this.fontSize();
    var el = document.createElement('span');
    el.className = opts.cls;
    if (opts.cls.indexOf('st-star') !== -1) el.innerHTML = STAR_SVG;
    var x = opts.x || [0.03, 0.97], y = opts.y || [0.08, 0.5];
    el.style.left = (tr.left - fr.left + rand(x[0], x[1]) * tr.width) + 'px';
    el.style.top = (tr.top - fr.top + rand(y[0], y[1]) * tr.height) + 'px';
    el.style.setProperty('--s', (fs * rand(opts.size[0], opts.size[1])).toFixed(1) + 'px');
    el.style.setProperty('--t', rand(opts.dur[0], opts.dur[1]).toFixed(2) + 's');
    el.addEventListener('animationend', function () { el.remove(); });
    this.fx.appendChild(el);
  };

  // grace: 小さな星がゆっくり、ひとつずつ
  Sparkle.prototype.loopGrace = function () {
    var self = this;
    var tick = function () {
      if (!self.active()) return;
      self.spawnLight({ cls: 'st-star is-soft', size: [0.06, 0.12], dur: [2.4, 3.4], y: [0.06, 0.55] });
      self.later(tick, rand(900, 1700));
    };
    this.later(tick, Math.max(0, 1500 - (performance.now() - this.startedAt)));
  };

  // sheen: 光の帯は CSS。帯が通り過ぎたあとに右端でひと粒光る
  Sparkle.prototype.loopSheen = function () {
    var self = this;
    var tick = function () {
      if (!self.active()) return;
      self.spawnLight({ cls: 'st-glint', size: [0.3, 0.38], dur: [1.8, 2.1], x: [0.84, 0.95], y: [0.1, 0.24] });
      self.later(tick, 9000);
    };
    var t = (performance.now() - this.startedAt - 5400) % 9000;
    this.later(tick, t < 0 ? -t : 9000 - t);
  };

  // glint: ときどき、ひと粒だけ宝石のように光る
  Sparkle.prototype.loopGlint = function () {
    var self = this;
    var tick = function () {
      if (!self.active()) return;
      self.spawnLight({ cls: 'st-glint', size: [0.36, 0.5], dur: [2, 2.4], y: [0.08, 0.28] });
      self.later(tick, rand(2800, 4600));
    };
    this.later(tick, Math.max(0, 1800 - (performance.now() - this.startedAt)));
  };

  /* ---------- 一文字ずつ灯る（lamp） ---------- */
  Sparkle.prototype.splitLetters = function () {
    var text = this.text.textContent;
    this.text.textContent = '';
    this.chars = [];
    for (var i = 0; i < text.length; i++) {
      var ch = document.createElement('span');
      ch.className = 'st-ch';
      ch.textContent = text[i] === ' ' ? ' ' : text[i];
      this.text.appendChild(ch);
      if (text[i] !== ' ') this.chars.push(ch);
    }
    this.chars.forEach(function (ch) {
      ch.addEventListener('animationend', function (e) {
        if (e.animationName === 'st-lamp' || e.animationName === 'st-flick') {
          ch.classList.remove('is-flick');
          ch.classList.add('is-done');
        }
      });
    });
  };

  Sparkle.prototype.resetLetters = function () {
    this.chars.forEach(function (ch, i) {
      ch.classList.remove('is-done', 'is-flick');
      ch.style.setProperty('--d', (0.5 + i * 0.16 + rand(0, 0.12)).toFixed(2) + 's');
    });
  };

  Sparkle.prototype.loopFlicker = function () {
    var self = this;
    var tick = function () {
      if (!self.active()) return;
      var lit = self.chars.filter(function (c) { return c.classList.contains('is-done'); });
      if (lit.length) {
        var ch = lit[Math.floor(Math.random() * lit.length)];
        ch.classList.remove('is-done');
        ch.classList.add('is-flick');
      }
      self.later(tick, rand(2600, 6000));
    };
    this.later(tick, 4200);
  };

  /* ---------- シャンパンの泡（bubbles） ---------- */
  Sparkle.prototype.loopBubbles = function () {
    var self = this;
    var canvas = this.fx.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      this.fx.appendChild(canvas);
      this.particles = [];
    }
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var last = performance.now();
    var acc = 0;

    var frame = function (now) {
      if (!self.active()) return;
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      var fs = self.fontSize();
      var unit = fs / 100;
      var fr = self.fx.getBoundingClientRect();
      var tr = self.text.getBoundingClientRect();
      var tLeft = tr.left - fr.left, tWidth = tr.width;
      var elapsed = (now - self.startedAt) / 1000;

      // 生成
      var rate = (tWidth / 900) * 34 * (elapsed < 2.2 ? 2.6 : 1);
      acc += rate * dt;
      while (acc >= 1 && self.particles.length < 220) {
        acc -= 1;
        self.particles.push({
          x: tLeft + rand(-0.04, 1.04) * tWidth,
          y: h - rand(0, h * 0.35),
          vy: -rand(16, 52) * unit,
          r: rand(0.7, 2.6) * unit,
          life: rand(2.4, 5.2),
          age: 0,
          sway: rand(2, 9) * unit,
          sf: rand(0.6, 1.7),
          tw: rand(3, 9),
          ph: rand(0, Math.PI * 2),
          spark: Math.random() < 0.12
        });
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = self.particles.length - 1; i >= 0; i--) {
        var p = self.particles[i];
        p.age += dt;
        if (p.age >= p.life) { self.particles.splice(i, 1); continue; }
        p.y += p.vy * dt;
        var x = p.x + Math.sin(p.age * p.sf + p.ph) * p.sway;
        var a = Math.sin(Math.PI * p.age / p.life) * (0.55 + 0.45 * Math.sin(p.age * p.tw + p.ph));
        if (a <= 0.01) continue;
        ctx.fillStyle = 'rgba(243,190,110,' + (a * 0.22).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, p.y, p.r * 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,242,210,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        if (p.spark && a > 0.55) {
          var len = p.r * 6;
          ctx.strokeStyle = 'rgba(255,236,190,' + ((a - 0.55) * 1.6).toFixed(3) + ')';
          ctx.lineWidth = Math.max(0.6, p.r * 0.35);
          ctx.beginPath();
          ctx.moveTo(x - len, p.y); ctx.lineTo(x + len, p.y);
          ctx.moveTo(x, p.y - len); ctx.lineTo(x, p.y + len);
          ctx.stroke();
        }
      }
      self.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  };

  /* ---------- 金箔（foil） ---------- */
  Sparkle.prototype.loopFoil = function () {
    var self = this;
    if (!this.foil) {
      this.foil = { cx: 0, cy: 0, tx: 0, ty: 0, lastPointer: -1e9 };
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = self.el.getBoundingClientRect();
        var nx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
        var ny = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
        self.foil.tx = Math.max(-1, Math.min(1, nx));
        self.foil.ty = Math.max(-1, Math.min(1, ny));
        self.foil.lastPointer = performance.now();
      }, { passive: true });
    }
    var f = this.foil;
    var nextStar = performance.now() + 1400;
    var frame = function (now) {
      if (!self.active()) return;
      if (now - f.lastPointer > 2500) {
        var t = now / 1000;
        f.tx = Math.sin(t * 0.5) * 0.85;
        f.ty = Math.cos(t * 0.33) * 0.6;
      }
      f.cx += (f.tx - f.cx) * 0.06;
      f.cy += (f.ty - f.cy) * 0.06;
      var s = self.el.style;
      s.setProperty('--fx', (50 + f.cx * 46).toFixed(2) + '%');
      s.setProperty('--fy', (50 + f.cy * 40).toFixed(2) + '%');
      s.setProperty('--rx', (f.cx * 8).toFixed(2) + 'deg');
      s.setProperty('--ry', (-f.cy * 6).toFixed(2) + 'deg');
      if (now > nextStar) {
        self.spawnStar(Math.random() < 0.3);
        nextStar = now + rand(700, 1800);
      }
      self.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  };

  /* ---------- 初期化 ---------- */
  var instances = [];
  Array.prototype.forEach.call(document.querySelectorAll('.sparkle-title'), function (el) {
    var inst = new Sparkle(el);
    el._sparkle = inst;
    instances.push(inst);
  });

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var fallback = new Promise(function (resolve) { setTimeout(resolve, 2500); });
  Promise.race([fontsReady, fallback]).then(function () {
    instances.forEach(function (inst) {
      var delay = parseInt(inst.el.getAttribute('data-sparkle-delay'), 10);
      var go = function () { setTimeout(function () { inst.start(); }, isNaN(delay) ? 200 : delay); };
      // data-sparkle-start="visible" … 画面に入ったときに開始（比較ページ用）
      if (inst.el.getAttribute('data-sparkle-start') === 'visible' && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { io.disconnect(); go(); }
        }, { threshold: 0.5 });
        io.observe(inst.el);
      } else {
        go();
      }
    });
  });

  // 比較ページの「もう一度再生」ボタン
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-replay]');
    if (!btn) return;
    var target = document.querySelector(btn.getAttribute('data-replay'));
    if (target && target._sparkle) target._sparkle.start();
  });

  window.PochiSparkle = { patterns: PATTERNS.slice() };
})();
