// 온실 구역 9종 (04문서 1-1)

import type { ZoneId } from '../core/schema';

export type Humidity = 'DRY' | 'NORMAL' | 'WET' | 'WATER';
export type ZoneTemp = 'COOL' | 'MID' | 'WARM';

export interface ZoneDef {
  id: ZoneId;
  nameKey: string;
  /** 빛 1–3. 야외 · 달빛 창은 날씨 · 시각에 따라 달라진다(light: 0 = 동적) */
  light: 0 | 1 | 2 | 3;
  temp: ZoneTemp | 'WEATHER';
  humidity: Humidity | 'WEATHER';
  slots: number;
  /** 처음에 열려 있는 칸 수 */
  initialSlots: number;
  /** 해금 정원사 레벨 · 연구로 해금(레벨 0) */
  unlockLevel: number;
  unlockFlag?: string;
  moldMul: number;
  pestMul: number;
  waterDecayMul: number;
  /** 수생 식물 전용 */
  aquaticOnly?: boolean;
  /** 이 구역 식물은 욕구가 줄지 않고 성장도 멈춘다 */
  frozen?: boolean;
}

export const ZONES: Record<ZoneId, ZoneDef> = {
  WINDOW: {
    id: 'WINDOW',
    nameKey: 'zone.WINDOW',
    light: 3,
    temp: 'MID',
    humidity: 'NORMAL',
    slots: 4,
    initialSlots: 4,
    unlockLevel: 1,
    moldMul: 1,
    pestMul: 1,
    waterDecayMul: 1,
  },
  TABLE: {
    id: 'TABLE',
    nameKey: 'zone.TABLE',
    light: 2,
    temp: 'MID',
    humidity: 'NORMAL',
    slots: 4,
    initialSlots: 2,
    unlockLevel: 1,
    moldMul: 1,
    pestMul: 1,
    waterDecayMul: 1,
  },
  SHADE: {
    id: 'SHADE',
    nameKey: 'zone.SHADE',
    light: 1,
    temp: 'COOL',
    humidity: 'WET',
    slots: 4,
    initialSlots: 4,
    unlockLevel: 3,
    moldMul: 2,
    pestMul: 1,
    waterDecayMul: 1,
  },
  STOVE: {
    id: 'STOVE',
    nameKey: 'zone.STOVE',
    light: 2,
    temp: 'WARM',
    humidity: 'DRY',
    slots: 3,
    initialSlots: 3,
    unlockLevel: 6,
    moldMul: 1,
    pestMul: 1,
    waterDecayMul: 1.3,
  },
  TANK: {
    id: 'TANK',
    nameKey: 'zone.TANK',
    light: 2,
    temp: 'COOL',
    humidity: 'WATER',
    slots: 3,
    initialSlots: 3,
    unlockLevel: 0,
    unlockFlag: 'research.tank',
    moldMul: 1,
    pestMul: 1,
    waterDecayMul: 0,
    aquaticOnly: true,
  },
  OUTDOOR: {
    id: 'OUTDOOR',
    nameKey: 'zone.OUTDOOR',
    light: 0,
    temp: 'WEATHER',
    humidity: 'WEATHER',
    slots: 4,
    initialSlots: 4,
    unlockLevel: 5,
    moldMul: 1,
    pestMul: 2,
    waterDecayMul: 1,
  },
  MOONLIGHT: {
    id: 'MOONLIGHT',
    nameKey: 'zone.MOONLIGHT',
    light: 0,
    temp: 'COOL',
    humidity: 'NORMAL',
    slots: 2,
    initialSlots: 2,
    unlockLevel: 0,
    unlockFlag: 'research.moonWindow',
    moldMul: 1,
    pestMul: 1,
    waterDecayMul: 1,
  },
  BREEDING: {
    id: 'BREEDING',
    nameKey: 'zone.BREEDING',
    light: 2,
    temp: 'MID',
    humidity: 'NORMAL',
    slots: 2,
    initialSlots: 2,
    unlockLevel: 5,
    moldMul: 1,
    pestMul: 1,
    waterDecayMul: 1,
  },
  DORMANT: {
    id: 'DORMANT',
    nameKey: 'zone.DORMANT',
    light: 2,
    temp: 'MID',
    humidity: 'NORMAL',
    slots: 999,
    initialSlots: 999,
    unlockLevel: 4,
    moldMul: 0,
    pestMul: 0,
    waterDecayMul: 0,
    frozen: true,
  },
};

/** 활성 화분 칸: 시작 6칸 → 최대 24칸 */
export const START_ACTIVE_SLOTS = 6;
export const MAX_ACTIVE_SLOTS = 24;
/** 허브에 보여 주는 구역(M2): 창가 선반 · 중앙 테이블 · 그늘 구석 · 난로 옆 · 야외 화단 */
export const HUB_ZONES: ZoneId[] = ['WINDOW', 'TABLE', 'SHADE', 'STOVE', 'OUTDOOR'];
