/* Café Leinpfad : le scroll pilote la caméra (séquence d'images sur canvas) */
(function () {
  'use strict';
  var film = document.getElementById('film'), stage = document.getElementById('stage');
  var bar = document.getElementById('bar'), clock = document.getElementById('clock'), hint = document.getElementById('hint');
  var nav = document.getElementById('nav');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var chaps = [].slice.call(document.querySelectorAll('.chap')).map(function (el) {
    return { el: el, s: el.dataset.s.split(',').map(Number) };
  });

  function progress() {
    var r = film.getBoundingClientRect(), total = film.offsetHeight - innerHeight;
    return Math.min(1, Math.max(0, -r.top / (total || 1)));
  }
  function chapters(p) {
    chaps.forEach(function (c) {
      var a = c.s[0], b = c.s[1], cc = c.s[2], d = c.s[3], o;
      if (p < a) o = 0; else if (p < b) o = (p - a) / (b - a || 1); else if (p < cc) o = 1; else if (p < d) o = 1 - (p - cc) / (d - cc); else o = 0;
      if (a === 0 && b === 0 && p < cc) o = 1;
      var y = p < b ? (1 - o) * 36 : -(1 - o) * 36;
      c.el.style.opacity = o.toFixed(3);
      c.el.style.visibility = o > 0.01 ? 'visible' : 'hidden';
      var base = c.el.classList.contains('chap-low') ? '' : 'translateY(-50%) ';
      c.el.style.transform = base + 'translateY(' + y.toFixed(1) + 'px)';
    });
    bar.style.width = (p * 100).toFixed(1) + '%';
    var c0 = +(clock.dataset.start || 840), cs = +(clock.dataset.span || 510); var m = Math.round(c0 + p * cs); // heure qui avance avec le film
    clock.textContent = String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60 - (m % 60) % 5).padStart(2, '0');
    hint.style.opacity = p > 0.02 ? 0 : 1;
    nav.classList.toggle('solid', film.getBoundingClientRect().bottom < 80);
  }

  function player(m) {
    var mobile = innerWidth < 768 && m.mobile;
    var count = mobile ? m.mobile.count : m.count, path = mobile ? m.mobile.path : m.path;
    function url(i) { var s = String(i + 1); while (s.length < 4) s = '0' + s; return path.replace('%04d', s); }
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    var imgs = new Array(count), ok = new Uint8Array(count), cur = 0, shown = -1, ready = false;
    function size() { var dpr = Math.min(devicePixelRatio || 1, 2); cv.width = stage.clientWidth * dpr; cv.height = stage.clientHeight * dpr; shown = -1; }
    function draw(i) {
      var im = imgs[i]; if (!im) return;
      var cw = cv.width, ch = cv.height, ir = im.naturalWidth / im.naturalHeight, w, h;
      if (cw / ch > ir) { w = cw; h = cw / ir; } else { h = ch; w = ch * ir; }
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    function near(t) { for (var d = 0; d < count; d++) { if (t - d >= 0 && ok[t - d]) return t - d; if (t + d < count && ok[t + d]) return t + d; } return -1; }
    var order = [], seen = new Uint8Array(count);
    for (var st = 32; st >= 1; st /= 2) for (var i = 0; i < count; i += st) if (!seen[i]) { seen[i] = 1; order.push(i); }
    var q = 0, active = 0;
    (function next() {
      while (active < 6 && q < order.length) (function (i) {
        active++; var im = new Image(); im.decoding = 'async';
        im.onload = function () { imgs[i] = im; ok[i] = 1; active--; if (!ready) { ready = true; size(); stage.insertBefore(cv, stage.firstChild); document.getElementById('poster').style.opacity = 0; } next(); };
        im.onerror = function () { active--; next(); };
        im.src = url(i);
      })(order[q++]);
    })();
    addEventListener('resize', size);
    return function (p) {
      if (!ready) return;
      cur += (p * (count - 1) - cur) * (reduce ? 1 : 0.18);
      var f = near(Math.round(cur)); if (f >= 0 && f !== shown) { draw(f); shown = f; }
    };
  }

  var upd = null;
  fetch('hero/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (m) { upd = player(m); }).catch(function () {});

  (function loop() { var p = progress(); chapters(p); if (upd) upd(p); requestAnimationFrame(loop); })();

  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
})();
