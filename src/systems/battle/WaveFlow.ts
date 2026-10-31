// 전투 시뮬레이션에서 떼어 낸 부분. 함수 첫 인자 s 가 BattleSim 이다.

import { ENEMIES } from '../../data/battle/enemies';
import type { WaveGroup } from '../../data/battle/waves';
import { tk } from './types';
import type { BattleSim } from './BattleSim';

export function waveGroups(s: BattleSim, w: number): WaveGroup[] {
  const base = s.stage.waves;
  if (w <= base.length) return base[w - 1];
  // 난이도로 늘어난 웨이브: 마지막 웨이브를 키워서 되풀이한다
  const last = base[base.length - 1];
  const k = 1 + 0.1 * (w - base.length);
  return last.map((g) => ({ ...g, n: Math.max(1, Math.round(g.n * k)) }));
}

export function startWave(s: BattleSim): void {
  s.wave++;
  const groups = s.waveGroups(s.wave);
  const eliteEvery = s.diff.eliteEvery;
  const elite = eliteEvery > 0 && s.wave % eliteEvery === 0;
  let planned = 0;
  for (const g of groups) {
    for (let i = 0; i < g.n; i++) {
      s.spawnQueue.push({
        at: s.tick + tk(g.delay + i * g.gap),
        e: g.e,
        entrance: g.entrance,
        wave: s.wave,
        elite: elite && i === 0 && !ENEMIES[g.e].boss,
      });
      planned++;
    }
  }
  s.spawnQueue.sort((a, b) => a.at - b.at);
  s.plannedPerWave.set(s.wave, planned);
  s.spawnedPerWave.set(s.wave, 0);
  s.alivePerWave.set(s.wave, 0);
  s.emit({ t: 'wave', wave: s.wave, total: s.totalWaves });
  s.countdown = Infinity;
}

export function afterWave(s: BattleSim): void {
  // 웨이브 클리어 보너스, 다음 웨이브 카운트다운
  const w = s.wave;
  if (w === 0) return;
  const planned = s.plannedPerWave.get(w) ?? 0;
  const spawned = s.spawnedPerWave.get(w) ?? 0;
  const alive = s.alivePerWave.get(w) ?? 0;
  if (spawned >= planned && !Number.isFinite(s.countdown) && w < s.totalWaves) {
    s.countdown = tk(s.stage.waveGap);
  }
  for (const [wn, a] of s.alivePerWave) {
    if (a <= 0 && (s.spawnedPerWave.get(wn) ?? 0) >= (s.plannedPerWave.get(wn) ?? 0)) {
      s.alivePerWave.delete(wn);
      const bonus = 20 + 5 * wn;
      s.nutrient += bonus;
      s.emit({ t: 'waveClear', wave: wn, bonus });
      // 이자(별사탕 금잔화 · 풍작 분기)
      for (const t of s.towers) {
        const rate = (t.spec.p?.interest ?? 0) + (t.aux.interest ?? 0);
        if (rate > 0)
          s.nutrient += Math.min(t.spec.p?.interestMax ?? 40, Math.floor(s.nutrient * rate));
      }
    }
  }
  if (w >= s.totalWaves && alive <= 0 && s.spawnQueue.length === 0 && s.enemies.length === 0) {
    s.phase = 'WON';
    s.emit({ t: 'end', won: true });
  }
}
