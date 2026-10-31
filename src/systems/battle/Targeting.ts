// 대상 선택 (06문서 6절 우선순위 · 8문서 비행 규칙)

import type { PlantBattle, StatusSpec } from '../../data/battle/types';
import type { BattleSim } from './BattleSim';
import { familyOf } from './Towers';
import type { Enemy, Tower } from './types';

/** 땅 위 적만 맞히는 특수 능력 */
const GROUND_ONLY_SPECIAL = new Set([
  'PULL',
  'ROLL',
  'METEOR',
  'WHIRLPOOL',
  'TORNADO',
  'TANGLE',
  'GRASP',
]);

export function canHitAir(spec: PlantBattle): boolean {
  if (spec.flags?.includes('AA')) return true;
  switch (spec.arch) {
    case 'LOB':
    case 'MELEE':
    case 'ZONE':
    case 'TRAP':
    case 'WALL':
      return false;
    case 'SPECIAL':
      return !GROUND_ONLY_SPECIAL.has(spec.special ?? '');
    default:
      return true;
  }
}

/** 사거리 안에서 이 식물이 맞힐 수 있는 적 */
export function inRange(sim: BattleSim, t: Tower, range?: number): Enemy[] {
  const r = range ?? sim.eff(t).range;
  return sim.enemiesNear(t.x, t.y, r, { air: canHitAir(t.spec) ? undefined : false });
}

export function pickTarget(_sim: BattleSim, t: Tower, list: Enemy[]): Enemy | null {
  if (list.length === 0) return null;
  let best = list[0];
  const score = (e: Enemy): number => {
    switch (t.target) {
      case 'LAST':
        return -e.s;
      case 'STRONG':
        return e.hp;
      case 'CLOSE':
        return -Math.hypot(e.x - t.x, e.y - t.y);
      case 'AIR':
        return (e.flying ? 1e6 : 0) + e.s;
      default:
        return e.s; // FIRST: 출구에 가장 가까운(많이 걸어온) 적
    }
  };
  let bs = score(best);
  for (let i = 1; i < list.length; i++) {
    const s = score(list[i]);
    if (s > bs || (s === bs && list[i].uid < best.uid)) {
      best = list[i];
      bs = s;
    }
  }
  return best;
}

/** 강한 적: 보스가 아닌 적 중 HP 최대 */
export function strongest(list: Enemy[]): Enemy | null {
  let b: Enemy | null = null;
  for (const e of list) if (!b || e.hp > b.hp) b = e;
  return b;
}

/**
 * 이 식물의 공격에 붙는 상태이상 목록: 종 고유 + 시너지(가시 장갑 깎기 · 덩굴 둔화 보정은 applyStatus 의 extra 로)
 * + 가까운 오라(화로 연꽃 · 달빛 이슬방울)가 부여하는 화상/냉기
 */
export function onHitList(sim: BattleSim, t: Tower): StatusSpec[] {
  const out: StatusSpec[] = [...(t.spec.on ?? [])];
  const fam = familyOf(t.spec.id);
  if (fam === 'THORN' && sim.synergyTier('THORN') >= 1)
    out.push({ k: 'SHRED', amt: 1, dur: 4, n: 5 });
  for (const a of sim.towers) {
    if (a === t || a.down > 0 || a.spec.arch !== 'AURA') continue;
    const p = a.spec.p ?? {};
    if (!p.grantBurn && !p.grantChill) continue;
    const bloomed = a.bloomLeft > 0;
    const range = a.stats.range;
    if (Math.hypot(a.x - t.x, a.y - t.y) > range) continue;
    if (p.grantBurn)
      out.push({ k: 'BURN', n: bloomed ? (a.spec.bloom.p?.grantBurn ?? 3) : p.grantBurn });
    if (p.grantChill)
      out.push({ k: 'CHILL', n: bloomed ? (a.spec.bloom.p?.grantChill ?? 3) : p.grantChill });
    a.support += 0.01;
  }
  return out;
}

/** 시너지 · 형질이 상태이상에 주는 보정 */
export function statusExtra(
  sim: BattleSim,
  t: Tower,
): {
  slowAdd?: number;
  durMul?: number;
  poisonCap?: number;
  burnCap?: number;
  chillStacks?: number;
  durAdd?: number;
} {
  const fam = familyOf(t.spec.id);
  const tier = sim.synergyTier(fam);
  const x: {
    slowAdd?: number;
    durMul?: number;
    poisonCap?: number;
    burnCap?: number;
    chillStacks?: number;
    durAdd?: number;
  } = {};
  if (fam === 'VINE') {
    if (tier >= 1) x.slowAdd = 0.1;
    if (tier >= 3) x.durMul = 1.5;
  }
  if (fam === 'FUNGUS') {
    x.poisonCap =
      (tier >= 3 ? 3 : 0) +
      (t.aux.capAdd ?? 0) +
      (sim.towers.some((m) => m.spec.id === 'P030' && m.down <= 0) ? 5 : 0);
  }
  if (fam === 'EMBER' && tier >= 3) x.burnCap = 2;
  if (fam === 'FROST') {
    if (tier >= 1) x.chillStacks = 2;
    if (tier >= 2) x.durAdd = 0.5;
  }
  if (fam === 'SPIRIT' && tier >= 1) x.durAdd = (x.durAdd ?? 0) + 1;
  return x;
}
