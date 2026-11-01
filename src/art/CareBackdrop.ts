// 돌보기 방(04문서 11절): 한 그루를 가까이 들여다보는 아늑한 작은 방.
// 짙은 청록 벽지(식물의 초록 · 노랑이 또렷하게 뜨도록) · 나무 징두리 · 마루 · 러그 · 탁자 · 매달린 전등 · 액자 · 선반.
// 창 안쪽에는 지금 시각의 하늘(별도 이미지)이 보이고, 창틀 · 커튼은 그 위에 얹는 앞 판(buildCareFront)으로 굽는다.
// 캔버스 800×360 = 월드 x∈[-80, 720). 탁자 · 화분 자리는 CareConfig 의 PX · PY 와 맞춘다.

import { PixelCanvas } from './PixelCanvas';
import { RAMPS, SPECIAL } from './palette';

export const CARE_BG_W = 800;
const OX = 80; // 월드 → 캔버스
/** 창 안쪽(월드 좌표) — 하늘 이미지가 들어가는 구멍 */
export const CARE_WINDOW = { x: 512, y: 52, w: 96, h: 72 } as const;

function wall(c: PixelCanvas): void {
  c.rect(0, 0, CARE_BG_W, 216, RAMPS.R4[1]);
  // 마름모 무늬 벽지(2색, 규칙적인 12px 간격)
  for (let y = 4; y < 210; y += 12)
    for (let x = (y / 12) % 2 === 0 ? 4 : 10; x < CARE_BG_W; x += 12) {
      c.px(x, y - 1, RAMPS.R4[2])
        .px(x - 1, y, RAMPS.R4[2])
        .px(x + 1, y, RAMPS.R4[2])
        .px(x, y + 1, RAMPS.R4[2]);
      c.px(x, y, RAMPS.R4[0]);
    }
  // 천장 몰딩
  c.rect(0, 0, CARE_BG_W, 6, RAMPS.R10[1]).hline(0, 6, CARE_BG_W, RAMPS.R10[2]);
  // 징두리 판벽
  c.rect(0, 216, CARE_BG_W, 76, RAMPS.R10[2]);
  c.rect(0, 212, CARE_BG_W, 5, RAMPS.R10[3])
    .hline(0, 212, CARE_BG_W, RAMPS.R10[4])
    .hline(0, 217, CARE_BG_W, RAMPS.R10[1]);
  for (let x = 6; x < CARE_BG_W; x += 64) {
    c.frame(x, 224, 56, 60, RAMPS.R10[1]);
    c.hline(x + 1, 225, 54, RAMPS.R10[3]).vline(x + 1, 225, 58, RAMPS.R10[3]);
  }
}

function floor(c: PixelCanvas): void {
  c.rect(0, 292, CARE_BG_W, 68, RAMPS.R10[3]);
  c.hline(0, 292, CARE_BG_W, RAMPS.R10[1]).hline(0, 293, CARE_BG_W, RAMPS.R10[2]);
  for (let y = 300; y < 360; y += 10) {
    c.hline(0, y, CARE_BG_W, RAMPS.R10[2]);
    const shift = ((y / 10) % 3) * 37;
    for (let x = shift; x < CARE_BG_W; x += 110) c.vline(x, y - 9, 9, RAMPS.R10[2]);
  }
  // 창으로 들어온 볕이 바닥에 비스듬히(디더링)
  for (let y = 296; y < 360; y++) {
    const x0 = 560 + Math.floor((y - 296) * 0.6);
    for (let x = x0; x < x0 + 90; x++) if ((x + y) % 2 === 0) c.px(x, y, RAMPS.R10[4]);
  }
}

function rugAndTable(c: PixelCanvas): void {
  // 러그(타원)
  for (let y = 300; y < 344; y++) {
    const half = Math.round(130 * Math.sqrt(Math.max(0, 1 - ((y - 322) / 22) ** 2)));
    c.hline(510 - half, y, half * 2, RAMPS.R7[1]);
    if (half > 6) {
      c.px(510 - half, y, RAMPS.R7[0]).px(510 + half - 1, y, RAMPS.R7[0]);
      for (let x = 510 - half + 8; x < 510 + half - 8; x += 8)
        if ((y - 300) % 8 === 4) c.px(x, y, RAMPS.R9[3]);
    }
  }
  for (let y = 305; y < 340; y++) {
    const half = Math.round(110 * Math.sqrt(Math.max(0, 1 - ((y - 322) / 17) ** 2)));
    c.px(510 - half, y, RAMPS.R9[2]).px(510 + half - 1, y, RAMPS.R9[2]);
  }
  // 탁자(월드 PX=430, PY=262 → 캔버스 510, 262)
  const cx = 430 + OX;
  const top = 262;
  c.rect(cx - 90, top, 180, 8, RAMPS.R10[3]).hline(cx - 90, top, 180, RAMPS.R10[4]);
  c.rect(cx - 90, top + 8, 180, 4, RAMPS.R10[1]);
  for (const lx of [cx - 82, cx + 76]) {
    c.rect(lx, top + 12, 6, 30, RAMPS.R10[2])
      .vline(lx, top + 12, 30, RAMPS.R10[3])
      .vline(lx + 5, top + 12, 30, RAMPS.R10[1]);
  }
  for (let x = cx - 84; x < cx + 84; x++) if (x % 2 === 0) c.px(x, top + 42, RAMPS.R10[1]);
}

function lamp(c: PixelCanvas): void {
  const x = 330;
  c.vline(x, 6, 54, RAMPS.R11[1]);
  for (let r = 26; r > 12; r -= 5)
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      for (let dx = -half; dx <= half; dx++)
        if ((dx + dy + r) % 2 === 0) c.px(x + dx, 74 + dy, RAMPS.R4[2]);
    }
  for (let i = 0; i < 12; i++)
    c.hline(
      x - 4 - Math.floor(i * 0.8),
      60 + i,
      9 + Math.floor(i * 1.6),
      i < 2 ? RAMPS.R9[4] : RAMPS.R9[3],
    );
  c.hline(x - 13, 71, 27, RAMPS.R9[2]);
  c.rect(x - 2, 72, 5, 3, SPECIAL.PAPER);
}

function decor(c: PixelCanvas): void {
  // 액자: 할머니가 그린 온실(노을 · 지붕 · 유리)
  const fx = 400;
  const fy = 64;
  c.rect(fx, fy, 64, 46, RAMPS.R10[1]).rect(fx + 2, fy + 2, 60, 42, RAMPS.R9[3]);
  c.rect(fx + 5, fy + 5, 54, 36, RAMPS.R8[3]).rect(fx + 5, fy + 5, 54, 12, RAMPS.R6[3]);
  c.rect(fx + 5, fy + 31, 54, 10, RAMPS.R1[2]);
  c.rect(fx + 18, fy + 20, 28, 12, RAMPS.R4[3]).frame(fx + 18, fy + 20, 28, 12, RAMPS.R11[1]);
  for (let i = 0; i < 14; i++)
    c.px(fx + 18 + i, fy + 20 - Math.floor(i / 2), RAMPS.R11[1]).px(
      fx + 45 - i,
      fy + 20 - Math.floor(i / 2),
      RAMPS.R11[1],
    );
  c.disc(fx + 50, fy + 12, 3, RAMPS.R9[4]);
  // 작은 선반 + 병 · 책
  const sx = 480;
  const sy = 150;
  c.rect(sx, sy, 78, 4, RAMPS.R10[3]).hline(sx, sy + 4, 78, RAMPS.R10[1]);
  c.rect(sx + 6, sy + 5, 3, 6, RAMPS.R10[1]).rect(sx + 68, sy + 5, 3, 6, RAMPS.R10[1]);
  for (const [x, h, col] of [
    [sx + 4, 14, RAMPS.R7[2]],
    [sx + 8, 12, RAMPS.R1[2]],
    [sx + 12, 15, RAMPS.R9[2]],
  ] as const)
    c.rect(x, sy - h, 4, h, col).vline(x, sy - h, h, RAMPS.R10[1]);
  for (const x of [sx + 26, sx + 42]) {
    c.rect(x, sy - 12, 10, 12, RAMPS.R4[3]).rect(x + 1, sy - 14, 8, 2, RAMPS.R7[2]);
    c.vline(x + 2, sy - 10, 6, RAMPS.R4[4]).rect(
      x + 2,
      sy - 6,
      6,
      4,
      x === sx + 26 ? RAMPS.R1[3] : RAMPS.R6[3],
    );
  }
  c.rect(sx + 58, sy - 8, 8, 8, RAMPS.R10[4]).hline(sx + 58, sy - 8, 8, RAMPS.R10[3]);
  // 바닥의 물뿌리개
  const wx = 668;
  c.rect(wx, 286, 18, 13, RAMPS.R4[2]).hline(wx, 286, 18, RAMPS.R4[3]);
  for (let i = 0; i < 8; i++) c.px(wx - 1 - i, 290 - Math.floor(i / 2), RAMPS.R4[1]);
  c.frame(wx + 4, 280, 10, 7, RAMPS.R4[1]);
  // 창 둘레 오목한 그림자
  c.rect(
    CARE_WINDOW.x + OX - 6,
    CARE_WINDOW.y - 6,
    CARE_WINDOW.w + 12,
    CARE_WINDOW.h + 12,
    RAMPS.R4[0],
  );
  // 창 아래로 내려오는 볕(벽 디더링)
  for (let y = 134; y < 212; y++) {
    const x0 = CARE_WINDOW.x + OX - Math.floor((y - 134) * 0.45);
    for (let x = x0; x < x0 + CARE_WINDOW.w; x++) if ((x + y) % 2 === 0) c.px(x, y, RAMPS.R4[2]);
  }
}

/** 방 뒷판(벽 · 마루 · 러그 · 탁자 · 소품) */
export function buildCareBackdrop(): PixelCanvas {
  const c = new PixelCanvas(CARE_BG_W, 360);
  wall(c);
  decor(c);
  floor(c);
  lamp(c);
  rugAndTable(c);
  return c;
}

/** 앞 판: 창틀 · 십자 창살 · 창턱 화분 · 커튼(하늘 이미지 위에 얹힘). 나머지는 투명 */
export function buildCareFront(): PixelCanvas {
  const c = new PixelCanvas(CARE_BG_W, 360);
  const x = CARE_WINDOW.x + OX;
  const y = CARE_WINDOW.y;
  const w = CARE_WINDOW.w;
  const h = CARE_WINDOW.h;
  const wood = RAMPS.R10[3];
  c.rect(x - 4, y - 4, w + 8, 4, wood).rect(x - 4, y + h, w + 8, 4, wood);
  c.rect(x - 4, y, 4, h, wood).rect(x + w, y, 4, h, wood);
  c.rect(x + w / 2 - 2, y, 4, h, wood).rect(x, y + h / 2 - 2, w, 3, wood);
  c.hline(x - 4, y - 4, w + 8, RAMPS.R10[4]);
  // 창턱 + 작은 화분 둘
  c.rect(x - 10, y + h + 4, w + 20, 5, RAMPS.R10[3])
    .hline(x - 10, y + h + 4, w + 20, RAMPS.R10[4])
    .hline(x - 10, y + h + 9, w + 20, RAMPS.R10[1]);
  for (const [px0, leaf] of [
    [x + 10, RAMPS.R1[3]],
    [x + w - 24, RAMPS.R6[3]],
  ] as const) {
    c.rect(px0, y + h - 4, 12, 8, RAMPS.R7[2]).hline(px0 - 1, y + h - 5, 14, RAMPS.R7[3]);
    c.disc(px0 + 6, y + h - 9, 4, RAMPS.R1[2])
      .px(px0 + 4, y + h - 12, leaf)
      .px(px0 + 8, y + h - 11, leaf);
  }
  // 커튼(주름 3단 + 묶은 끈) · 위쪽 주름 덮개
  for (const left of [true, false]) {
    const cx0 = left ? x - 22 : x + w + 6;
    for (let yy = y - 10; yy < y + h + 20; yy++) {
      const pinch = yy > y + 40 && yy < y + 48 ? 4 : 0;
      const ww = 16 - pinch;
      const xx = left ? cx0 : cx0 + pinch;
      c.hline(xx, yy, ww, RAMPS.R6[2]);
      c.px(xx + 4, yy, RAMPS.R6[1]).px(xx + 10, yy, RAMPS.R6[1]);
      c.px(left ? xx + ww - 1 : xx, yy, RAMPS.R6[3]);
    }
    c.rect(left ? cx0 : cx0 + 4, y + 42, 12, 3, RAMPS.R9[3]);
  }
  c.rect(x - 26, y - 14, w + 52, 8, RAMPS.R6[1]);
  for (let xx = x - 26; xx < x + w + 26; xx += 6) c.rect(xx, y - 6, 4, 3, RAMPS.R6[1]);
  c.hline(x - 26, y - 14, w + 52, RAMPS.R6[2]);
  return c;
}
