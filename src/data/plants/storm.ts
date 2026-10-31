// 자동 생성 파일 — scripts/gen-plant-looks.ts (원본: docs/07-plants-1~4.md 의 '형태 · 얼굴' · '색' 열).
// 직접 고치지 말고 문서나 스크립트를 고친 뒤 `npx tsx scripts/gen-plant-looks.ts` 를 다시 실행한다.
// 외형 미세 조정(eyeSpread · mouthLen · offset)과 parts 는 이 파일을 직접 고쳐도 되지만, 다시 생성하면 덮어쓴다.

import type { PlantBase } from './types';

export const STORM_PLANTS: PlantBase[] = [
  {
    id: 'P081',
    nameKey: 'plant.P081.name',
    grade: 'SHADE',
    family: 'STORM',
    look: {
      body: 'FROND',
      ramps: { main: 'R5', sub: 'R1' },
      variantRamps: { main: 'R9', sub: 'R3' },
      parts: {},
      face: { type: 'F05', host: 'curl', eyeSpread: 0.76, mouthLen: 1.06 },
    },
  },
  {
    id: 'P082',
    nameKey: 'plant.P082.name',
    grade: 'SHADE',
    family: 'STORM',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R1', sub: 'R11' },
      variantRamps: { main: 'R9', sub: 'R1' },
      parts: {},
      face: { type: 'F02', host: 'center', eyeSpread: 0.67, mouthLen: 1.01 },
    },
  },
  {
    id: 'P083',
    nameKey: 'plant.P083.name',
    grade: 'DEW',
    family: 'STORM',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R11', sub: 'R5', accent: 'R9' },
      variantRamps: { main: 'R9', sub: 'R4' },
      parts: {},
      face: { type: 'F03', host: 'center', eyeSpread: 0.99, mouthLen: 0.96 },
    },
  },
  {
    id: 'P084',
    nameKey: 'plant.P084.name',
    grade: 'DEW',
    family: 'STORM',
    look: {
      body: 'STALK',
      ramps: { main: 'R10', sub: 'R4' },
      variantRamps: { main: 'R5', sub: 'R11' },
      parts: {},
      face: { type: 'F08', host: 'head', eyeSpread: 0.9, mouthLen: 0.92 },
    },
  },
  {
    id: 'P085',
    nameKey: 'plant.P085.name',
    grade: 'SUN',
    family: 'STORM',
    look: {
      body: 'BUSH',
      ramps: { main: 'R3', sub: 'R9' },
      variantRamps: { main: 'R5', sub: 'R1' },
      parts: {},
      face: { type: 'F04', host: 'mass', eyeSpread: 0.81, mouthLen: 0.87 },
    },
  },
  {
    id: 'P086',
    nameKey: 'plant.P086.name',
    grade: 'DUSK',
    family: 'STORM',
    look: {
      body: 'STALK',
      ramps: { main: 'R1', sub: 'R9' },
      variantRamps: { main: 'R2', sub: 'R5' },
      parts: {},
      face: { type: 'F04', host: 'head', eyeSpread: 0.72, mouthLen: 0.83 },
    },
  },
  {
    id: 'P087',
    nameKey: 'plant.P087.name',
    grade: 'MOON',
    family: 'STORM',
    look: {
      body: 'BUSH',
      ramps: { main: 'R11', sub: 'R4' },
      variantRamps: { main: 'R6', sub: 'R11' },
      parts: {},
      face: { type: 'F01', host: 'mass', eyeSpread: 0.63, mouthLen: 0.78 },
    },
  },
  {
    id: 'P088',
    nameKey: 'plant.P088.name',
    grade: 'STAR',
    family: 'STORM',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R5', sub: 'R9', special: 'STARGOLD' },
      variantRamps: { main: 'R4', sub: 'R3' },
      parts: {},
      face: { type: 'F06', host: 'center', eyeSpread: 0.95, mouthLen: 0.74 },
    },
  },
  {
    id: 'P089',
    nameKey: 'plant.P089.name',
    grade: 'AURORA',
    family: 'STORM',
    look: {
      body: 'BONSAI',
      ramps: { main: 'R5', sub: 'R3', accent: 'R9', special: 'AURORA' },
      variantRamps: { main: 'R6', sub: 'R4' },
      parts: {},
      face: { type: 'F09', host: 'crown', eyeSpread: 0.86, mouthLen: 0.69 },
    },
  },
  {
    id: 'P090',
    nameKey: 'plant.P090.name',
    grade: 'ORIGIN',
    family: 'STORM',
    look: {
      body: 'WISP',
      ramps: { main: 'R11', sub: 'R4', accent: 'R5', special: 'ORIGIN' },
      variantRamps: { main: 'R3', sub: 'R9' },
      parts: {},
      face: { type: 'F07', host: 'body', eyeSpread: 0.81, mouthLen: 0.59 },
    },
  },
];
