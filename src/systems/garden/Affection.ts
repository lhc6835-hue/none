// 애정도 ♡0–♡10 (04문서 8절). 하루 한 식물당 최대 60, 거의 줄지 않는다(7일 이상 방치하면 하루 -5).

import type { PlantInstance } from '../../core/schema';
import { AFFECTION } from '../../data/care';
import { PERSONALITIES } from '../../data/personalities';
import { POTS } from '../../data/pots';

/** 누적 점수 → 하트 수(0–10) */
export function affectionLevel(points: number): number {
  let lv = 0;
  for (const t of AFFECTION.thresholds) if (points >= t) lv++;
  return lv;
}

export interface AffectionGain {
  gained: number;
  level: number;
  /** 하트가 올랐으면 새 단계 */
  levelUp: number | null;
}

/**
 * 애정도를 올린다. 성격(응석받이 ×1.3) · 화분(그루터기 ×1.1)이 곱해지고 하루 상한 60 을 지킨다.
 * dateKey 가 바뀌면 오늘 얻은 양이 0 으로 돌아간다.
 */
export function gainAffection(
  plant: PlantInstance,
  amount: number,
  dateKey: string,
): AffectionGain {
  if (plant.affectionDay !== dateKey) {
    plant.affectionDay = dateKey;
    plant.affectionToday = 0;
  }
  const mul =
    (PERSONALITIES[plant.personality].garden.affectionMul ?? 1) *
    (POTS[plant.potId]?.affectionMul ?? 1);
  const want = Math.round(amount * mul);
  const room = Math.max(0, AFFECTION.dailyCap - plant.affectionToday);
  const gained = Math.min(want, room);
  const before = affectionLevel(plant.affection);
  plant.affection += gained;
  plant.affectionToday += gained;
  const after = affectionLevel(plant.affection);
  return { gained, level: after, levelUp: after > before ? after : null };
}

/** 7일 이상 돌보지 않으면 하루 -5. ♡ 단계는 떨어지지 않는다(단계 하한까지만 줄어든다). */
export function neglectPenalty(plant: PlantInstance, days: number): number {
  if (days < AFFECTION.neglectDays) return 0;
  const floor = affectionFloor(plant.affection);
  const loss = Math.min(
    plant.affection - floor,
    -AFFECTION.neglectPerDay * (days - AFFECTION.neglectDays + 1),
  );
  plant.affection -= Math.max(0, loss);
  return Math.max(0, loss);
}

/** 현재 ♡ 단계의 시작 점수 */
export function affectionFloor(points: number): number {
  const lv = affectionLevel(points);
  return lv === 0 ? 0 : AFFECTION.thresholds[lv - 1];
}
