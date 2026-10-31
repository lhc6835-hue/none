// 발아 · 새싹 · 어린잎(단계 1–3): 모든 바디 플랜이 같은 '아기 모습' 틀을 쓰되 머리 모양과 줄기 길이가 조금씩 다르다.
// 아기는 큰 머리가 귀엽다 — 새싹(12×14)에서도 얼굴이 붙는 머리 폭이 8px 이상이 되게 한다(02문서 5-2).

import type { BodyPlan } from '../../core/schema';
import { type BuildCtx, put, sideLeaf } from './Ctx';

interface JuvenileConf {
  /** 머리 반지름 배율 · 줄기 길이(어린잎 기준 px) */
  rx: number;
  ry: number;
  stem: number;
  shape: 'ellipse' | 'cap' | 'wedge';
}

const CONF: Record<BodyPlan, JuvenileConf> = {
  BULB: { rx: 1.1, ry: 1.0, stem: 0, shape: 'ellipse' },
  STALK: { rx: 0.95, ry: 0.85, stem: 4, shape: 'ellipse' },
  ROSETTE: { rx: 1.1, ry: 0.8, stem: 0, shape: 'wedge' },
  VINE: { rx: 1.0, ry: 0.9, stem: 3, shape: 'ellipse' },
  CAP: { rx: 1.1, ry: 0.8, stem: 3, shape: 'cap' },
  PITCHER: { rx: 0.95, ry: 1.15, stem: 1, shape: 'ellipse' },
  TRAP: { rx: 1.05, ry: 0.9, stem: 1, shape: 'ellipse' },
  BUSH: { rx: 1.15, ry: 0.95, stem: 0, shape: 'ellipse' },
  COLUMN: { rx: 0.9, ry: 1.15, stem: 0, shape: 'ellipse' },
  FLOWER: { rx: 1.0, ry: 0.9, stem: 3, shape: 'ellipse' },
  POD: { rx: 1.05, ry: 1.0, stem: 2, shape: 'ellipse' },
  FROND: { rx: 0.9, ry: 0.9, stem: 3, shape: 'ellipse' },
  CRYSTAL: { rx: 0.95, ry: 1.15, stem: 0, shape: 'wedge' },
  WISP: { rx: 1.05, ry: 1.0, stem: 4, shape: 'ellipse' },
  BONSAI: { rx: 1.1, ry: 0.85, stem: 3, shape: 'ellipse' },
  LILY: { rx: 1.3, ry: 0.7, stem: 0, shape: 'ellipse' },
};

const SMALL_LEAF: Record<string, string> = {
  'leaf.round': 'leaf.roundS',
  'leaf.heart': 'leaf.roundS',
  'leaf.lobed': 'leaf.roundS',
  'leaf.pointed': 'leaf.pointedS',
  'leaf.fan': 'leaf.pointedS',
  'leaf.needle': 'leaf.needleS',
  'leaf.feather': 'leaf.needleS',
  'leaf.broad': 'leaf.broadS',
};

export const smallLeaf = (id: string): string => SMALL_LEAF[id] ?? id;

/** 발아(8×8): 줄기 한 가닥 + 작은 떡잎 두 장 + 둥근 싹눈 */
export function drawSprout(c: BuildCtx, hostName: string): void {
  const g = c.g;
  const stem = g.newPart();
  const bud = g.newPart();
  const leaf = g.newPart();
  // 잎 → 줄기 → 싹눈 순으로 그려 싹눈(얼굴이 붙는 곳)이 덮이지 않게 한다
  sideLeaf(c, 'leaf.pointedS', c.cx - 1, c.base - 3, 1, leaf);
  sideLeaf(c, 'leaf.pointedS', c.cx - 1, c.base - 3, -1, leaf);
  g.rect(c.cx - 1, c.base - 2, 1, 3, stem, 'S');
  g.ellipse(c.cx - 1, c.base - 3, 2, 2, bud, 'M');
  c.hosts[hostName] = bud;
}

/** 새싹(12×14) · 어린잎(16×20) */
export function drawJuvenile(c: BuildCtx, body: BodyPlan, hostName: string): void {
  const g = c.g;
  const conf = CONF[body];
  const older = c.stage === 3;
  const rx = Math.max(4, Math.round((older ? 5 : 4) * conf.rx * (0.92 + (c.p.wide - 0.86) * 0.3)));
  const ry = Math.max(3, Math.round((older ? 4 : 3) * conf.ry * (0.92 + (c.p.tall - 0.86) * 0.3)));
  const stemLen = Math.round(conf.stem * (older ? 1 : 0.5));
  const headCy = c.base - stemLen - ry;
  const stem = g.newPart();
  const head = g.newPart();
  const leaves = g.newPart();

  // 잎 → 줄기 → 머리 순으로 그려 머리(얼굴이 붙는 곳)가 잎에 덮이지 않게 한다
  const leaf = smallLeaf(c.p.leaf);
  const top = headCy - ry + 1;
  sideLeaf(c, leaf, c.cx, top, 1, leaves);
  sideLeaf(c, leaf, c.cx - 1, top + (c.p.skew > 0 ? 1 : 0), -1, leaves);
  if (older) put(c, smallLeaf(c.p.leafAlt), c.cx, top - 1, 'bc', leaves);
  if (stemLen > 0) g.rect(c.cx - 1, c.base - stemLen, 2, stemLen + 1, stem, 'S');
  if (conf.shape === 'cap') {
    g.ellipse(c.cx, headCy, rx, ry, head, 'M');
    for (let x = 0; x < c.W; x++) for (let y = headCy + 1; y <= headCy + ry; y++) g.erase(x, y);
    g.rect(c.cx - rx + 1, headCy + 1, rx * 2 - 1, 1, stem, 'S');
  } else if (conf.shape === 'wedge') {
    g.polygon(
      [
        [c.cx, headCy - ry],
        [c.cx + rx, headCy + ry * 0.4],
        [c.cx + rx - 1, c.base],
        [c.cx - rx + 1, c.base],
        [c.cx - rx, headCy + ry * 0.4],
      ],
      head,
      'M',
    );
  } else {
    g.ellipse(c.cx, headCy, rx, ry, head, 'M');
  }
  c.hosts[hostName] = head;
}
