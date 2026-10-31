// 결과 화면 (06문서 13절): ① 별점 ② MVP ③ 경험치 바 ④ 보상 ⑤ 첫 클리어 ⑥ 버튼
// 한 단계씩 차례로 나타나고, 어느 순간이든 화면을 누르면 건너뛰어 모두 보여 준다.

import Phaser from 'phaser';
import { PixelCanvas } from '../../art/PixelCanvas';
import { RAMPS, SPECIAL, toInt } from '../../art/palette';
import type { Stage } from '../../art/bodies/Ctx';
import { ENEMIES } from '../../data/battle/enemies';
import { t } from '../../i18n';
import { plantDisplayName, plantSpeciesName } from '../../i18n/names';
import type { BattleResult } from '../../systems/battle/BattleSim';
import { expToNextPlant, type RewardSummary } from '../../systems/battle/Rewards';
import { Button } from '../../ui/Button';
import { ensurePanel } from '../../ui/Frames';
import { iconTexture } from '../../ui/IconTex';
import { numberText } from '../../ui/NumberFont';
import { pixelText } from '../../ui/PixelText';
import { PlantView } from '../../ui/PlantView';
import { getApp } from '../context';
import { overlay } from '../UIOverlay';
import { nextStageId } from './BattleEnding';
import type { BattleScene } from './BattleScene';

export interface PlantBefore {
  level: number;
  exp: number;
}

const VEIL = 'battle:veil';
const D = 200;

function ensureVeil(scene: Phaser.Scene): string {
  if (scene.textures.exists(VEIL)) return VEIL;
  const c = new PixelCanvas(640, 360);
  for (let y = 0; y < 360; y += 2)
    for (let x = (y / 2) % 2; x < 640; x += 2) c.px(x, y, SPECIAL.INK);
  return c.toTexture(scene, VEIL);
}

/** 패배 원인 팁: 하트를 가장 많이 깎은 적의 특징으로 고른다 */
export function defeatTip(s: BattleScene): string {
  const by = s.sim.leakBy;
  let worst: string | null = null;
  let most = 0;
  for (const [id, n] of Object.entries(by)) {
    if (n > most) {
      most = n;
      worst = id;
    }
  }
  const def = worst ? ENEMIES[worst] : undefined;
  if (!def) return t('battle.tip.generic');
  if (def.flying || def.tags.includes('AIR')) return t('battle.tip.air');
  if (def.tags.includes('ARMOR')) return t('battle.tip.armor');
  if (def.tags.includes('FAST')) return t('battle.tip.fast');
  if (def.tags.includes('SPLIT')) return t('battle.tip.split');
  if (def.boss) return t('battle.tip.boss');
  return t('battle.tip.generic');
}

export function showResult(
  s: BattleScene,
  result: BattleResult,
  reward: RewardSummary | null,
  before: Map<string, PlantBefore>,
): void {
  const app = getApp(s);
  const won = result.won;
  const root = s.add.container(0, 0).setDepth(D);
  root.add(s.add.image(0, 0, ensureVeil(s)).setOrigin(0, 0));
  const W = 440;
  const H = 280;
  const X = 320 - W / 2;
  const Y = 40;
  const panel = s.add.image(320, Y + H / 2, ensurePanel(s, 'wood', W, H));
  root.add(panel);
  panel.setScale(0.9);
  s.tweens.add({ targets: panel, scale: 1, duration: 180, ease: 'Back.easeOut' });

  const steps: (() => void)[] = [];
  const step = (fn: () => void): void => {
    steps.push(fn);
  };

  // 제목
  const title = pixelText(s, 320, Y + 16, won ? t('result.win') : t('result.lose'), {
    size: 14,
    bold: true,
    anchorX: 0.5,
    anchorY: 0.5,
    color: won ? RAMPS.R1[2] : RAMPS.R7[3],
  });
  root.add(title);
  root.add(
    pixelText(
      s,
      320,
      Y + 31,
      `${s.sim.stage.id}  ${t(`stage.${s.sim.stage.id}`)} · ${t(`diff.${s.data0.difficulty}`)}`,
      {
        size: 7,
        anchorX: 0.5,
        anchorY: 0.5,
        color: RAMPS.R10[1],
      },
    ),
  );

  // ① 별점: 하나씩 '띵' (빈 별은 회색으로 깔아 둔다)
  const starKey = iconTexture(s, 'star');
  const stars: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < 3; i++) {
    const x = 320 + (i - 1) * 28;
    root.add(
      s.add
        .image(x, Y + 54, starKey)
        .setScale(2)
        .setTintFill(toInt(RAMPS.R12[2])),
    );
  }
  for (let i = 0; i < 3; i++) {
    const star = s.add
      .image(320 + (i - 1) * 28, Y + 54, starKey)
      .setScale(2)
      .setVisible(false);
    stars.push(star);
    root.add(star);
  }
  const earned = won ? result.stars : 0;
  for (let i = 0; i < earned; i++) {
    step(() => {
      stars[i].setVisible(true).setScale(3);
      s.tweens.add({ targets: stars[i], scale: 2, duration: 240, ease: 'Back.easeOut' });
      app.sfx.play('star_ding', { pitch: 1 + i * 0.12 });
      s.fx.sparkles(320 + (i - 1) * 28, Y + 54 + 30, RAMPS.R9[4], 6);
    });
  }

  // ② MVP 클로즈업(승리) / 패배 원인 팁(패배)
  const mvpTower = result.mvp !== null ? s.sim.towerById(result.mvp) : null;
  if (won && mvpTower) {
    step(() => {
      const box = s.add.container(X + 62, Y + 150);
      root.add(box);
      box.add(s.add.image(0, 0, ensurePanel(s, 'leaf', 92, 112)));
      const view = new PlantView(s, 0, 28, {
        speciesId: mvpTower.spec.id,
        stage: Math.max(3, Math.min(5, mvpTower.load.stage)) as Stage,
        expression: 'excited',
        seed: 'mvp',
      });
      view.setScale(2);
      box.add(view);
      box.add(
        pixelText(s, 0, -48, 'MVP', { size: 9, bold: true, anchorX: 0.5, color: RAMPS.R9[2] }),
      );
      const nm = mvpTower.load.nickname || plantSpeciesName(mvpTower.spec.id);
      box.add(pixelText(s, 0, 36, nm, { size: 7, anchorX: 0.5 }));
      box.add(
        pixelText(
          s,
          0,
          46,
          t('result.mvpScore', { n: Math.round(mvpTower.dealt + mvpTower.support) }),
          { size: 7, anchorX: 0.5, color: RAMPS.R10[1] },
        ),
      );
      box.setScale(0.6);
      s.tweens.add({ targets: box, scale: 1, duration: 220, ease: 'Back.easeOut' });
      app.sfx.play('giggle');
    });
  } else if (!won) {
    step(() => {
      const tip = pixelText(s, 320, Y + 98, defeatTip(s), {
        size: 9,
        anchorX: 0.5,
        anchorY: 0,
        color: SPECIAL.INK,
        wrapWidth: W - 40,
        align: 'center',
      });
      root.add(tip);
    });
  }

  // ③ 식물별 경험치 바
  if (reward) {
    const colX = X + 120;
    reward.plants.slice(0, 6).forEach((g, i) => {
      step(() => {
        const y = Y + 82 + i * 22;
        const base = s.state?.plants.find((p) => p.uid === g.uid);
        if (!base) return;
        const row = s.add.container(colX, y);
        root.add(row);
        row.add(
          pixelText(s, 0, 0, plantDisplayName(base), {
            size: 7,
            color: g.mvp ? RAMPS.R9[2] : SPECIAL.INK,
          }),
        );
        const b = before.get(g.uid);
        row.add(pixelText(s, 0, 9, `Lv${b?.level ?? g.level}`, { size: 7, color: RAMPS.R10[1] }));
        const barW = 150;
        const frame = s.add.rectangle(46, 10, barW, 7, toInt(SPECIAL.INK)).setOrigin(0, 0.5);
        const track = s.add.rectangle(47, 10, barW - 2, 5, toInt(RAMPS.R10[1])).setOrigin(0, 0.5);
        const fill = s.add.rectangle(47, 10, 0, 5, toInt(RAMPS.R9[3])).setOrigin(0, 0.5);
        row.add([frame, track, fill]);
        const need = expToNextPlant(base.level);
        const frac = base.level >= 30 ? 1 : base.exp / need;
        const startFrac = b && b.level === base.level ? b.exp / need : 0;
        fill.width = Math.round((barW - 2) * startFrac);
        const state = { v: startFrac };
        s.tweens.add({
          targets: state,
          v: frac + (g.levelUps > 0 ? 0 : 0),
          duration: 520,
          ease: 'Cubic.easeOut',
          onUpdate: () => {
            fill.width = Math.round((barW - 2) * state.v);
          },
          onComplete: () => {
            if (g.levelUps > 0) {
              app.sfx.play('stage_up');
              const up = pixelText(s, 46 + barW + 6, 4, t('result.levelUp', { n: g.level }), {
                size: 9,
                bold: true,
                color: RAMPS.R9[2],
              });
              row.add(up);
              s.tweens.add({ targets: up, y: 0, duration: 200, ease: 'Back.easeOut' });
              s.fx.sparkles(colX + 100, y + 6, RAMPS.R9[4], 6);
            }
          },
        });
        row.add(
          pixelText(s, 46 + barW + 6, 4, `+${g.exp}`, {
            size: 7,
            color: g.levelUps > 0 ? SPECIAL.PAPER : RAMPS.R10[1],
          }),
        );
        app.sfx.play('coin', { pitch: 0.9 + i * 0.05 });
      });
    });

    // ④ 보상(잎전 · 이슬 · 드랍) ⑤ 첫 클리어 보너스
    step(() => {
      const y = Y + 82 + Math.min(6, reward.plants.length) * 22 + 6;
      const row = s.add.container(X + 120, y);
      root.add(row);
      let x = 0;
      const put = (icon: string, n: string, color: string = SPECIAL.INK): void => {
        row.add(s.add.image(x, 5, iconTexture(s, icon)).setOrigin(0, 0.5));
        row.add(numberText(s, x + 15, 2, n, color, '5x7'));
        x += 22 + n.length * 7;
      };
      put('coin', `+${reward.coin}`);
      if (reward.dew > 0) put('dew', `+${reward.dew}`, RAMPS.R3[2]);
      for (const d of reward.drops) {
        const isSeed = d.id.startsWith('seed:');
        put(isSeed ? 'seed' : 'compost', `x${d.n}`);
      }
      app.sfx.play('coin');
      if (reward.firstClear) {
        const ribbon = pixelText(s, 0, 14, t('result.firstClear'), {
          size: 9,
          bold: true,
          color: RAMPS.R7[3],
        });
        row.add(ribbon);
        app.sfx.play('perfect');
      }
    });
  }

  // ⑥ 버튼
  const buttons = (): Phaser.GameObjects.Container => {
    const c = s.add.container(0, Y + H - 22);
    const next = won && !s.data0.practice ? nextStageId(s.sim.stage.id) : null;
    const bs: { label: string; primary?: boolean; on: () => void }[] = [
      { label: t('result.retry'), on: () => restart(s, s.sim.stage.id) },
    ];
    if (next) bs.push({ label: t('result.next'), primary: true, on: () => restart(s, next) });
    bs.push({ label: t('result.home'), primary: !next, on: () => home(s) });
    const bw = 100;
    const gap = 8;
    const total = bs.length * bw + (bs.length - 1) * gap;
    bs.forEach((b, i) => {
      c.add(
        new Button(s, 320 - total / 2 + bw / 2 + i * (bw + gap), 0, {
          w: bw,
          h: 20,
          label: b.label,
          size: 9,
          variant: b.primary ? 'primary' : 'default',
          onClick: b.on,
        }),
      );
    });
    return c;
  };
  step(() => {
    const btns = buttons();
    root.add(btns);
    btns.setScale(0.8);
    s.tweens.add({ targets: btns, scale: 1, duration: 180, ease: 'Back.easeOut' });
  });

  // 진행: 0.56초마다 한 단계 — 화면을 누르면 남은 단계를 한꺼번에(버튼은 위에 있어 그대로 눌린다)
  let idx = 0;
  const run = (): void => {
    if (idx < steps.length) steps[idx++]();
  };
  const timer = s.time.addEvent({
    delay: 560,
    loop: true,
    callback: () => {
      run();
      if (idx >= steps.length) timer.remove();
    },
  });
  s.time.delayedCall(180, run);
  root.setSize(640, 360);
  root.setInteractive(new Phaser.Geom.Rectangle(0, 0, 640, 360), Phaser.Geom.Rectangle.Contains);
  root.on('pointerdown', () => {
    while (idx < steps.length) run();
    timer.remove();
  });
}

function restart(s: BattleScene, stageId: string): void {
  const d = s.data0;
  overlay(s).transitionTo('Battle', 'Battle', { ...d, stageId });
}

function home(s: BattleScene): void {
  overlay(s).transitionTo('Battle', s.data0.returnTo ?? (s.data0.practice ? 'Title' : 'Hub'));
}
