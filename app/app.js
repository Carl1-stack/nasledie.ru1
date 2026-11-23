/* Наследие app · Phase 1 shell (2026-11-19). Vanilla JS, no build step.
   Data: data/index.json + data/lNN.json (tools/app_export.py), audio in audio/lNN/, pictures in img/.
   Progress lives on the phone (localStorage) until accounts arrive in Phase 2. */
(function () {
'use strict';
var CONF = window.NCONF || { codes: [], whatsapp: '' };
/* paid pages (quizzes 3-30, reviews, B1 lessons, Падежи) live in the private storage: #open/<path> opens them with the code */
var LINKS = { quiz: function (n) { return n <= 2 ? '../quiz_site/quiz' + pad(n) + '.html' : '#open/a1/quiz' + pad(n) + '.html'; }, review: function (n) { return '#quiz/r' + n; },
  videos: function (n) { return n ? '#lesson/' + n + '/videos' : '#library'; }, level: '#view/level',
  b1: function () { return '#library'; }, cases: function (n) { return hasCourse('cases') || hasCourse('b1') ? '#view/p/cases/cases' + n + '.html' : '#unlock/0'; } };
function hasCourse(c) { return !!(S.acc && S.token && String(S.acc.scope || '').split('+').some(function (x) { return x.split(':')[0] === c; })); }
var UNIT_PHOTO = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'];
var LESSON_PHOTO = { 2: 'l2', 3: 'l3' };
var AR_DIG = '٠١٢٣٤٥٦٧٨٩';

/* ---------- state ---------- */
var KEY = 'nasledie.v1';
var S = load();
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function store() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function save() { store(); syncLater(); }
S.progress = S.progress || {}; S.streak = S.streak || { last: '', count: 0 };
function G(m, f) { return S.g === 'f' ? f : m; }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function ad(n) { return String(n).replace(/\d/g, function (d) { return AR_DIG[d]; }); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function ico(id, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '"><use href="#i-' + id + '"/></svg>'; }
function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function touchStreak() {
  var t = today(); if (S.streak.last === t) return;
  var y = new Date(); y.setDate(y.getDate() - 1);
  var ys = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
  var note = gentleStep(); rmdTouch(); if (S.streak.count > 1) S.streakNew = S.streak.count; save(); updateStreakChips(); pushSeen(); if (note) setTimeout(function () { toast(note); }, 600);
}
function streakNow() { var t = today(); var y = new Date(); y.setDate(y.getDate() - 1);
  var ys = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
  return streakView(); }
function prog(n) { return S.progress[n] = S.progress[n] || {}; }
function stars(n) { var p = S.progress[n] || {}; return (p.d1 ? 1 : 0) + (p.d2 ? 1 : 0) + ((p.read || p.words) ? 1 : 0); }
function starsHtml(n) { var s = stars(n), h = ''; for (var i = 0; i < 3; i++) h += ico('star', i < s ? '' : 'off'); return '<span class="stars" aria-label="' + s + ' / 3">' + h + '</span>'; }
S.device = S.device || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
function crs(n) { return n > 100 ? 'b1' : 'a1'; }
function srvNum(n) { return n > 200 ? 100 + (n - 200) : n > 100 ? n - 100 : n; }
function bkey(n) { return (n > 200 ? 'm' : 'l') + pad(n > 200 ? n - 200 : n - 100); }
function vidKey(n) { return n > 100 ? ['b1', bkey(n)] : ['a1', 'l' + pad(n)]; }
function lessonLabel(n) { return n > 200 ? 'المهمة ' + ad(n - 200) : 'الدرس ' + ad(n > 100 ? n - 100 : n); }
function lessonNo(n) { return n > 200 ? 'M' + (n - 200) : String(n > 100 ? n - 100 : n); }
var LEVELS = [{ id: 'a1', ru: 'А1', ar: 'المبتدئين' }, { id: 'a2', ru: 'А2', ar: 'ما قبل المتوسط', soon: true }, { id: 'b1', ru: 'В1', ar: 'المتوسط' }, { id: 'b2', ru: 'В2', ar: 'فوق المتوسط', soon: true }];
function levelNow() {
  if (S.level && LEVELS.some(function (l) { return l.id === S.level && !l.soon; })) return S.level;
  return hasCourse('b1') && !hasCourse('a1') ? 'b1' : 'a1';
}
function inboxUnread() { return (S.inbox || []).filter(function (m) { return !m.read; }).length; }
function levelSheet() {
  var cur = levelNow();
  var h = '<div class="sheet-bg" data-act="sheetclose"></div><div class="sheet" role="dialog" aria-label="اختار المستوى"><h3 class="ar">' + G('اختار المستوى', 'اختاري المستوى') + '</h3>' +
    LEVELS.map(function (l) {
      var mine = hasCourse(l.id), cls = 'lvl' + (l.id === cur ? ' on' : '') + (l.soon ? ' soon' : '');
      return '<button class="' + cls + '" data-act="setlevel" data-l="' + l.id + '"' + (l.soon ? ' disabled' : '') + '><span class="ru lv">' + l.ru + '</span><span class="tx"><b class="ar">' + l.ar + '</b><small class="ar">' +
        (l.soon ? 'قريب' : mine ? 'مفتوح ليك' : l.id === 'a1' ? 'الدرسين الأولانيين ببلاش' : 'محتاج كود') + '</small></span>' + (l.id === cur ? ico('check') : '') + '</button>';
    }).join('') + '</div>';
  var d = document.createElement('div'); d.className = 'sheetwrap'; d.innerHTML = h; document.body.appendChild(d);
}
function unitsOf(lv) { return IDX.units.filter(function (u) { return (u.course || 'a1') === lv; }); }
function inScope(scope, n) { if (n > 100) return String(scope || '').split('+').indexOf('b1') >= 0;
  var it = String(scope || '').split('+').filter(function (x) { return x.split(':')[0] === 'a1'; })[0]; if (!it) return false;
  var p = it.split(':'); if (!p[1]) return true; return p[1].split(',').map(Number).indexOf(unitOf(n) + 1) >= 0; }
function accessOk(n) {
  var a = S.acc; if (!a || !S.token) return false;
  if (a.state === 'cancelled') return false;
  if (a.state === 'active' && inScope(a.scope, n)) return true;
  return (a.opened || []).indexOf(crs(n) + ':' + srvNum(n)) >= 0 || !!(S.offline && S.offline[n]);
}
function canOpen(n) { var l = LES[n]; return !!(l && (l.free || accessOk(n))); }
function isFree(n) { return !!(LES[n] && LES[n].free); }
function photoFor(n) { return 'img/' + (LESSON_PHOTO[n] || (LES[n] && LES[n].photo) || UNIT_PHOTO[unitOf(n)]) + '.jpg'; }
function unitOf(n) { return Math.floor((n - 1) / 5); }

function applyPrefs() {
  document.body.classList.toggle('nopr', !!S.hidePr);
  document.body.classList.toggle('notr', !!S.hideTr);
  document.documentElement.setAttribute('data-theme', S.light ? 'light' : 'dark');
  if (typeof gzhelDecor === 'function' && document.getElementById('app')) gzhelDecor();
  document.querySelectorAll('[data-g]').forEach(function (el) { var p = el.dataset.g.split('|'); el.textContent = G(p[0], p[1]); });
}

/* ---------- data ---------- */
var IDX = null, LES = {}, CACHE = {};
function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
var API = (CONF.api || '').replace(/\/$/, '');
function lessonUrl(n) { return isFree(n) ? 'data/l' + pad(n) + '.json' : n > 100 ? API + '/c/b1/' + bkey(n) + '.json?t=' + encodeURIComponent(S.token || '') : API + '/c/a1/l' + pad(n) + '.json?t=' + encodeURIComponent(S.token || ''); }
function lesson(n) { if (CACHE[n]) return Promise.resolve(CACHE[n]);
  return fetch(lessonUrl(n), { cache: 'no-cache' }).then(function (r) {   // always the newest lesson file (phones kept day-old copies)
    if (r.status === 401 || r.status === 403) return r.json().catch(function () { return {}; }).then(function (j) { var e = new Error('denied'); e.reason = j.reason || 'denied'; throw e; });
    if (!r.ok) throw new Error('net'); return r.json();
  }).then(function (d) {
    CACHE[n] = d;
    if (!isFree(n) && S.acc) { S.acc.opened = S.acc.opened || []; var ok = crs(n) + ':' + srvNum(n); if (S.acc.opened.indexOf(ok) < 0) { S.acc.opened.push(ok); save(); } }
    return d;
  }); }
function audioUrl(n, id) { return isFree(n) ? 'audio/l' + pad(n) + '/' + id + '.mp3' : n > 100 ? API + '/c/b1/audio/' + bkey(n) + '/' + id + '.mp3?t=' + encodeURIComponent(S.token || '') : API + '/c/a1/audio/l' + pad(n) + '/' + id + '.mp3?t=' + encodeURIComponent(S.token || ''); }
function refreshStatus() {
  if (!S.token || !API) return Promise.resolve();
  return fetch(API + '/api/status?t=' + encodeURIComponent(S.token)).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
    .then(function (x) {
      if (x.s === 200 && x.j.ok) { S.acc = { scope: x.j.scope, ends: x.j.ends, starts: x.j.starts, state: x.j.state, opened: x.j.opened, student: x.j.student, devices: x.j.devices, max_devices: x.j.max_devices, at: Date.now() }; save(); }
      else if (x.s === 401) { S.token = null; S.acc = null; save(); toast(x.j.reason === 'device_removed' ? 'الموبايل ده اتشال من الكود، كلم المدرس' : 'سجّل الكود تاني'); }
    }).catch(function () {});
}

/* ---------- toast ---------- */
var toastT;
function toast(t) { var x = document.getElementById('toast'); x.textContent = t; x.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { x.classList.remove('show'); }, 1900); }

/* ---------- audio player (one for the whole app) ---------- */
var au = new Audio(); au.preload = 'auto';
var P = { q: [], i: -1, meta: null, rep: false, slow: false, timer: null, onLine: null, onEnd: null, single: null };
function playQueue(items, start, meta, opts) {
  stopTimer(); opts = opts || {};
  P.q = items; P.i = start || 0; P.meta = meta; P.onLine = opts.onLine || null; P.onEnd = opts.onEnd || null; P.single = null;
  playCurrent(); touchStreak();
}
function srcOf(it) { return P.slow && it.slow ? it.slow : it.src; }
function playCurrent() {
  var it = P.q[P.i]; if (!it) return;
  au.src = srcOf(it); au.playbackRate = 1;
  var pr = au.play(); if (pr && pr.catch) pr.catch(function () {});
  if (P.onLine) P.onLine(P.i);
  showMini(); mediaSession();
}
function stopTimer() { if (P.timer) { clearTimeout(P.timer); P.timer = null; } }
au.addEventListener('ended', function () {
  if (P.single) { P.single.classList.remove('playing'); P.single = null; setPP(false); return; }
  if (P.i < P.q.length - 1) {
    var gap = P.rep ? Math.max(1500, (au.duration || 2) * 1000 + 900) : 380;
    P.timer = setTimeout(function () { P.timer = null; P.i++; playCurrent(); }, gap);
  } else { setPP(false); if (P.onEnd) P.onEnd(); }
});
au.addEventListener('play', function () { setPP(true); });
au.addEventListener('pause', function () { if (!P.timer) setPP(false); });
au.addEventListener('timeupdate', function () {
  var frac = P.q.length ? (P.i + (au.duration ? au.currentTime / au.duration : 0)) / P.q.length : 0;
  var b = document.getElementById('mini-bar'); if (b) b.style.width = (frac * 100) + '%';
  var pg = document.querySelector('.player .progress i'); if (pg) pg.style.width = (frac * 100) + '%';
});
au.addEventListener('error', function () { toast('الصوت مش متاح دلوقتي'); setPP(false); });
function toggle() {
  if (P.timer) { stopTimer(); au.pause(); setPP(false); return; }
  if (au.paused) { if (!au.src && P.q.length) { playCurrent(); return; } var p = au.play(); if (p && p.catch) p.catch(function () {}); }
  else au.pause();
}
function step(d) { if (!P.q.length) return; stopTimer(); P.i = Math.max(0, Math.min(P.q.length - 1, P.i + d)); playCurrent(); }
function playOne(btn, url) {
  stopTimer(); if (P.single) P.single.classList.remove('playing');
  P.q = []; P.meta = null; P.single = btn; btn.classList.add('playing');
  au.src = url; var p = au.play(); if (p && p.catch) p.catch(function () {}); touchStreak();
}
function setPP(on) {
  var u = on ? 'pause' : 'play';
  var m = document.getElementById('mini-pp'); if (m) m.innerHTML = ico(u);
  var b = document.querySelector('.player [data-act="toggle"]'); if (b) b.innerHTML = ico(u);
}
function showMini() {
  if (!P.meta) return;
  document.getElementById('mini-ru').textContent = P.meta.ru;
  document.getElementById('mini-ar').textContent = P.meta.ar;
  document.getElementById('mini-img').src = P.meta.img;
  refreshChrome();
}
function mediaSession() {
  if (!('mediaSession' in navigator) || !P.meta) return;
  try {
    var it = P.q[P.i] || {};
    navigator.mediaSession.metadata = new MediaMetadata({ title: it.ru || P.meta.ru, artist: 'Насле́дие', album: P.meta.ru,
      artwork: [{ src: P.meta.img, sizes: '512x512', type: 'image/jpeg' }] });
    navigator.mediaSession.setActionHandler('play', toggle);
    navigator.mediaSession.setActionHandler('pause', toggle);
    navigator.mediaSession.setActionHandler('nexttrack', function () { step(1); });
    navigator.mediaSession.setActionHandler('previoustrack', function () { step(-1); });
  } catch (e) {}
}

/* ---------- router ---------- */
var view = document.getElementById('view');
var route = { name: 'home', arg: null };
function go(h) { location.hash = h; }
function parse() {
  var h = (location.hash || '').replace(/^#/, '');
  var m = h.match(/^lesson\/(\d+)\/videos$/) || h.match(/^view\/videos\/([1-9]\d*)$/);
  if (m) return { name: 'lesson', arg: +m[1], xv: true };
  if (/^view\/videos(\/0)?$/.test(h)) return { name: 'library', arg: null };
  m = h.match(/^(unit|lesson|unlock)\/(\d+)$/);
  if (m) return { name: m[1], arg: +m[2] };
  m = h.match(/^(chat|call)\/(\d+)\/(f|\d+)$/);
  if (m) return { name: m[1], arg: { n: +m[2], mi: m[3] === 'f' ? -1 : +m[3] } };
  m = h.match(/^open\/([\w\/.-]+\.html)$/);
  if (m) {   // old links (GitHub pages) → the in-app version
    var p = m[1], q = p.match(/^a1\/quiz(\d\d)\.html$/), rv = p.match(/^a1\/review([1-3])\.html$/);
    if (q) return { name: 'lesson', arg: +q[1], quiz: true };
    if (rv) return { name: 'quiz', arg: 'r' + rv[1] };
    if (/^b1\/index\.html$/.test(p)) return { name: 'course', arg: 'b1' };
    return { name: 'view', arg: 'p/' + p };
  }
  m = h.match(/^pdd(?:\/(.*))?$/); if (m) return { name: 'pdd', arg: m[1] || '' };
  m = h.match(/^cases(?:\/(.*))?$/); if (m) return { name: 'cases', arg: m[1] || '' };
  m = h.match(/^grammar(?:\/(.*))?$/); if (m) return { name: 'grammar', arg: m[1] || '' };   // Грамма́тика (cases.js, grammar/PLAN.md, 2026-11-23)   // Падежи v2 (cases.js, 2026-11-22)
  if (h === 'course/cases') return { name: 'cases', arg: '' };   // ПДД driving-theory course (pdd.js)
  if (h === 'album') return { name: 'album', arg: null };
  if (h === 'ask') return { name: 'ask', arg: null };
  m = h.match(/^boss\/(\d+)$/); if (m) return { name: 'boss', arg: +m[1] };
  m = h.match(/^duel\/(new|\d+)$/); if (m) return { name: 'duel', arg: m[1] };
  m = h.match(/^game\/(\w+)$/);
  if (m) return { name: 'game', arg: m[1] };
  m = h.match(/^inbox(?:\/(\d+))?$/);
  if (m) return { name: 'inbox', arg: m[1] ? +m[1] : 0 };
  m = h.match(/^ref\/([A-Z0-9]{4,12})$/i);
  if (m) { S.ref = m[1].toUpperCase(); store(); history.replaceState(null, '', S.onboarded ? '#unlock/0' : '#welcome'); return { name: S.onboarded ? 'unlock' : 'welcome', arg: 0 }; }
  if (h === 'course/b1' || h === 'view/b1films' || /^view\/p\/b1\//.test(h)) { S.level = 'b1'; store(); history.replaceState(null, '', '#home'); return { name: 'home', arg: null }; }
  m = h.match(/^(view|course|quiz|watch)\/(.+)$/);
  if (m) return { name: m[1], arg: m[2] };
  return { name: h || 'home', arg: null };
}
var lastHash = '#home';
function render() {
  route = parse();
  if (!S.onboarded && route.name !== 'welcome' && route.name !== 'open') { route = { name: 'welcome', arg: null }; }
  if (route.name !== 'chat' && route.name !== 'call') stopVoice();
  if (route.name !== 'game' && route.name !== 'boss' && route.name !== 'duel' && GM) { clearTimeout(GM.tt); GM = null; }
  if (route.name !== 'game' && route.name !== 'duel') RNG = Math.random;
  var R = { home: vHome, library: vLibrary, unit: vUnit, lesson: vLesson, practice: vPractice, profile: vProfile, welcome: vWelcome, unlock: vUnlock,
    open: vOpen, chat: vChat, call: vCall, view: vView, course: vCourse, quiz: vQuiz, mistakes: vMistakes, certs: vCerts, watch: vWatch, inbox: vInbox, games: vGames, game: vGame, album: vAlbum, boss: vBoss, duel: vDuel, ask: vAsk, pdd: vPdd, cases: vCases, grammar: vGrammar }[route.name] || vHome;
  if (route.quiz) LS = { n: route.arg, seg: -1 };
  if (route.xv) LS = { n: route.arg, seg: -2 };   // an old quiz link opens the lesson on its quiz tab
  view.innerHTML = '';
  R(route.arg);
  if (route.name !== 'open') lastHash = location.hash || '#home';
  playOrnaments();
  window.scrollTo(0, 0);
  refreshChrome();
  applyPrefs();
  if (document.getElementById('cat')) catPlace();
  if (window.NTOUR) NTOUR.screen(route);
}
function refreshChrome() {
  var tabs = document.getElementById('tabs'), mini = document.getElementById('mini');
  var noTabs = route.name === 'welcome' || route.name === 'chat' || route.name === 'call' || route.name === 'view' || route.name === 'ask';
  tabs.hidden = noTabs;
  var tab = { home: 'home', library: 'library', unit: 'library', lesson: 'library', practice: 'practice', profile: 'profile', unlock: 'library', course: 'library', quiz: 'library', view: 'library', mistakes: 'home', inbox: 'home', games: 'practice', game: 'practice', album: 'practice', boss: 'practice', duel: 'practice', ask: 'practice', certs: 'profile', chat: 'practice', call: 'practice', watch: 'library', cases: 'library', grammar: 'library', pdd: pddOnly() ? 'home' : 'library' }[route.name];
  tabs.querySelectorAll('a').forEach(function (a) { a.classList.toggle('on', a.dataset.tab === tab); });
  mini.hidden = noTabs || !P.meta || route.name === 'lesson';
  view.className = noTabs ? 'notabs' : (mini.hidden ? 'noplayer' : '');
}
function updateStreakChips() { document.querySelectorAll('[data-streak]').forEach(function (e) { e.textContent = streakNow(); }); }

/* ---------- views ---------- */
function nextLesson(lv) {
  var all = []; unitsOf(lv || levelNow()).forEach(function (u) { u.lessons.forEach(function (l) { all.push(l.num); }); });
  if (!all.length) unitsOf('a1').forEach(function (u) { u.lessons.forEach(function (l) { all.push(l.num); }); });
  for (var i = 0; i < all.length; i++) { if (stars(all[i]) < 3 && canOpen(all[i])) return all[i]; }
  return all[0];
}
/* ПДД driving-theory course (2026-11-21, app/pdd.js): a code whose scope is only 'pdd' opens on it */
function pddOnly() { return !!(S.acc && S.token && String(S.acc.scope || '') === 'pdd'); }
function pddOpened() { return !!(S.acc && (S.acc.opened || []).indexOf('pdd:1') >= 0); }
function vPdd(arg) { if (window.NPDD) window.NPDD.view(arg); }
function vCases(arg) { if (window.NCASES) window.NCASES.view(arg); }
function vGrammar(arg) { if (window.NCASES) window.NCASES.view(arg, 'grammar'); }
function grammarCard() { return '<a class="gcard hero" href="#grammar" style="margin:10px 0 4px"><span class="ni">' + ico('bulb') + '</span><span class="tx"><span class="ru">Грамма́тика</span><b class="ar">القواعد</b><small class="ar">الفعل، أفعال الحركة، الظرف، الصفة، الأرقام، الجملة: كل نقطة في درس، بالمستويات</small></span>' + ico('back', 'end') + '</a>'; }
function casesCard() { return '<a class="gcard hero" href="#cases" style="margin:14px 0 4px"><span class="ni">' + ico('book') + '</span><span class="tx"><span class="ru">Падежи́</span><b class="ar">الحالات الإعرابية الست</b><small class="ar">كل استخدام في درس: المبتدئين، وما قبل المتوسط، والمتوسط، وفوق المتوسط</small></span>' + ico('back', 'end') + '</a>'; }
function pddCard() { return hasCourse('pdd') || pddOpened() ? '<a class="gcard hero" href="#pdd" style="margin:14px 0 4px"><span class="ni">' + ico('test') + '</span><span class="tx"><span class="ru">ПДД</span><b class="ar">رخصة القيادة في روسيا</b><small class="ar">الـ ٨٠٠ سؤال الرسميين، تمرين كل يوم، وامتحان زي الحقيقي</small></span>' + ico('back', 'end') + '</a>' : ''; }
function vHome() {
  if (pddOnly()) { vPdd(''); return; }
  var n = nextLesson(), l = LES[n];
  var started = Object.keys(prog(n)).length > 0;
  var h = '<section class="hero" style="height:min(72vh,560px)"><img src="' + photoFor(n) + '" alt="">' +
    '<div class="topbar pad"><span class="brand ru">Насле́дие</span><span class="tchips"><button class="chip lvchip" data-act="levels" aria-label="المستوى"><span class="ru">' + LEVELS.filter(function (x) { return x.id === levelNow(); })[0].ru + '</span>' + ico('down') + '</button>' +
    '<a class="chip bell" href="#inbox" aria-label="الرسايل">' + ico('bell') + (inboxUnread() ? '<b class="dot">' + ad(inboxUnread()) + '</b>' : '') + '</a><span class="chip">' + ico('feather') + '<span data-streak>' + streakNow() + '</span></span></span></div>' +
    '<div class="in pad"><span class="d-ru ru t-ru sheen" data-t="' + esc(l.ru) + '">' + esc(l.ru) + '</span>' + vineTag() + (l.pr ? '<div class="pr">' + esc(l.pr) + '</div>' : '') +
    '<span class="d-ar ar t-ar">' + esc(l.ar) + '</span>' +
    '<div class="go"><a class="btn" href="#lesson/' + n + '">' + ico('play') + (started ? G('كمّل', 'كمّلي') : G('يلا نبدأ', 'يلا نبدأ')) + '</a>' +
    '<span class="meta">' + (crs(n) === 'b1' ? 'В1 · ' : 'الوحدة ' + ad(unitOf(n) + 1) + ' · ') + lessonLabel(n) + '</span></div></div></section>';
  var md = mistDue().length;
  if (md) h += '<section class="shelf pad"><a class="lrow due" href="#mistakes">' + ico('review') + '<span class="tx"><b>' + G('راجع غلطاتك', 'راجعي غلطاتك') + ' · ' + ad(md) + ' سؤال</b><small>' + G('الأسئلة اللي غلطت فيها رجعت عشان تثبت', 'الأسئلة اللي غلطتي فيها رجعت عشان تثبت') + '</small></span>' + ico('back', 'end') + '</a></section>';
  h += rmdCard();
  h += socialHtml();
  h += '<section class="shelf pad"><h2><span>' + (levelNow() === 'b1' ? 'أجزاء كورس المتوسط' : 'الوحدات') + '</span><span class="ru">' + (levelNow() === 'b1' ? 'В1' : 'А1') + '</span></h2><div class="hs ltr">' + posters(levelNow()) + '</div></section>';
  h += '<section class="shelf pad"><h2><span>' + G('كمان ليك', 'كمان ليكي') + '</span></h2><div class="hs">' +
    '<a class="wcard" href="#practice">' + ico('spark') + '<b>' + G('اتكلم مع ليرا', 'اتكلمي مع ليرا') + '</b><small>شات أو مكالمة على الدرس، بتصحيح لطيف</small></a>' +
    '<a class="wcard" href="' + LINKS.videos(n) + '">' + ico('film') + '<b>فيديوهات الدرس</b><small>روسي حقيقي من يوتيوب</small></a>' +
    '<a class="wcard" href="' + LINKS.level + '">' + ico('test') + '<b>اختبار المستوى</b><small>' + G('اعرف مستواك الحقيقي', 'اعرفي مستواكي الحقيقي') + '</small></a></div></section>';
  view.innerHTML = h;
}
function posters(lv) {
  return IDX.units.map(function (u, i) { if ((u.course || 'a1') !== (lv || 'a1')) return '';
    var done = u.lessons.filter(function (l) { return stars(l.num) === 3; }).length;
    var locked = !u.lessons.some(function (l) { return canOpen(l.num); });
    return '<a class="poster" href="#unit/' + (i + 1) + '"><span class="img"><img src="img/' + u.photo + '.jpg" alt="" loading="lazy"' + (locked ? ' style="filter:saturate(.4) brightness(.6)"' : '') + '><span class="n">' + (unitsOf(u.course || 'a1').indexOf(u) + 1) + '</span>' +
      '<span class="prog">' + done + '/' + u.lessons.length + '</span></span><span class="ru">' + esc(u.ru) + '</span><span class="ar">' + esc(u.ar) + '</span></a>';
  }).join('');
}
function vLibrary() {
  var h = '<div class="page pad"><div class="ph1"><h1 class="ar">المكتبة</h1><span class="ru">Библиоте́ка</span></div>' + pddCard() + casesCard() + grammarCard();
  h += '<section class="sec"><h2><span>كورس المبتدئين · ٦ وحدات</span><span class="ru">А1</span></h2><div class="hs ltr">' + posters('a1') + '</div></section>';
  h += '<section class="sec"><h2><span>ما قبل المتوسط</span><span class="ru">А2</span></h2><div class="soon ar">قريب: المستوى التاني بعد المبتدئين، بنفس شكل الدروس. لما يجهز هيظهر هنا.</div></section>';
  h += '<section class="sec"><h2><span>كورس المتوسط · ١٠ دروس ومهام</span><span class="ru">В1</span></h2><div class="hs ltr">' + posters('b1') + '</div>' +
    '<div class="links" style="margin-top:10px">' + lrow('#watch/b1/intro', 'video', 'مقدمة كورس В1', 'فيديو مجاني: الكورس ماشي إزاي') + '</div></section>';
  h += '<section class="sec"><h2><span>فوق المتوسط</span><span class="ru">В2</span></h2><div class="soon ar">' + 'قريب: بعد المتوسط، بنفس شكل الدروس. لما يجهز هيظهر هنا.' + '</div></section>';
  h += '<section class="sec"><h2><span>المراجعة</span><span class="ru">Повторе́ние</span></h2><div class="links">' +
    [1, 2, 3].map(function (r) { var a = (r - 1) * 10 + 1; return lrow(LINKS.review(r), 'review', 'مراجعة ' + ad(r), 'كويز على الدروس من ' + ad(a) + ' لـ ' + ad(a + 9)); }).join('') + '</div></section>';
  h += '<section class="sec"><h2><span>كمان في المكتبة</span></h2><div class="links">' +
    lrow(LINKS.level, 'test', 'اختبار المستوى', 'زي الامتحان الروسي الرسمي، بالخمس مهارات') +

    '</div></section>';
  h += credits() + '</div>';
  view.innerHTML = h;
}
function lrow(href, icon, b, small) { return '<a class="lrow" href="' + href + '">' + ico(icon) + '<span class="tx"><b>' + b + '</b><small>' + small + '</small></span>' + ico(href.charAt(0) === '#' ? 'back' : 'out', 'end') + '</a>'; }
function credits() {
  return '<details class="credit"><summary>مصادر الصور</summary><ul class="ru" id="credits"></ul></details>';
}
function fillCredits() {
  var ul = document.getElementById('credits'); if (!ul) return;
  getJSON('data/credits.json').then(function (c) { ul.innerHTML = c.map(function (x) { return '<li>' + esc(x.title) + ' · ' + esc(x.author) + ' · ' + esc(x.license) + ' (Wikimedia Commons)</li>'; }).join(''); }).catch(function () {});
}
function vUnit(u) {
  var U = IDX.units[u - 1]; if (!U) return go('#library');
  var n = nextLesson(U.course || 'a1');
  var h = '<section class="hero" style="height:380px"><img src="img/' + U.photo + '.jpg" alt="">' +
    '<div class="topbar pad"><a class="back" href="#library" aria-label="رجوع">' + ico('back') + '</a></div>' +
    '<div class="in pad"><span class="d-ru t-ru">' + bukvTitle(U.ru) + '</span>' + vineTag() + '<span class="d-ar ar t-ar">' + ((U.course || 'a1') === 'b1' ? 'В1 · ' : 'الوحدة ' + ad(unitsOf('a1').indexOf(U) + 1) + ' · ') + esc(U.ar) + '</span></div></section>';
  var first = U.lessons.find(function (l) { return stars(l.num) < 3 && canOpen(l.num); }) || U.lessons[0];
  h += '<div class="acts pad"><a class="big" href="#lesson/' + first.num + '" aria-label="تشغيل">' + ico('play') + '</a><span class="ar" style="color:var(--dim);font-size:13px">' +
    ad(U.lessons.length) + ' دروس · ' + G('خلصت', 'خلصتي') + ' ' + ad(U.lessons.filter(function (l) { return stars(l.num) === 3; }).length) + '</span></div>';
  h += U.lessons.map(function (l) {
    var s = stars(l.num), open = canOpen(l.num);
    var cls = s === 3 ? 'done' : (l.num === n ? 'now' : '');
    var right = !open ? '<span class="lk">' + ico('lock') + '</span>' : (s ? starsHtml(l.num) : '<span class="st">' + ad(l.words) + ' كلمة</span>');
    return '<a class="ep pad ' + cls + '" href="' + (open ? '#lesson/' + l.num : '#unlock/' + l.num) + '"><span class="no">' + lessonNo(l.num) + '</span><span><span class="ru">' + esc(l.ru) + '</span><span class="ar">' + esc(l.ar) + '</span></span>' + right + '</a>';
  }).join('');
  view.innerHTML = h;
}

/* lesson */
var LS = { seg: 0 };
function vLesson(n) {
  if (!LES[n]) return go('#library');
  if (!canOpen(n)) return go('#unlock/' + n);
  view.innerHTML = '<div class="page pad"><p class="ar" style="color:var(--dim)">بيحمّل الدرس…</p></div>';
  lesson(n).then(function (L) {
    if (parse().name !== 'lesson' || parse().arg !== n) return;
    LS = { n: n, L: L, seg: LS.n === n ? LS.seg : 0 };
    var segs = [];
    if (vidOf(vidKey(n)[0], vidKey(n)[1])) segs.push({ k: 'm', t: n > 200 ? 'فيديو المهمة' : 'فيديو الدرس' });
    if (L.xvideos) segs.push({ k: 'y', t: 'فيديوهات إضافية' });
    if (L.vocab.length) segs.push({ k: 'v', t: 'جمل الدرس' });
    if (L.glossary.length) segs.push({ k: 'w', t: 'الكلمات' });
    if (L.grammar || L.conj || L.verb_table || L.trick) segs.push({ k: 'g', t: 'القواعد' });
    L.dialogues.forEach(function (d, i) { segs.push({ k: 'd' + i, t: 'الحوار ' + ad(i + 1) }); });
    if (L.drillA || L.drillB || L.roleplays || L.game) segs.push({ k: 't', t: 'اتمرن' });
    if (L.phon || L.ik_card) segs.push({ k: 'p', t: 'النطق' });
    if (L.real) segs.push({ k: 's', t: 'روسي الشارع' });
    if (L.reading) segs.push({ k: 'r', t: 'القراءة' });
    if (L.texts && L.texts.length) segs.push({ k: 'b', t: 'نصوص ورسايل' });
    if (L.detail && L.detail.slides) segs.push({ k: 'e', t: 'بالتفصيل' });
    if (L.culture || L.funny) segs.push({ k: 'c', t: 'ثقافة وضحك' });
    if (L.quiz) segs.push({ k: 'q', t: 'الكويز' });
    segs.push({ k: 'x', t: 'الواجب والمزيد' });
    LS.segs = segs;
    if (LS.seg < 0 || LS.seg >= segs.length) { var ks = segs.map(function (x) { return x.k; }), qi = ks.indexOf('q'), yi = ks.indexOf('y'); LS.seg = LS.seg === -1 && qi >= 0 ? qi : LS.seg === -2 && yi >= 0 ? yi : 0; }
    var h = '<section class="hero" style="height:260px"><img src="' + photoFor(n) + '" alt="">' +
      '<div class="topbar pad"><a class="back" href="#unit/' + ((LES[n] && LES[n].unit) + 1) + '" aria-label="رجوع">' + ico('back') + '</a><span class="chip">' + starsHtml(n) + '</span></div>' +
      '<div class="in pad"><span class="d-ru ru t-ru" style="font-size:34px">' + esc(L.ru) + '</span>' + (L.pr ? '<div class="pr">' + esc(L.pr) + '</div>' : '') +
      '<span class="ar meta">' + (n > 100 ? 'В1 · ' : '') + lessonLabel(n) + ' · ' + esc(L.ar) + '</span></div></section>' +
      '<div class="seg pad" role="tablist">' + segs.map(function (s, i) { return '<button role="tab" data-seg="' + i + '"' + (i === LS.seg ? ' class="on"' : '') + '>' + s.t + '</button>'; }).join('') + '</div>' +
      '<div id="segbody"></div>';
    view.innerHTML = h;
    renderSeg();
  }).catch(function (e) {
    if (e && e.reason && e.reason !== 'net') { refreshStatus().then(function () { go('#unlock/' + n); }); return; }
    view.innerHTML = '<div class="page pad"><p class="ar">الدرس مش متاح دلوقتي. ' + G('جرب', 'جربي') + ' تاني وإنت متصل بالنت.</p></div>'; });
}
function renderSeg() {
  var s = LS.segs[LS.seg], L = LS.L, n = LS.n, b = document.getElementById('segbody'), h = '';
  view.querySelectorAll('.seg button').forEach(function (x, i) { x.classList.toggle('on', i === LS.seg); });
  if (s.k === 'm') {
    h = '<div class="pad">' + videoHtml(vidKey(n)[0], vidKey(n)[1], photoFor(n)) + '</div>';
  } else if (s.k[0] === 'd') {
    var d = L.dialogues[+s.k.slice(1)];
    h = '<div class="pad">' + lyrHtml(d) + playerHtml() + '</div>';
  } else if (s.k === 'g') {
    h = '<div class="pad">' + grammarHtml(L, n) + '</div>';
  } else if (s.k === 't') {
    h = '<div class="pad">' + practiceHtml(L, n) + '</div>';
  } else if (s.k === 'p') {
    h = '<div class="pad">' + phonHtml(L, n) + '</div>';
  } else if (s.k === 's') {
    h = '<div class="pad">' + realHtml(L.real, n) + '</div>';
  } else if (s.k === 'c') {
    h = '<div class="pad">' + (L.culture ? '<div class="box"><h3 class="ar">ثقافة وإتيكيت</h3>' + parasHtml(L.culture) + '</div>' : '') +
      (L.funny ? '<div class="vhead"><span class="ar">حوار يضحّك · ' + esc(L.funny.ar || '') + '</span><span class="ru">' + esc(L.funny.ru || '') + '</span></div>' + lyrHtml(L.funny) + playerHtml() +
        (L.funny.note ? '<div class="box gold"><p class="ar">' + mix(L.funny.note) + '</p></div>' : '') : '') + '</div>';
  } else if (s.k === 'q') {
    h = '<div class="pad">' + quizStartHtml(n, L) + '</div>';
  } else if (s.k === 'y') {
    h = '<div class="pad">' + xvHtml(L.xvideos, n) + '</div>';
  } else if (s.k === 'v') {
    h = '<div class="pad">' + L.vocab.map(function (blk, bi) { return '<div class="vhead"><span class="ar">' + esc(blk.ar) + '</span><span class="ru">' + esc(blk.ru) + '</span></div><div class="words">' +
      blk.rows.map(function (r) { return wrow(r, n); }).join('') + '</div>'; }).join('') +
      (L.summary && L.summary.length ? '<div class="vhead"><span class="ar">الخلاصة: جمل لازم تحفظها</span><span class="ru">Итог</span></div><div class="words">' + L.summary.map(function (r) { return wrow(r, n); }).join('') + '</div>' : '') +
      '<div class="row2"><button class="btn" data-act="playall" data-what="v">' + ico('play') + G('اسمع الكل', 'اسمعي الكل') + '</button></div></div>';
  } else if (s.k === 'w') {
    h = '<div class="pad"><div class="words">' + L.glossary.map(function (r) { return wrow(r, n); }).join('') + '</div><div class="row2"><button class="btn" data-act="playall" data-what="w">' + ico('play') + G('اسمع الكل', 'اسمعي الكل') + '</button></div></div>';
  } else if (s.k === 'b') {
    h = '<div class="pad">' + L.texts.map(function (t) {
      var body = t.kind === 'chat'
        ? '<div class="chatdemo">' + t.rows.map(function (r) { return '<div class="cb' + (r.me ? ' me' : '') + '">' + (r.a ? '<button class="pb" data-url="' + audioUrl(n, r.a) + '" aria-label="اسمع">' + ico('play') + '</button>' : '') +
            '<span class="ru">' + esc(r.ru) + '</span><small class="ar">' + esc(r.ar) + '</small></div>'; }).join('') + '</div>'
        : '<div class="words' + (t.kind === 'note' ? ' note' : '') + '">' + t.rows.map(function (r) { return wrow(r, n); }).join('') + '</div>';
      return '<div class="vhead"><span class="ar">' + esc(t.ar) + '</span><span class="ru">' + esc(t.ru) + '</span></div>' + (t.note ? '<p class="scene ar">' + mix(t.note) + '</p>' : '') + body;
    }).join('') + recHtml(n, 'read', 'الواجب: ' + G('اقرا', 'اقري') + ' نص بصوتك وابعته للمدرس') + '</div>';
  } else if (s.k === 'e') {
    var D = L.detail;
    h = '<div class="pad"><div class="vhead"><span class="ar">' + esc(D.ar || '') + '</span><span class="ru">' + esc(D.ru || '') + '</span></div>' + D.slides.map(function (sl) {
      return '<div class="box"><h3 class="ar">' + esc(sl.ar || '') + '</h3>' + (sl.ru ? '<p class="ru">' + esc(String(sl.ru).replace(/^.*?·\s*/, '')) + '</p>' : '') + (sl.rule ? parasHtml(sl.rule) : '') + '</div>' +
        (sl.rows && sl.rows.length ? '<div class="words">' + sl.rows.map(function (r) { return wrow(r, n); }).join('') + '</div>' : '');
    }).join('') + '</div>';
  } else if (s.k === 'r') {
    var R = L.reading;
    h = '<div class="pad">' + (R.genre ? '<p class="scene ar">' + esc(R.genre) + '</p>' : '') + '<div class="passage' + (R.lines ? ' lines' : '') + '"><div class="ru" style="font-weight:700;margin-bottom:6px">' + esc(R.ru) + '</div>' +
      R.text.map(function (t) { return '<span class="ru">' + esc(t) + '</span>' + (R.lines ? '' : ' '); }).join(R.lines ? '' : '') + '</div>' +
      '<div class="row2"><button class="btn" data-act="read" data-slow="0">' + ico('play') + 'النص</button><button class="btn ghost" data-act="read" data-slow="1">' + ico('play') + 'بالراحة</button></div>' +
      (R.gloss.length ? '<div class="gloss"><h3 class="ar">كلمات النص</h3>' + R.gloss.map(function (g) { return '<div class="g"><span class="ru">' + esc(g[0]) + '</span><span class="ar">' + esc(g[1]) + '</span></div>'; }).join('') + '</div>' : '') +
      recHtml(n, 'read', 'الواجب: ' + G('اقرا', 'اقري') + ' النص بصوتك وابعته للمدرس') + '</div>';
  } else {
    h = '<div class="pad">' + (L.homework ? '<div class="box"><h3 class="ar">واجب الكلام</h3>' + L.homework.map(function (it) { return '<h4 class="ar">' + esc(it.t) + '</h4>' + parasHtml(it.p); }).join('') + '</div>' : '') +
      (L.next ? '<div class="box gold"><h3 class="ar">' + esc(L.next.title_ar || 'الدرس الجاي') + '</h3><p class="ru">' + esc(L.next.title_ru || '') + '</p>' +
        (L.next.words || []).map(function (w) { return '<div class="nx"><span class="ru">' + esc(w[0]) + '</span><span class="ar">' + esc(w[1]) + '</span></div>'; }).join('') + '</div>' : '') +
      '<div class="links">' + (L.quiz ? '' : lrow(LINKS.quiz(n), 'test', 'كويز الدرس', '٣٠ سؤال، والنتيجة بتوصل للمدرس')) +
      (!L.xvideos ? '' : '<a class="lrow" href="#lesson/' + n + '/videos" data-act="segy">' + ico('film') + '<span class="tx"><b>فيديوهات الدرس</b><small>روسي حقيقي عن نفس الموضوع</small></span>' + ico('back', 'end') + '</a>') +
      ('<a class="lrow" href="#chat/' + n + '/f">' + ico('spark') + '<span class="tx"><b>' + G('اتكلم مع ليرا', 'اتكلمي مع ليرا') + '</b><small>شات على الدرس ده بتصحيح لطيف</small></span>' + ico('back', 'end') + '</a>') +
      '<button class="lrow" data-act="offline">' + ico('down') + '<span class="tx"><b>' + G('حمّل الدرس', 'حمّلي الدرس') + '</b><small>عشان تسمعه من غير نت</small></span></button></div>' +
      recHtml(n, 'hw', 'فويس للمدرس: ' + G('قول', 'قولي') + ' اللي ' + G('اتعلمته', 'اتعلمتيه') + ' في الدرس') + '</div>';
  }
  b.innerHTML = h;
  if (!RM) { b.classList.remove('segin'); void b.offsetWidth; b.classList.add('segin'); }
  if (s.k === 'm') bindVideo(n);
  if ((s.k[0] === 'd' || s.k === 'c') && P.meta && P.meta.key === n + s.k) highlight(P.i);
}
/* ---------- extra lesson videos INSIDE the lesson (2026-11-20; tools/app_videos.py): steps, YouTube in the app, minute buttons ---------- */
function durAr(sec) { if (!sec) return ''; var m = Math.round(sec / 60); return sec < 60 ? 'أقل من دقيقة' : m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتين' : ad(m) + (m <= 10 ? ' دقايق' : ' دقيقة'); }
function mmss(s) { s = Math.max(0, s | 0); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
function xvCard(v, n) {
  return '<div class="xv" data-yt="' + v.id + '"><button class="xth" data-ytplay="' + (v.start || 0) + '" aria-label="شغّل"><img src="https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg" alt="" loading="lazy"><span class="xpl">' + ico('play') + '</span></button>' +
    '<div class="xb"><small class="ar xk">' + esc(v.kname || '') + (v.dur ? ' · ' + durAr(v.dur) : '') + (v.subs === 'ru' ? ' · ترجمة روسية' : v.subs === 'auto' ? ' · ترجمة أوتوماتيك' : '') + '</small>' +
    '<div class="ru xt">' + esc(v.ru) + '</div><p class="ar">' + mix(v.what || '') + '</p>' +
    (v.ph && v.ph.length ? '<div class="xph"><b class="ar">' + (v.ph[0].s !== undefined ? G('اصطاد الجمل دي (دوس على الدقيقة)', 'اصطادي الجمل دي (دوسي على الدقيقة)') : G('ركّز على الجمل دي وإنت بتتفرج', 'ركّزي على الجمل دي وإنتي بتتفرجي')) + '</b>' +
      v.ph.map(function (p) { return '<div class="xr"><span class="xru"><span class="ru">' + esc(p.ru) + '</span>' + (p.pr && !S.hidePr ? '<small class="pr">' + esc(p.pr) + '</small>' : '') + '</span><span class="ar">' + esc(p.ar) + '</span>' +
        (p.s !== undefined ? '<button class="xat" data-ytat="' + p.s + '">' + ico('play') + '<span class="ru">' + mmss(p.s) + '</span></button>' : '') + '</div>'; }).join('') + '</div>' : '') +
    (v.task ? '<p class="ar xtask">' + ico('mic') + '<span>فويس نوت: ' + mix(v.task) + '</span></p>' : '') + '</div></div>';
}
function xvHtml(X, n) {
  var h = '<p class="ar" style="color:var(--dim);margin:0 0 6px">' + G('امشي بالخطوات بالترتيب. شغّل الترجمة الروسية من زرار CC، ولو الكلام سريع خلي السرعة ٠٫٧٥.', 'امشي بالخطوات بالترتيب. شغّلي الترجمة الروسية من زرار CC، ولو الكلام سريع خلي السرعة ٠٫٧٥.').replace('CC', '«CC»') + '</p>';
  var k = 0;
  (X.steps || []).forEach(function (st) { k++;
    h += '<section class="xstep"><div class="xsh"><span class="xsn">' + ad(k) + '</span><b class="ar">' + esc(st.title) + '</b></div><p class="ar xhint">' + esc(st.hint) + '</p>' + st.videos.map(function (v) { return xvCard(v, n); }).join('') + '</section>';
  });
  (X.social || []).forEach(function (so) { h += '<div class="xv"><div class="xb"><small class="ar xk">من السوشيال ميديا</small><div class="ru xt">' + esc(so.ru) + '</div><p class="ar">' + mix(so.what) + '</p><a class="btn ghost" href="' + esc(so.url) + '" target="_blank" rel="noopener">افتح الفيديو</a>' + (so.task ? '<p class="ar xtask">' + ico('mic') + '<span>فويس نوت: ' + mix(so.task) + '</span></p>' : '') + '</div></div>'; });
  if (X.voice) { k++; h += '<section class="xstep"><div class="xsh"><span class="xsn">' + ad(k) + '</span><b class="ar">' + G('سجّل وابعت', 'سجّلي وابعتي') + '</b></div>' + recHtml(n, 'xvid', mix(X.voice)) + '</section>'; }
  if (X.en && X.en.length) h += '<details class="xen"><summary class="ar">إضافي: شرح بالإنجليزي (للي إنجليزيه كويس)</summary><p class="ar xhint">قنوات بتشرح الروسي بالإنجليزي. ' + G('اتفرج', 'اتفرجي') + ' عليها بعد الخطوات لو ' + G('عايز', 'عايزة') + ' شرح من زاوية تانية.</p>' +
    X.en.map(function (e) { return '<div class="xv" data-yt="' + e.id + '"><button class="xth" data-ytplay="0" aria-label="شغّل"><img src="https://i.ytimg.com/vi/' + e.id + '/mqdefault.jpg" alt="" loading="lazy"><span class="xpl">' + ico('play') + '</span></button><div class="xb"><small class="ar xk">' + (e.dur ? durAr(e.dur) : '') + '</small><p class="ar">' + mix(e.what) + '</p></div></div>'; }).join('') + '</details>';
  return h;
}
function ytPlay(card, start) {
  var id = card.dataset.yt, th = card.querySelector('.xth, .xfr');
  var src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0&cc_load_policy=1&cc_lang_pref=ru&hl=ru' + (start ? '&start=' + start : '');
  au.pause();
  var fr = card.querySelector('iframe');
  if (fr) { fr.src = src; } else { var w = document.createElement('div'); w.className = 'xfr'; w.innerHTML = '<iframe src="' + src + '" title="فيديو" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>'; th.replaceWith(w); }
  card.scrollIntoView({ block: 'start', behavior: 'smooth' }); touchStreak();
}
/* ---------- lesson videos with chapters (2026-11-20) ---------- */
var VIDS = (function () { try { return JSON.parse(localStorage.getItem('nasledie.vids')) || null; } catch (e) { return null; } })();
function loadVideos() {
  if (!API) return Promise.resolve();
  return fetch(API + '/api/videos').then(function (r) { return r.json(); }).then(function (j) { VIDS = j; try { localStorage.setItem('nasledie.vids', JSON.stringify(j)); } catch (e) {} }).catch(function () {});
}
function vidOf(course, key) { return VIDS && VIDS[course] && VIDS[course][key] && VIDS[course][key].parts && VIDS[course][key].parts.length ? VIDS[course][key] : null; }
function vidFree(course, key) { return (course === 'a1' && /^l0[12]$/.test(key)) || (course === 'b1' && key === 'intro'); }
function vidSrc(course, key, file) { return API + '/v/' + file + (vidFree(course, key) ? '' : '?t=' + encodeURIComponent(S.token || '')); }
function mmss(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + pad(t % 60); }
var VP = { course: '', key: '', part: 0 };
function videoHtml(course, key, poster) {
  var v = vidOf(course, key); if (!v) return '';
  var part = Math.min(VP.course === course && VP.key === key ? VP.part : 0, v.parts.length - 1), p = v.parts[part];
  VP = { course: course, key: key, part: part };
  return '<div class="vidbox"><video id="vplayer" controls playsinline preload="metadata"' + (poster ? ' poster="' + poster + '"' : '') + ' src="' + vidSrc(course, key, p.file) + '"></video></div>' +
    '<div class="vtools">' + (v.parts.length > 1 ? v.parts.map(function (x, i) { return '<button class="chip2' + (i === part ? ' on' : '') + '" data-act="vpart" data-i="' + i + '">الجزء ' + ad(i + 1) + '</button>'; }).join('') : '') +
    '<span class="vspeed">' + [0.75, 1, 1.25, 1.5].map(function (r) { return '<button class="chip2' + (r === 1 ? ' on' : '') + '" data-act="vrate" data-r="' + r + '"><span class="ru">' + r + '×</span></button>'; }).join('') + '</span></div>' +
    (!isIOS && 'caches' in window ? '<button class="lrow" data-act="voff" style="margin:0 0 10px">' + ico('down') + '<span class="tx"><b>' + G('حمّل الفيديو', 'حمّلي الفيديو') + '</b><small>' + ((S.voff || {})[vidSrc(course, key, p.file).split('?')[0]] ? 'متحمّل، بيشتغل من غير نت' : 'عشان ' + G('تتفرج', 'تتفرجي') + ' من غير نت (' + ad(Math.round(p.size / 1e6)) + ' ميجا، على واي فاي أحسن)') + '</small></span></button>' : '') +
    (p.chapters && p.chapters.length ? '<div class="chaps" id="chaps">' + p.chapters.map(function (c, i) {
      return '<button class="chap" data-act="chap" data-t="' + c.t + '" data-i="' + i + '"><span class="tm ru">' + mmss(c.t) + '</span><span class="tx"><b class="ar">' + esc(c.ar) + '</b>' + (c.ru ? '<small class="ru">' + esc(c.ru) + '</small>' : '') + '</span></button>';
    }).join('') + '</div>' : '<p class="note ar">الفيديو كامل من غير فصول.</p>');
}
function bindVideo(lessonNum) {
  var v = document.getElementById('vplayer'); if (!v) return;
  var file = (vidOf(VP.course, VP.key) || { parts: [] }).parts[VP.part], id = file ? file.file : '', last = 0;
  S.vpos = S.vpos || {};
  v.addEventListener('play', function () { stopTimer(); au.pause(); touchStreak(); });
  v.addEventListener('loadedmetadata', function () { var t = S.vpos[id]; if (t > 15 && t < v.duration - 20) { v.currentTime = t; toast(G('كمّلنا من مكان ما وقفت', 'كمّلنا من مكان ما وقفتي')); } });
  v.addEventListener('timeupdate', function () {
    var t = v.currentTime;
    if (Math.abs(t - last) > 5) { last = t; S.vpos[id] = t; store(); }
    if (!v._st || t - v._st > 30) { v._st = t; vstat(VP.course, VP.key + (VP.part ? '-' + (VP.part + 1) : ''), v); }
    var cs = document.querySelectorAll('#chaps .chap'), cur = -1;
    cs.forEach(function (c, i) { if (+c.dataset.t <= t + 0.5) cur = i; });
    cs.forEach(function (c, i) { c.classList.toggle('now', i === cur); });
  });
  v.addEventListener('ended', function () { S.vpos[id] = 0; vstat(VP.course, VP.key + (VP.part ? '-' + (VP.part + 1) : ''), v); if (lessonNum) { var s0 = stars(lessonNum); prog(lessonNum).video = 1; save(); afterProgress(lessonNum, s0); } });
}
function vWatch(arg) {   // #watch/b1/l01 · #watch/b1/intro · #watch/a1/r1
  var p = String(arg).split('/'), course = p[0], key = p[1], v = vidOf(course, key);
  if (!v) { view.innerHTML = '<div class="page pad"><p class="ar">الفيديو ده لسه مش موجود.</p></div>'; return; }
  if (!vidFree(course, key) && !S.token) { go('#unlock/0'); return; }
  var title = course === 'b1' ? (key === 'intro' ? 'مقدمة كورس B1' : (key[0] === 'm' ? 'مهمة ' : 'الدرس ') + ad(+key.slice(1))) : 'المراجعة ' + ad(key.slice(1));
  view.innerHTML = '<div class="page pad"><div class="ph1"><a class="back" href="#library" aria-label="رجوع">' + ico('back') + '</a><h1 class="ar" style="font-size:24px">' + esc(title) + '</h1><span class="ru">' + (course === 'b1' ? 'В1' : 'А1') + '</span></div>' +
    videoHtml(course, key, 'img/' + (course === 'b1' ? 'u4' : 'u2') + '.jpg') + '</div>';
  bindVideo(null);
}

/* ---------- folk-art ornaments (original drawings in the spirit of Khokhloma, Palekh, Gzhel, Old Slavonic initials) ---------- */
var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, parent) { var e = document.createElementNS(SVGNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function drawIn(path, dur, delay) {
  var L = path.getTotalLength ? path.getTotalLength() : 300;
  path.style.strokeDasharray = L; path.style.strokeDashoffset = RM ? 0 : L;
  if (!RM) path.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: dur, delay: delay || 0, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
}
function popIn(node, delay) { node.style.transformBox = 'fill-box'; node.style.transformOrigin = 'center'; if (!RM) node.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 520, delay: delay, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }); }
function vine(svg) {   // Khokhloma: a gold stem that draws itself, gold leaves and red berries along it
  if (!svg || !svg.getTotalLength && !svg.appendChild) return;
  svg.innerHTML = '';
  var stem = sv('path', { class: 'v-stem', d: 'M4 24 C 40 6, 70 38, 108 22 S 176 8, 216 22' }, svg);
  drawIn(stem, 1400, 250);
  var L = stem.getTotalLength();
  [[.18, -1], [.36, 1], [.56, -1], [.74, 1], [.9, -1]].forEach(function (s, i) {
    var p = stem.getPointAtLength(L * s[0]), q = stem.getPointAtLength(L * s[0] + 2), ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI + s[1] * 55;
    var g = sv('g', { transform: 'translate(' + p.x + ' ' + p.y + ') rotate(' + ang + ')' }, svg);
    popIn(sv('path', { class: 'v-leaf', d: 'M0 0 C 4 -5, 12 -5, 15 0 C 12 5, 4 5, 0 0 Z' }, g), 380 + i * 220);
    if (i % 2 === 0) { var b = sv('g', { transform: 'translate(' + p.x + ' ' + (p.y + s[1] * 9) + ')' }, svg); sv('circle', { class: 'v-berry', r: 3.6 }, b); sv('circle', { class: 'v-hl', r: 1.1, cx: -1.1, cy: -1.2 }, b); popIn(b, 500 + i * 220); }
  });
}
function vineTag() { return rmdMode() === 'full' && (rmdPhase() || S.rmdPreviewDay === today()) ? khatamTag() : '<svg class="vine" viewBox="0 0 220 40" aria-hidden="true"></svg>'; }
function playOrnaments() { view.querySelectorAll('svg.khatam').forEach(khatam); document.body.classList.toggle('rmd', rmdMode() === 'full' && !!(rmdPhase() || S.rmdPreviewDay === today())); rmdDecorate(); view.querySelectorAll('svg.vine').forEach(vine); view.querySelectorAll('svg.bk-orn').forEach(bukvOrn); }
function bukvTitle(ru) {   // Old Slavonic initial (буквица): the first letter in cinnabar with a gold vine around it
  var t = String(ru || ''), first = t.charAt(0), rest = t.slice(1);
  if (rest.charAt(0) === '́') { first += rest.charAt(0); rest = rest.slice(1); }
  return '<span class="bk"><span class="bk-l"><svg class="bk-orn" viewBox="0 0 110 120" aria-hidden="true"></svg><span class="bk-c">' + esc(first) + '</span></span>' + esc(rest) + '</span>';
}
function bukvOrn(svg) {
  svg.innerHTML = '';
  drawIn(sv('path', { class: 'v-stem', d: 'M6 112 C -4 80, 10 40, 30 22 C 44 10, 66 6, 84 14 C 100 22, 104 40, 92 50 C 82 58, 70 50, 76 42 C 80 36, 90 40, 88 46' }, svg), 1600, 200);
  drawIn(sv('path', { class: 'v-stem', d: 'M100 108 C 108 90, 104 72, 94 64 C 86 58, 78 66, 84 72' }, svg), 1200, 650);
  [[30, 22], [84, 14], [100, 108], [6, 112]].forEach(function (c, i) { popIn(sv('circle', { class: 'v-dot', cx: c[0], cy: c[1], r: 3.2 }, svg), 900 + i * 150); });
}
function gzhelCorner(svg) {   // Gzhel: cobalt brush petals (light theme only)
  svg.innerHTML = '';
  var g = sv('g', { transform: 'translate(46 46)' }, svg);
  for (var i = 0; i < 9; i++) { var len = 26 + (i % 3) * 6;
    popIn(sv('path', { class: 'gz-p', d: 'M0 0 C -7 ' + (-len * .4) + ', -5 ' + (-len) + ', 0 ' + (-len - 6) + ' C 5 ' + (-len) + ', 7 ' + (-len * .4) + ', 0 0 Z', transform: 'rotate(' + (i * 40) + ')', opacity: (.5 + (i % 3) * .2).toFixed(2) }, g), 120 + i * 80); }
  popIn(sv('circle', { cx: 46, cy: 46, r: 7, class: 'gz-c' }, svg), 900);
  [[96, 18, 20], [112, 52, 70], [18, 100, 160], [60, 108, 120]].forEach(function (s, i) { popIn(sv('path', { class: 'gz-p', d: 'M0 0 C -5 -8, -3 -18, 0 -22 C 3 -18, 5 -8, 0 0 Z', transform: 'translate(' + s[0] + ' ' + s[1] + ') rotate(' + s[2] + ')', opacity: .7 }, svg), 1000 + i * 110); });
}
function gzhelDecor() {
  var box = document.getElementById('gzhel');
  if (!S.light) { if (box) box.remove(); return; }
  if (box) return;
  box = document.createElement('div'); box.id = 'gzhel'; box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<svg class="gz tl" viewBox="0 0 150 150"></svg><svg class="gz br" viewBox="0 0 150 150"></svg>';
  document.getElementById('app').appendChild(box); box.querySelectorAll('svg').forEach(gzhelCorner);
}

/* ---------- games and challenges (2026-11-20; reports/Games and challenges.md, Wave 1) ----------
   One engine for every game: no lives, no energy. A miss only breaks the combo; the timer is off unless the student turns it on.
   Content = the lessons this phone can open in the current level (newest 6). Difficulty adapts to keep about 85 % right:
   above 90 % the wrong options get closer to the answer, under 70 % they get easier. A missed word comes back first next time
   (S.gw: box 0 → due tomorrow; right → the gap doubles). */
var VOW = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ';
var GAMES = [
  { id: 'mix', ic: 'feather', ru: 'Микс дня', ar: 'تحدي الدقيقة', d: 'كل الألعاب في دقيقة واحدة. اجمع أكبر كومبو', need: 'any', timed: 60 },
  { id: 'stress', ic: 'spark', ru: 'Охо́тник за ударе́нием', ar: 'صياد التشديد', d: G('دوس على الحرف المتشدد في الكلمة', 'دوسي على الحرف المتشدد في الكلمة'), need: 'stress' },
  { id: 'ik', ic: 'talk', ru: 'Детекти́в интона́ции', ar: 'محقق النغمة', d: 'اسمع الجملة: سؤال ولا جملة عادية؟', need: 'ik' },
  { id: 'catch', ic: 'play', ru: 'Пойма́й сло́во', ar: 'امسك الكلمة', d: 'اسمع الكلمة واختار المكتوبة صح', need: 'words' },
  { id: 'meaning', ic: 'book', ru: 'Что э́то зна́чит?', ar: 'يعني إيه؟', d: 'جملة روسي: اختار معناها', need: 'sents' },
  { id: 'conj', ic: 'spark', ru: 'Спряже́ние на ско́рость', ar: 'تصريف سريع', d: 'الضمير والفعل: اختار التصريف الصح', need: 'conj' },
  { id: 'build', ic: 'talk', ru: 'Собери́ фра́зу', ar: 'رتّب الجملة', d: 'اسمع الجملة ورتّب كلماتها', need: 'build' },
  { id: 'dict', ic: 'test', ru: 'Дикта́нт', ar: 'إملاء', d: 'اسمع الكلمة واكتبها بالحروف الروسي (فيه كيبورد روسي)', need: 'dict' },
  { id: 'ending', ic: 'spark', ru: 'Ку́зница оконча́ний', ar: 'ورشة النهايات', d: 'كمّل آخر الكلمة في الجملة صح', need: 'ending' },
  { id: 'chat', ic: 'send', ru: 'Исто́рии в ча́те', ar: 'حكايات شات', d: 'الحوار كشات: اختار ردّك إنت في كل مرة', need: 'chat' },
  { id: 'memory', ic: 'star', ru: 'Па́мять', ar: 'الذاكرة', d: 'اقلب كارتين: الروسي ومعناه', need: 'words' },
  { id: 'reader', ic: 'test', ru: 'Скорочте́ние', ar: 'قراية سريعة', d: 'اقرا الكلمة الروسي واختار نطقها بالعربي', need: 'pr' }
];
var GM = null, GPOOL = null;
if (location.hostname === 'localhost') window.__gm = function () { return GM; };   // local testing only
var BSTART = 'я ты он она оно мы вы они это вот там тут здесь как где что кто когда куда откуда почему сколько чей чья чьё чьи у в во на а и но не да нет ну слушай привет здравствуйте спасибо пожалуйста извините мой моя моё мои твой твоя наш наша ваш ваша его её их всё все сегодня завтра вчера утром вечером можно нельзя надо мне тебе ему ей нам вам им меня тебя у с к по за из от до очень давай давайте хорошо отлично конечно сейчас потом тоже ещё уже'.split(' ');
function plain(t) { return String(t || '').replace(/́/g, ''); }
function editDist(a, b) {
  a = plain(a).toLowerCase(); b = plain(b).toLowerCase(); var m = a.length, n = b.length, d = [], i, j;
  for (i = 0; i <= m; i++) { d[i] = [i]; } for (j = 1; j <= n; j++) d[0][j] = j;
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
var RNG = Math.random;
function seeded(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(RNG() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function gameLessons() {
  var lv = levelNow(), out = [];
  unitsOf(lv).forEach(function (u) { u.lessons.forEach(function (l) { if (canOpen(l.num)) out.push(l.num); }); });
  var started = out.filter(function (n) { return stars(n) > 0; });
  var use = started.length ? started.slice(-6) : out.slice(0, 6);
  return use.length ? use : [1];
}
var ENDINGS = null;
function loadEndings() { return ENDINGS ? Promise.resolve(ENDINGS) : fetch('data/endings.json').then(function (r) { return r.json(); }).then(function (d) { ENDINGS = d; return d; }).catch(function () { return []; }); }
function gamePool(only) {
  var ns = only || gameLessons(), key = levelNow() + ':' + ns.join(',');
  if (GPOOL && GPOOL.key === key) return Promise.resolve(GPOOL);
  return Promise.all(ns.map(function (n) { return lesson(n).then(function (L) { return { n: n, L: L }; }, function () { return null; }); }).concat([loadEndings()])).then(function (rs) {
    var EN = rs.pop() || [];
    var P2 = { key: key, words: [], stress: [], ik: [], sents: [], pr: [], conj: [], build: [], dict: [], ending: [], dlgs: [], lines: [] }, seen = {};
    var maxN = Math.max.apply(null, ns.filter(function (n) { return n <= 30; }).concat([0]));
    EN.forEach(function (e) { if (e.n <= maxN && (!only || ns.indexOf(e.n) >= 0 || e.n <= maxN)) P2.ending.push({ n: e.n, ru: e.ru, ar: e.ar, a: e.a, url: 'audio/endings/' + e.a + '.mp3', pre: e.pre, ans: e.ans, post: e.post, wrong: e.wrong, hint: e.hint }); });
    rs.forEach(function (r) {
      if (!r) return; var n = r.n, L = r.L;
      (L.glossary || []).forEach(function (w) {
        if (!w.a || seen[w.ru]) return; seen[w.ru] = 1;
        var it = { n: n, ru: w.ru, ar: w.ar, pr: w.pr, a: w.a };
        P2.words.push(it);
        var marks = (w.ru.match(/́/g) || []).length, vows = plain(w.ru).split('').filter(function (c) { return VOW.indexOf(c) >= 0; }).length;
        if (marks === 1 && vows >= 2 && !/[\s-]/.test(w.ru)) P2.stress.push(it);
        if (w.pr) P2.pr.push(it);
        var bare = plain(w.ru); if (/^[а-яё]{3,10}$/i.test(bare)) P2.dict.push(it);
      });
      (L.vocab || []).forEach(function (b) { (b.rows || []).forEach(function (s) {
        if (s.a && s.ar && s.ru.length < 60) P2.sents.push({ n: n, ru: s.ru, ar: s.ar, a: s.a });
        var wn = String(s.ru || '').trim().split(/\s+/).length; if (s.a && wn >= 3 && wn <= 7 && !/[«»—]/.test(s.ru)) P2.build.push({ n: n, ru: s.ru.trim(), ar: s.ar, a: s.a });
      }); });
      (L.conj || []).forEach(function (v) {
        var fs = (v.forms || []).map(function (f) { var w = String(f.ru).trim().split(/\s+/); return { pron: w[0], verb: w.slice(1).join(' '), ru: f.ru, a: f.a }; }).filter(function (f) { return f.verb; });
        fs.forEach(function (f) { P2.conj.push({ n: n, ru: f.ru, ar: v.ar, a: f.a, inf: v.ru, pron: f.pron, verb: f.verb, all: fs }); });
      });
      (L.dialogues || []).forEach(function (d, di) {
        var ls = (d.lines || []).filter(function (l) { return l.a && l.ru; }), who = {}; ls.forEach(function (l) { who[l.who] = 1; });
        if (ls.length >= 4 && Object.keys(who).length === 2) P2.dlgs.push({ n: n, id: n + ':' + di, ru: d.ru, ar: d.ar, scene: d.scene, lines: ls.map(function (l) { return { n: n, who: l.who, ru: l.ru, ar: l.ar, a: l.a }; }) });
        ls.forEach(function (l) { if (String(l.ru).split(/\s+/).length >= 3) P2.lines.push({ n: n, d: n + ':' + di, ru: l.ru, ar: l.ar, a: l.a }); });
      });
      (L.dialogues || []).forEach(function (d) { (d.lines || []).forEach(function (l) {
        var t = String(l.ru || '').trim(); if (!l.a || t.length > 70) return;
        if (/\?$/.test(t)) P2.ik.push({ n: n, ru: t, ar: l.ar, a: l.a, q: true }); else if (/\.$/.test(t)) P2.ik.push({ n: n, ru: t, ar: l.ar, a: l.a, q: false });
      }); });
    });
    GPOOL = P2; return P2;
  });
}
function gwKey(it) { return plain(it.ru); }
function pickItems(list, k) {   // due (missed) words first, then fresh ones
  if (GM && GM.seed) return shuffle(list.slice()).slice(0, k);   // duel: no personal order, same for both
  var t = dayNum(today()), gw = S.gw || {};
  var due = list.filter(function (it) { var g = gw[gwKey(it)]; return g && dayNum(g.due) <= t; });
  var rest = shuffle(list.filter(function (it) { return due.indexOf(it) < 0; }));
  return shuffle(due).concat(rest).slice(0, k);
}
function gameLevel() { if (GM.seed) return 1; var h = GM.hist.slice(-5); if (h.length < 4) return 1; var r = h.filter(Boolean).length / h.length; return r >= .9 ? 2 : r <= .7 ? 0 : 1; }
function distract(it, list, field, k) {   // wrong options: close ones when the student is doing well
  var cand = list.filter(function (x) { return x[field] && x[field] !== it[field] && plain(x[field]) !== plain(it[field]); });
  var lvl = gameLevel();
  if (lvl > 0) cand.sort(function (a, b) { return editDist(a[field], it[field]) - editDist(b[field], it[field]); });
  else shuffle(cand);
  var top = lvl === 2 ? cand.slice(0, k) : shuffle(cand.slice(0, k * 3)).slice(0, k), out = [], used = {};
  top.forEach(function (x) { if (!used[x[field]]) { used[x[field]] = 1; out.push(x); } });
  return out.slice(0, k);
}
function makeQ(type, pool) {
  var it, opts;
  if (type === 'stress') { it = pickItems(pool.stress, 1)[0]; if (!it) return null; return { type: type, it: it }; }
  if (type === 'ik') { it = pickItems(pool.ik, 1)[0]; if (!it) return null; return { type: type, it: it }; }
  if (type === 'catch') { it = pickItems(pool.words, 1)[0]; if (!it) return null; opts = distract(it, pool.words, 'ru', 3); if (opts.length < 2) return null; return { type: type, it: it, opts: shuffle(opts.concat([it])) }; }
  if (type === 'meaning') { it = pickItems(pool.sents, 1)[0]; if (!it) return null; opts = distract(it, pool.sents, 'ar', 3); if (opts.length < 2) return null; return { type: type, it: it, opts: shuffle(opts.concat([it])) }; }
  if (type === 'dict') {
    var useS = gameLevel() === 2 && pool.build.length && RNG() < .35;   // doing well → short sentences too
    it = useS ? pickItems(pool.build.filter(function (x) { return x.ru.split(/\s+/).length <= 4; }), 1)[0] : null;
    if (!it) it = pickItems(pool.dict, 1)[0]; if (!it) return null;
    return { type: type, it: it, typed: '' };
  }
  if (type === 'ending') {
    it = pickItems(pool.ending, 1)[0]; if (!it) return null;
    var me2 = { e: it.ans }; return { type: type, it: it, right: me2, opts: shuffle(it.wrong.map(function (w) { return { e: w }; }).concat([me2])) };
  }
  if (type === 'conj') {
    it = pickItems(pool.conj, 1)[0]; if (!it) return null;
    var other = shuffle(it.all.filter(function (f) { return plain(f.verb) !== plain(it.verb); })).slice(0, 3).map(function (f) { return { verb: f.verb }; });
    if (other.length < 2) return null; var me = { verb: it.verb }; return { type: type, it: it, opts: shuffle(other.concat([me])), right: me };
  }
  if (type === 'build') {
    it = pickItems(pool.build, 1)[0]; if (!it) return null;
    var words = it.ru.split(/\s+/), endm = (words[words.length - 1].match(/[.!?…]+$/) || [''])[0];
    words[words.length - 1] = words[words.length - 1].replace(/[.!?…]+$/, '');
    if (BSTART.indexOf(plain(words[0]).toLowerCase().replace(/[,.!?…]/g, '')) >= 0) words[0] = words[0].charAt(0).toLowerCase() + words[0].slice(1);   // the capital would give the first word away
    var tiles = words.map(function (w, i) { return { w: w, i: i }; });
    var sh = shuffle(tiles.slice()), tries = 0; while (tries++ < 5 && sh.every(function (t, i) { return t.i === i; })) sh = shuffle(tiles.slice());
    return { type: type, it: it, tiles: sh, words: words, got: [], endm: endm };
  }
  if (type === 'reader') { it = pickItems(pool.pr, 1)[0]; if (!it) return null; opts = distract(it, pool.pr, 'pr', 3); if (opts.length < 2) return null; return { type: type, it: it, opts: shuffle(opts.concat([it])) }; }
  return null;
}
function gameAvail(pool) {
  return { stress: pool.stress.length >= 4, ik: pool.ik.length >= 4, catch: pool.words.length >= 4, meaning: pool.sents.length >= 4, reader: pool.pr.length >= 4, conj: pool.conj.length >= 6, build: pool.build.length >= 4, memory: pool.words.length >= 6, dict: pool.dict.length >= 4, ending: pool.ending.length >= 4, chat: pool.dlgs.length >= 1 && pool.lines.length >= 8 };
}
function vGames() {
  var h = '<div class="page pad"><div class="topbar" style="padding:0"><a class="back" href="#practice" aria-label="رجوع">' + ico('back') + '</a></div>' +
    '<div class="ph1"><h1 class="ar">ألعاب وتحديات</h1><span class="ru">Игра́ть</span></div>' +
    '<p class="ar" style="color:var(--dim);margin:6px 0 14px">' + G('من الدروس اللي فتحتها', 'من الدروس اللي فتحتيها') + ' في مستوى <span class="ru">' + LEVELS.filter(function (x) { return x.id === levelNow(); })[0].ru + '</span>. مفيش قلوب ولا طاقة: الغلطة بتقطع الكومبو بس، والكلمة اللي ' + G('تغلط', 'تغلطي') + ' فيها بترجعلك بكرة.</p>' +
    '<div id="gsocial">' + socialGamesHtml() + '</div>' +
    '<div class="games" id="glist"><p class="ar" style="color:var(--dim)">بيحمّل…</p></div>' +
    '<section class="sec"><h2><span>زعيم الوحدة</span><span class="ru">Босс</span></h2><div class="games">' + bossUnits().map(function (b) {
      var won = (S.boss || {})[b.i];
      return '<a class="gcard boss' + (b.open ? '' : ' off') + (won ? ' won' : '') + '" href="' + (b.open ? '#boss/' + b.i : '#games') + '"><span class="ni">' + ico(won ? 'star' : 'lock') + '</span><span class="tx"><span class="ru">' + esc(b.u.ru) + '</span><b class="ar">' + esc(b.u.ar) + '</b><small class="ar">' +
        (won ? 'اتغلب يوم ' + ad(String(won.at).split('-').reverse().join('/')) : b.open ? '٣ جولات: اسمع، افهم، وفويس للمدرس' : G('ابدأ', 'ابدئي') + ' ٣ دروس من الوحدة عشان يفتح (' + ad(b.started) + '/٣)') + '</small></span></a>'; }).join('') + '</div></section>' +
    '<a class="gcard album-link" href="#album" style="margin-top:10px"><span class="ni">' + ico('book') + '</span><span class="tx"><span class="ru">Альбо́м слов</span><b class="ar">ألبوم الكلمات</b><small class="ar">' + ad(Object.keys(S.album || {}).length) + ' كلمة ' + G('جمعتها', 'جمعتيها') + (S.albumNew ? ' · ' + ad(S.albumNew) + ' جديدة' : '') + '</small></span>' + ico('back', 'end') + '</a>' +
    '<button class="set" data-set="gTimed" style="margin-top:8px"><span class="tx">' + G('العب بالوقت', 'العبي بالوقت') + '<small>١٠ ثواني لكل سؤال، للي ' + G('عايز', 'عايزة') + ' تحدي أكبر</small></span><span class="tog' + (S.gTimed ? ' on' : '') + '"></span></button></div>';
  view.innerHTML = h;
  Promise.all([loadContests(), loadDuels()]).then(function () { var gs = document.getElementById('gsocial'); if (gs) gs.innerHTML = socialGamesHtml(); });
  gamePool().then(function (pool) {
    var av = gameAvail(pool), el = document.getElementById('glist'); if (!el) return;
    el.innerHTML = GAMES.map(function (g) {
      var ok = g.id === 'mix' ? Object.keys(av).some(function (k) { return av[k]; }) : av[g.id], best = (S.gbest || {})[g.id];
      return '<a class="gcard' + (ok ? '' : ' off') + (g.id === 'mix' ? ' hero' : '') + '" href="' + (ok ? '#game/' + g.id : '#games') + '"><span class="ni">' + ico(g.ic) + '</span><span class="tx"><span class="ru">' + g.ru + '</span><b class="ar">' + g.ar + '</b><small class="ar">' +
        (ok ? g.d : (g.id === 'reader' ? 'للدروس اللي فيها النطق بالعربي' : G('افتح', 'افتحي') + ' درس كمان الأول')) + '</small></span>' + (best ? '<span class="best"><small class="ar">أعلى</small><b>' + ad(best) + '</b></span>' : '') + '</a>';
    }).join('');
  });
}
function vGame(id) {
  var g = GAMES.filter(function (x) { return x.id === id; })[0]; if (!g) { go('#games'); return; }
  view.innerHTML = '<div class="page pad"><p class="ar" style="color:var(--dim)">بيحمّل…</p></div>';
  gamePool().then(function (pool) {
    var av = gameAvail(pool), types = g.id === 'mix' ? Object.keys(av).filter(function (k) { return av[k] && k !== 'memory' && k !== 'dict' && k !== 'chat'; }) : [g.id];
    if (!types.length || (g.id !== 'mix' && !av[g.id])) { go('#games'); return; }
    if (g.id === 'memory') { memoryStart(g, pool); return; }
    if (g.id === 'chat') { chatStart(g, pool); return; }
    GM = { g: g, pool: pool, types: types, i: 0, total: g.timed ? 999 : 10, combo: 0, best: 0, score: 0, right: 0, wrong: 0, hist: [], missed: [], end: g.timed ? Date.now() + g.timed * 1000 : 0, q: null, lock: false };
    view.innerHTML = '<div class="page pad game"><div class="gtop"><a class="back" href="#games" aria-label="رجوع">' + ico('back') + '</a><span class="gname"><span class="ru">' + g.ru + '</span></span>' +
      '<span class="gstat"><span class="combo" id="gcombo"></span><b id="gscore">' + ad(0) + '</b></span></div>' +
      '<div class="gbar"><i id="gbar"></i></div><div id="gq"></div></div>';
    gameNext();
    if (GM.end) gameTick();
  });
}
function gameTick() {
  if (!GM || !GM.end || parse().name !== 'game') return;
  var left = Math.max(0, GM.end - Date.now()), b = document.getElementById('gbar');
  if (b) b.style.transform = 'scaleX(' + (left / (GM.g.timed * 1000)).toFixed(3) + ')';
  if (!left) { gameOver(); return; }
  setTimeout(gameTick, 250);
}
function gameNext() {
  if (!GM) return;
  if (!GM.end && GM.i >= GM.total) { gameOver(); return; }
  var q = null, tries = 0;
  while (!q && tries++ < 12) q = makeQ(GM.types[Math.floor(RNG() * GM.types.length)], GM.pool);
  if (!q) { gameOver(); return; }
  GM.q = q; GM.lock = false; GM.i++; GM.qStart = Date.now();
  if (!GM.end) { var b = document.getElementById('gbar'); if (b) b.style.transform = 'scaleX(' + ((GM.i - 1) / GM.total).toFixed(3) + ')'; }
  var it = q.it, h = '';
  if (q.type === 'stress') {
    var letters = plain(it.ru).split(''), vi = 0, mark = it.ru.indexOf('́') - 1;
    GM.q.ans = plain(it.ru.slice(0, mark + 1)).length - 1;
    h = '<p class="gask ar">' + G('دوس', 'دوسي') + ' على الحرف المتشدد</p><div class="sword ru">' + letters.map(function (c, i) {
      return VOW.indexOf(c) >= 0 ? '<button class="sv" data-gv="' + i + '">' + esc(c) + '</button>' : '<span>' + esc(c) + '</span>'; }).join('') + '</div><p class="gsub ar">' + esc(it.ar) + '</p>';
  } else if (q.type === 'ik') {
    h = '<p class="gask ar">' + G('اسمع', 'اسمعي') + ': سؤال ولا جملة عادية؟</p><button class="gplay" data-gplay="1" aria-label="اسمع">' + ico('play') + '</button>' +
      '<div class="gopts two"><button data-gik="1"><span class="arr">↗</span><span class="ar">سؤال</span></button><button data-gik="0"><span class="arr">↘</span><span class="ar">جملة عادية</span></button></div>';
  } else if (q.type === 'catch') {
    h = '<p class="gask ar">' + G('اسمع واختار', 'اسمعي واختاري') + ' الكلمة</p><button class="gplay" data-gplay="1" aria-label="اسمع">' + ico('play') + '</button>' +
      '<div class="gopts">' + q.opts.map(function (o, i) { return '<button data-gop="' + i + '" class="ru">' + esc(o.ru) + '</button>'; }).join('') + '</div>';
  } else if (q.type === 'meaning') {
    h = '<p class="gask ar">يعني إيه؟</p><div class="gru ru">' + esc(it.ru) + '</div><button class="gplay sm" data-gplay="1" aria-label="اسمع">' + ico('play') + '</button>' +
      '<div class="gopts">' + q.opts.map(function (o, i) { return '<button data-gop="' + i + '" class="ar">' + esc(o.ar) + '</button>'; }).join('') + '</div>';
  } else if (q.type === 'conj') {
    h = '<p class="gask ar">' + G('اختار', 'اختاري') + ' التصريف الصح</p><div class="gru ru"><span class="pron">' + esc(it.pron) + '</span> <span class="inf">(' + esc(it.inf) + ')</span></div><p class="gsub ar">' + esc(it.ar) + '</p>' +
      '<div class="gopts">' + q.opts.map(function (o, i) { return '<button data-gop="' + i + '" class="ru">' + esc(o.verb) + '</button>'; }).join('') + '</div>';
  } else if (q.type === 'dict') {
    h = '<p class="gask ar">' + G('اسمع واكتب', 'اسمعي واكتبي') + '</p><button class="gplay sm" data-gplay="1" aria-label="اسمع">' + ico('play') + '</button><p class="gsub ar">' + esc(it.ar) + '</p>' +
      '<div class="dtyped ru" id="dtyped" aria-live="polite"><span class="cur"></span></div>' + kbdHtml();
  } else if (q.type === 'ending') {
    h = '<p class="gask ar">' + G('كمّل', 'كمّلي') + ' آخر الكلمة</p><div class="gru ru">' + esc(it.pre) + '<span class="gap">…</span>' + esc(it.post) + '</div><p class="gsub ar">' + esc(it.ar) + '</p>' +
      '<div class="gopts two3">' + q.opts.map(function (o, i) { return '<button data-gop="' + i + '" class="ru">-' + esc(o.e) + '</button>'; }).join('') + '</div>';
  } else if (q.type === 'build') {
    h = '<p class="gask ar">' + G('اسمع ورتّب', 'اسمعي ورتّبي') + ' الجملة</p><button class="gplay sm" data-gplay="1" aria-label="اسمع">' + ico('play') + '</button><p class="gsub ar">' + esc(it.ar) + '</p>' +
      '<div class="bline ru" id="bline"></div><div class="btiles ru">' + q.tiles.map(function (t, k) { return '<button data-bt="' + k + '">' + esc(t.w) + '</button>'; }).join('') + '</div>';
  } else if (q.type === 'reader') {
    h = '<p class="gask ar">بتتنطق إزاي؟</p><div class="gru ru big">' + esc(it.ru) + '</div>' +
      '<div class="gopts">' + q.opts.map(function (o, i) { return '<button data-gop="' + i + '" class="ar">' + esc(o.pr) + '</button>'; }).join('') + '</div>';
  }
  var box = document.getElementById('gq'); box.innerHTML = '<div class="gcardq">' + h + '<div class="gfb" id="gfb"></div></div>';
  if (q.type === 'ik' || q.type === 'catch' || q.type === 'build' || q.type === 'dict') gameSay();
  catGameQ();
  if (S.gTimed && !GM.end) { clearTimeout(GM.tt); GM.tt = setTimeout(function () { if (GM && GM.q === q && !GM.lock) gameAnswer(false, null); }, 10000); }
}
function gameSay() { if (GM && GM.q) { au.src = GM.q.it.url || audioUrl(GM.q.it.n, GM.q.it.a); var p = au.play(); if (p && p.catch) p.catch(function () {}); } }
function gameAnswer(ok, btn) {
  if (!GM || GM.lock) return; GM.lock = true; clearTimeout(GM.tt); clearTimeout(catIdle); catGameAnswer(ok);
  var q = GM.q, it = q.it, fb = document.getElementById('gfb'), gw = S.gw = S.gw || {}, k = gwKey(it), t = today();
  GM.hist.push(ok);
  if (ok) {
    GM.right++; GM.combo++; GM.best = Math.max(GM.best, GM.combo);
    var fast = Date.now() - GM.qStart < 4000;
    GM.score += 10 * (1 + Math.floor(GM.combo / 3)) + (fast ? 2 : 0);
    if (btn) btn.classList.add('ok');
    chime(GM.combo % 5 === 0 ? [1046.5, 1318.5, 1568] : [1318.5]); buzz([10]);
    var g0 = gw[k]; if (g0) { g0.gap = Math.min(30, (g0.gap || 1) * 2); g0.due = addDays(g0.gap); }
    if (q.type === 'catch' || q.type === 'stress' || q.type === 'reader' || (q.type === 'dict' && it.pr !== undefined)) albumAdd(it);
  } else {
    GM.wrong++; GM.combo = 0; GM.missed.push(it);
    if (btn) btn.classList.add('no');
    gw[k] = { gap: 1, due: addDays(1) };
  }
  var right = '';
  if (q.type === 'stress') { var v = view.querySelector('[data-gv="' + q.ans + '"]'); if (v) v.classList.add('ok'); right = '<span class="ru">' + esc(it.ru) + '</span>'; }
  else if (q.type === 'ik') { var r = view.querySelector('[data-gik="' + (it.q ? 1 : 0) + '"]'); if (r) r.classList.add('ok'); right = '<span class="ru">' + esc(it.ru) + '</span>'; }
  else if (q.type === 'conj') { q.opts.forEach(function (o, i) { if (o === q.right) { var c = view.querySelector('[data-gop="' + i + '"]'); if (c) c.classList.add('ok'); } }); right = '<span class="ru">' + esc(it.ru) + '</span>'; }
  else if (q.type === 'build') { right = '<span class="ru">' + esc(it.ru) + '</span><small class="ar">' + esc(it.ar || '') + '</small>'; }
  else if (q.type === 'dict') { right = '<span class="ru">' + esc(it.ru) + '</span>' + (q.near ? '<small class="ar">قربت أوي! حرف واحد بس</small>' : ''); }
  else if (q.type === 'ending') { q.opts.forEach(function (o, i) { if (o === q.right) { var c = view.querySelector('[data-gop="' + i + '"]'); if (c) c.classList.add('ok'); } });
    var gp = view.querySelector('.gap'); if (gp) { gp.textContent = it.ans; gp.classList.add('filled'); }
    right = '<span class="ru">' + esc(it.ru) + '</span><small class="ar">' + esc(it.hint) + '</small>'; }
  else { q.opts.forEach(function (o, i) { if (o === it) { var c = view.querySelector('[data-gop="' + i + '"]'); if (c) c.classList.add('ok'); } }); right = '<span class="ru">' + esc(it.ru) + '</span><small class="ar">' + esc(it.ar || '') + '</small>'; }
  if (fb) fb.innerHTML = '<div class="' + (ok ? 'good' : 'bad') + '"><b class="ar">' + (ok ? ['برافو!', 'تمام!', 'كده بالظبط', 'ممتاز'][GM.right % 4] : G('ولا يهمك، الصح:', 'ولا يهمك، الصح:')) + '</b>' + right + '</div>';
  var c2 = document.getElementById('gcombo'); if (c2) { c2.textContent = GM.combo >= 2 ? '×' + ad(GM.combo) : ''; c2.classList.remove('pop'); void c2.offsetWidth; if (GM.combo >= 2) c2.classList.add('pop'); }
  var sc = document.getElementById('gscore'); if (sc) sc.textContent = ad(GM.score);
  if (q.type !== 'ik' && q.type !== 'catch' && q.type !== 'build' && q.type !== 'dict') gameSay(); else if ((q.type === 'build' || q.type === 'dict') && !ok) gameSay();
  store();
  setTimeout(gameNext, ok ? 900 : 1900);
}
/* dictation: a Russian keyboard inside the app (most phones here have no Russian layout); a physical keyboard works too */
var KROWS = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбюё'];
function kbdHtml() {
  return '<div class="kbd ru">' + KROWS.map(function (r, i) { return '<div class="kr">' + r.split('').map(function (c) { return '<button data-k="' + c + '">' + c + '</button>'; }).join('') +
    (i === 2 ? '<button data-k="bs" class="wide" aria-label="امسح">⌫</button>' : '') + '</div>'; }).join('') +
    '<div class="kr"><button data-k=" " class="space" aria-label="مسافة">␣</button><button data-k="ok" class="go">' + ico('check') + '</button></div></div>';
}
function normRu(t) { return plain(t).toLowerCase().replace(/ё/g, 'е').replace(/[^а-я ]/g, '').replace(/\s+/g, ' ').trim(); }
function kbdKey(k) {
  var q = GM.q; if (GM.lock) return;
  if (k === 'bs') q.typed = q.typed.slice(0, -1);
  else if (k === 'ok') { if (!q.typed.trim()) return; var a = normRu(q.typed), b = normRu(q.it.ru); q.near = a !== b && b.length >= 5 && editDist(a, b) === 1;
    var el = document.getElementById('dtyped'); if (el) el.classList.add(a === b ? 'ok' : 'no'); gameAnswer(a === b, null); return; }
  else if (q.typed.length < 40) q.typed += k;
  var d = document.getElementById('dtyped'); if (d) d.innerHTML = esc(q.typed) + '<span class="cur"></span>';
}
document.addEventListener('keydown', function (e) {
  if (!GM || !GM.q || GM.q.type !== 'dict' || e.ctrlKey || e.metaKey || e.altKey) return;
  var k = e.key; if (k === 'Backspace') { kbdKey('bs'); e.preventDefault(); } else if (k === 'Enter') { kbdKey('ok'); e.preventDefault(); }
  else if (/^[а-яёА-ЯЁ ]$/.test(k)) { kbdKey(k.toLowerCase()); e.preventDefault(); }
});
/* unit boss: 3 rounds — listen (5), understand and build (5), then speak: a voice note to the teacher. Opens when 3 lessons of the unit are started */
function bossUnits() {
  return unitsOf(levelNow()).map(function (u) {
    var ns = u.lessons.map(function (l) { return l.num; }).filter(canOpen), started = ns.filter(function (n) { return stars(n) > 0; }).length;
    return { u: u, i: IDX.units.indexOf(u), ns: ns, open: ns.length && started >= Math.min(3, ns.length), started: started };
  }).filter(function (b) { return b.ns.length; });
}
function vBoss(i) {
  i = +i; var b = bossUnits().filter(function (x) { return x.i === i; })[0];
  if (!b || !b.open) { go('#games'); return; }
  view.innerHTML = '<div class="page pad"><p class="ar" style="color:var(--dim)">بيحمّل…</p></div>';
  gamePool(b.ns).then(function (pool) {
    var av = gameAvail(pool);
    var r1 = ['ik', 'catch'].filter(function (k) { return av[k]; }), r2 = ['meaning', 'build', 'conj', 'ending'].filter(function (k) { return av[k]; });
    if (!r1.length) r1 = r2; if (!r2.length) r2 = r1;
    GM = { g: { id: 'boss', ru: 'Босс', ar: 'زعيم الوحدة' }, boss: b, rounds: [r1, r2], round: 0, pool: pool, types: r1, i: 0, total: 5, combo: 0, best: 0, score: 0, right: 0, wrong: 0, hist: [], missed: [], end: 0, q: null, lock: false };
    view.innerHTML = '<div class="page pad game boss"><div class="gtop"><a class="back" href="#games" aria-label="رجوع">' + ico('back') + '</a><span class="gname"><span class="ru">' + esc(b.u.ru) + '</span></span>' +
      '<span class="gstat"><span class="combo" id="gcombo"></span><b id="gscore">' + ad(0) + '</b></span></div>' +
      '<div class="rounds" id="rounds">' + ['اسمع', 'افهم وركّب', 'اتكلم'].map(function (t, k) { return '<span' + (k === 0 ? ' class="on"' : '') + '>' + ad(k + 1) + ' · ' + t + '</span>'; }).join('') + '</div>' +
      '<div class="gbar"><i id="gbar"></i></div><div id="gq"></div></div>';
    gameNext();
  });
}
function bossRoundDone() {   // called by gameOver while GM.boss is set
  var acc = GM.right / Math.max(1, GM.right + GM.wrong);
  var rs = document.querySelectorAll('#rounds span');
  if (GM.round === 0) {
    GM.round = 1; GM.types = GM.rounds[1]; GM.i = 0; GM.done = false;
    rs.forEach(function (x, k) { x.classList.toggle('on', k === 1); x.classList.toggle('ok', k === 0); });
    document.getElementById('gq').innerHTML = '<div class="gend"><h2 class="ar">الجولة الأولى خلصت</h2><p class="ar">' + ad(GM.right) + ' من ' + ad(GM.right + GM.wrong) + ' صح. الجولة التانية: افهم وركّب.</p><button class="btn" data-act="bossgo">' + G('كمّل', 'كمّلي') + '</button></div>';
    return true;
  }
  if (GM.round === 1) {
    if (acc < .7) {
      document.getElementById('gq').innerHTML = '<div class="gend"><span class="ni big">' + ico('feather') + '</span><h2 class="ar">الزعيم لسه واقف!</h2><p class="ar">محتاج ٧٠٪ عشان ' + G('توصل', 'توصلي') + ' لجولة الكلام. ' + G('راجع', 'راجعي') + ' الكلمات دي و' + G('ارجع', 'ارجعي') + ' تاني.</p>' +
        '<div class="box" style="width:100%"><div class="words">' + GM.missed.slice(0, 8).map(function (it) { return wrow({ ru: it.ru, ar: it.ar, a: it.url ? '' : it.a }, it.n); }).join('') + '</div></div>' +
        '<div class="row2"><a class="btn" href="#boss/' + GM.boss.i + '" data-act="greplay">' + G('حاول تاني', 'حاولي تاني') + '</a><a class="btn ghost" href="#games">ألعاب تانية</a></div></div>';
      return true;
    }
    GM.round = 2;
    rs.forEach(function (x, k) { x.classList.toggle('on', k === 2); x.classList.toggle('ok', k < 2); });
    var L = CACHE[GM.boss.ns[GM.boss.ns.length - 1]] || {}, model = (L.summary || []).slice(0, 3);
    document.getElementById('gq').innerHTML = '<div class="gend"><span class="ni big">' + ico('mic') + '</span><h2 class="ar">الجولة الأخيرة: ' + G('اتكلم', 'اتكلمي') + '</h2>' +
      '<p class="ar">' + G('سجّل', 'سجّلي') + ' فويس نص دقيقة: ' + G('عرّف', 'عرّفي') + ' نفسك و' + G('قول', 'قولي') + ' ٣ جمل من الوحدة دي. المدرس هيسمعه ويرد عليك.</p>' +
      (model.length ? '<div class="box" style="width:100%"><h3 class="ar">جمل تساعدك</h3><div class="words">' + model.map(function (r) { return wrow(r, GM.boss.ns[GM.boss.ns.length - 1]); }).join('') + '</div></div>' : '') +
      '<div style="width:100%">' + recHtml(GM.boss.ns[GM.boss.ns.length - 1], 'boss', 'فويس الزعيم للمدرس') + '</div>' +
      '<button class="btn ghost" data-act="bosswin">' + (S.token ? G('بعت الفويس؟ خلّص الزعيم', 'بعتي الفويس؟ خلّصي الزعيم') : G('سجّلت على واتساب؟ خلّص الزعيم', 'سجّلتي على واتساب؟ خلّصي الزعيم')) + '</button></div>';
    return true;
  }
  return false;
}
function bossWin() {
  if (!GM || !GM.boss) return; var b = GM.boss;
  S.boss = S.boss || {}; S.boss[b.i] = { score: GM.score, at: today() }; touchStreak(); save();
  document.querySelectorAll('#rounds span').forEach(function (x) { x.classList.add('ok'); x.classList.remove('on'); });
  var o = overlay('<div class="mstars"><svg viewBox="0 0 58 58"><path d="' + STAR + '"/></svg></div><h3 class="d-ar">' + mix(G('غلبت الزعيم!', 'غلبتي الزعيم!')) + '</h3><p class="ar">' + esc(b.u.ar) + '</p><span class="ru" style="color:var(--gold-hi)">' + esc(b.u.ru) + '</span>' +
    '<button class="btn" data-close>' + G('كمّل', 'كمّلي') + '</button>', 'm-done');
  o.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) { o.remove(); go('#games'); } });
  var shoot = burstCanvas(o.querySelector('canvas')); chime([784, 988, 1175, 1568]); buzz([20, 50, 20, 50, 60]);
  setTimeout(function () { var s1 = o.querySelector('.mstars svg'); if (s1) { s1.classList.add('on'); var r = s1.getBoundingClientRect(); shoot(r.left + r.width / 2, r.top + r.height / 2); } }, 300);
}
function buildTap(k) {
  var q = GM && GM.q; if (!q || q.type !== 'build' || GM.lock) return;
  var btn = view.querySelector('[data-bt="' + k + '"]'); if (!btn || btn.disabled) return;
  btn.disabled = true; q.got.push(k);
  var line = document.getElementById('bline'); var sp = document.createElement('button'); sp.textContent = q.tiles[k].w; sp.dataset.bb = k; line.appendChild(sp);
  if (q.got.length === q.tiles.length) {
    var said = q.got.map(function (j) { return plain(q.tiles[j].w).toLowerCase(); }).join(' '), want = q.words.map(function (w) { return plain(w).toLowerCase(); }).join(' ');
    var ok = said === want; line.classList.add(ok ? 'ok' : 'no'); if (q.endm) line.insertAdjacentHTML('beforeend', '<span class="endm">' + esc(q.endm) + '</span>'); gameAnswer(ok, null);
  }
}
function buildBack(k) {
  var q = GM && GM.q; if (!q || q.type !== 'build' || GM.lock) return;
  q.got = q.got.filter(function (j) { return j !== k; });
  var b = view.querySelector('[data-bb="' + k + '"]'); if (b) b.remove();
  var t = view.querySelector('[data-bt="' + k + '"]'); if (t) t.disabled = false;
}
/* memory: 6 pairs (Russian ↔ Arabic); a match plays the word. Score = fewer flips, combo for matches in a row */
/* chat stories: the lesson dialogue as a messenger chat; the student is one of the two people and picks their own next line */
function chatStart(g, pool) {
  var D = shuffle(pool.dlgs.slice())[0], who = D.lines[1].who;
  GM = { g: g, pool: pool, dlg: D, me: who, idx: 0, combo: 0, best: 0, score: 0, right: 0, wrong: 0, hist: [], missed: [], lock: false };
  view.innerHTML = '<div class="page pad game"><div class="gtop"><a class="back" href="#games" aria-label="رجوع">' + ico('back') + '</a><span class="gname"><span class="ru">' + esc(D.ru || g.ru) + '</span></span>' +
    '<span class="gstat"><span class="combo" id="gcombo"></span><b id="gscore">' + ad(0) + '</b></span></div>' +
    '<p class="ar gsub" style="margin:0 0 8px">' + G('إنت', 'إنتي') + ' <span class="ru">' + esc(who) + '</span>. ' + esc(D.scene || '') + '</p>' +
    '<div id="gq"><div class="gchat" id="chatlog"></div><div id="chatopts"></div></div></div>';
  chatStep();
}
function chatBubble(l, mine, extra) {
  var log = document.getElementById('chatlog'); if (!log) return;
  var b = document.createElement('div'); b.className = 'cbm' + (mine ? ' me' : '') + (extra ? ' ' + extra : '');
  b.innerHTML = '<small class="ru">' + esc(l.who) + '</small><span class="ru">' + esc(l.ru) + '</span>' + (S.hideTr ? '' : '<small class="ar">' + esc(l.ar || '') + '</small>');
  log.appendChild(b); b.scrollIntoView({ block: 'end', behavior: 'smooth' });
}
function chatSay(l, then) {
  var done = false, fin = function () { if (done) return; done = true; au.onended = null; clearTimeout(t); if (GM && GM.dlg) then(); };
  au.onended = fin; var t = setTimeout(fin, 7000);
  au.src = audioUrl(l.n, l.a); var pp = au.play(); if (pp && pp.catch) pp.catch(function () { setTimeout(fin, 900); });
}
function chatStep() {
  if (!GM || !GM.dlg) return;
  var L = GM.dlg.lines; if (GM.idx >= L.length) { document.getElementById('chatopts').innerHTML = ''; GM.done = false; setTimeout(function () { var log = document.getElementById('gq'); if (log) log.innerHTML = ''; gameOver(); }, 900); return; }
  var l = L[GM.idx];
  if (l.who !== GM.me) {
    var log = document.getElementById('chatlog'), ty = document.createElement('div'); ty.className = 'cbm typing'; ty.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(ty);
    setTimeout(function () { ty.remove(); chatBubble(l, false); chatSay(l, function () { GM.idx++; chatStep(); }); }, 700);
    return;
  }
  var wrong = shuffle(GM.pool.lines.filter(function (x) { return x.d !== GM.dlg.id && plain(x.ru) !== plain(l.ru); })).slice(0, 2);
  GM.copts = shuffle(wrong.concat([l])); GM.lock = false;
  document.getElementById('chatopts').innerHTML = '<p class="gask ar">' + G('ردّك إيه؟', 'ردّك إيه؟') + '</p><div class="gopts">' + GM.copts.map(function (o, i) { return '<button class="ru" data-copt="' + i + '">' + esc(o.ru) + '</button>'; }).join('') + '</div>';
}
function chatPick(i) {
  if (!GM || !GM.dlg || GM.lock) return; GM.lock = true;
  var l = GM.dlg.lines[GM.idx], o = GM.copts[i], ok = o === l;
  GM.hist.push(ok);
  if (ok) { GM.right++; GM.combo++; GM.best = Math.max(GM.best, GM.combo); GM.score += 10 * (1 + Math.floor(GM.combo / 3)); chime([1318.5]); buzz([10]); }
  else { GM.wrong++; GM.combo = 0; GM.missed.push(l); }
  document.getElementById('chatopts').innerHTML = ok ? '' : '<p class="ar gsub" style="color:#F09AA6">' + G('الرد ده مش مناسب هنا. الأنسب:', 'الرد ده مش مناسب هنا. الأنسب:') + '</p>';
  chatBubble(l, true, ok ? 'ok' : 'fix');
  var c2 = document.getElementById('gcombo'); if (c2) c2.textContent = GM.combo >= 2 ? '×' + ad(GM.combo) : '';
  var sc = document.getElementById('gscore'); if (sc) sc.textContent = ad(GM.score);
  chatSay(l, function () { var co = document.getElementById('chatopts'); if (co) co.innerHTML = ''; GM.idx++; chatStep(); });
}
/* buddy duel: 10 questions from a seed; the friend gets the same 10 (their lessons permitting) */
var DUELS = null;
function loadDuels() { if (!S.token || !API) return Promise.resolve(); return fetch(API + '/api/duel?t=' + encodeURIComponent(S.token)).then(function (r) { return r.json(); }).then(function (j) { if (j.ok) DUELS = j.duels; }).catch(function () {}); }
function vDuel(arg) {
  var start = function (seed, ns, duel) {
    view.innerHTML = '<div class="page pad"><p class="ar" style="color:var(--dim)">بيحمّل…</p></div>';
    RNG = seeded(seed);
    gamePool(ns).then(function (pool) {
      RNG = seeded(seed);
      var av = gameAvail(pool), types = ['stress', 'ik', 'catch', 'meaning', 'conj', 'ending', 'reader'].filter(function (k) { return av[k]; });
      if (!types.length) { go('#games'); return; }
      var g = { id: 'duel', ru: 'Дуэ́ль', ar: 'تحدي صاحبك' };
      GM = { g: g, pool: pool, types: types, i: 0, total: 10, combo: 0, best: 0, score: 0, right: 0, wrong: 0, hist: [], missed: [], end: 0, q: null, lock: false, seed: seed, duel: duel || { seed: seed, lessons: ns.join(',') } };
      view.innerHTML = '<div class="page pad game"><div class="gtop"><a class="back" href="#games" aria-label="رجوع">' + ico('back') + '</a><span class="gname"><span class="ru">Дуэ́ль</span></span>' +
        '<span class="gstat"><span class="combo" id="gcombo"></span><b id="gscore">' + ad(0) + '</b></span></div>' +
        (duel ? '<p class="ar gsub" style="margin:0 0 8px">' + esc(duel.other) + ' عمل ' + ad(duel.their) + ' نقطة. نفس الـ ١٠ أسئلة، ' + G('تقدر تغلبه؟', 'تقدري تغلبيه؟') + '</p>' : '') +
        '<div class="gbar"><i id="gbar"></i></div><div id="gq"></div></div>';
      gameNext();
    });
  };
  if (arg === 'new') { start(Math.floor(Math.random() * 2147483647), gameLessons(), null); return; }
  loadDuels().then(function () {
    var d = (DUELS || []).filter(function (x) { return x.id === +arg && !x.mine && x.my < 0; })[0]; if (!d) { go('#games'); return; }
    var ns = String(d.lessons || '').split(',').map(Number).filter(function (n) { return n && canOpen(n); });
    start(d.seed, ns.length ? ns : gameLessons(), d);
  });
}
function duelDone() {
  var d = GM.duel, body = d.id ? { id: d.id, score: GM.score, right: GM.right } : { seed: d.seed, lessons: d.lessons, score: GM.score, right: GM.right };
  var box = document.getElementById('gq');
  fetch(API + '/api/duel?t=' + encodeURIComponent(S.token), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (j) {
    var msg = d.id ? (GM.score > d.their ? G('كسبت!', 'كسبتي!') : GM.score === d.their ? 'تعادل!' : G('المرة الجاية هتغلبه', 'المرة الجاية هتغلبيه')) : (j.ok ? 'التحدي اتبعت لصاحبك. هيوصلك إشعار لما يلعب.' : j.reason === 'no_buddy' ? 'لسه مفيش صاحب مربوط بيك. اطلب من المدرس يربطك بصاحبك.' : 'التحدي ماتبعتش، جرّب تاني بعد شوية.');
    var st = box && box.querySelector('.gend h2'); if (st) st.textContent = msg;
    if (d.id && box) { var sc = box.querySelector('.gend .stats'); if (sc) sc.insertAdjacentHTML('afterend', '<p class="ar gsub">' + G('إنت', 'إنتي') + ' ' + ad(GM.score) + ' · ' + esc(d.other) + ' ' + ad(d.their) + '</p>'); }
    DUELS = null;
  }).catch(function () {});
}
/* class contests (the teacher starts them in the panel): every finished game adds its score; students see the class total, never a ranking */
var CONTESTS = null;
function loadContests() { if (!S.token || !API) return Promise.resolve(); return fetch(API + '/api/contest?t=' + encodeURIComponent(S.token)).then(function (r) { return r.json(); }).then(function (j) { if (j.ok) CONTESTS = j.contests; }).catch(function () {}); }
function contestAdd(gid, score) {
  if (!S.token || !API || !CONTESTS || !score) return '';
  var now = Date.now(), out = [];
  CONTESTS.forEach(function (c) {
    if (now < c.starts || now > c.ends || !(c.game === 'any' || c.game === gid || (c.game === 'mix' && gid === 'mix'))) return;
    out.push(c.name); c.mine.total += score; c.mine.best = Math.max(c.mine.best, score); c.total += score;
    fetch(API + '/api/contest?t=' + encodeURIComponent(S.token), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: c.id, score: score }) }).catch(function () {});
  });
  return out.length ? '<p class="rec ar">+' + ad(score) + ' نقطة لمسابقة «' + esc(out.join('، ')) + '»</p>' : '';
}
function socialGamesHtml() {
  var h = '', now = Date.now();
  (CONTESTS || []).forEach(function (c) {
    var on = now >= c.starts && now <= c.ends, gn = c.game === 'any' ? 'أي لعبة' : ((GAMES.filter(function (x) { return x.id === c.game; })[0] || {}).ar || c.game);
    h += '<a class="gcard contest" href="' + (on ? '#game/' + (c.game === 'any' ? 'mix' : c.game) : '#games') + '"><span class="ni">' + ico('star') + '</span><span class="tx"><span class="ru">Ко́нкурс</span><b class="ar">مسابقة: ' + esc(c.name) + '</b><small class="ar">' +
      (on ? gn + ' · لحد ' + ad(new Date(c.ends).getDate() + '/' + (new Date(c.ends).getMonth() + 1)) : 'بتبدأ يوم ' + ad(new Date(c.starts).getDate() + '/' + (new Date(c.starts).getMonth() + 1))) + (c.prize ? ' · الجايزة: ' + esc(c.prize) : '') + '</small>' +
      '<small class="ar">نقطك ' + ad(c.mine.total) + ' · الفصل كله ' + ad(c.total) + ' نقطة من ' + ad(c.players) + ' طالب</small></span></a>';
  });
  var so = S.social || {};
  if (so.buddy) {
    h += '<a class="gcard duel" href="#duel/new"><span class="ni">' + ico('send') + '</span><span class="tx"><span class="ru">Дуэ́ль</span><b class="ar">' + G('اتحدى', 'اتحدي') + ' ' + esc(so.buddy.name || 'صاحبك') + '</b><small class="ar">١٠ أسئلة، وهو هيلعب نفس الأسئلة</small></span></a>';
    (DUELS || []).forEach(function (d) {
      if (!d.mine && d.my < 0) h += '<a class="gcard duel hot" href="#duel/' + d.id + '"><span class="ni">' + ico('star') + '</span><span class="tx"><b class="ar">' + esc(d.other) + ' ' + G('بيتحداك', 'بيتحداكي') + '!</b><small class="ar">عمل ' + ad(d.their) + ' نقطة. ' + G('العب نفس الأسئلة', 'العبي نفس الأسئلة') + '</small></span></a>';
      else if (d.their >= 0 && d.my >= 0) h += '<div class="gcard duel done"><span class="ni">' + ico(d.my > d.their ? 'star' : 'feather') + '</span><span class="tx"><b class="ar">' + (d.my > d.their ? G('كسبت', 'كسبتي') : d.my === d.their ? 'تعادل' : 'المرة الجاية') + ' · ' + esc(d.other) + '</b><small class="ar">' + G('إنت', 'إنتي') + ' ' + ad(d.my) + ' · ' + esc(d.other) + ' ' + ad(d.their) + '</small></span></div>';
      else if (d.mine && d.their < 0) h += '<div class="gcard duel done"><span class="ni">' + ico('send') + '</span><span class="tx"><b class="ar">مستني ' + esc(d.other) + ' يلعب</b><small class="ar">' + G('إنت', 'إنتي') + ' ' + ad(d.my) + ' نقطة</small></span></div>';
    });
  }
  return h ? '<section class="sec"><h2><span>مع صحابك والفصل</span></h2><div class="games">' + h + '</div></section>' : '';
}
function memoryStart(g, pool) {
  var ws = pickItems(pool.words, 6), cards = [];
  ws.forEach(function (w, i) { cards.push({ p: i, side: 'ru', w: w }); cards.push({ p: i, side: 'ar', w: w }); });
  GM = { g: g, pool: pool, mem: shuffle(cards), open: [], pairs: 0, flips: 0, combo: 0, best: 0, score: 0, right: 0, wrong: 0, hist: [], missed: [], t0: Date.now(), lock: false };
  view.innerHTML = '<div class="page pad game"><div class="gtop"><a class="back" href="#games" aria-label="رجوع">' + ico('back') + '</a><span class="gname"><span class="ru">' + g.ru + '</span></span>' +
    '<span class="gstat"><span class="combo" id="gcombo"></span><b id="gscore">' + ad(0) + '</b></span></div>' +
    '<p class="gask ar" style="margin:4px 0 12px">' + G('اقلب كارتين: الكلمة الروسي ومعناها', 'اقلبي كارتين: الكلمة الروسي ومعناها') + '</p><div class="mem" id="gq">' +
    GM.mem.map(function (c, i) { return '<button class="mc" data-mc="' + i + '" aria-label="كارت"><span class="mbk"></span><span class="face ' + c.side + '">' + esc(c.side === 'ru' ? c.w.ru : c.w.ar) + '</span></button>'; }).join('') + '</div></div>';
}
function memoryTap(i) {
  if (!GM || !GM.mem || GM.lock) return;
  var c = GM.mem[i], el = view.querySelector('[data-mc="' + i + '"]'); if (!el || c.done || GM.open.indexOf(i) >= 0) return;
  el.classList.add('up'); GM.open.push(i); GM.flips++;
  if (c.side === 'ru') { au.src = audioUrl(c.w.n, c.w.a); var pp = au.play(); if (pp && pp.catch) pp.catch(function () {}); }
  if (GM.open.length < 2) return;
  var a = GM.mem[GM.open[0]], b = GM.mem[GM.open[1]], pair = GM.open.slice(); GM.open = [];
  if (a.p === b.p && a.side !== b.side) {
    a.done = b.done = true; GM.pairs++; GM.right++; GM.combo++; GM.best = Math.max(GM.best, GM.combo); GM.score += 10 * GM.combo;
    pair.forEach(function (j) { view.querySelector('[data-mc="' + j + '"]').classList.add('ok'); });
    chime(GM.combo >= 3 ? [1046.5, 1318.5, 1568] : [1318.5]); buzz([10]); albumAdd(a.w);
    if (GM.pairs === 6) setTimeout(memoryOver, 700);
  } else {
    GM.combo = 0; GM.wrong++; GM.lock = true;
    setTimeout(function () { pair.forEach(function (j) { var e = view.querySelector('[data-mc="' + j + '"]'); if (e) e.classList.remove('up'); }); if (GM) GM.lock = false; }, 900);
  }
  var c2 = document.getElementById('gcombo'); if (c2) c2.textContent = GM.combo >= 2 ? '×' + ad(GM.combo) : '';
  var sc = document.getElementById('gscore'); if (sc) sc.textContent = ad(GM.score);
}
function memoryOver() {
  if (!GM) return; var secs = Math.round((Date.now() - GM.t0) / 1000), bonus = Math.max(0, 60 - GM.flips * 2);
  GM.score += bonus; GM.right = 6; GM.wrong = Math.max(0, GM.flips / 2 - 6);
  view.querySelector('.mem').outerHTML = '<div id="gq"></div>';
  gameOver();
  var st = view.querySelector('.gend .stats'); if (st) st.insertAdjacentHTML('afterend', '<p class="gsub ar">' + ad(GM.flips) + ' قلبة في ' + ad(secs) + ' ثانية</p>');
}
/* word album: every word answered right is collected; 3 times right = a gold frame */
function albumAdd(it) {
  var A = S.album = S.album || {}, k = plain(it.ru), x = A[k];
  if (!x) { A[k] = { ru: it.ru, ar: it.ar, n: it.n, a: it.a, c: 1, at: today() }; S.albumNew = (S.albumNew || 0) + 1; }
  else x.c = Math.min(99, (x.c || 0) + 1);
}
function vAlbum() {
  var A = S.album || {}, keys = Object.keys(A), gold = keys.filter(function (k) { return A[k].c >= 3; }).length;
  S.albumNew = 0; store();
  var by = {}; keys.forEach(function (k) { var x = A[k]; (by[x.n] = by[x.n] || []).push(x); });
  var ns = Object.keys(by).map(Number).sort(function (a, b) { return a - b; });
  var h = '<div class="page pad"><div class="topbar" style="padding:0"><a class="back" href="#games" aria-label="رجوع">' + ico('back') + '</a></div>' +
    '<div class="ph1"><h1 class="ar">ألبوم الكلمات</h1><span class="ru">Альбо́м слов</span></div>' +
    '<p class="ar" style="color:var(--dim);margin:6px 0 12px">كل كلمة ' + G('بتجاوبها', 'بتجاوبيها') + ' صح في الألعاب بتدخل الألبوم. ٣ مرات صح = إطار دهبي.</p>' +
    '<div class="stats"><div class="stat"><b>' + ad(keys.length) + '</b><small>كلمة</small></div><div class="stat"><b>' + ad(gold) + '</b><small>إطار دهبي</small></div><div class="stat"><b>' + ad(ns.length) + '</b><small>درس</small></div></div>';
  h += keys.length ? ns.map(function (n) {
    return '<section class="sec"><h2><span>' + (LES[n] ? lessonLabel(n) : '') + '</span><span class="ru">' + esc(LES[n] ? LES[n].ru : '') + '</span></h2><div class="album">' +
      by[n].map(function (x) { return '<button class="acard' + (x.c >= 3 ? ' gold' : '') + '" data-url="' + audioUrl(x.n, x.a) + '" data-album="1"><span class="ru">' + esc(x.ru) + '</span><small class="ar">' + esc(x.ar) + '</small><i class="cnr a"></i><i class="cnr b"></i></button>'; }).join('') + '</div></section>';
  }).join('') : '<div class="empty"><span class="ni big">' + ico('book') + '</span><p class="ar">الألبوم لسه فاضي. ' + G('العب', 'العبي') + ' أي لعبة وأول كلمة ' + G('تجاوبها', 'تجاوبيها') + ' صح هتدخل هنا.</p><a class="btn" href="#games">يلا نلعب</a></div>';
  view.innerHTML = h + '</div>';
}
function gameOver() {
  if (!GM || GM.done) return; GM.done = true; clearTimeout(GM.tt);
  if (GM.boss && bossRoundDone()) return;
  RNG = Math.random;
  var g = GM.g, acc = GM.right + GM.wrong ? Math.round(GM.right / (GM.right + GM.wrong) * 100) : 0;
  S.gbest = S.gbest || {}; var rec = GM.score > (S.gbest[g.id] || 0); if (rec) S.gbest[g.id] = GM.score;
  S.gplays = (S.gplays || 0) + 1; if (g.id === 'dict' && GM.wrong === 0 && GM.right >= 10) S.dictPerfect = 1; touchStreak(); save();
  if (acc >= 80 && GM.right >= 5) { chime([784, 988, 1175, 1568]); buzz([20, 50, 20, 50, 40]); }
  var miss = GM.missed.filter(function (x, i, a) { return a.indexOf(x) === i; });
  document.getElementById('gq').innerHTML = '<div class="gend"><span class="ni big">' + ico(acc >= 80 ? 'star' : 'feather') + '</span>' +
    '<h2 class="ar">' + (acc >= 90 ? 'أداء بطل!' : acc >= 70 ? G('شغل حلو!', 'شغل حلو!') : G('كل لعبة بتعلّمك أكتر', 'كل لعبة بتعلّمك أكتر')) + '</h2>' +
    (rec ? '<p class="rec ar">رقم قياسي جديد!</p>' : '') +
    '<div class="stats"><div class="stat"><b>' + ad(GM.score) + '</b><small>نقطة</small></div><div class="stat"><b>' + ad(acc) + '٪</b><small>صح</small></div><div class="stat"><b>' + ad(GM.best) + '</b><small>أطول كومبو</small></div></div>' +
    (miss.length ? '<div class="box"><h3 class="ar">هيرجعولك بكرة</h3><div class="words">' + miss.slice(0, 8).map(function (it) { return wrow({ ru: it.ru, ar: it.ar, a: it.a }, it.n); }).join('') + '</div></div>' : '') +
    '<div class="row2"><a class="btn" href="#game/' + g.id + '" data-act="greplay">' + ico('play') + G('العب تاني', 'العبي تاني') + '</a><a class="btn ghost" href="#games">ألعاب تانية</a></div></div>';
  var b = document.getElementById('gbar'); if (b) b.style.transform = 'scaleX(1)';
  if (GM.duel) { duelDone(); return; }
  var ca = contestAdd(g.id, GM.score); if (ca) { var st2 = view.querySelector('.gend .stats'); if (st2) st2.insertAdjacentHTML('afterend', ca); }
}

/* ---------- inbox: the teacher's messages + automatic ones (2026-11-20) ---------- */
var NOTE_IC = { news: 'spark', lesson: 'book', video: 'film', zoom: 'user', homework: 'test', word: 'play', challenge: 'star', congrats: 'star', holiday: 'feather', reply: 'send', expiry: 'lock', daily: 'feather' };
var NOTE_AR = { news: 'خبر', lesson: 'درس جديد', video: 'فيديو جديد', zoom: 'حصة زووم', homework: 'واجب', word: 'كلمة اليوم', challenge: 'تحدي', congrats: 'تهنئة', holiday: 'مناسبة', reply: 'رد المدرس', expiry: 'الكود' };
var inboxBusy = false;
function loadInbox(quiet) {
  if (!API || inboxBusy) return Promise.resolve();
  inboxBusy = true;
  return fetch(API + '/api/inbox' + (S.token ? '?t=' + encodeURIComponent(S.token) : '')).then(function (r) { return r.json(); }).then(function (j) {
    inboxBusy = false; if (!j.ok) return;
    var old = {}; (S.inbox || []).forEach(function (m) { old[m.id] = m; });
    var first = !S.inboxSeen, fresh = 0;
    S.inbox = j.notes.map(function (n) { var o = old[n.id]; if (!o && !first) fresh++; return { id: n.id, at: n.sent_at, kind: n.kind, title: n.title, body: n.body, url: n.url, ru: n.ru, read: o ? o.read : first }; });
    S.inboxSeen = 1; store();
    if (fresh && !quiet) { chime([880, 1318.5]); buzz([16, 70, 16]); toast(G('وصلتلك رسالة جديدة', 'وصلتلك رسالة جديدة')); }
    paintBell();
  }).catch(function () { inboxBusy = false; });
}
function paintBell() {
  var n = inboxUnread();
  document.querySelectorAll('.bell').forEach(function (b) { var d = b.querySelector('.dot'); if (n) { if (!d) { d = document.createElement('b'); d.className = 'dot'; b.appendChild(d); } d.textContent = ad(n); } else if (d) d.remove(); });
  if (route && route.name === 'inbox') vInbox(route.arg);
}
function ago(ms) {
  var m = Math.round((Date.now() - ms) / 60000);
  if (m < 2) return 'دلوقتي'; if (m < 60) return 'من ' + ad(m) + ' دقيقة'; var h = Math.round(m / 60); if (h < 24) return 'من ' + ad(h) + ' ساعة';
  var d = Math.round(h / 24); return d === 1 ? 'امبارح' : 'من ' + ad(d) + ' يوم';
}
function vInbox(open) {
  var list = S.inbox || [];
  if (open) { list.forEach(function (m) { if (m.id === open && !m.read) { m.read = true; noteOpened(m.id); } }); store(); }
  var h = '<div class="page pad"><div class="topbar" style="padding:0"><a class="back" href="#home" aria-label="رجوع">' + ico('back') + '</a>' +
    (list.some(function (m) { return !m.read; }) ? '<button class="chip" data-act="readall">' + G('علّم الكل مقري', 'علّمي الكل مقري') + '</button>' : '') + '</div>' +
    '<div class="ph1"><h1 class="ar">الرسايل</h1><span class="ru">Сообще́ния</span></div>';
  h += list.length ? '<div class="inbox">' + list.map(function (m) {
    return '<button class="note' + (m.read ? '' : ' new') + (m.id === open ? ' focus' : '') + '" data-note="' + m.id + '"><span class="ni">' + ico(NOTE_IC[m.kind] || 'spark') + '</span><span class="tx">' +
      '<small class="ar">' + (NOTE_AR[m.kind] || '') + ' · ' + ago(m.at) + '</small><b class="ar">' + esc(m.title || 'Насле́дие') + '</b><span class="ar">' + mix(m.body) + '</span>' +
      (m.ru ? '<span class="ru nru">' + esc(m.ru) + '</span>' : '') + '</span></button>';
  }).join('') + '</div>' : '<div class="empty"><span class="ni big">' + ico('bell') + '</span><p class="ar">' + G('لسه مفيش رسايل. أول ما المدرس يبعت حاجة هتلاقيها هنا، وهيوصلك تنبيه بصوت لو مفعّل التنبيهات.', 'لسه مفيش رسايل. أول ما المدرس يبعت حاجة هتلاقيها هنا، وهيوصلك تنبيه بصوت لو مفعّلة التنبيهات.') + '</p></div>';
  if (!S.push && 'Notification' in window) h += '<button class="lrow" data-act="pushon" style="margin-top:14px;width:100%">' + ico('bell') + '<span class="tx"><b>' + G('شغّل التنبيهات', 'شغّلي التنبيهات') + '</b><small>عشان الرسايل توصلك بصوت حتى والتطبيق مقفول</small></span></button>';
  view.innerHTML = h + '</div>';
}
function noteOpened(id) { if (API) fetch(API + '/api/inbox', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: id, device: S.device }) }).catch(function () {}); }
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.type === 'note' && e.data.kind !== 'daily') loadInbox(); });
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') loadInbox(); });

/* ---------- big moments: lesson complete (Khokhloma burst), streak (Firebird), certificate (Palekh box) ---------- */
var actx = null;
function chime(notes) {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    (notes || [1046.5, 1318.5, 1568]).forEach(function (f, i) { var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * .24;
      o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.14, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .9);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 1); });
  } catch (e) {}
}
function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p || [14, 60, 14, 60, 28]); } catch (e) {} }
function burstCanvas(cv) {
  var cx = cv.getContext('2d'), parts = [], raf = 0, d = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
  cv.width = r.width * d; cv.height = r.height * d; cx.setTransform(d, 0, 0, d, 0, 0);
  function tick() {
    cx.clearRect(0, 0, r.width, r.height);
    parts = parts.filter(function (p) { return p.life > 0; });
    parts.forEach(function (p) {
      p.vx *= .985; p.vy = p.vy * .985 + .12; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= .009;
      cx.save(); cx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6)); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.c; cx.beginPath();
      if (p.leaf) { cx.moveTo(-p.r, 0); cx.quadraticCurveTo(0, -p.r * .7, p.r, 0); cx.quadraticCurveTo(0, p.r * .7, -p.r, 0); cx.fill(); }
      else { cx.arc(0, 0, p.r, 0, 6.283); cx.fill(); cx.fillStyle = 'rgba(255,220,205,.7)'; cx.beginPath(); cx.arc(-p.r * .3, -p.r * .3, p.r * .35, 0, 6.283); cx.fill(); }
      cx.restore();
    });
    raf = parts.length ? requestAnimationFrame(tick) : 0;
  }
  return function (x, y, n) {
    if (RM) return;
    var cols = ['#C2301F', '#A3221A', '#D6A85A', '#F0D49B', '#E3BF7E'];
    for (var i = 0; i < (n || 24); i++) { var a = Math.random() * 6.283, v = 2 + Math.random() * 4.2, leaf = Math.random() < .55;
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.2, r: leaf ? 5 + Math.random() * 4 : 2.6 + Math.random() * 2, leaf: leaf, c: leaf ? cols[2 + (i % 3)] : cols[i % 2], rot: Math.random() * 6, vr: (Math.random() - .5) * .25, life: 1 }); }
    if (!raf) raf = requestAnimationFrame(tick);
  };
}
function overlay(html, cls) {
  var o = document.createElement('div'); o.className = 'moment ' + (cls || ''); o.innerHTML = '<canvas aria-hidden="true"></canvas><div class="mbox">' + html + '</div>';
  document.body.appendChild(o); requestAnimationFrame(function () { o.classList.add('in'); });
  o.addEventListener('click', function (e) { if (e.target.closest('[data-close]') || e.target === o) { o.classList.remove('in'); setTimeout(function () { o.remove(); }, 350); } });
  return o;
}
var STAR = 'M29 4 L36.5 20.5 L54 22.5 L41 34.5 L44.5 52 L29 43.2 L13.5 52 L17 34.5 L4 22.5 L21.5 20.5 Z';
function celebrate(n) {
  var L = LES[n] || {};
  var o = overlay('<div class="mstars">' + [0, 1, 2].map(function () { return '<svg viewBox="0 0 58 58"><path d="' + STAR + '"/></svg>'; }).join('') + '</div>' +
    '<h3 class="d-ar">' + mix(G('برافو يا ', 'برافو يا ') + (S.name || '').split(' ')[0] + '!') + '</h3><p class="ar">الدرس ' + ad(n) + ' خلص بـ ٣ نجوم</p><span class="ru msub">' + esc(L.ru || '') + '</span>' +
    (function () { var ld = lessonsDoneCount(); return [5, 10, 15, 20, 25, 30].indexOf(ld) >= 0 ? '<button class="btn ghost" data-share-lessons="' + ld + '">' + G('شارك', 'شاركي') + ': ' + ad(ld) + ' درس</button>' : ''; })() +
    '<button class="btn" data-close>' + G('كمّل', 'كمّلي') + '</button>', 'm-done');
  o.addEventListener('click', function (e) { if (e.target.closest('[data-share-lessons]')) shareLessons(+e.target.closest('[data-share-lessons]').dataset.shareLessons); if (e.target.closest('[data-close]')) setTimeout(askPush, 600); });
  var shoot = burstCanvas(o.querySelector('canvas')); chime(); buzz();
  o.querySelectorAll('.mstars svg').forEach(function (s, i) { setTimeout(function () { s.classList.add('on'); var r = s.getBoundingClientRect(); shoot(r.left + r.width / 2, r.top + r.height / 2); }, 300 + i * 260); });
}
function afterProgress(n, s0) {
  if (s0 < 3 && stars(n) === 3) { setTimeout(function () { celebrate(n); checkCerts(); }, 250); return; }
  if (S.streakNew) { var c = S.streakNew; S.streakNew = 0; store(); setTimeout(function () { streakMoment(c); }, 250); }
}
function firebirdSvg(lit, fresh) {   // Жар-птица: one tail feather per day of the current week of the streak
  var h = '<svg class="firebird" viewBox="0 0 260 240" aria-hidden="true"><defs><linearGradient id="fgr" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#A3221A"/><stop offset=".55" stop-color="#D6762E"/><stop offset="1" stop-color="#F0D49B"/></linearGradient></defs>';
  for (var i = 0; i < 7; i++) { var r = -72 + i * 24;
    h += '<g class="fth' + (i < lit ? ' lit' : '') + (i === fresh ? ' new' : '') + '" style="--r:' + r + 'deg;transform:rotate(' + r + 'deg)"><path class="vane" d="M130 200 C 112 160, 110 96, 130 54 C 150 96, 148 160, 130 200 Z"/><ellipse class="eye" cx="130" cy="84" rx="9" ry="13"/><circle class="pupil" cx="130" cy="86" r="4"/></g>'; }
  return h + '<g class="bird"><path d="M118 206 C 118 186, 142 186, 142 206 C 142 222, 118 222, 118 206 Z"/><path d="M138 196 C 150 184, 160 186, 164 178 C 158 194, 150 200, 141 203 Z"/><circle cx="152" cy="186" r="1.6" fill="#1A0A08"/><path d="M146 177 L 150 168 L 153 176 L 158 170 L 158 179 Z"/></g></svg>';
}
function featherCount(n) { return n <= 0 ? 0 : ((n - 1) % 7) + 1; }
function streakMoment(count) {
  var lit = featherCount(count), full = lit === 7;
  var o = overlay(firebirdSvg(lit, lit - 1) + '<h3 class="d-ar">' + (full ? 'أسبوع كامل!' : ad(count) + (count === 1 ? ' يوم' : count <= 10 ? ' أيام' : ' يوم') + ' ورا بعض') + '</h3>' +
    '<p class="ar">' + (full ? 'طائر النار فرد ديله كله. ' + G('استمر', 'استمري') + ' عشان يفضل منوّر' : 'كل يوم ' + G('بتذاكر', 'بتذاكري') + ' فيه، طائر النار بيفرد ريشة جديدة') + '</p>' +
    '<p class="ar freeze">' + ico('check') + ' ' + (S.freezes ? 'معاك ' + ad(S.freezes) + (S.freezes === 1 ? ' حماية' : ' حمايات') + ': لو ' + G('غبت', 'غبتي') + ' يوم السلسلة مش هتقع' : 'كل ٧ أيام أو حصة زوم ' + G('بتكسب', 'بتكسبي') + ' حماية للسلسلة') + '</p>' +
    (count === 7 || count % 30 === 0 ? '<button class="btn ghost" data-share-streak="' + count + '">' + G('شارك', 'شاركي') + ' الإنجاز</button>' : '') +
    '<button class="btn" data-close>يلا</button>', 'm-fire' + (full ? ' full' : ''));
  o.addEventListener('click', function (e) { var b = e.target.closest('[data-share-streak]'); if (b) shareStreak(+b.dataset.shareStreak); });
  if (full) { chime([784, 988, 1175, 1568]); buzz([20, 50, 20, 50, 20, 50, 60]); } else chime([1175, 1568]);
}
function palekhCert(u, after) {   // the unit certificate waits in a black-lacquer box; the lid opens, the gold frame draws itself
  var U = IDX.units[u];
  var o = overlay('<div class="pbox"><div class="pcert"><svg class="pfr" viewBox="0 0 220 300" aria-hidden="true"><rect x="10" y="10" width="200" height="280" rx="8"/><rect x="16" y="16" width="188" height="268" rx="6"/>' +
    '<path d="M30 46 C40 30 60 30 70 22 M190 46 C180 30 160 30 150 22 M30 254 C40 270 60 270 70 278 M190 254 C180 270 160 270 150 278"/></svg>' +
    '<div class="pin"><span class="ru pt">Сертифика́т</span><span class="d-ar">شهادة إتمام</span><b class="ar">' + esc(S.name || '') + '</b><small class="ar">الوحدة ' + ad(u + 1) + ' · ' + esc(U.ar) + '</small><span class="ru ps">' + esc(U.ru) + ' · А1</span></div>' +
    '<div class="plid"><span class="ru">Насле́дие</span></div></div></div><button class="btn" data-close data-cert-next="' + u + '">' + G('نزّل الشهادة', 'نزّلي الشهادة') + '</button>', 'm-palekh');
  setTimeout(function () { o.classList.add('open'); o.querySelectorAll('.pfr rect, .pfr path').forEach(function (p, i) { drawIn(p, 1300, 450 + i * 160); }); chime([659, 880, 1046.5, 1318.5]); }, 500);
  o.querySelector('[data-cert-next]').addEventListener('click', function () { if (after) after(); });
}

/* ---------- dialogue in gold, word by word (timed across each line's sound) ---------- */
function karaoke() {
  if (!P.meta || P.i < 0) return;
  var lines = document.querySelectorAll('#lyr .ly'), ln = lines[P.i]; if (!ln || !ln.classList.contains('now')) return;
  var ws = ln.querySelectorAll('.w'); if (!ws.length) return;
  var d = au.duration || 0, f = d ? Math.min(1, au.currentTime / (d * 0.92)) : 0;
  var tot = 0, lens = []; ws.forEach(function (w) { var l = w.textContent.replace(/[́.,!?…—«»]/g, '').length + 2; lens.push(l); tot += l; });
  var acc = 0; ws.forEach(function (w, i) { acc += lens[i]; w.classList.toggle('lit', acc / tot <= f + 0.04); });
}
au.addEventListener('timeupdate', karaoke);
au.addEventListener('ended', function () { var ln = document.querySelector('#lyr .ly.now'); if (ln) ln.querySelectorAll('.w').forEach(function (w) { w.classList.add('lit'); }); });

/* ---------- the unit poster grows into the unit page (View Transitions, where the phone supports them) ---------- */
document.addEventListener('click', function (e) {
  var a = e.target.closest('a.poster'); if (!a || !document.startViewTransition || RM) return;
  e.preventDefault();
  var img = a.querySelector('img'); if (img) img.style.viewTransitionName = 'unit-hero';
  document.startViewTransition(function () { history.pushState(null, '', a.getAttribute('href')); render(); });
}, true);

/* ---------- gentle streak (research, 2026-11-20): freezes cover missed days; otherwise the Firebird folds one feather per missed day ---------- */
function dayGap(a, b) { return Math.round((dayNum(b) - dayNum(a)) / 86400000); }
function gentleStep() {   // called once per new day of practice; returns a note for the student or ''
  var t = today(), st = S.streak, note = '';
  S.freezes = Math.max(0, Math.min(2, S.freezes || 0));
  if (!st.last) { st.count = 1; }
  else {
    var gap = dayGap(st.last, t), missed = Math.max(0, gap - 1);
    if (missed && rmdMode() !== 'off' && (rmdPhase() === 'ramadan' || rmdPhase() === 'eid')) { missed = 0; note = 'في رمضان السلسلة بتستنى: رجعت مكانها'; }
    if (missed) { var use = Math.min(missed, S.freezes); S.freezes -= use; missed -= use;
      if (use) note = use === 1 ? 'الحماية حافظت على سلسلتك يوم ما ' + G('غبت', 'غبتي') : 'الحماية حافظت على سلسلتك ' + ad(use) + ' أيام'; }
    st.count = missed ? Math.max(1, st.count - missed + 1) : st.count + 1;
    if (missed) note = 'طائر النار طبّق ' + ad(missed) + (missed === 1 ? ' ريشة' : ' ريش') + '، بس سلسلتك لسه عايشة';
  }
  st.last = t; S.best = Math.max(S.best || 0, st.count);
  if (st.count % 7 === 0 && S.freezes < 2) { S.freezes++; note = G('كسبت', 'كسبتي') + ' حماية جديدة للسلسلة: لو ' + G('غبت', 'غبتي') + ' يوم مش هتقع'; }
  return note;
}
function streakView() {   // the number shown before today's practice (what tomorrow's step would keep)
  var st = S.streak; if (!st.last) return 0;
  var gap = dayGap(st.last, today()); if (gap <= 1) return st.count;
  var missed = Math.max(0, gap - 1 - (S.freezes || 0)); return Math.max(0, st.count - missed);
}
function attendFreezes(n) {   // Zoom classes the teacher marked in the panel → freezes
  if (typeof n !== 'number') return;
  if (S.attendSeen == null) S.attendSeen = 0;
  if (n > S.attendSeen) { var add = n - S.attendSeen; S.attendSeen = n; S.freezes = Math.min(2, (S.freezes || 0) + add); store(); toast(G('حضرت الحصة، فكسبت حماية للسلسلة', 'حضرتي الحصة، فكسبتي حماية للسلسلة')); }
}

/* ---------- ask for the daily reminder after the first win, not on the first screen ---------- */
function askPush() {
  if (!pushOk() || S.push || S.pushAsked || !standalone() && isIOS) return;
  S.pushAsked = 1; store();
  var o = overlay('<div class="medal" style="width:96px;height:96px"><img src="img/lera.jpg" alt=""></div><h3 class="d-ar">' + G('تحب أفكرك كل يوم؟', 'تحبي أفكرك كل يوم؟') + '</h3>' +
    '<p class="ar">تنبيه واحد في اليوم، بس لو ' + G('لسه ما ذاكرتش', 'لسه ما ذاكرتيش') + '. ' + G('اختار', 'اختاري') + ' الساعة:</p>' +
    '<select class="f hsel" id="rhour" aria-label="الساعة">' + [9, 13, 17, 19, 20, 21, 22].map(function (h) { return '<option value="' + h + '"' + (h === 20 ? ' selected' : '') + '>' + ad(h > 12 ? h - 12 : h) + (h >= 12 ? ' بالليل' : ' الصبح') + '</option>'; }).join('') + '</select>' +
    '<div class="row2" style="justify-content:center"><button class="btn" id="pushyes">أيوه، ' + G('فكّرني', 'فكّريني') + '</button><button class="btn ghost" data-close>مش دلوقتي</button></div>', 'm-ask');
  o.querySelector('#pushyes').addEventListener('click', function () { var fake = document.createElement('button'); pushToggle(fake); o.querySelector('[data-close]').click(); });
}

/* ---------- teacher's weekly goals, study buddy, class total ---------- */
function loadSocial() {
  if (!S.token || !API) return Promise.resolve();
  return fetch(API + '/api/social?t=' + encodeURIComponent(S.token)).then(function (r) { return r.json(); }).then(function (j) { if (j.ok) { S.social = j; store(); } }).catch(function () {});
}
function socialHtml() {
  var so = S.social; if (!so || !S.token) return '';
  var h = '';
  if (so.goals && so.goals.items && so.goals.items.length) {
    var d = so.goals.items.filter(function (x) { return x.done; }).length;
    h += '<section class="shelf pad"><h2><span>أهداف الأسبوع من المدرس</span><span class="ru">' + ad(d) + '/' + ad(so.goals.items.length) + '</span></h2><div class="goals">' +
      (so.goals.note ? '<p class="note ar" style="margin:0 0 6px">' + mix(so.goals.note) + '</p>' : '') +
      so.goals.items.map(function (x, i) { return '<button class="goal' + (x.done ? ' on' : '') + '" data-act="goal" data-i="' + i + '"><span class="box">' + ico('check') + '</span><span class="ar">' + mix(x.t) + '</span></button>'; }).join('') + '</div></section>';
  }
  if (so.buddy || so.klass) {
    h += '<section class="shelf pad"><div class="mates">';
    if (so.buddy) { var bt = so.buddy.last === today();
      h += '<div class="mate"><span class="ar small">زميلك في المذاكرة</span><b class="ar">' + mix(so.buddy.name || 'زميلك') + '</b><span class="ar">' + ico('feather') + ' ' + ad(so.buddy.streak) + ' يوم · ' + ad(so.buddy.lessons) + ' درس خلص</span><span class="ar ' + (bt ? 'ok' : 'dim') + '">' + (bt ? 'ذاكر النهارده' : 'لسه ما ذاكرش النهارده') + '</span></div>'; }
    if (so.klass) h += '<div class="mate"><span class="ar small">' + mix(so.klass.name) + '</span><b class="ar">' + ad(so.klass.lessons) + ' درس</b><span class="ar">خلصهم الفصل كله</span><span class="ar dim">' + ad(so.klass.active7) + ' من ' + ad(so.klass.members) + ' شغالين الأسبوع ده · ' + ad(so.klass.quizzes7) + ' كويز</span></div>';
    h += '</div></section>';
  }
  return h;
}
function goalTick(i, btn) {
  var it = S.social.goals.items[i]; it.done = it.done ? 0 : 1; store(); btn.classList.toggle('on', !!it.done);
  if (it.done) { chime([1318.5, 1568]); buzz([12]); }
  fetch(API + '/api/goals?t=' + encodeURIComponent(S.token), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ i: i, done: it.done }) }).catch(function () {});
  var all = S.social.goals.items.every(function (x) { return x.done; });
  if (all && it.done) setTimeout(function () { overlay('<div class="mstars">' + [0, 1, 2].map(function () { return '<svg viewBox="0 0 58 58" class="on"><path d="' + STAR + '"/></svg>'; }).join('') + '</div><h3 class="d-ar">أهداف الأسبوع خلصت!</h3><p class="ar">المدرس هيشوف إنك ' + G('خلّصتها', 'خلّصتيها') + '.</p><button class="btn" data-close>تمام</button>', 'm-done'); }, 300);
}

/* ---------- shareable progress cards (7 / 30 days, lesson milestones) ---------- */
function shareCard(big, line1, line2) {
  var c = document.createElement('canvas'), W = 1080, H = 1350; c.width = W; c.height = H; var x = c.getContext('2d');
  return Promise.all(['700 80px "Aref Ruqaa"', '400 120px Oranienbaum', '800 64px Cairo', '600 40px Montserrat'].map(function (f) { return document.fonts ? document.fonts.load(f) : 0; })).catch(function () {}).then(function () {
    var g = x.createRadialGradient(W / 2, H * .3, 40, W / 2, H / 2, W); g.addColorStop(0, '#1E3156'); g.addColorStop(1, '#070B15'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#D6A85A'; x.lineWidth = 5; x.strokeRect(40, 40, W - 80, H - 80); x.lineWidth = 2; x.strokeRect(58, 58, W - 116, H - 116);
    x.beginPath(); x.moveTo(240, 690); x.bezierCurveTo(380, 620, 460, 760, 540, 690); x.bezierCurveTo(620, 620, 700, 760, 840, 690); x.stroke();   // Khokhloma stem
    [[330, 668], [540, 690], [750, 668]].forEach(function (p, i) { x.beginPath(); x.arc(p[0], p[1] + (i % 2 ? 0 : 20), 11, 0, 6.283); x.fillStyle = '#C2301F'; x.fill(); });
    var t = function (s, f, col, y, rtl) { x.font = f; x.fillStyle = col; x.textAlign = 'center'; x.direction = rtl ? 'rtl' : 'ltr'; x.fillText(s, W / 2, y); };
    t('Насле́дие', '400 110px Oranienbaum', '#F0D49B', 230);
    t(big, '800 150px Cairo', '#F0D49B', 520, true);
    t(line1, '700 60px Cairo', '#F2ECE1', 820, true);
    t(line2, '600 46px Cairo', '#C3CBDA', 900, true);
    t(S.name || '', '700 52px Cairo', '#D6A85A', 1020, true);
    t('روسي من أول كلمة · Heritage', '600 38px Cairo', '#9BA6BA', 1180, true);
    return new Promise(function (res) { c.toBlob(res, 'image/png'); });
  });
}
function shareBlob(blob, text) {
  var f = new File([blob], 'Наследие.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], text: text }).catch(function () {});
  var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = 'Наследие.png'; document.body.appendChild(a); a.click(); a.remove();
}
function shareStreak(n) { shareCard(ad(n) + ' يوم', 'روسي كل يوم ورا بعض', 'مع تطبيق «Насле́дие»').then(function (b) { shareBlob(b, 'بقالي ' + ad(n) + ' يوم بتعلم روسي كل يوم!'); }); }
function shareLessons(n) { shareCard(ad(n) + ' درس', 'خلّصتهم في كورس الروسي', 'مستوى المبتدئين · А1').then(function (b) { shareBlob(b, G('خلّصت ', 'خلّصت ') + ad(n) + ' درس روسي!'); }); }
function lessonsDoneCount() { var n = 0; Object.keys(S.progress).forEach(function (k) { if (stars(+k) === 3) n++; }); return n; }

/* ---------- invite a friend ---------- */
function invite() {
  if (!S.token) return toast('العزومة للمشتركين');
  fetch(API + '/api/ref?t=' + encodeURIComponent(S.token)).then(function (r) { return r.json(); }).then(function (j) {
    if (!j.ok) return;
    var link = 'https://carl1-stack.github.io/nasledie.ru1/app/#ref/' + j.ref;
    var text = 'بتعلم روسي في تطبيق «Насле́дие» وعاجبني جدًا. جرّبه ببلاش: الدرس ١ و ٢ واختبار المستوى مجانًا.\n' + link + '\nولو اشتركت، إحنا الاتنين ناخد هدية من المدرس.';
    if (navigator.share) navigator.share({ text: text }).catch(function () {});
    else { try { navigator.clipboard.writeText(text); toast('اللينك اتنسخ، ابعته لصاحبك'); } catch (e) { toast(link); } }
    var el = document.getElementById('friends'); if (el) el.textContent = j.friends ? 'عزمت ' + ad(j.friends) + ' ' + (j.friends === 1 ? 'صاحب' : 'أصحاب') + ' لحد دلوقتي' : '';
  }).catch(function () { toast('مفيش نت'); });
}

/* ---------- record and compare (works on every phone, also where speech recognition is missing) ---------- */
var RC = { mr: null };
function recCompare(btn, modelUrl, modelText) {
  if (RC.mr && RC.mr.state === 'recording') { RC.mr.stop(); return; }
  var mime = pickMime(); if (mime === null || !navigator.mediaDevices) return toast('الموبايل ده مش بيسجل من التطبيق');
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    stopTimer(); au.pause(); stopVoice();
    var chunks = [], mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); RC.mr = mr;
    var label = btn.innerHTML; btn.classList.add('on'); btn.innerHTML = ico('stop') + 'دوس لما ' + G('تخلص', 'تخلصي');
    var stopT = setTimeout(function () { if (mr.state === 'recording') mr.stop(); }, 6000);
    mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = function () {
      clearTimeout(stopT); stream.getTracks().forEach(function (t) { t.stop(); }); btn.classList.remove('on'); btn.innerHTML = label;
      var mine = URL.createObjectURL(new Blob(chunks, { type: (mr.mimeType || 'audio/webm').split(';')[0] }));
      var mineA = new Audio(mine), out = btn.nextElementSibling && btn.nextElementSibling.classList.contains('cmp') ? btn.nextElementSibling : null;
      if (!out) { out = document.createElement('div'); out.className = 'cmp'; btn.after(out); }
      out.innerHTML = '<span class="ar">' + G('اسمع الأصل وبعده صوتك', 'اسمعي الأصل وبعده صوتك') + '</span><button class="chip2" data-cmp="model">' + ico('play') + 'الأصل</button><button class="chip2" data-cmp="mine">' + ico('play') + 'صوتي</button>';
      var playModel = function (cb) { stopTimer(); P.q = []; P.i = -1; P.single = null; P.meta = null; if (modelUrl) { au.src = modelUrl; au.onended = function () { au.onended = null; cb && cb(); }; var p = au.play(); if (p && p.catch) p.catch(function () { cb && cb(); }); } else speak(modelText, cb); };
      out.querySelector('[data-cmp=model]').onclick = function () { playModel(); };
      out.querySelector('[data-cmp=mine]').onclick = function () { mineA.currentTime = 0; mineA.play(); };
      playModel(function () { setTimeout(function () { mineA.play(); }, 350); });
    };
    mr.start();
  }).catch(function () { toast(G('اسمح للتطبيق يستخدم المايك', 'اسمحي للتطبيق يستخدم المايك')); });
}

/* ---------- first screen: say your first Russian word ---------- */
var HELLO = 'audio/l02/h987b9a3632.mp3';
function welcomeSpeak() {
  view.innerHTML = '<section class="welcome"><img class="bg" src="img/u1.jpg" alt=""><div class="in pad" style="text-align:center;display:grid;justify-items:center;gap:12px">' +
    '<span class="d-ar ar t-ar" style="font-size:26px">' + G('قول أول كلمة روسي ليك', 'قولي أول كلمة روسي ليكي') + '</span>' +
    '<span class="d-ru ru t-ru" style="font-size:64px;text-align:center">Приве́т!</span><span class="ar" style="color:#E3BF7E">پريڤيت · يعني أهلًا</span>' +
    '<div class="row2" style="justify-content:center"><button class="btn ghost" data-act="w-hello">' + ico('sound') + G('اسمعها', 'اسمعيها') + '</button>' +
    '<button class="btn" data-act="w-rec">' + ico('mic') + G('قولها وسجّل', 'قوليها وسجّلي') + '</button></div>' +
    '<button class="btn block" data-act="w-after" style="margin-top:10px">كمّل</button></div></section>';
}

/* ---------- lesson videos: watching stats for the teacher; offline copy on Android ---------- */
function vstat(course, key, v) {
  if (!S.token || !API || !v.duration) return;
  var pct = Math.round(v.currentTime / v.duration * 100);
  fetch(API + '/api/vstat?t=' + encodeURIComponent(S.token), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: course + '/' + key, pct: pct, secs: Math.round(v.currentTime) }) }).catch(function () {});
}
function videoOffline(btn) {
  var v = document.getElementById('vplayer'); if (!v || !('caches' in window)) return;
  var url = v.currentSrc || v.src; btn.disabled = true; btn.querySelector('small').textContent = 'بيحمّل… سيب الصفحة مفتوحة';
  caches.open('nasl-video').then(function (c) { return fetch(url).then(function (r) { if (!r.ok) throw new Error('x'); return c.put(url, r); }); })
    .then(function () { S.voff = S.voff || {}; S.voff[url.split('?')[0]] = 1; store(); btn.querySelector('small').textContent = 'اتحمّل، بيشتغل من غير نت'; toast('الفيديو اتحمّل'); })
    .catch(function () { btn.disabled = false; btn.querySelector('small').textContent = 'التحميل وقف، ' + G('جرب', 'جربي') + ' تاني على واي فاي'; });
}

/* ---------- Ramadan mode (2026-11-20, reports/Ramadan mode design.md) ----------
   Opt-in, three levels: 'full' (night sky, fanous, star band, nights card) · 'light' (nights card + timing only) · 'off'.
   Nothing assumes the student fasts. No Qur'anic text, no Names of God, no mosque imagery as decoration. */
var SEASON = null;
function loadSeason() {
  return getJSON('data/season.json').then(function (d) { SEASON = d;
    if (API) return fetch(API + '/api/season').then(function (r) { return r.json(); }).then(function (o) { if (o && o.ramadan && o.ramadan.start) SEASON.ramadan = o.ramadan; }).catch(function () {}); }).catch(function () {});
}
function rmdMode() { var m = S.ramadan; return m === true ? 'full' : (m === 'full' || m === 'light') ? m : 'off'; }
function rmdDates() { var r = (SEASON && SEASON.ramadan) || { start: '2027-02-08', eid: '2027-03-09' }; return r; }
function ymd(iso) { var p = iso.split('-').map(Number); return p[0] + '-' + p[1] + '-' + p[2]; }
function rmdPhase() {   // 'before' (10 days before) · 'ramadan' · 'eid' (3 days) · 'after' (11 days) · null
  var r = rmdDates(), t = today(), s = ymd(r.start), e = ymd(r.eid);
  var toStart = dayGap(t, s), fromEid = dayGap(e, t);
  if (toStart > 0 && toStart <= 10) return 'before';
  if (toStart <= 0 && dayGap(t, e) > 0) return 'ramadan';
  if (fromEid >= 0 && fromEid < 3) return 'eid';
  if (fromEid >= 3 && fromEid < 14) return 'after';
  return null;
}
function rmdNight() { var n = dayGap(ymd(rmdDates().start), today()) + 1; return Math.max(1, Math.min(30, n)); }
function rmdActive() { return rmdMode() !== 'off' && rmdPhase() === 'ramadan'; }
var CITIES = [['القاهرة', 30.0444, 31.2357], ['الجيزة', 30.0131, 31.2089], ['الإسكندرية', 31.2001, 29.9187], ['المنصورة', 31.0409, 31.3785], ['طنطا', 30.7865, 31.0004],
  ['الزقازيق', 30.5877, 31.502], ['بورسعيد', 31.2653, 32.3019], ['السويس', 29.9668, 32.5498], ['الإسماعيلية', 30.5965, 32.2715], ['أسيوط', 27.181, 31.1837], ['المنيا', 28.1099, 30.7503],
  ['سوهاج', 26.5591, 31.6957], ['قنا', 26.1551, 32.716], ['الأقصر', 25.6872, 32.6396], ['أسوان', 24.0889, 32.8998], ['الغردقة', 27.2579, 33.8116], ['مرسى مطروح', 31.3543, 27.2373]];
function prayerToday() {
  if (!window.adhan) return null;
  var c = CITIES[S.city || 0] || CITIES[0];
  try { var t = new adhan.PrayerTimes(new adhan.Coordinates(c[1], c[2]), new Date(), adhan.CalculationMethod.Egyptian()); return { fajr: t.fajr, maghrib: t.maghrib, isha: t.isha }; } catch (e) { return null; }
}
function hm(d) { return ad(d.getHours() > 12 ? d.getHours() - 12 : d.getHours()) + ':' + ad(pad(d.getMinutes())); }
function iftarLine() {
  var p = prayerToday(); if (!p) return '';
  var now = new Date();
  if (now < p.maghrib) { var m = Math.round((p.maghrib - now) / 60000);
    return 'المغرب الساعة ' + hm(p.maghrib) + ' · باقي ' + (m >= 60 ? ad(Math.floor(m / 60)) + ' ساعة و' : '') + ad(m % 60) + ' دقيقة'; }
  var study = new Date(p.isha.getTime() + 60 * 60000);
  return now < study ? 'وقت الروسي الهادي: من الساعة ' + hm(study) + ' بالليل' : 'وقتك دلوقتي: ٥ دقايق روسي وتبقى ' + G('خلّصت', 'خلّصتي') + ' ليلتك';
}
/* the fanous (Egyptian Ramadan lantern), drawn from scratch: gold frame, dome, jewel-glass panes, warm inner light */
function fanousSvg(cls) {
  return '<svg class="fanous ' + (cls || '') + '" viewBox="0 0 120 260" aria-hidden="true"><defs>' +
    '<radialGradient id="fglow" cx="50%" cy="55%" r="55%"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".95"/><stop offset=".5" stop-color="#F2B24A" stop-opacity=".45"/><stop offset="1" stop-color="#F2B24A" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6C25B"/><stop offset="1" stop-color="#B8641E"/></linearGradient>' +
    '<linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E0584A"/><stop offset="1" stop-color="#7E1C1A"/></linearGradient>' +
    '<linearGradient id="gT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FB8A8"/><stop offset="1" stop-color="#0D5A5E"/></linearGradient></defs>' +
    '<g class="swing"><line x1="60" y1="0" x2="60" y2="46" class="f-chain"/><circle cx="60" cy="50" r="6" class="f-gold-l"/>' +
    '<path d="M38 92 C40 70 50 60 60 58 C70 60 80 70 82 92 Z" class="f-gold"/><path d="M44 92 H76" class="f-line"/>' +
    '<circle class="f-glow" cx="60" cy="150" r="70" fill="url(#fglow)"/>' +
    '<path d="M36 96 L48 96 L48 196 L36 186 Z" fill="url(#gT)" class="f-pane"/><path d="M48 96 L72 96 L72 196 L48 196 Z" fill="url(#gA)" class="f-pane"/><path d="M72 96 L84 96 L84 186 L72 196 Z" fill="url(#gR)" class="f-pane"/>' +
    '<path d="M34 92 H86 V98 H34 Z M34 186 L48 198 H72 L86 186" class="f-gold"/>' +
    '<path d="M48 96 V196 M72 96 V196 M36 96 V186 M84 96 V186" class="f-line"/>' +
    '<path d="M60 112 L66 126 L60 140 L54 126 Z M60 150 L66 164 L60 178 L54 164 Z" class="f-orn"/>' +
    '<path d="M44 198 L60 232 L76 198 Z" class="f-gold"/><circle cx="60" cy="238" r="5" class="f-gold-l"/><path d="M60 243 V256" class="f-chain"/></g></svg>';
}
function crescentSvg() { return '<svg class="crescent" viewBox="0 0 100 100" aria-hidden="true"><defs><mask id="cm"><rect width="100" height="100" fill="#fff"/><circle cx="62" cy="40" r="34" fill="#000"/></mask></defs><circle cx="46" cy="50" r="36" fill="#F0D49B" mask="url(#cm)"/></svg>'; }
function khatamTag() { return '<svg class="khatam" viewBox="0 0 220 36" aria-hidden="true"></svg>'; }
function khatam(svg) {   // a band of eight-point stars (two squares, one turned 45°) joined by a gold line
  svg.innerHTML = '';
  drawIn(sv('path', { class: 'k-line', d: 'M4 18 H216' }, svg), 1200, 150);
  for (var i = 0; i < 5; i++) { var x = 26 + i * 42, s = 9;
    var g = sv('g', { transform: 'translate(' + x + ' 18)' }, svg);
    var a = sv('rect', { class: 'k-star', x: -s, y: -s, width: s * 2, height: s * 2 }, g), b = sv('rect', { class: 'k-star', x: -s, y: -s, width: s * 2, height: s * 2, transform: 'rotate(45)' }, g);
    popIn(g, 300 + i * 160); sv('circle', { class: 'k-dot', r: 2.2 }, g); }
}
var starRaf = 0;
function nightSky(host) {   // ≤ 40 slow-twinkling stars on a canvas; the crescent rises once
  var cv = document.createElement('canvas'); cv.className = 'rsky'; cv.setAttribute('aria-hidden', 'true'); host.insertBefore(cv, host.firstChild.nextSibling);
  var r = host.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); cv.width = r.width * d; cv.height = r.height * d; var x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
  var stars = []; for (var i = 0; i < 38; i++) stars.push({ x: Math.random() * r.width, y: Math.random() * r.height * .55, r: .6 + Math.random() * 1.3, p: Math.random() * 6.28, s: .4 + Math.random() * .9 });
  cancelAnimationFrame(starRaf);
  function frame(tm) { if (!cv.isConnected) return; x.clearRect(0, 0, r.width, r.height);
    stars.forEach(function (s) { var a = RM ? .7 : .35 + .55 * (0.5 + 0.5 * Math.sin(s.p + tm / 1000 * s.s)); x.globalAlpha = a; x.fillStyle = '#FFF3D6'; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.283); x.fill(); });
    if (!RM) starRaf = requestAnimationFrame(frame); }
  starRaf = requestAnimationFrame(frame);
}
function rmdDecorate() {   // full mode, home and unit heroes: night sky + fanous + crescent; the star band replaces the vine
  if (rmdMode() !== 'full' || !rmdPhase() && S.rmdPreviewDay !== today()) return;
  document.body.classList.add('rmd');
  var hero = view.querySelector('.hero'); if (!hero || hero.querySelector('.fanous')) return;
  nightSky(hero);
  hero.insertAdjacentHTML('beforeend', '<div class="rmd-orn" aria-hidden="true">' + fanousSvg('f1') + fanousSvg('f2') + crescentSvg() + '</div>');
}
function rmdCard() {   // home: «ليالي رمضان»
  var mode = rmdMode(), ph = rmdPhase(); if (mode === 'off' || !SEASON || (!ph && S.rmdPreviewDay !== today())) return '';
  var preview = !ph, n = ph === 'ramadan' ? rmdNight() : 1, N = SEASON.nights[n - 1], card = SEASON.cards[(n - 1) % SEASON.cards.length];
  var head = ph === 'before' ? 'رمضان بعد ' + ad(dayGap(today(), ymd(rmdDates().start))) + ' أيام' : ph === 'eid' ? 'كل سنة وانت طيب · عيد سعيد' : ph === 'after' ? G('وحشتنا! نرجع للروسي؟', 'وحشتينا! نرجع للروسي؟') :
    ph === 'ramadan' ? 'رمضان كريم · الليلة ' + ad(n) + ' من ٣٠' : 'معاينة وضع رمضان · بيبدأ ' + dmy(new Date(rmdDates().start + 'T12:00:00').getTime());
  if (ph === 'after') return '<section class="shelf pad"><div class="rcard"><div class="kh-band" aria-hidden="true"></div><b class="d-ar">' + head + '</b><p class="ar">' + G('ابدأ', 'ابدئي') + ' بخمس دقايق: راجع غلطاتك، وبعدين احجز حصتك الجاية.</p>' +
    '<div class="row2"><a class="btn sm" href="#mistakes">' + ico('review') + G('راجع غلطاتك', 'راجعي غلطاتك') + '</a>' + (CONF.whatsapp ? '<a class="btn ghost sm" href="https://wa.me/' + CONF.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent('أهلًا يا مستر، عايز أحجز الحصة الجاية بعد العيد 🙂') + '">احجز حصة</a>' : '') + '</div></div></section>';
  var done = S.rnights || {}, dots = '';
  for (var i = 1; i <= 30; i++) dots += '<i class="' + (done[i] ? 'on' : '') + (ph === 'ramadan' && i === n ? ' now' : '') + '"></i>';
  return '<section class="shelf pad"><div class="rcard"><div class="kh-band" aria-hidden="true"></div>' +
    '<div class="rhead"><b class="d-ar">' + head + '</b>' + (mode === 'full' ? crescentSvg() : '') + '</div>' +
    (ph === 'ramadan' || preview ? '<p class="ar rtime">' + iftarLine() + '</p><label class="rcity ar">' + G('مدينتك', 'مدينتك') + ' <select class="f hsel" id="rcity">' + CITIES.map(function (c, i) { return '<option value="' + i + '"' + ((S.city || 0) === i ? ' selected' : '') + '>' + c[0] + '</option>'; }).join('') + '</select></label>' : '') +
    '<div class="rnight"><span class="ar small">' + (ph === 'eid' ? 'كلمة العيد' : 'كلمة الليلة') + '</span><span class="ru big">' + esc(ph === 'eid' ? SEASON.nights[28].ru : N.ru) + '</span><span class="ar">' + esc(ph === 'eid' ? SEASON.nights[28].ar : N.ar) + '</span>' +
    '<div class="row2"><button class="btn sm" data-act="rplay" data-a="' + (ph === 'eid' ? SEASON.nights[28].a : N.a) + '">' + ico('sound') + G('اسمع', 'اسمعي') + '</button><button class="btn ghost sm" data-act="rc" data-url="audio/season/' + (ph === 'eid' ? SEASON.nights[28].a : N.a) + '.mp3">' + ico('mic') + G('سجّل وقارن', 'سجّلي وقارني') + '</button></div></div>' +
    (ph !== 'eid' ? '<div class="rdots" aria-label="٣٠ ليلة">' + dots + '</div><p class="note ar" style="margin:4px 0 0">هدف رمضان: ٥ دقايق في اليوم. السلسلة في رمضان بتستنى ' + G('لو غبت', 'لو غبتي') + '، مش بتقع.</p>' : '') +
    '<details class="rfact"><summary class="ar">روسيا في رمضان</summary><p class="ar">' + mix(card.ar) + '</p></details></div></section>';
}
function rmdTouch() { if (rmdActive()) { S.rnights = S.rnights || {}; S.rnights[rmdNight()] = 1; } }
function rmdOffer() {   // asked once, close to Ramadan; never assumes fasting
  if (S.ramadan != null || !SEASON || !rmdPhase() || rmdPhase() === 'after') return;
  S.ramadan = 'off'; store();
  var o = overlay(fanousSvg('f-offer') + '<h3 class="d-ar">رمضان كريم!</h3><p class="ar">' + G('تحب', 'تحبي') + ' التطبيق يلبس ثوب رمضان؟ ليل وفوانيس، كلمة روسي كل ليلة، والتنبيه بعد العشا. ' + G('تقدر تغيّره', 'تقدري تغيّريه') + ' في «حسابي».</p>' +
    '<div class="row2" style="justify-content:center"><button class="btn" data-rmd="full">أيوه، كامل</button><button class="btn ghost" data-rmd="light">هادي من غير زينة</button><button class="btn ghost" data-close>لأ، شكرًا</button></div>', 'm-rmd');
  o.addEventListener('click', function (e) { var b = e.target.closest('[data-rmd]'); if (!b) return; setRamadan(b.dataset.rmd); o.querySelector('[data-close]').click(); });
}
function setRamadan(m) {
  S.ramadan = m; if (m === 'off') document.body.classList.remove('rmd'); if (!rmdPhase() && m !== 'off') S.rmdPreviewDay = today(); store(); save();
  if (S.push && m !== 'off') { var p = prayerToday(), h = p ? Math.min(23, new Date(p.isha.getTime() + 60 * 60000).getHours() + (new Date(p.isha.getTime() + 60 * 60000).getMinutes() > 30 ? 1 : 0)) : 20;
    S.push.hour = Math.max(20, h); }
  if (S.push) navigator.serviceWorker.ready.then(function (r) { return r.pushManager.getSubscription(); }).then(function (sub) { if (!sub) return;
    return fetch(API + '/api/push' + (S.token ? '?t=' + encodeURIComponent(S.token) : ''), { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sub: sub.toJSON(), hour: S.push.hour, tz: -new Date().getTimezoneOffset(), device: S.device, g: S.g || 'm', last: S.streak.last || '', ramadan: m !== 'off' }) }); }).catch(function () {});
  toast(m === 'full' ? 'رمضان كريم! التطبيق لبس ثوب رمضان' : m === 'light' ? 'وضع رمضان الهادي اشتغل' : 'وضع رمضان اتقفل');
  render();
}
function rmdRow() {
  var m = rmdMode();
  return '<div class="set"><span class="tx">وضع رمضان<small>' + (rmdPhase() ? 'بيشتغل في رمضان' : 'بيبدأ لوحده في رمضان · ' + G('تقدر تشوفه', 'تقدري تشوفيه') + ' دلوقتي') + '</small></span>' +
    '<span class="seg3">' + [['full', 'كامل'], ['light', 'هادي'], ['off', 'مقفول']].map(function (x) { return '<button data-act="rmdset" data-m="' + x[0] + '" class="' + (m === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</span></div>';
}
function eidMoment() {   // once, on the first Eid days
  if (rmdMode() === 'off' || rmdPhase() !== 'eid') return;
  var y = rmdDates().eid.slice(0, 4); S.eidShown = S.eidShown || {}; if (S.eidShown[y]) return; S.eidShown[y] = 1; store();
  var N = SEASON.nights[28];
  var o = overlay(crescentSvg() + '<h3 class="d-ar">كل سنة وانت طيب</h3><p class="ar">عيد سعيد عليك وعلى أهلك</p><span class="ru msub">' + esc(N.ru) + '</span>' +
    '<div class="row2" style="justify-content:center"><button class="btn ghost" data-act="rplay" data-a="' + N.a + '">' + ico('sound') + 'С пра́здником!</button>' +
    '<button class="btn ghost" data-share-eid>' + G('شارك تهنئة', 'شاركي تهنئة') + '</button><button class="btn" data-close>شكرًا</button></div>' +
    (S.token ? recHtml(0, 'eid', 'ابعت تهنئة العيد للمدرس بالروسي') : ''), 'm-eid');
  chime([784, 988, 1175, 1568]);
  o.addEventListener('click', function (e) { if (e.target.closest('[data-share-eid]')) shareCard('عيد سعيد', 'كل سنة وانت طيب', 'С пра́здником! · Насле́дие').then(function (b) { shareBlob(b, 'كل سنة وانت طيب! С праздником!'); }); });
}

/* ---------- daily reminders (web push; on iPhone only when the app is on the home screen) ---------- */
var standalone = function () { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; };
var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
function pushOk() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && CONF.vapid && API; }
function remindRow() {
  var hours = [9, 13, 17, 19, 20, 21, 22];
  if (!pushOk()) return '<div class="set"><span class="tx">' + G('فكّرني أذاكر كل يوم', 'فكّريني أذاكر كل يوم') + '<small>' +
    (isIOS && !standalone() ? 'على الآيفون: ' + G('ضيف', 'ضيفي') + ' التطبيق للشاشة الرئيسية الأول (مشاركة ← إضافة للشاشة الرئيسية)' : 'المتصفح ده مش بيدعم التنبيهات') + '</small></span></div>';
  return '<div class="set"><span class="tx">' + G('فكّرني أذاكر كل يوم', 'فكّريني أذاكر كل يوم') + '<small>' + (S.push ? 'التنبيه الساعة ' + ad(S.push.hour > 12 ? S.push.hour - 12 : S.push.hour) + (S.push.hour >= 12 ? ' بالليل' : ' الصبح') + '، لو لسه ما ' + G('ذاكرتش', 'ذاكرتيش') : 'تنبيه واحد في اليوم لو لسه ما ' + G('ذاكرتش', 'ذاكرتيش')) + '</small>' +
    '<select class="f hsel" id="rhour" aria-label="الساعة">' + hours.map(function (h) { return '<option value="' + h + '"' + ((S.push ? S.push.hour : 20) === h ? ' selected' : '') + '>' + ad(h > 12 ? h - 12 : h) + (h >= 12 ? ' م' : ' ص') + '</option>'; }).join('') + '</select></span>' +
    '<button class="tog' + (S.push ? ' on' : '') + '" data-act="push" aria-label="التنبيه"></button></div>';
}
function b64key(s) { var p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, function (c) { return c.charCodeAt(0); }); }
function pushToggle(btn) {
  if (S.push) {
    navigator.serviceWorker.ready.then(function (r) { return r.pushManager.getSubscription(); }).then(function (sub) { if (sub) sub.unsubscribe(); }).catch(function () {});
    fetch(API + '/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ off: true, device: S.device }) }).catch(function () {});
    S.push = null; save(); btn.classList.remove('on'); toast('التنبيه اتقفل'); return;
  }
  Notification.requestPermission().then(function (p) {
    if (p !== 'granted') return toast(G('لازم تسمح بالتنبيهات من إعدادات الموبايل', 'لازم تسمحي بالتنبيهات من إعدادات الموبايل'));
    return navigator.serviceWorker.ready.then(function (r) { return r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64key(CONF.vapid) }); })
      .then(function (sub) {
        var hour = +(document.getElementById('rhour') || {}).value || 20;
        return fetch(API + '/api/push' + (S.token ? '?t=' + encodeURIComponent(S.token) : ''), { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sub: sub.toJSON(), hour: hour, tz: -new Date().getTimezoneOffset(), device: S.device, g: S.g || 'm', last: S.streak.last || '', ramadan: !!S.ramadan }) })
          .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error('x'); S.push = { hour: hour }; save(); btn.classList.add('on'); toast('تمام، هفكّرك كل يوم'); });
      });
  }).catch(function () { toast('التنبيه ما اشتغلش، ' + G('جرب', 'جربي') + ' تاني'); });
}
function pushSeen() { if (S.push && API) fetch(API + '/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seen: today(), device: S.device }) }).catch(function () {}); }

/* ---------- unit certificates: every lesson of the unit 3 stars + its quiz ≥ 70 % ---------- */
function unitDone(u) { return IDX.units[u] && IDX.units[u].lessons.every(function (l) { return stars(l.num) === 3 && ((S.quiz || {})[l.num] || 0) >= 70; }); }
function checkCerts() {
  IDX.units.forEach(function (U, u) { S.certs = S.certs || {};
    if (!S.certs[u + 1] && unitDone(u)) { S.certs[u + 1] = today(); save(); toast(G('مبروك! خدت شهادة الوحدة ', 'مبروك! خدتي شهادة الوحدة ') + ad(u + 1)); } });
}
function vCerts() {
  checkCerts();
  view.innerHTML = '<div class="page pad"><div class="ph1"><h1 class="ar">شهاداتي</h1><span class="ru">Сертифика́ты</span></div>' +
    '<p class="note ar">' + G('خلّص', 'خلّصي') + ' كل دروس الوحدة ٣ نجوم وكويز كل درس ٧٠٪ أو أكتر، وتاخد شهادة باسمك.</p><div class="mis" style="margin-top:12px">' +
    IDX.units.map(function (U, u) {
      var done = U.lessons.filter(function (l) { return stars(l.num) === 3 && ((S.quiz || {})[l.num] || 0) >= 70; }).length, got = (S.certs || {})[u + 1];
      return '<div class="mcard"><div class="hd"><b class="ar">الوحدة ' + ad(u + 1) + ' · ' + esc(U.ar) + '</b><span class="ru">' + esc(U.ru) + '</span></div>' +
        '<div class="qbar"><i style="width:' + (done / U.lessons.length * 100) + '%"></i></div><p class="ar">' + ad(done) + ' من ' + ad(U.lessons.length) + ' دروس</p>' +
        (got ? '<div class="row2"><button class="btn sm" data-act="cert" data-u="' + u + '">' + ico('star') + 'شوف الشهادة</button></div>' : '') + '</div>';
    }).join('') + '</div><div id="certout"></div></div>';
}
function drawCert(u) {
  var U = IDX.units[u], c = document.createElement('canvas'), W = 1600, H = 1130; c.width = W; c.height = H; var x = c.getContext('2d');
  var fonts = ['700 64px "Aref Ruqaa"', '400 90px Oranienbaum', '800 72px Cairo', '600 40px Montserrat'];
  Promise.all(fonts.map(function (f) { return document.fonts ? document.fonts.load(f) : Promise.resolve(); })).catch(function () {}).then(function () {
    var g = x.createRadialGradient(W / 2, H * .25, 50, W / 2, H / 2, W * .75); g.addColorStop(0, '#1A140C'); g.addColorStop(1, '#050608'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#D6A85A'; x.lineWidth = 3; [[110, 120, 1, 1], [W - 110, 120, -1, 1], [110, H - 120, 1, -1], [W - 110, H - 120, -1, -1]].forEach(function (c) {   // Palekh corner curls
      x.beginPath(); x.moveTo(c[0], c[1] + c[3] * 70); x.bezierCurveTo(c[0], c[1], c[0] + c[2] * 40, c[1] - c[3] * 20, c[0] + c[2] * 110, c[1] - c[3] * 20); x.stroke();
      x.beginPath(); x.arc(c[0] + c[2] * 26, c[1] + c[3] * 8, 9, 0, 6.283); x.fillStyle = '#C2301F'; x.fill(); });
    x.strokeStyle = '#D6A85A'; x.lineWidth = 6; x.strokeRect(40, 40, W - 80, H - 80); x.lineWidth = 2; x.strokeRect(60, 60, W - 120, H - 120);
    var line = function (t, font, color, y, rtl) { x.font = font; x.fillStyle = color; x.textAlign = 'center'; x.direction = rtl ? 'rtl' : 'ltr'; x.fillText(t, W / 2, y); };
    line('Насле́дие', '400 96px Oranienbaum', '#F0D49B', 190);
    line('شهادة إتمام', '700 70px "Aref Ruqaa"', '#F2ECE1', 300, true);
    line('Сертифика́т', '600 36px Montserrat', '#9BA6BA', 352);
    line(S.name || '', '800 84px Cairo', '#F0D49B', 500, true);
    line(G('خلّص بنجاح الوحدة ', 'خلّصت بنجاح الوحدة ') + ad(u + 1) + ': ' + U.ar, '700 44px Cairo', '#F2ECE1', 600, true);
    line(String(U.ru), '600 44px Montserrat', '#D6A85A', 670);
    line((U.course || 'a1') === 'b1' ? 'من كورس الروسي المتوسط' : 'من كورس الروسي للمبتدئين', '600 36px Cairo', '#C3CBDA', 750, true);
    line((U.course || 'a1') === 'b1' ? 'Уро́вень В1' : 'Уро́вень А1', '600 34px Montserrat', '#C3CBDA', 800);
    line(dmy(Date.now()), '600 32px Cairo', '#9BA6BA', 900, true);
    line('إعداد: عبدالله محمد السنوسي', '700 36px Cairo', '#F2ECE1', 980, true);
    var img = new Image(); img.onload = function () { x.drawImage(img, 110, H - 250, 140, 140); fin(); }; img.onerror = fin; img.src = 'img/logo.png';
    function fin() {
      var url = c.toDataURL('image/png'), out = document.getElementById('certout'); if (!out) return;
      out.innerHTML = '<img class="certimg" src="' + url + '" alt="الشهادة"><div class="row2"><a class="btn" download="Наследие_сертификат_' + (u + 1) + '.png" href="' + url + '">' + ico('down') + 'نزّل الشهادة</a>' +
        (navigator.canShare ? '<button class="btn ghost" data-act="cert-share">' + G('شاركها', 'شاركيها') + '</button>' : '') + '</div>';
      out.dataset.url = url; out.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

/* ---------- B1, Падежи, videos, level test inside the app (2026-11-20): menus + a full-screen viewer ---------- */
var CASES = [{ ru: 'Имени́тельный + Вини́тельный', ar: 'الرفع والنصب' }, { ru: 'Предло́жный + Роди́тельный', ar: 'الجر بحروف وبالإضافة' }, { ru: 'Да́тельный + Твори́тельный', ar: 'المفعول لأجله والآلة' }];
function vCourse(c) {
  var isB1 = c === 'b1', has = hasCourse(isB1 ? 'b1' : 'cases');
  var head = '<section class="hero" style="height:260px"><img src="img/' + (isB1 ? 'u4' : 'u3') + '.jpg" alt=""><div class="topbar pad"><a class="back" href="#library" aria-label="رجوع">' + ico('back') + '</a></div>' +
    '<div class="in pad"><span class="d-ru ru t-ru" style="font-size:36px">' + (isB1 ? 'В1' : 'Падежи́') + '</span><span class="ar meta">' + (isB1 ? 'كورس المستوى المتوسط: موضوعات ومهام من الحياة' : 'الحالات الإعرابية الست: مختصر وتفصيلي وكويز') + '</span></div></section>';
  var row = function (href, no, ar, ru, extra) { return '<a class="ep pad" href="' + href + '"><span class="no">' + esc(no) + '</span><span><span class="ru">' + esc(ru) + '</span><span class="ar">' + esc(ar) + '</span></span>' + (extra || '') + '</a>'; };
  var lockI = has ? '' : '<span class="lk">' + ico('lock') + '</span>';
  if (isB1) head = head.replace('كورس المستوى المتوسط: موضوعات ومهام من الحياة', 'فيديوهات المستوى المتوسط وصفحات «بلس»');
  if (!isB1) { view.innerHTML = head + CASES.map(function (x, i) { return row(has ? '#view/p/cases/cases' + (i + 1) + '.html' : '#unlock/0', i + 1, x.ar, x.ru, lockI); }).join(''); return; }
  var b1v = VIDS && VIDS.b1 ? Object.keys(VIDS.b1).sort(function (a, b) { return a === 'intro' ? -1 : b === 'intro' ? 1 : a < b ? -1 : 1; }) : [];
  if (b1v.length) head += '<section class="shelf pad"><h2><span>فيديوهات الكورس</span><span class="ru">Ви́део</span></h2><div class="hs">' + b1v.map(function (k) {
    var t = k === 'intro' ? 'مقدمة الكورس' : (k[0] === 'm' ? 'مهمة ' : 'الدرس ') + ad(+k.slice(1)), free = vidFree('b1', k);
    return '<a class="wcard" href="' + (free || has ? '#watch/b1/' + k : '#unlock/0') + '">' + ico(free || has ? 'video' : 'lock') + '<b>' + t + '</b><small>' + (free ? 'مجاني' : ad(Math.round(VIDS.b1[k].parts.reduce(function (s, p) { return s + p.dur; }, 0) / 60)) + ' دقيقة') + '</small></a>'; }).join('') + '</div></section>';
  view.innerHTML = head + '<div id="b1list" class="pad"><p class="ar" style="color:var(--dim)">بيحمّل…</p></div>';
  getJSON('data/b1.json').then(function (list) {
    var el = document.getElementById('b1list'); if (!el) return; el.outerHTML = list.map(function (x) {
      return row(has ? '#view/p/b1/' + x.p + '.html' : '#unlock/0', x.n, x.ar, x.ru, lockI || (x.plus ? '<a class="plus ru" href="#view/p/b1/' + x.p + '_plus.html">+</a>' : ''));
    }).join('') + '<a class="ep pad" href="#view/b1films"><span class="no">' + ico('film') + '</span><span><span class="ru">Фи́льмы и ви́део</span><span class="ar">أفلام وفيديوهات لكل درس</span></span></a>';
  }).catch(function () {});
}
function viewSrc(path) {
  if (path === 'level') return { src: '../quiz_site/level_test.html', t: 'اختبار المستوى', allow: 'microphone; autoplay' };
  var m = path.match(/^p\/([\w\/.-]+\.html)$/);
  if (m) return S.token && API ? { src: API + '/p/' + m[1] + '?t=' + encodeURIComponent(S.token) + '&embed=1', t: /^b1/.test(m[1]) ? 'كورس B1' : 'الحالات الإعرابية', allow: 'microphone; autoplay' } : null;
  return null;
}
function vView(path) {
  var v = viewSrc(path); if (!v) { go('#unlock/0'); return; }
  stopTimer(); au.pause();
  view.innerHTML = '<div class="viewer"><div class="vtop pad"><button class="back" data-act="view-back" aria-label="رجوع">' + ico('back') + '</button><b class="ar">' + esc(v.t) + '</b></div>' +
    '<p class="vload ar" id="vload">بيحمّل الصفحة…</p><iframe src="' + esc(v.src) + '" title="' + esc(v.t) + '"' + (v.allow ? ' allow="' + v.allow + '"' : '') + '></iframe></div>';
  var fr = view.querySelector('.viewer iframe');
  fr.addEventListener('load', function () { var l = document.getElementById('vload'); if (l) l.remove(); fr.classList.add('on'); });
}

/* ---------- quizzes inside the app (2026-11-20): same questions as the quiz pages, score to the teacher, mistakes come back ---------- */
var QCACHE = {};
function reviewData(k) {   // review quiz K (locked like a lesson)
  if (QCACHE['r' + k]) return Promise.resolve(QCACHE['r' + k]);
  return fetch(API + '/c/a1/r' + k + '.json?t=' + encodeURIComponent(S.token || '')).then(function (r) {
    if (!r.ok) { var e = new Error('denied'); e.reason = r.status === 403 || r.status === 401 ? 'denied' : 'net'; throw e; } return r.json(); })
    .then(function (d) { QCACHE['r' + k] = d; return d; });
}
function aUrl(key, id) { return /^r\d$/.test(String(key)) ? API + '/c/a1/audio/' + key + '/' + id + '.mp3?t=' + encodeURIComponent(S.token || '') : audioUrl(+key, id); }
function isoRu(m) { var pre = '', trail = (m.match(/[\s.,;:!?…]*$/) || [''])[0], core = m.slice(0, m.length - trail.length);
  if (core.charAt(0) === '«' && core.indexOf('»') < 0) { pre = '«'; core = core.slice(1); }
  if (core.slice(-1) === '»' && core.indexOf('«') < 0) { core = core.slice(0, -1); trail = '»' + trail; }
  return core ? pre + '<span class="ru">' + core + '</span>' + trail : m; }
function mix(s) { return esc(s).replace(/«?[Ѐ-ӿ][Ѐ-ӿ́\s.,!?…—\-«»\/]*/g, isoRu); }   // Russian inside Arabic: its own LTR island
function mixAr(s) { return esc(s).replace(/([؀-ۿ][؀-ۿ\s]*[؀-ۿ]|[؀-ۿ])/g, '<bdi dir="rtl">$1</bdi>'); }
var QZ = null;
function quizStartHtml(n, L) {
  var qs = L.quiz || [], cur = qs.filter(function (q) { return q.b === 'cur'; }).length, best = (S.quiz || {})[n];
  return '<div class="qstart"><div class="qbig ru">' + qs.length + '</div><b class="ar">كويز الدرس: ' + ad(qs.length) + ' سؤال</b>' +
    '<p class="ar">' + ad(cur) + ' من الدرس و' + ad(qs.length - cur) + ' مراجعة. سماع، أنسب رد، صح ولا غلط، وكمّل الجملة.</p>' +
    (best != null ? '<p class="ar best">أحسن نتيجة ليك: ' + ad(best) + '٪</p>' : '') +
    '<button class="btn block" data-act="quiz-go" data-k="' + n + '">' + ico('play') + (best != null ? G('أعيد الكويز', 'أعيدي الكويز') : G('ابدأ الكويز', 'ابدئي الكويز')) + '</button>' +
    '<p class="note ar">' + G('النتيجة بتوصل للمدرس، والأسئلة اللي هتغلط فيها هترجعلك تاني بكرة.', 'النتيجة بتوصل للمدرس، والأسئلة اللي هتغلطي فيها هترجعلك تاني بكرة.') + '</p></div>';
}
function quizRun(box, opt) {   // opt: {key, tag, qs:[{…,_k}], mode:'quiz'|'mist', title}
  QZ = { box: box, key: opt.key, tag: opt.tag, mode: opt.mode || 'quiz', qs: opt.qs, i: 0, sc: { cur: [0, 0], rev: [0, 0] }, wrong: [], wrongIdx: [], right: [], done: false };
  quizShow();
}
function quizShow() {
  var Z = QZ, q0 = Z.qs[Z.i]; Z.answered = false;
  var ord = q0.o.map(function (_, k) { return k; });
  var tf = q0.o.length === 2 && (q0.o[0][0] === 'صح' || q0.o[0][0] === 'سؤال');
  if (!tf) for (var k = ord.length - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)); var t = ord[k]; ord[k] = ord[r]; ord[r] = t; }
  Z.cur = { q: q0, o: ord.map(function (k) { return q0.o[k]; }), c: ord.indexOf(q0.c) };
  var emoji = Z.cur.o.every(function (o) { return !o[1] && /\p{Extended_Pictographic}/u.test(o[0]); });
  var badge = Z.mode === 'mist' ? G('سؤال غلطت فيه قبل كده', 'سؤال غلطتي فيه قبل كده') : q0.b === 'cur' ? 'من الدرس' : 'مراجعة';
  Z.box.innerHTML = '<div class="qz"><div class="qtop"><span class="ar">سؤال ' + ad(Z.i + 1) + ' من ' + ad(Z.qs.length) + '</span><span class="qb ' + (q0.b === 'cur' ? 'c' : 'r') + ' ar">' + badge + '</span></div>' +
    '<div class="qbar"><i style="width:' + (Z.i / Z.qs.length * 100) + '%"></i></div>' +
    (q0.p ? '<div class="passage' + (q0.pl ? ' lines' : '') + '">' + q0.p.map(function (x) { return '<span class="ru">' + esc(x) + '</span>'; }).join(q0.pl ? '' : ' ') + '</div>' : '') +
    '<div class="q-ru ru">' + mixAr(q0.ru) + '</div><div class="q-ar ar">' + mix(q0.ar) + '</div>' +
    (q0.a && q0.a.length ? '<button class="btn ghost qplay" data-act="quiz-play">' + ico('sound') + G('اسمع', 'اسمعي') + '</button>' : '') +
    '<div class="qopts">' + Z.cur.o.map(function (o, j) { return '<button class="qopt' + (emoji ? ' emoji' : '') + '" data-act="quiz-pick" data-j="' + j + '">' + (o[1] ? '<span class="ru">' + esc(o[0]) + '</span>' : '<span class="ar">' + esc(o[0]) + '</span>') + '</button>'; }).join('') + '</div>' +
    '<div class="qfb" id="qfb" hidden></div><button class="btn block" data-act="quiz-next" id="qnx" hidden>' + (Z.i < Z.qs.length - 1 ? 'السؤال اللي بعده' : 'شوف النتيجة') + '</button></div>';
  if (q0.a && q0.a.length) quizPlay();
  var top = Z.box.getBoundingClientRect().top + window.scrollY - 70; if (window.scrollY > top) window.scrollTo(0, top);
}
function quizPlay() { var q = QZ.cur.q; playQueue(q.a.map(function (id) { return { src: aUrl(q._k, id) }; }), 0, null); }
function quizPick(j) {
  var Z = QZ; if (Z.answered) return; Z.answered = true;
  var q = Z.cur.q, ok = j === Z.cur.c, bs = Z.box.querySelectorAll('.qopt');
  bs.forEach(function (b, k) { b.disabled = true; if (k === Z.cur.c) b.classList.add('ok'); });
  if (!ok) { bs[j].classList.add('bad'); Z.wrong.push((q.ru + ' · ' + q.ar).replace(/\s+/g, ' ')); Z.wrongIdx.push(q); } else Z.right.push(q);
  Z.sc[q.b][1]++; if (ok) Z.sc[q.b][0]++;
  var fb = document.getElementById('qfb'); fb.hidden = false; fb.className = 'qfb ' + (ok ? 'ok' : 'bad');
  fb.innerHTML = '<b class="ar">' + (ok ? 'برافو!' : 'مش دي.') + '</b> <span class="ar">' + mix(q.e) + '</span>';
  document.getElementById('qnx').hidden = false;
}
function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function quizNext() {
  var Z = QZ; stopTimer(); au.pause(); Z.i++;
  if (Z.i < Z.qs.length) return quizShow();
  var tot = Z.sc.cur[0] + Z.sc.rev[0], pct = Math.round(tot / Z.qs.length * 100);
  S.mist = S.mist || [];
  if (Z.mode === 'quiz') {
    S.quiz = S.quiz || {}; S.quiz[Z.key] = Math.max(S.quiz[Z.key] || 0, pct);
    Z.wrongIdx.forEach(function (q) { var id = q._k + ':' + q._i; if (!S.mist.some(function (m) { return m.id === id; })) S.mist.push({ id: id, k: q._k, i: q._i, due: addDays(1) }); });
  } else {
    Z.right.forEach(function (q) { var id = q._k + ':' + q._i; S.mist = S.mist.filter(function (m) { return m.id !== id; }); });
    Z.wrongIdx.forEach(function (q) { var id = q._k + ':' + q._i; S.mist.forEach(function (m) { if (m.id === id) m.due = addDays(2); }); });
  }
  save();
  var msg = pct >= 90 ? G('ممتاز! إنت جاهز للدرس الجاي', 'ممتاز! إنتي جاهزة للدرس الجاي') : pct >= 70 ? G('كويس جدًا! راجع اللي غلطت فيه', 'كويس جدًا! راجعي اللي غلطتي فيه') : G('اسمع الحوارات تاني وأعيد الكويز', 'اسمعي الحوارات تاني وأعيدي الكويز');
  Z.box.innerHTML = '<div class="qz res"><div class="qbig ru">' + tot + '/' + Z.qs.length + '</div><b class="ar">' + msg + '</b>' +
    (Z.sc.rev[1] && Z.mode === 'quiz' ? '<div class="split"><div><b class="ru">' + Z.sc.cur[0] + '/' + Z.sc.cur[1] + '</b><small class="ar">من الدرس</small></div><div class="r"><b class="ru">' + Z.sc.rev[0] + '/' + Z.sc.rev[1] + '</b><small class="ar">المراجعة</small></div></div>' : '') +
    (Z.mode === 'quiz' ? '<p class="note ar" id="qsent">بنبعت النتيجة للمدرس…</p>' : '<p class="note ar">' + (Z.right.length ? ad(Z.right.length) + ' سؤال اتشال من غلطاتك.' : '') + (Z.wrongIdx.length ? ' ' + ad(Z.wrongIdx.length) + ' هيرجعولك بعد يومين.' : '') + '</p>') +
    '<div class="row2" style="justify-content:center"><button class="btn" data-act="quiz-again">' + ico('repeat') + (Z.mode === 'quiz' ? G('أعيد الكويز', 'أعيدي الكويز') : 'تمام') + '</button></div></div>';
  if (Z.mode === 'quiz') quizSend(Z, tot, pct);
  if (stars(+Z.key) === 3 && pct >= 70) checkCerts();
}
function quizSend(Z, tot, pct) {
  var d = { type: 'quiz', name: S.name || 'طالب', lesson: Z.tag, score: tot + '/' + Z.qs.length, lesson_part: Z.sc.cur[0] + '/' + Z.sc.cur[1],
    review_part: Z.sc.rev[1] ? Z.sc.rev[0] + '/' + Z.sc.rev[1] : '', mistakes: Z.wrong.join('\n'), source: 'app' };
  var jobs = [];
  if (CONF.results) jobs.push(fetch(CONF.results, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) }));
  if (S.token && API) jobs.push(fetch(API + '/api/quiz?t=' + encodeURIComponent(S.token), { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: String(Z.key), pct: pct, score: tot, total: Z.qs.length, cur: Z.sc.cur, rev: Z.sc.rev, mistakes: Z.wrong.slice(0, 40) }) }));
  Promise.all(jobs).then(function () { var e = document.getElementById('qsent'); if (e) e.textContent = 'النتيجة وصلت للمدرس.'; })
    .catch(function () { var e = document.getElementById('qsent'); if (e) e.textContent = 'النتيجة موصلتش (النت؟). ' + G('صوّر الشاشة وابعتها للمدرس.', 'صوّري الشاشة وابعتيها للمدرس.'); });
}
function startLessonQuiz(n) {
  var L = LS.L; if (!L || !L.quiz) return;
  var qs = L.quiz.map(function (q, i) { return Object.assign({ _k: n, _i: i }, q); });
  var sb = document.getElementById('segbody'); sb.innerHTML = '<div class="pad" id="qbox"></div>';
  quizRun(document.getElementById('qbox'), { key: n, tag: (n > 200 ? 'В1 · Миссия ' + (n - 200) : n > 100 ? 'В1 · Урок ' + (n - 100) : 'Урок ' + n) + ' · ' + String(L.ru).replace(/́/g, ''), qs: qs });
}
function vQuiz(k) {   // review quiz page: #quiz/r1
  var r = +String(k).slice(1), R = (IDX.reviews || [])[r - 1] || { ru: 'Повторе́ние ' + r, ar: '' };
  view.innerHTML = '<section class="hero" style="height:220px"><img src="img/' + UNIT_PHOTO[Math.min(5, r * 2 - 1)] + '.jpg" alt=""><div class="topbar pad"><a class="back" href="#library" aria-label="رجوع">' + ico('back') + '</a></div>' +
    '<div class="in pad"><span class="d-ru ru t-ru" style="font-size:32px">' + esc(R.ru) + '</span><span class="ar meta">' + esc(R.ar) + '</span></div></section><div class="pad" id="qbox"><p class="ar" style="color:var(--dim)">بيحمّل…</p></div>';
  if (!S.token) { go('#unlock/0'); return; }
  reviewData(r).then(function (d) {
    var box = document.getElementById('qbox'); if (!box) return; var best = (S.quiz || {})[k];
    box.innerHTML = (vidOf('a1', 'r' + r) ? '<a class="lrow" href="#watch/a1/r' + r + '" style="margin-bottom:12px">' + ico('video') + '<span class="tx"><b>فيديو المراجعة</b><small>الحصة كاملة بالفصول</small></span>' + ico('back', 'end') + '</a>' : '') +
      '<div class="qstart"><div class="qbig ru">' + d.quiz.length + '</div><b class="ar">' + esc(R.ar) + '</b>' + (best != null ? '<p class="ar best">أحسن نتيجة: ' + ad(best) + '٪</p>' : '') +
      '<button class="btn block" data-act="rquiz-go">' + ico('play') + G('ابدأ', 'ابدئي') + '</button></div>';
  }).catch(function () { var box = document.getElementById('qbox'); if (box) box.innerHTML = '<p class="ar">المراجعة دي محتاجة كود فيه الوحدات بتاعتها.</p>'; });
}
function startReviewQuiz() {
  var k = parse().arg, r = +String(k).slice(1), d = QCACHE['r' + r]; if (!d) return;
  quizRun(document.getElementById('qbox'), { key: k, tag: 'Повторение ' + r, qs: d.quiz.map(function (q, i) { return Object.assign({ _k: k, _i: i }, q); }) });
}
function mistDue() { var t = dayNum(today()); return (S.mist || []).filter(function (m) { return dayNum(m.due) <= t; }); }
function vMistakes() {
  view.innerHTML = '<div class="page pad"><div class="ph1"><h1 class="ar">' + G('راجع غلطاتك', 'راجعي غلطاتك') + '</h1><span class="ru">Оши́бки</span></div><div id="qbox"><p class="ar" style="color:var(--dim)">بيحمّل…</p></div></div>';
  var due = mistDue().slice(0, 15), keys = [];
  due.forEach(function (m) { if (keys.indexOf(m.k) < 0) keys.push(m.k); });
  Promise.all(keys.map(function (k) { return /^r\d$/.test(String(k)) ? reviewData(+String(k).slice(1)) : (canOpen(+k) ? lesson(+k) : Promise.resolve(null)); }))
    .then(function (ds) {
      var qs = [];
      due.forEach(function (m) { var d = ds[keys.indexOf(m.k)]; var q = d && d.quiz && d.quiz[m.i]; if (q) qs.push(Object.assign({ _k: m.k, _i: m.i }, q)); });
      var box = document.getElementById('qbox'); if (!box) return;
      if (!qs.length) { box.innerHTML = '<p class="ar">' + G('مفيش غلطات مستنياك النهارده. برافو!', 'مفيش غلطات مستنياكي النهارده. برافو!') + '</p>'; return; }
      quizRun(box, { key: 'mist', mode: 'mist', qs: qs });
    }).catch(function () { var box = document.getElementById('qbox'); if (box) box.innerHTML = '<p class="ar">مفيش نت دلوقتي.</p>'; });
}
/* ---------- the rest of the lesson (2026-11-20) ---------- */
function dlgOf(k) { return k === 'c' ? LS.L.funny : LS.L.dialogues[+k.slice(1)]; }
function lyrHtml(d) {
  return (d.scene ? '<p class="scene ar">' + esc(d.scene) + '</p>' : '') + '<div class="lyr" id="lyr">' +
    d.lines.map(function (ln, i) { return '<button class="ly" data-line="' + i + '"><span class="who ru">' + esc(ln.who) + '</span><span class="ru">' + String(ln.ru).split(' ').map(function (w) { return '<span class="w">' + esc(w) + '</span>'; }).join(' ') + '</span>' +
      (ln.pr ? '<span class="pr" style="display:block">' + esc(ln.pr) + '</span>' : '') + '<span class="tr ar">' + esc(ln.ar) + '</span></button>'; }).join('') + '</div>';
}
function parasHtml(p) { return (p || []).map(function (x) { return x[0] === 'ru' ? '<p class="ru">' + esc(x[1]) + '</p>' : '<p class="ar">' + mix(x[1]) + '</p>'; }).join(''); }
function picUrl(n, f) { return isFree(n) ? 'pics/l' + pad(n) + '/' + f : n > 100 ? API + '/c/b1/pics/' + bkey(n) + '/' + f + '?t=' + encodeURIComponent(S.token || '') : API + '/c/a1/pics/l' + pad(n) + '/' + f + '?t=' + encodeURIComponent(S.token || ''); }
function pbtn(n, id) { return id ? '<button class="pb" data-url="' + audioUrl(n, id) + '" aria-label="اسمع">' + ico('play') + '</button>' : '<span></span>'; }
/* rules + conjugation (teacher, 2026-11-22: "make it look better… simple and decent"): one rule = a numbered Arabic line over
   a Russian strip (short lists become chips); one verb = a card with its six persons in two columns (singular | plural),
   the ending in gold, every form a tap-to-hear tile */
function ruChips(t) {
  var parts = String(t).replace(/\s+$/, '').replace(/([,?!])\s+/g, '$1|§|').replace(/\s+·\s+/g, '|§|').split('|§|');
  var ok = (parts.length >= 3 || (parts.length === 2 && parts.every(function (x) { return x.indexOf('—') > 0; }))) && parts.every(function (x) { return x.replace(/[,.]$/, '').split(' ').length <= 4; });
  return ok ? '<div class="rchips">' + parts.map(function (x) { return '<span class="ru">' + esc(x.replace(/[,.]$/, '')) + '</span>'; }).join('') + '</div>' : '<span class="ru rsent">' + esc(t) + '</span>';
}
function ruleCard(g, n, k) {
  return '<div class="rule"><div class="rule-h"><span class="rule-n">' + ad(k + 1) + '</span><p class="ar">' + mix(g.ar) + '</p></div>' +
    (g.ru ? '<div class="rule-ex">' + (g.a ? '<button class="pb" data-url="' + audioUrl(n, g.a) + '" aria-label="اسمع">' + ico('play') + '</button>' : '') +
      '<div class="rule-ru">' + ruChips(g.ru) + (g.pr ? '<span class="pr">' + esc(g.pr) + '</span>' : '') + '</div></div>' : '') + '</div>';
}
function endSplit(forms) {   // common stem of the verb forms (stress marks ignored) → [pronoun, stem, ending] for each
  var vs = forms.map(function (f) { var w = String(f.ru).split(' '); return w.length > 1 ? [w.slice(0, -1).join(' '), w[w.length - 1]] : ['', w[0]]; });
  var bare = vs.map(function (v) { return v[1].replace(/́/g, '').toLowerCase(); });
  var k = 0; while (bare.every(function (b) { return b.length > k && b[k] === bare[0][k]; })) k++;
  if (k < 2 || bare.some(function (b) { return b.length - k > 5; })) k = 0;
  return vs.map(function (v) { var w = v[1], c = 0, at = 0; while (at < w.length && c < k) { if (w[at] !== '́') c++; at++; } while (w[at] === '́') at++;
    return [v[0], w.slice(0, at), w.slice(at)]; });
}
function conjCard(v, n) {
  var forms = v.forms || [], sp = endSplit(forms), six = forms.length === 6;
  var cell = function (f, i) { var x = sp[i]; return '<button class="cj-c"' + (f.a ? ' data-cj="' + audioUrl(n, f.a) + '"' : '') + '><span class="cj-p">' + esc(x[0]) + '</span>' +
    '<span class="cj-v">' + esc(x[1]) + (x[2] ? '<b>' + esc(x[2]) + '</b>' : '') + '</span>' + (f.ar ? '<small class="tl">' + esc(f.ar) + '</small>' : '') + '</button>'; };
  var order = six ? [0, 3, 1, 4, 2, 5] : forms.map(function (_, i) { return i; });
  return '<div class="cj"><div class="cj-h"><div class="cj-inf">' + (v.a ? '<button class="pb" data-url="' + audioUrl(n, v.a) + '" aria-label="اسمع">' + ico('play') + '</button>' : '') +
      '<div><b class="ru">' + esc(v.ru) + '</b>' + (v.pr ? '<small class="pr">' + esc(v.pr) + '</small>' : '') + '</div></div>' +
      '<div class="cj-meta"><span class="ar cj-mean">' + esc(v.ar || '') + '</span>' + (v.tip_ar ? '<span class="ar cj-tag">' + esc(v.tip_ar) + '</span>' : '') + '</div></div>' +
    (v.tip_ru ? '<div class="cj-pat ru">' + esc(v.tip_ru) + '</div>' : '') +
    (six ? '<div class="cj-cols"><span class="ar">مفرد</span><span class="ar">جمع</span></div>' : '') +
    '<div class="cj-grid">' + order.map(function (i) { return cell(forms[i], i); }).join('') + '</div></div>';
}
function grammarHtml(L, n) {
  var h = '';
  if (L.grammar) h += '<div class="vhead"><span class="ar">القاعدة في جمل</span><span class="ru">Грамма́тика</span></div>' + L.grammar.map(function (g, k) { return ruleCard(g, n, k); }).join('');
  if (L.trick) h += '<div class="box gold"><h3 class="ar">حيلة للحفظ</h3>' + parasHtml(L.trick) + '</div>';
  [].concat(L.verb_table || []).forEach(function (v) {   // Lesson 23 on: one object, older exports: a list
    h += '<div class="vhead"><span class="ar">' + esc(v.title_ar || '') + '</span><span class="ru">' + esc(v.ru || '') + '</span></div>' +
      (v.present && v.present.length ? conjCard({ ru: v.ru, ar: v.present_ar || '', forms: v.present }, n) : '') +
      (v.stem ? '<div class="box"><p class="ru">' + esc(v.stem.ru || '') + '</p><p class="ar">' + mix(v.stem.ar || '') + '</p></div>' : '') +
      '<div class="words">' + (v.rows || []).map(function (r) { return wrow(r, n); }).join('') + '</div>';
  });
  if (L.conj) h += '<div class="vhead"><span class="ar">تصريف أفعال الدرس</span><span class="ru">Глаго́лы</span></div><p class="note ar cj-help">' + G('دوس على أي تصريف تسمعه. النهاية بالدهبي هي اللي بتتغير.', 'دوسي على أي تصريف تسمعيه. النهاية بالدهبي هي اللي بتتغير.') + '</p>' +
    L.conj.map(function (v) { return conjCard(v, n); }).join('');
  return h;
}
function drillHtml(D, n, key) {
  return '<div class="vhead"><span class="ar">' + esc(D.ar || '') + '</span><span class="ru">' + esc(D.ru || '') + '</span></div>' + (D.note ? '<p class="note ar" style="margin:0 0 8px">' + mix(D.note) + '</p>' : '') +
    (D.img ? '<img class="dimg" src="' + picUrl(n, D.img) + '" alt="" loading="lazy">' : '') +
    '<div class="drill">' + (D.items || []).map(function (it, i) { return '<div class="ditem"><div class="wrow">' + pbtn(n, it.qa) + '<div><span class="ru">' + esc(it.q) + '</span>' + (it.qar ? '<span class="tl">' + esc(it.qar) + '</span>' : '') + '</div></div>' +
      '<button class="reveal" data-act="reveal">' + G('شوف الإجابة', 'شوفي الإجابة') + '</button><div class="ans" hidden><div class="wrow">' + pbtn(n, it.aa) + '<div><span class="ru">' + esc(it.ans) + '</span>' + (it.aar ? '<span class="tl">' + esc(it.aar) + '</span>' : '') + '</div></div></div></div>'; }).join('') + '</div>' +
    '<div class="row2"><button class="btn" data-act="drillplay" data-d="' + key + '">' + ico('repeat') + G('سؤال، سكتة وجاوب، وبعدين الإجابة', 'سؤال، سكتة وجاوبي، وبعدين الإجابة') + '</button></div>';
}
function practiceHtml(L, n) {
  var h = '';
  if (L.drillA) h += drillHtml(L.drillA, n, 'drillA');
  if (L.drillB) h += drillHtml(L.drillB, n, 'drillB');
  if (L.roleplays) h += '<div class="vhead"><span class="ar">كروت الأدوار</span><span class="ru">Ро́левая игра́</span></div>' + L.roleplays.map(function (r, i) {
    return '<div class="mcard"><div class="hd"><b class="ar">' + esc(r.title_ar || '') + '</b><span class="ru">' + esc(r.title_ru || '') + '</span></div><p class="ar">' + esc(r.you_ar || '') + '</p>' +
      (r.teacher_ar ? '<p class="ar">' + esc(r.teacher_ar) + '</p>' : '') + (r.steps_ar ? '<ol class="ar">' + r.steps_ar.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' : '') +
      (r.chunks ? '<div class="chunks">' + r.chunks.map(function (c) { return '<span class="ru">' + esc(c) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="row2"><a class="btn sm" href="#chat/' + n + '/' + i + '">' + ico('spark') + G('اتمرن عليه مع ليرا', 'اتمرني عليه مع ليرا') + '</a></div></div>'; }).join('');
  if (L.game) h += '<div class="box gold"><h3 class="ar">لعبة: ' + esc(L.game.ar || '') + '</h3>' + (L.game.ru ? '<p class="ru">' + esc(L.game.ru) + '</p>' : '') + parasHtml(L.game.p) +
    (L.game.img ? '<img class="dimg" src="' + picUrl(n, L.game.img) + '" alt="" loading="lazy">' : '') + '</div>';
  if (L.game2) h += '<div class="box gold"><h3 class="ar">لعبة تانية: ' + esc(L.game2.ar || '') + '</h3>' + (L.game2.ru ? '<p class="ru">' + esc(L.game2.ru) + '</p>' : '') + parasHtml(L.game2.p) +
    (L.game2.img ? '<img class="dimg" src="' + picUrl(n, L.game2.img) + '" alt="" loading="lazy">' : '') + '</div>';
  return h;
}
function phonHtml(L, n) {
  var h = (L.phon || []).map(function (p) { return '<div class="lcard"><div class="hd2"><span class="ru">' + esc(p.ru || '') + '</span><b class="ar">' + esc(p.ar || '') + '</b></div>' +
    parasHtml(p.rule) + '<div class="words">' + (p.ex || []).map(function (e) { return wrow(e, n); }).join('') + '</div></div>'; }).join('');
  if (L.ik_card) h += '<div class="vhead"><span class="ar">نغمة الجملة</span><span class="ru">Интона́ция</span></div>' + L.ik_card.map(function (c) {
    return '<div class="lcard"><div class="wrow">' + pbtn(n, c.a) + '<div><span class="ik ru">ИК-' + c.ik + '</span><span class="ru">' + esc(c.ru) + '</span></div></div><p class="ar">' + esc(c.ar || '') + '</p></div>'; }).join('');
  return h;
}
function realHtml(R, n) {
  var h = '', sec = function (t, ru, rows) { return rows && rows.length ? '<div class="vhead"><span class="ar">' + t + '</span><span class="ru">' + ru + '</span></div><div class="words">' + rows.map(function (r) { return wrow(r, n); }).join('') + '</div>' : ''; };
  h += sec('كلام كل يوم', 'Разгово́рная речь', R.colloq);
  if (R.chat && R.chat.length) h += '<div class="vhead"><span class="ar">اختصارات الشات</span><span class="ru">Чат</span></div><div class="words">' + R.chat.map(function (c) {
    return '<div class="wrow">' + pbtn(n, c.a) + '<div><span class="ru"><b>' + esc(c.ru) + '</b> = ' + esc(c.full || '') + '</span><span class="ar">' + esc(c.ar || '') + '</span></div></div>'; }).join('') + '</div>';
  if (R.chatmsg && R.chatmsg.length) h += '<div class="chatdemo">' + R.chatmsg.map(function (m, i) { return '<div class="cb ' + (i % 2 ? 'r' : 'l') + '"><small class="ru">' + esc(m[0]) + '</small><span class="ru">' + esc(m[1]) + '</span></div>'; }).join('') + '</div>';
  if (R.note) h += '<p class="note ar">' + mix(R.note) + '</p>';
  h += sec('سلانج نضيف', 'Сленг', R.slang);
  if (R.idioms && R.idioms.length) h += '<div class="vhead"><span class="ar">أمثال وتعبيرات</span><span class="ru">Идио́мы</span></div>' + R.idioms.map(function (i) {
    return '<div class="lcard"><div class="wrow">' + pbtn(n, i.a) + '<div><span class="ru">' + esc(i.ru) + '</span><span class="ar">' + esc(i.ar || '') + '</span></div></div>' + (i.note ? '<p class="note ar" style="margin:4px 0 0">' + esc(i.note) + '</p>' : '') + '</div>'; }).join('');
  return h;
}
function wrow(r, n) { return '<div class="wrow">' + (r.a ? '<button class="pb" data-url="' + audioUrl(n, r.a) + '" aria-label="اسمع">' + ico('play') + '</button>' : '<span></span>') +
  '<div><span class="ru">' + esc(r.ru) + '</span>' + (r.pr ? '<span class="pr" style="display:block">' + esc(r.pr) + '</span>' : '') + '<span class="ar">' + esc(r.ar) + '</span></div></div>'; }
function playerHtml() {
  return '<div class="player"><div class="progress"><i></i></div><div class="ctl">' +
    '<button class="sp' + (P.slow ? ' on' : '') + '" data-act="speed">' + (P.slow ? '0.8×' : '1×') + '</button>' +
    '<button data-act="prev" aria-label="السابق">' + ico('prev') + '</button>' +
    '<button class="big" data-act="toggle" aria-label="تشغيل">' + ico('play') + '</button>' +
    '<button data-act="next" aria-label="التالي">' + ico('next') + '</button>' +
    '<button data-act="trans" aria-label="الترجمة"' + (S.hideTr ? '' : ' class="on"') + '>' + ico('book') + '</button></div>' +
    '<button class="btn ghost sm rcline" data-act="rcline">' + ico('mic') + G('سجّل الجملة دي وقارن', 'سجّلي الجملة دي وقارني') + '</button>' +
    '<button class="rep' + (P.rep ? ' on' : '') + '" data-act="rep"><span class="tx">' + G('كرر ورايا', 'كرري ورايا') + '<small>سكتة بعد كل جملة ' + G('عشان تقولها بصوتك', 'عشان تقوليها بصوتك') + '</small></span><span class="tog"></span></button></div>';
}
function highlight(i) { var lines = document.querySelectorAll('#lyr .ly'); lines.forEach(function (l, k) { l.classList.toggle('now', k === i); }); if (lines[i]) lines[i].scrollIntoView({ block: 'center', behavior: 'smooth' }); }
function startDialogue(from) {
  var s = LS.segs[LS.seg], fun = s.k === 'c', di = fun ? -1 : +s.k.slice(1), d = dlgOf(s.k), n = LS.n;
  var items = d.lines.map(function (ln) { return { src: audioUrl(n, ln.a), slow: ln.slow ? audioUrl(n, ln.slow) : null, ru: ln.ru }; });
  playQueue(items, from, { key: n + s.k, ru: LS.L.ru + (fun ? ' · ' + (d.ru || '') : ' · Диало́г ' + (di + 1)), ar: lessonLabel(n) + (fun ? ' · حوار يضحّك' : ' · الحوار ' + ad(di + 1)), img: photoFor(n), lesson: n },
    { onLine: function (i) { if (P.meta && document.getElementById('lyr') && LS.n === n && LS.segs[LS.seg].k === s.k) highlight(i); },
      onEnd: function () { if (fun) return; var s0 = stars(n); prog(n)['d' + (di + 1)] = 1; save(); afterProgress(n, s0); } });
}

/* unlock */
function vUnlock(n) {
  var h = '<div class="lockpage"><section class="hero"><img src="' + photoFor(n || 6) + '" alt="" style="filter:saturate(.6)"><div class="topbar pad"><a class="back" href="#library" aria-label="رجوع">' + ico('back') + '</a></div>' +
    '<div class="in pad"><span class="d-ar ar t-ar" style="font-size:28px">' + lockTitle() + '</span></div></section><div class="pad" style="display:grid;gap:14px">' +
    '<p class="ar" style="margin:0;color:var(--dim)">' + lockText() + '</p>' +
    (CONF.whatsapp ? '<a class="btn block" href="https://wa.me/' + esc(CONF.whatsapp.replace(/\D/g, '')) + '">كلمنا على واتساب</a><span class="ru" style="text-align:center;display:block;color:var(--dim)">' + esc(CONF.whatsapp) + '</span>' : '') +
    '<label class="ar" for="code" style="font-weight:800">' + G('عندك كود؟', 'عندك كود؟') + '</label><input class="f code" id="code" autocomplete="off" placeholder="A1-XXXX-XXXX">' +
    '<button class="btn block" data-act="code">افتح الكورس</button></div></div>';
  view.innerHTML = h;
}
function dmy(ms) { var d = new Date(ms); return ad(d.getDate()) + '/' + ad(d.getMonth() + 1) + '/' + ad(d.getFullYear()); }
function lockTitle() {
  var a = S.acc;
  if (a && a.state === 'expired') return 'الكود خلص';
  if (a && a.state === 'paused') return 'الكود متوقف مؤقتًا';
  if (a && a.state === 'active') return 'الدرس ده مش في الكود بتاعك';
  return 'الكورس كامل ' + G('مستنيك', 'مستنياكي');
}
function lockText() {
  var a = S.acc;
  if (a && (a.state === 'expired' || a.state === 'paused')) return (a.state === 'expired' ? 'الكود خلص يوم ' + dmy(a.ends) + '. ' : '') + 'الدروس اللي ' + G('فتحتها', 'فتحتيها') + ' لسه معاك. عشان ' + G('تكمل', 'تكملي') + ' الباقي ' + G('كلمنا', 'كلمينا') + ' على واتساب.';
  return '٣٠ درس بالحوارات والكلمات والقراءة، ٣ مراجعات، وكويز لكل درس. ' + G('ابعتلنا', 'ابعتيلنا') + ' على واتساب وهيوصلك كود تفتح بيه الكورس.';
}
var CODE_ERR = { unknown: ['الكود مش صح، اتأكد منه', 'الكود مش صح، اتأكدي منه'], expired: ['الكود ده خلص', 'الكود ده خلص'], cancelled: ['الكود ده اتلغى', 'الكود ده اتلغى'],
  devices: ['الكود شغال على أقصى عدد موبايلات، كلم المدرس', 'الكود شغال على أقصى عدد موبايلات، كلمي المدرس'], too_many: ['محاولات كتير، جرب بعد ساعة', 'محاولات كتير، جربي بعد ساعة'] };
function tryCode() {
  var v = (document.getElementById('code').value || '').trim().toUpperCase();
  if (!v) return toast(G('اكتب الكود الأول', 'اكتبي الكود الأول'));
  if (!API) return toast('التطبيق لسه بيتجهز');
  var btn = document.querySelector('[data-act="code"]'); if (btn) btn.disabled = true;
  fetch(API + '/api/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: v, device: S.device, ref: S.ref || '' }) })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (btn) btn.disabled = false;
      if (!j.ok) { var e = CODE_ERR[j.reason] || CODE_ERR.unknown; return toast(G(e[0], e[1])); }
      S.token = j.token; S.acc = { scope: j.scope, ends: j.ends, state: j.state, opened: j.opened, student: j.student, at: Date.now() }; save();
      toast('اتفتح الكورس لحد ' + dmy(j.ends)); var n = parse().arg; go(n ? '#lesson/' + n : '#library');
    })
    .catch(function () { if (btn) btn.disabled = false; toast('مفيش نت، ' + G('جرب', 'جربي') + ' تاني'); });
}

/* ---------- locked pages (quizzes, reviews, B1, Падежи) ---------- */
function vOpen(path) {
  if (!S.token || !API) { history.replaceState(null, '', '#unlock/0'); toast(G('الصفحة دي محتاجة كود', 'الصفحة دي محتاجة كود')); route = { name: 'unlock', arg: 0 }; vUnlock(0); return; }
  view.innerHTML = '<div class="page pad"><p class="ar" style="color:var(--dim)">بيفتح…</p></div>';
  history.replaceState(null, '', lastHash && lastHash.indexOf('#open') < 0 ? lastHash : '#library');
  location.href = API + '/p/' + path + '?t=' + encodeURIComponent(S.token);
}

/* ---------- progress sync (codes only): every phone of the code shares stars and streak ---------- */
var syncT = null;
function syncLater() { if (!S.token || !API) return; clearTimeout(syncT); syncT = setTimeout(pushProgress, 2500); }
function dayNum(s) { var p = String(s || '').split('-').map(Number); return p.length === 3 ? Date.UTC(p[0], p[1] - 1, p[2]) : 0; }
function mergeIn(d) {
  if (!d) return false; var ch = false;
  Object.keys(d.progress || {}).forEach(function (n) { var p = d.progress[n], o = prog(n); Object.keys(p).forEach(function (k) { if (p[k] && !o[k]) { o[k] = 1; ch = true; } }); });
  var st = d.streak || {};
  if (st.last && (dayNum(st.last) > dayNum(S.streak.last) || (st.last === S.streak.last && st.count > S.streak.count))) { S.streak = { last: st.last, count: st.count }; ch = true; }
  if (!S.name && d.name) { S.name = d.name; ch = true; }
  return ch;
}
function pushProgress() {
  if (!S.token || !API) return;
  fetch(API + '/api/progress?t=' + encodeURIComponent(S.token), { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: { progress: S.progress, streak: S.streak, name: S.name || '', g: S.g || '', freezes: S.freezes || 0, best: S.best || 0, quiz: S.quiz || {} } }) })
    .then(function (r) { return r.json(); }).then(function (j) { if (j.ok && mergeIn(j.data)) store(); if (j.ok) attendFreezes(j.attend); }).catch(function () {});
}
function pullProgress() {
  if (!S.token || !API) return Promise.resolve(false);
  return fetch(API + '/api/progress?t=' + encodeURIComponent(S.token)).then(function (r) { return r.json(); })
    .then(function (j) { var ch = !!(j.ok && mergeIn(j.data)); if (ch) store(); if (j.ok) attendFreezes(j.attend); syncLater(); return ch; }).catch(function () { return false; });
}

/* ---------- voice notes to the teacher ---------- */
var REC = { mr: null, chunks: [], blob: null, mime: '', t0: 0, iv: null, box: null, secs: 0 };
function recHtml(n, kind, title) {
  if (!S.token || !API) return '<p class="note ar">' + title + '. ' + G('ابعته', 'ابعتيه') + ' على واتساب، ولما يبقى ' + G('معاك', 'معاكي') + ' كود ' + G('هتقدر تبعته', 'هتقدري تبعتيه') + ' من هنا.</p>';
  return '<div class="rec" data-n="' + n + '" data-k="' + kind + '"><b class="ar">' + title + '</b>' +
    '<div class="rrow"><button class="rbtn" data-act="rec" aria-label="سجّل">' + ico('mic') + '</button><span class="rt ru">0:00</span><span class="rs ar">' + G('دوس وسجّل، ودوس تاني لما تخلص', 'دوسي وسجّلي، ودوسي تاني لما تخلصي') + '</span></div>' +
    '<audio class="rp" controls hidden></audio><div class="row2" hidden><button class="btn" data-act="rec-send">' + ico('send') + G('ابعته للمدرس', 'ابعتيه للمدرس') + '</button>' +
    '<button class="btn ghost" data-act="rec">' + G('سجّل تاني', 'سجّلي تاني') + '</button></div></div>';
}
function pickMime() { if (!window.MediaRecorder) return null; var c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  for (var i = 0; i < c.length; i++) { if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c[i])) return c[i]; } return ''; }
function recToggle(box) {
  if (REC.mr && REC.mr.state === 'recording') { REC.mr.stop(); return; }
  var mime = pickMime(); if (mime === null || !navigator.mediaDevices) return toast(G('الموبايل ده مش بيسجل من التطبيق، ابعت على واتساب', 'الموبايل ده مش بيسجل من التطبيق، ابعتي على واتساب'));
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    stopTimer(); au.pause(); stopVoice();
    REC.box = box; REC.chunks = []; REC.blob = null;
    var mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); REC.mr = mr;
    var btn = box.querySelector('.rbtn'), rs = box.querySelector('.rs'), rt = box.querySelector('.rt');
    mr.ondataavailable = function (e) { if (e.data && e.data.size) REC.chunks.push(e.data); };
    mr.onstop = function () {
      stream.getTracks().forEach(function (t) { t.stop(); }); clearInterval(REC.iv);
      REC.secs = (Date.now() - REC.t0) / 1000; REC.mime = (mr.mimeType || mime || 'audio/webm').split(';')[0];
      REC.blob = new Blob(REC.chunks, { type: REC.mime });
      var a = box.querySelector('.rp'); a.src = URL.createObjectURL(REC.blob); a.hidden = false; box.querySelector('.row2').hidden = false;
      btn.innerHTML = ico('mic'); btn.classList.remove('on'); rs.textContent = G('اسمع نفسك وبعدين ابعت', 'اسمعي نفسك وبعدين ابعتي');
    };
    mr.start(); REC.t0 = Date.now();
    btn.innerHTML = ico('stop'); btn.classList.add('on'); rs.textContent = 'بيسجل…';
    box.querySelector('.rp').hidden = true; box.querySelector('.row2').hidden = true;
    REC.iv = setInterval(function () { var s = Math.floor((Date.now() - REC.t0) / 1000); rt.textContent = Math.floor(s / 60) + ':' + pad(s % 60); if (s >= 180 && mr.state === 'recording') mr.stop(); }, 250);
  }).catch(function () { toast(G('اسمح للتطبيق يستخدم المايك', 'اسمحي للتطبيق يستخدم المايك')); });
}
function recSend(box, btn) {
  if (!REC.blob || REC.box !== box) return;
  var n = +box.dataset.n, k = box.dataset.k; btn.disabled = true;
  fetch(API + '/api/voice?t=' + encodeURIComponent(S.token) + '&lesson=' + n + '&kind=' + k + '&secs=' + Math.round(REC.secs), { method: 'POST', headers: { 'content-type': REC.mime }, body: REC.blob })
    .then(function (r) { return r.json(); }).then(function (j) {
      btn.disabled = false;
      if (!j.ok) return toast(j.reason === 'limit' ? 'وصلت لأقصى عدد فويسات النهارده' : 'الفويس متبعتش، ' + G('جرب', 'جربي') + ' تاني');
      prog(n).voice = 1; save(); REC.blob = null; box.querySelector('.row2').hidden = true;
      box.querySelector('.rs').textContent = 'وصل للمدرس، وهيرد ' + G('عليك', 'عليكي') + ' هنا في «حسابي»'; toast('الفويس وصل للمدرس');
    }).catch(function () { btn.disabled = false; toast('مفيش نت، ' + G('جرب', 'جربي') + ' تاني'); });
}

/* ---------- voice in and out for Лера (the phone's own speech engines) ---------- */
var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
var RUV = null, LISTEN = null;
function ruVoice() { if (RUV || !('speechSynthesis' in window)) return RUV; var vs = speechSynthesis.getVoices() || [];
  RUV = vs.filter(function (v) { return /^ru/i.test(v.lang); }).sort(function (a, b) { return (b.localService ? 1 : 0) - (a.localService ? 1 : 0); })[0] || null; return RUV; }
if ('speechSynthesis' in window) { try { speechSynthesis.onvoiceschanged = function () { RUV = null; ruVoice(); }; } catch (e) {} }
function speak(t, cb) {
  if (!('speechSynthesis' in window)) { if (cb) cb(); return; }
  stopTimer(); au.pause();
  var u = new SpeechSynthesisUtterance(String(t).replace(/́/g, '')); u.lang = 'ru-RU'; var v = ruVoice(); if (v) u.voice = v;
  u.rate = P.slow ? 0.72 : 0.92; var done = false; u.onend = u.onerror = function () { if (!done) { done = true; if (cb) cb(); } };
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
function stopVoice() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {} if (LISTEN) { try { LISTEN.abort(); } catch (e) {} LISTEN = null; } }
function listen(onText, onEnd) {
  if (!SR) { toast(G('الموبايل ده مش بيسمع روسي، اكتب بدل ما تتكلم', 'الموبايل ده مش بيسمع روسي، اكتبي بدل ما تتكلمي')); if (onEnd) onEnd(false); return null; }
  stopVoice(); var r = new SR(), got = false; r.lang = 'ru-RU'; r.interimResults = false; r.maxAlternatives = 4; r.continuous = false;
  r.onresult = function (e) { var res = e.results[0], alts = []; for (var i = 0; i < res.length; i++) alts.push(res[i].transcript); got = true; onText(alts); };
  r.onerror = function (e) { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast(G('اسمح للتطبيق يستخدم المايك', 'اسمحي للتطبيق يستخدم المايك')); };
  r.onend = function () { if (LISTEN === r) LISTEN = null; if (onEnd) onEnd(got); };
  LISTEN = r; try { r.start(); } catch (e) { LISTEN = null; if (onEnd) onEnd(false); }
  return r;
}
function normW(w) { return String(w).toLowerCase().replace(/́/g, '').replace(/ё/g, 'е').replace(/[^a-zа-я0-9-]/g, ''); }
function sayScore(target, alts) {   // word-by-word: which words of the target the phone heard
  var tw = String(target).split(/\s+/).filter(function (w) { return normW(w); }), best = null;
  alts.forEach(function (a) { var hw = String(a).split(/\s+/).map(normW); var marks = tw.map(function (w) { return hw.indexOf(normW(w)) >= 0; });
    var sc = marks.filter(Boolean).length; if (!best || sc > best.sc) best = { sc: sc, marks: marks, heard: a }; });
  return { words: tw, marks: best ? best.marks : tw.map(function () { return false; }), sc: best ? best.sc : 0, heard: best ? best.heard : '' };
}
function sayHtml(r) {
  var all = r.sc === r.words.length;
  return '<div class="said">' + r.words.map(function (w, i) { return '<span class="' + (r.marks[i] ? 'ok' : 'bad') + '">' + esc(w) + '</span>'; }).join('') + '</div>' +
    '<div class="said-ar ar">' + (all ? G('ممتاز! كل الكلمات واضحة', 'ممتاز! كل الكلمات واضحة') : 'الكلمات الحمرا مكانتش واضحة، ' + G('اسمعها وجرب', 'اسمعيها وجربي') + ' تاني') + '</div>';
}
function tryHtml(t) { return SR && !(isIOS && standalone()) ? '<button class="tryb" data-act="try" data-t="' + esc(t) + '">' + ico('mic') + G('جرّب تقولها', 'جرّبي تقوليها') + '</button>' : '<button class="tryb" data-act="rc" data-t="' + esc(t) + '">' + ico('mic') + G('سجّل وقارن', 'سجّلي وقارني') + '</button>'; }
function doTry(btn) {
  var t = btn.dataset.t, out = btn.nextElementSibling && btn.nextElementSibling.classList.contains('tryres') ? btn.nextElementSibling : null;
  if (!out) { out = document.createElement('div'); out.className = 'tryres'; btn.after(out); }
  out.innerHTML = '<span class="said-ar ar">' + G('قول', 'قولي') + ' الجملة دلوقتي…</span>';
  listen(function (alts) { out.innerHTML = sayHtml(sayScore(t, alts)); }, function (got) { if (!got) out.innerHTML = '<span class="said-ar ar">مسمعتش حاجة، ' + G('جرب', 'جربي') + ' تاني</span>'; });
}

/* ---------- practice with Лера: missions, chat, call, scorecard ---------- */
var AIERR = { ai_off: ['ليرا لسه بتجهز، قريب جدًا', 'ليرا لسه بتجهز، قريب جدًا'], call_paid: ['المكالمة للمشتركين بس، الشات متاح', 'المكالمة للمشتركين بس، الشات متاح'],
  locked: ['الدرس ده محتاج كود', 'الدرس ده محتاج كود'], busy: ['ليرا مشغولة دقيقة، جرب تاني', 'ليرا مشغولة دقيقة، جربي تاني'],
  refusal: ['ليرا مش هترد على ده، جرب جملة تانية', 'ليرا مش هترد على ده، جربي جملة تانية'], token: ['سجّل الكود تاني', 'سجّلي الكود تاني'] };
function aiErr(r) {
  if (r === 'limit') return S.token ? G('خلصت رسايل النهارده، ارجع بكرة', 'خلصتي رسايل النهارده، ارجعي بكرة') : G('خلصت الرسايل المجانية النهارده. مع الكود بتاخد رسايل أكتر ومكالمات', 'خلصتي الرسايل المجانية النهارده. مع الكود بتاخدي رسايل أكتر ومكالمات');
  var e = AIERR[r]; return e ? G(e[0], e[1]) : 'حصلت مشكلة، ' + G('جرب', 'جربي') + ' تاني';
}
var callOk = function () { return !!(SR && 'speechSynthesis' in window && S.token && S.acc && S.acc.state === 'active'); };
function vPractice() {
  var lv = levelNow(), all = []; unitsOf(lv).forEach(function (u) { u.lessons.forEach(function (l) { if (canOpen(l.num)) all.push(l.num); }); });
  var n = S.aiLesson && all.indexOf(S.aiLesson) >= 0 ? S.aiLesson : (all.indexOf(nextLesson(lv)) >= 0 ? nextLesson(lv) : all[0] || 1);
  view.innerHTML = '<div class="page pad"><div class="ph1"><h1 class="ar">' + G('اتكلم', 'اتكلمي') + '</h1><span class="ru">Пра́ктика</span></div>' +
    '<a class="gcard hero" href="#ask" style="margin-top:14px"><span class="ni">' + ico('bulb') + '</span><span class="tx"><span class="ru">Спроси́ Ле́ру</span><b class="ar">اسأل ليرا أي سؤال</b><small class="ar">قواعد، كلمات، نطق، تاريخ وثقافة روسيا، وجدول أي كلمة من القاموس</small></span>' + ico('back', 'end') + '</a>' +
    '<a class="gcard hero" href="#games" style="margin-top:10px"><span class="ni">' + ico('star') + '</span><span class="tx"><span class="ru">Игра́ть</span><b class="ar">ألعاب وتحديات</b><small class="ar">صياد التشديد، محقق النغمة، تحدي الدقيقة وكمان</small></span>' + ico('back', 'end') + '</a>' +
    '<div class="call" style="margin-top:14px"><div class="medal"><img src="img/lera.jpg" alt=""></div><span class="nm ru">Ле́ра</span>' +
    '<p class="ar" style="text-align:center">' + G('اتكلم', 'اتكلمي') + ' معايا بالروسي على الدرس. ' + G('هصححلك', 'هصححلك') + ' بلطف، ولو ' + G('اتلخبطت', 'اتلخبطتي') + ' دوس على اللمبة وهقولك تقول إيه.</p></div>' +
    '<section class="sec"><h2><span>' + G('اختار الدرس', 'اختاري الدرس') + '</span><span class="ru">Уро́к</span></h2><div class="lchips">' +
    (all.length ? all.map(function (k) { return '<button data-ai-lesson="' + k + '"' + (k === n ? ' class="on"' : '') + '>' + lessonNo(k) + '</button>'; }).join('') : '<p class="ar note">' + G('افتح', 'افتحي') + ' درس من المستوى ده الأول.</p>') + '</div></section>' +
    '<section class="sec"><h2><span>' + G('اختار المهمة', 'اختاري المهمة') + '</span><span class="ru">Зада́ния</span></h2><div class="mis" id="mis"><p class="ar" style="color:var(--dim)">بيحمّل…</p></div></section>' +
    (S.token ? '' : '<p class="note ar">' + G('المجاني: الدرس ١ و ٢ بعدد رسايل محدود في اليوم. مع الكود: كل دروسك، رسايل أكتر، ومكالمات بالصوت.', 'المجاني: الدرس ١ و ٢ بعدد رسايل محدود في اليوم. مع الكود: كل دروسك، رسايل أكتر، ومكالمات بالصوت.') + '</p>') + '</div>';
  var box = document.getElementById('mis');
  lesson(n).then(function (L) {
    if (parse().name !== 'practice') return;
    var cards = [{ i: 'f', ar: 'كلام حر مع ليرا', ru: 'Разгово́р', you: L.situation || '', steps: [] }].concat((L.missions || []).map(function (m, i) { return { i: i, ar: m.ar, ru: m.ru, you: m.you, steps: m.steps || [] }; }));
    box.innerHTML = cards.map(function (c) {
      return '<div class="mcard"><div class="hd"><b class="ar">' + esc(c.ar) + '</b><span class="ru">' + esc(c.ru) + '</span></div>' + (c.you ? '<p class="ar">' + esc(c.you) + '</p>' : '') +
        (c.steps.length ? '<ol class="ar">' + c.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' : '') +
        '<div class="row2"><a class="btn sm" href="#chat/' + n + '/' + c.i + '">' + ico('send') + 'شات</a>' +
        (callOk() ? '<a class="btn ghost sm" href="#call/' + n + '/' + c.i + '">' + ico('phone') + 'مكالمة</a>' : (S.token ? '' : '<span class="note ar" style="margin:0;align-self:center">المكالمة للمشتركين</span>')) + '</div></div>';
    }).join('');
  }).catch(function () { box.innerHTML = '<p class="ar" style="color:var(--dim)">الدرس مش متاح دلوقتي.</p>'; });
}
/* ---------- «اسأل ليرا» (2026-11-21): any question about Russian; answers from the course library, encyclopedia notes and a full dictionary ---------- */
var ASK_SUGG = ['إمتى أستخدم «в» وإمتى «на»؟', 'صرّفلي الفعل «хоте́ть»', 'إيه الفرق بين «ты» و«вы»؟', 'إزاي أنطق حرف «ы»؟', 'مين هو بوشكين؟', 'إيه هي «Ма́сленица»؟', 'ليه «челове́к» جمعها «лю́ди»؟', 'إيه الفرق بين «говори́ть» و«сказа́ть»؟'];
var CASE_AR = [['Имени́тельный', 'مين؟ إيه؟'], ['Роди́тельный', 'مفيش مين؟ بتاع مين؟'], ['Да́тельный', 'لمين؟'], ['Вини́тельный', 'شايف مين؟ إيه؟'], ['Твори́тельный', 'مع مين؟ بإيه؟'], ['Предло́жный', 'فين؟ عن مين؟']];
var ASKB = false;
function dictTable(w) {
  var f = w.forms || [], cell = function (x) { return '<td class="ru">' + esc(x || '—') + '</td>'; };
  if (w.type === 'n') return '<table class="dt"><thead><tr><th class="ar">الحالة</th><th class="ar">مفرد</th><th class="ar">جمع</th></tr></thead><tbody>' +
    CASE_AR.map(function (c, i) { return '<tr><th><span class="ru">' + c[0] + '</span><small class="ar">' + c[1] + '</small></th>' + cell(f[i]) + cell(f[i + 6]) + '</tr>'; }).join('') + '</tbody></table>';
  if (w.type === 'v') return '<table class="dt"><tbody>' + ['я', 'ты', 'он / она́', 'мы', 'вы', 'они́'].map(function (p, i) { return '<tr><th class="ru">' + p + '</th>' + cell(f[i]) + '</tr>'; }).join('') +
    '<tr><th class="ar">الماضي</th>' + cell([f[6], f[7], f[8], f[9]].filter(Boolean).join(' · ')) + '</tr><tr><th class="ar">الأمر</th>' + cell([f[10], f[11]].filter(Boolean).join(' · ')) + '</tr></tbody></table>';
  if (w.type === 'a') return '<table class="dt"><thead><tr><th></th><th class="ar">مذكر</th><th class="ar">مؤنث</th><th class="ar">محايد</th><th class="ar">جمع</th></tr></thead><tbody>' +
    CASE_AR.map(function (c, i) { return '<tr><th><span class="ru">' + c[0] + '</span></th>' + cell(f[i]) + cell(f[i + 6]) + cell(f[i + 12]) + cell(f[i + 18]) + '</tr>'; }).join('') + '</tbody></table>';
  return '';
}
function sayRu(t) { try { var u = new SpeechSynthesisUtterance(String(t).replace(/́/g, '')); u.lang = 'ru-RU'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }
function askCard(a) {
  if (a.q) return '<div class="aq ar">' + mix(a.q) + '</div>';
  if (a.err) return '<div class="aa err ar">' + esc(a.err) + '</div>';
  var tts = 'speechSynthesis' in window;
  return '<div class="aa"><div class="ah"><img src="img/lera.jpg" alt=""><b class="ru">Ле́ра</b></div><p class="ar">' + mix(a.answer_ar) + '</p>' +
    (a.examples && a.examples.length ? '<div class="aex">' + a.examples.map(function (x) { return '<div class="ax">' + (tts ? '<button class="pb" data-say="' + esc(x.ru) + '" aria-label="اسمع">' + ico('play') + '</button>' : '') + '<span class="ru">' + esc(x.ru) + '</span><small class="ar">' + esc(x.ar) + '</small></div>'; }).join('') + '</div>' : '') +
    (a.words || []).map(function (w) { var t = dictTable(w); return t ? '<details class="awd" open><summary><span class="ru">' + esc(w.lemma) + '</span><small class="ar">' + ({ n: 'اسم', v: 'فعل', a: 'صفة' }[w.type] || '') + ' · من القاموس</small></summary><div class="dtw">' + t + '</div></details>' : ''; }).join('') +
    (a.tip_ar ? '<div class="atip ar">' + ico('bulb') + '<span>' + mix(a.tip_ar) + '</span></div>' : '') +
    (a.sources && a.sources.length ? '<small class="asrc ar">المصادر: ' + a.sources.map(function (s2) { return s2.src === 'wiki' && s2.url ? '<a href="' + esc(s2.url) + '" target="_blank" rel="noopener" class="ru">' + esc(s2.title) + '</a>' : '<span>' + mix(s2.src === 'teach' ? 'طريقة الشرح' : s2.title) + '</span>'; }).join(' · ') + '</small>' : '') + '</div>';
}
function vAsk() {
  S.askHist = S.askHist || [];
  view.innerHTML = '<div class="chat ask"><div class="ch-top pad"><a class="back" href="#practice" aria-label="رجوع">' + ico('back') + '</a><img src="img/lera.jpg" alt="">' +
    '<div class="who"><span class="ru">Спроси́ Ле́ру</span><small class="ar">' + G('اسأل', 'اسألي') + ' أي سؤال عن الروسي: قواعد، كلمات، نطق، تاريخ، ثقافة</small></div>' +
    (S.askHist.length ? '<button class="ib" data-act="ask-clear" aria-label="امسح">' + ico('back') + '</button>' : '') + '</div>' +
    '<div class="msgs pad" id="amsgs">' + (S.askHist.length ? S.askHist.map(askCard).join('') :
      '<div class="asugg"><p class="ar">' + G('جرّب', 'جرّبي') + ' سؤال من دول، أو ' + G('اكتب', 'اكتبي') + ' سؤالك:</p>' + ASK_SUGG.map(function (q) { return '<button class="ar" data-askq="' + esc(q) + '">' + mix(q) + '</button>'; }).join('') + '</div>') + '</div>' +
    '<p class="anote ar">ليرا ذكاء اصطناعي وممكن تغلط. لو حاجة مش واضحة ' + G('اسأل', 'اسألي') + ' المدرس في الحصة.</p>' +
    '<div class="ch-bar pad"><input id="ask-in" dir="auto" autocomplete="off" enterkeyhint="send" placeholder="' + G('اكتب سؤالك…', 'اكتبي سؤالك…') + '"><button class="go" data-act="ask-send" aria-label="ابعت">' + ico('send') + '</button></div></div>';
  var m = document.getElementById('amsgs'); m.lastElementChild && m.lastElementChild.scrollIntoView({ block: 'end' });
  document.getElementById('ask-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); askSend(); } });
}
function askSend(q) {
  var inp = document.getElementById('ask-in'); q = (q || (inp && inp.value) || '').trim(); if (!q || ASKB) return;
  if (inp) inp.value = '';
  S.askHist = (S.askHist || []).concat([{ q: q }]).slice(-24); store();
  var m = document.getElementById('amsgs'); if (m.querySelector('.asugg')) m.innerHTML = '';
  m.insertAdjacentHTML('beforeend', askCard({ q: q }) + '<div class="aa typing" id="atyping"><i></i><i></i><i></i></div>'); m.lastElementChild.scrollIntoView({ block: 'end', behavior: 'smooth' });
  ASKB = true;
  var hist = []; (S.askHist || []).slice(-7, -1).forEach(function (a) { if (a.q) hist.push({ role: 'user', content: a.q }); else if (a.answer_ar) hist.push({ role: 'assistant', content: a.answer_ar }); });
  fetch(API + '/api/ask' + (S.token ? '?t=' + encodeURIComponent(S.token) : ''), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: q, g: S.g, device: S.device, history: hist }) })
    .then(function (r) { return r.json(); }).then(function (j) {
      ASKB = false; var t = document.getElementById('atyping'); if (t) t.remove();
      var a = j.ok ? { answer_ar: j.answer_ar, examples: j.examples, tip_ar: j.tip_ar, words: j.words, sources: j.sources } :
        { err: j.reason === 'limit' ? G('خلصت أسئلة النهارده. ارجع بكرة، أو اسأل المدرس في الحصة.', 'خلصت أسئلة النهارده. ارجعي بكرة، أو اسألي المدرس في الحصة.') : j.reason === 'busy' ? 'ليرا عليها ضغط دلوقتي، جرّب بعد شوية.' : 'حصلت مشكلة، جرّب تاني.' };
      if (j.ok) { S.askHist.push(a); S.askHist = S.askHist.slice(-24); store(); touchStreak(); }
      var mm = document.getElementById('amsgs'); if (!mm) return; mm.insertAdjacentHTML('beforeend', askCard(a)); mm.lastElementChild.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }).catch(function () { ASKB = false; var t = document.getElementById('atyping'); if (t) t.remove(); toast(G('محتاج نت', 'محتاجة نت')); });
}
var CH = null;
function newChat(n, mi, call) { return { n: n, mi: mi, call: !!call, id: (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)), msgs: [], items: [], steps: [], fin: false, busy: false, last: null, score: null, L: null }; }
function missionOf(L, mi) { return mi >= 0 ? (L.missions || [])[mi] : null; }
function vChat(a) {
  if (!LES[a.n] || !canOpen(a.n)) return go('#unlock/' + a.n);
  if (!CH || CH.n !== a.n || CH.mi !== a.mi || CH.call) CH = newChat(a.n, a.mi, false);
  S.aiLesson = a.n; store();
  lesson(a.n).then(function (L) {
    if (parse().name !== 'chat') return;
    CH.L = L; var m = missionOf(L, a.mi);
    view.innerHTML = '<div class="chat"><div class="ch-top pad"><a class="back" href="#practice" aria-label="رجوع">' + ico('back') + '</a><img src="img/lera.jpg" alt="">' +
      '<div class="who"><span class="ru">' + esc(m ? m.ru : 'Ле́ра') + '</span><small class="ar">' + esc(m ? m.ar : 'كلام حر · ' + (a.n > 100 ? 'В1 · ' : '') + lessonLabel(a.n)) + '</small></div>' +
      '<button class="ib' + (S.hideTr ? '' : ' on') + '" data-act="trans" aria-label="الترجمة">' + ico('ar') + '</button>' +
      '<button class="btn ghost sm" data-act="ai-end">' + G('خلصت', 'خلصت') + '</button></div>' +
      (m && m.steps && m.steps.length ? '<div class="steps pad ar" id="steps"></div>' : '') +
      '<div class="msgs pad" id="msgs"></div>' +
      '<div class="ch-bar pad"><button data-act="ai-hint" aria-label="مساعدة">' + ico('bulb') + '</button>' +
      '<input id="ai-in" dir="auto" autocomplete="off" enterkeyhint="send" placeholder="Напиши́…">' +
      (SR ? '<button data-act="ai-mic" aria-label="اتكلم">' + ico('mic') + '</button>' : '') +
      '<button class="go" data-act="ai-send" aria-label="ابعت">' + ico('send') + '</button></div></div>';
    drawChat();
    if (!CH.msgs.length && !CH.busy) aiCall(false);
  }).catch(function () { view.innerHTML = '<div class="page pad"><p class="ar">الدرس مش متاح دلوقتي.</p></div>'; });
}
function drawSteps() {
  var el = document.getElementById('steps'); if (!el || !CH.L) return; var m = missionOf(CH.L, CH.mi); if (!m) return;
  el.innerHTML = m.steps.map(function (s, i) { return '<span class="' + (CH.steps.indexOf(i + 1) >= 0 ? 'ok' : '') + '">' + ad(i + 1) + '. ' + esc(s) + '</span>'; }).join('');
}
function itemHtml(it, i) {
  if (it.t === 'ai') return '<div class="b ai"><span class="ru">' + esc(it.ru) + '</span><span class="tr ar">' + esc(it.ar) + '</span><button class="say" data-act="say" data-t="' + esc(it.ru) + '" aria-label="اسمع">' + ico('sound') + '</button></div>';
  if (it.t === 'me') return '<div class="b me"><span class="ru">' + esc(it.ru) + '</span></div>';
  if (it.t === 'fix') return '<div class="fix"><span class="ar">' + mix(it.ar || 'الأصح كده:') + '</span><span class="ru">' + esc(it.ru) + '</span>' + tryHtml(it.ru) + '</div>';
  if (it.t === 'hint') return '<div class="hintc"><span class="ru">' + esc(it.ru) + '</span><span class="tr ar">' + esc(it.ar) + '</span><div class="row2" style="margin-top:4px">' +
    '<button class="btn sm" data-act="hint-use" data-t="' + esc(it.ru) + '">' + G('استخدمها', 'استخدميها') + '</button><button class="btn ghost sm" data-act="say" data-t="' + esc(it.ru) + '">' + ico('sound') + 'اسمع</button></div>' + tryHtml(it.ru) + '</div>';
  if (it.t === 'note') return '<p class="note ar" style="text-align:center">' + esc(it.ar) + '</p>';
  if (it.t === 'card') return cardHtml(it, i);
  return '';
}
/* Лера's quick exercise cards (tutor rules, 2026-11-21): choose / fill the gap / a word's table from the dictionary */
function cardHtml(it, i) {
  var c = it.c, fresh = !it.seen; it.seen = 1; var head = '<div class="tcard' + (fresh ? ' new' : '') + '"><div class="tch ar">' + ico('bulb') + '<span>' + mix(c.prompt_ar) + '</span></div>';
  if (c.type === 'declension_table') return head + '<div class="dtw">' + dictTable(c.word) + '</div>' + (c.why_ar ? '<p class="why ar">' + mix(c.why_ar) + '</p>' : '') + '</div>';
  var done = it.pick != null, ok = done && it.pick === c.answer;
  var gap = done ? '<b class="gap' + (ok ? ' ok' : '') + '">' + esc(c.options[c.answer]) + '</b>' : '<b class="gap">_____</b>';
  var ru = esc(c.ru).split('___').join(gap);
  return head + '<p class="tq ru">' + ru + '</p><div class="topts">' + c.options.map(function (o, k) {
    var cl = done ? (k === c.answer ? ' ok' : k === it.pick ? ' no' : '') : '';
    return '<button class="ru' + cl + '" data-tcard="' + i + '" data-topt="' + k + '"' + (done ? ' disabled' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>' +
    (done ? '<p class="why ar">' + (ok ? G('برافو!', 'برافو!') + ' ' : G('مش دي، ', 'مش دي، ')) + mix(c.why_ar || '') + '</p>' : '') + '</div>';
}
function cardPick(i, k) {
  var it = CH && CH.items[i]; if (!it || it.t !== 'card' || it.pick != null) return;
  it.pick = k; var ok = k === it.c.answer;
  if (ok) { try { chime && chime(); } catch (e) {} touchStreak(); }
  drawChat();
}
function scoreHtml(sc) {
  var st = ''; for (var i = 0; i < 3; i++) st += ico('star', i < sc.stars ? '' : 'off');
  return '<div class="score"><div class="medal" style="width:84px;height:84px"><img src="img/lera.jpg" alt=""></div><div class="st">' + st + '</div><p class="ar">' + mix(sc.summary_ar) + '</p>' +
    (sc.good_ar && sc.good_ar.length ? '<h3 class="ar">' + G('عملت كويس', 'عملتي كويس') + '</h3><ul class="ar">' + sc.good_ar.map(function (x) { return '<li>' + mix(x) + '</li>'; }).join('') + '</ul>' : '') +
    (sc.work_ar && sc.work_ar.length ? '<h3 class="ar">' + G('ركّز على', 'ركّزي على') + '</h3><ul class="ar">' + sc.work_ar.map(function (x) { return '<li>' + mix(x) + '</li>'; }).join('') + '</ul>' : '') +
    (sc.fixes && sc.fixes.length ? '<h3 class="ar">أهم ٣ تصحيحات</h3><div class="sfix">' + sc.fixes.map(function (f) { return '<div class="it"><s class="ru">' + esc(f.wrong) + '</s><b class="ru">' + esc(f.right) + '</b><button class="say" style="position:static;margin:0" data-act="say" data-t="' + esc(f.right) + '" aria-label="اسمع">' + ico('sound') + '</button>' + (f.why_ar ? '<small class="ar">' + mix(f.why_ar) + '</small>' : '') + '</div>'; }).join('') + '</div>' : '') +
    (sc.review_ru && sc.review_ru.length ? '<h3 class="ar">' + G('جمل تحفظها', 'جمل تحفظيها') + '</h3><div class="rv">' + sc.review_ru.map(function (x) { return '<div class="it"><span class="ru">' + esc(x) + '</span><button class="say" style="position:static;margin:0" data-act="say" data-t="' + esc(x) + '" aria-label="اسمع">' + ico('sound') + '</button></div>'; }).join('') + '</div>' : '') +
    '<div class="row2" style="justify-content:center"><button class="btn" data-act="ai-again">' + G('محادثة جديدة', 'محادثة جديدة') + '</button><a class="btn ghost" href="#practice">رجوع</a></div></div>';
}
function drawChat() {
  var box = document.getElementById('msgs'); if (!box) return;
  box.innerHTML = CH.items.map(function (it, i) { return itemHtml(it, i); }).join('') + (CH.busy ? '<div class="typing" aria-label="بتكتب"><i></i><i></i><i></i></div>' : '') + (CH.score ? scoreHtml(CH.score) : '');
  drawSteps();
  var bar = view.querySelector('.ch-bar'); if (bar) bar.hidden = !!CH.score;
  setTimeout(function () { window.scrollTo(0, document.body.scrollHeight); }, 30);
}
function aiCall(end) {
  if (CH.busy) return; CH.busy = true; if (CH.call) callUi(); else drawChat();
  var c = CH, body = { season: rmdActive() ? 'ramadan' : '', lesson: c.n, mission: c.mi, mode: c.call ? 'call' : 'chat', messages: c.msgs, g: S.g, name: S.name || '', device: S.device, chat: c.id, end: !!end };
  fetch(API + '/api/ai' + (S.token ? '?t=' + encodeURIComponent(S.token) : ''), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      c.busy = false;
      if (!j.ok) { c.items.push({ t: 'note', ar: aiErr(j.reason) }); if (c === CH) { if (c.call) { callUi(); } else drawChat(); } return; }
      if (end) { c.score = j; prog(c.n).ai = 1; save(); if (c === CH) { if (c.call) { stopVoice(); c.call = false; go('#chat/' + c.n + '/' + (c.mi < 0 ? 'f' : c.mi)); } else drawChat(); } return; }
      if (j.fix_ru) c.items.push({ t: 'fix', ru: j.fix_ru, ar: j.fix_ar });
      c.msgs.push({ role: 'assistant', content: j.reply_ru }); c.items.push({ t: 'ai', ru: j.reply_ru, ar: j.reply_ar });
      if (j.card && !c.call) c.items.push({ t: 'card', c: j.card });
      c.last = j; c.steps = j.steps_done || []; if (j.finished) { c.fin = true; c.items.push({ t: 'note', ar: G('المهمة خلصت! دوس «خلصت» فوق عشان تشوف نجومك', 'المهمة خلصت! دوسي «خلصت» فوق عشان تشوفي نجومك') }); }
      if (c !== CH) return;
      if (c.call) { CALL.state = 'speak'; callUi(); speak(j.reply_ru, function () { CALL.state = 'idle'; if (CH === c && parse().name === 'call' && !c.fin) callListen(); else callUi(); }); }
      else drawChat();
    })
    .catch(function () { c.busy = false; c.items.push({ t: 'note', ar: 'مفيش نت، ' + G('جرب', 'جربي') + ' تاني' }); if (c === CH) { if (c.call) callUi(); else drawChat(); } });
}
function aiSend(text) {
  text = String(text || '').trim(); if (!text || CH.busy || CH.score) return;
  CH.msgs.push({ role: 'user', content: text }); CH.items.push({ t: 'me', ru: text });
  var inp = document.getElementById('ai-in'); if (inp) inp.value = '';
  touchStreak(); aiCall(false);
}
function aiHint() {
  var j = CH.last; if (!j || !j.hint_ru) return toast(G('استنى ليرا تتكلم الأول', 'استني ليرا تتكلم الأول'));
  CH.items.push({ t: 'hint', ru: j.hint_ru, ar: j.hint_ar }); drawChat();
}
function aiEnd() {
  if (CH.busy) return;
  if (CH.msgs.filter(function (m) { return m.role === 'user'; }).length < 1) { go('#practice'); return; }
  aiCall(true);
}
/* call mode: Лера speaks, then the phone listens */
function vCall(a) {
  if (!LES[a.n] || !canOpen(a.n)) return go('#unlock/' + a.n);
  if (!callOk()) { toast(S.token ? 'المكالمة مش شغالة على الموبايل ده، الشات متاح' : aiErr('call_paid')); return go('#chat/' + a.n + '/' + (a.mi < 0 ? 'f' : a.mi)); }
  if (!CH || CH.n !== a.n || CH.mi !== a.mi || !CH.call) CH = newChat(a.n, a.mi, true);
  lesson(a.n).then(function (L) { if (parse().name !== 'call') return; CH.L = L; callUi(); });
}
var CALL = { state: 'idle', heard: '' };
function callUi() {
  if (parse().name !== 'call') return;
  var m = CH.L ? missionOf(CH.L, CH.mi) : null, lastAi = null, lastMe = null;
  for (var i = CH.items.length - 1; i >= 0; i--) { var it = CH.items[i]; if (!lastAi && it.t === 'ai') lastAi = it; if (!lastMe && it.t === 'me') lastMe = it; }
  var note = CH.items.length && CH.items[CH.items.length - 1].t === 'note' ? CH.items[CH.items.length - 1].ar : '';
  var status = !CH.msgs.length && !CH.busy ? G('دوس «ابدأ» عشان ليرا ترد', 'دوسي «ابدأ» عشان ليرا ترد') : CH.busy ? 'ليرا بتفكر…' : CALL.state === 'speak' ? 'ليرا بتتكلم…' : CALL.state === 'listen' ? G('دورك، اتكلم دلوقتي', 'دورك، اتكلمي دلوقتي') : (note || G('دوس على المايك واتكلم', 'دوسي على المايك واتكلمي'));
  var started = CH.msgs.length > 0 || CH.busy;
  view.innerHTML = '<div class="callv pad"><div class="top"><div class="medal' + (CALL.state === 'speak' ? ' talk' : '') + '"><img src="img/lera.jpg" alt=""></div><span class="nm ru">' + esc(m ? m.ru : 'Ле́ра') + '</span>' +
    '<div class="bars' + (CALL.state === 'speak' ? ' on' : '') + '" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b><b></b><b></b></div><div class="cs ar">' + esc(status) + '</div><div class="lines">' +
    (lastAi ? '<span class="ru">' + esc(lastAi.ru) + '</span><span class="tr ar">' + esc(lastAi.ar) + '</span>' : '') +
    (lastMe ? '<span class="ru me">' + esc(lastMe.ru) + '</span>' : '') + '</div></div>' +
    '<div class="cctl">' +
    (started ? '<span class="c"><button data-act="call-hint" aria-label="مساعدة">' + ico('bulb') + '</button><small>مساعدة</small></span>' +
      '<span class="c"><button class="big' + (CALL.state === 'listen' ? ' on' : '') + '" data-act="call-mic" aria-label="اتكلم">' + ico('mic') + '</button><small>' + G('اتكلم', 'اتكلمي') + '</small></span>'
      : '<span class="c"><button class="big" data-act="call-start" aria-label="ابدأ">' + ico('phone') + '</button><small>ابدأ</small></span>') +
    '<span class="c"><button class="hang" data-act="call-end" aria-label="إنهاء">' + ico('end') + '</button><small>إنهاء</small></span></div></div>';
  var md = view.querySelector('.medal'); if (md) md.classList.toggle('talk', CALL.state === 'speak');
}
function callStart() {
  try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) {}   // iPhone: first speech must come from a tap
  CALL.state = 'idle'; aiCall(false);
}
function callListen() {
  CALL.state = 'listen'; callUi();
  listen(function (alts) { CALL.state = 'idle'; aiSend(alts[0]); }, function (got) { if (!got) { CALL.state = 'idle'; callUi(); } });
}

/* profile */
function avatarHtml(cls) {
  if (S.avatar === 'm') return '<img class="av ' + (cls || '') + '" src="img/learner_m.jpg" alt="">';
  return '<span class="av ' + (cls || '') + '">' + esc((S.name || 'ن').trim().charAt(0)) + '</span>';
}
function lvProgress(lv) {
  var all = []; unitsOf(lv).forEach(function (u) { u.lessons.forEach(function (l) { all.push(l.num); }); });
  return { done: all.filter(function (n) { return stars(n) === 3; }).length, total: all.length };
}
function badges() {
  var three = 0, any = 0, q100 = false, best = Math.max(streakNow(), S.bestStreak || 0);
  Object.keys(S.progress).forEach(function (k) { var x = stars(+k); if (x) any++; if (x === 3) three++; });
  Object.keys(S.quiz || {}).forEach(function (k) { if ((S.quiz[k] || 0) >= 100) q100 = true; });
  var unit = IDX ? IDX.units.some(function (u, i) { return unitDone(i); }) : false;
  return [
    { ic: 'play', ar: 'أول درس', on: any > 0 },
    { ic: 'feather', ar: '٧ أيام ورا بعض', on: best >= 7 },
    { ic: 'star', ar: '٥ دروس بـ٣ نجوم', on: three >= 5 },
    { ic: 'test', ar: 'كويز ١٠٠٪', on: q100 },
    { ic: 'check', ar: 'وحدة كاملة', on: unit },
    { ic: 'spark', ar: '٣٠ يوم ورا بعض', on: best >= 30 },
    { ic: 'feather', ar: 'غلبت زعيم', on: Object.keys(S.boss || {}).length > 0 },
    { ic: 'book', ar: '١٠٠ كلمة في الألبوم', on: Object.keys(S.album || {}).length >= 100 },
    { ic: 'mic', ar: 'إملاء من غير غلط', on: !!S.dictPerfect }
  ];
}
function vProfile() {
  var total = 0, three = 0; Object.keys(S.progress).forEach(function (k) { var s2 = stars(+k); total += s2; if (s2 === 3) three++; });
  if (streakNow() > (S.bestStreak || 0)) { S.bestStreak = streakNow(); store(); }
  var a = S.acc, lv = LEVELS.filter(function (x) { return x.id === levelNow(); })[0];
  var left = a && a.state === 'active' && a.ends ? Math.max(0, Math.ceil((a.ends - Date.now()) / 864e5)) : 0;
  var span = a && a.ends && a.starts ? Math.max(1, Math.round((a.ends - a.starts) / 864e5)) : 30;
  var h = '<div class="page pad prof">' +
    '<section class="pcard"><div class="pc-top">' + avatarHtml('big') +
      '<div class="pc-id"><b class="ar">' + esc(S.name || G('ضيفنا', 'ضيفتنا')) + '</b><span class="lvb"><span class="ru">' + lv.ru + '</span><small class="ar">' + lv.ar + '</small></span></div></div>' +
      '<div class="pc-acc"><span class="ar">' + accText() + '</span>' +
      (left ? '<div class="bar" aria-label="أيام الكود"><i style="transform:scaleX(' + Math.min(1, left / span).toFixed(3) + ')"></i></div><small class="ar">فاضل ' + ad(left) + ' يوم' + (a.max_devices ? ' · ' + ad(a.devices || 1) + ' من ' + ad(a.max_devices) + ' موبايل' : '') + '</small>' : '') +
      '</div></section>' +
    '<div class="stats"><div class="stat"><b>' + streakNow() + '</b><small>أيام ورا بعض</small></div><div class="stat"><b>' + total + '</b><small>نجمة</small></div><div class="stat"><b>' + three + '</b><small>درس خلص</small></div></div>' +
    '<button class="fbcard" data-act="firebird">' + firebirdSvg(featherCount(streakNow()), -1) + '<span class="tx"><b class="d-ar">طائر النار</b><small class="ar">' + G('كل يوم بتذاكر بيفرد ريشة. ٧ أيام ورا بعض وديله كله يتفتح', 'كل يوم بتذاكري بيفرد ريشة. ٧ أيام ورا بعض وديله كله يتفتح') + '</small></span></button>' +
    '<section class="sec"><h2><span>المستويات</span><span class="ru">Уровни</span></h2><div class="lvls">' +
      LEVELS.map(function (l) {
        if (l.soon) return '<div class="lvrow soon"><span class="ru lv">' + l.ru + '</span><span class="tx"><b class="ar">' + l.ar + '</b><small class="ar">قريب</small></span></div>';
        var pr = lvProgress(l.id), open = l.id === 'a1' || hasCourse(l.id);
        return '<button class="lvrow' + (l.id === levelNow() ? ' on' : '') + '" data-act="setlevel" data-l="' + l.id + '"><span class="ru lv">' + l.ru + '</span><span class="tx"><b class="ar">' + l.ar + '</b>' +
          '<div class="bar"><i style="transform:scaleX(' + (pr.total ? pr.done / pr.total : 0).toFixed(3) + ')"></i></div><small class="ar">' + ad(pr.done) + ' من ' + ad(pr.total) + (open ? '' : ' · محتاج كود') + '</small></span></button>';
      }).join('') + '</div></section>' +
    '<section class="sec"><h2><span>الأوسمة</span><span class="ru">Награ́ды</span></h2><div class="badges">' +
      badges().map(function (x) { return '<div class="badge' + (x.on ? ' on' : '') + '"><span class="md">' + ico(x.ic) + '</span><small class="ar">' + x.ar + '</small></div>'; }).join('') + '</div></section>' +
    '<section class="sec"><h2><span>الإعدادات</span></h2>' +

    setRow('hideTr', 'إخفاء الترجمة في الحوارات', G('عشان تفهم بالروسي بس', 'عشان تفهمي بالروسي بس')) +
    setRow('light', 'الوضع الفاتح', 'للمذاكرة في النور') +
    '<button class="set gold" data-act="tour"><span class="tx">جولة مع ژارا<small>' + G('هفرّجك', 'هفرّجك') + ' على التطبيق كله من الأول، وكل صفحة ' + G('هتفتحها', 'هتفتحيها') + ' هشرحها تاني</small></span>' + ico('feather') + '</button>' +
    '<button class="set" data-act="birdstory"><span class="tx">حكاية ژارا، طائر النار<small>مين هي، وليه ريشها بيرجع كل يوم ' + G('بتذاكر', 'بتذاكري') + ' فيه</small></span>' + ico('feather') + '</button>' +
    setRow('noCat', 'إخفاء ژارا', 'طائر النار اللي ' + G('بيديك', 'بيديكي') + ' نصايح وبيطير بين الصفحات') +
    setRow('noHello', 'من غير صوت الترحيب', 'ليرا بتسلّم ' + G('عليك', 'عليكي') + ' بالروسي لما ' + G('تفتح', 'تفتحي') + ' التطبيق') +
    remindRow() +
    rmdRow() +
    (S.token ? '<button class="set" data-act="invite"><span class="tx">' + G('اعزم صاحبك', 'اعزمي صاحبتك') + '<small>لو اشترك، إنتوا الاتنين بتاخدوا هدية من المدرس</small><small id="friends"></small></span>' + ico('send') + '</button>' : '') +
    '<a class="set" href="#certs"><span class="tx">شهاداتي<small>شهادة لكل وحدة ' + G('تخلصها', 'تخلصيها') + '</small></span>' + ico('star') + '</a>' +
    '<a class="set" href="#welcome"><span class="tx">' + G('غيّر اسمك وصورتك', 'غيّري اسمك وصورتك') + '</span>' + ico('back') + '</a>' +
    '</section>' +
    '<section class="sec"><h2><span>الحساب</span></h2>' +
    (S.token
      ? (a && a.state === 'active' ? '' : '<a class="set" href="#unlock/0"><span class="tx">' + G('جدد الكود أو اكتب كود جديد', 'جددي الكود أو اكتبي كود جديد') + '<small>' + G('افتح', 'افتحي') + ' الكورس كله</small></span>' + ico('lock') + '</a>') +
        '<button class="set out" data-act="logout"><span class="tx">' + G('تسجيل الخروج', 'تسجيل الخروج') + '<small>الموبايل ده يسيب الكود ومكانه يفضى لموبايل تاني</small></span>' + ico('out') + '</button>'
      : '<a class="set gold" href="#unlock/0"><span class="tx">' + G('سجّل دخول بالكود', 'سجّلي دخول بالكود') + '<small>الكود اللي المدرس ' + G('بعتهولك', 'بعتهولك') + ' على الواتساب</small></span>' + ico('lock') + '</a>') +
    '</section>' +
    (S.token && API ? '<section class="sec"><h2><span>فويساتك وردود المدرس</span></h2><div class="replies" id="replies"><p class="note ar">بيحمّل…</p></div></section>' : '') +
    credits() + '</div>';
  view.innerHTML = h;
  if (S.token && API) fetch(API + '/api/voices?t=' + encodeURIComponent(S.token)).then(function (r) { return r.json(); }).then(function (j) {
    var el = document.getElementById('replies'); if (!el || !j.ok) return;
    el.innerHTML = j.voices.length ? j.voices.map(function (v) {
      return '<div class="reply"><small class="ar">' + lessonLabel(v.lesson) + ' · ' + dmy(v.at) + (v.reply ? '' : (v.heard ? ' · المدرس سمعه' : ' · لسه متسمعش')) + '</small>' + (v.reply ? '<p class="ar">' + esc(v.reply) + '</p>' : '') + '</div>';
    }).join('') : '<p class="note ar">' + G('لسه مبعتش فويس. من أي درس افتح «القراءة» أو «الواجب والمزيد» وسجّل.', 'لسه مبعتيش فويس. من أي درس افتحي «القراءة» أو «الواجب والمزيد» وسجّلي.') + '</p>';
  }).catch(function () {});
}
function logoutSheet() {
  var d = document.createElement('div'); d.className = 'sheetwrap';
  d.innerHTML = '<div class="sheet-bg" data-act="sheetclose"></div><div class="sheet" role="dialog"><h3 class="ar">' + G('تخرج من الكود؟', 'تخرجي من الكود؟') + '</h3>' +
    '<p class="ar" style="margin:0;color:var(--dim)">الموبايل ده هيسيب الكود ومكانه يفضى. نجومك وسلسلتك محفوظين، والدروس اللي ' + G('فتحتها', 'فتحتيها') + ' بترجع لما ' + G('تدخل', 'تدخلي') + ' بنفس الكود تاني.</p>' +
    '<button class="btn block" data-act="logoutyes">' + G('أيوه، اخرج', 'أيوه، اخرجي') + '</button><button class="btn ghost block" data-act="sheetclose">لأ، خليني</button></div>';
  document.body.appendChild(d);
}
function doLogout() {
  var w = document.querySelector('.sheetwrap'); if (w) w.remove();
  var t = S.token;
  var done = function () { S.token = null; S.acc = null; S.level = null; save(); toast('خرجت من الكود'); go('#home'); };
  if (!t || !API) { done(); return; }
  fetch(API + '/api/logout?t=' + encodeURIComponent(t), { method: 'POST' }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
    .then(function (x) { if (x.s === 429) { toast('اتخرجت كتير الشهر ده. كلم المدرس'); return; } done(); })
    .catch(function () { toast(G('محتاج نت عشان تخرج', 'محتاجة نت عشان تخرجي')); });
}
function accText() {
  var a = S.acc; if (!a || !S.token) return 'النسخة المجانية: الدرس ١ و ٢';
  var n = (a.opened || []).length;
  if (a.state === 'active') return 'الكود شغال لحد ' + dmy(a.ends);
  if (a.state === 'expired') return 'الكود خلص يوم ' + dmy(a.ends) + ' · ' + ad(n) + ' درس ' + G('فتحته', 'فتحتيه') + ' لسه معاك';
  if (a.state === 'paused') return 'الكود متوقف مؤقتًا · الدروس اللي ' + G('فتحتها', 'فتحتيها') + ' معاك';
  if (a.state === 'cancelled') return 'الكود اتلغى';
  return 'الكود لسه مبدأش';
}
function setRow(k, t, s) { return '<button class="set" data-set="' + k + '"><span class="tx">' + t + '<small>' + s + '</small></span><span class="tog' + (S[k] ? ' on' : '') + '"></span></button>'; }

/* welcome / onboarding */
var W = { step: 0 };
function vWelcome() {
  if (S.onboarded && W.step === 0) W.step = 1;
  if (W.step === 0) {
    view.innerHTML = '<section class="welcome"><img class="bg" src="img/u1.jpg" alt=""><div class="in pad"><img class="logo" src="img/logo.png" alt="">' +
      '<span class="d-ru ru t-ru">Насле́дие</span><span class="d-ar ar t-ar">روسي من أول كلمة</span>' +
      '<p class="ar">حوارات من الحياة الحقيقية، صوت لكل جملة، ونطق بالحروف العربي. ١٠ دقايق في اليوم كفاية.</p>' +
      '<button class="btn block" data-act="w-next">يلا نبدأ</button></div></section>';
    return;
  }
  if (W.step === 1) {
    view.innerHTML = '<div class="step pad"><h1 class="ar">نتعرف الأول</h1>' +
      '<div><label class="ar" for="nm">اسمك</label><input class="f" id="nm" value="' + esc(S.name || '') + '" autocomplete="given-name"></div>' +
      '<div><label class="ar">أكلمك إزاي؟</label><div class="choice"><button data-g-set="m"' + (S.g === 'm' ? ' class="on"' : '') + '>إنت</button><button data-g-set="f"' + (S.g === 'f' ? ' class="on"' : '') + '>إنتي</button></div></div>' +
      '<div><label class="ar">صورتك في التطبيق</label><div class="avs">' +
      '<button data-av="m"' + (S.avatar === 'm' ? ' class="on"' : '') + '><img class="av" src="img/learner_m.jpg" alt="">شاب</button>' +
      '<button data-av="fh"' + (S.avatar === 'fh' ? ' class="on"' : '') + '><span class="av">' + ico('user') + '</span>بنت بالحجاب</button>' +
      '<button data-av="f"' + (S.avatar === 'f' ? ' class="on"' : '') + '><span class="av">' + ico('user') + '</span>بنت</button></div>' +
      '<p class="note ar" style="text-align:center">صور البنات المرسومة جاية قريب</p></div>' +
      '<button class="btn block" data-act="w-save">كمّل</button></div>';
    return;
  }
  view.innerHTML = '<div class="step pad"><h1 class="ar">' + G('أهلًا يا ', 'أهلًا يا ') + esc(S.name) + '</h1><p class="ar" style="margin:0;color:var(--dim)">' + G('تبدأ منين؟', 'تبدئي منين؟') + '</p>' +
    '<button class="lrow" data-act="w-begin">' + ico('play') + '<span class="tx"><b>' + G('أنا مبتدئ خالص', 'أنا مبتدئة خالص') + '</b><small>' + G('ابدأ', 'ابدئي') + ' من الحروف، الدرس ١</small></span></button>' +
    '<a class="lrow" href="' + LINKS.level + '" data-act="w-test">' + ico('test') + '<span class="tx"><b>' + G('اعمل', 'اعملي') + ' اختبار المستوى</b><small>٤٠ دقيقة تقريبًا، والنتيجة بتوصل للمدرس</small></span>' + ico('out', 'end') + '</a></div>';
}
function finishOnboarding() { S.onboarded = true; save(); W.step = 0; }

/* ---------- events ---------- */
document.addEventListener('click', function (e) {
  var t = e.target;
  var gv = t.closest('[data-gv]'); if (gv && GM && GM.q) { gameAnswer(+gv.dataset.gv === GM.q.ans, gv); return; }
  var gk = t.closest('[data-gik]'); if (gk && GM && GM.q) { gameAnswer((gk.dataset.gik === '1') === !!GM.q.it.q, gk); return; }
  var go2 = t.closest('[data-gop]'); if (go2 && GM && GM.q) { var oq = GM.q.opts[+go2.dataset.gop]; gameAnswer(GM.q.right ? oq === GM.q.right : oq === GM.q.it, go2); return; }
  var kb = t.closest('[data-k]'); if (kb && GM && GM.q && GM.q.type === 'dict') { kbdKey(kb.dataset.k); return; }
  if (t.closest('[data-gplay]')) { gameSay(); return; }
  var bt = t.closest('[data-bt]'); if (bt) { buildTap(+bt.dataset.bt); return; }
  var bb = t.closest('[data-bb]'); if (bb) { buildBack(+bb.dataset.bb); return; }
  var mc = t.closest('[data-mc]'); if (mc) { memoryTap(+mc.dataset.mc); return; }
  var co = t.closest('[data-copt]'); if (co) { chatPick(+co.dataset.copt); return; }
  var tc = t.closest('[data-tcard]'); if (tc) { cardPick(+tc.dataset.tcard, +tc.dataset.topt); return; }
  var aq = t.closest('[data-askq]'); if (aq) { askSend(aq.dataset.askq); return; }
  var sy = t.closest('[data-say]'); if (sy) { sayRu(sy.dataset.say); return; }
  var ac = t.closest('[data-album]'); if (ac) { playOne(ac, ac.dataset.url); return; }
  var nt = t.closest('[data-note]');
  if (nt) { var id = +nt.dataset.note, m = (S.inbox || []).filter(function (x) { return x.id === id; })[0]; if (m) { if (!m.read) { m.read = true; noteOpened(id); store(); } if (m.url && m.url !== './#inbox/' + id) { go(m.url.replace(/^\.\//, '')); return; } paintBell(); } return; }
  var yp = t.closest('[data-ytplay]'); if (yp) { ytPlay(yp.closest('[data-yt]'), +yp.dataset.ytplay); return; }
  var ya = t.closest('[data-ytat]'); if (ya) { ytPlay(ya.closest('[data-yt]'), +ya.dataset.ytat); return; }
  var seg = t.closest('[data-seg]'); if (seg) { LS.seg = +seg.dataset.seg; renderSeg(); return; }
  var line = t.closest('[data-line]'); if (line) { startDialogue(+line.dataset.line); return; }
  var pb = t.closest('.pb[data-url]'); if (pb) { playOne(pb, pb.dataset.url); return; }
  var cj = t.closest('[data-cj]'); if (cj) { playOne(cj, cj.dataset.cj); return; }
  var set = t.closest('[data-set]'); if (set) { var k = set.dataset.set; S[k] = !S[k]; save(); applyPrefs(); set.querySelector('.tog').classList.toggle('on', !!S[k]);
    if (k === 'noCat') { if (S.noCat) { var cc = document.getElementById('cat'); if (cc) cc.hidden = true; } else { catIntro(); catPlace(); } }
    if (k === 'ramadan' && S.push) { var rh = document.getElementById('rhour'); if (rh) rh.dispatchEvent(new Event('change', { bubbles: true })); } return; }
  var gs = t.closest('[data-g-set]'); if (gs) { S.g = gs.dataset.gSet; save(); gs.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === gs); }); return; }
  var av = t.closest('[data-av]'); if (av) { S.avatar = av.dataset.av; save(); av.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === av); }); return; }
  if (t.closest('#mini')) { if (t.closest('#mini-pp')) { toggle(); return; } if (P.meta) go('#lesson/' + P.meta.lesson); return; }
  var act = t.closest('[data-act]'); if (!act) return;
  var a = act.dataset.act;
  if (a === 'toggle') { if (!P.meta || P.meta.key !== LS.n + LS.segs[LS.seg].k) startDialogue(0); else toggle(); }
  else if (a === 'prev') { if (P.meta && P.meta.key === LS.n + LS.segs[LS.seg].k) step(-1); }
  else if (a === 'next') { if (P.meta && P.meta.key === LS.n + LS.segs[LS.seg].k) step(1); }
  else if (a === 'speed') { P.slow = !P.slow; act.textContent = P.slow ? '0.8×' : '1×'; act.classList.toggle('on', P.slow); toast(P.slow ? 'صوت أبطأ' : 'السرعة العادية'); }
  else if (a === 'rep') { P.rep = !P.rep; act.classList.toggle('on', P.rep); toast(P.rep ? G('اسمع وكرر في السكتة', 'اسمعي وكرري في السكتة') : 'من غير سكتات'); }
  else if (a === 'trans') { S.hideTr = !S.hideTr; save(); applyPrefs(); act.classList.toggle('on', !S.hideTr); }
  else if (a === 'playall') {
    var w = act.dataset.what, n = LS.n, rows = w === 'w' ? LS.L.glossary : [].concat.apply([], LS.L.vocab.map(function (b) { return b.rows; }));
    var items = rows.filter(function (r) { return r.a; }).map(function (r) { return { src: audioUrl(n, r.a), ru: r.ru }; });
    playQueue(items, 0, { key: n + w, ru: LS.L.ru + (w === 'w' ? ' · Слова́' : ' · Фра́зы'), ar: lessonLabel(n), img: photoFor(n), lesson: n }, { onEnd: function () { var s0 = stars(n); prog(n).words = 1; save(); afterProgress(n, s0); } });
  }
  else if (a === 'read') {
    var R = LS.L.reading, nn = LS.n, id = act.dataset.slow === '1' ? R.slow : R.a;
    playQueue([{ src: audioUrl(nn, id), ru: R.ru }], 0, { key: nn + 'r', ru: R.ru, ar: lessonLabel(nn) + ' · القراءة', img: photoFor(nn), lesson: nn }, { onEnd: function () { var s0 = stars(nn); prog(nn).read = 1; save(); afterProgress(nn, s0); } });
  }
  else if (a === 'offline') { saveOffline(LS.n, LS.L, act); }
  else if (a === 'goal') { goalTick(+act.dataset.i, act); }
  else if (a === 'levels') { levelSheet(); }
  else if (a === 'ask-send') { askSend(); }
  else if (a === 'ask-clear') { S.askHist = []; store(); vAsk(); }
  else if (a === 'birdstory') { birdStory(); }
  else if (a === 'tour') { if (window.NTOUR) { S.tour = S.tour || {}; S.tour.seen = {}; S.tour.main = 0; store(); NTOUR.start('main'); } }   // «جولة مع ژارا»: the first tour again, and every page's mini-tour once more
  else if (a === 'greplay') { setTimeout(render, 0); }
  else if (a === 'segy') { e.preventDefault(); var yi = LS.segs.map(function (x) { return x.k; }).indexOf('y'); if (yi >= 0) { LS.seg = yi; renderSeg(); window.scrollTo(0, 0); } }
  else if (a === 'bossgo') { if (GM) { GM.done = false; gameNext(); } }
  else if (a === 'bosswin') { bossWin(); }
  else if (a === 'readall') { (S.inbox || []).forEach(function (m) { m.read = true; }); store(); paintBell(); }
  else if (a === 'pushon') { go('#profile'); }
  else if (a === 'logout') { logoutSheet(); }
  else if (a === 'logoutyes') { doLogout(); }
  else if (a === 'sheetclose') { var w = document.querySelector('.sheetwrap'); if (w) w.remove(); }
  else if (a === 'setlevel') { S.level = act.dataset.l; store(); var w2 = document.querySelector('.sheetwrap'); if (w2) w2.remove(); render(); }
  else if (a === 'rmdset') { setRamadan(act.dataset.m); }
  else if (a === 'rplay') { playOne(act, 'audio/season/' + act.dataset.a + '.mp3'); }
  else if (a === 'rcline') { var d0 = LS.L && LS.segs && dlgOf(LS.segs[LS.seg].k), li = P.meta && P.meta.key === LS.n + LS.segs[LS.seg].k ? P.i : 0; var ln0 = d0 && d0.lines[Math.max(0, li)];
    if (ln0) { toast(G('قول: ', 'قولي: ') + ln0.ru.replace(/\u0301/g, '')); recCompare(act, audioUrl(LS.n, ln0.a), ''); } }
  else if (a === 'invite') { invite(); }
  else if (a === 'rc') { recCompare(act, act.dataset.url || '', act.dataset.t || ''); }
  else if (a === 'voff') { videoOffline(act); }
  else if (a === 'w-hello') { stopTimer(); P.q = []; P.i = -1; P.single = null; au.src = HELLO; var hp = au.play(); if (hp && hp.catch) hp.catch(function () {}); }
  else if (a === 'w-rec') { recCompare(act, HELLO, ''); }
  else if (a === 'w-after') { W.step = 1; vWelcome(); }
  else if (a === 'quiz-go') { startLessonQuiz(LS.n); }
  else if (a === 'rquiz-go') { startReviewQuiz(); }
  else if (a === 'quiz-play') { quizPlay(); }
  else if (a === 'quiz-pick') { quizPick(+act.dataset.j); }
  else if (a === 'quiz-next') { quizNext(); }
  else if (a === 'quiz-again') { if (QZ && QZ.mode === 'mist') go('#home'); else if (route.name === 'quiz') startReviewQuiz(); else renderSeg(); }
  else if (a === 'reveal') { act.hidden = true; var an = act.nextElementSibling; if (an) an.hidden = false; }
  else if (a === 'drillplay') {
    var D = LS.L[act.dataset.d], nn2 = LS.n, its = [];
    (D.items || []).forEach(function (it) { if (it.qa) its.push({ src: audioUrl(nn2, it.qa), ru: it.q }); if (it.aa) its.push({ src: audioUrl(nn2, it.aa), ru: it.ans }); });
    P.rep = true; playQueue(its, 0, { key: nn2 + act.dataset.d, ru: LS.L.ru + ' · ' + (D.ru || ''), ar: lessonLabel(nn2) + ' · تدريب', img: photoFor(nn2), lesson: nn2 });
    toast(G('اسمع السؤال وجاوب في السكتة', 'اسمعي السؤال وجاوبي في السكتة'));
  }
  else if (a === 'view-back') { if (history.length > 1) history.back(); else go('#library'); }
  else if (a === 'push') { pushToggle(act); }
  else if (a === 'cert') { var cu = +act.dataset.u; palekhCert(cu, function () { drawCert(cu); }); }
  else if (a === 'firebird') { streakMoment(streakNow() || 1); }
  else if (a === 'vpart') { VP.part = +act.dataset.i; var vb = act.closest('.pad, .page'); var host = document.querySelector('.vidbox'); if (host) { var wrap = host.parentNode; var poster = (host.querySelector('video') || {}).poster; wrap.innerHTML = videoHtml(VP.course, VP.key, poster); bindVideo(route.name === 'lesson' ? LS.n : null); } }
  else if (a === 'vrate') { var vv = document.getElementById('vplayer'); if (vv) { vv.playbackRate = +act.dataset.r; act.parentNode.querySelectorAll('.chip2').forEach(function (b) { b.classList.toggle('on', b === act); }); } }
  else if (a === 'chap') { var v2 = document.getElementById('vplayer'); if (v2) { v2.currentTime = +act.dataset.t; var pr = v2.play(); if (pr && pr.catch) pr.catch(function () {}); v2.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
  else if (a === 'cert-share') { var out = document.getElementById('certout'); fetch(out.dataset.url).then(function (r) { return r.blob(); }).then(function (b) {
      var f = new File([b], 'Наследие.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'Насле́дие' }).catch(function () {}); }); }
  else if (a === 'rec') { recToggle(act.closest('.rec')); }
  else if (a === 'rec-send') { recSend(act.closest('.rec'), act); }
  else if (a === 'say') { speak(act.dataset.t); }
  else if (a === 'try') { doTry(act); }
  else if (a === 'ai-send') { var inp = document.getElementById('ai-in'); aiSend(inp && inp.value); }
  else if (a === 'ai-hint') { aiHint(); }
  else if (a === 'hint-use') { var i2 = document.getElementById('ai-in'); if (i2) { i2.value = act.dataset.t.replace(/́/g, ''); i2.focus(); } }
  else if (a === 'ai-mic') { act.classList.add('on'); listen(function (alts) { var i3 = document.getElementById('ai-in'); if (i3) i3.value = alts[0]; }, function () { act.classList.remove('on'); }); }
  else if (a === 'ai-end') { aiEnd(); }
  else if (a === 'ai-again') { CH = newChat(CH.n, CH.mi, false); render(); }
  else if (a === 'call-start') { callStart(); }
  else if (a === 'call-mic') { if (CALL.state === 'listen') { stopVoice(); CALL.state = 'idle'; callUi(); } else if (!CH.busy) callListen(); }
  else if (a === 'call-hint') { var lj = CH.last; if (lj && lj.hint_ru) { CALL.state = 'speak'; callUi(); var nt = view.querySelector('.cs'); if (nt) nt.textContent = lj.hint_ar; speak(lj.hint_ru, function () { CALL.state = 'idle'; callUi(); }); } }
  else if (a === 'call-end') { stopVoice(); CALL.state = 'idle'; aiEnd(); }
  else if (a === 'code') { tryCode(); }
  else if (a === 'w-next') { welcomeSpeak(); }
  else if (a === 'w-save') {
    var nm = (document.getElementById('nm').value || '').trim();
    if (!nm) return toast('اكتب اسمك الأول / اكتبي اسمك الأول');
    if (!S.g) return toast('اختار: إنت ولا إنتي؟');
    S.name = nm; S.avatar = S.avatar || (S.g === 'm' ? 'm' : 'f'); save(); applyPrefs();
    if (S.onboarded) { W.step = 0; go('#profile'); } else { W.step = 2; vWelcome(); }
  }
  else if (a === 'w-begin') { finishOnboarding(); catIntro(); go(window.NTOUR ? '#home' : '#lesson/1'); }   // the tour starts on the home screen and ends by opening Lesson 1
  else if (a === 'w-test') { finishOnboarding(); catIntro(); }
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.id === 'code') tryCode();
  if (e.key === 'Enter' && e.target.id === 'ai-in') { e.preventDefault(); aiSend(e.target.value); }
});
document.addEventListener('change', function (e) { if (e.target.id === 'rcity') { S.city = +e.target.value; store(); render(); return; } });
document.addEventListener('change', function (e) {
  if (e.target.id !== 'rhour' || !S.push) return; var hour = +e.target.value;
  navigator.serviceWorker.ready.then(function (r) { return r.pushManager.getSubscription(); }).then(function (sub) { if (!sub) return;
    return fetch(API + '/api/push' + (S.token ? '?t=' + encodeURIComponent(S.token) : ''), { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sub: sub.toJSON(), hour: hour, tz: -new Date().getTimezoneOffset(), device: S.device, g: S.g || 'm', last: S.streak.last || '', ramadan: !!S.ramadan }) })
      .then(function () { S.push = { hour: hour }; save(); toast('اتغيّر ميعاد التنبيه'); }); }).catch(function () {});
});
document.addEventListener('click', function (e) { var b = e.target.closest('[data-ai-lesson]'); if (!b) return; S.aiLesson = +b.dataset.aiLesson; store(); vPractice(); applyPrefs(); });

/* offline: cache one lesson's data + audio + photo */
function saveOffline(n, L, btn) {
  if (!('caches' in window)) return toast('المتصفح ده مش بيدعم التحميل');
  var urls = [lessonUrl(n), photoFor(n)], add = function (id) { if (id) urls.push(audioUrl(n, id)); };
  L.dialogues.forEach(function (d) { d.lines.forEach(function (l) { add(l.a); add(l.slow); }); });
  L.glossary.forEach(function (r) { add(r.a); }); L.vocab.forEach(function (b) { b.rows.forEach(function (r) { add(r.a); }); });
  if (L.reading) { add(L.reading.a); add(L.reading.slow); }
  urls = urls.filter(function (u, i) { return urls.indexOf(u) === i; });
  btn.querySelector('small').textContent = 'بيحمّل ' + ad(urls.length) + ' ملف…';
  caches.open('nasl-lesson-' + pad(n)).then(function (c) { return c.addAll(urls); })
    .then(function () { S.offline = S.offline || {}; S.offline[n] = 1; save(); btn.querySelector('small').textContent = 'اتحمّل، يشتغل من غير نت'; toast('الدرس اتحمّل'); })
    .catch(function () { btn.querySelector('small').textContent = 'التحميل وقف، جرب تاني'; });
}

/* ---------- cinematic moves between pages (2026-11-21): View Transitions where the phone has them, a soft rise elsewhere ---------- */
var TAB_ORDER = { home: 0, library: 1, practice: 2, profile: 3 };
function tabIdx(name) { var t = { unit: 'library', lesson: 'library', course: 'library', quiz: 'library', watch: 'library', unlock: 'library', mistakes: 'home', inbox: 'home', games: 'practice', game: 'practice', album: 'practice', boss: 'practice', duel: 'practice', ask: 'practice', chat: 'practice', call: 'practice', certs: 'profile', cases: 'library', grammar: 'library', pdd: pddOnly() ? 'home' : 'library' }[name] || name; return TAB_ORDER[t] === undefined ? -1 : TAB_ORDER[t]; }
function navRender() {
  var from = route ? route.name : 'home', to = parse().name, a = tabIdx(from), b = tabIdx(to);
  var dir = a >= 0 && b >= 0 && a !== b ? (b > a ? 'fwd' : 'back') : (from === to ? 'same' : 'deep');
  document.documentElement.dataset.nav = dir;
  if (RM || !document.startViewTransition || dir === 'same') { render(); if (!RM) { view.classList.remove('vin'); void view.offsetWidth; view.classList.add('vin'); } return; }
  try { document.startViewTransition(render); } catch (e) { render(); }
}

/* ---------- opening: logo, «Насле́дие» letter by letter, a gold vine, and Лера says hello by the time of day ---------- */
function helloKey() {
  var h = new Date().getHours(), away = S.lastOpen ? (Date.now() - S.lastOpen) / 864e5 : 0;
  if (away >= 3) return { k: 'back', ru: 'С возвраще́нием!', ar: G('وحشتنا! أهلًا بيك تاني', 'وحشتينا! أهلًا بيكي تاني') };
  if (h >= 5 && h < 12) return { k: 'morning', ru: 'До́брое у́тро!', ar: 'صباح الخير' };
  if (h >= 12 && h < 17) return { k: 'day', ru: 'До́брый день!', ar: 'يومك سعيد' };
  if (h >= 17 && h < 23) return { k: 'evening', ru: 'До́брый ве́чер!', ar: 'مساء الخير' };
  return { k: 'hi', ru: 'Приве́т! Ра́да тебя́ ви́деть!', ar: G('أهلًا! مبسوطة إني شايفاك', 'أهلًا! مبسوطة إني شايفاكي') };
}
var helloPending = null;
var helloDone = false;
function sayHello(k) {
  if (S.noHello || helloDone) return;
  var a = new Audio('audio/hello/' + k + '.mp3'); a.volume = .9;
  var p = a.play(); if (p && p.then) p.then(function () { helloDone = true; helloPending = null; }, function () { helloPending = k; }); else helloDone = true;   // phones allow sound only after a tap: play it on the first one
}
document.addEventListener('pointerdown', function () { if (helloPending) { var k = helloPending; helloPending = null; sayHello(k); } }, { capture: true, passive: true });
function splash() {
  if (window.NINTRO && !NINTRO.done) { NINTRO.wait = splash; return; }   // the Firebird opening (index.html, tools/app_intro.py) plays first
  if (!S.onboarded) return;
  var away = S.lastOpen ? Date.now() - S.lastOpen : 864e5; S.lastOpen = Date.now(); store();
  var seen = false; try { seen = sessionStorage.getItem('nasl-open') === '1'; sessionStorage.setItem('nasl-open', '1'); } catch (e) {}
  if (seen) { catIntro(); return; }   // the same open session (a reload): straight in. Every new launch of the app gets the opening.
  var g = helloKey(), name = (S.name || '').trim().split(' ')[0];
  var word = 'Насле́дие'.match(/.́?/g);
  var el = document.createElement('div'); el.id = 'splash'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Насле́дие');
  el.innerHTML = '<div class="sp-in"><div class="sp-stage"><img class="sp-cloth" src="img/logo_cine.jpg" alt="Насле́дие"><i class="sp-light"></i></div>' +
    '<div class="sp-hello"><span class="ru">' + g.ru + '</span><span class="ar">' + mix(g.ar + (name ? ' يا ' + name : '')) + '</span></div>' +
    '<button class="sp-go"><span class="ru">Войти́</span><span class="ar">ادخل</span></button></div><i class="sp-sweep"></i>';
  document.body.appendChild(el);
  if (!RM) { var dust = setInterval(function () { if (!el.parentNode) { clearInterval(dust); return; } var r = el.querySelector('.sp-cloth').getBoundingClientRect(); embers(r.left + Math.random() * r.width, r.top + r.height * (.2 + Math.random() * .8), 1, .5, .35); }, 140); document.body.classList.add('sp-on'); }
  var gone = false, close = function (withVoice) {
    if (gone) return; gone = true;
    if (withVoice) sayHello(g.k);   // a tap: the phone lets the greeting play
    el.classList.add('out'); setTimeout(function () { el.remove(); document.body.classList.remove('sp-on'); catIntro(); }, RM ? 150 : 700);
  };
  el.addEventListener('click', function () { close(true); });
  setTimeout(function () { sayHello(g.k); }, RM ? 100 : 1200);   // phones that already allow sound (Android after the first visit) hear it at once
  setTimeout(function () { close(false); }, 9000);
}
/* ---------- farewell: in the installed app, «back» on the first screen says goodbye before the app closes ---------- */
var STANDALONE = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
function armFarewell() {   // Chrome ignores back-button steps added before the first touch, so the guard step is added on the first tap
  if (!STANDALONE || !history.pushState || armFarewell.done) return; armFarewell.done = true;
  try { if (!(history.state && history.state.g)) { history.replaceState({ base: 1 }, ''); history.pushState({ g: 1 }, '', location.hash || '#home'); } } catch (e) {}
}
if (STANDALONE && history.pushState) {
  document.addEventListener('pointerdown', armFarewell, { capture: true, passive: true }); document.addEventListener('keydown', armFarewell, { capture: true });
  window.addEventListener('popstate', function (e) {
    if (!(e.state && e.state.base)) return;
    var h = new Date().getHours(), late = h >= 22 || h < 4, name = (S.name || '').trim().split(' ')[0];
    var el = document.createElement('div'); el.id = 'farewell';
    el.innerHTML = '<div class="sp-in"><span class="fw-moon" aria-hidden="true"></span><div class="sp-hello big"><span class="ru">' + (late ? 'Споко́йной но́чи!' : 'До встре́чи!') + '</span>' +
      '<span class="ar">' + mix((late ? 'تصبح على خير' + (S.g === 'f' ? 'ي' : '') : 'نشوفك بكرة') + (name ? ' يا ' + name : '')) + '</span></div>' +
      (streakNow() ? '<small class="ar fw-st">' + ad(streakNow()) + ' يوم ورا بعض. ' + G('ارجع', 'ارجعي') + ' بكرة عشان الريشة الجاية</small>' : '') + '</div>';
    document.body.appendChild(el);
    if (!S.noHello) { var a = new Audio('audio/hello/' + (late ? 'night' : 'bye') + '.mp3'); var p = a.play(); if (p && p.catch) p.catch(function () {}); }
    setTimeout(function () { history.back(); }, RM ? 700 : 1700);
    setTimeout(function () { if (el.parentNode) { el.remove(); armFarewell.done = false; } }, 3200);   // still here (the phone kept the app open): back to normal
  });
}

/* ---------- the mascot sample: «Кот Баю́н», Pushkin's learned cat on his gold chain (an Egyptian favourite animal, a Russian tale);
   tap him for a tip about this screen; he helps in games when the student is stuck or misses twice ---------- */
var CAT_SVG = '<svg viewBox="0 0 120 92" class="birdsvg" aria-hidden="true"><defs>' +
  '<linearGradient id="fbB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE29A"/><stop offset=".45" stop-color="#F59B2F"/><stop offset="1" stop-color="#D23F28"/></linearGradient>' +
  '<linearGradient id="fbT" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#F7B640"/><stop offset=".55" stop-color="#E8522E"/><stop offset="1" stop-color="#8E1B2B"/></linearGradient>' +
  '<linearGradient id="fbW" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F06A2E"/><stop offset="1" stop-color="#A9242A"/></linearGradient>' +
  '<radialGradient id="fbA"><stop offset="0" stop-color="#FFB955" stop-opacity=".55"/><stop offset="1" stop-color="#FF8A3D" stop-opacity="0"/></radialGradient></defs>' +
  '<ellipse class="aura" cx="56" cy="50" rx="44" ry="32" fill="url(#fbA)"/>' +
  '<g class="b-tail">' +
    '<path class="pl" d="M63 47 C75 34 93 22 113 14 C110 26 100 38 87 45 C79 49 71 52 66 54Z"/><path class="pl" d="M64 50 C82 44 101 39 119 37 C114 48 101 54 85 56 C77 57 71 57 66 56Z"/>' +
    '<path class="pl" d="M64 54 C80 59 100 65 117 72 C108 79 93 77 81 71 C74 67 68 62 64 58Z"/><path class="pl" d="M61 56 C70 68 82 80 98 89 C86 92 74 85 68 77 C64 71 62 64 60 60Z"/>' +
    '<path class="pl sm" d="M59 58 C60 69 63 80 69 91 C61 90 57 78 57 63Z"/>' +
    '<path class="rc" d="M66 52 C80 41 96 28 111 17 M67 54 C84 49 102 43 117 39 M66 57 C82 62 100 68 115 72 M62 59 C72 70 84 81 96 88"/>' +
    '<g class="oc"><circle cx="110" cy="19" r="4.2"/><circle cx="115" cy="41" r="4.2"/><circle cx="112" cy="72" r="4.2"/><circle cx="94" cy="86" r="4.2"/></g>' +
    '<g class="oi"><circle cx="110" cy="19" r="1.9"/><circle cx="115" cy="41" r="1.9"/><circle cx="112" cy="72" r="1.9"/><circle cx="94" cy="86" r="1.9"/></g></g>' +
  '<path class="b-body" d="M35 47 C34 34 46 27 58 31 C70 35 74 50 67 59 C60 67 39 65 35 47Z"/>' +
  '<path class="sc" d="M40 44 q3 3 6 0 M39 49 q3 3 6 0 M45 52 q3 3 6 0 M42 56 q3 3 6 0"/>' +
  '<g class="b-wing"><path class="wg" d="M48 39 C60 33 72 37 75 48 C72 47 70 49 68 51 C66 49 63 50 61 53 C59 51 56 52 55 55 C51 50 48 45 48 39Z"/><path class="wl" d="M53 41 q9 -2 15 4 M52 45 q8 -1 12 4"/></g>' +
  '<g class="b-head"><path class="crest" d="M33 21 q-4 -11 2 -16 M36 21 q2 -10 10 -12 M30 22 q-7 -6 -6 -14"/><circle class="cd" cx="35" cy="5" r="2.3"/><circle class="cd" cx="46" cy="9" r="2.3"/><circle class="cd" cx="24" cy="8" r="2.3"/>' +
    '<path class="nk" d="M36 36 C38 31 44 30 47 34 L44 40Z"/><circle class="hd" cx="34" cy="29" r="9"/><path class="ck" d="M30 33 q3 3 7 1"/>' +
    '<path class="beak" d="M26 27 L16 30.5 L26 33Z"/><path class="bl" d="M26 30.3 L19 30.6"/>' +
    '<g class="eye"><circle class="er" cx="31" cy="27.5" r="2.7"/><circle class="gl" cx="30.2" cy="26.6" r=".9"/></g><ellipse class="lid" cx="31" cy="27.5" rx="3.1" ry="3.1"/></g>' +
  '<path class="legs" d="M45 61 l-1 7 M51 62 l0 7 M41 68 h6 M48 69 h6"/></svg>';
var FEATHER_SVG = '<svg viewBox="0 0 20 40" aria-hidden="true"><path d="M10 2 C17 10 17 26 10 38 C3 26 3 10 10 2Z" fill="#F07A2A" stroke="#FBE2A6" stroke-width="1"/><path d="M10 6 V36" stroke="#FBE2A6" stroke-width=".8"/><circle cx="10" cy="11" r="3" fill="#FBE2A6"/><circle cx="10" cy="11" r="1.3" fill="#8E1B2B"/></svg>';
var CAT_TIPS = {
  home: [G('ابدأ بالدرس اللي عليه الدور. ١٠ دقايق بس النهارده كفاية.', 'ابدئي بالدرس اللي عليه الدور. ١٠ دقايق بس النهارده كفاية.'), 'كل يوم ' + G('بتذاكر', 'بتذاكري') + ' فيه طائر النار بيفرد ريشة. الريشة فوق جنب الجرس.', G('زهقت؟ جرّب', 'زهقتي؟ جرّبي') + ' «تحدي الدقيقة» من «اتكلم».'],
  library: ['كل وحدة فيها ٥ دروس. الدروس المفتوحة صورتها منورة.', G('اختار', 'اختاري') + ' المستوى من الزرار اللي فوق في الرئيسية.'],
  unit: [G('ابدأ', 'ابدئي') + ' من أول درس مخلصتوش. النجوم بتقولك وصلت لفين.'],
  lesson: [G('ابدأ', 'ابدئي') + ' بـ «جمل الدرس»، وبعدين الحوارات. كل جملة ليها صوت.', G('ردّد', 'ردّدي') + ' بعد ليرا بصوت عالي. ده أهم من القراية بالعين.', 'في «فيديوهات إضافية» دوس على الدقيقة، والفيديو يبدأ عند الجملة نفسها.'],
  practice: [G('كلّم', 'كلّمي') + ' ليرا على الدرس. لو ' + G('اتلخبطت', 'اتلخبطتي') + ' دوس «ساعدني».', 'الألعاب فوق: الغلطة مش بتخسّرك حاجة، بس بتقطع الكومبو.'],
  games: ['الكلمة اللي ' + G('تغلط', 'تغلطي') + ' فيها بترجعلك بكرة لوحدها. متقلقش.'.replace('متقلقش', G('متقلقش', 'متقلقيش')), '«زعيم الوحدة» بيفتح بعد ما ' + G('تبدأ', 'تبدئي') + ' ٣ دروس من الوحدة.'],
  profile: ['من هنا ' + G('تقدر', 'تقدري') + ' تخفيني لو مش ' + G('عايزني', 'عايزاني') + '، وأنا مش هزعل. ولو ' + G('عايز', 'عايزة') + ' تعرف حكايتي دوس «حكاية ژارا».', 'الأوسمة بتتفتح لوحدها وإنت بتذاكر.'.replace('وإنت', G('وإنت', 'وإنتي'))],
  inbox: ['هنا رسايل المدرس. لو التنبيهات مقفولة ' + G('شغّلها', 'شغّليها') + ' من «حسابي».'],
  album: ['٣ مرات صح في نفس الكلمة = إطار دهبي.']
};
var CAT_GAME = {
  stress: 'الحرف المتشدد بيتقري أطول وأوضح. وحرف «о» من غير تشديد بيتنطق «ا».',
  ik: 'السؤال: الصوت بيطلع على الكلمة المهمة. الجملة العادية: الصوت بينزل في الآخر.',
  catch: G('اسمع', 'اسمعي') + ' تاني من الزرار الكبير، و' + G('قارن', 'قارني') + ' أول حرف وآخر حرف.',
  meaning: G('دوّر', 'دوّري') + ' على كلمة ' + G('تعرفها', 'تعرفيها') + ' في الجملة، هتوصّلك للمعنى.',
  reader: 'ж = ژ · ч = تش · щ = شّ · ы = ي غليظة · х = خ',
  conj: 'مع я غالبًا ‑ю أو ‑у، ومع ты ‑шь، ومع они ‑ют أو ‑ят.',
  build: G('ابدأ', 'ابدئي') + ' بالفاعل (я، ты، он…) وبعدين الفعل.',
  dict: G('اكتب', 'اكتبي') + ' زي ما ' + G('بتسمع', 'بتسمعي') + '. والـ ё ' + G('تقدر تكتبها', 'تقدري تكتبيها') + ' е.',
  ending: G('بص', 'بصي') + ' على اللي قبل الكلمة: في / على (в، на)؟ ولا нет؟ ولا فعل؟',
  chat: G('اقرا', 'اقري') + ' آخر رسالة كويس: سأل سؤال ولا قال خبر؟'
};
var CAT_CHEER = ['ولا يهمك، الغلط جزء من التعلم.', 'نفس عميق… وكمّل. إنت قدها.'.replace('إنت قدها', G('إنت قدها', 'إنتي قدها')), 'الروس نفسهم بيغلطوا في التشديد!'];
function catEl() {
  var c = document.getElementById('cat');
  if (!c) { c = document.createElement('div'); c.id = 'cat'; c.innerHTML = '<button class="cat-btn" aria-label="ژارا طائر النار: نصيحة">' + CAT_SVG + '</button><div class="cat-bub" role="status" aria-live="polite"></div>'; document.body.appendChild(c); }
  return c;
}
var catT = 0;
function catSay(txt, ms) {
  if (S.noCat) return; var c = catEl(), b = c.querySelector('.cat-bub');
  b.innerHTML = '<b class="ru">Жа́ра</b><span class="ar">' + mix(txt) + '</span>'; c.classList.add('talk'); clearTimeout(catT);
  catT = setTimeout(function () { c.classList.remove('talk'); }, ms || 6500);
}
var birdAt = null;
function birdSpot() {   // the top of the active tab's icon (or above the mini player when it shows)
  var tabs = document.getElementById('tabs'); if (!tabs || tabs.hidden) return null;
  var a = tabs.querySelector('a.on') || tabs.querySelector('a'); if (!a) return null;
  var ic = (a.querySelector('.ico') || a).getBoundingClientRect(), mini = document.getElementById('mini');
  var top = !mini.hidden ? mini.getBoundingClientRect().top : tabs.getBoundingClientRect().top;
  return { x: ic.left + ic.width / 2 - 35, y: top - 47, tab: a.dataset.tab };
}
function birdMove(c, to, done) {
  var from = birdAt; birdAt = to;
  if (!from || RM || (Math.abs(from.x - to.x) < 2 && Math.abs(from.y - to.y) < 2)) { c.style.transform = 'translate(' + to.x + 'px,' + to.y + 'px)'; c.dataset.face = to.x > innerWidth / 2 ? 'l' : 'r'; if (done) done(); return; }
  var dx = to.x - from.x, mid = { x: from.x + dx / 2, y: Math.min(from.y, to.y) - 70 - Math.min(60, Math.abs(dx) / 4) };
  c.dataset.face = dx > 0 ? 'r' : 'l'; c.classList.add('fly'); c.classList.remove('talk'); delete c.dataset.st; BIRD.sleep = false;
  var b0 = c.querySelector('.cat-btn'); if (BIRD.dx) { b0.style.translate = '0px 0px'; BIRD.dx = 0; }
  (function trail() { if (!c.classList.contains('fly')) return; var r = c.getBoundingClientRect(); embers(dx > 0 ? r.left + 6 : r.right - 6, r.top + r.height * .62, 2, 1.2, .2); requestAnimationFrame(trail); })();
  var an = c.animate([{ transform: 'translate(' + from.x + 'px,' + from.y + 'px)' }, { transform: 'translate(' + (from.x + dx * .25) + 'px,' + (mid.y + 20) + 'px)', offset: .3 },
    { transform: 'translate(' + mid.x + 'px,' + mid.y + 'px)', offset: .5 }, { transform: 'translate(' + (to.x - dx * .1) + 'px,' + (to.y - 18) + 'px)', offset: .85 },
    { transform: 'translate(' + to.x + 'px,' + to.y + 'px)' }], { duration: 720 + Math.min(300, Math.abs(dx)), easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
  an.onfinish = function () { c.style.transform = 'translate(' + to.x + 'px,' + to.y + 'px)'; an.cancel(); c.classList.remove('fly'); c.classList.remove('land'); void c.offsetWidth; c.classList.add('land'); c.dataset.face = to.x > innerWidth / 2 ? 'l' : 'r';
    var r = c.getBoundingClientRect(); embers(r.left + r.width / 2, r.bottom - 6, 14, 2.4, .6); if (Math.random() < .3) dropFeather(r.left + r.width / 2, r.top + 10); if (done) done(); };
}
window.addEventListener('resize', function () { var c = document.getElementById('cat'); if (c && !c.hidden && !(typeof BIRD !== 'undefined' && BIRD.away)) { birdAt = null; var sp = birdSpot(); if (sp) birdMove(c, sp); } });
/* Жа́ра's life: small natural acts while she sits, sleep at night or when nobody touches the phone, embers when she flies */
var BIRD = { t: 0, sto: 0, sleep: false, lastTouch: Date.now(), dx: 0 };
function birdEl() { var c = document.getElementById('cat'); return c && !c.hidden && !RM ? c : null; }
function birdAct(st, ms) {
  var c = birdEl(); if (!c || c.classList.contains('fly')) return;
  c.dataset.st = st; clearTimeout(BIRD.sto); BIRD.sto = setTimeout(function () { if (c.dataset.st === st) delete c.dataset.st; }, ms);
}
function birdHop(dx) {
  var c = birdEl(); if (!c || c.classList.contains('fly')) return; var b = c.querySelector('.cat-btn'), to = Math.max(-24, Math.min(24, BIRD.dx + dx));
  c.dataset.face = to < BIRD.dx ? 'l' : 'r';
  b.animate([{ translate: BIRD.dx + 'px 0px' }, { translate: (BIRD.dx + to) / 2 + 'px -12px', offset: .45 }, { translate: to + 'px 0px' }], { duration: 420, easing: 'cubic-bezier(.3,0,.3,1)' });
  b.style.translate = to + 'px 0px';
  BIRD.dx = to;
}
function birdWake() { var c = birdEl(); if (!c || !BIRD.sleep) return; BIRD.sleep = false; delete c.dataset.st; birdAct('stretch', 1100); }
function birdLife() {
  clearTimeout(BIRD.t);
  BIRD.t = setTimeout(function () {
    var c = birdEl();
    if (c && !BIRD.away && !c.classList.contains('talk') && !c.classList.contains('fly') && document.visibilityState === 'visible') {
      var h = new Date().getHours(), idle = Date.now() - BIRD.lastTouch;
      if ((h >= 23 || h < 6) && idle > 20000 || idle > 90000) { if (!BIRD.sleep) { BIRD.sleep = true; clearTimeout(BIRD.sto); c.dataset.st = 'sleep'; } }
      else if (!BIRD.sleep) {
        var r = Math.random();
        if (r < .26) birdAct('look', 1700);
        else if (r < .40) birdAct('preen', 1600);
        else if (r < .52) birdAct('stretch', 1100);
        else if (r < .64) birdAct('peck', 900);
        else if (r < .82) birdHop(Math.random() < .5 ? -14 : 14);
        else { c.dataset.face = c.dataset.face === 'l' ? 'r' : 'l'; birdAct('look', 1400); }
      }
    }
    birdLife();
  }, 3200 + Math.random() * 4800);
}
['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { BIRD.lastTouch = Date.now(); birdWake(); }, { passive: true, capture: true }); });
var scrollT = 0; window.addEventListener('scroll', function () { BIRD.lastTouch = Date.now(); if (Date.now() - scrollT > 4000 && Math.random() < .35) { scrollT = Date.now(); birdAct('look', 1200); } }, { passive: true });
/* embers: a small canvas engine that runs only while there are sparks */
var EMB = { cv: null, cx: null, ps: [], raf: 0 };
function emberLoop() {
  var cv = EMB.cv, cx = EMB.cx, d = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== innerWidth * d) { cv.width = innerWidth * d; cv.height = innerHeight * d; }
  cx.setTransform(d, 0, 0, d, 0, 0); cx.clearRect(0, 0, innerWidth, innerHeight); cx.globalCompositeOperation = 'lighter';
  EMB.ps = EMB.ps.filter(function (p) { return p.life > 0; });
  EMB.ps.forEach(function (p) {
    p.life--; p.x += p.vx; p.y += p.vy; p.vy -= .025; p.vx *= .98;
    var a = p.life / p.max, g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
    g.addColorStop(0, 'hsla(' + p.h + ',100%,72%,' + a + ')'); g.addColorStop(.4, 'hsla(' + (p.h - 12) + ',100%,55%,' + a * .5 + ')'); g.addColorStop(1, 'hsla(10,100%,50%,0)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r * 3, 0, 6.283); cx.fill();
  });
  if (EMB.ps.length) EMB.raf = requestAnimationFrame(emberLoop); else { EMB.raf = 0; cx.clearRect(0, 0, innerWidth, innerHeight); }
}
function embers(x, y, n, spread, up) {
  if (RM) return;
  if (!EMB.cv) { EMB.cv = document.createElement('canvas'); EMB.cv.id = 'embers'; EMB.cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(EMB.cv); EMB.cx = EMB.cv.getContext('2d'); }
  for (var k = 0; k < n; k++) { var life = 26 + Math.random() * 30; EMB.ps.push({ x: x + (Math.random() - .5) * 6, y: y + (Math.random() - .5) * 6, vx: (Math.random() - .5) * spread, vy: (Math.random() - .5) * spread - (up || 0), life: life, max: life, r: 1 + Math.random() * 1.8, h: 28 + Math.random() * 22 }); }
  if (EMB.ps.length > 260) EMB.ps.splice(0, EMB.ps.length - 260);
  if (!EMB.raf) EMB.raf = requestAnimationFrame(emberLoop);
}
function dropFeather(x, y) {
  if (RM) return; var f = document.createElement('div'); f.className = 'fbfeather'; f.innerHTML = FEATHER_SVG; f.style.left = x + 'px'; f.style.top = y + 'px'; document.body.appendChild(f);
  var dx = (Math.random() - .5) * 60;
  f.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + dx * .5 + 'px,40px) rotate(40deg)', opacity: 1, offset: .4 }, { transform: 'translate(' + dx + 'px,90px) rotate(-30deg)', opacity: 0 }], { duration: 2200, easing: 'ease-in-out' }).onfinish = function () { f.remove(); };
}
function catPlace() {
  var c = document.getElementById('cat'); if (!c) return;
  if (window.NTOUR && NTOUR.on()) { c.hidden = false; return; }   // Жа́ра is guiding the tour (tour.js): she stays where the tour put her
  BIRD.away = false;
  var hide = S.noCat || !S.onboarded || ['welcome', 'chat', 'call', 'view', 'watch', 'quiz'].indexOf(route.name) >= 0;
  var sp = hide ? null : birdSpot(); if (!sp) hide = true;
  c.hidden = hide; if (hide) { birdAt = null; } else requestAnimationFrame(function () { birdMove(c, birdSpot() || sp); });
  if (!hide) {
    var tips = CAT_TIPS[route.name] || CAT_TIPS[{ unit: 'unit', game: 'games', duel: 'games', boss: 'games' }[route.name]];
    S.catSeen = S.catSeen || {}; var key = route.name + ':' + today();
    if (tips && !S.catSeen[key] && Object.keys(S.catSeen).filter(function (k) { return k.indexOf(':' + today()) > 0; }).length < 3 && route.name !== 'game') {
      S.catSeen[key] = 1; store(); setTimeout(function () { if (parse().name === route.name) catSay(tips[0]); }, 1800);
    }
  }
}
function catIntro() {
  birdLife();
  if (window.NTOUR && S.onboarded && !(S.tour || {}).main) { catEl(); catPlace(); NTOUR.screen(parse()); return; }   // a new phone: the tour introduces her (tour.js)
  if (S.noCat || S.catMet || !S.onboarded) { catEl(); catPlace(); if (window.NTOUR && !S.noCat) NTOUR.news(); return; }
  catEl(); catPlace(); S.catMet = 1; store();
  setTimeout(function () { catSay(G('أهلًا! أنا ژارا، طائر النار. ريشي ضاع في السكة من روسيا لمصر، وكل يوم بتذاكر فيه بترجعلي ريشة. دوس عليّ في أي وقت وأديك نصيحة.', 'أهلًا! أنا ژارا، طائر النار. ريشي ضاع في السكة من روسيا لمصر، وكل يوم بتذاكري فيه بترجعلي ريشة. دوسي عليّ في أي وقت وأديكي نصيحة.'), 9000); }, 700);
}
var catIdle = 0, catMiss = 0;
function catGameQ() {   // a new game question: wait, then help if the student is stuck
  clearTimeout(catIdle); if (S.noCat || !GM || !GM.q) return;
  var q = GM.q; catIdle = setTimeout(function () { if (GM && GM.q === q && !GM.lock && CAT_GAME[q.type]) catSay(CAT_GAME[q.type], 7000); }, 18000);
}
function birdStory() {
  var o = overlay('<div class="bstory">' + CAT_SVG + '</div><h3 class="d-ar">حكاية ژارا</h3><span class="ru" style="color:var(--gold-hi);font-size:18px">Жар-пти́ца</span>' +
    '<p class="ar">في الحكايات الروسية القديمة فيه طائر ريشه بينوّر زي النار والدهب. اللي يلاقي ريشة واحدة منه، حياته بتتغير.</p>' +
    '<p class="ar">ژارا طارت من غابات روسيا لحد مصر عشان تدوّر على صحاب يتعلموا لغتها. بس في السكة، الريح خدت ريشها الدهب.</p>' +
    '<p class="ar">كل يوم ' + G('بتذاكر', 'بتذاكري') + ' فيه، ريشة بترجعلها. سبع أيام ورا بعض، وديلها كله بينوّر من تاني.</p>' +
    '<p class="ar">وهي اللي هتطير معاك بين صفحات التطبيق، وتديك نصيحة لما ' + G('تحتاج', 'تحتاجي') + '. ولما ريشها يكمل… هتطير بيك لحد موسكو، في الكلام على الأقل!</p>'.replace('معاك', G('معاك', 'معاكي')).replace('بيك', G('بيك', 'بيكي')).replace('تديك', G('تديك', 'تديكي')) +
    '<span class="ru">Жар-пти́ца прилете́ла!</span><button class="btn" data-close>' + G('يلا نكمّل', 'يلا نكمّل') + '</button>', 'm-story');
  return o;
}
function catGameAnswer(ok) { if (ok) { catMiss = 0; if (GM && GM.combo && GM.combo % 5 === 0) { var c = document.getElementById('cat'); if (c) { c.classList.remove('joy'); void c.offsetWidth; c.classList.add('joy'); var rj = c.getBoundingClientRect(); embers(rj.left + rj.width / 2, rj.top, 24, 3, 1); } } return; } catMiss++; if (catMiss === 2 && GM && GM.q && CAT_GAME[GM.q.type]) { catSay(CAT_CHEER[Math.floor(Math.random() * CAT_CHEER.length)] + ' ' + CAT_GAME[GM.q.type], 7000); catMiss = 0; } }
document.addEventListener('click', function (e) {
  if (!e.target.closest('#cat .cat-btn') || (window.NTOUR && NTOUR.on())) return;
  var c = document.getElementById('cat'); c.classList.remove('hop'); void c.offsetWidth; c.classList.add('hop'); BIRD.lastTouch = Date.now();
  var rr = c.getBoundingClientRect(); embers(rr.left + rr.width / 2, rr.top + rr.height / 2, 10, 2, .4);
  if (c.classList.contains('talk')) { c.classList.remove('talk'); return; }
  var tips = (route.name === 'game' && GM && GM.q && CAT_GAME[GM.q.type]) ? [CAT_GAME[GM.q.type]] : (CAT_TIPS[route.name] || CAT_TIPS[{ unit: 'unit', game: 'games', duel: 'games', boss: 'games' }[route.name]] || CAT_TIPS.home);
  S.catI = ((S.catI || 0) + 1) % 997; catSay(tips[S.catI % tips.length]);
});

/* ---------- boot ---------- */
if (window.NCASES) window.NCASES.init({ S: function () { return S; }, API: API, CONF: CONF, esc: esc, ad: ad, G: G, ico: ico, mix: mix, mixAr: mixAr, chime: chime, buzz: buzz, touchStreak: touchStreak,
  save: save, levelNow: levelNow, xvHtml: xvHtml, playOne: playOne, oldCase: function (n) { return LINKS.cases(n); },
  /* Жа́ра for the conjugation cards (cases.js, 2026-11-22): fly to a point, spread the wings, fly home */
  bird: {
    here: function () { var c = document.getElementById('cat'); return !!(c && !c.hidden && !S.noCat && !RM); },
    to: function (x, y, done) { var c = document.getElementById('cat'); if (!c || c.hidden || S.noCat) { if (done) done(); return; } BIRD.away = true; clearTimeout(catT); c.classList.remove('talk'); birdMove(c, { x: x - 35, y: y - 27 }, done); },
    st: function (st) { var c = document.getElementById('cat'); if (!c) return; if (st) { c.dataset.st = st; clearTimeout(BIRD.sto); } else delete c.dataset.st; },
    home: function () { BIRD.away = false; var c = document.getElementById('cat'); if (!c || c.hidden) return; delete c.dataset.st; var sp = birdSpot(); if (sp) birdMove(c, sp); }
  }, embers: embers, feather: dropFeather });
if (window.NTOUR) window.NTOUR.init({ S: function () { return S; }, G: G, ad: ad, mix: mix, go: go, store: store, chime: chime, embers: embers, pddOnly: pddOnly,
  route: function () { return parse(); }, say: function (t, ms) { catSay(t, ms); },
  bird: {   // Жа́ра for the tour: shown even where she usually hides (chat) or was hidden in the settings, flies to each stop
    show: function () { var c = catEl(); c.hidden = false; c.classList.remove('talk'); clearTimeout(catT); BIRD.away = true; BIRD.sleep = false; delete c.dataset.st; if (!birdAt) { var sp = birdSpot(); birdMove(c, sp || { x: innerWidth / 2 - 35, y: innerHeight - 140 }); } },
    to: function (x, y) { var c = catEl(); BIRD.away = true; birdMove(c, { x: x - 35, y: y - 27 }); },
    home: function () { BIRD.away = false; catPlace(); }
  } });
if (window.NPDD) window.NPDD.init({ S: function () { return S; }, API: API, esc: esc, ad: ad, G: G, ico: ico, mix: mix, chime: chime, buzz: buzz, touchStreak: touchStreak,
  hasCourse: hasCourse, openedPdd: pddOpened, stopMain: function () { try { au.pause(); } catch (e) {} } });
window.addEventListener('hashchange', navRender);
getJSON('data/index.json').then(function (idx) {
  IDX = idx; idx.units.forEach(function (u, i) { u.lessons.forEach(function (l) { l.unit = i; l.course = u.course || 'a1'; l.photo = u.photo; LES[l.num] = l; }); });
  render(); fillCreditsLater(); splash();
  loadSocial().then(function () { if (parse().name === 'home') render(); });
  loadInbox(true);
  loadSeason().then(function () { if (parse().name === 'home') render(); setTimeout(function () { rmdOffer(); eidMoment(); }, 1200); });
  loadVideos().then(function () { var nm = parse().name; if ((nm === 'lesson' || nm === 'course' || nm === 'watch') && !document.getElementById('vplayer')) render(); });
  refreshStatus().then(function () { if (!S.token) return; return pullProgress().then(function () { if (parse().name !== 'chat' && parse().name !== 'call' && parse().name !== 'open') render(); }); });
}).catch(function () { view.innerHTML = '<div class="page pad"><p class="ar">التطبيق محتاج نت أول مرة يفتح.</p></div>'; });
function fillCreditsLater() { new MutationObserver(function () { if (document.getElementById('credits') && !document.getElementById('credits').children.length) fillCredits(); }).observe(view, { childList: true }); fillCredits(); }
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  var hadSW = !!navigator.serviceWorker.controller, swReloaded = false;   // a new version took over → reload once, so the phone never keeps an old screen
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadSW && !swReloaded) { swReloaded = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js').then(function (r) { r.update && r.update(); }).catch(function () {});
}
applyPrefs();
})();
