// 정원: 식물 만들기 · 심기 · 매 틱 돌리기 (04문서). 로직만 있고 Phaser 를 모른다.
// 한 틱 = 욕구 감소 → 비 자동 물주기 · 음악 → 10분 판정(곰팡이 · 해충) → 병 진행 → 성장.

import { makeRng } from '../../core/Rng';
import type { EventBus } from '../../core/EventBus';
import type { GameEvents } from '../../core/events';
import type { GameState } from '../../core/GameState';
import type { PlantInstance, ZoneId } from '../../core/schema';
import { AFFECTION, HAPPY, PROBLEMS, QUALITY, CARE } from '../../data/care';
import { PLANT_BASE_BY_ID, type PlantBase } from '../../data/plants';
import { POTS } from '../../data/pots';
import { ZONES } from '../../data/zones';
import { takeItem, seedKey } from '../economy/Inventory';
import { envFor, type PlantEnv, type WorldSnapshot } from './Environment';
import { advanceGrowth } from './Growth';
import { neglectPenalty } from './Affection';
import { applyDecay, conditionOf, clampNeed, decayRates, waterRangeOf } from './Needs';
import { fungusEatsMold, neighborhoodOf, rollProblems, tickProblems } from './Problems';
import { recordCondition } from './Quality';

type Emitter = Pick<EventBus<GameEvents>, 'emit'>;

export function baseOf(speciesId: string): PlantBase {
  const b = PLANT_BASE_BY_ID.get(speciesId);
  if (!b) throw new Error(`없는 식물 종: ${speciesId}`);
  return b;
}

export const familyOf = (speciesId: string): string | undefined =>
  PLANT_BASE_BY_ID.get(speciesId)?.family;

export function createPlant(
  state: GameState,
  speciesId: string,
  zone: ZoneId,
  slot: number,
  now: number,
  opts: { potId?: string; soilId?: string } = {},
): PlantInstance {
  const uid = `u${state.garden.nextUid++}`;
  baseOf(speciesId); // 존재 확인
  return {
    uid,
    speciesId,
    nickname: '',
    stage: 0,
    gp: 0,
    needs: { water: 55, nutrition: 60, hygiene: 100, mood: 70 },
    problems: [],
    personality: 'LAID_BACK', // 새싹 단계에서 실제 성격이 정해진다(Growth.onStageUp)
    affection: 0,
    affectionToday: 0,
    qualityLog: { sum: 0, count: 0, perfect: 0, actions: 0 },
    traits: [],
    reservedTraits: [],
    variant: false,
    level: 1,
    exp: 0,
    awakened: false,
    potId: opts.potId ?? 'CLAY',
    soilId: opts.soilId ?? 'BASIC',
    soilFertility: 0,
    location: { zone, slot },
    diary: [{ at: now, kind: 'planted' }],
    flags: {},
    timers: {},
    stageDoses: { nutrient: 0, bone: 0 },
    mistLog: [],
    lastCare: {},
    affectionDay: '',
    plantedAt: now,
    lastUpdated: now,
  };
}

export const plantsIn = (state: GameState, zone: ZoneId): PlantInstance[] =>
  state.plants.filter((p) => p.location.zone === zone);

export const plantByUid = (state: GameState, uid: string): PlantInstance | undefined =>
  state.plants.find((p) => p.uid === uid);

export function openSlots(state: GameState, zone: ZoneId): number {
  return state.garden.slotsOpen[zone] ?? ZONES[zone].initialSlots;
}

export function isZoneUnlocked(state: GameState, zone: ZoneId): boolean {
  const z = ZONES[zone];
  if (z.unlockFlag) return state.flags[z.unlockFlag] === true;
  return state.player.level >= z.unlockLevel;
}

/** 빈 칸 번호(없으면 null). 수조 구역은 수생 식물만(호출하는 쪽이 aquatic 을 확인한다). */
export function freeSlot(state: GameState, zone: ZoneId): number | null {
  if (!isZoneUnlocked(state, zone)) return null;
  const used = new Set(plantsIn(state, zone).map((p) => p.location.slot));
  for (let i = 0; i < openSlots(state, zone); i++) if (!used.has(i)) return i;
  return null;
}

export type PlantResult =
  | { ok: true; plant: PlantInstance }
  | { ok: false; reason: 'noSeed' | 'noSlot' | 'locked' | 'aquatic' };

/** 씨앗을 가방에서 꺼내 화분에 심는다 */
export function plantSeed(
  state: GameState,
  speciesId: string,
  zone: ZoneId,
  slot: number | null,
  now: number,
  bus: Emitter,
  opts: { potId?: string; soilId?: string } = {},
): PlantResult {
  if (!isZoneUnlocked(state, zone)) return { ok: false, reason: 'locked' };
  const base = baseOf(speciesId);
  if (ZONES[zone].aquaticOnly && !base.care.aquatic) return { ok: false, reason: 'aquatic' };
  const at = slot ?? freeSlot(state, zone);
  if (
    at === null ||
    plantsIn(state, zone).some((p) => p.location.slot === at) ||
    at >= openSlots(state, zone)
  ) {
    return { ok: false, reason: 'noSlot' };
  }
  if (!takeItem(state, seedKey(speciesId))) return { ok: false, reason: 'noSeed' };
  const plant = createPlant(state, speciesId, zone, at, now, opts);
  state.plants.push(plant);
  bus.emit('plant:planted', { uid: plant.uid });
  return { ok: true, plant };
}

export function plantEnv(state: GameState, plant: PlantInstance, world: WorldSnapshot): PlantEnv {
  const pot = POTS[plant.potId] ?? POTS.CLAY;
  return envFor(plant.location.zone, world, state.garden, {
    tempStep: pot.tempStep,
    humidityStep: pot.humidityStep,
  });
}

/** 한 식물을 dt 초 진행한다(라이브 틱). 10분 판정 · 병 진행 · 성장 · 음악 · 행복까지 모두 여기서. */
export function stepPlant(
  state: GameState,
  plant: PlantInstance,
  dtSec: number,
  now: number,
  world: WorldSnapshot,
  bus: Emitter,
): void {
  const zone = ZONES[plant.location.zone];
  if (zone.frozen) {
    plant.lastUpdated = now;
    return;
  }
  const base = baseOf(plant.speciesId);
  const env = plantEnv(state, plant, world);

  // 욕구 감소
  applyDecay(plant, decayRates(plant, base), dtSec);
  if (base.care.aquatic) plant.needs.water = 60; // 수조 식물은 물주기가 필요 없다(물 갈기는 M4)
  // 야외 화단: 비 오면 자동 물주기
  if (env.outdoor && env.weather === 'RAIN') {
    const mid = (waterRangeOf(base)[0] + waterRangeOf(base)[1]) / 2;
    // 비가 오는 동안 시간당 120씩 올라 적정 구간 가운데에서 멈춘다(넘치게 주지는 않는다)
    if (plant.needs.water < mid) {
      plant.needs.water = Math.min(mid, plant.needs.water + (120 * dtSec) / 3600);
    }
  }

  // 음악: 10분마다 기분 +2(좋아하는 장르) · -1(싫어함). 취향이 없는 종은 +1.
  if (env.music && plant.stage >= 1) {
    const slot = Math.floor(now / CARE.musicTickMs);
    if (slot !== plant.timers.musicSlot) {
      plant.timers.musicSlot = slot;
      const liked = base.care.music;
      const delta = liked ? (liked === env.music ? CARE.musicMood : CARE.musicDislike) : 1;
      plant.needs.mood = clampNeed(plant.needs.mood + delta);
    }
  }

  // 품질 기록: 1분마다 컨디션
  const cond = conditionOf(plant, base, env).value;
  plant.timers.sampleAcc = (plant.timers.sampleAcc ?? 0) + dtSec * 1000;
  while (plant.timers.sampleAcc >= QUALITY.sampleMs) {
    plant.timers.sampleAcc -= QUALITY.sampleMs;
    if (plant.stage < 5) recordCondition(plant, cond);
  }

  // 10분 판정
  const bucket = Math.floor(now / PROBLEMS.rollMs);
  const last = plant.timers.rollBucket ?? bucket;
  if (bucket > last) {
    const nb = neighborhoodOf(plant, state.plants, familyOf);
    for (let b = last + 1; b <= bucket && b <= last + 6; b++) {
      const rng = makeRng('garden', plant.uid, b);
      for (const ev of rollProblems(plant, base, env, nb, rng, now))
        bus.emit('plant:problem', { uid: plant.uid, kind: ev.kind });
      fungusEatsMold(plant, state.plants, familyOf);
    }
  }
  plant.timers.rollBucket = bucket;

  for (const ev of tickProblems(plant, now))
    bus.emit('plant:problem', { uid: plant.uid, kind: ev.kind });
  advanceGrowth(plant, base, env, dtSec, now, bus);

  // 행복: 기분 90 이상이 1시간 지속되면 컨디션 +0.05
  if (plant.needs.mood >= HAPPY.mood) {
    plant.timers.happySince ??= now;
    plant.flags.happy = now - plant.timers.happySince >= HAPPY.holdMs;
  } else {
    delete plant.timers.happySince;
    plant.flags.happy = false;
  }

  // 방치: 7일 이상 돌보지 않으면 하루 -5(♡ 단계는 유지). 하루에 한 번만 깎는다.
  const lastCared = Math.max(0, ...Object.values(plant.lastCare), plant.plantedAt);
  const idleDays = Math.floor((now - lastCared) / 86_400_000);
  if (idleDays >= AFFECTION.neglectDays && plant.timers.neglectDay !== idleDays) {
    plant.timers.neglectDay = idleDays;
    neglectPenalty(plant, idleDays);
  }
  plant.lastUpdated = now;
}

/** 모든 식물을 dt 초 진행한다 */
export function tickGarden(
  state: GameState,
  dtSec: number,
  now: number,
  world: WorldSnapshot,
  bus: Emitter,
): void {
  for (const plant of state.plants) stepPlant(state, plant, dtSec, now, world, bus);
  state.garden.lastTickAt = now;
}
