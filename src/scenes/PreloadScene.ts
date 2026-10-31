// 로딩: 씨앗이 싹트는 진행 바 (10문서 2절). 에셋은 전부 코드로 만들기 때문에 단계별로 텍스처를 굽는다.
// 반응 없이 1초 넘게 기다리게 하지 않는다 — 진행 바를 먼저 보여 주고 단계마다 진행한다.

import Phaser from 'phaser';
import { createFxTextures, FX } from '../art/FxTextures';
import { buildTitleBackdrop } from '../art/TitleBackdrop';
import { RAMPS, SPECIAL, toInt } from '../art/palette';
import { t } from '../i18n';
import { ensureButton, ensurePanel, type ButtonState } from '../ui/Frames';
import { applySafeArea, setBackdrop } from '../ui/Layout';
import { pixelText } from '../ui/PixelText';
import { demoData } from './battle/BattleDemo';
import { getApp } from './context';
import { overlay } from './UIOverlay';

const DEBUG_SCENES = ['ArtGallery', 'UIKit', 'AbilityDemo'];
const BAR_W = 160;
const BAR_X = 320 - BAR_W / 2;
const BAR_Y = 188;
/** 자주 쓰는 버튼 크기 [w, h] */
const BUTTON_SIZES: [number, number][] = [
  [96, 20],
  [104, 20],
  [16, 16],
];

export class PreloadScene extends Phaser.Scene {
  private steps: (() => void)[] = [];
  private done = 0;
  private fill!: Phaser.GameObjects.Rectangle;
  private shine!: Phaser.GameObjects.Rectangle;
  private plant!: Phaser.GameObjects.Image;
  private shown = 0;

  constructor() {
    super('Preload');
  }

  create(): void {
    setBackdrop(RAMPS.R4[0]);
    applySafeArea(this);
    this.cameras.main.setBackgroundColor(RAMPS.R4[0]);

    createFxTextures(this);
    pixelText(this, 320, BAR_Y - 40, t('boot.loading'), {
      size: 11,
      color: SPECIAL.PAPER,
      anchorX: 0.5,
      anchorY: 0.5,
    });
    this.add.rectangle(BAR_X - 2, BAR_Y - 2, BAR_W + 4, 8, toInt(RAMPS.R10[0])).setOrigin(0, 0);
    this.add.rectangle(BAR_X - 1, BAR_Y - 1, BAR_W + 2, 6, toInt(RAMPS.R10[1])).setOrigin(0, 0);
    this.fill = this.add.rectangle(BAR_X, BAR_Y, 0, 4, toInt(RAMPS.R1[2])).setOrigin(0, 0);
    this.shine = this.add.rectangle(BAR_X, BAR_Y, 0, 1, toInt(RAMPS.R1[3])).setOrigin(0, 0);
    this.plant = this.add.image(BAR_X, BAR_Y - 2, FX.seed).setOrigin(0.5, 1);

    this.steps = [
      () => buildTitleBackdrop().toTexture(this, 'title:backdrop'),
      () => this.warmUi(),
    ];
    // 단계마다 짧게 쉬며 진행 바를 채운다(씬 시간 사용)
    this.time.addEvent({
      delay: 140,
      repeat: this.steps.length - 1,
      callback: () => {
        this.steps[this.done]();
        this.done += 1;
        this.advance(this.done / this.steps.length);
        if (this.done === this.steps.length) this.time.delayedCall(220, () => this.finish());
      },
    });
  }

  /** 타이틀·모달에서 바로 쓰는 버튼 · 패널 프레임을 미리 구워 둔다(첫 상호작용에서 끊기지 않게). */
  private warmUi(): void {
    const states: ButtonState[] = ['normal', 'hover', 'pressed', 'disabled'];
    for (const variant of ['default', 'primary'] as const) {
      for (const state of states) {
        for (const [w, h] of BUTTON_SIZES) ensureButton(this, variant, state, w, h);
      }
    }
    ensurePanel(this, 'wood', 260, 120);
  }

  private advance(progress: number): void {
    const target = Math.round(BAR_W * progress);
    this.tweens.add({
      targets: this,
      shown: target,
      duration: 200,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        const w = Math.round(this.shown);
        this.fill.width = w;
        this.shine.width = Math.max(0, w - 1);
        this.plant.x = BAR_X + w;
        this.plant.setTexture(
          w < BAR_W * 0.3 ? FX.seed : w < BAR_W * 0.75 ? FX.sprout1 : FX.sprout2,
        );
      },
    });
  }

  private finish(): void {
    // 디버그: ?scene=ArtGallery · UIKit 으로 바로 연다(스크린샷 · 테스트용)
    const direct = new URLSearchParams(window.location.search).get('scene');
    const target =
      getApp(this).services.debug && direct && DEBUG_SCENES.includes(direct) ? direct : 'Title';
    if (target === 'AbilityDemo') {
      const plant = new URLSearchParams(window.location.search).get('plant') ?? 'P011';
      overlay(this).transitionTo('Preload', 'Battle', demoData(plant));
      return;
    }
    overlay(this).transitionTo('Preload', target);
  }
}
