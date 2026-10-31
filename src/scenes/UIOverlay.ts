// UI 오버레이 씬: 모달 · 토스트 · 저장 표시 · 화면 전환을 한 곳에서 맡는다(10문서 2절).
// 다른 씬 위에 항상 떠 있고, 장면이 바뀌어도 살아남는다.

import Phaser from 'phaser';
import { PixelCanvas } from '../art/PixelCanvas';
import { RAMPS, SPECIAL } from '../art/palette';
import { t } from '../i18n';
import { applySafeArea } from '../ui/Layout';
import { Modal, type ModalDef } from '../ui/Modal';
import { ensurePanel } from '../ui/Frames';
import { pixelText } from '../ui/PixelText';
import { SoilDissolve } from '../ui/Transitions';
import { getApp } from './context';

export const OVERLAY_KEY = 'UIOverlay';

const SPROUT_KEY = 'ui:save-sprout';
const TRANSITION_MS = 150; // 덮기 150 + 걷기 150 = 300ms

function ensureSprout(scene: Phaser.Scene): string {
  if (scene.textures.exists(SPROUT_KEY)) return SPROUT_KEY;
  const c = new PixelCanvas(9, 8);
  c.stamp(
    0,
    0,
    [
      '.LL...LL.',
      'LLLL.LLLL',
      '.LLLsLLL.',
      '...sss...',
      '....s....',
      '....s....',
      '..ddsdd..',
      '.ddddddd.',
    ],
    { L: RAMPS.R1[3], s: RAMPS.R1[2], d: RAMPS.R10[2] },
  );
  return c.toTexture(scene, SPROUT_KEY);
}

export class UIOverlay extends Phaser.Scene {
  private modal!: Modal;
  private dissolve!: SoilDissolve;
  private transitioning = false;
  private saveIcon!: Phaser.GameObjects.Image;
  private toastHolder: Phaser.GameObjects.Container | undefined;
  private inputShield!: Phaser.GameObjects.Zone;

  constructor() {
    super(OVERLAY_KEY);
  }

  create(): void {
    applySafeArea(this);
    this.modal = new Modal(this);
    this.dissolve = new SoilDissolve(this);

    // 전환 중에는 아래 장면이 입력을 받지 못하게 막는다
    this.inputShield = this.add.zone(-80, 0, 800, 360).setOrigin(0, 0).setDepth(999);
    this.inputShield.setInteractive();
    this.inputShield.disableInteractive();

    // 자동 저장 표시: 오른쪽 위 작은 새싹 아이콘이 돈다(10문서 5절)
    this.saveIcon = this.add.image(628, 12, ensureSprout(this)).setDepth(300).setVisible(false);
    const { bus } = getApp(this).services;
    const offDone = bus.on('save:done', () => this.showSaved());
    const offFail = bus.on('save:failed', () => this.toast(t('save.failed')));
    this.events.once('shutdown', () => {
      offDone();
      offFail();
    });
  }

  // ---- 모달 ----
  openModal(def: ModalDef): void {
    this.modal.open(def);
  }

  closeModal(): void {
    this.modal.close();
  }

  get hasModal(): boolean {
    return this.modal.isOpen;
  }

  // ---- 전환 ----
  /** from 씬을 멈추고 to 씬을 연다. 흙 디졸브로 덮은 뒤 바꾸고 걷는다. */
  transitionTo(from: string, to: string, data?: object): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.inputShield.setInteractive();
    this.dissolve.cover(TRANSITION_MS, () => {
      this.game.scene.stop(from);
      this.game.scene.start(to, data);
      // 새 장면이 첫 프레임을 그릴 시간을 한 틱 주고 걷는다
      this.time.delayedCall(40, () => {
        this.dissolve.uncover(TRANSITION_MS, () => {
          this.transitioning = false;
          this.inputShield.disableInteractive();
        });
      });
    });
  }

  get isTransitioning(): boolean {
    return this.transitioning;
  }

  // ---- 저장 표시 ----
  private showSaved(): void {
    const icon = this.saveIcon;
    this.tweens.killTweensOf(icon);
    icon.setVisible(true).setY(12).setScale(1);
    // 통통 튀며 한 번 도는 느낌: ±15% 이내 스케일
    this.tweens.add({
      targets: icon,
      y: { from: 14, to: 12 },
      scaleX: { from: 1.15, to: 1 },
      scaleY: { from: 0.88, to: 1 },
      duration: 140,
      ease: 'Back.easeOut',
    });
    this.time.delayedCall(900, () => icon.setVisible(false));
    getApp(this).sfx.play('save_tick');
  }

  // ---- 토스트 ----
  toast(text: string): void {
    this.toastHolder?.destroy();
    const label = pixelText(this, 0, 0, text, {
      size: 11,
      anchorX: 0.5,
      anchorY: 0.5,
      color: SPECIAL.INK,
    });
    const w = Math.min(420, Math.ceil(label.width) + 28);
    const h = 26;
    const panel = this.add.image(0, 0, ensurePanel(this, 'wood', w, h)).setOrigin(0.5, 0.5);
    const holder = this.add.container(320, -h, [panel, label]).setDepth(200);
    this.toastHolder = holder;
    this.tweens.add({ targets: holder, y: 22, duration: 220, ease: 'Back.easeOut' });
    this.time.delayedCall(3200, () => {
      this.tweens.add({
        targets: holder,
        y: -h,
        duration: 180,
        ease: 'Cubic.easeIn',
        onComplete: () => holder.destroy(),
      });
    });
  }
}

/** 어느 씬에서든 오버레이를 꺼내 쓴다. */
export function overlay(scene: Phaser.Scene): UIOverlay {
  return scene.scene.get(OVERLAY_KEY) as UIOverlay;
}
