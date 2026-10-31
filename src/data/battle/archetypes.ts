// 아키타입 12종 (06문서 6절) + 전투 중 강화 분기 (7절)

import type { ArchId, ArchetypeDef } from './types';

export const ARCHETYPES: Record<Exclude<ArchId, 'SPECIAL'>, ArchetypeDef> = {
  SHOOT: { id: 'SHOOT', nameKey: 'arch.SHOOT', costMul: 1.0, desc: 'arch.SHOOT.desc' },
  SNIPE: { id: 'SNIPE', nameKey: 'arch.SNIPE', costMul: 1.1, desc: 'arch.SNIPE.desc' },
  LOB: { id: 'LOB', nameKey: 'arch.LOB', costMul: 1.1, desc: 'arch.LOB.desc' },
  MELEE: { id: 'MELEE', nameKey: 'arch.MELEE', costMul: 0.9, desc: 'arch.MELEE.desc' },
  ZONE: { id: 'ZONE', nameKey: 'arch.ZONE', costMul: 1.0, desc: 'arch.ZONE.desc' },
  BEAM: { id: 'BEAM', nameKey: 'arch.BEAM', costMul: 1.1, desc: 'arch.BEAM.desc' },
  CHAIN: { id: 'CHAIN', nameKey: 'arch.CHAIN', costMul: 1.1, desc: 'arch.CHAIN.desc' },
  AURA: { id: 'AURA', nameKey: 'arch.AURA', costMul: 1.2, desc: 'arch.AURA.desc' },
  SUMMON: { id: 'SUMMON', nameKey: 'arch.SUMMON', costMul: 1.1, desc: 'arch.SUMMON.desc' },
  PRODUCE: { id: 'PRODUCE', nameKey: 'arch.PRODUCE', costMul: 1.0, desc: 'arch.PRODUCE.desc' },
  TRAP: { id: 'TRAP', nameKey: 'arch.TRAP', costMul: 0.9, desc: 'arch.TRAP.desc' },
  WALL: { id: 'WALL', nameKey: 'arch.WALL', costMul: 0.8, desc: 'arch.WALL.desc' },
};

/** 전투 중 강화: 단계별 비용(기본 배치 비용 대비)과 배율 */
export const UPGRADE = {
  cost: [0.5, 0.75, 1.1] as const,
  mul: [1.25, 1.55, 1.9] as const,
  rangeBonus: [0, 0.25, 0.25] as const,
} as const;

export type BranchId = 'A' | 'B';

/** 분기 효과: 시뮬레이션이 읽는 수정자. 키 이름은 Towers.applyBranch 가 해석한다 */
export const BRANCHES: Record<
  Exclude<ArchId, 'SPECIAL'>,
  Record<BranchId, Record<string, number>>
> = {
  SHOOT: { A: { intervalMul: 0.65 }, B: { pierce: 2, dmgMul: 1.1 } },
  SNIPE: { A: { crit: 0.25, critMul: 2.5 }, B: { dmgMul: 1.5, splashR: 0.6, splashDmg: 0.5 } },
  LOB: { A: { cluster: 3 }, B: { splashMul: 1.5, stun: 0.5 } },
  MELEE: { A: { targetsAll: 1, dmgMul: 0.9 }, B: { bleed: 0.2 } },
  ZONE: { A: { rangeMul: 1.4 }, B: { dmgMul: 1.8 } },
  BEAM: { A: { beams: 2 }, B: { rampMul: 1.5, rampSec: 6 } },
  CHAIN: { A: { targetsAdd: 3 }, B: { firstMul: 2, stun: 0.3 } },
  AURA: { A: { rangeAdd: 1 }, B: { auraMul: 1.5 } },
  SUMMON: { A: { maxAdd: 2 }, B: { summonMul: 2 } },
  PRODUCE: { A: { prodMul: 1.5 }, B: { interest: 0.03 } },
  TRAP: { A: { maxAdd: 2 }, B: { dmgMul: 1.8, effMul: 1.8 } },
  WALL: { A: { hpMul: 2, holdAdd: 1 }, B: { thornMul: 3, reflect: 0.3 } },
};
