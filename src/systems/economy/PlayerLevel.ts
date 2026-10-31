// 정원사 레벨 (09문서 8절): 다음 레벨까지 경험치 = round(50 × L^1.6), 최대 Lv50.
// 얻는 곳(M2 범위): 완벽 돌봄 +3 · 일반 돌봄 +1 · 개화 +20.

import type { EventBus } from '../../core/EventBus';
import type { GameEvents } from '../../core/events';
import type { GameState } from '../../core/GameState';

export const MAX_PLAYER_LEVEL = 50;

export const EXP_CARE_PERFECT = 3;
export const EXP_CARE_NORMAL = 1;
export const EXP_BLOOM = 20;

export const expToNext = (level: number): number => Math.round(50 * level ** 1.6);

/** 경험치를 더하고, 오른 레벨 수를 돌려준다. 최대 레벨이면 경험치는 쌓이지 않는다. */
export function gainPlayerExp(
  state: GameState,
  amount: number,
  bus?: Pick<EventBus<GameEvents>, 'emit'>,
): number {
  const p = state.player;
  if (amount <= 0 || p.level >= MAX_PLAYER_LEVEL) return 0;
  p.exp += amount;
  let ups = 0;
  while (p.level < MAX_PLAYER_LEVEL && p.exp >= expToNext(p.level)) {
    p.exp -= expToNext(p.level);
    p.level += 1;
    ups += 1;
    bus?.emit('player:levelUp', { level: p.level });
  }
  if (p.level >= MAX_PLAYER_LEVEL) p.exp = 0;
  return ups;
}
