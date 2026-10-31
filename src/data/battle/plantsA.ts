// 전투 데이터 1/4: 덩굴 · 가시 · 버섯 (P001–P030). 07-1문서의 표를 그대로 옮긴 값이다.
// p(매개변수)와 special 의 뜻은 systems/battle/Specials.ts 와 Attacks*.ts 를 본다.

import { COMMON_BLOOM, def, type PB } from './helpers';

export const PLANTS_A: PB[] = [
  // ===== 덩굴: 붙잡고 늦추는 통제형 =====
  def('P001', 'SHOOT', 50, 7, 1.0, 3.0, 'PHYS', {
    on: [{ k: 'SLOW', amt: 0.2, dur: 1.5 }],
    fx: { shape: 'drop', color: ['R1', 3], color2: ['R9', 3], hit: 'sticky', trail: 'dots' },
  }),
  def('P002', 'ZONE', 50, 2, 0.5, 1.5, 'PHYS', {
    on: [{ k: 'SLOW', amt: 0.3, dur: 0.7 }],
    fx: { shape: 'none', color: ['R2', 3], hit: 'cloud', trail: 'none', cast: 'ring' },
  }),
  def('P003', 'TRAP', 70, 12, 6, 2.5, 'PHYS', {
    on: [{ k: 'BIND', dur: 1.2, boss: { k: 'SLOW', amt: 0.5, dur: 1.2 } }],
    p: { max: 3 },
    fx: { shape: 'web', color: ['R1', 2], color2: ['R2', 4], hit: 'sticky', trail: 'none' },
  }),
  def('P004', 'MELEE', 70, 11, 0.9, 1.4, 'PHYS', {
    targets: 3,
    on: [{ k: 'BIND', dur: 1, p: 0.25, boss: { k: 'SLOW', amt: 0.5, dur: 1 } }],
    fx: {
      shape: 'none',
      color: ['R7', 3],
      color2: ['R1', 3],
      hit: 'slash',
      trail: 'none',
      cast: 'flash',
    },
  }),
  def('P005', 'ZONE', 100, 4, 0.5, 1.6, 'PHYS', {
    on: [
      { k: 'SLOW', amt: 0.45, dur: 0.7 },
      { k: 'MARK', amt: 0.1, dur: 0.7 },
    ],
    bloom: {
      kind: 'AREA_STATUS',
      r: 2.5,
      on: [{ k: 'BIND', dur: 3, boss: { k: 'SLOW', amt: 0.6, dur: 3 } }],
    },
    fx: {
      shape: 'none',
      color: ['R6', 3],
      color2: ['R3', 3],
      hit: 'sticky',
      trail: 'none',
      cast: 'ring',
    },
  }),
  def('P006', 'SPECIAL', 110, 20, 6, 3.5, 'PHYS', {
    special: 'PULL',
    p: { pull: 1.5 },
    bloom: { kind: 'CUSTOM', p: { n: 5, tiles: 2 } },
    fx: { shape: 'leaf', color: ['R8', 3], color2: ['R1', 2], hit: 'sticky', trail: 'line' },
  }),
  def('P007', 'SPECIAL', 130, 5, 0.5, 2.0, 'PHYS', {
    special: 'TANGLE',
    p: { tiles: 4, slow: 0.4 },
    bloom: { kind: 'CUSTOM', p: { bind: 2 } },
    fx: {
      shape: 'none',
      color: ['R10', 3],
      color2: ['R1', 2],
      hit: 'sticky',
      trail: 'none',
      cast: 'puff',
    },
  }),
  def('P008', 'CHAIN', 180, 23, 1.5, 3.0, 'PHYS', {
    targets: 4,
    fall: 0,
    special: 'LINK',
    p: { share: 0.3, dur: 6, slow: 0.15 },
    on: [{ k: 'SLOW', amt: 0.15, dur: 6 }],
    bloom: { kind: 'CUSTOM', p: { n: 8, share: 0.6, dur: 8 } },
    fx: { shape: 'web', color: ['R11', 4], color2: ['R5', 3], hit: 'glint', trail: 'line' },
  }),
  def('P009', 'SPECIAL', 240, 50, 12, 99, 'PHYS', {
    special: 'GRASP',
    p: { r: 1.5, bind: 2, nightMul: 1.5 },
    bloom: {
      kind: 'GLOBAL_STATUS',
      on: [{ k: 'BIND', dur: 1.5, boss: { k: 'SLOW', amt: 0.5, dur: 3 } }],
    },
    fx: {
      shape: 'none',
      color: ['R5', 3],
      color2: ['R9', 4],
      hit: 'curse',
      trail: 'none',
      cast: 'ring',
    },
  }),
  def('P010', 'ZONE', 250, 9, 0.5, 2.0, 'PHYS', {
    special: 'VINE_SPREAD',
    p: { spreadSec: 10, maxTiles: 12, slow: 0.35 },
    bloom: { kind: 'CUSTOM', p: { bind: 3, bossBind: 1 } },
    fx: {
      shape: 'none',
      color: ['R1', 2],
      color2: ['R6', 3],
      hit: 'cloud',
      trail: 'none',
      cast: 'ring',
    },
  }),

  // ===== 가시: 꿰뚫고 깎는 물리 딜러 =====
  def('P011', 'SHOOT', 50, 10, 1.0, 3.0, 'PHYS', {
    on: [{ k: 'SHRED', amt: 1, dur: 4, n: 3 }],
    fx: { shape: 'thorn', color: ['R1', 3], color2: ['R10', 3], hit: 'spark', trail: 'none' },
  }),
  def('P012', 'MELEE', 45, 8, 1.6, 1.2, 'PHYS', {
    targets: 0,
    fx: {
      shape: 'none',
      color: ['R10', 3],
      color2: ['R9', 3],
      hit: 'burst',
      trail: 'none',
      cast: 'ring',
    },
  }),
  def('P013', 'SNIPE', 85, 36, 2.4, 5.5, 'PHYS', {
    pierce: 1,
    p: { pierceMul: 0.5 },
    fx: { shape: 'needle', color: ['R10', 4], color2: ['R11', 4], hit: 'slash', trail: 'line' },
  }),
  def('P014', 'SHOOT', 75, 14, 1.3, 3.5, 'PHYS', {
    pierce: 3,
    fx: { shape: 'thorn', color: ['R6', 3], color2: ['R7', 2], hit: 'slash', trail: 'line' },
  }),
  def('P015', 'SHOOT', 100, 7, 1.2, 3.0, 'PHYS', {
    shots: 3,
    p: { spread: 0.5 },
    bloom: { kind: 'BARRAGE', dur: 5, p: { rate: 6, dirs: 8 } },
    fx: { shape: 'thorn', color: ['R5', 3], color2: ['R1', 3], hit: 'spark', trail: 'dots' },
  }),
  def('P016', 'WALL', 80, 9, 1, 0, 'PHYS', {
    p: { hp: 435, hold: 2, reflect: 0.3 },
    bloom: { kind: 'INVULN', dur: 6, p: { reflect: 1 } },
    fx: {
      shape: 'none',
      color: ['R1', 3],
      color2: ['R11', 3],
      hit: 'spark',
      trail: 'none',
      cast: 'flash',
    },
  }),
  def('P017', 'LOB', 145, 10, 2.6, 4.0, 'PHYS', {
    shots: 5,
    splash: 1.0,
    flags: ['AA'],
    p: { burstSec: 1 },
    bloom: { kind: 'BARRAGE', dur: 3, p: { rate: 10, area: 1 } },
    fx: { shape: 'needle', color: ['R9', 3], color2: ['R10', 3], hit: 'spark', trail: 'dots' },
  }),
  def('P018', 'SNIPE', 180, 63, 2.4, 5.5, 'PHYS', {
    flags: ['IGNORE_ARMOR'],
    p: { crit: 0.25, critMul: 2.5 },
    bloom: { kind: 'CUSTOM', p: { n: 3, mul: 3 } },
    fx: { shape: 'needle', color: ['R11', 4], color2: ['R4', 4], hit: 'glint', trail: 'sparkle' },
  }),
  def('P019', 'SNIPE', 220, 135, 3.0, 6.0, 'PHYS', {
    p: { chargeSec: 3, execute: 0.12 },
    bloom: { kind: 'BUFF_SELF', dur: 10, p: { rangeInf: 1, aspd: 2 } },
    fx: { shape: 'star', color: ['R9', 4], color2: ['R5', 4], hit: 'glint', trail: 'sparkle' },
  }),
  def('P020', 'SPECIAL', 275, 30, 1.5, 3.5, 'PHYS', {
    special: 'NEEDLES',
    p: { max: 8, shred: 1 },
    bloom: { kind: 'BARRAGE', dur: 3, p: { rate: 3, area: 1, allTargets: 1 } },
    fx: { shape: 'needle', color: ['R5', 4], color2: ['R9', 4], hit: 'glint', trail: 'line' },
  }),

  // ===== 버섯: 퍼지고 썩히는 독 지속 피해 =====
  def('P021', 'ZONE', 50, 0, 1.0, 1.2, 'POISON', {
    on: [{ k: 'POISON', n: 1 }],
    fx: {
      shape: 'none',
      color: ['R5', 2],
      color2: ['R6', 3],
      hit: 'cloud',
      trail: 'none',
      cast: 'puff',
    },
  }),
  def('P022', 'SHOOT', 50, 6, 1.1, 3.0, 'POISON', {
    on: [{ k: 'POISON', n: 2 }],
    fx: { shape: 'spore', color: ['R6', 2], color2: ['R5', 3], hit: 'cloud', trail: 'dots' },
  }),
  def('P023', 'SHOOT', 75, 8, 1.4, 3.0, 'POISON', {
    on: [{ k: 'POISON', n: 4 }],
    fx: { shape: 'needle', color: ['R7', 3], color2: ['R2', 3], hit: 'cloud', trail: 'line' },
  }),
  def('P024', 'LOB', 85, 10, 1.8, 3.5, 'POISON', {
    splash: 0.9,
    on: [
      { k: 'SHRED', amt: 2, dur: 4, n: 2 },
      { k: 'SLOW', amt: 0.15, dur: 3 },
    ],
    fx: { shape: 'ink', color: ['R12', 1], color2: ['R5', 2], hit: 'splash', trail: 'smoke' },
  }),
  def('P025', 'TRAP', 90, 0, 6, 2.5, 'POISON', {
    special: 'POISON_PATCH',
    on: [{ k: 'POISON', n: 3 }],
    p: { max: 3, uses: 5, spread: 1 },
    bloom: { kind: 'CUSTOM', p: { r: 1.2, n: 6 } },
    fx: {
      shape: 'none',
      color: ['R2', 3],
      color2: ['R9', 3],
      hit: 'cloud',
      trail: 'none',
      cast: 'puff',
    },
  }),
  def('P026', 'LOB', 145, 25, 2.2, 4.5, 'POISON', {
    splash: 0.9,
    p: { cloudSec: 3 },
    on: [{ k: 'POISON', n: 1 }],
    bloom: { kind: 'BARRAGE', dur: 5, p: { rate: 2, area: 0 } },
    fx: { shape: 'spore', color: ['R5', 4], color2: ['R6', 3], hit: 'burst', trail: 'smoke' },
  }),
  def('P027', 'ZONE', 130, 0, 1.0, 1.5, 'POISON', {
    special: 'LAUGH',
    on: [{ k: 'POISON', n: 1 }],
    p: { chance: 0.2, dur: 1.5 },
    bloom: { kind: 'AREA_STATUS', r: 2.5, on: [{ k: 'CHARM', dur: 2, boss: 'IMMUNE' }] },
    fx: {
      shape: 'note',
      color: ['R9', 3],
      color2: ['R6', 3],
      hit: 'bloom',
      trail: 'sparkle',
      cast: 'ring',
    },
  }),
  def('P028', 'AURA', 200, 12, 1.5, 2.2, 'POISON', {
    on: [{ k: 'POISON', n: 1 }],
    p: { dotMul: 1.2, keepPoison: 1 },
    bloom: { kind: 'BUFF_SELF', dur: 8, p: { dotMul: 2 } },
    fx: { shape: 'spore', color: ['R5', 2], color2: ['R11', 4], hit: 'curse', trail: 'smoke' },
  }),
  def('P029', 'SPECIAL', 200, 0, 1.0, 1.5, 'POISON', {
    special: 'SPORE_SWARM',
    on: [{ k: 'POISON', n: 2 }],
    p: { max: 6, r: 0.8, life: 20 },
    bloom: { kind: 'GLOBAL_STATUS', on: [{ k: 'POISON', n: 5 }] },
    fx: {
      shape: 'star',
      color: ['R5', 3],
      color2: ['R9', 4],
      hit: 'cloud',
      trail: 'sparkle',
      cast: 'puff',
    },
  }),
  def('P030', 'SPECIAL', 290, 0, 1.2, 3.0, 'POISON', {
    special: 'MYCELIUM',
    on: [{ k: 'POISON', n: 3 }],
    targets: 6,
    p: { capAdd: 5 },
    bloom: { kind: 'CUSTOM', p: { detonate: 1 } },
    fx: {
      shape: 'web',
      color: ['R2', 4],
      color2: ['R5', 4],
      hit: 'burst',
      trail: 'line',
      cast: 'flash',
    },
  }),
];

export { COMMON_BLOOM };
