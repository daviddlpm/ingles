"use strict";
/* ============================================================
   AUDIO: efectos, música medieval sintetizada y voz (TTS)
   Todo síntesis Web Audio: no hay archivos que descargar.
   ============================================================ */
const Snd = (() => {
  let ctx = null, master = null, musicBus = null;
  const on = { sfx: true, music: true };
  let musicTimer = null, nextNoteTime = 0, step = 0, phrase = null, phraseIdx = 0;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
      } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  function tone(freq, t, dur, type, vol, dest, glideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const SFX = {
    good:  t => { [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.09, 0.22, 'triangle', 0.22)); },
    bad:   t => { tone(220, t, 0.18, 'sawtooth', 0.12); tone(170, t + 0.13, 0.25, 'sawtooth', 0.12); },
    tap:   t => { tone(660, t, 0.07, 'sine', 0.13); },
    pop:   t => { tone(420, t, 0.12, 'sine', 0.16, null, 900); },
    coin:  t => { tone(988, t, 0.09, 'square', 0.08); tone(1319, t + 0.08, 0.25, 'square', 0.08); },
    star:  t => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.1, 0.3, 'triangle', 0.2)); },
    win:   t => { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.13, 0.3, 'triangle', 0.22)); },
    whoosh:t => { tone(200, t, 0.3, 'sine', 0.08, null, 900); },
    hit:   t => { tone(140, t, 0.25, 'square', 0.16, null, 60); tone(90, t, 0.3, 'sawtooth', 0.1, null, 40); }
  };

  function sfx(name) {
    if (!on.sfx) return;
    if (!ensure()) return;
    try { SFX[name](ctx.currentTime + 0.01); } catch (e) {}
  }

  /* --- Música: laúd pentatónico sobre un bordón --- */
  const PENT = [220, 262, 294, 330, 392, 440, 523, 587];
  const PHRASES = [
    [0,2,3,2, 4,3,2,0], [3,4,5,4, 3,2,0,-1], [0,-1,2,3, 5,4,3,2],
    [4,3,2,3, 2,0,-1,-1], [5,4,3,4, 2,3,0,-1], [0,2,4,5, 6,5,4,2]
  ];
  const STEP = 0.36;

  function tick() {
    if (!ctx || !on.music) return;
    while (nextNoteTime < ctx.currentTime + 0.6) {
      if (step % 8 === 0) {
        phrase = PHRASES[phraseIdx = (phraseIdx + 1 + Math.floor(Math.random() * 3)) % PHRASES.length];
        const root = (step % 16 === 0) ? 110 : 82.4;
        tone(root, nextNoteTime, STEP * 8, 'sine', 0.05, musicBus);
        tone(root * 1.5, nextNoteTime, STEP * 8, 'sine', 0.025, musicBus);
      }
      const n = phrase[step % 8];
      if (n >= 0) tone(PENT[n], nextNoteTime, 0.7, 'triangle', 0.075, musicBus);
      nextNoteTime += STEP;
      step++;
    }
  }

  function startMusic() {
    if (!on.music || musicTimer) return;
    if (!ensure()) return;
    nextNoteTime = ctx.currentTime + 0.1; step = 0; phrase = PHRASES[0];
    musicTimer = setInterval(tick, 180);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

  function setMusic(v) { on.music = v; v ? startMusic() : stopMusic(); }
  function setSfx(v) { on.sfx = v; }
  /* Pausa la música si la pestaña se oculta (ahorra batería en la tablet) */
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { stopMusic(); try { ctx.suspend(); } catch (e) {} }
    else { if (on.music) { try { ctx.resume(); } catch (e) {} startMusic(); } }
  });

  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  return { ensure, sfx, setMusic, setSfx, startMusic, stopMusic, buzz, get on() { return on; } };
})();

const Voice = (() => {
  const synth = window.speechSynthesis || null;
  let voices = [];
  function load() { if (synth) voices = synth.getVoices() || []; }
  if (synth) { load(); if (synth.addEventListener) synth.addEventListener('voiceschanged', load); }

  function voiceFor(lang) {
    if (!voices.length) load();
    const pre = lang.slice(0, 2).toLowerCase();
    const cands = voices.filter(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(pre));
    if (!cands.length) return null;
    return cands.find(v => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase() && /google|natural|premium/i.test(v.name))
        || cands.find(v => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase())
        || cands[0];
  }

  let seq = 0;
  /* onEnd se llama al terminar de hablar (o tras un tiempo máximo si el motor no avisa) */
  function speak(text, lang, onEnd) {
    lang = lang || 'en-US';
    const mine = ++seq;
    let called = false;
    const done = () => { if (called) return; called = true; if (onEnd && mine === seq) onEnd(); };
    if (!synth || !text) { if (onEnd) setTimeout(done, 0); return; }
    try { synth.cancel(); } catch (e) {}
    /* Android Chrome a veces ignora speak() justo después de cancel(): se espera un instante */
    setTimeout(() => {
      if (mine !== seq) return;
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        const v = voiceFor(lang); if (v) u.voice = v;
        u.rate = lang.startsWith('en') ? 0.8 : 0.98;
        u.pitch = 1.05;
        u.onend = u.onerror = done;
        synth.speak(u);
        if (onEnd) setTimeout(done, 2500 + text.length * 90);
      } catch (e) { done(); }
    }, 60);
  }
  function cancel() { seq++; try { if (synth) synth.cancel(); } catch (e) {} }
  return { speak, cancel, available: !!synth };
})();
