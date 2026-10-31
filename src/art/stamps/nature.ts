// 버섯 갓 4 · 가시 4 · 열매 8 · 덩굴손 4 · 결정 4 · 구근 4 · 마디 1 (02문서 7절)
// 앵커: 갓 · 구근 · 결정은 bc, 열매는 tc(위 가운데, 매달림), 덩굴손은 bl

import type { Stamp } from '../PixelGrid';

export const CAP_STAMPS: Record<string, Stamp> = {
  'cap.dome': [
    '...MMMMM...',
    '.MMMMMMMMM.',
    'MMMAMMMMAMM',
    'MMMMMMMMMMM',
    'MMMMMMMMMMM',
    '.SSSSSSSSS.',
  ],
  'cap.flat': ['.MMMMMMMMM.', 'MMAMMMMMAMM', 'MMMMMMMMMMM', '.SSSSSSSSS.'],
  'cap.bell': [
    '..MMMMM..',
    '.MMMMMMM.',
    'MMAMMMAMM',
    'MMMMMMMMM',
    'MMMMMMMMM',
    'MMMMMMMMM',
    '.SSSSSSS.',
  ],
  'cap.cone': ['....M....', '...MMM...', '..MMAMM..', '.MMMMMMM.', 'MMMMMMMMM', '.SSSSSSS.'],
};

export const THORN_STAMPS: Record<string, Stamp> = {
  'thorn.up': ['.A.', '.A.', 'AAA'],
  'thorn.side': ['A..', 'AAA', 'A..'],
  'thorn.long': ['A.', 'A.', 'AA', 'AA', 'AA'],
  'thorn.cluster': ['A.A', 'AAA', 'AAA'],
};

export const FRUIT_STAMPS: Record<string, Stamp> = {
  'fruit.round': ['.SS..', 'MMMMM', 'MMMMM', 'MMMMd', '.MMd.'],
  'fruit.drop': ['..S..', '.MMM.', '.MMM.', 'MMMMM', 'MMMMd', '.MMd.'],
  'fruit.berry': ['.M.', 'MMM', '.d.'],
  'fruit.bean': ['.M.', 'MMM', 'MMM', 'MMM', 'MMd', '.d.'],
  'fruit.pumpkin': ['...S...', '.MM.MM.', 'MMMSMMM', 'MMMSMMM', 'MMMSMMd', '.MMSMd.'],
  'fruit.spiky': ['.A.M.A.', 'AMMMMMA', '.MMMMM.', 'AMMMMMA', '.MMMMd.', 'AMMMMdA', '..A.A..'],
  'fruit.husk': ['..SS..', '.MMMM.', 'MMAAMM', 'MMAAMM', 'MMMMMd', '.MMMd.'],
  'fruit.pomegranate': ['.A.A.A', 'MMMMMM', 'MMMMMM', 'MMMMMM', 'MMMMMd', '.MMMd.'],
};

export const TENDRIL_STAMPS: Record<string, Stamp> = {
  'tendril.curl': ['.SS.', 'S..S', 'S.S.', 'S...', '.S..'],
  'tendril.zig': ['S..', 'SS.', '.SS', 'SS.', 'S..', 'SS.'],
  'tendril.hook': ['.SSS.', 'S...S', 'S....', 'S....', '.S...'],
  'tendril.loop': ['.SSS.', 'S...S', 'S...S', '.SSS.', '..S..'],
};

export const CRYSTAL_STAMPS: Record<string, Stamp> = {
  'crystal.shard': ['.MM.', '.MM.', 'MMMM', 'MMMM', 'MMMd', 'MMdd', 'MMdd', 'MMdd'],
  'crystal.cluster': [
    '...M.....',
    '..MMM.M..',
    '..MMM.MM.',
    '.MMMMMMM.',
    'MMMMMMMMd',
    'MMMMMMMdd',
    'MMMMMMdd.',
    'dddddddd.',
  ],
  'crystal.flake': ['..L..', '.LML.', 'LMMML', '.LML.', '..L..'],
  'crystal.small': ['.M.', 'MMM', 'MMd', '.d.'],
};

export const BULB_STAMPS: Record<string, Stamp> = {
  'bulb.round': [
    '...MMMMM...',
    '.MMMMMMMMM.',
    'MMMMMMMMMMM',
    'MMMMMMMMMMM',
    'MMMMMMMMMMd',
    'MMMMMMMMMdd',
    '.MMMMMMMdd.',
    '...ddddd...',
  ],
  'bulb.onion': [
    '....M....',
    '....M....',
    '...MMM...',
    '..MMMMM..',
    '.MMMMMMM.',
    'MMMMMMMMM',
    'MMMMMMMMd',
    '.MMMMMdd.',
    '..dddddd.',
  ],
  'bulb.squat': [
    '..MMMMMMMM..',
    '.MMMMMMMMMM.',
    'MMMMMMMMMMMM',
    'MMMMMMMMMMMd',
    '.MMMMMMMMdd.',
    '..dddddddd..',
  ],
  'bulb.drop': [
    '...MM...',
    '..MMMM..',
    '.MMMMMM.',
    'MMMMMMMM',
    'MMMMMMMM',
    'MMMMMMMd',
    '.MMMMMd.',
    '..dddd..',
  ],
};

export const NODE_STAMPS: Record<string, Stamp> = {
  'stem.node': ['SSS', 'MMM'],
};
