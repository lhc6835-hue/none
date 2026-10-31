// 전투 시뮬레이션에서 떼어 낸 부분. 함수 첫 인자 s 가 BattleSim 이다.

import { PLANT_BATTLE_BY_ID } from '../../data/battle/plants';
import { triggerBloom } from './Bloom';
import { FIELD_LIMIT, baseCost, canPlaceOn, makeTower, sellValue, upgradeCost } from './Towers';
import { TPS, type PlaceResult, type TargetMode } from './types';
import type { BattleSim } from './BattleSim';

export function sameCount(s: BattleSim, speciesId: string): number {
  return s.placedCount.get(speciesId) ?? 0;
}

export function placeCost(s: BattleSim, deckIndex: number): number {
  const load = s.deck[deckIndex];
  const spec = PLANT_BATTLE_BY_ID.get(load.speciesId)!;
  return baseCost(spec, load, s.sameCount(load.speciesId), !s.firstPlaced.has(load.speciesId));
}

export function place(s: BattleSim, deckIndex: number, tx: number, ty: number): PlaceResult {
  if (s.phase === 'WON' || s.phase === 'LOST') return { ok: false, reason: 'phase' };
  const load = s.deck[deckIndex];
  if (!load) return { ok: false, reason: 'noCard' };
  const spec = PLANT_BATTLE_BY_ID.get(load.speciesId)!;
  if (ty < 0 || ty >= s.map.tiles.length || tx < 0 || tx >= s.map.tiles[0].length)
    return { ok: false, reason: 'tile' };
  const tile = s.map.tiles[ty][tx];
  if (!canPlaceOn(spec, tile))
    return { ok: false, reason: tile === 'WATER' ? 'water' : tile === 'PATH' ? 'path' : 'tile' };
  if (s.towers.some((t) => t.tx === tx && t.ty === ty)) return { ok: false, reason: 'occupied' };
  if (s.towers.length >= FIELD_LIMIT) return { ok: false, reason: 'limit' };
  const cost = s.placeCost(deckIndex);
  if (s.nutrient < cost) return { ok: false, reason: 'cost' };
  s.nutrient -= cost;
  const t = makeTower(s.nextTowerId++, spec, load, tx, ty, s.tick, cost);
  s.towers.push(t);
  s.placedCount.set(spec.id, s.sameCount(spec.id) + 1);
  s.firstPlaced.add(spec.id);
  s.synergyDirty = true;
  s.refreshStats(t);
  s.emit({ t: 'place', tower: t.id });
  return { ok: true, tower: t };
}

export function upgrade(s: BattleSim, id: number, branch?: 'A' | 'B'): boolean {
  const t = s.towerById(id);
  if (!t || t.down > 0) return false;
  const cost = upgradeCost(t);
  if (cost === null || s.nutrient < cost) return false;
  if (t.level === 2 && !branch) return false; // +3 은 분기를 골라야 한다
  s.nutrient -= cost;
  t.invested += cost;
  t.level++;
  if (t.level === 3 && branch) t.branch = branch;
  s.refreshStats(t);
  s.emit({ t: 'upgrade', tower: t.id, level: t.level });
  return true;
}

export function sell(s: BattleSim, id: number): number {
  const t = s.towerById(id);
  if (!t) return 0;
  const v = sellValue(t, s.tick);
  s.nutrient += v;
  s.towers = s.towers.filter((x) => x !== t);
  s.fields = s.fields.filter((f) => f.tower !== t.id);
  s.summons = s.summons.filter((s) => s.tower !== t.id);
  s.synergyDirty = true;
  s.emit({ t: 'remove', tower: t.id });
  return v;
}

export function setTarget(s: BattleSim, id: number, mode: TargetMode): void {
  const t = s.towerById(id);
  if (t) t.target = mode;
}

export function toggleManualBloom(s: BattleSim, id: number): void {
  const t = s.towerById(id);
  if (t) t.manualBloom = !t.manualBloom;
}

export function fireBloom(s: BattleSim, id: number): boolean {
  const t = s.towerById(id);
  if (!t || t.gauge < 1 || t.bloomLeft > 0 || t.down > 0) return false;
  triggerBloom(s, t);
  return true;
}

/** 웨이브를 일찍 부른다: 남은 카운트다운 초 × 2 양분 */

/** 웨이브를 일찍 부른다: 남은 카운트다운 초 × 2 양분 */
export function callWave(s: BattleSim): boolean {
  if (s.phase === 'WON' || s.phase === 'LOST') return false;
  if (s.wave >= s.totalWaves) return false;
  if (!Number.isFinite(s.countdown)) return false;
  const bonus = Math.floor((s.countdown / TPS) * 2);
  s.nutrient += bonus;
  s.waveCalled = true;
  s.countdown = 0;
  return true;
}
