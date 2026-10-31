// 전투 결과 정산 (06문서 5 · 13절, 09문서): 식물 경험치 · 애정도 · 잎전 · 씨앗 · 정원사 경험치 · 스테이지 진행

import { Rng } from '../../core/Rng';
import { localParts } from '../../core/Clock';
import type { GameState } from '../../core/GameState';
import { DIFFICULTY, type DifficultyId } from '../../data/battle/difficulty';
import type { StageDef } from '../../data/battle/stages';
import { addItem, seedKey } from '../economy/Inventory';
import { gainPlayerExp } from '../economy/PlayerLevel';
import { gainAffection } from '../garden/Affection';
import type { BattleResult } from './BattleSim';

export const MAX_PLANT_LEVEL = 30;
export const expToNextPlant = (level: number): number => Math.round(100 * level ** 1.5);

/** 1챕터 스테이지 클리어 시 나오는 씨앗 후보(07문서 챕터별 드랍 풀의 초반 종) */
const SEED_POOL_C1 = [
  'P001',
  'P002',
  'P011',
  'P012',
  'P021',
  'P022',
  'P031',
  'P032',
  'P041',
  'P051',
  'P061',
  'P071',
  'P081',
  'P091',
  'P003',
  'P013',
  'P042',
];

export interface PlantGain {
  uid: string;
  exp: number;
  levelUps: number;
  level: number;
  mvp: boolean;
}

export interface RewardSummary {
  won: boolean;
  firstClear: boolean;
  coin: number;
  dew: number;
  playerExp: number;
  plants: PlantGain[];
  drops: { id: string; n: number }[];
}

/** 식물에 경험치를 넣고 오른 레벨 수를 돌려준다 */
export function addPlantExp(p: { level: number; exp: number }, amount: number): number {
  let ups = 0;
  p.exp += amount;
  while (p.level < MAX_PLANT_LEVEL && p.exp >= expToNextPlant(p.level)) {
    p.exp -= expToNextPlant(p.level);
    p.level++;
    ups++;
  }
  if (p.level >= MAX_PLANT_LEVEL) p.exp = 0;
  return ups;
}

export function applyOutcome(
  state: GameState,
  stage: StageDef,
  difficulty: DifficultyId,
  result: BattleResult,
  /** 덱에 넣은 식물(uid) */
  deckUids: string[],
  /** 실제로 출전(배치)한 식물 uid → 해당 식물이 낸 기여 */
  deployed: Map<string, number>,
  mvpUid: string | null,
  now: number,
): RewardSummary {
  const d = DIFFICULTY[difficulty];
  const won = result.won;
  const prog = (state.progress[stage.id] ??= { stars: 0, tries: 0, clears: {} });
  prog.tries++;
  const firstClear = won && prog.stars === 0;
  if (won) {
    prog.stars = Math.max(prog.stars, result.stars);
    prog.clears[difficulty] = (prog.clears[difficulty] ?? 0) + 1;
  }
  const expMul = won ? 1 : 0.5;
  const date = localParts(now).dateKey;
  const plants: PlantGain[] = [];
  for (const uid of deckUids) {
    const p = state.plants.find((x) => x.uid === uid);
    if (!p) continue;
    const out = deployed.has(uid);
    const mvp = uid === mvpUid;
    const exp = Math.round(
      40 * stage.chapter * d.rewardMul * (out ? (mvp ? 1.5 : 1) : 0.3) * expMul,
    );
    const levelUps = addPlantExp(p, exp);
    if (out) gainAffection(p, 3 + (mvp && won ? 5 : 0), date);
    plants.push({ uid, exp, levelUps, level: p.level, mvp });
    p.diary.push({ at: now, kind: won ? 'battleWin' : 'battleLose', stage: stage.id });
    if (p.diary.length > 50) p.diary.splice(0, p.diary.length - 50);
  }
  const waves = stage.waves.length;
  let coin = Math.round((30 + 6 * waves) * d.rewardMul * (won ? 1 : 0.3));
  let dew = 0;
  if (firstClear) {
    coin *= 2;
    dew = 3;
  }
  state.player.coin += coin;
  state.player.dew += dew;
  const playerExp = won ? 10 * stage.chapter + 5 * result.stars : 3;
  gainPlayerExp(state, playerExp);
  const drops: { id: string; n: number }[] = [];
  if (won) {
    const rng = new Rng(`drop:${stage.id}:${difficulty}:${prog.tries}:${state.meta.createdAt}`);
    if (firstClear || rng.chance(0.35)) {
      const id = SEED_POOL_C1[rng.int(0, SEED_POOL_C1.length - 1)];
      addItem(state, seedKey(id), 1);
      drops.push({ id: seedKey(id), n: 1 });
    }
    if (rng.chance(0.6)) {
      addItem(state, 'COMPOST', 1);
      drops.push({ id: 'COMPOST', n: 1 });
    }
  }
  return { won, firstClear, coin, dew, playerExp, plants, drops };
}

/** 스테이지 해금: 앞 스테이지를 1번 이상 클리어해야 다음이 열린다(1-1 은 처음부터) */
export function stageUnlocked(state: GameState, stages: StageDef[], index: number): boolean {
  if (index === 0) return true;
  return (state.progress[stages[index - 1].id]?.stars ?? 0) > 0;
}
