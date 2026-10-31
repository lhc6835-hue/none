// 형질 30종 (04문서 9-2). 개화 때 등급별 칸 수만큼 추첨한다: 흔함 70% · 드묾 25% · 희귀 5%.
// garden: 정원 효과(배율) · battle: 전투 효과(M3 에서 BattleSim 이 읽는다, 비율은 0.1 = +10%)

export type TraitRarity = 'COMMON' | 'UNCOMMON' | 'RARE';

export interface TraitDef {
  id: string;
  rarity: TraitRarity;
  garden?: {
    waterDecayMul?: number;
    nutritionDecayMul?: number;
    moldMul?: number;
    gpMul?: number;
    talkMul?: number;
    soilBonusMul?: number;
  };
  battle?: Record<string, number>;
}

export const TRAITS: TraitDef[] = [
  // 흔함
  { id: 'STURDY_STEM', rarity: 'COMMON', battle: { hp: 0.1 } },
  { id: 'SHARP_LEAF', rarity: 'COMMON', battle: { damage: 0.06 } },
  { id: 'LONG_ROOT', rarity: 'COMMON', battle: { range: 0.2 } },
  { id: 'DILIGENT', rarity: 'COMMON', battle: { atkSpeed: 0.05 } },
  { id: 'FIRM_ROOT', rarity: 'COMMON', battle: { knockbackResist: 1, debuffDuration: -0.2 } },
  { id: 'THRIFTY', rarity: 'COMMON', battle: { cost: -0.05 } },
  { id: 'WATER_HIPPO', rarity: 'COMMON', garden: { waterDecayMul: 0.75 } },
  { id: 'LIGHT_EATER', rarity: 'COMMON', garden: { nutritionDecayMul: 0.75 } },
  { id: 'TIDY_LEAF', rarity: 'COMMON', garden: { moldMul: 0.6 } },
  { id: 'EARLY_BIRD', rarity: 'COMMON', battle: { dayDamage: 0.08 } },
  // 드묾
  { id: 'NIGHT_CHILD', rarity: 'UNCOMMON', battle: { nightDamage: 0.12 } },
  { id: 'FAST_GROWER', rarity: 'UNCOMMON', garden: { gpMul: 1.15 } },
  { id: 'KEEN', rarity: 'UNCOMMON', battle: { crit: 0.06 } },
  { id: 'POISON_RESIST', rarity: 'UNCOMMON', battle: { poisonImmune: 1 } },
  { id: 'FROST_RESIST', rarity: 'UNCOMMON', battle: { frostDuration: -0.5 } },
  { id: 'BROAD_LEAF', rarity: 'UNCOMMON', battle: { area: 0.15 } },
  { id: 'RESILIENT', rarity: 'UNCOMMON', battle: { reviveTime: -0.4 } },
  { id: 'NECTAR', rarity: 'UNCOMMON', battle: { sapOnKill: 1 } },
  { id: 'LUCKY', rarity: 'UNCOMMON', battle: { dropRate: 0.05 } },
  { id: 'CHATTERBOX', rarity: 'UNCOMMON', garden: { talkMul: 2 } },
  // 희귀
  { id: 'GOLDEN_ROOT', rarity: 'RARE', battle: { sapPerWave: 5 } },
  { id: 'TWIN_BLOOM', rarity: 'RARE', battle: { doubleBloomChance: 0.1 } },
  { id: 'GIANT', rarity: 'RARE', battle: { hp: 0.2, damage: 0.08 } },
  { id: 'STAR_BEARER', rarity: 'RARE', battle: { breedVariantMul: 2 } },
  { id: 'UNYIELDING', rarity: 'RARE', battle: { ignoreFaintOnce: 1 } },
  { id: 'RESONANCE', rarity: 'RARE', battle: { extraSynergy: 1 } },
  { id: 'LIGHT_DEVOURER', rarity: 'RARE', garden: { soilBonusMul: 2 } },
  { id: 'OLD_SOUL', rarity: 'RARE', battle: { expMul: 0.25 } },
  { id: 'FIRST_SNOW', rarity: 'RARE', battle: { damage: 0.12, slowImmune: 1 } },
  { id: 'GENE_STAR', rarity: 'RARE', battle: { breedTraitChance: 0.3 } },
];

export const TRAIT_BY_ID: ReadonlyMap<string, TraitDef> = new Map(TRAITS.map((t) => [t.id, t]));
export const TRAIT_RARITY_WEIGHT: Record<TraitRarity, number> = {
  COMMON: 70,
  UNCOMMON: 25,
  RARE: 5,
};
