// 전투 시뮬레이션에서 떼어 낸 부분. 함수 첫 인자 s 가 BattleSim 이다.

import { CHAPTER_HP_MUL, ENEMIES, type EnemyDef } from '../../data/battle/enemies';
import { onEnemyDeath } from './EnemyAI';
import { posAt } from './Paths';
import { onKillHooks } from './SpecialHooks';
import { traitSum } from './Towers';
import { type Enemy, type Tower } from './types';
import type { BattleSim } from './BattleSim';
import type { Route } from './Paths';

export function spawnEnemy(
  s: BattleSim,
  id: string,
  entrance: number,
  wave: number,
  opts: { elite?: boolean; s?: number; flyingRoute?: boolean } = {},
): Enemy {
  const def: EnemyDef = ENEMIES[id];
  const route = entrance % s.map.routes.length;
  const hpBase = def.boss ? def.hp : def.hp * CHAPTER_HP_MUL[def.chapter - 1] * (1 + 0.04 * wave);
  const maxHp = hpBase * s.diff.hpMul * (opts.elite ? 2.5 : 1);
  const e: Enemy = {
    uid: s.nextUid++,
    def,
    route,
    s: opts.s ?? 0,
    x: 0,
    y: 0,
    hp: maxHp,
    maxHp,
    baseSpeed: def.speed,
    armor: def.armor + (opts.elite ? 4 : 0),
    alive: true,
    flying: !!def.flying,
    stealth: !!def.stealth,
    revealed: 0,
    elite: !!opts.elite,
    boss: !!def.boss,
    slowAmt: 0,
    slowUntil: 0,
    bindUntil: 0,
    stunUntil: 0,
    sleepUntil: 0,
    charmUntil: 0,
    chill: 0,
    chillUntil: 0,
    freezeUntil: 0,
    freezeImmune: 0,
    poison: 0,
    poisonUntil: 0,
    poisonDps: 0,
    burn: 0,
    burnUntil: 0,
    burnDps: 0,
    wetUntil: 0,
    shred: 0,
    shredUntil: 0,
    mark: 0,
    markUntil: 0,
    link: 0,
    linkShare: 0,
    linkUntil: 0,
    aux: { wave },
    lastHit: 0,
    once: new Set(),
    hitTick: -1,
    backward: false,
    icons: [],
  };
  s.placeOnRoute(e);
  s.enemies.push(e);
  s.alivePerWave.set(wave, (s.alivePerWave.get(wave) ?? 0) + 1);
  s.emit({ t: 'spawn', enemy: e.uid });
  return e;
}

export function routeOf(s: BattleSim, e: Enemy): Route {
  return e.flying ? s.map.airRoutes[e.route] : s.map.routes[e.route];
}

export function placeOnRoute(s: BattleSim, e: Enemy): void {
  const p = posAt(s.routeOf(e), e.s);
  e.x = p.x;
  e.y = p.y;
}

/** 보스 날개 등 경로가 바뀔 때 진행률을 유지한 채 옮긴다 */

/** 보스 날개 등 경로가 바뀔 때 진행률을 유지한 채 옮긴다 */
export function setFlying(s: BattleSim, e: Enemy, flying: boolean): void {
  if (e.flying === flying) return;
  const from = s.routeOf(e);
  const frac = e.s / from.length;
  e.flying = flying;
  const to = s.routeOf(e);
  e.s = frac * to.length;
  s.placeOnRoute(e);
}

export function kill(s: BattleSim, e: Enemy, src: Tower | null): void {
  if (!e.alive) return;
  e.alive = false;
  e.hp = 0;
  s.kills++;
  let reward = e.def.reward * (e.elite ? 3 : 1);
  for (const t of s.towers) {
    if (t.spec.id === 'P036' && t.down <= 0 && Math.hypot(t.x - e.x, t.y - e.y) <= s.eff(t).range)
      reward *= 1.2;
    if (t.spec.id === 'P039' && t.bloomLeft > 0) reward *= 2;
  }
  if (src) {
    src.kills++;
    reward += traitSum(src.load, 'sapOnKill');
  }
  s.nutrient += reward;
  s.emit({ t: 'kill', enemy: e.uid, x: e.x, y: e.y, boss: e.boss, reward });
  const w = e.aux.wave ?? 0;
  s.alivePerWave.set(w, (s.alivePerWave.get(w) ?? 1) - 1);
  onEnemyDeath(s, e);
  onKillHooks(s, e, src);
}

export function leak(s: BattleSim, e: Enemy): void {
  e.alive = false;
  const h = e.def.hearts;
  s.hearts = Math.max(0, s.hearts - h);
  s.leaked += h;
  s.leakBy[e.def.id] = (s.leakBy[e.def.id] ?? 0) + h;
  s.emit({ t: 'leak', enemy: e.uid, hearts: h });
  s.emit({ t: 'heart', hearts: s.hearts });
  const w = e.aux.wave ?? 0;
  s.alivePerWave.set(w, (s.alivePerWave.get(w) ?? 1) - 1);
}
