// 흙 8종 (05문서 3절). 심을 때 · 분갈이할 때 고른다.

export interface SoilDef {
  id: string;
  nameKey: string;
  /** 과습 확률 · 수분 감소 · 양분 감소 · 곰팡이 배율(1 = 변화 없음) */
  overwaterMul?: number;
  waterDecayMul?: number;
  nutritionDecayMul?: number;
  moldMul?: number;
  /** 계열별 컨디션 보정 */
  familyBonus?: Partial<Record<string, number>>;
  otherFamilyPenalty?: number;
  variantMul?: number;
}

export const SOILS: Record<string, SoilDef> = {
  BASIC: { id: 'BASIC', nameKey: 'soil.BASIC' },
  GRAVEL: { id: 'GRAVEL', nameKey: 'soil.GRAVEL', overwaterMul: 0.5, waterDecayMul: 1.1 },
  LEAF_MOLD: { id: 'LEAF_MOLD', nameKey: 'soil.LEAF_MOLD', nutritionDecayMul: 0.75 },
  PEAT: { id: 'PEAT', nameKey: 'soil.PEAT', waterDecayMul: 0.7, moldMul: 1.2 },
  STAR_SAND: {
    id: 'STAR_SAND',
    nameKey: 'soil.STAR_SAND',
    familyBonus: { LUMEN: 0.05 },
    variantMul: 1.2,
  },
  MYCELIUM: {
    id: 'MYCELIUM',
    nameKey: 'soil.MYCELIUM',
    familyBonus: { FUNGUS: 0.1 },
    otherFamilyPenalty: -0.05,
  },
  VOLCANIC: { id: 'VOLCANIC', nameKey: 'soil.VOLCANIC', familyBonus: { EMBER: 0.1 } },
  FROST: { id: 'FROST', nameKey: 'soil.FROST', familyBonus: { FROST: 0.1 } },
};
