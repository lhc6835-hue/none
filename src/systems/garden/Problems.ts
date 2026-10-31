// 문제 발생과 해소 (04문서 6절): 곰팡이 · 해충 · 시든 잎 · 과습 · 뿌리 썩음 · 영양 과다 · 곰팡이병
// 판정은 10분마다. 난수는 (식물 uid, 시각) 시드라 오프라인에서도 같은 결과가 나온다.

import type { Rng } from '../../core/Rng';
import type { PlantInstance, ProblemKind, ProblemState } from '../../core/schema';
import {
  HYGIENE_PER_MOLD,
  HYGIENE_PER_PEST,
  HYGIENE_PER_WITHER,
  PROBLEM_GRADE_MUL,
  PROBLEMS,
  WATER_OVER,
} from '../../data/care';
import { POTS } from '../../data/pots';
import { SOILS } from '../../data/soils';
import { TRAIT_BY_ID } from '../../data/traits';
import { ZONES } from '../../data/zones';
import type { PlantBase } from '../../data/plants';
import type { PlantEnv } from './Environment';
import { clampNeed } from './Needs';

export interface Neighborhood {
  /** 이웃 화분에 곰팡이가 있다 */
  infected: boolean;
  /** 이웃에 버섯 계열이 있다 */
  fungus: boolean;
}

export const problemsOf = (p: PlantInstance, kind: ProblemKind): ProblemState[] =>
  p.problems.filter((x) => x.kind === kind);
export const hasProblem = (p: PlantInstance, kind: ProblemKind): boolean =>
  p.problems.some((x) => x.kind === kind);

export function addProblem(p: PlantInstance, prob: ProblemState): void {
  p.problems.push(prob);
}

export function removeProblem(p: PlantInstance, prob: ProblemState): void {
  const i = p.problems.indexOf(prob);
  if (i >= 0) p.problems.splice(i, 1);
}

export function clearProblems(p: PlantInstance, kind: ProblemKind): number {
  const before = p.problems.length;
  p.problems = p.problems.filter((x) => x.kind !== kind);
  return before - p.problems.length;
}

const moldMulOfTraits = (p: PlantInstance): number =>
  p.traits.reduce((m, id) => m * (TRAIT_BY_ID.get(id)?.garden?.moldMul ?? 1), 1);

/**
 * 곰팡이 발생 확률(10분마다)
 * 4% × 습도(건조 0.5 · 보통 1 · 습함 2) × (청결<50 ? 1.5 : 1) × (과습 ? 2 : 1) × (이웃 감염 ? 2 : 1)
 *    × (이웃에 버섯 ? 0.3 : 1) × 등급 배율 — 버섯 계열은 곰팡이에 걸리지 않는다.
 */
export function moldChance(
  plant: PlantInstance,
  base: PlantBase,
  env: PlantEnv,
  nb: Neighborhood,
  now: number,
): number {
  if (base.family === 'FUNGUS') return 0;
  const zone = ZONES[plant.location.zone];
  const soil = SOILS[plant.soilId] ?? SOILS.BASIC;
  let p = PROBLEMS.moldBase * PROBLEMS.humidity[env.humidity];
  if (plant.needs.hygiene < 50) p *= 1.5;
  if (plant.needs.water > WATER_OVER) p *= 2;
  if (nb.infected) p *= 2;
  if (nb.fungus) p *= 0.3;
  p *= PROBLEM_GRADE_MUL[base.grade] * zone.moldMul * (soil.moldMul ?? 1) * moldMulOfTraits(plant);
  if (env.weather === 'RAIN') p *= 1.5; // 비 오는 날
  if ((plant.timers.moldBoostUntil ?? 0) > now) p *= 2; // 분무 과다 후 30분
  return Math.min(0.95, p);
}

/** 해충 발생 확률(10분마다): 3% × (야외 ? 2 : 1) × 계절 × 등급 배율 */
export function pestChance(plant: PlantInstance, base: PlantBase, env: PlantEnv): number {
  const pot = POTS[plant.potId] ?? POTS.CLAY;
  const zone = ZONES[plant.location.zone];
  const season = env.season === 'SUMMER' ? 1.3 : 1;
  return Math.min(
    0.95,
    PROBLEMS.pestBase *
      (env.outdoor ? 2 : 1) *
      season *
      PROBLEM_GRADE_MUL[base.grade] *
      (pot.pestMul ?? 1) *
      (zone.pestMul > 0 ? 1 : 0),
  );
}

export interface ProblemEvent {
  kind: ProblemKind;
}

/** 한 번의 10분 판정. 새로 생긴 문제를 돌려준다. */
export function rollProblems(
  plant: PlantInstance,
  base: PlantBase,
  env: PlantEnv,
  nb: Neighborhood,
  rng: Rng,
  now: number,
): ProblemEvent[] {
  const out: ProblemEvent[] = [];
  if (plant.stage < 1) return out; // 씨앗은 흙 속이라 곰팡이도 벌레도 없다(발아부터)
  // 곰팡이: 발아 이후, 최대 6개
  if (plant.stage >= 1 && problemsOf(plant, 'MOLD').length < PROBLEMS.moldMaxSpots) {
    if (rng.chance(moldChance(plant, base, env, nb, now))) {
      addProblem(plant, {
        kind: 'MOLD',
        since: now,
        x: rng.range(0.15, 0.85),
        y: rng.range(0.25, 0.9),
      });
      plant.needs.hygiene = clampNeed(plant.needs.hygiene - HYGIENE_PER_MOLD);
      out.push({ kind: 'MOLD' });
    }
  }
  // 해충: 어린 단계(새싹 이후)부터, 이미 있으면 더 늘지 않는다
  if (plant.stage >= 2 && !hasProblem(plant, 'PEST') && rng.chance(pestChance(plant, base, env))) {
    addProblem(plant, { kind: 'PEST', since: now, n: rng.int(PROBLEMS.pestMin, PROBLEMS.pestMax) });
    plant.needs.hygiene = clampNeed(plant.needs.hygiene - HYGIENE_PER_PEST);
    out.push({ kind: 'PEST' });
  }
  return out;
}

/** 단계가 오를 때 시든 잎 1–3장 */
export function spawnWithers(plant: PlantInstance, rng: Rng, now: number): number {
  const n = rng.int(PROBLEMS.witherPerStage[0], PROBLEMS.witherPerStage[1]);
  for (let i = 0; i < n; i++) {
    addProblem(plant, {
      kind: 'WITHER',
      since: now,
      x: rng.range(0.1, 0.9),
      y: rng.range(0.15, 0.7),
    });
    plant.needs.hygiene = clampNeed(plant.needs.hygiene - HYGIENE_PER_WITHER);
  }
  return n;
}

/** 시간이 흐르며 변하는 문제: 과습 → 뿌리 썩음, 곰팡이 방치 → 곰팡이병, 타이머 만료 */
export function tickProblems(plant: PlantInstance, now: number): ProblemEvent[] {
  const out: ProblemEvent[] = [];
  const t = plant.timers;
  // 과습: 수분 100 초과가 30분 지속 → 과습, 2시간 → 뿌리 썩음
  if (plant.needs.water > WATER_OVER) {
    t.overwaterSince ??= now;
    const held = now - t.overwaterSince;
    if (held >= PROBLEMS.overwaterMs && !hasProblem(plant, 'OVERWATER')) {
      addProblem(plant, { kind: 'OVERWATER', since: now });
      out.push({ kind: 'OVERWATER' });
    }
    if (held >= PROBLEMS.rootRotMs && !hasProblem(plant, 'ROOT_ROT')) {
      addProblem(plant, { kind: 'ROOT_ROT', since: now });
      out.push({ kind: 'ROOT_ROT' });
    }
  } else {
    delete t.overwaterSince;
    clearProblems(plant, 'OVERWATER');
  }
  // 곰팡이 2시간 방치 → 곰팡이병
  if (
    !hasProblem(plant, 'MOLD_DISEASE') &&
    problemsOf(plant, 'MOLD').some((m) => now - m.since >= PROBLEMS.moldDiseaseMs)
  ) {
    addProblem(plant, { kind: 'MOLD_DISEASE', since: now });
    out.push({ kind: 'MOLD_DISEASE' });
  }
  if ((t.excessUntil ?? 0) <= now) clearProblems(plant, 'EXCESS_NUTRIENT');
  if ((t.woundUntil ?? 0) <= now) clearProblems(plant, 'WOUND');
  return out;
}

/** 이웃 판정: 같은 구역에서 칸 번호가 1 차이 나는 화분 */
export function neighborhoodOf(
  plant: PlantInstance,
  all: readonly PlantInstance[],
  familyOf: (speciesId: string) => string | undefined,
): Neighborhood {
  const near = all.filter(
    (o) =>
      o.uid !== plant.uid &&
      o.location.zone === plant.location.zone &&
      Math.abs(o.location.slot - plant.location.slot) === 1,
  );
  return {
    infected: near.some((o) => hasProblem(o, 'MOLD')),
    fungus: near.some((o) => familyOf(o.speciesId) === 'FUNGUS'),
  };
}

/** 버섯 계열은 이웃 화분의 곰팡이를 먹어 줄여 준다(10분마다 한 개). 먹은 이웃 수를 돌려준다. */
export function fungusEatsMold(
  plant: PlantInstance,
  all: readonly PlantInstance[],
  familyOf: (speciesId: string) => string | undefined,
): number {
  if (familyOf(plant.speciesId) !== 'FUNGUS' || plant.stage < 1) return 0;
  for (const o of all) {
    if (o.uid === plant.uid) continue;
    if (
      o.location.zone !== plant.location.zone ||
      Math.abs(o.location.slot - plant.location.slot) !== 1
    )
      continue;
    const spot = problemsOf(o, 'MOLD')[0];
    if (spot) {
      removeProblem(o, spot);
      o.needs.hygiene = clampNeed(o.needs.hygiene + HYGIENE_PER_MOLD);
      plant.needs.mood = Math.min(100, plant.needs.mood + 2); // 먹보 버섯은 신남
      return 1;
    }
  }
  return 0;
}
