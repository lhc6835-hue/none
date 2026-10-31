// 전투 이펙트 조각: 투사체 모양 · 입자. 종마다 (모양 × 색 × 꼬리 × 타격) 조합이 달라 한눈에 구분된다(07문서).

import type Phaser from 'phaser';
import type { ProjShape } from '../data/battle/types';
import { PixelCanvas } from './PixelCanvas';
import { RAMPS, SPECIAL } from './palette';

const ramp = (name: string): readonly string[] =>
  (RAMPS as Record<string, readonly string[]>)[name] ?? RAMPS.R4;

/** 모양별 문자 지도('a' 주색 · 'b' 보조색 · 'w' 흰 반짝임) */
const SHAPES: Record<Exclude<ProjShape, 'none' | 'ray'>, string[]> = {
  orb: ['.aaa.', 'aaaaa', 'aabaa', 'aaaaa', '.aaa.'],
  needle: ['.......', 'bbaaaaa', '.......'],
  seed: ['.a.', 'aaa', 'aba', 'aaa', '.a.'],
  leaf: ['..aa.', '.aaaa', 'aabaa', 'aaaa.', 'aa...'],
  flame: ['..a..', '.aab.', '.aaba', 'aabba', '.aaa.'],
  shard: ['..a..', '.aaa.', 'aabaa', '.aaa.', '..a..'],
  bolt: ['...aa', '..aa.', '.aaaa', '..aa.', 'aa...'],
  note: ['..aa', '..a.', '..a.', 'aaa.', 'aa..'],
  spore: ['.a.a.', 'a.b.a', '.aaa.', 'a.a.a', '.a.a.'],
  drop: ['..a..', '.aaa.', 'aabaa', 'aaaaa', '.aaa.'],
  star: ['..a..', '..a..', 'aabaa', '..a..', '..a..'],
  petal: ['.aa..', 'aaaa.', 'aabaa', '.aaaa', '..aa.'],
  fruit: ['..bb...', '.aaaaa.', 'aabaaaa', 'aaaaaaa', 'aaaaaaa', '.aaaaa.', '..aaa..'],
  thorn: ['a......', 'aaa....', 'aabbaaa', 'aaa....', 'a......'],
  web: ['a.a.a', '.aba.', 'aabaa', '.aba.', 'a.a.a'],
  ink: ['.aaa..', 'aaaaaa', 'aabaaa', '.aaaaa', '..aa..'],
  wisp: ['..aaa..', '.aabaa.', '.aaaaa.', '..aaa..', '...a...', '....a..'],
};

export function shapeSize(shape: ProjShape): { w: number; h: number } {
  const rows = (SHAPES as Record<string, string[]>)[shape];
  return rows ? { w: rows[0].length, h: rows.length } : { w: 1, h: 1 };
}

export function fxShapeTexture(
  scene: Phaser.Scene,
  shape: ProjShape,
  c1: [string, number],
  c2: [string, number] | undefined,
): string {
  const col2 = c2 ?? [c1[0], Math.min(4, c1[1] + 1)];
  const key = `fxs:${shape}:${c1.join('')}:${col2.join('')}`;
  if (scene.textures.exists(key)) return key;
  const rows = (SHAPES as Record<string, string[]>)[shape] ?? ['a'];
  const cv = new PixelCanvas(rows[0].length + 2, rows.length + 2);
  cv.stamp(1, 1, rows, { a: ramp(c1[0])[c1[1]], b: ramp(col2[0])[col2[1]], w: SPECIAL.PAPER });
  return cv.toTexture(scene, key);
}

/** 1×1 입자(팔레트 색) */
export function pixelTexture(scene: Phaser.Scene, color: string, size = 2): string {
  const key = `fxp:${color}:${size}`;
  if (scene.textures.exists(key)) return key;
  return new PixelCanvas(size, size).rect(0, 0, size, size, color).toTexture(scene, key);
}

export const rampColor = (c: [string, number]): string => ramp(c[0])[c[1]];
