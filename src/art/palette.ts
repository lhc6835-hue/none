// 66색 고정 팔레트 (02문서 2절). 이 밖의 색은 쓰지 않는다.
// 램프 12개 × 5단계(0 어두움 → 4 밝음) = 60색 + 특수색 6개 = 66색.

import type { RampId } from '../core/schema';

export type RampIndex = 0 | 1 | 2 | 3 | 4;
export type Ramp = readonly [string, string, string, string, string];

export const RAMPS: Record<RampId, Ramp> = {
  R1: ['#1d3b2a', '#2f5e3a', '#4b8c42', '#7dbf4e', '#c6e86f'], // 잎
  R2: ['#2a2f1e', '#4c5a2b', '#75873b', '#a6b350', '#d8df8e'], // 이끼
  R3: ['#12343b', '#1e5f5e', '#2e9487', '#5dc9a9', '#aaedd2'], // 청록
  R4: ['#1a2a4b', '#29507c', '#3e80b6', '#70b6e1', '#bae5f7'], // 하늘
  R5: ['#2a1a3e', '#4b2e6c', '#7448a1', '#a375d0', '#d8b6f1'], // 보라
  R6: ['#3e1a2f', '#6f2d50', '#b0507d', '#e680a9', '#fac5d9'], // 분홍
  R7: ['#3a1418', '#6f1f23', '#b13b31', '#e36540', '#f8a577'], // 빨강
  R8: ['#3e2210', '#7b4317', '#c56b20', '#f1a13b', '#fcd98b'], // 주황
  R9: ['#3c2f12', '#7b6319', '#caa328', '#f3d74c', '#fff5a9'], // 노랑
  R10: ['#241712', '#4b3023', '#7b5337', '#a97d53', '#d7b58b'], // 흙
  R11: ['#1a1c23', '#3b3e48', '#656b79', '#9ba2af', '#d5d9df'], // 돌
  R12: ['#1f1a25', '#3c3143', '#5f5367', '#8b7e90', '#b9aeb9'], // 잿빛(적 전용)
};

export const SPECIAL = {
  INK: '#14121a', // 얼굴(밝은 몸), UI 외곽선
  PAPER: '#fdfbf5', // 얼굴(어두운 몸), 반짝임
  CREAM: '#f4ecd8', // UI 바탕
  TOXIC: '#b7ff3c', // 독 · 포자 이펙트
  CYAN: '#5ff8ff', // 마법 · 빛 이펙트
  STARGOLD: '#ffe27a', // 별빛 · 태초 등급, 보상 반짝임
} as const;

/** UI 기본 색 (02문서 8절) — 모두 팔레트 안의 값이다. */
export const UI = {
  cream: SPECIAL.CREAM,
  woodLight: RAMPS.R10[2], // #7b5337
  woodDark: RAMPS.R10[1], // #4b3023
  ink: SPECIAL.INK,
  positive: RAMPS.R1[2], // #4b8c42
  warning: RAMPS.R7[3], // #e36540
  info: RAMPS.R4[2], // #3e80b6
} as const;

export const PALETTE: readonly string[] = [
  ...Object.values(RAMPS).flat(),
  ...Object.values(SPECIAL),
];

export const PALETTE_SET: ReadonlySet<string> = new Set(PALETTE);

export function ramp(id: RampId, index: RampIndex): string {
  return RAMPS[id][index];
}

export function isPaletteColor(hex: string): boolean {
  return PALETTE_SET.has(hex.toLowerCase());
}

/** '#rrggbb' → 0xrrggbb (Phaser 색 인자용) */
export function toInt(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

/** [r, g, b] → '#rrggbb' */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
