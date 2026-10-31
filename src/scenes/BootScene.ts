// 부팅: 폰트를 올리고, 항상 떠 있는 오버레이 씬을 띄운 뒤 Preload 로 넘어간다.

import Phaser from 'phaser';
import { RAMPS } from '../art/palette';
import { setBackdrop } from '../ui/Layout';
import { loadFonts } from '../ui/PixelText';
import { getApp } from './context';
import { OVERLAY_KEY } from './UIOverlay';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    setBackdrop(RAMPS.R4[0]);
    this.cameras.main.setBackgroundColor(RAMPS.R4[0]);

    this.scene.launch(OVERLAY_KEY);
    if (getApp(this).services.debug) this.scene.launch('DebugOverlay');

    loadFonts(import.meta.env.BASE_URL)
      .catch((err: unknown) => {
        // 글꼴이 안 올라와도 게임은 계속한다(기본 글꼴로 대체됨)
        console.error('[boot] 글꼴을 불러오지 못했습니다', err);
      })
      .finally(() => this.scene.start('Preload'));
  }
}
