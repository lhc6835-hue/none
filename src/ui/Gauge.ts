// 게이지 (02문서 8절): 홈 + 채움 + 1px 광택. 값이 바뀌면 굴러가며 채워진다(선형 트윈 금지, 진행 바 제외).
// 욕구(수분 · 양분 · 청결 · 기분)처럼 0–100 값을 보여 준다. 색은 팔레트 램프에서 고른다.

import Phaser from 'phaser';
import { RAMPS, SPECIAL, toInt, type Ramp } from '../art/palette';
import { numberText } from './NumberFont';

export type GaugeColor = 'water' | 'nutrition' | 'hygiene' | 'mood' | 'hp';

const FILLS: Record<GaugeColor, Ramp> = {
  water: RAMPS.R4,
  nutrition: RAMPS.R8,
  hygiene: RAMPS.R3,
  mood: RAMPS.R6,
  hp: RAMPS.R1,
};

export class Gauge extends Phaser.GameObjects.Container {
  private value: number;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly shine: Phaser.GameObjects.Rectangle;
  private readonly warn: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Container | undefined;
  private readonly inner: number;
  private readonly ramp: Ramp;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly barW: number,
    color: GaugeColor,
    value = 100,
    private readonly showNumber = true,
    private readonly numberColor: string = SPECIAL.INK,
  ) {
    super(scene, Math.round(x), Math.round(y));
    this.ramp = FILLS[color];
    this.inner = barW - 2;
    this.value = value;
    const frame = scene.add.rectangle(0, 0, barW, 7, toInt(SPECIAL.INK)).setOrigin(0, 0);
    const track = scene.add.rectangle(1, 1, this.inner, 5, toInt(RAMPS.R10[1])).setOrigin(0, 0);
    this.fill = scene.add.rectangle(1, 1, 0, 5, toInt(this.ramp[2])).setOrigin(0, 0);
    this.shine = scene.add.rectangle(1, 1, 0, 1, toInt(this.ramp[4])).setOrigin(0, 0);
    // 낮을 때(25 미만) 경고색 테두리 줄이 한 번 깜빡인다
    this.warn = scene.add
      .rectangle(1, 5, 0, 1, toInt(RAMPS.R7[3]))
      .setOrigin(0, 0)
      .setVisible(false);
    this.add([frame, track, this.fill, this.shine, this.warn]);
    this.apply(value);
    scene.add.existing(this);
  }

  private apply(v: number): void {
    const px = Math.round((this.inner * Math.max(0, Math.min(100, v))) / 100);
    this.fill.width = px;
    this.shine.width = px;
    this.warn.width = px;
    this.warn.setVisible(v < 25 && px > 0);
    if (this.showNumber) {
      this.label?.destroy();
      this.label = numberText(
        this.scene,
        this.barW + 3,
        1,
        String(Math.round(v)),
        this.numberColor,
        '3x5',
      );
      this.add(this.label);
    }
  }

  /** 굴러가며 목표값으로(300ms, easeOutCubic) */
  setValue(target: number, animate = true): this {
    const to = Math.max(0, Math.min(100, target));
    if (!animate) {
      this.value = to;
      this.apply(to);
      return this;
    }
    const state = { v: this.value };
    this.scene.tweens.killTweensOf(state);
    this.scene.tweens.add({
      targets: state,
      v: to,
      duration: 300,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.apply(state.v),
      onComplete: () => {
        this.value = to;
        this.apply(to);
      },
    });
    this.value = to;
    return this;
  }

  get current(): number {
    return this.value;
  }
}
