/* =========================================================================
   Humanoide — comportamento della pagina
   Due strati:
   1. BASE: lingua, menu, intestazione, mappa, copertina. Funziona sempre.
   2. MOVIMENTO: GSAP + ScrollTrigger + Lenis. Parte solo se le librerie
      ci sono e chi legge non ha chiesto di ridurre il movimento.
   ========================================================================= */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var lenis = null;
  var dopoLingua = [];

  /* ---------------------------------------------------------------- lingua */
  function titolo(l) { return root.getAttribute('data-titolo-' + l) || document.title; }
  var bottoni = $$('[data-lingua]');
  function lingua(l, salva) {
    root.lang = l;
    document.title = titolo(l);
    bottoni.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lingua') === l)); });
    $$('a[data-it]').forEach(function (a) { a.href = a.getAttribute('data-' + l); });
    if (salva) { try { localStorage.setItem('humanoide-lingua', l); } catch (e) {} }
    dopoLingua.forEach(function (f) { f(l); });
  }
  bottoni.forEach(function (b) { b.addEventListener('click', function () { lingua(b.getAttribute('data-lingua'), true); }); });
  var salvata = null;
  try { salvata = localStorage.getItem('humanoide-lingua'); } catch (e) {}
  lingua(salvata === 'en' ? 'en' : 'it', false);

  /* ---------------------------------------------------------------- scorrimento verso un'ancora */
  var testa = $('#testa');
  function vaiA(id) {
    var el = id === 'top' ? null : document.getElementById(id);
    if (id !== 'top' && !el) return false;
    if (lenis) {
      lenis.scrollTo(el || 0, { offset: el ? -(testa ? testa.offsetHeight : 0) + 1 : 0, duration: 1.4 });
    } else if (el) {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    }
    // per chi usa la tastiera: il fuoco segue il salto
    var dove = el || $('#contenuto');
    if (dove) {
      if (!dove.hasAttribute('tabindex')) dove.setAttribute('tabindex', '-1');
      dove.focus({ preventScroll: true });
    }
    if (history.replaceState) history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id);
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    if (menuAperto) chiudiMenu(false);
    if (vaiA(id)) e.preventDefault();
  });

  /* ---------------------------------------------------------------- menu su telefono */
  var menuBtn = $('#menu-btn'), menu = $('#menu-mob'), menuAperto = false;
  function apriMenu() {
    menuAperto = true;
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    root.classList.add('menu-aperto');
    if (testa) testa.classList.remove('via');
    if (lenis) lenis.stop();
    if (window.gsap && !reduce) gsap.from($$('nav a, .btn', menu), { y: 24, opacity: 0, duration: .6, stagger: .05, ease: 'expo.out' });
    var primo = $('a', menu); if (primo) primo.focus();
  }
  function chiudiMenu(restituisciFuoco) {
    menuAperto = false;
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    root.classList.remove('menu-aperto');
    if (lenis) lenis.start();
    if (restituisciFuoco) menuBtn.focus();
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { menuAperto ? chiudiMenu(true) : apriMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuAperto) chiudiMenu(true); });
    window.addEventListener('resize', function () { if (menuAperto && window.innerWidth > 1100) chiudiMenu(false); });
    // il fuoco resta dentro il menu aperto (tasto Tab)
    document.addEventListener('keydown', function (e) {
      if (!menuAperto || e.key !== 'Tab') return;
      var f = [menuBtn].concat($$('a, button', menu)); var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
  }

  /* ---------------------------------------------------------------- intestazione e barra di avanzamento */
  var barra = $('#avanza'), tick = false, ultimoY = window.scrollY;
  function aggiorna() {
    var y = window.scrollY, max = root.scrollHeight - window.innerHeight;
    if (testa) {
      testa.classList.toggle('sc', y > 24);
      // si nasconde scendendo, ricompare appena si risale
      if (!menuAperto) testa.classList.toggle('via', y > 480 && y > ultimoY + 2);
      if (y < ultimoY - 2) testa.classList.remove('via');
    }
    if (y < 160) $$('.nav a[aria-current]').forEach(function (n) { n.removeAttribute('aria-current'); });
    if (barra) barra.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    ultimoY = y; tick = false;
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(aggiorna); } }, { passive: true });
  // chi naviga con la tastiera deve sempre vedere l'intestazione
  if (testa) testa.addEventListener('focusin', function () { testa.classList.remove('via'); });
  aggiorna();

  /* ---------------------------------------------------------------- voce di menu attiva */
  var link = {};
  $$('.nav a').forEach(function (a) { var h = a.getAttribute('href'); if (h.charAt(0) === '#') link[h.slice(1)] = a; });
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

  /* ---------------------------------------------------------------- pausa delle animazioni continue */
  var pausa = $('#pausa');
  var allaPausa = [];
  if (pausa) {
    if (reduce) $('#pausa-riga').hidden = true;
    pausa.addEventListener('click', function () {
      var ferma = root.classList.toggle('ferma');
      pausa.setAttribute('aria-pressed', String(ferma));
      allaPausa.forEach(function (f) { f(ferma); });
    });
  }

  /* ---------------------------------------------------------------- copertina: inclinazione e riflesso */
  var cop = $('#cop'), ci = $('#copin');
  if (cop && ci && !reduce && fine) {
    cop.addEventListener('pointermove', function (e) {
      var r = ci.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      ci.classList.add('muove');
      ci.style.setProperty('--ry', ((x - .5) * 14).toFixed(2) + 'deg');
      ci.style.setProperty('--rx', ((.5 - y) * 12).toFixed(2) + 'deg');
      ci.style.setProperty('--lx', (x * 100).toFixed(1) + '%');
      ci.style.setProperty('--ly', (y * 100).toFixed(1) + '%');
    });
    cop.addEventListener('pointerleave', function () {
      ci.classList.remove('muove');
      ci.style.setProperty('--rx', '0deg'); ci.style.setProperty('--ry', '0deg');
    });
  }

  /* ---------------------------------------------------------------- mappa del Consiglio scientifico */
  var mappa = $('#mappa');
  if (mappa) {
    var gCitta = {}, archi = $$('.arco', mappa), membri = $$('.membro');
    $$('.citta', mappa).forEach(function (g) { gCitta[g.getAttribute('data-citta')] = g; });
    var attuale = null;
    var attiva = function (id) {
      if (id === attuale) return;
      attuale = id;
      mappa.classList.toggle('c-on', !!id);
      Object.keys(gCitta).forEach(function (k) { gCitta[k].classList.toggle('attiva', k === id); });
      if (id && gCitta[id]) gCitta[id].parentNode.appendChild(gCitta[id]); // davanti alle altre
      archi.forEach(function (a) { a.classList.toggle('attivo', !!id && (id === 'lisbona' || a.getAttribute('data-citta') === id)); });
      membri.forEach(function (m) { m.classList.toggle('attivo', !!id && m.getAttribute('data-citta') === id); });
    };
    membri.forEach(function (m) {
      var id = m.getAttribute('data-citta');
      m.addEventListener('pointerenter', function () { attiva(id); });
      m.addEventListener('pointerleave', function () { attiva(null); });
      m.addEventListener('focus', function () { attiva(id); });
      m.addEventListener('blur', function () { attiva(null); });
      m.addEventListener('click', function () { attiva(id); });
    });
    Object.keys(gCitta).forEach(function (id) {
      var g = gCitta[id];
      g.addEventListener('pointerenter', function () { attiva(id); });
      g.addEventListener('pointerleave', function () { attiva(null); });
      g.addEventListener('click', function () { attiva(attuale === id ? null : id); });
    });
  }

  /* ---------------------------------------------------------------- sommario: la copertina segue il cursore */
  var somm = $('#sommario'), ant = $('#anteprima');
  if (somm && ant && fine && !reduce) {
    var ax = 0, ay = 0, tx = 0, ty = 0, vis = false, raf = null;
    var muovi = function () {
      ax += (tx - ax) * .16; ay += (ty - ay) * .16;
      ant.style.transform = 'translate(' + (ax - 95).toFixed(1) + 'px,' + (ay - 126).toFixed(1) + 'px) rotate(' + ((tx - ax) * .04).toFixed(2) + 'deg)';
      raf = (vis || Math.abs(tx - ax) > .5) ? requestAnimationFrame(muovi) : null;
    };
    somm.addEventListener('pointermove', function (e) {
      tx = e.clientX + 120; ty = e.clientY;
      if (!vis) { vis = true; ant.classList.add('vis'); if (!ax) { ax = tx; ay = ty; } }
      if (!raf) raf = requestAnimationFrame(muovi);
    });
    somm.addEventListener('pointerleave', function () { vis = false; ant.classList.remove('vis'); });
  }

  /* ---------------------------------------------------------------- rete di punti nell'hero */
  var tela = $('#rete');
  if (tela && tela.getContext) {
    var cx = tela.getContext('2d'), W = 0, H = 0, nodi = [], dpr = Math.min(2, window.devicePixelRatio || 1);
    var punt = { x: -999, y: -999 }, visibile = true, ultimo = 0;
    var hero = tela.parentElement;
    var misura = function () {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      tela.width = W * dpr; tela.height = H * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(24, Math.min(80, Math.round(W * H / 16000)));
      nodi = [];
      for (var i = 0; i < n; i++) nodi.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: Math.random() * 1.4 + .7 });
    };
    var disegna = function (muovi) {
      cx.clearRect(0, 0, W, H);
      var D = 150, D2 = D * D;
      for (var i = 0; i < nodi.length; i++) {
        var a = nodi[i];
        if (muovi) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
          var dx = punt.x - a.x, dy = punt.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 < 24000 && d2 > 1) { a.x += dx * 0.005; a.y += dy * 0.005; }
        }
        for (var j = i + 1; j < nodi.length; j++) {
          var b = nodi[j], ex = a.x - b.x, ey = a.y - b.y, e2 = ex * ex + ey * ey;
          if (e2 < D2) { cx.strokeStyle = 'rgba(212,168,67,' + (0.15 * (1 - e2 / D2)).toFixed(3) + ')'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); }
        }
        var px = punt.x - a.x, py = punt.y - a.y, p2 = px * px + py * py;
        if (p2 < 28000) { cx.strokeStyle = 'rgba(246,244,238,' + (0.3 * (1 - p2 / 28000)).toFixed(3) + ')'; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(punt.x, punt.y); cx.stroke(); }
        cx.fillStyle = 'rgba(212,168,67,.75)'; cx.beginPath(); cx.arc(a.x, a.y, a.r, 0, 6.2832); cx.fill();
      }
    };
    var giro = function (t) {
      requestAnimationFrame(giro);
      if (!visibile || document.hidden || root.classList.contains('ferma') || t - ultimo < 30) return;
      ultimo = t; disegna(true);
    };
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

  /* =======================================================================
     MOVIMENTO
     ======================================================================= */
  if (reduce || !window.gsap || !window.ScrollTrigger || !$('.hero')) { root.classList.remove('mo-pre'); return; }
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('mo');

  /* ---- scorrimento morbido (Lenis), sincronizzato con ScrollTrigger ---- */
  if (window.Lenis) {
    lenis = new Lenis({ lerp: .1, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    if (location.hash.length > 1) { var h = location.hash.slice(1); setTimeout(function () { vaiA(h); }, 60); }
  }

  /* ---- spezzare il testo in parole (senza toccare i tag interni come <em>) ---- */
  function spezza(el, classe, maschera) {
    var parole = [];
    (function giro(nodo) {
      Array.prototype.slice.call(nodo.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var pezzi = n.textContent.split(/(\s+)/), f = document.createDocumentFragment();
          pezzi.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { f.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span'); s.className = classe;
            if (maschera) { var i = document.createElement('i'); i.textContent = p; s.appendChild(i); parole.push(i); }
            else { s.textContent = p; parole.push(s); }
            f.appendChild(s);
          });
          n.parentNode.replaceChild(f, n);
        } else if (n.nodeType === 1) giro(n);
      });
    })(el);
    return parole;
  }
  // un gruppo di parole per lingua: la lingua nascosta non deve "rubare" tempo all'animazione
  function perLingua(el, classe, maschera) {
    var span = $$(':scope > [lang]', el);
    if (!span.length) span = [el];
    return span.map(function (s) { return spezza(s, classe, maschera); });
  }

  /* ---- HERO: entrata ---- */
  var righe = $$('.hero-titolo .riga-in'), su = $$('.h-su'), anello = $('.cop-anello');
  gsap.set(righe, { y: 0, yPercent: 110 });
  gsap.set(su, { opacity: 0, y: 26 });
  gsap.set(cop, { opacity: 0, y: 70, rotateY: -28, rotateX: 10, scale: .9, transformPerspective: 1200 });
  gsap.set('.scorri', { opacity: 0 });
  gsap.set(testa, { opacity: 0, y: -20 });
  root.classList.remove('mo-pre');
  var entrata = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: .1 });
  entrata
    .to(righe, { yPercent: 0, duration: 1.3, stagger: .11 })
    .to(cop, { opacity: 1, y: 0, rotateY: 0, rotateX: 0, scale: 1, duration: 1.8, clearProps: 'transform' }, .15)
    .from(anello, { scale: .6, opacity: 0, duration: 2 }, .3)
    .to(su, { opacity: 1, y: 0, duration: 1.1, stagger: .08, clearProps: 'transform' }, .45)
    .to(testa, { opacity: 1, y: 0, duration: 1, clearProps: 'all' }, .6)
    .to('.scorri', { opacity: 1, duration: 1 }, 1);

  /* ---- HERO: allo scorrimento la scena si allontana ---- */
  gsap.to('.hero-testo', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('#copin', { y: 140, rotate: -5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.rete, .hero-alone', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center top', end: 'bottom top', scrub: true } });

  /* ---- titoli di sezione: le parole salgono dalla riga ---- */
  $$('[data-titolo]').forEach(function (el) {
    perLingua(el, 'pa', true).forEach(function (parole) {
      gsap.from(parole, { yPercent: 115, rotate: 3, duration: 1.2, ease: 'expo.out', stagger: .045,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    });
  });

  /* ---- comparse generiche ---- */
  ScrollTrigger.batch('.rv', {
    start: 'top 90%', once: true,
    onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .08, overwrite: true, clearProps: 'transform' }); }
  });

  /* ---- manifesto: le parole si accendono mentre scorri ---- */
  var man = $('[data-accendi]');
  if (man) {
    perLingua(man, 'w', false).forEach(function (parole) {
      parole.forEach(function (w) { if (/umanoid|humanoid|convivenza|coexistence/i.test(w.textContent)) w.classList.add('k'); });
      gsap.to(parole, { opacity: 1, ease: 'none', stagger: .1,
        scrollTrigger: { trigger: man, start: 'top 80%', end: 'bottom 45%', scrub: .5 } });
    });
  }

  /* ---- fascia: velocità e verso seguono lo scorrimento ---- */
  var pista = $('#fascia');
  if (pista) {
    var giroF = gsap.to(pista, { xPercent: -50, duration: 46, ease: 'none', repeat: -1 });
    giroF.totalTime(46 * 200); // lontano dallo zero: può anche andare all'indietro
    var verso = 1;
    ScrollTrigger.create({
      trigger: '.fascia', start: 'top bottom', end: 'bottom top',
      onUpdate: function (s) {
        if (root.classList.contains('ferma')) return;
        verso = s.direction;
        var v = Math.min(6, 1 + Math.abs(s.getVelocity()) / 250);
        gsap.to(giroF, { timeScale: verso * v, duration: .25, overwrite: true,
          onComplete: function () { gsap.to(giroF, { timeScale: verso, duration: 1.2, ease: 'power2.out' }); } });
      }
    });
    allaPausa.push(function (ferma) { ferma ? giroF.pause() : giroF.resume(); });
  }

  /* ---- come si legge: scorrimento orizzontale su schermi ampi ---- */
  var come = $('#come'), comePista = $('#come-pista');
  var mm = gsap.matchMedia();
  mm.add('(min-width: 981px)', function () {
    come.classList.add('orizz');
    var distanza = function () { return Math.max(0, comePista.scrollWidth - window.innerWidth); };
    var oriz = gsap.to(comePista, { x: function () { return -distanza(); }, ease: 'none',
      scrollTrigger: { trigger: come, pin: '.come-pin', start: 'top top', end: function () { return '+=' + distanza(); },
        scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (s) { gsap.set('#come-barra', { scaleX: s.progress }); } } });
    $$('.passo', come).forEach(function (p) {
      gsap.from(p, { y: 80, rotate: 4, opacity: .2, ease: 'none',
        scrollTrigger: { containerAnimation: oriz, trigger: p, start: 'left 95%', end: 'left 55%', scrub: true } });
      disegnaIcona(p, { containerAnimation: oriz, trigger: p, start: 'left 80%' });
    });
    return function () { come.classList.remove('orizz'); gsap.set(comePista, { clearProps: 'transform' }); };
  });
  mm.add('(max-width: 980px)', function () {
    $$('.passo', come).forEach(function (p) {
      gsap.from(p, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 88%', once: true } });
      disegnaIcona(p, { trigger: p, start: 'top 80%' });
    });
  });
  function disegnaIcona(p, st) {
    var tratti = $$('.ico path, .ico circle', p);
    tratti.forEach(function (t) { var l = t.getTotalLength ? t.getTotalLength() : 200; t.style.strokeDasharray = l; t.style.strokeDashoffset = l; });
    st.once = true;
    gsap.to(tratti, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: .08, scrollTrigger: st });
  }

  /* ---- sommario del numero 1 ---- */
  gsap.from('.voce', { opacity: 0, y: 46, duration: 1.1, ease: 'expo.out', stagger: .07,
    scrollTrigger: { trigger: '#sommario', start: 'top 82%', once: true } });

  /* ---- numeri del Consiglio: contano ---- */
  $$('[data-conta]').forEach(function (d) {
    var fine = +d.getAttribute('data-conta'), o = { v: 0 };
    gsap.to(o, { v: fine, duration: 1.8, ease: 'power3.out', snap: { v: 1 },
      onUpdate: function () { d.textContent = o.v; },
      scrollTrigger: { trigger: d, start: 'top 88%', once: true } });
  });

  /* ---- mappa: i collegamenti si disegnano, le sedi si accendono ---- */
  if (mappa) {
    var archiM = $$('.arco', mappa);
    archiM.forEach(function (a) { var l = a.getTotalLength(); a.style.strokeDasharray = l; a.style.strokeDashoffset = l; });
    var tlM = gsap.timeline({ scrollTrigger: { trigger: mappa, start: 'top 78%', once: true } });
    tlM.from('.m-punti', { opacity: 0, duration: 1.4, ease: 'power2.out' })
       .from('.c-punto', { attr: { r: 0 }, duration: .8, ease: 'back.out(3)', stagger: .06 }, .3)
       .to(archiM, { strokeDashoffset: 0, duration: 1.5, ease: 'power3.inOut', stagger: .08,
         onComplete: function () { archiM.forEach(function (a) { a.style.strokeDasharray = ''; a.style.strokeDashoffset = ''; }); } }, .5);
    gsap.from('.membro', { opacity: 0, x: 30, duration: 1, ease: 'expo.out', stagger: .05,
      scrollTrigger: { trigger: '#membri', start: 'top 85%', once: true } });
  }

  /* ---- chiusura: il simbolo si avvicina ---- */
  gsap.fromTo('.iscr-simbolo', { scale: .7 }, { scale: 1.15, ease: 'none',
    scrollTrigger: { trigger: '.iscr', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.piede-logo', { yPercent: 40, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.piede', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ---- bottoni magnetici (solo mouse) ---- */
  if (fine) {
    $$('.magnete').forEach(function (b) {
      var qx = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3.out' }), qy = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3.out' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * .22); qy((e.clientY - r.top - r.height / 2) * .32);
      });
      b.addEventListener('pointerleave', function () { qx(0); qy(0); });
    });
  }

  /* ---- dopo un cambio di lingua le altezze cambiano: si ricalcola ---- */
  dopoLingua.push(function () { requestAnimationFrame(function () { ScrollTrigger.refresh(); }); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
