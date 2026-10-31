// 돌봄 행동의 공통 틀 (04문서 5절): 해금 검사 · 숙련도 · 완벽 판정 · 애정도 · 기록.
// 입력 손놀림(누르고 있기 · 문지르기 · 끌기)은 화면이 맡고, 여기서는 그 결과값을 받아 효과를 정한다.

import type { EventBus } from '../../core/EventBus';
import type { GameEvents } from '../../core/events';
import type { GameState } from '../../core/GameState';
import type { Rng } from '../../core/Rng';
import type { PlantInstance } from '../../core/schema';
import {
  CARE_UNLOCK,
  MASTERY_AT,
  MASTERY_PERFECT_WINDOW,
  type CareAction,
  AFFECTION,
} from '../../data/care';
import type { SfxId } from '../../data/sfx';
import type { PlantBase } from '../../data/plants';
import { EXP_CARE_NORMAL, EXP_CARE_PERFECT, gainPlayerExp } from '../economy/PlayerLevel';
import { gainAffection } from './Affection';
import type { PlantEnv } from './Environment';
import { recordAction } from './Quality';

type Emitter = Pick<EventBus<GameEvents>, 'emit'>;

/** 식물이 보이는 반응(표정 · 몸짓). 화면이 FaceRenderer 표정과 트윈으로 옮긴다. */
export type Reaction =
  'happy' | 'excited' | 'gulp' | 'ticklish' | 'pain' | 'sulk' | 'surprise' | 'shy' | 'none';

export type CareFailure =
  | 'locked'
  | 'noItem'
  | 'wrongStage'
  | 'notNeeded'
  | 'cooldown'
  | 'tooShort'
  | 'tooFewTaps'
  | 'wrongLeaf'
  | 'turnAway'
  | 'sleeping'
  | 'noTarget';

export interface CareCtx {
  state: GameState;
  plant: PlantInstance;
  base: PlantBase;
  env: PlantEnv;
  now: number;
  /** 현지 날짜('YYYY-MM-DD'): 하루 애정도 상한 계산용 */
  dateKey: string;
  bus: Emitter;
  rng: Rng;
}

export interface CareResult {
  ok: boolean;
  perfect: boolean;
  reaction: Reaction;
  sfx: SfxId | null;
  reason?: CareFailure;
  /** 화면이 보여 줄 숫자들(예: 애정도 증가, 얻은 꽃가루) */
  info?: Record<string, number | string | boolean>;
}

export const fail = (
  reason: CareFailure,
  reaction: Reaction = 'none',
  sfx: SfxId | null = 'ui_error',
): CareResult => ({
  ok: false,
  perfect: false,
  reaction,
  sfx,
  reason,
});

/** 숙련도 1–5 (행동 횟수 0 · 10 · 30 · 80 · 200) */
export function masteryLevel(state: GameState, action: CareAction): number {
  const n = state.mastery[action] ?? 0;
  let lv = 1;
  MASTERY_AT.forEach((t, i) => {
    if (n >= t) lv = i + 1;
  });
  return lv;
}

/** 숙련 2 이상이면 완벽 판정 구간이 20% 넓어진다 */
export const perfectWindow = (state: GameState, action: CareAction): number =>
  masteryLevel(state, action) >= 2 ? MASTERY_PERFECT_WINDOW : 1;

export const isUnlocked = (state: GameState, action: CareAction): boolean =>
  state.player.level >= CARE_UNLOCK[action];

/** 행동을 시작하기 전 공통 검사. 통과하면 null, 막히면 실패 결과. */
export function gate(ctx: CareCtx, action: CareAction): CareResult | null {
  if (!isUnlocked(ctx.state, action)) return fail('locked');
  return null;
}

/**
 * 행동이 끝났을 때의 공통 처리: 숙련도 · 자질 기록 · 애정도 · 마지막 돌봄 시각 · 이벤트.
 * 애정도: 완벽 +3 · 일반 +1 (하루 한 식물당 최대 60). extraAffection 은 쓰다듬기 등의 고유 증가분.
 */
export function finishCare(
  ctx: CareCtx,
  action: CareAction,
  perfect: boolean,
  extraAffection = 0,
): number {
  const { state, plant } = ctx;
  state.mastery[action] = (state.mastery[action] ?? 0) + 1;
  recordAction(plant, perfect);
  plant.lastCare[action] = ctx.now;
  const gain = gainAffection(
    plant,
    (perfect ? AFFECTION.gain.perfect : AFFECTION.gain.normal) + extraAffection,
    ctx.dateKey,
  );
  gainPlayerExp(state, perfect ? EXP_CARE_PERFECT : EXP_CARE_NORMAL, ctx.bus);
  ctx.bus.emit('plant:cared', { uid: plant.uid, action, perfect });
  return gain.gained;
}
