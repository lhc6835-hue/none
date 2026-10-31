// 성숙(22×28) · 개화(24×32) 바디 플랜 1/3: 구근 · 줄기 · 로제트 · 덩굴 · 버섯
// 길이는 W · H 에 대한 비율로 정해 두 단계에서 같은 모양이 자라게 한다. 개화(단계 5)에는 꽃 · 열매 같은 부위가 더해진다.
// p.v0 · v1 · v2 는 같은 바디 플랜 안에서 종마다 다른 변형 번호라 큰 윤곽(갓 · 머리 · 배치)을 결정한다.
// 그리기 순서 규칙: 얼굴 호스트는 가장 나중에 그려 다른 부위에 덮이지 않게 한다.

import { type BuildCtx, leavesAlong, put, sideLeaf, stemCurve } from './Ctx';

const r = Math.round;

export function bloomId(c: BuildCtx): string {
  const big = c.stage === 5 && c.p.bigBloom;
  return `flower.p${c.p.petals}${big ? '' : 's'}`;
}

/** 중심 둘레에 꽃잎을 빙 둘러 붙인다 */
export function petalRing(
  c: BuildCtx,
  x: number,
  y: number,
  radius: number,
  count: number,
  id: string,
  part: number,
): void {
  for (let k = 0; k < count; k++) {
    const a = (Math.PI * 2 * k) / count - Math.PI / 2;
    put(c, id, x + Math.cos(a) * radius, y + Math.sin(a) * radius * 0.92, 'c', part);
  }
}

// 구근: [가로 비율, 세로 비율] 6가지 (둥근 · 길쭉 · 납작 · 양파 · 중간 · 통통)
const BULB_SHAPES: [number, number][] = [
  [0.34, 0.2],
  [0.24, 0.28],
  [0.4, 0.14],
  [0.3, 0.22],
  [0.36, 0.17],
  [0.31, 0.25],
];

export function drawBulb(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const bulb = g.newPart();
  const stem = g.newPart();
  const leaves = g.newPart();
  const [fx, fy] = BULB_SHAPES[p.v0];
  const rx = r(c.W * fx * p.wide);
  const ry = r(c.H * fy * p.tall);
  const cy = base - ry;
  const top = cy - ry;
  const n = c.isBloom ? p.leafCount + 1 : p.leafCount;
  // 잎 배치: 0 부채꼴 · 1 위로 쭉 · 2 옆으로 늘어짐
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const id = i % 3 === 2 ? p.leafAlt : p.leaf;
    if (p.v1 === 0) {
      sideLeaf(
        c,
        id,
        cx + side * (1 + Math.floor(i / 2)),
        top + 2 - Math.floor(i / 2) * 2,
        side,
        leaves,
      );
    } else if (p.v1 === 1) {
      put(c, id, cx + (i - (n - 1) / 2) * 3, top + 2, 'bc', leaves);
    } else {
      sideLeaf(c, id, cx + side * (rx - 2), cy - 1 - (i >> 1) * 2, side, leaves);
    }
  }
  put(c, p.leafAlt, cx, top, 'bc', leaves);
  g.ellipse(cx, cy, rx, ry, bulb, 'M');
  if (p.v0 === 3) {
    g.polygon(
      [
        [cx, top - 4],
        [cx + 2, top + 1],
        [cx - 2, top + 1],
      ],
      bulb,
      'M',
    ); // 양파 꼭지
  }
  c.hosts.bulb = bulb;
  if (c.isBloom) {
    g.rect(cx, top - 6, 1, 7, stem, 'S');
    put(c, bloomId(c), cx, top - 8, 'c', g.newPart());
  }
}

export function drawStalk(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const stem = g.newPart();
  const head = g.newPart();
  const leaves = g.newPart();
  const topY = r(c.H * [0.4, 0.3, 0.16][p.v1]);
  let rx = r(c.W * 0.2 * p.wide) + 1;
  let ry = r(c.H * 0.1 * p.tall) + 1;
  if (p.v0 === 1) [rx, ry] = [Math.max(4, rx - 1), ry * 2]; // 길쭉한 봉오리
  if (p.v0 === 3) [rx, ry] = [4, r(ry * 2.3)]; // 이삭
  if (p.v0 === 4) [rx, ry] = [rx + 3, Math.max(3, ry - 1)]; // 납작한 원반
  const hx = cx + Math.max(-2, Math.min(2, p.lean));
  const hy = topY + ry;
  stemCurve(c, cx, base, hx, hy + ry - 1, p.lean, c.isBloom ? 2 : 1, stem, 'S');
  leavesAlong(c, cx, base - 3, hy + ry + 4, p.leafCount + (p.v2 ? 1 : 0), p.leaf, leaves);
  if (p.v0 === 2) {
    g.polygon(
      [
        [hx - rx + 2, hy - ry],
        [hx + rx - 2, hy - ry],
        [hx + rx, hy + ry],
        [hx - rx, hy + ry],
      ],
      head,
      'M',
    );
  } else if (p.v0 === 3) {
    g.polygon(
      [
        [hx, hy - ry],
        [hx + rx - 1, hy - ry * 0.2],
        [hx + rx - 1, hy + ry],
        [hx - rx + 1, hy + ry],
        [hx - rx + 1, hy - ry * 0.2],
      ],
      head,
      'M',
    );
  } else if (p.v0 === 5) {
    g.ellipse(hx - 3, hy + 1, 3, 3, head, 'M');
    g.ellipse(hx + 3, hy + 1, 3, 3, head, 'M');
    g.ellipse(hx, hy - 1, rx - 1, ry, head, 'M');
  } else {
    g.ellipse(hx, hy, rx, ry, head, 'M');
  }
  c.hosts.head = head;
  if (c.isBloom) petalRing(c, hx, hy, rx + 2, 6, 'petal.round', g.newPart());
}

export function drawRosette(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const back = g.newPart();
  const front = g.newPart();
  const center = g.newPart();
  const m = (c.isBloom ? 3 : 2) + (p.v0 % 2);
  const gap = r(c.W * (0.12 + 0.02 * (p.v0 % 3)));
  // 뒤쪽 잎 줄(더 높이 솟음) → 앞쪽 잎 줄 → 중심 원반 순서
  for (let k = -m + 1; k <= m - 1; k++) {
    put(
      c,
      k % 2 === 0 ? p.leafAlt : p.leaf,
      cx + k * gap,
      base - 7 - (m - Math.abs(k)),
      'bc',
      back,
    );
  }
  for (let k = -m; k <= m; k++) {
    const dist = Math.abs(k);
    const id = dist % 2 === 0 ? p.leaf : p.leafAlt;
    if (dist === m) sideLeaf(c, id, cx + Math.sign(k) * 2, base - 3, k > 0 ? 1 : -1, front);
    else put(c, id, cx + k * gap, base - 3 - (m - dist), 'bc', front);
  }
  g.ellipse(cx, base - 4, r(c.W * 0.22 * p.wide), r(c.H * 0.1) + 1, center, 'M');
  c.hosts.center = center;
}

export function drawVine(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const stake = g.newPart();
  const vine = g.newPart();
  const leaves = g.newPart();
  const big = g.newPart();
  const top = r(c.H * 0.12);
  // 지지대: 0 곧게 · 1 기울어진 · 2 갈래(Y)
  const lean = p.v1 === 1 ? 3 : 0;
  g.line(cx, base, cx + lean, top, stake, 'S', 1);
  if (p.v1 === 2) g.line(cx, base - 8, cx - 4, top + 3, stake, 'S', 1);
  const rows = base - top;
  for (let i = 0; i <= rows; i++) {
    g.rect(
      cx + r(lean * (i / rows) + Math.sin(i * (0.7 + p.v0 * 0.07)) * 2.6) - 1,
      base - i,
      2,
      1,
      vine,
      'M',
    );
  }
  for (let y = base - 4; y > top + 6; y -= 6) {
    sideLeaf(c, p.leaf, cx + (y % 12 === 0 ? 2 : -2), y, y % 12 === 0 ? 1 : -1, leaves);
  }
  // 큰 잎(얼굴 호스트): 6가지 자리
  const spots: [number, number][] = [
    [0.17, 0.16],
    [-0.17, 0.16],
    [0, 0.06],
    [0.17, 0.4],
    [-0.17, 0.4],
    [0, 0.26],
  ];
  const [fx, fy] = spots[p.v0];
  g.ellipse(cx + r(c.W * fx), top + r(c.H * fy), r(c.W * 0.2) + 1, r(c.H * 0.1) + 2, big, 'M');
  c.hosts.leaf = big;
  if (c.isBloom) put(c, 'petal.round', cx, top, 'bc', g.newPart());
}

export function drawCap(c: BuildCtx): void {
  const { g, cx, base, p, rng } = c;
  const stem = g.newPart();
  const cap = g.newPart();
  const gills = g.newPart();
  let rx = r(c.W * 0.42 * p.wide);
  let ry = r(c.H * 0.2 * p.tall) + 1;
  const cy = r(c.H * [0.5, 0.34, 0.42][p.v1]);
  if (p.v0 === 1) [rx, ry] = [rx + 1, Math.max(3, ry - 3)]; // 납작
  if (p.v0 === 3) [rx, ry] = [Math.max(5, rx - 4), ry + 3]; // 종 모양
  // 갓 → 갓 아랫면 정리 → 주름 → 줄기 순서. 줄기를 먼저 그리면 갓 타원이 줄기 윗부분을 덮어 구멍이 난다.
  if (p.v0 === 2) {
    g.polygon(
      [
        [cx, cy - ry - 2],
        [cx + rx, cy],
        [cx - rx, cy],
      ],
      cap,
      'M',
    );
  } else if (p.v0 === 4) {
    g.ellipse(cx, cy - 3, rx - 3, ry - 1, cap, 'M');
    g.ellipse(cx, cy, rx, 3, cap, 'M');
  } else if (p.v0 === 5) {
    g.ellipse(cx - rx + 4, cy, 4, ry - 1, cap, 'M');
    g.ellipse(cx + rx - 4, cy, 4, ry - 1, cap, 'M');
    g.ellipse(cx, cy - 1, rx - 2, ry, cap, 'M');
  } else {
    g.ellipse(cx, cy, rx, ry, cap, 'M');
  }
  for (let y = cy + 1; y <= cy + ry + 1; y++) {
    for (let x = 0; x < c.W; x++) if (g.get(x, y)?.part === cap) g.erase(x, y);
  }
  g.rect(cx - rx + 1, cy + 1, rx * 2 - 1, 1, gills, 'S');
  const thick = p.v1 === 0 ? 7 : p.v1 === 1 ? 3 : 5;
  const bend = p.v1 === 2 ? Math.max(-2, Math.min(2, p.lean)) : 0;
  g.rect(cx - Math.floor(thick / 2) + bend, cy + 2, thick, base - cy - 1, stem, 'S');
  g.rect(cx - Math.floor(thick / 2) - 1 + bend, base - 1, thick + 2, 2, stem, 'S');
  c.hosts.cap = cap;
  const spots = 3 + p.rank + (c.isBloom ? 2 : 0);
  for (let i = 0; i < spots; i++) {
    const sx = cx + rng.int(-rx + 3, rx - 3);
    const sy = rng.int(cy - ry + 2, cy - 1);
    if (g.get(sx, sy)?.part !== cap) continue;
    g.set(sx, sy, cap, 'A');
    g.set(sx + 1, sy, cap, 'A');
  }
}
