// 추천 덱 (06문서 2절): 이번 스테이지의 적 특징을 막을 수 있는 식물부터, 같은 계열이 겹치지 않게 채운다.

import type { PlantInstance } from '../../core/schema';
import { ENEMIES } from '../../data/battle/enemies';
import { PLANT_BATTLE_BY_ID } from '../../data/battle/plants';
import type { StageDef } from '../../data/battle/stages';
import { PLANT_BASE_BY_ID } from '../../data/plants';

/** 스테이지에 나오는 적 id (보스 포함) */
export function enemiesOf(stage: StageDef): string[] {
  const set = new Set<string>();
  for (const wave of stage.waves) for (const g of wave) set.add(g.e);
  if (stage.boss) set.add(stage.boss);
  return [...set].sort();
}

/** 스테이지 적들의 특징 태그 합집합 */
export function tagsOf(stage: StageDef): string[] {
  const set = new Set<string>();
  for (const id of enemiesOf(stage)) {
    const def = ENEMIES[id];
    if (!def) continue;
    for (const tag of def.tags) set.add(tag);
    if (def.flying) set.add('AIR');
    if (def.stealth) set.add('STEALTH');
  }
  return [...set];
}

/** 식물 하나의 대략적인 힘(레벨 · 자질 반영한 초당 피해 + 보조 가치) */
export function powerOf(p: PlantInstance): number {
  const spec = PLANT_BATTLE_BY_ID.get(p.speciesId);
  if (!spec) return 0;
  const dps = (spec.dmg * Math.max(1, spec.shots ?? 1)) / Math.max(0.2, spec.interval);
  const support = spec.arch === 'AURA' || spec.arch === 'PRODUCE' ? 8 : 0;
  return (dps + support) * (1 + p.level * 0.06) * (0.9 + (p.quality ?? 1) * 0.05);
}

export function canHitAir(speciesId: string): boolean {
  const spec = PLANT_BATTLE_BY_ID.get(speciesId);
  return !!spec && !(spec.flags ?? []).includes('NOAIR');
}

export function recommendDeck(
  candidates: PlantInstance[],
  stage: StageDef,
  size: number,
): string[] {
  const tags = tagsOf(stage);
  const pool = [...candidates].sort(
    (a, b) => powerOf(b) - powerOf(a) || a.uid.localeCompare(b.uid),
  );
  const pick: PlantInstance[] = [];
  const speciesTaken = new Set<string>();
  const familyTaken = new Set<string>();
  const take = (p: PlantInstance): void => {
    pick.push(p);
    speciesTaken.add(p.speciesId);
    familyTaken.add(PLANT_BASE_BY_ID.get(p.speciesId)?.family ?? '');
  };
  // 1) 비행 적이 나오면 하늘을 맞힐 수 있는 식물 하나는 꼭
  if (tags.includes('AIR')) {
    const air = pool.find((p) => canHitAir(p.speciesId) && p.stage >= 3);
    if (air) take(air);
  }
  // 2) 장갑이 있으면 가시(물리) · 불꽃 계열 하나
  if (tags.includes('ARMOR') && pick.length < size) {
    const f = pool.find((p) => {
      const fam = PLANT_BASE_BY_ID.get(p.speciesId)?.family;
      return !speciesTaken.has(p.speciesId) && (fam === 'THORN' || fam === 'EMBER');
    });
    if (f) take(f);
  }
  // 3) 서로 다른 계열 우선(시너지는 같은 계열의 서로 다른 종), 그다음 힘센 순
  for (const p of pool) {
    if (pick.length >= size) break;
    if (speciesTaken.has(p.speciesId)) continue;
    const fam = PLANT_BASE_BY_ID.get(p.speciesId)?.family ?? '';
    if (!familyTaken.has(fam)) take(p);
  }
  for (const p of pool) {
    if (pick.length >= size) break;
    if (!speciesTaken.has(p.speciesId)) take(p);
  }
  for (const p of pool) {
    if (pick.length >= size) break;
    if (!pick.includes(p)) take(p);
  }
  return pick.map((p) => p.uid);
}
