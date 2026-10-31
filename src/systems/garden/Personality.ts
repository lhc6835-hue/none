// 성격 8종 (04문서 7절): 새싹 단계에서 무작위로 정해진다.

import type { Rng } from '../../core/Rng';
import type { PersonalityId } from '../../core/schema';
import { PERSONALITIES, PERSONALITY_IDS, type PersonalityDef } from '../../data/personalities';

export function rollPersonality(rng: Rng): PersonalityId {
  return rng.pick(PERSONALITY_IDS);
}

export const personalityOf = (id: PersonalityId): PersonalityDef => PERSONALITIES[id];
