// UI 프레임 텍스처 생성 (02문서 8절): 패널과 버튼 배경을 팔레트 색으로 구워 낸다.
// 패널 3종: 나무 테 + 크림 종이(기본) · 잎 테(정원) · 돌 테(전투). 모서리 4×4.
// (M1 에서 9-slice 와 정식 UI 키트로 확장한다.)

import type Phaser from 'phaser';
import { PixelCanvas } from '../art/PixelCanvas';
import { RAMPS, SPECIAL, UI } from '../art/palette';

export type PanelStyle = 'wood' | 'leaf' | 'stone';
export type ButtonState = 'normal' | 'hover' | 'pressed' | 'disabled';
export type ButtonVariant = 'default' | 'primary';

interface PanelColors {
  outline: string;
  border: string;
  borderLight: string;
  paper: string;
  paperLight: string;
}

const PANELS: Record<PanelStyle, PanelColors> = {
  wood: {
    outline: SPECIAL.INK,
    border: RAMPS.R10[2],
    borderLight: RAMPS.R10[3],
    paper: SPECIAL.CREAM,
    paperLight: SPECIAL.PAPER,
  },
  leaf: {
    outline: SPECIAL.INK,
    border: RAMPS.R1[2],
    borderLight: RAMPS.R1[3],
    paper: SPECIAL.CREAM,
    paperLight: SPECIAL.PAPER,
  },
  stone: {
    outline: SPECIAL.INK,
    border: RAMPS.R11[2],
    borderLight: RAMPS.R11[3],
    paper: RAMPS.R11[4],
    paperLight: SPECIAL.PAPER,
  },
};

/** 모서리를 1px 깎아 둥글게 보이게 하는 사각형 채우기 */
function roundedFill(
  c: PixelCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  c.rect(x + 1, y, w - 2, h, color);
  c.rect(x, y + 1, w, h - 2, color);
}

export function panelKey(style: PanelStyle, w: number, h: number): string {
  return `ui:panel:${style}:${w}x${h}`;
}

export function ensurePanel(scene: Phaser.Scene, style: PanelStyle, w: number, h: number): string {
  const key = panelKey(style, w, h);
  if (scene.textures.exists(key)) return key;
  const p = PANELS[style];
  const c = new PixelCanvas(w, h);
  roundedFill(c, 0, 0, w, h, p.outline); // 바깥 외곽선
  roundedFill(c, 1, 1, w - 2, h - 2, p.border); // 테
  c.hline(2, 1, w - 4, p.borderLight); // 테의 위쪽 하이라이트
  roundedFill(c, 3, 3, w - 6, h - 6, p.outline); // 안쪽 외곽선
  roundedFill(c, 4, 4, w - 8, h - 8, p.paper); // 종이
  c.hline(5, 4, w - 10, p.paperLight);
  return c.toTexture(scene, key);
}

interface ButtonColors {
  outline: string;
  fill: string;
  light: string;
  shadow: string;
}

function buttonColors(variant: ButtonVariant, state: ButtonState): ButtonColors {
  const base =
    variant === 'primary'
      ? { fill: RAMPS.R1[3], light: RAMPS.R1[4], shadow: RAMPS.R1[1] }
      : { fill: SPECIAL.CREAM, light: SPECIAL.PAPER, shadow: RAMPS.R10[3] };
  if (state === 'disabled') {
    return { outline: RAMPS.R11[1], fill: RAMPS.R11[3], light: RAMPS.R11[4], shadow: RAMPS.R11[2] };
  }
  if (state === 'hover')
    return { outline: UI.ink, ...base, fill: base.light, light: SPECIAL.PAPER };
  return { outline: UI.ink, ...base };
}

export function buttonKey(
  variant: ButtonVariant,
  state: ButtonState,
  w: number,
  h: number,
): string {
  return `ui:btn:${variant}:${state}:${w}x${h}`;
}

/** 버튼 몸통이 서는 위치: 호버는 1px 들리고, 눌림은 1px 내려앉는다. */
export const BUTTON_BODY_TOP: Record<ButtonState, number> = {
  hover: 0,
  normal: 1,
  disabled: 1,
  pressed: 2,
};

/**
 * 버튼 배경. 텍스처 크기는 (w, h + 2).
 * 아래쪽 그림자 면은 고정이고, 몸통만 상태에 따라 위아래로 움직인다.
 * 눌림에서는 몸통이 그림자를 덮어 그림자가 사라진다.
 */
export function ensureButton(
  scene: Phaser.Scene,
  variant: ButtonVariant,
  state: ButtonState,
  w: number,
  h: number,
): string {
  const key = buttonKey(variant, state, w, h);
  if (scene.textures.exists(key)) return key;
  const col = buttonColors(variant, state);
  const c = new PixelCanvas(w, h + 2);
  if (state !== 'pressed') {
    roundedFill(c, 0, 2, w, h, col.outline);
    roundedFill(c, 1, 3, w - 2, h - 2, col.shadow);
  }
  const top = BUTTON_BODY_TOP[state];
  roundedFill(c, 0, top, w, h, col.outline);
  roundedFill(c, 1, top + 1, w - 2, h - 2, col.fill);
  c.hline(2, top + 1, w - 4, col.light);
  return c.toTexture(scene, key);
}
