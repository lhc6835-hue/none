// '게임 방식이 한눈에': 적이 지나갈 길을 따라 흐르는 화살표 + 입구 · 출구 이름표 + 준비 시간 안내 띠.
// 준비 시간과 웨이브 사이(필드에 적이 없을 때)에만 보이고, 싸우는 중에는 숨겨 화면을 어지럽히지 않는다.

import type Phaser from 'phaser';
import { buildFlowArrow } from '../../art/BattleMapArt';
import { RAMPS, SPECIAL } from '../../art/palette';
import type { BattleSim } from '../../systems/battle/BattleSim';
import { posAt, type Route } from '../../systems/battle/Paths';
import { t } from '../../i18n';
import { ensurePanel } from '../../ui/Frames';
import { pixelText } from '../../ui/PixelText';
import { MAP_X, MAP_Y, TILE, px, py } from './FxLayer';

const SPACING = 1.4; // 화살표 간격(타일)
const SPEED = 1.6; // 타일/초

interface Arrow {
  img: Phaser.GameObjects.Image;
  route: Route;
  offset: number;
}

export class BattleFlow {
  private arrows: Arrow[] = [];
  private tags: Phaser.GameObjects.Container[] = [];
  private guide: Phaser.GameObjects.Container | undefined;
  private shown = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: BattleSim,
    showGuide: boolean,
  ) {
    for (const d of [0, 1, 2, 3] as const) {
      const key = `battle:flow${d}`;
      if (!scene.textures.exists(key)) buildFlowArrow(d).toTexture(scene, key);
    }
    for (const route of sim.map.routes) {
      const n = Math.max(1, Math.floor(route.length / SPACING));
      for (let i = 0; i < n; i++) {
        const img = scene.add.image(0, 0, 'battle:flow0').setOrigin(0.5).setDepth(3);
        this.arrows.push({ img, route, offset: i * SPACING });
      }
    }
    // 이름표: 입구 '시듦이 와요' · 출구 '어미나무 뿌리'
    for (const e of sim.map.entries)
      this.tags.push(this.tag(e.x, e.y, t('battle.flow.entry'), 'stone', RAMPS.R7[2]));
    const ex = sim.map.exit;
    this.tags.push(this.tag(ex.x, ex.y, t('battle.flow.exit'), 'leaf', RAMPS.R1[1]));
    if (showGuide) this.buildGuide();
  }

  private tag(
    tx: number,
    ty: number,
    text: string,
    style: 'stone' | 'leaf',
    color: string,
  ): Phaser.GameObjects.Container {
    const label = pixelText(this.scene, 0, 0, text, {
      size: 9,
      bold: true,
      color,
      anchorX: 0.5,
      anchorY: 0.5,
    });
    const w = Math.round(label.width) + 12;
    const bg = this.scene.add.image(0, 0, ensurePanel(this.scene, style, w, 16)).setOrigin(0.5);
    const x = Math.max(MAP_X + w / 2 + 2, Math.min(MAP_X + 26 * TILE - w / 2 - 2, px(tx) + 12));
    const above = py(ty) - 12 >= MAP_Y + 10;
    const y = above ? py(ty) - 10 : py(ty) + TILE + 10;
    return this.scene.add.container(Math.round(x), Math.round(y), [bg, label]).setDepth(40);
  }

  /** 준비 시간 안내: 1 카드 고르기 → 2 길가에 심기 → 3 화살표 길을 지키기 */
  private buildGuide(): void {
    const s = this.scene;
    const text = pixelText(s, 0, 0, t('battle.flow.guide'), {
      size: 9,
      color: SPECIAL.INK,
      anchorX: 0.5,
      anchorY: 0.5,
    });
    const w = Math.round(text.width) + 20;
    const bg = s.add.image(0, 0, ensurePanel(s, 'wood', w, 18)).setOrigin(0.5);
    this.guide = s.add.container(320, MAP_Y + 12 * TILE - 14, [bg, text]).setDepth(41);
    s.tweens.add({
      targets: this.guide,
      y: this.guide.y - 2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  update(time: number): void {
    const sim = this.sim;
    const quiet =
      sim.phase === 'PREP' || (sim.phase === 'RUNNING' && !sim.enemies.some((e) => e.alive));
    const show = quiet && sim.phase !== 'WON' && sim.phase !== 'LOST';
    if (show !== this.shown) {
      this.shown = show;
      for (const a of this.arrows) a.img.setVisible(show);
      for (const tg of this.tags) tg.setVisible(show);
    }
    if (this.guide && sim.phase !== 'PREP') {
      this.guide.destroy();
      this.guide = undefined;
    }
    if (!show) return;
    const run = (time / 1000) * SPEED;
    for (const a of this.arrows) {
      const len = a.route.length;
      const s = (a.offset + run) % len;
      const p = posAt(a.route, s);
      const q = posAt(a.route, Math.min(len, s + 0.2));
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const dir = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 1) : dy >= 0 ? 2 : 3;
      a.img.setTexture(`battle:flow${dir}`);
      a.img.setPosition(Math.round(MAP_X + p.x * TILE), Math.round(MAP_Y + p.y * TILE));
      // 출구 가까이에서는 사라진다(뿌리 그림을 가리지 않게)
      a.img.setVisible(len - s > 0.6);
    }
  }
}
