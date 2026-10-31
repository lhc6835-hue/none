// 자동 생성 파일 — scripts/gen-plant-looks.ts (원본: docs/07-plants-1~4.md 의 '형태 · 얼굴' · '색' 열).
// 직접 고치지 말고 문서나 스크립트를 고친 뒤 `npx tsx scripts/gen-plant-looks.ts` 를 다시 실행한다.
// 외형 미세 조정(eyeSpread · mouthLen · offset)과 parts 는 이 파일을 직접 고쳐도 되지만, 다시 생성하면 덮어쓴다.

import type { PlantBase } from './types';

export const FUNGUS_PLANTS: PlantBase[] = [
  {
    id: 'P021',
    nameKey: 'plant.P021.name',
    grade: 'SHADE',
    family: 'FUNGUS',
    look: {
      body: 'CAP',
      ramps: { main: 'R6', sub: 'R10', special: 'TOXIC' },
      variantRamps: { main: 'R4', sub: 'R11' },
      parts: { toxicGlow: true },
      face: { type: 'F03', host: 'cap', eyeSpread: 0.94, mouthLen: 0.9 },
    },
  },
  {
    id: 'P022',
    nameKey: 'plant.P022.name',
    grade: 'SHADE',
    family: 'FUNGUS',
    look: {
      body: 'CAP',
      ramps: { main: 'R10', sub: 'R2' },
      variantRamps: { main: 'R5', sub: 'R6' },
      parts: {},
      face: { type: 'F10', host: 'cap', eyeSpread: 0.8, mouthLen: 1.03 },
    },
  },
  {
    id: 'P023',
    nameKey: 'plant.P023.name',
    grade: 'DEW',
    family: 'FUNGUS',
    look: {
      body: 'CAP',
      ramps: { main: 'R7', sub: 'R11' },
      variantRamps: { main: 'R4', sub: 'R11' },
      parts: {},
      face: { type: 'F01', host: 'cap', eyeSpread: 0.71, mouthLen: 0.99 },
    },
  },
  {
    id: 'P024',
    nameKey: 'plant.P024.name',
    grade: 'DEW',
    family: 'FUNGUS',
    look: {
      body: 'CAP',
      ramps: { main: 'R11', sub: 'R5' },
      variantRamps: { main: 'R9', sub: 'R10' },
      parts: {},
      face: { type: 'F07', host: 'cap', eyeSpread: 0.67, mouthLen: 0.76 },
    },
  },
  {
    id: 'P025',
    nameKey: 'plant.P025.name',
    grade: 'SUN',
    family: 'FUNGUS',
    look: {
      body: 'BUSH',
      ramps: { main: 'R11', sub: 'R10', special: 'TOXIC' },
      variantRamps: { main: 'R6', sub: 'R5' },
      parts: { toxicGlow: true },
      face: { type: 'F05', host: 'mass', eyeSpread: 0.99, mouthLen: 0.71 },
    },
  },
  {
    id: 'P026',
    nameKey: 'plant.P026.name',
    grade: 'DUSK',
    family: 'FUNGUS',
    look: {
      body: 'PITCHER',
      ramps: { main: 'R10', sub: 'R6' },
      variantRamps: { main: 'R3', sub: 'R4' },
      parts: {},
      face: { type: 'F02', host: 'pitcher', eyeSpread: 0.85, mouthLen: 0.85 },
    },
  },
  {
    id: 'P027',
    nameKey: 'plant.P027.name',
    grade: 'DUSK',
    family: 'FUNGUS',
    look: {
      body: 'CAP',
      ramps: { main: 'R9', sub: 'R6' },
      variantRamps: { main: 'R3', sub: 'R5' },
      parts: {},
      face: { type: 'F10', host: 'cap', eyeSpread: 0.76, mouthLen: 0.81 },
    },
  },
  {
    id: 'P028',
    nameKey: 'plant.P028.name',
    grade: 'MOON',
    family: 'FUNGUS',
    look: {
      body: 'CAP',
      ramps: { main: 'R5', sub: 'R10', special: 'SILVER' },
      variantRamps: { main: 'R8', sub: 'R7' },
      parts: {},
      face: { type: 'F01', host: 'cap', eyeSpread: 0.72, mouthLen: 0.58 },
    },
  },
  {
    id: 'P029',
    nameKey: 'plant.P029.name',
    grade: 'STAR',
    family: 'FUNGUS',
    look: {
      body: 'BUSH',
      ramps: { main: 'R5', sub: 'R4', special: 'STARGOLD' },
      variantRamps: { main: 'R6', sub: 'R3' },
      parts: { toxicGlow: true },
      face: { type: 'F09', host: 'mass', eyeSpread: 0.63, mouthLen: 0.53 },
    },
  },
  {
    id: 'P030',
    nameKey: 'plant.P030.name',
    grade: 'AURORA',
    family: 'FUNGUS',
    look: {
      body: 'CAP',
      ramps: { main: 'R5', sub: 'R6', special: 'AURORA' },
      variantRamps: { main: 'R3', sub: 'R9' },
      parts: { toxicGlow: true },
      face: { type: 'F02', host: 'cap', eyeSpread: 0.95, mouthLen: 1.01 },
    },
  },
];
