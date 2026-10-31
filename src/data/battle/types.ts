// 전투 데이터의 공통 타입 (06 · 07 · 08문서). 시간 단위는 데이터에서는 초, 시뮬레이션 안에서는 틱(1/60초).

export type DmgType = 'PHYS' | 'POISON' | 'FIRE' | 'COLD' | 'ELEC' | 'LIGHT' | 'SPIRIT';

export type ArchId =
  | 'SHOOT'
  | 'SNIPE'
  | 'LOB'
  | 'MELEE'
  | 'ZONE'
  | 'BEAM'
  | 'CHAIN'
  | 'AURA'
  | 'SUMMON'
  | 'PRODUCE'
  | 'TRAP'
  | 'WALL'
  | 'SPECIAL';

/** 적에게 거는 상태이상 (06문서 9-2) */
export type StatusKind =
  | 'SLOW' // 이동속도 −amt
  | 'BIND' // 속박
  | 'STUN' // 기절
  | 'CHILL' // 냉기 중첩 → 빙결
  | 'FREEZE' // 빙결
  | 'POISON' // 독 중첩
  | 'BURN' // 화상 중첩
  | 'WET' // 젖음
  | 'CHARM' // 뒷걸음(홀림 · 공포)
  | 'SLEEP' // 수면
  | 'SHRED' // 방어 감소
  | 'MARK' // 표식(받는 피해 +amt)
  | 'KNOCK' // 넉백(amt 타일 뒤로)
  | 'PULL'; // 끌어당김

export interface StatusSpec {
  k: StatusKind;
  /** 크기: 둔화 비율 · 표식 비율 · 방어 감소 수치 · 넉백 타일 수 */
  amt?: number;
  /** 지속(초) */
  dur?: number;
  /** 중첩 수(독 · 화상 · 냉기) */
  n?: number;
  /** 확률(0–1). 없으면 100% */
  p?: number;
  /** 보스에게 대신 적용할 값(없으면 보스 규칙 기본값) */
  boss?: Partial<StatusSpec> | 'IMMUNE';
}

export type Flag =
  | 'AA' // 곡사지만 비행 적도 맞음
  | 'NOAIR' // 비행 적을 못 맞힘
  | 'IGNORE_ARMOR'
  | 'WATER_ONLY'
  | 'ON_PATH'
  | 'WATER_OK'
  | 'HOMING'
  | 'UNTARGETABLE'
  | 'DETECT';

export type BloomKind =
  | 'HASTE' // 공통형: 5초간 공격속도 +50% (그늘 · 이슬)
  | 'AREA_STATUS'
  | 'GLOBAL_STATUS'
  | 'AREA_DAMAGE'
  | 'BARRAGE' // 일정 시간 연사/포격
  | 'UNLIMITED' // 일정 시간 대상 · 관통 무제한
  | 'BUFF_SELF'
  | 'INVULN'
  | 'HEAL_ALL'
  | 'ECON' // 양분 관련
  | 'WAVE' // 선형/전역 파동
  | 'CUSTOM'; // special 코드가 직접 처리

export interface BloomSpec {
  kind: BloomKind;
  /** 지속(초) */
  dur?: number;
  /** 반경(타일). 0 = 사거리 · 'G' 는 전역 */
  r?: number;
  on?: StatusSpec[];
  /** 임의 매개변수 */
  p?: Record<string, number>;
  /** 연출/도감용 이름 키(i18n: bloom.Pxxx) */
}

/** 투사체/이펙트의 겉모습. 종마다 서로 다르게(03 · 07문서) 조합한다 */
export type ProjShape =
  | 'orb'
  | 'needle'
  | 'seed'
  | 'leaf'
  | 'flame'
  | 'shard'
  | 'bolt'
  | 'note'
  | 'spore'
  | 'drop'
  | 'star'
  | 'petal'
  | 'fruit'
  | 'thorn'
  | 'web'
  | 'ink'
  | 'wisp'
  | 'ray'
  | 'none';

export type HitFx =
  | 'puff'
  | 'burst'
  | 'ring'
  | 'spark'
  | 'cloud'
  | 'frost'
  | 'ember'
  | 'zap'
  | 'curse'
  | 'bloom'
  | 'splash'
  | 'sticky'
  | 'slash'
  | 'glint';

export interface FxSpec {
  shape: ProjShape;
  /** 팔레트 램프 이름(R1–R12) 과 인덱스 */
  color: [string, number];
  hit: HitFx;
  /** 보조 색(꼬리 · 폭발 테두리) */
  color2?: [string, number];
  trail?: 'dots' | 'line' | 'sparkle' | 'smoke' | 'none';
  /** 발사할 때 식물 쪽 연출 */
  cast?: 'puff' | 'flash' | 'ring' | 'none';
}

export interface PlantBattle {
  id: string;
  arch: ArchId;
  /** 특수 능력 코드(아키타입이 SPECIAL 이거나 추가 동작이 있을 때) */
  special?: string;
  cost: number;
  /** Lv1 · ★1 · 등급 배율 포함 값 */
  dmg: number;
  interval: number;
  range: number;
  type: DmgType;
  /** 동시 발사/연타/알갱이 수 */
  shots?: number;
  pierce?: number;
  splash?: number;
  /** 근접/연쇄 대상 수(0 = 무제한) */
  targets?: number;
  /** 연쇄에서 튈 때마다 줄어드는 비율 */
  fall?: number;
  on?: StatusSpec[];
  flags?: Flag[];
  p?: Record<string, number>;
  bloom: BloomSpec;
  fx: FxSpec;
}

export interface ArchetypeDef {
  id: ArchId;
  nameKey: string;
  /** 아키타입 비용 배율 */
  costMul: number;
  /** 설명 키 */
  desc: string;
}
