// 적 (08문서). 챕터 1 적 5종 + 보스 B1 을 먼저 구현한다(나머지 챕터는 M4).
// 속도 단위는 타일/초. HP 는 기본값이고 챕터 · 웨이브 · 난이도 배율이 곱해진다.

import type { DmgType, StatusKind } from './types';

export interface EnemyDef {
  id: string;
  nameKey: string;
  chapter: number;
  /** 화면에서 그리는 크기(px) */
  size: number;
  hp: number;
  speed: number;
  armor: number;
  reward: number;
  hearts: number;
  threat: number;
  boss?: boolean;
  flying?: boolean;
  stealth?: boolean;
  /** 무리로 나오는 마릿수(모기 떼 등). 1 이면 단독 */
  swarm?: number;
  /** 피해 유형별 배율(1 기본, 2 = +100%, 0 = 면역) */
  dmgMul?: Partial<Record<DmgType, number>>;
  /** 범위 피해에 약함(받는 범위 피해 +비율) */
  areaWeak?: number;
  immune?: StatusKind[];
  /** 소개 카드에 나오는 한 줄 팁 키 */
  tip: string;
  tags: ('ARMOR' | 'FAST' | 'SPLIT' | 'AIR' | 'STEALTH' | 'HEAL' | 'ATTACK_PLANT' | 'BOSS')[];
  /** 고유 능력 코드(Enemies 시뮬레이션이 해석) */
  ability?: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  E01: {
    id: 'E01',
    nameKey: 'enemy.E01',
    chapter: 1,
    size: 12,
    hp: 30,
    speed: 1.0,
    armor: 0,
    reward: 3,
    hearts: 1,
    threat: 1,
    tip: 'enemy.E01.tip',
    tags: [],
  },
  E02: {
    id: 'E02',
    nameKey: 'enemy.E02',
    chapter: 1,
    size: 16,
    hp: 80,
    speed: 0.55,
    armor: 3,
    reward: 6,
    hearts: 1,
    threat: 3,
    tip: 'enemy.E02.tip',
    tags: ['ARMOR'],
    ability: 'SHELL',
  },
  E03: {
    id: 'E03',
    nameKey: 'enemy.E03',
    chapter: 1,
    size: 14,
    hp: 45,
    speed: 1.6,
    armor: 1,
    reward: 4,
    hearts: 1,
    threat: 1.5,
    tip: 'enemy.E03.tip',
    tags: ['FAST'],
  },
  E04: {
    id: 'E04',
    nameKey: 'enemy.E04',
    chapter: 1,
    size: 20,
    hp: 90,
    speed: 0.8,
    armor: 0,
    reward: 2,
    hearts: 1,
    threat: 3,
    areaWeak: 0.3,
    tip: 'enemy.E04.tip',
    tags: ['SPLIT'],
    ability: 'SPLIT',
  },
  E05: {
    id: 'E05',
    nameKey: 'enemy.E05',
    chapter: 1,
    size: 14,
    hp: 60,
    speed: 0.9,
    armor: 2,
    reward: 5,
    hearts: 1,
    threat: 2.5,
    tip: 'enemy.E05.tip',
    tags: ['FAST'],
    ability: 'ROLL',
  },
  /** 애벌레 기차가 죽으면 나오는 마디 */
  E04S: {
    id: 'E04S',
    nameKey: 'enemy.E04S',
    chapter: 1,
    size: 10,
    hp: 20,
    speed: 1.1,
    armor: 0,
    reward: 2,
    hearts: 1,
    threat: 0.5,
    tip: 'enemy.E04.tip',
    tags: [],
  },
  B1: {
    id: 'B1',
    nameKey: 'enemy.B1',
    chapter: 1,
    size: 48,
    hp: 2500,
    speed: 0.45,
    armor: 2,
    reward: 100,
    hearts: 10,
    threat: 40,
    boss: true,
    tip: 'enemy.B1.tip',
    // 체력 50%에서 날개가 돋아 4초간 비행: 출격 준비의 '대공 안내' 태그에 포함
    tags: ['BOSS', 'AIR'],
    ability: 'APHID_QUEEN',
  },
};

/** 챕터 배율(08문서 2절) */
export const CHAPTER_HP_MUL = [1.0, 1.6, 2.5, 3.8, 5.6, 8.0, 11.5] as const;
