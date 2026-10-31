import { BLOOM_PLANTS } from './bloom';
import { EMBER_PLANTS } from './ember';
import { FROST_PLANTS } from './frost';
import { FRUIT_PLANTS } from './fruit';
import { FUNGUS_PLANTS } from './fungus';
import { LUMEN_PLANTS } from './lumen';
import { SPIRIT_PLANTS } from './spirit';
import { STORM_PLANTS } from './storm';
import { THORN_PLANTS } from './thorn';
import type { PlantBase } from './types';
import { VINE_PLANTS } from './vine';

export type { PlantBase } from './types';

/** 도감 번호 순서(P001–P100) */
export const PLANT_BASE: readonly PlantBase[] = [
  ...VINE_PLANTS,
  ...THORN_PLANTS,
  ...FUNGUS_PLANTS,
  ...BLOOM_PLANTS,
  ...FRUIT_PLANTS,
  ...EMBER_PLANTS,
  ...FROST_PLANTS,
  ...LUMEN_PLANTS,
  ...STORM_PLANTS,
  ...SPIRIT_PLANTS,
];

export const PLANT_BASE_BY_ID: ReadonlyMap<string, PlantBase> = new Map(
  PLANT_BASE.map((p) => [p.id, p]),
);
