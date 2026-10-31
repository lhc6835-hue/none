// 투사체 이동 · 명중 · 착탄 (Attacks.ts 에서 나눔)

import type { BattleSim } from './BattleSim';
import { dealDamage } from './Damage';
import { applyStatus } from './Status';
import { statusExtra } from './Targeting';
import { tk, type Enemy, type Projectile, type Tower } from './types';

// ---------- 투사체 ----------
function applyHit(sim: BattleSim, p: Projectile, e: Enemy, t: Tower | null, area = false): void {
  if (!e.alive) return;
  const extra = t ? statusExtra(sim, t) : {};
  dealDamage(sim, e, p.dmg, t, {
    type: p.type,
    area,
    crit: p.crit,
    ignoreArmor: p.ignoreArmor,
    fx: p.fx,
  });
  if (t?.spec.special === 'ETERNAL_FLAME') extra.burnCap = (extra.burnCap ?? 0) + 15;
  if (e.alive) for (const s of p.on) applyStatus(sim, e, s, t, extra);
  if (t?.spec.special === 'ETERNAL_FLAME' && e.burn > 0) e.aux.eternal = 1;
}

export function projectileTick(sim: BattleSim): void {
  const keep: Projectile[] = [];
  for (const p of sim.projectiles) {
    const t = sim.towerById(p.tower);
    let done = false;
    if (p.kind === 'lob') {
      p.t++;
      if (p.t >= p.dur) {
        landLob(sim, p, t);
        done = true;
      } else if (p.t >= 0) {
        const f = p.t / p.dur;
        p.x = p.sx + (p.tx - p.sx) * f;
        p.y = p.sy + (p.ty - p.sy) * f;
      }
    } else if (p.kind === 'homing') {
      let tgt = sim.enemyByUid(p.target);
      if (!tgt) {
        const near = sim.enemiesNear(p.x, p.y, 2.5);
        tgt = near[0] ?? null;
        if (tgt) p.target = tgt.uid;
      }
      const gx = tgt ? tgt.x : p.tx;
      const gy = tgt ? tgt.y : p.ty;
      const dx = gx - p.x;
      const dy = gy - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed / 60;
      if (d <= step + 0.15) {
        if (tgt) applyHit(sim, p, tgt, t);
        done = true;
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
        p.dir = Math.atan2(dy, dx);
      }
      if (--p.life < -60) done = true;
    } else {
      const step = p.speed / 60;
      p.x += Math.cos(p.dir) * step;
      p.y += Math.sin(p.dir) * step;
      for (const e of sim.enemiesNear(p.x, p.y, 0.45)) {
        if (p.hit.has(e.uid)) continue;
        p.hit.add(e.uid);
        applyHit(sim, p, e, t);
        if (--p.pierce <= 0) {
          done = true;
          break;
        }
      }
      if (--p.life <= 0) done = true;
    }
    if (!done) keep.push(p);
  }
  sim.projectiles = keep;
}

function landLob(sim: BattleSim, p: Projectile, t: Tower | null): void {
  const r = p.splash;
  sim.emit({ t: 'ring', x: p.tx, y: p.ty, r, fx: p.fx, kind: 'impact' });
  for (const e of sim.enemiesNear(p.tx, p.ty, r, { air: p.aa ? undefined : false }))
    applyHit(sim, p, e, t, true);
  if (p.aux.seeds > 0) {
    // 석류 씨앗 파편: 주변 적에게 흩어짐
    const near = sim.enemiesNear(p.tx, p.ty, 1.6);
    for (let i = 0; i < p.aux.seeds && near.length; i++) {
      const e = near[i % near.length];
      dealDamage(sim, e, p.aux.seedDmg, t, { type: 'PHYS', area: true, fx: p.fx });
    }
  }
  if (p.aux.cloud > 0 && t) {
    sim.addField({
      kind: 'CLOUD',
      tower: t.id,
      x: p.tx,
      y: p.ty,
      r: 0.9,
      left: tk(p.aux.cloud),
      period: 30,
      nextTick: sim.tick + 30,
      fx: p.fx,
      v: { n: 1 },
      on: [{ k: 'POISON', n: 1 }],
      type: 'POISON',
    });
  }
  if (t && t.branch === 'A' && t.spec.arch === 'LOB') {
    for (let i = 0; i < 3; i++) {
      const near = sim.enemiesNear(p.tx, p.ty, 1.5);
      if (near.length)
        dealDamage(sim, near[(i + sim.tick) % near.length], p.dmg * 0.3, t, {
          type: p.type,
          area: true,
          fx: p.fx,
        });
    }
  }
  if (t && t.branch === 'B' && t.spec.arch === 'LOB')
    for (const e of sim.enemiesNear(p.tx, p.ty, r)) applyStatus(sim, e, { k: 'STUN', dur: 0.5 }, t);
}
