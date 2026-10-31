// 자동 생성 파일 — scripts/gen-plant-looks.ts (원본: docs/07-plants-1~4.md 의 '형태 · 얼굴' · '색' 열).
// 직접 고치지 말고 문서나 스크립트를 고친 뒤 `npx tsx scripts/gen-plant-looks.ts` 를 다시 실행한다.
// 외형 미세 조정(eyeSpread · mouthLen · offset)과 parts 는 이 파일을 직접 고쳐도 되지만, 다시 생성하면 덮어쓴다.

import type { PlantBase } from './types';

export const FRUIT_PLANTS: PlantBase[] = [
  {
    id: 'P041',
    nameKey: 'plant.P041.name',
    grade: 'SHADE',
    family: 'FRUIT',
    look: {
      body: 'BONSAI',
      ramps: { main: 'R10', sub: 'R1' },
      variantRamps: { main: 'R9', sub: 'R2' },
      parts: {},
      face: { type: 'F01', host: 'trunk', eyeSpread: 0.83, mouthLen: 0.55 },
    },
  },
  {
    id: 'P042',
    nameKey: 'plant.P042.name',
    grade: 'SHADE',
    family: 'FRUIT',
    look: {
      body: 'STALK',
      ramps: { main: 'R6', sub: 'R1' },
      variantRamps: { main: 'R7', sub: 'R9' },
      parts: {},
      face: { type: 'F10', host: 'head', eyeSpread: 0.74, mouthLen: 0.5 },
    },
  },
  {
    id: 'P043',
    nameKey: 'plant.P043.name',
    grade: 'DEW',
    family: 'FRUIT',
    look: {
      body: 'POD',
      ramps: { main: 'R2', sub: 'R1' },
      variantRamps: { main: 'R8', sub: 'R10' },
      parts: {},
      face: { type: 'F02', host: 'fruit', eyeSpread: 0.65, mouthLen: 1.17 },
    },
  },
  {
    id: 'P044',
    nameKey: 'plant.P044.name',
    grade: 'DEW',
    family: 'FRUIT',
    look: {
      body: 'POD',
      ramps: { main: 'R7', sub: 'R6' },
      variantRamps: { main: 'R9', sub: 'R8' },
      parts: {},
      face: { type: 'F04', host: 'fruit', eyeSpread: 0.87, mouthLen: 0.78 },
    },
  },
  {
    id: 'P045',
    nameKey: 'plant.P045.name',
    grade: 'SUN',
    family: 'FRUIT',
    look: {
      body: 'POD',
      ramps: { main: 'R10', sub: 'R1' },
      variantRamps: { main: 'R9', sub: 'R3' },
      parts: {},
      face: { type: 'F01', host: 'fruit', eyeSpread: 0.78, mouthLen: 0.73 },
    },
  },
  {
    id: 'P046',
    nameKey: 'plant.P046.name',
    grade: 'DUSK',
    family: 'FRUIT',
    look: {
      body: 'POD',
      ramps: { main: 'R8', sub: 'R7' },
      variantRamps: { main: 'R4', sub: 'R5' },
      parts: {},
      face: { type: 'F03', host: 'fruit', eyeSpread: 0.69, mouthLen: 0.69 },
    },
  },
  {
    id: 'P047',
    nameKey: 'plant.P047.name',
    grade: 'DUSK',
    family: 'FRUIT',
    look: {
      body: 'POD',
      ramps: { main: 'R9', sub: 'R2' },
      variantRamps: { main: 'R5', sub: 'R6' },
      parts: {},
      face: { type: 'F06', host: 'fruit', eyeSpread: 0.6, mouthLen: 0.64 },
    },
  },
  {
    id: 'P048',
    nameKey: 'plant.P048.name',
    grade: 'MOON',
    family: 'FRUIT',
    look: {
      body: 'VINE',
      ramps: { main: 'R5', sub: 'R1', special: 'SILVER' },
      variantRamps: { main: 'R1', sub: 'R2' },
      parts: {},
      face: { type: 'F09', host: 'leaf', eyeSpread: 0.61, mouthLen: 0.94 },
    },
  },
  {
    id: 'P049',
    nameKey: 'plant.P049.name',
    grade: 'STAR',
    family: 'FRUIT',
    look: {
      body: 'BONSAI',
      ramps: { main: 'R7', sub: 'R1', special: 'STARGOLD' },
      variantRamps: { main: 'R9', sub: 'R2' },
      parts: {},
      face: { type: 'F01', host: 'crown', eyeSpread: 0.93, mouthLen: 0.89 },
    },
  },
  {
    id: 'P050',
    nameKey: 'plant.P050.name',
    grade: 'AURORA',
    family: 'FRUIT',
    look: {
      body: 'BONSAI',
      ramps: { main: 'R8', sub: 'R1', accent: 'R5', special: 'AURORA' },
      variantRamps: { main: 'R4', sub: 'R6' },
      parts: {},
      face: { type: 'F05', host: 'crown', eyeSpread: 0.92, mouthLen: 0.96 },
    },
  },
];
