// 전투 데이터 3/4: 서리 · 빛 (P061–P080). 07-3문서.

import { def, type PB } from './helpers';

export const PLANTS_C: PB[] = [
  // ===== 서리: 얼리고 밀어내는 제어형 =====
  def('P061', 'SHOOT', 50, 7, 0.9, 3.0, 'COLD', {
    on: [
      { k: 'KNOCK', amt: 0.15 },
      { k: 'WET', dur: 3 },
    ],
    p: { waterRange: 0.5 },
    fx: { shape: 'drop', color: ['R4', 3], color2: ['R4', 4], hit: 'splash', trail: 'dots' },
  }),
  def('P062', 'ZONE', 50, 1, 1.0, 1.5, 'COLD', {
    on: [{ k: 'CHILL', n: 1 }],
    fx: {
      shape: 'none',
      color: ['R3', 4],
      color2: ['R4', 4],
      hit: 'frost',
      trail: 'none',
      cast: 'ring',
    },
  }),
  def('P063', 'SHOOT', 75, 12, 1.5, 3.5, 'COLD', {
    flags: ['WATER_ONLY'],
    on: [{ k: 'CHILL', n: 2 }],
    fx: { shape: 'petal', color: ['R4', 4], color2: ['R11', 4], hit: 'frost', trail: 'sparkle' },
  }),
  def('P064', 'SNIPE', 110, 44, 2.4, 5.0, 'COLD', {
    on: [
      { k: 'CHILL', n: 3 },
      { k: 'FREEZE', dur: 1, p: 0.2 },
    ],
    bloom: { kind: 'BARRAGE', dur: 0, p: { count: 6, random: 1, mul: 1, freeze: 1.5 } },
    fx: { shape: 'shard', color: ['R3', 4], color2: ['R11', 4], hit: 'frost', trail: 'line' },
  }),
  def('P065', 'LOB', 110, 20, 2.0, 4.0, 'COLD', {
    splash: 1.0,
    flags: ['AA'],
    on: [{ k: 'CHILL', n: 2 }],
    bloom: { kind: 'AREA_STATUS', r: 0, on: [{ k: 'CHILL', n: 5 }] },
    fx: {
      shape: 'star',
      color: ['R11', 4],
      color2: ['R4', 4],
      hit: 'frost',
      trail: 'sparkle',
      cast: 'puff',
    },
  }),
  def('P066', 'SPECIAL', 145, 18, 8, 3.0, 'COLD', {
    special: 'WHIRLPOOL',
    flags: ['WATER_ONLY'],
    on: [
      { k: 'SLOW', amt: 0.4, dur: 2 },
      { k: 'WET', dur: 3 },
    ],
    p: { n: 6, pull: 1.5 },
    bloom: { kind: 'CUSTOM', p: { dur: 5 } },
    fx: {
      shape: 'drop',
      color: ['R4', 3],
      color2: ['R3', 4],
      hit: 'splash',
      trail: 'dots',
      cast: 'ring',
    },
  }),
  def('P067', 'ZONE', 165, 34, 7, 1.8, 'COLD', {
    special: 'GLACIER',
    p: { freeze: 1.2 },
    bloom: { kind: 'AREA_STATUS', r: 3.0, on: [{ k: 'FREEZE', dur: 3, boss: 'IMMUNE' }] },
    fx: {
      shape: 'shard',
      color: ['R4', 4],
      color2: ['R5', 4],
      hit: 'frost',
      trail: 'none',
      cast: 'ring',
    },
  }),
  def('P068', 'AURA', 200, 0, 0, 2.0, 'COLD', {
    p: { grantChill: 1, vsFrozen: 0.15 },
    bloom: { kind: 'BUFF_SELF', dur: 8, p: { grantChill: 3 } },
    fx: {
      shape: 'drop',
      color: ['R5', 4],
      color2: ['R11', 4],
      hit: 'frost',
      trail: 'sparkle',
      cast: 'ring',
    },
  }),
  def('P069', 'SNIPE', 220, 125, 2.8, 6.0, 'COLD', {
    on: [{ k: 'CHILL', n: 3 }],
    p: { shatter: 3 },
    bloom: { kind: 'CUSTOM', p: { freeze: 1.5 } },
    fx: {
      shape: 'star',
      color: ['R4', 4],
      color2: ['R9', 4],
      hit: 'glint',
      trail: 'sparkle',
      cast: 'flash',
    },
  }),
  def('P070', 'ZONE', 250, 9, 1.0, 3.0, 'COLD', {
    on: [
      { k: 'CHILL', n: 1 },
      { k: 'SLOW', amt: 0.3, dur: 1.2 },
    ],
    p: { freezeExtend: 1 },
    bloom: {
      kind: 'GLOBAL_STATUS',
      on: [{ k: 'FREEZE', dur: 2.5, boss: { k: 'SLOW', amt: 0.5, dur: 4 } }],
    },
    fx: {
      shape: 'shard',
      color: ['R4', 2],
      color2: ['R3', 4],
      hit: 'frost',
      trail: 'none',
      cast: 'ring',
    },
  }),

  // ===== 빛: 비추고 꿰뚫는 정밀형 =====
  def('P071', 'SHOOT', 50, 8, 1.0, 3.0, 'LIGHT', {
    flags: ['DETECT'],
    fx: { shape: 'orb', color: ['R9', 4], color2: ['R3', 4], hit: 'glint', trail: 'sparkle' },
  }),
  def('P072', 'BEAM', 85, 10, 0, 3.0, 'LIGHT', {
    p: { ramp: 2, rampSec: 4 },
    fx: { shape: 'ray', color: ['R9', 3], color2: ['R9', 4], hit: 'glint', trail: 'none' },
  }),
  def('P073', 'AURA', 90, 8, 1.2, 3.0, 'LIGHT', {
    p: { crit: 0.08, auraR: 2.0 },
    fx: {
      shape: 'shard',
      color: ['R11', 4],
      color2: ['R4', 4],
      hit: 'glint',
      trail: 'sparkle',
      cast: 'ring',
    },
  }),
  def('P074', 'CHAIN', 110, 16, 1.4, 3.2, 'LIGHT', {
    targets: 3,
    fall: 0,
    p: { critStep: 0.1 },
    bloom: { kind: 'UNLIMITED', dur: 5 },
    fx: { shape: 'ray', color: ['R6', 3], color2: ['R9', 4], hit: 'glint', trail: 'line' },
  }),
  def('P075', 'SNIPE', 145, 52, 2.0, 6.5, 'LIGHT', {
    flags: ['DETECT'],
    on: [{ k: 'MARK', amt: 0.1, dur: 3 }],
    p: { detectAll: 1 },
    bloom: { kind: 'CUSTOM', p: { dur: 10, mark: 0.25 } },
    fx: {
      shape: 'star',
      color: ['R4', 4],
      color2: ['R9', 3],
      hit: 'glint',
      trail: 'sparkle',
      cast: 'flash',
    },
  }),
  def('P076', 'ZONE', 130, 5, 0.5, 1.6, 'LIGHT', {
    special: 'RAINBOW_FOUNTAIN',
    bloom: {
      kind: 'AREA_STATUS',
      r: 3,
      on: [
        { k: 'SLOW', amt: 0.2, dur: 3 },
        { k: 'BURN', n: 1 },
        { k: 'POISON', n: 1 },
        { k: 'WET', dur: 3 },
      ],
    },
    fx: {
      shape: 'drop',
      color: ['R6', 3],
      color2: ['R1', 4],
      hit: 'splash',
      trail: 'sparkle',
      cast: 'ring',
    },
  }),
  def('P077', 'SPECIAL', 145, 26, 9, 1.6, 'LIGHT', {
    special: 'FLASH',
    on: [{ k: 'STUN', dur: 0.8 }],
    bloom: {
      kind: 'AREA_STATUS',
      r: 3,
      on: [{ k: 'STUN', dur: 1.5, boss: { k: 'STUN', dur: 0.5 } }],
    },
    fx: {
      shape: 'star',
      color: ['R9', 4],
      color2: ['R8', 4],
      hit: 'glint',
      trail: 'none',
      cast: 'flash',
    },
  }),
  def('P078', 'AURA', 200, 0, 0, 2.2, 'LIGHT', {
    flags: ['WATER_OK'],
    p: { beamRamp: 2, beamMax: 0.3 },
    bloom: { kind: 'BUFF_SELF', dur: 8, p: { beamMax: 1, pierce: 1 } },
    fx: {
      shape: 'ray',
      color: ['R11', 4],
      color2: ['R5', 4],
      hit: 'glint',
      trail: 'none',
      cast: 'ring',
    },
  }),
  def('P079', 'SPECIAL', 220, 150, 5, 4.0, 'LIGHT', {
    special: 'CONSTELLATION',
    p: { n: 5, delay: 3, lineMul: 0.5 },
    bloom: { kind: 'CUSTOM', p: { all: 1 } },
    fx: {
      shape: 'star',
      color: ['R5', 4],
      color2: ['R9', 4],
      hit: 'glint',
      trail: 'line',
      cast: 'flash',
    },
  }),
  def('P080', 'BEAM', 350, 58, 0, 4.0, 'LIGHT', {
    flags: ['DETECT'],
    pierce: 99,
    p: { ramp: 1, rampSec: 0, revealAll: 1 },
    bloom: { kind: 'CUSTOM', p: { dur: 8, mul: 0.25 } },
    fx: {
      shape: 'ray',
      color: ['R9', 4],
      color2: ['R11', 4],
      hit: 'glint',
      trail: 'none',
      cast: 'flash',
    },
  }),
];
