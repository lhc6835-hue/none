// 소리는 파일 없이 웹오디오로 합성한다. 첫 입력 때 켜진다.
let ac = null, master = null, noiseBuf = null, jet = null;
const last = {};

export function unlockAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.4; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x7fffffff) * 2 - 1; }
  } catch { ac = null; }
}

function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}
function tone(type, f0, f1, dur, vol, delay = 0) {
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, 0.005, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(freq, q, dur, vol, delay = 0, type = 'bandpass') {
  const t = ac.currentTime + delay, src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuf; fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
  env(g, t, 0.004, vol, dur); src.connect(fl); fl.connect(g); g.connect(master);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

const SFX = {
  jump: () => tone('square', 260, 520, 0.12, 0.05),
  land: () => noise(500, 1, 0.08, 0.08, 0, 'lowpass'),
  splat: () => noise(900 + Math.random() * 500, 2, 0.07, 0.05),
  harden: () => tone('triangle', 1400 + Math.random() * 600, 1900, 0.06, 0.025),
  hurt: () => { tone('square', 300, 90, 0.2, 0.08); noise(1200, 1, 0.15, 0.08); },
  stun: () => { noise(300, 1, 0.2, 0.15, 0, 'lowpass'); tone('sine', 140, 60, 0.25, 0.12); },
  petrify: () => { [0, 0.06, 0.12].forEach((d, i) => tone('triangle', 660 * (1 + i * 0.26), 990 * (1 + i * 0.26), 0.25, 0.06, d)); noise(3000, 4, 0.3, 0.03); },
  crumble: () => noise(400, 0.7, 0.18, 0.05, 0, 'lowpass'),
  spit: () => { tone('sine', 500, 200, 0.1, 0.06); noise(2000, 3, 0.05, 0.03); },
  seedHit: () => noise(1500, 2, 0.08, 0.06),
  chomp: () => noise(700, 3, 0.04, 0.04),
  checkpoint: () => [523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.3, 0.06, i * 0.08)),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f * 1.01, 0.5, 0.06, i * 0.11)),
  empty: () => tone('square', 180, 150, 0.06, 0.03),
  start: () => [392, 523].forEach((f, i) => tone('triangle', f, f, 0.2, 0.06, i * 0.09)),
};

// gap: 같은 소리가 너무 자주 겹치지 않게 하는 최소 간격(초)
export function sfx(name, gap = 0.04) {
  if (!ac || !SFX[name]) return;
  const now = ac.currentTime;
  if (last[name] && now - last[name] < gap) return;
  last[name] = now;
  SFX[name]();
}

// 물대포 소리: 쏘는 동안 이어지는 쉬익 소리
export function setJet(on) {
  if (!ac) return;
  if (!jet) {
    const src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; src.loop = true; fl.type = 'bandpass'; fl.frequency.value = 1100; fl.Q.value = 0.8;
    g.gain.value = 0; src.connect(fl); fl.connect(g); g.connect(master); src.start();
    jet = { g, fl };
  }
  const t = ac.currentTime;
  jet.g.gain.setTargetAtTime(on ? 0.07 : 0, t, on ? 0.02 : 0.05);
  jet.fl.frequency.setTargetAtTime(on ? 1100 + Math.random() * 200 : 700, t, 0.05);
}
