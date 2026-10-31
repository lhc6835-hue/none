// 화분 20×12 (정원 전용) · 전투용 흙 둔덕 16×4 (02문서 4절)

import { PixelGrid, type Role } from './PixelGrid';
import { shade, type ColorGrid } from './Shading';
import { RAMPS, type Ramp } from './palette';
import type { RampSet } from './Ramps';

export type PotStyle = 'clay' | 'stone' | 'wood' | 'glass' | 'mossy';

const POTS: Record<PotStyle, { body: Ramp; band: Ramp }> = {
  clay: { body: RAMPS.R8, band: RAMPS.R7 },
  stone: { body: RAMPS.R11, band: RAMPS.R10 },
  wood: { body: RAMPS.R10, band: RAMPS.R8 },
  glass: { body: RAMPS.R3, band: RAMPS.R4 },
  mossy: { body: RAMPS.R11, band: RAMPS.R1 },
};

/** 화분 몸은 18×10 + 외곽선 = 20×12. 위쪽 테두리 · 몸통 · 아래 띠 · 흙(A). */
export function generatePot(style: PotStyle): ColorGrid {
  const g = new PixelGrid(20, 12, 1);
  const soil = g.newPart();
  const rim = g.newPart();
  const body = g.newPart();
  const band = g.newPart();
  const role = (r: Role) => r;
  // 몸통: 위가 넓고 아래가 좁은 사다리꼴
  for (let y = 0; y < 7; y++) {
    const inset = Math.floor(y / 3);
    g.rect(3 + inset, 5 + y, 14 - inset * 2, 1, body, role('M'));
  }
  g.rect(1, 2, 18, 3, rim, 'M'); // 위 테두리
  g.rect(2, 4, 16, 1, band, 'S'); // 테두리 아래 그림자 띠
  g.rect(4, 8, 12, 1, band, 'S'); // 몸통 장식 띠
  g.rect(2, 1, 16, 1, soil, 'A'); // 흙
  const ramps: RampSet = { M: POTS[style].body, S: POTS[style].band, A: RAMPS.R10, X: RAMPS.R10 };
  return shade(g, ramps);
}

/** 전투의 꺾꽂이 자리: 흙이 볼록한 둔덕(16×4) */
export function generateMound(): ColorGrid {
  const g = new PixelGrid(16, 4, 1);
  g.ellipse(7, 2, 7, 1, g.newPart(), 'M');
  return shade(g, { M: RAMPS.R10, S: RAMPS.R10, A: RAMPS.R10, X: RAMPS.R10 });
}
