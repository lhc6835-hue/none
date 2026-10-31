// 자질 판정 (04문서 9-1): 개화하는 순간 1회.
//  성장하는 동안 1분마다 컨디션을 기록해 평균을 내고, '완벽 돌봄 비율 × 0.2' 를 더한다.
//  0.8 미만 ★1 · 0.8–1.0 ★2 · 1.0–1.15 ★3 · 1.15–1.3 ★4 · 1.3 이상 ★5. 별빛 앰플은 50% 확률로 ★+1.

import type { Rng } from '../../core/Rng';
import type { PlantInstance } from '../../core/schema';
import { QUALITY } from '../../data/care';

export type Stars = 1 | 2 | 3 | 4 | 5;

export function recordCondition(plant: PlantInstance, condition: number): void {
  plant.qualityLog.sum += condition;
  plant.qualityLog.count += 1;
}

export function recordAction(plant: PlantInstance, perfect: boolean): void {
  plant.qualityLog.actions += 1;
  if (perfect) plant.qualityLog.perfect += 1;
}

export function qualityScore(plant: PlantInstance): number {
  const log = plant.qualityLog;
  const avg = log.count > 0 ? log.sum / log.count : 1;
  const perfectRatio = log.actions > 0 ? log.perfect / log.actions : 0;
  return avg + perfectRatio * QUALITY.perfectWeight;
}

export function starsFor(score: number): Stars {
  const cuts = QUALITY.cuts;
  let stars = 1;
  for (const c of cuts) if (score >= c) stars++;
  return stars as Stars;
}

/** 별빛 앰플이면 50% 확률로 ★+1 (최대 5) */
export function finalStars(plant: PlantInstance, rng: Rng, starAmpoule: boolean): Stars {
  let stars = starsFor(qualityScore(plant));
  if (starAmpoule && stars < 5 && rng.chance(QUALITY.starAmpouleChance))
    stars = (stars + 1) as Stars;
  return stars;
}

/** 자질 보너스(전투 능력치): ★1 0% · ★2 +5% · ★3 +10% · ★4 +16% · ★5 +24% */
export const qualityBonus = (stars: number): number =>
  QUALITY.battleBonus[Math.max(1, Math.min(5, stars)) - 1];
