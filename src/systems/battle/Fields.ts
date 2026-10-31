// 지속 효과: 장판 · 광선 · 생산 · 설치(함정) · 장벽 · 소환수 · 땅에 남는 효과(Field) (06문서 6절)

import { tk, type Enemy, type Field, type Tower, type Vec } from './types';
import type { BattleSim } from './BattleSim';
import { dealDamage } from './Damage';
import { nearestOnRoute, posAt } from './Paths';
import { applyStatus } from './Status';
import { inRange, onHitList, pickTarget, statusExtra } from './Targeting';
import { familyOf } from './Towers';
import { strike } from './Attacks';

const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

/** 길 위 타일 중 사거리 안에서 아직 비어 있는 곳(출구 쪽에 가까운 곳 우선) */
function freePathTiles(sim: BattleSim, t: Tower, r: number, taken: Vec[]): Vec[] {
  const out: { p: Vec; s: number }[] = [];
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const tx = t.tx + dx;
      const ty = t.ty + dy;
      if (ty < 0 || ty >= sim.map.tiles.length || tx < 0 || tx >= sim.map.tiles[0].length) continue;
      if (sim.map.tiles[ty][tx] !== 'PATH') continue;
      const p = { x: tx + 0.5, y: ty + 0.5 };
      if (dist(p, t) > r || taken.some((q) => dist(q, p) < 0.6)) continue;
      out.push({ p, s: nearestOnRoute(sim.map.routes[0], p.x, p.y).s });
    }
  }
  out.sort((a, b) => b.s - a.s || a.p.y - b.p.y || a.p.x - b.p.x);
  return out.map((o) => o.p);
}

// ---------- 장판 ----------
export function zoneTick(sim: BattleSim, t: Tower): void {
  if (t.cd > 0) {
    t.cd--;
    return;
  }
  const sp = t.spec.special;
  if (sp === 'LAVA' && !t.aux.lava) {
    t.aux.lava = 1;
    for (const p of freePathTiles(sim, t, 1.9, []).slice(0, t.spec.p?.tiles ?? 2)) {
      sim.addField({
        kind: 'LAVA',
        tower: t.id,
        x: p.x,
        y: p.y,
        r: 0.55,
        left: -1,
        period: 30,
        nextTick: sim.tick + 30,
        fx: t.spec.fx,
        v: { dmg: t.stats.dmg, air: 0 },
        on: [{ k: 'BURN', n: 1 }],
        type: 'FIRE',
      });
    }
  }
  if (sp === 'VINE_SPREAD') vineSpread(sim, t);
  const list = inRange(sim, t);
  t.cd = Math.max(2, tk(sim.eff(t).interval));
  if (list.length === 0) return;
  sim.emit({ t: 'ring', x: t.x, y: t.y, r: sim.eff(t).range, fx: t.spec.fx, kind: 'zone' });
  for (const e of list) {
    const extra = statusExtra(sim, t);
    if (t.stats.dmg > 0) strike(sim, t, e, t.stats.dmg, { area: true, noStatus: true });
    if (!e.alive) continue;
    if (sp === 'RAINBOW_FOUNTAIN') {
      const pick = sim.rng.int(0, 3);
      applyStatus(
        sim,
        e,
        [
          { k: 'SLOW', amt: 0.2, dur: 1 },
          { k: 'BURN', n: 1 },
          { k: 'POISON', n: 1 },
          { k: 'WET', dur: 3 },
        ][pick] as never,
        t,
        extra,
      );
    } else if (sp === 'GLACIER') {
      applyStatus(sim, e, { k: 'FREEZE', dur: t.spec.p?.freeze ?? 1.2 }, t, extra);
    } else {
      for (const s of onHitList(sim, t)) applyStatus(sim, e, s, t, extra);
    }
    if (sp === 'LAUGH' && sim.rng.chance(t.spec.p?.chance ?? 0.2))
      applyStatus(sim, e, { k: 'CHARM', dur: t.spec.p?.dur ?? 1.5 }, t, extra);
    if (sp === 'STINK' && !e.once.has(`stink${t.id}`)) {
      e.once.add(`stink${t.id}`);
      applyStatus(sim, e, { k: 'CHARM', dur: 1 }, t, extra);
    }
  }
}

/** 세계감기 덩굴: 길을 따라 덩굴 칸이 퍼진다(10초마다 1칸, 최대 12칸) */
function vineSpread(sim: BattleSim, t: Tower): void {
  const max = t.spec.p?.maxTiles ?? 12;
  const have = sim.fields.filter((f) => f.kind === 'VINE' && f.tower === t.id);
  const sec = t.spec.p?.spreadSec ?? 10;
  if (have.length >= max || (have.length > 0 && sim.tick < (t.aux.vineNext ?? 0))) return;
  t.aux.vineNext = sim.tick + tk(sec);
  const tiles = freePathTiles(sim, t, 7, have);
  const base = have.length ? have[have.length - 1] : { x: t.x, y: t.y };
  tiles.sort((a, b) => dist(a, base) - dist(b, base));
  const p = tiles[0];
  if (!p) return;
  sim.addField({
    kind: 'VINE',
    tower: t.id,
    x: p.x,
    y: p.y,
    r: 0.55,
    left: -1,
    period: 30,
    nextTick: sim.tick + 30,
    fx: t.spec.fx,
    v: { dmg: t.stats.dmg, air: 0 },
    on: [{ k: 'SLOW', amt: t.spec.p?.slow ?? 0.35, dur: 0.7 }],
    type: 'PHYS',
  });
}

// ---------- 광선 ----------
export function beamTick(sim: BattleSim, t: Tower): void {
  const eff = sim.eff(t);
  const list = inRange(sim, t);
  const beams =
    (t.aux.beams ?? 1) +
    (t.branch === 'A' ? 1 : 0) +
    (t.bloomLeft > 0 ? (t.aux.bloomBeams ?? 0) : 0);
  const prevId = t.aux.beamTarget ?? 0;
  let target = list.find((e) => e.uid === prevId) ?? null;
  if (!target) {
    target = pickTarget(sim, t, list);
    t.aux.beamHeld = 0;
  }
  if (!target) {
    t.aux.beamTarget = 0;
    t.aux.beamHeld = 0;
    return;
  }
  t.aux.beamTarget = target.uid;
  t.aux.beamHeld = (t.aux.beamHeld ?? 0) + 1;
  const p = t.spec.p ?? {};
  let ramp = p.ramp ?? 2;
  let rampSec = p.rampSec ?? 4;
  if (t.branch === 'B') {
    ramp *= 1.5;
    rampSec = 6;
  }
  if (familyOf(t.spec.id) === 'LUMEN' && sim.synergyTier('LUMEN') >= 3) ramp = 1 + (ramp - 1) * 1.5;
  let speed = 1;
  let maxAdd = 0;
  for (const a of sim.towers) {
    if (a.spec.id === 'P078' && a.down <= 0 && dist(a, t) <= a.stats.range) {
      speed = 2;
      maxAdd = a.bloomLeft > 0 ? 99 : 0.3;
      if (a.bloomLeft > 0) t.aux.beamHeld = Math.max(t.aux.beamHeld, tk(rampSec));
    }
  }
  const f = rampSec > 0 ? Math.min(1, (t.aux.beamHeld * speed) / tk(rampSec)) : 1;
  const mult =
    t.bloomLeft > 0 && t.aux.maxRamp ? ramp : (1 + (ramp - 1) * f) * (1 + (f >= 1 ? maxAdd : 0));
  const dps = t.stats.dmg * eff.dmg * mult;
  const targets: Enemy[] = [target];
  if (p.revealAll || t.aux.pierceBloom) {
    // 일직선 관통
    const a = Math.atan2(target.y - t.y, target.x - t.x);
    for (const e of list)
      if (e !== target) {
        const px = e.x - t.x;
        const py = e.y - t.y;
        const along = px * Math.cos(a) + py * Math.sin(a);
        const across = Math.abs(-px * Math.sin(a) + py * Math.cos(a));
        if (along > 0 && across < 0.5) targets.push(e);
      }
  }
  if (beams > 1)
    for (const e of list) if (!targets.includes(e) && targets.length < beams) targets.push(e);
  for (const e of targets) {
    dealDamage(sim, e, dps / 60, t, {
      type: t.spec.type,
      ignoreArmor: false,
      quiet: sim.tick % 6 !== 0,
      fx: t.spec.fx,
    });
    if (sim.tick % 60 === 0)
      for (const s of onHitList(sim, t)) applyStatus(sim, e, s, t, statusExtra(sim, t));
    if (p.revealAll) e.revealed = sim.tick + tk(1.5);
  }
  t.gauge = Math.min(1, t.gauge + 0.0004 * targets.length);
}

// ---------- 생산 ----------
export function produceTick(sim: BattleSim, t: Tower): void {
  if (t.cd > 0) {
    t.cd--;
    return;
  }
  t.cd = Math.max(2, tk(sim.eff(t).interval));
  let amt = t.stats.dmg * (t.aux.prodMul || 1) * (t.bloomLeft > 0 ? (t.aux.bloomProd ?? 1) : 1);
  if (sim.synergyTier('BLOOM') >= 2) amt *= 1.15;
  sim.nutrient += amt;
  t.support += amt;
  t.gauge = Math.min(1, t.gauge + 0.02);
  sim.emit({ t: 'ring', x: t.x, y: t.y, r: 0.4, fx: t.spec.fx, kind: 'produce' });
}

// ---------- 설치 ----------
const TRAP_KINDS = new Set(['TRAP', 'PATCH', 'COTTON']);

export function trapTick(sim: BattleSim, t: Tower): void {
  const mine = sim.fields.filter((f) => TRAP_KINDS.has(f.kind) && f.tower === t.id);
  const max = (t.spec.p?.max ?? 3) + (t.aux.maxAdd ?? 0) + (t.branch === 'A' ? 2 : 0);
  if (t.cd > 0) {
    t.cd--;
    return;
  }
  if (mine.length >= max) return;
  const spots = freePathTiles(sim, t, sim.eff(t).range, mine);
  const p = spots[0];
  if (!p) return;
  t.cd = Math.max(2, tk(sim.eff(t).interval));
  const kind =
    t.spec.special === 'POISON_PATCH' ? 'PATCH' : t.spec.special === 'COTTON' ? 'COTTON' : 'TRAP';
  sim.addField({
    kind,
    tower: t.id,
    x: p.x,
    y: p.y,
    r: 0.5,
    left: -1,
    period: 6,
    nextTick: 0,
    fx: t.spec.fx,
    v: {
      uses: t.spec.p?.uses ?? 1,
      s: nearestOnRoute(sim.map.routes[0], p.x, p.y).s,
      air: t.spec.flags?.includes('AA') ? 1 : 0,
    },
    on: onHitList(sim, t),
    type: t.spec.type,
  });
  sim.emit({ t: 'ring', x: p.x, y: p.y, r: 0.5, fx: t.spec.fx, kind: 'trapSet' });
}

// ---------- 장벽 ----------
export function wallTick(sim: BattleSim, t: Tower): void {
  const hold = (t.spec.p?.hold ?? 2) + (t.branch === 'A' ? 1 : 0);
  if (!t.aux.hpSet) {
    t.aux.hpSet = 1;
    if (t.branch === 'A') t.maxHp *= 2;
  }
  const near = sim.enemiesNear(t.x, t.y, 0.55, { air: false }).filter((e) => !e.aux.leap);
  near.sort((a, b) => b.s - a.s);
  const held = near.slice(0, hold);
  const invuln = t.bloomLeft > 0 && t.spec.bloom.kind === 'INVULN';
  const reflect = invuln ? 1 : (t.spec.p?.reflect ?? 0.3) + (t.branch === 'B' ? 0.3 : 0);
  for (const e of held) {
    e.aux.blockedUntil = sim.tick + 4;
    if (sim.tick % 30 === 0) {
      const dps = 6 + sim.wave * 0.8;
      if (!invuln) t.hp -= dps / 2;
      dealDamage(sim, e, (t.stats.dmg * (t.branch === 'B' ? 3 : 1)) / 2 + (dps / 2) * reflect, t, {
        type: 'PHYS',
        quiet: false,
      });
    }
  }
  if (t.hp <= 0) {
    t.down = tk(12);
    t.hp = 0;
    sim.emit({ t: 'down', tower: t.id });
  }
}

// ---------- 소환 ----------
export function summonTick(sim: BattleSim, t: Tower): void {
  const mine = sim.summons.filter((s) => s.tower === t.id);
  const p = t.spec.p ?? {};
  const max =
    (p.max ?? 2) +
    (t.aux.maxAdd ?? 0) +
    (t.bloomLeft > 0 ? (t.aux.maxAddBloom ?? 0) : 0) +
    (t.branch === 'A' ? 2 : 0);
  if (mine.length < max) {
    if (t.cd > 0) {
      t.cd--;
      return;
    }
    t.cd = tk(p.resummon ?? 8);
    const blocker = !!p.block;
    const hp = (p.hp ?? 80) * (t.branch === 'B' ? 2 : 1) * (t.stats.dmg / Math.max(1, t.spec.dmg));
    let pos: Vec = { x: t.x + 0.4, y: t.y };
    if (blocker) pos = freePathTiles(sim, t, 1.6, mine)[0] ?? pos;
    sim.addSummon({
      tower: t.id,
      x: pos.x,
      y: pos.y,
      hp,
      maxHp: hp,
      cd: 0,
      holding: [],
      kind: blocker ? 'BLOCKER' : 'WISP',
      life: -1,
      dmg: t.stats.dmg * (t.branch === 'B' ? 2 : 1),
      fx: t.spec.fx,
    });
    sim.emit({ t: 'ring', x: pos.x, y: pos.y, r: 0.5, fx: t.spec.fx, kind: 'summon' });
  }
}

function summonsStep(sim: BattleSim): void {
  for (const s of sim.summons) {
    const owner = sim.towerById(s.tower);
    if (s.cd > 0) s.cd--;
    if (s.kind === 'WISP' || s.kind === 'LADYBUG') {
      const range = s.kind === 'LADYBUG' ? 99 : (owner?.stats.range ?? 3) + 1;
      const cx = owner ? owner.x : s.x;
      const cy = owner ? owner.y : s.y;
      const list = sim.enemiesNear(cx, cy, range).filter((e) => e.alive);
      let tgt: Enemy | null = null;
      for (const e of list)
        if (!tgt || (s.kind === 'LADYBUG' ? e.hp < tgt.hp : dist(e, s) < dist(tgt, s))) tgt = e;
      if (tgt) {
        const d = dist(tgt, s);
        const step = 3 / 60;
        if (d > 0.35) {
          s.x += ((tgt.x - s.x) / d) * step;
          s.y += ((tgt.y - s.y) / d) * step;
        } else if (s.cd <= 0) {
          s.cd = s.kind === 'LADYBUG' ? 30 : 48;
          dealDamage(sim, tgt, s.dmg, owner, {
            type: owner?.spec.type ?? 'PHYS',
            fx: s.fx,
            area: false,
          });
          if (owner)
            applyStatus(sim, tgt, owner.spec.on?.[0] ?? { k: 'SLOW', amt: 0, dur: 0 }, owner);
        }
      } else if (owner) {
        s.x += (owner.x + 0.5 - s.x) * 0.02;
        s.y += (owner.y - 0.4 - s.y) * 0.02;
      }
      if (s.life > 0 && --s.life <= 0) s.hp = 0;
    } else if (s.kind === 'BLOCKER') {
      const near = sim.enemiesNear(s.x, s.y, 0.6, { air: false }).slice(0, 2);
      s.holding = near.map((e) => e.uid);
      for (const e of near) {
        e.aux.blockedUntil = sim.tick + 4;
        if (s.cd <= 0 && near[0] === e) {
          s.cd = 48;
          dealDamage(sim, e, s.dmg, owner, { type: owner?.spec.type ?? 'PHYS', fx: s.fx });
        }
        if (owner && owner.bloomLeft > 0 && owner.aux.heldMark) {
          e.mark = Math.max(e.mark, owner.aux.heldMark);
          e.markUntil = sim.tick + 20;
        }
      }
      if (sim.tick % 30 === 0) s.hp -= (near.length * (6 + sim.wave * 0.6)) / 2;
    } else if (s.kind === 'SPIRIT') {
      // 새싹 혼령: 길을 거꾸로 걸으며 닿는 적을 벤다
      s.life--;
      const near = sim.enemiesNear(s.x, s.y, 0.6);
      if (sim.tick % 30 === 0)
        for (const e of near) dealDamage(sim, e, s.dmg / 2, owner, { type: 'SPIRIT', fx: s.fx });
      s.x -= 0.4 / 60;
      if (s.life <= 0) s.hp = 0;
    }
  }
  sim.summons = sim.summons.filter((s) => {
    if (s.hp > 0) return true;
    sim.emit({ t: 'ring', x: s.x, y: s.y, r: 0.4, fx: s.fx, kind: 'summonGone' });
    return false;
  });
}

// ---------- 땅에 남는 효과 ----------
export function fieldTick(sim: BattleSim): void {
  const keep: Field[] = [];
  for (const f of sim.fields) {
    const owner = sim.towerById(f.tower);
    if (owner === null && f.tower > 0 && !['ROLL', 'RAIN', 'DECOY'].includes(f.kind)) continue;
    let remove = false;
    if (TRAP_KINDS.has(f.kind)) remove = trapStep(sim, f, owner);
    else if (sim.tick >= f.nextTick) {
      f.nextTick = sim.tick + f.period;
      const air = f.v.air ? undefined : false;
      for (const e of sim.enemiesNear(f.x, f.y, f.r, { air })) {
        if (f.v.dmg) dealDamage(sim, e, f.v.dmg, owner, { type: f.type, area: true, fx: f.fx });
        if (e.alive)
          for (const s of f.on) applyStatus(sim, e, s, owner, owner ? statusExtra(sim, owner) : {});
        if (f.kind === 'DECOY') e.aux.blockedUntil = sim.tick + 20;
      }
    }
    if (f.kind === 'DECOY')
      for (const e of sim.enemiesNear(f.x, f.y, 0.6, { air: false }))
        e.aux.blockedUntil = sim.tick + 4;
    if (f.left > 0 && --f.left === 0) remove = true;
    if (!remove) keep.push(f);
  }
  sim.fields = keep;
  summonsStep(sim);
  sim.runDelayed();
}

/** 함정 발동. 쓰고 나면 true(제거) */
function trapStep(sim: BattleSim, f: Field, owner: Tower | null): boolean {
  if (!owner) return true;
  if (f.kind === 'COTTON') {
    // 솜: 입구 쪽으로 천천히 떠간다
    f.v.s = Math.max(0, f.v.s - 0.3 / 60);
    const p = posAt(sim.map.routes[0], f.v.s);
    f.x = p.x;
    f.y = p.y;
  }
  const hit = sim.enemiesNear(f.x, f.y, f.r, { air: f.v.air ? undefined : false });
  if (hit.length === 0) return false;
  const spec = owner.spec;
  const extra = statusExtra(sim, owner);
  const splash = spec.splash ?? 0;
  const targets =
    splash > 0
      ? sim.enemiesNear(f.x, f.y, splash, { air: f.v.air ? undefined : false })
      : hit.slice(0, 1);
  sim.emit({ t: 'ring', x: f.x, y: f.y, r: Math.max(0.6, splash), fx: f.fx, kind: 'trapHit' });
  for (const e of targets) {
    if (owner.stats.dmg > 0)
      dealDamage(sim, e, owner.stats.dmg * (owner.branch === 'B' ? 1.8 : 1), owner, {
        type: f.type,
        area: splash > 0,
        fx: f.fx,
      });
    if (e.alive) for (const s of f.on) applyStatus(sim, e, s, owner, extra);
  }
  if (f.kind === 'PATCH') {
    // 독 전염: 밟은 적 주변에도 독
    for (const e of sim.enemiesNear(hit[0].x, hit[0].y, 1.0))
      applyStatus(sim, e, { k: 'POISON', n: 1 }, owner, extra);
    f.v.uses--;
    return f.v.uses <= 0;
  }
  return true;
}
