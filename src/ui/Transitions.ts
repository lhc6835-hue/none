// 화면 전환: 흙 디졸브 (10문서 3절 "흙 디졸브(픽셀 디졸브, 300ms)")
// 8×8 블록을 흙 색(R10)으로 무작위 순서로 덮었다가(150ms) 장면을 바꾸고 걷어 낸다(150ms).
// 알파 블렌딩 없이 팔레트 색 블록만 써서 중간 프레임에도 팔레트 밖 색이 생기지 않는다.

import type Phaser from 'phaser';
import { PixelCanvas } from '../art/PixelCanvas';
import { RAMPS } from '../art/palette';
import { Rng } from '../core/Rng';

const BLOCK = 8;
const COLS = 100; // 800 / 8
const ROWS = 45; // 360 / 8
const TOTAL = COLS * ROWS;
const SOIL = [RAMPS.R10[1], RAMPS.R10[2], RAMPS.R10[2], RAMPS.R10[3]];

export class SoilDissolve {
  private readonly pixels = new PixelCanvas(COLS * BLOCK, ROWS * BLOCK);
  private readonly order: number[];
  private readonly colorOf: number[];
  private readonly image: Phaser.GameObjects.Image;
  private readonly key = 'transition:soil';
  /** 지금 덮인 블록 수 */
  private covered = 0;

  constructor(private readonly scene: Phaser.Scene) {
    const rng = new Rng('art:soil-dissolve');
    this.order = rng.shuffle(Array.from({ length: TOTAL }, (_, i) => i));
    this.colorOf = Array.from({ length: TOTAL }, () => rng.int(0, SOIL.length - 1));
    this.pixels.toTexture(scene, this.key);
    this.image = scene.add.image(-80, 0, this.key).setOrigin(0, 0).setDepth(1000).setVisible(false);
  }

  private blockRect(index: number): [number, number] {
    return [(index % COLS) * BLOCK, Math.floor(index / COLS) * BLOCK];
  }

  /** 덮인 블록 수를 목표로 맞춘다(늘리면 칠하고, 줄이면 지운다). */
  private setCovered(target: number): void {
    const goal = Math.max(0, Math.min(TOTAL, Math.round(target)));
    if (goal === this.covered) return;
    const ctx = this.pixels.canvas.getContext('2d');
    if (!ctx) return;
    if (goal > this.covered) {
      for (let i = this.covered; i < goal; i++) {
        const idx = this.order[i];
        const [x, y] = this.blockRect(idx);
        this.pixels.rect(x, y, BLOCK, BLOCK, SOIL[this.colorOf[idx]]);
        // 블록 가장자리 1px 어두운 선으로 흙덩이 느낌
        this.pixels.hline(x, y + BLOCK - 1, BLOCK, RAMPS.R10[0]);
        this.pixels.vline(x + BLOCK - 1, y, BLOCK, RAMPS.R10[0]);
      }
    } else {
      for (let i = goal; i < this.covered; i++) {
        const [x, y] = this.blockRect(this.order[i]);
        ctx.clearRect(x, y, BLOCK, BLOCK);
      }
    }
    this.covered = goal;
    const tex = this.scene.textures.get(this.key) as Phaser.Textures.CanvasTexture;
    tex.refresh();
  }

  /** 덮기: onCovered 는 화면이 완전히 가려진 순간에 불린다. */
  cover(durationMs: number, onCovered: () => void): void {
    this.image.setVisible(true);
    this.run(0, TOTAL, durationMs, 'Quad.easeIn', onCovered);
  }

  /** 걷어 내기 */
  uncover(durationMs: number, onDone: () => void): void {
    this.run(TOTAL, 0, durationMs, 'Quad.easeOut', () => {
      this.image.setVisible(false);
      onDone();
    });
  }

  private run(from: number, to: number, durationMs: number, ease: string, done: () => void): void {
    const state = { v: from };
    this.setCovered(from);
    this.scene.tweens.add({
      targets: state,
      v: to,
      duration: durationMs,
      ease,
      onUpdate: () => this.setCovered(state.v),
      onComplete: () => {
        this.setCovered(to);
        done();
      },
    });
  }

  get active(): boolean {
    return this.image.visible;
  }
}
