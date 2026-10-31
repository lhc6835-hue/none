// 정수 좌표 · 팔레트 색만 허용하는 작은 캔버스. 배경 · UI 프레임 같은 정적 그림을 구워 Phaser 텍스처로 쓴다.
// 팔레트 밖 색을 그리려 하면 그 자리에서 예외를 던져 규칙(02문서 2절)을 코드로 지킨다.

import type Phaser from 'phaser';
import { isPaletteColor } from './palette';

export class PixelCanvas {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D 캔버스를 만들 수 없습니다');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
  }

  private color(hex: string): string {
    if (!isPaletteColor(hex)) throw new Error(`팔레트 밖의 색입니다: ${hex}`);
    return hex;
  }

  clear(): this {
    this.ctx.clearRect(0, 0, this.w, this.h);
    return this;
  }

  px(x: number, y: number, color: string): this {
    this.ctx.fillStyle = this.color(color);
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, color: string): this {
    if (w <= 0 || h <= 0) return this;
    this.ctx.fillStyle = this.color(color);
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    return this;
  }

  hline(x: number, y: number, len: number, color: string): this {
    return this.rect(x, y, len, 1, color);
  }

  vline(x: number, y: number, len: number, color: string): this {
    return this.rect(x, y, 1, len, color);
  }

  /** 1px 테두리 사각형 */
  frame(x: number, y: number, w: number, h: number, color: string): this {
    this.hline(x, y, w, color);
    this.hline(x, y + h - 1, w, color);
    this.vline(x, y, h, color);
    this.vline(x + w - 1, y, h, color);
    return this;
  }

  /** 두 색의 2색 체크 디더링. 배경 · 하늘 · 물에서만 쓴다(캐릭터 몸에는 금지). */
  dither(x: number, y: number, w: number, h: number, a: string, b: string, phase = 0): this {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) this.px(x + i, y + j, (i + j + phase) % 2 === 0 ? a : b);
    }
    return this;
  }

  /** 채워진 원(중점 원 알고리즘, 행 단위) */
  disc(cx: number, cy: number, r: number, color: string): this {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r + 0.25 - dy * dy + r * 0.5));
      this.hline(cx - half, cy + dy, half * 2 + 1, color);
    }
    return this;
  }

  /** 문자 지도 → 픽셀. map 의 각 글자는 colors 에서 색을 찾고, '.' 는 비운다. */
  stamp(x: number, y: number, rows: readonly string[], colors: Record<string, string>): this {
    rows.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        const c = colors[ch];
        if (c) this.px(x + i, y + j, c);
      });
    });
    return this;
  }

  /** 모든 픽셀의 RGB 를 모아 팔레트 밖 색이 있는지 검사한다(알파가 0이 아닌 픽셀만). */
  stray(): string[] {
    const data = this.ctx.getImageData(0, 0, this.w, this.h).data;
    const bad = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const hex =
        '#' +
        [data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      if (!isPaletteColor(hex)) bad.add(hex);
    }
    return [...bad];
  }

  /** Phaser 텍스처로 등록(같은 키가 있으면 교체) */
  toTexture(scene: Phaser.Scene, key: string): string {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, this.canvas);
    return key;
  }
}
