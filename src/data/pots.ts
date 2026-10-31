// 화분 9종 (05문서 3절). 크기 소 · 중 · 대, 분갈이마다 한 단계 큰 화분이 필요하다.

export type PotSize = 1 | 2 | 3;

export interface PotDef {
  id: string;
  nameKey: string;
  /** 소 · 중 · 대 가격(잎전). 0 이면 상점에서 팔지 않는다 */
  price: [number, number, number];
  overwaterRecoveryMul?: number;
  waterDecayMul?: number;
  overwaterChanceMul?: number;
  moodDecayMul?: number;
  humidityStep?: number;
  pestMul?: number;
  tempStep?: number;
  familyBonus?: Partial<Record<string, number>>;
  affectionMul?: number;
  qualityBonus?: number;
  decor?: boolean;
  /** 시작 지급 */
  starter?: boolean;
}

export const POTS: Record<string, PotDef> = {
  CLAY: {
    id: 'CLAY',
    nameKey: 'pot.CLAY',
    price: [10, 25, 50],
    overwaterRecoveryMul: 2,
    starter: true,
  },
  PLASTIC: {
    id: 'PLASTIC',
    nameKey: 'pot.PLASTIC',
    price: [8, 20, 40],
    waterDecayMul: 0.85,
    overwaterChanceMul: 1.2,
  },
  GLAZED: { id: 'GLAZED', nameKey: 'pot.GLAZED', price: [30, 70, 140], moodDecayMul: 0.9 },
  TERRARIUM: {
    id: 'TERRARIUM',
    nameKey: 'pot.TERRARIUM',
    price: [40, 90, 180],
    humidityStep: 1,
    pestMul: 0.5,
  },
  BUCKET: { id: 'BUCKET', nameKey: 'pot.BUCKET', price: [30, 70, 140], tempStep: 1 },
  SHELL: {
    id: 'SHELL',
    nameKey: 'pot.SHELL',
    price: [0, 0, 0],
    familyBonus: { FROST: 0.05 },
    waterDecayMul: 0.9,
  },
  STUMP: { id: 'STUMP', nameKey: 'pot.STUMP', price: [0, 0, 0], affectionMul: 1.1 },
  STAR_SHARD: { id: 'STAR_SHARD', nameKey: 'pot.STAR_SHARD', price: [0, 0, 0], qualityBonus: 0.05 },
  SEASONAL: { id: 'SEASONAL', nameKey: 'pot.SEASONAL', price: [0, 0, 0], decor: true },
};
