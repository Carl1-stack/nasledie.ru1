/* Наследие app · Phase 1 shell (2026-11-19). Vanilla JS, no build step.
   Data: data/index.json + data/lNN.json (tools/app_export.py), audio in audio/lNN/, pictures in img/.
   Progress lives on the phone (localStorage) until accounts arrive in Phase 2. */
(function () {
'use strict';
var CONF = window.NCONF || { codes: [], whatsapp: '' };
/* paid pages (quizzes 3-30, reviews, B1 lessons, Падежи) live in the private storage: #open/<path> opens them with the code */
var LINKS = { quiz: function (n) { return n <= 2 ? '../quiz_site/quiz' + pad(n) + '.html' : '#open/a1/quiz' + pad(n) + '.html'; }, review: function (n) { return '#open/a1/review' + n + '.html'; },
  videos: function (n) { return '../quiz_site/videos.html' + (n ? '#l' + n : ''); }, level: '../quiz_site/level_test.html',
  b1: function () { return hasCourse('b1') ? '#open/b1/index.html' : '../b1/'; }, cases: function (n) { return '#open/cases/cases' + n + '.html'; } };
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
  S.streak.count = S.streak.last === ys ? S.streak.count + 1 : 1; S.streak.last = t; save(); updateStreakChips();
}
function streakNow() { var t = today(); var y = new Date(); y.setDate(y.getDate() - 1);
  var ys = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
  return (S.streak.last === t || S.streak.last === ys) ? S.streak.count : 0; }
function prog(n) { return S.progress[n] = S.progress[n] || {}; }
function stars(n) { var p = S.progress[n] || {}; return (p.d1 ? 1 : 0) + (p.d2 ? 1 : 0) + ((p.read || p.words) ? 1 : 0); }
function starsHtml(n) { var s = stars(n), h = ''; for (var i = 0; i < 3; i++) h += ico('star', i < s ? '' : 'off'); return '<span class="stars" aria-label="' + s + ' / 3">' + h + '</span>'; }
S.device = S.device || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
function inScope(scope, n) { var it = String(scope || '').split('+').filter(function (x) { return x.split(':')[0] === 'a1'; })[0]; if (!it) return false;
  var p = it.split(':'); if (!p[1]) return true; return p[1].split(',').map(Number).indexOf(unitOf(n) + 1) >= 0; }
function accessOk(n) {
  var a = S.acc; if (!a || !S.token) return false;
  if (a.state === 'cancelled') return false;
  if (a.state === 'active' && inScope(a.scope, n)) return true;
  return (a.opened || []).indexOf('a1:' + n) >= 0 || !!(S.offline && S.offline[n]);
}
function canOpen(n) { var l = LES[n]; return !!(l && (l.free || accessOk(n))); }
function isFree(n) { return !!(LES[n] && LES[n].free); }
function photoFor(n) { return 'img/' + (LESSON_PHOTO[n] || UNIT_PHOTO[unitOf(n)]) + '.jpg'; }
function unitOf(n) { return Math.floor((n - 1) / 5); }

function applyPrefs() {
  document.body.classList.toggle('nopr', !!S.hidePr);
  document.body.classList.toggle('notr', !!S.hideTr);
  document.documentElement.setAttribute('data-theme', S.light ? 'light' : 'dark');
  document.querySelectorAll('[data-g]').forEach(function (el) { var p = el.dataset.g.split('|'); el.textContent = G(p[0], p[1]); });
}

/* ---------- data ---------- */
var IDX = null, LES = {}, CACHE = {};
function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
var API = (CONF.api || '').replace(/\/$/, '');
function lessonUrl(n) { return isFree(n) ? 'data/l' + pad(n) + '.json' : API + '/c/a1/l' + pad(n) + '.json?t=' + encodeURIComponent(S.token || ''); }
function lesson(n) { if (CACHE[n]) return Promise.resolve(CACHE[n]);
  return fetch(lessonUrl(n)).then(function (r) {
    if (r.status === 401 || r.status === 403) return r.json().catch(function () { return {}; }).then(function (j) { var e = new Error('denied'); e.reason = j.reason || 'denied'; throw e; });
    if (!r.ok) throw new Error('net'); return r.json();
  }).then(function (d) {
    CACHE[n] = d;
    if (!isFree(n) && S.acc) { S.acc.opened = S.acc.opened || []; if (S.acc.opened.indexOf('a1:' + n) < 0) { S.acc.opened.push('a1:' + n); save(); } }
    return d;
  }); }
function audioUrl(n, id) { return isFree(n) ? 'audio/l' + pad(n) + '/' + id + '.mp3' : API + '/c/a1/audio/l' + pad(n) + '/' + id + '.mp3?t=' + encodeURIComponent(S.token || ''); }
function refreshStatus() {
  if (!S.token || !API) return Promise.resolve();
  return fetch(API + '/api/status?t=' + encodeURIComponent(S.token)).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
    .then(function (x) {
      if (x.s === 200 && x.j.ok) { S.acc = { scope: x.j.scope, ends: x.j.ends, state: x.j.state, opened: x.j.opened, student: x.j.student, at: Date.now() }; save(); }
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
  var m = h.match(/^(unit|lesson|unlock)\/(\d+)$/);
  if (m) return { name: m[1], arg: +m[2] };
  m = h.match(/^(chat|call)\/(\d+)\/(f|\d+)$/);
  if (m) return { name: m[1], arg: { n: +m[2], mi: m[3] === 'f' ? -1 : +m[3] } };
  m = h.match(/^open\/([\w\/.-]+\.html)$/);
  if (m) return { name: 'open', arg: m[1] };
  return { name: h || 'home', arg: null };
}
var lastHash = '#home';
function render() {
  route = parse();
  if (!S.onboarded && route.name !== 'welcome' && route.name !== 'open') { route = { name: 'welcome', arg: null }; }
  if (route.name !== 'chat' && route.name !== 'call') stopVoice();
  var R = { home: vHome, library: vLibrary, unit: vUnit, lesson: vLesson, practice: vPractice, profile: vProfile, welcome: vWelcome, unlock: vUnlock,
    open: vOpen, chat: vChat, call: vCall }[route.name] || vHome;
  view.innerHTML = '';
  R(route.arg);
  if (route.name !== 'open') lastHash = location.hash || '#home';
  window.scrollTo(0, 0);
  refreshChrome();
  applyPrefs();
}
function refreshChrome() {
  var tabs = document.getElementById('tabs'), mini = document.getElementById('mini');
  var noTabs = route.name === 'welcome' || route.name === 'chat' || route.name === 'call';
  tabs.hidden = noTabs;
  var tab = { home: 'home', library: 'library', unit: 'library', lesson: 'library', practice: 'practice', profile: 'profile', unlock: 'library' }[route.name];
  tabs.querySelectorAll('a').forEach(function (a) { a.classList.toggle('on', a.dataset.tab === tab); });
  mini.hidden = noTabs || !P.meta || route.name === 'lesson';
  view.className = noTabs ? 'notabs' : (mini.hidden ? 'noplayer' : '');
}
function updateStreakChips() { document.querySelectorAll('[data-streak]').forEach(function (e) { e.textContent = streakNow(); }); }

/* ---------- views ---------- */
function nextLesson() {
  var all = []; IDX.units.forEach(function (u) { u.lessons.forEach(function (l) { all.push(l.num); }); });
  for (var i = 0; i < all.length; i++) { if (stars(all[i]) < 3 && canOpen(all[i])) return all[i]; }
  return all[0];
}
function vHome() {
  var n = nextLesson(), l = LES[n];
  var started = Object.keys(prog(n)).length > 0;
  var h = '<section class="hero" style="height:min(72vh,560px)"><img src="' + photoFor(n) + '" alt="">' +
    '<div class="topbar pad"><span class="brand ru">Насле́дие</span><span class="chip">' + ico('flame') + '<span data-streak>' + streakNow() + '</span></span></div>' +
    '<div class="in pad"><span class="d-ru ru t-ru">' + esc(l.ru) + '</span>' + (l.pr ? '<div class="pr">' + esc(l.pr) + '</div>' : '') +
    '<span class="d-ar ar t-ar">' + esc(l.ar) + '</span>' +
    '<div class="go"><a class="btn" href="#lesson/' + n + '">' + ico('play') + (started ? G('كمّل', 'كمّلي') : G('يلا نبدأ', 'يلا نبدأ')) + '</a>' +
    '<span class="meta">الوحدة ' + ad(unitOf(n) + 1) + ' · الدرس ' + ad(n) + '</span></div></div></section>';
  h += '<section class="shelf pad"><h2><span>الوحدات</span><span class="ru">А1</span></h2><div class="hs ltr">' + posters() + '</div></section>';
  h += '<section class="shelf pad"><h2><span>' + G('كمان ليك', 'كمان ليكي') + '</span></h2><div class="hs">' +
    '<a class="wcard" href="#practice">' + ico('spark') + '<b>' + G('اتكلم مع ليرا', 'اتكلمي مع ليرا') + '</b><small>شات أو مكالمة على الدرس، بتصحيح لطيف</small></a>' +
    '<a class="wcard" href="' + LINKS.videos(n) + '">' + ico('film') + '<b>فيديوهات الدرس</b><small>روسي حقيقي من يوتيوب</small></a>' +
    '<a class="wcard" href="' + LINKS.level + '">' + ico('test') + '<b>اختبار المستوى</b><small>' + G('اعرف مستواك الحقيقي', 'اعرفي مستواكي الحقيقي') + '</small></a></div></section>';
  view.innerHTML = h;
}
function posters() {
  return IDX.units.map(function (u, i) {
    var done = u.lessons.filter(function (l) { return stars(l.num) === 3; }).length;
    var locked = !u.lessons.some(function (l) { return canOpen(l.num); });
    return '<a class="poster" href="#unit/' + (i + 1) + '"><span class="img"><img src="img/' + u.photo + '.jpg" alt="" loading="lazy"' + (locked ? ' style="filter:saturate(.4) brightness(.6)"' : '') + '><span class="n">' + (i + 1) + '</span>' +
      '<span class="prog">' + done + '/' + u.lessons.length + '</span></span><span class="ru">' + esc(u.ru) + '</span><span class="ar">' + esc(u.ar) + '</span></a>';
  }).join('');
}
function vLibrary() {
  var h = '<div class="page pad"><div class="ph1"><h1 class="ar">المكتبة</h1><span class="ru">Библиоте́ка</span></div>';
  h += '<section class="sec"><h2><span>كورس المبتدئين · ٦ وحدات</span><span class="ru">А1</span></h2><div class="hs ltr">' + posters() + '</div></section>';
  h += '<section class="sec"><h2><span>المراجعة</span><span class="ru">Повторе́ние</span></h2><div class="links">' +
    [1, 2, 3].map(function (r) { var a = (r - 1) * 10 + 1; return lrow(LINKS.review(r), 'review', 'مراجعة ' + ad(r), 'كويز على الدروس من ' + ad(a) + ' لـ ' + ad(a + 9)); }).join('') + '</div></section>';
  h += '<section class="sec"><h2><span>كمان في المكتبة</span></h2><div class="links">' +
    lrow(LINKS.level, 'test', 'اختبار المستوى', 'زي الامتحان الروسي الرسمي، بالخمس مهارات') +
    lrow(LINKS.videos(0), 'film', 'فيديوهات الدروس', 'رسوم متحركة ومشاهد حقيقية لكل درس') +
    lrow(LINKS.b1(), 'book', 'كورس المستوى المتوسط', 'لما تخلص المبتدئين واللي بعده') +
    [1, 2, 3].map(function (c) { return lrow(LINKS.cases(c), 'book', 'الحالات الإعرابية ' + ad(c), ['الرفع والنصب', 'الجر بحروف وبالإضافة', 'المفعول لأجله والآلة'][c - 1]); }).join('') +
    '</div></section>';
  h += credits() + '</div>';
  view.innerHTML = h;
}
function lrow(href, icon, b, small) { return '<a class="lrow" href="' + href + '">' + ico(icon) + '<span class="tx"><b>' + b + '</b><small>' + small + '</small></span>' + ico('out', 'end') + '</a>'; }
function credits() {
  return '<details class="credit"><summary>مصادر الصور</summary><ul class="ru" id="credits"></ul></details>';
}
function fillCredits() {
  var ul = document.getElementById('credits'); if (!ul) return;
  getJSON('data/credits.json').then(function (c) { ul.innerHTML = c.map(function (x) { return '<li>' + esc(x.title) + ' · ' + esc(x.author) + ' · ' + esc(x.license) + ' (Wikimedia Commons)</li>'; }).join(''); }).catch(function () {});
}
function vUnit(u) {
  var U = IDX.units[u - 1]; if (!U) return go('#library');
  var n = nextLesson();
  var h = '<section class="hero" style="height:380px"><img src="img/' + U.photo + '.jpg" alt="">' +
    '<div class="topbar pad"><a class="back" href="#library" aria-label="رجوع">' + ico('back') + '</a></div>' +
    '<div class="in pad"><span class="d-ru ru t-ru">' + esc(U.ru) + '</span><span class="d-ar ar t-ar">الوحدة ' + ad(u) + ' · ' + esc(U.ar) + '</span></div></section>';
  var first = U.lessons.find(function (l) { return stars(l.num) < 3 && canOpen(l.num); }) || U.lessons[0];
  h += '<div class="acts pad"><a class="big" href="#lesson/' + first.num + '" aria-label="تشغيل">' + ico('play') + '</a><span class="ar" style="color:var(--dim);font-size:13px">' +
    ad(U.lessons.length) + ' دروس · ' + G('خلصت', 'خلصتي') + ' ' + ad(U.lessons.filter(function (l) { return stars(l.num) === 3; }).length) + '</span></div>';
  h += U.lessons.map(function (l) {
    var s = stars(l.num), open = canOpen(l.num);
    var cls = s === 3 ? 'done' : (l.num === n ? 'now' : '');
    var right = !open ? '<span class="lk">' + ico('lock') + '</span>' : (s ? starsHtml(l.num) : '<span class="st">' + ad(l.words) + ' كلمة</span>');
    return '<a class="ep pad ' + cls + '" href="' + (open ? '#lesson/' + l.num : '#unlock/' + l.num) + '"><span class="no">' + l.num + '</span><span><span class="ru">' + esc(l.ru) + '</span><span class="ar">' + esc(l.ar) + '</span></span>' + right + '</a>';
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
    var segs = L.dialogues.map(function (d, i) { return { k: 'd' + i, t: 'الحوار ' + ad(i + 1) }; });
    if (L.vocab.length) segs.push({ k: 'v', t: 'جمل الدرس' });
    if (L.glossary.length) segs.push({ k: 'w', t: 'الكلمات' });
    if (L.reading) segs.push({ k: 'r', t: 'القراءة' });
    segs.push({ k: 'x', t: 'الكويز والفيديو' });
    LS.segs = segs;
    var h = '<section class="hero" style="height:260px"><img src="' + photoFor(n) + '" alt="">' +
      '<div class="topbar pad"><a class="back" href="#unit/' + (unitOf(n) + 1) + '" aria-label="رجوع">' + ico('back') + '</a><span class="chip">' + starsHtml(n) + '</span></div>' +
      '<div class="in pad"><span class="d-ru ru t-ru" style="font-size:34px">' + esc(L.ru) + '</span>' + (L.pr ? '<div class="pr">' + esc(L.pr) + '</div>' : '') +
      '<span class="ar meta">الدرس ' + ad(n) + ' · ' + esc(L.ar) + '</span></div></section>' +
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
  if (s.k[0] === 'd') {
    var d = L.dialogues[+s.k.slice(1)];
    h = '<div class="pad">' + (d.scene ? '<p class="scene ar">' + esc(d.scene) + '</p>' : '') + '<div class="lyr" id="lyr">' +
      d.lines.map(function (ln, i) { return '<button class="ly" data-line="' + i + '"><span class="who ru">' + esc(ln.who) + '</span><span class="ru">' + esc(ln.ru) + '</span>' +
        (ln.pr ? '<span class="pr" style="display:block">' + esc(ln.pr) + '</span>' : '') + '<span class="tr ar">' + esc(ln.ar) + '</span></button>'; }).join('') + '</div>' + playerHtml() + '</div>';
  } else if (s.k === 'v') {
    h = '<div class="pad">' + L.vocab.map(function (blk, bi) { return '<div class="vhead"><span class="ar">' + esc(blk.ar) + '</span><span class="ru">' + esc(blk.ru) + '</span></div><div class="words">' +
      blk.rows.map(function (r) { return wrow(r, n); }).join('') + '</div>'; }).join('') + '<div class="row2"><button class="btn" data-act="playall" data-what="v">' + ico('play') + G('اسمع الكل', 'اسمعي الكل') + '</button></div></div>';
  } else if (s.k === 'w') {
    h = '<div class="pad"><div class="words">' + L.glossary.map(function (r) { return wrow(r, n); }).join('') + '</div><div class="row2"><button class="btn" data-act="playall" data-what="w">' + ico('play') + G('اسمع الكل', 'اسمعي الكل') + '</button></div></div>';
  } else if (s.k === 'r') {
    var R = L.reading;
    h = '<div class="pad">' + (R.genre ? '<p class="scene ar">' + esc(R.genre) + '</p>' : '') + '<div class="passage' + (R.lines ? ' lines' : '') + '"><div class="ru" style="font-weight:700;margin-bottom:6px">' + esc(R.ru) + '</div>' +
      R.text.map(function (t) { return '<span class="ru">' + esc(t) + '</span>' + (R.lines ? '' : ' '); }).join(R.lines ? '' : '') + '</div>' +
      '<div class="row2"><button class="btn" data-act="read" data-slow="0">' + ico('play') + 'النص</button><button class="btn ghost" data-act="read" data-slow="1">' + ico('play') + 'بالراحة</button></div>' +
      (R.gloss.length ? '<div class="gloss"><h3 class="ar">كلمات النص</h3>' + R.gloss.map(function (g) { return '<div class="g"><span class="ru">' + esc(g[0]) + '</span><span class="ar">' + esc(g[1]) + '</span></div>'; }).join('') + '</div>' : '') +
      recHtml(n, 'read', 'الواجب: ' + G('اقرا', 'اقري') + ' النص بصوتك وابعته للمدرس') + '</div>';
  } else {
    h = '<div class="pad"><div class="links">' + lrow(LINKS.quiz(n), 'test', 'كويز الدرس', '٣٠ سؤال، والنتيجة بتوصل للمدرس') + lrow(LINKS.videos(n), 'film', 'فيديوهات الدرس', 'روسي حقيقي عن نفس الموضوع') +
      '<a class="lrow" href="#chat/' + n + '/f">' + ico('spark') + '<span class="tx"><b>' + G('اتكلم مع ليرا', 'اتكلمي مع ليرا') + '</b><small>شات على الدرس ده بتصحيح لطيف</small></span>' + ico('back', 'end') + '</a>' +
      '<button class="lrow" data-act="offline">' + ico('down') + '<span class="tx"><b>' + G('حمّل الدرس', 'حمّلي الدرس') + '</b><small>عشان تسمعه من غير نت</small></span></button></div>' +
      recHtml(n, 'hw', 'فويس للمدرس: ' + G('قول', 'قولي') + ' اللي ' + G('اتعلمته', 'اتعلمتيه') + ' في الدرس') + '</div>';
  }
  b.innerHTML = h;
  if (s.k[0] === 'd' && P.meta && P.meta.key === n + s.k) highlight(P.i);
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
    '<button class="rep' + (P.rep ? ' on' : '') + '" data-act="rep"><span class="tx">' + G('كرر ورايا', 'كرري ورايا') + '<small>سكتة بعد كل جملة ' + G('عشان تقولها بصوتك', 'عشان تقوليها بصوتك') + '</small></span><span class="tog"></span></button></div>';
}
function highlight(i) { var lines = document.querySelectorAll('#lyr .ly'); lines.forEach(function (l, k) { l.classList.toggle('now', k === i); }); if (lines[i]) lines[i].scrollIntoView({ block: 'center', behavior: 'smooth' }); }
function startDialogue(from) {
  var s = LS.segs[LS.seg], di = +s.k.slice(1), d = LS.L.dialogues[di], n = LS.n;
  var items = d.lines.map(function (ln) { return { src: audioUrl(n, ln.a), slow: ln.slow ? audioUrl(n, ln.slow) : null, ru: ln.ru }; });
  playQueue(items, from, { key: n + s.k, ru: LS.L.ru + ' · Диало́г ' + (di + 1), ar: 'الدرس ' + ad(n) + ' · الحوار ' + ad(di + 1), img: photoFor(n), lesson: n },
    { onLine: function (i) { if (P.meta && document.getElementById('lyr') && LS.n === n && LS.segs[LS.seg].k === s.k) highlight(i); },
      onEnd: function () { prog(n)['d' + (di + 1)] = 1; save(); if (stars(n) === 3) toast(G('برافو! خلصت الدرس ٣ نجوم', 'برافو! خلصتي الدرس ٣ نجوم')); } });
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
  fetch(API + '/api/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: v, device: S.device }) })
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
    body: JSON.stringify({ data: { progress: S.progress, streak: S.streak, name: S.name || '', g: S.g || '' } }) })
    .then(function (r) { return r.json(); }).then(function (j) { if (j.ok && mergeIn(j.data)) store(); }).catch(function () {});
}
function pullProgress() {
  if (!S.token || !API) return Promise.resolve(false);
  return fetch(API + '/api/progress?t=' + encodeURIComponent(S.token)).then(function (r) { return r.json(); })
    .then(function (j) { var ch = !!(j.ok && mergeIn(j.data)); if (ch) store(); syncLater(); return ch; }).catch(function () { return false; });
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
function tryHtml(t) { return SR ? '<button class="tryb" data-act="try" data-t="' + esc(t) + '">' + ico('mic') + G('جرّب تقولها', 'جرّبي تقوليها') + '</button>' : ''; }
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
  var n = S.aiLesson && LES[S.aiLesson] && canOpen(S.aiLesson) ? S.aiLesson : nextLesson();
  var all = []; IDX.units.forEach(function (u) { u.lessons.forEach(function (l) { if (canOpen(l.num)) all.push(l.num); }); });
  view.innerHTML = '<div class="page pad"><div class="ph1"><h1 class="ar">' + G('اتكلم', 'اتكلمي') + '</h1><span class="ru">Пра́ктика</span></div>' +
    '<div class="call" style="margin-top:14px"><div class="medal"><img src="img/lera.jpg" alt=""></div><span class="nm ru">Ле́ра</span>' +
    '<p class="ar" style="text-align:center">' + G('اتكلم', 'اتكلمي') + ' معايا بالروسي على الدرس. ' + G('هصححلك', 'هصححلك') + ' بلطف، ولو ' + G('اتلخبطت', 'اتلخبطتي') + ' دوس على اللمبة وهقولك تقول إيه.</p></div>' +
    '<section class="sec"><h2><span>' + G('اختار الدرس', 'اختاري الدرس') + '</span><span class="ru">Уро́к</span></h2><div class="lchips">' +
    all.map(function (k) { return '<button data-ai-lesson="' + k + '"' + (k === n ? ' class="on"' : '') + '>' + k + '</button>'; }).join('') + '</div></section>' +
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
      '<div class="who"><span class="ru">' + esc(m ? m.ru : 'Ле́ра') + '</span><small class="ar">' + esc(m ? m.ar : 'كلام حر · الدرس ' + ad(a.n)) + '</small></div>' +
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
function itemHtml(it) {
  if (it.t === 'ai') return '<div class="b ai"><span class="ru">' + esc(it.ru) + '</span><span class="tr ar">' + esc(it.ar) + '</span><button class="say" data-act="say" data-t="' + esc(it.ru) + '" aria-label="اسمع">' + ico('sound') + '</button></div>';
  if (it.t === 'me') return '<div class="b me"><span class="ru">' + esc(it.ru) + '</span></div>';
  if (it.t === 'fix') return '<div class="fix"><span class="ar">' + esc(it.ar || 'الأصح كده:') + '</span><span class="ru">' + esc(it.ru) + '</span>' + tryHtml(it.ru) + '</div>';
  if (it.t === 'hint') return '<div class="hintc"><span class="ru">' + esc(it.ru) + '</span><span class="tr ar">' + esc(it.ar) + '</span><div class="row2" style="margin-top:4px">' +
    '<button class="btn sm" data-act="hint-use" data-t="' + esc(it.ru) + '">' + G('استخدمها', 'استخدميها') + '</button><button class="btn ghost sm" data-act="say" data-t="' + esc(it.ru) + '">' + ico('sound') + 'اسمع</button></div>' + tryHtml(it.ru) + '</div>';
  if (it.t === 'note') return '<p class="note ar" style="text-align:center">' + esc(it.ar) + '</p>';
  return '';
}
function scoreHtml(sc) {
  var st = ''; for (var i = 0; i < 3; i++) st += ico('star', i < sc.stars ? '' : 'off');
  return '<div class="score"><div class="medal" style="width:84px;height:84px"><img src="img/lera.jpg" alt=""></div><div class="st">' + st + '</div><p class="ar">' + esc(sc.summary_ar) + '</p>' +
    (sc.good_ar && sc.good_ar.length ? '<h3 class="ar">' + G('عملت كويس', 'عملتي كويس') + '</h3><ul class="ar">' + sc.good_ar.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
    (sc.work_ar && sc.work_ar.length ? '<h3 class="ar">' + G('ركّز على', 'ركّزي على') + '</h3><ul class="ar">' + sc.work_ar.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
    (sc.review_ru && sc.review_ru.length ? '<h3 class="ar">' + G('كرر الجمل دي', 'كرري الجمل دي') + '</h3><div class="rv">' + sc.review_ru.map(function (x) { return '<div class="it"><span class="ru">' + esc(x) + '</span><button class="say" style="position:static;margin:0" data-act="say" data-t="' + esc(x) + '" aria-label="اسمع">' + ico('sound') + '</button></div>'; }).join('') + '</div>' : '') +
    '<div class="row2" style="justify-content:center"><button class="btn" data-act="ai-again">' + G('محادثة جديدة', 'محادثة جديدة') + '</button><a class="btn ghost" href="#practice">رجوع</a></div></div>';
}
function drawChat() {
  var box = document.getElementById('msgs'); if (!box) return;
  box.innerHTML = CH.items.map(itemHtml).join('') + (CH.busy ? '<div class="typing" aria-label="بتكتب"><i></i><i></i><i></i></div>' : '') + (CH.score ? scoreHtml(CH.score) : '');
  drawSteps();
  var bar = view.querySelector('.ch-bar'); if (bar) bar.hidden = !!CH.score;
  setTimeout(function () { window.scrollTo(0, document.body.scrollHeight); }, 30);
}
function aiCall(end) {
  if (CH.busy) return; CH.busy = true; if (CH.call) callUi(); else drawChat();
  var c = CH, body = { lesson: c.n, mission: c.mi, mode: c.call ? 'call' : 'chat', messages: c.msgs, g: S.g, name: S.name || '', device: S.device, chat: c.id, end: !!end };
  fetch(API + '/api/ai' + (S.token ? '?t=' + encodeURIComponent(S.token) : ''), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      c.busy = false;
      if (!j.ok) { c.items.push({ t: 'note', ar: aiErr(j.reason) }); if (c === CH) { if (c.call) { callUi(); } else drawChat(); } return; }
      if (end) { c.score = j; prog(c.n).ai = 1; save(); if (c === CH) { if (c.call) { stopVoice(); c.call = false; go('#chat/' + c.n + '/' + (c.mi < 0 ? 'f' : c.mi)); } else drawChat(); } return; }
      if (j.fix_ru) c.items.push({ t: 'fix', ru: j.fix_ru, ar: j.fix_ar });
      c.msgs.push({ role: 'assistant', content: j.reply_ru }); c.items.push({ t: 'ai', ru: j.reply_ru, ar: j.reply_ar });
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
    '<div class="cs ar">' + esc(status) + '</div><div class="lines">' +
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
function vProfile() {
  var total = 0, three = 0; Object.keys(S.progress).forEach(function (k) { var s = stars(+k); total += s; if (s === 3) three++; });
  var h = '<div class="page pad"><div class="ph1"><h1 class="ar">حسابي</h1><span class="ru">Профи́ль</span></div>' +
    '<div class="me" style="margin-top:12px">' + avatarHtml() + '<div><b class="ar">' + esc(S.name || '') + '</b><small class="ar">' + accText() + '</small></div></div>' +
    '<div class="stats"><div class="stat"><b>' + streakNow() + '</b><small>أيام ورا بعض</small></div><div class="stat"><b>' + total + '</b><small>نجمة</small></div><div class="stat"><b>' + three + '</b><small>درس خلص</small></div></div>' +
    '<section class="sec"><h2><span>الإعدادات</span></h2>' +
    setRow('hidePr', 'إخفاء النطق العربي', 'لما ' + G('تتعود', 'تتعودي') + ' على الحروف الروسية') +
    setRow('hideTr', 'إخفاء الترجمة في الحوارات', G('عشان تفهم بالروسي بس', 'عشان تفهمي بالروسي بس')) +
    setRow('light', 'الوضع الفاتح', 'للمذاكرة في النور') +
    '<a class="set" href="#welcome"><span class="tx">' + G('غيّر اسمك وصورتك', 'غيّري اسمك وصورتك') + '</span>' + ico('back') + '</a>' +
    (S.acc && S.acc.state === 'active' ? '' : '<a class="set" href="#unlock/0"><span class="tx">' + (S.acc ? G('جدد الكود أو اكتب كود جديد', 'جددي الكود أو اكتبي كود جديد') : 'عندي كود') + '<small>' + G('افتح', 'افتحي') + ' الكورس كله</small></span>' + ico('lock') + '</a>') +
    '</section>' +
    (S.token && API ? '<section class="sec"><h2><span>' + G('فويساتك وردود المدرس', 'فويساتك وردود المدرس') + '</span></h2><div class="replies" id="replies"><p class="note ar">بيحمّل…</p></div></section>' : '') +
    credits() + '</div>';
  view.innerHTML = h;
  if (S.token && API) fetch(API + '/api/voices?t=' + encodeURIComponent(S.token)).then(function (r) { return r.json(); }).then(function (j) {
    var el = document.getElementById('replies'); if (!el || !j.ok) return;
    el.innerHTML = j.voices.length ? j.voices.map(function (v) {
      return '<div class="reply"><small class="ar">الدرس ' + ad(v.lesson) + ' · ' + dmy(v.at) + (v.reply ? '' : (v.heard ? ' · المدرس سمعه' : ' · لسه متسمعش')) + '</small>' + (v.reply ? '<p class="ar">' + esc(v.reply) + '</p>' : '') + '</div>';
    }).join('') : '<p class="note ar">' + G('لسه مبعتش فويس. من أي درس افتح «القراءة» أو «الكويز والفيديو» وسجّل.', 'لسه مبعتيش فويس. من أي درس افتحي «القراءة» أو «الكويز والفيديو» وسجّلي.') + '</p>';
  }).catch(function () {});
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
  var seg = t.closest('[data-seg]'); if (seg) { LS.seg = +seg.dataset.seg; renderSeg(); return; }
  var line = t.closest('[data-line]'); if (line) { startDialogue(+line.dataset.line); return; }
  var pb = t.closest('.pb[data-url]'); if (pb) { playOne(pb, pb.dataset.url); return; }
  var set = t.closest('[data-set]'); if (set) { var k = set.dataset.set; S[k] = !S[k]; save(); applyPrefs(); set.querySelector('.tog').classList.toggle('on', !!S[k]); return; }
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
    playQueue(items, 0, { key: n + w, ru: LS.L.ru + (w === 'w' ? ' · Слова́' : ' · Фра́зы'), ar: 'الدرس ' + ad(n), img: photoFor(n), lesson: n }, { onEnd: function () { prog(n).words = 1; save(); } });
  }
  else if (a === 'read') {
    var R = LS.L.reading, nn = LS.n, id = act.dataset.slow === '1' ? R.slow : R.a;
    playQueue([{ src: audioUrl(nn, id), ru: R.ru }], 0, { key: nn + 'r', ru: R.ru, ar: 'الدرس ' + ad(nn) + ' · القراءة', img: photoFor(nn), lesson: nn }, { onEnd: function () { prog(nn).read = 1; save(); } });
  }
  else if (a === 'offline') { saveOffline(LS.n, LS.L, act); }
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
  else if (a === 'w-next') { W.step = 1; vWelcome(); }
  else if (a === 'w-save') {
    var nm = (document.getElementById('nm').value || '').trim();
    if (!nm) return toast('اكتب اسمك الأول / اكتبي اسمك الأول');
    if (!S.g) return toast('اختار: إنت ولا إنتي؟');
    S.name = nm; S.avatar = S.avatar || (S.g === 'm' ? 'm' : 'f'); save(); applyPrefs();
    if (S.onboarded) { W.step = 0; go('#profile'); } else { W.step = 2; vWelcome(); }
  }
  else if (a === 'w-begin') { finishOnboarding(); go('#lesson/1'); }
  else if (a === 'w-test') { finishOnboarding(); }
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.id === 'code') tryCode();
  if (e.key === 'Enter' && e.target.id === 'ai-in') { e.preventDefault(); aiSend(e.target.value); }
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

/* ---------- boot ---------- */
window.addEventListener('hashchange', render);
getJSON('data/index.json').then(function (idx) {
  IDX = idx; idx.units.forEach(function (u) { u.lessons.forEach(function (l) { LES[l.num] = l; }); });
  render(); fillCreditsLater();
  refreshStatus().then(function () { if (!S.token) return; return pullProgress().then(function () { if (parse().name !== 'chat' && parse().name !== 'call' && parse().name !== 'open') render(); }); });
}).catch(function () { view.innerHTML = '<div class="page pad"><p class="ar">التطبيق محتاج نت أول مرة يفتح.</p></div>'; });
function fillCreditsLater() { new MutationObserver(function () { if (document.getElementById('credits') && !document.getElementById('credits').children.length) fillCredits(); }).observe(view, { childList: true }); fillCredits(); }
if ('serviceWorker' in navigator && location.protocol !== 'file:') { navigator.serviceWorker.register('sw.js').catch(function () {}); }
applyPrefs();
})();
