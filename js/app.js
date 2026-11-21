/* Cifrados de Alabanza — sitio estático (sin servidor).
   Las canciones vienen de data/canciones.json y la configuración de data/config.json
   (se editan con Pages CMS: https://app.pagescms.org). Los PDF se muestran con pdf.js (js/pdfjs).
   Rutas: #/  ·  #/cancion/<id>  ·  #/carpeta/<carpeta>  ·  #/info  */
(function () {
  'use strict';

  var CFG = {}, DATA = [], ARTS = {}, LOADED = false, LOAD_ERR = false;
  var LS_DARK = 'cifrados_oscuro';
  var app = document.getElementById('app');

  // ---------- utilidades ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }
  function byTitle(a, b) { return a.titulo.localeCompare(b.titulo, 'es'); }
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  // ---------- datos (data/canciones.json y data/config.json, editables con Pages CMS) ----------
  function pdfPath(p) {
    p = String(p || '').trim();
    if (!p || /^https?:/i.test(p)) return p;
    return p.replace(/^\/+/, '').replace(/^Cifrado\//i, '');   // rutas relativas: funcionan en jhonnatcc.github.io/Cifrado/
  }
  function prepare(list) {
    var seen = {};
    return (Array.isArray(list) ? list : []).filter(function (s) { return s && s.titulo; }).map(function (s) {
      var base = slug(s.titulo) || 'cancion', id = base, n = 2;
      while (seen[id]) id = base + '-' + n++;
      seen[id] = true;
      return {
        id: id, titulo: String(s.titulo).trim(), artista: String(s.artista || 'Sin carpeta').trim(),
        tono: s.tono || '', bpm: Number(s.bpm) || 0, compas: s.compas || '', acordes: s.acordes || '',
        formato: s.formato || 'Cifrado', nivel: s.nivel || 'Básico', paginas: Number(s.paginas) || 1,
        instrumentos: s.instrumentos || 'Piano', video: s.video || '', pdf: pdfPath(s.pdf)
      };
    });
  }
  function getJSON(url) { return fetch(url + '?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  var YT = '', CANAL = '', HERO_SVG = '';
  function load() {
    // Portada animada (SVG): se inserta dentro de la página para usar la tipografía y el modo oscuro
    fetch('img/teclado.svg').then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      if (t.indexOf('<svg') < 0) return;
      HERO_SVG = t.slice(t.indexOf('<svg'));
      var f = app.querySelector('.hero-img'); if (f && !f.classList.contains('hero-svg')) { f.className = 'hero-img hero-svg'; f.innerHTML = HERO_SVG; }
    }).catch(function () {});
    Promise.all([getJSON('data/canciones.json'), getJSON('data/config.json').catch(function () { return {}; }), getJSON('data/artistas.json').catch(function () { return []; })])
      .then(function (r) {
        DATA = prepare(r[0]); CFG = r[1] || {};
        (Array.isArray(r[2]) ? r[2] : []).forEach(function (a) { if (a && a.nombre && a.imagen) ARTS[norm(a.nombre)] = pdfPath(a.imagen); });
      })
      .catch(function () { LOAD_ERR = true; })
      .then(function () {
        YT = esc(CFG.youtubeUrl || 'https://www.youtube.com/'); CANAL = esc(CFG.canal || '');
        LOADED = true; render();
      });
  }

  var S = {
    dark: read(LS_DARK) === '1', filtro: 'todas', q: '', activa: '', intro: true
  };
  document.body.classList.toggle('dark', S.dark);

  function folders() {
    var g = {};
    DATA.forEach(function (s) { (g[s.artista] = g[s.artista] || []).push(s); });
    return Object.keys(g).map(function (name) {
      var list = g[name];
      var keys = []; list.forEach(function (s) { if (keys.indexOf(s.tono) < 0) keys.push(s.tono); });
      return { name: name, slug: slug(name), list: list, count: list.length, keys: keys.join(' · '), mono: initials(name), img: ARTS[norm(name)] || '',
        cif: list.filter(function (s) { return s.formato === 'Cifrado'; }).length,
        par: list.filter(function (s) { return s.formato === 'Partitura'; }).length };
    }).sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name, 'es'); });
  }
  function initials(name) {
    var w = name.replace(/[^A-Za-zÀ-ÿ\s]/g, ' ').split(/\s+/).filter(function (p) { return p && !/^(de|la|el|los|las|y|en)$/i.test(p); });
    return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
  }
  function matches(s, q) { return !q || norm(s.titulo).indexOf(q) >= 0 || norm(s.artista).indexOf(q) >= 0; }

  // ---------- vista previa de la hoja (acordes generados según el tono) ----------
  var VIS = {};
  function scale(key) {
    var sharp = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'], flat = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
    var i = sharp.indexOf(key); if (i < 0) i = flat.indexOf(key); if (i < 0) i = 7;
    var names = (key.indexOf('b') > 0 || key === 'F') ? flat : sharp;
    return [0, 2, 4, 5, 7, 9].map(function (st, k) { return names[(i + st) % 12] + ['', 'm', 'm', '', '', 'm'][k]; });
  }
  function vis(s) {
    var ck = s.id + '|' + s.tono + '|' + s.formato;
    if (VIS[ck]) return VIS[ck];
    var pats = [[0,3,0,4],[0,5,3,4],[3,0,4,0],[5,3,0,4],[0,3,4,0],[1,4,0,0],[0,4,5,3]];
    var seed = 0; for (var c = 0; c < s.id.length; c++) seed = (seed * 31 + s.id.charCodeAt(c)) % 100000;
    var x = seed * 7919 + 17; function r() { x = (x * 9301 + 49297) % 233280; return x / 233280; }
    var sc = scale(s.tono);
    function line(k, w) { return pats[(seed + k) % pats.length].map(function (d) { return sc[d].padEnd(w, ' '); }).join('').replace(/\s+$/, ''); }
    function lines(n) { var a = []; for (var k = 0; k < n; k++) a.push({ ch: line(k, 6), w: Math.round(58 + r() * 40) + '%' }); return a; }
    function staves(n) { var a = []; for (var k = 0; k < n; k++) { var notes = []; for (var j = 0; j < 8; j++) notes.push({ l: 4 + j * 12, st: Math.floor(r() * 9) }); a.push({ ch: line(k, 12), notes: notes }); } return a; }
    return (VIS[ck] = { lines: lines(7), linesL: lines(10), staves: staves(5), stavesL: staves(6) });
  }
  function sheet(s, big) {
    var v = vis(s), h = '';
    h += '<div class="sheet ' + (big ? 'lg' : 'sm') + '" aria-hidden="true">';
    h += '<div class="t"><div>' + esc(s.titulo) + '</div><span>' + esc(big ? s.formato : s.tono) + '</span></div>';
    h += '<div class="s">' + esc(s.artista) + ' · ' + (big ? 'Tono ' + esc(s.tono) + ' · ' : '') + esc(s.bpm) + ' bpm · ' + esc(s.compas) + '</div>';
    if (s.formato === 'Partitura') {
      var gap = big ? 8 : 4;
      (big ? v.stavesL : v.staves).forEach(function (st) {
        h += '<div class="stv"><div class="ch">' + esc(st.ch) + '</div><div class="staff">';
        for (var k = 0; k < 5; k++) h += '<i style="top:' + (k * gap) + 'px"></i>';
        st.notes.forEach(function (n) { h += '<b style="left:' + n.l + '%;top:' + (n.st * gap / 2 - gap / 2) + 'px"></b>'; });
        h += '</div></div>';
      });
    } else {
      (big ? v.linesL : v.lines).forEach(function (l) { h += '<div class="ln"><div class="ch">' + esc(l.ch) + '</div><div class="bar" style="width:' + l.w + '"></div></div>'; });
    }
    return h + '</div>';
  }

  // ---------- íconos ----------
  var I = {
    play: function (fill, w, h) { return '<svg width="' + (w || 10) + '" height="' + (h || 12) + '" viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0 L10 6 L0 12 Z" fill="' + fill + '"/></svg>'; },
    search: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 L21 21"/></svg>',
    down: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6 1 V8 M3 5.5 L6 8.5 L9 5.5 M1.5 11 H10.5"/></svg>',
    arrow: '<svg width="58" height="58" viewBox="0 0 58 58" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M3 55 L55 3"/><path d="M14 3 H55 V44"/></svg>',
    file: '<svg width="22" height="26" viewBox="0 0 22 26" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M1 1 H14 L21 8 V25 H1 Z"/><path d="M14 1 V8 H21"/><path d="M11 12 V20 M7.5 16 L11 12 L14.5 16"/></svg>'
  };

  // ---------- rutas ----------
  function route() {
    var p = (location.hash || '#/').replace(/^#\/?/, '').split('/');
    return { view: p[0] || 'inicio', id: decodeURIComponent(p[1] || '') };
  }

  // ---------- partes comunes ----------
  function header(r) {
    var info = r.view === 'info';
    return '<header class="' + (S.intro ? 'intro' : '') + '">' +
      '<div class="giant"><a href="#/" aria-label="Cifrados — inicio">C<span class="rest">IFRADOS</span></a><a href="#/" aria-label="Alabanza — inicio">A<span class="rest">LABANZA</span></a></div>' +
      '<div class="meta">' +
        '<div><div>Cifrados y partituras</div><div class="muted">Piano · alabanza cristiana</div></div>' +
        '<nav aria-label="Principal"><a href="#/"' + (info ? ' class="muted"' : '') + '>Canciones</a><a href="#/info"' + (info ? '' : ' class="muted"') + '>Información</a></nav>' +
        '<div class="meta-pair"><div><div>Para pianistas que empiezan</div><div class="muted">Libre para ver y descargar</div></div>' +
          '<button class="toggle" data-act="dark" aria-pressed="' + S.dark + '"><span class="muted">Modo oscuro</span><span>( ' + (S.dark ? 'Y' : 'N') + ' )</span></button></div>' +
        '<div class="right"><a href="' + YT + '" target="_blank" rel="noopener">YouTube ↗</a><div class="muted">Suscríbete · ' + CANAL + '</div></div>' +
      '</div></header>';
  }
  function footer() {
    return '<footer class="foot">' +
      '<div><div class="muted">©</div><div>' + new Date().getFullYear() + '</div></div>' +
      '<div><div class="muted">Uso</div><div>Libre para iglesias</div></div>' +
      '<div><div class="muted">Canal</div><a href="' + YT + '" target="_blank" rel="noopener">' + CANAL + ' ↗</a></div>' +
      '<div class="end"><button data-act="top" style="text-align:right"><span class="muted">Volver</span><br>Arriba ↑</button></div>' +
      '</footer>';
  }
  function card(s) {
    return '<a class="card" href="#/cancion/' + encodeURIComponent(s.id) + '" aria-label="Abrir ' + esc(s.titulo) + ' de ' + esc(s.artista) + '">' +
      '<div class="head"><div><div>' + esc(s.titulo) + '</div><div class="muted small">' + esc(s.artista) + ' · ' + esc(s.tono) + ' · ' + esc(s.bpm) + ' bpm</div></div>' +
      '<div class="muted small monof">' + (s.formato === 'Cifrado' ? 'CIF' : 'PART') + '</div></div>' +
      '<div class="thumb"' + (s.pdf ? ' data-pdf="' + esc(s.pdf) + '"' : '') + '>' + sheet(s, false) + '</div></a>';
  }

  // ---------- INICIO ----------
  var FILTROS = [
    { id: 'todas', label: 'Todas', t: function () { return true; } },
    { id: 'empezar', label: 'Para empezar', t: function (s) { return s.nivel === 'Básico'; } },
    { id: 'cif', label: 'Cifrados', t: function (s) { return s.formato === 'Cifrado'; } },
    { id: 'par', label: 'Partituras', t: function (s) { return s.formato === 'Partitura'; } },
    { id: 'lentas', label: 'Lentas', t: function (s) { return s.bpm < 80; } },
    { id: 'movidas', label: 'Movidas', t: function (s) { return s.bpm >= 96; } }
  ];
  function viewHome() {
    var q = norm(S.q), F = folders();
    var qs = DATA.filter(function (s) { return matches(s, q); });
    var shownF = q ? F.filter(function (f) { return norm(f.name).indexOf(q) >= 0 || f.list.some(function (s) { return matches(s, q); }); }) : F;
    var cur = FILTROS.filter(function (f) { return f.id === S.filtro; })[0] || FILTROS[0];
    var grid = qs.filter(cur.t);
    var summary = q ? plural(qs.length, 'canción', 'canciones') + ' y ' + plural(shownF.length, 'carpeta', 'carpetas') + ' coinciden con «' + esc(S.q.trim()) + '»'
                    : 'Prueba: ' + F.slice(0, 3).map(function (f) { return esc(f.name); }).join(', ');
    var h = '';

    h += '<section class="intro">' +
      (HERO_SVG ? '<figure class="hero-img hero-svg">' + HERO_SVG + '</figure>' :
      '<figure class="hero-img"><img src="img/portada.jpg" alt="Teclado de piano curvo con el título Cifrados de Alabanza y el Salmo 33:3: Cantadle cántico nuevo; hacedlo bien, tañendo con júbilo." onerror="this.parentNode.classList.add(\'vacia\')">' +
      '<figcaption class="small"><span>Imagen de portada</span><span class="muted">img/portada.jpg</span></figcaption></figure>') +
      '<div style="max-width:680px"><h1 class="lead">Acordes y partituras de canciones cristianas para pianistas que están empezando. Cada canción con su tonalidad, sus acordes y un video guía.</h1>' +
      '<p class="muted" style="margin:22px 0 0;max-width:470px">Escribo los arreglos que tocamos en el ministerio, pensados para piano y fáciles de seguir. Busca por canción o por cantante, revisa los acordes, descarga el PDF y practica con el video en YouTube.</p>' +
      '<div class="btns" style="margin-top:30px"><a class="btn btn-solid" href="#buscar" data-act="scroll">Buscar un cifrado ↓</a>' +
      '<a class="btn btn-line" href="' + YT + '" target="_blank" rel="noopener">' + I.play('#D7261E') + 'Suscribirse en YouTube</a></div></div></section>';

    h += '<section id="buscar" class="cols rule" aria-label="Buscar">' +
      '<div class="small"><div>Buscar</div><div class="muted">Canción, cantante o grupo</div></div>' +
      '<div class="search"><label for="q" class="sr">Buscar por canción, cantante o grupo</label>' +
      '<div class="search-bar">' + I.search + '<input id="q" type="search" autocomplete="off" placeholder="Busca por canción, cantante o grupo" value="' + esc(S.q) + '">' +
      (S.q ? '<button data-act="clear" class="small muted" style="min-height:34px">Limpiar ✕</button>' : '') + '</div>' +
      '<div class="small muted" style="padding-top:8px" id="sum">' + summary + '</div></div></section>';

    // Galería de carpetas
    var act = shownF.filter(function (f) { return f.name === S.activa; })[0] || shownF[0];
    var ai = act ? shownF.indexOf(act) : -1;
    h += '<section class="sec gal" aria-label="Cantantes y agrupaciones">' +
      '<div class="between rule small"><div><div>Carpetas</div><div class="muted">Cantantes y agrupaciones</div></div>' +
      '<div style="text-align:right"><div>' + plural(shownF.length, 'carpeta', 'carpetas') + '</div><div class="muted hint-desk">Pasa el cursor y abre una</div></div></div>' +
      '<div class="gal-title"><div><div>Cantantes</div><div class="l2"><span class="squares" aria-hidden="true"><i></i><i></i><i></i></span><span>y grupos</span><sup>Nº ' + pad(shownF.length) + '</sup><span class="slash">/.</span></div></div>' +
      '<div class="act"><span id="act-name">' + esc(act ? act.name.toUpperCase() : '') + '</span><sup id="act-pos">' + (act ? (ai + 1) + ' / ' + shownF.length : '') + '</sup></div></div>' +
      '<div class="gal-desc small muted"><div>Cada carpeta reúne los cifrados y partituras de un mismo cantante o grupo.</div><div id="act-desc">' + (act ? plural(act.count, 'canción', 'canciones') + ' · Tonos ' + esc(act.keys) : '') + '</div></div>' +
      '<div class="stage"><div class="ticks muted" aria-hidden="true"><span>—</span><span>—</span></div><div class="track-wrap"><div class="track">';
    shownF.forEach(function (f, i) {
      var href = '#/carpeta/' + encodeURIComponent(f.slug);
      h += '<div class="item' + (f === act ? ' on' : '') + (f.img ? ' has-img' : '') + '" data-name="' + esc(f.name) + '" data-i="' + i + '" data-count="' + f.count + '" data-keys="' + esc(f.keys) + '">' +
        '<a class="tile" href="' + href + '" aria-label="Abrir carpeta de ' + esc(f.name) + '">' + (f.img ? '<img class="tile-img" src="' + esc(f.img) + '" alt="" loading="lazy">' : '') + '<span class="top"><span>' + pad(i + 1) + '</span><span>' + f.count + ' PDF</span></span>' +
        '<span class="mono">' + esc(f.mono) + '</span><span class="nm">' + esc(f.name) + '</span></a>' +
        '<a class="arrow" href="' + href + '" tabindex="-1" aria-hidden="true">' + I.arrow + '<span>Ver carpeta</span></a></div>';
    });
    if (!shownF.length) h += '<div class="muted" style="align-self:center">Ninguna carpeta coincide con la búsqueda.</div>';
    h += '</div></div><div class="swipe-hint small muted" aria-hidden="true">Desliza para ver todas →</div><div class="ticks r muted"><span id="act-count">' + (act ? act.count : 0) + ' PDF</span><span>' + DATA.length + ' total</span></div></div>' +
      '<div class="between small gal-foot"><a id="act-open" href="' + (act ? '#/carpeta/' + encodeURIComponent(act.slug) : '#/') + '">Abrir ' + esc(act ? act.name : '') + ' →</a><span class="muted">Arreglos del ministerio de alabanza</span></div></section>';

    // Repertorio
    h += '<section id="canciones" class="sec" aria-label="Canciones">' +
      '<div class="between rule small rep-head"><div><div>Repertorio</div><div class="muted">' + grid.length + ' de ' + DATA.length + ' canciones</div></div>' +
      '<div class="filters" role="group" aria-label="Filtrar">' + FILTROS.map(function (f) {
        return '<button data-act="filtro" data-v="' + f.id + '" aria-pressed="' + (f.id === cur.id) + '">' + f.label + '<sup>' + qs.filter(f.t).length + '</sup></button>';
      }).join('') + '</div></div>';
    if (!grid.length) h += '<div style="padding:40px 0 20px;font-size:clamp(20px,1.8vw,26px);max-width:620px">No encontramos «' + esc(S.q) + '». <span class="muted">Prueba con otro nombre o escríbeme para pedir la canción.</span></div>';
    h += '<div class="grid">' + grid.map(card).join('') + '</div></section>';

    // Cómo usar
    var steps = [['Busca la canción', 'Escribe su nombre o el del cantante, o entra a la carpeta del grupo.'], ['Revisa tono y acordes', 'La ficha muestra la tonalidad, el tempo y los acordes que vas a necesitar en el piano.'], ['Descarga y practica', 'Baja el PDF y toca junto al video guía en piano del canal de YouTube.']];
    h += '<section class="cols rule small sec-lg steps"><div><div>Cómo usar</div><div class="muted">Tres pasos</div></div>' +
      steps.map(function (s, i) { return '<div><div class="monof muted" style="font-size:11px">0' + (i + 1) + '</div><div class="step-t">' + s[0] + '</div><div class="muted" style="max-width:260px">' + s[1] + '</div></div>'; }).join('') + '</section>';

    // YouTube
    var recent = DATA.slice().reverse().slice(0, 4);
    h += '<section class="yt" aria-label="Canal de YouTube"><div class="cols small"><div><div>YouTube</div><div class="muted">' + CANAL + '</div></div><div></div>' +
      '<div class="span2 yt-body"><h2 class="lead" style="max-width:640px">Cada canción tiene su video guía en piano. Suscríbete y aprende las nuevas antes del domingo.</h2>' +
      '<p class="muted" style="margin:20px 0 0;max-width:460px;font-size:13px">En cada video muestro los acordes en el teclado, despacio y paso a paso. Al suscribirte y activar la campana te llega el aviso, y el canal crece para llegar a más pianistas.</p>' +
      '<div class="btns" style="margin-top:30px"><a class="btn btn-red" style="min-height:48px;font-size:14px" href="' + YT + '" target="_blank" rel="noopener">' + I.play('#fff') + 'Suscribirse al canal</a>' +
      '<a class="btn btn-line" style="min-height:48px;font-size:14px" href="' + YT + '" target="_blank" rel="noopener">Ver todos los videos ↗</a></div>' +
      '<div class="muted yt-recent">Videos guía recientes</div>' +
      recent.map(function (s) { return '<a class="yt-row" href="#/cancion/' + encodeURIComponent(s.id) + '"><span>' + I.play('currentColor', 9, 11) + esc(s.titulo) + '</span><span class="muted">' + esc(s.artista) + ' · ' + esc(s.tono) + ' →</span></a>'; }).join('') +
      '</div></div></section>';
    return h;
  }

  // ---------- CARPETA ----------
  function viewFolder(id) {
    var f = folders().filter(function (x) { return x.slug === id; })[0];
    if (!f) return '<section style="padding:120px 0"><h1 class="lead">Esta carpeta no existe.</h1><p><a href="#/">← Volver al inicio</a></p></section>';
    return '<section style="padding-top:22px"><a href="#/" class="small muted" style="display:inline-flex;align-items:center;min-height:44px">← Todas las carpetas</a>' +
      '<div class="cols folder-head"><div class="small"><div>Carpeta</div><div class="muted">' + plural(f.count, 'canción', 'canciones') + '</div></div>' +
      (f.img ? '<div><img class="folder-img" src="' + esc(f.img) + '" alt="' + esc(f.name) + '"></div>' : '<div></div>') +
      '<div class="span2"><h1 style="font-size:clamp(40px,5.4vw,96px);line-height:.9;font-weight:500;letter-spacing:-0.045em">' + esc(f.name) + '</h1>' +
      '<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 28px;margin-top:22px"><div><span class="muted">Tonos </span>' + esc(f.keys) + '</div><div><span class="muted">Cifrados </span>' + f.cif + '</div><div><span class="muted">Partituras </span>' + f.par + '</div></div></div></div>' +
      '<div class="rule small rep-head"><div>Canciones</div><div class="muted">Ordenadas por título</div></div>' +
      '<div class="grid">' + f.list.slice().sort(byTitle).map(card).join('') + '</div></section>';
  }

  // ---------- FICHA ----------
  function ytId(url) { var m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/); return m ? m[1] : ''; }
  function viewSong(id) {
    var i = -1; DATA.forEach(function (s, k) { if (s.id === id) i = k; });
    if (i < 0) return '<section style="padding:120px 0"><h1 class="lead">No encontramos esta canción.</h1><p><a href="#/">← Volver al inicio</a></p></section>';
    var s = DATA[i], n = DATA.length, pv = DATA[(i - 1 + n) % n], nx = DATA[(i + 1) % n];
    var rows = [
      ['Cantante / grupo', s.artista], ['Tonalidad', s.tono + ' mayor'], ['Tempo', s.bpm + ' bpm'], ['Compás', s.compas],
      ['Acordes', s.acordes || '—'], ['Instrumentos', String(s.instrumentos || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean).join('\n')],
      ['Nivel', s.nivel], ['Formato', s.formato + ' · PDF · ' + plural(Number(s.paginas) || 1, 'página', 'páginas')], ['Arreglo', 'Ministerio de alabanza']
    ];
    var vid = ytId(s.video);
    var video = vid
      ? '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/' + vid + '?rel=0" title="Video guía de ' + esc(s.titulo) + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>'
      : '<a class="video" href="' + YT + '" target="_blank" rel="noopener" aria-label="Ver videos guía en YouTube"><div class="vt"><div class="between small" style="color:#bdbdbd"><span>' + CANAL + '</span><span>Tono ' + esc(s.tono) + ' · ' + esc(s.bpm) + ' bpm</span></div>' +
        '<div style="font-size:clamp(20px,2vw,30px);letter-spacing:-0.02em;line-height:1.05;max-width:80%">' + esc(s.titulo) + '<br><span style="color:#8a8a8a">Video guía · pronto</span></div></div><div class="play">' + I.play('#fff', 16, 18) + '</div></a>';
    var pdfName = String(s.pdf || '').split('/').pop();
    return '<main class="detail">' +
      '<div class="prev"><div class="pdf-pages" data-pdf-full="' + esc(s.pdf) + '"><div class="pdf-loading small muted">Cargando el cifrado…</div></div>' +
        '<div class="pdf-fallback" hidden>' + sheet(s, true) + '<div class="small muted" style="margin-top:12px;text-align:center">Vista de ejemplo: el PDF de esta canción aún no está subido.</div></div></div>' +
      '<div class="info"><div class="between" style="align-items:flex-start;padding-bottom:22px;border-bottom:1px solid var(--line)">' +
        '<div><h1 style="font-size:14px">' + esc(s.titulo) + '</h1><a class="small muted" style="text-decoration:underline;text-underline-offset:2px" href="#/carpeta/' + encodeURIComponent(slug(s.artista)) + '">' + esc(s.artista) + '</a><span class="small muted"> · ' + esc(s.formato) + '</span></div>' +
        '<button class="close" data-act="back" aria-label="Cerrar ficha"><span></span></button></div>' +
        rows.map(function (r) { return '<div class="row"><div>' + r[0] + '</div><div>' + esc(r[1]) + '</div></div>'; }).join('') +
        '<div class="btns" style="margin-top:22px;gap:8px"><a class="btn btn-solid" href="' + esc(s.pdf) + '" download="' + esc(pdfName) + '">' + I.down + 'Descargar PDF</a>' +
        '<a class="btn btn-line" href="' + esc(s.pdf) + '" target="_blank" rel="noopener">Ver en pantalla completa ↗</a></div>' +
        '<div class="between small" style="margin-top:40px;padding-bottom:8px"><span>Video guía</span><span class="muted">YouTube</span></div>' + video +
        '<div class="between small" style="align-items:center;margin-top:12px"><span class="muted">¿Te sirvió? Suscríbete para no perderte la próxima.</span><a class="btn btn-red btn-sm" href="' + YT + '" target="_blank" rel="noopener">Suscribirse</a></div>' +
        '<div class="between small" style="margin-top:44px;border-top:1px solid var(--line);padding-top:10px">' +
          '<a href="#/cancion/' + encodeURIComponent(pv.id) + '"><span class="muted">← Anterior</span><br>' + esc(pv.titulo) + '</a>' +
          '<a href="#/cancion/' + encodeURIComponent(nx.id) + '" style="text-align:right"><span class="muted">Siguiente →</span><br>' + esc(nx.titulo) + '</a></div>' +
      '</div></main>';
  }

  // ---------- INFORMACIÓN ----------
  function viewInfo() {
    return '<section class="cols small info-top"><div style="display:flex;gap:26px"><div><div class="muted">Ministerio</div><div>' + esc(CFG.iglesia) + '</div></div><div><div class="muted">Contacto</div><div>' + esc(CFG.correo) + '</div></div></div><div></div>' +
      '<div class="span2" style="max-width:620px"><h1 class="lead" style="font-size:clamp(24px,2.3vw,34px)">Sirvo en el ministerio de alabanza y escribo los cifrados de las canciones que cantamos. Aquí los comparto para que quien recién empieza en el piano pueda tocarlas.</h1>' +
      '<p style="margin:22px 0 0;max-width:440px;font-size:13px">Cada arreglo está pensado para pianistas principiantes: tonalidades cómodas para la congregación, acordes sencillos y la estructura de la canción marcada.</p>' +
      '<p style="margin:14px 0 0;max-width:440px;font-size:13px">Si una canción te sirve, la mejor forma de apoyar es suscribirte al canal y compartirla con tu equipo.</p></div></section>' +
      '<section class="cols rule sec-lg"><div class="small"><div>Dónde encontrarme</div><div class="muted">Canales</div></div><div></div>' +
      '<div class="span2 chans">' +
      '<a class="chan" href="' + YT + '" target="_blank" rel="noopener"><span>YouTube</span><span class="muted">Videos guía · Suscríbete ↗</span></a>' +
      '<div class="chan"><span>Cifrados PDF</span><span class="muted">Descarga libre</span></div><div class="chan"><span>Partituras</span><span class="muted">Hechas en MuseScore</span></div><div class="chan"><span>Pedidos</span><span class="muted">Escríbeme qué canción falta</span></div></div></section>' +
      '<section class="cols rule sec-lg"><div class="small"><div class="muted">Canciones</div><div>Índice</div></div><div></div><div class="span2 idx-list">' +
      DATA.slice().sort(byTitle).map(function (s) { return '<a class="idx" href="#/cancion/' + encodeURIComponent(s.id) + '"><span>' + esc(s.titulo) + '</span><span class="m">' + esc(s.artista) + '</span><span class="m">' + esc(s.tono) + '</span><span class="ar">→</span></a>'; }).join('') +
      '</div></section>';
  }

  // ---------- render ----------
  var lastView = '';
  function render() {
    var r = route(), body;
    if (r.view === 'admin') { location.replace('#/'); return; }
    if (!LOADED) { app.innerHTML = '<div class="wrap">' + header(r) + '<p class="muted" style="padding:80px 0">Cargando canciones…</p></div>'; return; }
    if (LOAD_ERR) body = '<section style="padding:80px 0"><h1 class="lead">No se pudo cargar la lista de canciones.</h1><p class="muted">Revisa que el archivo data/canciones.json exista y esté bien escrito.</p></section>';
    else if (r.view === 'cancion') body = viewSong(r.id);
    else if (r.view === 'carpeta') body = viewFolder(r.id);
    else if (r.view === 'info') body = viewInfo();
    else body = viewHome();

    var ae = document.activeElement, fid = ae && ae.id, pos = null;
    try { pos = ae && ae.selectionStart; } catch (e) {}
    app.innerHTML = '<div class="wrap">' + header(r) + body + footer() + '</div>';
    if (fid) { var el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); try { if (pos != null) el.setSelectionRange(pos, pos); } catch (e) {} } }

    var key = r.view + '/' + r.id;
    if (key !== lastView) { if (lastView) window.scrollTo(0, 0); lastView = key; }
    bindGallery();
    renderPdfs();
    var t = { inicio: 'Cifrados de Alabanza', info: 'Información · Cifrados de Alabanza' }[r.view];
    if (r.view === 'cancion') { var s = DATA.filter(function (x) { return x.id === r.id; })[0]; t = s ? s.titulo + ' — ' + s.artista + ' · Cifrado' : t; }
    if (r.view === 'carpeta') { var f = folders().filter(function (x) { return x.slug === r.id; })[0]; t = f ? f.name + ' · Cifrados' : t; }
    document.title = t || 'Cifrados de Alabanza';
  }

  // Galería: al pasar el cursor, la carpeta crece (sin volver a dibujar la página, para que se anime)
  function bindGallery() {
    var items = app.querySelectorAll('.item');
    Array.prototype.forEach.call(items, function (it) {
      function on() {
        if (it.classList.contains('on')) return;
        Array.prototype.forEach.call(items, function (o) { o.classList.remove('on'); });
        it.classList.add('on'); S.activa = it.getAttribute('data-name');
        var n = Number(it.getAttribute('data-count'));
        set('act-name', S.activa.toUpperCase()); set('act-pos', (Number(it.getAttribute('data-i')) + 1) + ' / ' + items.length);
        set('act-desc', plural(n, 'canción', 'canciones') + ' · Tonos ' + it.getAttribute('data-keys')); set('act-count', n + ' PDF');
        var o = document.getElementById('act-open'); if (o) { o.textContent = 'Abrir ' + S.activa + ' →'; o.setAttribute('href', it.querySelector('.tile').getAttribute('href')); }
      }
      it.addEventListener('mouseenter', on);
      it.querySelector('.tile').addEventListener('focus', on);
    });
  }
  function set(id, txt) { var e = document.getElementById(id); if (e) e.textContent = txt; }

  // ---------- vista real de los PDF (pdf.js) ----------
  var pdfjsP = null, THUMBS = {}, QUEUE = [], BUSY = 0;
  function pdfjs() {
    if (!pdfjsP) pdfjsP = import('./pdfjs/pdf.min.mjs').then(function (m) {
      m.GlobalWorkerOptions.workerSrc = new URL('js/pdfjs/pdf.worker.min.mjs', location.href).href;
      return m;
    });
    return pdfjsP;
  }
  function closeDoc(doc) { try { if (doc.loadingTask && doc.loadingTask.destroy) doc.loadingTask.destroy(); else if (doc.destroy) doc.destroy(); } catch (e) {} }
  function openPdf(url) { return pdfjs().then(function (m) { return m.getDocument({ url: url }).promise; }); }
  function drawPage(doc, n, cssWidth) {
    return doc.getPage(n).then(function (page) {
      var v1 = page.getViewport({ scale: 1 }), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      var vp = page.getViewport({ scale: (cssWidth * dpr) / v1.width });
      var c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      return page.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise.then(function () { return c; });
    });
  }
  // Miniaturas: se generan una vez por PDF y se guardan en memoria
  function thumb(url) {
    if (THUMBS[url]) return THUMBS[url];
    THUMBS[url] = new Promise(function (res, rej) { QUEUE.push({ url: url, res: res, rej: rej }); pump(); });
    return THUMBS[url];
  }
  function pump() {
    while (BUSY < 2 && QUEUE.length) {
      var job = QUEUE.shift(); BUSY++;
      (function (job) {
        openPdf(job.url).then(function (doc) { return drawPage(doc, 1, 320).then(function (c) { closeDoc(doc); return c.toDataURL('image/jpeg', 0.82); }); })
          .then(job.res, job.rej).then(function () { BUSY--; pump(); });
      })(job);
    }
  }
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (ents) {
    ents.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); showThumb(e.target); } });
  }, { rootMargin: '300px' }) : null;
  function showThumb(el) {
    var url = el.getAttribute('data-pdf');
    thumb(url).then(function (src) {
      if (!el.isConnected) return;
      el.innerHTML = '<img class="pdf-thumb" alt="" src="' + src + '">'; el.classList.add('real');
    }, function () { /* sin PDF: queda la vista de ejemplo */ });
  }
  function renderPdfs() {
    Array.prototype.forEach.call(app.querySelectorAll('.thumb[data-pdf]'), function (el) {
      var url = el.getAttribute('data-pdf');
      if (THUMBS[url]) showThumb(el); else if (io) io.observe(el); else showThumb(el);
    });
    var box = app.querySelector('[data-pdf-full]');
    if (!box) return;
    var url = box.getAttribute('data-pdf-full'), fb = app.querySelector('.pdf-fallback');
    function fail() { if (!box.isConnected) return; box.remove(); if (fb) fb.hidden = false; }
    if (!url) { fail(); return; }
    openPdf(url).then(function (doc) {
      var w = Math.min(box.clientWidth || 600, 820), pages = [], chain = Promise.resolve();
      for (var i = 1; i <= Math.min(doc.numPages, 12); i++) (function (n) {
        chain = chain.then(function () { return drawPage(doc, n, w); }).then(function (c) { pages.push(c); });
      })(i);
      return chain.then(function () {
        if (!box.isConnected) return;
        box.innerHTML = '';
        pages.forEach(function (c, i) { c.className = 'pdf-page'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Página ' + (i + 1) + ' del cifrado'); box.appendChild(c); });
        closeDoc(doc);
      });
    }).catch(function (e) { if (console && console.warn) console.warn("PDF no disponible:", url, e && e.message); fail(); });
  }

  // ---------- eventos ----------
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'scroll') { e.preventDefault(); var t = document.getElementById('buscar'); if (t) t.scrollIntoView({ behavior: 'smooth' }); setTimeout(function () { var q = document.getElementById('q'); if (q) q.focus({ preventScroll: true }); }, 450); return; }
    if (a === 'dark') { S.dark = !S.dark; document.body.classList.toggle('dark', S.dark); store(LS_DARK, S.dark ? '1' : '0'); }
    else if (a === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    else if (a === 'clear') { S.q = ''; }
    else if (a === 'filtro') { S.filtro = b.getAttribute('data-v'); }
    else if (a === 'back') { if (history.length > 1) { history.back(); return; } location.hash = '#/'; return; }
    render();
  });
  app.addEventListener('input', function (e) { if (e.target.id === 'q') { S.q = e.target.value; render(); } });

  window.addEventListener('hashchange', function () { if (location.hash === '#buscar' || location.hash === '#canciones') return; render(); });
  render();
  load();
  setTimeout(function () { S.intro = false; var h = app.querySelector('header'); if (h) h.classList.remove('intro'); }, 1700);
})();
