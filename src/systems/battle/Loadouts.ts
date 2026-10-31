// 정원의 식물 → 전투 출전 정보 (06문서 5절)

import type { GameState } from '../../core/GameState';
import type { PlantInstance } from '../../core/schema';
import { PLANT_BATTLE_BY_ID } from '../../data/battle/plants';
import { PLANT_BASE_BY_ID } from '../../data/plants';
import { affectionLevel } from '../garden/Affection';
import { worldAt } from '../garden/Environment';
import { plantEnv } from '../garden/Garden';
import { battleConditionTier, conditionOf } from '../garden/Needs';
import type { Loadout } from './types';

export function loadoutOf(state: GameState, p: PlantInstance, now: number): Loadout {
  const base = PLANT_BASE_BY_ID.get(p.speciesId);
  const cond = base ? conditionOf(p, base, plantEnv(state, p, worldAt(now))).value : 1;
  return {
    speciesId: p.speciesId,
    nickname: p.nickname,
    level: p.level,
    stars: p.quality ?? 1,
    hearts: affectionLevel(p.affection),
    stage: Math.max(3, p.stage),
    condition: battleConditionTier(cond).mul,
    traits: p.traits,
    uid: p.uid,
  };
}

/** 출전할 수 있는 식물: 어린잎(3단계) 이상이고 전투 데이터가 있는 것 */
export const canDeploy = (p: PlantInstance): boolean =>
  p.stage >= 3 && PLANT_BATTLE_BY_ID.has(p.speciesId);

/** 덱 칸 수: 시작 5칸 → Lv3 에서 6칸(연구로 7 · 8칸) */
export const deckSlots = (playerLevel: number): number => (playerLevel >= 3 ? 6 : 5);
