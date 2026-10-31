// 성장 (04문서 2절): GP · 단계 · 개화. 컨디션이 속도를 정하고, 뿌리 꽉 참 · 쓰러짐 · 병이 단계 진행을 막는다.

import type { EventBus } from '../../core/EventBus';
import type { GameEvents } from '../../core/events';
import type { GrowthStage, PlantInstance } from '../../core/schema';
import { GROWTH, STAGE_RATIO, totalGpOf } from '../../data/care';
import { PERSONALITIES } from '../../data/personalities';
import { TRAIT_BY_ID } from '../../data/traits';
import type { PlantBase } from '../../data/plants';
import type { PlantEnv } from './Environment';
import { conditionOf } from './Needs';
import { rollPersonality } from './Personality';
import { addProblem, clearProblems, hasProblem, spawnWithers } from './Problems';
import { finalStars } from './Quality';
import { rollTraits, traitSlots } from './Traits';
import { makeRng } from '../../core/Rng';

type Emitter = Pick<EventBus<GameEvents>, 'emit'>;

export const totalGp = (base: PlantBase): number => totalGpOf(base.grade);

/** 단계 s 에 들어가는 누적 GP */
export const thresholdGp = (base: PlantBase, stage: number): number =>
  Math.round(STAGE_RATIO[Math.min(5, Math.max(0, stage))] * totalGp(base));

export function stageForGp(base: PlantBase, gp: number): GrowthStage {
  let s = 0;
  for (let i = 1; i <= 5; i++) if (gp >= thresholdGp(base, i)) s = i;
  return s as GrowthStage;
}

/** 이 단계의 진행도 0–1 (다음 단계까지) */
export function stageProgress(base: PlantBase, plant: PlantInstance): number {
  if (plant.stage >= 5) return 1;
  const lo = thresholdGp(base, plant.stage);
  const hi = thresholdGp(base, plant.stage + 1);
  return Math.max(0, Math.min(1, (plant.gp - lo) / Math.max(1, hi - lo)));
}

/** 낮/밤 · 계절 · 성격 · 형질이 곱해지는 환경 배율 */
function environmentMultiplier(plant: PlantInstance, base: PlantBase, env: PlantEnv): number {
  let m = 1;
  const active = base.care.active;
  if (env.night) m *= GROWTH.nightMultiplier[active === 'NIGHT' ? 'NIGHT' : 'DAY'] ?? 1;
  else if (active === 'NIGHT') m *= 0.8; // 낮에는 야행성이 잠든다
  if (env.night) m *= PERSONALITIES[plant.personality].garden.nightGpMul ?? 1;
  if (env.season === 'SPRING' && base.family === 'BLOOM') m *= GROWTH.seasonSpring;
  if (env.season === 'WINTER' && base.family === 'FROST') m *= GROWTH.seasonSpring;
  for (const id of plant.traits) m *= TRAIT_BY_ID.get(id)?.garden?.gpMul ?? 1;
  return m;
}

/** 초당 GP: 1 × 컨디션 × 생기 버프 × 쑥쑥 × 환경 … 병이면 0 */
export function growthRate(
  plant: PlantInstance,
  base: PlantBase,
  env: PlantEnv,
  now: number,
): number {
  if (plant.stage >= 5) return 0;
  if (hasProblem(plant, 'ROOT_ROT') || hasProblem(plant, 'MOLD_DISEASE')) return 0;
  let rate =
    GROWTH.gpPerSecond *
    conditionOf(plant, base, env).value *
    environmentMultiplier(plant, base, env);
  if ((plant.timers.vitality ?? 0) > now) rate *= GROWTH.vitalityMultiplier;
  if ((plant.timers.growBoost ?? 0) > now) rate *= GROWTH.growBoostMultiplier;
  if (hasProblem(plant, 'EXCESS_NUTRIENT')) rate *= GROWTH.excessMultiplier;
  if (hasProblem(plant, 'TOPPLED')) rate *= GROWTH.toppledMultiplier;
  return rate;
}

/** 이 상태에서 GP 가 올라갈 수 있는 상한(뿌리 꽉 참 · 지지대 없음이 단계 진입 직전에 멈춘다) */
export function gpCap(plant: PlantInstance, base: PlantBase): number {
  let cap = totalGp(base);
  if (plant.stage >= 5) return cap;
  // 분갈이 관문: 2→3 · 4→5 단계는 분갈이를 해야 넘어간다. 하지 않으면 다음 단계의 99%에서 멈춘다.
  if (needsRepot(plant))
    cap = Math.min(cap, Math.round(thresholdGp(base, plant.stage + 1) * GROWTH.rootboundHold));
  // 지지대가 필요한 종은 지지대 없이 성숙 단계(4)로 갈 수 없다
  if (base.care.needsStake && !plant.flags.staked && plant.stage >= GROWTH.stakeStage) {
    cap = Math.min(
      cap,
      Math.round(thresholdGp(base, GROWTH.stakeStage + 1) * GROWTH.rootboundHold),
    );
  }
  return cap;
}

/** 이 단계에서 아직 분갈이를 하지 않았고, 분갈이가 필요한 단계(2 · 4)인가 */
export function needsRepot(plant: PlantInstance): boolean {
  return (
    (GROWTH.rootboundStops as readonly number[]).includes(plant.stage) &&
    !plant.flags[`repotted${plant.stage}`]
  );
}

function diary(
  plant: PlantInstance,
  now: number,
  kind: string,
  extra: Record<string, unknown> = {},
): void {
  plant.diary.push({ at: now, kind, ...extra });
  if (plant.diary.length > 50) plant.diary.splice(0, plant.diary.length - 50); // 최근 50개만(12문서 6절)
}

/** 단계가 올랐을 때의 처리: 시든 잎 · 성격 · 눈뜨기 · 개화 */
function onStageUp(
  plant: PlantInstance,
  base: PlantBase,
  from: number,
  to: number,
  now: number,
  bus: Emitter,
): void {
  plant.stageDoses = { nutrient: 0, bone: 0 };
  plant.flags.compost = false;
  clearProblems(plant, 'ROOTBOUND');
  const rng = makeRng('garden', plant.uid, `stage${to}`, now);
  if (to >= 1 && to <= 4) spawnWithers(plant, rng, now);
  if (to === 2 && !plant.flags.personalityRolled) {
    plant.personality = rollPersonality(makeRng('garden', plant.uid, 'personality'));
    plant.flags.personalityRolled = true;
  }
  if (
    base.care.needsStake &&
    !plant.flags.staked &&
    to === GROWTH.stakeStage &&
    !hasProblem(plant, 'TOPPLED')
  ) {
    addProblem(plant, { kind: 'TOPPLED', since: now });
  }
  bus.emit('plant:stageUp', { uid: plant.uid, from, to });
  if (to === 2 && !plant.flags.eyesOpened) {
    plant.flags.eyesOpened = true; // 한 번만
    plant.flags.needsName = true; // 이름을 짓기 전까지 허브가 처음 눈뜨기 연출을 기다린다
    diary(plant, now, 'eyesOpen');
    bus.emit('plant:eyesOpen', { uid: plant.uid });
  }
  if (to === 5) finalizeBloom(plant, base, now, bus);
}

/** 개화: 자질(★)과 형질을 확정한다. 이 순간 한 번만. */
export function finalizeBloom(
  plant: PlantInstance,
  base: PlantBase,
  now: number,
  bus: Emitter,
): void {
  const rng = makeRng('garden', plant.uid, 'bloom');
  const stars = finalStars(plant, rng, plant.flags.starAmpoule === true);
  plant.quality = stars;
  plant.traits = rollTraits(rng, traitSlots(base.grade, stars), plant.reservedTraits);
  // 색변이: 1/64 (반짝 영양제 1/32)
  const chance = (plant.flags.sparkle ? 1 / 32 : 1 / 64) * (plant.timers.rainbowDay ? 1.5 : 1);
  plant.variant = rng.chance(chance);
  diary(plant, now, 'bloom', { stars });
  bus.emit('plant:bloom', {
    uid: plant.uid,
    quality: stars,
    traits: plant.traits,
    variant: plant.variant,
  });
}

/**
 * GP 를 더한다(자연 성장 · 뼛가루 · 가지치기). 상한(gpCap)을 넘지 않고, 단계가 오르면 처리를 이어서 한다.
 * 한 번에 여러 단계를 건너뛸 수도 있다(오프라인 · 뼛가루).
 */
export function addGp(
  plant: PlantInstance,
  base: PlantBase,
  amount: number,
  now: number,
  bus: Emitter,
): void {
  if (amount === 0) return;
  const floor = thresholdGp(base, plant.stage);
  plant.gp = Math.max(floor, Math.min(gpCap(plant, base), plant.gp + amount));
  while (plant.stage < 5) {
    const next = thresholdGp(base, plant.stage + 1);
    // 뿌리 꽉 참: 분갈이가 필요한 단계에서 다음 단계의 90% 에 닿으면 화분 바닥으로 뿌리가 삐져나온다
    if (needsRepot(plant) && plant.gp >= next * 0.9 && !hasProblem(plant, 'ROOTBOUND')) {
      addProblem(plant, { kind: 'ROOTBOUND', since: now });
      bus.emit('plant:problem', { uid: plant.uid, kind: 'ROOTBOUND' });
    }
    if (plant.gp < next) break;
    const from = plant.stage;
    plant.stage = (plant.stage + 1) as GrowthStage;
    onStageUp(plant, base, from, plant.stage, now, bus);
    // 새 단계의 상한(분갈이 · 지지대)을 다시 적용한다
    plant.gp = Math.min(plant.gp, gpCap(plant, base));
  }
  if (plant.stage >= 5) plant.gp = totalGp(base);
}

/** dt 초 동안 자연 성장(+ 해충이 갉아 먹는 GP 감소) */
export function advanceGrowth(
  plant: PlantInstance,
  base: PlantBase,
  env: PlantEnv,
  dtSec: number,
  now: number,
  bus: Emitter,
): void {
  if (plant.stage >= 5) return;
  const gain = growthRate(plant, base, env, now) * dtSec;
  addGp(plant, base, gain, now, bus);
  // 벌레: 20초마다 이 단계 GP 의 1% 를 갉아 먹는다(단계 시작점 아래로는 내려가지 않는다)
  if (hasProblem(plant, 'PEST') && plant.stage < 5) {
    const span = thresholdGp(base, plant.stage + 1) - thresholdGp(base, plant.stage);
    const loss = (GROWTH.pestPenaltyPer20s * span * dtSec) / 20;
    plant.gp = Math.max(thresholdGp(base, plant.stage), plant.gp - loss);
  }
}
