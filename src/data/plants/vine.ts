// 자동 생성 파일 — scripts/gen-plant-looks.ts (원본: docs/07-plants-1~4.md 의 '형태 · 얼굴' · '색' 열).
// 직접 고치지 말고 문서나 스크립트를 고친 뒤 `npx tsx scripts/gen-plant-looks.ts` 를 다시 실행한다.
// 외형 미세 조정(eyeSpread · mouthLen · offset)과 parts 는 이 파일을 직접 고쳐도 되지만, 다시 생성하면 덮어쓴다.

import type { PlantBase } from './types';

export const VINE_PLANTS: PlantBase[] = [
  {
    id: 'P001',
    nameKey: 'plant.P001.name',
    grade: 'SHADE',
    family: 'VINE',
    look: {
      body: 'VINE',
      ramps: { main: 'R1', sub: 'R3' },
      variantRamps: { main: 'R5', sub: 'R6' },
      parts: {},
      face: { type: 'F01', host: 'leaf', eyeSpread: 0.86, mouthLen: 0.62 },
    },
  },
  {
    id: 'P002',
    nameKey: 'plant.P002.name',
    grade: 'SHADE',
    family: 'VINE',
    look: {
      body: 'BUSH',
      ramps: { main: 'R2', sub: 'R1' },
      variantRamps: { main: 'R9', sub: 'R8' },
      parts: {},
      face: { type: 'F10', host: 'mass', eyeSpread: 0.77, mouthLen: 0.58 },
    },
  },
  {
    id: 'P003',
    nameKey: 'plant.P003.name',
    grade: 'DEW',
    family: 'VINE',
    look: {
      body: 'STALK',
      ramps: { main: 'R1', sub: 'R2' },
      variantRamps: { main: 'R8', sub: 'R9' },
      parts: {},
      face: { type: 'F03', host: 'head', eyeSpread: 0.68, mouthLen: 0.53 },
    },
  },
  {
    id: 'P004',
    nameKey: 'plant.P004.name',
    grade: 'DEW',
    family: 'VINE',
    look: {
      body: 'TRAP',
      ramps: { main: 'R1', sub: 'R7' },
      variantRamps: { main: 'R5', sub: 'R6' },
      parts: {},
      face: { type: 'F11', host: 'trap', eyeSpread: 1, mouthLen: 1.19 },
    },
  },
  {
    id: 'P005',
    nameKey: 'plant.P005.name',
    grade: 'SUN',
    family: 'VINE',
    look: {
      body: 'ROSETTE',
      ramps: { main: 'R6', sub: 'R3' },
      variantRamps: { main: 'R9', sub: 'R4' },
      parts: {},
      face: { type: 'F12', host: 'center', eyeSpread: 0.91, mouthLen: 1.15 },
    },
  },
  {
    id: 'P006',
    nameKey: 'plant.P006.name',
    grade: 'SUN',
    family: 'VINE',
    look: {
      body: 'POD',
      ramps: { main: 'R8', sub: 'R1' },
      variantRamps: { main: 'R5', sub: 'R3' },
      parts: {},
      face: { type: 'F02', host: 'fruit', eyeSpread: 0.82, mouthLen: 1.1 },
    },
  },
  {
    id: 'P007',
    nameKey: 'plant.P007.name',
    grade: 'DUSK',
    family: 'VINE',
    look: {
      body: 'BONSAI',
      ramps: { main: 'R10', sub: 'R1' },
      variantRamps: { main: 'R11', sub: 'R3' },
      parts: {},
      face: { type: 'F07', host: 'crown', eyeSpread: 0.73, mouthLen: 1.06 },
    },
  },
  {
    id: 'P008',
    nameKey: 'plant.P008.name',
    grade: 'MOON',
    family: 'VINE',
    look: {
      body: 'POD',
      ramps: { main: 'R11', sub: 'R5' },
      variantRamps: { main: 'R9', sub: 'R4' },
      parts: {},
      face: { type: 'F05', host: 'fruit', eyeSpread: 0.85, mouthLen: 1.03 },
    },
  },
  {
    id: 'P009',
    nameKey: 'plant.P009.name',
    grade: 'STAR',
    family: 'VINE',
    look: {
      body: 'VINE',
      ramps: { main: 'R5', sub: 'R4', special: 'STARGOLD' },
      variantRamps: { main: 'R3', sub: 'R1' },
      parts: {},
      face: { type: 'F09', host: 'leaf', eyeSpread: 0.76, mouthLen: 0.99 },
    },
  },
  {
    id: 'P010',
    nameKey: 'plant.P010.name',
    grade: 'AURORA',
    family: 'VINE',
    look: {
      body: 'VINE',
      ramps: { main: 'R1', sub: 'R3', accent: 'R5', special: 'AURORA' },
      variantRamps: { main: 'R6', sub: 'R9' },
      parts: {},
      face: { type: 'F02', host: 'leaf', eyeSpread: 0.95, mouthLen: 1.04 },
    },
  },
];
