// 자동 생성 파일 — scripts/gen-plant-looks.ts (원본: docs/07-plants-1~4.md 의 '형태 · 얼굴' · '색' 열).
// 직접 고치지 말고 문서나 스크립트를 고친 뒤 `npx tsx scripts/gen-plant-looks.ts` 를 다시 실행한다.
// 외형 미세 조정(eyeSpread · mouthLen · offset)과 parts 는 이 파일을 직접 고쳐도 되지만, 다시 생성하면 덮어쓴다.

import type { PlantBase } from './types';

export const BLOOM_PLANTS: PlantBase[] = [
  {
    id: 'P031',
    nameKey: 'plant.P031.name',
    grade: 'SHADE',
    family: 'BLOOM',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R9', sub: 'R1' },
      variantRamps: { main: 'R11', sub: 'R4' },
      parts: {},
      face: { type: 'F01', host: 'center', eyeSpread: 0.63, mouthLen: 1.05 },
    },
  },
  {
    id: 'P032',
    nameKey: 'plant.P032.name',
    grade: 'SHADE',
    family: 'BLOOM',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R11', sub: 'R9' },
      variantRamps: { main: 'R6', sub: 'R9' },
      parts: {},
      face: { type: 'F02', host: 'center', eyeSpread: 0.77, mouthLen: 0.92 },
    },
  },
  {
    id: 'P033',
    nameKey: 'plant.P033.name',
    grade: 'DEW',
    family: 'BLOOM',
    look: {
      body: 'VINE',
      ramps: { main: 'R4', sub: 'R5' },
      variantRamps: { main: 'R6', sub: 'R9' },
      parts: {},
      face: { type: 'F03', host: 'leaf', eyeSpread: 0.86, mouthLen: 0.96 },
    },
  },
  {
    id: 'P034',
    nameKey: 'plant.P034.name',
    grade: 'DEW',
    family: 'BLOOM',
    look: {
      body: 'STALK',
      ramps: { main: 'R5', sub: 'R2' },
      variantRamps: { main: 'R6', sub: 'R4' },
      parts: {},
      face: { type: 'F04', host: 'head', eyeSpread: 0.9, mouthLen: 1.19 },
    },
  },
  {
    id: 'P035',
    nameKey: 'plant.P035.name',
    grade: 'SUN',
    family: 'BLOOM',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R7', sub: 'R1' },
      variantRamps: { main: 'R5', sub: 'R9' },
      parts: {},
      face: { type: 'F07', host: 'center', eyeSpread: 0.99, mouthLen: 0.53 },
    },
  },
  {
    id: 'P036',
    nameKey: 'plant.P036.name',
    grade: 'SUN',
    family: 'BLOOM',
    look: {
      body: 'BONSAI',
      ramps: { main: 'R7', sub: 'R1' },
      variantRamps: { main: 'R6', sub: 'R11' },
      parts: {},
      face: { type: 'F01', host: 'crown', eyeSpread: 0.72, mouthLen: 1.1 },
    },
  },
  {
    id: 'P037',
    nameKey: 'plant.P037.name',
    grade: 'DUSK',
    family: 'BLOOM',
    look: {
      body: 'BUSH',
      ramps: { main: 'R6', sub: 'R4', accent: 'R5' },
      variantRamps: { main: 'R9', sub: 'R3' },
      parts: {},
      face: { type: 'F12', host: 'mass', eyeSpread: 0.81, mouthLen: 1.14 },
    },
  },
  {
    id: 'P038',
    nameKey: 'plant.P038.name',
    grade: 'MOON',
    family: 'BLOOM',
    look: {
      body: 'STALK',
      ramps: { main: 'R11', sub: 'R1' },
      variantRamps: { main: 'R5', sub: 'R4' },
      parts: {},
      face: { type: 'F09', host: 'head', eyeSpread: 0.64, mouthLen: 0.64 },
    },
  },
  {
    id: 'P039',
    nameKey: 'plant.P039.name',
    grade: 'STAR',
    family: 'BLOOM',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R8', sub: 'R9', special: 'STARGOLD' },
      variantRamps: { main: 'R6', sub: 'R5' },
      parts: {},
      face: { type: 'F02', host: 'center', eyeSpread: 0.73, mouthLen: 0.69 },
    },
  },
  {
    id: 'P040',
    nameKey: 'plant.P040.name',
    grade: 'ORIGIN',
    family: 'BLOOM',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R6', sub: 'R9', accent: 'R11', special: 'ORIGIN' },
      variantRamps: { main: 'R5', sub: 'R4' },
      parts: {},
      face: { type: 'F02', host: 'center', eyeSpread: 0.92, mouthLen: 0.59 },
    },
  },
];
