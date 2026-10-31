// 불꽃 3 · 혼령 2 · 번개 2 · 별 2 · 뿌리 2 · 씨앗 10(계열별 8×8) (02문서 7절)

import type { Stamp } from '../PixelGrid';

export const FLAME_STAMPS: Record<string, Stamp> = {
  'flame.tongue': ['.A.', '.AM', 'AMM', 'AMM', 'MMM', '.M.'],
  'flame.big': [
    '...A....',
    '..AA..A.',
    '..AAA.AA',
    '.AAMAAAA',
    '.AMMMMAA',
    'AMMMMMMA',
    '.MMMMMM.',
    '..MMMM..',
  ],
  'flame.small': ['.A.', 'AMA', 'MMM', '.M.'],
};

export const WISP_STAMPS: Record<string, Stamp> = {
  'wisp.tail': ['.MM.', 'MMMM', '.MMM', '..MM', '.MM.', 'MM..', 'M...', '.M..'],
  'wisp.puff': ['.MMM.', 'MMMMM', 'MMMMM', '.M.M.'],
};

export const BOLT_STAMPS: Record<string, Stamp> = {
  'bolt.zig': ['..XX', '.XX.', 'XXX.', '.XXX', '..X.', '.X..', 'X...'],
  'bolt.small': ['.XX', 'XX.', '.X.', 'X..'],
};

export const STAR_STAMPS: Record<string, Stamp> = {
  'star.4': ['..L..', '..L..', 'LLXLL', '..L..', '..L..'],
  'star.small': ['.L.', 'LXL', '.L.'],
};

export const ROOT_STAMPS: Record<string, Stamp> = {
  'root.fork': ['S..S..S', '.S.S.S.', '..SSS..', '...S...'],
  'root.hang': ['..S..', '.SS..', '..SS.', '.SS..', 'S....'],
};

/** 씨앗 8×8: 계열별 모양 10종. 색은 SeedSpriteGen 이 등급에 따라 입힌다(M 몸 · S 그림자 · A 무늬). */
export const SEED_STAMPS: Record<string, Stamp> = {
  'seed.VINE': [
    '..SSS...',
    '.S...S..',
    '.S.MMS..',
    '..MMMM..',
    '.MMMMMM.',
    '.MMMMMd.',
    '..MMMd..',
    '...dd...',
  ],
  'seed.THORN': [
    '...A....',
    '..AMA...',
    '.AMMMA..',
    'AMMMMMA.',
    '.MMMMMd.',
    '.AMMMdA.',
    '..AMdA..',
    '...dd...',
  ],
  'seed.FUNGUS': [
    '..MMMM..',
    '.MMAMMM.',
    'MMMMMAMM',
    'MMMMMMMM',
    '.SSSSSS.',
    '..SMMS..',
    '..SMMS..',
    '...SS...',
  ],
  'seed.BLOOM': [
    '...MM...',
    '..MMMM..',
    '.MMMMMM.',
    '.MMAAMM.',
    '.MMAAMd.',
    '.MMMMMd.',
    '..MMMd..',
    '...dd...',
  ],
  'seed.FRUIT': [
    '...S....',
    '..MMM...',
    '.MMMMM..',
    '.MMMMMM.',
    '.MMMMMM.',
    '.MMMMMd.',
    '..MMMd..',
    '...dd...',
  ],
  'seed.EMBER': [
    '....A...',
    '...AM...',
    '..AMM...',
    '.MMMMM..',
    '.MMMMMM.',
    '.MMMMMd.',
    '..MMMd..',
    '...dd...',
  ],
  'seed.FROST': [
    '...MM...',
    '..MMMM..',
    '.MMLMMM.',
    'MMMMMMMd',
    '.MMMMMd.',
    '..MMMd..',
    '...Md...',
    '....d...',
  ],
  'seed.LUMEN': [
    '....L...',
    '...LML..',
    '..LMMML.',
    '.LMMXMML',
    '..LMMML.',
    '...LML..',
    '....L...',
    '........',
  ],
  'seed.STORM': [
    '..MM....',
    '..MMM...',
    '...MMM..',
    '..XMM...',
    '..MMX...',
    '...MMM..',
    '...MMd..',
    '....d...',
  ],
  'seed.SPIRIT': [
    '..MMM...',
    '.MMMMM..',
    '.MMLMMM.',
    '.MMMMMM.',
    '..MMMMd.',
    '..MMMd..',
    '...MM...',
    '....M...',
  ],
};
