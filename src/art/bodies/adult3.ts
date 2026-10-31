// 성숙 · 개화 바디 플랜 3/3: 고사리 · 결정 · 혼령 · 분재 · 수련

import { type BuildCtx, put, sideLeaf, stemCurve } from './Ctx';
import { bloomId, petalRing } from './adult1';

const r = Math.round;

export function drawFrond(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const stem = g.newPart();
  const curl = g.newPart();
  const fronds = g.newPart();
  const rx = r(c.W * 0.18) + 1 + (p.v0 % 2);
  const cy = r(c.H * 0.3);
  // 잎 → 줄기 → 말린 새순(얼굴 호스트) 순으로 그려 머리가 잎에 덮이지 않게 한다
  for (let i = 0; i < (c.isBloom ? 3 : 2); i++) {
    const y = base - 2 - i * 5;
    sideLeaf(c, 'leaf.feather', cx + 1, y, 1, fronds);
    sideLeaf(c, 'leaf.feather', cx - 1, y - 2, -1, fronds);
  }
  stemCurve(c, cx, base, cx + p.lean, cy + rx, p.lean * 2, 2, stem, 'S');
  g.ellipse(cx + p.lean, cy, rx, rx, curl, 'M');
  g.ellipse(cx + p.lean + 1, cy + 1, 1, 1, curl, 'S');
  c.hosts.curl = curl;
}

export function drawCrystal(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const main = g.newPart();
  const sides = g.newPart();
  const rx = r(c.W * 0.2 * p.wide) + 1;
  const top = r(c.H * (0.08 + 0.05 * p.v0));
  const sh = r(c.H * (0.3 + 0.06 * (p.v0 % 3)));
  // 옆 결정(주 결정 뒤): 왼쪽 · 오른쪽
  g.polygon(
    [
      [cx - rx - 4, base - sh],
      [cx - rx - 1, base - sh + 3],
      [cx - rx - 1, base],
      [cx - rx - 6, base],
    ],
    sides,
    'S',
  );
  g.polygon(
    [
      [cx + rx + 4, base - sh + 3],
      [cx + rx + 6, base - sh + 6],
      [cx + rx + 6, base],
      [cx + rx + 1, base],
    ],
    sides,
    'S',
  );
  if (c.isBloom) put(c, p.crystal, cx + rx + 2, base - sh - 1, 'bc', g.newPart());
  g.polygon(
    [
      [cx, top],
      [cx + rx, top + rx * 1.4],
      [cx + rx, base],
      [cx - rx, base],
      [cx - rx, top + rx * 1.4],
    ],
    main,
    'M',
  );
  c.hosts.crystal = main;
}

export function drawWisp(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const body = g.newPart();
  const tail = g.newPart();
  const root = g.newPart();
  const rx = r(c.W * (0.28 + 0.04 * (p.v0 % 3)) * p.wide);
  const ry = r(c.H * 0.2 * p.tall);
  const cy = r(c.H * 0.34);
  g.line(cx, cy + ry + 6, cx + p.lean, base, root, 'S', 1);
  sideLeaf(c, 'leaf.roundS', cx + p.lean, base - 1, 1, root);
  sideLeaf(c, 'leaf.roundS', cx + p.lean, base - 2, -1, root);
  put(c, 'wisp.tail', cx, cy + ry, 'tc', tail);
  if (c.isBloom) put(c, 'wisp.puff', cx + rx, cy - ry, 'bc', g.newPart());
  g.ellipse(cx, cy, rx, ry, body, 'M');
  c.hosts.body = body;
}

export function drawBonsai(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const trunk = g.newPart();
  const crown = g.newPart();
  const roots = g.newPart();
  const lean = Math.max(-2, Math.min(2, p.lean));
  const hx = cx + lean;
  const cy = r(c.H * [0.3, 0.26, 0.3, 0.3, 0.28, 0.32][p.v0]);
  const rx = r(c.W * 0.38 * p.wide);
  const ry = r(c.H * 0.2 * p.tall);
  stemCurve(c, cx, base, hx, cy + ry - 2, [-3, 0, 3][p.v1], p.v2 ? 5 : 3, trunk, 'S');
  g.rect(cx - 4, base, 3, 1, roots, 'S');
  g.rect(cx + 2, base, 3, 1, roots, 'S');
  // 수관 배치 6가지: 0 둥근 · 1 납작 우산 · 2 두 덩이 · 3 뾰족 · 4 구름 · 5 늘어진
  switch (p.v0) {
    case 1:
      g.ellipse(hx, cy + 1, rx + 2, Math.max(3, ry - 3), crown, 'M');
      break;
    case 2:
      g.ellipse(hx - rx + 4, cy, rx - 4, ry, crown, 'M');
      g.ellipse(hx + rx - 4, cy + 1, rx - 4, ry - 1, crown, 'M');
      g.ellipse(hx, cy + 2, rx - 3, ry - 2, crown, 'M');
      break;
    case 3:
      g.polygon(
        [
          [hx, cy - ry - 3],
          [hx + rx - 2, cy + ry],
          [hx - rx + 2, cy + ry],
        ],
        crown,
        'M',
      );
      break;
    case 4:
      g.ellipse(hx - 4, cy + 2, 6, ry - 2, crown, 'M');
      g.ellipse(hx + 4, cy - 1, 6, ry - 1, crown, 'M');
      g.ellipse(hx, cy + 1, rx - 3, ry - 3, crown, 'M');
      break;
    case 5:
      g.ellipse(hx, cy, rx, ry - 1, crown, 'M');
      for (const dx of [-rx + 1, -rx / 2, rx / 2, rx - 1])
        g.line(hx + dx, cy + ry - 2, hx + dx, cy + ry + 3, crown, 'M', 1);
      break;
    default:
      g.ellipse(hx, cy, rx, ry, crown, 'M');
      g.ellipse(hx - rx + 3, cy + 3, 4, 3, crown, 'M');
      g.ellipse(hx + rx - 3, cy + 3, 4, 3, crown, 'M');
  }
  c.hosts.crown = crown;
  c.hosts.trunk = trunk;
  if (c.isBloom) petalRing(c, hx, cy, rx - 1, 4, 'petal.round', g.newPart());
}

export function drawLily(c: BuildCtx): void {
  const { g, cx, base, p } = c;
  const pad = g.newPart();
  const flower = g.newPart();
  const rx = r(c.W * (0.38 + 0.03 * (p.v0 % 3)) * p.wide);
  const lift = [8, 10, 7, 9, 11, 8][p.v0];
  g.ellipse(cx, base - 2, rx, 3, pad, 'M');
  // 수련잎의 갈라진 틈: 얼굴이 놓이는 가운데 줄을 피해 아래쪽 두 줄에 낸다
  for (let i = 0; i < 4; i++) g.erase(cx + rx - 2 - i, base - 1 + Math.floor(i / 2));
  put(c, bloomId(c), cx + (p.v1 - 1) * 2, base - lift, 'c', flower);
  c.hosts.pad = pad;
  c.hosts.flower = flower;
}
