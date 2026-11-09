/* ============================================================
   PROSPETTO — Villa moderna (Atelier di Architettura)
   Ricalcato in coordinate pixel sul render di progetto render-03.jpg
   (1440 × 959): il disegno combacia con la foto.
   window.buildElevation(svg, { labels }) → popola un <svg>.
   ============================================================ */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n);
    return n;
  }

  // sottolinea della copertura (falda) — y in funzione di x
  const roofUnder = (x) => 200 + (x - 267) * (25 / 465);

  function build(svg, opts = {}) {
    svg.setAttribute('viewBox', '0 0 1440 959');
    svg.innerHTML = '';
    const G = {};
    const group = (name) => (G[name] = el('g', { class: 'g-' + name }, svg));
    const line = (g, x1, y1, x2, y2, cls = '') => el('line', { x1, y1, x2, y2, class: cls, pathLength: 1 }, g);
    const poly = (g, pts, cls = '', closed = false) => el(closed ? 'polygon' : 'polyline', { points: pts, class: cls, pathLength: 1 }, g);
    const rect = (g, x, y, w, h, cls = '') => el('rect', { x, y, width: w, height: h, class: cls, pathLength: 1 }, g);

    /* 1 — linea di terra */
    const ground = group('ground');
    line(ground, 20, 539, 1420, 539, 's-main');
    for (let x = 34; x < 1410; x += 14) line(ground, x, 542, x - 10, 554, 's-hatch');

    /* 2 — alberi e contesto (entourage) */
    const ctx = group('ctx');
    line(ctx, 100, 539, 100, 205, 's-thin');
    el('circle', { cx: 92, cy: 168, r: 62, class: 's-thin', pathLength: 1 }, ctx);
    el('circle', { cx: 60, cy: 120, r: 38, class: 's-thin', pathLength: 1 }, ctx);
    line(ctx, 1121, 539, 1121, 170, 's-thin');
    line(ctx, 1184, 539, 1184, 120, 's-thin');
    el('circle', { cx: 1110, cy: 120, r: 92, class: 's-thin', pathLength: 1 }, ctx);
    el('circle', { cx: 1230, cy: 70, r: 84, class: 's-thin', pathLength: 1 }, ctx);
    poly(ctx, '1042,539 1042,458 1420,458', 's-thin'); // siepe
    for (let x = 1052; x < 1410; x += 16) line(ctx, x, 464, x + 10, 482, 's-hatch');

    /* 3 — struttura */
    const st = group('struct');
    poly(st, '388,539 388,366 941,366 941,539', 's-main');              // piano terra
    line(st, 267, 391, 267, 539, 's-main');                              // fondo portico
    poly(st, '89,366 235,391 388,391', 's-thin');                        // intradosso portico
    rect(st, 234, 382, 24, 157, 's-main');                               // pilastro
    rect(st, 89, 337, 900, 29, 's-main');                                // solaio / pensilina
    poly(st, '941,382 989,366', 's-thin');
    line(st, 267, 200, 267, 337, 's-main');                              // piano primo
    line(st, 732, 225, 732, 337, 's-main');
    line(st, 748, 227, 748, 337, 's-main');
    poly(st, '162,150 748,202 748,227 267,200 162,174', 's-main', true); // copertura a falda
    line(st, 267, 319, 732, 319, 's-thin');                              // parapetto

    /* 4 — rivestimento in doghe di legno */
    const hatch = group('hatch');
    for (let x = 274; x < 730; x += 8) line(hatch, x, roofUnder(x) + 3, x, 335, 's-hatch');

    /* 5 — aperture (riempite: coprono le doghe) */
    const op = group('open');
    const win = (x, y, w, h, mx, ty) => {
      rect(op, x, y, w, h, 's-main fill-paper');
      rect(op, x + 4, y + 4, w - 8, h - 8, 's-thin fill-none');
      if (mx) line(op, mx, y + 4, mx, y + h - 4, 's-thin');
      if (ty) line(op, x + 4, ty, x + w - 4, ty, 's-thin');
    };
    win(384, 265, 40, 39);
    win(465, 265, 39, 39);
    win(586, 265, 86, 72, 629, 292);
    win(474, 411, 105, 64, 505);
    win(658, 411, 48, 64);
    win(772, 411, 95, 126, 819);
    rect(op, 749, 412, 6, 10, 's-thin fill-ink');                       // applique

    /* 6 — quote e livelli */
    const dim = group('dims');
    const tick = (x, y) => line(dim, x - 6, y + 6, x + 6, y - 6, 's-dim');
    [89, 388, 941, 989].forEach((x) => line(dim, x, 550, x, 596, 's-dim'));
    line(dim, 79, 572, 951, 572, 's-dim'); [89, 388, 941].forEach((x) => tick(x, 572));
    line(dim, 79, 590, 999, 590, 's-dim'); [89, 989].forEach((x) => tick(x, 590));
    // livelli
    [[539, '±0.00  P.T.'], [337, 'P.1'], [150, 'COPERTURA']].forEach(([y, t]) => {
      line(dim, 1000, y, 1048, y, 's-dim');
      poly(dim, `1052,${y} 1062,${y - 12} 1042,${y - 12}`, 's-dim', true);
      if (opts.labels) el('text', { x: 1070, y: y - 2, class: 't-mono' }, dim).textContent = t;
    });

    /* 7 — testi di tavola */
    if (opts.labels) {
      const tx = group('text');
      el('text', { x: 89, y: 650, class: 't-title' }, tx).textContent = 'Prospetto principale';
      el('text', { x: 89, y: 676, class: 't-mono' }, tx).textContent = 'VILLA MODERNA — RESIDENZIALE · ATELIER DI ARCHITETTURA';
      // scala grafica
      for (let i = 0; i < 5; i++) rect(tx, 89 + i * 40, 700, 40, 8, i % 2 ? 's-thin fill-paper' : 's-thin fill-ink');
      el('text', { x: 300, y: 708, class: 't-mono' }, tx).textContent = 'SCALA GRAFICA';
    }

    return G;
  }

  window.buildElevation = build;
})();
