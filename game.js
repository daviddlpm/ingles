"use strict";
/* ============================================================
   EL REINO DEL INGLÉS · lógica del juego
   ============================================================ */

/* ---------- Utilidades ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const article = w => /^[aeiou]/i.test(w) ? 'an' : 'a';
const norm = s => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9áéíóúñü\s]/g, ' ').replace(/\s+/g, ' ').trim();
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ---------- Estado y guardado ---------- */
const KEY = 'reinoInglesV2';
const DEFAULT = () => ({
  v: 2, name: '', hero: 'knight', created: false, introSeen: false, bossDone: false,
  missions: {}, words: {}, coins: 5, lastChest: '', chestItems: {},
  settings: { music: true, sfx: true, voice: true, mic: true, night: false, full: true }
});
let state = DEFAULT();
let storageOK = true;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      state = Object.assign(DEFAULT(), o);
      state.settings = Object.assign(DEFAULT().settings, o.settings || {});
    }
  } catch (e) { storageOK = false; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { if (storageOK) { storageOK = false; toast('⚠️ Este navegador no permite guardar el progreso'); } }
}
const mstat = id => state.missions[id] || { stars: 0, pct: 0, plays: 0 };
const totalStars = () => MISSIONS.reduce((s, m) => s + mstat(m.id).stars, 0);
const isDone = id => mstat(id).stars >= 1;
const isUnlocked = id => id === 1 || isDone(id - 1);
function nextMissionId() { for (const m of MISSIONS) if (!isDone(m.id)) return m.id; return null; }
const fillName = s => s.replace(/\{name\}/g, state.name || 'valiente');
const heroObj = () => HEROES.find(h => h.id === state.hero) || HEROES[0];
const weakScore = w => { const r = state.words[w.key]; return r ? r.ko - r.ok * 0.5 : 0; };
function recordWord(w, ok) {
  const r = state.words[w.key] || (state.words[w.key] = { ok: 0, ko: 0 });
  if (ok) r.ok++; else r.ko++;
}
const learnedWords = () => ALL_WORDS.filter(w => isDone(w.mid));

/* ---------- Elementos base ---------- */
const app = $('#app'), hdr = $('header'), curtainEl = null;
let curScreen = 'title', layoutKind = 'title', curNpcE = null;
let modals = [];
let cleanups = [];
let typer = null;

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
}
function modal(html, o) {
  o = o || {};
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = '<div class="modal">' + html + '</div>';
  document.body.appendChild(ov);
  ov.dismiss = o.dismiss !== false;
  ov.close = () => { ov.remove(); modals = modals.filter(m => m !== ov); };
  modals.push(ov);
  return ov;
}
function floaty(txt, el) {
  const r = (el || app).getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'floaty'; f.textContent = txt;
  f.style.left = (r.left + r.width / 2 - 16) + 'px'; f.style.top = (r.top + r.height / 3) + 'px';
  document.body.appendChild(f); setTimeout(() => f.remove(), 1200);
}

function updateHeader() {
  $('#heroAv').textContent = heroObj().avatar;
  $('#starN').textContent = '⭐ ' + totalStars();
  $('#coinN').textContent = '🪙 ' + state.coins;
  $('#nameTxt').textContent = state.name || 'Reino del Inglés';
}
function bump(id) { const e = $(id); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.night ? 'night' : 'day';
  document.body.dataset.night = state.settings.night ? '1' : '0';
  Stage.setNight(state.settings.night);
}

/* ---------- Escenario: composición según pantalla ---------- */
const FRAC = { title: 0.5, create: 0.44, map: 0.3, ex: 0.34 };
const isLand = () => window.innerWidth >= 640 && window.innerWidth / window.innerHeight >= 1.15;

function stageRect() {
  const W = window.innerWidth, H = window.innerHeight, y0 = hdr.getBoundingClientRect().bottom;
  if (isLand()) return { x0: 0, y0: y0, x1: W * 0.4, y1: H - 8 };
  return { x0: 0, y0: y0, x1: W, y1: Math.max(y0 + 150, H * (FRAC[layoutKind] || 0.34)) };
}
function applyStage() {
  document.body.classList.toggle('land', isLand());
  const r = stageRect();
  const sp = $('.stage-spacer');
  if (sp) sp.style.height = isLand() ? '0px' : Math.max(0, r.y1 - r.y0 + 8) + 'px';
  if (Stage.ok) Stage.setLayout(r);
  else {
    const f = $('#stageFallback');
    f.style.left = r.x0 + 'px'; f.style.top = r.y0 + 'px'; f.style.width = (r.x1 - r.x0) + 'px'; f.style.height = (r.y1 - r.y0) + 'px';
  }
}
function showNpc(npc) {
  const e = npc ? npc.e : null;
  if (e === curNpcE) return;
  curNpcE = e;
  Stage.setNPC(e);
  const f = $('#stageFallback');
  f.innerHTML = '<span>' + heroObj().avatar + '</span>' + (e ? '<span>' + e + '</span>' : '');
}
function setStage(o) {
  layoutKind = o.kind || 'map';
  Stage.setBiome(o.biome || 'meadow');
  Stage.setHero(state.hero);
  curNpcE = undefined; showNpc(o.npc || null);
}

function cleanup() { cleanups.forEach(f => { try { f(); } catch (e) {} }); cleanups = []; }
function stopAll() { stopSR(); Voice.cancel(); if (typer) { clearInterval(typer); typer = null; } }
function screen(html, name) {
  stopAll(); cleanup();
  if (name) curScreen = name;
  app.innerHTML = '<div class="stage-spacer"></div>' + html;
  app.scrollTop = 0;
  applyStage();
}

/* ---------- Reconocimiento de voz ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let activeSR = null, micBlocked = false;
const srOK = () => !!SR && state.settings.mic && !micBlocked;
function stopSR() {
  if (activeSR) { const r = activeSR; activeSR = null; try { r.onresult = r.onerror = r.onend = null; r.abort(); } catch (e) {} }
}
const HOMO = {
  one: ['won', '1'], two: ['to', 'too', '2'], three: ['tree', '3'], four: ['for', 'fore', '4'], five: ['5'], six: ['6', 'sex'],
  seven: ['7'], eight: ['ate', '8'], nine: ['9', 'nein'], ten: ['10'], no: ['know', 'now'], red: ['read'], read: ['red'],
  blue: ['blew'], eat: ['it'], sea: ['see', 'c'], pear: ['pair'], bear: ['bare'], sun: ['son'], write: ['right']
};
function speechMatches(target, alts) {
  const t = norm(target), tt = t.split(' ');
  for (const alt of alts) {
    const a = norm(alt); if (!a) continue;
    if (a === t) return true;
    const at = a.split(' ');
    if (tt.length === 1) {
      if (at.indexOf(t) >= 0) return true;
      const h = HOMO[t]; if (h && at.some(x => h.indexOf(x) >= 0)) return true;
    } else {
      const hit = tt.filter(x => at.indexOf(x) >= 0).length;
      if (hit / tt.length >= 0.7) return true;
    }
  }
  return false;
}

/* ============================================================
   GENERADOR DE EJERCICIOS
   ============================================================ */
const faceOf = (w, abs) => abs ? '<span class="face-es">' + esc(w.es) + '</span>' : '<span class="face-e">' + w.e + '</span>';
const sayBtn = (t, mini) => '<button class="speak-btn' + (mini ? ' mini' : '') + '" data-say="' + esc(t) + '" aria-label="Escuchar">🔊</button>';
const bigWord = t => '<div class="big-word' + (t.length > 14 ? ' long' : '') + '">' + esc(t) + '</div>';
const missionOf = w => MISSIONS[w.mid - 1];

function sentenceOf(w) {
  if (w.en.split(' ').length >= 3) return w.en;
  const M = missionOf(w);
  return M.frame ? M.frame.replace('{a}', article(w.en)).replace('{}', w.en) : null;
}

function canUse(type, w) {
  const M = missionOf(w);
  switch (type) {
    case 'seePick': return !w.abs;
    case 'fill': return !!M.frame;
    case 'count': return M.special === 'numbers';
    case 'math': return M.special === 'numbers' && w.n >= 2;
    case 'spell': return /^[a-z]{3,8}$/i.test(w.en);
    case 'order': { const s = sentenceOf(w); return !!s && s.split(' ').length >= 3; }
    case 'speak': return srOK();
    default: return true;
  }
}

function distractors(w, n, pool) {
  const seen = new Set([w.en, w.e, w.es]), out = [];
  for (const c of shuffle(pool)) {
    if (seen.has(c.en) || seen.has(c.e) || seen.has(c.es)) continue;
    out.push(c); seen.add(c.en); seen.add(c.e); seen.add(c.es);
    if (out.length >= n) break;
  }
  return out;
}

const PROMPT = {
  listenPick: '¿Qué palabra has oído?', readPick: 'Toca la carta de esta palabra', seePick: '¿Cómo se dice en inglés?',
  translate: '¿Cómo se dice en inglés?', fill: 'Completa la frase', count: '¿Cuántos hay? Toca el número en inglés',
  math: 'Resuelve la suma', spell: 'Forma la palabra', order: 'Ordena la frase', speak: 'Escucha y repite en voz alta',
  match: 'Une cada palabra con su pareja'
};

function mkEx(type, w, o) {
  o = o || {};
  if (!canUse(type, w)) type = 'translate';
  const M = missionOf(w), n = o.n || 3;
  const pool = o.wide ? ALL_WORDS : M.words;
  const st = { kind: 'ex', type: type, w: w, retry: !!o.retry, retryable: !o.retry, said: w.en };
  const tiles = () => shuffle([w].concat(distractors(w, n - 1, pool.filter(c => c.abs === w.abs)))).map(c => ({ html: faceOf(c, w.abs), correct: c === w, cls: 'tile' }));
  const texts = () => shuffle([w].concat(distractors(w, n - 1, pool))).map(c => ({ html: esc(c.en), correct: c === w, cls: 'text' }));
  switch (type) {
    case 'listenPick': st.options = tiles(); st.auto = w.en; st.top = sayBtn(w.en); break;
    case 'readPick': st.options = tiles(); st.top = bigWord(w.en) + sayBtn(w.en, true); break;
    case 'seePick': st.options = texts(); st.top = '<div class="big-face">' + w.e + '</div>'; break;
    case 'translate': st.options = texts(); st.top = bigWord(w.es); break;
    case 'fill': {
      const s = M.frame.replace('{a}', article(w.en));
      const shown = esc(s).replace('{}', '<u>&nbsp;</u>');
      st.said = s.replace('{}', w.en);
      st.options = texts();
      st.top = (w.abs ? '<div class="big-face sm-es">(' + esc(w.es) + ')</div>' : '<div class="big-face sm">' + w.e + '</div>') + '<div class="sentence">' + shown + '</div>';
      break;
    }
    case 'count': {
      const item = pick(['🐑', '⭐', '🍎', '🐟', '🛡️']);
      st.options = texts(); st.top = '<div class="dots">' + item.repeat(w.n) + '</div>'; break;
    }
    case 'math': {
      const sum = w.n, a = rnd(1, sum - 1), b = sum - a;
      const wa = M.words[a - 1].en, wb = M.words[b - 1].en;
      const cand = shuffle([sum - 2, sum - 1, sum + 1, sum + 2].filter(v => v >= 1 && v <= 10)).slice(0, 2);
      st.options = shuffle([sum].concat(cand)).map(v => ({ html: String(v), correct: v === sum, cls: 'text' }));
      st.top = '<div class="sentence">' + wa + ' + ' + wb + ' = ?</div>' + sayBtn(wa + ' plus ' + wb, true);
      st.said = wa + ' plus ' + wb + ' is ' + w.en; break;
    }
    case 'spell': st.top = (w.abs ? '' : '<div class="big-face">' + w.e + '</div>') + sayBtn(w.en, true); st.auto = w.en; break;
    case 'order': {
      st.sentence = sentenceOf(w); st.said = st.sentence;
      st.top = (w.abs || w.en.split(' ').length >= 3 ? '<div class="big-face sm-es">' + esc(w.es) + '</div>' : '<div class="big-face sm">' + w.e + '</div>') + sayBtn(st.sentence, true);
      break;
    }
    case 'speak': st.auto = w.en; break;
  }
  return st;
}
function mkMatch(words) {
  const w0 = words[0];
  return { kind: 'ex', type: 'match', w: w0, words: words, abs: w0.abs, retryable: false, said: null };
}

/* Asigna a cada "hueco" (lista de tipos posibles) la primera palabra que lo admita */
function assignExercises(words, slots, o) {
  const used = new Set(), out = [];
  slots.forEach(types => {
    let p = null;
    outer: for (const w of words) {
      if (used.has(w.key)) continue;
      for (const t of types) if (canUse(t, w)) { p = [t, w]; break outer; }
    }
    if (!p) p = ['listenPick', words.find(x => !used.has(x.key)) || words[0]];
    used.add(p[1].key);
    out.push(mkEx(p[0], p[1], o));
  });
  return out;
}

function planRound(G, m, variant) {
  const s = shuffle(G);
  const speakOr = w => srOK() ? mkEx('speak', w) : mkEx('readPick', w);
  const match = mkMatch(shuffle(G).slice(0, 4));
  if (variant === 'A') {
    return [
      mkEx('listenPick', s[0]),
      canUse('seePick', s[1]) ? mkEx('seePick', s[1]) : mkEx('translate', s[1]),
      match,
      speakOr(s[2]),
      m.special === 'numbers' ? mkEx('count', s[3]) : m.frame ? mkEx('fill', s[3]) : mkEx('translate', s[3])
    ];
  }
  return [
    mkEx('readPick', s[0]),
    canUse('spell', s[1]) ? mkEx('spell', s[1]) : mkEx('translate', s[1]),
    match,
    speakOr(s[2]),
    m.special === 'numbers' ? (canUse('math', s[3]) ? mkEx('math', s[3]) : mkEx('translate', s[3])) : canUse('order', s[3]) ? mkEx('order', s[3]) : mkEx('translate', s[3])
  ];
}

function trialExercises(m) {
  const fails = m.words.filter(w => session && session.fails.has(w.key));
  const rest = m.words.filter(w => fails.indexOf(w) < 0);
  const pool = shuffle(fails).concat(shuffle(rest));
  return assignExercises(pool, [['listenPick'], ['math', 'fill', 'translate'], ['spell', 'order', 'translate'], ['speak', 'readPick'], ['translate', 'seePick', 'listenPick']], { n: 4 });
}

function planMission(m) {
  const A = m.words.slice(0, 5), B = m.words.slice(5);
  const steps = [{ kind: 'dialogue', lines: m.intro.map(t => ({ who: m.npc, text: t })), btn: '¡Empezamos!' }];
  steps.push({ kind: 'learn', words: A, label: 'Primera parte' });
  planRound(A, m, 'A').forEach(x => steps.push(x));
  steps.push({ kind: 'learn', words: B, label: 'Segunda parte' });
  planRound(B, m, 'B').forEach(x => steps.push(x));
  steps.push({ kind: 'dialogue', lines: [{ who: m.npc, text: '¡Muy bien, {name}! Ahora viene la Prueba del Guardián con todas las palabras mezcladas.' }], btn: '¡Estoy listo!' });
  steps.push({ kind: 'gen', count: 5, build: () => trialExercises(m) });
  return steps;
}

/* ============================================================
   SESIONES (misión, reto diario, jefe final)
   ============================================================ */
let session = null;

function startSession(cfg) {
  const base = cfg.steps.reduce((n, s) => n + (s.kind === 'ex' ? 1 : s.kind === 'gen' ? s.count : 0), 0);
  session = {
    cfg: cfg, i: 0, steps: cfg.steps.slice(), points: 0, total: base, gemCount: base, exCount: 0, gems: [], fails: new Set(),
    guided: new Set(), hearts: cfg.hearts || 0, bossHp: base, bossMax: base, defeated: false
  };
  setStage({ biome: cfg.biome, npc: cfg.npc, kind: 'ex' });
  curScreen = 'session';
  nextStep();
}

function nextStep() {
  const s = session; if (!s) return;
  if (s.defeated || s.i >= s.steps.length) return finishSession();
  const st = s.steps[s.i++];
  if (st.kind === 'gen') { s.steps.splice.apply(s.steps, [s.i, 0].concat(st.build())); return nextStep(); }
  if (st.kind === 'dialogue') return renderDialogue(st, nextStep);
  if (st.kind === 'learn') { showNpc(s.cfg.npc); return renderLearn(st); }
  showNpc(s.cfg.npc);
  renderEx(st);
}

function finishSession() {
  const s = session; stopAll();
  s.cfg.onFinish(s);
}

function hud() {
  const s = session, c = s.cfg;
  let right;
  if (c.kind === 'boss') {
    right = '<div class="boss-bars"><span class="hearts">' + '❤️'.repeat(Math.max(0, s.hearts)) + '🖤'.repeat(Math.max(0, c.hearts - s.hearts)) +
      '</span><div class="hp" title="Rey Oscuro"><i style="width:' + Math.round(s.bossHp / s.bossMax * 100) + '%"></i></div></div>';
  } else {
    right = '<div class="gems">' + Array.from({ length: s.gemCount }, (_, i) => '<i class="gem ' + (s.gems[i] || (i === s.exCount ? 'cur' : '')) + '"></i>').join('') + '</div>';
  }
  return '<div class="hud"><span class="ttl">' + esc(c.title) + '</span>' + right + '</div>';
}

function askExit(after) {
  const ov = modal('<div class="bigemo">🏰</div><h2>¿Salir de la misión?</h2><p class="muted">Si sales ahora, perderás lo que llevas de esta misión.</p>' +
    '<div class="row"><button class="btn green" id="exStay">Seguir jugando</button><button class="btn red" id="exGo">Salir</button></div>');
  $('#exStay', ov).onclick = () => ov.close();
  $('#exGo', ov).onclick = () => { ov.close(); session = null; stopAll(); after(); };
}

/* ---------- Diálogo ---------- */
function renderDialogue(st, onDone) {
  let i = 0; const lines = st.lines;
  const first = lines[0].who || st.npc;
  showNpc(first);
  screen('<div class="panel dialog" id="dlg"><div class="plate" id="plate"></div><div class="say" id="say"></div><div class="tap" id="tapHint"></div>' +
    '<div class="row"><button class="btn big green" id="dnext"></button></div></div>');
  let full = '', ended = false;
  function show() {
    const L = lines[i], who = L.who || st.npc;
    showNpc(who);
    full = fillName(L.text);
    $('#plate').textContent = who.name;
    const last = i >= lines.length - 1;
    $('#dnext').textContent = last ? (st.btn || '¡Adelante!') : 'Siguiente ▶';
    $('#tapHint').textContent = last ? '' : 'Toca para seguir';
    const say = $('#say'); say.textContent = '';
    if (typer) clearInterval(typer);
    let k = 0;
    typer = setInterval(() => { k++; say.textContent = full.slice(0, k); if (k >= full.length) { clearInterval(typer); typer = null; } }, 20);
    if (state.settings.voice) Voice.speak(full, 'es-ES');
    Stage.anim('npc', 'cheer');
  }
  $('#dlg').onclick = () => {
    if (ended) return;
    Snd.sfx('tap');
    if (typer) { clearInterval(typer); typer = null; $('#say').textContent = full; return; }
    i++;
    if (i >= lines.length) { ended = true; Voice.cancel(); onDone(); } else show();
  };
  show();
}

/* ---------- Aprender: cartas ---------- */
function renderLearn(st) {
  const s = session, W = st.words, long = W.some(w => w.en.length > 12);
  screen(hud() + '<div class="panel"><div class="ex-top"><span class="ex-tag">📚 ' + esc(st.label) + ' · ¡Aprende!</span></div>' +
    '<div class="ex-prompt">Toca cada carta, escucha y repite en voz alta</div>' +
    '<div class="learn-grid ' + (long ? 'learn-list' : '') + '">' +
    W.map((w, i) => '<button class="lcard" data-i="' + i + '"><div class="e">' + w.e + '</div><div class="en">' + esc(w.en) + '</div><div class="es">' + esc(w.es) + '</div></button>').join('') +
    '</div><div class="ex-fb" id="lfb">Cartas escuchadas: 0 / ' + W.length + '</div>' +
    '<button class="btn big green" id="lnext" disabled>Continuar ➡</button></div>');
  const heard = new Set();
  $$('.lcard').forEach(c => c.onclick = () => {
    const w = W[+c.dataset.i]; Voice.speak(w.en, 'en-US'); Snd.sfx('tap');
    Stage.anim('hero', 'wave'); c.classList.add('heard'); heard.add(w.key);
    $('#lfb').textContent = 'Cartas escuchadas: ' + heard.size + ' / ' + W.length;
    if (heard.size === W.length) { $('#lnext').disabled = false; $('#lfb').className = 'ex-fb ok'; $('#lfb').textContent = '¡Muy bien! Ya puedes continuar'; Snd.sfx('good'); }
  });
  $('#lnext').onclick = () => { Snd.sfx('whoosh'); nextStep(); };
  if (state.settings.voice && !s.guided.has('learn')) { s.guided.add('learn'); setTimeout(() => Voice.speak('Toca cada carta para escucharla, y repítela en voz alta.', 'es-ES'), 250); }
}

/* ---------- Ejercicio: armazón común ---------- */
function renderEx(st) {
  const s = session, info = TYPE_INFO[st.type];
  screen(hud() + '<div class="panel"><div class="ex-top"><span class="ex-tag">' + info.icon + ' ' + info.name + (st.retry ? ' · Repaso' : '') +
    '</span><button class="hint-btn" id="hintBtn" hidden>💡 Pista · 1🪙</button></div>' +
    '<div class="ex-prompt" id="prompt">' + PROMPT[st.type] + '</div><div id="exBody"></div>' +
    '<div class="ex-fb" id="exFb" aria-live="polite"></div>' +
    '<div class="ex-actions"><button class="btn big green" id="nextBtn" hidden>Siguiente ➡</button></div></div>');

  const hintBtn = $('#hintBtn'), fb = $('#exFb');
  const api = {
    st: st, body: $('#exBody'), fb: fb, finished: false, hinted: false,
    onHint(fn) {
      hintBtn.hidden = false;
      hintBtn.onclick = () => {
        if (api.finished) return;
        if (state.coins < 1) { toast('Necesitas monedas 🪙. ¡Las ganas completando misiones!'); return; }
        state.coins--; api.hinted = true; save(); updateHeader(); bump('#coinN'); Snd.sfx('coin'); fn();
      };
    },
    finish(credit, o) {
      o = o || {};
      if (api.finished) return; api.finished = true; hintBtn.disabled = true;
      if (api.hinted) credit = Math.min(credit, 0.5);
      const good = o.soft ? true : credit >= 0.5;
      const w = st.w;
      if (o.skipped) {
        if (!st.retry) { s.total--; s.gems[s.exCount] = 'y'; s.exCount++; }
        fb.className = 'ex-fb'; fb.innerHTML = 'Nos lo saltamos, ¡sin problema!';
      } else {
        if (!st.retry) { s.points += credit; s.gems[s.exCount] = credit >= 0.85 ? 'g' : credit >= 0.5 ? 'y' : 'r'; }
        if (!o.soft) (o.words || [[w, good]]).forEach(p => { recordWord(p[0], p[1]); if (!p[1]) s.fails.add(p[0].key); else if (st.retry) s.fails.delete(p[0].key); });
        if (good) {
          Snd.sfx('good'); Snd.buzz(25); Stage.anim('hero', 'cheer'); Stage.anim('npc', 'cheer'); Stage.burst('hero'); floaty('⭐', fb);
          fb.className = 'ex-fb ok';
          fb.innerHTML = o.soft ? '¡Bien intentado!<small>Se dice: <b>' + esc(st.said) + '</b></small>' : pick(PRAISE) + (credit < 1 ? '<small>¡Lo has conseguido!</small>' : '');
        } else {
          Snd.sfx('bad'); Stage.anim('hero', 'sad');
          fb.className = 'ex-fb no';
          fb.innerHTML = pick(MISSED) + (st.said ? '<small>Se dice: <b>' + esc(st.said) + '</b></small>' : '');
        }
        if (s.cfg.kind === 'boss') {
          if (good) { s.bossHp = Math.max(0, s.bossHp - 1); Snd.sfx('hit'); }
          else { s.hearts--; if (s.hearts <= 0) s.defeated = true; }
          const hp = $('.hp > i'); if (hp) hp.style.width = Math.round(s.bossHp / s.bossMax * 100) + '%';
          const hh = $('.hearts'); if (hh) hh.textContent = '❤️'.repeat(Math.max(0, s.hearts)) + '🖤'.repeat(Math.max(0, s.cfg.hearts - s.hearts));
        }
        if (!st.retry) s.exCount++;
        const gemsEl = $('.gems'); if (gemsEl) $$('.gem', gemsEl).forEach((g, i) => { g.className = 'gem ' + (s.gems[i] || (i === s.exCount ? 'cur' : '')); });
        if (!good && st.retryable && !s.cfg.noRetry) {
          const alt = ['listenPick', 'seePick', 'readPick'].filter(t => t !== st.type && canUse(t, w));
          s.steps.push(mkEx(pick(alt.length ? alt : ['listenPick']), w, { retry: true }));
          fb.querySelector('small') ? fb.querySelector('small').insertAdjacentHTML('beforeend', ' · Lo repasaremos luego') : (fb.innerHTML += '<small>Lo repasaremos luego</small>');
        }
        save();
        if (st.said && !o.noSpeak) Voice.speak(st.said, 'en-US');
      }
      const last = s.i >= s.steps.length;
      const nb = $('#nextBtn'); nb.hidden = false;
      nb.textContent = (s.defeated || last) ? 'Continuar ➡' : 'Siguiente ➡';
      nb.onclick = () => { nb.disabled = true; Snd.sfx('whoosh'); nextStep(); };
      setTimeout(() => { try { nb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }, 120);
    }
  };

  const R = { listenPick: rChoice, readPick: rChoice, seePick: rChoice, translate: rChoice, fill: rChoice, count: rChoice, math: rChoice,
    match: rMatch, spell: rSpell, order: rOrder, speak: rSpeak };
  const start = () => R[st.type](st, api);
  // instrucción hablada la primera vez que aparece cada tipo de ejercicio
  if (state.settings.voice && !s.guided.has(st.type)) {
    s.guided.add(st.type);
    start();
    Voice.speak(info.help, 'es-ES', () => { if (!api.finished && st.auto && session === s) Voice.speak(st.auto, 'en-US'); });
  } else {
    start();
    if (st.auto) setTimeout(() => { if (!api.finished && session === s) Voice.speak(st.auto, 'en-US'); }, 350);
  }
}

/* ---------- Elegir entre opciones ---------- */
function rChoice(st, api) {
  const n = st.options.length;
  const long = st.options.some(o => o.cls === 'text' && o.html.length > 22);
  const cols = long ? 1 : (n === 4 ? 2 : n);
  api.body.innerHTML = st.top + '<div class="opts" style="--cols:' + cols + '">' +
    st.options.map((o, i) => '<button class="opt ' + o.cls + '" data-i="' + i + '">' + o.html + '</button>').join('') + '</div>';
  let tries = 0;
  const btns = $$('.opt', api.body);
  btns.forEach(b => b.onclick = () => {
    if (api.finished || b.classList.contains('gone')) return;
    const o = st.options[+b.dataset.i];
    if (o.correct) {
      b.classList.add('ok'); btns.forEach(x => x.disabled = true);
      api.finish(tries === 0 ? 1 : 0.5);
    } else {
      tries++; b.classList.add('bad'); b.disabled = true; Snd.sfx('bad'); Stage.anim('hero', 'sad');
      if (tries >= 2) {
        btns.forEach(x => { x.disabled = true; if (st.options[+x.dataset.i].correct) x.classList.add('ok'); });
        api.finish(0);
      } else { api.fb.className = 'ex-fb no'; api.fb.textContent = pick(TRY_AGAIN); }
    }
  });
  api.onHint(() => {
    const wrong = btns.filter(b => !st.options[+b.dataset.i].correct && !b.classList.contains('gone') && !b.disabled);
    if (wrong.length) wrong[0].classList.add('gone');
    if (wrong.length <= 1) $('#hintBtn').disabled = true;
  });
}

/* ---------- Une parejas ---------- */
function rMatch(st, api) {
  const W = st.words, abs = st.abs;
  const L = shuffle(W), Rg = shuffle(W);
  const long = W.some(w => w.en.length > 14);
  api.body.innerHTML = '<div class="match"><div class="col" id="mL">' +
    L.map(w => '<button class="opt text ' + (long ? 'long' : '') + '" data-k="' + esc(w.key) + '">' + esc(w.en) + '</button>').join('') +
    '</div><div class="col" id="mR">' +
    Rg.map(w => '<button class="opt tile ' + (abs && long ? 'long' : '') + '" data-k="' + esc(w.key) + '">' + faceOf(w, abs) + '</button>').join('') + '</div></div>';
  let sel = null, matched = 0, mistakes = 0; const errs = {};
  $$('#mL .opt').forEach(b => b.onclick = () => {
    if (api.finished) return;
    $$('#mL .opt').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = b;
    Voice.speak(W.find(w => w.key === b.dataset.k).en, 'en-US'); Snd.sfx('tap');
  });
  $$('#mR .opt').forEach(b => b.onclick = () => {
    if (api.finished) return;
    if (!sel) { api.fb.className = 'ex-fb'; api.fb.textContent = 'Toca primero una palabra 👈'; return; }
    if (sel.dataset.k === b.dataset.k) {
      sel.classList.remove('sel'); sel.classList.add('done'); b.classList.add('done'); Snd.sfx('good'); floaty('✨', b);
      sel = null; matched++; api.fb.textContent = '';
      if (matched === W.length) {
        const credit = mistakes === 0 ? 1 : mistakes === 1 ? 0.75 : mistakes === 2 ? 0.5 : 0.3;
        api.finish(credit, { words: W.map(w => [w, !errs[w.key]]), noSpeak: true });
      }
    } else {
      mistakes++; errs[sel.dataset.k] = 1; Snd.sfx('bad');
      const a = sel; a.classList.add('bad'); b.classList.add('bad');
      setTimeout(() => { a.classList.remove('bad', 'sel'); b.classList.remove('bad'); }, 420);
      sel = null; api.fb.className = 'ex-fb no'; api.fb.textContent = 'Esas no son pareja. ¡Prueba otra vez!';
    }
  });
}

/* ---------- Formar la palabra ---------- */
function rSpell(st, api) {
  const word = st.w.en.toUpperCase(), n = word.length;
  const letters = shuffle(word.split('').map((c, i) => ({ c: c, id: i })));
  let placed = new Array(n).fill(null), tries = 0, busy = false, hc = 0;
  api.body.innerHTML = st.top + '<div class="slots" id="slots"></div><div class="bank" id="bank"></div>' +
    '<div class="row"><button class="btn small ghost" id="clr">↺ Borrar</button></div>';
  const letterOf = id => letters.find(l => l.id === id).c;
  function draw() {
    $('#slots').innerHTML = placed.map((id, i) => '<button class="slot ' + (id != null ? 'full' : '') + '" data-s="' + i + '">' + (id != null ? letterOf(id) : '') + '</button>').join('');
    $('#bank').innerHTML = letters.map(l => '<button class="tile-l ' + (placed.indexOf(l.id) >= 0 ? 'used' : '') + '" data-l="' + l.id + '">' + l.c + '</button>').join('');
  }
  function put(id) {
    if (busy || api.finished) return;
    const k = placed.indexOf(null); if (k < 0) return;
    placed[k] = id; Snd.sfx('tap'); draw();
    if (placed.indexOf(null) < 0) check();
  }
  function check() {
    busy = true;
    const guess = placed.map(letterOf).join('');
    if (guess === word) {
      $$('.slot').forEach(x => x.classList.add('ok')); busy = false;
      api.finish(tries === 0 ? 1 : 0.5);
    } else {
      tries++; $$('.slot').forEach(x => x.classList.add('bad')); Snd.sfx('bad'); Stage.anim('hero', 'sad');
      if (tries >= 2) {
        placed = new Array(n).fill(null);
        const pool = letters.slice();
        word.split('').forEach((c, i) => { const j = pool.findIndex(l => l.c === c); placed[i] = pool[j].id; pool.splice(j, 1); });
        draw(); $$('.slot').forEach(x => x.classList.add('ok')); busy = false; api.finish(0);
      } else {
        api.fb.className = 'ex-fb no'; api.fb.textContent = 'Casi… ¡fíjate bien en las letras!';
        setTimeout(() => { placed = new Array(n).fill(null); busy = false; draw(); }, 750);
      }
    }
  }
  api.body.onclick = e => {
    const t = e.target.closest('.tile-l'), sl = e.target.closest('.slot');
    if (t) put(+t.dataset.l);
    else if (sl && !busy && !api.finished) { placed[+sl.dataset.s] = null; Snd.sfx('tap'); draw(); }
  };
  $('#clr').onclick = () => { if (!busy && !api.finished) { placed = new Array(n).fill(null); draw(); } };
  const onKey = e => {
    if (api.finished || busy) return;
    if (e.key === 'Backspace') { for (let i = n - 1; i >= 0; i--) if (placed[i] != null) { placed[i] = null; break; } draw(); return; }
    if (/^[a-z]$/i.test(e.key)) { const l = letters.find(x => x.c === e.key.toUpperCase() && placed.indexOf(x.id) < 0); if (l) put(l.id); }
  };
  document.addEventListener('keydown', onKey); cleanups.push(() => document.removeEventListener('keydown', onKey));
  api.onHint(() => {
    if (busy) return; hc = Math.min(n, hc + 1); placed = new Array(n).fill(null);
    const pool = letters.slice();
    for (let i = 0; i < hc; i++) { const j = pool.findIndex(l => l.c === word[i]); placed[i] = pool[j].id; pool.splice(j, 1); }
    draw(); if (placed.indexOf(null) < 0) check();
  });
  draw();
}

/* ---------- Ordenar la frase ---------- */
function rOrder(st, api) {
  const target = st.sentence.split(' ');
  const items = shuffle(target.map((t, i) => ({ t: t, id: i })));
  let placed = [], tries = 0, busy = false;
  api.body.innerHTML = st.top + '<div class="slots words" id="slots"></div><div class="bank words" id="bank"></div>' +
    '<div class="row"><button class="btn small ghost" id="clr">↺ Borrar</button><button class="btn small green" id="chk" disabled>¡Listo! ✔</button></div>';
  const textOf = id => items.find(x => x.id === id).t;
  function draw() {
    $('#slots').innerHTML = placed.length ? placed.map((id, i) => '<button class="slot full" data-s="' + i + '">' + esc(textOf(id)) + '</button>').join('') : '<span class="muted">Toca las palabras en orden</span>';
    $('#bank').innerHTML = items.map(x => '<button class="tile-l ' + (placed.indexOf(x.id) >= 0 ? 'used' : '') + '" data-l="' + x.id + '">' + esc(x.t) + '</button>').join('');
    $('#chk').disabled = placed.length !== target.length;
  }
  function check() {
    if (busy || api.finished) return; busy = true;
    const guess = placed.map(textOf).join(' ');
    if (guess === st.sentence) { $$('.slot').forEach(x => x.classList.add('ok')); busy = false; api.finish(tries === 0 ? 1 : 0.5); }
    else {
      tries++; $$('.slot').forEach(x => x.classList.add('bad')); Snd.sfx('bad'); Stage.anim('hero', 'sad');
      if (tries >= 2) {
        const pool = items.slice(); placed = [];
        target.forEach(t => { const j = pool.findIndex(x => x.t === t); placed.push(pool[j].id); pool.splice(j, 1); });
        draw(); $$('.slot').forEach(x => x.classList.add('ok')); busy = false; api.finish(0);
      } else {
        api.fb.className = 'ex-fb no'; api.fb.textContent = '¡Casi! Escucha la frase y prueba otra vez';
        setTimeout(() => { placed = []; busy = false; draw(); }, 800);
      }
    }
  }
  api.body.onclick = e => {
    if (busy || api.finished) return;
    const t = e.target.closest('.tile-l'), sl = e.target.closest('.slot');
    if (t) { placed.push(+t.dataset.l); Snd.sfx('tap'); draw(); }
    else if (sl) { placed.splice(+sl.dataset.s, 1); Snd.sfx('tap'); draw(); }
  };
  $('#clr').onclick = () => { if (!busy && !api.finished) { placed = []; draw(); } };
  $('#chk').onclick = check;
  api.onHint(() => {
    if (busy) return;
    let ok = 0; while (ok < placed.length && textOf(placed[ok]) === target[ok]) ok++;
    placed = placed.slice(0, ok);
    const next = items.find(x => x.t === target[ok] && placed.indexOf(x.id) < 0);
    if (next) placed.push(next.id);
    draw();
  });
  draw();
}

/* ---------- Decirlo en voz alta ---------- */
function rSpeak(st, api) {
  const w = st.w;
  api.body.innerHTML = '<div class="big-face">' + w.e + '</div>' + bigWord(w.en) + '<div class="muted">' + esc(w.es) + '</div>' + sayBtn(w.en, true) +
    '<button class="mic" id="mic" aria-label="Pulsa y habla">🎤</button><div class="heard" id="heard"></div>' +
    '<div class="row"><button class="btn small ghost" id="skip" hidden>Saltar</button></div>';
  api.fb.textContent = 'Escucha, pulsa el micro y dilo 🎤';
  const mic = $('#mic'), heard = $('#heard');
  let tries = 0, listening = false;
  $('#skip').onclick = () => { if (!api.finished) { stopSR(); api.finish(0, { noRetry: true }); } };
  mic.onclick = () => {
    if (api.finished || listening) return;
    stopSR(); Voice.cancel();
    let rec;
    try { rec = new SR(); } catch (e) { api.finish(0, { skipped: true }); return; }
    activeSR = rec; rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 5; rec.continuous = false;
    listening = true; mic.classList.add('on'); api.fb.className = 'ex-fb'; api.fb.textContent = 'Te escucho… 👂';
    let got = false, errored = false;
    rec.onresult = ev => {
      if (rec !== activeSR) return; got = true;
      const alts = []; for (let i = 0; i < ev.results[0].length; i++) alts.push(ev.results[0][i].transcript);
      heard.textContent = 'He oído: “' + alts[0] + '”';
      if (speechMatches(w.en, alts)) api.finish(tries === 0 ? 1 : tries === 1 ? 0.7 : 0.5);
      else {
        tries++; $('#skip').hidden = false; Snd.sfx('bad');
        if (tries >= 3) api.finish(0.35, { soft: true });
        else { api.fb.className = 'ex-fb no'; api.fb.textContent = '¡Casi! Escucha otra vez y repite'; Voice.speak(w.en, 'en-US'); }
      }
    };
    rec.onerror = ev => {
      if (rec !== activeSR) return; errored = true;
      const e = ev.error;
      if (e === 'not-allowed' || e === 'service-not-allowed' || e === 'audio-capture') {
        micBlocked = true; toast('🎤 No puedo usar el micrófono. Sigue jugando sin él.');
        api.finish(0, { skipped: true });
      } else if (e === 'network') {
        api.fb.className = 'ex-fb no'; api.fb.textContent = 'El micrófono necesita internet. Pulsa "Saltar" si quieres.'; $('#skip').hidden = false;
      } else if (e === 'no-speech') { api.fb.className = 'ex-fb no'; api.fb.textContent = 'No te he oído. ¡Habla más fuerte! 🎤'; $('#skip').hidden = false; }
    };
    rec.onend = () => {
      if (rec !== activeSR) return; activeSR = null; listening = false; mic.classList.remove('on');
      if (!got && !errored && !api.finished) { api.fb.className = 'ex-fb no'; api.fb.textContent = 'No te he oído. Pulsa el micro y habla 🎤'; $('#skip').hidden = false; }
    };
    try { rec.start(); } catch (e) { listening = false; mic.classList.remove('on'); }
  };
}

/* ============================================================
   MISIONES
   ============================================================ */
function runMission(mid) {
  const m = MISSIONS[mid - 1];
  if (!isUnlocked(mid)) { Snd.sfx('bad'); toast('🔒 Completa primero la misión anterior'); return; }
  startSession({ kind: 'mission', title: 'Misión ' + m.id, biome: m.biome, npc: m.npc, steps: planMission(m), onFinish: s => finishMission(m, s) });
}

function finishMission(m, s) {
  session = null;
  const pct = s.total > 0 ? s.points / s.total : 0;
  const stars = pct >= 0.85 ? 3 : pct >= 0.65 ? 2 : pct >= 0.4 ? 1 : 0;
  const prev = mstat(m.id), first = prev.stars < 1 && stars >= 1, gain = Math.max(0, stars - prev.stars);
  state.missions[m.id] = { stars: Math.max(prev.stars, stars), pct: Math.max(prev.pct, pct), plays: prev.plays + 1 };
  const coins = gain * 2; state.coins += coins;
  save(); updateHeader();
  const fails = m.words.filter(w => s.fails.has(w.key));
  if (stars >= 1) renderDialogue({ lines: [{ who: m.npc, text: m.outro }], btn: 'Ver resultado ▶' }, () => missionResult(m, stars, first, coins, fails));
  else missionResult(m, stars, first, coins, fails);
}

function missionResult(m, stars, first, coins, fails) {
  setStage({ biome: m.biome, npc: null, kind: 'ex' });
  screen('', 'result');
  const nextId = m.id < 20 && isUnlocked(m.id + 1) ? m.id + 1 : null;
  const bossReady = m.id === 20 && stars >= 1;
  const msg = stars === 3 ? '¡Perfecto, {name}! ¡Eres un gran héroe!' : stars === 2 ? '¡Muy bien, {name}!' : stars === 1 ? '¡Bien hecho, {name}! Puedes mejorar repitiendo la misión.' : '¡Casi, {name}! Practica un poquito más y lo lograrás.';
  const ov = modal('<div class="bigemo">' + (stars ? '🏆' : '💪') + '</div><h2>' + (stars ? '¡Misión completada!' : '¡Sigue practicando!') + '</h2>' +
    '<div class="stars">' + [1, 2, 3].map(i => '<span class="' + (i <= stars ? 'on' : 'off') + '" style="animation-delay:' + (i * 0.35) + 's">⭐</span>').join('') + '</div>' +
    '<p class="muted">' + esc(fillName(msg)) + '</p>' +
    (first ? '<div class="reward-card"><span class="ri">' + m.reward.icon + '</span><span>¡Nuevo tesoro!<br>' + esc(m.reward.name) + '</span></div>' : '') +
    (coins ? '<p class="muted">+' + coins + ' 🪙 monedas</p>' : '') +
    (fails.length ? '<p class="muted">Para repasar:</p><div class="chips">' + fails.map(w => '<button class="chip" data-say="' + esc(w.en) + '">🔊 ' + esc(w.en) + '</button>').join('') + '</div>' : '') +
    '<div class="row">' +
    (bossReady ? '<button class="btn big purple" id="rBoss">🦹 ¡Al Rey Oscuro!</button>' : '') +
    (nextId && !bossReady ? '<button class="btn big green" id="rNext">Siguiente misión ➡</button>' : '') +
    '<button class="btn ' + (stars ? 'blue' : 'green big') + '" id="rAgain">🔁 Repetir</button><button class="btn" id="rMap">🗺️ Mapa</button></div>', { dismiss: false });
  if (stars) { Snd.sfx('star'); Stage.anim('hero', 'cheer'); Stage.burst('hero'); } else Snd.sfx('tap');
  if (first) setTimeout(() => Snd.sfx('win'), 900);
  if (coins) bump('#coinN');
  const go = f => () => { ov.close(); f(); };
  if ($('#rBoss', ov)) $('#rBoss', ov).onclick = go(runBoss);
  if ($('#rNext', ov)) $('#rNext', ov).onclick = go(() => runMission(nextId));
  $('#rAgain', ov).onclick = go(() => runMission(m.id));
  $('#rMap', ov).onclick = go(showMap);
}

/* ---------- Reto diario ---------- */
function runDaily() {
  const done = MISSIONS.filter(m => isDone(m.id));
  if (!done.length) { toast('Completa la Misión 1 para desbloquear el Reto Diario'); return; }
  if (state.lastChest === todayStr()) { toast('¡Ya abriste el cofre de hoy! Vuelve mañana 🎁'); return; }
  const pool = learnedWords().map(w => ({ w: w, s: weakScore(w) + Math.random() * 1.2 })).sort((a, b) => b.s - a.s).map(x => x.w);
  const words = pool.slice(0, 10);
  const exs = assignExercises(words, [['listenPick'], ['translate'], ['speak', 'readPick'], ['fill', 'translate'], ['spell', 'order', 'translate'], ['seePick', 'listenPick']], { n: 3, wide: true });
  const biome = pick(done).biome;
  startSession({
    kind: 'daily', title: 'Reto Diario', biome: biome, npc: MERLIN, noRetry: true,
    steps: [{ kind: 'dialogue', lines: [{ who: MERLIN, text: '¡Es el Reto del Día, {name}! Repasaremos palabras que ya conoces. Al final… ¡un cofre sorpresa!' }], btn: '¡Vamos!' }].concat(exs),
    onFinish: () => {
      session = null;
      const item = pick(CHEST_ITEMS);
      state.lastChest = todayStr(); state.coins += 5; state.chestItems[item] = (state.chestItems[item] || 0) + 1; save(); updateHeader();
      const ov = modal('<div class="bigemo">🎁✨</div><h2>¡Cofre del Día!</h2><div class="reward-card"><span class="ri">' + item + '</span><span>¡Nuevo objeto para tu colección!</span></div><p class="muted">+5 🪙 monedas</p><div class="row"><button class="btn big green" id="cOk">¡Genial! 🏰</button></div>', { dismiss: false });
      Snd.sfx('star'); setTimeout(() => Snd.sfx('win'), 500); bump('#coinN');
      $('#cOk', ov).onclick = () => { ov.close(); showMap(); };
    }
  });
}

/* ---------- Jefe final ---------- */
function runBoss() {
  if (!isDone(20)) { toast('🔒 Completa las 20 misiones para llegar al Rey Oscuro'); return; }
  const scored = shuffle(ALL_WORDS).map(w => ({ w: w, s: weakScore(w) + Math.random() })).sort((a, b) => b.s - a.s).map(x => x.w);
  const weak = scored.slice(0, 5), rest = shuffle(scored.slice(5)).slice(0, 7);
  const words = shuffle(weak.concat(rest));
  const exs = assignExercises(words, [['listenPick'], ['translate'], ['fill', 'translate'], ['speak', 'readPick'], ['spell', 'order', 'translate'], ['order', 'fill', 'translate'], ['seePick', 'listenPick'], ['listenPick'], ['fill', 'translate'], ['translate'], ['spell', 'translate'], ['speak', 'readPick']], { n: 4, wide: true });
  startSession({
    kind: 'boss', title: 'Rey Oscuro', biome: 'dark', npc: KING, hearts: 5, noRetry: true,
    steps: [{ kind: 'dialogue', lines: BOSS_INTRO, btn: '¡A luchar! ⚔️' }].concat(exs),
    onFinish: s => finishBoss(s)
  });
}
function finishBoss(s) {
  session = null;
  if (s.defeated) {
    renderDialogue({ lines: BOSS_LOSE, btn: 'Continuar' }, () => {
      const ov = modal('<div class="bigemo">🛡️</div><h2>¡Todavía no!</h2><p class="muted">El Rey Oscuro ha ganado esta ronda. Repasa las palabras difíciles y vuelve a intentarlo.</p><div class="row"><button class="btn big red" id="bAgain">⚔️ Otra vez</button><button class="btn" id="bMap">🗺️ Mapa</button></div>', { dismiss: false });
      $('#bAgain', ov).onclick = () => { ov.close(); runBoss(); };
      $('#bMap', ov).onclick = () => { ov.close(); showMap(); };
    });
    return;
  }
  const firstWin = !state.bossDone;
  state.bossDone = true; if (firstWin) state.coins += 20; save(); updateHeader();
  renderDialogue({ lines: BOSS_WIN, btn: '¡Hurra! 🎉' }, () => {
    setStage({ biome: 'meadow', npc: PRINCESS, kind: 'ex' });
    Snd.sfx('win'); Stage.anim('hero', 'cheer'); Stage.burst('hero');
    const d = new Date();
    const ov = modal('<div class="diploma"><div class="bigemo">🏆</div><h2>Diploma del Reino</h2><p>Se entrega a</p><div class="nm">' + esc(state.name || 'Valiente') + '</div>' +
      '<p>por rescatar a la Princesa Aria y aprender 200 palabras en inglés.</p><p><b>' + d.toLocaleDateString('es-ES') + '</b></p></div>' +
      '<div class="row"><button class="btn blue" id="dPrint">🖨️ Imprimir</button><button class="btn big green" id="dOk">🏰 Al mapa</button></div>', { dismiss: false });
    $('#dPrint', ov).onclick = () => { try { window.print(); } catch (e) {} };
    $('#dOk', ov).onclick = () => { ov.close(); showMap(); };
  });
}

/* ============================================================
   PANTALLAS
   ============================================================ */
function showTitle() {
  session = null;
  setStage({ biome: 'meadow', npc: null, kind: 'title' });
  const created = state.created;
  screen('<div class="panel"><div class="title-logo">El Reino<br>del Inglés</div><div class="title-sub">⚔️ Aventura Medieval ⚔️</div>' +
    (created ? '<p class="muted" style="font-size:1.3rem">¡Hola, ' + esc(state.name) + '! El reino te espera.</p>' : '<p class="muted" style="font-size:1.2rem">Ayuda a rescatar a la princesa aprendiendo inglés.</p>') +
    '<div class="row"><button class="btn big green" id="playBtn">▶ ' + (created ? 'Continuar aventura' : 'Comenzar') + '</button></div>' +
    '<p class="muted" style="font-size:.9rem;margin-top:1rem">🔊 Sube el volumen · 🎤 Puede pedir permiso para el micrófono</p></div>', 'title');
  Stage.anim('hero', 'wave');
  $('#playBtn').onclick = () => {
    Snd.ensure(); Snd.on.music = state.settings.music; Snd.on.sfx = state.settings.sfx;
    if (state.settings.music) Snd.startMusic();
    keepAwake(); if (state.settings.full) goFull();
    Snd.sfx('star');
    if (!state.created) showCreate(); else showMap();
  };
}

function showCreate() {
  setStage({ biome: 'village', npc: null, kind: 'create' });
  const editing = state.created;
  screen('<div class="panel"><h1>👑 ' + (editing ? 'Tu héroe' : 'Crea a tu héroe') + '</h1>' +
    '<div class="field"><label for="nameIn">¿Cómo te llamas?</label><input id="nameIn" type="text" maxlength="14" autocomplete="off" placeholder="Tu nombre" value="' + esc(state.name) + '"></div>' +
    '<div class="muted">Elige a tu héroe:</div><div class="hero-grid">' +
    HEROES.map(h => '<button class="hero-card ' + (state.hero === h.id ? 'sel' : '') + '" data-h="' + h.id + '"><div class="av">' + h.avatar + '</div><div class="nm">' + h.name + '</div><div class="ds">' + h.desc + '</div></button>').join('') +
    '</div><div class="row"><button class="btn big green" id="goBtn">' + (editing ? 'Guardar ✔' : '¡A la aventura! ⚔️') + '</button></div></div>', 'create');
  Stage.anim('hero', 'wave');
  $$('.hero-card').forEach(c => c.onclick = () => {
    state.hero = c.dataset.h; $$('.hero-card').forEach(x => x.classList.toggle('sel', x === c));
    Stage.setHero(state.hero); Stage.anim('hero', 'cheer'); Stage.burst('hero'); Snd.sfx('pop');
    updateHeader(); showNpc(null); $('#stageFallback').innerHTML = '<span>' + heroObj().avatar + '</span>';
  });
  $('#goBtn').onclick = () => {
    const name = $('#nameIn').value.trim();
    if (!name) { toast('✏️ Escribe tu nombre para empezar'); $('#nameIn').focus(); return; }
    state.name = name; state.created = true; save(); updateHeader(); Snd.sfx('star');
    if (!state.introSeen) {
      setStage({ biome: 'castle', npc: MERLIN, kind: 'ex' });
      renderDialogue({ lines: INTRO_LINES, btn: '¡A la aventura! ⚔️' }, () => { state.introSeen = true; save(); showMap(); });
    } else showMap();
  };
}

function showMap() {
  if (session) { session = null; }
  const cur = nextMissionId(), curM = MISSIONS[(cur || 20) - 1];
  setStage({ biome: curM.biome, npc: null, kind: 'map' });
  const stars = totalStars();
  const chestReady = state.lastChest !== todayStr() && MISSIONS.some(m => isDone(m.id));
  const chestTxt = state.lastChest === todayStr() ? 'Ya abriste el cofre de hoy. ¡Vuelve mañana!' : chestReady ? '¡Repasa unas palabras y abre tu regalo de hoy!' : 'Completa la Misión 1 para desbloquearlo';
  let html = '<div class="panel"><h1>🗺️ Mapa del Reino</h1><p class="muted">¡Hola, ' + esc(state.name || 'valiente') + '! Has conseguido ' + stars + ' de 60 ⭐</p>' +
    '<div class="progress"><i style="width:' + Math.round(stars / 60 * 100) + '%"></i></div>' +
    (cur ? '<div class="row"><button class="btn big green" id="contBtn">▶ Misión ' + cur + ': ' + esc(curM.title) + '</button></div>' : '<p class="muted">¡Has completado las 20 misiones!</p>') + '</div>' +
    '<button class="chest ' + (chestReady ? '' : 'off') + '" id="chestBtn"><span class="ci">🎁</span><span><b style="font-family:var(--font-h);font-size:1.3rem">Reto Diario</b><br><span style="font-weight:800">' + chestTxt + '</span></span></button>';
  REGIONS.forEach(r => {
    html += '<div class="region">' + r.icon + ' ' + esc(r.name) + '</div>';
    for (let id = r.from; id <= r.to; id++) {
      const m = MISSIONS[id - 1], st = mstat(id), un = isUnlocked(id), done = isDone(id);
      html += '<button class="node ' + (un ? '' : 'locked') + (id === cur ? ' current' : '') + (done ? ' done' : '') + '" data-m="' + id + '">' +
        '<span class="num">' + id + '</span><span class="ico">' + m.icon + '</span><span class="inf"><div class="tt">' + esc(m.title) + '</div>' +
        (done ? '<div class="st">' + '⭐'.repeat(st.stars) + '☆'.repeat(3 - st.stars) + '</div><div class="ds">' + m.reward.icon + ' ' + esc(m.reward.name) + '</div>' :
          un ? '<div class="ds">10 palabras nuevas · ¡Toca para jugar!</div>' : '<div class="ds">🔒 Completa la misión anterior</div>') +
        '</span>' + (id === cur ? '<span class="flag">' + heroObj().avatar + '</span>' : '') + '</button>';
    }
  });
  html += '<div class="region">🦹 La Torre del Rey Oscuro</div><button class="node boss-node ' + (isDone(20) ? '' : 'locked') + '" id="bossNode"><span class="num" style="background:#F87171">☠</span><span class="ico">🏰</span><span class="inf"><div class="tt">El Rey Oscuro</div><div class="ds">' +
    (isDone(20) ? (state.bossDone ? '🏆 ¡Derrotado! Toca para repetir el duelo' : '¡Enfréntate a él con todo lo que has aprendido!') : '🔒 Completa las 20 misiones') + '</div></span></button>';
  screen(html, 'map');
  Stage.anim('hero', 'wave');
  if ($('#contBtn')) $('#contBtn').onclick = () => runMission(cur);
  $('#chestBtn').onclick = runDaily;
  $$('.node[data-m]').forEach(n => n.onclick = () => runMission(+n.dataset.m));
  $('#bossNode').onclick = runBoss;
}

function showAlbum() {
  setStage({ biome: 'castle', npc: null, kind: 'map' });
  const done = MISSIONS.filter(m => isDone(m.id)).length;
  const learned = ALL_WORDS.filter(w => (state.words[w.key] || { ok: 0 }).ok > 0).length;
  const items = Object.keys(state.chestItems);
  screen('<div class="panel"><h1>🎒 Tesoros del Reino</h1><p class="muted">Tesoros: ' + done + ' de 20 · Palabras dominadas: ' + learned + '</p>' +
    (state.bossDone ? '<p class="muted">🏆 Título: <b>Héroe del Reino del Inglés</b></p>' : '') +
    '<div class="album">' + MISSIONS.map(m => isDone(m.id) ? '<div class="sticker"><div class="si">' + m.reward.icon + '</div><div class="sn">' + esc(m.reward.name) + '</div></div>' :
      '<div class="sticker lock"><div class="si">❓</div><div class="sn">Misión ' + m.id + '</div></div>').join('') + '</div>' +
    (items.length ? '<h2 style="margin-top:1rem">🎁 Del cofre diario</h2><div class="chips" style="font-size:1.8rem">' + items.map(e => '<span>' + e + (state.chestItems[e] > 1 ? '<small>×' + state.chestItems[e] + '</small>' : '') + '</span>').join(' ') + '</div>' : '') +
    (state.bossDone ? '<div class="row"><button class="btn purple" id="dipBtn">📜 Ver diploma</button></div>' : '') +
    '<div class="row"><button class="btn green" id="backBtn">🗺️ Volver al mapa</button></div></div>', 'album');
  $('#backBtn').onclick = showMap;
  if ($('#dipBtn')) $('#dipBtn').onclick = () => {
    const ov = modal('<div class="diploma"><div class="bigemo">🏆</div><h2>Diploma del Reino</h2><p>Se entrega a</p><div class="nm">' + esc(state.name) + '</div><p>por rescatar a la Princesa Aria y aprender 200 palabras en inglés.</p></div><div class="row"><button class="btn blue" id="pr">🖨️ Imprimir</button><button class="btn" id="cl">Cerrar</button></div>');
    $('#pr', ov).onclick = () => { try { window.print(); } catch (e) {} }; $('#cl', ov).onclick = () => ov.close();
  };
}

/* ---------- Ajustes y zona de padres ---------- */
function switchRow(label, key) {
  return '<div class="setrow"><span>' + label + '</span><button class="switch ' + (state.settings[key] ? 'on' : '') + '" data-k="' + key + '" role="switch" aria-checked="' + !!state.settings[key] + '" aria-label="' + label + '"></button></div>';
}
function showSettings() {
  const ov = modal('<h2>⚙️ Ajustes</h2>' + switchRow('🎵 Música', 'music') + switchRow('🔊 Efectos de sonido', 'sfx') + switchRow('🗣️ Voz que explica (español)', 'voice') +
    switchRow('🎤 Ejercicios con micrófono', 'mic') + switchRow('🌙 Modo noche', 'night') + switchRow('⛶ Pantalla completa', 'full') +
    '<div class="row"><button class="btn blue" id="setHero">🛡️ Cambiar héroe</button><button class="btn purple" id="setParent">👪 Zona de padres</button></div>' +
    '<div class="row"><button class="btn green" id="setClose">Cerrar</button></div>');
  $$('.switch', ov).forEach(b => b.onclick = () => {
    const k = b.dataset.k; state.settings[k] = !state.settings[k]; b.classList.toggle('on', state.settings[k]); b.setAttribute('aria-checked', state.settings[k]);
    save(); Snd.sfx('tap');
    if (k === 'music') { Snd.on.music = state.settings.music; state.settings.music ? Snd.startMusic() : Snd.stopMusic(); }
    if (k === 'sfx') Snd.on.sfx = state.settings.sfx;
    if (k === 'night') applyTheme();
    if (k === 'full') { state.settings.full ? goFull() : exitFull(); }
    if (k === 'mic') micBlocked = false;
  });
  $('#setClose', ov).onclick = () => ov.close();
  $('#setHero', ov).onclick = () => { ov.close(); if (session) { toast('Termina o sal de la misión para cambiar de héroe'); return; } showCreate(); };
  $('#setParent', ov).onclick = () => { ov.close(); parentGate(); };
}

function parentGate() {
  const a = rnd(3, 9), b = rnd(3, 9);
  const ov = modal('<h2>👪 Zona de padres</h2><p class="muted">Para entrar, resuelve esta operación:</p><div class="gate-q">' + a + ' × ' + b + ' = ?</div>' +
    '<div class="field"><input id="gateIn" type="number" inputmode="numeric" placeholder="Resultado"></div><div class="row"><button class="btn green" id="gateOk">Entrar</button><button class="btn" id="gateNo">Cancelar</button></div>');
  $('#gateNo', ov).onclick = () => ov.close();
  const go = () => { if (+$('#gateIn', ov).value === a * b) { ov.close(); showParent(); } else { Snd.sfx('bad'); toast('Respuesta incorrecta'); $('#gateIn', ov).value = ''; } };
  $('#gateOk', ov).onclick = go; $('#gateIn', ov).onkeydown = e => { if (e.key === 'Enter') go(); };
}

function showParent() {
  if (session) { session = null; }
  setStage({ biome: 'castle', npc: null, kind: 'map' });
  const learned = ALL_WORDS.filter(w => (state.words[w.key] || { ok: 0 }).ok > 0).length;
  const weak = ALL_WORDS.filter(w => weakScore(w) > 0).sort((a, b) => weakScore(b) - weakScore(a)).slice(0, 14);
  screen('<div class="panel"><h1>👪 Zona de padres</h1>' +
    '<p class="muted">' + esc(state.name || 'Jugador') + ' · ' + MISSIONS.filter(m => isDone(m.id)).length + ' de 20 misiones · ' + totalStars() + ' ⭐ · ' + learned + ' de 200 palabras acertadas alguna vez</p>' +
    '<table class="rep"><tr><th>Misión</th><th>Estrellas</th><th>Mejor resultado</th><th>Veces</th></tr>' +
    MISSIONS.map(m => { const s = mstat(m.id); return '<tr><td>' + m.id + '. ' + esc(m.title) + '</td><td>' + (s.plays ? '⭐'.repeat(s.stars) + '☆'.repeat(3 - s.stars) : '—') + '</td><td>' + (s.plays ? Math.round(s.pct * 100) + '%' : '—') + '</td><td>' + s.plays + '</td></tr>'; }).join('') + '</table>' +
    '<h2 style="margin-top:1rem">Palabras que más cuestan</h2>' +
    (weak.length ? '<div class="chips">' + weak.map(w => '<button class="chip" data-say="' + esc(w.en) + '">🔊 ' + esc(w.en) + ' <small>(' + esc(w.es) + ')</small></button>').join('') + '</div>' : '<p class="muted">Todavía no hay palabras difíciles. ¡Genial!</p>') +
    '<h2 style="margin-top:1rem">Copia de seguridad</h2><div class="field"><textarea id="bk" rows="3" placeholder="Aquí aparece el código de progreso"></textarea></div>' +
    '<div class="row"><button class="btn small blue" id="bkExp">📤 Exportar</button><button class="btn small blue" id="bkImp">📥 Importar</button></div>' +
    '<div class="row"><button class="btn red small" id="reset">🗑️ Borrar todo el progreso</button><button class="btn green" id="pBack">🗺️ Volver</button></div></div>', 'parent');
  $('#pBack').onclick = showMap;
  $('#bkExp').onclick = () => {
    const t = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); $('#bk').value = t;
    try { navigator.clipboard.writeText(t); toast('Código copiado. Guárdalo en un lugar seguro.'); } catch (e) { toast('Copia el código de la caja de texto.'); }
  };
  $('#bkImp').onclick = () => {
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob($('#bk').value.trim()))));
      if (!o || o.v !== 2) throw new Error('formato');
      state = Object.assign(DEFAULT(), o); state.settings = Object.assign(DEFAULT().settings, o.settings || {}); save(); updateHeader(); applyTheme(); toast('✅ Progreso importado'); showMap();
    } catch (e) { toast('❌ Código no válido'); }
  };
  $('#reset').onclick = () => {
    const ov = modal('<div class="bigemo">⚠️</div><h2>¿Borrar todo?</h2><p class="muted">Se perderán estrellas, tesoros y estadísticas. No se puede deshacer.</p><div class="row"><button class="btn green" id="rNo">No, volver</button><button class="btn red" id="rYes">Sí, borrar</button></div>');
    $('#rNo', ov).onclick = () => ov.close();
    $('#rYes', ov).onclick = () => { ov.close(); state = DEFAULT(); save(); updateHeader(); applyTheme(); showTitle(); };
  };
}

/* ============================================================
   ANDROID / TABLET: atrás, pantalla completa, pantalla encendida
   ============================================================ */
let wl = null;
async function keepAwake() {
  try { if ('wakeLock' in navigator && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) { wl = null; }
}
const isStandalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || navigator.standalone;
function goFull() {
  try { const el = document.documentElement; if (!document.fullscreenElement && !isStandalone() && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) {}
}
function exitFull() { try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} }

let lastBack = 0;
function initBack() {
  try { history.replaceState({ g: 0 }, ''); history.pushState({ g: 1 }, ''); } catch (e) { return; }
  window.addEventListener('popstate', () => {
    const rearm = () => { try { history.pushState({ g: 1 }, ''); } catch (e) {} };
    if (modals.length) { const top = modals[modals.length - 1]; if (top.dismiss) top.close(); rearm(); return; }
    if (session) { rearm(); askExit(showMap); return; }
    if (curScreen === 'title') {
      const now = Date.now();
      if (now - lastBack < 2500) { history.back(); return; }
      lastBack = now; toast('Pulsa Atrás otra vez para salir'); rearm(); return;
    }
    rearm();
    if (curScreen === 'map') showTitle(); else showMap();
  });
}

/* ============================================================
   ARRANQUE
   ============================================================ */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-say]');
  if (b) { Voice.speak(b.dataset.say, 'en-US'); Snd.sfx('tap'); }
});
document.addEventListener('contextmenu', e => e.preventDefault());
$('#homeBtn').onclick = () => { if (session) askExit(showMap); else showMap(); };
$('#albumBtn').onclick = () => { if (session) askExit(showAlbum); else showAlbum(); };
$('#setBtn').onclick = showSettings;
let rsz = null;
function onResize() { clearTimeout(rsz); rsz = setTimeout(applyStage, 80); }
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake(); });

load();
Snd.on.sfx = state.settings.sfx; Snd.on.music = state.settings.music;
if (!Stage.init($('#webgl-canvas'))) document.body.classList.add('no3d');
applyTheme();
updateHeader();
initBack();
showTitle();

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
