// 성격 8종 (04문서 7절). 새싹 단계에서 무작위로 정해진다. 정원 · 전투 효과를 수치로 둔다.

import type { PersonalityId } from '../core/schema';

export interface PersonalityDef {
  id: PersonalityId;
  nameKey: string;
  garden: {
    /** 모든 욕구 감소 배율 */
    needsDecayMul?: number;
    moodDecayMul?: number;
    nutritionDecayMul?: number;
    /** 쓰다듬기 효과 배율 */
    petMul?: number;
    /** 처음 쓰다듬기 2번 효과 · 그 뒤 배율(수줍음) */
    petFirstTwo?: number;
    petAfter?: number;
    /** 영양제 · 간식 효과 배율 */
    nutrientMul?: number;
    affectionMul?: number;
    /** 더러울 때 기분 페널티 · 청소했을 때 기분 배율(깔끔쟁이) */
    dirtyMoodMul?: number;
    cleanMoodMul?: number;
    /** 야외 구역에서 기분이 깎인다 */
    dislikesOutdoor?: boolean;
    likesBattlePhrase?: boolean;
    afterBattleMood?: number;
    /** 늦잠(시간) · 밤 성장 배율 */
    wakeLateHours?: number;
    nightGpMul?: number;
  };
  /** 전투 보정(M3 에서 사용) */
  battle: Record<string, number>;
  /** 대표 대기 동작 */
  idle: 'yawn' | 'wink' | 'shy' | 'mouth' | 'shake' | 'lean' | 'battle' | 'doze';
}

export const PERSONALITIES: Record<PersonalityId, PersonalityDef> = {
  LAID_BACK: {
    id: 'LAID_BACK',
    nameKey: 'personality.LAID_BACK',
    garden: { needsDecayMul: 0.8 },
    battle: { hpMul: 0.05 },
    idle: 'yawn',
  },
  PLAYFUL: {
    id: 'PLAYFUL',
    nameKey: 'personality.PLAYFUL',
    garden: { moodDecayMul: 1.2, petMul: 1.3 },
    battle: { crit: 0.03 },
    idle: 'wink',
  },
  SHY: {
    id: 'SHY',
    nameKey: 'personality.SHY',
    garden: { petFirstTwo: 0.5, petAfter: 1.5, dislikesOutdoor: true },
    battle: { range: 0.2 },
    idle: 'shy',
  },
  GLUTTON: {
    id: 'GLUTTON',
    nameKey: 'personality.GLUTTON',
    garden: { nutritionDecayMul: 1.3, nutrientMul: 1.3 },
    battle: { bloomGauge: 0.1 },
    idle: 'mouth',
  },
  NEAT: {
    id: 'NEAT',
    nameKey: 'personality.NEAT',
    garden: { dirtyMoodMul: 2, cleanMoodMul: 2 },
    battle: { debuffDuration: -0.3 },
    idle: 'shake',
  },
  SPOILED: {
    id: 'SPOILED',
    nameKey: 'personality.SPOILED',
    garden: { moodDecayMul: 1.3, affectionMul: 1.3 },
    battle: { sameSpeciesAtkSpeed: 0.05 },
    idle: 'lean',
  },
  BRAVE: {
    id: 'BRAVE',
    nameKey: 'personality.BRAVE',
    garden: { likesBattlePhrase: true, afterBattleMood: 5 },
    battle: { damage: 0.05 },
    idle: 'battle',
  },
  SLEEPY: {
    id: 'SLEEPY',
    nameKey: 'personality.SLEEPY',
    garden: { wakeLateHours: 1, nightGpMul: 1.2 },
    battle: { bloomDuration: 0.2 },
    idle: 'doze',
  },
};

export const PERSONALITY_IDS = Object.keys(PERSONALITIES) as PersonalityId[];
