// 허브의 HUD: 상단 재화 · 레벨, 설정 버튼, 하단 빠른 메뉴, 좌우 이동 화살표 (10문서 1절).
// 재화 숫자는 굴러가며 바뀌고(300ms), 얻은 양은 +N 으로 떠올랐다 사라진다.

import Phaser from 'phaser';
import { RAMPS, SPECIAL } from '../../art/palette';
import type { GameState } from '../../core/GameState';
import { t } from '../../i18n';
import { expToNext } from '../../systems/economy/PlayerLevel';
import { Button } from '../../ui/Button';
import { ensurePanel } from '../../ui/Frames';
import { Gauge } from '../../ui/Gauge';
import { iconTexture } from '../../ui/IconTex';
import { numberText } from '../../ui/NumberFont';
import { pixelText } from '../../ui/PixelText';

const DEPTH = 60;

/** 굴러가며 바뀌는 숫자(오른쪽 끝 정렬이 아니라 왼쪽 시작) */
export class RollingNumber extends Phaser.GameObjects.Container {
  private shown: number;
  private target: number;
  private glyphs: Phaser.GameObjects.Container | undefined;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    value: number,
    private readonly color: string = SPECIAL.INK,
  ) {
    super(scene, Math.round(x), Math.round(y));
    this.shown = value;
    this.target = value;
    this.draw();
    scene.add.existing(this);
  }

  get value(): number {
    return this.target;
  }

  private draw(): void {
    this.glyphs?.destroy();
    this.glyphs = numberText(this.scene, 0, 0, String(Math.round(this.shown)), this.color, '5x7');
    this.add(this.glyphs);
  }

  set(v: number, popup = true): void {
    if (v === this.target) return;
    const delta = v - this.target;
    this.target = v;
    const state = { v: this.shown };
    this.scene.tweens.killTweensOf(state);
    this.scene.tweens.add({
      targets: state,
      v,
      duration: 300,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.shown = state.v;
        this.draw();
      },
      onComplete: () => {
        this.shown = v;
        this.draw();
      },
    });
    if (popup && delta > 0) {
      const label = numberText(this.scene, this.x, this.y + 10, `+${delta}`, RAMPS.R9[3], '5x7');
      label.setDepth(DEPTH + 10);
      this.scene.tweens.add({
        targets: label,
        y: this.y + 22,
        duration: 600,
        ease: 'Cubic.easeOut',
        onComplete: () => label.destroy(),
      });
    }
  }
}

export interface HubHudHandlers {
  onSettings: () => void;
  onBag: () => void;
  onSoon: (feature: string) => void;
  onArrow: (dir: -1 | 1) => void;
}

export class HubHud {
  readonly coin: RollingNumber;
  readonly dew: RollingNumber;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly exp: Gauge;
  readonly buttons: Record<string, Button> = {};
  private readonly arrowL: Phaser.GameObjects.Image;
  private readonly arrowR: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, state: GameState, handlers: HubHudHandlers) {
    const d = (o: Phaser.GameObjects.GameObject) =>
      (o as unknown as { setDepth(n: number): void }).setDepth(DEPTH);

    // 상단 칩: 잎전 · 맑은 이슬 · 정원사 레벨
    const chip = (x: number, w: number) => {
      const img = scene.add.image(x, 6, ensurePanel(scene, 'wood', w, 22)).setOrigin(0, 0);
      d(img);
    };
    chip(8, 74);
    chip(86, 62);
    chip(152, 118);
    const icon = (x: number, name: string) =>
      d(scene.add.image(x, 10, iconTexture(scene, name)).setOrigin(0, 0));
    icon(13, 'coin');
    icon(91, 'dew');
    this.coin = new RollingNumber(scene, 28, 13, state.player.coin);
    this.dew = new RollingNumber(scene, 106, 13, state.player.dew);
    d(this.coin);
    d(this.dew);
    this.levelText = pixelText(scene, 158, 11, t('hud.level', { level: state.player.level }), {
      size: 9,
      bold: true,
    });
    d(this.levelText);
    this.exp = new Gauge(scene, 204, 14, 60, 'hygiene', 0, false);
    d(this.exp);
    this.refresh(state, false);

    // 설정 버튼
    const gear = new Button(scene, 588, 17, {
      w: 24,
      h: 20,
      label: '',
      icon: iconTexture(scene, 'gear'),
      onClick: handlers.onSettings,
    });
    gear.setDepth(DEPTH);
    this.buttons.settings = gear;

    // 하단 빠른 메뉴
    const items: { id: string; icon: string; onClick: () => void }[] = [
      { id: 'sortie', icon: 'door', onClick: () => handlers.onSoon('sortie') },
      { id: 'bag', icon: 'bag', onClick: handlers.onBag },
      { id: 'book', icon: 'book', onClick: () => handlers.onSoon('book') },
      { id: 'shop', icon: 'coin', onClick: () => handlers.onSoon('shop') },
      { id: 'deco', icon: 'star', onClick: () => handlers.onSoon('deco') },
    ];
    const bw = 66;
    const gap = 4;
    const total = items.length * bw + (items.length - 1) * gap;
    items.forEach((it, i) => {
      const b = new Button(scene, 320 - total / 2 + bw / 2 + i * (bw + gap), 337, {
        w: bw,
        h: 22,
        label: t(`hub.quick.${it.id}`),
        size: 9,
        icon: iconTexture(scene, it.icon),
        onClick: it.onClick,
      });
      b.setDepth(DEPTH);
      this.buttons[it.id] = b;
    });

    // 좌우 이동 화살표
    const arrow = (x: number, name: string, dir: -1 | 1) => {
      const img = scene.add.image(x, 180, iconTexture(scene, name)).setDepth(DEPTH);
      const hit = scene.add.zone(x, 180, 28, 56).setInteractive().setDepth(DEPTH);
      hit.on('pointerover', () => img.setY(179));
      hit.on('pointerout', () => img.setY(180));
      hit.on('pointerdown', () => {
        img.setY(181);
        handlers.onArrow(dir);
      });
      hit.on('pointerup', () => img.setY(179));
      return img;
    };
    this.arrowL = arrow(10, 'arrowL', -1);
    this.arrowR = arrow(630, 'arrowR', 1);
  }

  /** 팬 위치에 따라 끝에서는 그쪽 화살표를 숨긴다 */
  setArrows(canLeft: boolean, canRight: boolean): void {
    this.arrowL.setVisible(canLeft);
    this.arrowR.setVisible(canRight);
  }

  refresh(state: GameState, animate = true): void {
    this.coin.set(state.player.coin, animate);
    this.dew.set(state.player.dew, animate);
    this.levelText.setText(t('hud.level', { level: state.player.level }));
    this.exp.setValue((state.player.exp / expToNext(state.player.level)) * 100, animate);
  }
}
