// 게임 전체 이벤트 목록 (12문서 4절 2항). 마일스톤마다 여기에 추가한다.
// 로직(systems)이 emit하고, 씬이 듣고 연출한다. 이름은 '대상:일어난일'.

import type { ScreenLayout } from './Screen';
import type { Settings } from './Settings';

export interface GameEvents {
  // 저장 · 시스템
  /** 중요한 일(개화 · 봉투 · 전투 종료 · 구매) 직후 저장 요청 */
  'save:requested': { reason: string };
  'save:done': { ok: boolean; reason: string };
  'save:recovered': { from: 'backup' };
  'save:failed': { reason: string };
  'screen:resized': ScreenLayout;
  'audio:unlocked': Record<string, never>;
  'settings:changed': { settings: Settings };

  // 정원 (M2)
  'plant:watered': { uid: string };

  // 전투 (M3)
  'battle:enemyKilled': { enemyId: string };
}

export type GameEventName = keyof GameEvents;
