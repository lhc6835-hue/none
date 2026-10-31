// 아키타입별 공격 (06문서 6절): 사수 · 저격 · 곡사 · 근접 · 연쇄 + 투사체 처리. 장판 · 광선 · 설치 등은 Fields.ts.

import type { StatusSpec } from '../../data/battle/types';
import type { BattleSim } from './BattleSim';
import { projectileTick } from './Projectiles';
import { dealDamage, rollCrit } from './Damage';
import {
  beamTick,
  fieldTick as fieldsTick,
  zoneTick,
  summonTick,
  produceTick,
  trapTick,
  wallTick,
} from './Fields';
import { posAt } from './Paths';
import { applyStatus } from './Status';
import { SPECIAL_ATTACK } from './Specials';
import { inRange, onHitList, pickTarget, statusExtra } from './Targeting';
import { tk, type Enemy, type Projectile, type Tower } from './types';

export const PROJ_SPEED = 8; // 타일/초 (06문서 6절 사수)
const LOB_SPEED = 6;

/** 공격이 맞았을 때 상태이상 · 피해 · 이펙트를 한꺼번에 처리 */
export function strike(
  sim: BattleSim,
  t: Tower,
  e: Enemy,
  base: number,
  o: {
    area?: boolean;
    ignoreArmor?: boolean;
    on?: StatusSpec[];
    shatter?: number;
    crit?: boolean;
    noStatus?: boolean;
  } = {},
): number {
  const eff = sim.eff(t);
  const crit = o.crit ?? rollCrit(sim, t);
  let d = base * eff.dmg;
  if (crit) d *= t.stats.critMul;
  const dealt = dealDamage(sim, e, d, t, {
    type: t.spec.type,
    area: o.area,
    ignoreArmor: o.ignoreArmor || t.spec.flags?.includes('IGNORE_ARMOR'),
    shatter: o.shatter,
    crit,
    fx: t.spec.fx,
  });
  if (!o.noStatus && e.alive) {
    const extra = statusExtra(sim, t);
    if (t.spec.special === 'ETERNAL_FLAME') extra.burnCap = (extra.burnCap ?? 0) + 15;
    for (const s of o.on ?? onHitList(sim, t)) applyStatus(sim, e, s, t, extra);
    if (t.spec.special === 'ETERNAL_FLAME' && e.burn > 0) e.aux.eternal = 1;
  }
  return dealt;
}

export function resetCd(sim: BattleSim, t: Tower): void {
  t.cd = Math.max(2, tk(sim.eff(t).interval));
}

export function towerAttack(sim: BattleSim, t: Tower): void {
  const kind = t.spec.arch;
  // 매 틱 처리하는 종류
  if (kind === 'BEAM') return beamTick(sim, t);
  if (kind === 'ZONE') return zoneTick(sim, t);
  if (kind === 'AURA') return auraAttack(sim, t);
  if (kind === 'SUMMON') return summonTick(sim, t);
  if (kind === 'PRODUCE') return produceTick(sim, t);
  if (kind === 'TRAP') return trapTick(sim, t);
  if (kind === 'WALL') return wallTick(sim, t);
  // 쿨다운 공격
  if (t.cd > 0) {
    t.cd--;
    return;
  }
  if (kind === 'SPECIAL') {
    const fn = SPECIAL_ATTACK[t.spec.special ?? ''];
    if (fn) {
      if (fn(sim, t)) resetCd(sim, t);
      return;
    }
  }
  const list = inRange(sim, t);
  const target = pickTarget(sim, t, list);
  if (!target) return;
  switch (kind) {
    case 'SNIPE':
      fireSnipe(sim, t, target, list);
      break;
    case 'LOB':
      fireLob(sim, t, target, list);
      break;
    case 'MELEE':
      fireMelee(sim, t, target, list);
      break;
    case 'CHAIN':
      fireChain(sim, t, target, list);
      break;
    default:
      fireShoot(sim, t, target);
      break;
  }
  t.gauge = Math.min(1, t.gauge + 0.012);
  resetCd(sim, t);
}

export function fieldTick(sim: BattleSim): void {
  projectileTick(sim);
  fieldsTick(sim);
}

// ---------- 사수 ----------
export function fireShoot(
  sim: BattleSim,
  t: Tower,
  target: Enemy,
  angleOffset = 0,
  dmgMul = 1,
): void {
  const spec = t.spec;
  const shots = spec.shots ?? 1;
  const spread = spec.p?.spread ?? 0.35;
  const homing =
    shots === 1 && (t.stats.pierce === 0 || spec.flags?.includes('HOMING')) && !spec.p?.straight;
  const base = Math.atan2(target.y - t.y, target.x - t.x) + angleOffset;
  for (let i = 0; i < shots; i++) {
    const a = shots === 1 ? base : base + (i - (shots - 1) / 2) * spread;
    const crit = rollCrit(sim, t);
    const proj = sim.addProjectile({
      tower: t.id,
      kind: homing ? 'homing' : 'straight',
      x: t.x,
      y: t.y,
      sx: t.x,
      sy: t.y,
      tx: target.x,
      ty: target.y,
      t: 0,
      dur: 0,
      speed: PROJ_SPEED,
      dir: a,
      target: target.uid,
      dmg: t.stats.dmg * dmgMul * sim.eff(t).dmg * (crit ? t.stats.critMul : 1),
      type: spec.type,
      on: onHitList(sim, t),
      pierce: Math.max(1, t.stats.pierce),
      splash: 0,
      hit: new Set(),
      life: tk((sim.eff(t).range + 1) / PROJ_SPEED),
      aa: true,
      fx: spec.fx,
      aux: {},
      crit,
      ignoreArmor: !!spec.flags?.includes('IGNORE_ARMOR'),
    });
    sim.emit({
      t: 'shot',
      tower: t.id,
      from: { x: t.x, y: t.y },
      to: { x: target.x, y: target.y },
      kind: homing ? 'homing' : 'straight',
      fx: spec.fx,
      target: target.uid,
    });
    void proj;
  }
}

// ---------- 저격(즉시 명중) ----------
function fireSnipe(sim: BattleSim, t: Tower, target: Enemy, list: Enemy[]): void {
  const spec = t.spec;
  const execute = spec.p?.execute ?? 0;
  const crit = rollCrit(sim, t, spec.p?.crit ?? 0);
  if (!target.boss && execute > 0 && target.hp / target.maxHp < execute) {
    sim.kill(target, t);
    sim.emit({
      t: 'shot',
      tower: t.id,
      from: { x: t.x, y: t.y },
      to: { x: target.x, y: target.y },
      kind: 'instant',
      fx: spec.fx,
      target: target.uid,
    });
    return;
  }
  const shatter = spec.p?.shatter;
  sim.emit({
    t: 'shot',
    tower: t.id,
    from: { x: t.x, y: t.y },
    to: { x: target.x, y: target.y },
    kind: 'instant',
    fx: spec.fx,
    target: target.uid,
  });
  const pos = { x: target.x, y: target.y };
  const mul = t.branch === 'A' ? 1 : 1;
  strike(sim, t, target, t.stats.dmg * mul, { crit, shatter });
  if (t.stats.pierce > 0) {
    // 일직선 뒤의 적에게 pierceMul 배
    const dx = pos.x - t.x;
    const dy = pos.y - t.y;
    const len = Math.hypot(dx, dy) || 1;
    for (const e of list) {
      if (e === target || !e.alive) continue;
      const px = e.x - t.x;
      const py = e.y - t.y;
      const along = (px * dx + py * dy) / len;
      const across = Math.abs(px * dy - py * dx) / len;
      if (along > len && across < 0.5)
        strike(sim, t, e, t.stats.dmg * (spec.p?.pierceMul ?? 0.5), { crit });
    }
  }
  if (t.branch === 'B' && t.spec.arch === 'SNIPE') {
    for (const e of sim.enemiesNear(pos.x, pos.y, 0.6))
      if (e !== target) strike(sim, t, e, t.stats.dmg * 0.5, { area: true, noStatus: true });
  }
}

// ---------- 곡사 ----------
export function lobAt(
  sim: BattleSim,
  t: Tower,
  e: Enemy,
  dmg: number,
  delay = 0,
  scatter = 0,
): Projectile {
  const dist = Math.hypot(e.x - t.x, e.y - t.y);
  const flight = Math.max(0.3, dist / LOB_SPEED);
  const route = sim.routeOf(e);
  const ahead = posAt(
    route,
    Math.min(route.length, e.s + Math.max(0, e.baseSpeed * (1 - e.slowAmt) * flight)),
  );
  const jx = scatter ? (sim.rng.next() - 0.5) * 2 * scatter : 0;
  const jy = scatter ? (sim.rng.next() - 0.5) * 2 * scatter : 0;
  const crit = rollCrit(sim, t);
  const p = sim.addProjectile({
    tower: t.id,
    kind: 'lob',
    x: t.x,
    y: t.y,
    sx: t.x,
    sy: t.y,
    tx: ahead.x + jx,
    ty: ahead.y + jy,
    t: -tk(delay),
    dur: tk(flight),
    speed: LOB_SPEED,
    dir: 0,
    target: e.uid,
    dmg: dmg * sim.eff(t).dmg * (crit ? t.stats.critMul : 1),
    type: t.spec.type,
    on: onHitList(sim, t),
    pierce: 1,
    splash: Math.max(0.5, t.stats.splash),
    hit: new Set(),
    life: 9999,
    aa: !!t.spec.flags?.includes('AA'),
    fx: t.spec.fx,
    aux: {
      seeds: t.spec.p?.seeds ?? 0,
      seedDmg: t.spec.p?.seedDmg ?? 0,
      cloud: t.spec.p?.cloudSec ?? 0,
    },
    crit,
    ignoreArmor: false,
  });
  sim.emit({
    t: 'shot',
    tower: t.id,
    from: { x: t.x, y: t.y },
    to: { x: p.tx, y: p.ty },
    kind: 'lob',
    fx: t.spec.fx,
    target: e.uid,
  });
  return p;
}

function fireLob(sim: BattleSim, t: Tower, target: Enemy, list: Enemy[]): void {
  const spec = t.spec;
  const shots = spec.shots ?? 1;
  if (shots > 1 && spec.id === 'P048') {
    // 포도알: 서로 다른 적에게
    const sorted = [...list].sort((a, b) => b.s - a.s);
    for (let i = 0; i < shots; i++) lobAt(sim, t, sorted[i % sorted.length], t.stats.dmg, i * 0.08);
  } else if (shots > 1) {
    // 바늘비 등: 같은 지점 근처에 시간차로
    for (let i = 0; i < shots; i++)
      lobAt(sim, t, target, t.stats.dmg, (spec.p?.burstSec ?? 0.5) * (i / shots), 0.8);
  } else {
    lobAt(sim, t, target, t.stats.dmg);
  }
}

// ---------- 근접 ----------
function fireMelee(sim: BattleSim, t: Tower, target: Enemy, list: Enemy[]): void {
  const spec = t.spec;
  let n = t.stats.targets;
  if (t.branch === 'A') n = 0; // 회오리: 타격 수 무제한
  let hits = list;
  if (spec.p?.cone) {
    const a0 = Math.atan2(target.y - t.y, target.x - t.x);
    hits = list.filter((e) => {
      let d = Math.atan2(e.y - t.y, e.x - t.x) - a0;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return Math.abs(d) <= ((spec.p!.cone / 2) * Math.PI) / 180;
    });
  }
  hits = [target, ...hits.filter((e) => e !== target).sort((a, b) => b.s - a.s)];
  if (n > 0) hits = hits.slice(0, n);
  sim.emit({
    t: 'shot',
    tower: t.id,
    from: { x: t.x, y: t.y },
    to: { x: target.x, y: target.y },
    kind: 'melee',
    fx: spec.fx,
  });
  for (const e of hits) strike(sim, t, e, t.stats.dmg, { area: hits.length > 1 });
}

// ---------- 연쇄 ----------
function fireChain(sim: BattleSim, t: Tower, target: Enemy, list: Enemy[]): void {
  const spec = t.spec;
  const unlimited =
    t.bloomLeft > 0 && (spec.bloom.kind === 'UNLIMITED' || spec.bloom.kind === 'BARRAGE');
  let n = t.stats.targets + (t.aux.targetsAdd ?? 0);
  if (unlimited) n = 0;
  const fall = spec.fall ?? 0.2;
  const hitSet = new Set<number>();
  let cur: Enemy | null = target;
  let mul = t.branch === 'B' ? 2 : 1;
  let i = 0;
  let from = { x: t.x, y: t.y };
  const link: Enemy[] = [];
  while (cur && (n === 0 || i < n)) {
    hitSet.add(cur.uid);
    sim.emit({
      t: 'shot',
      tower: t.id,
      from,
      to: { x: cur.x, y: cur.y },
      kind: 'chain',
      fx: spec.fx,
      target: cur.uid,
    });
    strike(sim, t, cur, t.stats.dmg * mul, {});
    if (t.branch === 'B' && i === 0) applyStatus(sim, cur, { k: 'STUN', dur: 0.3 }, t);
    if (spec.special === 'LINK') link.push(cur);
    from = { x: cur.x, y: cur.y };
    mul *= 1 - fall;
    i++;
    // 다음 대상: 가장 가까운 안 맞은 적(2.2타일 안)
    let best: Enemy | null = null;
    let bd = 2.2;
    for (const e of sim.enemiesNear(cur.x, cur.y, 2.2, { air: undefined })) {
      if (hitSet.has(e.uid) || (e.flying && !true)) continue;
      const d = Math.hypot(e.x - cur.x, e.y - cur.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    if (best && spec.p?.growSec === undefined) cur = best;
    else cur = best;
    if (!cur) break;
    if (sim.synergyTier('STORM') >= 3) cur.stunUntil = Math.max(cur.stunUntil, sim.tick + tk(0.2));
  }
  void list;
}

/** 오라 아키타입: 버프는 BattleSim.auraPass 가 하고, 직접 공격이 있는 종만 여기서 쏜다 */
export function auraAttack(sim: BattleSim, t: Tower): void {
  if (t.spec.dmg <= 0 || t.spec.special === 'DISPEL') return;
  if (t.cd > 0) {
    t.cd--;
    return;
  }
  const list = inRange(sim, t);
  if (list.length === 0) return;
  if (t.spec.id === 'P028') {
    for (const e of list) strike(sim, t, e, t.stats.dmg, { area: true });
  } else {
    const target = pickTarget(sim, t, list);
    if (target) fireShoot(sim, t, target);
  }
  t.gauge = Math.min(1, t.gauge + 0.012);
  resetCd(sim, t);
}
