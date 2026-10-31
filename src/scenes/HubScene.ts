// 온실 허브 — M2 에서 본격적으로 만든다(스크롤 · 구역 · 선반 · 돌보기). 지금은 골격만 있다.

import Phaser from 'phaser';
import { RAMPS } from '../art/palette';
import { t } from '../i18n';
import { Button } from '../ui/Button';
import { ensurePanel } from '../ui/Frames';
import { applySafeArea, setBackdrop } from '../ui/Layout';
import { pixelText } from '../ui/PixelText';
import { overlay } from './UIOverlay';

export class HubScene extends Phaser.Scene {
  constructor() {
    super('Hub');
  }

  create(): void {
    setBackdrop(RAMPS.R4[0]);
    applySafeArea(this);
    this.add.image(-80, 0, 'title:backdrop').setOrigin(0, 0);

    const w = 240;
    const h = 88;
    this.add.image(320, 130, ensurePanel(this, 'wood', w, h)).setOrigin(0.5);
    pixelText(this, 320, 104, t('hub.placeholder.title'), { size: 14, anchorX: 0.5 });
    pixelText(this, 320, 130, t('hub.placeholder.body'), { size: 11, anchorX: 0.5 });
    new Button(this, 320, 332, {
      w: 104,
      h: 20,
      label: t('hub.toTitle'),
      onClick: () => overlay(this).transitionTo('Hub', 'Title'),
    });
  }
}
