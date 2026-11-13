// AMBERLINE: 게임 루프, 화면 합성, 소품(등불·표지판·묘목), HUD, 타이틀·클리어 화면
import { VW, VH, SCALE, LW, LH, STEP } from './config.js';
import { Frame } from './core/frame.js';
import { PAL, css } from './core/color.js';
import { Rng } from './core/rng.js';
import { Fx } from './core/fx.js';
import { sfx, setJet } from './core/audio.js';
import { Background } from './world/background.js';
import { buildLevel } from './world/level.js';
import { Player, TANK_MAX } from './entities/player.js';
import { Stream } from './entities/stream.js';
import { createEnemy } from './entities/enemies.js';
import { unstick } from './entities/body.js';
import { createInput, BTN } from './input.js';
import { TEXT, pick } from './text.js';
import { Logo } from './logo.js';

// ─── 캔버스 ──────────────────────────────────────────────────
const canvas = document.getElementById('game');
canvas.width = VW * SCALE; canvas.height = VH * SCALE;
const mctx = canvas.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = VW; c.height = VH; return c; };
const low = mk(), fgC = mk(), lightC = mk();
const lowCtx = low.getContext('2d'), fgCtx = fgC.getContext('2d'), lightCtx = lightC.getContext('2d');
const frame = new Frame(VW, VH);
const bg = new Background();
const input = createInput(canvas);
const logo = new Logo();

// ─── 게임 상태 ───────────────────────────────────────────────
let G = null, mode = 'title', modeT = 0;

function newGame() {
  const L = buildLevel();
  const rng = new Rng(20261113);
  G = {
    tick: 0, rng, terrain: L.terrain, fx: new Fx(rng), stream: new Stream(),
    player: new Player(L.spawn.x, L.spawn.y), spawn: L.spawn,
    enemies: L.enemies.map(s => createEnemy(s, L.terrain)), seeds: [],
    checkpoints: L.checkpoints, cp: 0, signs: L.signs, goal: L.goal,
    camX: 0, camY: LH - VH, shakeAmt: 0, stopT: 0, petrified: 0, startTick: 0, winTick: 0, bloom: 0,
    shake(n) { G.shakeAmt = Math.max(G.shakeAmt, n); },
    stop(n) { G.stopT = Math.max(G.stopT, n); },
  };
  G.camX = Math.max(0, G.player.x - VW / 2);
}
newGame();

function respawn() {
  const cp = G.checkpoints[G.cp];
  G.player = new Player(cp.x + 6, cp.y - 19);
  G.player.invuln = 60;
  G.fx.ring(cp.x + 8, cp.y - 10, 2, 16, 24, PAL.sapL[4], 0.4);
}

// ─── 업데이트 ────────────────────────────────────────────────
function update() {
  input.tick();
  modeT++;
  if (mode === 'title') {
    G.tick++;
    G.camX = (Math.sin(G.tick * 0.0016 - 1.57) * 0.5 + 0.5) * (LW - VW);
    G.camY = LH - VH - 10;
    G.fx.update(G.terrain); ambient();
    if (modeT > 20 && input.takePressed()) { mode = 'play'; modeT = 0; G.startTick = G.tick; sfx('start'); input.mouseDown = false; G.camX = Math.max(0, G.player.x - VW / 2); }
    return;
  }
  if (input.takeRestart() || (mode === 'win' && modeT > 120 && input.takePressed())) {
    setJet(false); newGame(); mode = 'play'; modeT = 0; input.mouseDown = false; return;
  }
  if (G.stopT > 0) { G.stopT--; return; } // 타격 멈춤

  G.tick++;
  const p = G.player;
  if (mode === 'play') {
    input.aimX = input.mx + G.camX; input.aimY = input.my + G.camY;
    p.update(G, input);
    if (p.dead && --p.deathT <= 0) respawn();
    if (!p.dead && p.y > LH - 18) { p.die(G); G.fx.puff(p.cx, LH - 30, 0, -0.4, 40, 6, PAL.cloud[3], 0.6); }
  } else { setJet(false); p.firing = false; p.vx *= 0.8; }

  G.stream.update(G);
  for (const e of G.enemies) if (!e.dead) e.update(G);
  for (const s of G.seeds) s.update(G);
  G.seeds = G.seeds.filter(s => !s.dead);
  G.terrain.update(G.tick, G.rng, G.fx);
  if (G.terrain.hardenedThisTick > 6) sfx('harden', 0.08);
  if (G.tick % 10 === 0 && G.terrain.decay(G.tick, G.rng, G.fx) > 0) sfx('crumble', 0.3);
  if (!p.dead) unstick(p, G.terrain);
  for (const e of G.enemies) if (!e.dead && !e.flies) unstick(e, G.terrain);
  G.fx.update(G.terrain);
  ambient();

  // 체크포인트 등불
  for (let k = G.cp + 1; k < G.checkpoints.length; k++) {
    const c = G.checkpoints[k];
    if (!p.dead && p.cx > c.x - 4) {
      G.cp = k; c.lit = true; sfx('checkpoint');
      G.fx.flash(c.x + 4, c.y - 18, 40, PAL.sapL[4], 0.8, 30);
      for (let q = 0; q < 12; q++) G.fx.spark(c.x + 4, c.y - 18, G.rng.range(-1.5, 1.5), G.rng.range(-2.5, -0.5), 30, PAL.sapL[5], PAL.sapL[3], 0.4, 0.05);
      G.fx.ring(c.x + 4, c.y - 18, 2, 14, 22, PAL.sapL[5], 0.4);
    }
  }
  // 묘목에 닿으면 클리어
  if (mode === 'play' && !p.dead && Math.abs(p.cx - G.goal.x) < 12) {
    mode = 'win'; modeT = 0; G.winTick = G.tick; sfx('win');
    G.fx.flash(G.goal.x, G.goal.y - 20, 120, PAL.sapL[4], 1.2, 80);
    for (let k = 0; k < 4; k++) G.fx.ring(G.goal.x, G.goal.y - 18, 2, 30 + k * 14, 40 + k * 10, PAL.sapL[5], 0.5);
  }
  if (mode === 'win') {
    G.bloom = Math.min(1, G.bloom + 0.012);
    if (G.tick % 3 === 0) G.fx.mote(G.goal.x + G.rng.range(-20, 20), G.goal.y - G.rng.range(0, 40), G.rng.range(-0.2, 0.2), -0.4, 120, PAL.sapL[4], 0.4);
  }

  // 카메라: 겨누는 쪽을 조금 더 보여 준다
  const tx = p.cx - VW / 2 + (input.mx - VW / 2) * 0.12;
  const ty = p.y - VH * 0.58 + (input.my - VH / 2) * 0.06;
  G.camX += (tx - G.camX) * 0.1;
  G.camY += (ty - G.camY) * 0.08;
  G.camX = Math.max(0, Math.min(LW - VW, G.camX));
  G.camY = Math.max(0, Math.min(LH - VH, G.camY));
  if (G.shakeAmt > 0) { G.shakeAmt *= 0.86; if (G.shakeAmt < 0.3) G.shakeAmt = 0; }
}

// 떠다니는 꽃가루와 반딧불
function ambient() {
  if (G.tick % 6) return;
  const warm = G.rng.next() < 0.6;
  G.fx.mote(G.camX + G.rng.range(-20, VW + 20), G.camY + G.rng.range(20, VH - 50),
    G.rng.range(-0.15, 0.25), G.rng.range(-0.12, 0.05), G.rng.int(160, 260), warm ? PAL.sapL[4] : PAL.teal[3], warm ? 0.22 : 0.3);
}

// ─── 소품 그리기 ─────────────────────────────────────────────
function drawLantern(f, c, tick) {
  const x = c.x, y = c.y;
  f.rect(x + 3, y - 22, 2, 22, PAL.sapS[1]); f.px(x + 3, y - 22, PAL.sapS[2]);
  f.rect(x + 3, y - 23, 6, 1, PAL.sapS[1]);
  const lx = x + 6, ly = y - 21;
  f.rect(lx, ly, 5, 1, PAL.brass[1]);
  f.rect(lx, ly + 1, 5, 6, PAL.ink);
  if (c.lit) {
    const fl = 0.75 + 0.25 * Math.sin(tick * 0.2 + x) * Math.sin(tick * 0.07);
    f.rect(lx + 1, ly + 2, 3, 4, PAL.sapL[4]); f.px(lx + 2, ly + 3, PAL.sapL[5]);
    f.glow(lx + 2, ly + 4, 30, PAL.sapL[4], 0.3 * fl);
    f.glow(lx + 2, ly + 4, 8, PAL.sapL[5], 0.4 * fl);
  } else f.rect(lx + 1, ly + 2, 3, 4, PAL.stone[3]);
  f.rect(lx, ly + 7, 5, 1, PAL.brass[1]);
}

function drawSignPost(f, s, T) {
  const gy = T.groundY(s.x + 4, s.y + 10);
  f.rect(s.x + 3, gy - 9, 2, 9, PAL.sapS[1]);
  f.rect(s.x, gy - 13, 8, 5, PAL.sapS[2]); f.rect(s.x, gy - 13, 8, 1, PAL.sapS[3]); f.rect(s.x, gy - 9, 8, 1, PAL.sapS[0]);
  f.px(s.x + 2, gy - 11, PAL.sapS[0]); f.px(s.x + 5, gy - 11, PAL.sapS[0]);
}

// 세계수 묘목: 잿빛으로 말라 있다가 클리어하면 호박빛 잎이 돋는다
function drawSapling(f, g, tick, bloom) {
  const x = g.x, y = g.y;
  const bark = bloom > 0.3 ? PAL.sapS[2] : PAL.stone[4], dark = bloom > 0.3 ? PAL.sapS[1] : PAL.stone[3];
  for (let k = 0; k < 30; k++) { const w = k < 4 ? 3 : 2; f.rect(x - 1 + Math.round(Math.sin(k * 0.15) * 1.5), y - k, w, 1, k % 5 === 0 ? dark : bark); }
  const branches = [[-1, 12, 10], [1, 17, 9], [-1, 22, 8], [1, 26, 6], [-1, 29, 4]];
  for (const [d, h, len] of branches)
    for (let k = 0; k < len; k++) f.px(x + d * k, y - h - Math.floor(k * 0.6), bark);
  const glowK = 0.15 + 0.1 * Math.sin(tick * 0.05);
  f.glow(x, y - 20, 34, PAL.sapL[3], bloom > 0 ? 0.3 + bloom * 0.5 : glowK * 0.4);
  // 잎
  for (const [d, h, len] of branches) {
    const tipx = x + d * (len - 1), tipy = y - h - Math.floor((len - 1) * 0.6);
    const n = bloom > 0 ? Math.ceil(bloom * 7) : 1;
    for (let k = 0; k < n; k++) {
      const a = k * 0.9 + d, r = 1 + (k % 3);
      const c = bloom > 0 ? (k % 2 ? PAL.sapL[4] : PAL.grass[3]) : PAL.stone[3];
      f.px(tipx + Math.round(Math.cos(a) * r), tipy + Math.round(Math.sin(a) * r) - 1, c);
    }
    if (bloom > 0.5) f.glow(tipx, tipy, 8, PAL.sapL[4], 0.2);
  }
}

// 섬 아래 구름바다 (앞쪽, 반투명)
function drawCloudSea(f, tick) {
  const C = PAL.cloud;
  for (let sx = 0; sx < VW; sx++) {
    const wx = sx + f.cx;
    const w1 = Math.sin(wx * 0.035 + tick * 0.012) * 3 + Math.sin(wx * 0.013 - tick * 0.007) * 5;
    const back = LH - 46 + Math.sin(wx * 0.02 - tick * 0.01) * 4;
    for (let wy = Math.floor(back); wy < LH; wy++) {
      const sy = wy - f.cy;
      if (sy < 0 || sy >= VH) continue;
      f.blend(wx, wy, wy - back < 1.5 ? C[3] : C[2], 0.28);
    }
    const top = LH - 32 + w1;
    for (let wy = Math.floor(top); wy < LH; wy++) {
      const sy = wy - f.cy;
      if (sy < 0 || sy >= VH) continue;
      const d = wy - top;
      f.blend(wx, wy, d < 1.5 ? C[4] : d < 5 ? C[3] : C[2], d < 1.5 ? 0.95 : Math.min(0.94, 0.62 + d / 40));
    }
  }
}

// ─── HUD (내부 해상도) ────────────────────────────────────────
function drawHud(f, tick) {
  f.cx = 0; f.cy = 0;
  const p = G.player;
  // 체력: 작은 등불 세 개
  for (let k = 0; k < 3; k++) {
    const x = 8 + k * 11, y = 8, on = k < p.hp;
    f.rect(x + 1, y, 5, 1, PAL.brass[on ? 2 : 0]);
    f.rect(x, y + 1, 7, 8, PAL.ink);
    f.rect(x + 1, y + 2, 5, 6, on ? PAL.sapL[4] : PAL.stone[2]);
    if (on) { f.rect(x + 2, y + 3, 1, 3, PAL.sapL[5]); f.glow(x + 3, y + 5, 9, PAL.sapL[4], 0.25); }
    f.rect(x + 1, y + 9, 5, 1, PAL.brass[on ? 1 : 0]);
  }
  // 수액통
  const bx = 44, by = 10, bw = 70, bh = 6, fill = Math.round((bw - 2) * p.tank / TANK_MAX);
  const low = p.tank < 20 && (tick >> 3) & 1;
  f.rect(bx - 1, by - 1, bw + 2, bh + 2, low ? PAL.red[2] : PAL.brass[1]);
  f.rect(bx, by, bw, bh, PAL.ink);
  f.rect(bx + 1, by + 1, fill, bh - 2, PAL.sapL[3]);
  f.rect(bx + 1, by + 1, fill, 1, PAL.sapL[5]);
  f.rect(bx + 1, by + bh - 2, fill, 1, PAL.sapL[2]);
  for (let k = 0; k < 3; k++) {
    const bxx = bx + 3 + ((tick * 0.3 + k * 23) % Math.max(1, fill - 4));
    if (fill > 6) f.px(bxx, by + 2 + (k & 1), PAL.sapL[5]);
  }
  if (p.firing) f.glow(bx + fill, by + 3, 10, PAL.sapL[4], 0.3);
  f.px(bx - 3, by + 2, PAL.brass[2]); f.rect(bx - 4, by + 1, 2, 4, PAL.brass[1]);
}

// ─── 화면 글자 (확대된 캔버스에 그린다) ─────────────────────────
const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
function text(str, x, y, { size = 14, color = '#f2ecff', align = 'left', weight = 'bold', outline = '#120d1f', alpha = 1 } = {}) {
  if (!str) return;
  mctx.globalAlpha = alpha;
  mctx.font = `${weight} ${size}px ${FONT}`;
  mctx.textAlign = align; mctx.textBaseline = 'middle';
  mctx.lineJoin = 'round'; mctx.lineWidth = Math.max(3, size / 4); mctx.strokeStyle = outline;
  mctx.strokeText(str, x, y);
  mctx.fillStyle = color; mctx.fillText(str, x, y);
  mctx.globalAlpha = 1;
}

function drawSignsText() {
  const T = G.terrain;
  for (const s of G.signs) {
    const lines = pick(TEXT.signs[s.key], input.touchMode);
    const gy = T.groundY(s.x + 4, s.y + 10);
    const sx = (s.x + 4 - G.camX) * SCALE, sy = (gy - 16 - G.camY) * SCALE;
    if (sx < -500 || sx > VW * SCALE + 500) continue;
    lines.forEach((ln, k) => text(ln, sx, sy - (lines.length - 1 - k) * 22, { size: 14, align: 'left', color: '#efe7ff' }));
  }
}

function drawTouchControls() {
  mctx.save();
  for (const [name, b] of Object.entries(BTN)) {
    const on = input.touch[name];
    mctx.beginPath(); mctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    mctx.fillStyle = on ? 'rgba(255, 180, 54, 0.32)' : 'rgba(239, 231, 255, 0.10)'; mctx.fill();
    mctx.lineWidth = 2; mctx.strokeStyle = on ? 'rgba(255, 214, 102, 0.9)' : 'rgba(239, 231, 255, 0.35)'; mctx.stroke();
    const label = b.label === 'jump' ? TEXT.btnJump : b.label === 'restart' ? TEXT.btnRestart : b.label;
    text(label, b.x, b.y + 1, { size: name === 'restart' ? 14 : name === 'jump' ? 18 : 24, align: 'center', color: on ? '#fff3c4' : 'rgba(239,231,255,0.8)', outline: 'rgba(18,13,31,0.6)' });
  }
  mctx.restore();
}

function drawOverlay() {
  const W = VW * SCALE, H = VH * SCALE, tm = input.touchMode;
  if (mode === 'title') {
    const a = Math.min(1, Math.max(0, (modeT - 120) / 40));
    TEXT.story.forEach((ln, k) => text(ln, W / 2, H * 0.6 + k * 26, { size: 15, align: 'center', weight: 'normal', alpha: a }));
    if (modeT > 150 && ((modeT >> 5) & 1)) text(pick(TEXT.start, tm), W / 2, H * 0.8, { size: 18, align: 'center', color: '#fff3c4' });
    return;
  }
  drawSignsText();
  if (mode === 'play' && modeT < 180) text(TEXT.stage, W / 2, 60, { size: 20, align: 'center', alpha: Math.min(1, (180 - modeT) / 40) });
  if (!tm && mode === 'play') text(pick(TEXT.hint, tm), 14, H - 16, { size: 11, weight: 'normal', alpha: 0.6 });
  if (tm && mode === 'play') drawTouchControls();
  if (mode === 'win' && modeT > 90) {
    const a = Math.min(1, (modeT - 90) / 30);
    mctx.fillStyle = `rgba(10, 8, 24, ${0.55 * a})`; mctx.fillRect(0, 0, W, H);
    text(TEXT.win, W / 2, H * 0.36, { size: 44, align: 'center', color: css(PAL.sapL[4]), alpha: a });
    text(TEXT.winSub, W / 2, H * 0.36 + 50, { size: 16, align: 'center', weight: 'normal', alpha: a });
    text(TEXT.winStats(((G.winTick - G.startTick) / 60).toFixed(1), G.petrified), W / 2, H * 0.36 + 84, { size: 16, align: 'center', alpha: a });
    text(pick(TEXT.again, tm), W / 2, H * 0.36 + 130, { size: 16, align: 'center', color: '#fff3c4', alpha: a * ((modeT >> 5) & 1 ? 1 : 0.6) });
  }
  if (tm && innerHeight > innerWidth) {
    mctx.fillStyle = 'rgba(8, 8, 20, 0.9)'; mctx.fillRect(0, 0, W, H);
    text(TEXT.rotate, W / 2, H / 2, { size: 34, align: 'center' });
  }
}

// ─── 그리기 ──────────────────────────────────────────────────
function render() {
  const f = frame, tick = G.tick;
  const sx = G.shakeAmt ? Math.round((G.rng.next() - 0.5) * G.shakeAmt) : 0;
  const sy = G.shakeAmt ? Math.round((G.rng.next() - 0.5) * G.shakeAmt) : 0;
  f.clear(); f.setCam(G.camX + sx, G.camY + sy);
  G.terrain.render(f, tick);
  for (const c of G.checkpoints) drawLantern(f, c, tick);
  for (const s of G.signs) drawSignPost(f, s, G.terrain);
  drawSapling(f, G.goal, tick, G.bloom);
  for (const e of G.enemies) if (!e.dead && e.x > f.cx - 40 && e.x < f.cx + VW + 40) e.draw(f, tick);
  for (const s of G.seeds) s.draw(f, tick);
  G.player.draw(f, tick);
  G.stream.draw(f);
  G.fx.draw(f);
  drawCloudSea(f, tick);
  bg.lights(f, f.cx, f.cy, tick);
  if (mode === 'title') {
    // 배경을 살짝 어둡게 눌러 로고를 띄운다
    f.cx = 0; f.cy = 0;
    for (let y = 0; y < VH; y++) { const a = 0.32 * (1 - Math.abs(y - 80) / 200); if (a > 0) for (let x = 0; x < VW; x++) f.blend(x, y, PAL.sky[0], a); }
    logo.draw(f, modeT, VW / 2, 74);
  } else drawHud(f, tick);
  f.present(fgCtx, lightCtx);

  lowCtx.globalCompositeOperation = 'source-over';
  bg.draw(lowCtx, f.cx, f.cy, tick);
  lowCtx.drawImage(fgC, 0, 0);
  lowCtx.globalCompositeOperation = 'lighter';
  lowCtx.drawImage(lightC, 0, 0);
  lowCtx.globalCompositeOperation = 'source-over';

  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(low, 0, 0, VW * SCALE, VH * SCALE);
  drawOverlay();
}

// ─── 루프 ────────────────────────────────────────────────────
let acc = 0, last = performance.now();
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= STEP) { update(); acc -= STEP; }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 자동 시험용 창구
window.__game = {
  get G() { return G; }, get mode() { return mode; }, input,
  start() { mode = 'play'; modeT = 0; G.startTick = G.tick; },
  step(n = 1) { for (let k = 0; k < n; k++) update(); render(); },
};
