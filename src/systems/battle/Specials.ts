// 특수 능력 24종과 계열 시너지의 처치 효과 (07문서 '특수' 아키타입)
// SPECIAL_ATTACK: 쿨다운마다 한 번 실행하고 쐈으면 true. specialTick: 매 틱 도는 패시브 · 주기 효과. onKillHooks: 적이 죽을 때.

import { dealDamage } from './Damage';
import type { BattleSim } from './BattleSim';
import { fireShoot, strike } from './Attacks';
import { posAt, nearestOnRoute } from './Paths';
import { applyStatus } from './Status';
import { inRange, pickTarget, statusExtra, strongest } from './Targeting';
import { tk, type Enemy, type Tower } from './types';

type Fn = (sim: BattleSim, t: Tower) => boolean;

/** 가장 많이 모인 곳의 중심(반경 r 안의 적이 가장 많은 적의 위치) */
export function densest(list: Enemy[], r: number): { x: number; y: number; n: number } | null {
  let best: { x: number; y: number; n: number } | null = null;
  for (const c of list) {
    let n = 0;
    for (const e of list) if (Math.hypot(e.x - c.x, e.y - c.y) <= r) n++;
    if (!best || n > best.n) best = { x: c.x, y: c.y, n };
  }
  return best;
}

const shot = (sim: BattleSim, t: Tower, e: Enemy, kind: string) =>
  sim.emit({
    t: 'shot',
    tower: t.id,
    from: { x: t.x, y: t.y },
    to: { x: e.x, y: e.y },
    kind,
    fx: t.spec.fx,
    target: e.uid,
  });

const nonBoss = (l: Enemy[]) => l.filter((e) => !e.boss);

export const SPECIAL_ATTACK: Record<string, Fn> = {
  /** 당김줄 호박덩굴: 선두 적을 뒤로 끌어당김(지상만) */
  PULL(sim, t) {
    const e = pickTarget(sim, t, inRange(sim, t));
    if (!e) return false;
    shot(sim, t, e, 'homing');
    strike(sim, t, e, t.stats.dmg, { noStatus: true });
    if (e.alive) applyStatus(sim, e, { k: 'PULL', amt: t.spec.p?.pull ?? 1.5 }, t);
    return true;
  },
  /** 밤의 덩굴손: 가장 많이 모인 3×3 영역 속박 */
  GRASP(sim, t) {
    const all = sim.enemies.filter((e) => e.alive && !e.flying);
    const c = densest(all, 1.5);
    if (!c) return false;
    const mul = t.spec.p?.nightMul ?? 1;
    sim.emit({ t: 'ring', x: c.x, y: c.y, r: 1.5, fx: t.spec.fx, kind: 'grasp' });
    for (const e of sim.enemiesNear(c.x, c.y, 1.5, { air: false })) {
      dealDamage(sim, e, t.stats.dmg * (sim.stage.night ? mul : 1), t, {
        type: 'PHYS',
        area: true,
        fx: t.spec.fx,
      });
      applyStatus(sim, e, { k: 'BIND', dur: t.spec.p?.bind ?? 2 }, t, statusExtra(sim, t));
    }
    return true;
  },
  /** 천침 대왕가시나무: 사거리 안 최대 8명에게 가시 1개씩, 장갑 −1 */
  NEEDLES(sim, t) {
    const list = inRange(sim, t)
      .sort((a, b) => b.s - a.s)
      .slice(0, t.spec.p?.max ?? 8);
    if (!list.length) return false;
    for (const e of list) {
      shot(sim, t, e, 'instant');
      strike(sim, t, e, t.stats.dmg, { on: [{ k: 'SHRED', amt: 1, dur: 5, n: 10 }] });
    }
    return true;
  },
  /** 홀림 튤립: 가장 강한 비보스 적을 뒷걸음 */
  CHARM(sim, t) {
    const e = strongest(nonBoss(inRange(sim, t)));
    if (!e) return false;
    shot(sim, t, e, 'homing');
    strike(sim, t, e, t.stats.dmg, { noStatus: true });
    if (e.alive)
      applyStatus(sim, e, { k: 'CHARM', dur: t.spec.p?.dur ?? 2 }, t, statusExtra(sim, t));
    return true;
  },
  /** 자장가 은방울꽃: 범위 안 비보스 수면 */
  LULLABY(sim, t) {
    const list = inRange(sim, t);
    if (!list.length) return false;
    sim.emit({ t: 'ring', x: t.x, y: t.y, r: sim.eff(t).range, fx: t.spec.fx, kind: 'note' });
    for (const e of list) {
      strike(sim, t, e, t.stats.dmg, { noStatus: true });
      if (!e.alive) continue;
      applyStatus(
        sim,
        e,
        e.boss ? { k: 'SLOW', amt: 0.4, dur: 2 } : { k: 'SLEEP', dur: t.spec.p?.dur ?? 2 },
        t,
      );
    }
    return true;
  },
  /** 데굴 야자열매: 길을 굴러가며 지상 적에게 피해 + 넉백 */
  ROLL(sim, t) {
    const route = sim.map.routes[0];
    const near = nearestOnRoute(route, t.x, t.y).s;
    const len = (t.spec.p?.tiles ?? 4) * (t.aux.rollMul ?? 1);
    const hit = sim.enemies.filter(
      (e) => e.alive && !e.flying && e.route === 0 && e.s <= near + 0.6 && e.s >= near - len,
    );
    if (!hit.length) return false;
    const a = posAt(route, near);
    const b = posAt(route, Math.max(0, near - len));
    sim.emit({ t: 'shot', tower: t.id, from: a, to: b, kind: 'roll', fx: t.spec.fx });
    for (const e of hit) {
      dealDamage(sim, e, t.stats.dmg * (t.aux.rollMul ?? 1), t, {
        type: 'PHYS',
        area: true,
        fx: t.spec.fx,
      });
      applyStatus(sim, e, { k: 'KNOCK', amt: t.spec.p?.knock ?? 0.3 }, t);
    }
    return true;
  },
  /** 별똥 사과나무: HP 가장 높은 적에게 운석 */
  METEOR(sim, t) {
    const e = strongest(sim.enemies.filter((x) => x.alive && !x.flying));
    if (!e) return false;
    sim.emit({
      t: 'shot',
      tower: t.id,
      from: { x: e.x, y: e.y - 6 },
      to: { x: e.x, y: e.y },
      kind: 'meteor',
      fx: t.spec.fx,
      target: e.uid,
    });
    const pos = { x: e.x, y: e.y };
    sim.after(0.5, () => {
      sim.emit({ t: 'ring', x: pos.x, y: pos.y, r: 1.0, fx: t.spec.fx, kind: 'impact' });
      for (const x of sim.enemiesNear(pos.x, pos.y, t.spec.p?.splash ?? 1, { air: false })) {
        dealDamage(sim, x, t.stats.dmg * (x === e ? 1 : (t.spec.p?.splashMul ?? 0.5)), t, {
          type: 'PHYS',
          area: true,
          fx: t.spec.fx,
        });
        applyStatus(sim, x, { k: 'STUN', dur: t.spec.p?.stun ?? 1 }, t);
      }
    });
    return true;
  },
  /** 오로라 열매탑: 저장한 열매를 0.3초 간격으로 던진다(불 · 얼음 · 독) */
  STOCKPILE(sim, t) {
    if ((t.aux.stock ?? 0) <= 0) return false;
    const e = pickTarget(sim, t, inRange(sim, t));
    if (!e) return false;
    t.aux.stock--;
    throwFruit(sim, t, e);
    t.cd = tk(t.spec.p?.gap ?? 0.3);
    return false; // 쿨다운은 직접 정했다
  },
  /** 피닉스 깃털초: 주기적 화염 파동 */
  PHOENIX(sim, t) {
    const list = sim.enemiesNear(t.x, t.y, sim.eff(t).range);
    if (!list.length) return false;
    sim.emit({ t: 'ring', x: t.x, y: t.y, r: sim.eff(t).range, fx: t.spec.fx, kind: 'wave' });
    for (const e of list) strike(sim, t, e, t.stats.dmg, { area: true });
    return true;
  },
  /** 태양초: 가장 많이 모인 곳에 3×3 미니 태양 */
  MINI_SUN(sim, t) {
    const c = densest(
      sim.enemies.filter((e) => e.alive),
      1.5,
    );
    if (!c) return false;
    sim.addField({
      kind: 'SUN',
      tower: t.id,
      x: c.x,
      y: c.y,
      r: 1.5,
      left: tk(t.spec.p?.dur ?? 5),
      period: 30,
      nextTick: sim.tick + 30,
      fx: t.spec.fx,
      v: { dmg: t.stats.dmg / 2, air: 1 },
      on: [{ k: 'BURN', n: 1 }],
      type: 'FIRE',
    });
    sim.emit({ t: 'ring', x: c.x, y: c.y, r: 1.5, fx: t.spec.fx, kind: 'sun' });
    for (const e of sim.enemiesNear(c.x, c.y, 1.5, { hidden: true })) e.revealed = sim.tick + tk(5);
    return true;
  },
  /** 별자리 난초: 최대 5명에게 별 표식 → 3초 뒤 연결해서 피해 */
  CONSTELLATION(sim, t) {
    const list = inRange(sim, t)
      .sort((a, b) => b.hp - a.hp)
      .slice(0, t.spec.p?.n ?? 5);
    if (!list.length) return false;
    constellation(sim, t, list, t.spec.p?.delay ?? 3);
    return true;
  },
  /** 바람개비 클로버: 대상 지점 넉백 */
  GUST(sim, t) {
    const e = pickTarget(sim, t, inRange(sim, t));
    if (!e) return false;
    shot(sim, t, e, 'lob');
    sim.emit({ t: 'ring', x: e.x, y: e.y, r: 0.8, fx: t.spec.fx, kind: 'impact' });
    for (const x of sim.enemiesNear(e.x, e.y, 0.8, { air: false })) {
      strike(sim, t, x, t.stats.dmg, { area: true, noStatus: true });
      if (x.alive) applyStatus(sim, x, { k: 'KNOCK', amt: 0.3 }, t);
    }
    return true;
  },
  /** 회오리 갈대: 길 위 작은 회오리가 적을 실어 나른다 */
  TORNADO(sim, t) {
    const list = inRange(sim, t)
      .filter((e) => !e.flying)
      .sort((a, b) => b.s - a.s)
      .slice(0, t.spec.p?.carry ?? 4);
    if (!list.length) return false;
    sim.emit({ t: 'ring', x: list[0].x, y: list[0].y, r: 0.9, fx: t.spec.fx, kind: 'tornado' });
    for (const e of list) {
      strike(sim, t, e, t.stats.dmg, { area: true, noStatus: true });
      if (e.alive) applyStatus(sim, e, { k: 'KNOCK', amt: 1.0 }, t);
    }
    return true;
  },
  /** 오로라 번개버들: 사거리 안 모든 적에게 번개 3번 */
  THUNDER_ALL(sim, t) {
    const list = inRange(sim, t);
    if (!list.length) return false;
    for (const e of list) {
      for (let i = 0; i < (t.spec.p?.strikes ?? 3); i++) {
        shot(sim, t, e, 'instant');
        const wet = e.wetUntil > sim.tick;
        strike(sim, t, e, t.stats.dmg, { noStatus: true });
        if (wet && e.alive) applyStatus(sim, e, { k: 'STUN', dur: t.spec.p?.wetStun ?? 0.5 }, t);
      }
    }
    return true;
  },
  /** 달그림자 고목: 가장 강한 적에게 그림자 표식 */
  SHADOW_MARK(sim, t) {
    const list = inRange(sim, t);
    const e = strongest(list.filter((x) => x.mark <= 0)) ?? strongest(list);
    if (!e) return false;
    shot(sim, t, e, 'homing');
    strike(sim, t, e, t.stats.dmg, { on: [] });
    if (e.alive) {
      applyStatus(sim, e, { k: 'MARK', amt: t.spec.p?.mark ?? 0.2, dur: 60 }, t);
      e.aux.shadow = t.id;
    }
    return true;
  },
  /** 저승 꽃무릇: 1초마다 HP 10% 미만 비보스 처형 + 기본 공격 */
  REAPER(sim, t) {
    const list = inRange(sim, t);
    const thr = (t.bloomLeft > 0 ? t.aux.threshold : 0) || t.spec.p?.threshold || 0.1;
    const bonus = sim.synergyTier('SPIRIT') >= 2 ? 0.03 : 0;
    const doomed = list.find((e) => !e.boss && e.hp / e.maxHp < thr + bonus);
    if (doomed) {
      shot(sim, t, doomed, 'instant');
      sim.kill(doomed, t);
      sim.nutrient += t.spec.p?.nutrient ?? 3;
      t.support += 3;
      return true;
    }
    const e = pickTarget(sim, t, list);
    if (!e) return false;
    shot(sim, t, e, 'homing');
    strike(sim, t, e, t.stats.dmg);
    return true;
  },
  /** 달리 SPECIAL 이지만 일반 사수처럼 쏘는 종 */
  REINCARNATE(sim, t) {
    const e = pickTarget(sim, t, inRange(sim, t));
    if (!e) return false;
    fireShoot(sim, t, e);
    return true;
  },
  TIME_FLOWER(sim, t) {
    const e = pickTarget(sim, t, inRange(sim, t));
    if (!e) return false;
    fireShoot(sim, t, e);
    return true;
  },
  /** 별무리 포자군락 · 균사왕: 범위 안에 독을 쌓는다 */
  SPORE_SWARM(sim, t) {
    const list = inRange(sim, t);
    if (!list.length) return false;
    for (const e of list) applyStatus(sim, e, { k: 'POISON', n: 2 }, t, statusExtra(sim, t));
    sim.emit({ t: 'ring', x: t.x, y: t.y, r: sim.eff(t).range, fx: t.spec.fx, kind: 'zone' });
    return true;
  },
  MYCELIUM(sim, t) {
    const list = inRange(sim, t)
      .sort((a, b) => b.s - a.s)
      .slice(0, t.stats.targets || 6);
    if (!list.length) return false;
    for (const e of list) {
      shot(sim, t, e, 'chain');
      applyStatus(sim, e, { k: 'POISON', n: 3 }, t, statusExtra(sim, t));
    }
    return true;
  },
  /** 미로뿌리: 길 칸을 엉킨 뿌리로 바꾼다 */
  TANGLE(sim, t) {
    if (t.aux.tangle) return false;
    t.aux.tangle = 1;
    const tiles: { x: number; y: number }[] = [];
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const tx = t.tx + dx;
        const ty = t.ty + dy;
        if (sim.map.tiles[ty]?.[tx] === 'PATH' && Math.hypot(dx, dy) <= sim.eff(t).range)
          tiles.push({ x: tx + 0.5, y: ty + 0.5 });
      }
    tiles.sort(
      (a, b) =>
        nearestOnRoute(sim.map.routes[0], b.x, b.y).s -
        nearestOnRoute(sim.map.routes[0], a.x, a.y).s,
    );
    for (const p of tiles.slice(0, t.spec.p?.tiles ?? 4)) {
      sim.addField({
        kind: 'TANGLE',
        tower: t.id,
        x: p.x,
        y: p.y,
        r: 0.55,
        left: -1,
        period: 30,
        nextTick: sim.tick + 30,
        fx: t.spec.fx,
        v: { dmg: t.stats.dmg, air: 0 },
        on: [{ k: 'SLOW', amt: t.spec.p?.slow ?? 0.4, dur: 0.7 }],
        type: 'PHYS',
      });
    }
    return false;
  },
  /** 섬광 달맞이꽃 */
  FLASH(sim, t) {
    const list = sim.enemiesNear(t.x, t.y, sim.eff(t).range);
    if (!list.length) return false;
    sim.emit({ t: 'ring', x: t.x, y: t.y, r: sim.eff(t).range, fx: t.spec.fx, kind: 'flash' });
    for (const e of list) strike(sim, t, e, t.stats.dmg, { area: true });
    return true;
  },
  /** 소용돌이 연잎(물 타일 전용) */
  WHIRLPOOL(sim, t) {
    const list = inRange(sim, t)
      .filter((e) => !e.flying)
      .sort((a, b) => b.s - a.s)
      .slice(0, t.spec.p?.n ?? 6);
    if (!list.length) return false;
    sim.emit({ t: 'ring', x: t.x, y: t.y, r: sim.eff(t).range, fx: t.spec.fx, kind: 'whirl' });
    for (const e of list) {
      strike(sim, t, e, t.stats.dmg, { area: true, noStatus: true });
      if (e.alive) {
        applyStatus(sim, e, { k: 'PULL', amt: t.spec.p?.pull ?? 1.5 }, t);
        for (const s of t.spec.on ?? []) applyStatus(sim, e, s, t);
      }
    }
    return true;
  },
};

function throwFruit(sim: BattleSim, t: Tower, e: Enemy): void {
  const k = sim.rng.int(0, 2);
  shot(sim, t, e, 'lob');
  strike(sim, t, e, t.stats.dmg, { noStatus: true, area: true });
  if (!e.alive) return;
  applyStatus(
    sim,
    e,
    k === 0 ? { k: 'BURN', n: 2 } : k === 1 ? { k: 'CHILL', n: 2 } : { k: 'POISON', n: 3 },
    t,
  );
}

export function constellation(sim: BattleSim, t: Tower, list: Enemy[], delay: number): void {
  for (const e of list) {
    e.aux.star = sim.tick + tk(delay);
    sim.emit({ t: 'status', enemy: e.uid, kind: 'MARK' });
  }
  const ids = list.map((e) => e.uid);
  sim.after(delay, () => {
    const alive = ids.map((id) => sim.enemyByUid(id)).filter((e): e is Enemy => !!e);
    for (let i = 0; i < alive.length; i++) {
      const e = alive[i];
      const n = alive[(i + 1) % alive.length];
      sim.emit({
        t: 'shot',
        tower: t.id,
        from: { x: e.x, y: e.y },
        to: { x: n.x, y: n.y },
        kind: 'chain',
        fx: t.spec.fx,
        target: n.uid,
      });
      dealDamage(sim, e, t.stats.dmg, t, { type: 'LIGHT', fx: t.spec.fx });
    }
    // 선 위를 지나는 적에게 50%
    for (let i = 0; i + 1 < alive.length; i++) {
      const a = alive[i];
      const b = alive[i + 1];
      for (const e of sim.enemies) {
        if (!e.alive || alive.includes(e)) continue;
        const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const across = Math.abs((e.x - a.x) * (b.y - a.y) - (e.y - a.y) * (b.x - a.x)) / l;
        const along = ((e.x - a.x) * (b.x - a.x) + (e.y - a.y) * (b.y - a.y)) / l;
        if (across < 0.5 && along > 0 && along < l)
          dealDamage(sim, e, t.stats.dmg * (t.spec.p?.lineMul ?? 0.5), t, {
            type: 'LIGHT',
            area: true,
          });
      }
    }
  });
}
