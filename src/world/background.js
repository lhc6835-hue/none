// 배경: 미리 한 번 그려 둔 레이어들을 시차(패럴랙스)로 겹친다.
import { Frame, bayer } from '../core/frame.js';
import { PAL, mix, css } from '../core/color.js';
import { Rng, hash2, fbm } from '../core/rng.js';
import { VW, VH, LW } from '../config.js';

const LAYER_H = 300;
const widthFor = par => Math.ceil(VW + (LW - VW) * par) + 8;

// 디더로 두 색 사이를 섞는다
const dither = (x, y, a, b, t) => (t > bayer(x, y) ? b : a);

function makeSky() {
  const f = new Frame(VW, VH, false), S = PAL.sky, n = S.length - 1;
  const rng = new Rng(5);
  for (let y = 0; y < VH; y++) {
    const t = Math.pow(y / (VH - 1), 1.15) * n;
    const i = Math.min(n - 1, Math.floor(t));
    for (let x = 0; x < VW; x++) f.out[y * VW + x] = dither(x, y, S[i], S[i + 1], t - i);
  }
  // 별: 위쪽일수록 많고 밝다
  for (let k = 0; k < 160; k++) {
    const x = rng.int(0, VW - 1), y = Math.floor(Math.pow(rng.next(), 1.8) * 150);
    const b = rng.next();
    const c = b > 0.92 ? PAL.white : b > 0.6 ? PAL.far[4] : PAL.far[3];
    f.px(x, y, c);
    if (b > 0.97 && y > 2) { f.px(x + 1, y, PAL.far[3]); f.px(x - 1, y, PAL.far[3]); f.px(x, y + 1, PAL.far[3]); f.px(x, y - 1, PAL.far[3]); }
  }
  // 달: 왼쪽 위에서 빛을 받는 둥근 달, 옅은 무리
  const mx = 372, my = 54, mr = 20;
  for (let r = mr + 14; r > mr; r -= 2) f.disc(mx, my, r, PAL.far[4], 0.05);
  for (let dy = -mr; dy <= mr; dy++)
    for (let dx = -mr; dx <= mr; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > mr * mr) continue;
      const lit = (dx + dy) / mr; // 오른쪽 아래로 갈수록 어둡다
      let c = lit < -0.6 ? PAL.cream[3] : lit < 0.5 ? PAL.cream[2] : PAL.cream[1];
      if (lit > 0.2 && lit < 0.5 && bayer(mx + dx, my + dy) < 0.5) c = PAL.cream[1];
      const cr = hash2((dx + 40) >> 2, (dy + 40) >> 2, 31);
      if (cr < 0.18 && d2 < (mr - 2) * (mr - 2)) c = mix(c, PAL.cream[0], 0.35);
      if (d2 > (mr - 1) * (mr - 1)) c = mix(c, PAL.far[4], 0.4);
      f.px(mx + dx, my + dy, c);
    }
  return f.toCanvas();
}

// 산맥: 구름바다 위로 솟은 먼 봉우리. 꼭대기는 눈, 아래로 갈수록 안개
function makePeaks(par) {
  const w = widthFor(par), f = new Frame(w, LAYER_H, false), F = PAL.far;
  const ridge = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    const r = 1 - Math.abs(fbm(x / 70, 41, 3) * 2 - 1);
    ridge[x] = 175 - fbm(x / 160, 40, 3) * 70 - r * 55;
  }
  for (let x = 0; x < w; x++) {
    const top = Math.floor(ridge[x]);
    // 넓게 본 기울기: 왼쪽에서 오는 빛을 받는 비탈은 밝다
    const slope = ridge[Math.min(w - 1, x + 6)] - ridge[Math.max(0, x - 6)];
    const lit = Math.max(0, Math.min(1, 0.5 + slope / 30));
    for (let y = top; y < LAYER_H; y++) {
      const d = y - top;
      // 색은 단계로 끊고, 경계 두 줄만 디더
      let c = lit > 0.56 ? F[1] : lit < 0.44 ? F[0] : dither(x, y, F[0], F[1], (lit - 0.44) / 0.12);
      if (d < 6 && top < 130) c = d === 0 ? F[5] : lit > 0.5 ? F[4] : F[3];
      else if (d < 1) c = F[2];
      const hz = y - 150;
      if (hz > 30) c = F[2]; else if (hz > 26) c = dither(x, y, c, F[2], 0.5);
      f.out[y * w + x] = c;
    }
  }
  // 봉우리 밑동을 감싸는 먼 구름띠
  for (let x = 0; x < w; x++) {
    const t = 196 + Math.sin(x * 0.045) * 4 + Math.sin(x * 0.013 + 1) * 6;
    for (let y = Math.floor(t); y < LAYER_H; y++) {
      const d = y - t;
      f.out[y * w + x] = d < 1.5 ? F[5] : d < 4 ? dither(x, y, F[4], F[5], 0.4) : dither(x, y, F[3], F[4], Math.max(0, 0.7 - d / 40));
    }
  }
  return { canvas: f.toCanvas(), par, w, drift: 0 };
}

// 마스크(1=채움)를 위에서 빛 받는 구름 색으로 칠한다
function shadeCloudMask(f, mask, w, h, C) {
  for (let x = 0; x < w; x++) {
    let d = 0;
    for (let y = 0; y < h; y++) {
      const i = y * w + x;
      if (!mask[i]) { d = 0; continue; }
      d++;
      let bottom = 0;
      while (bottom < 4 && y + bottom + 1 < h && mask[i + (bottom + 1) * w]) bottom++;
      let c = d <= 1 ? C[4] : d <= 3 ? C[3] : d <= 6 ? dither(x, y, C[3], C[2], (d - 3) / 3) : C[2];
      if (bottom < 2) c = C[1];
      else if (bottom < 4) c = dither(x, y, c, C[1], 0.5);
      f.out[i] = c;
    }
  }
}

function makeClouds(par) {
  const w = 1024, h = LAYER_H, f = new Frame(w, h, false), mask = new Uint8Array(w * h);
  const rng = new Rng(77);
  for (let k = 0; k < 9; k++) {
    const cx = rng.range(0, w), cy = rng.range(70, 165), span = rng.range(50, 150);
    const n = Math.floor(span / 9);
    for (let j = 0; j < n; j++) {
      const u = j / (n - 1 || 1);
      const r = (Math.sin(u * Math.PI) * 0.75 + 0.25) * rng.range(10, 22) * (span / 110);
      const bx = cx - span / 2 + u * span, by = cy - r * 0.35;
      for (let dy = -Math.ceil(r); dy <= 0; dy++)
        for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const x = ((Math.floor(bx + dx) % w) + w) % w, y = Math.floor(by + dy);
          if (y >= 0 && y < h) mask[y * w + x] = 1;
        }
      // 평평한 바닥
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++)
        for (let dy = 0; dy < 3; dy++) {
          const x = ((Math.floor(bx + dx) % w) + w) % w, y = Math.floor(cy + dy);
          if (y < h && Math.abs(dx) < r * 0.9) mask[y * w + x] = 1;
        }
    }
  }
  shadeCloudMask(f, mask, w, h, PAL.cloud);
  return { canvas: f.toCanvas(), par, w, drift: 0.04, wrap: true };
}

// 섬 하나: 평평한 윗면, 아래로 뾰족하게 좁아지는 바위
function island(f, cx, top, hw, depth, C, topC, seed) {
  for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
    const u = (x - cx) / hw;
    if (Math.abs(u) > 1) continue;
    const t = top + Math.floor(hash2(x >> 2, 0, seed) * 2);
    const bot = t + 3 + depth * Math.pow(1 - u * u, 0.8) * (0.75 + 0.25 * hash2(x >> 1, 1, seed));
    for (let y = t; y < bot; y++) {
      const d = y - t, rel = d / (bot - t);
      let c = rel < 0.35 ? C[3] : rel < 0.7 ? C[2] : C[1];
      if (u < -0.6) c = C[Math.min(4, 3 + (rel < 0.4 ? 1 : 0))];
      if (bot - y < 2) c = C[0];
      if (d < 2) c = d === 0 ? topC[2] : topC[1];
      f.px(x, y, c);
    }
  }
}

function tree(f, x, base, h, round, C) {
  if (round) {
    f.rect(x, base - h * 0.5, 2, h * 0.5, C[0]);
    const r = h * 0.4;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++)
        if (dx * dx + dy * dy <= r * r) f.px(x + 1 + dx, base - h * 0.6 + dy, dx + dy < -r * 0.6 ? C[2] : C[1]);
  } else {
    for (let k = 0; k < h; k++) {
      const hw = Math.floor((k / h) * h * 0.3 * (1 - ((k * 3) % h) / h * 0.3));
      for (let dx = -hw; dx <= hw; dx++) f.px(x + dx, base - h + k, dx < 0 && k % 4 < 2 ? C[2] : C[1]);
    }
    f.rect(x, base - 2, 1, 2, C[0]);
  }
}

// 세계수: 수액이 멈춰 잿빛이 된 거대한 나무. 가지 끝에 희미한 호박빛이 남아 있다
function makeWorldTree(par) {
  const w = widthFor(par), f = new Frame(w, LAYER_H, false), T = PAL.tree;
  const cx = 620;
  island(f, cx, 214, 150, 70, PAL.isle, PAL.isleTop, 50);
  const glows = [];
  // 줄기
  for (let y = 214; y > 92; y--) {
    const k = (214 - y) / 122;
    const hw = 10 + (1 - k) * 6 + Math.max(0, (y - 200)) * 1.4;
    const ox = Math.sin(k * 3) * 6;
    for (let dx = -hw; dx <= hw; dx++) f.px(cx + ox + dx, y, dx < -hw * 0.4 ? T[2] : dx > hw * 0.5 ? T[0] : T[1]);
  }
  // 가지
  const rng = new Rng(9);
  for (let b = 0; b < 9; b++) {
    const y0 = rng.range(100, 150), dir = b % 2 ? 1 : -1, len = rng.range(50, 120);
    for (let k = 0; k < len; k++) {
      const x = cx + dir * k, y = y0 - k * 0.45 + Math.sin(k * 0.08) * 4, th = Math.max(1, 5 - k / 25);
      f.rect(x, y, 2, th, T[1]);
    }
  }
  // 수관: 둥근 덩어리들
  const mask = new Uint8Array(w * LAYER_H);
  for (let k = 0; k < 46; k++) {
    const bx = cx + rng.range(-170, 170) * (0.6 + 0.4 * rng.next()), by = rng.range(30, 120) + Math.abs(bx - cx) * 0.18;
    const r = rng.range(14, 30);
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = Math.floor(bx + dx), y = Math.floor(by + dy);
        if (x >= 0 && x < w && y >= 0 && y < LAYER_H) mask[y * w + x] = 1;
      }
    if (rng.next() < 0.6) glows.push({ x: bx + rng.range(-8, 8), y: by + rng.range(-6, 10) });
  }
  shadeCloudMask(f, mask, w, LAYER_H, [T[0], T[0], T[1], T[2], T[3]]);
  for (const g of glows) { f.px(g.x, g.y, PAL.sapS[2]); f.px(g.x + 1, g.y, PAL.sapS[1]); }
  return { canvas: f.toCanvas(), par, w, drift: 0, glows, heart: { x: cx, y: 150 } };
}

// 작은 하늘섬들과 폭포
function makeIslands(par, seed, count, yRange, sizeRange, C, topC, trees, fallsChance) {
  const w = widthFor(par), f = new Frame(w, LAYER_H, false), rng = new Rng(seed);
  const falls = [];
  for (let k = 0; k < count; k++) {
    const cx = (k + 0.5) * (w / count) + rng.range(-40, 40);
    const top = rng.range(yRange[0], yRange[1]), hw = rng.range(sizeRange[0], sizeRange[1]);
    island(f, cx, top, hw, hw * rng.range(0.7, 1.2), C, topC, seed + k);
    const nt = Math.floor(hw / 9);
    for (let t = 0; t < nt; t++) {
      if (rng.next() < 0.5) continue;
      tree(f, cx + rng.range(-hw * 0.8, hw * 0.8), top + 1, rng.range(trees[0], trees[1]), rng.next() < 0.5, [C[0], C[1], C[2]]);
    }
    if (rng.next() < fallsChance) falls.push({ x: Math.floor(cx + rng.range(-hw * 0.5, hw * 0.5)), y: Math.floor(top + 2), len: Math.floor(rng.range(60, 140)) });
  }
  return { canvas: f.toCanvas(), par, w, drift: 0, falls };
}

// 앞쪽 구름바다 둑
function makeCloudBank(par) {
  const w = widthFor(par), h = LAYER_H, f = new Frame(w, h, false), mask = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    const top = 238 + Math.sin(x * 0.03) * 6 + Math.sin(x * 0.011 + 2) * 9 - Math.abs(Math.sin(x * 0.07)) * 5;
    for (let y = Math.floor(top); y < h; y++) mask[y * w + x] = 1;
  }
  shadeCloudMask(f, mask, w, h, [PAL.cloud[0], PAL.cloud[0], PAL.cloud[1], PAL.cloud[2], PAL.cloud[3]]);
  return { canvas: f.toCanvas(), par, w, drift: 0 };
}

export class Background {
  constructor() {
    this.sky = makeSky();
    this.peaks = makePeaks(0.04);
    this.clouds = makeClouds(0.08);
    this.tree = makeWorldTree(0.12);
    this.isles = makeIslands(0.2, 101, 7, [110, 170], [18, 34], PAL.isle, PAL.isleTop, [6, 12], 0.6);
    this.near = makeIslands(0.34, 202, 5, [150, 200], [30, 55], [PAL.isle[0], PAL.isle[0], PAL.isle[1], PAL.isle[2], PAL.isle[2]], [PAL.isle[1], PAL.leaf[0], PAL.leaf[1]], [10, 20], 0.4);
    this.bank = makeCloudBank(0.5);
    this.layers = [this.peaks, this.clouds, this.tree, this.isles, this.near, this.bank];
  }

  layerX(L, camX, tick) {
    const x = camX * L.par + tick * L.drift;
    return L.wrap ? -(((x % L.w) + L.w) % L.w) : -x;
  }
  layerY(L, camY) { return Math.round(20 - camY * L.par * 1.3); }

  draw(ctx, camX, camY, tick) {
    ctx.drawImage(this.sky, 0, 0);
    for (const L of this.layers) {
      const x = Math.round(this.layerX(L, camX, tick)), y = this.layerY(L, camY);
      ctx.drawImage(L.canvas, x, y);
      if (L.wrap && x + L.w < VW) ctx.drawImage(L.canvas, x + L.w, y);
      if (L.falls) this.drawFalls(ctx, L, x, y, tick);
    }
  }

  // 폭포: 흘러내리는 줄무늬와 아래쪽 물안개
  drawFalls(ctx, L, ox, oy, tick) {
    const C = PAL.falls;
    for (const fl of L.falls) {
      const x = ox + fl.x, y = oy + fl.y;
      if (x < -4 || x > VW + 4) continue;
      for (let k = 0; k < fl.len; k++) {
        const a = 1 - k / fl.len;
        const s = (k - tick * 0.6) % 9;
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = css(Math.abs(s) < 2 ? C[2] : C[1]);
        ctx.fillRect(x, y + k, 2, 1);
        if (k % 3 === 0) { ctx.fillStyle = css(C[0]); ctx.fillRect(x + 2, y + k, 1, 1); }
      }
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = css(C[1]);
      for (let k = 0; k < 4; k++) {
        const r = 3 + ((tick * 0.05 + k) % 4);
        ctx.fillRect(x - r + 1, y + fl.len - 2 - k * 2, r * 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  // 화면 좌표 빛: 달무리, 세계수 심장의 희미한 맥박
  lights(f, camX, camY, tick) {
    const cx = f.cx, cy = f.cy;
    f.cx = 0; f.cy = 0;
    f.glow(372, 54, 90, PAL.far[4], 0.12);
    const T = this.tree, tx = this.layerX(T, camX, tick), ty = this.layerY(T, camY);
    const pulse = 0.5 + 0.5 * Math.sin(tick * 0.02);
    f.glow(tx + T.heart.x, ty + T.heart.y, 60, PAL.sapS[3], 0.05 + 0.03 * pulse);
    for (let k = 0; k < T.glows.length; k += 2) {
      const g = T.glows[k];
      f.glow(tx + g.x, ty + g.y, 6, PAL.sapS[4], 0.12 * (0.6 + 0.4 * Math.sin(tick * 0.03 + k)));
    }
    f.cx = cx; f.cy = cy;
  }
}
