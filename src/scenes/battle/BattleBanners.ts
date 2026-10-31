// 전투 중 배너: 시작 안내 · 웨이브 · 보스 등장 · 개화기 이름. 알파 없이 위치 · 크기 트윈만 쓴다.

import type Phaser from 'phaser';
import { RAMPS, SPECIAL } from '../../art/palette';
import { ensurePanel } from '../../ui/Frames';
import { pixelText } from '../../ui/PixelText';
import type { BattleScene } from './BattleScene';

function slideBanner(
  s: BattleScene,
  text: string,
  sub: string | null,
  opts: { y: number; w: number; hold: number; color?: string; panel?: 'wood' | 'stone' | 'leaf' },
): Phaser.GameObjects.Container {
  const h = sub ? 38 : 26;
  const box = s.add.container(320, -h).setDepth(120);
  box.add(s.add.image(0, 0, ensurePanel(s, opts.panel ?? 'wood', opts.w, h)).setOrigin(0.5, 0.5));
  box.add(
    pixelText(s, 0, sub ? -7 : 0, text, {
      size: 14,
      bold: true,
      anchorX: 0.5,
      anchorY: 0.5,
      color: opts.color ?? SPECIAL.INK,
    }),
  );
  if (sub)
    box.add(pixelText(s, 0, 9, sub, { size: 9, anchorX: 0.5, anchorY: 0.5, color: RAMPS.R10[1] }));
  s.tweens.add({
    targets: box,
    y: opts.y,
    duration: 260,
    ease: 'Back.easeOut',
    onComplete: () => {
      s.time.delayedCall(opts.hold, () => {
        s.tweens.add({
          targets: box,
          y: -h,
          duration: 200,
          ease: 'Cubic.easeIn',
          onComplete: () => box.destroy(),
        });
      });
    },
  });
  return box;
}

export function stageBanner(s: BattleScene, title: string, sub: string): void {
  slideBanner(s, title, sub, { y: 60, w: 260, hold: 1700 });
}

export function waveBanner(s: BattleScene, text: string): void {
  slideBanner(s, text, null, { y: 70, w: 150, hold: 900 });
}

export function bossBanner(s: BattleScene, name: string): void {
  slideBanner(s, name, null, { y: 56, w: 240, hold: 1500, color: RAMPS.R7[3], panel: 'stone' });
}

/** 개화기: 식물 이름 아래에 필살기 이름이 크게 */
export function bloomBanner(s: BattleScene, plant: string, skill: string, color: string): void {
  const box = s.add.container(320, 300).setDepth(121);
  box.add(s.add.image(0, 0, ensurePanel(s, 'leaf', 200, 34)).setOrigin(0.5));
  box.add(pixelText(s, 0, -8, plant, { size: 7, anchorX: 0.5, anchorY: 0.5 }));
  box.add(
    pixelText(s, 0, 6, skill, {
      size: 11,
      bold: true,
      anchorX: 0.5,
      anchorY: 0.5,
      color: SPECIAL.INK,
    }),
  );
  box.add(s.add.rectangle(-94, 15, 188, 2, parseInt(color.slice(1), 16)).setOrigin(0, 0.5));
  box.setScale(0.85);
  s.tweens.add({ targets: box, scale: 1, y: 270, duration: 220, ease: 'Back.easeOut' });
  s.time.delayedCall(1100, () => {
    s.tweens.add({
      targets: box,
      y: 300,
      duration: 180,
      ease: 'Cubic.easeIn',
      onComplete: () => box.destroy(),
    });
  });
}

export function heartPunch(s: BattleScene): void {
  s.hud.punchHearts();
}
