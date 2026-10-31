// 전투 이펙트 레이어: 시뮬레이션 이벤트 → 입자 · 선 · 고리 · 소리. 종마다 (모양 × 색 × 꼬리 × 타격) 가 달라 한눈에 구분된다.
// 알파 블렌딩 없이 팔레트 색 사각형 입자만 쓴다.

import Phaser from 'phaser';
import { fxShapeTexture, pixelTexture, rampColor } from '../../art/BattleFx';
import { RAMPS, SPECIAL, toInt } from '../../art/palette';
import type { FxSpec, HitFx } from '../../data/battle/types';
import type { SfxId } from '../../data/sfx';
import { getApp } from '../context';

interface Particle {
  obj: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  gy: number;
  life: number;
}

export const TILE = 24;
export const MAP_X = 8;
export const MAP_Y = 24;
export const px = (tx: number): number => MAP_X + tx * TILE;
export const py = (ty: number): number => MAP_Y + ty * TILE;

export class FxLayer {
  private parts: Particle[] = [];
  private gfx: Phaser.GameObjects.Graphics;
  private lines: { pts: [number, number][]; color: string; life: number; w: number }[] = [];
  private rings: { x: number; y: number; r: number; max: number; color: string; life: number }[] =
    [];

  constructor(private readonly scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(41);
  }

  private spawn(
    x: number,
    y: number,
    color: string,
    vx: number,
    vy: number,
    life: number,
    o: { size?: number; gy?: number } = {},
  ): void {
    if (this.parts.length > 420) return;
    const img = this.scene.add
      .image(Math.round(x), Math.round(y), pixelTexture(this.scene, color, o.size ?? 2))
      .setDepth(42);
    this.parts.push({ obj: img, vx, vy, gy: o.gy ?? 0, life });
  }

  /** 피격 이펙트 14종: 타격 종류마다 입자의 모양 · 움직임이 다르다 */
  hit(x: number, y: number, fx: FxSpec | null, bigger = false): void {
    if (!fx) return;
    const c1 = rampColor(fx.color);
    const c2 = fx.color2 ? rampColor(fx.color2) : c1;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const n = bigger ? 1.6 : 1;
    const kind: HitFx = fx.hit;
    const burst = (
      count: number,
      sp: number,
      life: number,
      o: { size?: number; gy?: number; colors?: string[] } = {},
    ) => {
      const cols = o.colors ?? [c1, c2];
      for (let i = 0; i < count * n; i++) {
        const a = rnd(0, Math.PI * 2);
        const v = rnd(sp * 0.4, sp);
        this.spawn(x, y, cols[i % cols.length], Math.cos(a) * v, Math.sin(a) * v, life, {
          size: o.size,
          gy: o.gy,
        });
      }
    };
    switch (kind) {
      case 'puff':
        burst(5, 40, 0.3, { colors: [RAMPS.R10[4], c1] });
        break;
      case 'burst':
        burst(10, 90, 0.35);
        break;
      case 'ring':
        this.ring(x, y, 12, c1, 0.3);
        break;
      case 'spark':
        burst(7, 130, 0.2, { size: 1, colors: [SPECIAL.PAPER, c1] });
        break;
      case 'cloud':
        for (let i = 0; i < 5; i++)
          this.spawn(
            x + rnd(-4, 4),
            y + rnd(-2, 2),
            i % 2 ? c1 : c2,
            rnd(-8, 8),
            rnd(-18, -6),
            0.7,
            { size: 3 },
          );
        break;
      case 'frost':
        for (let i = 0; i < 6; i++)
          this.spawn(
            x + rnd(-5, 5),
            y + rnd(-6, 0),
            i % 2 ? SPECIAL.PAPER : c1,
            rnd(-12, 12),
            rnd(10, 30),
            0.6,
            { gy: 40 },
          );
        break;
      case 'ember':
        for (let i = 0; i < 6; i++)
          this.spawn(x + rnd(-4, 4), y, i % 3 ? c1 : c2, rnd(-14, 14), rnd(-50, -20), 0.5, {
            gy: -10,
          });
        break;
      case 'zap':
        this.zap(x, y - 8, x + rnd(-6, 6), y + 4, c1);
        burst(3, 80, 0.15, { size: 1, colors: [SPECIAL.PAPER] });
        break;
      case 'curse':
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this.spawn(
            x + Math.cos(a) * 9,
            y + Math.sin(a) * 9,
            i % 2 ? c1 : c2,
            -Math.cos(a) * 26,
            -Math.sin(a) * 26,
            0.4,
          );
        }
        break;
      case 'bloom':
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.spawn(x, y, i % 2 ? c1 : c2, Math.cos(a) * 45, Math.sin(a) * 45 - 15, 0.5, {
            gy: 30,
          });
        }
        break;
      case 'splash':
        for (let i = 0; i < 6; i++)
          this.spawn(x, y, i % 2 ? c1 : c2, rnd(-40, 40), rnd(-60, -25), 0.5, { gy: 160 });
        break;
      case 'sticky':
        for (let i = 0; i < 4; i++)
          this.spawn(x + rnd(-5, 5), y + rnd(-5, 2), c1, 0, rnd(4, 12), 0.9);
        break;
      case 'slash':
        this.line(
          [
            [x - 6, y - 6],
            [x + 6, y + 6],
          ],
          c1,
          0.12,
          2,
        );
        this.line(
          [
            [x - 4, y - 7],
            [x + 8, y + 5],
          ],
          SPECIAL.PAPER,
          0.1,
          1,
        );
        break;
      case 'glint':
        this.line(
          [
            [x - 5, y],
            [x + 5, y],
          ],
          SPECIAL.PAPER,
          0.18,
          1,
        );
        this.line(
          [
            [x, y - 5],
            [x, y + 5],
          ],
          c1,
          0.18,
          1,
        );
        break;
    }
  }

  /** 퍼지는 고리(점으로 그린다) */
  ring(x: number, y: number, r: number, color: string, life = 0.4): void {
    this.rings.push({ x, y, r: 2, max: r, color, life });
  }

  line(pts: [number, number][], color: string, life = 0.12, w = 1): void {
    this.lines.push({ pts, color, life, w });
  }

  /** 번개: 지그재그 선 */
  zap(x1: number, y1: number, x2: number, y2: number, color: string): void {
    const pts: [number, number][] = [[x1, y1]];
    const n = 5;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push([
        x1 + (x2 - x1) * t + (Math.random() - 0.5) * 8,
        y1 + (y2 - y1) * t + (Math.random() - 0.5) * 8,
      ]);
    }
    pts.push([x2, y2]);
    this.line(pts, color, 0.14, 2);
    this.line(pts, SPECIAL.PAPER, 0.1, 1);
  }

  /** 즉시 명중 · 연쇄 · 광선의 선: 종의 모양에 따라 다르다 */
  shotLine(x1: number, y1: number, x2: number, y2: number, fx: FxSpec, kind: string): void {
    const c1 = rampColor(fx.color);
    const c2 = fx.color2 ? rampColor(fx.color2) : SPECIAL.PAPER;
    if (fx.shape === 'bolt') {
      this.zap(x1, y1, x2, y2, c1);
      return;
    }
    this.line(
      [
        [x1, y1],
        [x2, y2],
      ],
      c1,
      kind === 'chain' ? 0.18 : 0.12,
      2,
    );
    this.line(
      [
        [x1, y1],
        [x2, y2],
      ],
      c2,
      kind === 'chain' ? 0.14 : 0.09,
      1,
    );
    if (fx.trail === 'sparkle') {
      for (let i = 0; i < 4; i++) {
        const t = Math.random();
        this.spawn(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, c2, 0, -10, 0.3, { size: 1 });
      }
    }
  }

  /** 투사체 꼬리 입자 */
  trail(x: number, y: number, fx: FxSpec): void {
    const t = fx.trail ?? 'none';
    if (t === 'none') return;
    const c1 = rampColor(fx.color);
    const c2 = fx.color2 ? rampColor(fx.color2) : c1;
    if (t === 'dots') this.spawn(x, y, c2, 0, 0, 0.22, { size: 1 });
    else if (t === 'sparkle')
      this.spawn(
        x + (Math.random() - 0.5) * 4,
        y + (Math.random() - 0.5) * 4,
        Math.random() < 0.5 ? SPECIAL.PAPER : c1,
        0,
        -8,
        0.3,
        { size: 1 },
      );
    else if (t === 'smoke') this.spawn(x, y, RAMPS.R11[3], (Math.random() - 0.5) * 6, -6, 0.4);
    else if (t === 'line') this.spawn(x, y, c1, 0, 0, 0.12, { size: 1 });
  }

  /** 죽을 때: 잿빛 가루 + 작은 새싹 파티클 */
  death(x: number, y: number, boss: boolean): void {
    const n = boss ? 24 : 7;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = boss ? 70 : 34;
      this.spawn(
        x,
        y,
        i % 3 === 0 ? RAMPS.R12[3] : RAMPS.R12[2],
        Math.cos(a) * v,
        Math.sin(a) * v - 10,
        0.5,
        { gy: 40 },
      );
    }
    this.spawn(x, y, RAMPS.R1[3], 0, -28, 0.7);
    this.spawn(x - 1, y - 2, RAMPS.R1[4], 0, -28, 0.7, { size: 1 });
  }

  sparkles(x: number, y: number, color: string, n = 8): void {
    for (let i = 0; i < n; i++)
      this.spawn(
        x + (Math.random() - 0.5) * 16,
        y + (Math.random() - 0.5) * 10,
        i % 2 ? SPECIAL.PAPER : color,
        (Math.random() - 0.5) * 20,
        -20 - Math.random() * 20,
        0.7,
        { size: 1 },
      );
  }

  update(dt: number): void {
    const keep: Particle[] = [];
    for (const p of this.parts) {
      p.life -= dt;
      if (p.life <= 0) {
        p.obj.destroy();
        continue;
      }
      p.vy += p.gy * dt;
      p.obj.x = Math.round(p.obj.x + p.vx * dt);
      p.obj.y = Math.round(p.obj.y + p.vy * dt);
      keep.push(p);
    }
    this.parts = keep;
    const g = this.gfx;
    g.clear();
    this.lines = this.lines.filter((l) => (l.life -= dt) > 0);
    for (const l of this.lines) {
      g.fillStyle(toInt(l.color), 1);
      for (let i = 1; i < l.pts.length; i++) {
        const [x1, y1] = l.pts[i - 1];
        const [x2, y2] = l.pts[i];
        const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
        for (let s = 0; s <= steps; s++)
          g.fillRect(
            Math.round(x1 + ((x2 - x1) * s) / steps),
            Math.round(y1 + ((y2 - y1) * s) / steps),
            l.w,
            l.w,
          );
      }
    }
    this.rings = this.rings.filter((r) => (r.life -= dt) > 0);
    for (const r of this.rings) {
      r.r += (r.max - r.r) * Math.min(1, dt * 9);
      g.fillStyle(toInt(r.color), 1);
      const n = Math.max(12, Math.floor(r.r * 2));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        g.fillRect(Math.round(r.x + Math.cos(a) * r.r), Math.round(r.y + Math.sin(a) * r.r), 1, 1);
      }
    }
  }

  shapeTexture(fx: FxSpec): string {
    return fxShapeTexture(this.scene, fx.shape, fx.color, fx.color2);
  }

  sfx(id: SfxId, pitch?: number): void {
    getApp(this.scene).sfx.play(id, { pitch });
  }

  destroy(): void {
    for (const p of this.parts) p.obj.destroy();
    this.parts = [];
    this.gfx.destroy();
  }
}
