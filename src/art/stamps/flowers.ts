// 꽃잎 4종 + 꽃 8종(꽃잎 3 · 4 · 5 · 6장, 작은 것 7×7 · 큰 것 11×11). 중심은 A(강조).
// 앵커: 꽃잎은 bc(아래 가운데), 꽃은 c(가운데)

import type { Stamp } from '../PixelGrid';

export const FLOWER_STAMPS: Record<string, Stamp> = {
  'petal.round': ['.M.', 'MMM', 'MMd'],
  'petal.long': ['.M.', 'MMM', 'MMM', 'MMd', '.d.'],
  'petal.pointed': ['.M.', '.M.', 'MMM', '.d.'],
  'petal.wide': ['.MMM.', 'MMMMM', 'MMMMd', '.MMd.'],

  'flower.p3s': ['..MMM..', '..MMM..', '...A...', '.MM.MM.', 'MMM.MMM', 'MMM.MMM', '.MM.MM.'],
  'flower.p4s': ['...M...', '..MMM..', '.M.A.M.', 'MMAAAMM', '.M.A.M.', '..MMM..', '...M...'],
  'flower.p5s': ['..MMM..', '.MMMMM.', 'MMMAMMM', '.MMAMM.', '.MM.MM.', '.M...M.', '.......'],
  'flower.p6s': ['.MM.MM.', 'MMMMMMM', 'MMMAMMM', 'MMAAAMM', 'MMMAMMM', 'MMMMMMM', '.MM.MM.'],

  'flower.p3': [
    '....MMM....',
    '...MMMMM...',
    '...MMMMM...',
    '....MMM....',
    '.....A.....',
    '..MMM.MMM..',
    '.MMMMM.MMMM',
    '.MMMMM.MMMM',
    '..MMM..MMM.',
    '...........',
    '...........',
  ],
  'flower.p4': [
    '....MMM....',
    '...MMMMM...',
    '...MMMMM...',
    '.MM..A..MM.',
    'MMMMAAAMMMM',
    'MMMMAAAMMMM',
    '.MM..A..MM.',
    '...MMMMM...',
    '...MMMMM...',
    '....MMM....',
    '...........',
  ],
  'flower.p5': [
    '...MMMMM...',
    '..MMMMMMM..',
    '.MMMMMMMMM.',
    'MMMMMAMMMMM',
    '.MMMAAAMMM.',
    '.MMMMAMMMM.',
    '..MMM.MMM..',
    '..MMM.MMM..',
    '...MM.MM...',
    '...........',
    '...........',
  ],
  'flower.p6': [
    '..MMM.MMM..',
    '.MMMMMMMMM.',
    'MMMMMMMMMMM',
    'MMMMAAAMMMM',
    'MMMAAAAAMMM',
    'MMMMAAAMMMM',
    'MMMMMMMMMMM',
    '.MMMMMMMMM.',
    '..MMM.MMM..',
    '...........',
    '...........',
  ],
};
