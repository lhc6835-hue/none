// 성숙 · 개화 바디 플랜 2/3: 주머니 · 덫 · 덤불 · 기둥 · 열매 · 꽃

import { type BuildCtx, leavesAlong, put, sideLeaf, stemCurve } from './Ctx';
import { petalRing } from './adult1';

const r = Math.round;

export function drawPitcher(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const body = g.newPart();
  const rim = g.newPart();
  const lid = g.newPart();
  const stem = g.newPart();
  const rx = r(c.W * 0.28 * p.wide);
  const ry = r(c.H * 0.26 * p.tall);
  const cy = r(c.H * 0.6);
  g.rect(cx, cy + ry - 1, 1, base - cy - ry + 2, stem, 'S');
  put(c, p.leaf, cx + rx - 1, cy - ry + 1, 'bl', lid);
  sideLeaf(c, p.leafAlt, cx - rx, base - 1, -1, lid);
  g.ellipse(cx, cy, rx, ry, body, 'M');
  g.ellipse(cx, cy - ry + 1, rx, 1, rim, 'A');
  c.hosts.pitcher = body;
  if (c.isBloom) put(c, 'petal.long', cx - 3, cy - ry, 'bc', g.newPart());
}

export function drawTrap(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const jaws = g.newPart();
  const teeth = g.newPart();
  const stem = g.newPart();
  const rx = r(c.W * 0.22 * p.wide) + 1;
  const ry = r(c.H * 0.27 * p.tall);
  const cy = r(c.H * 0.45);
  g.rect(cx - 1, cy + ry - 1, 2, base - cy - ry + 2, stem, 'S');
  sideLeaf(c, p.leaf, cx + 1, base - 2, 1, stem);
  sideLeaf(c, p.leafAlt, cx - 1, base - 3, -1, stem);
  for (const dir of [-1, 1]) g.ellipse(cx + dir * (rx - 1), cy, rx, ry, jaws, 'M');
  // 가운데 이음매 한 줄을 비워 입(F11)이 되게 한다
  for (let y = 0; y < c.H; y++) g.erase(cx, y);
  for (let y = cy - ry + 2; y < cy + ry - 1; y += 3) {
    g.set(cx - 1, y, teeth, 'A');
    g.set(cx + 1, y + 1, teeth, 'A');
  }
  c.hosts.trap = jaws;
}

export function drawBush(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const mass = g.newPart();
  const cy = base - r(c.H * 0.2 * p.tall) - 1;
  const rx = r(c.W * 0.22 * p.wide);
  const ry = r(c.H * 0.15 * p.tall);
  // 덩어리 배치 6가지: [dx, dy, rx, ry]
  const layouts: [number, number, number, number][][] = [
    [
      [-rx, 1, rx, ry - 1],
      [rx, 1, rx, ry - 1],
      [0, 0, rx + 1, ry],
    ],
    [
      [0, 0, rx, ry + 2],
      [-rx + 1, 3, rx - 1, ry],
      [rx - 1, 3, rx - 1, ry],
    ],
    [
      [-rx + 1, -2, rx - 1, ry],
      [rx - 1, -2, rx - 1, ry],
      [0, 3, rx + 2, ry - 1],
    ],
    [
      [0, -ry, rx - 1, ry - 1],
      [0, 0, rx + 1, ry],
      [0, ry, rx + 3, ry - 1],
    ],
    [[0, 0, rx + 2, ry + 1]],
    [
      [-rx - 1, 2, rx - 1, ry - 1],
      [rx + 1, 2, rx - 1, ry - 1],
      [0, 1, rx, ry],
      [0, -ry + 1, rx - 2, ry - 1],
    ],
  ];
  sideLeaf(c, p.leaf, cx - rx - 2, base, -1, g.newPart());
  sideLeaf(c, p.leafAlt, cx + rx + 2, base, 1, g.newPart());
  for (const [dx, dy, lx, ly] of layouts[p.v0]) g.ellipse(cx + dx, cy + dy, lx, ly, mass, 'M');
  if (c.isBloom) for (const dx of [-rx, rx]) g.ellipse(cx + dx, cy - ry + 3, 3, 3, mass, 'M');
  c.hosts.mass = mass;
}

export function drawColumn(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const body = g.newPart();
  const ridge = g.newPart();
  const arm = g.newPart();
  const rx = r(c.W * 0.2 * p.wide) + 1;
  const top = r((c.H * 0.18) / p.tall) + 1;
  // 팔(개화 단계): 0 없음 · 1 양쪽 · 2 오른쪽만
  if (c.isBloom && p.v0 % 3 !== 0) {
    const ay = r(c.H * 0.55);
    g.rect(cx + rx, ay, 4, 3, arm, 'M');
    g.rect(cx + rx + 3, ay - 5, 3, 6, arm, 'M');
    if (p.v0 % 3 === 1) {
      g.rect(cx - rx - 3, ay + 2, 4, 3, arm, 'M');
      g.rect(cx - rx - 3, ay - 3, 3, 6, arm, 'M');
    }
  }
  g.rect(cx - rx, top + rx, rx * 2 + 1, base - top - rx + 1, body, 'M');
  g.ellipse(cx, top + rx, rx, rx, body, 'M');
  c.hosts.column = body;
  for (const dx of [0, -Math.floor(rx / 2), Math.floor(rx / 2)]) {
    g.line(cx + dx, top + rx + 3, cx + dx, base, ridge, 'S');
  }
  for (let y = top + rx + 3; y < base; y += 3) {
    g.set(cx - rx - 1, y, ridge, 'A');
    g.set(cx + rx + 1, y + 1, ridge, 'A');
  }
  if (c.isBloom) put(c, 'flower.p5s', cx, top + 1, 'bc', g.newPart());
}

export function drawPod(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const stem = g.newPart();
  const fruit = g.newPart();
  const calyx = g.newPart();
  let rx = r(c.W * 0.28 * p.wide);
  let ry = r(c.H * 0.2 * p.tall);
  const fx = cx + Math.max(-2, Math.min(2, p.lean));
  const fy = r(c.H * [0.5, 0.42, 0.56][p.v1]);
  // 열매 모양: 0 둥근 · 1 길쭉 · 2 납작 · 3 물방울 · 4 쌍둥이 · 5 콩
  if (p.v0 === 1) [rx, ry] = [Math.max(4, r(rx * 0.7)), r(ry * 1.5)];
  if (p.v0 === 2) [rx, ry] = [r(rx * 1.25), Math.max(3, r(ry * 0.7))];
  stemCurve(c, cx, base, fx, fy - ry + 1, -p.lean, 2, stem, 'S');
  leavesAlong(c, cx, base - 3, fy + 2, 2, p.leaf, stem);
  if (p.v0 === 3) {
    g.polygon(
      [
        [fx, fy - ry - 1],
        [fx + rx, fy + ry * 0.5],
        [fx + rx - 2, fy + ry],
        [fx - rx + 2, fy + ry],
        [fx - rx, fy + ry * 0.5],
      ],
      fruit,
      'M',
    );
  } else if (p.v0 === 4) {
    g.ellipse(fx - rx / 2, fy, r(rx * 0.7) + 1, ry, fruit, 'M');
    g.ellipse(fx + rx / 2, fy + 1, r(rx * 0.7) + 1, ry - 1, fruit, 'M');
  } else if (p.v0 === 5) {
    g.ellipse(fx - rx / 2, fy - 2, r(rx * 0.7) + 1, ry - 1, fruit, 'M');
    g.ellipse(fx + rx / 2, fy + 2, r(rx * 0.7) + 1, ry - 1, fruit, 'M');
  } else {
    g.ellipse(fx, fy, rx, ry, fruit, 'M');
  }
  c.hosts.fruit = fruit;
  put(c, 'leaf.roundS', fx, fy - ry + 1, 'bc', calyx);
  if (c.isBloom) {
    put(c, p.fruit, fx - rx - 2, fy - 1, 'tc', g.newPart());
    put(c, p.fruit, fx + rx + 2, fy, 'tc', g.newPart());
  }
}

// 꽃: v0 = 꽃잎 구성 6가지 [꽃잎 수, 꽃잎 모양, 반지름 가산]
const FLOWER_PETALS: [number, string, number][] = [
  [5, 'petal.round', 3],
  [6, 'petal.long', 4],
  [8, 'petal.round', 3],
  [4, 'petal.wide', 4],
  [3, 'petal.long', 4],
  [7, 'petal.pointed', 4],
];

export function drawFlower(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const stem = g.newPart();
  const petals = g.newPart();
  const center = g.newPart();
  const [count, petalId, extra] = FLOWER_PETALS[p.v0];
  const discR = (c.isBloom ? 5 : 4) - (p.v2 && p.v0 % 2 ? 1 : 0);
  // 꽃이 달린 높이 3가지
  const cy = r(c.H * [0.3, 0.4, 0.5][p.v1]);
  stemCurve(c, cx, base, cx + p.lean, cy + discR, p.lean, 2, stem, 'S');
  if (p.v2) {
    leavesAlong(c, cx, base - 2, cy + discR + 6, 2, p.leaf, stem);
  } else {
    sideLeaf(c, p.leaf, cx, base - 2, 1, stem);
    sideLeaf(c, p.leafAlt, cx, base - 5, -1, stem);
  }
  petalRing(c, cx + p.lean, cy, discR + extra, count, petalId, petals);
  g.ellipse(cx + p.lean, cy, discR, discR, center, 'A');
  c.hosts.center = center;
}
