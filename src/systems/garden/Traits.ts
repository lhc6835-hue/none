// 형질 추첨 (04문서 9-2): 개화 때 등급별 칸 수만큼. 흔함 70% · 드묾 25% · 희귀 5%. 자질 ★5 이면 칸 +1(최대 4).

import type { Rng } from '../../core/Rng';
import type { GradeId, TraitId } from '../../core/schema';
import { GRADES } from '../../data/grades';
import { TRAIT_RARITY_WEIGHT, TRAITS, type TraitRarity } from '../../data/traits';

export const MAX_TRAIT_SLOTS = 4;

export function traitSlots(grade: GradeId, stars: number): number {
  return Math.min(MAX_TRAIT_SLOTS, GRADES[grade].traitSlots + (stars >= 5 ? 1 : 0));
}

/** 형질 하나를 뽑는다. exclude 에 있는 형질은 제외(중복 방지). */
export function rollTrait(rng: Rng, exclude: readonly TraitId[] = []): TraitId {
  const rarities: TraitRarity[] = ['COMMON', 'UNCOMMON', 'RARE'];
  const rarity = rng.weighted(
    rarities,
    rarities.map((r) => TRAIT_RARITY_WEIGHT[r]),
  );
  const pool = TRAITS.filter((t) => t.rarity === rarity && !exclude.includes(t.id));
  const fallback = TRAITS.filter((t) => !exclude.includes(t.id));
  return rng.pick(pool.length > 0 ? pool : fallback).id;
}

export function rollTraits(rng: Rng, count: number, keep: readonly TraitId[] = []): TraitId[] {
  const out: TraitId[] = [...keep];
  while (out.length < count) out.push(rollTrait(rng, out));
  return out;
}
