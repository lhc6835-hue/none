// 개화기 (06문서 8절): 게이지가 차면 자동 발동(수동으로 바꿀 수 있다). 그늘 · 이슬은 공통형, 햇살부터 종마다 고유 효과.

import type { StatusSpec } from '../../data/battle/types';
import type { BattleSim } from './BattleSim';
import { fireShoot, lobAt, strike } from './Attacks';
import { constellation, densest } from './Specials';
import { dealDamage } from './Damage';
import { applyStatus } from './Status';
import { inRange, pickTarget, statusExtra } from './Targeting';
import { tk, type Enemy, type Tower } from './types';

const GAUGE_PER_SEC = 0.01; // 초당 1%

export function bloomTick(sim: BattleSim, t: Tower): void {
  t.gauge = Math.min(1, t.gauge + GAUGE_PER_SEC / 60);
  if (t.bloomLeft > 0) {
    t.bloomLeft--;
    barrageTick(sim, t);
    if (t.bloomLeft === 0) endBloom(sim, t);
  } else if (t.gauge >= 1 && !t.manualBloom) triggerBloom(sim, t);
}

function endBloom(sim: BattleSim, t: Tower): void {
  for (const k of [
    'bloomAspd',
    'beams',
    'bloomBeams',
    'maxRamp',
    'pierceBloom',
    'rangeAdd',
    'bloomAura',
    'bloomProd',
    'dotMulBloom',
    'maxAddBloom',
    'heldMark',
    'threshold',
    'rollMul',
  ]) {
    if (
      t.spec.bloom.kind === 'BUFF_SELF' ||
      t.spec.bloom.kind === 'HASTE' ||
      t.spec.bloom.kind === 'ECON' ||
      t.spec.bloom.kind === 'CUSTOM'
    ) {
      if (k === 'beams' && t.spec.arch === 'BEAM') continue;
      if (k === 'rollMul') t.aux[k] = 0;
      else delete t.aux[k];
    }
  }
  void sim;
}

/** 모든 적(또는 사거리 안)에게 상태이상 묶음을 건다 */
function status(sim: BattleSim, t: Tower, list: Enemy[], on: StatusSpec[]): void {
  const extra = statusExtra(sim, t);
  for (const e of list) for (const s of on) applyStatus(sim, e, s, t, extra);
}

export function triggerBloom(sim: BattleSim, t: Tower): void {
  const b = t.spec.bloom;
  t.gauge = 0;
  t.bloomLeft = tk(b.dur ?? 0.1) || 1;
  const p = b.p ?? {};
  const range = sim.eff(t).range;
  sim.emit({ t: 'bloom', tower: t.id, name: `bloom.${t.spec.id}` });
  sim.emit({
    t: 'ring',
    x: t.x,
    y: t.y,
    r: Math.max(2, b.r || range),
    fx: t.spec.fx,
    kind: 'bloom',
  });
  switch (b.kind) {
    case 'HASTE':
      t.aux.bloomAspd = p.aspd ?? 0.5;
      break;
    case 'AREA_STATUS': {
      const list = sim.enemiesNear(t.x, t.y, b.r ? b.r : range, { hidden: true });
      status(sim, t, list, b.on ?? []);
      break;
    }
    case 'GLOBAL_STATUS':
      status(
        sim,
        t,
        sim.enemies.filter((e) => e.alive),
        b.on ?? [],
      );
      break;
    case 'UNLIMITED':
      break;
    case 'BARRAGE': {
      const dur = b.dur ?? 0;
      t.aux.barrageNext = sim.tick;
      t.aux.barrageLeft = p.count ?? (p.rate ? Math.round(p.rate * dur) : 1);
      t.aux.barrageGap = dur > 0 ? tk(dur) / Math.max(1, t.aux.barrageLeft) : 1;
      if (dur === 0) {
        // 즉시 연발(고드름 비)
        for (let i = 0; i < t.aux.barrageLeft; i++) barrageShot(sim, t);
        t.aux.barrageLeft = 0;
      }
      break;
    }
    case 'BUFF_SELF':
      if (p.beams) t.aux.bloomBeams = p.beams - 1;
      if (p.maxRamp) t.aux.maxRamp = 1;
      if (p.pierce) t.aux.pierceBloom = 1;
      if (p.rangeInf) t.aux.rangeAdd = 99;
      if (p.aspd) t.aux.bloomAspd = p.aspd - 1;
      if (p.dotMul) t.aux.dotMulBloom = p.dotMul;
      if (p.maxAdd) t.aux.maxAddBloom = p.maxAdd;
      if (p.heldMark) t.aux.heldMark = p.heldMark;
      if (p.threshold) t.aux.threshold = p.threshold;
      if (p.all) t.aux.hydStart = 0;
      break;
    case 'INVULN':
      t.hp = t.maxHp;
      break;
    case 'ECON':
      if (p.instant) sim.nutrient += p.instant;
      if (p.prodMul) t.aux.bloomProd = p.prodMul;
      break;
    case 'CUSTOM':
      customBloom(sim, t);
      break;
    default:
      break;
  }
}

/** 개화기 중 연발: 8방향 가시 · 포격 · 낙뢰 … */
function barrageTick(sim: BattleSim, t: Tower): void {
  if ((t.aux.barrageLeft ?? 0) <= 0 || sim.tick < (t.aux.barrageNext ?? 0)) return;
  t.aux.barrageNext = sim.tick + Math.max(1, Math.round(t.aux.barrageGap ?? 6));
  t.aux.barrageLeft--;
  barrageShot(sim, t);
}

function barrageShot(sim: BattleSim, t: Tower): void {
  const p = t.spec.bloom.p ?? {};
  const list = p.random || p.area || p.count ? sim.enemies.filter((e) => e.alive) : inRange(sim, t);
  const near = inRange(sim, t);
  if (p.dirs) {
    // 엉겅퀴: 8방향 연사
    const base = ((t.aux.barrageLeft ?? 0) * 0.2) % (Math.PI / 4);
    for (let i = 0; i < p.dirs; i++) {
      const a = base + (i * Math.PI * 2) / p.dirs;
      const target = near[0] ?? ({ x: t.x + Math.cos(a) * 3, y: t.y + Math.sin(a) * 3 } as Enemy);
      const fake = { ...target, x: t.x + Math.cos(a) * 3, y: t.y + Math.sin(a) * 3 } as Enemy;
      fireShoot(sim, t, fake);
    }
    return;
  }
  if (p.allTargets) {
    // 천침우: 사거리 안 모든 적
    for (const e of near) strike(sim, t, e, t.stats.dmg, { noStatus: false });
    return;
  }
  if (t.spec.id === 'P088' || p.unlimited) {
    const e = pickTarget(sim, t, near);
    if (e) fireChainBurst(sim, t, e);
    return;
  }
  if (p.random) {
    const e = list[sim.rng.int(0, Math.max(0, list.length - 1))];
    if (!e) return;
    if (t.spec.arch === 'SNIPE' && t.spec.id === 'P064') {
      sim.emit({
        t: 'shot',
        tower: t.id,
        from: { x: e.x, y: e.y - 5 },
        to: { x: e.x, y: e.y },
        kind: 'meteor',
        fx: t.spec.fx,
        target: e.uid,
      });
      dealDamage(sim, e, t.stats.dmg * (p.mul ?? 1), t, { type: t.spec.type, fx: t.spec.fx });
      applyStatus(sim, e, { k: 'FREEZE', dur: p.freeze ?? 1.5 }, t);
    } else {
      sim.emit({
        t: 'shot',
        tower: t.id,
        from: { x: e.x, y: e.y - 5 },
        to: { x: e.x, y: e.y },
        kind: 'meteor',
        fx: t.spec.fx,
        target: e.uid,
      });
      strike(sim, t, e, t.stats.dmg);
    }
    return;
  }
  if (t.spec.id === 'P049') {
    const e = list[sim.rng.int(0, Math.max(0, list.length - 1))];
    if (e) {
      sim.emit({
        t: 'shot',
        tower: t.id,
        from: { x: e.x, y: e.y - 6 },
        to: { x: e.x, y: e.y },
        kind: 'meteor',
        fx: t.spec.fx,
        target: e.uid,
      });
      dealDamage(sim, e, t.stats.dmg, t, { type: 'PHYS', area: true, fx: t.spec.fx });
      for (const x of sim.enemiesNear(e.x, e.y, 1.0)) applyStatus(sim, x, { k: 'STUN', dur: 1 }, t);
    }
    return;
  }
  // 포격(곡사류): 무작위 지점 · 대상
  const tgt = p.area
    ? list[sim.rng.int(0, Math.max(0, list.length - 1))]
    : pickTarget(sim, t, near);
  if (!tgt) return;
  if (t.spec.arch === 'LOB' || t.spec.arch === 'SPECIAL')
    lobAt(sim, t, tgt, t.stats.dmg, 0, p.area ? 0.8 : 0);
  else fireShoot(sim, t, tgt);
}

function fireChainBurst(sim: BattleSim, t: Tower, first: Enemy): void {
  const hit = new Set<number>();
  let cur: Enemy | null = first;
  let from = { x: t.x, y: t.y };
  while (cur) {
    hit.add(cur.uid);
    sim.emit({
      t: 'shot',
      tower: t.id,
      from,
      to: { x: cur.x, y: cur.y },
      kind: 'chain',
      fx: t.spec.fx,
      target: cur.uid,
    });
    strike(sim, t, cur, t.stats.dmg, {});
    from = { x: cur.x, y: cur.y };
    let best: Enemy | null = null;
    let bd = 2.4;
    for (const e of sim.enemiesNear(cur.x, cur.y, 2.4)) {
      if (hit.has(e.uid)) continue;
      const d = Math.hypot(e.x - cur.x, e.y - cur.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    cur = best;
  }
}

/** 종마다 다른 고유 개화기(07문서) */
function customBloom(sim: BattleSim, t: Tower): void {
  const id = t.spec.id;
  const p = t.spec.bloom.p ?? {};
  const all = sim.enemies.filter((e) => e.alive);
  const range = sim.eff(t).range;
  const near = () => sim.enemiesNear(t.x, t.y, range, { hidden: true });
  switch (id) {
    case 'P006': // 넝쿨 그물: 최대 5명을 동시에 2타일 끌어당김
      for (const e of near()
        .filter((x) => !x.flying)
        .sort((a, b) => b.s - a.s)
        .slice(0, p.n ?? 5))
        applyStatus(sim, e, { k: 'PULL', amt: p.tiles ?? 2 }, t);
      break;
    case 'P007': // 뿌리 미궁: 엉킨 뿌리 위 모든 적 속박
      for (const f of sim.fields)
        if (f.kind === 'TANGLE' && f.tower === t.id)
          for (const e of sim.enemiesNear(f.x, f.y, f.r, { air: false }))
            applyStatus(sim, e, { k: 'BIND', dur: p.bind ?? 2 }, t);
      break;
    case 'P008': {
      // 은실 그물: 무작위 8명 연결
      const grp = sim.tick;
      const pick = [...all].sort(() => sim.rng.next() - 0.5).slice(0, p.n ?? 8);
      for (const e of pick) {
        e.link = grp;
        e.linkShare = p.share ?? 0.6;
        e.linkUntil = sim.tick + tk(p.dur ?? 8);
      }
      break;
    }
    case 'P010': // 대속박
      for (const f of sim.fields)
        if (f.kind === 'VINE' && f.tower === t.id)
          for (const e of sim.enemiesNear(f.x, f.y, f.r, { air: false }))
            applyStatus(
              sim,
              e,
              { k: 'BIND', dur: p.bind ?? 3, boss: { k: 'BIND', dur: p.bossBind ?? 1 } },
              t,
            );
      break;
    case 'P018': // 은침 낙화: HP 최대 3명에게 300%
      for (const e of [...all].sort((a, b) => b.hp - a.hp).slice(0, p.n ?? 3)) {
        sim.emit({
          t: 'shot',
          tower: t.id,
          from: { x: t.x, y: t.y },
          to: { x: e.x, y: e.y },
          kind: 'instant',
          fx: t.spec.fx,
          target: e.uid,
        });
        dealDamage(sim, e, t.stats.dmg * (p.mul ?? 3), t, {
          type: 'PHYS',
          ignoreArmor: true,
          fx: t.spec.fx,
        });
      }
      break;
    case 'P025': // 균사 폭발
      for (const f of sim.fields)
        if (f.kind === 'PATCH' && f.tower === t.id) {
          sim.emit({ t: 'ring', x: f.x, y: f.y, r: p.r ?? 1.2, fx: t.spec.fx, kind: 'impact' });
          for (const e of sim.enemiesNear(f.x, f.y, p.r ?? 1.2, { air: false }))
            applyStatus(sim, e, { k: 'POISON', n: p.n ?? 6 }, t);
          f.v.uses = 0;
        }
      sim.fields = sim.fields.filter((f) => !(f.kind === 'PATCH' && f.tower === t.id));
      break;
    case 'P030': // 대발아: 남은 독 피해를 즉시 터뜨림
      for (const e of all)
        if (e.poison > 0) {
          const remain = e.poison * e.poisonDps * Math.max(0, (e.poisonUntil - sim.tick) / 60);
          e.poison = 0;
          dealDamage(sim, e, remain, t, { type: 'POISON', fx: t.spec.fx });
        }
      break;
    case 'P040': // 봄의 귀환
      for (const a of sim.towers) {
        a.hp = a.maxHp;
        a.down = 0;
      }
      for (const e of all)
        applyStatus(sim, e, { k: 'SLOW', amt: p.slow ?? 0.5, dur: p.slowSec ?? 3 }, t);
      break;
    case 'P045': // 대굴림: 거대 야자 ×5
      t.aux.rollMul = p.mul ?? 5;
      t.cd = 0;
      break;
    case 'P050': // 무지개 수확: 즉시 열매 15개
      t.aux.stock = p.count ?? 15;
      break;
    case 'P057': // 재에서 다시
      for (const a of sim.towers) a.down = 0;
      for (const e of sim.enemiesNear(t.x, t.y, p.r ?? 3))
        applyStatus(sim, e, { k: 'BURN', n: p.burn ?? 4 }, t);
      break;
    case 'P059': // 정오
      for (const e of all) {
        applyStatus(sim, e, { k: 'BURN', n: p.burn ?? 3 }, t);
        e.revealed = sim.tick + tk(p.reveal ?? 5);
      }
      break;
    case 'P060': // 태초의 불: 남은 화상 피해의 300%
      for (const e of all)
        if (e.burn > 0) {
          const remain =
            e.burn * e.burnDps * Math.max(0, (e.burnUntil - sim.tick) / 60) * (p.mul ?? 3);
          dealDamage(sim, e, Math.max(remain, e.burn * e.burnDps * 3), t, {
            type: 'FIRE',
            fx: t.spec.fx,
          });
        }
      break;
    case 'P066': // 대소용돌이: 5초간 속박 + 틱 피해(길게 유지되는 장판)
      sim.addField({
        kind: 'WHIRL',
        tower: t.id,
        x: t.x,
        y: t.y,
        r: range,
        left: tk(p.dur ?? 5),
        period: 30,
        nextTick: sim.tick + 30,
        fx: t.spec.fx,
        v: { dmg: t.stats.dmg / 2, air: 0 },
        on: [{ k: 'BIND', dur: 0.6 }],
        type: 'COLD',
      });
      break;
    case 'P069': // 별서리: 모든 비보스 적 빙결 후 파쇄 사격
      for (const e of all) {
        if (e.boss) continue;
        applyStatus(sim, e, { k: 'FREEZE', dur: p.freeze ?? 1.5 }, t);
        dealDamage(sim, e, t.stats.dmg * (t.spec.p?.shatter ?? 3), t, {
          type: 'COLD',
          shatter: 1,
          fx: t.spec.fx,
        });
      }
      break;
    case 'P075': // 등대 신호
      for (const e of all) {
        e.revealed = sim.tick + tk(p.dur ?? 10);
        applyStatus(sim, e, { k: 'MARK', amt: p.mark ?? 0.25, dur: p.dur ?? 10 }, t);
      }
      break;
    case 'P079': // 대별자리
      constellation(sim, t, all, 0.2);
      break;
    case 'P080': // 여명
      for (const e of all) {
        e.revealed = sim.tick + tk(p.dur ?? 8);
        applyStatus(sim, e, { k: 'MARK', amt: p.mul ?? 0.25, dur: p.dur ?? 8 }, t);
      }
      break;
    case 'P087': // 폭우: 10초간(비구름 틱이 처리)
      break;
    case 'P089': // 천둥 장막: 길을 가로지르는 번개 8초
      for (const f of densestFields(sim, t)) sim.addField(f);
      break;
    case 'P090': // 태풍의 눈
      for (const e of all) {
        applyStatus(sim, e, { k: 'SLOW', amt: p.slow ?? 0.6, dur: p.dur ?? 10 }, t);
        const r = sim.routeOf(e);
        e.s += (sim.map.routes[0].length * 0.5 - e.s) * 0.5;
        void r;
      }
      for (const a of sim.towers)
        a.buffs.push({
          aspd: p.aspd ?? 0.5,
          dmg: 0,
          range: 0,
          crit: 0,
          until: sim.tick + tk(p.dur ?? 10),
        });
      break;
    case 'P094': // 저승길 안내는 BUFF_SELF 로 처리
      break;
    case 'P096': // 망각
      for (const e of all) {
        e.aux.shield = 0;
        e.aux.regen = 0;
        e.aux.speedBonus = 0;
        e.stealth = false;
        e.aux.noBuff = sim.tick + tk(p.noBuff ?? 10);
      }
      break;
    case 'P097': // 그림자 사슬
      for (const e of near())
        applyStatus(sim, e, { k: 'MARK', amt: p.mark ?? 0.3, dur: p.dur ?? 8 }, t);
      break;
    case 'P099': // 멈춘 시간: 3초간 모든 적 정지
      for (const e of all)
        applyStatus(
          sim,
          e,
          e.boss
            ? { k: 'SLOW', amt: p.bossSlow ?? 0.7, dur: p.dur ?? 3 }
            : { k: 'STUN', dur: p.dur ?? 3 },
          t,
        );
      break;
    case 'P100': // 윤회의 정원
      t.aux.reincAll = sim.tick + tk(p.dur ?? 6);
      break;
    default:
      break;
  }
  void densest;
  void pickTarget;
}

/** 천둥 장막: 경로 한가운데(가장 많은 적 근처)에 번개 장판 */
function densestFields(sim: BattleSim, t: Tower) {
  const c = densest(
    sim.enemies.filter((e) => e.alive),
    3,
  ) ?? { x: t.x, y: t.y };
  return [
    {
      kind: 'CURTAIN',
      tower: t.id,
      x: c.x,
      y: c.y,
      r: 2.5,
      left: tk(8),
      period: 30,
      nextTick: sim.tick + 30,
      fx: t.spec.fx,
      v: { dmg: t.stats.dmg * 1.5, air: 1 },
      on: [{ k: 'STUN', dur: 0.3 } as StatusSpec],
      type: 'ELEC' as const,
    },
  ];
}
