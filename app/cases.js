/* Падежи́ · الحالات الإعرابية (2026-11-22, teacher: "add these lessons for every case in the app, in chapters A1, A2 … + extra videos").
   Data: data/cases/index.json (free, the map) · lesson files: free ones data/cases/<key>.json, paid ones /c/cases/<key>.json?t=…
   (tools/cases_export.py; worker rule: A1 code → A1 lessons, B1 code → every level, scope «cases» → all, opened stays open).
   Routes: #cases · #cases/<key> · #cases/<key>/quiz · #cases/<key>/videos.   No audio in the case lessons (teacher, 2026-11-21).
   Rules kept: Arabic and Cyrillic never share an element (A.mix isolates «Russian» inside Arabic); no English. */
(function () {
'use strict';
var A = null, IDX = null, CACHE = {}, QZ = null;
function esc(s) { return A.esc(s); }
function S() { return A.S(); }
var ACC = /([АаЕеЁёИиОоУуЫыЭэЮюЯя])'/g;
function ru(t, cls) {   // Russian: [[case form]] in gold; its own LTR island
  var h = esc(String(t || '').replace(ACC, '$1́')).replace(/\[\[(.*?)\]\]/g, '<b class="hl">$1</b>');
  return '<span class="ru' + (cls ? ' ' + cls : '') + '">' + h + '</span>';
}
var AR_RE = /[؀-ۿ]/;
function ar(t) { return A.mix(String(t || '').replace(/\[\[|\]\]/g, '')); }
function seg(t) { return String(t).split('|').map(function (x) { x = x.trim(); return x ? (AR_RE.test(x) ? '<span class="ar">' + ar(x) + '</span>' : ru(x)) : ''; }).filter(Boolean).join('<br>'); }
function paras(l, ids) { return (l || []).map(function (p, i) { return p[0] === 'ar' ? '<p class="ar">' + ar(p[1]) + '</p>' : '<p class="cs-ruline">' + pb(ids && ids[i]) + ru(p[1]) + '</p>'; }).join(''); }
/* voices (teacher, 2026-11-22: the app's grammar lessons get sound; the decks stay silent) */
var CUR = null;
function pb(id) { return id ? '<button class="cs-pb" data-csau="' + id + '" aria-label="اسمع">' + A.ico('play') + '</button>' : ''; }
function auUrl(id) { return CUR.free ? 'audio/cases/' + CUR.key + '/' + id + '.mp3' : A.API + '/c/cases/audio/' + CUR.key + '/' + id + '.mp3?t=' + encodeURIComponent(S().token || ''); }
function pr(t) { return t ? '<div class="pr cs-pr">' + esc(t) + '</div>' : ''; }
function exRow(e, why) {
  return '<div class="cs-row' + (e.a ? ' au' : '') + '"><div class="cs-rr">' + pb(e.a) + ru(e.ru) + '</div>' + pr(e.pr) + (why ? '<div class="cs-why ar">' + ar(why) + '</div>' : '') + (e.ar ? '<div class="cs-tr ar">' + ar(e.ar) + '</div>' : '') + '</div>';
}

/* ---------- access ---------- */
function scopeHas(c) { var a = S().acc; return !!(a && S().token && String(a.scope || '').split('+').some(function (x) { return x.split(':')[0] === c; })); }
function canOpen(l) {
  if (l.free) return true;
  var a = S().acc; if (!a || !S().token || a.state === 'cancelled') return false;
  if (a.state === 'active' && (scopeHas('cases') || scopeHas('b1') || (l.level === 'a1' && scopeHas('a1')))) return true;
  return (a.opened || []).indexOf('casesv2:' + l.id) >= 0;
}
function fileUrl(l) { return l.free ? 'data/cases/' + l.key + '.json' : A.API + '/c/cases/' + l.key + '.json?t=' + encodeURIComponent(S().token || ''); }
function loadIdx() { if (IDX) return Promise.resolve(IDX); return fetch('data/cases/index.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { IDX = j; return j; }); }
function loadLesson(l) {
  if (CACHE[l.key]) return Promise.resolve(CACHE[l.key]);
  return fetch(fileUrl(l), { cache: 'no-cache' }).then(function (r) { if (r.status === 401 || r.status === 403) throw 'denied'; if (!r.ok) throw 'net'; return r.json(); }).then(function (d) {
    CACHE[l.key] = d;
    var a = S().acc; if (!l.free && a) { a.opened = a.opened || []; var k = 'casesv2:' + l.id; if (a.opened.indexOf(k) < 0) { a.opened.push(k); A.save(); } }
    return d;
  });
}
function done() { return S().cases || (S().cases = {}); }
function view() { return document.getElementById('view'); }

/* ---------- the map: level chapters → cases → lessons ---------- */
function vMap() {
  var lv = A.levelNow(), D = done();
  var h = '<section class="hero" style="height:250px"><img src="img/u3.jpg" alt=""><div class="topbar pad"><a class="back" href="#library" aria-label="رجوع">' + A.ico('back') + '</a></div>' +
    '<div class="in pad"><span class="d-ru ru t-ru" style="font-size:34px">Падежи́</span><span class="ar meta">الحالات الإعرابية الست: كل استخدام في درس، من الأسهل للأصعب</span></div></section><div class="pad cs">';
  h += '<p class="ar cs-intro">' + A.G('ابدأ بدرس الحروف، وبعدين امشي بالترتيب في مستواك. كل درس فيه شرح بسيط، وجدول، وغلطات مشهورة، وتمرين، وكويز.', 'ابدئي بدرس الحروف، وبعدين امشي بالترتيب في مستواكي. كل درس فيه شرح بسيط، وجدول، وغلطات مشهورة، وتمرين، وكويز.') + '</p>';
  IDX.levels.forEach(function (L) {
    var ls = IDX.lessons.filter(function (l) { return l.level === L.id; });
    var dn = ls.filter(function (l) { return D[l.key]; }).length;
    h += '<details class="cs-lv"' + (L.id === lv || (lv === 'a1' && L.id === 'a1') ? ' open' : '') + '><summary><span class="ru cs-lvru">' + L.ru + '</span><span class="tx"><b class="ar">' + esc(L.ar) + '</b><small class="ar">' +
      (ls.length ? A.ad(ls.length) + ' ' + (ls.length > 10 ? 'درس' : 'دروس') + (dn ? ' · خلصت ' + A.ad(dn) : '') : 'قريب') + '</small></span>' + A.ico('back', 'end') + '</summary>';
    if (!ls.length) h += '<p class="ar cs-soon">الدروس دي لسه بتتجهز. هتظهر هنا أول بأول.</p>';
    IDX.cases.forEach(function (c) {
      var cl = ls.filter(function (l) { return l.case === c.id; }); if (!cl.length) return;
      h += '<div class="cs-case"><span class="ar">' + esc(c.ar) + '</span><span class="ru">' + esc(c.ru) + '</span></div>';
      cl.forEach(function (l) {
        var open = canOpen(l), d = D[l.key];
        h += '<a class="ep pad cs-ep' + (d ? ' done' : '') + '" href="' + (open ? '#cases/' + l.key : '#unlock/0') + '"><span class="no ru">' + esc(l.code === '0' ? '•' : l.code) + '</span><span><span class="ru">' + esc(l.ru) + '</span><span class="ar">' + esc(l.ar) + '</span></span>' +
          (open ? (d ? '<span class="cs-sc ru">' + d + '%</span>' : (l.free ? '<span class="cs-free ar">ببلاش</span>' : '')) : '<span class="lk">' + A.ico('lock') + '</span>') + '</a>';
      });
    });
    h += '</details>';
  });
  h += '<section class="sec" style="margin-top:18px"><h2><span>مراجعة شاملة (حالتين في كل درس)</span><span class="ru">Повторе́ние</span></h2><div class="links">' +
    IDX.reviews.map(function (r) { return '<a class="lrow" href="' + A.oldCase(r.n) + '">' + A.ico('book') + '<span class="tx"><b>' + esc(r.ar) + '</b><small class="ru">' + esc(r.ru) + '</small></span>' + A.ico('back', 'end') + '</a>'; }).join('') + '</div></section></div>';
  view().innerHTML = h;
}

/* ---------- one lesson ---------- */
var R = {
  say: function (d) { return '<div class="cs-box">' + paras(d.paras, d.pa_paras) + '</div>' + (d.ex || []).map(function (e) { return exRow(e); }).join(''); },
  table: function (d) {
    var th = d.head.map(function (x) { return '<th>' + seg(x) + '</th>'; }).join('');
    var rows = d.rows.map(function (r, ri) { return '<tr>' + r.map(function (c, i) { var id = d.ca && d.ca[ri] && d.ca[ri][i]; return '<td' + (i === 0 ? ' class="lab"' : '') + '>' + (id ? '<span class="cs-cell">' + pb(id) + seg(c) + '</span>' : seg(c)) + '</td>'; }).join('') + '</tr>'; }).join('');
    return '<div class="cs-tw"><table class="cs-t"><thead><tr>' + th + '</tr></thead><tbody>' + rows + '</tbody></table></div>' + (d.notes && d.notes.length ? '<div class="cs-box sm">' + paras(d.notes) + '</div>' : '');
  },
  uses: function (d) { return d.rows.map(function (r) { return exRow(r, r.why); }).join(''); },
  tricks: function (d) { return d.rows.map(function (r) { return exRow(r, r.why); }).join(''); },
  idea: function (d) {
    var sc = '<div class="cs-scene" dir="ltr">' + d.scene.map(function (s, i) { return '<div class="cs-sc' + (i === d.focus ? ' foc' : '') + (s[0] ? '' : ' verb') + '">' + (s[0] ? '<small>' + ru(s[0]) + '</small>' : '') + '<b>' + ru(s[1]) + '</b></div>'; }).join('<span class="cs-arr">→</span>') + '</div>';
    return sc + exRow(d.sent) + '<div class="cs-box">' + paras(d.points, d.pa_points) + '</div>';
  },
  compare: function (d) {
    var side = function (b, c) { return '<div class="cs-side ' + c + '"><div class="cs-sh">' + ru(b.head) + '</div>' + (b.ru2 ? '<p class="cs-ruline">' + ru(b.ru2) + '</p>' : '') + '<div class="cs-why ar">' + ar(b.ar) + '</div>' + b.ex.map(function (e) { return exRow(e); }).join('') + '</div>'; };
    return '<div class="cs-cmp">' + side(d.left, 'l') + side(d.right, 'r') + '</div>' + (d.note && d.note.length ? '<div class="cs-box sm">' + paras(d.note) + '</div>' : '');
  },
  verbs: function (d) { return d.groups.map(function (g) { return '<div class="cs-vg"><b class="ar">' + ar(g.ar) + '</b><p class="cs-ruline">' + ru(g.verbs) + '</p>' + exRow(g) + '</div>'; }).join(''); },
  arabic: function (d) { return d.rows.map(function (r) { return exRow(r, r.arx); }).join('') + '<div class="cs-box warn">' + paras(d.diff, d.pa_diff) + '</div>'; },
  drill: function (d) {
    return '<p class="ar cs-hint">' + (d.wrong ? A.G('الجمل دي غلط عمدًا: صلّحها بصوت عالي، وبعدين افتح الإجابة.', 'الجمل دي غلط عمدًا: صلّحيها بصوت عالي، وبعدين افتحي الإجابة.') : A.G('جاوب إنت الأول بصوت عالي، وبعدين افتح الإجابة.', 'جاوبي إنتي الأول بصوت عالي، وبعدين افتحي الإجابة.')) + '</p>' +
      d.items.map(function (it, k) { return '<div class="cs-qa"><span class="n ru">' + (k + 1) + '</span><div class="cs-qx"><div>' + pb(it.qa) + ru(it.q, d.wrong ? 'bad' : '') + (it.hint ? ' ' + ru(it.hint, 'hint') : '') + '</div>' + (it.why ? '<div class="cs-why ar">' + ar(it.why) + '</div>' : '') +
        '<details><summary class="ar">الإجابة</summary><div class="cs-ans">' + pb(it.aa) + ru(it.ans) + '</div>' + (it.aar ? '<div class="cs-tr ar">' + esc(it.aar) + '</div>' : '') + '</details></div></div>'; }).join('');
  },
  text: function (d) { return '<p class="ar cs-hint">' + ar(d.how) + '</p>' + d.rows.map(function (r) { return exRow(r); }).join('') + '<details class="cs-key"><summary class="ar">الإجابة</summary>' + paras(d.key, d.pa_key) + '</details>'; },
  tasks: function (d) { return d.cards.map(function (c, i) { return '<div class="cs-task"><b class="ar">' + A.ad(i + 1) + '. ' + ar(c.ar) + '</b><p class="ar">' + ar(c.how) + '</p><p class="cs-ruline">' + ru(c.ru) + '</p></div>'; }).join(''); },
  section: function (d) { return '<div class="cs-band"><div class="ru">' + ru(d.q) + '</div>' + paras(d.points, d.pa_points) + '</div>'; },
};
function lessonHead(l, d, tab) {
  var tabs = [['', 'الدرس'], ['quiz', 'الكويز']].concat(d.xvideos ? [['videos', 'فيديوهات إضافية']] : []);
  return '<div class="page pad cs"><div class="ph1"><a class="back" href="#cases" aria-label="رجوع">' + A.ico('back') + '</a><div><span class="ru cs-lab">' + esc(d.label) + ' · ' + IDX.levels.filter(function (x) { return x.id === l.level; })[0].ru + '</span>' +
    '<h1 class="ar" style="font-size:22px;margin:2px 0">' + esc(d.ar) + '</h1><span class="ru cs-t1">' + esc(d.ru) + '</span></div></div>' +
    '<div class="seg">' + tabs.map(function (t) { return '<a class="sg' + (t[0] === tab ? ' on' : '') + '" href="#cases/' + l.key + (t[0] ? '/' + t[0] : '') + '">' + t[1] + '</a>'; }).join('') + '</div>';
}
function nextLesson(l) {
  var ls = IDX.lessons, i = ls.indexOf(l);
  for (var k = i + 1; k < ls.length; k++) if (ls[k].level === l.level) return ls[k];
  return null;
}
function vLesson(l, d, tab) {
  CUR = l; var h = lessonHead(l, d, tab);
  if (tab === 'quiz') { view().innerHTML = h + '<div id="csq"></div></div>'; quizStart(l, d); return; }
  if (tab === 'videos') { view().innerHTML = h + A.xvHtml(d.xvideos, 0) + '</div>'; return; }
  h += '<p class="ar cs-sit">' + ar(d.situation) + '</p>';
  d.slides.forEach(function (s) { h += '<section class="cs-sec"><h3 class="ar">' + ar(s.ar) + '</h3><div class="cs-sub">' + ru(s.ru) + '</div>' + (R[s.type] ? R[s.type](s) : '') + '</section>'; });
  var nx = nextLesson(l);
  h += '<div class="cs-end"><a class="btn" href="#cases/' + l.key + '/quiz">' + A.ico('test') + A.G('اعمل الكويز', 'اعملي الكويز') + '</a>' +
    (nx ? '<a class="btn ghost" href="' + (canOpen(nx) ? '#cases/' + nx.key : '#unlock/0') + '">الدرس اللي بعده</a>' : '') + '</div></div>';
  view().innerHTML = h;
  loadVerbs().then(function () { if (CUR === l && !document.getElementById('csq')) markVerbs(view()); });
}

/* ---------- quiz (reading only) ---------- */
function shuffle(o) { var ord = o.map(function (_, k) { return k; }); if (o.length === 2 && (o[0][0] === 'صح' || o[0][0] === 'سؤال')) return ord;
  for (var k = ord.length - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)); var t = ord[k]; ord[k] = ord[r]; ord[r] = t; } return ord; }
function quizStart(l, d) { QZ = { l: l, d: d, i: 0, sc: { cur: [0, 0], rev: [0, 0] }, wrong: [] }; quizShow(); }
function quizShow() {
  var q0 = QZ.d.quiz[QZ.i], ord = shuffle(q0.o), q = { b: q0.b, ru: q0.ru, ar: q0.ar, e: q0.e, o: ord.map(function (k) { return q0.o[k]; }), c: ord.indexOf(q0.c) };
  QZ.q = q; QZ.answered = false;
  var n = QZ.d.quiz.length;
  document.getElementById('csq').innerHTML = '<div class="qz"><div class="cs-qbar"><i style="width:' + Math.round(QZ.i / n * 100) + '%"></i></div><small class="ar cs-qn">سؤال ' + A.ad(QZ.i + 1) + ' من ' + A.ad(n) + (q.b === 'rev' ? ' · مراجعة' : '') + '</small>' +
    '<div class="q-ru ru">' + A.mixAr(q.ru) + '</div><div class="q-ar ar">' + ar(q.ar) + '</div><div class="qopts">' +
    q.o.map(function (o, j) { return '<button class="qopt" data-csopt="' + j + '">' + (o[1] ? '<span class="ru">' + esc(o[0]) + '</span>' : '<span class="ar">' + esc(o[0]) + '</span>') + '</button>'; }).join('') +
    '</div><div class="qfb" id="csfb" hidden></div><button class="btn" id="csnx" hidden data-csact="next">' + (QZ.i < n - 1 ? 'السؤال اللي بعده' : A.G('شوف النتيجة', 'شوفي النتيجة')) + '</button></div>';
}
function quizPick(j) {
  if (QZ.answered) return; QZ.answered = true;
  var q = QZ.q, ok = j === q.c;
  document.querySelectorAll('[data-csopt]').forEach(function (b, k) { b.disabled = true; if (k === q.c) b.classList.add('ok'); if (k === j && !ok) b.classList.add('bad'); });
  QZ.sc[q.b][1]++; if (ok) QZ.sc[q.b][0]++; else QZ.wrong.push((q.ru + ' · ' + q.ar).replace(/\s+/g, ' '));
  if (ok) A.chime([880, 1174.7]); else A.buzz([30]);
  var fb = document.getElementById('csfb'); fb.hidden = false; fb.className = 'qfb ' + (ok ? 'ok' : 'bad');
  fb.innerHTML = '<span class="ar">' + (ok ? 'برافو! ' : 'مش دي. ') + '</span><span class="ar">' + A.mix(q.e) + '</span>';
  document.getElementById('csnx').hidden = false;
}
function quizEnd() {
  var n = QZ.d.quiz.length, tot = QZ.sc.cur[0] + QZ.sc.rev[0], pct = Math.round(tot / n * 100), l = QZ.l;
  var D = done(); D[l.key] = Math.max(D[l.key] || 0, pct); A.save(); A.touchStreak();
  var nx = nextLesson(l);
  document.getElementById('csq').innerHTML = '<div class="qz res"><div class="cs-big ru">' + tot + '/' + n + '</div><p class="ar">' + (pct >= 90 ? 'ممتاز! الدرس ده بقى في إيدك.' : pct >= 70 ? A.G('كويس جدًا! راجع الغلطات وكمّل.', 'كويس جدًا! راجعي الغلطات وكمّلي.') : A.G('ارجع للدرس مرة كمان، وبعدين أعيد الكويز.', 'ارجعي للدرس مرة كمان، وبعدين أعيدي الكويز.')) + '</p>' +
    '<p class="ar cs-sent" id="cssent"></p><div class="row2" style="justify-content:center;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-csact="again">' + A.G('أعيد الكويز', 'أعيدي الكويز') + '</button>' +
    (nx ? '<a class="btn" href="' + (canOpen(nx) ? '#cases/' + nx.key : '#unlock/0') + '">الدرس اللي بعده</a>' : '') + '</div></div>';
  send(l, QZ, tot, pct);
}
function send(l, Z, tot, pct) {
  var s = S(), jobs = [], d = { type: 'quiz', name: s.name || 'طالب', lesson: 'Падежи ' + Z.d.label.replace(/́/g, '') + ' · ' + Z.d.ru.replace(/́/g, ''), score: tot + '/' + Z.d.quiz.length,
    lesson_part: Z.sc.cur[0] + '/' + Z.sc.cur[1], review_part: Z.sc.rev[1] ? Z.sc.rev[0] + '/' + Z.sc.rev[1] : '', mistakes: Z.wrong.join('\n'), source: 'app' };
  if (A.CONF.results) jobs.push(fetch(A.CONF.results, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) }));
  if (s.token && A.API) jobs.push(fetch(A.API + '/api/quiz?t=' + encodeURIComponent(s.token), { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: 'c-' + l.key, pct: pct, score: tot, total: Z.d.quiz.length, cur: Z.sc.cur, rev: Z.sc.rev, mistakes: Z.wrong.slice(0, 40) }) }));
  if (!jobs.length) return;
  Promise.all(jobs).then(function () { var e = document.getElementById('cssent'); if (e) e.textContent = 'النتيجة وصلت للمدرس.'; }).catch(function () {});
}

/* ---------- conjugation cards (teacher, 2026-11-22: "a button on every verb … shown by the little Firebird, from its wings or as fire;
   super cool and cinematic"). Data: data/cases/verbs.json (tools/cases_verbs.py: {cards, forms}), voices audio/cases/verbs/<id>.mp3 (free).
   Every verb form in a lesson's Russian text gets a quiet gold dotted underline; a tap: the word ignites → Жа́ра flies to the card's
   top edge → she spreads her wings → the card opens out of a ring of fire → the forms light up one by one. Close: the card burns away
   upward into embers and she flies home. Without Жа́ра (hidden in «حسابي») the card rises out of a flame from the word itself. */
var VB = null, VBP = null, CARD = null, VAU = null;
function loadVerbs() { if (VB) return Promise.resolve(VB); if (!VBP) VBP = fetch('data/cases/verbs.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { VB = j; return j; }).catch(function () { VBP = null; return null; }); return VBP; }
var VWORD = /[А-Яа-яЁё́]+(?:-[А-Яа-яЁё́]+)?/g;
function markVerbs(root) {
  if (!VB || !root) return;
  var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
    var p = n.parentElement; if (!p || !p.closest('.ru') || p.closest('button,.vbw,.cs-sub,.q-ru,#csq,.vb-card')) return NodeFilter.FILTER_REJECT;
    return /[А-Яа-яЁё]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
  var nodes = []; while (tw.nextNode()) nodes.push(tw.currentNode);
  nodes.forEach(function (n) {
    var t = n.nodeValue, out = [], last = 0, hit = false;
    t.replace(VWORD, function (w, i) {
      var lem = VB.forms[w.toLowerCase()];
      if (lem && VB.cards[lem]) { out.push(document.createTextNode(t.slice(last, i))); var s = document.createElement('span'); s.className = 'vbw'; s.setAttribute('role', 'button'); s.tabIndex = 0; s.dataset.vb = lem; s.textContent = w; out.push(s); last = i + w.length; hit = true; }
      return w;
    });
    if (!hit) return;
    out.push(document.createTextNode(t.slice(last)));
    var f = document.createDocumentFragment(); out.forEach(function (x) { f.appendChild(x); }); n.parentNode.replaceChild(f, n);
  });
}
function vbUrl(id) { return 'audio/cases/verbs/' + id + '.mp3'; }
function stripAcc(s) { return s.replace(/́/g, ''); }
function lastWord(f) { var p = f.split(' '); return p[p.length - 1]; }
function stemOf(list) {   // the shared beginning of the forms (stress ignored) → the endings get the gold
  var w = list.map(function (f) { return stripAcc(lastWord(f)).replace(/!$/, ''); }); if (w.length < 2) return 0;
  var k = 0; while (w.every(function (x) { return x[k] && x[k] === w[0][k]; })) k++; return k;
}
function formHtml(f, stem) {   // «я ви́жу» → «я» + «ви́» + gold «жу»
  var p = f.split(' '), w = p.pop(), pre = p.length ? '<span class="vb-pn">' + esc(p.join(' ')) + '</span> ' : '';
  var i = 0, n = 0; while (i < w.length && n < stem) { i++; if (w[i] === '́') i++; n++; }
  if (stem < 2 || i >= w.length) return pre + '<b>' + esc(w) + '</b>';
  return pre + '<b>' + esc(w.slice(0, i)) + '<i class="vb-end">' + esc(w.slice(i)) + '</i></b>';
}
function cardHtml(c) {
  var row = function (r, st, hasAr) { var id = r[r.length - 1]; return '<div class="vb-r" data-vid="' + id + '"><button class="vb-p" data-vplay="' + id + '" aria-label="اسمع">' + A.ico('play') + '</button><span class="ru vb-f">' + formHtml(r[0], st) + '</span>' + (hasAr && r[1] ? '<span class="ar vb-a">' + esc(r[1]) + '</span>' : '') + '</div>'; };
  var sec = function (title, rows, hasAr, note) { if (!rows || !rows.length) return ''; var fs = rows.map(function (r) { return r[0]; }), st = stemOf(fs.length > 3 ? fs.slice(1) : fs);   // the я form may add a letter (люб‑лю́)
    return '<section class="vb-s"><h4 class="ar">' + title + '</h4>' + rows.map(function (r) { return row(r, st, hasAr); }).join('') + (note ? '<p class="ar vb-note">' + esc(note) + '</p>' : '') + '</section>'; };
  var perf = c.asp === 'p', fut = perf || c.fut;
  var pair = c.pair && VB.cards[c.pair] ? '<button class="vb-pair" data-vb="' + esc(c.pair) + '"><span class="ar">' + (perf ? 'المش مكتمل:' : 'المكتمل:') + '</span> <span class="ru">' + esc(c.pair) + '</span></button>' : '';
  return '<div class="vb-fire" aria-hidden="true"></div><button class="vb-x" data-vbx aria-label="اقفل">×</button>' +
    '<div class="vb-hd"><button class="vb-p big" data-vplay="' + c.a + '" aria-label="اسمع">' + A.ico('play') + '</button><span class="ru vb-inf">' + esc(c.v) + '</span></div>' +
    '<div class="vb-meta"><span class="ar vb-mean">' + esc(c.ar) + '</span><span class="ar vb-asp' + (perf ? ' p' : '') + '">' + (perf ? 'مكتمل: عمل وخلص' : 'مش مكتمل: بيعمل') + '</span></div>' +
    '<div class="vb-acts">' + pair + '<button class="vb-all" data-vball>' + A.ico('play') + '<span class="ar">' + A.G('اسمع التصريف كله', 'اسمعي التصريف كله') + '</span></button></div>' +
    '<div class="vb-body">' + sec(fut ? 'المستقبل' : 'المضارع (دلوقتي)', c.pres, true) + sec('الماضي', c.past, true) + sec('الأمر', (c.imp || []).map(function (r) { return [r[0], '', r[1]]; }), false, c.imp_ar ? '= ' + c.imp_ar : '') + '</div>';
}
function vbStop() { if (VAU) { VAU.pause(); VAU = null; } if (CARD) CARD.el.querySelectorAll('.vb-r.on,.vb-all.on').forEach(function (x) { x.classList.remove('on'); }); }
function playAll() {
  if (!CARD) return; var btn = CARD.el.querySelector('[data-vball]'); if (btn.classList.contains('on')) { vbStop(); return; }
  vbStop(); btn.classList.add('on');
  var rows = [].slice.call(CARD.el.querySelectorAll('.vb-r')), k = 0, me = CARD;
  (function next() {
    if (CARD !== me || !btn.classList.contains('on')) return;
    rows.forEach(function (r) { r.classList.remove('on'); });
    if (k >= rows.length) { btn.classList.remove('on'); return; }
    var r = rows[k++]; r.classList.add('on'); r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    VAU = new Audio(vbUrl(r.dataset.vid)); VAU.onended = function () { setTimeout(next, 180); }; VAU.onerror = function () { setTimeout(next, 120); };
    VAU.play().catch(function () { setTimeout(next, 120); });
  })();
}
function place(card, r) {   // above the word when there is room, else below; always inside the screen
  var W = Math.min(380, innerWidth - 24), H = innerHeight, x = Math.max(12, Math.min(innerWidth - W - 12, r.left + r.width / 2 - W / 2));
  card.style.width = W + 'px'; card.style.left = x + 'px';
  var up = r.top - 24, down = H - r.bottom - 24, above = up > down, room = (above ? up : down) - 46, full = card.scrollHeight, top, h;
  if (room >= Math.min(full, 460)) {   // fits next to the word
    card.style.maxHeight = Math.min(room, H - 110) + 'px'; h = Math.min(full, room, H - 110);
    top = above ? Math.max(70, r.top - 18 - h) : Math.min(H - 16 - h, r.bottom + 18);
  } else {   // little room: the card rises to the middle of the screen, over the text
    card.style.maxHeight = Math.round(H * .74) + 'px'; h = Math.min(full, Math.round(H * .74));
    top = Math.max(64, Math.round((H - h) / 2) + 10);
  }
  card.style.top = top + 'px';
  return { x: x + W / 2, y: top };   // the top edge's middle: where Жа́ра perches
}
function openCard(lem, src) {
  var c = VB && VB.cards[lem]; if (!c) return;
  var swap = !!CARD; if (CARD) closeCard(true);
  var r = src.getBoundingClientRect(), RMm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bd = document.createElement('div'); bd.className = 'vb-bd'; document.body.appendChild(bd);
  var el = document.createElement('div'); el.className = 'vb-card'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'تصريف ' + stripAcc(c.v)); el.innerHTML = cardHtml(c);
  document.body.appendChild(el);
  var at = place(el, r);
  CARD = { el: el, bd: bd, lem: lem, src: src }; src.classList.add('lit');
  requestAnimationFrame(function () { bd.classList.add('in'); });
  var reveal = function (cx, cy) {
    if (CARD === null || CARD.el !== el) return;
    var er = el.getBoundingClientRect(), ox = cx - er.left, oy = cy - er.top;
    el.style.setProperty('--ox', ox + 'px'); el.style.setProperty('--oy', oy + 'px');
    el.classList.add('open');
    if (!RMm && el.animate) {
      var R = Math.hypot(Math.max(ox, er.width - ox), Math.max(oy, er.height - oy)) + 30;
      el.animate([{ clipPath: 'circle(0px at ' + ox + 'px ' + oy + 'px)', filter: 'brightness(2.2) saturate(1.4)' }, { clipPath: 'circle(' + R * .55 + 'px at ' + ox + 'px ' + oy + 'px)', filter: 'brightness(1.4)', offset: .45 },
        { clipPath: 'circle(' + R + 'px at ' + ox + 'px ' + oy + 'px)', filter: 'none' }], { duration: 760, easing: 'cubic-bezier(.2,.7,.2,1)' });
      A.embers(cx, cy, 46, 4.2, 1.1);
      [].slice.call(el.querySelectorAll('.vb-r')).forEach(function (row, i) { row.animate([{ opacity: 0, transform: 'translateY(8px)', textShadow: '0 0 0 transparent' }, { opacity: 1, transform: 'none', textShadow: '0 0 14px rgba(255,170,80,.9)', offset: .6 }, { opacity: 1, transform: 'none', textShadow: '0 0 0 transparent' }], { duration: 520, delay: 300 + i * 55, easing: 'ease-out', fill: 'backwards' }); });
    }
    A.chime && A.chime([659.3, 987.8]);
  };
  if (RMm) { reveal(at.x, at.y); return; }
  if (swap) { A.embers(at.x, at.y + 30, 34, 3.4, .6); setTimeout(function () { reveal(at.x, at.y + 30); }, 90); return; }   // the partner verb: a quick flare in place
  A.embers(r.left + r.width / 2, r.top + r.height / 2, 18, 2.2, .9);   // the word ignites
  if (A.bird && A.bird.here() && !swap) {
    A.bird.to(at.x, at.y - 22, function () {
      if (!CARD || CARD.el !== el) return;
      A.bird.st('wings'); A.embers(at.x, at.y - 10, 30, 3.5, .5);
      setTimeout(function () { reveal(at.x, at.y); }, 260);
    });
  } else {   // no bird (or switching cards): a flame climbs from the word to the card
    var steps = 14, k = 0, sx = r.left + r.width / 2, sy = above(r, at) ? r.top : r.bottom;
    (function climb() { if (!CARD || CARD.el !== el) return; var t = k / steps; A.embers(sx + (at.x - sx) * t, sy + (at.y + 20 - sy) * t, 5, 1.6, .8); if (++k <= steps) requestAnimationFrame(climb); else reveal(at.x, at.y + 20); })();
  }
}
function above(r, at) { return at.y < r.top; }
function closeCard(instant) {
  var C = CARD; if (!C) return; CARD = null; vbStop();
  C.src.classList.remove('lit'); C.bd.classList.remove('in');
  var bye = function () { C.el.remove(); C.bd.remove(); };
  var RMm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (instant || RMm || !C.el.animate) { bye(); if (!instant && A.bird) A.bird.home(); return; }
  var er = C.el.getBoundingClientRect(), t0 = performance.now(), D = 640;
  C.el.style.pointerEvents = 'none';
  C.el.animate([{ clipPath: 'inset(0 0 0 0)', filter: 'none' }, { clipPath: 'inset(0 0 100% 0)', filter: 'brightness(1.6) sepia(.6)' }], { duration: D, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
  (function burn(now) { var t = Math.min(1, (now - t0) / D), y = er.bottom - er.height * (t * t * t); A.embers(er.left + Math.random() * er.width, y, 4, 1.8, 1.3); if (t < 1) requestAnimationFrame(burn); })(t0);
  if (A.bird) { A.bird.st(null); setTimeout(function () { A.bird.home(); }, 260); }
  setTimeout(bye, D + 40);
}
document.addEventListener('click', function (e) {
  var w = e.target.closest('[data-vb]');
  if (w) { e.preventDefault(); e.stopPropagation(); if (CARD && CARD.lem === w.dataset.vb && !w.closest('.vb-card')) { closeCard(); return; } openCard(w.dataset.vb, w.closest('.vb-card') && CARD ? CARD.src : w); return; }
  if (!CARD) return;
  var p = e.target.closest('[data-vplay]'); if (p) { e.preventDefault(); vbStop(); A.playOne(p, vbUrl(p.dataset.vplay)); return; }
  if (e.target.closest('[data-vball]')) { playAll(); return; }
  if (e.target.closest('[data-vbx]') || e.target.closest('.vb-bd')) { closeCard(); return; }
}, true);
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && CARD) { closeCard(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('vbw')) { e.preventDefault(); openCard(e.target.dataset.vb, e.target); }
});
window.addEventListener('hashchange', function () { if (CARD) closeCard(true); });

/* ---------- route ---------- */
function route(arg) {
  view().innerHTML = '<div class="page pad"><p class="ar" style="color:var(--dim)">بيحمّل…</p></div>';
  loadIdx().then(function () {
    var p = String(arg || '').split('/');
    if (!p[0]) { vMap(); return; }
    var l = IDX.lessons.filter(function (x) { return x.key === p[0]; })[0];
    if (!l) { vMap(); return; }
    if (!canOpen(l)) { location.hash = '#unlock/0'; return; }
    loadLesson(l).then(function (d) { vLesson(l, d, p[1] || ''); window.scrollTo(0, 0); })
      .catch(function (e) { view().innerHTML = '<div class="page pad"><p class="ar">' + (e === 'denied' ? 'الدرس ده مش في الكود بتاعك. كلم المدرس على واتساب.' : 'الدرس محتاج نت. جرّب تاني.') + '</p><a class="btn" href="#cases">رجوع</a></div>'; });
  }).catch(function () { view().innerHTML = '<div class="page pad"><p class="ar">محتاج نت أول مرة.</p></div>'; });
}
document.addEventListener('click', function (e) {
  var au = e.target.closest('[data-csau]');
  if (au && CUR) { e.preventDefault(); e.stopPropagation(); A.playOne(au, auUrl(au.dataset.csau)); return; }
  if (!document.getElementById('csq')) return;
  var t = e.target.closest('[data-csopt],[data-csact]'); if (!t) return;
  if (t.dataset.csopt !== undefined) { quizPick(+t.dataset.csopt); return; }
  if (t.dataset.csact === 'next') { QZ.i++; if (QZ.i < QZ.d.quiz.length) quizShow(); else quizEnd(); window.scrollTo(0, 0); }
  else if (t.dataset.csact === 'again') quizStart(QZ.l, QZ.d);
});
window.NCASES = {
  init: function (bridge) { A = bridge; },
  view: function (arg) { route(arg); },
  count: function () { return IDX ? IDX.lessons.length : 0; },
};
})();
