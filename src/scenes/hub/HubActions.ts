// 허브 씬에서 떼어 낸 부분. 함수 첫 인자 s 가 HubScene 이다.

import type { SongGenre, ZoneId } from '../../core/schema';
import { CARE_UNLOCK } from '../../data/care';
import { PLANT_BASE_BY_ID } from '../../data/plants';
import { HUB_ZONES, ZONES } from '../../data/zones';
import { t } from '../../i18n';
import { setBlind, setMusic, setTemperature } from '../../systems/garden/CareSocial';
import { freeSlot, plantSeed } from '../../systems/garden/Garden';
import type { OfflineReport } from '../../systems/garden/Offline';
import { bagModal, musicModal, offlineModal, seedPickerModal } from '../../ui/panels/GardenPanels';
import { settingsModal } from '../../ui/SettingsPanel';
import { getApp } from '../context';
import { overlay } from '../UIOverlay';
import type { HubScene } from '../HubScene';

export function soon(s: HubScene, feature: string): void {
  getApp(s).sfx.play('ui_error');
  overlay(s).toast(t('hub.soon', { name: t(`hub.quick.${feature}`) }));
}

export function openSettings(s: HubScene): void {
  const ov = overlay(s);
  ov.openModal(
    settingsModal(s, () => ov.closeModal(), [
      {
        label: t('hub.toTitle'),
        onClick: () => {
          s.state.garden.hubPan = s.pan;
          getApp(s).services.autoSave.flush('toTitle');
          ov.transitionTo('Hub', 'Title');
        },
      },
    ]),
  );
}

export function openBag(s: HubScene): void {
  overlay(s).openModal(bagModal(s.state));
}

export function openMusic(s: HubScene): void {
  if (s.state.player.level < CARE_UNLOCK.MUSIC) {
    s.lockedToast(CARE_UNLOCK.MUSIC);
    return;
  }
  overlay(s).openModal(
    musicModal(s.state.garden.music, (genre) => {
      s.setMusicGenre(genre);
      overlay(s).closeModal();
    }),
  );
}

export function setMusicGenre(s: HubScene, genre: SongGenre | null): void {
  if (!setMusic(s.state, genre)) return;
  const app = getApp(s);
  app.sfx.play(genre ? 'heart' : 'ui_close');
  overlay(s).toast(genre ? t('hub.musicOn', { genre: t(`music.${genre}`) }) : t('hub.musicOff'));
}

export function toggleDevice(s: HubScene, device: 'stove' | 'fan'): void {
  const need = CARE_UNLOCK.TEMP;
  if (s.state.player.level < need) {
    s.lockedToast(need);
    return;
  }
  const on = !s.state.garden[device];
  if (!setTemperature(s.state, device, on)) return;
  getApp(s).sfx.play(on ? 'heart' : 'ui_close');
  overlay(s).toast(t(on ? 'hub.deviceOn' : 'hub.deviceOff', { name: t(`hub.obj.${device}`) }));
  s.syncSpots();
}

export function cycleBlind(s: HubScene, zone: ZoneId): void {
  const order = ['OPEN', 'HALF', 'CLOSED'] as const;
  const cur = s.state.garden.blinds[zone] ?? 'OPEN';
  const next = order[(order.indexOf(cur) + 1) % 3];
  if (!setBlind(s.state, zone, next)) return;
  getApp(s).sfx.play('ui_click');
  s.drawBlinds();
  overlay(s).toast(t(`hub.blind.${next}`, { zone: t(ZONES[zone].nameKey) }));
  s.syncSpots();
}

export function lockedToast(s: HubScene, level: number): void {
  getApp(s).sfx.play('ui_error');
  overlay(s).toast(t('hub.needLevel', { level }));
}

export function openSeedPicker(s: HubScene, target: { zone: ZoneId; slot: number } | null): void {
  overlay(s).openModal(
    seedPickerModal(s.state, (speciesId) => {
      overlay(s).closeModal();
      s.plantSeedAt(speciesId, target);
    }),
  );
}

export function plantSeedAt(
  s: HubScene,
  speciesId: string,
  target: { zone: ZoneId; slot: number } | null,
): boolean {
  const app = getApp(s);
  const base = PLANT_BASE_BY_ID.get(speciesId);
  if (!base) return false;
  let zone: ZoneId | null = target?.zone ?? null;
  let slot: number | null = target?.slot ?? null;
  if (!zone) {
    for (const z of HUB_ZONES) {
      if (ZONES[z].aquaticOnly && !base.care.aquatic) continue;
      const free = freeSlot(s.state, z);
      if (free !== null) {
        zone = z;
        slot = free;
        break;
      }
    }
  }
  if (!zone) {
    app.sfx.play('ui_error');
    overlay(s).toast(t('hub.noFreeSlot'));
    return false;
  }
  const r = plantSeed(s.state, speciesId, zone, slot, s.session.now(), app.services.bus);
  if (!r.ok) {
    app.sfx.play('ui_error');
    overlay(s).toast(t(`hub.plantFail.${r.reason}`));
    return false;
  }
  app.sfx.play('plant_place');
  s.refreshSpots();
  const spot = s.spots.find((s) => s.plant?.uid === r.plant.uid);
  if (spot) {
    s.dustBurst(spot.x, spot.y - 8);
    spot.container.setScale(1, 0.7);
    s.tweens.add({ targets: spot.container, scaleY: 1, duration: 220, ease: 'Back.easeOut' });
    // 화면 밖이면 그 칸이 보이게 이동
    const view = spot.x - s.pan;
    if (view < 40 || view > 600) s.glide(spot.x - 320 - s.pan, 420);
  }
  app.services.autoSave.flush('plant');
  return true;
}

export function openCare(s: HubScene, uid: string): void {
  const ov = overlay(s);
  if (ov.hasModal) return;
  s.state.garden.hubPan = s.pan;
  ov.transitionTo('Hub', 'Care', { uid });
}

/** 이름을 기다리는 식물이 있으면 처음 눈뜨기 연출로 간다 */

/** 이름을 기다리는 식물이 있으면 처음 눈뜨기 연출로 간다 */
export function queueCeremony(s: HubScene, delay: number): void {
  if (s.ceremonyQueued) return;
  const waiting = s.state.plants.find((p) => p.flags.needsName);
  if (!waiting) return;
  s.ceremonyQueued = true;
  s.time.delayedCall(delay, () => {
    const ov = overlay(s);
    if (ov.hasModal || ov.isTransitioning) {
      s.ceremonyQueued = false;
      s.queueCeremony(1000);
      return;
    }
    s.state.garden.hubPan = s.pan;
    ov.transitionTo('Hub', 'Care', { uid: waiting.uid, ceremony: true });
  });
}

export function afterOffline(s: HubScene, report: OfflineReport): void {
  const show = report.lines.length > 0 || report.elapsedMs >= 10 * 60_000;
  s.refreshSpots();
  s.hud.refresh(s.state, false);
  if (show) {
    overlay(s).openModal({
      ...offlineModal(s.state, report),
      buttons: [
        {
          label: t('offline.ok'),
          variant: 'primary',
          onClick: () => s.time.delayedCall(250, () => s.queueCeremony(200)),
        },
      ],
    });
  } else {
    s.queueCeremony(300);
  }
}
