// 전투 시뮬레이션에서 떼어 낸 부분. 함수 첫 인자 s 가 BattleSim 이다.

import { familyOf } from './Towers';
import { tk } from './types';
import type { BattleSim } from './BattleSim';

/** 오라 계열의 아군 강화를 모아 각 식물의 aux 에 적어 둔다 */
export function auraPass(s: BattleSim): void {
  for (const t of s.towers) {
    t.aux.aAspd = 0;
    t.aux.aRange = 0;
    t.aux.aDmg = 0;
    t.aux.aCrit = 0;
  }
  for (const a of s.towers) {
    if (
      a.down > 0 ||
      (a.spec.arch !== 'AURA' && !a.spec.special?.match(/FIRST|HYDRANGEA|TIME_FLOWER/))
    )
      continue;
    const p = a.spec.p ?? {};
    const mul = (a.aux.auraMul ?? 1) * (a.bloomLeft > 0 ? (a.aux.bloomAura ?? 1) : 1);
    const r =
      a.spec.range >= 90
        ? 99
        : s.eff(a).range +
          (familyOf(a.spec.id) === 'BLOOM' && s.synergyTier('BLOOM') >= 1 ? 0.5 : 0);
    for (const t of s.towers) {
      if (t === a || t.down > 0) continue;
      if (Math.hypot(a.x - t.x, a.y - t.y) > r) continue;
      t.aux.aAspd += (p.aspd ?? 0) * mul;
      t.aux.aRange += (p.range ?? 0) * mul;
      t.aux.aCrit += (p.crit ?? 0) * mul;
      t.aux.aDmg += (p.dmg ?? 0) * mul;
      if (a.spec.special === 'HYDRANGEA') {
        const phase = a.bloomLeft > 0 ? 3 : Math.floor(s.tick / tk(10) + (a.aux.hydStart ?? 0)) % 3;
        if (phase === 0 || phase === 3) t.aux.aDmg += 0.15;
        if (phase === 1 || phase === 3) t.aux.aAspd += 0.15;
        if (phase === 2 || phase === 3) t.aux.aCrit += 0.1;
      }
      if (a.spec.special === 'TIME_FLOWER' && (a.aux.timeOn ?? 0) > s.tick)
        t.aux.aAspd += p.ally ?? 0.3;
      a.support += 0.002;
    }
  }
}
