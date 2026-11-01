// '다음 할 일' 패널: 지금 상태에서 핵심 루프(심기 → 돌보기 → 어린잎 → 출격 → 다음 스테이지)의 다음 걸음을 한 줄로 알려 준다.
// 패널을 누르면 그 대상으로 화면이 미끄러지고(화살표가 콕콕), 바로 할 수 있는 일(돌보기 · 씨앗 고르기 · 출격)을 연다.
// '?' 는 게임 방법 창. 처음 하는 사람이 '무엇을 해야 하지?' 하고 멈추는 순간을 없애는 것이 목적이다.

import Phaser from 'phaser';
import { buildFlowArrow } from '../../art/BattleMapArt';
import { RAMPS, SPECIAL } from '../../art/palette';
import { t } from '../../i18n';
import { Button } from '../../ui/Button';
import { ensurePanel } from '../../ui/Frames';
import { howToPlayModal } from '../../ui/HowToPlay';
import { iconTexture } from '../../ui/IconTex';
import { pixelText } from '../../ui/PixelText';
import type { HubScene } from '../HubScene';
import { overlay } from '../UIOverlay';
import { currentGoal, type Goal } from './goalLogic';
import { openCare, openSeedPicker, sortie } from './HubActions';

const DEPTH = 60;

export class HubGoal {
  private readonly box: Phaser.GameObjects.Container;
  private readonly label: Phaser.GameObjects.Text;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly bg: Phaser.GameObjects.Image;
  private readonly arrow: Phaser.GameObjects.Image;
  private goal: Goal | null = null;
  private arrowUntil = 0;

  constructor(private readonly s: HubScene) {
    if (!s.textures.exists('hub:goalArrow')) buildFlowArrow(2).toTexture(s, 'hub:goalArrow');
    this.bg = s.add.image(0, 0, ensurePanel(s, 'leaf', 200, 20)).setOrigin(0, 0);
    this.icon = s.add.image(5, 4, iconTexture(s, 'seed')).setOrigin(0, 0);
    const tag = pixelText(s, 20, 5, t('hub.goal.title'), {
      size: 7,
      bold: true,
      color: RAMPS.R1[1],
    });
    this.label = pixelText(s, 20 + Math.round(tag.width) + 4, 4, '', {
      size: 9,
      color: SPECIAL.INK,
    });
    this.box = s.add.container(8, 32, [this.bg, this.icon, tag, this.label]).setDepth(DEPTH);
    const hit = s.add.zone(0, 0, 200, 20).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.box.setY(33));
    hit.on('pointerout', () => this.box.setY(32));
    hit.on('pointerup', () => {
      this.box.setY(32);
      this.act();
    });
    this.box.add(hit);
    const help = new Button(s, 0, 0, {
      w: 18,
      h: 18,
      label: '?',
      size: 9,
      bold: true,
      onClick: () => overlay(s).openModal(howToPlayModal()),
    });
    this.box.add(help);
    this.arrow = s.add.image(0, 0, 'hub:goalArrow').setOrigin(0.5, 1).setVisible(false);
    s.world.add(this.arrow);
    this.refresh();
  }

  refresh(): void {
    const g = currentGoal(this.s.state);
    const changed = !this.goal || g.id !== this.goal.id || g.text !== this.goal.text;
    this.goal = g;
    if (!changed) return;
    this.label.setText(g.text);
    this.icon.setTexture(iconTexture(this.s, g.icon));
    const w = Math.round(this.label.x + this.label.width + 8);
    this.bg.setTexture(ensurePanel(this.s, 'leaf', w, 20));
    const hit = this.box.list.find(
      (o) => o instanceof Phaser.GameObjects.Zone,
    ) as Phaser.GameObjects.Zone;
    hit.setSize(w, 20);
    const help = this.box.list.find((o) => o instanceof Button) as Button | undefined;
    help?.setPosition(w + 12, 10);
    this.s.tweens.add({ targets: this.box, scaleX: 1.04, scaleY: 1.04, duration: 90, yoyo: true });
    // 처음 하는 사람에게는(심기 · 출격 단계) 화살표를 계속 보여 준다
    this.arrowUntil = g.id === 'plant' || g.id === 'sortie' ? Number.POSITIVE_INFINITY : 0;
  }

  /** 패널 누름: 대상으로 미끄러진 뒤 바로 할 수 있는 일을 연다 */
  private act(): void {
    const g = this.goal;
    if (!g) return;
    if (g.target) {
      this.s.glide(g.target.x - 320 - this.s.pan);
      this.arrowUntil = Math.max(this.arrowUntil, this.s.time.now + 3500);
    }
    this.s.time.delayedCall(380, () => {
      if (g.id === 'plant') openSeedPicker(this.s, null);
      else if ((g.id === 'care' || g.id === 'grow') && g.uid) openCare(this.s, g.uid);
      else if (g.id === 'sortie' || g.id === 'next' || g.id === 'master') sortie(this.s);
    });
  }

  update(time: number): void {
    const g = this.goal;
    const show = !!g?.target && time < this.arrowUntil;
    this.arrow.setVisible(show);
    if (show && g?.target) {
      const bob = Math.floor(time / 220) % 4;
      this.arrow.setPosition(g.target.x, g.target.y - 40 - (bob === 1 || bob === 2 ? 2 : 0));
    }
  }
}
