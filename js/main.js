/* ============================================================
   MAIN — animazioni condivise da tutte le pagine
   (GSAP + ScrollTrigger + Lenis)
   ============================================================ */
(function () {
  gsap.registerPlugin(ScrollTrigger);
  // su mobile la barra indirizzi cambia l'altezza viewport: evita refresh/jank continui
  ScrollTrigger.config({ ignoreMobileResize: true });
  // il browser non deve ripristinare la posizione: la pagina parte sempre in cima, così le animazioni d'ingresso partono da zero
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const desk = matchMedia('(min-width: 901px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const page = document.body.dataset.page || 'home';
  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* storage non disponibile */ } },
    del: (k) => { try { sessionStorage.removeItem(k); } catch (e) { /* storage non disponibile */ } },
  };

  const year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  /* ---------- smooth scroll ---------- */
  // smooth scroll solo su desktop: solo i veri dispositivi touch (puntatore grosso + niente hover) usano lo scroll nativo
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches || innerWidth < 901;
  let lenis = null;
  if (window.Lenis && !reduced && !touch) {
    lenis = new Lenis({ duration: 1.2, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollToEl = (target) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.6, offset: target === 0 ? 0 : -70 });
    else if (target === 0) scrollTo(0, 0);
    else target.scrollIntoView({ behavior: 'smooth' });
  };

  /* ---------- menu mobile ---------- */
  const burger = $('.nav__burger'), menu = $('.menu');
  function closeMenu() { if (!menu) return; menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); }
  if (burger) burger.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    if (open) gsap.from('.menu a', { yPercent: 60, autoAlpha: 0, stagger: .05, duration: .8, ease: 'expo.out', delay: .25 });
  });

  /* ---------- nav: pagina corrente + nasconde scendendo ---------- */
  $$('[data-nav]').forEach((a) => a.classList.toggle('is-current', a.dataset.nav === page));
  const nav = $('.nav');
  let lastY = 0;
  const onScrollNav = (y) => {
    nav.classList.toggle('is-hidden', y > 300 && y > lastY && !(menu && menu.classList.contains('is-open')));
    lastY = y;
  };
  if (lenis) lenis.on('scroll', (e) => onScrollNav(e.scroll));
  else addEventListener('scroll', () => onScrollNav(scrollY), { passive: true });

  /* ---------- transizione tra pagine: semplice dissolvenza (solo opacità, non tocca il layout) ---------- */
  const ptrans = $('.ptrans');
  const ptText = $('.ptrans__t');
  let leaving = false;
  $$('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (a.target === '_blank' || /^(mailto:|tel:|https?:)/.test(href)) return;
    if (href.startsWith('#')) {
      a.addEventListener('click', (e) => {
        const t = href === '#top' ? 0 : $(href);
        if (t === null) return;
        e.preventDefault(); closeMenu(); scrollToEl(t);
      });
      return;
    }
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || leaving) return;
      const url = new URL(href, location.href);
      if (url.pathname === location.pathname && url.hash) {
        const t = $(url.hash); if (t) { e.preventDefault(); closeMenu(); scrollToEl(t); }
        return;
      }
      e.preventDefault();
      leaving = true;
      closeMenu();
      const label = a.dataset.label || a.textContent.trim().replace(/[→↗]/g, '') || 'Atelier';
      if (ptText) ptText.textContent = label;
      store.set('pt', '1');
      store.set('ptLabel', label);
      if (!ptrans || reduced) { location.href = url.href; return; }
      gsap.to(ptrans, { autoAlpha: 1, duration: .32, ease: 'power2.out', onComplete: () => { location.href = url.href; } });
    });
  });
  addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(ptrans, { yPercent: 100 }); });

  /* ---------- utilità di animazione ---------- */
  function sizeK(box, mode) {
    const r = box.getBoundingClientRect();
    if (!r.width) return;
    const s = mode === 'slice' ? Math.max(r.width / 1440, r.height / 959) : Math.min(r.width / 1440, r.height / 959);
    box.style.setProperty('--k', (1 / s).toFixed(3));
  }
  const strokes = (g) => [...g.querySelectorAll('[pathLength]')];
  function drawTimeline(svg, G) {
    gsap.set(strokes(svg), { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(svg.querySelectorAll('text'), { autoAlpha: 0, y: 8 });
    gsap.set(svg.querySelectorAll('.fill-ink'), { fillOpacity: 0 });
    return gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } })
      .to(strokes(G.ground)[0], { strokeDashoffset: 0, duration: 1.1 }, .1)
      .to(strokes(G.struct), { strokeDashoffset: 0, duration: .9, stagger: .07 }, .5)
      .to(strokes(G.open), { strokeDashoffset: 0, duration: .6, stagger: .025 }, 1.35)
      .to(strokes(G.hatch), { strokeDashoffset: 0, duration: .35, stagger: .006, ease: 'power1.out' }, 1.6)
      .to(strokes(G.ground).slice(1), { strokeDashoffset: 0, duration: .25, stagger: .004 }, 1.7)
      .to(strokes(G.dims), { strokeDashoffset: 0, duration: .5, stagger: .03 }, 2.1)
      .to(strokes(G.ctx), { strokeDashoffset: 0, duration: 1, stagger: .05, ease: 'power1.inOut' }, 2.2)
      .to(svg.querySelectorAll('.fill-ink'), { fillOpacity: 1, duration: .4 }, 2.4)
      .to(svg.querySelectorAll('text'), { autoAlpha: 1, y: 0, duration: .7, stagger: .08, ease: 'expo.out' }, 2.5);
  }

  /* ============================================================
     HOME — prospetto: dal disegno al render
     ============================================================ */
  const sheet = $('#sheet');
  let heroDraw = null;
  if (sheet) {
    const ink = $('#drawInk'), light = $('#drawLight');
    const Gi = window.buildElevation(ink, { labels: true });
    window.buildElevation(light, { labels: true });
    heroDraw = drawTimeline(ink, Gi);
    heroDraw.to('.sheet__corner', { autoAlpha: 1, duration: .6, stagger: .08 }, 0)
      .from('.sheet__block', { autoAlpha: 0, y: -10, duration: .7, ease: 'expo.out' }, .1);
    gsap.set('.sheet__corner', { autoAlpha: 0 });
    const fit = () => sizeK(sheet, 'slice');
    fit(); addEventListener('resize', fit);

    const W = { p: 0 };
    const photo = $('.sheet__photo'), inkWrap = $('.sheet__draw--ink'), lightWrap = $('.sheet__draw--light'), scan = $('.sheet__scan'), stateEl = $('#sheetState');
    const applyWipe = () => {
      const p = W.p;
      photo.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
      lightWrap.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
      inkWrap.style.clipPath = `inset(0 0 0 ${p}%)`;
      scan.style.left = p + '%';
      scan.style.opacity = p > .3 && p < 99.7 ? 1 : 0;
      const label = p > 55 ? 'Render' : 'Prospetto';
      if (stateEl.textContent !== label) stateEl.textContent = label;
    };
    const finishDraw = () => { if (heroDraw.progress() < 1) heroDraw.progress(1); };
    if (desk) {
      gsap.set('.sheet__caption', { y: 20 });
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: 1, onUpdate: (s) => { if (s.progress > .01) finishDraw(); } },
      })
        .to(W, { p: 100, duration: 1, ease: 'power1.inOut', onUpdate: applyWipe })
        .to(lightWrap, { autoAlpha: 0, duration: .35 }, '-=.15')
        .to(sheet, { top: 0, left: 0, right: 0, bottom: 0, borderColor: 'rgba(43,36,29,0)', duration: .7, ease: 'power2.inOut', onUpdate: fit }, '>-0.1')
        .to('.hero__panel', { xPercent: -35, autoAlpha: 0, duration: .5, ease: 'power2.in' }, '<')
        .to(sheet, { '--shade': 1, duration: .5 }, '<.2')
        .to('.sheet__caption', { autoAlpha: 1, y: 0, duration: .4 }, '<.2')
        .to('.sheet__photo img', { scale: 1.05, duration: .8 }, '<')
        .to({}, { duration: .3 });
    } else {
      gsap.to(W, { p: 100, ease: 'none', onUpdate: applyWipe, scrollTrigger: { trigger: sheet, start: 'top 55%', end: 'bottom 15%', scrub: 1, onEnter: finishDraw } });
    }
    applyWipe();
  }

  /* ---------- intestazioni delle pagine interne ---------- */
  const pdraw = $('#pdraw');
  let pageDraw = null;
  if (pdraw) {
    const G = window.buildElevation(pdraw, { labels: false });
    pageDraw = drawTimeline(pdraw, G);
    const box = pdraw.parentElement;
    const fit = () => sizeK(box, 'meet');
    fit(); addEventListener('resize', fit);
    gsap.to(box, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.phead', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- ingresso pagina ---------- */
  let introDone = false;
  function intro() {
    if (introDone) return;
    introDone = true;
    if (!location.hash) window.scrollTo(0, 0);
    if (lenis) lenis.start();
    document.body.classList.remove('is-loading');
    ScrollTrigger.refresh();
    if (sheet) {
      gsap.from('.hero__title .ln > span', { yPercent: 115, duration: .9, ease: 'expo.out', stagger: .07 });
      gsap.from(['.hero__eyebrow', '.hero__lead', '.hero__ctas', '.hero__facts'], { y: 20, autoAlpha: 0, duration: .8, ease: 'expo.out', stagger: .06, delay: .15 });
      gsap.from(sheet, { autoAlpha: 0, duration: .6, ease: 'power2.out' });
      if (reduced) heroDraw.progress(1); else gsap.delayedCall(.2, () => heroDraw.play());
    }
    if ($('.phead')) {
      gsap.from('.phead__title .ln > span', { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: .09 });
      gsap.from(['.crumb', '.phead__intro', '.phead__meta'], { y: 24, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .1, delay: .25 });
      if (pageDraw) { if (reduced) pageDraw.progress(1); else gsap.delayedCall(.3, () => pageDraw.play()); }
      if ($('.phead__photo')) {
        gsap.fromTo('.phead__photo', { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 1.3, ease: 'expo.inOut', delay: .2 });
        gsap.fromTo('.phead__photo img', { scale: 1.2 }, { scale: 1.06, duration: 1.6, ease: 'expo.out', delay: .2 });
      }
    }
    gsap.from('.nav', { y: -20, autoAlpha: 0, duration: .9, ease: 'expo.out' });
    if (location.hash) {
      const t = $(location.hash);
      if (t) gsap.delayedCall(.4, () => scrollToEl(t));
    }
  }

  const loader = $('.loader');
  const fromTransition = store.get('pt') === '1';
  store.del('pt');
  if (fromTransition) {
    // arrivo da un'altra pagina: l'overlay parte coprente (con la scritta) e si dissolve
    if (ptText && store.get('ptLabel')) ptText.textContent = store.get('ptLabel');
    store.del('ptLabel');
    if (loader) loader.style.display = 'none';
    document.documentElement.classList.remove('pt-in');
    if (ptrans) { gsap.set(ptrans, { autoAlpha: 1 }); gsap.to(ptrans, { autoAlpha: 0, duration: .45, ease: 'power2.out', delay: .12 }); }
    intro();
  } else if (loader && !store.get('seen')) {
    store.set('seen', '1');
    const count = { v: 0 };
    const hideLoader = () => { loader.style.display = 'none'; };
    gsap.set(loader, { clipPath: 'inset(0 0 0% 0)' });
    gsap.timeline()
      .from('.loader__word > span', { yPercent: 110, duration: .7, ease: 'expo.out', stagger: .08 })
      .to(count, { v: 100, duration: reduced ? .1 : .8, ease: 'power2.inOut', onUpdate: () => { $('#loaderNum').textContent = Math.round(count.v) + '%'; } }, 0)
      .to('.loader__line span', { width: '100%', duration: reduced ? .1 : .8, ease: 'power2.inOut' }, 0)
      .to('.loader__word > span', { yPercent: -110, duration: .45, ease: 'power3.in', stagger: .05 }, '+=.1')
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: .7, ease: 'expo.inOut' }, '-=.15')
      .add(hideLoader)
      .add(intro, '-=.55');
    // sicurezza: qualunque cosa accada, dopo 2.6s la pagina è scoperta e animata
    gsap.delayedCall(2.6, () => { if (getComputedStyle(loader).display !== 'none') { hideLoader(); intro(); } });
  } else {
    if (loader) loader.style.display = 'none';
    intro();
  }

  /* ============================================================
     ANIMAZIONI GENERICHE
     ============================================================ */
  // marquee — larghezza in cache (niente reflow a ogni frame) e in pausa quando è fuori schermo
  const track = $('.marquee__track');
  if (track) {
    let mx = 0, boost = 0, dir = 1, half = track.scrollWidth / 2, visible = false, lastT = 0;
    addEventListener('resize', () => { half = track.scrollWidth / 2; });
    const mq = track.closest('.marquee');
    if (mq) ScrollTrigger.create({ trigger: mq, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
    gsap.ticker.add((t) => {
      if (!visible) { lastT = t; return; }
      const dt = Math.min((t - lastT) * 60, 3); lastT = t;
      const v = lenis ? lenis.velocity : 0;
      if (Math.abs(v) > .2) dir = v > 0 ? 1 : -1;
      boost += (Math.abs(v) * .25 - boost) * .08;
      mx -= (.55 + boost) * dir * dt;
      if (mx <= -half) mx += half;
      if (mx > 0) mx -= half;
      track.style.transform = `translate3d(${mx}px,0,0)`;
    });
  }

  // titoli di sezione
  $$('main .h2').forEach((h) => {
    h.style.overflow = 'hidden';
    h.style.paddingBottom = '.08em';
    h.innerHTML = `<span style="display:inline-block">${h.innerHTML}</span>`;
    gsap.from(h.firstElementChild, { yPercent: 105, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
  });
  $$('main .label').forEach((l) => {
    if (l.closest('.phead') || l.closest('.hero')) return;
    gsap.from(l, { x: -24, autoAlpha: 0, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 90%' } });
  });
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, { y: 36, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  $$('[data-stagger]').forEach((wrap) => {
    gsap.from(wrap.children, { y: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: wrap, start: 'top 86%' } });
  });
  // immagini: tendina + parallasse
  $$('.reveal-img').forEach((f) => {
    gsap.fromTo(f, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: f, start: 'top 82%' } });
    const img = f.querySelector('img');
    if (img) gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // testo che si "inchiostra" scorrendo
  $$('.fill-text').forEach((fill) => {
    fill.innerHTML = fill.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
    gsap.to(fill.querySelectorAll('.w'), { color: '#2B241D', stagger: .1, ease: 'none', scrollTrigger: { trigger: fill, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  });
  // contatori
  $$('[data-count]').forEach((b) => {
    const end = +b.dataset.count;
    const o = { v: end > 100 ? end - 30 : 0 };
    gsap.to(o, { v: end, duration: 1.8, ease: 'expo.out', onUpdate: () => { b.textContent = Math.round(o.v); }, scrollTrigger: { trigger: b, start: 'top 90%' } });
  });
  if ($('.stats')) gsap.from('.stat', { y: 40, autoAlpha: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.stats', start: 'top 90%' } });
  if ($('.studio__bio')) gsap.from('.studio__bio p', { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: '.studio__bio', start: 'top 90%' } });

  // banda CTA
  if ($('.cta-band')) {
    gsap.from('.cta-band__t .ln > span', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.cta-band', start: 'top 80%' } });
    gsap.from('.cta-band__r > *', { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '.cta-band', start: 'top 75%' } });
  }

  /* ---------- METODO (home, pinned) ---------- */
  if ($('.metodo')) {
    const msteps = $$('.mstep'), mimgs = $$('.mimg'), bars = $$('.metodo__bars b'), digits = $('.metodo__digits');
    let mIdx = -1;
    const setStep = (i) => {
      if (i === mIdx) return;
      const prev = msteps[mIdx];
      if (prev) gsap.to(prev, { autoAlpha: 0, y: -20, duration: .45, ease: 'power2.in', overwrite: true });
      gsap.fromTo(msteps[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: .9, delay: .15, ease: 'expo.out', overwrite: true });
      gsap.to(digits.children, { yPercent: -100 * i, duration: .9, ease: 'expo.inOut', overwrite: true });
      mIdx = i;
    };
    setStep(0);
    ScrollTrigger.create({
      trigger: '.metodo', start: 'top top', end: 'bottom bottom',
      onUpdate(s) {
        const f = s.progress * 4;
        setStep(Math.min(3, Math.floor(f)));
        bars.forEach((b, i) => { b.style.transform = `scaleX(${clamp(f - i)})`; });
        mimgs.forEach((m, i) => {
          if (i > 0) m.style.clipPath = `inset(${(1 - clamp((f - (i - .3)) / .45)) * 100}% 0 0 0)`;
          m.firstElementChild.style.transform = `scale(${1.15 - .15 * clamp((f - (i - .3)) / 1.3)})`;
        });
      },
    });
  }

  /* ---------- SERVIZI (home) ---------- */
  if ($('.srv')) {
    gsap.from('.srv__card', { y: 90, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.srv', start: 'top 85%' } });
    gsap.from('.srv__more > *', { y: 16, autoAlpha: 0, duration: .7, ease: 'power3.out', stagger: .05, scrollTrigger: { trigger: '.srv__more', start: 'top 95%' } });
  }
  if ($('.sec-head__p')) $$('.sec-head__p').forEach((p) => gsap.from(p, { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 92%' } }));

  /* ---------- PROGETTI (home) ---------- */
  $$('.pj').forEach((pj, i) => {
    gsap.timeline({ scrollTrigger: { trigger: pj, start: 'top 88%' } })
      .fromTo(pj, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'expo.inOut', delay: (i % 3) * .08 })
      .from(pj.querySelector('.pj__img'), { scale: 1.3, duration: 1.6, ease: 'expo.out' }, '<.2')
      .from(pj.querySelectorAll('.pj__info > *'), { yPercent: 60, autoAlpha: 0, duration: .9, ease: 'expo.out', stagger: .08 }, '<.5');
  });

  /* ---------- FAQ ---------- */
  $$('.faq details').forEach((d) => {
    const body = d.querySelector('.faq__a');
    d.querySelector('summary').addEventListener('click', (e) => {
      e.preventDefault();
      if (d.open) {
        gsap.to(body, { height: 0, duration: .5, ease: 'expo.inOut', onComplete: () => { d.open = false; gsap.set(body, { clearProps: 'height' }); } });
      } else {
        d.open = true;
        gsap.from(body, { height: 0, duration: .7, ease: 'expo.out' });
        gsap.from(body.querySelector('p'), { y: 14, autoAlpha: 0, duration: .7, ease: 'expo.out' });
      }
    });
  });
  if ($('.faq__list')) {
    gsap.from('.faq details', { y: 30, autoAlpha: 0, stagger: .05, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: '.faq__list', start: 'top 85%' } });
    gsap.from('.faq__card', { y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.faq__card', start: 'top 92%' } });
  }

  /* ---------- CONTATTI (home) ---------- */
  if ($('.contatti')) {
    gsap.fromTo('.contatti__bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.contatti', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.contatti__title .ln > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.contatti__title', start: 'top 85%' } });
    gsap.from(['.contatti__lead', '.contatti__grid a'], { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: '.contatti__lead', start: 'top 92%' } });
  }

  /* ============================================================
     PAGINE INTERNE
     ============================================================ */
  // STUDIO — percorso
  if ($('.path')) {
    gsap.to('.path__line i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.path__list', start: 'top 70%', end: 'bottom 60%', scrub: true } });
    $$('.pt').forEach((pt) => {
      ScrollTrigger.create({ trigger: pt, start: 'top 65%', onEnter: () => pt.classList.add('is-on'), onLeaveBack: () => pt.classList.remove('is-on') });
      gsap.from(pt.children, { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: pt, start: 'top 82%' } });
    });
  }

  // COME LAVORIAMO — fasi
  $$('.phase').forEach((ph) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: ph, start: 'top 75%' } });
    tl.from(ph.querySelector('.phase__n'), { yPercent: 40, autoAlpha: 0, duration: 1.3, ease: 'expo.out' })
      .from(ph.querySelectorAll('h2, p, li'), { y: 26, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .06 }, '<.15');
  });

  // SERVIZI — immagine sticky che cambia con il servizio attivo
  const svcItems = $$('.svc__item');
  if (svcItems.length) {
    const figs = $$('.svc__media figure');
    const count = $('.svc__count');
    let cur = 0;
    const show = (i) => {
      if (i === cur || !figs[i]) return;
      const down = i > cur;
      figs.forEach((f, k) => { f.style.zIndex = k === i ? 2 : (k === cur ? 1 : 0); });
      gsap.fromTo(figs[i], { clipPath: down ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)' }, { clipPath: 'inset(0% 0 0% 0)', duration: 1, ease: 'expo.inOut' });
      gsap.fromTo(figs[i].querySelector('img'), { scale: 1.2 }, { scale: 1, duration: 1.4, ease: 'expo.out' });
      cur = i;
      if (count) count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(svcItems.length).padStart(2, '0');
    };
    svcItems.forEach((it, i) => {
      ScrollTrigger.create({ trigger: it, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => { it.classList.toggle('is-on', s.isActive); if (s.isActive) show(i); } });
      gsap.from(it.children, { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: it, start: 'top 80%' } });
    });
    svcItems[0].classList.add('is-on');
  }

  // PORTFOLIO — filtri + scheda
  const pfGrid = $('.pf__grid');
  if (pfGrid) {
    const cards = $$('.pfc');
    const countEl = $('.pf__count');
    const setCount = () => { const n = cards.filter((c) => !c.classList.contains('is-hidden')).length; countEl.textContent = n + (n === 1 ? ' progetto' : ' progetti'); };
    setCount();
    gsap.from(cards, { y: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: .07, delay: .5 });
    $$('.pf__filters button').forEach((b) => b.addEventListener('click', () => {
      $$('.pf__filters button').forEach((x) => x.classList.toggle('is-on', x === b));
      const f = b.dataset.filter;
      gsap.to(pfGrid, {
        autoAlpha: 0, y: 16, duration: .35, ease: 'power2.in',
        onComplete: () => {
          cards.forEach((c) => c.classList.toggle('is-hidden', f !== 'all' && !c.dataset.cat.split(' ').includes(f)));
          let first = true;
          cards.forEach((c) => { const vis = !c.classList.contains('is-hidden'); c.classList.toggle('is-big', vis && first); if (vis) first = false; });
          setCount();
          ScrollTrigger.refresh();
          gsap.to(pfGrid, { autoAlpha: 1, y: 0, duration: .6, ease: 'expo.out' });
          gsap.from(cards.filter((c) => !c.classList.contains('is-hidden')), { y: 40, autoAlpha: 0, duration: .9, ease: 'expo.out', stagger: .06 });
        },
      });
    }));

    const mod = $('.pmod');
    let open = -1;
    const visible = () => cards.filter((c) => !c.classList.contains('is-hidden'));
    const fill = (c) => {
      $('.pmod__img img').src = c.dataset.img;
      $('.pmod__img img').alt = c.dataset.title;
      $('.pmod__kicker').textContent = c.dataset.kicker;
      $('.pmod__title').textContent = c.dataset.title;
      $('.pmod__text').textContent = c.dataset.text;
      $('#pmLuogo').textContent = c.dataset.luogo;
      $('#pmCat').textContent = c.dataset.cats;
      $('#pmTipo').textContent = c.dataset.tipo;
    };
    const openCard = (c) => {
      fill(c);
      open = visible().indexOf(c);
      if (lenis) lenis.stop();
      gsap.timeline()
        .set(mod, { visibility: 'visible' })
        .fromTo(mod, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .9, ease: 'expo.inOut' })
        .fromTo('.pmod__img img', { scale: 1.25 }, { scale: 1, duration: 1.4, ease: 'expo.out' }, '<.2')
        .from('.pmod__body > *', { y: 30, autoAlpha: 0, duration: .9, ease: 'expo.out', stagger: .06 }, '<.2');
    };
    const closeMod = () => {
      gsap.to(mod, { clipPath: 'inset(0 0 100% 0)', duration: .8, ease: 'expo.inOut', onComplete: () => { gsap.set(mod, { visibility: 'hidden' }); if (lenis) lenis.start(); } });
      open = -1;
    };
    const step = (d) => {
      const v = visible();
      const c = v[(open + d + v.length) % v.length];
      open = v.indexOf(c);
      gsap.timeline()
        .to(['.pmod__img img', '.pmod__body > *:not(.pmod__close):not(.pmod__nav)'], { autoAlpha: 0, x: -20 * d, duration: .3, ease: 'power2.in' })
        .add(() => fill(c))
        .fromTo(['.pmod__img img', '.pmod__body > *:not(.pmod__close):not(.pmod__nav)'], { autoAlpha: 0, x: 30 * d }, { autoAlpha: 1, x: 0, duration: .8, ease: 'expo.out', stagger: .04 });
    };
    cards.forEach((c) => c.addEventListener('click', () => openCard(c)));
    $('.pmod__close').addEventListener('click', closeMod);
    $('#pmPrev').addEventListener('click', () => step(-1));
    $('#pmNext').addEventListener('click', () => step(1));
    addEventListener('keydown', (e) => {
      if (open < 0) return;
      if (e.key === 'Escape') closeMod();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
  }

  // CONTATTI — modulo
  const form = $('#contactForm');
  if (form) {
    const q = new URLSearchParams(location.search).get('oggetto');
    if (q) form.oggetto.value = q;
    const msg = $('.form__ok');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const btn = form.querySelector('button[type=submit] span');
      btn.textContent = 'Invio in corso…';
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() })
        .then((r) => { if (!r.ok) throw new Error(r.status); msg.textContent = 'Grazie! Ti risponderemo al più presto per fissare un primo confronto.'; form.reset(); })
        .catch(() => { msg.textContent = 'Invio non riuscito. Scrivici su WhatsApp o chiamaci al 348 929 1092.'; })
        .finally(() => { btn.textContent = 'Invia richiesta'; gsap.from(msg, { y: 10, autoAlpha: 0, duration: .6, ease: 'expo.out' }); });
    });
    gsap.from('.form > *', { y: 24, autoAlpha: 0, duration: .9, ease: 'expo.out', stagger: .05, delay: .6 });
    gsap.from('.cinfo', { x: -24, autoAlpha: 0, duration: .9, ease: 'expo.out', stagger: .07, delay: .5 });
  }

  /* ---------- FOOTER / progress ---------- */
  gsap.from('.footer__mark', { autoAlpha: 0, y: 30, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.footer', start: 'top 85%' } });
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
