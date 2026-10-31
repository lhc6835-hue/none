// 효과음 데이터 (11문서 5절의 '시작값'). ZzFX 인자 순서는 audio/zzfx.ts 참고.
// 여러 음이 이어지는 소리는 notes 로 시작 시각(ms)을 준다. 한 버퍼로 미리 섞어 렌더링한다.
// priority: UI(2) > 큰 사건(1) > 공격 · 피격(0). 동시 12개를 넘으면 낮은 쪽부터 생략한다.

import type { ZzfxParams } from '../audio/zzfx';

export interface SfxDef {
  notes: { at: number; params: ZzfxParams }[];
  priority: 0 | 1 | 2;
  /** 같은 소리를 다시 내지 않는 최소 간격(ms). 기본 40 */
  cooldownMs?: number;
}

const one = (params: ZzfxParams, priority: SfxDef['priority'], cooldownMs?: number): SfxDef => ({
  notes: [{ at: 0, params }],
  priority,
  cooldownMs,
});

export const SFX = {
  // ---- UI ----
  ui_click: one([0.5, 0.05, 880, 0, 0.01, 0.05, 1, 1.5], 2),
  ui_hover: one([0.2, 0, 1400, 0, 0, 0.02, 1], 2, 60),
  ui_release: one([0.35, 0.05, 1175, 0, 0.005, 0.05, 1, 1.5], 2),
  ui_open: one([0.3, 0.1, 300, 0.01, 0.02, 0.08, 4, 1, 8], 2),
  ui_close: one([0.25, 0.1, 500, 0.01, 0.01, 0.07, 4, 1, -10], 2),
  ui_error: {
    notes: [
      { at: 0, params: [0.5, 0, 110, 0.01, 0.04, 0.1, 1] },
      { at: 130, params: [0.5, 0, 98, 0.01, 0.04, 0.14, 1] },
    ],
    priority: 2,
    cooldownMs: 120,
  },
  coin: one([0.6, 0, 1200, 0, 0.02, 0.12, 1, 1, 0, 0, 600, 0.04], 2),
  dew: one([0.4, 0, 1500, 0.005, 0.03, 0.2, 0, 1, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0.7], 2),
  save_tick: one([0.12, 0, 1760, 0, 0, 0.04, 0], 2, 500),

  // ---- 돌봄 ----
  gulp: one([0.6, 0.1, 300, 0.01, 0.03, 0.08, 0, 1, -20], 1),
  perfect: one([0.7, 0, 1046, 0, 0.05, 0.3, 0, 1, 0, 0, 523, 0.06], 1),
  mold_pop: one([0.4, 0.2, 900, 0, 0.01, 0.06, 4], 1),
  eyes_open: one([0.7, 0, 400, 0.02, 0.08, 0.2, 0, 1, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0.6], 1),
  name_stamp: {
    notes: [
      { at: 0, params: [0.6, 0, 80, 0, 0.02, 0.12, 4] },
      { at: 60, params: [0.4, 0, 1568, 0, 0.03, 0.3, 0] },
    ],
    priority: 1,
  },

  // ---- 전투 ----
  plant_place: one([0.6, 0.05, 220, 0, 0.03, 0.1, 1, 1, 15], 1),
  shoot: one([0.3, 0.05, 700, 0, 0.01, 0.06, 2, 1, -30], 0),
  root_heart_lost: one([0.7, 0, 330, 0, 0.1, 0.3, 1, 1, -6, 0, -80, 0.12], 1, 200),
} satisfies Record<string, SfxDef>;

export type SfxId = keyof typeof SFX;
