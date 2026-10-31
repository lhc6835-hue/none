// 아이콘 · 등급 표식 텍스처(Phaser 에 지연 등록)

import type Phaser from 'phaser';
import { gridToCanvas } from '../art/GridCanvas';
import { generateIcon, generateMark } from '../art/IconGen';
import type { GradeMark } from '../data/grades';

export function iconTexture(scene: Phaser.Scene, name: string): string {
  const key = `icon:${name}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, gridToCanvas(generateIcon(name)));
  return key;
}

export function markTexture(scene: Phaser.Scene, mark: GradeMark, color: string): string {
  const key = `mark:${mark}:${color}`;
  if (!scene.textures.exists(key))
    scene.textures.addCanvas(key, gridToCanvas(generateMark(mark, color)));
  return key;
}
