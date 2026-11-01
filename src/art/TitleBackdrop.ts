// 타이틀 배경: 새벽빛이 드는 온실 한 장면 (10문서 1-3절). 800×360 한 장을 팔레트 색으로만 구워 낸다.
// 월드 좌표 x∈[-80, 720) 가 캔버스 x∈[0, 800) 이다. 난수는 시드 고정이라 언제나 같은 그림이 나온다.

import { PixelCanvas } from './PixelCanvas';
import { RAMPS, SPECIAL } from './palette';
import { Rng } from '../core/Rng';

export const BACKDROP_W = 800;
export const BACKDROP_H = 360;
const OFFSET = 80;

const SKY_BANDS: { to: number; color: string }[] = [
  { to: 40, color: RAMPS.R4[0] },
  { to: 82, color: RAMPS.R5[1] },
  { to: 122, color: RAMPS.R5[2] },
  { to: 160, color: RAMPS.R6[2] },
  { to: 196, color: RAMPS.R6[3] },
  { to: 226, color: RAMPS.R8[3] },
  { to: 360, color: RAMPS.R9[4] },
];

function drawSky(c: PixelCanvas): void {
  let from = 0;
  SKY_BANDS.forEach((band, i) => {
    c.rect(0, from, BACKDROP_W, band.to - from, band.color);
    // 다음 띠와 섞이는 2색 체크 디더링 띠
    const next = SKY_BANDS[i + 1];
    if (next) {
      c.dither(0, band.to - 3, BACKDROP_W, 3, band.color, next.color, 0);
      c.dither(0, band.to, BACKDROP_W, 3, next.color, band.color, 1);
    }
    from = band.to;
  });
}

function drawStars(c: PixelCanvas, rng: Rng): void {
  for (let i = 0; i < 12; i++) {
    const x = rng.int(0, BACKDROP_W - 1);
    const y = rng.int(2, 110);
    const color = y < 50 ? SPECIAL.PAPER : RAMPS.R5[4];
    c.px(x, y, color);
    if (i % 9 === 0) {
      // 몇 개는 작은 십자 반짝이
      c.px(x - 1, y, color)
        .px(x + 1, y, color)
        .px(x, y - 1, color)
        .px(x, y + 1, color);
    }
  }
}

/** 정수 단차로 굴곡을 만든 언덕. 규칙적인 계단이 나오도록 완만한 파형을 쓴다. */
function drawHills(
  c: PixelCanvas,
  base: number,
  amp: number,
  period: number,
  phase: number,
  color: string,
): void {
  for (let x = 0; x < BACKDROP_W; x++) {
    const h = Math.round(
      base -
        amp * Math.sin((x + phase) / period) -
        amp * 0.4 * Math.sin((x + phase) / (period * 0.43)),
    );
    c.rect(x, h, 1, BACKDROP_H - h, color);
  }
}

function drawGreenhouse(c: PixelCanvas): void {
  const cx = 400; // 캔버스 가운데 = 월드 x 320
  const baseY = 300;
  const frame = RAMPS.R11[1];
  const frameLight = RAMPS.R11[2];
  const glass = RAMPS.R4[3];
  const glassDark = RAMPS.R4[2];
  const warm = RAMPS.R8[4];

  // 날개(양옆 낮은 건물) + 본관(가운데 높은 건물)
  const parts = [
    { x: cx - 150, w: 70, top: baseY - 46 },
    { x: cx + 80, w: 70, top: baseY - 46 },
    { x: cx - 80, w: 160, top: baseY - 76 },
  ];
  for (const p of parts) {
    // 유리 벽: 안쪽에서 새어 나오는 따뜻한 불빛(디더링)
    c.rect(p.x, p.top, p.w, baseY - p.top, glassDark);
    c.rect(p.x + 1, p.top + 1, p.w - 2, baseY - p.top - 2, glass);
    c.rect(p.x + 1, p.top + (baseY - p.top) / 2, p.w - 2, (baseY - p.top) / 2 - 1, warm);
    // 철제 창살
    for (let x = p.x; x <= p.x + p.w; x += 14) c.vline(x, p.top, baseY - p.top, frame);
    for (let y = p.top; y <= baseY; y += 15) c.hline(p.x, y, p.w + 1, frame);
    c.hline(p.x, p.top - 1, p.w + 1, frameLight);
    // 지붕: 계단식 삼각형(2px당 1px 오르는 규칙적인 경사)
    const half = Math.floor(p.w / 2);
    for (let i = 0; i <= half; i += 1) {
      const y = p.top - 1 - Math.floor(i / 2);
      c.px(p.x + i, y, frame);
      c.px(p.x + p.w - i, y, frame);
      if (i % 14 === 0) c.vline(p.x + i, y, p.top - y, frame);
      if (i % 14 === 0) c.vline(p.x + p.w - i, y, p.top - y, frame);
    }
    const peakY = p.top - 1 - Math.floor(half / 2);
    c.hline(p.x + half - 1, peakY, 3, frameLight);
    c.px(p.x + half, peakY - 1, frameLight);
  }

  // 선반 위 식물 실루엣(안쪽에서 비치는 모습)
  const rng = new Rng('art:title:shelf');
  for (const p of parts) {
    const shelfY = baseY - 14;
    c.hline(p.x + 3, shelfY, p.w - 5, RAMPS.R10[1]);
    for (let x = p.x + 6; x < p.x + p.w - 6; x += rng.int(8, 12)) {
      const h = rng.int(5, 11);
      c.rect(x, shelfY - h, 2, h, RAMPS.R1[0]);
      c.rect(x - 2, shelfY - h + 2, 2, 2, RAMPS.R1[0]);
      c.rect(x + 2, shelfY - h + 1, 2, 2, RAMPS.R1[0]);
    }
  }

  // 문: 둥근 위쪽을 가진 나무 문, 문틈으로 새는 빛
  const dx = cx - 10;
  const dTop = baseY - 34;
  c.rect(dx, dTop, 20, 34, RAMPS.R10[1]);
  c.rect(dx + 2, dTop + 2, 16, 32, RAMPS.R10[2]);
  c.hline(dx + 4, dTop, 12, RAMPS.R10[1]);
  c.vline(dx + 10, dTop + 2, 32, RAMPS.R10[1]);
  c.px(dx + 8, dTop + 19, RAMPS.R9[3]);
  c.px(dx + 12, dTop + 19, RAMPS.R9[3]);
  c.rect(dx + 3, dTop + 3, 3, 8, RAMPS.R9[4]); // 유리창 불빛
  c.rect(dx + 14, dTop + 3, 3, 8, RAMPS.R9[4]);

  // 밑돌
  c.rect(cx - 152, baseY, 304, 6, RAMPS.R11[2]);
  c.hline(cx - 152, baseY, 304, RAMPS.R11[3]);
  for (let x = cx - 152; x < cx + 152; x += 12) c.vline(x, baseY + 1, 5, RAMPS.R11[1]);
}

function drawGround(c: PixelCanvas, rng: Rng): void {
  const top = 306;
  c.rect(0, top, BACKDROP_W, BACKDROP_H - top, RAMPS.R1[1]);
  c.rect(0, top + 12, BACKDROP_W, BACKDROP_H - top - 12, RAMPS.R1[0]);
  c.dither(0, top + 10, BACKDROP_W, 4, RAMPS.R1[1], RAMPS.R1[0], 0);

  // 흙길: 문에서 아래로 넓어지는 사다리꼴, 디딤돌
  for (let y = 306; y < BACKDROP_H; y++) {
    const half = 8 + Math.floor((y - 306) * 0.9);
    c.rect(400 - half, y, half * 2, 1, RAMPS.R10[3]);
    c.px(400 - half, y, RAMPS.R10[2]);
    c.px(400 + half - 1, y, RAMPS.R10[2]);
  }
  for (let y = 312; y < BACKDROP_H - 4; y += 11) {
    const half = 8 + Math.floor((y - 306) * 0.9);
    c.rect(400 - Math.floor(half / 2) - 3, y, 7, 3, RAMPS.R10[4]);
    c.rect(400 + Math.floor(half / 3), y + 4, 6, 3, RAMPS.R10[4]);
  }

  // 풀잎 · 꽃
  for (let i = 0; i < 160; i++) {
    const x = rng.int(0, BACKDROP_W - 1);
    const y = rng.int(top + 2, BACKDROP_H - 2);
    const dist = Math.abs(x - 400);
    if (dist < 8 + (y - 306) * 0.9) continue; // 길 위에는 풀이 나지 않는다
    const h = rng.int(2, 4);
    c.vline(x, y - h, h, rng.chance(0.5) ? RAMPS.R1[3] : RAMPS.R1[2]);
    if (i % 17 === 0) c.px(x, y - h - 1, rng.pick([RAMPS.R6[3], RAMPS.R9[3], SPECIAL.PAPER]));
  }
}

/** 지평선 가까이 지는 해와 번지는 빛(디더링 고리) */
function drawSun(c: PixelCanvas): void {
  const cx = 566;
  const cy = 238;
  for (let r = 30; r > 18; r -= 4) {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      for (let dx = -half; dx <= half; dx++)
        if ((dx + dy + r) % 2 === 0) c.px(cx + dx, cy + dy, RAMPS.R9[4]);
    }
  }
  c.disc(cx, cy, 16, RAMPS.R9[4]);
  c.disc(cx, cy, 12, SPECIAL.PAPER);
  c.hline(cx - 10, cy - 6, 6, RAMPS.R9[4]);
}

/** 먼 산맥: 노을빛을 받은 보라 산과 눈 덮인 봉우리. 규칙적인 1:1 · 2:1 계단 경사 */
function drawMountains(c: PixelCanvas): void {
  const peaks = [
    { x: 40, h: 36, s: 2 },
    { x: 150, h: 52, s: 1 },
    { x: 262, h: 34, s: 2 },
    { x: 380, h: 58, s: 1 },
    { x: 520, h: 40, s: 2 },
    { x: 650, h: 54, s: 1 },
    { x: 770, h: 38, s: 2 },
  ];
  const base = 262;
  for (const p of peaks) {
    const top = base - p.h;
    for (let y = top; y < base; y++) {
      const half = Math.floor((y - top) * p.s * 0.9) + 1;
      c.hline(p.x - half, y, half, RAMPS.R5[2]); // 해를 받는 왼쪽 면
      c.hline(p.x, y, half, RAMPS.R5[1]); // 그늘진 오른쪽 면
      // 산 결: 왼쪽 면에 규칙적인 사선 골
      if ((y - top) % 6 === 3 && half > 6) c.px(p.x - Math.floor(half / 2), y, RAMPS.R5[1]);
      if (y - top < 6) {
        const sh = Math.max(1, half - 1);
        c.hline(p.x - sh, y, sh, RAMPS.R6[4]);
        c.hline(p.x, y, sh, RAMPS.R5[3]);
      }
    }
    // 눈 끝자락의 들쭉날쭉한 경계
    const sy = top + 6;
    const sw = Math.floor(6 * p.s * 0.9) + 1;
    for (let x = -sw; x < sw; x += 3) c.px(p.x + x, sy, x < 0 ? RAMPS.R6[4] : RAMPS.R5[3]);
  }
}

/** 언덕 마루를 따라 늘어선 나무(둥근 활엽수 + 뾰족한 침엽수) */
function drawTreeLine(
  c: PixelCanvas,
  rng: Rng,
  crest: (x: number) => number,
  dark: string,
  mid: string,
  light: string,
): void {
  for (let x = 4; x < BACKDROP_W; x += rng.int(9, 17)) {
    if (x > 236 && x < 566) continue; // 온실 뒤는 비워 둔다
    const y = crest(x);
    if (rng.chance(0.35)) {
      const h = rng.int(10, 16);
      for (let j = 0; j < h; j++) {
        const half = Math.floor(j / 2);
        c.hline(x - half, y - h + j, half * 2 + 1, j % 4 === 3 ? dark : mid);
      }
      c.vline(x, y - h, 3, light);
    } else {
      const r = rng.int(4, 7);
      c.disc(x, y - r + 1, r, mid);
      c.disc(x - 1, y - r, r - 2, light);
      c.disc(x + 1, y - r + 2, r - 2, mid);
      c.hline(x - r, y, r * 2, dark);
    }
  }
}

/** 오른쪽 언덕 위의 어미나무(세계관의 심장). 금빛 반짝이가 잎 사이에서 빛난다 */
function drawMotherTree(c: PixelCanvas, rng: Rng): void {
  const bx = 704;
  const by = 284;
  for (let y = 0; y < 44; y++) {
    const w = 6 + Math.floor(Math.max(0, y - 30) * 0.9);
    c.hline(bx - Math.floor(w / 2), by - y, w, RAMPS.R10[1]);
    c.px(bx - Math.floor(w / 2), by - y, RAMPS.R10[2]);
  }
  c.rect(bx - 14, by - 2, 28, 2, RAMPS.R10[1]);
  const blobs = [
    [0, -62, 20],
    [-20, -54, 15],
    [20, -54, 16],
    [-10, -74, 14],
    [12, -76, 13],
    [-30, -44, 9],
    [30, -46, 10],
  ] as const;
  for (const [dx, dy, r] of blobs) c.disc(bx + dx, by + dy, r, RAMPS.R1[0]);
  for (const [dx, dy, r] of blobs) c.disc(bx + dx - 2, by + dy - 2, r - 3, RAMPS.R1[1]);
  for (const [dx, dy, r] of blobs)
    c.disc(bx + dx - 4, by + dy - 4, Math.max(2, r - 9), RAMPS.R1[2]);
  for (let i = 0; i < 18; i++) {
    const [dx, dy, r] = rng.pick(blobs);
    c.px(bx + dx + rng.int(-r + 3, r - 3), by + dy + rng.int(-r + 3, r - 3), SPECIAL.STARGOLD);
  }
}

/** 길 양옆의 울타리 · 가로등 · 아래 모서리의 덤불(장면을 액자처럼 감싼다) */
function drawForeground(c: PixelCanvas, rng: Rng): void {
  for (const [from, to] of [
    [16, 330],
    [470, 790],
  ] as const) {
    for (let x = from; x <= to; x += 14) {
      c.rect(x, 304, 3, 14, RAMPS.R10[2]);
      c.vline(x, 304, 14, RAMPS.R10[3]);
      c.px(x + 1, 303, RAMPS.R10[3]);
    }
    c.rect(from, 308, to - from + 3, 2, RAMPS.R10[3]);
    c.rect(from, 314, to - from + 3, 2, RAMPS.R10[2]);
  }
  // 가로등: 기둥 + 등 + 땅에 번진 빛
  for (const lx of [362, 436]) {
    for (let r = 12; r > 4; r -= 4)
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -r; dx <= r; dx++)
          if ((dx + dy) % 2 === 0 && Math.abs(dx) + Math.abs(dy) * 3 <= r)
            c.px(lx + dx, 330 + dy, RAMPS.R1[3]);
    c.rect(lx - 1, 296, 2, 34, RAMPS.R11[1]);
    c.rect(lx - 3, 290, 6, 7, RAMPS.R11[1]);
    c.rect(lx - 2, 291, 4, 5, RAMPS.R9[4]);
    c.px(lx - 1, 292, SPECIAL.PAPER);
    c.hline(lx - 4, 289, 8, RAMPS.R11[2]);
  }
  // 모서리 덤불
  for (const [cx, dir] of [
    [26, 1],
    [776, -1],
  ] as const) {
    for (let i = 0; i < 6; i++) {
      const x = cx + dir * rng.int(-10, 60);
      const y = rng.int(334, 358);
      const r = rng.int(10, 18);
      c.disc(x, y, r, RAMPS.R1[0]);
      c.disc(x - 2, y - 3, r - 4, RAMPS.R1[1]);
      c.disc(x - 4, y - 6, Math.max(2, r - 10), RAMPS.R1[2]);
    }
    for (let i = 0; i < 7; i++) {
      const x = cx + dir * rng.int(0, 56);
      const y = rng.int(330, 352);
      const petal = rng.pick([RAMPS.R6[3], RAMPS.R9[4], SPECIAL.PAPER, RAMPS.R7[3]]);
      c.px(x - 1, y, petal)
        .px(x + 1, y, petal)
        .px(x, y - 1, petal)
        .px(x, y + 1, petal);
      c.px(x, y, RAMPS.R9[3]);
    }
  }
}

/** 천천히 흐르는 구름 층(투명 배경). 노을을 받아 아랫면이 복숭아색, 윗면이 연보라 */
export function buildTitleClouds(): PixelCanvas {
  const rng = new Rng('art:title:clouds');
  const c = new PixelCanvas(BACKDROP_W, 170);
  const clouds = [
    { x: 70, y: 112, w: 70 },
    { x: 250, y: 150, w: 54 },
    { x: 430, y: 128, w: 84 },
    { x: 610, y: 104, w: 62 },
    { x: 760, y: 156, w: 46 },
  ];
  for (const cl of clouds) {
    const puffs: [number, number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const r = Math.round((cl.w / 7) * (1 - Math.abs(t - 0.45) * 0.9)) + rng.int(0, 3);
      puffs.push([cl.x + Math.round((t - 0.5) * cl.w), cl.y - Math.round(r * 0.5), r]);
    }
    for (const [x, y, r] of puffs) c.disc(x, y + 2, r, RAMPS.R8[4]);
    for (const [x, y, r] of puffs) c.disc(x, y, r, RAMPS.R6[3]);
    for (const [x, y, r] of puffs) c.disc(x - 1, y - 2, Math.max(1, r - 3), RAMPS.R6[4]);
    for (const [x, y, r] of puffs) c.hline(x - r + 2, y - r + 1, Math.max(1, r - 2), RAMPS.R5[4]);
    // 바닥을 평평하게 깎아 구름답게
    const bottom = cl.y + Math.round(cl.w / 14) + 1;
    c.erase(cl.x - cl.w, bottom + 1, cl.w * 2, 30);
    c.hline(cl.x - Math.round(cl.w * 0.45), bottom, Math.round(cl.w * 0.9), RAMPS.R8[4]);
  }
  return c;
}

export function buildTitleBackdrop(): PixelCanvas {
  const rng = new Rng('art:title');
  const c = new PixelCanvas(BACKDROP_W, BACKDROP_H);
  drawSky(c);
  drawStars(c, rng);
  drawSun(c);
  drawMountains(c);
  drawHills(c, 262, 14, 38, 20, RAMPS.R4[1]);
  const midCrest = (x: number) =>
    Math.round(280 - 11 * Math.sin((x + 140) / 27) - 11 * 0.4 * Math.sin((x + 140) / (27 * 0.43)));
  drawTreeLine(c, new Rng('art:title:trees'), midCrest, RAMPS.R3[0], RAMPS.R3[1], RAMPS.R3[2]);
  drawHills(c, 280, 11, 27, 140, RAMPS.R3[1]);
  drawMotherTree(c, new Rng('art:title:mother'));
  drawHills(c, 296, 8, 21, 60, RAMPS.R1[1]);
  drawGreenhouse(c);
  drawGround(c, rng);
  drawForeground(c, new Rng('art:title:fg'));
  return c;
}

/** 월드 x → 캔버스 x */
export const worldToBackdropX = (x: number): number => x + OFFSET;
