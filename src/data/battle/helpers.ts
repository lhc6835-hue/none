// 전투 데이터를 짧게 쓰기 위한 도우미

import type { ArchId, BloomSpec, DmgType, FxSpec, PlantBattle } from './types';

export type PB = PlantBattle;

/** 그늘 · 이슬 등급의 공통 개화기: 5초간 공격속도 +50% */
export const COMMON_BLOOM: BloomSpec = { kind: 'HASTE', dur: 5, p: { aspd: 0.5 } };

type Extra = Partial<
  Pick<
    PlantBattle,
    'shots' | 'pierce' | 'splash' | 'targets' | 'fall' | 'on' | 'flags' | 'p' | 'special' | 'bloom'
  >
> & { fx: FxSpec };

export function def(
  id: string,
  arch: ArchId,
  cost: number,
  dmg: number,
  interval: number,
  range: number,
  type: DmgType,
  extra: Extra,
): PlantBattle {
  const { bloom, ...rest } = extra;
  return { id, arch, cost, dmg, interval, range, type, bloom: bloom ?? COMMON_BLOOM, ...rest };
}
