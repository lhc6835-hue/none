// 식물 100종의 전투 데이터 모음 (07문서)

import { PLANTS_A } from './plantsA';
import { PLANTS_B } from './plantsB';
import { PLANTS_C } from './plantsC';
import { PLANTS_D } from './plantsD';
import type { PlantBattle } from './types';

export const PLANT_BATTLE: PlantBattle[] = [...PLANTS_A, ...PLANTS_B, ...PLANTS_C, ...PLANTS_D];
export const PLANT_BATTLE_BY_ID: ReadonlyMap<string, PlantBattle> = new Map(
  PLANT_BATTLE.map((p) => [p.id, p]),
);
