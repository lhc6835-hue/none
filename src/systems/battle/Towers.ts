// 식물(타워) 능력치 · 배치 · 강화 (06문서 4 · 5 · 7절)

import { BRANCHES, UPGRADE } from '../../data/battle/archetypes';
import type { PlantBattle } from '../../data/battle/types';
import { PLANT_BASE_BY_ID } from '../../data/plants';
import { TRAIT_BY_ID } from '../../data/traits';
import { qualityBonus } from '../garden/Quality';
import type { TileKind } from './Paths';
import type { Loadout, Stats, Tower } from './types';

export const FIELD_LIMIT = 20;
const STAGE_MUL: Record<number, number> = { 3: 0.6, 4: 0.85, 5: 1.0 };
const HEART_BONUS = [0, 0, 0, 0, 0.02, 0.02, 0.04, 0.04, 0.06, 0.06, 0.1];
export const UNDO_SEC = 3;
export const REFUND_LATE = 0.7;

export const familyOf = (speciesId: string): string =>
  PLANT_BASE_BY_ID.get(speciesId)?.family ?? 'VINE';

/** 형질에서 전투 효과 한 항목의 합 */
export function traitSum(load: Loadout, key: string): number {
  let s = 0;
  for (const id of load.traits) s += TRAIT_BY_ID.get(id)?.battle?.[key] ?? 0;
  return s;
}

/** 06문서 5절: 최종 수치 = 기본 × 레벨 × 자질 × 애정도 × 컨디션 × 성장 단계 (강화 · 타일 · 시너지는 따로) */
export function growthMul(load: Loadout): number {
  return (
    (1 + 0.06 * (load.level - 1)) *
    (1 + qualityBonus(load.stars)) *
    (1 + HEART_BONUS[Math.max(0, Math.min(10, load.hearts))]) *
    load.condition *
    (STAGE_MUL[load.stage] ?? 1)
  );
}

export function baseCost(
  spec: PlantBattle,
  load: Loadout,
  sameCount: number,
  firstOfDeck: boolean,
): number {
  let c = spec.cost * (1 + Math.min(5, sameCount) * 0.1);
  c *= 1 + traitSum(load, 'cost');
  if (load.hearts >= 9 && firstOfDeck) c *= 0.9; // 단짝: 첫 배치 비용 −10%
  return Math.round(c);
}

export function upgradeCost(t: Tower): number | null {
  if (t.level >= 3) return null;
  return Math.round(t.spec.cost * UPGRADE.cost[t.level]);
}

export function sellValue(t: Tower, now: number): number {
  const early = (now - t.placedAt) / 60 <= UNDO_SEC;
  return Math.floor(t.invested * (early ? 1 : REFUND_LATE));
}

export function canPlaceOn(spec: PlantBattle, tile: TileKind): boolean {
  const f = spec.flags ?? [];
  if (tile === 'ROCK' || tile === 'ENTRY' || tile === 'EXIT') return false;
  if (tile === 'WATER') return f.includes('WATER_ONLY') || f.includes('WATER_OK');
  if (f.includes('WATER_ONLY')) return false;
  if (tile === 'PATH') return spec.arch === 'TRAP' || spec.arch === 'WALL';
  if (spec.arch === 'WALL' || f.includes('ON_PATH')) return false; // 장벽은 길 위에만
  return true;
}

/** 능력치를 다시 계산한다(배치 · 강화 · 시너지 변화 때) */
export function computeStats(t: Tower, tile: TileKind, synergy: (fam: string) => number): Stats {
  const spec = t.spec;
  const g = growthMul(t.load);
  let dmgMul = g * (1 + traitSum(t.load, 'damage'));
  const up = t.level > 0 ? UPGRADE.mul[t.level - 1] : 1;
  dmgMul *= up;
  const fam = familyOf(spec.id);
  if (tile === 'FERTILE') dmgMul *= 1.1;
  if (tile === 'SHADE') {
    if (fam === 'FUNGUS' || fam === 'SPIRIT') dmgMul *= 1.1;
    if (fam === 'LUMEN' || fam === 'EMBER') dmgMul *= 0.9;
  }
  let range =
    spec.range +
    (t.level >= 2 ? UPGRADE.rangeBonus[1] : 0) +
    (t.level >= 3 ? UPGRADE.rangeBonus[2] : 0);
  range += traitSum(t.load, 'range') * (spec.range > 0 && spec.range < 90 ? 1 : 0);
  if (tile === 'WATER' && fam === 'FROST') range += 0.5;
  let interval = spec.interval / (1 + traitSum(t.load, 'atkSpeed'));
  let crit = traitSum(t.load, 'crit');
  let critMul = 2 + traitSum(t.load, 'critDamage');
  let pierce = spec.pierce ?? 0;
  let targets = spec.targets ?? 0;
  let splash = (spec.splash ?? 0) * (1 + traitSum(t.load, 'area'));
  if (fam === 'THORN' && synergy('THORN') >= 3) critMul += 0.3;
  if (fam === 'THORN' && synergy('THORN') >= 2) pierce += 1;
  if (fam === 'FRUIT' && synergy('FRUIT') >= 1) splash *= 1.1;
  if (fam === 'FRUIT' && synergy('FRUIT') >= 3 && spec.arch === 'LOB') range += 1;
  if (fam === 'LUMEN' && synergy('LUMEN') >= 1) crit += 0.05;
  if (fam === 'STORM' && synergy('STORM') >= 1 && spec.arch === 'CHAIN') targets += 1;
  if (fam === 'STORM' && synergy('STORM') >= 2) interval /= 1.1;
  if (synergy('BLOOM') >= 3) interval /= 1.1;
  // 특수 능력 종은 사수의 분기(연사 · 관통)를 쓴다
  const rank = spec.arch === 'SPECIAL' ? 'SHOOT' : spec.arch;
  if (t.branch) {
    const b = BRANCHES[rank][t.branch];
    if (b.intervalMul) interval *= b.intervalMul;
    if (b.dmgMul) dmgMul *= b.dmgMul;
    if (b.pierce) pierce += b.pierce;
    if (b.crit) crit += b.crit;
    if (b.critMul) critMul = b.critMul;
    if (b.rangeMul) range *= b.rangeMul;
    if (b.rangeAdd) range += b.rangeAdd;
    if (b.splashMul) splash *= b.splashMul;
    if (b.targetsAdd) targets += b.targetsAdd;
  }
  return {
    dmg: spec.dmg * dmgMul,
    interval,
    range,
    crit,
    critMul,
    targets,
    splash,
    pierce,
    aoeMul: 1,
  };
}

export function makeTower(
  id: number,
  spec: PlantBattle,
  load: Loadout,
  tx: number,
  ty: number,
  now: number,
  invested: number,
): Tower {
  const maxHp = Math.round(
    100 *
      growthMul({ ...load, stage: 5 }) *
      (1 + traitSum(load, 'hp')) *
      (spec.arch === 'WALL' ? (spec.p?.hp ?? 300) / 100 : 1),
  );
  return {
    id,
    spec,
    load,
    tx,
    ty,
    x: tx + 0.5,
    y: ty + 0.5,
    stats: {
      dmg: spec.dmg,
      interval: spec.interval,
      range: spec.range,
      crit: 0,
      critMul: 2,
      targets: spec.targets ?? 0,
      splash: spec.splash ?? 0,
      pierce: spec.pierce ?? 0,
      aoeMul: 1,
    },
    level: 0,
    branch: null,
    cd: 30,
    gauge: 0,
    bloomLeft: 0,
    manualBloom: false,
    down: 0,
    hp: maxHp,
    maxHp,
    target: 'FIRST',
    invested,
    placedAt: now,
    buffs: [],
    aux: {},
    dealt: 0,
    support: 0,
    kills: 0,
  };
}
