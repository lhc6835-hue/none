// 선반 위 화분 한 칸: 화분 + 식물(PlantView) + 욕구 말풍선 + 빈 칸/잠긴 칸 표시.
// 허브가 칸 목록을 다시 만들 때마다 새로 만들고, 상태가 바뀌면 sync() 로 표정 · 말풍선만 갱신한다.

import Phaser from 'phaser';
import { gridToCanvas } from '../../art/GridCanvas';
import { generatePot } from '../../art/PotSpriteGen';
import { POT_STYLE_OF } from '../../art/HubArt';
import type { Stage } from '../../art/bodies/Ctx';
import type { PlantInstance, ZoneId } from '../../core/schema';
import { iconTexture } from '../../ui/IconTex';
import { PlantView } from '../../ui/PlantView';
import { baseOf, bubbleOf, type BubbleKind } from '../../systems/garden/Garden';
import type { PlantEnv } from '../../systems/garden/Environment';
import { moodExpression } from '../../ui/PlantMood';

export type SpotKind = 'plant' | 'empty' | 'locked';

const BUBBLE_ICON: Record<Exclude<BubbleKind, null>, string> = {
  water: 'drop',
  hungry: 'leaf',
  mold: 'mold',
  pest: 'bug',
  wither: 'wither',
  sick: 'sick',
  sulk: 'sulk',
  sleep: 'zzz',
  rootbound: 'roots',
  topple: 'stake',
  bloom: 'star',
};

function potTexture(scene: Phaser.Scene, potId: string): string {
  const style = POT_STYLE_OF[potId] ?? 'clay';
  const key = `pot:${style}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, gridToCanvas(generatePot(style)));
  return key;
}

export class PlantSpot {
  readonly container: Phaser.GameObjects.Container;
  readonly hit: Phaser.GameObjects.Zone;
  view: PlantView | undefined;
  private pot: Phaser.GameObjects.Image | undefined;
  private bubble: Phaser.GameObjects.Container | undefined;
  private bubbleKind: BubbleKind = null;
  private bob: Phaser.Tweens.Tween | undefined;

  constructor(
    private readonly scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    readonly zone: ZoneId,
    readonly slot: number,
    readonly x: number,
    readonly y: number,
    readonly kind: SpotKind,
    readonly plant: PlantInstance | undefined,
  ) {
    this.container = scene.add.container(x, y);
    parent.add(this.container);
    // 터치 판정 24×40 (16×16 이상)
    this.hit = scene.add.zone(x, y - 20, 28, 44).setInteractive();
    this.hit.setData('world', true);
    parent.add(this.hit);

    if (kind === 'plant' && plant) {
      this.pot = scene.add.image(0, 0, potTexture(scene, plant.potId)).setOrigin(0.5, 1);
      this.view = new PlantView(scene, 0, -11, {
        speciesId: plant.speciesId,
        stage: plant.stage as Stage,
        variant: plant.variant,
        seed: plant.uid,
      });
      this.container.add([this.view, this.pot]);
      // 화분이 식물 앞(아래쪽)에 오도록: 식물을 먼저, 화분을 나중에 그린다
      this.container.bringToTop(this.pot);
    } else {
      const key = kind === 'locked' ? 'hub:slot-locked' : 'hub:slot-empty';
      this.container.add(scene.add.image(0, -8, key).setOrigin(0.5, 1));
      if (kind === 'locked')
        this.container.add(scene.add.image(0, -18, iconTexture(scene, 'lock')).setOrigin(0.5, 1));
      else
        this.container.add(scene.add.image(0, -14, iconTexture(scene, 'seed')).setOrigin(0.5, 1));
    }
  }

  /** 월드 좌표에서 식물 몸통 중앙(시선 · 파티클 기준) */
  get bodyPoint(): { x: number; y: number } {
    const h = this.view ? this.view.height : 20;
    return { x: this.x, y: this.y - 11 - h / 2 };
  }

  /** 욕구 · 환경에서 표정과 말풍선을 갱신한다 */
  sync(env: PlantEnv): void {
    const plant = this.plant;
    if (!plant || !this.view) return;
    const base = baseOf(plant.speciesId);
    const { expression, sleeping } = moodExpression(plant, base, env);
    this.view.setExpression(expression);
    this.view.hold(sleeping ? 'sleep' : null);

    const kind = bubbleOf(plant, base, env);
    if (kind !== this.bubbleKind) {
      this.bubbleKind = kind;
      this.bubble?.destroy();
      this.bob?.stop();
      this.bubble = undefined;
      if (kind) {
        const top = -11 - this.view.height - 4;
        const img = this.scene.add.image(0, 0, 'hub:bubble').setOrigin(0.5, 1);
        const icon = this.scene.add.image(0, -9, iconTexture(this.scene, BUBBLE_ICON[kind]));
        icon.setOrigin(0.5, 0.5);
        this.bubble = this.scene.add.container(0, top, [img, icon]);
        this.container.add(this.bubble);
        this.bob = this.scene.tweens.add({
          targets: this.bubble,
          y: top - 2,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  setLook(wx: number, wy: number): void {
    this.view?.lookAt(wx, wy);
  }

  destroy(): void {
    this.bob?.stop();
    this.hit.destroy();
    this.container.destroy();
  }
}
