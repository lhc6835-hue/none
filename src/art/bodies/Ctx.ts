// 바디 플랜이 공유하는 그리기 컨텍스트와 도우미

import type { PlantLook } from '../../core/schema';
import type { Rng } from '../../core/Rng';
import { PixelGrid, type Role } from '../PixelGrid';
import type { LookParams } from '../lookParams';
import { stamp } from '../stamps';

export type Stage = 1 | 2 | 3 | 4 | 5;

/** 단계별 스프라이트 크기 (02문서 4절): 발아 8×8 · 새싹 12×14 · 어린잎 16×20 · 성숙 22×28 · 개화 24×32 */
export const STAGE_SIZE: Record<Stage, [number, number]> = {
  1: [8, 8],
  2: [12, 14],
  3: [16, 20],
  4: [22, 28],
  5: [24, 32],
};

export type Anchor = 'tl' | 'tc' | 'tr' | 'cl' | 'c' | 'cr' | 'bl' | 'bc' | 'br';

export interface BuildCtx {
  g: PixelGrid;
  rng: Rng;
  look: PlantLook;
  p: LookParams;
  stage: Stage;
  W: number;
  H: number;
  /** 가운데 x · 땅(발) y(바깥 외곽선 한 줄 위) */
  cx: number;
  base: number;
  /** 얼굴 호스트 이름 → 부위 번호 */
  hosts: Record<string, number>;
  /** 이 부위 번호들은 몸통(흔들림 · 시선 기준)에서 윗부분에 속한다 */
  isBloom: boolean;
}

export function makeCtx(look: PlantLook, p: LookParams, rng: Rng, stage: Stage): BuildCtx {
  const [W, H] = STAGE_SIZE[stage];
  return {
    g: new PixelGrid(W, H),
    rng,
    look,
    p,
    stage,
    W,
    H,
    cx: Math.floor(W / 2),
    base: H - 2,
    hosts: {},
    isBloom: stage === 5,
  };
}

/** 스탬프의 앵커(점)가 (x, y)에 오도록 찍는다 */
export function put(
  c: BuildCtx,
  id: string,
  x: number,
  y: number,
  anchor: Anchor,
  part: number,
  opts: { flipX?: boolean; flipY?: boolean; role?: Role } = {},
): void {
  const s = stamp(id);
  const { w, h } = PixelGrid.size(s);
  const ox = anchor.endsWith('l') ? 0 : anchor.endsWith('r') ? w - 1 : Math.floor((w - 1) / 2);
  const oy = anchor.startsWith('t') ? 0 : anchor.startsWith('b') ? h - 1 : Math.floor((h - 1) / 2);
  c.g.stamp(s, Math.round(x) - ox, Math.round(y) - oy, part, opts);
}

/** 굵기 t 의 줄기(2차 곡선). bend 만큼 가운데가 휜다. */
export function stemCurve(
  c: BuildCtx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bend: number,
  thick: number,
  part: number,
  role: Role,
): void {
  const steps = Math.max(4, Math.abs(y1 - y0) * 2);
  let px = x0;
  let py = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t + bend * Math.sin(Math.PI * t);
    const y = y0 + (y1 - y0) * t;
    c.g.line(px, py, x, y, part, role, thick);
    px = x;
    py = y;
  }
}

/** x, y 의 한쪽 잎. dir: -1 왼쪽 · +1 오른쪽 */
export function sideLeaf(
  c: BuildCtx,
  id: string,
  x: number,
  y: number,
  dir: -1 | 1,
  part: number,
): void {
  put(c, id, x, y, dir > 0 ? 'bl' : 'br', part, { flipX: dir < 0 });
}

/** 줄기를 따라 좌우 잎을 번갈아 단다 */
export function leavesAlong(
  c: BuildCtx,
  x: number,
  y0: number,
  y1: number,
  count: number,
  id: string,
  part: number,
): void {
  for (let i = 0; i < count; i++) {
    const y = y0 + ((y1 - y0) * i) / Math.max(1, count - 1);
    sideLeaf(c, id, x, y, i % 2 === 0 ? 1 : -1, part);
  }
}

/** 소수 곱 후 반올림 */
export const px = (v: number): number => Math.round(v);
