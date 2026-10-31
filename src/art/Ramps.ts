// 식물 하나가 쓰는 색 조합(주 · 보조 · 강조 · 특수). 최대 3램프(02문서 2절) + 특수색 장식.
// 모든 값은 66색 팔레트 안에서만 고른다.

import type { PlantLook, SpecialRamp } from '../core/schema';
import type { Role } from './PixelGrid';
import { RAMPS, SPECIAL, type Ramp } from './palette';

export type RampSet = Record<Role, Ramp>;

export const PAPER_RAMP: Ramp = [
  SPECIAL.CREAM,
  SPECIAL.CREAM,
  SPECIAL.PAPER,
  SPECIAL.PAPER,
  SPECIAL.PAPER,
];

/** 특수색 램프(0 어두움 → 4 밝음). 단색 장식이라 중간 단계가 겹쳐도 된다. */
const SPECIAL_RAMPS: Record<Exclude<SpecialRamp, 'AURORA'>, Ramp> = {
  STARGOLD: [RAMPS.R9[1], RAMPS.R9[2], RAMPS.R9[3], SPECIAL.STARGOLD, RAMPS.R9[4]],
  ORIGIN: [SPECIAL.INK, RAMPS.R12[1], SPECIAL.STARGOLD, SPECIAL.STARGOLD, SPECIAL.PAPER],
  SILVER: [RAMPS.R11[1], RAMPS.R11[2], RAMPS.R11[3], RAMPS.R11[4], SPECIAL.PAPER],
  TOXIC: [RAMPS.R1[1], RAMPS.R1[3], SPECIAL.TOXIC, SPECIAL.TOXIC, RAMPS.R1[4]],
  ARCANE: [RAMPS.R3[1], RAMPS.R3[3], SPECIAL.CYAN, SPECIAL.CYAN, SPECIAL.PAPER],
};

/** 오로라: 청록 → 보라 → 분홍 → 하늘색으로 흐르는 4색(프레임마다 한 칸씩 돈다) */
const AURORA_COLORS = [RAMPS.R3[3], RAMPS.R5[3], RAMPS.R6[3], RAMPS.R4[3]];

function auroraRamp(phase: number): Ramp {
  const c = (k: number) => AURORA_COLORS[(phase + k + 400) % 4];
  return [c(0), c(1), c(2), c(3), SPECIAL.PAPER];
}

export interface RampOptions {
  /** 색변이 개체: 종마다 정해진 대체 램프(주 · 보조)로 바꿔 끼운다 */
  variant?: boolean;
  /** 오로라 흐름 위상(프레임 번호) */
  phase?: number;
}

export function rampsFor(look: PlantLook, opts: RampOptions = {}): RampSet {
  const main = RAMPS[opts.variant ? look.variantRamps.main : look.ramps.main];
  const sub = RAMPS[opts.variant ? look.variantRamps.sub : look.ramps.sub];
  const accent = look.ramps.accent ? RAMPS[look.ramps.accent] : sub;
  const sp = look.ramps.special;
  const special: Ramp = sp
    ? sp === 'AURORA'
      ? auroraRamp(opts.phase ?? 0)
      : SPECIAL_RAMPS[sp]
    : accent;
  return { M: main, S: sub, A: accent, X: special };
}

/** 시듦 · 병든 상태용: 채도를 낮춘 램프(주 → 이끼, 나머지 → 돌) */
export function dullRamps(): RampSet {
  return { M: RAMPS.R2, S: RAMPS.R11, A: RAMPS.R11, X: RAMPS.R11 };
}

/** 상태이상 · 일반 UI 가 몸 색을 알아야 할 때: 대표 색(주 램프 2번) */
export function mainColor(look: PlantLook, variant = false): string {
  return rampsFor(look, { variant }).M[2];
}
