// 아이콘 (02문서 4 · 8절): 단색 실루엣 + 1px 외곽선 + 2–3색. 12×12 칸에 가운데 정렬한다.
// 등급 표식(모양 × 개수)은 색각 이상을 배려해 색만으로 등급을 구분하지 않게 한다(03문서 2절).

import type { GradeMark } from '../data/grades';
import { CARE_ICONS, type IconDef } from './icons/careIcons';
import { RAMPS, SPECIAL } from './palette';
import { emptyColorGrid, type ColorGrid } from './Shading';

const DROP_ROWS = [
  '....o....',
  '...obo...',
  '..obbbo..',
  '..obWbo..',
  '.obWbbbo.',
  '.obbbbBo.',
  '.obbbBBo.',
  '..obBBo..',
  '...ooo...',
];

const BASE_ICONS: Record<string, IconDef> = {
  drop: { rows: DROP_ROWS, colors: { b: RAMPS.R4[3], B: RAMPS.R4[2], W: SPECIAL.PAPER } },
  dew: {
    rows: [
      '....o..W.',
      '...obo.WW',
      '..obbbo.W',
      '..obWbo..',
      '.obWbbbo.',
      '.obbbbBo.',
      '.obbbBBo.',
      '..obBBo..',
      '...ooo...',
    ],
    colors: { b: RAMPS.R3[3], B: RAMPS.R3[2], W: SPECIAL.PAPER },
  },
  leaf: {
    rows: [
      '......oooo',
      '....ooggho',
      '..ooggggGo',
      '.oggggGGGo',
      '.ogggGGGo.',
      '.oggGGGo..',
      '.ogGGoo...',
      'oogoo.....',
      'o.o.......',
    ],
    colors: { g: RAMPS.R1[3], G: RAMPS.R1[2], h: RAMPS.R1[4] },
  },
  heart: {
    rows: [
      '.oo...oo.',
      'orrooorro',
      'orhrrrrRo',
      'orrrrrrRo',
      '.orrrrRo.',
      '..orrRo..',
      '...oRo...',
      '....o....',
    ],
    colors: { r: RAMPS.R7[3], R: RAMPS.R7[2], h: RAMPS.R6[4] },
  },
  star: {
    rows: [
      '....o....',
      '...oyo...',
      '...oyo...',
      'ooooyoooo',
      'oyyyyyyyo',
      '.oyyhyyo.',
      '..oyyyo..',
      '..oyoyo..',
      '..oo.oo..',
    ],
    colors: { y: SPECIAL.STARGOLD, h: SPECIAL.PAPER },
  },
  coin: {
    rows: [
      '..ooooo..',
      '.oyhyyyo.',
      'oyyyyyyYo',
      'oyyygyyYo',
      'oyyggGyYo',
      'oyyyGyyYo',
      'oyyyyyyYo',
      '.oYyyyYo.',
      '..ooooo..',
    ],
    colors: { y: RAMPS.R9[3], Y: RAMPS.R9[2], h: RAMPS.R9[4], g: RAMPS.R1[3], G: RAMPS.R1[2] },
  },
  notes: {
    rows: [
      'ooooooooo',
      'oPPPPPPPo',
      'oPwwwwwPo',
      'oPwlllwPo',
      'oPwwwwwPo',
      'oPwlllwPo',
      'oPwwwwwPo',
      'oPPPPPPPo',
      'ooooooooo',
    ],
    colors: { P: RAMPS.R10[2], w: SPECIAL.PAPER, l: RAMPS.R4[2] },
  },
  bug: {
    rows: [
      '..o...o..',
      '...o.o...',
      '..ooooo..',
      '.orrkrro.',
      'orrkrkrro',
      '.orrkrro.',
      '..orrro..',
      '...ooo...',
    ],
    colors: { r: RAMPS.R7[3], k: SPECIAL.INK },
  },
  seed: {
    rows: [
      '...oo...',
      '..osho..',
      '.osssSo.',
      '.osssSo.',
      '.ossSSo.',
      '.osSSSo.',
      '..oSSo..',
      '...oo...',
    ],
    colors: { s: RAMPS.R10[3], S: RAMPS.R10[2], h: RAMPS.R10[4] },
  },
  lock: {
    rows: [
      '..oooo..',
      '.og..go.',
      '.og..go.',
      'oooooooo',
      'oyyyyyyo',
      'oyyKKyyo',
      'oyyyKyyo',
      'oyyyyyyo',
      'oooooooo',
    ],
    colors: { g: RAMPS.R11[3], y: RAMPS.R9[3], K: SPECIAL.INK },
  },
  check: {
    rows: ['......oo.', '.....ogGo', '.oo.ogGo.', 'oggoGgo..', '.oggGo...', '..ooo....'],
    colors: { g: RAMPS.R1[3], G: RAMPS.R1[2] },
  },
};

export const ICONS: Record<string, IconDef> = { ...BASE_ICONS, ...CARE_ICONS };

export const ICON_SIZE = 12;

export function generateIcon(name: string): ColorGrid {
  const def = ICONS[name];
  if (!def) throw new Error(`없는 아이콘: ${name}`);
  const g = emptyColorGrid(ICON_SIZE, ICON_SIZE);
  const w = Math.max(...def.rows.map((r) => r.length));
  const ox = Math.floor((ICON_SIZE - w) / 2);
  const oy = Math.floor((ICON_SIZE - def.rows.length) / 2);
  def.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const c = ch === 'o' ? SPECIAL.INK : def.colors[ch];
      if (c) {
        const i = (oy + y) * ICON_SIZE + ox + x;
        g.px[i] = c;
        g.outline[i] = ch === 'o';
      }
    });
  });
  return g;
}

const MARKS: Record<GradeMark, readonly string[]> = {
  SQUARE: ['.......', '.xxxxx.', '.xxxxx.', '.xxxxx.', '.xxxxx.', '.xxxxx.', '.......'],
  DROP: ['...x...', '..xxx..', '..xxx..', '.xxxxx.', '.xxxxx.', '.xxxxx.', '..xxx..'],
  SUN: ['x..x..x', '.x.x.x.', '..xxx..', 'xxxxxxx', '..xxx..', '.x.x.x.', 'x..x..x'],
  HALF_SUN: ['...x...', 'x..x..x', '.x.x.x.', '..xxx..', 'xxxxxxx', '.......', '.......'],
  MOON: ['..xxx..', '.xx....', 'xx.....', 'xx.....', 'xx.....', '.xx....', '..xxx..'],
  STAR: ['...x...', '...x...', '.xxxxx.', 'xxxxxxx', '.xxxxx.', '..x.x..', '.x...x.'],
  WAVE: ['.......', '.xx..xx', 'x..xx..', '.......', '.xx..xx', 'x..xx..', '.......'],
  RING_DOT: ['..xxx..', '.x...x.', 'x..x..x', 'x.xxx.x', 'x..x..x', '.x...x.', '..xxx..'],
};

export const MARK_SIZE = 7;

/** 등급 표식 한 개(7×7). 색은 등급색 · 글자색을 넘긴다. */
export function generateMark(mark: GradeMark, color: string): ColorGrid {
  const g = emptyColorGrid(MARK_SIZE, MARK_SIZE);
  MARKS[mark].forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === 'x') g.px[y * MARK_SIZE + x] = color;
    });
  });
  return g;
}
