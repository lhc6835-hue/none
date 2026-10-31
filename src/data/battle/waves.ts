// 웨이브 구성 (08문서 4절)
// 웨이브 = { 적 ID, 마릿수, 출현 간격(초), 시작 지연(초), 입구 번호 } 묶음의 목록.
// 위협 예산: (18 + 4 × 챕터) × (1 + 0.15 × (w − 1)), 마지막 웨이브 ×1.5, 5웨이브마다 한숨(×0.7) 다음 압박(×1.2).

import { ENEMIES } from './enemies';

export interface WaveGroup {
  e: string;
  n: number;
  gap: number;
  delay: number;
  entrance: number;
}

const g = (e: string, n: number, gap: number, delay = 0, entrance = 0): WaveGroup => ({
  e,
  n,
  gap,
  delay,
  entrance,
});

/** 1-1 '울타리 아래' (보통, 8웨이브) — 문서의 표 그대로 */
export const WAVES_1_1: WaveGroup[][] = [
  [g('E01', 6, 1.2)],
  [g('E01', 10, 1.0)],
  [g('E01', 8, 1.0), g('E01', 4, 0.5, 9)],
  [g('E01', 14, 0.8)],
  [g('E01', 12, 0.7)],
  [g('E01', 20, 0.6)],
  [g('E01', 24, 0.5)],
  [g('E01', 30, 0.4)],
];

export interface WaveGenParams {
  chapter: number;
  count: number;
  pool: string[];
  newEnemy: string;
  entrances: number;
  budgetMul: number;
  boss?: boolean;
}

export function waveBudget(chapter: number, w: number, count: number, mul: number): number {
  let b = (18 + 4 * chapter) * (1 + 0.15 * (w - 1)) * mul;
  if (w === count) b *= 1.5;
  else if (w % 5 === 0)
    b *= 0.7; // 한숨 돌리는 웨이브
  else if (w > 1 && (w - 1) % 5 === 0) b *= 1.2; // 압박 웨이브
  return b;
}

/** 규칙에 따라 웨이브 초안을 만든다(난수 없이 결정적) */
export function buildWaves(p: WaveGenParams): WaveGroup[][] {
  const waves: WaveGroup[][] = [];
  const allPool = p.pool.filter((id) => id !== p.newEnemy || !p.boss);
  for (let w = 1; w <= p.count; w++) {
    // 새 적은 2웨이브에 처음 나온다(1웨이브에는 섞지 않는다)
    const pool = w < 2 ? allPool.filter((id) => id !== p.newEnemy) : allPool;
    const budget = waveBudget(p.chapter, w, p.count, p.budgetMul);
    const groups: WaveGroup[] = [];
    const ent = (i: number) => i % p.entrances;
    const add = (id: string, share: number, gap: number, delay: number, i: number) => {
      const t = ENEMIES[id].threat;
      const n = Math.max(1, Math.floor(share / t));
      groups.push(g(id, n, gap, delay, ent(i)));
    };
    const isNew = !p.boss && p.newEnemy !== 'E01';
    if (p.boss && w === p.count) {
      // 보스 웨이브: 보스 + 호위
      groups.push(g(p.newEnemy, 1, 1, 0, 0));
      add('E01', budget * 0.5, 0.6, 6, 0);
      add(pool[(w + 1) % pool.length], budget * 0.3, 1.2, 12, 1);
    } else if (isNew && w === 3) {
      add(p.newEnemy, budget, 1.4, 0, 0); // 소개 웨이브: 새 적만
    } else if (isNew && w === 2) {
      add('E01', budget * 0.6, 0.9, 0, 0);
      add(p.newEnemy, budget * 0.4, 1.4, 6, 1);
    } else {
      const a = pool[(w - 1) % pool.length];
      const b = pool[(w + 1) % pool.length];
      const gapA = Math.max(0.4, 1.2 - 0.04 * w);
      if (a === b || a === 'E01') {
        add('E01', budget * 0.6, gapA, 0, 0);
        add(pool[(w + 2) % pool.length], budget * 0.4, 1.3, 8, 1);
      } else {
        add(a, budget * 0.6, 1.3, 0, 0);
        add(b, budget * 0.4, 1.2, 7, 1);
      }
    }
    waves.push(groups);
  }
  return waves;
}
