// 씬이 공유하는 앱 컨텍스트. main.ts 가 Phaser 레지스트리에 한 번 넣고, 씬은 getApp(scene)으로 꺼낸다.

import type Phaser from 'phaser';
import type { AudioBus } from '../audio/AudioBus';
import type { Sfx } from '../audio/Sfx';
import type { Services } from '../core/Services';

export interface AppContext {
  services: Services;
  audio: AudioBus;
  sfx: Sfx;
}

const KEY = 'app';

export function setApp(game: Phaser.Game, app: AppContext): void {
  game.registry.set(KEY, app);
}

export function getApp(scene: Phaser.Scene): AppContext {
  const app = scene.registry.get(KEY) as AppContext | undefined;
  if (!app) throw new Error('AppContext 가 아직 등록되지 않았습니다');
  return app;
}
