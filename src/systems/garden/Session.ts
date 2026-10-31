// 정원 세션: 화면이 매 프레임 advance() 를 부르면, 흐른 시간만큼 정원을 진행한다.
//  - 1초 이상 2분 이하: 라이브 틱(욕구 · 판정 · 성장을 실시간 속도로)
//  - 2분 초과: 오프라인 계산(절반 속도, 20 하한, 12시간 상한)으로 넘기고 '그동안 있었던 일' 보고서를 돌려준다
//  - 시계가 뒤로 가면 그 구간은 무시한다
// Phaser 를 모른다. 시간은 Clock 으로만 읽는다.

import type { Clock } from '../../core/Clock';
import { localParts } from '../../core/Clock';
import type { EventBus } from '../../core/EventBus';
import type { GameEvents } from '../../core/events';
import type { GameState } from '../../core/GameState';
import { makeRng } from '../../core/Rng';
import type { PlantInstance } from '../../core/schema';
import { EXP_BLOOM, gainPlayerExp } from '../economy/PlayerLevel';
import type { CareCtx } from './Care';
import { worldAt, type PlantEnv, type WorldSnapshot } from './Environment';
import { baseOf, plantEnv, tickGarden } from './Garden';
import { simulateOffline, type OfflineReport } from './Offline';

type Emitter = Pick<EventBus<GameEvents>, 'emit'>;

export const LIVE_STEP_MS = 1000;
export const LIVE_MAX_MS = 120_000;

export class GardenSession {
  private seq = 0;
  private readonly emitter: Emitter;

  constructor(
    readonly state: GameState,
    private readonly clock: Clock,
    private readonly bus: Emitter,
  ) {
    // 개화하면 정원사 경험치 +20 (09문서 8절). 이벤트는 그대로 흘려보낸다.
    this.emitter = {
      emit: <K extends keyof GameEvents>(event: K, payload: GameEvents[K]) => {
        if (event === 'plant:bloom') gainPlayerExp(state, EXP_BLOOM, bus);
        bus.emit(event, payload);
      },
    };
  }

  now(): number {
    return this.clock.now();
  }

  world(): WorldSnapshot {
    return worldAt(this.clock.now());
  }

  envOf(plant: PlantInstance): PlantEnv {
    return plantEnv(this.state, plant, this.world());
  }

  /** 흐른 시간만큼 정원을 진행한다. 오프라인으로 처리했으면 보고서를 돌려준다. */
  advance(): OfflineReport | null {
    const now = this.clock.now();
    const g = this.state.garden;
    const gap = now - g.lastTickAt;
    if (gap < 0) {
      g.lastTickAt = now; // 시계를 되돌림: 그 구간은 무시
      return null;
    }
    if (gap < LIVE_STEP_MS) return null;
    if (gap > LIVE_MAX_MS) {
      const report = simulateOffline(this.state, g.lastTickAt, now);
      g.lastTickAt = now;
      for (const line of report.lines) {
        if (line.kind === 'bloom') gainPlayerExp(this.state, EXP_BLOOM, this.bus);
      }
      return report;
    }
    tickGarden(this.state, gap / 1000, now, worldAt(now), this.emitter);
    return null;
  }

  /** 돌봄 함수에 넘길 맥락. 난수는 식물 · 횟수에 묶인 결정적 흐름이다. */
  ctxFor(plant: PlantInstance): CareCtx {
    const now = this.clock.now();
    return {
      state: this.state,
      plant,
      base: baseOf(plant.speciesId),
      env: this.envOf(plant),
      now,
      dateKey: localParts(now).dateKey,
      bus: this.emitter,
      rng: makeRng('garden', plant.uid, 'care', now, this.seq++),
    };
  }
}
