// 툴팁 (10문서 3절): PC 는 마우스 올리기, 모바일은 길게 누르기. 모든 아이콘 · 식물 · 적에 붙인다.

import Phaser from 'phaser';
import { SPECIAL } from '../art/palette';
import { ensurePanel } from './Frames';
import { pixelText } from './PixelText';

export interface TooltipHost {
  show(text: string, x: number, y: number): void;
  hide(): void;
}

const HOVER_MS = 250;
const LONG_PRESS_MS = 400;

/** 씬마다 한 개. 월드(안전 영역) 좌표 기준으로 패널을 띄운다. */
export class Tooltip implements TooltipHost {
  private holder: Phaser.GameObjects.Container | undefined;

  constructor(private readonly scene: Phaser.Scene) {}

  show(text: string, x: number, y: number): void {
    this.hide();
    const label = pixelText(this.scene, 0, 0, text, {
      size: 11,
      anchorX: 0.5,
      anchorY: 0.5,
      color: SPECIAL.INK,
      align: 'center',
    });
    const w = Math.ceil(label.width) + 14;
    const h = Math.ceil(label.height) + 10;
    const panel = this.scene.add.image(0, 0, ensurePanel(this.scene, 'wood', w, h)).setOrigin(0.5);
    // 안전 영역 안으로 밀어 넣기(640×360)
    const px = Math.round(Math.max(w / 2 + 2, Math.min(640 - w / 2 - 2, x)));
    const py = Math.round(Math.max(h / 2 + 2, Math.min(360 - h / 2 - 2, y - h / 2 - 8)));
    this.holder = this.scene.add.container(px, py, [panel, label]).setDepth(500);
    this.holder.setScale(0.9).setAlpha(0);
    this.scene.tweens.add({
      targets: this.holder,
      scale: 1,
      alpha: 1,
      duration: 120,
      ease: 'Back.easeOut',
    });
  }

  hide(): void {
    this.holder?.destroy();
    this.holder = undefined;
  }

  /** 대상에 마우스 올리기 · 길게 누르기 툴팁을 단다 */
  attach(
    target: Phaser.GameObjects.GameObject,
    text: () => string,
    anchor: () => { x: number; y: number },
  ): void {
    let timer: Phaser.Time.TimerEvent | undefined;
    const arm = (delay: number) => {
      timer?.remove();
      timer = this.scene.time.delayedCall(delay, () => {
        const a = anchor();
        this.show(text(), a.x, a.y);
      });
    };
    const disarm = () => {
      timer?.remove();
      this.hide();
    };
    target.on('pointerover', () => arm(HOVER_MS));
    target.on('pointerout', disarm);
    target.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) arm(LONG_PRESS_MS);
    });
    target.on('pointerup', disarm);
    target.once(Phaser.GameObjects.Events.DESTROY, disarm);
  }
}
