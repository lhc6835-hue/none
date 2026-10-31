// 잎 스탬프 12종 (02문서 7절: 둥근 · 뾰족 · 하트 · 바늘 · 깃털 · 넓적 …)
// 문자: . 빈칸 · M 주 · S 보조 · A 강조 · h 하이라이트 · d 그림자
// 붙는 자리(앵커): bc = 아래 가운데, bl = 아래 왼쪽(오른쪽을 보는 잎). 왼쪽을 보게 하려면 flipX.

import type { Stamp } from '../PixelGrid';

export const LEAF_STAMPS: Record<string, Stamp> = {
  'leaf.round': ['..MMM..', '.MMMMM.', 'MMMhMMM', '.MMMMd.', '..MM...'],
  'leaf.roundS': ['.MM.', 'MMMM', 'MMMd', '.MM.'],
  'leaf.pointed': ['.....MM.', '..MMMMMM', 'MMMMMMM.', 'MMM.....'],
  'leaf.pointedS': ['...MM', '.MMMM', 'MMM..'],
  'leaf.heart': ['.MM.MM.', 'MMMMMMM', 'MMMhMMM', '.MMMMd.', '..MMd..', '...M...'],
  'leaf.needle': ['.M.', '.M.', 'MMM', 'MSM', 'MSM', '.S.', '.S.'],
  'leaf.needleS': ['.M.', '.M.', 'MSM', '.S.', '.S.'],
  'leaf.feather': ['..MM..', '.MMMM.', 'MMSSMM', '.MSSM.', 'MMSSMM', '.MSSM.', '..SS..', '..SS..'],
  'leaf.broad': ['..MMMMM..', '.MMMMMMM.', 'MMMMhMMMM', 'MMMMMMMMd', '.MMMMMMd.', '...MMM...'],
  'leaf.broadS': ['.MMMM.', 'MMMMMM', 'MMMMMd', '..MM..'],
  'leaf.fan': ['M.M.M.M.', 'MMMMMMMM', '.MMMMMM.', '..MMMM..', '...MM...'],
  'leaf.lobed': ['.M.M.M.', 'MMMMMMM', 'MMMhMMM', '.MMMMd.', '..MMd..', '...M...'],
};
