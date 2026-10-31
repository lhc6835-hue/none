// 버튼 (02문서 8절 · 10문서 3절)
//  호버: 1px 들림 + 밝은 외곽선 / 누름: 1px 내려감 + 그림자 사라짐 / 뗌: 120ms 탄성 복귀(easeOutBack)
//  모든 입력은 같은 프레임 안에 소리와 시각 반응을 시작한다.

import Phaser from 'phaser';
import { SPECIAL, RAMPS, toInt } from '../art/palette';
import { getApp } from '../scenes/context';
import { BUTTON_BODY_TOP, ensureButton, type ButtonState, type ButtonVariant } from './Frames';
import { pixelText, type FontSize } from './PixelText';

export interface ButtonOptions {
  /** 몸통 크기(그림자 제외). 높이는 16 이상(터치 판정 16×16px) */
  w: number;
  h?: number;
  /** 이미 번역된 글자 */
  label: string;
  size?: FontSize;
  bold?: boolean;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** 글자 왼쪽에 붙일 아이콘 텍스처 키 */
  icon?: string;
  onClick: () => void;
}

export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Image;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly bw: number;
  private readonly bh: number;
  private readonly variant: ButtonVariant;
  private btnState: ButtonState = 'normal';
  private hovering = false;
  private onClick: () => void;
  private releaseTween: Phaser.Tweens.Tween | undefined;
  private iconImage: Phaser.GameObjects.Image | undefined;
  private iconDx = 0;
  private labelDx = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, Math.round(x), Math.round(y));
    this.bw = opts.w;
    this.bh = Math.max(16, opts.h ?? 20);
    this.variant = opts.variant ?? 'default';
    this.onClick = opts.onClick;

    this.bg = scene.add.image(0, 0, ensureButton(scene, this.variant, 'normal', this.bw, this.bh));
    this.bg.setOrigin(0.5, 0);
    this.labelText = pixelText(scene, 0, 0, opts.label, {
      size: opts.size ?? 11,
      bold: opts.bold,
      color: SPECIAL.INK,
      anchorX: 0.5,
      anchorY: 0.5,
    });
    this.add([this.bg, this.labelText]);
    if (opts.icon) {
      this.iconImage = scene.add.image(0, 0, opts.icon);
      this.add(this.iconImage);
      this.iconDx = Math.round(-this.bw / 2 + 4 + this.iconImage.width / 2);
      this.labelDx = Math.round(this.iconImage.width / 2 + 2);
    }

    this.setSize(this.bw, this.bh);
    this.setInteractive(
      // 컨테이너의 히트 영역은 왼쪽 위 기준(표시 원점 = 크기/2 가 더해진다)이라 (0,0)에서 시작해야 중앙에 놓인다
      new Phaser.Geom.Rectangle(0, 0, this.bw, this.bh),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input!.cursor = 'pointer';
    this.on('pointerover', this.handleOver, this);
    this.on('pointerout', this.handleOut, this);
    this.on('pointerdown', this.handleDown, this);
    this.on('pointerup', this.handleUp, this);

    this.applyState(opts.disabled ? 'disabled' : 'normal');
    scene.add.existing(this);
  }

  // 컨테이너의 (0,0) = 몸통(보통 상태)의 가운데. 텍스처는 몸통이 y=1 에서 시작한다.
  private applyState(state: ButtonState): void {
    this.btnState = state;
    this.bg.setTexture(ensureButton(this.scene, this.variant, state, this.bw, this.bh));
    this.bg.setPosition(0, -this.bh / 2 - BUTTON_BODY_TOP.normal);
    const dy = BUTTON_BODY_TOP[state] - BUTTON_BODY_TOP.normal;
    this.labelText.setPosition(this.labelDx, Math.round(dy + 0.5)); // 가운데 정렬 보정
    this.iconImage?.setPosition(this.iconDx, Math.round(dy + 0.5));
    if (state === 'disabled') this.iconImage?.setTintFill(toInt(RAMPS.R11[2]));
    else this.iconImage?.clearTint();
    this.labelText.setColor(state === 'disabled' ? RAMPS.R11[1] : SPECIAL.INK);
  }

  private audio(): {
    unlock: () => void;
    play: (id: 'ui_click' | 'ui_hover' | 'ui_release') => void;
  } {
    const app = getApp(this.scene);
    return {
      unlock: () => app.audio.unlock(),
      play: (id) => void app.sfx.play(id),
    };
  }

  private handleOver(): void {
    this.hovering = true;
    if (this.btnState === 'disabled') return;
    this.applyState('hover');
    this.audio().play('ui_hover');
  }

  private handleOut(): void {
    this.hovering = false;
    if (this.btnState === 'disabled') return;
    this.releaseTween?.stop();
    this.applyState('normal');
  }

  private handleDown(): void {
    const a = this.audio();
    a.unlock();
    if (this.btnState === 'disabled') {
      // 비활성 버튼을 눌렀을 때: 팝업 대신 흔들림 + 둔탁한 소리 (실패 표현, 10문서 3절)
      getApp(this.scene).sfx.play('ui_error');
      this.shake();
      return;
    }
    this.applyState('pressed');
    a.play('ui_click');
  }

  private handleUp(): void {
    if (this.btnState !== 'pressed') return;
    const a = this.audio();
    a.unlock();
    a.play('ui_release');
    this.applyState(this.hovering ? 'hover' : 'normal');
    // 120ms 탄성 복귀: 라벨이 1px 눌려 있다가 easeOutBack 으로 돌아온다
    this.releaseTween?.stop();
    const target = this.labelText.y;
    this.labelText.y = target + 1;
    this.releaseTween = this.scene.tweens.add({
      targets: this.labelText,
      y: target,
      duration: 120,
      ease: 'Back.easeOut',
    });
    this.onClick();
  }

  private shake(): void {
    this.scene.tweens.add({
      targets: this,
      x: { from: this.x - 2, to: this.x },
      duration: 160,
      ease: 'Bounce.easeOut',
    });
  }

  setLabel(text: string): this {
    this.labelText.setText(text);
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.applyState(disabled ? 'disabled' : this.hovering ? 'hover' : 'normal');
    return this;
  }

  get isDisabled(): boolean {
    return this.btnState === 'disabled';
  }

  setOnClick(fn: () => void): this {
    this.onClick = fn;
    return this;
  }
}
