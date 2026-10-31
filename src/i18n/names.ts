// 식물 · 아이템 표시 이름. 문자열은 모두 ko/en.json 에서 온다.

import type { PlantInstance } from '../core/schema';
import { hasKey, t } from './index';

export const plantSpeciesName = (speciesId: string): string => t(`plant.${speciesId}.name`);

/** 이름 지은 식물은 그 이름, 아직이면 종 이름 */
export const plantDisplayName = (p: Pick<PlantInstance, 'nickname' | 'speciesId'>): string =>
  p.nickname || plantSpeciesName(p.speciesId);

/** 가방 키('seed:P001' · 'pot:CLAY:2' · 'soil:PEAT' · 'GREEN' …)를 사람이 읽는 이름으로 */
export function itemName(id: string): string {
  if (id.startsWith('seed:')) return t('item.seed', { name: plantSpeciesName(id.slice(5)) });
  if (id.startsWith('pot:')) {
    const [, pot, size] = id.split(':');
    return t('item.pot', { name: t(`pot.${pot}`), size: t(`pot.size.${size}`) });
  }
  if (id.startsWith('soil:')) return t(`soil.${id.slice(5)}`);
  const key = `item.${id}`;
  return hasKey(key) ? t(key) : id;
}
