// 상태이상 규칙 (06문서 9-2). 중첩 · 상한 · 보스 규칙을 한 곳에 둔다.

import type { StatusKind, StatusSpec } from '../../data/battle/types';
import { GRADES } from '../../data/grades';
import { PLANT_BASE_BY_ID } from '../../data/plants';
import type { BattleSim } from './BattleSim';
import { tk, type Enemy, type Tower } from './types';

export const SLOW_CAP = 0.7;
export const SLOW_CAP_BOSS = 0.4;
export const POISON_CAP = 10;
export const BURN_CAP = 5;
export const CHILL_PER_STACK = 0.08;

const gradeMul = (t: Tower | null): number => {
  if (!t) return 1;
  const g = PLANT_BASE_BY_ID.get(t.spec.id)?.grade;
  return g ? GRADES[g].statMul : 1;
};

/** 보스에게는 보스 규칙으로 바꿔 적용한다(IMMUNE 이면 null) */
function forBoss(spec: StatusSpec): StatusSpec | null {
  if (spec.boss === 'IMMUNE') return null;
  if (spec.boss) return { ...spec, ...spec.boss, boss: undefined };
  switch (spec.k) {
    case 'BIND':
      return { k: 'SLOW', amt: 0.5, dur: spec.dur };
    case 'STUN':
      return { ...spec, dur: (spec.dur ?? 1) * 0.3 };
    case 'FREEZE':
      return { k: 'SLOW', amt: 0.4, dur: spec.dur };
    case 'CHARM':
      return { k: 'STUN', dur: 0.5 };
    case 'SLEEP':
      return null;
    case 'KNOCK':
    case 'PULL':
      return { ...spec, amt: (spec.amt ?? 0) * 0.3 };
    case 'CHILL':
      return { k: 'SLOW', amt: 0.4, dur: 3 };
    default:
      return spec;
  }
}

const IMMUNE_ROLL: StatusKind[] = ['SLOW', 'BIND', 'CHILL', 'FREEZE'];

/**
 * 적에게 상태이상을 건다. extra 는 시너지 · 형질 보정(둔화 +10%p, 독 상한 +n …).
 * 돌려주는 값: 실제로 걸렸는가.
 */
export function applyStatus(
  sim: BattleSim,
  e: Enemy,
  raw: StatusSpec,
  src: Tower | null,
  extra: {
    slowAdd?: number;
    durAdd?: number;
    poisonCap?: number;
    burnCap?: number;
    chillStacks?: number;
    durMul?: number;
  } = {},
): boolean {
  if (!e.alive) return false;
  if (raw.p !== undefined && !sim.rng.chance(raw.p)) return false;
  const spec = e.boss ? forBoss(raw) : raw;
  if (!spec) return false;
  const k = spec.k;
  if (e.def.immune?.includes(k)) return false;
  if ((e.aux.rollUntil ?? 0) > sim.tick && IMMUNE_ROLL.includes(k)) return false; // 굴러가는 중에는 둔화 · 속박 면역
  const now = sim.tick;
  const dur = tk(((spec.dur ?? 1) + (extra.durAdd ?? 0)) * (extra.durMul ?? 1));
  const had = e.icons.includes(k);
  let applied = true;
  switch (k) {
    case 'SLOW': {
      const cap = e.boss ? SLOW_CAP_BOSS : SLOW_CAP;
      const amt = Math.min(cap, (spec.amt ?? 0) + (extra.slowAdd ?? 0));
      if (amt >= e.slowAmt || e.slowUntil <= now) {
        e.slowAmt = amt;
        e.slowUntil = Math.max(e.slowUntil > now ? e.slowUntil : 0, now + dur);
      } else applied = false;
      break;
    }
    case 'BIND':
      e.bindUntil = Math.max(e.bindUntil, now + dur);
      break;
    case 'STUN':
      e.stunUntil = Math.max(e.stunUntil, now + dur);
      break;
    case 'CHILL': {
      if (e.freezeImmune > now || e.freezeUntil > now) break;
      e.chill = Math.min(5, e.chill + (spec.n ?? 1) * (extra.chillStacks ?? 1));
      e.chillUntil = now + tk(4);
      if (e.chill >= 5) {
        e.chill = 0;
        freeze(sim, e, 1.5, extra.durAdd ?? 0);
      }
      break;
    }
    case 'FREEZE':
      if (e.freezeImmune > now) applied = false;
      else freeze(sim, e, spec.dur ?? 1, extra.durAdd ?? 0);
      break;
    case 'POISON': {
      const cap = POISON_CAP + (extra.poisonCap ?? 0);
      e.poison = Math.min(cap, e.poison + (spec.n ?? 1));
      e.poisonUntil = now + tk(4);
      e.poisonDps = Math.max(e.poisonDps, 2 * gradeMul(src) * (src?.aux.dotMul || 1));
      break;
    }
    case 'BURN': {
      const cap = BURN_CAP + (extra.burnCap ?? 0);
      e.burn = Math.min(cap, e.burn + (spec.n ?? 1));
      e.burnUntil = now + tk(3);
      e.burnDps = Math.max(e.burnDps, 3 * gradeMul(src) * (src?.aux.dotMul || 1));
      break;
    }
    case 'WET':
      e.wetUntil = Math.max(e.wetUntil, now + tk(spec.dur ?? 3));
      break;
    case 'CHARM':
      e.charmUntil = Math.max(e.charmUntil, now + dur);
      e.backward = true;
      break;
    case 'SLEEP':
      e.sleepUntil = now + tk(spec.dur ?? 2);
      break;
    case 'SHRED': {
      const max = spec.n ?? 10;
      e.shred = Math.min(Math.min(10, max), e.shred + (spec.amt ?? 1));
      e.shredUntil = now + dur;
      break;
    }
    case 'MARK':
      if ((spec.amt ?? 0) >= e.mark || e.markUntil <= now) {
        e.mark = spec.amt ?? 0;
        e.markUntil = now + dur;
      } else applied = false;
      break;
    case 'KNOCK':
    case 'PULL': {
      if (e.def.immune?.includes('KNOCK')) {
        applied = false;
        break;
      }
      const d = spec.amt ?? 0;
      e.s = Math.max(0, e.s - d);
      break;
    }
  }
  if (applied && !had) {
    e.icons.push(k);
    sim.emit({ t: 'status', enemy: e.uid, kind: k });
  }
  if (applied && src) src.gauge = Math.min(1, src.gauge + 0.004);
  return applied;
}

function freeze(sim: BattleSim, e: Enemy, sec: number, add: number): void {
  const now = sim.tick;
  if (e.boss) {
    // 빙결 대신 둔화 40%
    e.slowAmt = Math.max(e.slowAmt, 0.4);
    e.slowUntil = Math.max(e.slowUntil, now + tk(sec));
    return;
  }
  e.freezeUntil = Math.max(e.freezeUntil, now + tk(sec + add));
  e.freezeImmune = e.freezeUntil + tk(2);
  e.chill = 0;
}

export function isFrozen(sim: BattleSim, e: Enemy): boolean {
  return e.freezeUntil > sim.tick;
}

/** 지금 움직일 수 없는가 */
export function isHeld(sim: BattleSim, e: Enemy): boolean {
  const n = sim.tick;
  return (
    e.bindUntil > n ||
    e.stunUntil > n ||
    e.freezeUntil > n ||
    e.sleepUntil > n ||
    (e.aux.blockedUntil ?? 0) > n
  );
}

/** 현재 이동 속도(타일/초). 뒷걸음이면 음수 */
export function speedOf(sim: BattleSim, e: Enemy): number {
  if (isHeld(sim, e)) return 0;
  const n = sim.tick;
  let slow = e.slowUntil > n ? e.slowAmt : 0;
  if (e.chillUntil > n) slow += e.chill * CHILL_PER_STACK;
  slow = Math.min(e.boss ? SLOW_CAP_BOSS : SLOW_CAP, slow);
  let sp = e.baseSpeed * (1 - slow) * sim.diff.speedMul;
  sp *= 1 + (e.aux.speedBonus ?? 0);
  return e.charmUntil > n ? -sp : sp;
}

/** 시간이 지나 끝난 상태이상을 정리하고 도트 피해를 준다. 틱마다 1번 */
export function tickStatus(sim: BattleSim, e: Enemy): void {
  const n = sim.tick;
  if (e.chillUntil <= n) e.chill = 0;
  if (e.poisonUntil <= n) {
    e.poison = 0;
    e.poisonDps = 0;
  }
  if (e.aux.eternal && e.burn > 0) e.burnUntil = n + tk(3); // 영겁 화상
  if (e.burnUntil <= n) {
    e.burn = 0;
    e.burnDps = 0;
  }
  if (e.shredUntil <= n) e.shred = 0;
  if (e.markUntil <= n) e.mark = 0;
  if (e.charmUntil <= n) e.backward = false;
  if (e.slowUntil <= n) e.slowAmt = 0;
  if (e.icons.length && n % 20 === 0) {
    e.icons = e.icons.filter((k) => iconActive(sim, e, k));
  }
  if (e.poison > 0) sim.dot(e, (e.poison * e.poisonDps) / 60, 'POISON');
  if (e.burn > 0) sim.dot(e, (e.burn * e.burnDps) / 60, 'FIRE');
}

function iconActive(sim: BattleSim, e: Enemy, k: StatusKind): boolean {
  const n = sim.tick;
  switch (k) {
    case 'SLOW':
      return e.slowUntil > n;
    case 'BIND':
      return e.bindUntil > n;
    case 'STUN':
      return e.stunUntil > n;
    case 'CHILL':
      return e.chill > 0;
    case 'FREEZE':
      return e.freezeUntil > n;
    case 'POISON':
      return e.poison > 0;
    case 'BURN':
      return e.burn > 0;
    case 'WET':
      return e.wetUntil > n;
    case 'CHARM':
      return e.charmUntil > n;
    case 'SLEEP':
      return e.sleepUntil > n;
    case 'SHRED':
      return e.shred > 0;
    case 'MARK':
      return e.mark > 0;
    default:
      return false;
  }
}
