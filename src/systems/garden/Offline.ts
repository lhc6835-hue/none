// 오프라인 성장 (04문서 2-3 · 12문서 7절)
//  - 경과 = min(지금 − lastUpdated, 12시간). 음수(시계를 되돌림)면 0 으로 보고 시각만 갱신한다.
//  - 10분 단위 묶음(최대 72묶음 × 식물 수)으로 계산한다. 초 단위로 돌리지 않는다.
//  - 묶음마다 욕구 감소(절반 속도, 하한 20) · 곰팡이 · 해충 판정 · GP 적립. 판정 난수는 (식물 uid, 묶음 시각) 시드.
//  - GP = 경과 초 × 0.8 × 환경 일치 배율. 결과는 '그동안 있었던 일' 카드용 보고서로 돌려준다.

import { makeRng } from '../../core/Rng';
import type { EventBus } from '../../core/EventBus';
import type { GameEvents } from '../../core/events';
import type { GameState } from '../../core/GameState';
import { OFFLINE, PROBLEMS } from '../../data/care';
import { ZONES } from '../../data/zones';
import { worldAt } from './Environment';
import { addGp } from './Growth';
import { applyDecay, conditionOf, decayRates } from './Needs';
import { baseOf, familyOf, plantEnv } from './Garden';
import {
  dropLockedProblems,
  fungusEatsMold,
  neighborhoodOf,
  rollProblems,
  tickProblems,
} from './Problems';

export type OfflineLine =
  | { kind: 'stageUp'; uid: string; to: number }
  | { kind: 'bloom'; uid: string }
  | { kind: 'mold'; uid: string; count: number }
  | { kind: 'pest'; uid: string }
  | { kind: 'sick'; uid: string; problem: string };

export interface OfflineReport {
  /** 실제로 계산에 쓴 경과(ms, 12시간 상한 적용 후) */
  elapsedMs: number;
  /** 12시간 상한에 걸렸다 */
  capped: boolean;
  /** 시계를 되돌렸다(그 구간은 무시) */
  rewound: boolean;
  batches: number;
  lines: OfflineLine[];
}

type Emitter = Pick<EventBus<GameEvents>, 'emit'>;

/** 환경 일치 배율: 빛 · 온도가 맞으면 조금 빠르고, 어긋나면 느리다(0.6–1.2). */
export function envMatchMultiplier(
  light: number,
  prefLight: number,
  temp: string,
  prefTemp: string,
  graded: boolean,
): number {
  const diff = Math.abs(light - prefLight);
  let m = 1 + (diff === 0 ? 0.1 : diff >= 2 ? -0.2 : 0);
  if (graded) m += temp === prefTemp ? 0.05 : -0.1;
  return Math.max(0.6, Math.min(1.2, m));
}

export function simulateOffline(state: GameState, fromMs: number, toMs: number): OfflineReport {
  const raw = toMs - fromMs;
  const report: OfflineReport = {
    elapsedMs: 0,
    capped: false,
    rewound: raw < 0,
    batches: 0,
    lines: [],
  };
  if (raw <= 0) {
    state.garden.lastTickAt = toMs;
    return report;
  }
  const elapsed = Math.min(raw, OFFLINE.maxMs);
  report.elapsedMs = elapsed;
  report.capped = raw > OFFLINE.maxMs;
  const batches = Math.ceil(elapsed / OFFLINE.batchMs);
  report.batches = batches;

  // 연출용 이벤트를 모아 보고서로 바꾼다(여기서는 화면 이벤트를 내보내지 않는다)
  const collector: Emitter = {
    emit: (event, payload) => {
      if (event === 'plant:stageUp') {
        const p = payload as GameEvents['plant:stageUp'];
        report.lines.push({ kind: 'stageUp', uid: p.uid, to: p.to });
      } else if (event === 'plant:bloom') {
        report.lines.push({ kind: 'bloom', uid: (payload as GameEvents['plant:bloom']).uid });
      } else if (event === 'plant:problem') {
        const p = payload as GameEvents['plant:problem'];
        if (p.kind === 'MOLD') {
          const last = [...report.lines]
            .reverse()
            .find((l) => l.kind === 'mold' && l.uid === p.uid);
          if (last && last.kind === 'mold') last.count += 1;
          else report.lines.push({ kind: 'mold', uid: p.uid, count: 1 });
        } else if (p.kind === 'PEST') report.lines.push({ kind: 'pest', uid: p.uid });
        else report.lines.push({ kind: 'sick', uid: p.uid, problem: p.kind });
      }
    },
  };

  for (const plant of state.plants) {
    if (ZONES[plant.location.zone].frozen) continue;
    const base = baseOf(plant.speciesId);
    for (let b = 0; b < batches; b++) {
      const startMs = fromMs + b * OFFLINE.batchMs;
      const dtMs = Math.min(OFFLINE.batchMs, elapsed - b * OFFLINE.batchMs);
      const t = startMs + dtMs;
      const dtSec = dtMs / 1000;
      const env = plantEnv(state, plant, worldAt(t));

      // 욕구: 절반 속도로 줄고 20 밑으로는 떨어지지 않는다(죽거나 큰 병에 걸리지 않는다)
      const rates = decayRates(plant, base);
      applyDecay(
        plant,
        {
          water: rates.water * OFFLINE.needDecayMul,
          nutrition: rates.nutrition * OFFLINE.needDecayMul,
          mood: rates.mood * OFFLINE.needDecayMul,
        },
        dtSec,
        OFFLINE.needFloor,
      );
      if (base.care.aquatic) plant.needs.water = 60;

      // 판정(10분 묶음마다 한 번, 시드 = 식물 uid + 묶음 시각)
      const nb = neighborhoodOf(plant, state.plants, familyOf);
      const rng = makeRng('garden', plant.uid, Math.floor(t / PROBLEMS.rollMs));
      for (const ev of rollProblems(plant, base, env, nb, rng, t))
        collector.emit('plant:problem', { uid: plant.uid, kind: ev.kind });
      fungusEatsMold(plant, state.plants, familyOf);
      dropLockedProblems(plant, state.player.level);
      for (const ev of tickProblems(plant, t))
        collector.emit('plant:problem', { uid: plant.uid, kind: ev.kind });

      // GP = 경과 초 × 0.8 × 환경 일치 배율 (병이 있으면 쌓이지 않는다)
      const graded =
        base.grade === 'MOON' ||
        base.grade === 'STAR' ||
        base.grade === 'AURORA' ||
        base.grade === 'ORIGIN';
      const blocked = plant.problems.some(
        (p) => p.kind === 'ROOT_ROT' || p.kind === 'MOLD_DISEASE',
      );
      if (!blocked && plant.stage < 5) {
        const mult = envMatchMultiplier(
          env.light,
          base.care.light,
          env.temp,
          base.care.temp,
          graded,
        );
        addGp(plant, base, dtSec * OFFLINE.gpMul * mult, t, collector);
      }
      // 자질용 컨디션 기록(1분 단위로 환산)
      if (plant.stage < 5) {
        const c = conditionOf(plant, base, env).value;
        const n = dtSec / 60;
        plant.qualityLog.sum += c * n;
        plant.qualityLog.count += n;
      }
    }
    plant.lastUpdated = toMs;
  }
  state.garden.lastTickAt = toMs;
  return report;
}
