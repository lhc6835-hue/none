// 빛 등급 8단계 (03문서 1 · 2절). 밸런스 수치(능력치 배율 · 비용 · 개화 시간)와 색 · 표식을 한 곳에 둔다.

import type { GradeId } from '../core/schema';
import { RAMPS, SPECIAL } from '../art/palette';

export type GradeMark =
  'SQUARE' | 'DROP' | 'SUN' | 'HALF_SUN' | 'MOON' | 'STAR' | 'WAVE' | 'RING_DOT';

export interface GradeDef {
  id: GradeId;
  /** 1–8 */
  order: number;
  nameKey: string;
  /** 대표색 · 카드 테두리 색 · 이름 글자색(크림 바탕에서 4.5:1 이상) */
  color: string;
  border: string;
  text: string;
  /** 색각 이상 배려: 색 + 모양 × 개수로 등급을 표시한다 */
  mark: GradeMark;
  markCount: number;
  speciesCount: number;
  /** 피해량 · 체력 · 생산량 · 장벽 체력에 곱하는 배율 */
  statMul: number;
  /** 전투 배치 기본 비용(양분) */
  baseCost: number;
  /** 보통 돌봄으로 개화까지 걸리는 시간(분) */
  bloomMinutes: number;
  /** 기본 형질 칸 · 곰팡이 · 해충 발생 배율 */
  traitSlots: number;
  problemMul: number;
  /** 개봉 연출 길이(초) */
  revealSec: number;
}

export const GRADES: Record<GradeId, GradeDef> = {
  SHADE: {
    id: 'SHADE',
    order: 1,
    nameKey: 'grade.SHADE',
    color: RAMPS.R11[3],
    border: RAMPS.R11[3],
    text: RAMPS.R11[1],
    mark: 'SQUARE',
    markCount: 1,
    speciesCount: 18,
    statMul: 1.0,
    baseCost: 50,
    bloomMinutes: 6,
    traitSlots: 1,
    problemMul: 0.6,
    revealSec: 0.6,
  },
  DEW: {
    id: 'DEW',
    order: 2,
    nameKey: 'grade.DEW',
    color: RAMPS.R3[3],
    border: RAMPS.R3[3],
    text: RAMPS.R3[1],
    mark: 'DROP',
    markCount: 2,
    speciesCount: 18,
    statMul: 1.2,
    baseCost: 75,
    bloomMinutes: 15,
    traitSlots: 1,
    problemMul: 0.8,
    revealSec: 0.8,
  },
  SUN: {
    id: 'SUN',
    order: 3,
    nameKey: 'grade.SUN',
    color: RAMPS.R9[3],
    border: RAMPS.R9[3],
    text: RAMPS.R9[1],
    mark: 'SUN',
    markCount: 3,
    speciesCount: 16,
    statMul: 1.45,
    baseCost: 100,
    bloomMinutes: 30,
    traitSlots: 1,
    problemMul: 1.0,
    revealSec: 1.0,
  },
  DUSK: {
    id: 'DUSK',
    order: 4,
    nameKey: 'grade.DUSK',
    color: RAMPS.R8[3],
    border: RAMPS.R6[3],
    text: RAMPS.R8[1],
    mark: 'HALF_SUN',
    markCount: 4,
    speciesCount: 14,
    statMul: 1.75,
    baseCost: 130,
    bloomMinutes: 60,
    traitSlots: 2,
    problemMul: 1.1,
    revealSec: 1.2,
  },
  MOON: {
    id: 'MOON',
    order: 5,
    nameKey: 'grade.MOON',
    color: RAMPS.R5[4],
    border: RAMPS.R11[4],
    text: RAMPS.R5[1],
    mark: 'MOON',
    markCount: 5,
    speciesCount: 12,
    statMul: 2.1,
    baseCost: 165,
    bloomMinutes: 120,
    traitSlots: 2,
    problemMul: 1.2,
    revealSec: 1.5,
  },
  STAR: {
    id: 'STAR',
    order: 6,
    nameKey: 'grade.STAR',
    color: RAMPS.R4[1],
    border: SPECIAL.STARGOLD,
    text: SPECIAL.PAPER,
    mark: 'STAR',
    markCount: 6,
    speciesCount: 10,
    statMul: 2.5,
    baseCost: 200,
    bloomMinutes: 240,
    traitSlots: 2,
    problemMul: 1.3,
    revealSec: 1.8,
  },
  AURORA: {
    id: 'AURORA',
    order: 7,
    nameKey: 'grade.AURORA',
    color: RAMPS.R5[3],
    border: RAMPS.R3[3],
    text: RAMPS.R5[0],
    mark: 'WAVE',
    markCount: 7,
    speciesCount: 8,
    statMul: 3.0,
    baseCost: 250,
    bloomMinutes: 480,
    traitSlots: 3,
    problemMul: 1.4,
    revealSec: 2.2,
  },
  ORIGIN: {
    id: 'ORIGIN',
    order: 8,
    nameKey: 'grade.ORIGIN',
    color: SPECIAL.INK,
    border: SPECIAL.STARGOLD,
    text: SPECIAL.STARGOLD,
    mark: 'RING_DOT',
    markCount: 8,
    speciesCount: 4,
    statMul: 3.6,
    baseCost: 320,
    bloomMinutes: 960,
    traitSlots: 3,
    problemMul: 1.5,
    revealSec: 3.0,
  },
};

export const GRADE_ORDER: readonly GradeId[] = [
  'SHADE',
  'DEW',
  'SUN',
  'DUSK',
  'MOON',
  'STAR',
  'AURORA',
  'ORIGIN',
];
