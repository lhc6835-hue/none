// 욕구 4종(수분 · 양분 · 청결 · 기분)과 컨디션 배율 (04문서 3 · 3-1 · 6절)

import type { PlantInstance } from '../../core/schema';
import {
  BATTLE_CONDITION,
  CONDITION,
  MOOD_LOW,
  NEED_DECAY_PER_HOUR,
  NEED_LOW,
  NEED_MAX,
  WATER_OVER,
  WATER_RANGE,
} from '../../data/care';
import { PERSONALITIES } from '../../data/personalities';
import { POTS } from '../../data/pots';
import { SOILS } from '../../data/soils';
import { TRAIT_BY_ID } from '../../data/traits';
import { ZONES } from '../../data/zones';
import { GRADES } from '../../data/grades';
import type { PlantBase } from '../../data/plants';
import type { PlantEnv } from './Environment';

export interface NeedRates {
  water: number;
  nutrition: number;
  mood: number;
}

const traitMul = (plant: PlantInstance, key: 'waterDecayMul' | 'nutritionDecayMul'): number =>
  plant.traits.reduce((m, id) => m * (TRAIT_BY_ID.get(id)?.garden?.[key] ?? 1), 1);

/** 시간당 욕구 감소량(양수). 성격 · 형질 · 구역 · 흙 · 화분 · 퇴비가 곱해진다. */
export function decayRates(plant: PlantInstance, _base: PlantBase): NeedRates {
  const zone = ZONES[plant.location.zone];
  if (zone.frozen) return { water: 0, nutrition: 0, mood: 0 };
  const age = plant.stage >= 4 ? 'mature' : 'young';
  const pers = PERSONALITIES[plant.personality].garden;
  const soil = SOILS[plant.soilId] ?? SOILS.BASIC;
  const pot = POTS[plant.potId] ?? POTS.CLAY;
  const all = pers.needsDecayMul ?? 1;
  const compost = plant.flags.compost ? 0.7 : 1;
  return {
    water:
      NEED_DECAY_PER_HOUR.water[age] *
      all *
      traitMul(plant, 'waterDecayMul') *
      zone.waterDecayMul *
      (soil.waterDecayMul ?? 1) *
      (pot.waterDecayMul ?? 1),
    nutrition:
      NEED_DECAY_PER_HOUR.nutrition[age] *
      all *
      (pers.nutritionDecayMul ?? 1) *
      traitMul(plant, 'nutritionDecayMul') *
      (soil.nutritionDecayMul ?? 1) *
      compost,
    mood: NEED_DECAY_PER_HOUR.mood[age] * all * (pers.moodDecayMul ?? 1) * (pot.moodDecayMul ?? 1),
  };
}

export const clampNeed = (v: number, floor = 0): number => Math.max(floor, Math.min(NEED_MAX, v));

/** dt 초 동안 욕구를 줄인다(양분 · 기분은 100 이하). floor: 오프라인에서는 20. */
export function applyDecay(plant: PlantInstance, rates: NeedRates, dtSec: number, floor = 0): void {
  const h = dtSec / 3600;
  const n = plant.needs;
  n.water = clampNeed(n.water - rates.water * h, floor);
  n.nutrition = Math.min(100, clampNeed(n.nutrition - rates.nutrition * h, floor));
  n.mood = Math.min(100, clampNeed(n.mood - rates.mood * h, floor));
}

export function waterRangeOf(base: PlantBase): readonly [number, number] {
  return WATER_RANGE[base.care.water];
}

/** 적정 구간 안인가 (수조 식물은 물주기가 필요 없어 항상 적정) */
export function waterInRange(base: PlantBase, water: number, widen = 1): boolean {
  if (base.care.aquatic) return true;
  const [lo, hi] = waterRangeOf(base);
  const mid = (lo + hi) / 2;
  const half = ((hi - lo) / 2) * widen;
  return water >= mid - half && water <= mid + half;
}

export interface ConditionPart {
  key: string;
  value: number;
}

export interface Condition {
  value: number;
  parts: ConditionPart[];
}

const TEMP_ORDER = ['COOL', 'MID', 'WARM'] as const;

/** 컨디션 = clamp(0.3, 1.5, 1.0 + 보정의 합) */
export function conditionOf(plant: PlantInstance, base: PlantBase, env: PlantEnv): Condition {
  const c = CONDITION;
  const n = plant.needs;
  const parts: ConditionPart[] = [];
  const add = (key: string, value: number) => value !== 0 && parts.push({ key, value });

  if (n.water < NEED_LOW) add('thirsty', c.water.thirsty);
  else if (n.water > WATER_OVER) add('overwatered', c.water.over);
  else if (waterInRange(base, n.water)) add('water', c.water.good);

  if (n.nutrition < NEED_LOW) add('hungry', c.nutrition.bad);
  else if (n.nutrition >= c.nutrition.highAt) add('nutrition', c.nutrition.good);

  if (n.hygiene < c.hygiene.lowAt) add('dirty', c.hygiene.bad);
  else if (n.hygiene >= c.hygiene.highAt) add('clean', c.hygiene.good);

  if (n.mood < MOOD_LOW) add('sulky', c.mood.bad);
  else if (n.mood >= c.mood.highAt) add('cheerful', c.mood.good);

  const rank = GRADES[base.grade].order;
  // 빛(햇살 등급 이상): 선호와 일치 +0.1 · 한 단계 차이 0 · 정반대(두 단계 차이) −0.2
  if (rank >= 3) {
    const diff = Math.abs(base.care.light - env.light);
    add('light', diff === 0 ? c.light.match : diff >= 2 ? c.light.opposite : 0);
  }
  // 온도(달빛 등급 이상): 일치 +0.05 · 불일치 −0.15
  if (rank >= 5) add('temp', env.temp === base.care.temp ? c.temp.match : c.temp.bad);

  if (plant.flags.happy) add('happy', c.happy);
  if (plant.flags.compost) add('compost', 0.05);

  const soil = SOILS[plant.soilId] ?? SOILS.BASIC;
  const fam = soil.familyBonus?.[base.family];
  if (fam) add('soil', fam);
  else if (soil.otherFamilyPenalty) add('soil', soil.otherFamilyPenalty);
  const pot = POTS[plant.potId] ?? POTS.CLAY;
  if (pot.familyBonus?.[base.family]) add('pot', pot.familyBonus[base.family] as number);

  const value = Math.max(c.min, Math.min(c.max, 1 + parts.reduce((s, p) => s + p.value, 0)));
  return { value, parts };
}

/** 출격 컨디션 → 전투 보정 단계(최상 · 좋음 · 보통 · 시무룩) */
export function battleConditionTier(cond: number): { key: string; mul: number } {
  for (const t of BATTLE_CONDITION) if (cond >= t.min) return t;
  return BATTLE_CONDITION[BATTLE_CONDITION.length - 1];
}

/** 욕구 · 환경에서 계산하는 겉모습 상태(저장하지 않는다) */
export type DerivedStatus =
  | 'THIRSTY'
  | 'OVERWATERED_NOW'
  | 'HUNGRY'
  | 'SULKY'
  | 'LEGGY'
  | 'LEAF_BURN'
  | 'TEMP_STRESS'
  | 'SLEEPING';

export function derivedStatuses(
  plant: PlantInstance,
  base: PlantBase,
  env: PlantEnv,
): DerivedStatus[] {
  const out: DerivedStatus[] = [];
  const n = plant.needs;
  if (!base.care.aquatic && n.water < NEED_LOW) out.push('THIRSTY');
  if (n.water > WATER_OVER) out.push('OVERWATERED_NOW');
  if (n.nutrition < NEED_LOW) out.push('HUNGRY');
  if (n.mood < MOOD_LOW) out.push('SULKY');
  if (env.light <= base.care.light - 2) out.push('LEGGY');
  if (env.light >= base.care.light + 2) out.push('LEAF_BURN');
  if (GRADES[base.grade].order >= 5 && env.temp !== base.care.temp) {
    out.push('TEMP_STRESS');
  }
  if (isSleeping(plant, base, env)) out.push('SLEEPING');
  return out;
}

/** 밤에 주행성 식물은 잠들고, 낮에 야행성 식물은 잠든다. 잠꾸러기는 한 시간 늦게 깬다(여기서는 단순화). */
export function isSleeping(plant: PlantInstance, base: PlantBase, env: PlantEnv): boolean {
  if (plant.stage < 1) return false;
  const nightPlant = base.care.active === 'NIGHT';
  return nightPlant ? !env.night : env.night;
}

export { TEMP_ORDER };
