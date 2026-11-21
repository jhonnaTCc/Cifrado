/* Cifrados de Alabanza — sitio estático (sin servidor).
   Las canciones vienen de data/canciones.js y la configuración de data/config.js.
   Rutas: #/  ·  #/cancion/<id>  ·  #/carpeta/<carpeta>  ·  #/info  ·  #/admin  */
(function () {
  'use strict';

  var CFG = window.SITIO || {};
  var BASE = (window.CANCIONES || []).slice();
  var LS_DATA = 'cifrados_datos_v1', LS_DARK = 'cifrados_oscuro';
  var app = document.getElementById('app');

  // ---------- utilidades ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }
  function byTitle(a, b) { return a.titulo.localeCompare(b.titulo, 'es'); }
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  // ---------- datos ----------
  function loadData() {
    var raw = read(LS_DATA);
    if (raw) { try { var d = JSON.parse(raw); if (Array.isArray(d)) return d; } catch (e) {} }
    return BASE.slice();
  }
  var DATA = loadData();
  var localChanges = !!read(LS_DATA);
  function saveData() { store(LS_DATA, JSON.stringify(DATA)); localChanges = true; }

  var S = {
    dark: read(LS_DARK) === '1', filtro: 'todas', q: '', activa: '',
    draft: null, err: '', aviso: '', confirm: null, intro: true
  };
  document.body.classList.toggle('dark', S.dark);

  function folders() {
    var g = {};
    DATA.forEach(function (s) { (g[s.artista] = g[s.artista] || []).push(s); });
    return Object.keys(g).map(function (name) {
      var list = g[name];
      var keys = []; list.forEach(function (s) { if (keys.indexOf(s.tono) < 0) keys.push(s.tono); });
      return { name: name, slug: slug(name), list: list, count: list.length, keys: keys.join(' · '), mono: initials(name),
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
  var YT = esc(CFG.youtubeUrl || 'https://www.youtube.com/'), CANAL = esc(CFG.canal || '');

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
        '<nav aria-label="Principal"><a href="#/"' + (info || r.view === 'admin' ? ' class="muted"' : '') + '>Canciones</a><a href="#/info"' + (info ? '' : ' class="muted"') + '>Información</a></nav>' +
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
      '<div class="end"><a href="#/admin"><span class="muted">Acceso</span><br>Administrar</a><button data-act="top" style="text-align:right"><span class="muted">Volver</span><br>Arriba ↑</button></div>' +
      '</footer>';
  }
  function card(s) {
    return '<a class="card" href="#/cancion/' + encodeURIComponent(s.id) + '" aria-label="Abrir ' + esc(s.titulo) + ' de ' + esc(s.artista) + '">' +
      '<div class="head"><div><div>' + esc(s.titulo) + '</div><div class="muted small">' + esc(s.artista) + ' · ' + esc(s.tono) + ' · ' + esc(s.bpm) + ' bpm</div></div>' +
      '<div class="muted small monof">' + (s.formato === 'Cifrado' ? 'CIF' : 'PART') + '</div></div>' +
      '<div class="thumb">' + sheet(s, false) + '</div></a>';
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

    h += '<section class="intro" style="padding:70px 0 100px">' +
      '<figure class="hero-img"><img src="img/portada.jpg" alt="Piano con hojas de acordes en un templo iluminado por la mañana" onerror="this.parentNode.classList.add(\'vacia\')">' +
      '<figcaption class="small"><span>Imagen de portada</span><span class="muted">img/portada.jpg</span></figcaption></figure>' +
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
    h += '<section aria-label="Cantantes y agrupaciones" style="margin-top:110px">' +
      '<div class="between rule small"><div><div>Carpetas</div><div class="muted">Cantantes y agrupaciones</div></div>' +
      '<div style="text-align:right"><div>' + plural(shownF.length, 'carpeta', 'carpetas') + '</div><div class="muted">Pasa el cursor y abre una</div></div></div>' +
      '<div class="gal-title"><div><div>Cantantes</div><div class="l2"><span class="squares" aria-hidden="true"><i></i><i></i><i></i></span><span>y grupos</span><sup>Nº ' + pad(shownF.length) + '</sup><span class="slash">/.</span></div></div>' +
      '<div class="act"><span id="act-name">' + esc(act ? act.name.toUpperCase() : '') + '</span><sup id="act-pos">' + (act ? (ai + 1) + ' / ' + shownF.length : '') + '</sup></div></div>' +
      '<div class="gal-desc small muted"><div>Cada carpeta reúne los cifrados y partituras de un mismo cantante o grupo.</div><div id="act-desc">' + (act ? plural(act.count, 'canción', 'canciones') + ' · Tonos ' + esc(act.keys) : '') + '</div></div>' +
      '<div class="stage"><div class="ticks muted" aria-hidden="true"><span>—</span><span>—</span></div><div class="track-wrap"><div class="track">';
    shownF.forEach(function (f, i) {
      var href = '#/carpeta/' + encodeURIComponent(f.slug);
      h += '<div class="item' + (f === act ? ' on' : '') + '" data-name="' + esc(f.name) + '" data-i="' + i + '" data-count="' + f.count + '" data-keys="' + esc(f.keys) + '">' +
        '<a class="tile" href="' + href + '" aria-label="Abrir carpeta de ' + esc(f.name) + '"><span class="top"><span>' + pad(i + 1) + '</span><span>' + f.count + ' PDF</span></span>' +
        '<span class="mono">' + esc(f.mono) + '</span><span class="nm">' + esc(f.name) + '</span></a>' +
        '<a class="arrow" href="' + href + '" tabindex="-1" aria-hidden="true">' + I.arrow + '<span>Ver carpeta</span></a></div>';
    });
    if (!shownF.length) h += '<div class="muted" style="align-self:center">Ninguna carpeta coincide con la búsqueda.</div>';
    h += '</div></div><div class="ticks r muted"><span id="act-count">' + (act ? act.count : 0) + ' PDF</span><span>' + DATA.length + ' total</span></div></div>' +
      '<div class="between small" style="margin-top:14px;padding-left:34px"><a id="act-open" href="' + (act ? '#/carpeta/' + encodeURIComponent(act.slug) : '#/') + '">Abrir ' + esc(act ? act.name : '') + ' →</a><span class="muted">Arreglos del ministerio de alabanza</span></div></section>';

    // Repertorio
    h += '<section id="canciones" aria-label="Canciones" style="margin-top:110px">' +
      '<div class="between rule small" style="padding-bottom:28px"><div><div>Repertorio</div><div class="muted">' + grid.length + ' de ' + DATA.length + ' canciones</div></div>' +
      '<div class="filters" role="group" aria-label="Filtrar">' + FILTROS.map(function (f) {
        return '<button data-act="filtro" data-v="' + f.id + '" aria-pressed="' + (f.id === cur.id) + '">' + f.label + '<sup>' + qs.filter(f.t).length + '</sup></button>';
      }).join('') + '</div></div>';
    if (!grid.length) h += '<div style="padding:40px 0 20px;font-size:clamp(20px,1.8vw,26px);max-width:620px">No encontramos «' + esc(S.q) + '». <span class="muted">Prueba con otro nombre o escríbeme para pedir la canción.</span></div>';
    h += '<div class="grid">' + grid.map(card).join('') + '</div></section>';

    // Cómo usar
    var steps = [['Busca la canción', 'Escribe su nombre o el del cantante, o entra a la carpeta del grupo.'], ['Revisa tono y acordes', 'La ficha muestra la tonalidad, el tempo y los acordes que vas a necesitar en el piano.'], ['Descarga y practica', 'Baja el PDF y toca junto al video guía en piano del canal de YouTube.']];
    h += '<section class="cols rule small" style="margin-top:150px"><div><div>Cómo usar</div><div class="muted">Tres pasos</div></div>' +
      steps.map(function (s, i) { return '<div><div class="monof muted" style="font-size:11px">0' + (i + 1) + '</div><div style="font-size:20px;letter-spacing:-0.01em;margin:34px 0 8px">' + s[0] + '</div><div class="muted" style="max-width:260px">' + s[1] + '</div></div>'; }).join('') + '</section>';

    // YouTube
    var recent = DATA.slice().reverse().slice(0, 4);
    h += '<section class="yt" aria-label="Canal de YouTube"><div class="cols small"><div><div>YouTube</div><div class="muted">' + CANAL + '</div></div><div></div>' +
      '<div class="span2" style="padding-top:80px"><h2 class="lead" style="max-width:640px">Cada canción tiene su video guía en piano. Suscríbete y aprende las nuevas antes del domingo.</h2>' +
      '<p class="muted" style="margin:20px 0 0;max-width:460px;font-size:13px">En cada video muestro los acordes en el teclado, despacio y paso a paso. Al suscribirte y activar la campana te llega el aviso, y el canal crece para llegar a más pianistas.</p>' +
      '<div class="btns" style="margin-top:30px"><a class="btn btn-red" style="min-height:48px;font-size:14px" href="' + YT + '" target="_blank" rel="noopener">' + I.play('#fff') + 'Suscribirse al canal</a>' +
      '<a class="btn btn-line" style="min-height:48px;font-size:14px" href="' + YT + '" target="_blank" rel="noopener">Ver todos los videos ↗</a></div>' +
      '<div class="muted" style="margin-top:70px;padding-bottom:8px">Videos guía recientes</div>' +
      recent.map(function (s) { return '<a class="yt-row" href="#/cancion/' + encodeURIComponent(s.id) + '"><span>' + I.play('currentColor', 9, 11) + esc(s.titulo) + '</span><span class="muted">' + esc(s.artista) + ' · ' + esc(s.tono) + ' →</span></a>'; }).join('') +
      '</div></div></section>';
    return h;
  }

  // ---------- CARPETA ----------
  function viewFolder(id) {
    var f = folders().filter(function (x) { return x.slug === id; })[0];
    if (!f) return '<section style="padding:120px 0"><h1 class="lead">Esta carpeta no existe.</h1><p><a href="#/">← Volver al inicio</a></p></section>';
    return '<section style="padding-top:22px"><a href="#/" class="small muted" style="display:inline-flex;align-items:center;min-height:44px">← Todas las carpetas</a>' +
      '<div class="cols" style="padding:70px 0 60px"><div class="small"><div>Carpeta</div><div class="muted">' + plural(f.count, 'canción', 'canciones') + '</div></div><div></div>' +
      '<div class="span2"><h1 style="font-size:clamp(40px,5.4vw,96px);line-height:.9;font-weight:500;letter-spacing:-0.045em">' + esc(f.name) + '</h1>' +
      '<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 28px;margin-top:22px"><div><span class="muted">Tonos </span>' + esc(f.keys) + '</div><div><span class="muted">Cifrados </span>' + f.cif + '</div><div><span class="muted">Partituras </span>' + f.par + '</div></div></div></div>' +
      '<div class="rule small" style="padding-bottom:28px"><div>Canciones</div><div class="muted">Ordenadas por título</div></div>' +
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
      '<div class="prev">' + sheet(s, true) + '</div>' +
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
    return '<section class="cols small" style="padding-top:110px"><div style="display:flex;gap:26px"><div><div class="muted">Ministerio</div><div>' + esc(CFG.iglesia) + '</div></div><div><div class="muted">Contacto</div><div>' + esc(CFG.correo) + '</div></div></div><div></div>' +
      '<div class="span2" style="max-width:620px"><h1 class="lead" style="font-size:clamp(24px,2.3vw,34px)">Sirvo en el ministerio de alabanza y escribo los cifrados de las canciones que cantamos. Aquí los comparto para que quien recién empieza en el piano pueda tocarlas.</h1>' +
      '<p style="margin:22px 0 0;max-width:440px;font-size:13px">Cada arreglo está pensado para pianistas principiantes: tonalidades cómodas para la congregación, acordes sencillos y la estructura de la canción marcada.</p>' +
      '<p style="margin:14px 0 0;max-width:440px;font-size:13px">Si una canción te sirve, la mejor forma de apoyar es suscribirte al canal y compartirla con tu equipo.</p></div></section>' +
      '<section class="cols rule" style="margin-top:150px"><div class="small"><div>Dónde encontrarme</div><div class="muted">Canales</div></div><div></div>' +
      '<div class="span2" style="padding-top:40px;font-size:clamp(18px,1.5vw,22px);letter-spacing:-0.01em;line-height:1.2">' +
      '<a class="chan" href="' + YT + '" target="_blank" rel="noopener"><span>YouTube</span><span class="muted">Videos guía · Suscríbete ↗</span></a>' +
      '<div class="chan"><span>Cifrados PDF</span><span class="muted">Descarga libre</span></div><div class="chan"><span>Partituras</span><span class="muted">Hechas en MuseScore</span></div><div class="chan"><span>Pedidos</span><span class="muted">Escríbeme qué canción falta</span></div></div></section>' +
      '<section class="cols rule" style="margin-top:150px"><div class="small"><div class="muted">Canciones</div><div>Índice</div></div><div></div><div class="span2" style="padding-top:40px">' +
      DATA.slice().sort(byTitle).map(function (s) { return '<a class="idx" href="#/cancion/' + encodeURIComponent(s.id) + '"><span>' + esc(s.titulo) + '</span><span class="m">' + esc(s.artista) + '</span><span class="m">' + esc(s.tono) + '</span><span class="ar">→</span></a>'; }).join('') +
      '</div></section>';
  }

  // ---------- ADMINISTRACIÓN ----------
  var KEYS = ['C','C#','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'], METERS = ['4/4','3/4','6/8','6/4','2/4','12/8'];
  function blank() { return { id: null, titulo: '', artista: '', tono: 'G', bpm: '72', compas: '4/4', acordes: '', formato: 'Cifrado', nivel: 'Básico', paginas: '1', instrumentos: 'Piano', video: '', pdf: '', _file: '', _url: '' }; }
  function opt(list, v) { return list.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + o + '</option>'; }).join(''); }
  function field(id, label, html, full) { return '<div class="field' + (full ? ' full' : '') + '"><label for="f-' + id + '">' + label + '</label>' + html + '</div>'; }
  function inp(id, v, type, ph) { return '<input id="f-' + id + '" data-f="' + id + '" type="' + (type || 'text') + '" value="' + esc(v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>'; }
  function sel(id, list, v) { return '<select id="f-' + id + '" data-f="' + id + '">' + opt(list, v) + '</select>'; }

  function viewAdmin() {
    var F = folders(), d = S.draft, h = '';
    h += '<main aria-label="Administración" style="padding-top:22px"><div class="between" style="align-items:flex-end;padding:60px 0 34px;gap:16px">' +
      '<div><div class="small muted">Solo administrador</div><h1 style="margin-top:4px;font-size:clamp(34px,3.6vw,56px);line-height:.95;font-weight:500;letter-spacing:-0.04em">Administrar cifrados</h1>' +
      '<div class="small muted" style="margin-top:10px;max-width:520px">Agrega o edita canciones y descarga el archivo <code>canciones.js</code> actualizado para subirlo a GitHub junto con los PDF.</div></div>' +
      '<div class="btns" style="gap:8px"><button class="btn btn-solid" data-act="nuevo">+ Nueva canción</button><button class="btn btn-line" data-act="exportar">Descargar canciones.js</button></div></div>';
    h += '<div class="note" style="margin-bottom:14px"><b>Cómo publicar los cambios:</b> 1) guarda aquí las canciones · 2) pulsa «Descargar canciones.js» · 3) en GitHub sube ese archivo a la carpeta <code>data/</code> y los PDF a la carpeta <code>pdf/</code> (con el nombre que indica cada canción). En 1–2 minutos se ve en la web.' +
      (localChanges ? ' <br><span class="muted">Tienes cambios guardados solo en este navegador.</span> <button data-act="reset" style="text-decoration:underline">Descartar cambios locales</button>' : '') + '</div>';
    if (S.aviso) h += '<div class="note between" role="status" style="align-items:center;margin-bottom:14px"><span>' + esc(S.aviso) + '</span><button class="muted" data-act="aviso">Cerrar</button></div>';

    h += '<div class="adm"><div class="list"><div class="kpis"><div><b>' + DATA.length + '</b><span class="muted">Canciones</span></div><div><b>' + F.length + '</b><span class="muted">Carpetas</span></div>' +
      '<div><b>' + DATA.filter(function (s) { return s.pdf; }).length + '</b><span class="muted">Con PDF</span></div><div><b>' + DATA.filter(function (s) { return ytId(s.video); }).length + '</b><span class="muted">Con video</span></div></div>' +
      '<div class="tbl"><div class="tr th"><span>Canción</span><span>Cantante / grupo</span><span>Tono</span><span>Video</span><span style="text-align:right">Acciones</span></div>';
    DATA.slice().sort(function (a, b) { return a.artista.localeCompare(b.artista, 'es') || byTitle(a, b); }).forEach(function (s) {
      var conf = S.confirm === s.id;
      h += '<div class="tr' + (d && d.id === s.id ? ' sel' : '') + '"><span>' + esc(s.titulo) + '</span><span class="muted">' + esc(s.artista) + '</span><span class="monof small">' + esc(s.tono) + '</span>' +
        '<span class="small' + (ytId(s.video) ? '' : ' muted') + '">' + (ytId(s.video) ? 'Sí' : 'Falta') + '</span>' +
        '<span class="acts"><button class="pill" data-act="editar" data-id="' + esc(s.id) + '">Editar</button><button class="pill' + (conf ? ' danger' : '') + '" data-act="borrar" data-id="' + esc(s.id) + '">' + (conf ? '¿Seguro?' : 'Eliminar') + '</button></span></div>';
    });
    h += '</div></div><div class="form">';
    if (!d) {
      h += '<div style="padding:40px 0"><div style="font-size:20px;letter-spacing:-0.01em">Ninguna canción abierta</div><div class="muted" style="margin-top:8px;max-width:300px">Pulsa «Editar» en una canción de la lista, o agrega una nueva con su PDF.</div>' +
        '<button class="btn btn-solid" data-act="nuevo" style="margin-top:22px">+ Nueva canción</button></div>';
    } else {
      var pdfLabel = d._file || (d.pdf ? d.pdf.split('/').pop() : '');
      h += '<form id="form" novalidate style="display:flex;flex-direction:column;gap:14px">' +
        '<div class="between" style="align-items:baseline;padding-bottom:12px;border-bottom:1px solid var(--line)"><div style="font-size:14px">' + (d.id ? 'Editar · ' + esc(d.titulo) : 'Nueva canción') + '</div><button type="button" class="small muted" data-act="cancelar">Cancelar</button></div>' +
        '<div><div class="small" style="margin-bottom:6px">Archivo PDF</div><label class="drop" for="f-file">' + I.file +
        '<span style="display:flex;flex-direction:column;min-width:0"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(pdfLabel || 'Elige el PDF del cifrado o partitura') + '</span>' +
        '<span class="small muted">' + (pdfLabel ? 'Súbelo a GitHub en la carpeta pdf/ con este nombre · pulsa para cambiarlo' : 'Pulsa aquí para buscarlo en tu equipo') + '</span></span></label>' +
        '<input id="f-file" type="file" accept="application/pdf,.pdf" class="sr"></div>' +
        '<div class="fgrid">' +
          field('titulo', 'Título de la canción', inp('titulo', d.titulo, 'text', 'Ej. Renuévame'), true) +
          field('artista', 'Cantante o agrupación <span class="muted">· define la carpeta</span>', inp('artista', d.artista, 'text', 'Ej. Marcos Witt').replace('>', ' list="artistas">') +
            '<datalist id="artistas">' + F.map(function (f) { return '<option value="' + esc(f.name) + '">'; }).join('') + '</datalist>', true) +
          field('tono', 'Tonalidad', sel('tono', KEYS, d.tono)) +
          field('bpm', 'Tempo (bpm)', inp('bpm', d.bpm, 'number')) +
          field('compas', 'Compás', sel('compas', METERS, d.compas)) +
          field('acordes', 'Acordes que usa', inp('acordes', d.acordes, 'text', 'G · C · D · Em')) +
          field('formato', 'Formato', sel('formato', ['Cifrado', 'Partitura'], d.formato)) +
          field('nivel', 'Nivel', sel('nivel', ['Básico', 'Intermedio', 'Avanzado'], d.nivel)) +
          field('paginas', 'Páginas', inp('paginas', d.paginas, 'number')) +
          field('instrumentos', 'Instrumentos', inp('instrumentos', d.instrumentos, 'text', 'Piano')) +
          field('video', 'Enlace del video guía en YouTube', inp('video', d.video, 'url', 'https://youtu.be/…'), true) +
        '</div>' + (S.err ? '<div class="err" role="alert">' + esc(S.err) + '</div>' : '') +
        '<div class="btns" style="gap:8px;padding-top:6px"><button type="submit" class="btn btn-solid">' + (d.id ? 'Guardar cambios' : 'Agregar canción') + '</button><button type="button" class="btn btn-line" data-act="cancelar">Cancelar</button></div></form>';
    }
    return h + '</div></div></main>';
  }

  // ---------- render ----------
  var lastView = '';
  function render() {
    var r = route(), body;
    if (r.view === 'cancion') body = viewSong(r.id);
    else if (r.view === 'carpeta') body = viewFolder(r.id);
    else if (r.view === 'info') body = viewInfo();
    else if (r.view === 'admin') body = viewAdmin();
    else body = viewHome();

    var ae = document.activeElement, fid = ae && ae.id, pos = null;
    try { pos = ae && ae.selectionStart; } catch (e) {}
    app.innerHTML = '<div class="wrap">' + header(r) + body + footer() + '</div>';
    if (fid) { var el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); try { if (pos != null) el.setSelectionRange(pos, pos); } catch (e) {} } }

    var key = r.view + '/' + r.id;
    if (key !== lastView) { if (lastView) window.scrollTo(0, 0); lastView = key; }
    bindGallery();
    var t = { inicio: 'Cifrados de Alabanza', info: 'Información · Cifrados de Alabanza', admin: 'Administrar · Cifrados de Alabanza' }[r.view];
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

  // ---------- eventos ----------
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    if (a === 'scroll') { e.preventDefault(); var t = document.getElementById('buscar'); if (t) t.scrollIntoView({ behavior: 'smooth' }); setTimeout(function () { var q = document.getElementById('q'); if (q) q.focus({ preventScroll: true }); }, 450); return; }
    if (a === 'dark') { S.dark = !S.dark; document.body.classList.toggle('dark', S.dark); store(LS_DARK, S.dark ? '1' : '0'); }
    else if (a === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    else if (a === 'clear') { S.q = ''; }
    else if (a === 'filtro') { S.filtro = b.getAttribute('data-v'); }
    else if (a === 'back') { if (history.length > 1) { history.back(); return; } location.hash = '#/'; return; }
    else if (a === 'nuevo') { S.draft = blank(); S.err = ''; S.confirm = null; }
    else if (a === 'cancelar') { S.draft = null; S.err = ''; }
    else if (a === 'aviso') { S.aviso = ''; }
    else if (a === 'editar') { var s = DATA.filter(function (x) { return x.id === id; })[0]; if (s) { S.draft = Object.assign({}, s, { bpm: String(s.bpm), paginas: String(s.paginas), _file: '' }); S.err = ''; S.confirm = null; } }
    else if (a === 'borrar') {
      if (S.confirm !== id) { S.confirm = id; }
      else { var gone = DATA.filter(function (x) { return x.id === id; })[0]; DATA = DATA.filter(function (x) { return x.id !== id; }); saveData(); S.confirm = null; if (S.draft && S.draft.id === id) S.draft = null; S.aviso = 'Eliminada: ' + (gone ? gone.titulo : '') + '. Recuerda descargar canciones.js y subirlo a GitHub.'; }
    }
    else if (a === 'exportar') { exportData(); return; }
    else if (a === 'reset') { store(LS_DATA, null); localChanges = false; DATA = BASE.slice(); S.draft = null; S.aviso = 'Se descartaron los cambios locales.'; }
    render();
  });
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q') { S.q = t.value; render(); return; }
    var f = t.getAttribute && t.getAttribute('data-f');
    if (f && S.draft) { S.draft[f] = t.value; if (S.err) { S.err = ''; var er = app.querySelector('.err'); if (er) er.remove(); } }
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'f-file' && S.draft) {
      var file = t.files && t.files[0]; if (!file) return;
      var name = slug(file.name.replace(/\.pdf$/i, '')) + '.pdf';
      S.draft._file = name; S.draft.pdf = 'pdf/' + name;
      if (!S.draft.titulo) { var g = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim(); S.draft.titulo = g.charAt(0).toUpperCase() + g.slice(1); }
      render();
    }
  });
  app.addEventListener('submit', function (e) {
    if (e.target.id !== 'form') return;
    e.preventDefault();
    var d = S.draft; if (!d) return;
    if (!String(d.titulo).trim() || !String(d.artista).trim()) { S.err = 'Escribe el título y el cantante o grupo.'; render(); return; }
    if (!d.pdf) { S.err = 'Elige el archivo PDF de la canción.'; render(); return; }
    var clean = {
      id: d.id || uniqueId(slug(d.titulo)), titulo: String(d.titulo).trim(), artista: String(d.artista).trim(), tono: d.tono,
      bpm: parseInt(d.bpm, 10) || 0, compas: d.compas, acordes: String(d.acordes || '').trim(), formato: d.formato, nivel: d.nivel,
      paginas: parseInt(d.paginas, 10) || 1, instrumentos: d.instrumentos, video: String(d.video || '').trim(), pdf: d.pdf
    };
    if (d.id) DATA = DATA.map(function (s) { return s.id === d.id ? clean : s; }); else DATA.push(clean);
    saveData();
    S.aviso = (d.id ? 'Guardada: ' : 'Agregada: ') + clean.titulo + ' · ' + clean.artista + (d._file ? ' — sube «' + d._file + '» a la carpeta pdf/ en GitHub.' : '');
    S.draft = null; S.err = '';
    render();
  });
  function uniqueId(base) { var id = base || 'cancion', n = 2; while (DATA.some(function (s) { return s.id === id; })) id = base + '-' + n++; return id; }
  function exportData() {
    var txt = '// Lista de canciones del sitio (generado desde el panel de administración).\n' +
      '// "artista" define la carpeta · "acordes" son los acordes de la canción · "pdf" es la ruta del archivo en la carpeta /pdf · "video" es el enlace de YouTube.\n' +
      'window.CANCIONES = [\n' + DATA.map(function (s) { return '  ' + JSON.stringify(s); }).join(',\n') + '\n];\n';
    var blob = new Blob([txt], { type: 'text/javascript' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'canciones.js'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    S.aviso = 'Descargado canciones.js. Súbelo a la carpeta data/ de tu repositorio en GitHub.'; render();
  }

  window.addEventListener('hashchange', function () { if (location.hash === '#buscar' || location.hash === '#canciones') return; S.draft = route().view === 'admin' ? S.draft : null; render(); });
  render();
  setTimeout(function () { S.intro = false; var h = app.querySelector('header'); if (h) h.classList.remove('intro'); }, 1700);
})();
