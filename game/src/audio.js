// Neon Bay — synthesized sound, no audio files.
// One job: every sound effect and the engine hum are built with WebAudio oscillators
// and noise buffers, so the game loads zero audio assets.
export function createAudio() {
  const audio = {
    ctx: null, master: null, engineOsc: null, engineGain: null,
    sirenOsc: null, sirenGain: null, muted: false, started: false,
  };
  return audio;
}

export function ensureAudio(audio) {
  if (audio.started) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = audio.muted ? 0 : 0.5;
    audio.master.connect(audio.ctx.destination);
    // Engine hum: low sawtooth whose pitch follows speed.
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 55;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    const engineFilter = audio.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass'; engineFilter.frequency.value = 320;
    audio.engineOsc.connect(engineFilter);
    engineFilter.connect(audio.engineGain);
    audio.engineGain.connect(audio.master);
    audio.engineOsc.start();
    // Police siren: two-tone triangle, quiet until wanted.
    audio.sirenOsc = audio.ctx.createOscillator();
    audio.sirenOsc.type = 'triangle';
    audio.sirenOsc.frequency.value = 700;
    audio.sirenGain = audio.ctx.createGain();
    audio.sirenGain.gain.value = 0;
    audio.sirenOsc.connect(audio.sirenGain);
    audio.sirenGain.connect(audio.master);
    audio.sirenOsc.start();
    audio.started = true;
  } catch { /* audio is optional; the game plays silent */ }
}

export function setEngine(audio, speedNorm, driving) {
  if (!audio.started) return;
  const t = audio.ctx.currentTime;
  audio.engineGain.gain.setTargetAtTime(driving ? 0.05 + speedNorm * 0.07 : 0, t, 0.1);
  audio.engineOsc.frequency.setTargetAtTime(55 + speedNorm * 160, t, 0.1);
}

export function setSiren(audio, wanted) {
  if (!audio.started) return;
  const t = audio.ctx.currentTime;
  audio.sirenGain.gain.setTargetAtTime(wanted > 0 ? 0.035 : 0, t, 0.3);
  if (wanted > 0) {
    const phase = (t % 1.2) < 0.6 ? 700 : 950;
    audio.sirenOsc.frequency.setTargetAtTime(phase, t, 0.05);
  }
}

function blip(audio, freq, dur, type, vol, slideTo) {
  if (!audio.started || audio.muted) return;
  const t = audio.ctx.currentTime;
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noiseBurst(audio, dur, vol, filterFreq) {
  if (!audio.started || audio.muted) return;
  const t = audio.ctx.currentTime;
  const len = Math.floor(audio.ctx.sampleRate * dur);
  const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audio.ctx.createBufferSource();
  src.buffer = buf;
  const f = audio.ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = filterFreq;
  const g = audio.ctx.createGain();
  g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(audio.master);
  src.start(t);
}

export function playShot(audio) { noiseBurst(audio, 0.12, 0.5, 1800); blip(audio, 180, 0.08, 'square', 0.15, 60); }
export function playPickup(audio) { blip(audio, 660, 0.1, 'sine', 0.25, 990); }
export function playCrash(audio) { noiseBurst(audio, 0.25, 0.5, 500); }
export function playMission(audio) { blip(audio, 523, 0.12, 'sine', 0.25); setTimeout(() => blip(audio, 784, 0.18, 'sine', 0.25), 120); }
export function playSirenBlip(audio) { blip(audio, 880, 0.15, 'triangle', 0.2, 660); }
export function playHorn(audio) { blip(audio, 320, 0.2, 'square', 0.12, 300); }
export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
  return audio.muted;
}
