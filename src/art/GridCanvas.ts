// ColorGrid → 캔버스 (DOM). 생성기는 순수 함수라 여기서만 그린다. strict 이면 팔레트 밖 색에서 예외를 던진다.

import { isPaletteColor } from './palette';
import type { ColorGrid } from './Shading';

export function strayColors(grid: ColorGrid): string[] {
  return [...new Set(grid.px.filter((c): c is string => c !== null && !isPaletteColor(c)))];
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: ColorGrid,
  ox = 0,
  oy = 0,
  strict = true,
): void {
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const c = grid.px[y * grid.w + x];
      if (!c) continue;
      if (strict && !isPaletteColor(c)) throw new Error(`팔레트 밖의 색입니다: ${c}`);
      ctx.fillStyle = c;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

export function gridToCanvas(grid: ColorGrid, strict = true): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = grid.w;
  canvas.height = grid.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D 캔버스를 만들 수 없습니다');
  drawGrid(ctx, grid, 0, 0, strict);
  return canvas;
}

/** 여러 격자를 가로로 이어 붙인 아틀라스 캔버스(같은 크기 전제) */
export function atlasCanvas(grids: readonly ColorGrid[]): HTMLCanvasElement {
  const { w, h } = grids[0];
  const canvas = document.createElement('canvas');
  canvas.width = w * grids.length;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D 캔버스를 만들 수 없습니다');
  grids.forEach((g, i) => drawGrid(ctx, g, i * w, 0));
  return canvas;
}
