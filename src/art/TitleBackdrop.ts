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
  for (let i = 0; i < 46; i++) {
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
  const glow = RAMPS.R9[4];
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
    c.dither(p.x + 1, p.top + 1, p.w - 2, baseY - p.top - 2, glass, glow, 0);
    c.dither(p.x + 1, p.top + (baseY - p.top) / 2, p.w - 2, (baseY - p.top) / 2 - 1, warm, glow, 1);
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

export function buildTitleBackdrop(): PixelCanvas {
  const rng = new Rng('art:title');
  const c = new PixelCanvas(BACKDROP_W, BACKDROP_H);
  drawSky(c);
  drawStars(c, rng);
  drawHills(c, 262, 14, 38, 20, RAMPS.R4[1]);
  drawHills(c, 280, 11, 27, 140, RAMPS.R3[1]);
  drawHills(c, 296, 8, 21, 60, RAMPS.R1[1]);
  drawGreenhouse(c);
  drawGround(c, rng);
  return c;
}

/** 월드 x → 캔버스 x */
export const worldToBackdropX = (x: number): number => x + OFFSET;
