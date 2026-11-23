/* Жа́ра's tour of the app (teacher, 2026-11-23: "when a new student enters, the Firebird tells them everything about the app,
   the icons, the lessons, the details, and takes them on a tour, showing and navigating them").
   Chosen: spotlight + hands-on (the screen dims around the real button, Жа́ра flies to it and explains in her bubble; at a «tap»
   stop the student taps the real button and the app really moves) · a short first tour, then a 3–5 stop mini-tour the first time a
   student opens a lesson, a unit, the games, Лера's chat, «اسأل ليرا», the cases, ПДД · Egyptian-Arabic bubbles + one Russian word
   per stop in Жа́ра's own voice (Silero kseniya, tools/app_tour_voice.py → audio/tour/) + soft chimes · every new phone, a replay
   button in «حسابي», and a different ending for free students (what a code opens) and code students (their code, the teacher's replies).
   Bridge: NTOUR.init(api) from app.js; app.js calls NTOUR.screen(route) after every render and NTOUR.on() to keep Жа́ра still. */
(function () {
'use strict';
var A = null, T = null, EL = null, RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function S() { return A.S(); }
function g(m, f) { return A.G(m, f); }
function q(sel) { try { return typeof sel === 'function' ? sel() : document.querySelector(sel); } catch (e) { return null; } }
function byText(sel, txt) { var ts = [].concat(txt); return function () { var bs = [].slice.call(document.querySelectorAll(sel)); for (var i = 0; i < ts.length; i++) { var b = bs.filter(function (x) { return x.textContent.trim() === ts[i]; })[0]; if (b) return b; } return null; }; }
function tabSel(t) { return '#tabs a[data-tab="' + t + '"]'; }
function isCode() { var a = S().acc; return !!(S().token && a); }
function shown(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden'; }

/* ---------- the stops ---------- */
function mainSteps() {
  var name = (S().name || '').trim().split(' ')[0];
  if (A.pddOnly()) return [
    { ru: 'Приве́т! Я Жа́ра.', a: 'privet', t: function () { return 'أهلًا' + (name ? ' يا ' + name : '') + '! أنا ژارا، طائر النار. ' + g('هوريك', 'هوريكي') + ' كورس رخصة القيادة في دقيقة.'; }, first: true },
    { go: '#pdd', sel: '.pd-top', ru: 'Смотри́!', a: 'smotri', t: 'الدايرة دي بتقولك ' + g('حفظت', 'حفظتي') + ' كام سؤال من الـ ٨٠٠. كل يوم بتكبر.' },
    { sel: 'a[href="#pdd/today"]', t: 'تمرين النهارده: الأسئلة الجديدة والأسئلة اللي لازم ترجعلها. ابدأ منه كل يوم.'.replace('ابدأ', g('ابدأ', 'ابدئي')) },
    { sel: 'a[href="#pdd/exam"]', ru: 'Пое́хали!', a: 'poekhali', t: 'امتحان زي الحقيقي بالظبط: ٢٠ سؤال في ٢٠ دقيقة، وغلطتين بس مسموح.' },
    { sel: 'a[href="#pdd/mist"]', t: 'غلطاتك بتتجمع هنا، وبترجعلك لحد ما ' + g('تثبتها', 'تثبتيها') + '.' },
    { sel: 'a[href="#pdd/words"]', ru: 'Слу́шай!', a: 'slushay', t: 'كلمات الطريق بالروسي، كل كلمة بصوت ومعناها بالمصري.' },
    { sel: tabSel('profile'), tap: true, t: g('دوس', 'دوسي') + ' على «حسابي».' },
    { go: '#profile', sel: '.pcard', ru: 'Вот твой код.', a: 'kod', t: 'ده كودك: شغال لحد إمتى، وعلى كام موبايل.' },
    { sel: '[data-act="tour"]', ru: 'Всё поня́тно?', a: 'ponyatno', t: g('ولو نسيت', 'ولو نسيتي') + ' حاجة، من هنا الجولة ترجع في أي وقت. بالتوفيق في الامتحان!', last: true }
  ];
  return [
    { ru: 'Приве́т! Я Жа́ра.', a: 'privet', first: true, t: function () { return 'أهلًا' + (name ? ' يا ' + name : '') + '! أنا ژارا، طائر النار، وهكون ' + g('معاك', 'معاكي') + ' طول الطريق. ' + g('تعالى', 'تعالي') + ' أفرّجك على التطبيق في دقيقة ونص، و' + g('إنت', 'إنتي') + ' اللي ' + g('هتدوس', 'هتدوسي') + ' بإيدك.'; } },
    { go: '#home', sel: '.hero .go .btn', ru: 'Э́то уро́к.', a: 'urok', t: 'ده الدرس اللي عليه الدور. فيه جمل بصوت، حوارين من الحياة، قواعد، ألعاب وكويز. وكل مرة بيكمّل من مكان ما ' + g('وقفت', 'وقفتي') + '.' },
    { sel: '.lvchip', ru: 'Смотри́!', a: 'smotri', t: 'ده مستواك: А1 للمبتدئين، والمستويات اللي بعده. ' + g('دوس', 'دوسي') + ' عليه لو ' + g('عايز', 'عايزة') + ' ' + g('تغيّر', 'تغيّري') + '.' },
    { sel: function () { var s = document.querySelector('.tchips [data-streak]'); return s && s.closest('.chip'); }, ru: 'Моё перо́!', a: 'pero', t: 'ودي ريشتي. الريح خدت ريشي الدهب في السكة من روسيا لمصر، وكل يوم ' + g('تذاكر', 'تذاكري') + ' فيه ولو ١٠ دقايق ريشة بترجع. ٧ أيام ورا بعض وديلي كله ينوّر!' },
    { sel: '.tchips .bell', ru: 'Слу́шай!', a: 'slushay', t: function () { return isCode() ? 'الجرس: رسايل المدرس، ردوده على فويساتك، مواعيد الزووم، وتنبيه لما الكود يقرب يخلص.' : 'الجرس: رسايل وأخبار من المدرس.'; } },
    { sel: '.hs.ltr .poster', t: '٦ وحدات، وكل وحدة ٥ دروس. الرقم الصغير بيقولك ' + g('خلصت', 'خلصتي') + ' كام درس فيها.' },
    { sel: tabSel('library'), tap: true, ru: 'Пошли́!', a: 'poshli', t: 'يلا نروح المكتبة. ' + g('دوس', 'دوسي') + ' على «المكتبة» تحت.' },
    { go: '#library', sel: '.page a[href="#cases"]', t: 'هنا كورس «الحالات الإعرابية»: دروس قصيرة، كل استخدام في درس لوحده. وأي فعل تحته خط دهبي ' + g('دوس', 'دوسي') + ' عليه، وأنا أجيبلك تصريفه كله بالصوت.' },
    { sel: tabSel('practice'), tap: true, t: 'ودلوقتي أهم حاجة: الكلام. ' + g('دوس', 'دوسي') + ' على «' + g('اتكلم', 'اتكلمي') + '».' },
    { go: '#practice', sel: '.page .call', ru: 'Говори́!', a: 'govori', t: function () { return 'دي ليرا، صاحبتك الروسية بالذكاء الاصطناعي. ' + g('بتكلمك', 'بتكلمك') + ' شات' + (isCode() ? ' أو مكالمة بالصوت' : '') + ' على الدرس، وبتصحح غلطك بلطف. ولو ' + g('اتلخبطت', 'اتلخبطتي') + '، اللمبة بتقولك تقول إيه.'; } },
    { sel: '.page a[href="#ask"]', ru: 'Есть вопро́с?', a: 'vopros', t: 'عندك سؤال عن الروسي؟ «اسأل ليرا»: قواعد، كلمات، نطق، ثقافة، وجدول أي كلمة من القاموس.'.replace('عندك', g('عندك', 'عندِك')) },
    { sel: '.page a[href="#games"]', ru: 'Игра́ем!', a: 'igraem', t: 'ألعاب من دروسك: صياد التشديد، تحدي الدقيقة، الذاكرة، الإملاء، وزعيم الوحدة. الغلطة مش ' + g('بتخسّرك', 'بتخسّرك') + ' حاجة.' },
    { sel: tabSel('profile'), tap: true, t: 'آخر محطة: ' + g('دوس', 'دوسي') + ' على «حسابي».' },
    { go: '#profile', sel: '.pcard', ru: 'Вот твой код.', a: 'kod', skip: function () { return !isCode(); }, t: 'ده كودك: شغال لحد إمتى، وعلى كام موبايل. وأي درس ' + g('فتحته', 'فتحتيه') + ' بيفضل ' + g('معاك', 'معاكي') + ' حتى بعد ما الكود يخلص.' },
    { sel: '#replies', skip: function () { return !isCode(); }, t: 'وهنا ردود المدرس على الفويسات اللي ' + g('بتبعتها', 'بتبعتيها') + ' من الدروس.' },
    { go: '#profile', sel: '.set.gold[href="#unlock/0"]', ru: 'Смотри́!', a: 'smotri', skip: isCode, t: 'دلوقتي ' + g('معاك', 'معاكي') + ' الدرس ١ و ٢ ببلاش. لما المدرس ' + g('يبعتلك', 'يبعتلك') + ' كود على الواتساب، ' + g('اكتبه', 'اكتبيه') + ' هنا ويتفتح الكورس كله: ٣٠ درس، مكالمات مع ليرا، فويساتك توصل للمدرس ويرد ' + g('عليك', 'عليكي') + '، والفيديوهات كلها.' },
    { sel: '[data-act="tour"]', ru: 'Всё поня́тно?', a: 'ponyatno', t: g('ولو نسيت', 'ولو نسيتي') + ' حاجة، من هنا الجولة ترجع في أي وقت. ولو ' + g('عايز', 'عايزة') + ' ' + g('تخبيني', 'تخبيني') + '، الزرار تحتها.' },
    { sel: tabSel('home'), tap: true, t: 'يلا نرجع للرئيسية ونبدأ.' },
    { go: '#home', sel: '.hero .go .btn', tap: true, ru: 'Пое́хали!', a: 'poekhali', last: true, t: g('دوس', 'دوسي') + ' هنا ونبدأ الدرس سوا. وجوه الدرس هوريك كل جزء.'.replace('هوريك', g('هوريك', 'هوريكي')) }
  ];
}
var MINI = {
  lesson: function () { return [
    { sel: '.seg', ru: 'Смотри́!', a: 'smotri', first: true, t: 'الدرس متقسم لأجزاء، والشريط ده بيتسحب يمين وشمال. ' + g('امشي', 'امشي') + ' بالترتيب: من الفيديو لحد «الواجب والمزيد».' },
    { sel: byText('.seg button', ['جمل الدرس', 'الكلمات']), tap: true, t: function () { var b = byText('.seg button', ['جمل الدرس', 'الكلمات'])(); return g('دوس', 'دوسي') + ' على «' + (b ? b.textContent.trim() : 'جمل الدرس') + '».'; } },
    { sel: '#segbody .wrow', ru: 'Слу́шай!', a: 'slushay', t: 'كل جملة وكل كلمة جنبها ▶. ' + g('اسمعها', 'اسمعيها') + '، وبعدين ' + g('قولها', 'قوليها') + ' بصوت عالي. ده أهم بكتير من القراية بالعين.' },
    { sel: '.hero .topbar .chip', t: '٣ نجوم لكل درس: الحوار ١، والحوار ٢، والقراءة (أو الكلمات). ٣ نجوم = الدرس خلص.' },
    { sel: byText('.seg button', 'الكويز'), t: 'وفي الآخر الكويز. اللي ' + g('تغلط', 'تغلطي') + ' فيه بيرجعلك تاني يوم في «راجع غلطاتك» لحد ما يثبت.' },
    { sel: '#cat', ru: 'Молоде́ц!', a: 'molodets', last: true, t: 'ولو ' + g('احتجت', 'احتجتي') + ' نصيحة في أي صفحة، ' + g('دوس', 'دوسي') + ' عليّ.' }
  ]; },
  unit: function () { return [
    { sel: '.ep.now, .ep', ru: 'Смотри́!', a: 'smotri', first: true, t: 'الدرس اللي عليه الدور منوّر. القفل جنب الدرس يعني محتاج كود من المدرس.' },
    { sel: '.acts .big', last: true, t: 'وزرار التشغيل ده بيفتح أول درس ' + g('مخلصتوش', 'مخلصتيهوش') + ' على طول.' }
  ]; },
  games: function () { return [
    { sel: '#glist .gcard.hero', ru: 'Игра́ем!', a: 'igraem', first: true, t: '«تحدي الدقيقة»: خليط من كل الألعاب في ٦٠ ثانية. الكلمات بتيجي من الدروس اللي ' + g('فتحتها', 'فتحتيها') + '.' },
    { sel: '.gcard.boss', t: '«زعيم الوحدة»: بيفتح بعد ما ' + g('تبدأ', 'تبدئي') + ' ٣ دروس من الوحدة. ٣ جولات، وآخرها فويس للمدرس.' },
    { sel: '.album-link', t: 'كل كلمة ' + g('تجاوبها', 'تجاوبيها') + ' صح بتدخل ألبومك. ٣ مرات صح = إطار دهبي.' },
    { sel: '[data-set="gTimed"]', last: true, t: 'ولو ' + g('عايز', 'عايزة') + ' تحدي أكبر، ' + g('شغّل', 'شغّلي') + ' الوقت: ١٠ ثواني لكل سؤال.' }
  ]; },
  chat: function () { return [
    { sel: function () { return document.querySelector('#msgs > :first-child') || document.querySelector('.ch-top .who'); }, ru: 'Говори́!', a: 'govori', first: true, t: 'ليرا بتبدأ الكلام. ' + g('رد', 'ردي') + ' عليها بالروسي، ولو ' + g('غلطت', 'غلطتي') + ' هتقولك الصح وليه.' },
    { sel: '[data-act="ai-hint"]', t: g('اتلخبطت', 'اتلخبطتي') + '؟ اللمبة بتقولك تقول إيه، بس مش بتحل بدالك.' },
    { sel: '#ai-in', t: function () { return g('اكتب', 'اكتبي') + ' هنا بالروسي' + (document.querySelector('[data-act="ai-mic"]') ? '، أو ' + g('دوس', 'دوسي') + ' على الميكروفون و' + g('اتكلم', 'اتكلمي') : '') + '.'; } },
    { sel: '[data-act="trans"]', t: 'ده بيخبّي الترجمة العربي، عشان ' + g('تفهم', 'تفهمي') + ' بالروسي بس.' },
    { sel: '[data-act="ai-end"]', ru: 'Молоде́ц!', a: 'molodets', last: true, t: 'ولما ' + g('تخلص', 'تخلصي') + ' ' + g('دوس', 'دوسي') + ' «خلصت»: ليرا ' + g('هتديك', 'هتديكي') + ' نجوم، وأهم ٣ تصحيحات، والجمل اللي تحفظها.' }
  ]; },
  ask: function () { return [
    { sel: '.asugg button', ru: 'Есть вопро́с?', a: 'vopros', first: true, t: g('جرّب', 'جرّبي') + ' سؤال من دول، أو ' + g('اكتب', 'اكتبي') + ' سؤالك بالعربي أو بالروسي.' },
    { sel: '#ask-in', last: true, t: 'ليرا بتجاوب من دروس الكورس ومن قاموس فيه كل أشكال الكلمة. ولو حاجة مش واضحة، ' + g('اسأل', 'اسألي') + ' المدرس في الحصة.' }
  ]; },
  cases: function () { return [
    { sel: '.cs-intro', ru: 'Смотри́!', a: 'smotri', first: true, t: 'الحالات الست، كل استخدام في درس قصير: شرح، جدول، غلطات مشهورة، تمرين وكويز.' },
    { sel: '.cs details summary', t: 'الدروس متقسمة بالمستوى، وجوه كل مستوى بالحالة. مستواك مفتوح لوحده.' },
    { sel: '.cs-ep', last: true, t: g('ابدأ', 'ابدئي') + ' بدرس الحروف، وبعدين بالترتيب.' }
  ]; },
  caselesson: function () { return [
    { sel: '.vbw', ru: 'Смотри́!', a: 'smotri', first: true, t: 'الفعل اللي تحته خط دهبي ده سحري: ' + g('دوس', 'دوسي') + ' عليه، وأنا أطير أجيبلك تصريفه كله، وكل شكل بصوته.' },
    { sel: '.cs .seg', last: true, t: 'الدرس، والكويز، والفيديوهات الإضافية: كلهم من الشريط ده.' }
  ]; },
  pdd: function () { return [
    { sel: '.pd-top', ru: 'Смотри́!', a: 'smotri', first: true, t: 'الدايرة بتقولك ' + g('حفظت', 'حفظتي') + ' كام سؤال من الـ ٨٠٠.' },
    { sel: 'a[href="#pdd/today"]', t: 'تمرين النهارده: الجديد واللي لازم ترجعله. كل يوم من هنا.' },
    { sel: 'a[href="#pdd/exam"]', ru: 'Пое́хали!', a: 'poekhali', last: true, t: 'امتحان زي الحقيقي: ٢٠ سؤال، ٢٠ دقيقة، غلطتين بس.' }
  ]; }
};
function miniKey(r) {
  var n = r.name;
  if (n === 'lesson') return 'lesson';
  if (n === 'unit' || n === 'games' || n === 'chat' || n === 'ask') return n;
  if (n === 'cases') return r.arg ? (/\//.test(r.arg) ? '' : 'caselesson') : 'cases';
  if (n === 'pdd' && !r.arg && !A.pddOnly()) return 'pdd';
  return '';
}

/* ---------- the stage: dim + hole + four blockers + bubble ---------- */
function stage() {
  if (EL) return EL;
  EL = document.createElement('div'); EL.id = 'tour'; EL.setAttribute('role', 'dialog'); EL.setAttribute('aria-modal', 'true'); EL.setAttribute('aria-label', 'جولة مع ژارا');
  EL.innerHTML = '<i class="tr-hole"></i><i class="tr-b" data-b="t"></i><i class="tr-b" data-b="b"></i><i class="tr-b" data-b="l"></i><i class="tr-b" data-b="r"></i>' +
    '<div class="tr-bub"><div class="tr-hd"><span class="tr-ru ru"></span><button class="tr-say" aria-label="اسمع">▶</button><span class="tr-n ar"></span></div><p class="tr-t ar"></p><div class="tr-acts"></div></div>';
  document.body.appendChild(EL);
  EL.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tr]'); if (b) { e.preventDefault(); var k = b.dataset.tr; if (k === 'next') next(); else if (k === 'skip') end(true); else if (k === 'done') end(false); return; }
    if (e.target.closest('.tr-say')) { voice(T && T.steps[T.i]); return; }
    if (e.target.closest('.tr-b') && T && T.steps[T.i] && T.steps[T.i].tap) nudge();
  });
  return EL;
}
var AU = null;
function voice(st) {
  if (!st || !st.a) return;
  try { if (AU) AU.pause(); AU = new Audio('audio/tour/' + st.a + '.mp3'); AU.volume = .95; var p = AU.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
}
function nudge() { var h = EL.querySelector('.tr-hole'); h.classList.remove('nudge'); void h.offsetWidth; h.classList.add('nudge'); if (navigator.vibrate) try { navigator.vibrate(20); } catch (e) {} }
function place(el, st) {
  var W = innerWidth, H = innerHeight, hole = EL.querySelector('.tr-hole'), bub = EL.querySelector('.tr-bub'), pad = st.pad || 6;
  var r = el ? el.getBoundingClientRect() : null;
  if (r) { r = { l: Math.max(4, r.left - pad), t: Math.max(4, r.top - pad), r: Math.min(W - 4, r.right + pad), b: Math.min(H - 4, r.bottom + pad) }; }
  EL.classList.toggle('center', !r);
  var bs = EL.querySelectorAll('.tr-b');
  if (r) {
    hole.style.cssText = 'left:' + r.l + 'px;top:' + r.t + 'px;width:' + (r.r - r.l) + 'px;height:' + (r.b - r.t) + 'px';
    bs[0].style.cssText = 'left:0;top:0;width:100%;height:' + r.t + 'px';
    bs[1].style.cssText = 'left:0;top:' + r.b + 'px;width:100%;height:' + Math.max(0, H - r.b) + 'px';
    bs[2].style.cssText = 'left:0;top:' + r.t + 'px;width:' + r.l + 'px;height:' + (r.b - r.t) + 'px';
    bs[3].style.cssText = 'left:' + r.r + 'px;top:' + r.t + 'px;width:' + Math.max(0, W - r.r) + 'px;height:' + (r.b - r.t) + 'px';
  } else {
    hole.style.cssText = 'left:50%;top:50%;width:0;height:0';
    bs[0].style.cssText = 'left:0;top:0;width:100%;height:100%'; bs[1].style.cssText = bs[2].style.cssText = bs[3].style.cssText = 'width:0;height:0';
  }
  // the bubble: below the hole when it is in the upper half, above it otherwise; Жа́ра sits on the bubble's top edge
  var bw = Math.min(360, W - 32), bh = bub.offsetHeight || 150, bx = (W - bw) / 2, by, birdY;
  if (!r) { by = Math.max(80, (H - bh) / 2 + 20); }
  else if ((r.t + r.b) / 2 < H * .5) { by = Math.min(H - bh - 12, r.b + 62); }
  else { by = Math.max(70, r.t - bh - 18); }
  if (r && by < r.b && by + bh > r.t) { by = r.t > H - r.b ? Math.max(12, r.t - bh - 14) : Math.min(H - bh - 12, r.b + 14); }   // a tall target: never cover it
  bub.style.cssText = 'left:' + bx + 'px;top:' + by + 'px;width:' + bw + 'px';
  birdY = by - 22; var bxBird = bx + bw - 54;
  if (r && r.b > by - 50 && r.t < by) { birdY = r.t - 22; bxBird = Math.min(W - 40, Math.max(40, r.r - 24)); }   // no room above the bubble: on the target's top edge
  if (st.sel !== '#cat') A.bird.to(Math.max(40, Math.min(W - 40, bxBird)), Math.max(56, birdY));   // «tap me» stop: she stays inside her own spotlight
}
function waitFor(sel, ms) {
  return new Promise(function (res) {
    var t0 = Date.now();
    (function poll() { var el = q(sel); if (el && shown(el)) return res(el); if (Date.now() - t0 > ms) return res(null); setTimeout(poll, 120); })();
  });
}
function show(i) {
  if (!T) return;
  T.i = i; T.tapped = false; T.el = null;
  var st = T.steps[i];
  if (!st) { end(false); return; }
  if (st.skip && st.skip()) { show(i + 1); return; }
  if (st.go && location.hash !== st.go && !(st.go === '#home' && (location.hash === '' || location.hash === '#'))) { T.wait = 1; A.go(st.go); setTimeout(function () { if (T && T.i === i) { T.wait = 0; show2(i); } }, RM ? 250 : 700); return; }
  show2(i);
}
function show2(i) {
  var st = T.steps[i], token = T.token = (T.token || 0) + 1;
  EL.classList.add('busy');
  (st.sel ? waitFor(st.sel, st.wait || 2600) : Promise.resolve(null)).then(function (el) {
    if (!T || T.token !== token) return;
    if (st.sel && !el) { show(i + 1); return; }   // this screen has no such button (a free student, an older lesson…): the next stop
    var go = function () {
      if (!T || T.token !== token) return;
      T.el = el; fill(st, i); place(el, st); EL.classList.remove('busy'); EL.classList.toggle('tap', !!st.tap);
      if (!RM && el) { var rr = el.getBoundingClientRect(); A.embers(rr.left + rr.width / 2, rr.top, 10, 2, .5); }
      voice(st); A.chime(st.first ? [784, 1046.5, 1318.5] : [1318.5, 1568]);
    };
    if (el) {
      var r = el.getBoundingClientRect(), vis = r.top >= 60 && r.bottom <= innerHeight - 90 && r.left >= 0 && r.right <= innerWidth;
      if (!vis && el.id !== 'cat' && !el.closest('#tabs')) { el.scrollIntoView({ block: r.height > innerHeight * .5 ? 'start' : 'center', inline: 'center', behavior: RM ? 'auto' : 'smooth' }); setTimeout(go, RM ? 60 : 520); return; }   // also sideways: a tab at the end of the lesson's tab strip
    }
    go();
  });
}
function fill(st, i) {
  var real = T.steps.filter(function (s) { return !(s.skip && s.skip()); }), k = real.indexOf(st);
  var hd = EL.querySelector('.tr-hd'), ru = EL.querySelector('.tr-ru');
  ru.textContent = st.ru || 'Жа́ра'; hd.classList.toggle('nosay', !st.a);
  EL.querySelector('.tr-n').textContent = A.ad(k + 1) + ' من ' + A.ad(real.length);
  EL.querySelector('.tr-t').innerHTML = A.mix(typeof st.t === 'function' ? st.t() : st.t);
  var acts = EL.querySelector('.tr-acts');
  if (st.tap) acts.innerHTML = '<span class="tr-hint ar">👆 ' + g('دوس على الزرار المنوّر', 'دوسي على الزرار المنوّر') + '</span><button class="tr-skip ar" data-tr="skip">' + g('اقفل الجولة', 'اقفلي الجولة') + '</button>';
  else if (st.last) acts.innerHTML = '<button class="btn sm" data-tr="done">' + (T.kind === 'main' ? 'تمام، شكرًا يا ژارا' : 'تمام') + '</button>';
  else acts.innerHTML = '<button class="btn sm" data-tr="next">' + (st.first ? 'يلا بينا' : 'التالي') + '</button><button class="tr-skip ar" data-tr="skip">' + (st.first ? 'مش دلوقتي' : g('اقفل الجولة', 'اقفلي الجولة')) + '</button>';
}
function next() { if (T) show(T.i + 1); }
function seen() { var s = S(); s.tour = s.tour || { seen: {} }; s.tour.seen = s.tour.seen || {}; return s.tour; }
function start(kind, opts) {
  if (T) return;
  var steps = kind === 'main' ? mainSteps() : (MINI[kind] ? MINI[kind]() : null);
  if (!steps || !steps.length) return;
  T = { kind: kind, steps: steps, i: 0, opts: opts || {} };
  stage(); document.body.classList.add('tour-on');
  A.bird.show();
  requestAnimationFrame(function () { EL.classList.add('in'); show(0); });
}
function end(skipped) {
  if (!T) return;
  var k = T.kind, tr = seen();
  if (k === 'main') { tr.main = skipped ? 'skip' : 'done'; S().catMet = 1; } else tr.seen[k] = skipped ? 'skip' : 1;
  A.store();
  var last = T.steps[T.i], tapEnd = last && last.tap && T.tapped;
  T = null; if (AU) try { AU.pause(); } catch (e) {}
  EL.classList.remove('in', 'tap'); document.body.classList.remove('tour-on');
  setTimeout(function () { if (!T) { A.bird.home(); if (skipped && k === 'main') A.say(g('ماشي! لو ' + 'حبيت', 'ماشي! لو حبيتي') + ' الجولة بعدين، هتلاقيها في «حسابي».', 5500); } }, tapEnd ? 900 : 300);
  setTimeout(function () { if (!T) screen(A.route()); }, tapEnd ? 1500 : 900);   // e.g. the first tour ends inside Lesson 1: its own mini-tour follows
}
/* a tap on the real button at a «tap» stop: let it act, then go on (a link changes the page; the next stop waits for it) */
document.addEventListener('click', function (e) {
  if (!T || !T.el || T.tapped || !T.steps[T.i].tap) return;
  if (!(T.el === e.target || T.el.contains(e.target))) return;
  T.tapped = true; EL.classList.add('busy');
  var i = T.i, st = T.steps[i];
  setTimeout(function () { if (!T || T.i !== i) return; if (st.last) end(false); else show(i + 1); }, RM ? 300 : 760);
}, true);
['resize', 'scroll'].forEach(function (ev) { window.addEventListener(ev, function () { if (T && T.el && !EL.classList.contains('busy')) { if (!document.body.contains(T.el)) return; place(T.el, T.steps[T.i]); } }, { passive: true }); });
document.addEventListener('keydown', function (e) { if (T && e.key === 'Escape') end(true); });
window.addEventListener('hashchange', function () {   // the student left the tour's page another way (back button…): find the stop again on the new page
  if (!T || T.tapped || T.wait) return; var i = T.i; setTimeout(function () { if (T && T.i === i && !T.tapped && !T.wait) show(i); }, RM ? 300 : 760);
});

/* ---------- when ---------- */
function screen(r) {
  if (T || !S().onboarded || document.getElementById('splash') || (window.NINTRO && !NINTRO.done)) return;
  var tr = seen();
  if (!tr.main && r.name === 'home') { setTimeout(function () { if (!T && A.route().name === 'home') start('main'); }, 900); return; }
  if (!tr.main || S().noCat) return;   // the first tour comes first; a student who hid Жа́ра gets no mini-tours (the replay button still works)
  var k = miniKey(r); if (!k || tr.seen[k]) return;
  setTimeout(function () { if (!T && miniKey(A.route()) === k && !seen().seen[k]) start(k); }, 1300);
}
function init(api) {
  A = api; var s = S();
  if (!s.tour) { s.tour = { seen: {} }; if (s.onboarded) { s.tour.main = 'old'; s.tour.news = 1; } A.store(); }   // a phone that used the app before the tour: no first tour, one line about the replay button
}
function news() { var tr = seen(); if (tr.news && !T) { tr.news = 0; A.store(); setTimeout(function () { A.say('جديد: ' + g('لو عايز', 'لو عايزة') + ' أفرّجك على التطبيق كله، ' + g('دوس', 'دوسي') + ' «جولة مع ژارا» في «حسابي».', 7500); }, 2500); return true; } return false; }
window.NTOUR = { init: init, start: start, screen: screen, news: news, on: function () { return !!T; }, end: end };
})();
