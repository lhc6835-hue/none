// 특수 능력의 패시브 · 주기 효과와 적이 죽을 때의 효과 (Specials.ts 에서 나눔)

import { dealDamage } from './Damage';
import type { BattleSim } from './BattleSim';
import { applyStatus } from './Status';
import { familyOf } from './Towers';
import { tk, type Enemy, type Tower } from './types';

/** 매 틱: 패시브 · 주기 효과 */
export function specialTick(sim: BattleSim, t: Tower): void {
  const id = t.spec.id;
  const n = sim.tick;
  switch (id) {
    case 'P050':
      if (n % tk(t.spec.p?.stockSec ?? 3) === 0 && (t.aux.stock ?? 0) < (t.spec.p?.max ?? 5))
        t.aux.stock = (t.aux.stock ?? 0) + 1;
      break;
    case 'P086':
      if (n % tk(60) === 0) t.aux.targetsAdd = Math.min(3, (t.aux.targetsAdd ?? 0) + 1);
      break;
    case 'P087': {
      // 비구름: 비행 적 지속 피해 + 둔화, 지상 적은 젖음
      if (n % 6 !== 0) break;
      const r = sim.eff(t).range;
      for (const e of sim.enemiesNear(t.x, t.y, r)) {
        if (e.flying) {
          dealDamage(sim, e, ((t.stats.dmg * 6) / 60) * (t.bloomLeft > 0 ? 1 : 1), t, {
            type: 'ELEC',
            quiet: true,
          });
          applyStatus(
            sim,
            e,
            {
              k: 'SLOW',
              amt: t.bloomLeft > 0 ? (t.spec.bloom.p?.slow ?? 0.6) : (t.spec.p?.slow ?? 0.4),
              dur: 0.3,
            },
            t,
          );
        } else applyStatus(sim, e, { k: 'WET', dur: 3 }, t);
      }
      if (t.bloomLeft > 0)
        for (const e of sim.enemies) if (e.alive) applyStatus(sim, e, { k: 'WET', dur: 1 }, t);
      break;
    }
    case 'P034':
      if (n % tk(4) === 0) healAround(sim, t, t.spec.p?.heal ?? 0.08);
      break;
    case 'P090':
      if (n % tk(15) === 0) {
        sim.emit({ t: 'ring', x: t.x, y: t.y, r: 12, fx: t.spec.fx, kind: 'wave' });
        for (const e of sim.enemies)
          if (e.alive)
            applyStatus(
              sim,
              e,
              {
                k: 'KNOCK',
                amt: t.spec.p?.wave ?? 1.5,
                boss: { k: 'KNOCK', amt: t.spec.p?.waveBoss ?? 0.5 },
              },
              t,
            );
      }
      break;
    case 'P099':
      if (n % tk(t.spec.p?.period ?? 14) === tk(1)) {
        sim.emit({ t: 'ring', x: t.x, y: t.y, r: t.spec.p?.r ?? 3.5, fx: t.spec.fx, kind: 'time' });
        for (const e of sim.enemiesNear(t.x, t.y, t.spec.p?.r ?? 3.5))
          applyStatus(
            sim,
            e,
            {
              k: 'SLOW',
              amt: t.spec.p?.slow ?? 0.6,
              dur: t.spec.p?.slowSec ?? 3,
              boss: { k: 'SLOW', amt: 0.4, dur: 3 },
            },
            t,
          );
        t.aux.timeOn = n + tk(t.spec.p?.slowSec ?? 3);
      }
      break;
    case 'P096':
      if (n % tk(5) === 0) {
        for (const e of sim.enemiesNear(t.x, t.y, sim.eff(t).range)) {
          e.aux.shield = 0;
          e.aux.regen = 0;
          e.aux.speedBonus = 0;
          e.stealth = false;
          dealDamage(sim, e, t.stats.dmg, t, { type: 'SPIRIT', fx: t.spec.fx });
        }
      }
      break;
    case 'P040':
      if (n % tk(30) === 0)
        for (const a of sim.towers)
          if (a.down > 0) {
            a.down = 1;
          }
      break;
    default:
      break;
  }
  void familyOf;
}

function healAround(sim: BattleSim, t: Tower, frac: number): void {
  for (const a of sim.towers) {
    if (Math.hypot(a.x - t.x, a.y - t.y) > sim.eff(t).range) continue;
    a.hp = Math.min(a.maxHp, a.hp + a.maxHp * frac);
    a.buffs = a.buffs.filter((b) => b.aspd >= 0);
    a.support += 0.05;
  }
}

/** 적이 죽을 때 */
export function onKillHooks(sim: BattleSim, e: Enemy, src: Tower | null): void {
  for (const t of sim.towers) {
    if (t.down > 0) continue;
    const id = t.spec.id;
    const d = Math.hypot(t.x - e.x, t.y - e.y);
    if (id === 'P029' && d <= sim.eff(t).range) {
      const have = sim.fields.filter((f) => f.kind === 'SPORE' && f.tower === t.id).length;
      if (have < (t.spec.p?.max ?? 6))
        sim.addField({
          kind: 'SPORE',
          tower: t.id,
          x: e.x,
          y: e.y,
          r: t.spec.p?.r ?? 0.8,
          left: tk(t.spec.p?.life ?? 20),
          period: 60,
          nextTick: sim.tick + 60,
          fx: t.spec.fx,
          v: { dmg: 0, air: 0 },
          on: [{ k: 'POISON', n: 2 }],
          type: 'POISON',
        });
    }
    if (
      id === 'P100' &&
      d <= sim.eff(t).range &&
      (sim.tick < (t.aux.reincAll ?? 0) ? !e.boss : sim.rng.chance(t.spec.p?.chance ?? 0.25))
    ) {
      const mine = sim.summons.filter((s) => s.tower === t.id && s.kind === 'SPIRIT').length;
      if (mine < (t.spec.p?.max ?? 5)) {
        const hp = e.maxHp * (t.spec.p?.hpFrac ?? 0.3);
        sim.addSummon({
          tower: t.id,
          x: e.x,
          y: e.y,
          hp,
          maxHp: hp,
          cd: 0,
          holding: [],
          kind: 'SPIRIT',
          life: tk(20),
          dmg: t.spec.p?.dps ?? 30,
          fx: t.spec.fx,
        });
        sim.emit({ t: 'ring', x: e.x, y: e.y, r: 0.6, fx: t.spec.fx, kind: 'reincarnate' });
      }
    }
    if (id === 'P097' && e.aux.shadow === t.id) {
      const near = sim
        .enemiesNear(e.x, e.y, 99)
        .filter((x) => x !== e)
        .sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
      if (near) {
        const m = Math.min(t.spec.p?.max ?? 0.4, e.mark + (t.spec.p?.step ?? 0.05));
        applyStatus(sim, near, { k: 'MARK', amt: m, dur: 60 }, t);
        near.aux.shadow = t.id;
      }
    }
  }
  if (src?.spec.id === 'P058') {
    sim.emit({ t: 'ring', x: e.x, y: e.y, r: 0.8, fx: src.spec.fx, kind: 'impact' });
    for (const x of sim.enemiesNear(e.x, e.y, src.spec.p?.explodeR ?? 0.8))
      dealDamage(sim, x, e.maxHp * (src.spec.p?.explode ?? 0.15), src, {
        type: 'FIRE',
        area: true,
        fx: src.spec.fx,
      });
  }
  // 계열 시너지(06문서 10절)
  if (e.poison > 0 && sim.synergyTier('FUNGUS') >= 2)
    for (const x of sim.enemiesNear(e.x, e.y, 1)) applyStatus(sim, x, { k: 'POISON', n: 3 }, null);
  if (e.burn > 0 && sim.synergyTier('EMBER') >= 2) {
    sim.emit({
      t: 'ring',
      x: e.x,
      y: e.y,
      r: 0.8,
      fx: src?.spec.fx ?? { shape: 'flame', color: ['R7', 3], hit: 'ember' },
      kind: 'impact',
    });
    for (const x of sim.enemiesNear(e.x, e.y, 0.8))
      dealDamage(sim, x, e.maxHp * 0.1, src, { type: 'FIRE', area: true });
  }
}
