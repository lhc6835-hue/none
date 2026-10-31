// 돌봄 아이템 (05문서 1–3절): 영양제 10 · 뼛가루 3 · 기타 소모품 · 계열별 간식 9

import type { FamilyId } from '../core/schema';

export type ItemId = string;

export interface NutrientDef {
  id: ItemId;
  nameKey: string;
  /** 상점가(잎전). 0 이면 상점에서 팔지 않는다 */
  price: number;
  /** 앰플류는 영양 과다를 세지 않는다 */
  ampoule?: boolean;
}

export const NUTRIENTS: Record<string, NutrientDef> = {
  GREEN: { id: 'GREEN', nameKey: 'item.GREEN', price: 20 },
  GROW: { id: 'GROW', nameKey: 'item.GROW', price: 60 },
  STRONG: { id: 'STRONG', nameKey: 'item.STRONG', price: 90 },
  SWEET: { id: 'SWEET', nameKey: 'item.SWEET', price: 50 },
  CLEAR: { id: 'CLEAR', nameKey: 'item.CLEAR', price: 80 },
  VITAL: { id: 'VITAL', nameKey: 'item.VITAL', price: 120 },
  SPARKLE: { id: 'SPARKLE', nameKey: 'item.SPARKLE', price: 0, ampoule: true },
  RAINBOW: { id: 'RAINBOW', nameKey: 'item.RAINBOW', price: 0, ampoule: true },
  STAR_AMPOULE: { id: 'STAR_AMPOULE', nameKey: 'item.STAR_AMPOULE', price: 0, ampoule: true },
  AWAKEN_AMPOULE: { id: 'AWAKEN_AMPOULE', nameKey: 'item.AWAKEN_AMPOULE', price: 0, ampoule: true },
};

/** 종마다 숨겨진 '좋아하는 영양제'는 이 네 가지 중 하나(care.favoriteNutrient) */
export const FAVORITE_ITEM: Record<'GREEN' | 'GROW' | 'SWEET' | 'STRONG', ItemId> = {
  GREEN: 'GREEN',
  GROW: 'GROW',
  SWEET: 'SWEET',
  STRONG: 'STRONG',
};

export const BONES: Record<string, { id: ItemId; nameKey: string; ratio: number; price: number }> =
  {
    BONE_1: { id: 'BONE_1', nameKey: 'item.BONE_1', ratio: 0.08, price: 40 },
    BONE_2: { id: 'BONE_2', nameKey: 'item.BONE_2', ratio: 0.15, price: 0 },
    BONE_3: { id: 'BONE_3', nameKey: 'item.BONE_3', ratio: 0.3, price: 0 },
  };

/** 기타 돌봄 소모품 · 재료 */
export const SUPPLIES = [
  'COMPOST',
  'BUG_JAR',
  'FUNGICIDE',
  'PESTICIDE',
  'CHARCOAL',
  'GRAFT_TAPE',
  'POLLEN',
] as const;

/** 계열별 간식 9종 (04문서 5-1). 덩굴 · 가시는 같은 간식(벌레 병) */
export const SNACK_OF_FAMILY: Record<FamilyId, ItemId> = {
  VINE: 'SNACK_BUG_JAR',
  THORN: 'SNACK_BUG_JAR',
  FUNGUS: 'SNACK_MYCELIUM',
  BLOOM: 'SNACK_SUGAR_WATER',
  FRUIT: 'SNACK_COMPOST_BALL',
  EMBER: 'SNACK_CHARCOAL',
  FROST: 'SNACK_DEW_BEAD',
  LUMEN: 'SNACK_MINERAL',
  STORM: 'SNACK_STATIC_COTTON',
  SPIRIT: 'SNACK_INCENSE',
};
export const SNACKS = [...new Set(Object.values(SNACK_OF_FAMILY))];

/** 새 게임 시작 지급품 */
export const STARTER_ITEMS: Record<ItemId, number> = {
  GREEN: 5,
  SWEET: 2,
  BONE_1: 3,
  COMPOST: 2,
  FUNGICIDE: 1,
  PESTICIDE: 1,
  // 상점(M5)이 열리기 전에도 분갈이(단계 2 · 4 관문)를 할 수 있도록 한 단계 큰 토분을 미리 지급한다
  'pot:CLAY:2': 3,
  'pot:CLAY:3': 3,
};
/** 새 게임 시작 씨앗 (튜토리얼은 M5: 따끔선인장 · 꼬불덩굴 · 꿀단지 민들레) */
export const STARTER_SEEDS: string[] = ['P011', 'P001', 'P031'];
