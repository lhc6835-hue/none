// 적의 고유 능력 (08문서). 챕터 1: 껍질 달팽이 · 애벌레 기차 · 쥐며느리 · 진딧물 여왕

import type { BattleSim } from './BattleSim';
import { tk, type Enemy } from './types';

export function enemyAI(sim: BattleSim, e: Enemy): void {
  const n = sim.tick;
  // 출혈(근접 분기)
  if ((e.aux.bleedUntil ?? 0) > n) sim.dot(e, (e.aux.bleedDps ?? 0) / 60, 'PHYS');
  if (e.aux.regen && e.burn <= 0) e.hp = Math.min(e.maxHp, e.hp + (e.maxHp * e.aux.regen) / 60);
  switch (e.def.ability) {
    case 'SHELL':
      // 껍질 달팽이: HP 50% 이하가 되면 껍질이 깨져 장갑 0, 속도 0.9
      if (!e.aux.shellBroken && e.hp / e.maxHp <= 0.5) {
        e.aux.shellBroken = 1;
        e.armor = 0;
        e.baseSpeed = 0.9;
        sim.emit({ t: 'toast', key: 'battle.shellBreak' });
      }
      break;
    case 'ROLL':
      // 쥐며느리: 5초마다 2초간 굴러감(속도 1.8, 둔화 · 속박 면역)
      if (n >= (e.aux.nextRoll ?? tk(5))) {
        e.aux.nextRoll = n + tk(5);
        e.aux.rollUntil = n + tk(2);
      }
      e.aux.speedBonus = (e.aux.rollUntil ?? 0) > n ? 1 : 0;
      if ((e.aux.rollUntil ?? 0) > n) {
        e.slowAmt = 0;
        e.bindUntil = 0;
      }
      break;
    case 'APHID_QUEEN': {
      // 진딧물 여왕 '꿀단지': 8초마다 진딧물 꼬마 6마리를 낳음. HP 50% 에서 4초간 비행
      if (n >= (e.aux.nextSpawn ?? tk(8))) {
        e.aux.nextSpawn = n + tk(8);
        spawnBossAdds(sim, e, 'E01', 6);
      }
      if (!e.aux.winged && e.hp / e.maxHp <= 0.5) {
        e.aux.winged = 1;
        e.aux.landAt = n + tk(4);
        sim.setFlying(e, true);
        sim.emit({ t: 'toast', key: 'battle.bossWings' });
      }
      if (e.flying && e.aux.landAt && n >= e.aux.landAt) sim.setFlying(e, false);
      break;
    }
    default:
      break;
  }
}

export function spawnBossAdds(sim: BattleSim, e: Enemy, id: string, count: number): void {
  for (let i = 0; i < count; i++) {
    sim.spawnEnemy(id, e.route, e.aux.wave ?? sim.wave, { s: Math.max(0, e.s - 0.3 * i) });
  }
}

/** 죽었을 때: 애벌레 기차는 마디 3개로 분열 */
export function onEnemyDeath(sim: BattleSim, e: Enemy): void {
  if (e.def.ability === 'SPLIT') {
    for (let i = 0; i < 3; i++)
      sim.spawnEnemy('E04S', e.route, e.aux.wave ?? sim.wave, { s: Math.max(0, e.s - 0.25 * i) });
  }
}
