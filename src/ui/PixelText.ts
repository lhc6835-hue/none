// 갈무리 글꼴 텍스트 (02문서 8절): Galmuri11(본문) · Galmuri9(작은 라벨) · Galmuri14(제목) · 11 Bold(강조).
// 글꼴은 정해진 크기에서만 칸에 딱 맞게 그려지므로 크기를 늘리지 않는다(믹셀 금지). 위치는 항상 정수.

import Phaser from 'phaser';
import { SPECIAL } from '../art/palette';

export type FontSize = 7 | 9 | 11 | 14;

/**
 * 갈무리는 글꼴 이름(7·9·11·14)이 아니라 그보다 1px 큰 CSS 크기에서만 칸에 딱 맞게 그려진다.
 * (실측: Galmuri11 은 12px · 24px 에서만 안티앨리어싱 0, 11px 에서는 94% 가 번짐. DECISIONS.md 참고)
 */
export const FONT_EM: Record<FontSize, number> = { 7: 8, 9: 10, 11: 12, 14: 15 };

export const FONT_FILES: { family: string; file: string }[] = [
  { family: 'Galmuri7', file: 'Galmuri7.woff2' },
  { family: 'Galmuri9', file: 'Galmuri9.woff2' },
  { family: 'Galmuri11', file: 'Galmuri11.woff2' },
  { family: 'Galmuri11Bold', file: 'Galmuri11-Bold.woff2' },
  { family: 'Galmuri14', file: 'Galmuri14.woff2' },
];

export interface PixelTextOptions {
  size?: FontSize;
  bold?: boolean;
  /** 팔레트 색 '#rrggbb' */
  color?: string;
  /** 0 왼쪽 · 0.5 가운데 · 1 오른쪽 (정렬과 원점을 함께 정한다) */
  anchorX?: number;
  anchorY?: number;
  wrapWidth?: number;
  align?: 'left' | 'center' | 'right';
}

export function fontFamily(size: FontSize, bold = false): string {
  if (bold && size === 11) return 'Galmuri11Bold';
  return `Galmuri${size}`;
}

/** 줄 간격 1.5배 (02문서 8절). 글꼴 높이 위에 얹을 여백. */
export function lineGap(size: FontSize): number {
  return Math.round(size * 0.5) - 1;
}

export function pixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: PixelTextOptions = {},
): Phaser.GameObjects.Text {
  const size = opts.size ?? 11;
  const obj = scene.add.text(Math.round(x), Math.round(y), text, {
    fontFamily: fontFamily(size, opts.bold),
    fontSize: `${FONT_EM[size]}px`,
    color: opts.color ?? SPECIAL.INK,
    align: opts.align ?? 'left',
    lineSpacing: lineGap(size),
    wordWrap: opts.wrapWidth ? { width: opts.wrapWidth, useAdvancedWrap: true } : undefined,
    padding: { x: 0, y: 1 },
  });
  obj.setOrigin(opts.anchorX ?? 0, opts.anchorY ?? 0);
  obj.setResolution(1);
  return obj;
}

/** 브라우저에 갈무리 글꼴을 올린다. 모두 올라올 때까지 기다린다. */
export async function loadFonts(baseUrl: string): Promise<void> {
  const loads = FONT_FILES.map(async ({ family, file }) => {
    const face = new FontFace(family, `url(${baseUrl}fonts/${file}) format('woff2')`);
    await face.load();
    document.fonts.add(face);
  });
  await Promise.all(loads);
}

/** 1px 외곽선이 있는 글자(밝은 배경 위 제목 등). 외곽선 4방향 + 본문을 한 컨테이너로 묶는다. */
export function outlinedText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: PixelTextOptions & { outline?: string },
): Phaser.GameObjects.Container {
  const outline = opts.outline ?? SPECIAL.INK;
  const parts: Phaser.GameObjects.Text[] = [];
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [1, 1],
  ]) {
    parts.push(pixelText(scene, dx, dy, text, { ...opts, color: outline }));
  }
  parts.push(pixelText(scene, 0, 0, text, opts));
  const box = scene.add.container(Math.round(x), Math.round(y), parts);
  box.setSize(parts[parts.length - 1].width, parts[parts.length - 1].height);
  return box;
}
