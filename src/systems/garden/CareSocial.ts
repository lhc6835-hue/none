// 돌봄 행동 2/2 — 마음 · 환경 · 수확 (04문서 5절 #12–#18)

import type { GameState, BlindState } from '../../core/GameState';
import type { SongGenre, ZoneId } from '../../core/schema';
import { CARE, CARE_UNLOCK, HARVEST_COOLDOWN_MS, POLLEN_BY_GRADE } from '../../data/care';
import { SNACK_OF_FAMILY } from '../../data/items';
import { PERSONALITIES } from '../../data/personalities';
import { TRAIT_BY_ID } from '../../data/traits';
import { addItem, seedKey, takeItem } from '../economy/Inventory';
import { fail, finishCare, gate, type CareCtx, type CareResult } from './Care';
import { clampNeed, isSleeping } from './Needs';
import { GRADES } from '../../data/grades';

export type Phrase = 'CHEER' | 'PRAISE' | 'BATTLE' | 'COMFORT';

const ok = (r: Partial<CareResult> & Pick<CareResult, 'reaction'>): CareResult => ({
  ok: true,
  perfect: false,
  sfx: null,
  ...r,
});

/** 12. 쓰다듬기 — 1.5초 이상 문지르기. 기분 +6 · 애정도 +2. 1시간 안에 반복하면 효과가 절반씩 줄어든다 */
export function pet(ctx: CareCtx, seconds: number): CareResult {
  const blocked = gate(ctx, 'PET');
  if (blocked) return blocked;
  if (ctx.plant.stage < 1) return fail('wrongStage');
  if (seconds < 1.5) return fail('tooShort');
  const { plant, base, env, now } = ctx;
  const pers = PERSONALITIES[plant.personality].garden;

  // 잠든 식물을 쓰다듬으면 투덜(기분 −2)
  if (isSleeping(plant, base, env)) {
    plant.needs.mood = clampNeed(plant.needs.mood + CARE.petSleepMood);
    finishCare(ctx, 'PET', false);
    return { ok: false, perfect: false, reaction: 'sulk', sfx: 'ui_error', reason: 'sleeping' };
  }
  // 1시간 안에 이어서 쓰다듬으면 절반씩
  const recent = now - (plant.lastCare.PET ?? -Infinity) < CARE.petRepeatMs;
  plant.timers.petStreak = recent ? (plant.timers.petStreak ?? 0) + 1 : 0;
  let mul = 0.5 ** plant.timers.petStreak;
  mul *= pers.petMul ?? 1;
  // 수줍음: 처음 2번은 효과 절반, 그 뒤 ×1.5
  const total = (plant.timers.petTotal = (plant.timers.petTotal ?? 0) + 1);
  if (pers.petFirstTwo !== undefined) mul *= total <= 2 ? pers.petFirstTwo : (pers.petAfter ?? 1);
  plant.needs.mood = clampNeed(plant.needs.mood + CARE.petMood * mul);
  const gained = finishCare(ctx, 'PET', false, Math.round(CARE.petAffection * mul) - 1);
  return ok({
    reaction: pers.petFirstTwo !== undefined && total <= 2 ? 'shy' : 'ticklish',
    sfx: 'giggle',
    info: { affection: gained, repeat: plant.timers.petStreak },
  });
}

/** 13. 말 걸기 — 4가지 중 선택. 별빛 이상은 좋아하는 말이 따로 있다. 시무룩할 때 "같이 싸우자"는 역효과 */
export function talk(ctx: CareCtx, phrase: Phrase): CareResult {
  const blocked = gate(ctx, 'TALK');
  if (blocked) return blocked;
  const { plant, base, now } = ctx;
  if (plant.stage < 2) return fail('wrongStage');
  const pers = PERSONALITIES[plant.personality].garden;
  const talkMul = plant.traits.reduce(
    (m, id) => m * (TRAIT_BY_ID.get(id)?.garden?.talkMul ?? 1),
    1,
  );
  const sulky = plant.needs.mood < 30;

  let mood = 4;
  let reaction: CareResult['reaction'] = 'happy';
  const likedByGrade = GRADES[base.grade].order >= 6 ? base.care.phrase : undefined;
  if (likedByGrade === phrase) {
    mood = 12;
    reaction = 'excited';
  } else if (phrase === 'BATTLE' && pers.likesBattlePhrase) {
    mood = 8;
    reaction = 'excited';
  } else if (phrase === 'COMFORT' && sulky) mood = 8;
  else if (phrase === 'BATTLE' && sulky) {
    mood = -4; // 역효과
    reaction = 'sulk';
  } else if (phrase === 'PRAISE' && pers.petFirstTwo !== undefined) reaction = 'shy';

  plant.needs.mood = clampNeed(plant.needs.mood + (mood > 0 ? mood * talkMul : mood));
  // 애정도 +2 는 30분에 1회(쿨다운 중이면 0). finishCare 의 기본 증가분(완벽 3 · 일반 1)을 뺀 값을 넘긴다.
  const liked = likedByGrade === phrase;
  const cooled = now - (plant.lastCare.TALK ?? -Infinity) >= CARE.talkAffectionCooldownMs;
  const gained = finishCare(
    ctx,
    'TALK',
    liked,
    (cooled ? CARE.talkAffectionExtra : 0) - (liked ? 3 : 1),
  );
  return {
    ok: mood > 0,
    perfect: liked,
    reaction,
    sfx: mood > 0 ? 'talk' : 'ui_error',
    info: { mood, affection: gained },
    reason: mood > 0 ? undefined : 'wrongLeaf',
  };
}

/** 14. 음악 — 레코드를 고르면 온실 전체 배경음이 바뀐다. null 이면 끈다. */
export function setMusic(state: GameState, genre: SongGenre | null): boolean {
  if (state.player.level < CARE_UNLOCK.MUSIC) return false;
  state.garden.music = genre;
  state.mastery.MUSIC = (state.mastery.MUSIC ?? 0) + 1;
  return true;
}

/** 15. 빛 조절 — 구역별로 열기 · 반 · 닫기 */
export function setBlind(state: GameState, zone: ZoneId, blind: BlindState): boolean {
  if (state.player.level < CARE_UNLOCK.LIGHT) return false;
  state.garden.blinds[zone] = blind;
  state.mastery.LIGHT = (state.mastery.LIGHT ?? 0) + 1;
  return true;
}

/** 16. 온도 조절 — 난로 · 선풍기를 켜고 끈다(온실 전체) */
export function setTemperature(state: GameState, device: 'stove' | 'fan', on: boolean): boolean {
  if (state.player.level < CARE_UNLOCK.TEMP) return false;
  state.garden[device] = on;
  state.mastery.TEMP = (state.mastery.TEMP ?? 0) + 1;
  return true;
}

/** 17. 간식 — 입 근처로 끌어다 주기. 계열에 맞는 간식이면 기분 +20 · 애정도 +5(2시간에 1회). 맞지 않으면 고개를 돌림 */
export function snack(ctx: CareCtx, itemId: string): CareResult {
  const blocked = gate(ctx, 'SNACK');
  if (blocked) return blocked;
  const { plant, base, state, now } = ctx;
  if (plant.stage < 1) return fail('wrongStage');
  if (!state.inventory[itemId]) return fail('noItem');
  if (SNACK_OF_FAMILY[base.family] !== itemId) return fail('turnAway', 'sulk'); // 간식은 돌려받는다(소모하지 않음)
  if (now - (plant.lastCare.SNACK ?? -Infinity) < CARE.snackCooldownMs)
    return fail('cooldown', 'none');
  takeItem(state, itemId);
  const mul = PERSONALITIES[plant.personality].garden.nutrientMul ?? 1;
  plant.needs.mood = clampNeed(plant.needs.mood + CARE.snackMood * mul);
  const gained = finishCare(ctx, 'SNACK', true, CARE.snackAffection - 3);
  return ok({ perfect: true, reaction: 'excited', sfx: 'heart', info: { affection: gained } });
}

/** 18. 수확 — 개화한 식물에 열린 것을 탭. 꽃가루 · 계열 재료 · 가끔(5%) 같은 종 씨앗. 하루에 한 번 */
export function harvest(ctx: CareCtx): CareResult {
  const blocked = gate(ctx, 'HARVEST');
  if (blocked) return blocked;
  const { plant, base, state, now, rng } = ctx;
  if (plant.stage < 5) return fail('wrongStage');
  if (now - (plant.lastCare.HARVEST ?? -Infinity) < HARVEST_COOLDOWN_MS) return fail('cooldown');
  const pollen = POLLEN_BY_GRADE[base.grade];
  addItem(state, 'POLLEN', pollen);
  addItem(state, `MAT_${base.family}`, 1);
  const seed = rng.chance(CARE.harvestSeedChance);
  if (seed) addItem(state, seedKey(plant.speciesId), 1);
  finishCare(ctx, 'HARVEST', true);
  return ok({ perfect: true, reaction: 'happy', sfx: 'harvest', info: { pollen, seed } });
}
