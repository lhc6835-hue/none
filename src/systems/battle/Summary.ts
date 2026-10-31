// 전투 시뮬레이션에서 떼어 낸 부분. 함수 첫 인자 s 가 BattleSim 이다.

import { type Tower } from './types';
import type { BattleResult, BattleSim } from './BattleSim';

export function result(s: BattleSim): BattleResult {
  const ratio = s.hearts / s.maxHearts;
  const stars: 1 | 2 | 3 = ratio >= 0.9 ? 3 : ratio >= 0.5 ? 2 : 1;
  let mvp: Tower | null = null;
  for (const t of s.towers) if (!mvp || t.dealt + t.support > mvp.dealt + mvp.support) mvp = t;
  return {
    won: s.phase === 'WON',
    stars: s.phase === 'WON' ? stars : 1,
    heartsLeft: s.hearts,
    maxHearts: s.maxHearts,
    seconds: s.time,
    kills: s.kills,
    leaked: s.leaked,
    mvp: mvp?.id ?? null,
    towers: s.towers.map((t) => ({
      speciesId: t.spec.id,
      dealt: t.dealt,
      support: t.support,
      kills: t.kills,
      id: t.id,
    })),
  };
}

/** 테스트 · 도구용: 적을 맞히는 공통 진입점 */
