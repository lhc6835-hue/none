// 저장 대상인 모든 상태를 가진 순수 객체 (12문서 4절 1항).
// 씬은 이 객체를 직접 바꾸지 않고 systems/ 의 함수를 호출한다.

import type { PlantInstance, SongGenre, ZoneId } from './schema';
import { Rng, type RngState } from './Rng';

/** 저장 형식의 스키마 버전. 올릴 때는 migrations/ 에 단계 함수를 추가한다. */
export const SAVE_VERSION = 1;

export type BlindState = 'OPEN' | 'HALF' | 'CLOSED';

/** 집 전체 설정(저장 대상): 축음기 · 구역별 블라인드 · 난로 · 선풍기 */
export interface GardenSettings {
  music: SongGenre | null;
  blinds: Partial<Record<ZoneId, BlindState>>;
  stove: boolean;
  fan: boolean;
}

export const defaultGardenSettings = (): GardenSettings => ({
  music: null,
  blinds: {},
  stove: false,
  fan: false,
});

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
  /** 가방(소모품 · 재료 · 'seed:Pxxx' 씨앗 · 'pot:ID:크기' 화분) */
  inventory: Record<string, number>;
  /** 온실 설정(축음기 · 블라인드 · 난로 · 선풍기)과 구역별로 열린 칸 수, 다음 식물 번호 */
  garden: GardenSettings & {
    slotsOpen: Partial<Record<ZoneId, number>>;
    nextUid: number;
    /** 마지막으로 시뮬레이션을 돌린 시각(ms). 오프라인 계산의 기준 */
    lastTickAt: number;
    /** 허브를 마지막으로 보던 가로 위치(다음 접속 때 그 자리에서 시작) */
    hubPan?: number;
  };
  packet: PacketState;
  /** 해금 · 튜토리얼 · 한 번만 보는 안내 등 */
  flags: Record<string, boolean>;
  tutorial: { step: number; done: boolean };
  /** 돌봄 숙련도(플레이어 단위, 04문서) */
  mastery: Record<string, number>;
  /** 스테이지 진행: 최고 별 · 난이도별 클리어 횟수 · 도전 횟수 */
  progress: Record<string, StageProgress>;
  /** 출격 준비: 마지막으로 고른 덱(uid) · 장착한 정원사 도구 · 마지막 난이도 */
  loadout: { deck: string[]; tools: string[]; difficulty: string };
}

export interface StageProgress {
  stars: number;
  tries: number;
  clears: Record<string, number>;
}

/** 새 게임 상태. 시각은 호출하는 쪽이 Clock에서 읽어 넘긴다. */
export function createInitialState(now: number, packetSeed = 'packet-initial'): GameState {
  return {
    version: SAVE_VERSION,
    meta: { createdAt: now, lastPlayedAt: now, playSeconds: 0, saveCount: 0 },
    player: { name: '', level: 1, exp: 0, coin: 0, dew: 0, notes: 0 },
    plants: [],
    inventory: {},
    garden: { ...defaultGardenSettings(), slotsOpen: {}, nextUid: 1, lastTickAt: now },
    packet: { rng: packetSeedState(packetSeed), pity: {}, opened: 0 },
    flags: {},
    tutorial: { step: 0, done: false },
    mastery: {},
    progress: {},
    loadout: { deck: [], tools: [], difficulty: 'NORMAL' },
  };
}

function packetSeedState(seed: string): RngState {
  return new Rng(seed).state();
}

/**
 * 옛 저장에 없는 항목을 기본값으로 채운다(개발 중 필드가 늘어도 저장이 깨지지 않게).
 * 이미 있는 값은 건드리지 않는다. 구조가 달라지는 변경은 migrations/ 로 처리한다.
 */
export function normalizeState(state: GameState): GameState {
  const fresh = createInitialState(state.meta?.createdAt ?? 0);
  const s = state as unknown as Record<string, unknown>;
  const d = fresh as unknown as Record<string, unknown>;
  for (const key of Object.keys(d)) if (s[key] === undefined) s[key] = d[key];
  const g = state.garden as unknown as Record<string, unknown>;
  const dg = fresh.garden as unknown as Record<string, unknown>;
  for (const key of Object.keys(dg)) if (g[key] === undefined) g[key] = dg[key];
  return state;
}
