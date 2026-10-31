// 전투 끝맺음: 승리 · 패배 연출 → 보상 정산 → 결과 화면, 그리고 일시정지 메뉴

import { RAMPS } from '../../art/palette';
import { t } from '../../i18n';
import { applyOutcome, type RewardSummary } from '../../systems/battle/Rewards';
import { STAGES } from '../../data/battle/stages';
import { getApp } from '../context';
import { overlay } from '../UIOverlay';
import { settingsModal } from '../../ui/SettingsPanel';
import type { BattleScene } from './BattleScene';
import { showResult, type PlantBefore } from './BattleResultView';
import { px, py } from './FxLayer';

export function begin(s: BattleScene): void {
  const sim = s.sim;
  const app = getApp(s);
  s.cancelPick();
  s.selectTower(null);
  const won = sim.phase === 'WON';
  const result = sim.result();
  if (won) {
    app.sfx.play('battle_win');
    // 모든 식물이 동시에 신남 표정 → 꽃잎이 쏟아진다
    for (const tw of sim.towers) {
      s.view.setExpr(tw.id, 'excited', 99999, s.time.now);
      s.fx.sparkles(px(tw.tx) + 12, py(tw.ty) + 4, RAMPS.R9[4], 8);
    }
    s.time.addEvent({
      delay: 90,
      repeat: 16,
      callback: () => {
        const x = 20 + Math.random() * 600;
        s.fx.sparkles(
          x,
          40 + Math.random() * 40,
          Math.random() < 0.5 ? RAMPS.R6[3] : RAMPS.R1[4],
          5,
        );
      },
    });
  } else {
    app.sfx.play('battle_lose');
    for (const tw of sim.towers) s.view.setExpr(tw.id, 'sulk', 99999, s.time.now);
  }

  // 정산(연습 · 시연은 보상 없음)
  let reward: RewardSummary | null = null;
  const before = new Map<string, PlantBefore>();
  const state = s.state;
  if (state && !s.data0.practice) {
    for (const d of sim.deck) {
      const p = d.uid ? state.plants.find((x) => x.uid === d.uid) : undefined;
      if (p) before.set(p.uid, { level: p.level, exp: p.exp });
    }
    const deployed = new Map<string, number>();
    for (const uid of s.placedUids) deployed.set(uid, 0);
    for (const tw of result.towers) {
      const uid = sim.towerById(tw.id)?.load.uid;
      if (uid) deployed.set(uid, tw.dealt + tw.support);
    }
    const mvpUid = result.mvp !== null ? (sim.towerById(result.mvp)?.load.uid ?? null) : null;
    const deckUids = sim.deck.map((d) => d.uid).filter((u): u is string => !!u);
    reward = applyOutcome(
      state,
      sim.stage,
      s.data0.difficulty,
      result,
      deckUids,
      deployed,
      mvpUid,
      app.services.clock.now(),
    );
    app.services.autoSave.flush('battle');
  }
  s.endTimer = s.time.delayedCall(won ? 1900 : 1300, () => showResult(s, result, reward, before));
}

export function nextStageId(currentId: string): string | null {
  const i = STAGES.findIndex((x) => x.id === currentId);
  return i >= 0 && i + 1 < STAGES.length ? STAGES[i + 1].id : null;
}

/** 일시정지 메뉴: 계속 · 설정 · 포기하고 나가기 */
export function openMenu(s: BattleScene): void {
  const ov = overlay(s);
  const wasPaused = s.paused;
  if (!wasPaused) s.togglePause();
  const resume = (): void => {
    if (!wasPaused && s.paused) s.togglePause();
  };
  ov.openModal({
    title: t('battle.menu.title'),
    width: 220,
    buttons: [
      { label: t('battle.menu.resume'), variant: 'primary', onClick: resume },
      {
        label: t('battle.menu.settings'),
        closes: false,
        onClick: () => ov.openModal(settingsModal(s, () => ov.closeModal(), [])),
      },
      {
        label: t('battle.menu.retreat'),
        onClick: () => leave(s),
      },
    ],
  });
}

/** 전투를 떠난다: 연습은 원래 화면, 일반 전투는 정원 */
export function leave(s: BattleScene): void {
  const to = s.data0.returnTo ?? (s.data0.practice ? 'Title' : 'Hub');
  overlay(s).transitionTo('Battle', to);
}
