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
function paras(l) { return (l || []).map(function (p) { return p[0] === 'ar' ? '<p class="ar">' + ar(p[1]) + '</p>' : '<p class="cs-ruline">' + ru(p[1]) + '</p>'; }).join(''); }
function pr(t) { return t ? '<div class="pr cs-pr">' + esc(t) + '</div>' : ''; }
function exRow(e, why) {
  return '<div class="cs-row"><div class="cs-rr">' + ru(e.ru) + '</div>' + pr(e.pr) + (why ? '<div class="cs-why ar">' + ar(why) + '</div>' : '') + (e.ar ? '<div class="cs-tr ar">' + ar(e.ar) + '</div>' : '') + '</div>';
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
  say: function (d) { return '<div class="cs-box">' + paras(d.paras) + '</div>' + (d.ex || []).map(function (e) { return exRow(e); }).join(''); },
  table: function (d) {
    var th = d.head.map(function (x) { return '<th>' + seg(x) + '</th>'; }).join('');
    var rows = d.rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (i === 0 ? ' class="lab"' : '') + '>' + seg(c) + '</td>'; }).join('') + '</tr>'; }).join('');
    return '<div class="cs-tw"><table class="cs-t"><thead><tr>' + th + '</tr></thead><tbody>' + rows + '</tbody></table></div>' + (d.notes && d.notes.length ? '<div class="cs-box sm">' + paras(d.notes) + '</div>' : '');
  },
  uses: function (d) { return d.rows.map(function (r) { return exRow(r, r.why); }).join(''); },
  tricks: function (d) { return d.rows.map(function (r) { return exRow(r, r.why); }).join(''); },
  idea: function (d) {
    var sc = '<div class="cs-scene" dir="ltr">' + d.scene.map(function (s, i) { return '<div class="cs-sc' + (i === d.focus ? ' foc' : '') + (s[0] ? '' : ' verb') + '">' + (s[0] ? '<small>' + ru(s[0]) + '</small>' : '') + '<b>' + ru(s[1]) + '</b></div>'; }).join('<span class="cs-arr">→</span>') + '</div>';
    return sc + exRow(d.sent) + '<div class="cs-box">' + paras(d.points) + '</div>';
  },
  compare: function (d) {
    var side = function (b, c) { return '<div class="cs-side ' + c + '"><div class="cs-sh">' + ru(b.head) + '</div>' + (b.ru2 ? '<p class="cs-ruline">' + ru(b.ru2) + '</p>' : '') + '<div class="cs-why ar">' + ar(b.ar) + '</div>' + b.ex.map(function (e) { return exRow(e); }).join('') + '</div>'; };
    return '<div class="cs-cmp">' + side(d.left, 'l') + side(d.right, 'r') + '</div>' + (d.note && d.note.length ? '<div class="cs-box sm">' + paras(d.note) + '</div>' : '');
  },
  verbs: function (d) { return d.groups.map(function (g) { return '<div class="cs-vg"><b class="ar">' + ar(g.ar) + '</b><p class="cs-ruline">' + ru(g.verbs) + '</p>' + exRow(g) + '</div>'; }).join(''); },
  arabic: function (d) { return d.rows.map(function (r) { return exRow(r, r.arx); }).join('') + '<div class="cs-box warn">' + paras(d.diff) + '</div>'; },
  drill: function (d) {
    return '<p class="ar cs-hint">' + (d.wrong ? A.G('الجمل دي غلط عمدًا: صلّحها بصوت عالي، وبعدين افتح الإجابة.', 'الجمل دي غلط عمدًا: صلّحيها بصوت عالي، وبعدين افتحي الإجابة.') : A.G('جاوب إنت الأول بصوت عالي، وبعدين افتح الإجابة.', 'جاوبي إنتي الأول بصوت عالي، وبعدين افتحي الإجابة.')) + '</p>' +
      d.items.map(function (it, k) { return '<div class="cs-qa"><span class="n ru">' + (k + 1) + '</span><div class="cs-qx"><div>' + ru(it.q, d.wrong ? 'bad' : '') + (it.hint ? ' ' + ru(it.hint, 'hint') : '') + '</div>' + (it.why ? '<div class="cs-why ar">' + ar(it.why) + '</div>' : '') +
        '<details><summary class="ar">الإجابة</summary><div class="cs-ans">' + ru(it.ans) + '</div>' + pr(it.apr) + '</details></div></div>'; }).join('');
  },
  text: function (d) { return '<p class="ar cs-hint">' + ar(d.how) + '</p>' + d.rows.map(function (r) { return exRow(r); }).join('') + '<details class="cs-key"><summary class="ar">الإجابة</summary>' + paras(d.key) + '</details>'; },
  tasks: function (d) { return d.cards.map(function (c, i) { return '<div class="cs-task"><b class="ar">' + A.ad(i + 1) + '. ' + ar(c.ar) + '</b><p class="ar">' + ar(c.how) + '</p><p class="cs-ruline">' + ru(c.ru) + '</p></div>'; }).join(''); },
  section: function (d) { return '<div class="cs-band"><div class="ru">' + ru(d.q) + '</div>' + paras(d.points) + '</div>'; },
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
  var h = lessonHead(l, d, tab);
  if (tab === 'quiz') { view().innerHTML = h + '<div id="csq"></div></div>'; quizStart(l, d); return; }
  if (tab === 'videos') { view().innerHTML = h + A.xvHtml(d.xvideos, 0) + '</div>'; return; }
  h += '<p class="ar cs-sit">' + ar(d.situation) + '</p>';
  d.slides.forEach(function (s) { h += '<section class="cs-sec"><h3 class="ar">' + ar(s.ar) + '</h3><div class="cs-sub">' + ru(s.ru) + '</div>' + (R[s.type] ? R[s.type](s) : '') + '</section>'; });
  var nx = nextLesson(l);
  h += '<div class="cs-end"><a class="btn" href="#cases/' + l.key + '/quiz">' + A.ico('test') + A.G('اعمل الكويز', 'اعملي الكويز') + '</a>' +
    (nx ? '<a class="btn ghost" href="' + (canOpen(nx) ? '#cases/' + nx.key : '#unlock/0') + '">الدرس اللي بعده</a>' : '') + '</div></div>';
  view().innerHTML = h;
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
