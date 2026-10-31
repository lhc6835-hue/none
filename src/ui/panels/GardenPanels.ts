// 허브에서 여는 작은 창들: 씨앗 고르기 · 가방 · 음악 고르기 · 그동안 있었던 일.

import type { GameState } from '../../core/GameState';
import type { SongGenre } from '../../core/schema';
import { SONG_GENRES } from '../../data/care';
import { plantDisplayName, itemName, plantSpeciesName } from '../../i18n/names';
import { t } from '../../i18n';
import { seedsOwned } from '../../systems/economy/Inventory';
import { plantByUid } from '../../systems/garden/Garden';
import type { OfflineReport } from '../../systems/garden/Offline';
import type { ModalDef } from '../Modal';
import { pagedList } from './Lists';

export function seedPickerModal(state: GameState, onPick: (speciesId: string) => void): ModalDef {
  const seeds = seedsOwned(state);
  if (seeds.length === 0) {
    return {
      title: t('seed.title'),
      body: t('seed.none'),
      buttons: [{ label: t('common.close') }],
    };
  }
  return {
    title: t('seed.title'),
    width: 280,
    build: pagedList(
      seeds.map((s) => ({
        label: plantSpeciesName(s.speciesId),
        right: `×${s.count}`,
        icon: 'seed',
        onClick: () => onPick(s.speciesId),
      })),
    ),
    buttons: [{ label: t('common.close') }],
  };
}

export function bagModal(state: GameState): ModalDef {
  const rows = Object.entries(state.inventory)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, n]) => ({ label: itemName(id), right: `×${n}` }));
  return {
    title: t('bag.title'),
    body: rows.length === 0 ? t('bag.empty') : undefined,
    width: 280,
    build: rows.length === 0 ? undefined : pagedList(rows),
    buttons: [{ label: t('common.close') }],
  };
}

export function musicModal(
  current: SongGenre | null,
  onPick: (genre: SongGenre | null) => void,
): ModalDef {
  const rows = [
    ...SONG_GENRES.map((g) => ({
      label: `${current === g ? '♪ ' : ''}${t(`music.${g}`)}`,
      onClick: () => onPick(g),
    })),
    { label: t('music.off'), onClick: () => onPick(null) },
  ];
  return {
    title: t('music.title'),
    width: 260,
    build: pagedList(rows, 7),
    buttons: [{ label: t('common.close') }],
  };
}

export function offlineModal(state: GameState, report: OfflineReport): ModalDef {
  const lines: { label: string }[] = [];
  const name = (uid: string) => {
    const p = plantByUid(state, uid);
    return p ? plantDisplayName(p) : '?';
  };
  for (const l of report.lines) {
    if (l.kind === 'stageUp')
      lines.push({ label: t('offline.stageUp', { name: name(l.uid), stage: t(`stage.${l.to}`) }) });
    else if (l.kind === 'bloom') lines.push({ label: t('offline.bloom', { name: name(l.uid) }) });
    else if (l.kind === 'mold')
      lines.push({ label: t('offline.mold', { name: name(l.uid), count: l.count }) });
    else if (l.kind === 'pest') lines.push({ label: t('offline.pest', { name: name(l.uid) }) });
    else lines.push({ label: t('offline.sick', { name: name(l.uid) }) });
  }
  const hours = Math.floor(report.elapsedMs / 3_600_000);
  const minutes = Math.floor((report.elapsedMs % 3_600_000) / 60_000);
  const away = t('offline.away', { h: hours, m: minutes });
  return {
    title: t('offline.title'),
    body: report.capped ? `${away}\n${t('offline.capped')}` : away,
    width: 300,
    build: lines.length === 0 ? undefined : pagedList(lines, 4),
    buttons: [{ label: t('offline.ok'), variant: 'primary' }],
  };
}
