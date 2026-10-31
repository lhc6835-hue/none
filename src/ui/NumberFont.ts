// 직접 만든 비트맵 숫자 폰트 (02문서 8절): 3×5(피해 숫자 · 작은 게이지) · 5×7(큰 게이지 · 점수).
// 숫자 · + − % / x . : , 를 지원한다. 글자 한 칸은 1px 간격으로 이어 붙이고, 색은 팔레트 한 가지로 칠한다.

import type Phaser from 'phaser';
import { PixelCanvas } from '../art/PixelCanvas';

export type NumberSize = '3x5' | '5x7';

const GLYPHS_3X5: Record<string, string[]> = {
  '0': ['xxx', 'x.x', 'x.x', 'x.x', 'xxx'],
  '1': ['.x.', 'xx.', '.x.', '.x.', 'xxx'],
  '2': ['xxx', '..x', 'xxx', 'x..', 'xxx'],
  '3': ['xxx', '..x', 'xxx', '..x', 'xxx'],
  '4': ['x.x', 'x.x', 'xxx', '..x', '..x'],
  '5': ['xxx', 'x..', 'xxx', '..x', 'xxx'],
  '6': ['xxx', 'x..', 'xxx', 'x.x', 'xxx'],
  '7': ['xxx', '..x', '..x', '.x.', '.x.'],
  '8': ['xxx', 'x.x', 'xxx', 'x.x', 'xxx'],
  '9': ['xxx', 'x.x', 'xxx', '..x', 'xxx'],
  '+': ['...', '.x.', 'xxx', '.x.', '...'],
  '-': ['...', '...', 'xxx', '...', '...'],
  '%': ['x.x', '..x', '.x.', 'x..', 'x.x'],
  '/': ['..x', '..x', '.x.', 'x..', 'x..'],
  x: ['...', 'x.x', '.x.', 'x.x', '...'],
  '.': ['...', '...', '...', '...', '.x.'],
  ':': ['...', '.x.', '...', '.x.', '...'],
  ',': ['...', '...', '...', '.x.', 'x..'],
};

const GLYPHS_5X7: Record<string, string[]> = {
  '0': ['.xxx.', 'x...x', 'x..xx', 'x.x.x', 'xx..x', 'x...x', '.xxx.'],
  '1': ['..x..', '.xx..', '..x..', '..x..', '..x..', '..x..', '.xxx.'],
  '2': ['.xxx.', 'x...x', '....x', '...x.', '..x..', '.x...', 'xxxxx'],
  '3': ['xxxx.', '....x', '....x', '.xxx.', '....x', '....x', 'xxxx.'],
  '4': ['...x.', '..xx.', '.x.x.', 'x..x.', 'xxxxx', '...x.', '...x.'],
  '5': ['xxxxx', 'x....', 'xxxx.', '....x', '....x', 'x...x', '.xxx.'],
  '6': ['.xxx.', 'x....', 'x....', 'xxxx.', 'x...x', 'x...x', '.xxx.'],
  '7': ['xxxxx', '....x', '...x.', '..x..', '..x..', '..x..', '..x..'],
  '8': ['.xxx.', 'x...x', 'x...x', '.xxx.', 'x...x', 'x...x', '.xxx.'],
  '9': ['.xxx.', 'x...x', 'x...x', '.xxxx', '....x', '....x', '.xxx.'],
  '+': ['.....', '..x..', '..x..', 'xxxxx', '..x..', '..x..', '.....'],
  '-': ['.....', '.....', '.....', 'xxxxx', '.....', '.....', '.....'],
  '%': ['xx..x', 'xx..x', '...x.', '..x..', '.x...', 'x..xx', 'x..xx'],
  '/': ['....x', '....x', '...x.', '..x..', '.x...', 'x....', 'x....'],
  x: ['.....', 'x...x', '.x.x.', '..x..', '.x.x.', 'x...x', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.xx..', '.xx..'],
  ':': ['.....', '.xx..', '.xx..', '.....', '.xx..', '.xx..', '.....'],
  ',': ['.....', '.....', '.....', '.....', '.xx..', '..x..', '.x...'],
};

const TABLE: Record<NumberSize, Record<string, string[]>> = {
  '3x5': GLYPHS_3X5,
  '5x7': GLYPHS_5X7,
};
const DIMS: Record<NumberSize, [number, number]> = { '3x5': [3, 5], '5x7': [5, 7] };

export function glyphKey(size: NumberSize, ch: string, color: string): string {
  return `num:${size}:${ch.charCodeAt(0)}:${color}`;
}

/** 글자 한 칸 텍스처(색마다 따로 구워 캐시) */
export function ensureGlyph(
  scene: Phaser.Scene,
  size: NumberSize,
  ch: string,
  color: string,
): string {
  const key = glyphKey(size, ch, color);
  if (scene.textures.exists(key)) return key;
  const rows = TABLE[size][ch] ?? TABLE[size]['-'];
  const [w, h] = DIMS[size];
  const c = new PixelCanvas(w, h);
  rows.forEach((row, y) => [...row].forEach((v, x) => v === 'x' && c.px(x, y, color)));
  return c.toTexture(scene, key);
}

export function numberWidth(size: NumberSize, text: string): number {
  return text.length * (DIMS[size][0] + 1) - 1;
}

/** 숫자 문자열을 이미지 컨테이너로 만든다. 오른쪽 정렬이면 오른쪽 끝이 x 가 된다. */
export function numberText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: string,
  size: NumberSize = '3x5',
  align: 'left' | 'right' = 'left',
): Phaser.GameObjects.Container {
  const holder = scene.add.container(Math.round(x), Math.round(y));
  const [w] = DIMS[size];
  const start = align === 'right' ? -numberWidth(size, text) : 0;
  [...text].forEach((ch, i) => {
    holder.add(
      scene.add.image(start + i * (w + 1), 0, ensureGlyph(scene, size, ch, color)).setOrigin(0, 0),
    );
  });
  return holder;
}
