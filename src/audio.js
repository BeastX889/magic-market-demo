// Every sound is synthesised with WebAudio: no audio files.
let ac = null, master, sfxG, musG;
let muted = false, ducked = false, musicTimer = null, nextNote = 0, step = 0;
const PENTA = [0, 2, 4, 7, 9];
const freq = semi => 261.63 * Math.pow(2, semi / 12);

function applyGain() {
  if (!master) return;
  master.gain.setTargetAtTime(muted || ducked ? 0 : 0.85, ac.currentTime, 0.05);
}

export function unlockAudio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.connect(master);
    sfxG = ac.createGain(); sfxG.gain.value = 0.55; sfxG.connect(comp);
    musG = ac.createGain(); musG.gain.value = 0.13; musG.connect(comp);
    applyGain();
    startMusic();
  }
  if (ac.state === 'suspended') ac.resume();
}
export function setMuted(m) { muted = m; applyGain(); }
export function isMuted() { return muted; }
export function duck(on) { ducked = on; applyGain(); }
export function suspendAudio(on) { if (!ac) return; if (on) ac.suspend(); else if (!ducked) ac.resume(); }

function tone(f, dur, { type = 'sine', vol = 0.5, attack = 0.005, at = 0, slide = 0, dest = null } = {}) {
  if (!ac) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(vol, t + attack);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(dest || sfxG);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol = 0.2, at = 0, hp = 1500) {
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource(); src.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const gn = ac.createGain(); gn.gain.value = vol;
  src.connect(f); f.connect(gn); gn.connect(sfxG);
  src.start(ac.currentTime + at);
}

let lastCoin = 0;
export const sfx = {
  tap() { tone(900, 0.06, { type: 'triangle', vol: 0.18 }); },
  pick() { tone(600, 0.08, { type: 'sine', vol: 0.2, slide: 1.5 }); },
  drop() { tone(420, 0.08, { type: 'sine', vol: 0.2, slide: 0.7 }); },
  spawn() { tone(480, 0.14, { type: 'sine', vol: 0.32, slide: 2 }); tone(1100, 0.08, { type: 'triangle', vol: 0.1, at: 0.05 }); },
  pop(tier, combo = 0) {
    const n = tier + Math.min(combo, 6);
    const s = PENTA[n % 5] + 12 * Math.floor(n / 5);
    const f = freq(s + 4);
    tone(f, 0.28, { type: 'triangle', vol: 0.42 });
    tone(f * 2, 0.2, { type: 'sine', vol: 0.18, at: 0.03 });
    tone(f * 1.5, 0.32, { type: 'sine', vol: 0.14, at: 0.07 });
    noise(0.06, 0.08, 0, 3000);
  },
  lucky() { [0, 4, 7, 12, 16, 19].forEach((s, i) => tone(freq(s + 12), 0.3, { type: 'triangle', vol: 0.25, at: i * 0.05 })); },
  coin() {
    if (!ac || ac.currentTime - lastCoin < 0.045) return; lastCoin = ac.currentTime;
    tone(1568, 0.07, { type: 'square', vol: 0.07 }); tone(2093, 0.18, { type: 'square', vol: 0.06, at: 0.06 });
  },
  serve() { [0, 4, 7, 12].forEach((s, i) => tone(freq(s + 7), 0.24, { type: 'triangle', vol: 0.28, at: i * 0.07 })); },
  level() { [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((s, i) => tone(freq(s), 0.4, { type: 'triangle', vol: 0.3, at: i * 0.085 })); },
  error() { tone(200, 0.16, { type: 'sawtooth', vol: 0.12, slide: 0.7 }); },
  open() { tone(260, 0.35, { type: 'triangle', vol: 0.3, slide: 3 }); noise(0.25, 0.12, 0.05, 2000); [12, 16, 19].forEach((s, i) => tone(freq(s + 12), 0.3, { type: 'sine', vol: 0.18, at: 0.25 + i * 0.06 })); },
  unweb() { noise(0.18, 0.15, 0, 2500); tone(800, 0.15, { type: 'sine', vol: 0.15, slide: 1.6 }); },
  discover() { [12, 16, 19, 24, 28].forEach((s, i) => tone(freq(s), 0.45, { type: 'sine', vol: 0.22, at: i * 0.07 })); },
  tick() { tone(1200, 0.04, { type: 'square', vol: 0.06 }); },
  lose() { [7, 4, 0, -5].forEach((s, i) => tone(freq(s), 0.35, { type: 'triangle', vol: 0.25, at: i * 0.14 })); },
  shuffle() { for (let i = 0; i < 6; i++) tone(500 + i * 120, 0.06, { type: 'triangle', vol: 0.12, at: i * 0.035 }); },
  energy() { tone(500, 0.25, { type: 'sine', vol: 0.25, slide: 2.5 }); tone(1000, 0.25, { type: 'triangle', vol: 0.1, at: 0.1, slide: 1.5 }); },
};

// Gentle looping lullaby: Am - F - C - G arpeggios.
const CHORDS = [[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]];
const MELODY = [16, 14, 12, 11, 12, 16, 19, 16, 14, 12, 9, 7, 9, 12, 14, 12];
function note(f, dur, type, vol, t) {
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.value = f;
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(musG); o.start(t); o.stop(t + dur + 0.05);
}
function schedule() {
  if (!ac || ac.state !== 'running') return;
  const spb = 60 / 80 / 2;
  if (nextNote < ac.currentTime) nextNote = ac.currentTime + 0.05;
  while (nextNote < ac.currentTime + 0.35) {
    const bar = Math.floor(step / 8) % 4, beat = step % 8, ch = CHORDS[bar];
    if (beat === 0) note(freq(ch[0] - 12), 1.4, 'sine', 0.5, nextNote);
    note(freq(ch[[0, 1, 2, 1, 0, 1, 2, 1][beat]] + 12), 0.4, 'triangle', 0.16, nextNote);
    if (beat % 2 === 0 && Math.floor(step / 32) % 2 === 1) {
      const m = MELODY[(Math.floor(step / 2)) % 16];
      note(freq(m + 12), 0.5, 'sine', 0.1, nextNote);
    }
    nextNote += spb; step++;
  }
}
function startMusic() { nextNote = ac.currentTime + 0.2; musicTimer = setInterval(schedule, 100); }
