// 허브 씬에서 떼어 낸 부분. 함수 첫 인자 s 가 HubScene 이다.

import { HUB_OBJECTS } from '../../data/hubLayout';
import { PLANT_BASE_BY_ID } from '../../data/plants';
import { getApp } from '../context';
import type { HubScene } from '../HubScene';

export function onStageUp(s: HubScene, uid: string, to: number): void {
  const app = getApp(s);
  s.refreshSpots();
  const spot = s.spots.find((s) => s.plant?.uid === uid);
  if (!spot) return;
  app.sfx.play('stage_up');
  s.tweens.add({
    targets: spot.container,
    scaleX: { from: 1.2, to: 1 },
    scaleY: { from: 1.2, to: 1 },
    duration: 400,
    ease: 'Back.easeOut',
  });
  for (let i = 0; i < 8; i++) s.sparkle(spot.x + (i - 3.5) * 4, spot.y - 20 - (i % 3) * 5);
  if (to >= 5) s.onBloom(uid);
}

export function onBloom(s: HubScene, uid: string): void {
  const spot = s.spots.find((s) => s.plant?.uid === uid);
  const app = getApp(s);
  app.sfx.play('bloom');
  if (spot) for (let i = 0; i < 14; i++) s.sparkle(spot.x + (i - 7) * 4, spot.y - 14 - (i % 4) * 6);
  app.services.autoSave.flush('bloom');
}

export function sparkle(s: HubScene, x: number, y: number): void {
  const star = s.add.image(Math.round(x), Math.round(y), 'hub:sparkle');
  s.world.add(star);
  s.tweens.add({
    targets: star,
    y: y - 14,
    duration: 700,
    ease: 'Cubic.easeOut',
    onComplete: () => star.destroy(),
  });
}

export function dustBurst(s: HubScene, x: number, y: number): void {
  for (let i = 0; i < 6; i++) {
    const d = s.add.image(Math.round(x), Math.round(y), 'hub:dust');
    s.world.add(d);
    const dir = i < 3 ? -1 : 1;
    s.tweens.add({
      targets: d,
      x: x + dir * (4 + (i % 3) * 3),
      y: y - 4 - (i % 3) * 3,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => d.destroy(),
    });
  }
}

export function animateObjects(s: HubScene, time: number): void {
  const music = s.state.garden.music;
  if (s.phono) {
    s.phono.setTexture(`hub:phono${music ? Math.floor(time / 180) % 3 : 0}`);
    if (music && time - s.noteAt > 700) {
      s.noteAt = time;
      const n = s.add.image(
        HUB_OBJECTS.phonograph.x + 8,
        HUB_OBJECTS.phonograph.y - 36,
        'hub:note',
      );
      s.world.add(n);
      s.tweens.add({
        targets: n,
        x: n.x + 12,
        y: n.y - 26,
        duration: 1100,
        ease: 'Sine.easeOut',
        onComplete: () => n.destroy(),
      });
    }
  }
  // 좋아하는 장르가 나오면 식물이 박자에 맞춰 흔들린다
  for (const sp of s.spots) {
    if (!sp.view || !sp.plant) continue;
    const likes = music !== null && PLANT_BASE_BY_ID.get(sp.plant.speciesId)?.care.music === music;
    sp.view.y = likes && Math.floor(time / 250) % 2 === 0 ? -12 : -11;
  }
  s.flame?.setVisible(s.state.garden.stove).setTexture(`hub:flame${Math.floor(time / 140) % 2}`);
  s.fan?.setTexture(`hub:fan${s.state.garden.fan ? Math.floor(time / 90) % 2 : 0}`);
}
