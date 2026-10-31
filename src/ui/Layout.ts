// 화면 맞춤 (12문서 2절)
//  - 정수 배율 k 를 정하고 캔버스를 기기 픽셀 정수 좌표에 놓는다(반 픽셀 어긋남이 번짐을 만든다).
//  - 모든 씬은 가운데 640×360 안전 영역 기준으로 UI 를 놓는다. 씬 카메라를 -safeX 만큼 밀어
//    월드 좌표 (0,0)~(640,360) 이 안전 영역이 되게 하고, 배경만 좌우 80px 씩 더 그린다.
//  - 남는 테두리는 현재 장면의 배경색(setBackdrop)으로 칠한다.

import type Phaser from 'phaser';
import {
  computeScreen,
  shouldRotate,
  SAFE_H,
  SAFE_W,
  MAX_W,
  type ScreenLayout,
} from '../core/Screen';

/** 배경을 안전 영역 밖으로 그려야 하는 만큼 (논리 폭 최대 800 → 좌우 80) */
export const BLEED = (MAX_W - SAFE_W) / 2;

let current: ScreenLayout | null = null;
let rotated = false;
let canvasLeft = 0;
let canvasTop = 0;

export function currentLayout(): ScreenLayout {
  if (!current) throw new Error('fitCanvas 가 아직 불리지 않았습니다');
  return current;
}

/** 손가락으로 쓰는 화면인가(마우스 없는 휴대폰 · 태블릿) */
export function isCoarsePointer(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/** 지금 화면을 90° 돌려서 쓰는가(세로로 든 터치 기기) */
export function isRotated(): boolean {
  return rotated;
}

/** 게임이 쓸 수 있는 영역. 세로로 든 터치 기기에서는 가로 · 세로를 바꿔서 가로 화면처럼 계산한다. */
export function viewSize(): { w: number; h: number; rotated: boolean; coarse: boolean } {
  const iw = window.innerWidth;
  const ih = window.innerHeight;
  const coarse = isCoarsePointer();
  const rot = shouldRotate(iw, ih, coarse);
  return rot ? { w: ih, h: iw, rotated: true, coarse } : { w: iw, h: ih, rotated: false, coarse };
}

/** 컨테이너(#game)를 바로 세우거나, 세로 화면이면 시계 방향으로 90° 눕힌다. */
function placeContainer(view: ReturnType<typeof viewSize>): void {
  const el = document.getElementById('game');
  if (!el) return;
  document.documentElement.dataset.rot = view.rotated ? '1' : '0';
  if (view.rotated) {
    // 가로 화면(w×h)을 세로 화면(h×w) 위에 눕힌다: 왼쪽 위 모서리를 축으로 90° 돌리고 오른쪽 끝에 붙인다
    Object.assign(el.style, {
      inset: 'auto',
      left: `${window.innerWidth}px`,
      top: '0px',
      width: `${view.w}px`,
      height: `${view.h}px`,
      transformOrigin: '0 0',
      transform: 'rotate(90deg)',
    });
  } else {
    for (const key of ['inset', 'left', 'top', 'width', 'height', 'transformOrigin', 'transform'])
      el.style.removeProperty(key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
  }
}

/** 창 크기에 맞춰 논리 해상도 · 배율 · 캔버스 위치를 다시 계산한다. */
export function fitCanvas(game: Phaser.Game): ScreenLayout {
  const dpr = window.devicePixelRatio || 1;
  const view = viewSize();
  const layout = computeScreen(view.w, view.h, dpr, view.coarse);
  const first = current === null;
  current = layout;
  rotated = view.rotated;
  placeContainer(view);

  game.scale.setZoom(layout.cssPerPixel);
  if (first || game.scale.width !== layout.logicalW || game.scale.height !== layout.logicalH) {
    game.scale.resize(layout.logicalW, layout.logicalH);
  }

  const canvas = game.canvas;
  canvas.style.width = `${layout.cssW}px`;
  canvas.style.height = `${layout.cssH}px`;
  canvas.style.position = 'absolute';
  // 기기 픽셀 단위로 내림해서 정수 좌표에 놓는다
  canvasLeft = Math.floor(((view.w - layout.cssW) / 2) * dpr) / dpr;
  canvasTop = Math.floor(((view.h - layout.cssH) / 2) * dpr) / dpr;
  canvas.style.left = `${canvasLeft}px`;
  canvas.style.top = `${canvasTop}px`;
  game.scale.refresh();
  return layout;
}

/**
 * 화면을 돌려 쓸 때 손가락 위치(페이지 좌표)를 게임 좌표로 바꾼다.
 * 돌린 컨테이너의 안쪽 좌표 (ex, ey) 는 페이지 좌표 (innerWidth − ey, ex) 로 보이므로 그 역변환을 쓴다.
 */
export function pageToGame(pageX: number, pageY: number): { x: number; y: number } {
  const L = currentLayout();
  const ex = rotated ? pageY : pageX;
  const ey = rotated ? window.innerWidth - pageX : pageY;
  return { x: (ex - canvasLeft) / L.cssPerPixel, y: (ey - canvasTop) / L.cssPerPixel };
}

/** 돌려 쓰는 동안 Phaser 의 입력 좌표 변환을 pageToGame 으로 바꾼다(마우스 · 터치 공통). */
export function installPointerTransform(game: Phaser.Game): void {
  const im = game.input as unknown as {
    transformPointer: (
      pointer: Phaser.Input.Pointer,
      pageX: number,
      pageY: number,
      wasMove: boolean,
    ) => void;
  };
  const original = im.transformPointer.bind(im);
  im.transformPointer = (pointer, pageX, pageY, wasMove) => {
    if (!rotated) {
      original(pointer, pageX, pageY, wasMove);
      return;
    }
    const p0 = pointer.position;
    const p1 = pointer.prevPosition;
    p1.x = p0.x;
    p1.y = p0.y;
    const g = pageToGame(pageX, pageY);
    const a = pointer.smoothFactor;
    if (!wasMove || a === 0) {
      p0.x = g.x;
      p0.y = g.y;
    } else {
      p0.x = g.x * a + p1.x * (1 - a);
      p0.y = g.y * a + p1.y * (1 - a);
    }
  };
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
