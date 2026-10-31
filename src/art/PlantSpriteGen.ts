// 식물 스프라이트 생성 (02문서 7절). DOM 에 의존하지 않는 순수 함수라 Node 에서도 돌고 테스트할 수 있다.
//
//  종 데이터(look) → 스켈레톤(바디 플랜) → 부품 스탬프 → 자동 명암 → 선택적 외곽선 → 고아 픽셀 제거 → 프레임
//  얼굴은 몸에 그려 넣지 않는다. 프레임마다 faceHost(얼굴이 붙는 부위의 행별 몸 안쪽 구간)만 기록하고,
//  FaceRenderer 가 런타임에 덧그린다.
//
// 프레임: 대기 4(윗부분 ±1px 흔들림 + 1px 숨쉬기) · 공격 3(웅크림 → 뻗음 → 복귀) · 피격 1(4번 색 번쩍)
//         · 시듦 1(처짐 + 채도 낮춤) · 잠 1(처짐 + 한 단계 어둡게)

import type { PlantBase } from '../data/plants/types';
import { Rng } from '../core/Rng';
import { drawBody } from './bodies';
import { makeCtx, STAGE_SIZE, type Stage } from './bodies/Ctx';
import { lookParams } from './lookParams';
import { dullRamps, rampsFor, type RampSet } from './Ramps';
import { cloneGrid, darken, emptyColorGrid, flash, shade, wilt, type ColorGrid } from './Shading';

export type FrameName =
  | 'idle0'
  | 'idle1'
  | 'idle2'
  | 'idle3'
  | 'attack0'
  | 'attack1'
  | 'attack2'
  | 'hit'
  | 'wilt'
  | 'sleep';

export const FRAME_NAMES: readonly FrameName[] = [
  'idle0',
  'idle1',
  'idle2',
  'idle3',
  'attack0',
  'attack1',
  'attack2',
  'hit',
  'wilt',
  'sleep',
];

/** 얼굴이 붙는 부위. spans[j] 는 행 y+j 에서 외곽선을 뺀 몸 안쪽의 [왼쪽 x, 오른쪽 x](포함) */
export interface FaceHost {
  x: number;
  y: number;
  w: number;
  h: number;
  spans: ([number, number] | null)[];
}

export interface PlantFrame {
  name: FrameName;
  grid: ColorGrid;
  host: FaceHost;
  /** 호스트 몸 색(가장 많이 쓰인 색). 얼굴 잉크를 고르고 대비를 검사하는 기준 — 번쩍임 · 잠 프레임마다 다르다 */
  bodyColor: string;
}

export interface PlantSprite {
  speciesId: string;
  stage: Stage;
  variant: boolean;
  /** 프레임(캔버스) 크기 = 기본 크기 + 가로 여백 2 + 위 여백 1 */
  w: number;
  h: number;
  /** 윗부분만 흔드는 경계 행(이 행 아래는 흔들려도 그대로) */
  split: number;
  /** 영혼 계열 몸통은 70% 불투명도 허용(얼굴은 항상 100%) */
  translucent: boolean;
  frames: Record<FrameName, PlantFrame>;
}

export interface Warp {
  /** 이 행 위쪽(윗부분)만 움직인다 */
  split: number;
  dx: number;
  /** +1 늘림(숨쉬기 · 뻗음) · -1 웅크림 · 0 그대로 */
  stretch: -1 | 0 | 1;
}

/** 윗부분만 좌우로 흔들고 위아래로 늘이거나 줄인다. 결과는 (w+2)×(h+1), 바닥 기준으로 맞춘다. */
export function warp(src: ColorGrid, o: Warp): ColorGrid {
  const out = emptyColorGrid(src.w + 2, src.h + 1);
  const copy = (sy: number, dy: number, dx: number) => {
    if (dy < 0 || dy >= out.h) return;
    for (let x = 0; x < src.w; x++) {
      const si = sy * src.w + x;
      if (src.px[si] === null) continue;
      const tx = x + 1 + dx;
      if (tx < 0 || tx >= out.w) continue;
      const di = dy * out.w + tx;
      out.px[di] = src.px[si];
      out.outline[di] = src.outline[si];
      out.part[di] = src.part[si];
      out.role[di] = src.role[si];
      out.tone[di] = src.tone[si];
    }
  };
  for (let y = 0; y < src.h; y++) {
    if (y < o.split) {
      const dy = y + 1 + (o.stretch === 1 ? -1 : o.stretch === -1 ? 1 : 0);
      copy(y, dy, o.dx);
    } else if (y === o.split) {
      if (o.stretch === -1) continue; // 웅크림: 이 줄을 지운다
      copy(y, y + 1, 0);
      if (o.stretch === 1) copy(y, y, 0); // 늘림: 이 줄을 한 번 더 복제
    } else {
      copy(y, y + 1, 0);
    }
  }
  return out;
}

export function faceHostOf(grid: ColorGrid, hostPart: number): FaceHost {
  let y0 = Infinity;
  let y1 = -1;
  let x0 = Infinity;
  let x1 = -1;
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const i = y * grid.w + x;
      if (grid.part[i] !== hostPart || grid.px[i] === null || grid.outline[i]) continue;
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
    }
  }
  if (y1 < 0) return { x: 0, y: 0, w: 0, h: 0, spans: [] };
  // 행마다 호스트 몸 안쪽의 [가장 왼쪽, 가장 오른쪽]. 덫처럼 가운데가 일부러 비는 호스트도 양쪽에 눈을 둘 수 있다.
  const spans: ([number, number] | null)[] = [];
  for (let y = y0; y <= y1; y++) {
    let lo = Infinity;
    let hi = -1;
    for (let x = 0; x < grid.w; x++) {
      const i = y * grid.w + x;
      if (grid.part[i] === hostPart && grid.px[i] !== null && !grid.outline[i]) {
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
    }
    spans.push(hi < 0 ? null : [lo, hi]);
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, spans };
}

/** 호스트 부위에서 가장 많이 쓰인 색(외곽선 제외) */
export function hostColorOf(grid: ColorGrid, hostPart: number): string {
  const count = new Map<string, number>();
  for (let i = 0; i < grid.px.length; i++) {
    const c = grid.px[i];
    if (c && grid.part[i] === hostPart && !grid.outline[i]) count.set(c, (count.get(c) ?? 0) + 1);
  }
  let best = '';
  let bestN = 0;
  for (const [c, n] of count) if (n > bestN) [best, bestN] = [c, n];
  return best || '#7dbf4e';
}

/** 이 단계 · 종의 '기본 몸'(프레임 변형 전)을 만든다 */
export function buildBase(
  base: PlantBase,
  stage: Stage,
  ramps: RampSet,
): { grid: ColorGrid; hostPart: number; hostFound: boolean } {
  const params = lookParams(base.id, base.family, base.grade);
  const rng = new Rng(`art:${base.id}:${stage}`);
  const ctx = makeCtx(base.look, params, rng, stage);
  drawBody(ctx);
  const named = ctx.hosts[base.look.face.host];
  const hostPart = named ?? Object.values(ctx.hosts)[0] ?? 1;
  return { grid: shade(ctx.g, ramps), hostPart, hostFound: named !== undefined };
}

export function generatePlant(base: PlantBase, stage: Stage, variant = false): PlantSprite {
  const look = base.look;
  const ramps = rampsFor(look, { variant });
  const { grid, hostPart } = buildBase(base, stage, ramps);
  const [bw, bh] = STAGE_SIZE[stage];
  // 윗부분만 흔드는 경계선. 얼굴이 붙는 머리가 둘로 갈라져 어긋나지 않도록, 호스트를 가로지르면 호스트 바로 아래로 옮긴다.
  const hostBox = faceHostOf(grid, hostPart);
  let split = Math.round(bh * 0.55);
  if (hostBox.h > 0 && hostBox.y < split && hostBox.y + hostBox.h - 1 >= split) {
    split = Math.min(bh - 1, hostBox.y + hostBox.h);
  }
  const aurora = look.ramps.special === 'AURORA';

  // 오로라는 결(특수색)이 프레임마다 흘러가도록 램프 위상을 바꿔 다시 칠한다
  const bodyAt = (phase: number): ColorGrid =>
    aurora ? buildBase(base, stage, rampsFor(look, { variant, phase })).grid : grid;

  const make = (name: FrameName, g: ColorGrid): PlantFrame => ({
    name,
    grid: g,
    host: faceHostOf(g, hostPart),
    bodyColor: hostColorOf(g, hostPart),
  });
  const frames = {} as Record<FrameName, PlantFrame>;
  const idle: [number, 0 | 1 | -1][] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  idle.forEach(([dx, stretch], i) => {
    const name = `idle${i}` as FrameName;
    frames[name] = make(name, warp(bodyAt(i), { split, dx, stretch }));
  });
  frames.attack0 = make('attack0', warp(grid, { split, dx: 0, stretch: -1 }));
  frames.attack1 = make('attack1', warp(grid, { split, dx: 1, stretch: 1 }));
  frames.attack2 = make('attack2', warp(grid, { split, dx: 0, stretch: 0 }));
  frames.hit = make('hit', flash(warp(grid, { split, dx: 0, stretch: 0 }), ramps));
  frames.wilt = make('wilt', wilt(warp(grid, { split, dx: 1, stretch: -1 }), dullRamps()));
  frames.sleep = make('sleep', darken(warp(grid, { split, dx: 0, stretch: -1 }), ramps));

  return {
    speciesId: base.id,
    stage,
    variant,
    w: bw + 2,
    h: bh + 1,
    split,
    translucent: look.translucent === true,
    frames,
  };
}

export { cloneGrid };
