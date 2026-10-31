// 헤드리스 전투 시뮬레이터 (06문서 15절): 스테이지 × 난이도를 자동 배치 봇으로 N판 돌려 클리어율을 잰다.
// 사용: npm run sim -- [스테이지ID|all] [난이도] [판수] [덱: P011,P001,...]
//   예) npm run sim -- 1-3 NORMAL 50    ·    npm run sim -- all NORMAL 20

import { DIFFICULTY, type DifficultyId } from '../src/data/battle/difficulty';
import { STAGES } from '../src/data/battle/stages';
import { defaultLoad, runBattle } from '../src/systems/battle/Bot';

const [stageArg = 'all', diffArg = 'NORMAL', runsArg = '20', deckArg = 'P011,P001,P031,P041,P012'] =
  process.argv.slice(2);
const diff = diffArg.toUpperCase() as DifficultyId;
if (!DIFFICULTY[diff]) throw new Error(`알 수 없는 난이도: ${diffArg}`);
const runs = Number(runsArg);
const deck = deckArg.split(',').map((id) => defaultLoad(id));
const stages = stageArg === 'all' ? STAGES : STAGES.filter((s) => s.id === stageArg);

console.log(`덱: ${deckArg} · 난이도 ${diff} · ${runs}판씩`);
for (const stage of stages) {
  let wins = 0;
  let hearts = 0;
  let seconds = 0;
  const leaks: Record<string, number> = {};
  for (let i = 0; i < runs; i++) {
    const { sim, result } = runBattle({
      stage,
      difficulty: diff,
      deck,
      seed: `sim${i}`,
      attempt: i,
    });
    if (result.won) wins++;
    hearts += result.heartsLeft / result.maxHearts;
    seconds += result.seconds;
    for (const [k, v] of Object.entries(sim.leakBy)) leaks[k] = (leaks[k] ?? 0) + v;
  }
  const rate = ((wins / runs) * 100).toFixed(0);
  const leakText = Object.entries(leaks)
    .map(([k, v]) => `${k}:${(v / runs).toFixed(1)}`)
    .join(' ');
  console.log(
    `${stage.id} ${rate.padStart(3)}% 클리어 · 평균 남은 하트 ${((hearts / runs) * 100).toFixed(0)}% · ${(seconds / runs).toFixed(0)}초 · 새는 하트/판 ${leakText || '-'}`,
  );
}
