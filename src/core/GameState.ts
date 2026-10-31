// 저장 대상인 모든 상태를 가진 순수 객체 (12문서 4절 1항).
// 씬은 이 객체를 직접 바꾸지 않고 systems/ 의 함수를 호출한다.

import type { PlantInstance } from './schema';
import { Rng, type RngState } from './Rng';

/** 저장 형식의 스키마 버전. 올릴 때는 migrations/ 에 단계 함수를 추가한다. */
export const SAVE_VERSION = 1;

export interface PlayerState {
  name: string;
  level: number;
  exp: number;
  /** 잎전 */
  coin: number;
  /** 맑은 이슬 */
  dew: number;
  /** 관찰 노트 */
  notes: number;
}

/** 봉투 추첨 상태: 저장 파일에 들어가 봉투를 열 때마다 이어서 진행한다(12문서 8절). */
export interface PacketState {
  rng: RngState;
  /** 봉투 종류별 천장 카운트(마지막 상위 등급 이후 연 횟수) */
  pity: Record<string, number>;
  opened: number;
}

export interface GameState {
  version: number;
  meta: {
    createdAt: number;
    /** 마지막으로 저장한 시각(ms). 오프라인 계산의 기준 */
    lastPlayedAt: number;
    playSeconds: number;
    saveCount: number;
  };
  player: PlayerState;
  plants: PlantInstance[];
  packet: PacketState;
  /** 해금 · 튜토리얼 · 한 번만 보는 안내 등 */
  flags: Record<string, boolean>;
  tutorial: { step: number; done: boolean };
  /** 돌봄 숙련도(플레이어 단위, 04문서) */
  mastery: Record<string, number>;
}

/** 새 게임 상태. 시각은 호출하는 쪽이 Clock에서 읽어 넘긴다. */
export function createInitialState(now: number, packetSeed = 'packet-initial'): GameState {
  return {
    version: SAVE_VERSION,
    meta: { createdAt: now, lastPlayedAt: now, playSeconds: 0, saveCount: 0 },
    player: { name: '', level: 1, exp: 0, coin: 0, dew: 0, notes: 0 },
    plants: [],
    packet: { rng: packetSeedState(packetSeed), pity: {}, opened: 0 },
    flags: {},
    tutorial: { step: 0, done: false },
    mastery: {},
  };
}

function packetSeedState(seed: string): RngState {
  return new Rng(seed).state();
}
