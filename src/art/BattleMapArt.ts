// 전투 맵 한 장(26×12 타일 = 624×288)을 이웃을 보고 굽는다(02문서 9절).
// 타일 단위로 따로 그리던 방식은 길 모서리가 각지고, 배치 칸마다 흙 둔덕이 찍혀 맵 전체가 물방울 무늬처럼 보였다.
// 여기서는 ① 풀밭을 낮은 주파수 얼룩 + 풀잎으로 한 장에 깔고 ② 길 · 물은 픽셀 단위 다수결로 모서리를 둥글린 뒤
// 가장자리(그림자 · 테두리 · 물가 모래)를 그리고 ③ 바위 · 비옥한 흙 · 그늘 · 소품 · 입구 · 출구를 얹는다.
// 배치 가능한 칸은 칸 모서리의 작은 점으로만 격자를 암시한다(심을 때는 화면 위 초록 테두리가 따로 깜빡인다).

import { PixelCanvas } from './PixelCanvas';
import { RAMPS, SPECIAL } from './palette';
import { TILE_THEMES } from './TileGen';

export const MAP_TILES_W = 26;
export const MAP_TILES_H = 12;
const T = 24;
const W = MAP_TILES_W * T;
const H = MAP_TILES_H * T;

type Kind = string;

/** 위치 고정 해시(0–1). 같은 맵이면 언제나 같은 그림 */
function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 부드러운 값 잡음(격자 크기 cell) */
function smooth(x: number, y: number, cell: number, s: number): number {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = (x / cell - gx) * (x / cell - gx) * (3 - 2 * (x / cell - gx));
  const fy = (y / cell - gy) * (y / cell - gy) * (3 - 2 * (y / cell - gy));
  const a = hash(gx, gy, s);
  const b = hash(gx + 1, gy, s);
  const c = hash(gx, gy + 1, s);
  const d = hash(gx + 1, gy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

const isRoad = (k: Kind | undefined) => k === 'PATH' || k === 'ENTRY' || k === 'EXIT';

export function bakeBattleMap(chapter: number, tiles: Kind[][]): PixelCanvas {
  const th = TILE_THEMES[chapter] ?? TILE_THEMES[1];
  const c = new PixelCanvas(W, H);
  const at = (tx: number, ty: number): Kind =>
    tiles[Math.max(0, Math.min(MAP_TILES_H - 1, ty))][Math.max(0, Math.min(MAP_TILES_W - 1, tx))];

  // ---- 픽셀 마스크(다수결로 모서리 둥글리기) ----
  const roundMask = (test: (k: Kind) => boolean, r: number): Uint8Array => {
    const raw = new Uint8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        raw[y * W + x] = test(at(Math.floor(x / T), Math.floor(y / T))) ? 1 : 0;
    // 적분 영상으로 (2r+1)² 상자 합을 빠르게
    const sum = new Int32Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        sum[(y + 1) * (W + 1) + x + 1] =
          raw[y * W + x] +
          sum[y * (W + 1) + x + 1] +
          sum[(y + 1) * (W + 1) + x] -
          sum[y * (W + 1) + x];
    const out = new Uint8Array(W * H);
    const need = ((2 * r + 1) * (2 * r + 1)) / 2;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        // 맵 밖은 가장자리 값이 이어진다고 보고, 상자를 맵 안으로 잘라 비율로 판정
        const x0 = Math.max(0, x - r);
        const y0 = Math.max(0, y - r);
        const x1 = Math.min(W, x + r + 1);
        const y1 = Math.min(H, y + r + 1);
        const s =
          sum[y1 * (W + 1) + x1] -
          sum[y0 * (W + 1) + x1] -
          sum[y1 * (W + 1) + x0] +
          sum[y0 * (W + 1) + x0];
        const area = (x1 - x0) * (y1 - y0);
        out[y * W + x] = (s * ((2 * r + 1) * (2 * r + 1))) / area >= need ? 1 : 0;
      }
    return out;
  };
  const road = roundMask(isRoad, 3);
  const water = roundMask((k) => k === 'WATER', 4);
  const R = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && road[y * W + x] === 1;
  const Wt = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && water[y * W + x] === 1;

  // ---- 1) 풀밭 ----
  const g = th.floor;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = smooth(x, y, 40, chapter * 7 + 1);
      const h = hash(x, y, 11);
      let col = g[2];
      if (n > 0.66 && (x + y) % 2 === 0 && y % 2 === 0) col = g[1];
      else if (n < 0.22 && (x + 2 * y) % 6 === 0) col = g[3];
      if (h < 0.05) col = g[1];
      c.px(x, y, col);
    }
  // 풀잎(2px 세로) · 작은 꽃
  for (let y = 2; y < H; y++)
    for (let x = 0; x < W; x++) {
      const h = hash(x, y, 23);
      if (h < 0.018) c.px(x, y, g[3]).px(x, y - 1, g[3]);
      else if (h > 0.9994) c.px(x, y, th.floorSpeck);
    }

  // ---- 2) 물 ----
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!Wt(x, y)) {
        // 물가 모래(물에서 1–2px)
        if (Wt(x + 1, y) || Wt(x - 1, y) || Wt(x, y + 1) || Wt(x, y - 1)) c.px(x, y, RAMPS.R10[3]);
        else if (Wt(x + 2, y) || Wt(x - 2, y) || Wt(x, y + 2) || Wt(x, y - 2))
          c.px(x, y, RAMPS.R10[4]);
        continue;
      }
      const edgeTop = !Wt(x, y - 1) || !Wt(x, y - 2);
      let col = (x + y) % 2 === 0 && smooth(x, y, 10, 5) > 0.55 ? RAMPS.R4[1] : RAMPS.R4[2];
      if (edgeTop) col = RAMPS.R4[1];
      else if (hash(x, y, 31) < 0.012) col = RAMPS.R4[4];
      c.px(x, y, col);
    }
  // 물결 반짝임(짧은 가로 줄) · 연잎
  for (let ty = 0; ty < MAP_TILES_H; ty++)
    for (let tx = 0; tx < MAP_TILES_W; tx++) {
      if (tiles[ty][tx] !== 'WATER') continue;
      const ox = tx * T;
      const oy = ty * T;
      for (let i = 0; i < 2; i++) {
        const x = ox + 4 + Math.floor(hash(tx, ty, 40 + i) * 14);
        const y = oy + 6 + Math.floor(hash(tx, ty, 50 + i) * 12);
        if (Wt(x, y) && Wt(x + 4, y)) c.hline(x, y, 4, RAMPS.R4[3]).px(x + 1, y, RAMPS.R4[4]);
      }
      if (hash(tx, ty, 60) < 0.35) {
        const x = ox + 8 + Math.floor(hash(tx, ty, 61) * 8);
        const y = oy + 10 + Math.floor(hash(tx, ty, 62) * 6);
        if (Wt(x - 4, y) && Wt(x + 4, y)) {
          c.disc(x, y, 3, RAMPS.R1[2])
            .hline(x - 2, y - 2, 3, RAMPS.R1[3])
            .px(x + 1, y, RAMPS.R4[2])
            .px(x + 2, y, RAMPS.R4[2]);
        }
      }
    }

  // ---- 3) 길 ----
  const p = th.path;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!R(x, y)) {
        // 길가 풀: 길 바로 위쪽 풀은 밝은 입술, 그 밖의 맞닿은 풀은 한 단계 어둡게
        if (R(x, y + 1)) c.px(x, y, g[3]);
        else if (R(x, y - 1) || R(x + 1, y) || R(x - 1, y)) c.px(x, y, g[1]);
        continue;
      }
      const h = hash(x, y, 71);
      let col = p[3];
      if (!R(x, y - 1))
        col = p[1]; // 위 테두리: 풀이 드리운 그림자
      else if (!R(x, y - 2)) col = p[2];
      else if (!R(x - 1, y) || !R(x + 1, y) || !R(x, y + 1)) col = p[2];
      else if (h < 0.07) col = p[2];
      else if (h < 0.1) col = th.pathSpeck;
      c.px(x, y, col);
    }
  // 길 위 자갈(1px 밝음 + 아래 그림자)
  for (let y = 3; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++)
      if (
        R(x, y) &&
        R(x, y - 2) &&
        R(x, y + 2) &&
        R(x - 2, y) &&
        R(x + 2, y) &&
        hash(x, y, 81) < 0.012
      )
        c.px(x, y, p[4])
          .px(x + 1, y, p[4])
          .px(x, y + 1, p[2])
          .px(x + 1, y + 1, p[2]);

  // ---- 4) 칸별 장식: 바위 · 비옥한 흙 · 그늘 · 소품 · 격자 점 ----
  for (let ty = 0; ty < MAP_TILES_H; ty++)
    for (let tx = 0; tx < MAP_TILES_W; tx++) {
      const k = tiles[ty][tx];
      const ox = tx * T;
      const oy = ty * T;
      if (k === 'ROCK') drawRock(c, ox, oy, tx, ty, g);
      else if (k === 'FERTILE') drawFertile(c, ox, oy);
      else if (k === 'SHADE') {
        for (let y = 0; y < T; y++)
          for (let x = 0; x < T; x++)
            if ((x + y) % 2 === 0 && !R(ox + x, oy + y)) c.px(ox + x, oy + y, RAMPS.R5[0]);
      } else if (k === 'SOIL') {
        const nearRoad =
          isRoad(at(tx + 1, ty)) ||
          isRoad(at(tx - 1, ty)) ||
          isRoad(at(tx, ty + 1)) ||
          isRoad(at(tx, ty - 1));
        if (!nearRoad && hash(tx, ty, 90) < 0.22) drawDecor(c, ox, oy, tx, ty, g);
      }
      // 배치 칸 격자 암시: 네 칸이 만나는 꼭짓점에 작은 점
      if (k !== 'WATER' && !isRoad(k) && k !== 'ROCK' && tx > 0 && ty > 0) {
        const up = at(tx, ty - 1);
        const left = at(tx - 1, ty);
        if (!isRoad(up) && !isRoad(left) && up !== 'WATER' && left !== 'WATER')
          c.px(ox, oy, g[1]).px(ox - 1, oy, g[1]);
      }
    }
  return c;
}

function drawRock(
  c: PixelCanvas,
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  g: readonly string[],
): void {
  const big = hash(tx, ty, 100) < 0.6;
  const rocks = big
    ? [[12, 13, 8]]
    : [
        [8, 10, 5],
        [16, 15, 6],
      ];
  for (const [cx, cy, r] of rocks) {
    // 그림자
    for (let x = -r; x <= r + 2; x++)
      c.px(ox + cx + x, oy + cy + r - 1, g[1]).px(ox + cx + x + 1, oy + cy + r, g[1]);
    c.disc(ox + cx, oy + cy, r, RAMPS.R11[0]);
    c.disc(ox + cx, oy + cy, r - 1, RAMPS.R11[2]);
    c.disc(ox + cx - 1, oy + cy - 1, Math.max(1, r - 3), RAMPS.R11[3]);
    c.hline(
      ox + cx - Math.floor(r / 2),
      oy + cy - r + 2,
      Math.max(1, Math.floor(r / 2)),
      RAMPS.R11[4],
    );
    c.hline(ox + cx - r + 2, oy + cy + r - 2, r * 2 - 3, RAMPS.R11[1]);
    if (r > 6) c.px(ox + cx + 2, oy + cy, RAMPS.R11[1]).px(ox + cx + 3, oy + cy + 1, RAMPS.R11[1]);
  }
}

/** 비옥한 흙: 갈아 놓은 밭이랑 + 금빛 반짝이(좋은 자리라는 표시) */
function drawFertile(c: PixelCanvas, ox: number, oy: number): void {
  c.rect(ox + 4, oy + 6, 16, 13, RAMPS.R10[1]);
  c.hline(ox + 5, oy + 5, 14, RAMPS.R10[1]).hline(ox + 5, oy + 19, 14, RAMPS.R10[0]);
  for (let y = 7; y < 19; y += 3) c.hline(ox + 5, oy + y, 14, RAMPS.R10[2]);
  c.hline(ox + 5, oy + 6, 14, RAMPS.R10[3]);
  for (const [x, y] of [
    [6, 4],
    [18, 9],
    [9, 16],
  ] as const) {
    c.px(ox + x, oy + y, SPECIAL.STARGOLD);
    c.px(ox + x - 1, oy + y, RAMPS.R9[4]).px(ox + x + 1, oy + y, RAMPS.R9[4]);
    c.px(ox + x, oy + y - 1, RAMPS.R9[4]).px(ox + x, oy + y + 1, RAMPS.R9[4]);
  }
}

/** 작은 소품: 꽃 무리 · 클로버 · 버섯 · 조약돌. 낮은 대비로 배치를 방해하지 않게 */
function drawDecor(
  c: PixelCanvas,
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  g: readonly string[],
): void {
  const kind = Math.floor(hash(tx, ty, 91) * 4);
  const x = ox + 6 + Math.floor(hash(tx, ty, 92) * 12);
  const y = oy + 8 + Math.floor(hash(tx, ty, 93) * 10);
  if (kind === 0) {
    const petals = [RAMPS.R6[3], RAMPS.R9[4], SPECIAL.PAPER];
    for (let i = 0; i < 3; i++) {
      const fx = x + i * 3 - 3;
      const fy = y + (i % 2) * 2;
      c.px(fx, fy + 1, g[1]).px(fx, fy, petals[(tx + i) % 3]);
    }
  } else if (kind === 1) {
    c.px(x, y, g[3])
      .px(x + 1, y - 1, g[3])
      .px(x + 2, y, g[3])
      .px(x + 1, y + 1, g[1]);
  } else if (kind === 2) {
    c.hline(x - 1, y, 3, RAMPS.R7[3])
      .px(x, y - 1, RAMPS.R7[3])
      .px(x, y + 1, RAMPS.R10[4])
      .px(x, y + 2, g[1]);
  } else {
    c.px(x, y, RAMPS.R11[3])
      .px(x + 1, y, RAMPS.R11[2])
      .px(x + 3, y + 1, RAMPS.R11[2])
      .px(x, y + 1, g[1]);
  }
}

/** 입구: 시듦이 기어 나오는 굴. 잿빛 안개가 번진다(맵 위 별도 이미지, 32×32) */
export function buildEntryArt(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x - 16, y - 18);
      if (d < 15 && d > 9 && (x + y) % 2 === 0 && hash(x, y, 3) < 0.6) c.px(x, y, RAMPS.R12[2]);
    }
  c.disc(16, 18, 9, RAMPS.R11[1]);
  c.disc(16, 19, 7, RAMPS.R12[0]);
  c.disc(16, 21, 5, SPECIAL.INK);
  for (const [x, y] of [
    [8, 13],
    [12, 10],
    [18, 9],
    [23, 12],
    [25, 17],
  ] as const)
    c.rect(x, y, 3, 2, RAMPS.R11[2]).px(x, y, RAMPS.R11[3]);
  // 굴 속 두 점 눈(시듦이 엿보는 중)
  c.px(13, 19, RAMPS.R7[4]).px(19, 19, RAMPS.R7[4]);
  return c;
}

/** 출구: 어미나무 뿌리 둥치. 줄기 · 뿌리 · 잎 몇 장 · 금빛 반짝이(28×34) */
export function buildRootsArt(): PixelCanvas {
  const c = new PixelCanvas(28, 34);
  c.disc(14, 9, 9, RAMPS.R1[0]);
  c.disc(13, 8, 7, RAMPS.R1[2]);
  c.disc(11, 6, 4, RAMPS.R1[3]);
  c.px(17, 5, SPECIAL.STARGOLD).px(9, 11, SPECIAL.STARGOLD);
  c.rect(11, 14, 6, 14, RAMPS.R10[1]);
  c.rect(12, 14, 2, 14, RAMPS.R10[2]);
  c.px(15, 18, RAMPS.R10[0]).px(14, 22, RAMPS.R10[0]);
  // 뿌리: 양옆으로 뻗어 땅을 움켜쥔다
  c.rect(4, 27, 20, 3, RAMPS.R10[1]).hline(5, 27, 18, RAMPS.R10[2]);
  c.rect(1, 29, 6, 2, RAMPS.R10[1])
    .rect(21, 29, 6, 2, RAMPS.R10[1])
    .rect(9, 30, 3, 3, RAMPS.R10[1])
    .rect(16, 30, 3, 3, RAMPS.R10[1]);
  c.px(0, 31, RAMPS.R10[1]).px(27, 31, RAMPS.R10[1]);
  return c;
}

/** 흐름 화살표(적이 가는 방향) 7×7. dir: 0 → · 1 ← · 2 ↓ · 3 ↑ */
export function buildFlowArrow(dir: 0 | 1 | 2 | 3): PixelCanvas {
  const right = ['.x.....', '.xx....', '.xxx...', '.xxxx..', '.xxx...', '.xx....', '.x.....'];
  const c = new PixelCanvas(9, 9);
  const on = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x > 6 || y > 6) return false;
    const [u, v] = dir === 0 ? [x, y] : dir === 1 ? [6 - x, y] : dir === 2 ? [y, x] : [6 - y, x];
    return right[v][u] === 'x';
  };
  for (let y = -1; y <= 7; y++)
    for (let x = -1; x <= 7; x++)
      if (!on(x, y) && (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1)))
        c.px(x + 1, y + 1, RAMPS.R10[1]);
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) if (on(x, y)) c.px(x + 1, y + 1, RAMPS.R9[4]);
  return c;
}
