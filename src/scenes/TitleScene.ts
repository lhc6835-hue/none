// 타이틀 (10문서 1-3절): 새벽빛이 드는 온실 한 장면 + 이어하기 · 새로 시작 · 설정 · 만든 사람들.
// 아무 데나 눌러도 이어하기. 식물 얼굴과 로고 눈(ㅇ) 연출은 FaceRenderer(M1) 이후에 얹는다.

import Phaser from 'phaser';
import { FX } from '../art/FxTextures';
import { RAMPS, SPECIAL } from '../art/palette';
import { Rng } from '../core/Rng';
import { startNewGame } from '../core/Services';
import { t } from '../i18n';
import { Button } from '../ui/Button';
import { applySafeArea, setBackdrop } from '../ui/Layout';
import { outlinedText, pixelText } from '../ui/PixelText';
import { creditsModal, settingsModal } from '../ui/SettingsPanel';
import { getApp } from './context';
import { overlay } from './UIOverlay';

interface Firefly {
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  ax: number;
  ay: number;
  sx: number;
  sy: number;
  phase: number;
  period: number;
}
interface Mote {
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
}
interface Twinkle {
  sprite: Phaser.GameObjects.Image;
  period: number;
  offset: number;
}

const BUTTON_Y = 332;

export class TitleScene extends Phaser.Scene {
  private fireflies: Firefly[] = [];
  private motes: Mote[] = [];
  private twinkles: Twinkle[] = [];
  private hint: Phaser.GameObjects.Container | undefined;
  private canContinue = false;

  constructor() {
    super('Title');
  }

  create(): void {
    const { services } = getApp(this);
    setBackdrop(RAMPS.R4[0]);
    applySafeArea(this);
    this.fireflies = [];
    this.motes = [];
    this.twinkles = [];

    this.add.image(-80, 0, 'title:backdrop').setOrigin(0, 0);
    this.buildAmbient();

    // 로고
    outlinedText(this, 320, 40, t('game.logo'), {
      size: 14,
      color: SPECIAL.PAPER,
      anchorX: 0.5,
      outline: RAMPS.R5[0],
    });
    outlinedText(this, 320, 64, t('game.subtitle'), {
      size: 11,
      bold: true,
      color: RAMPS.R9[4],
      anchorX: 0.5,
      outline: RAMPS.R5[0],
    });

    // 배경 전체를 누르면 이어하기 (버튼은 위에 있어 먼저 반응한다)
    const status = services.loadResult.status;
    this.canContinue = services.state !== null;
    const hit = this.add.zone(-80, 0, 800, 360).setOrigin(0, 0).setInteractive();
    hit.on('pointerup', () => {
      if (this.canContinue) this.continueGame();
    });

    this.buildButtons();
    // 디버그 단축키: G 아트 갤러리 · U UI 키트
    if (services.debug) {
      this.input.keyboard?.on('keydown-G', () => overlay(this).transitionTo('Title', 'ArtGallery'));
      this.input.keyboard?.on('keydown-U', () => overlay(this).transitionTo('Title', 'UIKit'));
    }
    pixelText(this, 632, 350, t('game.version', { version: __APP_VERSION__ }), {
      size: 9,
      color: RAMPS.R10[4],
      anchorX: 1,
      anchorY: 0.5,
    });

    if (this.canContinue) this.buildHint();

    // 저장 안내 (손상 복구 · 읽기 실패 · 새 버전 저장)
    const notice =
      status === 'recovered'
        ? 'title.notice.recovered'
        : status === 'corrupt'
          ? 'title.notice.corrupt'
          : status === 'tooNew'
            ? 'title.notice.tooNew'
            : null;
    if (notice) this.time.delayedCall(450, () => overlay(this).toast(t(notice)));
  }

  private buildButtons(): void {
    const w = 96;
    const gap = 8;
    const labels: { key: string; variant?: 'primary'; disabled?: boolean; fn: () => void }[] = [
      {
        key: 'title.continue',
        variant: 'primary',
        disabled: !this.canContinue,
        fn: () => this.continueGame(),
      },
      { key: 'title.newGame', fn: () => this.newGame() },
      { key: 'title.settings', fn: () => this.openSettings() },
      { key: 'title.credits', fn: () => overlay(this).openModal(creditsModal()) },
    ];
    const total = labels.length * w + (labels.length - 1) * gap;
    labels.forEach((b, i) => {
      new Button(this, 320 - total / 2 + w / 2 + i * (w + gap), BUTTON_Y, {
        w,
        h: 20,
        label: t(b.key),
        variant: b.variant,
        disabled: b.disabled,
        onClick: b.fn,
      });
    });
  }

  private buildHint(): void {
    const label = pixelText(this, 0, 0, t('title.tapHint'), {
      size: 11,
      color: SPECIAL.PAPER,
      anchorX: 0.5,
      anchorY: 0.5,
    });
    this.hint = this.add.container(320, 150, [label]);
    // 알파 페이드 대신 켜졌다 꺼지는 단계식 깜빡임(팔레트 안의 색만 쓰기 위해)
    this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => this.hint?.setVisible(!this.hint.visible),
    });
  }

  private continueGame(): void {
    const app = getApp(this);
    app.audio.unlock();
    app.sfx.play('ui_release');
    overlay(this).transitionTo('Title', 'Hub');
  }

  private newGame(): void {
    const app = getApp(this);
    if (!app.services.save.hasSave()) {
      this.beginNewGame();
      return;
    }
    overlay(this).openModal({
      title: t('title.newGameConfirm.title'),
      body: t('title.newGameConfirm.body'),
      buttons: [
        { label: t('title.newGameConfirm.no') },
        {
          label: t('title.newGameConfirm.yes'),
          variant: 'primary',
          onClick: () => this.beginNewGame(),
        },
      ],
    });
  }

  private beginNewGame(): void {
    startNewGame(getApp(this).services);
    overlay(this).transitionTo('Title', 'Hub');
  }

  private openSettings(): void {
    const ov = overlay(this);
    ov.openModal(
      settingsModal(this, () => {
        // 언어 변경: 모달을 닫고 타이틀을 새 언어로 다시 그린다
        ov.closeModal();
        this.scene.restart();
      }),
    );
  }

  // ---- 살아 있는 배경: 별 · 먼지 · 반딧불 ----
  private buildAmbient(): void {
    const rng = new Rng('art:title:ambient');

    for (let i = 0; i < 9; i++) {
      const sprite = this.add.image(rng.int(-70, 700), rng.int(6, 100), FX.star).setOrigin(0.5);
      this.twinkles.push({ sprite, period: rng.int(900, 1700), offset: rng.int(0, 1500) });
    }

    for (let i = 0; i < 26; i++) {
      const sprite = this.add.image(0, 0, FX.mote).setOrigin(0, 0);
      this.motes.push({
        sprite,
        x: rng.range(-80, 720),
        y: rng.range(100, 330),
        vx: rng.range(2, 7),
        vy: rng.range(-5, -1),
      });
    }

    for (let i = 0; i < 14; i++) {
      this.fireflies.push({
        sprite: this.add.image(0, 0, FX.firefly).setOrigin(0.5),
        x: rng.range(-60, 700),
        y: rng.range(228, 322),
        ax: rng.range(10, 34),
        ay: rng.range(5, 16),
        sx: rng.range(0.0004, 0.0009),
        sy: rng.range(0.0006, 0.0012),
        phase: rng.range(0, 6.28),
        period: rng.range(1600, 2800),
      });
    }
  }

  override update(time: number, delta: number): void {
    const dt = delta / 1000;
    for (const m of this.motes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.x > 720) m.x = -80;
      if (m.y < 90) m.y = 330;
      m.sprite.setPosition(Math.round(m.x), Math.round(m.y));
    }
    for (const f of this.fireflies) {
      const x = f.x + Math.sin(time * f.sx + f.phase) * f.ax;
      const y = f.y + Math.sin(time * f.sy + f.phase * 1.7) * f.ay;
      f.sprite.setPosition(Math.round(x), Math.round(y));
      // 꺼짐 · 어둡게 · 밝게 · 밝게 의 4단계를 돈다
      const step = Math.floor(((time + f.phase * 400) % f.period) / (f.period / 4));
      f.sprite.setVisible(step !== 0);
      f.sprite.setTexture(step === 1 ? FX.fireflyDim : FX.firefly);
    }
    for (const s of this.twinkles) {
      const step = Math.floor(((time + s.offset) % s.period) / (s.period / 5));
      s.sprite.setTexture(step === 4 ? FX.starCross : FX.star);
      s.sprite.setVisible(step !== 0);
    }
  }
}
