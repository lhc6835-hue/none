// 씨앗 8×8 (02문서 4절): 계열별 모양 10종 + 등급별 색. 외곽선 1px 을 더해 10×10 캔버스로 그린다.
// (몸 8×8 + 외곽선 — 외곽선까지 8×8 에 넣으면 모양을 알아볼 수 없어서, DECISIONS.md 에 기록)

import type { FamilyId, GradeId } from '../core/schema';
import { PixelGrid } from './PixelGrid';
import { shade, type ColorGrid } from './Shading';
import { RAMPS, SPECIAL, type Ramp } from './palette';
import type { RampSet } from './Ramps';
import { stamp } from './stamps';

const ORIGIN_BODY: Ramp = [SPECIAL.INK, RAMPS.R11[0], RAMPS.R11[1], RAMPS.R11[2], RAMPS.R11[3]];
const AURORA_X: Ramp = [RAMPS.R3[3], RAMPS.R5[3], RAMPS.R6[3], RAMPS.R4[3], SPECIAL.PAPER];
/** 오로라 씨앗의 몸: 청록 → 보라 → 분홍으로 흐르는 전용 램프(이슬의 청록과 구분) */
const AURORA_BODY: Ramp = [RAMPS.R3[1], RAMPS.R3[3], RAMPS.R5[3], RAMPS.R6[3], SPECIAL.PAPER];
const GOLD: Ramp = [RAMPS.R9[1], RAMPS.R9[2], RAMPS.R9[3], SPECIAL.STARGOLD, RAMPS.R9[4]];

/** 등급이 씨앗의 색을 정한다. 이름만 들어도 색이 떠오르게(03문서 1절). */
export function seedRamps(grade: GradeId): RampSet {
  switch (grade) {
    case 'SHADE':
      return { M: RAMPS.R11, S: RAMPS.R10, A: RAMPS.R2, X: RAMPS.R11 };
    case 'DEW':
      return { M: RAMPS.R3, S: RAMPS.R1, A: RAMPS.R4, X: RAMPS.R4 };
    case 'SUN':
      return { M: RAMPS.R9, S: RAMPS.R8, A: RAMPS.R10, X: RAMPS.R9 };
    case 'DUSK':
      return { M: RAMPS.R8, S: RAMPS.R6, A: RAMPS.R7, X: RAMPS.R6 };
    case 'MOON':
      return { M: RAMPS.R5, S: RAMPS.R11, A: RAMPS.R5, X: RAMPS.R11 };
    case 'STAR':
      return { M: RAMPS.R4, S: RAMPS.R5, A: RAMPS.R4, X: GOLD };
    case 'AURORA':
      return { M: AURORA_BODY, S: RAMPS.R5, A: RAMPS.R6, X: AURORA_X };
    case 'ORIGIN':
      return { M: ORIGIN_BODY, S: RAMPS.R11, A: GOLD, X: GOLD };
  }
}

export function generateSeed(family: FamilyId, grade: GradeId): ColorGrid {
  const g = new PixelGrid(10, 10, 1);
  g.stamp(stamp(`seed.${family}`), 1, 1, g.newPart());
  return shade(g, seedRamps(grade));
}
