// 돌봄 도구 13종의 손놀림 (04문서 5절). 입력(누르기 · 문지르기 · 끌기)을 읽어 로직(systems/garden)에 결과값을 넘기고,
// 돌려받은 결과를 host.perform() 으로 표정 · 몸짓 · 소리로 바로(같은 프레임에) 보여 준다.

import Phaser from 'phaser';
import { RAMPS, toInt } from '../../art/palette';
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
