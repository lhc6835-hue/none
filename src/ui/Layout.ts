// 화면 맞춤 (12문서 2절)
//  - 정수 배율 k 를 정하고 캔버스를 기기 픽셀 정수 좌표에 놓는다(반 픽셀 어긋남이 번짐을 만든다).
//  - 모든 씬은 가운데 640×360 안전 영역 기준으로 UI 를 놓는다. 씬 카메라를 -safeX 만큼 밀어
//    월드 좌표 (0,0)~(640,360) 이 안전 영역이 되게 하고, 배경만 좌우 80px 씩 더 그린다.
//  - 남는 테두리는 현재 장면의 배경색(setBackdrop)으로 칠한다.

import type Phaser from 'phaser';
import { computeScreen, SAFE_H, SAFE_W, MAX_W, type ScreenLayout } from '../core/Screen';

/** 배경을 안전 영역 밖으로 그려야 하는 만큼 (논리 폭 최대 800 → 좌우 80) */
export const BLEED = (MAX_W - SAFE_W) / 2;

let current: ScreenLayout | null = null;

export function currentLayout(): ScreenLayout {
  if (!current) throw new Error('fitCanvas 가 아직 불리지 않았습니다');
  return current;
}

/** 창 크기에 맞춰 논리 해상도 · 배율 · 캔버스 위치를 다시 계산한다. */
export function fitCanvas(game: Phaser.Game): ScreenLayout {
  const dpr = window.devicePixelRatio || 1;
  const layout = computeScreen(window.innerWidth, window.innerHeight, dpr);
  const first = current === null;
  current = layout;

  game.scale.setZoom(layout.cssPerPixel);
  if (first || game.scale.width !== layout.logicalW || game.scale.height !== layout.logicalH) {
    game.scale.resize(layout.logicalW, layout.logicalH);
  }

  const canvas = game.canvas;
  canvas.style.width = `${layout.cssW}px`;
  canvas.style.height = `${layout.cssH}px`;
  canvas.style.position = 'absolute';
  // 기기 픽셀 단위로 내림해서 정수 좌표에 놓는다
  canvas.style.left = `${Math.floor(((window.innerWidth - layout.cssW) / 2) * dpr) / dpr}px`;
  canvas.style.top = `${Math.floor(((window.innerHeight - layout.cssH) / 2) * dpr) / dpr}px`;
  game.scale.refresh();
  return layout;
}

/** 현재 장면의 배경색으로 캔버스 바깥 테두리를 칠한다. */
export function setBackdrop(hex: string): void {
  document.documentElement.style.backgroundColor = hex;
  document.body.style.backgroundColor = hex;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', hex);
}

/** 이 씬의 카메라를 안전 영역(640×360)에 맞춘다. 창 크기가 바뀌면 자동으로 다시 맞춘다. */
export function applySafeArea(scene: Phaser.Scene): void {
  const apply = () => {
    const left = Math.floor((scene.scale.width - SAFE_W) / 2);
    scene.cameras.main.setScroll(-left, 0);
  };
  apply();
  scene.scale.on('resize', apply);
  scene.events.once('shutdown', () => scene.scale.off('resize', apply));
}

/** 안전 영역 왼쪽 가장자리가 논리 화면에서 시작하는 x */
export function safeLeft(scene: Phaser.Scene): number {
  return Math.floor((scene.scale.width - SAFE_W) / 2);
}

export { SAFE_W, SAFE_H };
