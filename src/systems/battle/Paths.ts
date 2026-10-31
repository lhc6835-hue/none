// 맵 · 경로 (06 · 08문서). 맵 문자열 → 타일 종류, 입구마다 출구까지의 경로(타일 중심을 잇는 꺾은선).

export type TileKind = 'SOIL' | 'FERTILE' | 'SHADE' | 'WATER' | 'PATH' | 'ROCK' | 'ENTRY' | 'EXIT';

export const MAP_W = 26;
export const MAP_H = 12;

const CHAR: Record<string, TileKind> = {
  '.': 'SOIL',
  '*': 'FERTILE',
  '-': 'SHADE',
  '~': 'WATER',
  '=': 'PATH',
  '#': 'ROCK',
  S: 'ENTRY',
  X: 'EXIT',
};

export interface Route {
  /** 타일 중심 좌표 */
  pts: { x: number; y: number }[];
  /** 각 점까지의 누적 거리 */
  cum: number[];
  length: number;
}

export interface GameMap {
  tiles: TileKind[][];
  entries: { x: number; y: number }[];
  exit: { x: number; y: number };
  routes: Route[];
  /** 비행 적의 직선 경로(입구 → 출구) */
  airRoutes: Route[];
}

function makeRoute(pts: { x: number; y: number }[]): Route {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return { pts, cum, length: cum[cum.length - 1] };
}

export function parseMap(rows: string[]): GameMap {
  const tiles: TileKind[][] = rows.map((row, y) =>
    [...row].map((ch, x) => {
      const k = CHAR[ch];
      if (!k) throw new Error(`알 수 없는 맵 문자 '${ch}' (${x},${y})`);
      return k;
    }),
  );
  const entries: { x: number; y: number }[] = [];
  let exit = { x: 0, y: 0 };
  tiles.forEach((row, y) =>
    row.forEach((k, x) => {
      if (k === 'ENTRY') entries.push({ x, y });
      if (k === 'EXIT') exit = { x, y };
    }),
  );
  const walkable = (x: number, y: number) =>
    y >= 0 &&
    y < tiles.length &&
    x >= 0 &&
    x < tiles[0].length &&
    ['PATH', 'ENTRY', 'EXIT'].includes(tiles[y][x]);
  const routes = entries.map((e) => {
    // 너비 우선 탐색(최단 경로). 같은 길이면 오른쪽 · 아래 · 왼쪽 · 위 순서로 결정적이다
    const prev = new Map<string, string | null>();
    const key = (x: number, y: number) => `${x},${y}`;
    prev.set(key(e.x, e.y), null);
    const q = [e];
    while (q.length) {
      const c = q.shift()!;
      if (c.x === exit.x && c.y === exit.y) break;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ] as const) {
        const nx = c.x + dx;
        const ny = c.y + dy;
        if (walkable(nx, ny) && !prev.has(key(nx, ny))) {
          prev.set(key(nx, ny), key(c.x, c.y));
          q.push({ x: nx, y: ny });
        }
      }
    }
    const pts: { x: number; y: number }[] = [];
    let cur: string | null = key(exit.x, exit.y);
    if (!prev.has(cur)) throw new Error('입구에서 출구까지 길이 이어지지 않습니다');
    while (cur) {
      const [x, y] = cur.split(',').map(Number);
      pts.push({ x: x + 0.5, y: y + 0.5 });
      cur = prev.get(cur) ?? null;
    }
    return makeRoute(pts.reverse());
  });
  const airRoutes = entries.map((e) =>
    makeRoute([
      { x: e.x + 0.5, y: e.y + 0.5 },
      { x: exit.x + 0.5, y: exit.y + 0.5 },
    ]),
  );
  return { tiles, entries, exit, routes, airRoutes };
}

/** 경로 위 거리 s 에서의 좌표 */
export function posAt(route: Route, s: number): { x: number; y: number } {
  if (s <= 0) return { ...route.pts[0] };
  if (s >= route.length) return { ...route.pts[route.pts.length - 1] };
  let i = 1;
  while (i < route.cum.length - 1 && route.cum[i] < s) i++;
  const a = route.pts[i - 1];
  const b = route.pts[i];
  const t = (s - route.cum[i - 1]) / Math.max(1e-6, route.cum[i] - route.cum[i - 1]);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** 길 위의 한 점에서 가장 가까운 경로 거리 s (모든 경로 중에서) */
export function nearestOnRoute(route: Route, x: number, y: number): { s: number; d: number } {
  let best = { s: 0, d: Infinity };
  for (let i = 1; i < route.pts.length; i++) {
    const a = route.pts[i - 1];
    const b = route.pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    const d = Math.hypot(px - x, py - y);
    if (d < best.d) best = { s: route.cum[i - 1] + Math.sqrt(l2) * t, d };
  }
  return best;
}
