// 돌봄 행동 1/2 — 도구로 하는 일 (04문서 5절 #1–#11)

import { CARE, GROWTH, NEED_MAX, PROBLEMS, AWAKEN_COST } from '../../data/care';
import { BONES, FAVORITE_ITEM, NUTRIENTS } from '../../data/items';
import { PERSONALITIES } from '../../data/personalities';
import { addItem, countOf, potKey, takeItem } from '../economy/Inventory';
import { affectionLevel } from './Affection';
import { addGp, thresholdGp, totalGp } from './Growth';
import { clampNeed, waterInRange } from './Needs';
import { addProblem, clearProblems, hasProblem, problemsOf, removeProblem } from './Problems';
import { rollTrait } from './Traits';
import { fail, finishCare, gate, perfectWindow, type CareCtx, type CareResult } from './Care';
import type { ProblemState } from '../../core/schema';

const ok = (r: Partial<CareResult> & Pick<CareResult, 'reaction'>): CareResult => ({
  ok: true,
  perfect: false,
  sfx: null,
  ...r,
});

/** 1. 물주기 — 누르고 있으면 수분이 초당 25 오른다. 손을 뗄 때 적정 구간 안이면 완벽. level = 뗀 순간의 수분 */
export function water(ctx: CareCtx, level: number): CareResult {
  const blocked = gate(ctx, 'WATER');
  if (blocked) return blocked;
  const { plant, base, state, now } = ctx;
  if (base.care.aquatic) return fail('notNeeded');
  const after = Math.max(plant.needs.water, Math.min(NEED_MAX, level));
  const overflow = after > 100;
  plant.needs.water = after;
  const perfect = !overflow && waterInRange(base, after, perfectWindow(state, 'WATER'));
  if (overflow) {
    plant.timers.overwaterCount = (plant.timers.overwaterCount ?? 0) + 1; // 흘러넘침: 과습 카운트 +1
    finishCare(ctx, 'WATER', false);
    return ok({ reaction: 'surprise', sfx: 'ui_error', info: { overflow: true } });
  }
  if (perfect) {
    plant.needs.mood = clampNeed(plant.needs.mood + CARE.waterPerfectMood);
    plant.timers.vitality = now + 10 * 60_000; // 생기 버프 10분
    state.player.notes += 1; // 관찰 노트 +1
  }
  const gained = finishCare(ctx, 'WATER', perfect);
  return ok({
    perfect,
    reaction: perfect ? 'happy' : 'gulp',
    sfx: perfect ? 'perfect' : 'gulp',
    info: { affection: gained },
  });
}

/** 2. 분무 — 연타 3–5회. 습함을 좋아하는 종이면 완벽. 1분에 8회를 넘기면 30분간 곰팡이 확률 ↑ */
export function mist(ctx: CareCtx, taps: number): CareResult {
  const blocked = gate(ctx, 'MIST');
  if (blocked) return blocked;
  if (taps < 3) return fail('tooFewTaps');
  const { plant, base, env, now } = ctx;
  plant.needs.mood = clampNeed(plant.needs.mood + CARE.mistMood);
  plant.needs.hygiene = clampNeed(plant.needs.hygiene + CARE.mistHygiene);
  plant.mistLog = plant.mistLog.filter((t) => now - t < 60_000);
  for (let i = 0; i < Math.min(taps, 5); i++) plant.mistLog.push(now);
  if (plant.mistLog.length > PROBLEMS.mistLimitPerMinute)
    plant.timers.moldBoostUntil = now + PROBLEMS.mistMoldMs;
  const perfect = base.care.water === 'HIGH' || env.humidity === 'WET';
  finishCare(ctx, 'MIST', perfect);
  return ok({
    perfect,
    reaction: 'ticklish',
    sfx: 'mist',
    info: { overMist: plant.mistLog.length > PROBLEMS.mistLimitPerMinute },
  });
}

/** 3. 영양제 — 좋아하는 영양제면 효과 ×1.5. 한 단계에서 3개를 넘기면 영양 과다(앰플류는 세지 않음) */
export function nutrient(ctx: CareCtx, itemId: string): CareResult {
  const blocked = gate(ctx, 'NUTRIENT');
  if (blocked) return blocked;
  const def = NUTRIENTS[itemId];
  if (!def) return fail('noItem');
  const { plant, base, state, now } = ctx;
  if (countOf(state, itemId) < 1) return fail('noItem');

  const fav = FAVORITE_ITEM[base.care.favoriteNutrient] === itemId;
  const glutton = PERSONALITIES[plant.personality].garden.nutrientMul ?? 1;
  const mul = (fav ? 1.5 : 1) * glutton;

  switch (itemId) {
    case 'GREEN':
      plant.needs.nutrition = clampNeed(plant.needs.nutrition + 40 * mul);
      break;
    case 'GROW':
      plant.timers.growBoost =
        Math.max(now, plant.timers.growBoost ?? 0) + GROWTH.growBoostMs * mul;
      break;
    case 'STRONG':
      plant.exp += Math.round(200 * mul);
      break;
    case 'SWEET':
      plant.needs.mood = clampNeed(plant.needs.mood + 30 * mul);
      break;
    case 'CLEAR': {
      const cured =
        clearProblems(plant, 'EXCESS_NUTRIENT') +
        clearProblems(plant, 'MOLD_DISEASE') +
        clearProblems(plant, 'ROOT_ROT');
      if (cured === 0) return fail('notNeeded');
      delete plant.timers.excessUntil;
      break;
    }
    case 'VITAL':
      plant.flags.vital = true; // 다음 출격 컨디션을 '최상'으로 고정
      break;
    case 'SPARKLE':
      if (plant.stage >= 5) return fail('wrongStage');
      plant.flags.sparkle = true; // 개화 때 색변이 확률 ×2
      break;
    case 'RAINBOW': {
      if (plant.stage < 5 || plant.traits.length === 0) return fail('wrongStage');
      const slot = ctx.rng.int(0, plant.traits.length - 1);
      plant.traits[slot] = rollTrait(ctx.rng, plant.traits);
      break;
    }
    case 'STAR_AMPOULE':
      if (plant.stage !== 4) return fail('wrongStage');
      plant.flags.starAmpoule = true;
      break;
    case 'AWAKEN_AMPOULE': {
      const need = AWAKEN_COST[base.grade];
      if (plant.stage < 5 || plant.awakened || affectionLevel(plant.affection) < 10)
        return fail('wrongStage');
      if (countOf(state, itemId) < need) return fail('noItem');
      takeItem(state, itemId, need - 1); // 아래에서 1개를 더 쓴다
      plant.awakened = true;
      break;
    }
  }
  takeItem(state, itemId);
  if (!def.ampoule) {
    plant.stageDoses.nutrient += 1;
    if (plant.stageDoses.nutrient > CARE.nutrientOverAt && !hasProblem(plant, 'EXCESS_NUTRIENT')) {
      addProblem(plant, { kind: 'EXCESS_NUTRIENT', since: now });
      plant.timers.excessUntil = now + GROWTH.excessMs;
    }
  }
  if (fav) {
    plant.flags.favoriteKnown = true;
    state.flags[`codex.favorite.${plant.speciesId}`] = true; // 도감에 '좋아하는 영양제' 기록
  }
  finishCare(ctx, 'NUTRIENT', false, itemId === 'SWEET' ? 3 : 0);
  return ok({
    reaction: fav ? 'excited' : 'gulp',
    sfx: fav ? 'perfect' : 'gulp',
    info: { favorite: fav, over: hasProblem(plant, 'EXCESS_NUTRIENT') },
  });
}

/** 4. 뼛가루 — 화분 위에서 좌우로 3번 흔들기. 정확히 3번이면 완벽. 총 GP 의 8/15/30% 즉시 */
export function boneMeal(ctx: CareCtx, itemId: string, shakes: number): CareResult {
  const blocked = gate(ctx, 'BONE');
  if (blocked) return blocked;
  const def = BONES[itemId];
  if (!def) return fail('noItem');
  const { plant, base, state, now, bus } = ctx;
  if (plant.stage >= 5) return fail('wrongStage');
  if (!takeItem(state, itemId)) return fail('noItem');
  const perfect = shakes === 3;
  addGp(plant, base, totalGp(base) * def.ratio, now, bus);
  plant.stageDoses.bone += 1;
  if (plant.stageDoses.bone > CARE.boneOverAt && !hasProblem(plant, 'EXCESS_NUTRIENT')) {
    addProblem(plant, { kind: 'EXCESS_NUTRIENT', since: now }); // 잎 끝이 갈색
    plant.timers.excessUntil = now + GROWTH.excessMs;
  }
  finishCare(ctx, 'BONE', perfect);
  return ok({ perfect, reaction: 'happy', sfx: 'bone_shake', info: { ratio: def.ratio } });
}

/** 5. 퇴비 섞기 — 흙에 끌어 놓고 원을 그리며 섞기(2바퀴). 비옥도 +1(최대 3), 단계가 오를 때까지 양분 감소 −30% */
export function compost(ctx: CareCtx, laps: number): CareResult {
  const blocked = gate(ctx, 'COMPOST');
  if (blocked) return blocked;
  if (laps < 2) return fail('tooShort');
  const { plant, state } = ctx;
  if (!takeItem(state, 'COMPOST')) return fail('noItem');
  plant.soilFertility = Math.min(CARE.compostFertility, plant.soilFertility + 1) as 0 | 1 | 2 | 3;
  plant.flags.compost = true;
  finishCare(ctx, 'COMPOST', true);
  return ok({
    perfect: true,
    reaction: 'happy',
    sfx: 'dig',
    info: { fertility: plant.soilFertility },
  });
}

/** 6. 곰팡이 닦기 — 점 위를 3번 왕복(솔 Lv 에 따라 2 · 1번). 생긴 지 10분 안이면 '초기 대응' */
export function scrubMold(
  ctx: CareCtx,
  spot: ProblemState,
  rubs: number,
  rubsNeeded: number = CARE.moldRubs,
): CareResult {
  const blocked = gate(ctx, 'SCRUB');
  if (blocked) return blocked;
  const { plant, now } = ctx;
  if (!plant.problems.includes(spot) || spot.kind !== 'MOLD') return fail('noTarget');
  if (rubs < rubsNeeded) return fail('tooShort');
  removeProblem(plant, spot);
  plant.needs.hygiene = clampNeed(plant.needs.hygiene + 10);
  const perfect = now - spot.since < PROBLEMS.moldEarlyMs;
  finishCare(ctx, 'SCRUB', perfect);
  return ok({
    perfect,
    reaction: 'ticklish',
    sfx: 'mold_pop',
    info: { left: problemsOf(plant, 'MOLD').length },
  });
}

/** 7. 벌레 잡기 — 기어다니는 벌레를 하나씩 탭. 놓치지 않고 잡으면 완벽, 벌레 병 획득(간식 재료) */
export function catchPest(ctx: CareCtx, caught: number, missed: number): CareResult {
  const blocked = gate(ctx, 'PEST');
  if (blocked) return blocked;
  const { plant, state } = ctx;
  const pest = problemsOf(plant, 'PEST')[0];
  if (!pest) return fail('notNeeded');
  const n = Math.min(caught, pest.n ?? 0);
  if (n <= 0) return fail('noTarget');
  pest.n = (pest.n ?? 0) - n;
  addItem(state, 'BUG_JAR', n);
  plant.needs.hygiene = clampNeed(plant.needs.hygiene + n);
  if ((pest.n ?? 0) <= 0) {
    removeProblem(plant, pest);
    plant.needs.hygiene = clampNeed(plant.needs.hygiene + 5);
  }
  const perfect = missed === 0 && !hasProblem(plant, 'PEST');
  finishCare(ctx, 'PEST', perfect);
  return ok({ perfect, reaction: 'ticklish', sfx: 'bug_catch', info: { caught: n, jars: n } });
}

/** 8. 가지치기 — 시든 잎만 자르면 완벽. 청결 +5, 성장 +3%. 멀쩡한 잎을 자르면 "아야!" 기분 −10 */
export function prune(ctx: CareCtx, target: ProblemState | 'HEALTHY'): CareResult {
  const blocked = gate(ctx, 'PRUNE');
  if (blocked) return blocked;
  const { plant, base, now, bus } = ctx;
  if (target === 'HEALTHY') {
    plant.needs.mood = clampNeed(plant.needs.mood - 10);
    finishCare(ctx, 'PRUNE', false);
    return { ok: false, perfect: false, reaction: 'pain', sfx: 'ouch', reason: 'wrongLeaf' };
  }
  if (!plant.problems.includes(target) || target.kind !== 'WITHER') return fail('noTarget');
  removeProblem(plant, target);
  plant.needs.hygiene = clampNeed(plant.needs.hygiene + 5);
  const span = thresholdGp(base, plant.stage + 1) - thresholdGp(base, plant.stage);
  if (plant.stage < 5) addGp(plant, base, span * CARE.pruneGrowth, now, bus);
  const perfect = problemsOf(plant, 'WITHER').length === 0;
  finishCare(ctx, 'PRUNE', perfect);
  return ok({
    perfect,
    reaction: 'happy',
    sfx: 'snip',
    info: { left: problemsOf(plant, 'WITHER').length },
  });
}

/** 9. 모양 다듬기 — 성숙 단계 이후 3가지 중 선택: 단정(사거리) · 풍성(HP) · 삐죽(치명) */
export function shape(ctx: CareCtx, choice: 'NEAT' | 'BUSHY' | 'SPIKY'): CareResult {
  const blocked = gate(ctx, 'SHAPE');
  if (blocked) return blocked;
  if (ctx.plant.stage < 4) return fail('wrongStage');
  ctx.plant.shape = choice;
  finishCare(ctx, 'SHAPE', true);
  return ok({ perfect: true, reaction: 'happy', sfx: 'snip', info: { shape: choice } });
}

/** 10. 분갈이 — 위로 뽑기 · 화분 고르기 · 흙 채우기 · 토닥토닥. 15초 안에 끝내면 완벽. 뿌리 꽉 참 해소 */
export function repot(ctx: CareCtx, potId: string, soilId: string, seconds: number): CareResult {
  const blocked = gate(ctx, 'REPOT');
  if (blocked) return blocked;
  const { plant, state } = ctx;
  if (plant.stage < 2) return fail('wrongStage'); // 뿌리 꽉 참은 2→3 진입 직전에 걸리므로 새싹부터 가능
  const size = (plant.timers.potSize ?? 1) + 1;
  if (size > 3) return fail('notNeeded');
  if (!takeItem(state, potKey(potId, size))) return fail('noItem'); // 분갈이마다 한 단계 큰 화분이 필요
  if (soilId !== 'BASIC' && !takeItem(state, `soil:${soilId}`)) {
    addItem(state, potKey(potId, size), 1); // 화분은 돌려준다
    return fail('noItem');
  }
  plant.potId = potId;
  plant.soilId = soilId;
  plant.timers.potSize = size;
  clearProblems(plant, 'ROOTBOUND');
  plant.flags[`repotted${plant.stage}`] = true; // 이 단계의 분갈이 관문 통과
  const perfect = seconds * 1000 <= CARE.repotPerfectMs;
  finishCare(ctx, 'REPOT', perfect);
  return ok({ perfect, reaction: 'surprise', sfx: 'dig', info: { size } });
}

/** 11. 지지대 — 줄기 옆에 꽂기. 줄기에서 1px 옆이면 완벽. 쓰러짐을 풀고 성숙 단계로 갈 수 있게 한다 */
export function stake(ctx: CareCtx, offsetPx: number): CareResult {
  const blocked = gate(ctx, 'STAKE');
  if (blocked) return blocked;
  const { plant, base } = ctx;
  if (!base.care.needsStake || plant.flags.staked) return fail('notNeeded');
  plant.flags.staked = true;
  clearProblems(plant, 'TOPPLED');
  const perfect = Math.abs(offsetPx) <= 1;
  finishCare(ctx, 'STAKE', perfect);
  return ok({ perfect, reaction: 'happy', sfx: 'plant_place' });
}
