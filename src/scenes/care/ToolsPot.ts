// 돌봄 도구 13종의 손놀림 (04문서 5절). 입력(누르기 · 문지르기 · 끌기)을 읽어 로직(systems/garden)에 결과값을 넘기고,
// 돌려받은 결과를 host.perform() 으로 표정 · 몸짓 · 소리로 바로(같은 프레임에) 보여 준다.

import Phaser from 'phaser';
import { gridToCanvas } from '../../art/GridCanvas';
import { POT_STYLE_OF } from '../../art/HubArt';
import { RAMPS, toInt } from '../../art/palette';
import { generatePot } from '../../art/PotSpriteGen';
import { POTS } from '../../data/pots';
import { SOILS } from '../../data/soils';
import { t } from '../../i18n';
import { itemName } from '../../i18n/names';
import { countOf, potKey } from '../../systems/economy/Inventory';
import { repot, stake } from '../../systems/garden/CareTools';
import { needsRepot } from '../../systems/garden/Growth';
import { Tool } from './ToolBase';

// ---------- 10. 분갈이 ----------
export class RepotTool extends Tool {
  readonly action = 'REPOT' as const;
  readonly hint = t('care.hint.repot');
  private step: 'pull' | 'pot' | 'soil' | 'fill' | 'pat' = 'pull';
  private startedAt = 0;
  private pullFrom = 0;
  private dragging = false;
  private taps = 0;
  private potId = '';
  private soilId = 'BASIC';
  private trayBox: Phaser.GameObjects.Container | undefined;
  private roots: Phaser.GameObjects.Graphics | undefined;

  /** 돌보기 씬의 식물 · 화분(월드 ×2 컨테이너 안) */
  private get care(): {
    root: Phaser.GameObjects.Container;
    view: Phaser.GameObjects.Container;
    potImg: Phaser.GameObjects.Image;
  } {
    return this.h.sc as unknown as {
      root: Phaser.GameObjects.Container;
      view: Phaser.GameObjects.Container;
      potImg: Phaser.GameObjects.Image;
    };
  }

  /** 뽑기: 식물이 화분 위로 쑥 들어 올려지고 흙 묻은 뿌리가 대롱대롱 */
  private liftPlant(): void {
    const c = this.care;
    const g = this.h.sc.add.graphics();
    g.fillStyle(toInt(RAMPS.R10[1]), 1);
    for (const [x, len] of [
      [-3, 6],
      [-1, 8],
      [1, 7],
      [3, 5],
    ] as const)
      g.fillRect(x, 0, 1, len);
    g.fillStyle(toInt(RAMPS.R10[2]), 1).fillRect(-4, -1, 9, 3);
    g.setPosition(0, -11);
    c.root.addAt(g, 0);
    this.roots = g;
    this.h.puff(c.root.x, c.root.y - 20, 'soil');
    this.h.sc.tweens.add({ targets: [c.view, g], y: '-=22', duration: 320, ease: 'Back.easeOut' });
    this.h.sc.tweens.add({
      targets: g,
      angle: { from: -6, to: 6 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  /** 화분 바꾸기: 원래 화분은 옆으로 미끄러져 치워지고, 새 화분이 반대편에서 들어와 자리 잡는다 */
  private swapPot(potId: string): void {
    const c = this.care;
    const old = c.potImg;
    const sc = this.h.sc;
    const style = POT_STYLE_OF[potId] ?? 'clay';
    const key = `pot:${style}`;
    if (!sc.textures.exists(key)) sc.textures.addCanvas(key, gridToCanvas(generatePot(style)));
    sc.tweens.add({
      targets: old,
      x: -70,
      y: 6,
      duration: 260,
      ease: 'Cubic.easeIn',
      onComplete: () => old.setVisible(false),
    });
    const fresh = sc.add.image(70, -4, key).setOrigin(0.5, 1);
    c.root.add(fresh);
    sc.tweens.add({ targets: fresh, x: 0, y: 0, delay: 200, duration: 320, ease: 'Back.easeOut' });
    sc.time.delayedCall(540, () => this.h.puff(c.root.x, c.root.y - 4, 'soil'));
  }

  override enter(): void {
    const { plant, state } = this.h;
    const size = ((plant.timers.potSize as number | undefined) ?? 1) + 1;
    if (plant.stage < 2 || size > 3) {
      this.h.hint(t(plant.stage < 2 ? 'care.repot.tooYoung' : 'care.repot.maxed'));
      this.step = 'pull';
      return;
    }
    if (!Object.keys(POTS).some((id) => countOf(state, potKey(id, size)) > 0)) {
      this.h.hint(t('care.repot.noPot'));
      return;
    }
    this.startedAt = this.h.sc.time.now;
    this.step = 'pull';
    this.h.hint(needsRepot(plant) ? t('care.repot.rootbound') : t('care.repot.step.pull'));
  }
  override down(p: Phaser.Input.Pointer): void {
    if (this.step === 'pull' && this.h.overPlant(p.worldX, p.worldY, 6)) {
      this.dragging = true;
      this.pullFrom = p.worldY;
      this.h.perform({ ok: true, perfect: false, reaction: 'surprise', sfx: 'dig' });
    } else if (
      (this.step === 'fill' || this.step === 'pat') &&
      this.h.overPlant(p.worldX, p.worldY, 14)
    ) {
      this.taps++;
      this.h.puff(p.worldX, p.worldY, 'soil');
      this.h.perform({
        ok: true,
        perfect: false,
        reaction: this.step === 'pat' ? 'happy' : 'ticklish',
        sfx: 'dig',
      });
      if (this.taps >= 3) {
        this.taps = 0;
        if (this.step === 'fill') {
          this.step = 'pat';
          this.h.hint(t('care.repot.step.pat'));
        } else this.finish();
      }
    }
  }
  override move(p: Phaser.Input.Pointer): void {
    if (this.step === 'pull' && this.dragging && this.pullFrom - p.worldY >= 28) {
      this.dragging = false;
      this.step = 'pot';
      this.liftPlant();
      this.showPotTray();
    }
  }
  override up(): void {
    this.dragging = false;
  }
  private showPotTray(): void {
    const size = ((this.h.plant.timers.potSize as number | undefined) ?? 1) + 1;
    const entries = Object.keys(POTS)
      .filter((id) => countOf(this.h.state, potKey(id, size)) > 0)
      .map((id) => ({
        id,
        label: itemName(potKey(id, size)),
        count: countOf(this.h.state, potKey(id, size)),
        icon: 'pot',
      }));
    this.h.hint(t('care.repot.step.pot'));
    this.trayBox?.destroy();
    this.trayBox = this.own(
      this.h.tray(entries, (id) => {
        this.potId = id;
        this.swapPot(id);
        this.step = 'soil';
        this.showSoilTray();
      }),
    );
  }
  private showSoilTray(): void {
    const entries = [
      { id: 'BASIC', label: t('soil.BASIC'), icon: 'compost' },
      ...Object.keys(SOILS)
        .filter((id) => id !== 'BASIC' && countOf(this.h.state, `soil:${id}`) > 0)
        .map((id) => ({
          id,
          label: t(`soil.${id}`),
          count: countOf(this.h.state, `soil:${id}`),
          icon: 'compost',
        })),
    ];
    this.h.hint(t('care.repot.step.soil'));
    this.trayBox?.destroy();
    this.trayBox = this.own(
      this.h.tray(entries, (id) => {
        this.soilId = id;
        this.trayBox?.destroy();
        if (this.quick()) {
          this.finish();
          return;
        }
        this.step = 'fill';
        this.h.hint(t('care.repot.step.fill'));
      }),
    );
  }
  private finish(): void {
    // 들어 올렸던 식물을 새 화분에 쏙 내려 심는다
    const c = this.care;
    this.h.sc.tweens.killTweensOf(this.roots ?? []);
    this.h.sc.tweens.add({ targets: c.view, y: -11, duration: 200, ease: 'Cubic.easeIn' });
    this.roots?.destroy();
    this.roots = undefined;
    const seconds = (this.h.sc.time.now - this.startedAt) / 1000;
    this.h.perform(repot(this.h.ctx(), this.potId, this.soilId, seconds));
    this.h.syncProblems();
    this.step = 'pull';
    this.trayBox?.destroy();
  }
}

// ---------- 11. 지지대 ----------
export class StakeTool extends Tool {
  readonly action = 'STAKE' as const;
  readonly hint = t('care.hint.stake');
  private carrying = false;
  private ghost: Phaser.GameObjects.Image | undefined;
  private guide: Phaser.GameObjects.Graphics | undefined;

  override enter(): void {
    if (!this.h.base.care.needsStake || this.h.plant.flags.staked) {
      this.h.hint(t('care.stake.notNeeded'));
      return;
    }
    // 줄기 위치 안내선
    this.guide = this.own(this.h.sc.add.graphics().setDepth(30));
    const b = this.h.body;
    this.guide
      .lineStyle(1, toInt(RAMPS.R9[4]), 1)
      .lineBetween(this.h.stemX, b.y + 6, this.h.stemX, b.bottom);
    const stand = this.own(
      this.h.sc.add
        .image(300, 250, 'icon:stake')
        .setDepth(60)
        .setInteractive({ useHandCursor: true }),
    );
    stand.setScale(2);
    stand.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.carrying = true;
      this.ghost = this.own(
        this.h.sc.add.image(p.worldX, p.worldY, 'icon:stake').setScale(2).setDepth(80),
      );
    });
  }
  override move(p: Phaser.Input.Pointer): void {
    this.ghost?.setPosition(Math.round(p.worldX), Math.round(p.worldY));
  }
  override up(p: Phaser.Input.Pointer): void {
    if (!this.carrying) return;
    this.carrying = false;
    this.ghost?.destroy();
    if (!this.h.overPlant(p.worldX, p.worldY, 12)) {
      this.h.hint(t('care.dragToStem'));
      return;
    }
    // 장면은 2배 확대라 1px 오차 = 장면 2px
    const offset = (p.worldX - this.h.stemX) / 2;
    this.h.perform(stake(this.h.ctx(), offset));
    this.h.syncProblems();
    this.leave();
  }
}
