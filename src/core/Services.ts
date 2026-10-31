// 씬이 공유하는 서비스 묶음. Phaser 레지스트리에 한 번 넣고 getServices(scene)로 꺼내 쓴다.

import { AutoSave } from './AutoSave';
import { systemClock, type Clock } from './Clock';
import { EventBus } from './EventBus';
import type { GameEvents } from './events';
import { createInitialState, type GameState } from './GameState';
import { MemoryStorage, SaveSystem, type LoadResult, type StorageLike } from './SaveSystem';
import { SettingsStore } from './Settings';

export interface Services {
  /** 시작 전(타이틀)에는 null */
  state: GameState | null;
  clock: Clock;
  bus: EventBus<GameEvents>;
  save: SaveSystem;
  settings: SettingsStore;
  autoSave: AutoSave;
  /** 부팅 때 읽은 저장 결과. 타이틀이 '이어하기' 가능 여부와 안내문을 정하는 데 쓴다. */
  loadResult: LoadResult;
  debug: boolean;
}

/** localStorage가 막힌 환경(사생활 보호 모드 등)이면 메모리 저장소로 대체한다. */
export function pickStorage(): StorageLike {
  try {
    const probe = '__dotline_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return new MemoryStorage();
  }
}

export function createServices(opts: {
  storage: StorageLike;
  clock?: Clock;
  debug?: boolean;
}): Services {
  const clock = opts.clock ?? systemClock;
  const bus = new EventBus<GameEvents>();
  const save = new SaveSystem(opts.storage);
  const loadResult = save.load();
  const services: Services = {
    state:
      loadResult.status === 'ok' || loadResult.status === 'recovered' ? loadResult.state : null,
    clock,
    bus,
    save,
    settings: new SettingsStore(opts.storage, bus),
    // 클로저는 services가 만들어진 뒤에 불리므로 안전하다.
    autoSave: new AutoSave(save, () => services.state, clock, bus),
    loadResult,
    debug: opts.debug ?? false,
  };
  if (loadResult.status === 'recovered') bus.emit('save:recovered', { from: 'backup' });
  return services;
}

/** 새 게임을 시작한다(기존 저장은 백업으로 한 번 남긴다). */
export function startNewGame(services: Services, playerName = ''): GameState {
  services.save.reset();
  const state = createInitialState(services.clock.now());
  state.player.name = playerName;
  services.state = state;
  services.autoSave.flush('newGame');
  return state;
}
