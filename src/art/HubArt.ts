// 온실 허브의 배경 그림 (10문서 1절): 하늘 · 먼 언덕 · 온실 내부 · 앞쪽 잎사귀 4겹.
// 모두 66색 팔레트 안의 색으로만 굽는다. 밤에는 같은 그림을 팔레트 안에서 한 단계 어두운 색으로 바꿔 쓴다
// (알파 블렌딩은 팔레트 밖 색을 만들기 때문에 쓰지 않는다).

import type Phaser from 'phaser';
import { Rng } from '../core/Rng';
import { PixelCanvas } from './PixelCanvas';
import { RAMPS, SPECIAL } from './palette';

export type DayPhase = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';

/** 시각(0–24)으로 하늘 단계를 정한다 */
export function phaseAt(hour: number): DayPhase {
  if (hour >= 20 || hour < 5) return 'NIGHT';
  if (hour < 7) return 'DAWN';
  if (hour < 17) return 'DAY';
  return 'DUSK';
}

export const SKY_W = 1000;
export const HILL_W = 1200;
export const FG_W = 1960;
/** 내부 그림은 월드 x ∈ [-80, 1680) 를 덮는다 */
export const INT_W = 1760;
export const INT_OFF = 80;
export const H = 360;

// ---- 색 이동(밤) ----
const LOOKUP = new Map<string, { ramp: readonly string[]; i: number }>();
for (const ramp of Object.values(RAMPS)) ramp.forEach((hex, i) => LOOKUP.set(hex, { ramp, i }));

/** 팔레트 안에서 steps 단계 어두운 색(램프 안에서 맨 아래까지). 특수색은 가까운 램프로 옮긴다. */
export function shiftHex(hex: string, steps: number): string {
  if (steps === 0) return hex;
  const hit = LOOKUP.get(hex);
  if (hit) return hit.ramp[Math.max(0, hit.i - steps)];
  if (hex === SPECIAL.PAPER) return RAMPS.R11[Math.max(0, 4 - steps)];
  if (hex === SPECIAL.CREAM) return RAMPS.R10[Math.max(0, 4 - steps)];
  return hex; // 잉크 · 독 · 마법 · 별금은 그대로
}

function darken(src: HTMLCanvasElement, steps: number): void {
  if (steps === 0) return;
  const ctx = src.getContext('2d');
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  const cache = new Map<number, [number, number, number]>();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    let out = cache.get(key);
    if (!out) {
      const hex = '#' + key.toString(16).padStart(6, '0');
      const to = shiftHex(hex, steps);
      out = [
        parseInt(to.slice(1, 3), 16),
        parseInt(to.slice(3, 5), 16),
        parseInt(to.slice(5, 7), 16),
      ];
      cache.set(key, out);
    }
    d[i] = out[0];
    d[i + 1] = out[1];
    d[i + 2] = out[2];
  }
  ctx.putImageData(img, 0, 0);
}

// ---- 하늘 ----
type Band = { to: number; color: string };
const SKY: Record<DayPhase, Band[]> = {
  DAY: [
    { to: 110, color: RAMPS.R4[2] },
    { to: 200, color: RAMPS.R4[3] },
    { to: 360, color: RAMPS.R4[4] },
  ],
  DAWN: [
    { to: 70, color: RAMPS.R5[2] },
    { to: 140, color: RAMPS.R6[3] },
    { to: 210, color: RAMPS.R8[4] },
    { to: 360, color: RAMPS.R9[4] },
  ],
  DUSK: [
    { to: 60, color: RAMPS.R5[1] },
    { to: 120, color: RAMPS.R5[2] },
    { to: 170, color: RAMPS.R6[2] },
    { to: 220, color: RAMPS.R8[3] },
    { to: 360, color: RAMPS.R9[3] },
  ],
  NIGHT: [
    { to: 120, color: RAMPS.R4[0] },
    { to: 220, color: RAMPS.R5[1] },
    { to: 360, color: RAMPS.R5[2] },
  ],
};

export function skyTexture(scene: Phaser.Scene, phase: DayPhase, rainbow: boolean): string {
  const key = `hub:sky:${phase}:${rainbow ? 'r' : 'n'}`;
  if (scene.textures.exists(key)) return key;
  const c = new PixelCanvas(SKY_W, H);
  let from = 0;
  const bands = SKY[phase];
  bands.forEach((b, i) => {
    c.rect(0, from, SKY_W, b.to - from, b.color);
    const next = bands[i + 1];
    if (next) {
      c.dither(0, b.to - 3, SKY_W, 3, b.color, next.color, 0);
      c.dither(0, b.to, SKY_W, 3, next.color, b.color, 1);
    }
    from = b.to;
  });
  if (phase === 'NIGHT' || phase === 'DAWN') {
    const rng = new Rng(`hub-stars-${phase}`);
    for (let i = 0; i < 60; i++) {
      const x = rng.int(0, SKY_W - 1);
      const y = rng.int(2, 150);
      const col = y < 70 ? SPECIAL.PAPER : RAMPS.R5[4];
      c.px(x, y, phase === 'DAWN' && y > 90 ? RAMPS.R6[4] : col);
      if (phase === 'NIGHT' && i % 8 === 0) {
        c.px(x - 1, y, col)
          .px(x + 1, y, col)
          .px(x, y - 1, col)
          .px(x, y + 1, col);
      }
    }
  }
  if (rainbow) {
    // 무지개: 일곱 줄이 아니라 팔레트의 여섯 색을 겹겹이 두른 호
    const cols = [RAMPS.R7[3], RAMPS.R8[3], RAMPS.R9[3], RAMPS.R1[3], RAMPS.R4[3], RAMPS.R5[3]];
    cols.forEach((col, i) => {
      const r = 220 - i * 5;
      for (let x = -r; x <= r; x++) {
        const y = Math.round(Math.sqrt(r * r - x * x));
        const px = 430 + x;
        if (px >= 0 && px < SKY_W && 280 - y >= 0) c.px(px, 280 - y, col).px(px, 281 - y, col);
      }
    });
  }
  return c.toTexture(scene, key);
}

// ---- 먼 언덕 ----
function hills(
  c: PixelCanvas,
  base: number,
  amp: number,
  period: number,
  phase: number,
  color: string,
  tops?: string,
): void {
  for (let x = 0; x < c.w; x++) {
    const y = Math.round(
      base +
        Math.sin((x + phase) / period) * amp +
        Math.sin((x + phase) / (period * 0.37)) * amp * 0.3,
    );
    c.rect(x, y, 1, c.h - y, color);
    if (tops) c.px(x, y, tops);
  }
}

export function hillTexture(scene: Phaser.Scene, phase: DayPhase): string {
  const key = `hub:hills:${phase}`;
  if (scene.textures.exists(key)) return key;
  const far = { DAY: RAMPS.R3[2], DAWN: RAMPS.R5[2], DUSK: RAMPS.R5[2], NIGHT: RAMPS.R4[1] }[phase];
  const near = { DAY: RAMPS.R1[2], DAWN: RAMPS.R2[2], DUSK: RAMPS.R2[1], NIGHT: RAMPS.R1[0] }[
    phase
  ];
  const nearTop = { DAY: RAMPS.R1[3], DAWN: RAMPS.R2[3], DUSK: RAMPS.R2[2], NIGHT: RAMPS.R1[1] }[
    phase
  ];
  const c = new PixelCanvas(HILL_W, H);
  // 아주 먼 산맥(하늘빛에 묻힌 색) + 눈 덮인 봉우리
  const haze = { DAY: RAMPS.R4[3], DAWN: RAMPS.R5[3], DUSK: RAMPS.R5[3], NIGHT: RAMPS.R4[0] }[
    phase
  ];
  const snow = { DAY: SPECIAL.PAPER, DAWN: RAMPS.R6[4], DUSK: RAMPS.R6[4], NIGHT: RAMPS.R4[1] }[
    phase
  ];
  for (let px0 = 30; px0 < HILL_W; px0 += 120 + ((px0 * 7) % 70)) {
    const h = 34 + ((px0 * 13) % 26);
    const top = 226 - h;
    for (let y = top; y < 230; y++) {
      const half = Math.floor((y - top) * 1.3) + 1;
      c.hline(px0 - half, y, half * 2, haze);
      if (y - top < 5) c.hline(px0 - half + 1, y, Math.max(1, half * 2 - 2), snow);
    }
  }
  hills(c, 226, 22, 70, 0, far);
  // 먼 언덕 위 어미나무(세계관의 심장): 큰 수관 실루엣 + 금빛 반짝이
  const mx = Math.floor(HILL_W * 0.72);
  const my = Math.round(226 + Math.sin(mx / 70) * 22 + Math.sin(mx / 25.9) * 6.6);
  c.rect(mx - 3, my - 30, 6, 32, far);
  for (const [dx, dy, r] of [
    [0, -44, 16],
    [-16, -36, 11],
    [16, -36, 12],
    [-7, -54, 10],
    [9, -55, 10],
  ] as const)
    c.disc(mx + dx, my + dy, r, far);
  if (phase !== 'DAY')
    for (const [dx, dy] of [
      [-8, -48],
      [6, -40],
      [12, -54],
      [-14, -36],
    ] as const)
      c.px(mx + dx, my + dy, SPECIAL.STARGOLD);
  hills(c, 262, 18, 55, 90, near, nearTop);
  // 가까운 숲: 둥근 활엽수와 뾰족한 침엽수(윗면 밝은 색)
  const rng = new Rng('hub-forest');
  for (let i = 0; i < 70; i++) {
    const x = rng.int(0, HILL_W - 1);
    const y = Math.round(262 + Math.sin((x + 90) / 55) * 18 + Math.sin((x + 90) / 20.35) * 5.4);
    if (rng.chance(0.4)) {
      const h = rng.int(8, 13);
      for (let j = 0; j < h; j++)
        c.hline(x - Math.floor(j / 2), y - h + j, Math.floor(j / 2) * 2 + 1, near);
      c.px(x, y - h, nearTop).px(x, y - h + 1, nearTop);
    } else {
      const r = rng.int(3, 6);
      c.disc(x, y - r + 1, r, near);
      c.hline(x - r + 2, y - 2 * r + 2, Math.max(1, r - 1), nearTop);
    }
  }
  return c.toTexture(scene, key);
}

// ---- 구름 ----
export type CloudKind = 'light' | 'heavy';
export function cloudTexture(scene: Phaser.Scene, kind: CloudKind, variant: number): string {
  const key = `hub:cloud:${kind}:${variant}`;
  if (scene.textures.exists(key)) return key;
  const body = kind === 'light' ? SPECIAL.PAPER : RAMPS.R11[3];
  const shade = kind === 'light' ? RAMPS.R4[4] : RAMPS.R11[2];
  const w = 44 + variant * 14;
  const c = new PixelCanvas(w, 18);
  c.disc(10, 11, 6, body)
    .disc(22, 8, 8, body)
    .disc(w - 14, 11, 6, body);
  c.rect(6, 11, w - 14, 6, body);
  c.hline(5, 16, w - 10, shade).hline(7, 15, w - 14, shade);
  return c.toTexture(scene, key);
}

export function sunTexture(scene: Phaser.Scene): string {
  const key = 'hub:sun';
  if (scene.textures.exists(key)) return key;
  const c = new PixelCanvas(22, 22);
  c.disc(11, 11, 10, RAMPS.R9[3]).disc(11, 11, 8, RAMPS.R9[4]).disc(10, 10, 4, SPECIAL.PAPER);
  return c.toTexture(scene, key);
}

export function moonTexture(scene: Phaser.Scene): string {
  const key = 'hub:moon';
  if (scene.textures.exists(key)) return key;
  const c = new PixelCanvas(18, 18);
  c.disc(9, 9, 8, RAMPS.R11[4]).disc(9, 9, 7, SPECIAL.PAPER);
  c.disc(6, 7, 2, RAMPS.R11[4]).disc(12, 11, 1, RAMPS.R11[4]);
  return c.toTexture(scene, key);
}

/** 빗방울 · 눈송이 · 안개 알갱이 */
export function weatherTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('hub:rain')) return;
  new PixelCanvas(1, 5).rect(0, 0, 1, 5, RAMPS.R4[4]).toTexture(scene, 'hub:rain');
  new PixelCanvas(2, 2).rect(0, 0, 2, 2, SPECIAL.PAPER).toTexture(scene, 'hub:snow');
  const fog = new PixelCanvas(800, H);
  for (let y = 0; y < H; y += 2)
    for (let x = (y / 2) % 2; x < 800; x += 4) fog.px(x, y, RAMPS.R11[4]);
  fog.toTexture(scene, 'hub:fog');
}

// ---- 온실 내부 ----
const WOOD = RAMPS.R10;
const IRON = RAMPS.R11;

function frameBars(c: PixelCanvas, x0: number, x1: number, topY: (x: number) => number): void {
  // 세로 살대 + 가로 살대 + 지붕 경사선
  for (let x = x0; x <= x1; x += 80) {
    const t = topY(x);
    c.rect(x - 1, t, 2, 270 - t, IRON[3]);
  }
  for (const y of [100, 176]) c.rect(x0 + 0, y, x1 - x0, 2, IRON[3]);
  for (let x = x0; x < x1; x++) c.px(x, topY(x), IRON[2]).px(x, topY(x) + 1, IRON[3]);
}

function book(c: PixelCanvas, x: number, y: number, h: number, color: string): void {
  c.rect(x, y - h, 3, h, color);
  c.px(x, y - h, SPECIAL.PAPER);
}

export function interiorTexture(scene: Phaser.Scene, phase: DayPhase): string {
  const night = phase === 'NIGHT';
  const key = `hub:interior:${night ? 'n' : 'd'}`;
  if (scene.textures.exists(key)) return key;
  const c = new PixelCanvas(INT_W, H);
  // 캔버스 x = 월드 x + 80. 아래 그리기는 월드 좌표로 쓰고 X() 로 옮긴다.
  const X = (wx: number) => wx + INT_OFF;
  const rng = new Rng('hub-interior');

  // ---- 바닥(온실 · 서재 · 뒤뜰): 월드 x 320–1680 ----
  c.rect(X(320), 300, 1360, 60, WOOD[2]);
  c.hline(X(320), 300, 1360, WOOD[3]);
  c.hline(X(320), 301, 1360, WOOD[3]);
  for (let y = 312; y < 360; y += 16) c.hline(X(320), y, 1360, WOOD[1]);
  for (let r = 0; r < 3; r++) {
    for (let x = 320 + ((r * 37) % 60); x < 1680; x += 60) c.vline(X(x), 302 + r * 16, 14, WOOD[1]);
  }

  // ---- 입구 야외(월드 x -80–320): 풀밭 · 길 · 울타리 ----
  c.rect(X(-80), 300, 400, 60, RAMPS.R1[1]);
  c.dither(X(-80), 296, 400, 4, RAMPS.R1[1], RAMPS.R1[2], 0);
  c.rect(X(-80), 300, 400, 3, RAMPS.R1[2]);
  for (let i = 0; i < 90; i++) {
    const x = X(rng.int(-80, 318));
    const y = rng.int(304, 358);
    c.px(x, y, RAMPS.R1[2]).px(x, y - 1, RAMPS.R1[3]);
  }
  // 흙길: 정원 문에서 아래로 넓어진다
  for (let y = 312; y < 360; y++) {
    const half = 12 + Math.floor((y - 312) / 2);
    c.hline(X(40) - half, y, half * 2, WOOD[3]);
    if (y % 6 === 0) c.hline(X(40) - half + 4, y, 6, WOOD[4]);
  }
  // 울타리
  for (let x = -80; x < 320; x += 24) {
    c.rect(X(x), 268, 4, 36, WOOD[2]).rect(X(x), 268, 4, 2, WOOD[4]);
  }
  c.rect(X(-80), 276, 400, 3, WOOD[3]).rect(X(-80), 290, 400, 3, WOOD[3]);
  // 야외 화단(상자)
  c.rect(X(86), 306, 186, 28, WOOD[2]).rect(X(86), 306, 186, 3, WOOD[3]);
  for (let x = 86; x < 272; x += 31) c.vline(X(x), 309, 25, WOOD[1]);
  c.rect(X(86), 332, 186, 2, WOOD[0]);
  // 정원 문(출격): 나무 아치 문
  c.rect(X(12), 236, 56, 76, WOOD[1]);
  c.rect(X(16), 244, 48, 68, WOOD[2]);
  c.rect(X(20), 248, 18, 64, WOOD[3]).rect(X(42), 248, 18, 64, WOOD[3]);
  c.vline(X(40), 248, 64, WOOD[0]);
  for (let i = 0; i < 6; i++) c.hline(X(14 + i * 2), 238 + (5 - i), 56 - i * 4, WOOD[1]);
  c.rect(X(34), 286, 3, 3, RAMPS.R9[3]).rect(X(43), 286, 3, 3, RAMPS.R9[3]);
  // 우편함 · 바람개비
  c.rect(X(118), 262, 2, 38, WOOD[1]);
  c.rect(X(108), 246, 22, 14, RAMPS.R7[2]).rect(X(108), 246, 22, 2, RAMPS.R7[3]);
  c.rect(X(128), 250, 3, 8, RAMPS.R9[3]);
  c.rect(X(300), 230, 2, 70, WOOD[1])
    .disc(X(301), 228, 5, RAMPS.R5[3])
    .px(X(301), 228, SPECIAL.PAPER);

  // ---- 온실 본관(월드 x 320–960): 유리 + 철제 프레임 ----
  const roofMain = (x: number) => 70 - Math.round((1 - Math.abs(x - 640) / 320) * 56);
  frameBars(c, X(320), X(960), (x) => roofMain(x - INT_OFF));
  c.rect(X(316), 20, 8, 290, WOOD[1]).rect(X(956), 20, 8, 290, WOOD[1]);
  c.rect(X(320), 270, 640, 30, IRON[2]).hline(X(320), 270, 640, IRON[3]);
  for (let x = 320; x < 960; x += 40) c.vline(X(x), 272, 26, IRON[1]);
  // 선반 · 테이블 · 그늘 구석
  const shelf = (x0: number, x1: number, y: number) => {
    c.rect(X(x0), y, x1 - x0, 5, WOOD[3]).rect(X(x0), y + 5, x1 - x0, 2, WOOD[1]);
    for (const bx of [x0 + 8, x1 - 12]) c.rect(X(bx), y + 7, 4, 16, WOOD[2]);
  };
  shelf(340, 536, 190);
  shelf(742, 938, 190);
  c.rect(X(736), 96, 208, 98, RAMPS.R4[1]);
  c.dither(X(736), 96, 208, 98, RAMPS.R4[1], RAMPS.R5[1], 0);
  c.rect(X(544), 266, 180, 6, WOOD[3]).rect(X(544), 272, 180, 3, WOOD[1]);
  for (const lx of [552, 710]) c.rect(X(lx), 275, 6, 25, WOOD[2]);
  // 천장 등(꺼진 상태. 밤에는 씬이 불을 켠다)
  for (const lx of [480, 800]) {
    c.vline(X(lx), 40, 28, IRON[2]);
    c.rect(X(lx - 5), 68, 10, 4, IRON[3]).rect(X(lx - 3), 72, 6, 3, RAMPS.R9[3]);
  }
  // 퇴비통 · 작업대(장식)
  c.rect(X(716), 290, 30, 40, WOOD[2]).rect(X(716), 290, 30, 3, WOOD[3]);
  for (const hy of [300, 316]) c.hline(X(716), hy, 30, WOOD[1]);
  c.rect(X(850), 284, 96, 6, WOOD[3]).rect(X(850), 290, 96, 2, WOOD[1]);
  for (const lx of [856, 936]) c.rect(X(lx), 292, 5, 38, WOOD[2]);
  c.rect(X(870), 276, 4, 8, IRON[3]).rect(X(902), 274, 10, 10, RAMPS.R7[3]);
  // 봉투 테이블(장식): 안 뜯은 봉투 더미
  c.rect(X(430), 296, 64, 4, WOOD[3]);
  for (let i = 0; i < 4; i++) {
    c.rect(X(436 + i * 14), 288, 10, 8, [RAMPS.R7[3], RAMPS.R9[3], RAMPS.R4[3], RAMPS.R6[3]][i]);
    c.hline(X(436 + i * 14), 290, 10, SPECIAL.PAPER);
  }

  // ---- 서재 구석(월드 x 960–1280): 닫힌 벽 ----
  c.rect(X(960), 30, 320, 270, WOOD[1]);
  c.dither(X(960), 30, 320, 270, WOOD[1], WOOD[0], 0);
  c.rect(X(960), 20, 320, 12, WOOD[0]);
  c.rect(X(960), 250, 320, 50, WOOD[2]).hline(X(960), 250, 320, WOOD[3]);
  // 책장
  c.rect(X(986), 112, 104, 190, WOOD[2]).rect(X(990), 116, 96, 182, WOOD[0]);
  for (let r = 0; r < 4; r++) {
    const y = 156 + r * 46;
    c.rect(X(990), y, 96, 3, WOOD[3]);
    let x = 993;
    while (x < 1082) {
      const w = rng.int(3, 5);
      const h = rng.int(20, 34);
      book(
        c,
        X(x),
        y,
        h,
        [RAMPS.R7[2], RAMPS.R1[2], RAMPS.R4[2], RAMPS.R9[2], RAMPS.R5[2], RAMPS.R8[2]][
          rng.int(0, 5)
        ],
      );
      x += w + 1;
    }
  }
  // 게시판 · 달력 · 벽시계 · 사진기
  c.rect(X(1106), 100, 84, 62, WOOD[2]).rect(X(1109), 103, 78, 56, WOOD[4]);
  for (const [px, py, col] of [
    [1116, 110, SPECIAL.PAPER],
    [1140, 116, RAMPS.R9[4]],
    [1164, 108, RAMPS.R6[4]],
    [1128, 134, RAMPS.R4[4]],
    [1156, 136, SPECIAL.PAPER],
  ] as const) {
    c.rect(X(px), py, 18, 16, col).px(X(px + 8), py + 1, RAMPS.R7[3]);
  }
  c.rect(X(1210), 104, 36, 46, SPECIAL.PAPER).rect(X(1210), 104, 36, 10, RAMPS.R7[3]);
  for (let i = 0; i < 12; i++) c.px(X(1214 + (i % 4) * 8), 120 + Math.floor(i / 4) * 9, IRON[2]);
  c.disc(X(1180), 64, 12, WOOD[3]).disc(X(1180), 64, 10, SPECIAL.PAPER);
  c.vline(X(1180), 56, 8, SPECIAL.INK).hline(X(1180), 64, 6, SPECIAL.INK);
  // 연구 책상 · 트로피 선반
  c.rect(X(1100), 262, 150, 8, WOOD[3]).rect(X(1100), 270, 150, 3, WOOD[1]);
  for (const lx of [1108, 1236]) c.rect(X(lx), 273, 6, 27, WOOD[2]);
  c.rect(X(1128), 244, 14, 18, RAMPS.R4[2]).rect(X(1190), 252, 22, 10, SPECIAL.PAPER);
  c.rect(X(1210), 200, 66, 4, WOOD[3]);
  for (let i = 0; i < 3; i++)
    c.rect(X(1218 + i * 20), 184, 10, 16, RAMPS.R9[3]).rect(
      X(1216 + i * 20),
      200,
      14,
      2,
      RAMPS.R9[2],
    );

  // ---- 뒤뜰(월드 x 1280–1680): 유리 + 철제 프레임, 창밖 어미나무 ----
  // 창밖 어미나무(챕터 진행에 따라 자란다: M5 에서 7단계. 지금은 어린 나무)
  c.rect(X(1452), 168, 8, 132, WOOD[2]).rect(X(1456), 168, 2, 132, WOOD[3]);
  c.disc(X(1456), 150, 26, RAMPS.R1[2])
    .disc(X(1442), 140, 14, RAMPS.R1[3])
    .disc(X(1472), 160, 12, RAMPS.R1[1]);
  const roofBack = (x: number) => 50 - Math.round(((x - 1280) / 320) * 22);
  frameBars(c, X(1280), X(1600), (x) => roofBack(x - INT_OFF));
  c.rect(X(1276), 20, 8, 290, WOOD[1]).rect(X(1596), 20, 8, 290, WOOD[1]);
  c.rect(X(1280), 270, 320, 30, IRON[2]).hline(X(1280), 270, 320, IRON[3]);
  c.rect(X(1350), 266, 142, 6, WOOD[3]).rect(X(1350), 272, 142, 3, WOOD[1]);
  for (const lx of [1358, 1478]) c.rect(X(lx), 275, 6, 25, WOOD[2]);
  c.rect(X(1600), 20, 80, 340, WOOD[0]); // 오른쪽 끝(월드 밖)

  darken(c.canvas, night ? 1 : 0);
  return c.toTexture(scene, key);
}

// ---- 앞쪽 잎사귀(패럴랙스 1.2) ----
export function foregroundTexture(scene: Phaser.Scene, phase: DayPhase): string {
  const night = phase === 'NIGHT';
  const key = `hub:fg:${night ? 'n' : 'd'}`;
  if (scene.textures.exists(key)) return key;
  const c = new PixelCanvas(FG_W, H);
  const rng = new Rng('hub-fg');
  const dark = night ? RAMPS.R1[0] : RAMPS.R1[1];
  const mid = night ? RAMPS.R1[1] : RAMPS.R1[2];
  // 아래쪽 풀 · 큰 잎
  for (let i = 0; i < 46; i++) {
    const x = rng.int(0, FG_W - 1);
    const h = rng.int(10, 26);
    for (let j = 0; j < h; j++) {
      const sway = Math.round(Math.sin(j / 5 + i) * 2);
      c.px(x + sway, H - j, dark).px(x + sway + 1, H - j, j > h - 5 ? mid : dark);
    }
  }
  // 위쪽에 늘어진 덩굴
  for (let i = 0; i < 18; i++) {
    const x = rng.int(0, FG_W - 1);
    const len = rng.int(12, 40);
    for (let j = 0; j < len; j++) c.px(x + Math.round(Math.sin(j / 6 + i) * 1.5), j, dark);
    if (len > 22) c.rect(x - 1, len, 3, 3, mid).px(x, len + 3, dark);
  }
  return c.toTexture(scene, key);
}

// ---- 화분 ----
export const POT_STYLE_OF: Record<string, 'clay' | 'stone' | 'wood' | 'glass' | 'mossy'> = {
  CLAY: 'clay',
  PLASTIC: 'stone',
  GLAZED: 'glass',
  TERRARIUM: 'glass',
  BUCKET: 'stone',
  SHELL: 'mossy',
  STUMP: 'wood',
  STAR_SHARD: 'glass',
  SEASONAL: 'wood',
};
