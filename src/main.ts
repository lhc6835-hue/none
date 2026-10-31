// 부팅: 서비스 · 오디오를 만들고 Phaser 를 띄운다.

import Phaser from 'phaser';
import { AtlasCache } from './art/AtlasCache';
import { AudioBus } from './audio/AudioBus';
import { Sfx } from './audio/Sfx';
import { RAMPS } from './art/palette';
import { OffsetClock } from './core/Clock';
import { computeScreen } from './core/Screen';
import { createServices, pickStorage } from './core/Services';
import { setLanguage } from './i18n';
import { createPlant, freeSlot, openSlots } from './systems/garden/Garden';
import { ArtGalleryScene } from './scenes/ArtGalleryScene';
import { BootScene } from './scenes/BootScene';
import { DebugOverlay } from './scenes/DebugOverlay';
import { HubScene } from './scenes/HubScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { CareScene } from './scenes/CareScene';
import { SortieScene } from './scenes/SortieScene';
import { BattleScene } from './scenes/battle/BattleScene';
import { UIKitScene } from './scenes/UIKitScene';
import { UIOverlay } from './scenes/UIOverlay';
import { setApp } from './scenes/context';
import { fitCanvas, installPointerTransform, viewSize } from './ui/Layout';

const debug = new URLSearchParams(window.location.search).get('debug') === '1';

// 디버그에서는 '시간 앞으로 감기'(치트 패널)를 위해 오프셋 시계를 쓴다
const services = createServices({
  storage: pickStorage(),
  debug,
  clock: debug ? new OffsetClock() : undefined,
});
const audio = new AudioBus();
const sfx = new Sfx(audio);

// 설정 → 언어 · 음량에 바로 반영
const applySettings = (settings: ReturnType<typeof services.settings.get>) => {
  setLanguage(settings.language);
  document.documentElement.lang = settings.language;
  audio.setVolumes(settings.volume);
};
applySettings(services.settings.get());
services.bus.on('settings:changed', ({ settings }) => applySettings(settings));

const view = viewSize();
const initial = computeScreen(view.w, view.h, window.devicePixelRatio || 1, view.coarse);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: initial.logicalW,
  height: initial.logicalH,
  backgroundColor: RAMPS.R4[0],
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  disableContextMenu: true,
  banner: false,
  audio: { noAudio: true }, // 소리는 자체 AudioBus(ZzFX)로 낸다
  scale: { mode: Phaser.Scale.NONE },
  input: { activePointers: 3 },
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    HubScene,
    CareScene,
    SortieScene,
    BattleScene,
    ArtGalleryScene,
    UIKitScene,
    UIOverlay,
    DebugOverlay,
  ],
});

const atlas = new AtlasCache(game.textures);
setApp(game, { services, audio, sfx, atlas });

game.events.once(Phaser.Core.Events.READY, () => {
  installPointerTransform(game);
  fitCanvas(game);
  const refit = () => {
    fitCanvas(game);
  };
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', refit);
  window.visualViewport?.addEventListener('resize', refit);
});

// 첫 입력에서 오디오를 깨운다(브라우저 자동재생 정책). 터치는 touchend 에서 허용된다.
for (const type of ['pointerdown', 'pointerup', 'keydown', 'touchend'] as const) {
  window.addEventListener(type, () => audio.unlock(), { passive: true });
}

// 탭을 벗어나면 음소거 + 즉시 저장, 돌아오면 0.5초에 걸쳐 복귀
document.addEventListener('visibilitychange', () => {
  const hidden = document.visibilityState === 'hidden';
  audio.setHidden(hidden);
  if (hidden) services.autoSave.flush('hidden');
});

// 브라우저 기본 동작 막기: 두 손가락 확대, ctrl+휠 확대
document.addEventListener('gesturestart', (e) => e.preventDefault());
window.addEventListener('wheel', (e) => e.ctrlKey && e.preventDefault(), { passive: false });

// 자동 저장은 게임 루프 시간으로 센다(setInterval 금지)
game.events.on(Phaser.Core.Events.POST_STEP, (_time: number, delta: number) => {
  services.autoSave.tick(delta);
});

if (debug) {
  // 디버그 전용: 테스트 · 스크린샷용 도우미(정원에 바로 자란 식물을 넣는다)
  const grant = (speciesId: string, stage = 4, level = 5): string | null => {
    const state = services.state;
    if (!state) return null;
    const zone = 'WINDOW' as const;
    let slot = freeSlot(state, zone);
    if (slot === null) {
      state.garden.slotsOpen[zone] = openSlots(state, zone) + 1;
      slot = freeSlot(state, zone);
    }
    if (slot === null) return null;
    const plant = createPlant(state, speciesId, zone, slot, services.clock.now());
    plant.stage = stage as typeof plant.stage;
    plant.level = level;
    plant.quality = 3;
    plant.personality = 'BRAVE';
    plant.gp = 1e6;
    state.plants.push(plant);
    return plant.uid;
  };
  (window as unknown as { __dotline: unknown }).__dotline = {
    game,
    services,
    audio,
    sfx,
    atlas,
    grant,
  };
}
