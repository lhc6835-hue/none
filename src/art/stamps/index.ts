import type { Stamp } from '../PixelGrid';
import { FLOWER_STAMPS } from './flowers';
import { LEAF_STAMPS } from './leaves';
import {
  BULB_STAMPS,
  CAP_STAMPS,
  CRYSTAL_STAMPS,
  FRUIT_STAMPS,
  NODE_STAMPS,
  TENDRIL_STAMPS,
  THORN_STAMPS,
} from './nature';
import {
  BOLT_STAMPS,
  FLAME_STAMPS,
  ROOT_STAMPS,
  SEED_STAMPS,
  STAR_STAMPS,
  WISP_STAMPS,
} from './misc';

/** 모든 스탬프. id 는 '분류.이름'. */
export const STAMPS: Readonly<Record<string, Stamp>> = {
  ...LEAF_STAMPS,
  ...FLOWER_STAMPS,
  ...CAP_STAMPS,
  ...THORN_STAMPS,
  ...FRUIT_STAMPS,
  ...TENDRIL_STAMPS,
  ...CRYSTAL_STAMPS,
  ...BULB_STAMPS,
  ...NODE_STAMPS,
  ...FLAME_STAMPS,
  ...WISP_STAMPS,
  ...BOLT_STAMPS,
  ...STAR_STAMPS,
  ...ROOT_STAMPS,
  ...SEED_STAMPS,
};

export function stamp(id: string): Stamp {
  const s = STAMPS[id];
  if (!s) throw new Error(`없는 스탬프: ${id}`);
  return s;
}

export function stampsOf(prefix: string): string[] {
  return Object.keys(STAMPS).filter((k) => k.startsWith(prefix + '.'));
}
