// 설정 · 만든 사람들 모달 내용. 설정은 M6 에서 접근성 항목까지 확장한다(10문서 5절).
// 지금은 언어와 음량 4종(전체 · 배경음 · 효과음 · 식물 콧노래)을 다룬다.

import type Phaser from 'phaser';
import type { Language } from '../core/Settings';
import { setLanguage, t } from '../i18n';
import { getApp } from '../scenes/context';
import { Button } from './Button';
import type { ModalDef } from './Modal';
import { pixelText } from './PixelText';

const VOLUME_KEYS = ['master', 'music', 'sfx', 'hum'] as const;
const STEP = 0.1;
const ROW_H = 22;

function volumeRow(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  y: number,
  width: number,
  key: (typeof VOLUME_KEYS)[number],
): void {
  const { settings } = getApp(scene).services;
  const label = pixelText(scene, 0, y + 3, t(`settings.volume.${key}`), { size: 11 });
  const value = pixelText(scene, width - 48, y + 3, '', {
    size: 11,
    anchorX: 0.5,
    align: 'center',
  });
  const show = () => value.setText(`${Math.round(settings.get().volume[key] * 100)}%`);
  const change = (delta: number) => {
    const next = Math.round((settings.get().volume[key] + delta) * 10) / 10;
    settings.update({ volume: { [key]: Math.min(1, Math.max(0, next)) } });
    show();
  };
  show();
  parent.add([
    label,
    value,
    new Button(scene, width - 84, y + 8, {
      w: 16,
      h: 16,
      label: '-',
      onClick: () => change(-STEP),
    }),
    new Button(scene, width - 12, y + 8, { w: 16, h: 16, label: '+', onClick: () => change(STEP) }),
  ]);
}

/** onLanguage: 언어를 바꾼 뒤 화면을 새로 그려야 할 때 불린다 */
export function settingsModal(scene: Phaser.Scene, onLanguage: () => void): ModalDef {
  const { settings } = getApp(scene).services;
  return {
    title: t('settings.title'),
    width: 280,
    buttons: [{ label: t('common.close') }],
    build: (s, parent, top, width) => {
      let y = top;
      // 언어
      parent.add(pixelText(s, 0, y + 3, t('settings.language'), { size: 11 }));
      const langs: Language[] = ['ko', 'en'];
      langs.forEach((lang, i) => {
        parent.add(
          new Button(s, width - 92 + i * 48 + 24, y + 8, {
            w: 44,
            h: 16,
            size: 9,
            label: t(`settings.language.${lang}`),
            variant: settings.get().language === lang ? 'primary' : 'default',
            onClick: () => {
              if (settings.get().language === lang) return;
              settings.update({ language: lang });
              setLanguage(lang);
              onLanguage();
            },
          }),
        );
      });
      y += ROW_H + 4;
      // 음량
      for (const key of VOLUME_KEYS) {
        volumeRow(s, parent, y, width, key);
        y += ROW_H;
      }
      return y - top;
    },
  };
}

export function creditsModal(): ModalDef {
  return {
    title: t('credits.title'),
    width: 280,
    body: [
      t('credits.engine'),
      t('credits.sfx'),
      t('credits.font'),
      '',
      t('credits.thanks'),
      '',
      t('game.version', { version: __APP_VERSION__ }),
    ].join('\n'),
    buttons: [{ label: t('common.close') }],
  };
}
