// 핵심 데이터 스키마 (12문서 5절). 타입만 있고 런타임 코드는 없다.
// 기획서에 이름만 나오고 정의가 없는 식별자(TraitId 등)는 해당 마일스톤에서 구체화한다.

export type GradeId = 'SHADE' | 'DEW' | 'SUN' | 'DUSK' | 'MOON' | 'STAR' | 'AURORA' | 'ORIGIN';
export type FamilyId =
  | 'VINE'
  | 'THORN'
  | 'FUNGUS'
  | 'BLOOM'
  | 'FRUIT'
  | 'EMBER'
  | 'FROST'
  | 'LUMEN'
  | 'STORM'
  | 'SPIRIT';
export type Archetype =
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
export type DamageType = 'PHYS' | 'POISON' | 'FIRE' | 'FROST' | 'SHOCK' | 'LIGHT' | 'SPIRIT';
export type RampId =
  'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10' | 'R11' | 'R12';

export type FaceType =
  'F01' | 'F02' | 'F03' | 'F04' | 'F05' | 'F06' | 'F07' | 'F08' | 'F09' | 'F10' | 'F11' | 'F12';

export type BodyPlan =
  | 'BULB'
  | 'STALK'
  | 'ROSETTE'
  | 'VINE'
  | 'CAP'
  | 'PITCHER'
  | 'TRAP'
  | 'BUSH'
  | 'COLUMN'
  | 'FLOWER'
  | 'POD'
  | 'FROND'
  | 'CRYSTAL'
  | 'WISP'
  | 'BONSAI'
  | 'LILY';

export type SpecialRamp = 'STARGOLD' | 'AURORA' | 'ORIGIN' | 'SILVER' | 'TOXIC' | 'ARCANE';

export interface FaceSpec {
  type: FaceType;
  /** 바디 플랜의 부위 이름(예: 'bulb', 'flowerCenter') */
  host: string;
  /** 0.6–1.0 */
  eyeSpread?: number;
  /** 0.5–1.2 */
  mouthLen?: number;
  offset?: [number, number];
}

export interface PlantLook {
  body: BodyPlan;
  ramps: { main: RampId; sub: RampId; accent?: RampId; special?: SpecialRamp };
  variantRamps: { main: RampId; sub: RampId };
  /** 잎 모양, 꽃잎 수, 가시 밀도 등 바디 플랜별 매개변수 */
  parts: Record<string, string | number | boolean>;
  face: FaceSpec;
  /** 영혼 계열 */
  translucent?: boolean;
}

// ---- 전투 (M3에서 구체화) ----
export type StatusId = string;
export type MutatorId = string;
export type ElitePrefix = string;

export type Effect =
  | {
      kind: 'status';
      status: StatusId;
      stacks?: number;
      duration?: number;
      magnitude?: number;
      chance?: number;
    }
  | { kind: 'splash'; radius: number; ratio: number }
  | { kind: 'chain'; targets: number; falloff: number }
  | { kind: 'knockback' | 'pull'; tiles: number }
  | { kind: 'execute'; threshold: number; bonusSap?: number }
  | { kind: 'armorShred'; amount: number; max: number; duration: number }
  | { kind: 'custom'; scriptId: string; params?: Record<string, number> };

export interface AttackSpec {
  archetype: Archetype;
  damage: number;
  interval: number;
  range: number;
  minRange?: number;
  damageType: DamageType;
  hitsAir: boolean;
  projectile?: {
    speed: number;
    homing?: boolean;
    pierce?: number;
    count?: number;
    spreadDeg?: number;
  };
  onHit?: Effect[];
}

export interface Passive {
  kind:
    | 'aura'
    | 'periodic'
    | 'onKill'
    | 'onDeath'
    | 'terrain'
    | 'produce'
    | 'summon'
    | 'trap'
    | 'custom';
  params: Record<string, number | string | boolean>;
}

// ---- 돌봄 (04문서) ----
export type PersonalityId =
  'LAID_BACK' | 'PLAYFUL' | 'SHY' | 'GLUTTON' | 'NEAT' | 'SPOILED' | 'BRAVE' | 'SLEEPY';
export type TraitId = string;
/** 온실 구역 9종 (04문서 1-1) */
export type ZoneId =
  | 'WINDOW'
  | 'TABLE'
  | 'SHADE'
  | 'STOVE'
  | 'TANK'
  | 'OUTDOOR'
  | 'MOONLIGHT'
  | 'BREEDING'
  | 'DORMANT';
export type SongGenre = 'LULLABY' | 'WALTZ' | 'MARCH' | 'RAIN' | 'JAZZ' | 'MYSTIC';
/** 저장되는 문제(곰팡이 점 · 해충 · 시든 잎 · 과습 …). 목마름 · 시무룩 같은 상태는 욕구에서 계산한다. */
export type ProblemKind =
  | 'MOLD'
  | 'MOLD_DISEASE'
  | 'PEST'
  | 'WITHER'
  | 'OVERWATER'
  | 'ROOT_ROT'
  | 'EXCESS_NUTRIENT'
  | 'ROOTBOUND'
  | 'TOPPLED'
  | 'WOUND';
export interface ProblemState {
  kind: ProblemKind;
  /** 생긴 시각(ms) */
  since: number;
  /** 곰팡이 점 · 시든 잎 위치(스프라이트 안쪽 0–1 비율) */
  x?: number;
  y?: number;
  /** 해충 마릿수 */
  n?: number;
}
export type DiaryEntry = { at: number; kind: string; [key: string]: unknown };
export type Acquire = { kind: string; [key: string]: unknown };

export type Placement = 'SOIL' | 'FERTILE' | 'SHADE' | 'WATER' | 'PATH';

export interface PlantSpecies {
  /** 'P001' */
  id: string;
  /** i18n 키 */
  nameKey: string;
  grade: GradeId;
  family: FamilyId;
  cost: number;
  attack?: AttackSpec;
  passives: Passive[];
  bloomSkill:
    { kind: 'generic' } | { kind: 'custom'; scriptId: string; params: Record<string, number> };
  battleHpMul?: number;
  placement: Placement[];
  care: {
    light: 1 | 2 | 3;
    water: 'LOW' | 'MID' | 'HIGH';
    temp: 'COOL' | 'MID' | 'WARM';
    active: 'DAY' | 'NIGHT';
    favoriteNutrient: 'GREEN' | 'GROW' | 'SWEET' | 'STRONG';
    music?: SongGenre;
    phrase?: 'CHEER' | 'PRAISE' | 'BATTLE' | 'COMFORT';
    needsNightExposure?: boolean;
    needsStake?: boolean;
    aquatic?: boolean;
    /** 고유 조건 스크립트 ID(태초 등급 등) */
    special?: string;
  };
  look: PlantLook;
  acquire: Acquire[];
  flavorKey: string;
  hum: { note: 0 | 1 | 2 | 3 | 4; octave: number; motif: number[] };
}

export type GrowthStage = 0 | 1 | 2 | 3 | 4 | 5;

export interface PlantNeeds {
  water: number;
  nutrition: number;
  hygiene: number;
  mood: number;
}

export interface PlantInstance {
  uid: string;
  speciesId: string;
  nickname: string;
  stage: GrowthStage;
  gp: number;
  needs: PlantNeeds;
  problems: ProblemState[];
  personality: PersonalityId;
  affection: number;
  affectionToday: number;
  quality?: 1 | 2 | 3 | 4 | 5;
  qualityLog: { sum: number; count: number; perfect: number; actions: number };
  traits: TraitId[];
  reservedTraits: TraitId[];
  variant: boolean;
  level: number;
  exp: number;
  awakened: boolean;
  potId: string;
  soilId: string;
  soilFertility: 0 | 1 | 2 | 3;
  location: { zone: ZoneId; slot: number };
  shape?: 'NEAT' | 'BUSHY' | 'SPIKY';
  diary: DiaryEntry[];
  flags: Record<string, boolean>;
  /** 끝나는 시각(ms)을 담는 타이머: vitality(생기) · growBoost(쑥쑥) · excessUntil · woundUntil … */
  timers: Record<string, number>;
  /** 이번 성장 단계에서 쓴 영양제 · 뼛가루 수(과다 판정) */
  stageDoses: { nutrient: number; bone: number };
  /** 분무한 시각 기록(1분 8회 초과 판정) */
  mistLog: number[];
  /** 마지막 쓰다듬기 · 말 걸기 · 간식 시각(반복 효과 감소 · 쿨다운) */
  lastCare: Record<string, number>;
  /** 오늘(현지 날짜) 얻은 애정도 */
  affectionDay: string;
  /** 심은 시각 */
  plantedAt: number;
  /** 오프라인 계산 기준 시각(ms) */
  lastUpdated: number;
}

export interface Wave {
  groups: {
    enemy: string;
    count: number;
    gap: number;
    delay: number;
    path: number;
    elite?: ElitePrefix[];
  }[];
}

export interface StageDef {
  /** '1-1' */
  id: string;
  chapter: number;
  nameKey: string;
  /** 26자 × 12줄(08 문서 4절 범례) */
  map: string[];
  paths: { id: number; tiles: [number, number][] }[];
  flyPaths?: { id: number; points: [number, number][] }[];
  night?: boolean;
  startSap?: number;
  waveGap: [number, number];
  /** 보통 기준. 다른 난이도는 규칙으로 변환(09 문서 1절) */
  waves: Wave[];
  fixedMutator?: MutatorId;
  newEnemy?: string;
  tips?: string[];
}
