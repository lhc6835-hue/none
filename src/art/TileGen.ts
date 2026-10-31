// 타일 24×24 (02문서 4 · 9절): 흙 · 비옥한 흙 · 그늘 · 물 · 길 · 바위 + 바닥(챕터마다 다른 팔레트).
// 바닥 타일은 변형 4종을 섞어 반복 패턴이 보이지 않게 한다. 배경이므로 디더링을 쓸 수 있다.

import { Rng } from '../core/Rng';
import { emptyColorGrid, type ColorGrid } from './Shading';
import { RAMPS, SPECIAL, type Ramp } from './palette';

export type TileKind = 'floor' | 'path' | 'soil' | 'fertile' | 'shade' | 'water' | 'rock';
export const TILE_KINDS: readonly TileKind[] = [
  'floor',
  'path',
  'soil',
  'fertile',
  'shade',
  'water',
  'rock',
];
export const TILE_SIZE = 24;
export const TILE_VARIANTS = 4;

interface Theme {
  floor: Ramp;
  floorSpeck: string;
  path: Ramp;
  pathSpeck: string;
}

/** 챕터 1–7 의 바닥 · 길 (02문서 9절 표) */
const THEMES: Record<number, Theme> = {
  1: { floor: RAMPS.R1, floorSpeck: RAMPS.R1[3], path: RAMPS.R10, pathSpeck: RAMPS.R10[4] },
  2: { floor: RAMPS.R2, floorSpeck: RAMPS.R3[3], path: RAMPS.R10, pathSpeck: RAMPS.R2[3] },
  3: { floor: RAMPS.R2, floorSpeck: RAMPS.R5[3], path: RAMPS.R10, pathSpeck: RAMPS.R10[1] },
  4: { floor: RAMPS.R8, floorSpeck: RAMPS.R8[4], path: RAMPS.R10, pathSpeck: RAMPS.R8[3] },
  5: { floor: RAMPS.R4, floorSpeck: SPECIAL.PAPER, path: RAMPS.R4, pathSpeck: RAMPS.R4[4] },
  6: { floor: RAMPS.R11, floorSpeck: RAMPS.R7[2], path: RAMPS.R11, pathSpeck: RAMPS.R11[4] },
  7: { floor: RAMPS.R12, floorSpeck: RAMPS.R12[3], path: RAMPS.R12, pathSpeck: RAMPS.R5[2] },
};

export function generateTile(chapter: number, kind: TileKind, variant: number): ColorGrid {
  const t = THEMES[chapter] ?? THEMES[1];
  const rng = new Rng(`art:tile:${chapter}:${kind}:${variant}`);
  const g = emptyColorGrid(TILE_SIZE, TILE_SIZE);
  const put = (x: number, y: number, c: string) => {
    if (x >= 0 && y >= 0 && x < TILE_SIZE && y < TILE_SIZE) g.px[y * TILE_SIZE + x] = c;
  };
  const fill = (c: string) => g.px.fill(c);
  const speckle = (n: number, c: string) => {
    for (let i = 0; i < n; i++) put(rng.int(0, 23), rng.int(0, 23), c);
  };
  const base = kind === 'path' ? t.path : t.floor;
  switch (kind) {
    case 'floor':
      fill(t.floor[2]);
      speckle(26, t.floor[1]);
      speckle(14, t.floorSpeck);
      for (let i = 0; i < 4; i++) {
        const x = rng.int(1, 22);
        const y = rng.int(3, 22);
        put(x, y, t.floor[3]);
        put(x, y - 1, t.floor[3]);
      }
      break;
    case 'path':
      fill(base[3]);
      speckle(30, base[2]);
      speckle(12, t.pathSpeck);
      for (let x = 0; x < 24; x++) {
        put(x, 0, base[2]);
        put(x, 23, base[2]);
      }
      break;
    case 'soil':
    case 'fertile': {
      // 배치 가능한 흙: 풀밭 위의 작은 갈아 놓은 흙 자리(전체가 이 타일일 수 있어 대비를 낮춘다)
      fill(t.floor[2]);
      speckle(12, t.floor[1]);
      for (let y = 8; y < 19; y++) {
        const half = Math.round(8 * Math.sqrt(Math.max(0, 1 - ((y - 13) / 5.5) ** 2)));
        for (let x = 12 - half; x < 12 + half; x++) put(x, y, y < 11 ? RAMPS.R10[2] : RAMPS.R10[1]);
      }
      speckle(6, RAMPS.R10[2]);
      if (kind === 'fertile') {
        // 비옥한 흙: 반짝이는 표시
        for (const [x, y] of [
          [7, 8],
          [16, 11],
          [10, 16],
        ] as const) {
          put(x, y, SPECIAL.STARGOLD);
          put(x - 1, y, RAMPS.R9[4]);
          put(x + 1, y, RAMPS.R9[4]);
          put(x, y - 1, RAMPS.R9[4]);
          put(x, y + 1, RAMPS.R9[4]);
        }
      }
      break;
    }
    case 'shade':
      // 그늘: 바닥에 보라 그림자를 체크 디더링으로 깐다
      fill(t.floor[1]);
      for (let y = 0; y < 24; y++)
        for (let x = 0; x < 24; x++) if ((x + y) % 2 === 0) put(x, y, RAMPS.R5[0]);
      speckle(14, t.floor[0]);
      break;
    case 'water':
      fill(RAMPS.R4[2]);
      for (let y = 0; y < 24; y++)
        for (let x = 0; x < 24; x++) if ((x + y + (y >> 3)) % 2 === 0) put(x, y, RAMPS.R4[1]);
      for (let i = 0; i < 5; i++) {
        const x = rng.int(1, 18);
        const y = rng.int(2, 21);
        for (let k = 0; k < 4; k++) put(x + k, y, RAMPS.R4[4]);
      }
      break;
    case 'rock':
      fill(t.floor[2]);
      speckle(10, t.floor[1]);
      for (let y = 5; y < 21; y++) {
        const half = Math.round(9 * Math.sqrt(Math.max(0, 1 - ((y - 13) / 8.5) ** 2)));
        for (let x = 12 - half; x < 12 + half; x++)
          put(x, y, y < 10 ? RAMPS.R11[3] : y > 16 ? RAMPS.R11[1] : RAMPS.R11[2]);
      }
      for (let x = 7; x < 14; x++) put(x, 8, RAMPS.R11[4]);
      break;
  }
  return g;
}
