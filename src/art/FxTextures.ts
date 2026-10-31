// 작은 이펙트 · 아이콘 텍스처 (02문서 10절). 모두 팔레트 색, 1:1 픽셀.

import type Phaser from 'phaser';
import { PixelCanvas } from './PixelCanvas';
import { RAMPS, SPECIAL } from './palette';

export const FX = {
  mote: 'fx:mote', // 먼지 입자 1×1
  star: 'fx:star', // 별 1×1
  starCross: 'fx:star-cross', // 별 반짝(3×3 십자)
  firefly: 'fx:firefly', // 반딧불 2×2
  fireflyDim: 'fx:firefly-dim',
  seed: 'fx:seed', // 로딩: 씨앗 3×2
  sprout1: 'fx:sprout1', // 로딩: 막 싹튼 5×5
  sprout2: 'fx:sprout2', // 로딩: 잎 둘 7×8
} as const;

export function createFxTextures(scene: Phaser.Scene): void {
  new PixelCanvas(1, 1).px(0, 0, RAMPS.R9[4]).toTexture(scene, FX.mote);
  new PixelCanvas(1, 1).px(0, 0, SPECIAL.PAPER).toTexture(scene, FX.star);
  new PixelCanvas(3, 3)
    .px(1, 0, SPECIAL.PAPER)
    .px(0, 1, SPECIAL.PAPER)
    .px(1, 1, SPECIAL.PAPER)
    .px(2, 1, SPECIAL.PAPER)
    .px(1, 2, SPECIAL.PAPER)
    .toTexture(scene, FX.starCross);
  new PixelCanvas(2, 2).rect(0, 0, 2, 2, RAMPS.R9[4]).toTexture(scene, FX.firefly);
  new PixelCanvas(2, 2).rect(0, 0, 2, 2, RAMPS.R9[2]).toTexture(scene, FX.fireflyDim);

  const seedColors = { s: RAMPS.R10[3], d: RAMPS.R10[1], h: RAMPS.R10[4] };
  new PixelCanvas(3, 2).stamp(0, 0, ['hss', 'sdd'], seedColors).toTexture(scene, FX.seed);

  const leaf = { L: RAMPS.R1[3], l: RAMPS.R1[4], s: RAMPS.R1[2] };
  new PixelCanvas(5, 5)
    .stamp(0, 0, ['.L.L.', 'LLsLL', '.LsL.', '..s..', '..s..'], leaf)
    .toTexture(scene, FX.sprout1);
  new PixelCanvas(7, 8)
    .stamp(
      0,
      0,
      ['lL...Ll', 'LLL.LLL', '.LLsLL.', '..LsL..', '...s...', '...s...', '...s...', '..sss..'],
      leaf,
    )
    .toTexture(scene, FX.sprout2);
}
