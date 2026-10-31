// 돌봄 · 허브용 아이콘 (02문서 8절). 12×12 칸 안에 들어가는 작은 그림. 'o' 는 잉크 외곽선.

import { RAMPS, SPECIAL } from '../palette';

export interface IconDef {
  rows: readonly string[];
  colors: Record<string, string>;
}

const blue = { b: RAMPS.R4[3], B: RAMPS.R4[2], W: SPECIAL.PAPER };
const steel = { S: RAMPS.R11[3], s: RAMPS.R11[4], R: RAMPS.R7[3], k: SPECIAL.INK };
const wood = { y: RAMPS.R9[3], Y: RAMPS.R9[2], w: RAMPS.R10[3], W: SPECIAL.PAPER };
const pouch = (c: string, d: string) => ({ W: c, d, k: SPECIAL.INK });

const POUCH = [
  '..o..o..',
  '.oWooWo.',
  '.oWWWWo.',
  'oWWkWWWo',
  'oWkkkWWo',
  'oWWkWWWo',
  'oWWWWWWo',
  '.oooooo.',
];

export const CARE_ICONS: Record<string, IconDef> = {
  // ---- 도구 ----
  can: {
    rows: [
      '...ooooo..',
      '..o.....o.',
      'ooBBBBBBo.',
      'oWbbbbbbBo',
      '.obbbbbbBo',
      '.obbbbbBBo',
      '..oBBBBBo.',
      '...ooooo..',
    ],
    colors: blue,
  },
  spray: {
    rows: [
      '.ooo......',
      'oWWo.oo...',
      '.ooooBBo..',
      '..obbbBo..',
      '..obWbBo..',
      '..obbbBo..',
      '..obbbBo..',
      '...ooooo..',
    ],
    colors: blue,
  },
  ampoule: {
    rows: ['...oo...', '..oWWo..', '..ogGo..', '..ogGo..', '..ogGo..', '..ogGo..', '...oo...'],
    colors: { g: RAMPS.R1[3], G: RAMPS.R1[2], W: SPECIAL.PAPER },
  },
  bone: { rows: POUCH, colors: pouch(SPECIAL.PAPER, RAMPS.R11[3]) },
  compost: { rows: POUCH, colors: pouch(RAMPS.R10[3], RAMPS.R10[2]) },
  brush: {
    rows: [
      '......oo.',
      '.....oBBo',
      '....oBBo.',
      '...oBBo..',
      '.ooBBo...',
      'oyyoo....',
      'oyyyo....',
      '.ooo.....',
    ],
    colors: { B: RAMPS.R10[2], y: RAMPS.R9[3] },
  },
  tweezers: {
    rows: ['...oo...', '..oSSo..', '..oSSo..', '.oS..So.', '.oS..So.', 'oS....So', 'oo....oo'],
    colors: steel,
  },
  scissors: {
    rows: ['oo....oo', 'oRo..oRo', '.oSooSo.', '..oSSo..', '.oSooSo.', 'oSo..oSo', 'ooo..ooo'],
    colors: steel,
  },
  hand: {
    rows: [
      '...oo.....',
      '..osso.oo.',
      '.ossoosso.',
      '.osssssso.',
      '.osssssso.',
      '..ossssso.',
      '...osssso.',
      '....oooo..',
    ],
    colors: { s: RAMPS.R8[4] },
  },
  speech: {
    rows: [
      '.oooooooo.',
      'oWWWWWWWWo',
      'oWkWkWkWWo',
      'oWWWWWWWWo',
      '.ooWoooooo',
      '...oWo....',
      '....o.....',
    ],
    colors: { W: SPECIAL.PAPER, k: SPECIAL.INK },
  },
  snack: {
    rows: [
      '..oooooo..',
      '.oyyyyyyo.',
      'oyYyyYyyYo',
      'oyyyYyyyyo',
      'oyYyyyyYyo',
      '.oyyyyyyo.',
      '..oooooo..',
    ],
    colors: wood,
  },
  pot: {
    rows: ['.oooooooo.', 'oRRRRRRRRo', '.oRrrrrRo.', '.oRrrrrRo.', '..oRrrRo..', '..oooooo..'],
    colors: { R: RAMPS.R8[2], r: RAMPS.R8[1] },
  },
  stake: {
    rows: [
      '...oo...',
      '..oyyo..',
      '..oyyo..',
      '..oyYo..',
      '..oyYo..',
      '..oyYo..',
      '...oYo..',
      '...oo...',
    ],
    colors: wood,
  },

  // ---- 상태 말풍선 ----
  mold: {
    rows: ['..oo.oo..', '.oGGoGGo.', 'oGgGGgGGo', 'oGGgGGgGo', '.oGGGGGo.', '..ooooo..'],
    colors: { G: RAMPS.R2[2], g: RAMPS.R3[2] },
  },
  zzz: {
    rows: ['cccccc', '....c.', '...c..', '..c...', '.c....', 'cccccc'],
    colors: { c: RAMPS.R4[4] },
  },
  roots: {
    rows: ['.ooooooo.', 'oRRRRRRRo', '.oRRRRRo.', '..ooooo..', '.s.s.s.s.', '..s...s..'],
    colors: { R: RAMPS.R8[2], s: RAMPS.R10[4] },
  },
  wither: {
    rows: ['.....oo.', '...ooLo.', '..oLLLo.', '.oLlLLo.', 'oLLlLo..', 'oLLoo...', '.oo.....'],
    colors: { L: RAMPS.R10[3], l: RAMPS.R10[2] },
  },
  sick: {
    rows: ['...oo...', '...oRo..', '.oooRooo', 'oRRRRRRo', '.oooRooo', '...oRo..', '...oo...'],
    colors: { R: RAMPS.R7[3] },
  },
  sulk: {
    rows: [
      '..oooo....',
      '.oWWWWoo..',
      'oWWWWWWWo.',
      'oWWWWWWWWo',
      '.ooooooooo',
      '..b..b..b.',
      '.b..b..b..',
    ],
    colors: { W: RAMPS.R11[4], b: RAMPS.R4[3] },
  },

  // ---- 허브 · 메뉴 ----
  bag: {
    rows: [
      '..oooo..',
      '.o....o.',
      'oooooooo',
      'oBBBBBBo',
      'oBbyybBo',
      'oBbbbbBo',
      'oBBBBBBo',
      'oooooooo',
    ],
    colors: { B: RAMPS.R10[2], b: RAMPS.R10[3], y: RAMPS.R9[3] },
  },
  book: {
    rows: [
      '.ooooooo.',
      'oRRRRRRRo',
      'oRWWWWWRo',
      'oRWkkkWRo',
      'oRWWWWWRo',
      'oRRRRRRRo',
      '.ooooooo.',
    ],
    colors: { R: RAMPS.R7[2], W: SPECIAL.PAPER, k: SPECIAL.INK },
  },
  door: {
    rows: [
      '.oooooo.',
      'oBBBBBBo',
      'oBbbbbBo',
      'oBbbbbBo',
      'oBbbyyBo',
      'oBbbbbBo',
      'oBbbbbBo',
      'oooooooo',
    ],
    colors: { B: RAMPS.R10[2], b: RAMPS.R10[3], y: RAMPS.R9[3] },
  },
  record: {
    rows: [
      '..oooooo..',
      '.okkkkkko.',
      'okkkRRkkko',
      'okkRWWRkko',
      'okkkRRkkko',
      '.okkkkkko.',
      '..oooooo..',
    ],
    colors: { k: RAMPS.R11[1], R: RAMPS.R7[3], W: SPECIAL.PAPER },
  },
  sun: {
    rows: ['y..y..y', '.y.y.y.', '..yyy..', 'yyyyyyy', '..yyy..', '.y.y.y.', 'y..y..y'],
    colors: { y: RAMPS.R9[3] },
  },
  flame: {
    rows: ['...o....', '..oro...', '.orRro..', 'orRyyRo.', 'orRyyRo.', '.orRRro.', '..oooo..'],
    colors: { r: RAMPS.R7[3], R: RAMPS.R8[3], y: RAMPS.R9[4] },
  },
  fan: {
    rows: ['..oooo..', '.oBooBo.', 'oBBoBBBo', 'ooooWooo', 'oBBBoBBo', '.oBooBo.', '..oooo..'],
    colors: { B: RAMPS.R4[3], W: SPECIAL.PAPER },
  },
  blind: {
    rows: ['oooooooo', 'oYYYYYYo', 'oooooooo', 'oYYYYYYo', 'oooooooo', 'oYYYYYYo', 'oooooooo'],
    colors: { Y: RAMPS.R9[4] },
  },
  arrowL: {
    rows: ['.....oo', '...ooWo', '.ooWWWo', 'oWWWWWo', '.ooWWWo', '...ooWo', '.....oo'],
    colors: { W: SPECIAL.PAPER },
  },
  arrowR: {
    rows: ['oo.....', 'oWoo...', 'oWWWoo.', 'oWWWWWo', 'oWWWoo.', 'oWoo...', 'oo.....'],
    colors: { W: SPECIAL.PAPER },
  },
  gear: {
    rows: ['..o.o..', '.ooSoo.', 'ooSoSoo', '.SoWoS.', 'ooSoSoo', '.ooSoo.', '..o.o..'],
    colors: { S: RAMPS.R11[3], W: SPECIAL.PAPER },
  },
  moon: {
    rows: ['.oooo.', 'oyyo..', 'oyo...', 'oyo...', 'oyyo..', '.oyyoo', '..oooo'],
    colors: { y: RAMPS.R9[4] },
  },
  // 정원 허브의 돌보기 되돌아가기 등에 쓰는 작은 하트 · 별은 기존 heart · star 를 쓴다
};
