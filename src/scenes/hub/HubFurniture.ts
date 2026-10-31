// 허브 씬에서 떼어 낸 부분. 함수 첫 인자 s 가 HubScene 이다.

import Phaser from 'phaser';
import { RAMPS, toInt } from '../../art/palette';
import { CARE_UNLOCK } from '../../data/care';
import { BLIND_ZONES, HUB_LAYOUT, HUB_OBJECTS } from '../../data/hubLayout';
import { HUB_ZONES, ZONES } from '../../data/zones';
import { t } from '../../i18n';
import { isZoneUnlocked } from '../../systems/garden/Garden';
import { iconTexture } from '../../ui/IconTex';
import { pixelText } from '../../ui/PixelText';
import type { HubScene } from '../HubScene';

export function buildObjects(s: HubScene): void {
  const w = s.world;
  const tap = (
    x: number,
    y: number,
    width: number,
    height: number,
    name: string,
    onTap: () => void,
  ) => {
    const z = s.add.zone(x, y, width, height).setInteractive();
    w.add(z);
    z.on('pointerdown', (p: Phaser.Input.Pointer) => {
      s.panTween?.stop();
      s.vel = 0;
      s.press = { kind: 'object', x: p.x, y: p.y, t: s.time.now, moved: false, tap: onTap };
    });
    s.tooltip.attach(
      z,
      () => name,
      () => ({ x: x - s.pan, y: y - height / 2 }),
    );
    return z;
  };

  // 씨앗 상자
  const sb = HUB_OBJECTS.seedBox;
  w.add(s.add.image(sb.x, sb.y, 'hub:seedbox').setOrigin(0.5, 1));
  tap(sb.x, sb.y - 10, 40, 24, t('hub.obj.seedBox'), () => s.openSeedPicker(null));
  s.time.addEvent({
    delay: 2400,
    loop: true,
    callback: () => s.sparkle(sb.x - 4 + Math.random() * 0, sb.y - 20),
  });

  // 축음기
  const ph = HUB_OBJECTS.phonograph;
  s.phono = s.add.image(ph.x, ph.y, 'hub:phono0').setOrigin(0.5, 1);
  w.add(s.phono);
  tap(ph.x, ph.y - 18, 40, 40, t('hub.obj.phonograph'), () => s.openMusic());

  // 난로 · 선풍기
  const st = HUB_OBJECTS.stove;
  w.add(s.add.image(st.x, st.y, 'hub:stove').setOrigin(0.5, 1));
  s.flame = s.add
    .image(st.x, st.y - 8, 'hub:flame0')
    .setOrigin(0.5, 1)
    .setVisible(false);
  w.add(s.flame);
  tap(st.x, st.y - 10, 30, 26, t('hub.obj.stove'), () => s.toggleDevice('stove'));
  const fn = HUB_OBJECTS.fan;
  s.fan = s.add.image(fn.x, fn.y, 'hub:fan0').setOrigin(0.5, 1);
  w.add(s.fan);
  tap(fn.x, fn.y - 16, 28, 34, t('hub.obj.fan'), () => s.toggleDevice('fan'));

  // 정원 문(출격)
  tap(40, 276, 56, 76, t('hub.obj.gate'), () => s.soon('sortie'));

  // 구역 표지(이름 · 잠금)
  s.buildZoneTags();
}

export function buildZoneTags(s: HubScene): void {
  for (const o of s.zoneTags) o.destroy();
  s.zoneTags = [];
  for (const zone of HUB_ZONES) {
    const l = HUB_LAYOUT[zone];
    if (!l) continue;
    const unlocked = isZoneUnlocked(s.state, zone);
    const text = unlocked
      ? t(ZONES[zone].nameKey)
      : t('hub.zoneLocked', { name: t(ZONES[zone].nameKey), level: ZONES[zone].unlockLevel });
    const label = pixelText(s, l.labelX, l.labelY, text, {
      size: 9,
      anchorX: 0.5,
      color: unlocked ? RAMPS.R10[4] : RAMPS.R11[3],
    });
    s.world.add(label);
    s.zoneTags.push(label);
    if (!unlocked) {
      const lock = s.add.image(
        l.labelX - label.width / 2 - 8,
        l.labelY + 6,
        iconTexture(s, 'lock'),
      );
      s.world.add(lock);
      s.zoneTags.push(lock);
    }
  }
}

export function buildBlinds(s: HubScene): void {
  s.blindGfx?.destroy();
  for (const b of s.blindButtons) b.destroy();
  s.blindButtons = [];
  s.blindGfx = s.add.graphics();
  s.world.add(s.blindGfx);
  s.world.sendToBack(s.blindGfx);
  s.world.moveTo(s.blindGfx, 1);
  s.drawBlinds();
  if (s.state.player.level < CARE_UNLOCK.LIGHT) return;
  for (const zone of BLIND_ZONES) {
    const l = HUB_LAYOUT[zone];
    if (!l || !isZoneUnlocked(s.state, zone)) continue;
    const x = l.to - 10;
    const y = l.labelY - 2;
    const img = s.add.image(x, y, iconTexture(s, 'blind')).setInteractive();
    s.world.add(img);
    img.on('pointerdown', (p: Phaser.Input.Pointer) => {
      s.vel = 0;
      s.press = {
        kind: 'object',
        x: p.x,
        y: p.y,
        t: s.time.now,
        moved: false,
        tap: () => s.cycleBlind(zone),
      };
    });
    s.tooltip.attach(
      img,
      () => t('hub.obj.blind', { zone: t(ZONES[zone].nameKey) }),
      () => ({ x: x - s.pan, y }),
    );
    s.blindButtons.push(img);
  }
}

export function drawBlinds(s: HubScene): void {
  const g = s.blindGfx;
  if (!g) return;
  g.clear();
  for (const zone of BLIND_ZONES) {
    const l = HUB_LAYOUT[zone];
    const state = s.state.garden.blinds[zone] ?? 'OPEN';
    if (!l || state === 'OPEN') continue;
    const top = 96;
    const full = l.y - top - 2;
    const h = state === 'CLOSED' ? full : Math.round(full / 2);
    g.fillStyle(toInt(RAMPS.R9[4]), 1).fillRect(l.from, top, l.to - l.from, h);
    for (let y = top; y < top + h; y += 4) {
      g.fillStyle(toInt(RAMPS.R9[3]), 1).fillRect(l.from, y + 3, l.to - l.from, 1);
    }
    g.fillStyle(toInt(RAMPS.R10[2]), 1).fillRect(l.from, top + h, l.to - l.from, 2);
  }
}
