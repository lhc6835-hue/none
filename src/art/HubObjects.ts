// 허브의 상호작용 사물 · 말풍선 · 표시용 작은 그림(씨앗 상자 · 축음기 · 난로 · 선풍기 …). 모두 팔레트 색만 쓴다.

import type Phaser from 'phaser';
import { PixelCanvas } from './PixelCanvas';
import { RAMPS, SPECIAL } from './palette';

const WOOD = RAMPS.R10;
const IRON = RAMPS.R11;

const stampTex = (
  scene: Phaser.Scene,
  key: string,
  rows: readonly string[],
  colors: Record<string, string>,
): string => {
  if (scene.textures.exists(key)) return key;
  const w = Math.max(...rows.map((r) => r.length));
  return new PixelCanvas(w, rows.length).stamp(0, 0, rows, colors).toTexture(scene, key);
};

export function objectTextures(scene: Phaser.Scene): void {
  // 씨앗 상자: 뚜껑이 살짝 열려 씨앗이 반짝
  stampTex(
    scene,
    'hub:seedbox',
    [
      '..oooooooooooooo..',
      '.oWWWWWWWWWWWWWWo.',
      'oWsSsSsSsSsSsSsSWo',
      'oBBBBBBBBBBBBBBBBo',
      'oBbbbbbbbbbbbbbbBo',
      'oBbyybbbbbbbbyybBo',
      'oBbyybbbbbbbbyybBo',
      'oBbbbbbbbbbbbbbbBo',
      'oBBBBBBBBBBBBBBBBo',
      '.oooooooooooooooo.',
    ],
    { B: WOOD[1], b: WOOD[2], W: WOOD[3], y: RAMPS.R9[3], s: RAMPS.R10[4], S: RAMPS.R1[3] },
  );
  // 축음기: 레코드가 돌고, 나팔이 달린다(3프레임)
  for (let f = 0; f < 3; f++) {
    const c = new PixelCanvas(34, 36);
    c.rect(2, 22, 28, 12, WOOD[2]).rect(2, 22, 28, 2, WOOD[3]).rect(2, 32, 28, 2, WOOD[1]);
    c.disc(15, 22, 11, SPECIAL.INK).disc(15, 22, 9, RAMPS.R11[1]);
    c.disc(15, 22, 3, RAMPS.R7[3]).px(15, 22, SPECIAL.PAPER);
    // 레코드 홈이 도는 표시
    const a = (f * Math.PI * 2) / 3;
    c.px(15 + Math.round(Math.cos(a) * 6), 22 + Math.round(Math.sin(a) * 3), RAMPS.R11[3]);
    c.px(15 - Math.round(Math.cos(a) * 6), 22 - Math.round(Math.sin(a) * 3), RAMPS.R11[3]);
    // 나팔
    c.rect(26, 8, 3, 14, RAMPS.R9[2])
      .rect(24, 2, 9, 3, RAMPS.R9[3])
      .rect(22, 0, 12, 3, RAMPS.R9[4]);
    c.rect(26, 5, 4, 3, RAMPS.R9[3]);
    if (scene.textures.exists(`hub:phono${f}`)) scene.textures.remove(`hub:phono${f}`);
    c.toTexture(scene, `hub:phono${f}`);
  }
  // 난로: 꺼진 몸통 + 불꽃 2프레임
  stampTex(
    scene,
    'hub:stove',
    [
      '..oooooooooo..',
      '.oSSSSSSSSSSo.',
      'oSSSssssssSSSo',
      'oSKKKKKKKKKSSo',
      'oSKKKKKKKKKSSo',
      'oSKKKKKKKKKSSo',
      'oSSSSSSSSSSSSo',
      '.oSSSSSSSSSSo.',
      '.ooo......ooo.',
    ],
    { S: IRON[2], s: IRON[4], K: SPECIAL.INK },
  );
  stampTex(scene, 'hub:flame0', ['...r....', '..rRr...', '.rRyRr..', '.rRyyRr.', '..rRRr..'], {
    r: RAMPS.R7[3],
    R: RAMPS.R8[3],
    y: RAMPS.R9[4],
  });
  stampTex(scene, 'hub:flame1', ['....r...', '...rRr..', '..rRyRr.', '.rRyyRr.', '..rRRr..'], {
    r: RAMPS.R7[3],
    R: RAMPS.R8[3],
    y: RAMPS.R9[4],
  });
  // 선풍기: 날개 2프레임
  for (let f = 0; f < 2; f++) {
    const c = new PixelCanvas(24, 34);
    c.rect(10, 22, 4, 8, IRON[3]).rect(5, 30, 14, 3, IRON[2]);
    c.disc(12, 12, 11, IRON[1]).disc(12, 12, 9, IRON[4]);
    if (f === 0) {
      c.rect(11, 4, 3, 16, RAMPS.R4[3]).rect(4, 11, 16, 3, RAMPS.R4[3]);
    } else {
      for (let i = 0; i < 11; i++) {
        c.px(5 + i, 5 + i, RAMPS.R4[3]).px(6 + i, 5 + i, RAMPS.R4[3]);
        c.px(5 + i, 18 - i, RAMPS.R4[3]).px(6 + i, 18 - i, RAMPS.R4[3]);
      }
    }
    c.disc(12, 12, 2, IRON[2]);
    if (scene.textures.exists(`hub:fan${f}`)) scene.textures.remove(`hub:fan${f}`);
    c.toTexture(scene, `hub:fan${f}`);
  }
  // 말풍선(식물 위): 둥근 종이 + 꼬리. 12×12 아이콘이 들어가는 16×17
  if (!scene.textures.exists('hub:bubble')) {
    const c = new PixelCanvas(16, 17);
    c.rect(2, 0, 12, 15, SPECIAL.INK).rect(0, 2, 16, 11, SPECIAL.INK);
    c.rect(3, 1, 10, 13, SPECIAL.PAPER).rect(1, 3, 14, 9, SPECIAL.PAPER);
    c.rect(6, 14, 4, 2, SPECIAL.INK)
      .rect(7, 14, 2, 1, SPECIAL.PAPER)
      .px(7, 16, SPECIAL.INK)
      .px(8, 16, SPECIAL.INK);
    c.toTexture(scene, 'hub:bubble');
  }
  // 빈 칸 표시(점선 네모) · 잠긴 칸
  stampTex(
    scene,
    'hub:slot-empty',
    [
      'o.o.o.o.o.o',
      'o.........o',
      '.....o.....',
      'o....o....o',
      '.o.o.ooo.o.o',
      'o....o....o',
      '.....o.....',
      'o.........o',
      'o.o.o.o.o.o',
    ],
    { o: RAMPS.R10[4] },
  );
  stampTex(
    scene,
    'hub:slot-locked',
    [
      'o.o.o.o.o.o',
      'o.........o',
      'o.........o',
      'o.........o',
      'o.........o',
      'o.........o',
      'o.........o',
      'o.........o',
      'o.o.o.o.o.o',
    ],
    { o: RAMPS.R11[2] },
  );
  // 추천 도구 배지('!')
  stampTex(scene, 'hub:badge', ['.rrr.', 'rWWWr', 'rWKWr', 'rWKWr', 'rWWWr', 'rWKWr', '.rrr.'], {
    r: RAMPS.R7[3],
    W: SPECIAL.PAPER,
    K: RAMPS.R7[3],
  });
  // 먼지 입자 · 흙 튐
  stampTex(scene, 'hub:dust', ['x'], { x: RAMPS.R10[4] });
  stampTex(scene, 'hub:sparkle', ['.y.', 'yWy', '.y.'], { y: RAMPS.R9[4], W: SPECIAL.PAPER });
  stampTex(scene, 'hub:note', ['.ooo', '.o.o', '.o..', 'oo..', 'oo..'], { o: SPECIAL.INK });
}
