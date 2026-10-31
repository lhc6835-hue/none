// 가방: 소모품은 칸당 99개, 재료는 999개 (05문서 1절). 씨앗은 'seed:Pxxx' 키로 센다(씨앗 상자는 무제한).

import type { GameState } from '../../core/GameState';

export const STACK_CONSUMABLE = 99;
export const STACK_MATERIAL = 999;

export const seedKey = (speciesId: string): string => `seed:${speciesId}`;
export const potKey = (potId: string, size: number): string => `pot:${potId}:${size}`;

export const countOf = (state: GameState, id: string): number => state.inventory[id] ?? 0;

export function addItem(state: GameState, id: string, n = 1): number {
  const cap =
    id.startsWith('seed:') || id.startsWith('MAT_') || id === 'POLLEN' || id === 'COMPOST'
      ? STACK_MATERIAL
      : STACK_CONSUMABLE;
  const before = countOf(state, id);
  const next = Math.min(cap, before + n);
  state.inventory[id] = next;
  return next - before;
}

/** 있으면 n개 쓰고 true, 모자라면 아무것도 바꾸지 않고 false */
export function takeItem(state: GameState, id: string, n = 1): boolean {
  if (countOf(state, id) < n) return false;
  state.inventory[id] -= n;
  if (state.inventory[id] <= 0) delete state.inventory[id];
  return true;
}

export function seedsOwned(state: GameState): { speciesId: string; count: number }[] {
  return Object.entries(state.inventory)
    .filter(([k, n]) => k.startsWith('seed:') && n > 0)
    .map(([k, n]) => ({ speciesId: k.slice(5), count: n }))
    .sort((a, b) => a.speciesId.localeCompare(b.speciesId));
}
