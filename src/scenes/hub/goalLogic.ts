// '다음 할 일' 계산(순수 함수, Phaser 없음 → 단위 테스트). 핵심 루프의 다음 걸음 하나를 고른다:
// 심기 → (급한 돌봄) → 어린잎까지 키우기 → 첫 출격 → 다음 스테이지 → 더 높은 난이도.

import type { GameState } from '../../core/GameState';
import type { PlantInstance } from '../../core/schema';
import { STAGES } from '../../data/battle/stages';
import { HUB_OBJECTS, slotX, slotY } from '../../data/hubLayout';
import { t } from '../../i18n';

export type GoalId = 'plant' | 'care' | 'grow' | 'sortie' | 'next' | 'master';

export interface Goal {
  id: GoalId;
  text: string;
  icon: string;
  target: { x: number; y: number } | null;
  uid?: string;
}

const READY_STAGE = 3; // 어린잎부터 출격(04문서 2절)

function plantPoint(p: PlantInstance): { x: number; y: number } | null {
  const x = slotX(p.location.zone, p.location.slot);
  return x ? { x, y: slotY(p.location.zone) } : null;
}

function nameOf(p: PlantInstance): string {
  return p.nickname || t(`plant.${p.speciesId}.name`);
}

/** 상태 → 다음 할 일(순수 계산, 테스트 가능) */
export function currentGoal(state: GameState): Goal {
  const plants = state.plants.filter((p) => plantPoint(p) !== null);
  if (plants.length === 0)
    return {
      id: 'plant',
      text: t('hub.goal.plant'),
      icon: 'seed',
      target: { ...HUB_OBJECTS.seedBox },
    };

  // 급한 돌봄: 가장 부족한 욕구 하나
  let worst: { p: PlantInstance; need: string; v: number } | null = null;
  for (const p of plants) {
    if (p.stage === 0 && p.needs.water >= 25) continue;
    const list: [string, number][] = [
      ['water', p.needs.water / 25],
      ['nutrition', p.needs.nutrition / 25],
      ['hygiene', p.problems.length > 0 ? 0.5 : p.needs.hygiene / 50],
      ['mood', p.needs.mood / 30],
    ];
    for (const [need, v] of list) if (v < 1 && (!worst || v < worst.v)) worst = { p, need, v };
  }
  if (worst)
    return {
      id: 'care',
      text: t(`hub.goal.care.${worst.need}`, { name: nameOf(worst.p) }),
      icon: worst.need === 'water' ? 'drop' : worst.need === 'mood' ? 'heart' : 'leaf',
      target: plantPoint(worst.p),
      uid: worst.p.uid,
    };

  const ready = plants.filter((p) => p.stage >= READY_STAGE);
  if (ready.length === 0) {
    const best = plants.reduce((a, b) =>
      b.stage > a.stage || (b.stage === a.stage && b.gp > a.gp) ? b : a,
    );
    return {
      id: 'grow',
      text: t('hub.goal.grow', {
        name: nameOf(best),
        stage: t(`stage.${best.stage}`),
      }),
      icon: 'leaf',
      target: plantPoint(best),
      uid: best.uid,
    };
  }
  const next = STAGES.find((s) => !((state.progress[s.id]?.stars ?? 0) > 0));
  const gate = { x: HUB_OBJECTS.gate.x, y: HUB_OBJECTS.gate.y - 40 };
  if (next && next.id === STAGES[0].id)
    return {
      id: 'sortie',
      text: t('hub.goal.sortie', { stage: next.id }),
      icon: 'door',
      target: gate,
    };
  if (next)
    return {
      id: 'next',
      text: t('hub.goal.next', { stage: next.id, name: t(`stage.${next.id}`) }),
      icon: 'door',
      target: gate,
    };
  return { id: 'master', text: t('hub.goal.master'), icon: 'star', target: gate };
}
