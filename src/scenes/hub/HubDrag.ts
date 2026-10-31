// 허브 씬에서 떼어 낸 부분. 함수 첫 인자 s 가 HubScene 이다.

import Phaser from 'phaser';
import { t } from '../../i18n';
import { movePlant } from '../../systems/garden/Garden';
import { getApp } from '../context';
import { PlantSpot } from './PlantSpot';
import { PlantView } from '../../ui/PlantView';
import type { Stage } from '../../art/bodies/Ctx';
import { overlay } from '../UIOverlay';
import type { HubScene } from '../HubScene';

// ---- 화분 끌어 옮기기 ----
export function startDrag(s: HubScene, spot: PlantSpot): void {
  const plant = spot.plant;
  if (!plant) return;
  const app = getApp(s);
  const ghost = s.add.container(spot.x, spot.y);
  ghost.add(
    new PlantView(s, 0, -11, {
      speciesId: plant.speciesId,
      stage: plant.stage as Stage,
      variant: plant.variant,
      seed: plant.uid,
      expression: 'surprise',
    }),
  );
  s.world.add(ghost);
  ghost.setDepth(100);
  spot.container.setVisible(false);
  s.drag = { uid: plant.uid, ghost, from: spot };
  app.sfx.play('dig');
}

export function moveDrag(s: HubScene, p: Phaser.Input.Pointer): void {
  if (!s.drag) return;
  s.drag.ghost.setPosition(Math.round(p.worldX + s.pan), Math.round(p.worldY + 12));
  if (p.worldX < 44) s.scrollBy(-4);
  else if (p.worldX > 596) s.scrollBy(4);
}

export function endDrag(s: HubScene, p: Phaser.Input.Pointer): void {
  const d = s.drag;
  if (!d) return;
  s.drag = null;
  const wx = p.worldX + s.pan;
  const wy = p.worldY;
  // 가장 가까운 칸(24px 안)
  let best: PlantSpot | null = null;
  let bestD = 30;
  for (const sp of s.spots) {
    if (sp.kind === 'locked') continue;
    const dist = Math.hypot(sp.x - wx, sp.y - 20 - wy);
    if (dist < bestD) {
      best = sp;
      bestD = dist;
    }
  }
  const app = getApp(s);
  d.ghost.destroy();
  if (best && best !== d.from) {
    const r = movePlant(s.state, d.uid, best.zone, best.slot, s.session.now());
    if (r.ok) {
      app.sfx.play('plant_place');
      s.refreshSpots();
      const moved = s.spots.find((s) => s.plant?.uid === d.uid);
      if (moved) s.dustBurst(moved.x, moved.y - 6);
      app.services.autoSave.flush('move');
      return;
    }
    app.sfx.play('ui_error');
    overlay(s).toast(r.reason === 'aquatic' ? t('hub.moveAquatic') : t('hub.moveFail'));
  }
  d.from.container.setVisible(true);
}
