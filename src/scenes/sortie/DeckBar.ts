// 출격 준비 화면의 아래쪽 띠: 덱 슬롯 · 정원사 도구 · 추천 덱 · 출격 버튼

import Phaser from 'phaser';
import { RAMPS } from '../../art/palette';
import type { Stage } from '../../art/bodies/Ctx';
import { t } from '../../i18n';
import { plantDisplayName } from '../../i18n/names';
import { GARDEN_TOOLS } from '../../systems/battle/GardenTools';
import { deckSlots } from '../../systems/battle/Loadouts';
import { Button } from '../../ui/Button';
import { ensurePanel } from '../../ui/Frames';
import { iconTexture } from '../../ui/IconTex';
import { pixelText } from '../../ui/PixelText';
import { getApp } from '../context';
import type { SortieScene } from '../SortieScene';
import { conditionKey } from './DeckPicker';

const TOOL_ICON: Record<string, string> = {
  SHOWER: 'drop',
  SHOVEL: 'hand',
  FERTILIZER: 'compost',
  LADYBUG: 'bug',
  SCARECROW: 'stake',
};

export function build(s: SortieScene, stageId: string): void {
  const app = getApp(s);
  const box = s.add.container(0, 236).setDepth(3);
  s.deckBox = box;
  const slots = deckSlots(s.state.player.level);
  const now = app.services.clock.now();
  box.add(s.add.image(8, 0, ensurePanel(s, 'wood', 624, 120)).setOrigin(0, 0));
  box.add(
    pixelText(s, 16, 6, t('sortie.deck', { n: s.deck.length, max: slots }), {
      size: 9,
      bold: true,
    }),
  );
  for (let i = 0; i < slots; i++) {
    const x = 16 + i * 52;
    const uid = s.deck[i];
    const p = uid ? s.state.plants.find((q) => q.uid === uid) : undefined;
    const slot = s.add.container(x + 24, 52);
    slot.add(s.add.image(0, 0, ensurePanel(s, p ? 'leaf' : 'stone', 48, 56)));
    if (p) {
      const tex = app.atlas.plant(
        p.speciesId,
        Math.max(3, Math.min(5, p.stage)) as Stage,
        p.variant,
      );
      slot.add(s.add.image(0, -6, tex.key, 'idle0'));
      slot.add(
        pixelText(s, 0, 14, plantDisplayName(p), {
          size: 7,
          anchorX: 0.5,
          wrapWidth: 44,
          align: 'center',
        }),
      );
      const cond = conditionKey(s.state, p, now);
      slot.add(
        pixelText(s, 0, 23, `Lv${p.level} ${t(`condition.${cond}`)}`, {
          size: 7,
          anchorX: 0.5,
          color: cond === 'sulky' ? RAMPS.R7[3] : RAMPS.R10[1],
        }),
      );
    } else {
      slot.add(
        pixelText(s, 0, 0, '+', {
          size: 14,
          bold: true,
          anchorX: 0.5,
          anchorY: 0.5,
          color: RAMPS.R12[3],
        }),
      );
    }
    slot.setSize(48, 56);
    slot.setInteractive(new Phaser.Geom.Rectangle(0, 0, 48, 56), Phaser.Geom.Rectangle.Contains);
    slot.on('pointerdown', () => {
      app.sfx.play('ui_open');
      s.openPicker();
    });
    box.add(slot);
  }
  // 정원사 도구 2칸
  const tx = 16 + slots * 52 + 8;
  box.add(pixelText(s, tx, 6, t('sortie.tools'), { size: 9, bold: true }));
  s.tools.forEach((id, k) => {
    const slot = s.add.container(tx + 20 + k * 44, 52);
    slot.add(s.add.image(0, 0, ensurePanel(s, 'stone', 40, 56)));
    slot.add(s.add.image(0, -8, iconTexture(s, TOOL_ICON[id] ?? 'hand')));
    slot.add(
      pixelText(s, 0, 8, t(GARDEN_TOOLS[id].nameKey), {
        size: 7,
        anchorX: 0.5,
        wrapWidth: 38,
        align: 'center',
      }),
    );
    slot.setSize(40, 56);
    slot.setInteractive(new Phaser.Geom.Rectangle(0, 0, 40, 56), Phaser.Geom.Rectangle.Contains);
    slot.on('pointerdown', () => s.cycleTool(k));
    box.add(slot);
  });
  // 버튼
  const rec = new Button(s, 548, 36, {
    w: 120,
    h: 20,
    label: t('sortie.recommend'),
    size: 9,
    onClick: () => s.recommend(stageId),
  });
  const go = new Button(s, 548, 72, {
    w: 120,
    h: 28,
    label: t('sortie.go'),
    size: 11,
    bold: true,
    variant: 'primary',
    onClick: () => s.go(),
  });
  box.add([rec, go]);
  box.add(
    pixelText(s, 548, 104, t('sortie.empty'), { size: 7, anchorX: 0.5, color: RAMPS.R10[1] }),
  );
}
