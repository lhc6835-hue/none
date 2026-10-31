// 계열 장식 + 등급 장식. 몸통을 다 그린 뒤 덧붙인다.
//  - 계열 모티프(덩굴손 · 가시 · 얼룩 · 작은 꽃 · 열매 · 불꽃 · 결정 · 반짝이 · 번개 · 혼령)로 같은 계열이 닮는다.
//  - 등급이 오를수록 장식이 늘어난다: 노을 +1 · 달빛 반짝이 · 별빛 별 · 오로라 흐르는 결 · 태초 금빛 균열 (03문서 2절)

import type { BuildCtx } from './Ctx';
import { put } from './Ctx';

interface Pt {
  x: number;
  y: number;
}

/** 해당 행에서 가장 왼쪽/오른쪽으로 채워진 칸 */
function edge(c: BuildCtx, y: number, side: -1 | 1): number | null {
  const { g } = c;
  if (side < 0) {
    for (let x = 0; x < g.w; x++) if (g.filled(x, y)) return x;
  } else {
    for (let x = g.w - 1; x >= 0; x--) if (g.filled(x, y)) return x;
  }
  return null;
}

function accessoryPoints(c: BuildCtx, count: number): Pt[] {
  const b = c.g.bounds();
  if (!b) return [];
  const pts: Pt[] = [];
  const order = c.rng.shuffle([0, 1, 2]);
  for (let i = 0; i < count; i++) {
    const slot = order[i % 3];
    const y = b.y + Math.round(b.h * (0.35 + 0.2 * c.rng.next()));
    if (slot === 0) pts.push({ x: edge(c, y, -1) ?? b.x, y });
    else if (slot === 1) pts.push({ x: edge(c, y, 1) ?? b.x + b.w - 1, y });
    else pts.push({ x: c.cx + c.p.lean, y: b.y });
  }
  return pts;
}

function place(c: BuildCtx, pt: Pt, k: number): void {
  const { g, p } = c;
  const part = g.newPart();
  const left = pt.x < c.cx;
  switch (p.accessory) {
    case 'tendril':
      put(c, p.tendril, pt.x, pt.y + 1, left ? 'br' : 'bl', part, { flipX: left });
      break;
    case 'thorn':
      for (const dy of [-3, 0, 3]) {
        const xl = edge(c, pt.y + dy, -1);
        const xr = edge(c, pt.y + dy, 1);
        if (k % 2 === 0 && xl !== null)
          put(c, 'thorn.side', xl - 1, pt.y + dy, 'cr', part, { flipX: true });
        if (k % 2 === 1 && xr !== null) put(c, 'thorn.side', xr + 1, pt.y + dy, 'cl', part);
      }
      break;
    case 'spots': {
      const target = g.get(pt.x + (left ? 2 : -2), pt.y);
      if (target) {
        g.set(pt.x + (left ? 2 : -2), pt.y, target.part, 'A');
        g.set(pt.x + (left ? 3 : -3), pt.y, target.part, 'A');
      }
      break;
    }
    case 'blossom':
      put(c, c.isBloom ? 'flower.p4s' : 'petal.round', pt.x, pt.y, 'bc', part);
      break;
    case 'berry':
      put(c, 'fruit.berry', pt.x + (left ? -1 : 1), pt.y, 'tc', part);
      break;
    case 'flame':
      put(c, 'flame.small', pt.x, pt.y, 'bc', part);
      break;
    case 'crystal':
      put(c, 'crystal.small', pt.x, pt.y, 'bc', part);
      break;
    case 'sparkle':
      put(c, 'star.small', pt.x + (left ? -2 : 2), pt.y - 1, 'c', part);
      break;
    case 'bolt':
      put(c, 'bolt.small', pt.x + (left ? -1 : 1), pt.y, 'c', part);
      break;
    case 'wisp':
      put(c, 'wisp.puff', pt.x + (left ? -2 : 2), pt.y, 'c', part);
      break;
  }
}

/** 몸 밖 빈칸에 발광 점(1px)을 흩뿌린다 */
function glowDots(c: BuildCtx, n: number): void {
  const b = c.g.bounds();
  if (!b) return;
  for (let tries = 0; tries < n * 8 && n > 0; tries++) {
    const x = c.rng.int(b.x - 2, b.x + b.w + 1);
    const y = c.rng.int(Math.max(1, b.y - 3), b.y + Math.floor(b.h * 0.6));
    let near = false;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) if (c.g.filled(x + dx, y + dy)) near = true;
    if (!c.g.filled(x, y) && near) {
      c.g.set(x, y, c.g.newPart(), 'X', 'L');
      n--;
    }
  }
}

/** 가장 큰 부위(주 몸통)의 칸 목록 */
function mainCells(c: BuildCtx): number[] {
  const count = new Map<number, number[]>();
  c.g.cells.forEach((cell, i) => {
    if (cell) count.set(cell.part, [...(count.get(cell.part) ?? []), i]);
  });
  let best: number[] = [];
  for (const cells of count.values()) if (cells.length > best.length) best = cells;
  return best;
}

export function addAccents(c: BuildCtx): void {
  if (c.stage < 3) return; // 아기 단계는 장식 없이 깔끔하게
  const { p, g } = c;
  const n = Math.min(3, 1 + (p.rank >= 3 ? 1 : 0) + (c.isBloom ? 1 : 0));
  accessoryPoints(c, n).forEach((pt, k) => place(c, pt, k));

  if (c.stage < 4) return;
  if (p.rank >= 4) glowDots(c, 2 + p.rank - 4);
  if (p.rank >= 5) {
    const b = g.bounds();
    if (b) {
      put(c, 'star.small', b.x + 2, b.y + 1, 'c', g.newPart());
      if (p.rank >= 6) put(c, 'star.small', b.x + b.w - 3, b.y + 3, 'c', g.newPart());
    }
  }
  if (p.rank === 6) {
    // 오로라: 몸을 가로지르는 흐르는 결(X)
    for (const i of mainCells(c)) {
      const x = i % g.w;
      const y = Math.floor(i / g.w);
      const cell = g.cells[i];
      if (cell && (x + y * 2) % 7 === 0 && g.filled(x - 1, y) && g.filled(x + 1, y))
        cell.role = 'X';
    }
  }
  if (p.rank === 7) {
    // 태초: 위에서 아래로 지그재그로 흐르는 금빛 균열
    const cells = mainCells(c);
    const ys = cells.map((i) => Math.floor(i / g.w));
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    let x = c.cx + c.rng.int(-2, 2);
    for (let y = y0 + 1; y < y1; y++) {
      const cell = g.get(x, y);
      if (cell) cell.role = 'X';
      x += c.rng.pick([-1, 0, 0, 1]);
    }
  }
}
