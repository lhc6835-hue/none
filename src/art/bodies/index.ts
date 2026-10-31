import type { BodyPlan } from '../../core/schema';
import { type BuildCtx } from './Ctx';
import { addAccents } from './accents';
import { drawBulb, drawCap, drawRosette, drawStalk, drawVine } from './adult1';
import { drawBush, drawColumn, drawFlower, drawPitcher, drawPod, drawTrap } from './adult2';
import { drawBonsai, drawCrystal, drawFrond, drawLily, drawWisp } from './adult3';
import { drawJuvenile, drawSprout } from './juvenile';

const ADULT: Record<BodyPlan, (c: BuildCtx) => void> = {
  BULB: drawBulb,
  STALK: drawStalk,
  ROSETTE: drawRosette,
  VINE: drawVine,
  CAP: drawCap,
  PITCHER: drawPitcher,
  TRAP: drawTrap,
  BUSH: drawBush,
  COLUMN: drawColumn,
  FLOWER: drawFlower,
  POD: drawPod,
  FROND: drawFrond,
  CRYSTAL: drawCrystal,
  WISP: drawWisp,
  BONSAI: drawBonsai,
  LILY: drawLily,
};

/** 단계에 맞는 모양을 그린다. 1: 발아 · 2–3: 아기 · 4–5: 바디 플랜 본 모습 */
export function drawBody(c: BuildCtx): void {
  const body = c.look.body;
  const host = c.look.face.host;
  if (c.stage === 1) drawSprout(c, host);
  else if (c.stage <= 3) drawJuvenile(c, body, host);
  else ADULT[body](c);
  addAccents(c);
  c.g.removeOrphans();
}
