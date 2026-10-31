// 처음 눈뜨기 → 이름 짓기 연출 (이 게임에서 가장 귀여운 순간).

import Phaser from 'phaser';
import { RAMPS, SPECIAL } from '../../art/palette';
import { t } from '../../i18n';
import { namePlant } from '../../systems/garden/Garden';
import { Button } from '../../ui/Button';
import { ensurePanel } from '../../ui/Frames';
import { NameInput } from '../../ui/NameInput';
import { outlinedText, pixelText } from '../../ui/PixelText';
import { overlay } from '../UIOverlay';
import type { CareScene } from '../CareScene';
import { PX, PY, SCALE } from './CareConfig';

const pickSyllable = (): string => Phaser.Utils.Array.GetRandom(t('name.syllables').split(','));

export function startCeremony(s: CareScene): void {
  if (s.ceremonyActive) return;
  s.ceremonyActive = true;
  s.tool?.leave();
  s.tool = null;
  s.toolId = null;
  for (const b of s.toolButtons.values()) b.setVisible(false);
  for (const b of s.badges.values()) b.setVisible(false);
  s.hint('');
  const v = s.view;
  v.setExpression('sleep');
  v.hold(null);
  s.root.setY(PY + 4);
  // 1) 흙이 볼록 → 새싹이 쏙
  s.time.delayedCall(250, () => {
    s.sfx('dig');
    s.tweens.add({ targets: s.root, y: PY, duration: 260, ease: 'Back.easeOut' });
    for (let i = 0; i < 6; i++) s.puff(PX + Phaser.Math.Between(-16, 16), PY - 26, 'soil');
  });
  // 2) 반짝 + 커짐
  s.time.delayedCall(1000, () => {
    s.sfx('stage_up');
    for (let i = 0; i < 12; i++) s.puffSparkle();
    s.tweens.add({
      targets: s.root,
      scaleX: SCALE * 1.12,
      scaleY: SCALE * 1.12,
      duration: 240,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  });
  // 3) 눈을 감고 있다가 → 천천히 뜬다(감음 → 반쯤 → 활짝) → 커서를 쳐다본다
  s.time.delayedCall(1900, () => {
    v.setExpression('blink');
  });
  s.time.delayedCall(2250, () => {
    s.sfx('eyes_open');
    v.setExpression('default');
  });
  s.time.delayedCall(2500, () => v.setExpression('blink'));
  s.time.delayedCall(2650, () => {
    v.setExpression('surprise');
    s.puff(s.body.centerX, s.body.y, 'heart');
  });
  s.time.delayedCall(3200, () => {
    v.setExpression('happy');
    s.tweens.add({
      targets: v,
      y: -16,
      duration: 140,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut',
    });
    for (let i = 0; i < 4; i++) s.puff(s.body.centerX + (i - 1.5) * 10, s.body.y - 4, 'heart');
  });
  s.time.delayedCall(3900, () => openNameCard(s));
}

export function openNameCard(s: CareScene): void {
  const w = 320;
  const h = 150;
  const x = 320 - w / 2;
  const y = 84;
  const c = s.add.container(0, 0).setDepth(110);
  s.card = c;
  c.add(s.add.image(x, y, ensurePanel(s, 'wood', w, h)).setOrigin(0, 0));
  c.add(pixelText(s, 320, y + 10, t('name.title'), { size: 14, anchorX: 0.5 }));
  c.add(pixelText(s, 320, y + 32, t('name.body'), { size: 11, anchorX: 0.5, color: RAMPS.R10[1] }));
  const roll = () => `${pickSyllable()}${pickSyllable()}${t('name.suffix')}`;
  s.nameInput = new NameInput(
    s,
    320 - 80,
    y + 54,
    160,
    22,
    roll(),
    () => confirmName(s),
    t('name.placeholder'),
  );
  // 추천 이름 3개 + 다시 뽑기
  const chips: Button[] = [];
  const makeChips = () => {
    for (const b of chips) b.destroy();
    chips.length = 0;
    for (let i = 0; i < 3; i++) {
      const name = `${pickSyllable()}${pickSyllable()}`;
      const b = new Button(s, 320 - 88 + i * 60, y + 98, {
        w: 52,
        h: 18,
        label: name,
        size: 9,
        onClick: () => s.nameInput?.setValue(name),
      });
      chips.push(b);
      c.add(b);
    }
  };
  makeChips();
  c.add(
    new Button(s, 320 + 100, y + 98, {
      w: 40,
      h: 18,
      label: t('name.reroll'),
      size: 9,
      onClick: () => makeChips(),
    }),
  );
  c.add(
    new Button(s, 320, y + 128, {
      w: 120,
      h: 20,
      label: t('name.confirm'),
      variant: 'primary',
      onClick: () => confirmName(s),
    }),
  );
  c.setScale(0.9);
  s.tweens.add({ targets: c, scale: 1, duration: 160, ease: 'Back.easeOut' });
}

export function confirmName(s: CareScene): void {
  const input = s.nameInput;
  if (!input) return;
  const r = namePlant(s.plant, input.value, s.session.now());
  if (!r.ok) {
    s.sfx('ui_error');
    overlay(s).toast(t(`name.error.${r.error}`));
    return;
  }
  input.destroy();
  s.nameInput = undefined;
  s.card?.destroy();
  s.card = undefined;
  nameStamp(s, r.name);
}

/** 이름이 화면 가운데에 쾅 찍히고, 식물이 신나서 뛴다 */

/** 이름이 화면 가운데에 쾅 찍히고, 식물이 신나서 뛴다 */
export function nameStamp(s: CareScene, name: string): void {
  s.sfx('name_stamp');
  const label = outlinedText(s, 320, 150, name, {
    size: 14,
    anchorX: 0.5,
    anchorY: 0.5,
    color: SPECIAL.STARGOLD,
    outline: SPECIAL.INK,
  });
  label.setDepth(120).setScale(4);
  s.tweens.add({
    targets: label,
    scale: 2,
    duration: 200,
    ease: 'Bounce.easeOut',
    onComplete: () => {
      if (s.settings().shake) s.cameras.main.shake(120, 0.003);
      for (let i = 0; i < 14; i++) s.puffSparkle();
      s.view.setExpression('excited');
      s.tweens.add({
        targets: s.view,
        y: -18,
        duration: 160,
        yoyo: true,
        repeat: 2,
        ease: 'Quad.easeOut',
      });
    },
  });
  s.time.delayedCall(1700, () => {
    label.destroy();
    s.ceremonyActive = false;
    for (const b of s.toolButtons.values()) b.setVisible(true);
    for (const b of s.badges.values()) b.setVisible(true);
    s.restoreExpression();
    overlay(s).toast(t('name.welcome', { name }));
    s.app.services.bus.emit('save:requested', { reason: 'name' });
    s.hint(t('care.hint.default'));
    s.refreshAll(false);
  });
}

/** 테스트 · 디버그: 지금 말풍선 종류 */
