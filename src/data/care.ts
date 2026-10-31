// 돌봄 · 성장 수치 (04문서). 밸런스 수치는 전부 여기에만 둔다. 바꾸면 DECISIONS.md 에 적는다.

import type { GradeId } from '../core/schema';
import { GRADES } from './grades';

/** 성장 단계 0–5: 씨앗 · 발아 · 새싹 · 어린잎 · 성숙 · 개화. 누적 GP 비율 (04문서 2절) */
export const STAGE_RATIO = [0, 0.05, 0.15, 0.35, 0.65, 1] as const;
export const STAGE_KEYS = ['seed', 'sprout', 'bud', 'leaf', 'mature', 'bloom'] as const;

/** 개화까지 필요한 총 GP = 개화 시간(분) × 60 (그늘 360 … 태초 57,600) */
export const totalGpOf = (grade: GradeId): number => GRADES[grade].bloomMinutes * 60;

/** 욕구 감소 속도(시간당): 어린 단계(0–3) · 성숙 이후(4–5) */
export const NEED_DECAY_PER_HOUR = {
  water: { young: 30, mature: 15 },
  nutrition: { young: 12, mature: 6 },
  mood: { young: 8, mature: 8 },
} as const;

/** 수분 적정 구간 (물 적게 · 보통 · 많이) */
export const WATER_RANGE = {
  LOW: [30, 55],
  MID: [50, 75],
  HIGH: [70, 95],
} as const;

export const NEED_LOW = 25; // 목마름 · 영양 결핍 · (기분 30)
export const MOOD_LOW = 30;
export const WATER_OVER = 100;
export const NEED_MAX = 130; // 수분은 넘칠 수 있다(과습)
export const HYGIENE_PER_MOLD = 10;
export const HYGIENE_PER_PEST = 5;
export const HYGIENE_PER_WITHER = 5;

/** 컨디션 배율 (3-1): clamp(0.3, 1.5, 1.0 + 보정의 합) */
export const CONDITION = {
  min: 0.3,
  max: 1.5,
  water: { good: 0.15, thirsty: -0.4, over: -0.3 },
  nutrition: { highAt: 60, good: 0.1, bad: -0.3 },
  hygiene: { highAt: 80, good: 0.05, lowAt: 50, bad: -0.2 },
  mood: { highAt: 80, good: 0.1, bad: -0.2 },
  light: { match: 0.1, opposite: -0.2 },
  temp: { match: 0.05, bad: -0.15 },
  happy: 0.05,
} as const;

/** 출격 컨디션 → 전투 보정 (3-1 끝) */
export const BATTLE_CONDITION = [
  { min: 1.3, key: 'best', mul: 1.05 },
  { min: 1.0, key: 'good', mul: 1.0 },
  { min: 0.7, key: 'fair', mul: 0.95 },
  { min: 0, key: 'sulky', mul: 0.85 },
] as const;

/** 성장 속도 (2-2) */
export const GROWTH = {
  gpPerSecond: 1,
  vitalityMultiplier: 1.5,
  vitalityMs: 10 * 60_000,
  growBoostMultiplier: 1.3,
  growBoostMs: 30 * 60_000,
  excessMultiplier: 0.5,
  excessMs: 60 * 60_000,
  toppledMultiplier: 0.7,
  pestPenaltyPer20s: 0.01,
  nightMultiplier: { DAY: 0.8, NIGHT: 1.2 } as const,
  seasonSpring: 1.05,
  /** 뿌리 꽉 참: 2→3 · 4→5 단계 진입 직전에 걸린다. 이 비율만큼 모자란 곳에서 멈춘다 */
  rootboundStops: [2, 4] as const,
  rootboundHold: 0.99,
  /** 지지대가 필요한 종은 어린잎(3) 단계에서 지지대가 없으면 쓰러진다 */
  stakeStage: 3,
} as const;

/** 오프라인 (2-3 · 12문서 7절) */
export const OFFLINE = {
  maxMs: 12 * 3_600_000,
  batchMs: 10 * 60_000,
  needDecayMul: 0.5,
  needFloor: 20,
  gpMul: 0.8,
} as const;

/** 문제 발생 (6절): 10분마다 판정 */
export const PROBLEMS = {
  rollMs: 10 * 60_000,
  moldBase: 0.04,
  moldMaxSpots: 6,
  moldDiseaseMs: 2 * 3_600_000,
  moldEarlyMs: 10 * 60_000,
  pestBase: 0.03,
  pestMin: 3,
  pestMax: 8,
  pestTickMs: 20_000,
  overwaterMs: 30 * 60_000,
  rootRotMs: 2 * 3_600_000,
  witherPerStage: [1, 3] as const,
  humidity: { DRY: 0.5, NORMAL: 1, WET: 2, WATER: 0.5 } as const,
  mistLimitPerMinute: 8,
  mistMoldMs: 30 * 60_000,
  woundMs: 30 * 60_000,
} as const;

/** 등급별 곰팡이 · 해충 발생 배율 */
export const PROBLEM_GRADE_MUL: Record<GradeId, number> = {
  SHADE: 0.6,
  DEW: 0.8,
  SUN: 1.0,
  DUSK: 1.1,
  MOON: 1.2,
  STAR: 1.3,
  AURORA: 1.4,
  ORIGIN: 1.5,
};

/** 숙련도 (5-2): 행동 횟수 기준 1–5 */
export const MASTERY_AT = [0, 10, 30, 80, 200] as const;
export const MASTERY_PERFECT_WINDOW = 1.2; // 숙련 2: 완벽 판정 구간 +20%
export const MASTERY_GP_BONUS = 0.05; // 숙련 3: 완벽 GP 보너스 +5%
export const MASTERY_QUICK_AT = 4; // 숙련 4: 길게 누르면 바로 '완벽'

/** 애정도 (8절): 누적 점수 기준 ♡1–♡10, 하루 한 식물당 최대 60 */
export const AFFECTION = {
  thresholds: [20, 50, 100, 170, 260, 380, 530, 720, 950, 1250],
  dailyCap: 60,
  gain: { perfect: 3, normal: 1, pet: 2, talk: 2, snack: 5, deploy: 3, mvp: 5, sweet: 3 },
  neglectDays: 7,
  neglectPerDay: -5,
} as const;

/** 자질 (9-1) */
export const QUALITY = {
  cuts: [0.8, 1.0, 1.15, 1.3],
  perfectWeight: 0.2,
  battleBonus: [0, 0.05, 0.1, 0.16, 0.24],
  starAmpouleChance: 0.5,
  sampleMs: 60_000,
} as const;

/** 돌봄 행동의 반복 제한 · 효과 수치 (5절) */
export const CARE = {
  waterPerSecond: 25,
  waterPerfectMood: 5,
  mistMood: 8,
  mistHygiene: 5,
  nutrientOverAt: 3,
  boneOverAt: 2,
  boneRatios: { BONE_1: 0.08, BONE_2: 0.15, BONE_3: 0.3 },
  compostFertility: 3,
  compostNutritionMul: 0.7,
  compostCondition: 0.05,
  moldRubs: 3,
  petMood: 6,
  petAffection: 2,
  petRepeatMs: 60 * 60_000,
  petSleepMood: -2,
  talkAffectionCooldownMs: 30 * 60_000,
  talkAffectionExtra: 2,
  snackMood: 20,
  snackAffection: 5,
  snackCooldownMs: 2 * 60 * 60_000,
  pruneHygiene: 5,
  pruneGrowth: 0.03,
  pruneWrongMood: -10,
  musicTickMs: 10 * 60_000,
  musicMood: 2,
  musicDislike: -1,
  repotPerfectMs: 15_000,
  harvestSeedChance: 0.05,
  pollenPerDay: [1, 5] as const,
} as const;

/** 행복(기분 90 이상 1시간 유지)과 반겨 주기 */
export const HAPPY = { mood: 90, holdMs: 60 * 60_000 } as const;

/** 야외 · 날씨 · 계절 (1-2) */
export const WEATHER = {
  rainbowAfterRain: 0.1,
  daylight: [6, 20] as const,
} as const;

/** 돌봄 행동 18종 (5절) */
export const CARE_ACTIONS = [
  'WATER',
  'MIST',
  'NUTRIENT',
  'BONE',
  'COMPOST',
  'SCRUB',
  'PEST',
  'PRUNE',
  'SHAPE',
  'REPOT',
  'STAKE',
  'PET',
  'TALK',
  'MUSIC',
  'LIGHT',
  'TEMP',
  'SNACK',
  'HARVEST',
] as const;
export type CareAction = (typeof CARE_ACTIONS)[number];

/** 해금 정원사 레벨 (5절 표의 '도구 · 해금' 열) */
export const CARE_UNLOCK: Record<CareAction, number> = {
  WATER: 1,
  MIST: 2,
  NUTRIENT: 1,
  BONE: 4,
  COMPOST: 4,
  SCRUB: 2,
  PEST: 3,
  PRUNE: 6,
  SHAPE: 6,
  REPOT: 4,
  STAKE: 4,
  PET: 2,
  TALK: 3,
  MUSIC: 6,
  LIGHT: 3,
  TEMP: 6,
  SNACK: 5,
  HARVEST: 5,
};

/** 개화 식물 꽃가루 생산(하루, 03문서 3절): 그늘 · 이슬 1 · 햇살 · 노을 2 · 달빛 · 별빛 3 · 오로라 4 · 태초 5 */
export const POLLEN_BY_GRADE: Record<GradeId, number> = {
  SHADE: 1,
  DEW: 1,
  SUN: 2,
  DUSK: 2,
  MOON: 3,
  STAR: 3,
  AURORA: 4,
  ORIGIN: 5,
};
/** 각성에 필요한 각성 앰플 수(03문서 3절) */
export const AWAKEN_COST: Record<GradeId, number> = {
  SHADE: 1,
  DEW: 1,
  SUN: 2,
  DUSK: 2,
  MOON: 3,
  STAR: 3,
  AURORA: 4,
  ORIGIN: 5,
};
export const HARVEST_COOLDOWN_MS = 20 * 3_600_000;
