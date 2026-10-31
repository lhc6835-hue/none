// 부팅: 서비스 · 오디오를 만들고 Phaser 를 띄운다.

import Phaser from 'phaser';
import { AudioBus } from './audio/AudioBus';
import { Sfx } from './audio/Sfx';
import { RAMPS } from './art/palette';
import { computeScreen } from './core/Screen';
import { createServices, pickStorage } from './core/Services';
import { setLanguage } from './i18n';
import { BootScene } from './scenes/BootScene';
import { DebugOverlay } from './scenes/DebugOverlay';
import { HubScene } from './scenes/HubScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { UIOverlay } from './scenes/UIOverlay';
import { setApp } from './scenes/context';
import { fitCanvas } from './ui/Layout';

const debug = new URLSearchParams(window.location.search).get('debug') === '1';

const services = createServices({ storage: pickStorage(), debug });
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

const initial = computeScreen(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);

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
  scene: [BootScene, PreloadScene, TitleScene, HubScene, UIOverlay, DebugOverlay],
});

setApp(game, { services, audio, sfx });

game.events.once(Phaser.Core.Events.READY, () => {
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
  (window as unknown as { __dotline: unknown }).__dotline = { game, services, audio, sfx };
}
