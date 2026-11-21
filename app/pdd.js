/* ПДД · رخصة القيادة (2026-11-21): the Russian driving-theory exam (category B, the official ГИБДД bank: 40 tickets × 20)
   as a course inside the app, for any code with scope 'pdd'.
   Data: /c/pdd/bank.json (pdd/build_bank.py), pictures /c/pdd/img/<qid>.jpg, audio /c/pdd/audio/<id>.mp3 (pdd/voice.py).
   Routes: #pdd · #pdd/today · #pdd/st/<i> · #pdd/exam · #pdd/mist · #pdd/words · #pdd/words/<g> · #pdd/q/<qid>
   Progress (this phone, localStorage 'nasledie.pdd'; synced to /api/pdd for the teacher's panel):
     q[key] = [box, due day number, updated ms, times right, times wrong]   (key = the question id; a question that sits in two
     tickets is learned once under its first id)   box 0 = seen with help, 1..5 = Leitner boxes; box ≥ 3 = learned.
   Rules kept: Arabic and Cyrillic never share an element (mix() isolates «Russian» inside Arabic); the exam screen is Russian only,
   like the real one; no English. */
(function () {
'use strict';
var A = null;                 // bridge to app.js (set by NPDD.init)
var B = null, BYID = {}, WBY = {}, LOADING = null;
var KEY = 'nasledie.pdd';
var D = load();
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
D.q = D.q || {}; D.ex = D.ex || []; D.days = D.days || {}; D.w = D.w || {};
function store() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} syncLater(); }
var IV = [0, 1, 3, 7, 14, 30];          // days until the next review for boxes 0..5
var DAY = 86400000;
function dnum(d) { d = d || new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY); }
function dstr(n) { var d = new Date(n * DAY); return d.toISOString().slice(0, 10); }
function esc(s) { return A.esc(s); }
function ad(n) { return A.ad(n); }
function G(m, f) { return A.G(m, f); }
function nQ(n) { return ad(n) + (n >= 3 && n <= 10 ? ' أسئلة' : ' سؤال'); }   // Arabic plural: ٣–١٠ أسئلة
function ru(s, cls) { return '<span class="ru' + (cls ? ' ' + cls : '') + '">' + esc(s) + '</span>'; }

/* ---------- data ---------- */
function tok() { return encodeURIComponent((A.S().token) || ''); }
function url(p) { return A.API + '/c/pdd/' + p + '?t=' + tok(); }
function imgUrl(it) { return url('img/' + it.img); }
function audUrl(id) { return url('audio/' + id + '.mp3'); }
function loadBank() {
  if (B) return Promise.resolve(B);
  if (LOADING) return LOADING;
  LOADING = fetch(url('bank.json'), { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw r.status;
    return r.json();
  }).then(function (j) {
    B = j; BYID = {}; WBY = {};
    j.items.forEach(function (it) { BYID[it.id] = it; });
    j.words.forEach(function (w) { WBY[w.id] = w; });
    try { if (window.caches) caches.open('nasl-pdd').then(function (c) { c.put('bank', new Response(JSON.stringify(j))); }); } catch (e) {}
    LOADING = null; return B;
  }).catch(function (e) {
    LOADING = null;
    if (!window.caches) throw e;
    return caches.open('nasl-pdd').then(function (c) { return c.match('bank'); }).then(function (r) { if (!r) throw e; return r.json(); })
      .then(function (j) { B = j; j.items.forEach(function (it) { BYID[it.id] = it; }); j.words.forEach(function (w) { WBY[w.id] = w; }); return B; });
  });
  return LOADING;
}
function uniq() { return B.items.filter(function (it) { return !it.same; }); }
function keyOf(it) { return it.same || it.id; }
function rec(it) { return D.q[keyOf(it)]; }
function box(it) { var r = rec(it); return r ? r[0] : -1; }
function learned(it) { return box(it) >= 3; }

/* ---------- plan: new per day from the exam date, the last days only exams ---------- */
function examDay() { return D.date ? dnum(new Date(D.date + 'T12:00:00')) : 0; }
function plan() {
  var t = dnum(), left = D.date ? Math.max(0, examDay() - t) : 21;
  var all = uniq(), fresh = all.filter(function (it) { return !rec(it); });
  var sim = Math.min(5, Math.floor(left * 0.25));
  var learnDays = Math.max(1, left - sim);
  var doneToday = (D.days[dstr(t)] || {}).n || 0;
  var target = fresh.length ? Math.min(90, Math.max(10, Math.ceil((fresh.length + doneToday) / learnDays))) : 0;
  var nNew = Math.max(0, Math.min(fresh.length, target - doneToday));
  var due = all.filter(function (it) { var r = rec(it); return r && r[1] <= t && r[0] < 5; });
  return { left: left, sim: left <= sim && left > 0, fresh: fresh.length, nNew: nNew, due: due, target: target, doneToday: doneToday,
    learned: all.filter(learned).length, total: all.length };
}
function nextNew(n) {
  return uniq().filter(function (it) { return !rec(it); }).sort(function (a, b) { return a.st - b.st || a.t - b.t || a.p - b.p; }).slice(0, n);
}
function mark(it, ok, helped) {
  var k = keyOf(it), r = D.q[k] || [0, 0, 0, 0, 0], t = dnum(), day = D.days[dstr(t)] = D.days[dstr(t)] || { n: 0, r: 0, ok: 0, bad: 0 };
  if (!D.q[k]) day.n++; else day.r++;
  if (ok && !helped) { r[0] = Math.min(5, r[0] + 1); r[3]++; day.ok++; }
  else if (ok && helped) { r[0] = Math.max(r[0], 0); r[3]++; }
  else { r[0] = r[0] >= 3 ? 1 : Math.min(r[0], 1); r[4]++; day.bad++; }
  r[1] = t + (ok && !helped ? IV[r[0]] : 1); r[2] = Date.now();
  D.q[k] = r; store(); A.touchStreak();
}

/* ---------- sync with the teacher's panel ---------- */
var syncT = null;
function syncLater() { if (!A || !A.S().token || !A.API) return; clearTimeout(syncT); syncT = setTimeout(push, 3000); }
function push() {
  fetch(A.API + '/api/pdd?t=' + tok(), { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q: D.q, ex: D.ex.slice(-30), date: D.date || '', words: Object.keys(D.w).filter(function (k) { return D.w[k] >= 2; }).length, days: D.days }) })
    .then(function (r) { return r.json(); }).then(function (j) { if (j && j.ok) mergeIn(j.data); }).catch(function () {});
}
function pull() {
  if (!A.S().token) return;
  fetch(A.API + '/api/pdd?t=' + tok()).then(function (r) { return r.json(); }).then(function (j) { if (j && j.ok && mergeIn(j.data)) { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} } }).catch(function () {});
}
function mergeIn(d) {
  if (!d) return false; var ch = false;
  Object.keys(d.q || {}).forEach(function (k) { var v = d.q[k]; if (!D.q[k] || v[2] > D.q[k][2]) { D.q[k] = v; ch = true; } });
  var seen = {}; D.ex.forEach(function (e) { seen[e.at] = 1; });
  (d.ex || []).forEach(function (e) { if (!seen[e.at]) { D.ex.push(e); ch = true; } });
  D.ex.sort(function (a, b) { return a.at - b.at; });
  if (!D.date && d.date) { D.date = d.date; ch = true; }
  Object.keys(d.days || {}).forEach(function (k) { if (!D.days[k]) { D.days[k] = d.days[k]; ch = true; } });
  return ch;
}

/* ---------- audio ---------- */
var au = new Audio(); au.preload = 'auto';
var auBtn = null;
function play(id, btn) {
  try { A.stopMain(); } catch (e) {}
  if (auBtn) auBtn.classList.remove('on');
  au.src = audUrl(id); au.playbackRate = D.slow ? 0.8 : 1;
  var p = au.play(); if (p && p.catch) p.catch(function () {});
  auBtn = btn || null; if (auBtn) auBtn.classList.add('on');
}
au.addEventListener('ended', function () { if (auBtn) auBtn.classList.remove('on'); auBtn = null; });
function sbtn(id, small) { return '<button class="pd-snd' + (small ? ' sm' : '') + '" data-snd="' + id + '" aria-label="اسمع">' + A.ico('sound') + '</button>'; }

/* ---------- shell ---------- */
var view = null;
function page(h) { view.innerHTML = '<div class="page pad pd">' + h + '</div>'; }
function back(h, label) { return '<a class="pd-back" href="' + h + '">' + A.ico('back') + '<span class="ar">' + (label || 'رجوع') + '</span></a>'; }
function locked() {
  page('<div class="ph1"><h1 class="ar">رخصة القيادة</h1>' + ru('ПДД') + '</div>' +
    '<div class="pd-card"><p class="ar">الكورس ده بيجهزك لامتحان النظري بتاع رخصة القيادة في روسيا (ГИБДД): كل الـ ٨٠٠ سؤال الرسميين، بشرح مصري بسيط، وتمرين كل يوم، وامتحان تجريبي زي الحقيقي بالظبط.</p>' +
    '<p class="ar" style="color:var(--dim)">' + G('محتاج', 'محتاجة') + ' كود فيه «رخصة القيادة». ' + G('كلّم', 'كلّمي') + ' المدرس.</p>' +
    '<a class="btn" href="#unlock/0">' + G('عندي كود', 'عندي كود') + '</a></div>');
}
function loadingPage() { page('<p class="ar" style="color:var(--dim);margin-top:40px;text-align:center">بيحمّل الأسئلة…</p>'); }
function failPage() { page(back('#home') + '<div class="pd-card"><p class="ar">مش قادرين نحمّل الأسئلة دلوقتي. ' + G('اتأكد', 'اتأكدي') + ' من النت و' + G('جرب', 'جربي') + ' تاني.</p><button class="btn" data-act="retry">' + G('جرب', 'جربي') + ' تاني</button></div>'); }

function route(arg) {
  view = document.getElementById('view');
  if (!A.hasCourse('pdd') && !A.openedPdd()) { locked(); return; }
  if (!B) { loadingPage(); loadBank().then(function () { route(arg); }).catch(failPage); return; }
  var a = String(arg || '').split('/');
  if (!a[0]) return vHome();
  if (a[0] === 'today') return vSession('today');
  if (a[0] === 'st') return a[1] === undefined ? vStations() : vSession('st', +a[1]);
  if (a[0] === 'mist') return vSession('mist');
  if (a[0] === 'exam') return vExam();
  if (a[0] === 'words') return a[1] === undefined ? vWords() : vWordGroup(+a[1]);
  if (a[0] === 'q') return vSession('one', a[1]);
  vHome();
}

/* ---------- home ---------- */
function vHome() {
  var P = plan(), pct = Math.round(P.learned / P.total * 100);
  var lastEx = D.ex.slice(-5), passN = lastEx.filter(function (e) { return e.pass; }).length;
  var mist = uniq().filter(function (it) { var r = rec(it); return r && r[4] > 0 && r[0] < 3; }).length;
  var wl = B.words.filter(function (w) { return (D.w[w.id] || 0) >= 2; }).length;
  var h = '<div class="ph1"><h1 class="ar">رخصة القيادة</h1>' + ru('ПДД · категория B') + '</div>';
  h += '<div class="pd-card pd-top"><div class="pd-ring" style="--p:' + pct + '"><b class="num">' + ad(P.learned) + '</b><small class="ar">من ' + ad(P.total) + '</small></div>' +
    '<div class="pd-topx"><p class="ar"><b>' + (D.date ? (P.left > 0 ? 'فاضل ' + ad(P.left) + ' يوم على الامتحان' : (P.left === 0 ? 'الامتحان النهارده! بالتوفيق' : 'الامتحان عدّى')) : G('حدد', 'حددي') + ' ميعاد الامتحان') + '</b></p>' +
    '<p class="ar" style="color:var(--dim)">سؤال اتعلم = جاوبته صح ٣ مرات في أيام مختلفة.</p>' +
    '<label class="pd-date"><span class="ar">ميعاد الامتحان</span><input type="date" id="pd-date" value="' + esc(D.date || '') + '"></label></div></div>';
  var todayN = P.due.length + P.nNew;
  h += '<a class="gcard hero pd-go" href="#pdd/today"><span class="ni">' + A.ico('play') + '</span><span class="tx">' + ru('Сего́дня') + '<b class="ar">تمرين النهارده</b><small class="ar">' +
    (todayN ? nQ(P.nNew) + ' جديدة + ' + ad(P.due.length) + ' مراجعة' : (P.fresh ? 'خلصت جديد النهارده. ' + G('تقدر', 'تقدري') + ' تكمّل لو عايز' : 'كل الأسئلة اتشافت! ركّز على الامتحانات')) +
    (P.sim ? ' · الأيام دي امتحانات تجريبية كل يوم' : '') + '</small></span>' + A.ico('back', 'end') + '</a>';
  h += '<a class="gcard hero" href="#pdd/exam"><span class="ni">' + A.ico('test') + '</span><span class="tx">' + ru('Экза́мен') + '<b class="ar">امتحان زي الحقيقي</b><small class="ar">٢٠ سؤال · ٢٠ دقيقة · غلطتين بالكتير' +
    (lastEx.length ? ' · آخر ' + ad(lastEx.length) + ': نجحت في ' + ad(passN) : '') + '</small></span>' + A.ico('back', 'end') + '</a>';
  h += '<div class="pd-grid">' +
    '<a class="pd-tile" href="#pdd/st">' + A.ico('book') + '<b class="ar">المحطات</b><small class="ar">الأسئلة موضوع موضوع</small></a>' +
    '<a class="pd-tile" href="#pdd/mist">' + A.ico('review') + '<b class="ar">غلطاتي</b><small class="ar">' + nQ(mist) + '</small></a>' +
    '<a class="pd-tile" href="#pdd/words">' + A.ico('ar') + '<b class="ar">كلمات الطريق</b><small class="ar">' + ad(wl) + ' من ' + ad(B.words.length) + '</small></a>' +
    '</div>';
  h += '<details class="pd-card pd-how"><summary class="ar">إزاي الامتحان الحقيقي بيمشي؟</summary>' +
    '<p class="ar">بيجيلك ٢٠ سؤال من الـ ٨٠٠، مقسومين ٤ مجموعات، كل مجموعة ٥. عندك ٢٠ دقيقة.</p>' +
    '<p class="ar">مسموح غلطتين بس، وكل غلطة لازم تكون في مجموعة مختلفة. لو غلطت مرتين في نفس المجموعة، أو ٣ مرات، تسقط.</p>' +
    '<p class="ar">كل غلطة بتجيبلك ٥ أسئلة زيادة من نفس المجموعة و٥ دقايق زيادة. لو غلطت في أي سؤال منهم تسقط.</p>' +
    '<p class="ar">الامتحان كله بالروسي. ممنوع الموبايل وأي ورق: لو اتمسكت، النتيجة بتتلغي ومتقدرش تمتحن تاني قبل سنة كاملة.</p></details>';
  page(h);
  var di = document.getElementById('pd-date');
  if (di) di.addEventListener('change', function () { D.date = di.value; store(); vHome(); });
  if (!D.pulled) { D.pulled = 1; pull(); }
}

/* ---------- stations ---------- */
function vStations() {
  var h = back('#pdd', 'رخصة القيادة') + '<div class="ph1"><h1 class="ar">المحطات</h1>' + ru('Те́мы') + '</div>';
  B.stations.forEach(function (s) {
    var its = uniq().filter(function (it) { return it.st === s.i; }), l = its.filter(learned).length, seen = its.filter(rec).length;
    h += '<a class="pd-st" href="#pdd/st/' + s.i + '"><span class="no num">' + ad(s.i + 1) + '</span><span class="tx">' + ru(s.ru + (s.part ? ' · ' + s.part : '')) + '<b class="ar">' + esc(s.ar) + (s.part ? ' (' + ad(s.part) + ')' : '') + '</b>' +
      '<span class="pd-bar"><i style="width:' + Math.round(l / its.length * 100) + '%"></i></span><small class="ar">' + ad(l) + ' اتعلم · ' + ad(seen) + ' اتشاف · من ' + ad(its.length) + '</small></span></a>';
  });
  page(h);
}

/* ---------- study session (today / station / mistakes / one) ---------- */
var SS = null;
function vSession(kind, arg) {
  var list = [], title = '', ret = '#pdd';
  if (kind === 'today') {
    var P = plan();
    list = P.due.slice().sort(function (a, b) { return (rec(b)[4] - rec(a)[4]) || (rec(a)[0] - rec(b)[0]); }).slice(0, 120).concat(nextNew(P.nNew || 15));
    title = 'تمرين النهارده';
  } else if (kind === 'st') {
    var s = B.stations[arg]; if (!s) return vStations();
    list = uniq().filter(function (it) { return it.st === s.i && !learned(it); });
    if (!list.length) list = uniq().filter(function (it) { return it.st === s.i; });
    title = s.ar + (s.part ? ' (' + ad(s.part) + ')' : ''); ret = '#pdd/st';
  } else if (kind === 'mist') {
    list = uniq().filter(function (it) { var r = rec(it); return r && r[4] > 0 && r[0] < 3; }).sort(function (a, b) { return rec(b)[4] - rec(a)[4]; });
    title = 'غلطاتي';
    if (!list.length) { page(back('#pdd', 'رخصة القيادة') + '<div class="pd-card"><p class="ar">مفيش غلطات مستنياك دلوقتي. برافو!</p></div>'); return; }
  } else if (kind === 'one') {
    var one = BYID[arg]; if (!one) return vHome(); list = [one]; title = 'سؤال'; ret = '#pdd';
  }
  SS = { kind: kind, list: list, i: 0, title: title, ret: ret, ok: 0, bad: 0, again: {} };
  card();
}
function glossChips(it) {
  return (it.w || []).map(function (id) { var w = WBY[id]; if (!w) return '';
    return '<span class="pd-g">' + sbtn(id, 1) + ru(w.ru) + '<span class="ar">' + esc(w.ar) + '</span>' + (w.pr ? '<span class="pr ar">' + esc(w.pr) + '</span>' : '') + '</span>'; }).join('');
}
function qHead(it) {
  var h = '';
  if (it.img) h += '<div class="pd-img"><img src="' + imgUrl(it) + '" alt="" loading="eager"></div>';
  h += '<div class="pd-q">' + sbtn(it.id + 'q') + '<p class="ru">' + esc(it.q) + '</p></div>';
  return h;
}
function card() {
  if (!SS) return;
  if (SS.i >= SS.list.length) return done();
  var it = SS.list[SS.i], n = SS.list.length, r = rec(it), isNew = !r;
  SS.helped = false; SS.answered = false;
  var h = '<div class="pd-bar2">' + back(SS.ret) + '<span class="ar">' + esc(SS.title) + '</span><span class="num">' + ad(SS.i + 1) + '/' + ad(n) + '</span></div>' +
    '<div class="pd-prog"><i style="width:' + Math.round(SS.i / n * 100) + '%"></i></div>' +
    (isNew ? '<span class="pd-tag new ar">سؤال جديد</span>' : '<span class="pd-tag ar">مراجعة</span>') +
    '<span class="pd-tag ru">Биле́т ' + it.t + ' · вопро́с ' + it.p + '</span>' + qHead(it) +
    '<div class="pd-opts">' + it.o.map(function (o, i) { return '<div class="pd-opt" data-opt="' + i + '"><span class="n num">' + (i + 1) + '</span><span class="ru">' + esc(o) + '</span>' + sbtn(it.id + 'o' + i, 1) + '</div>'; }).join('') + '</div>' +
    '<div id="pd-help"></div>' +
    '<button class="pd-helpbtn ar" data-act="help">' + A.ico('bulb') + ' ' + G('ساعدني', 'ساعديني') + ': الكلمات والشرح</button>' +
    '<div id="pd-ex"></div>';
  page(h);
}
function explainHtml(it, full) {
  var h = '';
  if (it.trick) h += '<div class="pd-trick"><b class="ar">الحيلة</b><p class="ar">' + A.mix(it.trick) + '</p></div>';
  if (it.key && it.key.length) h += '<div class="pd-keys"><span class="ar">كلمات تعرف بيها السؤال:</span>' + it.key.map(function (k) { return ru(k, 'pd-k'); }).join('') + '</div>';
  if (it.ar) h += '<p class="ar pd-why">' + A.mix(it.ar) + '</p>';
  else if (full) h += '<p class="ar pd-why" style="color:var(--dim)">الشرح بالعربي للسؤال ده لسه بيتكتب. ركّز على الكلمات تحت.</p>';
  if (it.pdd) h += '<p class="pd-ref">' + ru('ПДД, пункт ' + it.pdd) + '</p>';
  if (full && it.w && it.w.length) h += '<div class="pd-gl"><span class="ar">كلمات السؤال</span>' + glossChips(it) + '</div>';
  return h;
}
function answer(i) {
  if (!SS || SS.answered) return;
  var it = SS.list[SS.i], ok = i === it.r; SS.answered = true;
  document.querySelectorAll('.pd-opt').forEach(function (e) { var k = +e.dataset.opt; e.classList.add(k === it.r ? 'right' : (k === i ? 'wrong' : 'dim')); });
  if (SS.kind !== 'one') mark(it, ok, SS.helped);
  if (ok) { SS.ok++; A.chime([880, 1174.7]); } else { SS.bad++; A.buzz([30]); }
  // a wrong (or helped) question comes back 4 cards later in this session, until it is right once on its own
  if ((!ok || SS.helped) && SS.kind !== 'one' && (SS.again[it.id] || 0) < 2) { SS.again[it.id] = (SS.again[it.id] || 0) + 1; SS.list.splice(Math.min(SS.list.length, SS.i + 5), 0, it); }
  var hb = document.querySelector('.pd-helpbtn'); if (hb) hb.remove();
  document.getElementById('pd-help').innerHTML = '';
  document.getElementById('pd-ex').innerHTML = '<div class="pd-res ' + (ok ? 'ok' : 'bad') + '"><b class="ar">' + (ok ? (SS.helped ? 'صح، وهيرجعلك تاني من غير مساعدة' : 'صح! برافو') : 'لأ. الصح هو رقم ' + ad(it.r + 1)) + '</b></div>' +
    explainHtml(it, true) + '<button class="btn pd-next" data-act="next">التالي</button>';
  var nx = document.querySelector('.pd-next'); if (nx) nx.scrollIntoView({ behavior: 'smooth', block: 'end' });
}
function help() {
  if (!SS || SS.answered) return;
  SS.helped = true;
  var it = SS.list[SS.i];
  var hb = document.querySelector('.pd-helpbtn'); if (hb) hb.remove();
  var h = '<div class="pd-gl"><span class="ar">كلمات السؤال</span>' + glossChips(it) + '</div>';
  if (it.ar) h += '<p class="ar pd-why">' + A.mix(it.ar) + '</p>';
  document.getElementById('pd-help').innerHTML = h;
}
function done() {
  var tot = SS.ok + SS.bad, P = plan();
  page(back('#pdd', 'رخصة القيادة') + '<div class="pd-card pd-done"><h2 class="ar">خلصت!</h2><p class="ar">' + ad(SS.ok) + ' صح و' + ad(SS.bad) + ' غلط من ' + ad(tot) + '.</p>' +
    '<p class="ar" style="color:var(--dim)">اتعلمت لحد دلوقتي ' + ad(P.learned) + ' من ' + ad(P.total) + ' سؤال.</p>' +
    (SS.kind === 'today' && P.fresh ? '<a class="btn" href="#pdd/today" data-act="more">كمان شوية جداد</a> ' : '') +
    '<a class="btn ghost" href="#pdd/exam">امتحان تجريبي</a></div>');
  if (SS.kind === 'today' && tot >= 10) A.chime();
  SS = null;
}

/* ---------- exam: the real rules ---------- */
var EX = null;
function pickExam() {
  // position p (1..20) of a random ticket for every slot: each position is one topic area of the real exam
  var used = {}, qs = [];
  for (var p = 1; p <= 20; p++) {
    var cands = B.items.filter(function (it) { return it.p === p; }), it = cands[Math.floor(Math.random() * cands.length)];
    used[keyOf(it)] = 1; qs.push({ it: it, blk: it.blk, extra: false, a: -1 });
  }
  return { qs: qs, used: used };
}
function vExam() {
  if (EX && EX.running) return examQ();
  page(back('#pdd', 'رخصة القيادة') + '<div class="ph1"><h1 class="ar">امتحان زي الحقيقي</h1>' + ru('Экза́мен ГИБДД') + '</div>' +
    '<div class="pd-card"><p class="ar">٢٠ سؤال بالروسي، ٢٠ دقيقة، من غير شرح لحد الآخر، زي اللجنة بالظبط.</p>' +
    '<p class="ar">غلطتين بالكتير، كل واحدة في مجموعة. كل غلطة = ٥ أسئلة زيادة و٥ دقايق. أي غلطة في الزيادة = سقوط.</p>' +
    '<p class="ar" style="color:var(--dim)">' + G('تقدر', 'تقدري') + ' تسيب سؤال وترجعله بزرار «Пропусти́ть».</p>' +
    '<button class="btn" data-act="exam-start">ابدأ الامتحان</button></div>' +
    (D.ex.length ? '<section class="sec"><h2><span>امتحاناتك</span>' + ru('Результа́ты') + '</h2>' + D.ex.slice(-8).reverse().map(function (e) {
      return '<div class="pd-exrow ' + (e.pass ? 'ok' : 'bad') + '"><b class="ar">' + (e.pass ? 'نجح' : 'سقط') + '</b><span class="ar">' + ad(e.err) + ' غلط · ' + ad(Math.round(e.sec / 60)) + ' دقيقة</span><small class="num">' + new Date(e.at).toLocaleDateString('ar-EG') + '</small></div>'; }).join('') + '</section>' : ''));
}
function examStart() {
  var x = pickExam();
  EX = { qs: x.qs, used: x.used, i: 0, end: Date.now() + 20 * 60000, t0: Date.now(), running: true, phase: 'main', tick: null };
  EX.tick = setInterval(examTick, 1000);
  examQ();
}
function examTick() {
  if (!EX || !EX.running) return;
  var el = document.getElementById('pd-timer'), left = Math.max(0, EX.end - Date.now());
  if (el) el.textContent = Math.floor(left / 60000) + ':' + ('0' + Math.floor(left / 1000) % 60).slice(-2);
  if (left <= 0) examFinish('time');
  if (location.hash.indexOf('#pdd/exam') !== 0) { /* left the page: the exam keeps running until it ends */ }
}
function examQ() {
  var q = EX.qs[EX.i], it = q.it;
  var grid = EX.qs.map(function (x, k) { return '<button class="pd-cell' + (k === EX.i ? ' cur' : '') + (x.a >= 0 ? ' ans' : '') + (x.extra ? ' ext' : '') + '" data-goq="' + k + '">' + (k + 1) + '</button>'; }).join('');
  var left = Math.max(0, EX.end - Date.now());
  page('<div class="pd-exhead"><span class="ru">Вопро́с ' + (EX.i + 1) + ' из ' + EX.qs.length + '</span><span class="ru pd-timer" id="pd-timer">' + Math.floor(left / 60000) + ':' + ('0' + Math.floor(left / 1000) % 60).slice(-2) + '</span></div>' +
    '<div class="pd-cells">' + grid + '</div>' +
    (it.img ? '<div class="pd-img"><img src="' + imgUrl(it) + '" alt=""></div>' : '<div class="pd-img noimg">' + ru('Вопро́с без иллюстра́ции') + '</div>') +
    '<p class="ru pd-exq">' + esc(it.q) + '</p>' +
    '<div class="pd-opts">' + it.o.map(function (o, i) { return '<button class="pd-opt ex' + (q.a === i ? ' sel' : '') + '" data-exa="' + i + '"><span class="n num">' + (i + 1) + '</span><span class="ru">' + esc(o) + '</span></button>'; }).join('') + '</div>' +
    '<div class="pd-exnav"><button class="btn ghost" data-act="exam-skip">' + ru('Пропусти́ть') + '</button><button class="btn ghost" data-act="exam-quit"><span class="ar">إنهاء</span></button></div>');
}
function examAnswer(i) {
  var q = EX.qs[EX.i]; if (q.a >= 0) return;     // like the real exam: an answer cannot be changed
  q.a = i;
  var nxt = -1;
  for (var k = 1; k <= EX.qs.length; k++) { var j = (EX.i + k) % EX.qs.length; if (EX.qs[j].a < 0) { nxt = j; break; } }
  if (nxt < 0) return examStage();
  EX.i = nxt; examQ();
}
function examStage() {
  // all answered: check the main part, then add the extra questions, then finish
  var main = EX.qs.filter(function (q) { return !q.extra; }), wrongM = main.filter(function (q) { return q.a !== q.it.r; });
  if (EX.phase === 'main') {
    var perBlk = {}; wrongM.forEach(function (q) { perBlk[q.blk] = (perBlk[q.blk] || 0) + 1; });
    var twoInOne = Object.keys(perBlk).some(function (b) { return perBlk[b] > 1; });
    if (!wrongM.length) return examFinish('ok');
    if (wrongM.length > 2 || twoInOne) return examFinish(twoInOne && wrongM.length <= 2 ? 'block' : 'many');
    // +5 questions from the same block and +5 minutes for each mistake
    wrongM.forEach(function (w) {
      var cands = B.items.filter(function (it) { return it.blk === w.blk && !EX.used[keyOf(it)]; });
      for (var k = 0; k < 5 && cands.length; k++) { var j = Math.floor(Math.random() * cands.length), it = cands.splice(j, 1)[0]; EX.used[keyOf(it)] = 1; EX.qs.push({ it: it, blk: it.blk, extra: true, a: -1 }); }
      EX.end += 5 * 60000;
    });
    EX.phase = 'extra'; EX.i = 20;
    page('<div class="pd-card"><p class="ru" style="font-size:18px">Дополни́тельные вопро́сы: ' + (EX.qs.length - 20) + '</p><p class="ar">غلطت في ' + ad(wrongM.length) + '، فجالك ' + nQ(EX.qs.length - 20) + ' زيادة و' + ad(wrongM.length * 5) + ' دقايق. مسموح ولا غلطة فيهم.</p><button class="btn" data-act="exam-go">كمّل</button></div>');
    return;
  }
  var wrongX = EX.qs.filter(function (q) { return q.extra && q.a !== q.it.r; });
  examFinish(wrongX.length ? 'extra' : 'ok');
}
function examFinish(why) {
  if (!EX || !EX.running) return;
  clearInterval(EX.tick); EX.running = false;
  var ans = EX.qs.filter(function (q) { return q.a >= 0; }), wrong = EX.qs.filter(function (q) { return q.a >= 0 && q.a !== q.it.r; });
  var pass = why === 'ok', sec = Math.round((Date.now() - EX.t0) / 1000);
  ans.forEach(function (q) { var r = rec(q.it); if (q.a !== q.it.r) mark(q.it, false, false); else if (!r || r[0] < 3) mark(q.it, true, false); });
  D.ex.push({ at: Date.now(), pass: pass, err: wrong.length, sec: sec, why: why, wrong: wrong.map(function (q) { return keyOf(q.it); }) }); store();
  var WHY = { ok: 'نجحت!', time: 'الوقت خلص', block: 'غلطتين في نفس المجموعة', many: 'أكتر من غلطتين', extra: 'غلطة في الأسئلة الزيادة' };
  if (pass) { A.chime(); A.buzz(); }
  var h = '<div class="pd-card pd-final ' + (pass ? 'ok' : 'bad') + '">' + ru(pass ? 'Экза́мен сдан' : 'Экза́мен не сдан', 'big') + '<h2 class="ar">' + (pass ? 'نجحت! برافو عليك' : 'لسه. ' + WHY[why]) + '</h2>' +
    '<p class="ar">' + ad(wrong.length) + ' غلط · ' + ad(Math.round(sec / 60)) + ' دقيقة</p><a class="btn" href="#pdd/exam" data-act="exam-again">امتحان تاني</a> <a class="btn ghost" href="#pdd">الرئيسية</a></div>';
  if (wrong.length) h += '<section class="sec"><h2><span>راجع غلطاتك</span>' + ru('Оши́бки') + '</h2>' + wrong.map(function (q) {
    var it = q.it;
    return '<div class="pd-card pd-rev">' + qHead(it) + '<div class="pd-opts">' + it.o.map(function (o, i) { return '<div class="pd-opt ' + (i === it.r ? 'right' : (i === q.a ? 'wrong' : 'dim')) + '"><span class="n num">' + (i + 1) + '</span><span class="ru">' + esc(o) + '</span></div>'; }).join('') + '</div>' + explainHtml(it, true) + '</div>'; }).join('') + '</section>';
  page(h);
  EX = null;
}

/* ---------- road words ---------- */
function vWords() {
  var groups = []; B.words.forEach(function (w) { if (!groups[w.g]) groups[w.g] = { ru: w.gru, ar: w.gar, n: 0, k: 0 }; groups[w.g].n++; if ((D.w[w.id] || 0) >= 2) groups[w.g].k++; });
  var h = back('#pdd', 'رخصة القيادة') + '<div class="ph1"><h1 class="ar">كلمات الطريق</h1>' + ru('Ру́сский для доро́ги') + '</div>' +
    '<p class="ar" style="color:var(--dim)">الكلمات دي بتتكرر في الـ ٨٠٠ سؤال. لو ' + G('حفظتها', 'حفظتيها') + '، نص الامتحان هيبقى مفهوم. ابدأ بيها أول يومين.</p>';
  groups.forEach(function (g, i) { h += '<a class="pd-st" href="#pdd/words/' + i + '"><span class="no num">' + ad(i + 1) + '</span><span class="tx">' + ru(g.ru) + '<b class="ar">' + esc(g.ar) + '</b><span class="pd-bar"><i style="width:' + Math.round(g.k / g.n * 100) + '%"></i></span><small class="ar">' + ad(g.k) + ' من ' + ad(g.n) + '</small></span></a>'; });
  page(h);
}
var WG = null;
function vWordGroup(g) {
  var ws = B.words.filter(function (w) { return w.g === g; }); if (!ws.length) return vWords();
  WG = { g: g, ws: ws, mode: 'list' };
  var h = back('#pdd/words', 'كلمات الطريق') + '<div class="ph1"><h1 class="ar">' + esc(ws[0].gar) + '</h1>' + ru(ws[0].gru) + '</div>' +
    '<button class="btn" data-act="w-quiz" style="margin:6px 0 14px">اختبر نفسك</button>' +
    ws.map(function (w) { return '<div class="pd-w">' + sbtn(w.id) + '<div class="tx">' + ru(w.ru, 'w') + (w.pr ? '<span class="pr ar">' + esc(w.pr) + '</span>' : '') + '<span class="ar">' + esc(w.ar) + '</span></div><span class="lv num">' + ((D.w[w.id] || 0) >= 2 ? '✓' : '') + '</span></div>'; }).join('');
  page(h);
}
function wQuiz() {
  var ws = WG.ws.slice().sort(function () { return Math.random() - .5; });
  WG.q = ws; WG.i = 0; WG.ok = 0; wCard();
}
function wCard() {
  if (WG.i >= WG.q.length) { page(back('#pdd/words', 'كلمات الطريق') + '<div class="pd-card pd-done"><h2 class="ar">' + ad(WG.ok) + ' من ' + ad(WG.q.length) + '</h2><button class="btn" data-act="w-quiz">تاني</button> <a class="btn ghost" href="#pdd/words/' + WG.g + '">القائمة</a></div>'); return; }
  var w = WG.q[WG.i], others = B.words.filter(function (x) { return x.id !== w.id && x.ar !== w.ar; }).sort(function () { return Math.random() - .5; }).slice(0, 3);
  var opts = others.concat([w]).sort(function () { return Math.random() - .5; });
  WG.opts = opts;
  page(back('#pdd/words/' + WG.g, 'القائمة') + '<div class="pd-prog"><i style="width:' + Math.round(WG.i / WG.q.length * 100) + '%"></i></div>' +
    '<div class="pd-wq">' + sbtn(w.id) + ru(w.ru, 'big') + (w.pr ? '<span class="pr ar">' + esc(w.pr) + '</span>' : '') + '</div>' +
    '<div class="pd-opts">' + opts.map(function (o, i) { return '<button class="pd-opt" data-wa="' + i + '"><span class="ar">' + esc(o.ar) + '</span></button>'; }).join('') + '</div>');
  setTimeout(function () { var b = document.querySelector('.pd-wq [data-snd]'); if (b) play(w.id, b); }, 150);
}
function wAnswer(i) {
  var w = WG.q[WG.i], o = WG.opts[i], ok = o.id === w.id;
  document.querySelectorAll('[data-wa]').forEach(function (e) { var k = +e.dataset.wa; e.classList.add(WG.opts[k].id === w.id ? 'right' : (k === i ? 'wrong' : 'dim')); e.disabled = true; });
  D.w[w.id] = ok ? Math.min(3, (D.w[w.id] || 0) + 1) : 0; store();
  if (ok) { WG.ok++; A.chime([880, 1174.7]); } else { A.buzz([30]); WG.q.push(w); }
  WG.i++; setTimeout(wCard, ok ? 650 : 1500);
}

/* ---------- events ---------- */
document.addEventListener('click', function (e) {
  if (!view || !view.querySelector('.pd')) return;
  var t = e.target.closest('[data-snd],[data-opt],[data-act],[data-exa],[data-goq],[data-wa]'); if (!t) return;
  if (t.dataset.snd) { e.preventDefault(); e.stopPropagation(); play(t.dataset.snd, t); return; }
  if (t.dataset.opt !== undefined) { answer(+t.dataset.opt); return; }
  if (t.dataset.exa !== undefined) { examAnswer(+t.dataset.exa); return; }
  if (t.dataset.goq !== undefined) { EX.i = +t.dataset.goq; examQ(); return; }
  if (t.dataset.wa !== undefined) { wAnswer(+t.dataset.wa); return; }
  var a = t.dataset.act;
  if (a === 'next') { SS.i++; card(); window.scrollTo(0, 0); }
  else if (a === 'help') help();
  else if (a === 'retry') route('');
  else if (a === 'exam-start') examStart();
  else if (a === 'exam-go') examQ();
  else if (a === 'exam-skip') { for (var k = 1; k <= EX.qs.length; k++) { var j = (EX.i + k) % EX.qs.length; if (EX.qs[j].a < 0) { EX.i = j; break; } } examQ(); }
  else if (a === 'exam-quit') { if (confirm('تنهي الامتحان؟ الأسئلة اللي ماجاوبتهاش هتتحسب غلط.')) { EX.qs.forEach(function (q) { if (q.a < 0) q.a = 99; }); examFinish(EX.phase === 'main' ? 'many' : 'extra'); } }
  else if (a === 'exam-again' || a === 'more') { e.preventDefault(); if (a === 'more') vSession('today'); else vExam(); }
  else if (a === 'w-quiz') wQuiz();
});

if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__pdd = { ex: function () { return EX; }, D: function () { return D; } };   // local tests only
window.NPDD = {
  init: function (bridge) { A = bridge; },
  view: function (arg) { route(arg); },
  plan: function () { return B ? plan() : null; },
  examRunning: function () { return !!(EX && EX.running); },
};
})();
