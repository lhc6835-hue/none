// 종 ID 를 시드로 한 결정적 외형 파라미터. 같은 종은 언제나 같은 모양이다(02문서 7절 4).
// 계열마다 공통 모티프(잎 모양 · 장식)가 있어 같은 계열끼리 닮고, 시드가 종마다 세부를 갈라 구분되게 한다.

import type { FamilyId, GradeId } from '../core/schema';
import { Rng } from '../core/Rng';
import { PLANT_BASE } from '../data/plants';
import { stampsOf } from './stamps';

export type Accessory =
  | 'tendril' // 덩굴: 소용돌이 덩굴손
  | 'thorn' // 가시
  | 'spots' // 버섯: 얼룩 무늬
  | 'blossom' // 꽃: 작은 꽃
  | 'berry' // 열매
  | 'flame' // 불꽃
  | 'crystal' // 서리: 결정
  | 'sparkle' // 빛: 반짝이
  | 'bolt' // 폭풍: 번개
  | 'wisp'; // 영혼: 혼령 꼬리

export interface LookParams {
  leaf: string;
  leafAlt: string;
  petal: string;
  petals: number;
  cap: string;
  fruit: string;
  thorn: string;
  tendril: string;
  crystal: string;
  bulb: string;
  accessory: Accessory;
  /** 등급 순위 0–7. 높을수록 장식이 늘어난다(02문서 11절 "등급이 오를수록 부위 수와 장식이 늘어남") */
  rank: number;
  /** 키 · 폭 배율 */
  tall: number;
  wide: number;
  /** 줄기가 휘는 방향 -1 | 0 | 1 */
  lean: number;
  /** 잎 하나를 1px 어긋나게(귀여움) */
  skew: number;
  /** 잎 개수(한쪽) 2–4 */
  leafCount: number;
  /** 꽃 · 열매 장식 크기 */
  bigBloom: boolean;
  /**
   * 같은 바디 플랜 안에서 종마다 다른 '변형 번호'(0–5 · 0–2 · 0–1). 시드로 섞은 순번을 혼합 기수로 풀어서
   * 같은 바디 플랜의 종끼리 큰 윤곽(갓 모양 · 머리 모양 · 꽃잎 형태 · 수관 배치 …)이 겹치지 않게 한다.
   */
  v0: number;
  v1: number;
  v2: number;
}

/** 바디 플랜별로 종 ID 를 시드로 섞은 순서 */
const VARIANT_RANK: Map<string, number> = (() => {
  const byBody = new Map<string, string[]>();
  for (const sp of PLANT_BASE)
    byBody.set(sp.look.body, [...(byBody.get(sp.look.body) ?? []), sp.id]);
  const rank = new Map<string, number>();
  for (const [body, ids] of byBody)
    new Rng(`art:variant:${body}`).shuffle(ids).forEach((id, i) => rank.set(id, i));
  return rank;
})();

export const GRADE_RANK: Record<GradeId, number> = {
  SHADE: 0,
  DEW: 1,
  SUN: 2,
  DUSK: 3,
  MOON: 4,
  STAR: 5,
  AURORA: 6,
  ORIGIN: 7,
};

interface Motif {
  leaves: string[];
  accessory: Accessory;
}

const MOTIFS: Record<FamilyId, Motif> = {
  VINE: { leaves: ['leaf.heart', 'leaf.round', 'leaf.lobed'], accessory: 'tendril' },
  THORN: { leaves: ['leaf.needle', 'leaf.needleS', 'leaf.pointed'], accessory: 'thorn' },
  FUNGUS: { leaves: ['leaf.roundS', 'leaf.broadS', 'leaf.round'], accessory: 'spots' },
  BLOOM: { leaves: ['leaf.round', 'leaf.pointed', 'leaf.broad'], accessory: 'blossom' },
  FRUIT: { leaves: ['leaf.round', 'leaf.broad', 'leaf.heart'], accessory: 'berry' },
  EMBER: { leaves: ['leaf.pointed', 'leaf.lobed', 'leaf.fan'], accessory: 'flame' },
  FROST: { leaves: ['leaf.pointedS', 'leaf.needle', 'leaf.feather'], accessory: 'crystal' },
  LUMEN: { leaves: ['leaf.round', 'leaf.feather', 'leaf.fan'], accessory: 'sparkle' },
  STORM: { leaves: ['leaf.pointed', 'leaf.feather', 'leaf.lobed'], accessory: 'bolt' },
  SPIRIT: { leaves: ['leaf.feather', 'leaf.roundS', 'leaf.broadS'], accessory: 'wisp' },
};

export function lookParams(id: string, family: FamilyId, grade: GradeId): LookParams {
  const rng = new Rng(`art:${id}`);
  const motif = MOTIFS[family];
  const leaf = rng.pick(motif.leaves);
  let leafAlt = rng.pick(motif.leaves);
  if (leafAlt === leaf) leafAlt = rng.pick(stampsOf('leaf'));
  return {
    leaf,
    leafAlt,
    petal: rng.pick(stampsOf('petal')),
    petals: rng.int(3, 6),
    cap: rng.pick(stampsOf('cap')),
    fruit: rng.pick(stampsOf('fruit')),
    thorn: rng.pick(stampsOf('thorn')),
    tendril: rng.pick(stampsOf('tendril')),
    crystal: rng.pick(stampsOf('crystal')),
    bulb: rng.pick(stampsOf('bulb')),
    accessory: motif.accessory,
    rank: GRADE_RANK[grade],
    tall: rng.range(0.8, 1.2),
    wide: rng.range(0.8, 1.2),
    lean: rng.pick([-2, -1, 0, 0, 1, 2]),
    skew: rng.pick([-1, 1]),
    leafCount: rng.int(2, 4),
    bigBloom: rng.chance(0.5),
    v0: (VARIANT_RANK.get(id) ?? 0) % 6,
    v1: Math.floor((VARIANT_RANK.get(id) ?? 0) / 6) % 3,
    v2: Math.floor((VARIANT_RANK.get(id) ?? 0) / 18) % 2,
  };
}
