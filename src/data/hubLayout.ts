// 온실 허브 배치 (10문서 1-1절): 가로 1600 × 세로 360 한 채. 좌표는 모두 월드 픽셀(왼쪽 위 0,0).
// 구역마다 화분 칸이 일정한 간격으로 놓인다. y 는 화분 바닥(받침대 윗면).

import type { ZoneId } from '../core/schema';

export const WORLD_W = 1600;
export const WORLD_H = 360;
/** 처음 접속 때의 시작 위치: 온실 본관 가운데(x=640)가 화면 가운데에 오는 pan */
export const START_PAN = 320;
export const MAX_PAN = WORLD_W - 640;

export interface ZoneLayout {
  x0: number;
  y: number;
  dx: number;
  /** 받침대(선반 · 테이블) 가로 범위 */
  from: number;
  to: number;
  /** 라벨 위치 */
  labelX: number;
  labelY: number;
}

export const HUB_LAYOUT: Partial<Record<ZoneId, ZoneLayout>> = {
  WINDOW: { x0: 372, y: 190, dx: 44, from: 340, to: 536, labelX: 438, labelY: 128 },
  TABLE: { x0: 568, y: 266, dx: 44, from: 544, to: 724, labelX: 634, labelY: 214 },
  SHADE: { x0: 772, y: 190, dx: 44, from: 742, to: 938, labelX: 840, labelY: 128 },
  STOVE: { x0: 1378, y: 266, dx: 44, from: 1350, to: 1492, labelX: 1420, labelY: 214 },
  OUTDOOR: { x0: 112, y: 306, dx: 44, from: 86, to: 272, labelX: 178, labelY: 244 },
};

export const slotX = (zone: ZoneId, slot: number): number => {
  const l = HUB_LAYOUT[zone];
  return l ? l.x0 + slot * l.dx : 0;
};
export const slotY = (zone: ZoneId): number => HUB_LAYOUT[zone]?.y ?? 0;

/** 화면에 놓이는 상호작용 사물의 바닥 중앙 좌표 */
export const HUB_OBJECTS = {
  gate: { x: 40, y: 312 },
  seedBox: { x: 350, y: 318 },
  phonograph: { x: 800, y: 318 },
  stove: { x: 1318, y: 318 },
  fan: { x: 1566, y: 318 },
} as const;

/** 영역 경계(구역 이름 표시와 가장자리 감속에 쓴다) */
export const HUB_REGIONS = [
  { id: 'entrance', from: 0, to: 320 },
  { id: 'main', from: 320, to: 960 },
  { id: 'library', from: 960, to: 1280 },
  { id: 'backyard', from: 1280, to: 1600 },
] as const;

/** 빛 조절(블라인드)을 달 수 있는 구역 */
export const BLIND_ZONES: ZoneId[] = ['WINDOW', 'TABLE', 'SHADE', 'STOVE'];
