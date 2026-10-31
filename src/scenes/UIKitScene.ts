// UI 키트 데모 (13문서 M1 DoD): 패널 3종 · 버튼 4상태 · 게이지 · 툴팁 · 숫자 폰트 · 아이콘 · 등급 표식 · 66색 팔레트.
// ?debug=1&scene=UIKit 으로 연다. 디버그 도구라 라벨은 영문 약어를 쓴다.

import Phaser from 'phaser';
import { PALETTE, RAMPS, SPECIAL, toInt } from '../art/palette';
import { ICONS } from '../art/IconGen';
import { GRADE_ORDER, GRADES } from '../data/grades';
import { t } from '../i18n';
import { Button } from '../ui/Button';
import { ensureButton, ensurePanel, type ButtonState, type PanelStyle } from '../ui/Frames';
import { Gauge, type GaugeColor } from '../ui/Gauge';
import { iconTexture, markTexture } from '../ui/IconTex';
import { applySafeArea, setBackdrop } from '../ui/Layout';
import { numberText } from '../ui/NumberFont';
import { pixelText } from '../ui/PixelText';
import { Tooltip } from '../ui/Tooltip';
import { overlay } from './UIOverlay';

const PANELS: PanelStyle[] = ['wood', 'leaf', 'stone'];
const STATES: ButtonState[] = ['normal', 'hover', 'pressed', 'disabled'];
const GAUGES: GaugeColor[] = ['water', 'nutrition', 'hygiene', 'mood'];

export class UIKitScene extends Phaser.Scene {
  gauges: Gauge[] = [];

  constructor() {
    super('UIKit');
  }

  create(): void {
    setBackdrop(RAMPS.R10[0]);
    applySafeArea(this);
    this.cameras.main.setBackgroundColor(RAMPS.R10[0]);
    this.add.rectangle(-80, 0, 800, 360, toInt(RAMPS.R10[0])).setOrigin(0, 0);
    const tip = new Tooltip(this);
    const label = (x: number, y: number, s: string) =>
      pixelText(this, x, y, s, { size: 7, color: RAMPS.R10[4] });

    // 패널 3종
    label(8, 4, 'PANELS');
    PANELS.forEach((style, i) => {
      this.add.image(8 + i * 104, 14, ensurePanel(this, style, 96, 46)).setOrigin(0, 0);
      pixelText(this, 56 + i * 104, 37, style, { size: 9, anchorX: 0.5, anchorY: 0.5 });
    });

    // 버튼 4상태 + 살아 있는 버튼
    label(8, 66, 'BUTTON STATES (normal hover pressed disabled) + live');
    STATES.forEach((state, i) => {
      const x = 8 + i * 80;
      this.add.image(x, 76, ensureButton(this, 'default', state, 72, 18)).setOrigin(0, 0);
      pixelText(
        this,
        x + 36,
        76 + 1 + { hover: 0, normal: 1, disabled: 1, pressed: 2 }[state] + 8,
        state,
        {
          size: 9,
          anchorX: 0.5,
          anchorY: 0.5,
          color: state === 'disabled' ? RAMPS.R11[1] : SPECIAL.INK,
        },
      );
    });
    new Button(this, 370, 86, {
      w: 72,
      h: 18,
      size: 9,
      label: 'live',
      variant: 'primary',
      onClick: () => this.shuffleGauges(),
    });
    new Button(this, 450, 86, {
      w: 72,
      h: 18,
      size: 9,
      label: 'off',
      disabled: true,
      onClick: () => undefined,
    });

    // 게이지(클릭하면 값이 굴러간다) + 숫자 폰트
    label(8, 104, 'GAUGES (press live to roll)  NUMBER FONTS 3x5 / 5x7');
    GAUGES.forEach((color, i) => {
      const g = new Gauge(
        this,
        8 + (i % 2) * 140,
        114 + Math.floor(i / 2) * 12,
        100,
        color,
        [80, 45, 22, 100][i],
        true,
        SPECIAL.PAPER, // 어두운 배경 위라 숫자를 종이색으로
      );
      this.gauges.push(g);
    });
    numberText(this, 300, 114, '0123456789 +-%/x.:,', SPECIAL.PAPER, '3x5');
    numberText(this, 300, 124, '0123456789 +-%', SPECIAL.STARGOLD, '5x7');

    // 아이콘 + 툴팁
    label(8, 144, 'ICONS 12x12 (hover for tooltip)');
    Object.keys(ICONS).forEach((name, i) => {
      const img = this.add
        .image(8 + i * 20, 156, iconTexture(this, name))
        .setOrigin(0, 0)
        .setInteractive();
      tip.attach(
        img,
        () => name,
        () => ({ x: img.x + 6, y: img.y }),
      );
    });

    // 등급 표식(모양 × 개수) + 등급 이름(문자열 파일)
    // 등급 표식 · 이름은 크림 카드 위에서 쓰도록 만들었다(03문서 2절 글자색 표)
    this.add.rectangle(4, 186, 632, 30, toInt(SPECIAL.CREAM)).setOrigin(0, 0);
    label(8, 178, 'GRADE MARKS (shape x count) + names');
    GRADE_ORDER.forEach((id, g) => {
      const def = GRADES[id];
      const gx = 8 + g * 78;
      for (let k = 0; k < def.markCount; k++) {
        this.add
          .image(
            gx + (k % 8) * 8,
            190 + Math.floor(k / 8) * 8,
            markTexture(this, def.mark, def.color),
          )
          .setOrigin(0, 0);
      }
      pixelText(this, gx, 202, t(def.nameKey), {
        size: 9,
        // 등급 이름 글자색은 크림 바탕에서 4.5:1 이상이 되도록 정해 둔 값(03문서 2절)
        color: def.text,
      });
    });

    // 66색 팔레트
    label(8, 218, `PALETTE ${PALETTE.length} colors`);
    Object.values(RAMPS).forEach((ramp, r) => {
      ramp.forEach((c, i) => {
        this.add
          .rectangle(8 + (r % 6) * 92 + i * 16, 228 + Math.floor(r / 6) * 12, 14, 10, toInt(c))
          .setOrigin(0, 0);
      });
    });
    Object.values(SPECIAL).forEach((c, i) => {
      this.add.rectangle(8 + i * 24, 258, 20, 10, toInt(c)).setOrigin(0, 0);
    });

    new Button(this, 320, 344, {
      w: 96,
      h: 16,
      size: 9,
      label: 'Back',
      onClick: () => overlay(this).transitionTo('UIKit', 'Title'),
    });
  }

  private shuffleGauges(): void {
    for (const g of this.gauges) g.setValue(Phaser.Math.Between(0, 100));
  }
}
