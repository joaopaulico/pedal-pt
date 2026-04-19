/* pedal.pt — enhancements
 *
 * Drop-in script. Detects page type by URL and DOM and applies:
 *   - /rotas/<slug>    : dark/satellite/terrain layer switcher, fullscreen,
 *                        GPX download, scale bar, start/end markers,
 *                        elevation hover ↔ map cursor, polyline reveal.
 *   - /                : "live strip" row below the hero video with the three
 *                        most recent pieces of content.
 *   - /blog/<slug>
 *     /rotas/<slug>
 *     /gear/<slug>     : reading progress bar + floating TOC + save-for-later.
 *
 * The only external dependency is Leaflet, which the route pages already load.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Config — update this list when you publish new content.
  // Cards on the homepage live strip read from here; order matters, newest
  // first. Each entry picks up an accent colour from the existing palette.
  // ---------------------------------------------------------------------
  const LIVE_STRIP_ITEMS = [
    {
      kind: 'Última rota',
      title: 'Alcabideche, Serra e Mar',
      href: '/rotas/alcabideche-serra-mar/',
      meta: ['36.7 km', '780m ↑', 'Gravel'],
      accent: '#44b687',
      icon: 'route',
    },
    {
      kind: 'Último review',
      title: 'Melhores capacetes de 2026',
      href: '/gear/melhores-capacetes-2026/',
      meta: ['Gear', 'Comparativo'],
      accent: '#d4a843',
      icon: 'gear',
    },
    {
      kind: 'Próximo artigo',
      title: 'Douro em 3 dias: bikepacking',
      href: '/blog/',
      meta: ['Em preparação', 'Maio 2026'],
      accent: '#2c5f7c',
      icon: 'compass',
    },
  ];

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts); }
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
        else if (k === 'dataset') Object.assign(node.dataset, attrs[k]);
        else if (k in node) node[k] = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (children) (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  // Run AFTER DOMContentLoaded handlers registered by the page. Using a
  // zero-timeout on the DCL listener pushes us to the next task, which is
  // enough to let the page's own "create the map" handler finish first.
  function whenReady(fn) {
    function deferred() { setTimeout(fn, 0); }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', deferred);
    } else {
      deferred();
    }
  }

  function iconSvg(name) {
    const d = {
      route:   'M4 12h4l3-7 4 14 3-7h4',
      gear:    'M12 8a4 4 0 110 8 4 4 0 010-8zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9 1.65 1.65 0 004.27 7.18l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
      compass: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v4m0 12v4m10-10h-4M6 12H2m14.24-6.24l-2.83 2.83M8.59 15.41l-2.83 2.83m0-12.48l2.83 2.83m6.82 6.82l2.83 2.83',
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d[name] || '');
    svg.appendChild(path);
    return svg;
  }

  // =====================================================================
  // 1. ROUTE MAP ENHANCEMENTS
  // =====================================================================
  function enhanceRouteMap() {
    const mapDiv = $('#map');
    if (!mapDiv || !window.L) return;

    // Wait for the page's own DOMContentLoaded handler to finish building
    // the map, then find the instance in our registry.
    let tries = 0;
    (function poll() {
      tries++;
      const paneReady = mapDiv.querySelector('.leaflet-map-pane');
      const map = findLeafletMap(mapDiv);
      if ((!paneReady || !map) && tries < 60) return setTimeout(poll, 80);
      if (!map) return;

      wireToolbar(mapDiv, map);
      addMarkers(mapDiv, map);
      animateRoute(mapDiv);
      bindElevationCursor(map);
    })();
  }

  function findLeafletMap(div) {
    // Prefer the container hook set by our wrapped factory.
    if (div && div._leaflet_map) return div._leaflet_map;
    const registry = window.__pedalLeafletMaps || [];
    for (const m of registry) {
      if (m && m._container === div) return m;
    }
    return null;
  }

  // Wrap the L.map() factory once so we capture any map the page creates.
  // We intentionally do NOT touch L.Map the class — subclassing breaks some
  // internal `instanceof` checks. Overriding the factory is enough because
  // every route page uses L.map(...) to instantiate.
  function installMapRegistry() {
    if (!window.L) return false;
    if (window.__pedalLeafletHooked) return true;
    window.__pedalLeafletHooked = true;
    window.__pedalLeafletMaps = window.__pedalLeafletMaps || [];
    const origFactory = window.L.map;
    window.L.map = function (id, opts) {
      const m = origFactory.apply(this, arguments);
      try {
        window.__pedalLeafletMaps.push(m);
        if (m && m._container) m._container._leaflet_map = m;
      } catch (e) {}
      return m;
    };
    return true;
  }

  // Poll for Leaflet until it shows up (loaded via sync <script> in body).
  // We call this synchronously at script start and keep trying until the
  // deadline. Once L is available we hook the factory immediately.
  function waitForLeaflet(deadlineMs) {
    if (installMapRegistry()) return;
    const start = Date.now();
    const id = setInterval(function () {
      if (installMapRegistry() || Date.now() - start > deadlineMs) {
        clearInterval(id);
      }
    }, 20);
  }

  function wireToolbar(mapDiv, map) {
    // Ensure the map container can host absolutely-positioned children.
    const cs = getComputedStyle(mapDiv);
    if (cs.position === 'static') mapDiv.style.position = 'relative';

    const toolbar = el('div', { className: 'pedal-map-toolbar' });

    // Layer switcher
    const layers = {
      Dark:      L.tileLayer('https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                   { attribution: '&copy; OSM · CARTO', maxZoom: 19 }),
      Streets:   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                   { attribution: '&copy; OSM', maxZoom: 19 }),
      Satélite:  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                   { attribution: 'Tiles &copy; Esri', maxZoom: 19 }),
      Relevo:    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                   { attribution: '&copy; OpenTopoMap', maxZoom: 17 }),
    };

    // Dark is the current layer; we don't add it again (it's already there).
    // Instead, on switch we replace the active tile layer.
    let activeKey = 'Dark';
    const select = el('select', { 'aria-label': 'Tipo de mapa' });
    Object.keys(layers).forEach(function (k) {
      select.appendChild(el('option', { value: k, selected: k === 'Dark' }, k));
    });
    on(select, 'change', function () {
      // Remove every tile layer currently on the map
      map.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer) map.removeLayer(layer);
      });
      activeKey = select.value;
      layers[activeKey].addTo(map);
    });

    // Fullscreen
    const fsBtn = el('button', { type: 'button' }, 'Ecrã inteiro');
    on(fsBtn, 'click', function () {
      mapDiv.classList.toggle('pedal-map-fullscreen');
      const isFs = mapDiv.classList.contains('pedal-map-fullscreen');
      fsBtn.textContent = isFs ? 'Fechar' : 'Ecrã inteiro';
      // Leaflet needs a size hint after resize.
      setTimeout(function () { map.invalidateSize(); }, 50);
    });

    // GPX download — infer from URL
    const slug = (location.pathname.match(/\/rotas\/([^/]+)/) || [])[1];
    if (slug) {
      const dl = el('a', {
        href: '/gpx/' + slug + '.gpx',
        download: slug + '.gpx',
      }, 'Descarregar GPX');
      dl.className = 'pedal-primary';
      dl.style.cssText = [
        'background:#269b6c',
        'color:#fff',
        'border:1px solid #44b687',
        'padding:8px 12px',
        'border-radius:8px',
        'font-size:11px',
        'letter-spacing:0.05em',
        'text-transform:uppercase',
        'font-weight:500',
        'text-decoration:none',
        'text-align:center',
        'min-width:130px',
        'font-family:Inter,system-ui,sans-serif',
      ].join(';');
      toolbar.appendChild(dl);
    }

    toolbar.appendChild(select);
    toolbar.appendChild(fsBtn);
    mapDiv.appendChild(toolbar);

    // Scale bar (metric)
    L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map);
  }

  function addMarkers(mapDiv, map) {
    // Find the first polyline on the map to extract start/end.
    let poly = null;
    map.eachLayer(function (layer) { if (layer instanceof L.Polyline && !poly) poly = layer; });
    if (!poly) return;
    const latlngs = poly.getLatLngs();
    if (!latlngs || !latlngs.length) return;
    const start = latlngs[0];
    const end = latlngs[latlngs.length - 1];

    function divIcon(cls, label) {
      return L.divIcon({
        className: '',
        html: '<div class="pedal-marker ' + cls + '">' + label + '</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
    }
    L.marker(start, { icon: divIcon('pedal-marker-start', 'A') })
      .bindPopup('<strong>Início</strong>').addTo(map);
    L.marker(end, { icon: divIcon('pedal-marker-end', 'B') })
      .bindPopup('<strong>Fim</strong>').addTo(map);

    window.__pedalRoutePoly = poly;
    window.__pedalRouteLatlngs = latlngs;
  }

  function animateRoute(mapDiv) {
    // Leaflet renders polylines as SVG paths in the overlay pane.
    const paths = mapDiv.querySelectorAll('.leaflet-overlay-pane path');
    paths.forEach(function (p) {
      try {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        p.style.animation = 'pedal-draw 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards';
      } catch (e) {}
    });
  }

  function bindElevationCursor(map) {
    const svg = $('#elevationProfile');
    if (!svg) return;
    const latlngs = window.__pedalRouteLatlngs;
    if (!latlngs) return;

    // Read PROFILE array from the page's own script. We stored none, so we
    // reconstruct by mapping pointer x → index along latlngs.
    const viewBoxAttr = svg.getAttribute('viewBox') || '0 0 1200 300';
    const [vbX, vbY, vbW, vbH] = viewBoxAttr.split(/\s+/).map(Number);

    // Add a crosshair line + dot inside the svg.
    const NS = 'http://www.w3.org/2000/svg';
    const cursor = document.createElementNS(NS, 'line');
    cursor.setAttribute('y1', vbY);
    cursor.setAttribute('y2', vbY + vbH);
    cursor.setAttribute('class', 'pedal-elev-cursor');
    svg.appendChild(cursor);

    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', 5);
    dot.setAttribute('class', 'pedal-elev-dot');
    svg.appendChild(dot);

    // Find the path inside the svg (the filled area).
    const path = svg.querySelector('path');
    // Marker on the map that follows the cursor.
    const routeCursorEl = el('div', { className: 'pedal-route-cursor' });
    const routeCursor = L.marker(latlngs[0], {
      icon: L.divIcon({
        className: '',
        html: routeCursorEl.outerHTML,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
      interactive: false,
      opacity: 0,
    }).addTo(map);

    function show(visible) {
      cursor.classList.toggle('visible', visible);
      dot.classList.toggle('visible', visible);
      routeCursor.setOpacity(visible ? 1 : 0);
    }

    function onMove(ev) {
      const rect = svg.getBoundingClientRect();
      const px = (ev.clientX - rect.left) / rect.width;
      if (px < 0 || px > 1) { show(false); return; }
      const xSvg = vbX + px * vbW;
      cursor.setAttribute('x1', xSvg);
      cursor.setAttribute('x2', xSvg);

      // Sample the path at this x.
      let y = vbY + vbH;
      if (path && path.getTotalLength) {
        const len = path.getTotalLength();
        // Binary search for the point whose X matches.
        let lo = 0, hi = len, mid;
        for (let i = 0; i < 14; i++) {
          mid = (lo + hi) / 2;
          const p = path.getPointAtLength(mid);
          if (p.x < xSvg) lo = mid; else hi = mid;
        }
        const p = path.getPointAtLength((lo + hi) / 2);
        y = p.y;
      }
      dot.setAttribute('cx', xSvg);
      dot.setAttribute('cy', y);

      // Match index along latlngs.
      const idx = Math.round(px * (latlngs.length - 1));
      routeCursor.setLatLng(latlngs[Math.max(0, Math.min(latlngs.length - 1, idx))]);

      show(true);
    }

    on(svg, 'pointermove', onMove);
    on(svg, 'pointerleave', function () { show(false); });
  }

  // =====================================================================
  // 2. HOMEPAGE LIVE STRIP
  // =====================================================================
  function injectLiveStrip() {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    // Skip if already present (hot reload, etc.)
    if (document.querySelector('.pedal-live-strip')) return;

    // Insert the strip right after the hero section — we find the first
    // <section> inside <main> and append ourselves after it.
    const main = document.querySelector('main');
    if (!main) return;
    const firstSection = main.querySelector('section');
    if (!firstSection) return;

    const strip = el('section', { className: 'pedal-live-strip' }, [
      el('div', { className: 'pedal-live-inner' }, [
        el('div', { className: 'pedal-live-label' }, [
          el('span', { className: 'pedal-live-dot' }),
          'Em directo · últimas publicações',
        ]),
        buildLiveGrid(),
      ]),
    ]);

    firstSection.insertAdjacentElement('afterend', strip);

    // Reveal on scroll
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) strip.classList.add('pedal-visible'); });
    }, { threshold: 0.15 });
    io.observe(strip);
  }

  function buildLiveGrid() {
    const grid = el('div', { className: 'pedal-live-grid' });
    LIVE_STRIP_ITEMS.forEach(function (item) {
      const card = el('a', {
        className: 'pedal-live-card',
        href: item.href,
        style: { '--pedal-card-accent': item.accent },
      });
      card.style.setProperty('--pedal-card-accent', item.accent);

      const kicker = el('span', { className: 'pedal-live-kicker' }, [
        iconSvg(item.icon),
        item.kind,
      ]);
      const title = el('h3', { className: 'pedal-live-title' }, item.title);
      const meta = el('div', { className: 'pedal-live-meta' },
        item.meta.map(function (m) { return el('span', {}, m); }));

      card.appendChild(kicker);
      card.appendChild(title);
      card.appendChild(meta);
      grid.appendChild(card);
    });
    return grid;
  }

  // =====================================================================
  // 3. READING UX — progress bar + TOC + save-for-later
  // =====================================================================
  function enhanceArticle() {
    // Eligible: /blog/<slug> and /gear/<slug> (gear reviews). Routes also
    // benefit from the progress bar. We skip index pages and the homepage.
    const p = location.pathname;
    const isArticle =
      /^\/blog\/[^/]+\/?$/.test(p) ||
      /^\/gear\/[^/]+\/?$/.test(p) ||
      /^\/rotas\/[^/]+\/?$/.test(p);
    if (!isArticle) return;

    addProgressBar();
    addTOC();
    addSaveButton();
  }

  function addProgressBar() {
    const bar = el('div', { className: 'pedal-reading-progress' },
      el('div', { className: 'pedal-reading-progress-bar' }));
    document.body.appendChild(bar);
    const inner = bar.firstElementChild;

    function update() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      inner.style.width = pct + '%';
    }
    update();
    on(window, 'scroll', update, { passive: true });
    on(window, 'resize', update);
  }

  function addTOC() {
    // Look for H2s in the article flow. We scope to <main> so the header
    // isn't included.
    const main = document.querySelector('main');
    if (!main) return;
    const headings = Array.from(main.querySelectorAll('h2, h3'));
    if (headings.length < 3) return; // not worth a TOC

    // Ensure each heading has an id we can link to.
    headings.forEach(function (h, i) {
      if (!h.id) {
        const slug = (h.textContent || '')
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        h.id = slug || 'sec-' + i;
      }
    });

    const darkTheme = main.matches('.dark') ||
                      getComputedStyle(main).backgroundColor === 'rgb(28, 28, 28)' ||
                      document.body.matches('[data-theme="dark"]');

    const toc = el('aside', { className: 'pedal-toc' });
    if (darkTheme) toc.dataset.theme = 'dark';
    toc.appendChild(el('p', { className: 'pedal-toc-label' }, 'Nesta página'));

    const list = el('ol', { className: 'pedal-toc-list' });
    headings.forEach(function (h) {
      const li = el('li');
      const a = el('a', { href: '#' + h.id }, h.textContent.trim());
      if (h.tagName === 'H3') a.style.paddingLeft = '28px';
      li.appendChild(a);
      list.appendChild(li);
    });
    toc.appendChild(list);
    document.body.appendChild(toc);

    // Reveal the TOC once the reader has scrolled past the article title.
    const titleH1 = main.querySelector('h1');
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        toc.classList.toggle('pedal-visible', !e.isIntersecting);
      });
    }, { rootMargin: '0px 0px -80% 0px' });
    if (titleH1) io.observe(titleH1); else toc.classList.add('pedal-visible');

    // Highlight the section the user is reading.
    const links = Array.from(list.querySelectorAll('a'));
    const byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

    const spyIO = new IntersectionObserver(function (entries) {
      // Choose the topmost visible heading.
      const active = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; })[0];
      if (!active) return;
      links.forEach(function (l) { l.classList.remove('pedal-active'); });
      const a = byId[active.target.id];
      if (a) a.classList.add('pedal-active');
    }, { rootMargin: '-100px 0px -60% 0px', threshold: [0, 1] });
    headings.forEach(function (h) { spyIO.observe(h); });
  }

  function addSaveButton() {
    const key = 'pedal:saved';
    const path = location.pathname;
    const btn = el('button', { className: 'pedal-save', type: 'button', 'aria-label': 'Guardar para mais tarde' });
    btn.appendChild(iconSvg_bookmark());
    const label = el('span', {}, 'Guardar');
    btn.appendChild(label);
    document.body.appendChild(btn);

    function read() {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
    }
    function write(list) { localStorage.setItem(key, JSON.stringify(list)); }

    function render() {
      const list = read();
      const has = list.includes(path);
      btn.classList.toggle('pedal-saved', has);
      label.textContent = has ? 'Guardado' : 'Guardar';
    }
    render();

    on(btn, 'click', function () {
      let list = read();
      if (list.includes(path)) list = list.filter(function (x) { return x !== path; });
      else list.push(path);
      write(list);
      render();
    });

    // Reveal after a small scroll so the reader knows it's an action.
    function reveal() {
      if (window.scrollY > 400) btn.classList.add('pedal-visible');
    }
    reveal();
    on(window, 'scroll', reveal, { passive: true });
  }

  function iconSvg_bookmark() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  // =====================================================================
  // Bootstrap
  // =====================================================================
  // Hook the Leaflet factory as early as possible so we capture any map
  // the page creates. Leaflet is loaded via a sync <script> later in the
  // body, so we poll for it briefly.
  waitForLeaflet(4000);

  whenReady(function () {
    enhanceRouteMap();
    injectLiveStrip();
    enhanceArticle();
  });
})();
