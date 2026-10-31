// 덱 고르기 창: 정원의 식물 카드를 눌러 넣고 뺀다(06문서 2절). 시무룩한 식물은 점박이가 먼저 말려 준다.

import Phaser from 'phaser';
import { RAMPS, SPECIAL } from '../../art/palette';
import type { Stage } from '../../art/bodies/Ctx';
import type { GameState } from '../../core/GameState';
import type { PlantInstance } from '../../core/schema';
import { PLANT_BASE_BY_ID } from '../../data/plants';
import { t } from '../../i18n';
import { plantDisplayName } from '../../i18n/names';
import { worldAt } from '../../systems/garden/Environment';
import { plantEnv } from '../../systems/garden/Garden';
import { battleConditionTier, conditionOf } from '../../systems/garden/Needs';
import { canDeploy } from '../../systems/battle/Loadouts';
import { Button } from '../../ui/Button';
import { ensurePanel } from '../../ui/Frames';
import { pixelText } from '../../ui/PixelText';
import { PlantView } from '../../ui/PlantView';
import type { ModalDef } from '../../ui/Modal';
import { getApp } from '../context';

const COLS = 6;
const CELL_W = 64;
const CELL_H = 72;
const ROWS = 2;
const COND_COLOR: Record<string, string> = {
  best: RAMPS.R9[2],
  good: RAMPS.R1[2],
  fair: RAMPS.R10[2],
  sulky: RAMPS.R7[3],
};

export function conditionKey(state: GameState, p: PlantInstance, now: number): string {
  const base = PLANT_BASE_BY_ID.get(p.speciesId);
  if (!base) return 'fair';
  return battleConditionTier(conditionOf(p, base, plantEnv(state, p, worldAt(now))).value).key;
}

export function candidates(state: GameState): PlantInstance[] {
  return state.plants.filter(canDeploy);
}

export interface PickerHooks {
  /** 슬롯 수 */
  slots: number;
  /** 고른 목록이 바뀔 때 */
  onChange: (uids: string[]) => void;
  /** 시무룩한 식물 → 돌보기로 */
  onCare: (uid: string) => void;
  /** 점박이 대사를 띄우려고 모달을 한 번 더 연다 */
  askSulky: (p: PlantInstance, take: () => void) => void;
}

export function deckPickerModal(
  state: GameState,
  chosen: string[],
  hooks: PickerHooks,
  now: number,
  done: () => void,
): ModalDef {
  const list = candidates(state);
  const pages = Math.max(1, Math.ceil(list.length / (COLS * ROWS)));
  return {
    title: t('sortie.pickTitle', { n: chosen.length, max: hooks.slots }),
    width: COLS * CELL_W + 36,
    buttons: [{ label: t('sortie.done'), variant: 'primary', onClick: done }],
    build: (
      scene: Phaser.Scene,
      parent: Phaser.GameObjects.Container,
      top: number,
      width: number,
    ) => {
      let page = 0;
      const holder = scene.add.container(0, top);
      parent.add(holder);
      const draw = (): void => {
        holder.removeAll(true);
        if (list.length === 0) {
          holder.add(
            pixelText(scene, width / 2, 20, t('sortie.noPlants'), {
              size: 9,
              anchorX: 0.5,
              align: 'center',
              wrapWidth: width - 10,
            }),
          );
          return;
        }
        list.slice(page * COLS * ROWS, (page + 1) * COLS * ROWS).forEach((p, i) => {
          const cx = (i % COLS) * CELL_W + CELL_W / 2;
          const cy = Math.floor(i / COLS) * CELL_H + CELL_H / 2;
          const idx = chosen.indexOf(p.uid);
          const on = idx >= 0;
          const cond = conditionKey(state, p, now);
          const cell = scene.add.container(cx, cy);
          cell.add(
            scene.add.image(
              0,
              0,
              ensurePanel(scene, on ? 'leaf' : 'stone', CELL_W - 4, CELL_H - 4),
            ),
          );
          cell.add(
            new PlantView(scene, 0, -4, {
              speciesId: p.speciesId,
              stage: Math.max(3, Math.min(5, p.stage)) as Stage,
              variant: p.variant,
              seed: p.uid,
            }),
          );
          cell.add(
            pixelText(scene, 0, 2, plantDisplayName(p), {
              size: 7,
              anchorX: 0.5,
              color: SPECIAL.INK,
              wrapWidth: CELL_W - 8,
              align: 'center',
            }),
          );
          cell.add(
            pixelText(scene, 0, 26, `Lv${p.level} ${t(`condition.${cond}`)}`, {
              size: 7,
              anchorX: 0.5,
              color: COND_COLOR[cond],
            }),
          );
          if (on)
            cell.add(
              pixelText(scene, -CELL_W / 2 + 6, -CELL_H / 2 + 5, String(idx + 1), {
                size: 9,
                bold: true,
                color: RAMPS.R9[2],
              }),
            );
          cell.setSize(CELL_W - 4, CELL_H - 4);
          cell.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, CELL_W - 4, CELL_H - 4),
            Phaser.Geom.Rectangle.Contains,
          );
          cell.on('pointerdown', () => {
            const sfx = getApp(scene).sfx;
            if (on) {
              chosen.splice(idx, 1);
              sfx.play('ui_close');
              hooks.onChange([...chosen]);
              draw();
              return;
            }
            if (chosen.length >= hooks.slots) {
              sfx.play('ui_error');
              return;
            }
            const take = (): void => {
              chosen.push(p.uid);
              sfx.play('ui_click');
              hooks.onChange([...chosen]);
              draw();
            };
            if (cond === 'sulky') hooks.askSulky(p, take);
            else take();
          });
          holder.add(cell);
        });
        if (pages > 1) {
          const y = ROWS * CELL_H + 4;
          holder.add([
            new Button(scene, 28, y + 10, {
              w: 48,
              h: 20,
              label: '◀',
              disabled: page === 0,
              onClick: () => {
                page = Math.max(0, page - 1);
                draw();
              },
            }),
            new Button(scene, width - 28, y + 10, {
              w: 48,
              h: 20,
              label: '▶',
              disabled: page >= pages - 1,
              onClick: () => {
                page = Math.min(pages - 1, page + 1);
                draw();
              },
            }),
            pixelText(scene, width / 2, y + 6, t('list.page', { page: page + 1, pages }), {
              size: 9,
              anchorX: 0.5,
            }),
          ]);
        }
      };
      draw();
      return ROWS * CELL_H + (pages > 1 ? 30 : 4);
    },
  };
}
