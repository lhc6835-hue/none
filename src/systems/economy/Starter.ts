// 새 게임 시작 지급품 (05문서). 시작 씨앗 3개와 소모품을 가방에 넣는다.

import type { GameState } from '../../core/GameState';
import { STARTER_ITEMS, STARTER_SEEDS } from '../../data/items';
import { addItem, seedKey } from './Inventory';

export function giveStarterKit(state: GameState): void {
  for (const [id, n] of Object.entries(STARTER_ITEMS)) addItem(state, id, n);
  for (const speciesId of STARTER_SEEDS) addItem(state, seedKey(speciesId), 1);
}
