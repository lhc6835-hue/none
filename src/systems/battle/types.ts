// 전투 시뮬레이션의 엔티티 · 이벤트 타입. Phaser 를 모른다(12문서: systems/ 는 순수 로직).
// 시간은 틱(1/60초), 위치는 타일 좌표(실수, 타일 한 칸 = 1)로 센다. 타일 (tx,ty) 의 중심은 (tx+0.5, ty+0.5).

import type { DmgType, PlantBattle, StatusKind, StatusSpec } from '../../data/battle/types';
import type { EnemyDef } from '../../data/battle/enemies';

export const TPS = 60;
export const tk = (sec: number): number => Math.round(sec * TPS);

export interface Vec {
  x: number;
  y: number;
}

/** 출전하는 식물 한 그루의 정원 쪽 정보(06문서 5절 능력치 공식의 입력) */
export interface Loadout {
  speciesId: string;
  nickname?: string;
  level: number;
  /** 자질 ★1–5 */
  stars: number;
  /** 애정도 ♡0–10 */
  hearts: number;
  /** 성장 단계 3(어린잎) 4(성숙) 5(개화) */
  stage: number;
  /** 컨디션 보정(최상 1.05 · 좋음 1.0 · 보통 0.95 · 시무룩 0.85) */
  condition: number;
  traits: string[];
  uid?: string;
}

export type TargetMode = 'FIRST' | 'LAST' | 'STRONG' | 'CLOSE' | 'AIR';

export interface Stats {
  dmg: number;
  interval: number;
  range: number;
  /** 치명 확률 · 치명 피해 배율 */
  crit: number;
  critMul: number;
  /** 근접/연쇄/광선 등에서 쓰는 대상 수 */
  targets: number;
  splash: number;
  pierce: number;
  aoeMul: number;
}

export interface Tower {
  id: number;
  spec: PlantBattle;
  load: Loadout;
  tx: number;
  ty: number;
  x: number;
  y: number;
  stats: Stats;
  /** 강화 단계 0–3 */
  level: number;
  branch: 'A' | 'B' | null;
  /** 다음 공격까지 남은 틱 */
  cd: number;
  /** 개화기 게이지 0–1 */
  gauge: number;
  /** 개화기 진행 중 남은 틱 */
  bloomLeft: number;
  /** 수동 개화기 */
  manualBloom: boolean;
  /** 기절 남은 틱(HP 0 이 되면 기절) */
  down: number;
  hp: number;
  maxHp: number;
  target: TargetMode;
  /** 투자한 양분(회수 환불 계산) */
  invested: number;
  placedAt: number;
  /** 임시 효과: 공속 · 피해 등 배율과 남은 틱 */
  buffs: { aspd: number; dmg: number; range: number; crit: number; until: number }[];
  /** 아키타입 · 특수 능력이 쓰는 자유 저장소 */
  aux: Record<string, number>;
  /** 기여 통계(MVP) */
  dealt: number;
  support: number;
  kills: number;
}

export interface Enemy {
  uid: number;
  def: EnemyDef;
  route: number;
  /** 경로를 따라온 거리(타일) */
  s: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  armor: number;
  alive: boolean;
  flying: boolean;
  stealth: boolean;
  revealed: number;
  /** 엘리트 */
  elite: boolean;
  boss: boolean;
  // ---- 상태이상 ----
  slowAmt: number;
  slowUntil: number;
  bindUntil: number;
  stunUntil: number;
  sleepUntil: number;
  charmUntil: number;
  chill: number;
  chillUntil: number;
  freezeUntil: number;
  freezeImmune: number;
  poison: number;
  poisonUntil: number;
  poisonDps: number;
  burn: number;
  burnUntil: number;
  burnDps: number;
  wetUntil: number;
  shred: number;
  shredUntil: number;
  mark: number;
  markUntil: number;
  /** 연결(거미줄 박주가리): 같은 번호끼리 피해 공유 */
  link: number;
  linkShare: number;
  linkUntil: number;
  /** 고유 능력 상태(껍질 · 굴림 · 분열 …) */
  aux: Record<string, number>;
  /** 마지막으로 때린 식물(처치 보상 · 통계) */
  lastHit: number;
  /** 한 번만 걸리는 효과 기록 */
  once: Set<string>;
  /** 이번 틱에 받은 연쇄 피해 등 중복 방지 */
  hitTick: number;
  /** 뒷걸음 중 */
  backward: boolean;
  /** 살아 있는 동안 들어온 식물/상태 아이콘(렌더링용) */
  icons: StatusKind[];
}

export interface Projectile {
  id: number;
  tower: number;
  kind: 'homing' | 'straight' | 'lob';
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  /** lob: 총 비행 틱 · 경과 틱 */
  t: number;
  dur: number;
  speed: number;
  dir: number;
  target: number;
  dmg: number;
  type: DmgType;
  on: StatusSpec[];
  pierce: number;
  splash: number;
  hit: Set<number>;
  life: number;
  aa: boolean;
  fx: PlantBattle['fx'];
  /** 부가 정보(씨앗 파편 · 구름 등) */
  aux: Record<string, number>;
  crit: boolean;
  ignoreArmor: boolean;
}

/** 지속 장판: 장판 · 구름 · 패치 · 용암 · 용오름 · 비구름 등 모든 '땅에 남는 효과' */
export interface Field {
  id: number;
  kind: string;
  tower: number;
  x: number;
  y: number;
  r: number;
  /** 남은 틱(-1 은 영구) */
  left: number;
  period: number;
  nextTick: number;
  fx: PlantBattle['fx'];
  /** 효과 값들 */
  v: Record<string, number>;
  on: StatusSpec[];
  type: DmgType;
}

export interface Summon {
  id: number;
  tower: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cd: number;
  /** 붙잡은 적 uid */
  holding: number[];
  kind: 'WISP' | 'BLOCKER' | 'SPIRIT' | 'LADYBUG';
  life: number;
  dmg: number;
  fx: PlantBattle['fx'];
}

export type SimEvent =
  | {
      t: 'shot';
      tower: number;
      from: Vec;
      to: Vec;
      kind: string;
      fx: PlantBattle['fx'];
      target?: number;
    }
  | {
      t: 'hit';
      enemy: number;
      x: number;
      y: number;
      amount: number;
      type: DmgType;
      crit: boolean;
      fx: PlantBattle['fx'] | null;
    }
  | { t: 'status'; enemy: number; kind: StatusKind }
  | { t: 'kill'; enemy: number; x: number; y: number; boss: boolean; reward: number }
  | { t: 'leak'; enemy: number; hearts: number }
  | { t: 'bloom'; tower: number; name: string }
  | { t: 'ring'; x: number; y: number; r: number; fx: PlantBattle['fx']; kind: string }
  | { t: 'place'; tower: number }
  | { t: 'remove'; tower: number }
  | { t: 'upgrade'; tower: number; level: number }
  | { t: 'wave'; wave: number; total: number }
  | { t: 'waveClear'; wave: number; bonus: number }
  | { t: 'spawn'; enemy: number }
  | { t: 'toast'; key: string; params?: Record<string, number | string> }
  | { t: 'down'; tower: number }
  | { t: 'up'; tower: number }
  | { t: 'synergy'; family: string; tier: number }
  | { t: 'heart'; hearts: number }
  | { t: 'tool'; slot: number; x: number; y: number; id: string }
  | { t: 'end'; won: boolean };

export type Phase = 'PREP' | 'RUNNING' | 'WON' | 'LOST';

export interface PlaceResult {
  ok: boolean;
  reason?: 'noCard' | 'cost' | 'tile' | 'occupied' | 'limit' | 'water' | 'path' | 'phase';
  tower?: Tower;
}
