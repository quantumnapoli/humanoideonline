(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- lingua ---- */
  // il titolo della scheda sta sull'<html>: ogni pagina ha il suo
  function titolo(l) { return root.getAttribute('data-titolo-' + l) || document.title; }
  var bottoni = document.querySelectorAll('[data-lingua]');
  function lingua(l) {
    root.lang = l;
    document.title = titolo(l);
    bottoni.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lingua') === l)); });
    document.querySelectorAll('a[data-it]').forEach(function (a) { a.href = a.getAttribute('data-' + l); });
    try { localStorage.setItem('humanoide-lingua', l); } catch (e) {}
  }
  bottoni.forEach(function (b) { b.addEventListener('click', function () { lingua(b.getAttribute('data-lingua')); }); });
  var salvata = null;
  try { salvata = localStorage.getItem('humanoide-lingua'); } catch (e) {}
  if (salvata === 'en') lingua('en');

  /* ---- intestazione, avanzamento ---- */
  var testa = document.getElementById('testa'), barra = document.getElementById('avanza'), tick = false;
  function aggiorna() {
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    testa.classList.toggle('sc', y > 24);
    barra.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    tick = false;
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(aggiorna); } }, { passive: true });
  aggiorna();

  /* ---- comparsa allo scorrimento ---- */
  var rv = document.querySelectorAll('.rv');
  if (reduce || !('IntersectionObserver' in window)) {
    rv.forEach(function (e) { e.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function (e) {
      // già dentro la finestra all'apertura: compare subito, senza aspettare lo scorrimento
      if (e.getBoundingClientRect().top < window.innerHeight) { e.classList.add('in'); }
      else { io.observe(e); }
    });
  }

  /* ---- voce di menu attiva ---- */
  var link = {};
  document.querySelectorAll('.nav a').forEach(function (a) { var h = a.getAttribute('href'); if (h.charAt(0) === '#') link[h.slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (!v.isIntersecting) return;
        Object.keys(link).forEach(function (k) { link[k].removeAttribute('aria-current'); });
        if (link[v.target.id]) link[v.target.id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(link).forEach(function (k) { var s = document.getElementById(k); if (s) so.observe(s); });
  }

  /* ---- pausa delle animazioni continue ---- */
  var pausa = document.getElementById('pausa');
  if (pausa) {
    if (reduce) { document.getElementById('pausa-riga').hidden = true; }
    pausa.addEventListener('click', function () {
      var ferma = root.classList.toggle('ferma');
      pausa.setAttribute('aria-pressed', String(ferma));
    });
  }

  /* ---- copertina che segue il puntatore ---- */
  var cop = document.getElementById('cop'), ci = document.getElementById('copin');
  if (cop && !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    cop.addEventListener('pointermove', function (e) {
      var r = cop.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      ci.classList.add('muove');
      ci.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      ci.style.setProperty('--rx', (-y * 9).toFixed(2) + 'deg');
    });
    cop.addEventListener('pointerleave', function () {
      ci.classList.remove('muove');
      ci.style.setProperty('--rx', '0deg'); ci.style.setProperty('--ry', '0deg');
    });
  }

  /* ---- luce che segue il puntatore sulle schede ---- */
  document.querySelectorAll('.persona').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---- rete di punti nell'hero: i nodi si cercano e seguono il puntatore ---- */
  var tela = document.getElementById('rete');
  if (tela && tela.getContext) {
    var cx = tela.getContext('2d'), W = 0, H = 0, nodi = [], dpr = Math.min(2, window.devicePixelRatio || 1);
    var punt = { x: -999, y: -999 }, visibile = true, ultimo = 0;
    var hero = tela.parentElement;
    function misura() {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      tela.width = W * dpr; tela.height = H * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(24, Math.min(70, Math.round(W * H / 17000)));
      nodi = [];
      for (var i = 0; i < n; i++) nodi.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28, r: Math.random() * 1.4 + .8 });
    }
    function disegna(muovi) {
      cx.clearRect(0, 0, W, H);
      var D = 150, D2 = D * D;
      for (var i = 0; i < nodi.length; i++) {
        var a = nodi[i];
        if (muovi) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
          var dx = punt.x - a.x, dy = punt.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 < 22000 && d2 > 1) { a.x += dx * 0.004; a.y += dy * 0.004; }
        }
        for (var j = i + 1; j < nodi.length; j++) {
          var b = nodi[j], ex = a.x - b.x, ey = a.y - b.y, e2 = ex * ex + ey * ey;
          if (e2 < D2) { cx.strokeStyle = 'rgba(212,168,67,' + (0.16 * (1 - e2 / D2)).toFixed(3) + ')'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); }
        }
        var px = punt.x - a.x, py = punt.y - a.y, p2 = px * px + py * py;
        if (p2 < 26000) { cx.strokeStyle = 'rgba(246,244,238,' + (0.28 * (1 - p2 / 26000)).toFixed(3) + ')'; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(punt.x, punt.y); cx.stroke(); }
        cx.fillStyle = 'rgba(212,168,67,.75)'; cx.beginPath(); cx.arc(a.x, a.y, a.r, 0, 6.2832); cx.fill();
      }
    }
    function giro(t) {
      requestAnimationFrame(giro);
      if (!visibile || document.hidden || root.classList.contains('ferma') || t - ultimo < 30) return;
      ultimo = t; disegna(true);
    }
    misura();
    if (reduce) { disegna(false); }
    else {
      hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); punt.x = e.clientX - r.left; punt.y = e.clientY - r.top; });
      hero.addEventListener('pointerleave', function () { punt.x = punt.y = -999; });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (v) { visibile = v[0].isIntersecting; }).observe(hero);
      requestAnimationFrame(giro);
    }
    var tmr;
    window.addEventListener('resize', function () { clearTimeout(tmr); tmr = setTimeout(function () { misura(); if (reduce) disegna(false); }, 200); });
  }
})();
