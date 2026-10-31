// 피해 계산 (06문서 9-1): 유형별 배율 · 젖음 · 표식 · 장갑(물리만) · 빙결 파쇄 · 연결 공유

import type { DmgType } from '../../data/battle/types';
import type { BattleSim } from './BattleSim';
import { tk, type Enemy, type Tower } from './types';

export interface HitOpts {
  type: DmgType;
  ignoreArmor?: boolean;
  /** 범위 피해인가(범위에 약한 적) */
  area?: boolean;
  /** 빙결된 적에게 곱하는 배율(파쇄) · 파쇄 후 빙결 해제 */
  shatter?: number;
  crit?: boolean;
  /** 표시용 이펙트 */
  fx?: Tower['spec']['fx'] | null;
  /** 연결 공유 · 연쇄에서의 재귀 방지 */
  noLink?: boolean;
  /** 개화기 게이지에 넣지 않음 */
  noGauge?: boolean;
  /** 피해를 주는 식물이 아닌 출처(도구 · 소환수) */
  quiet?: boolean;
}

/** 유효 장갑 */
export const armorOf = (_sim: BattleSim, e: Enemy): number => Math.max(0, e.armor - e.shred);

/** 피해를 주고 실제로 들어간 양을 돌려준다 */
export function dealDamage(
  sim: BattleSim,
  e: Enemy,
  amount: number,
  src: Tower | null,
  o: HitOpts,
): number {
  if (!e.alive || amount <= 0) return 0;
  const n = sim.tick;
  let d = amount * (e.def.dmgMul?.[o.type] ?? 1);
  if (e.wetUntil > n) {
    if (o.type === 'ELEC') d *= 1.5;
    else if (o.type === 'FIRE') d *= 0.7;
  }
  if (e.markUntil > n) d *= 1 + e.mark;
  if (o.area && e.def.areaWeak) d *= 1 + e.def.areaWeak;
  if (e.freezeUntil > n) {
    if (o.shatter) {
      d *= o.shatter;
      e.freezeUntil = 0; // 파쇄 후 빙결 해제
    } else if (sim.synergyTier('FROST') >= 3) d *= 1.3;
  }
  if (o.type === 'PHYS' && !o.ignoreArmor) {
    const a = armorOf(sim, e);
    d = Math.max(d * 0.2, d - a);
  }
  if (e.aux.shield > 0) {
    const absorbed = Math.min(e.aux.shield, d);
    e.aux.shield -= absorbed;
    d -= absorbed;
  }
  if (e.aux.invuln > n) d = 0;
  return applyHp(sim, e, d, src, o);
}

/** 도트 · 고정 피해(장갑 무시) */
export function dotDamage(sim: BattleSim, e: Enemy, amount: number, type: DmgType): number {
  if (!e.alive || amount <= 0) return 0;
  let d = amount;
  if (e.markUntil > sim.tick) d *= 1 + e.mark;
  if (e.aux.invuln > sim.tick) d = 0;
  const src = sim.towerById(e.lastHit);
  // 독 · 화상 피해 증폭(달그림자 영지 · 화로 연꽃)
  d *= sim.dotAmp(e, type);
  return applyHp(sim, e, d, src, { type, quiet: true, noLink: true, noGauge: true });
}

function applyHp(sim: BattleSim, e: Enemy, d: number, src: Tower | null, o: HitOpts): number {
  if (d <= 0) return 0;
  const dealt = Math.min(e.hp, d);
  e.hp -= d;
  e.hitTick = sim.tick;
  if (e.sleepUntil > sim.tick && !o.quiet) e.sleepUntil = 0; // 맞으면 깬다
  if (src) {
    e.lastHit = src.id;
    src.dealt += dealt;
    if (!o.noGauge) src.gauge = Math.min(1, src.gauge + 0.0035);
  }
  if (!o.quiet) {
    sim.emit({
      t: 'hit',
      enemy: e.uid,
      x: e.x,
      y: e.y,
      amount: d,
      type: o.type,
      crit: !!o.crit,
      fx: o.fx ?? src?.spec.fx ?? null,
    });
  }
  // 연결(거미줄 박주가리): 받은 피해의 일부를 나머지에게 나눈다
  if (e.link && e.linkUntil > sim.tick && !o.noLink) {
    for (const other of sim.enemies) {
      if (other !== e && other.alive && other.link === e.link && other.linkUntil > sim.tick) {
        dotDamage(sim, other, d * e.linkShare, o.type);
      }
    }
  }
  if (e.hp <= 0) sim.kill(e, src);
  return dealt;
}

/** 치명타 굴림 */
export function rollCrit(sim: BattleSim, t: Tower, extra = 0): boolean {
  const c = t.stats.crit + extra + sim.critBonus(t);
  return c > 0 && sim.rng.chance(Math.min(1, c));
}

export { tk };
