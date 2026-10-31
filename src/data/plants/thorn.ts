// 자동 생성 파일 — scripts/gen-plant-looks.ts (원본: docs/07-plants-1~4.md 의 '형태 · 얼굴' · '색' 열).
// 직접 고치지 말고 문서나 스크립트를 고친 뒤 `npx tsx scripts/gen-plant-looks.ts` 를 다시 실행한다.
// 외형 미세 조정(eyeSpread · mouthLen · offset)과 parts 는 이 파일을 직접 고쳐도 되지만, 다시 생성하면 덮어쓴다.

import type { PlantBase } from './types';

export const THORN_PLANTS: PlantBase[] = [
  {
    id: 'P011',
    nameKey: 'plant.P011.name',
    grade: 'SHADE',
    family: 'THORN',
    look: {
      body: 'COLUMN',
      ramps: { main: 'R2', sub: 'R1', accent: 'R6' },
      variantRamps: { main: 'R4', sub: 'R3' },
      parts: { accentOnBloom: true },
      face: { type: 'F04', host: 'column', eyeSpread: 0.63, mouthLen: 1.08 },
    },
  },
  {
    id: 'P012',
    nameKey: 'plant.P012.name',
    grade: 'SHADE',
    family: 'THORN',
    look: {
      body: 'BULB',
      ramps: { main: 'R10', sub: 'R2' },
      variantRamps: { main: 'R7', sub: 'R9' },
      parts: {},
      face: { type: 'F03', host: 'bulb', eyeSpread: 0.72, mouthLen: 1.13 },
    },
  },
  {
    id: 'P013',
    nameKey: 'plant.P013.name',
    grade: 'DEW',
    family: 'THORN',
    look: {
      body: 'BONSAI',
      ramps: { main: 'R1', sub: 'R10' },
      variantRamps: { main: 'R4', sub: 'R11' },
      parts: {},
      face: { type: 'F05', host: 'crown', eyeSpread: 0.81, mouthLen: 1.17 },
    },
  },
  {
    id: 'P014',
    nameKey: 'plant.P014.name',
    grade: 'DEW',
    family: 'THORN',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R7', sub: 'R1' },
      variantRamps: { main: 'R9', sub: 'R3' },
      parts: {},
      face: { type: 'F01', host: 'center', eyeSpread: 1, mouthLen: 0.85 },
    },
  },
  {
    id: 'P015',
    nameKey: 'plant.P015.name',
    grade: 'SUN',
    family: 'THORN',
    look: {
      body: 'FLOWER',
      ramps: { main: 'R5', sub: 'R2' },
      variantRamps: { main: 'R8', sub: 'R1' },
      parts: {},
      face: { type: 'F06', host: 'center', eyeSpread: 0.68, mouthLen: 0.9 },
    },
  },
  {
    id: 'P016',
    nameKey: 'plant.P016.name',
    grade: 'SUN',
    family: 'THORN',
    look: {
      body: 'ROSETTE',
      ramps: { main: 'R2', sub: 'R11' },
      variantRamps: { main: 'R3', sub: 'R9' },
      parts: {},
      face: { type: 'F01', host: 'center', eyeSpread: 0.77, mouthLen: 0.95 },
    },
  },
  {
    id: 'P017',
    nameKey: 'plant.P017.name',
    grade: 'DUSK',
    family: 'THORN',
    look: {
      body: 'BONSAI',
      ramps: { main: 'R9', sub: 'R1' },
      variantRamps: { main: 'R6', sub: 'R5' },
      parts: {},
      face: { type: 'F07', host: 'crown', eyeSpread: 0.86, mouthLen: 0.99 },
    },
  },
  {
    id: 'P018',
    nameKey: 'plant.P018.name',
    grade: 'MOON',
    family: 'THORN',
    look: {
      body: 'BUSH',
      ramps: { main: 'R11', sub: 'R5' },
      variantRamps: { main: 'R9', sub: 'R7' },
      parts: {},
      face: { type: 'F04', host: 'mass', eyeSpread: 0.85, mouthLen: 0.69 },
    },
  },
  {
    id: 'P019',
    nameKey: 'plant.P019.name',
    grade: 'STAR',
    family: 'THORN',
    look: {
      body: 'ROSETTE',
      ramps: { main: 'R4', sub: 'R9', special: 'STARGOLD' },
      variantRamps: { main: 'R7', sub: 'R8' },
      parts: {},
      face: { type: 'F02', host: 'center', eyeSpread: 0.94, mouthLen: 0.74 },
    },
  },
  {
    id: 'P020',
    nameKey: 'plant.P020.name',
    grade: 'AURORA',
    family: 'THORN',
    look: {
      body: 'BONSAI',
      ramps: { main: 'R2', sub: 'R7', accent: 'R9', special: 'AURORA' },
      variantRamps: { main: 'R5', sub: 'R4' },
      parts: {},
      face: { type: 'F12', host: 'crown', eyeSpread: 0.62, mouthLen: 0.94 },
    },
  },
];
