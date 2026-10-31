// 자동 생성 파일 — scripts/gen-plant-looks.ts (원본: docs/07-plants-1~4.md 의 '형태 · 얼굴' · '색' 열).
// 직접 고치지 말고 문서나 스크립트를 고친 뒤 `npx tsx scripts/gen-plant-looks.ts` 를 다시 실행한다.
// 외형 미세 조정(eyeSpread · mouthLen · offset)과 parts 는 이 파일을 직접 고쳐도 되지만, 다시 생성하면 덮어쓴다.

import type { PlantBase } from './types';

export const FROST_PLANTS: PlantBase[] = [
  {
    id: 'P061',
    nameKey: 'plant.P061.name',
    grade: 'SHADE',
    family: 'FROST',
    look: {
      body: 'STALK',
      ramps: { main: 'R10', sub: 'R1' },
      variantRamps: { main: 'R4', sub: 'R3' },
      parts: {},
      face: { type: 'F08', host: 'head', eyeSpread: 0.86, mouthLen: 0.65 },
    },
  },
  {
    id: 'P062',
    nameKey: 'plant.P062.name',
    grade: 'SHADE',
    family: 'FROST',
    look: {
      body: 'BULB',
      ramps: { main: 'R3', sub: 'R4' },
      variantRamps: { main: 'R1', sub: 'R2' },
      parts: {},
      face: { type: 'F01', host: 'bulb', eyeSpread: 0.72, mouthLen: 0.79 },
    },
  },
  {
    id: 'P063',
    nameKey: 'plant.P063.name',
    grade: 'DEW',
    family: 'FROST',
    look: {
      body: 'LILY',
      ramps: { main: 'R4', sub: 'R11' },
      variantRamps: { main: 'R6', sub: 'R11' },
      parts: {},
      face: { type: 'F02', host: 'pad', eyeSpread: 0.63, mouthLen: 0.74 },
    },
  },
  {
    id: 'P064',
    nameKey: 'plant.P064.name',
    grade: 'SUN',
    family: 'FROST',
    look: {
      body: 'VINE',
      ramps: { main: 'R4', sub: 'R1' },
      variantRamps: { main: 'R3', sub: 'R11' },
      parts: {},
      face: { type: 'F04', host: 'leaf', eyeSpread: 0.9, mouthLen: 0.88 },
    },
  },
  {
    id: 'P065',
    nameKey: 'plant.P065.name',
    grade: 'SUN',
    family: 'FROST',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R11', sub: 'R4' },
      variantRamps: { main: 'R6', sub: 'R5' },
      parts: {},
      face: { type: 'F03', host: 'center', eyeSpread: 0.81, mouthLen: 0.83 },
    },
  },
  {
    id: 'P066',
    nameKey: 'plant.P066.name',
    grade: 'DUSK',
    family: 'FROST',
    look: {
      body: 'LILY',
      ramps: { main: 'R3', sub: 'R4' },
      variantRamps: { main: 'R5', sub: 'R3' },
      parts: {},
      face: { type: 'F10', host: 'pad', eyeSpread: 0.67, mouthLen: 0.97 },
    },
  },
  {
    id: 'P067',
    nameKey: 'plant.P067.name',
    grade: 'MOON',
    family: 'FROST',
    look: {
      body: 'BONSAI',
      ramps: { main: 'R4', sub: 'R11', special: 'SILVER' },
      variantRamps: { main: 'R6', sub: 'R7' },
      parts: {},
      face: { type: 'F01', host: 'crown', eyeSpread: 0.99, mouthLen: 0.93 },
    },
  },
  {
    id: 'P068',
    nameKey: 'plant.P068.name',
    grade: 'MOON',
    family: 'FROST',
    look: {
      body: 'BULB',
      ramps: { main: 'R4', sub: 'R11', special: 'SILVER' },
      variantRamps: { main: 'R5', sub: 'R6' },
      parts: {},
      face: { type: 'F05', host: 'bulb', eyeSpread: 0.85, mouthLen: 1.06 },
    },
  },
  {
    id: 'P069',
    nameKey: 'plant.P069.name',
    grade: 'STAR',
    family: 'FROST',
    look: {
      body: 'BONSAI',
      ramps: { main: 'R11', sub: 'R4', special: 'STARGOLD' },
      variantRamps: { main: 'R5', sub: 'R3' },
      parts: {},
      face: { type: 'F04', host: 'crown', eyeSpread: 0.76, mouthLen: 1.02 },
    },
  },
  {
    id: 'P070',
    nameKey: 'plant.P070.name',
    grade: 'AURORA',
    family: 'FROST',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R4', sub: 'R11', accent: 'R5', special: 'AURORA' },
      variantRamps: { main: 'R6', sub: 'R9' },
      parts: {},
      face: { type: 'F03', host: 'center', eyeSpread: 0.92, mouthLen: 0.93 },
    },
  },
];
