// 난이도 5단계 (09문서 1절)

export type DifficultyId = 'WALK' | 'NORMAL' | 'THORN' | 'STORM' | 'NIGHT';

export interface DifficultyDef {
  id: DifficultyId;
  nameKey: string;
  hpMul: number;
  speedMul: number;
  hearts: number;
  extraWaves: number;
  /** 엘리트 간격(웨이브마다, 0 = 없음) */
  eliteEvery: number;
  rewardMul: number;
  /** 해금 정원사 레벨 */
  unlockLevel: number;
}

export const DIFFICULTY: Record<DifficultyId, DifficultyDef> = {
  WALK: {
    id: 'WALK',
    nameKey: 'diff.WALK',
    hpMul: 0.7,
    speedMul: 0.9,
    hearts: 30,
    extraWaves: -2,
    eliteEvery: 0,
    rewardMul: 0.6,
    unlockLevel: 1,
  },
  NORMAL: {
    id: 'NORMAL',
    nameKey: 'diff.NORMAL',
    hpMul: 1.0,
    speedMul: 1.0,
    hearts: 20,
    extraWaves: 0,
    eliteEvery: 0,
    rewardMul: 1.0,
    unlockLevel: 1,
  },
  THORN: {
    id: 'THORN',
    nameKey: 'diff.THORN',
    hpMul: 1.6,
    speedMul: 1.05,
    hearts: 15,
    extraWaves: 3,
    eliteEvery: 5,
    rewardMul: 1.6,
    unlockLevel: 8,
  },
  STORM: {
    id: 'STORM',
    nameKey: 'diff.STORM',
    hpMul: 2.4,
    speedMul: 1.1,
    hearts: 10,
    extraWaves: 5,
    eliteEvery: 3,
    rewardMul: 2.4,
    unlockLevel: 12,
  },
  NIGHT: {
    id: 'NIGHT',
    nameKey: 'diff.NIGHT',
    hpMul: 3.5,
    speedMul: 1.15,
    hearts: 5,
    extraWaves: 8,
    eliteEvery: 2,
    rewardMul: 3.5,
    unlockLevel: 12,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['WALK', 'NORMAL', 'THORN', 'STORM', 'NIGHT'];
