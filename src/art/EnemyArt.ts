// 적 스프라이트 (08문서 1절): 주 램프는 잿빛 R12, 종마다 강조 램프 하나. 얼굴은 사선 눈 + 물결 입, 잉크색 #f8a577.
// 2프레임(걷기)을 절차적으로 만든다. 모든 색은 66색 팔레트 안이다.

import type Phaser from 'phaser';
import { PixelCanvas } from './PixelCanvas';
import { RAMPS, SPECIAL } from './palette';

interface Look {
  /** 강조 램프 */
  accent: string;
  /** 몸 모양: 둥글게 · 길쭉하게 · 마디(기차) · 껍질(소용돌이) */
  shape: 'blob' | 'beetle' | 'train' | 'shell' | 'pill' | 'queen';
  wings?: boolean;
}

const LOOKS: Record<string, Look> = {
  E01: { accent: 'R1', shape: 'blob' },
  E02: { accent: 'R10', shape: 'shell' },
  E03: { accent: 'R7', shape: 'beetle' },
  E04: { accent: 'R2', shape: 'train' },
  E04S: { accent: 'R2', shape: 'blob' },
  E05: { accent: 'R11', shape: 'pill' },
  B1: { accent: 'R9', shape: 'queen' },
};

const FACE = RAMPS.R7[4]; // #f8a577

export function enemyKey(id: string, frame: number, flying: boolean): string {
  return `enemy:${id}:${flying ? 'f' : 'g'}${frame}`;
}

export function enemyTexture(
  scene: Phaser.Scene,
  id: string,
  size: number,
  frame: number,
  flying = false,
): string {
  const key = enemyKey(id, frame, flying);
  if (scene.textures.exists(key)) return key;
  const look = LOOKS[id] ?? LOOKS.E01;
  const acc = (RAMPS as Record<string, readonly string[]>)[look.accent];
  const g = RAMPS.R12;
  const w = size + 4;
  const h = size + 4;
  const c = new PixelCanvas(w, h);
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2) + 1;
  const r = Math.max(4, Math.floor(size / 2) - 1);
  const bob = frame === 1 ? 1 : 0;
  // 다리(2프레임)
  const legs = Math.max(2, Math.floor(size / 5));
  for (let i = 0; i < legs; i++) {
    const lx = cx - r + 2 + Math.floor(((2 * r - 4) * i) / Math.max(1, legs - 1));
    const up = (i + frame) % 2 === 0 ? 0 : 1;
    c.px(lx, cy + r - 1 - up + 1, SPECIAL.INK);
    c.px(lx, cy + r + 1 - up, SPECIAL.INK);
  }
  const body = (bx: number, by: number, br: number, base: string, hi: string, lo: string) => {
    c.disc(bx, by, br + 1, SPECIAL.INK);
    c.disc(bx, by, br, base);
    c.disc(bx - 1, by - 1, Math.max(1, br - 2), hi);
    c.hline(bx - br + 1, by + br - 1, Math.max(1, br * 2 - 2), lo);
  };
  if (look.shape === 'train') {
    const segs = 3;
    const sr = Math.max(3, Math.floor(r * 0.7));
    for (let i = segs - 1; i >= 0; i--)
      body(
        cx - Math.floor(((segs - 1) / 2 - i) * sr * 1.5),
        cy + ((i + frame) % 2),
        sr,
        g[2],
        acc[3],
        g[1],
      );
  } else if (look.shape === 'queen') {
    body(cx, cy + bob, r, g[2], g[3], g[1]);
    body(
      cx - Math.floor(r * 0.55),
      cy - Math.floor(r * 0.55) + bob,
      Math.floor(r * 0.45),
      acc[3],
      acc[4],
      acc[2],
    );
    c.disc(cx + Math.floor(r * 0.2), cy + Math.floor(r * 0.15) + bob, Math.floor(r * 0.5), acc[2]); // 꿀단지 배
    for (let i = 0; i < 3; i++) c.hline(cx - r + 4, cy - 2 + i * 4 + bob, 2 * r - 8, acc[4]);
  } else {
    body(cx, cy + bob, r, g[2], g[3], g[1]);
    if (look.shape === 'shell') {
      c.disc(cx + 1, cy - 1 + bob, Math.max(2, r - 3), acc[3]);
      c.disc(cx + 1, cy - 1 + bob, Math.max(1, r - 6), acc[2]);
      c.px(cx + 1, cy - 1 + bob, acc[4]);
    } else if (look.shape === 'beetle') {
      c.vline(cx, cy - r + 2 + bob, r * 2 - 3, SPECIAL.INK);
      c.rect(cx - r + 2, cy - 1 + bob, r * 2 - 3, 2, acc[3]);
    } else if (look.shape === 'pill') {
      for (let i = -1; i <= 1; i++)
        c.hline(cx - r + 2, cy + i * 3 + bob, r * 2 - 3, i === 0 ? acc[4] : acc[3]);
    } else {
      c.px(cx + 2, cy + 2 + bob, acc[3]).px(cx - 3, cy + 1 + bob, acc[3]); // 진딧물 점
    }
  }
  // 날개
  if (look.wings || flying) {
    const wy = cy - r + bob + (frame === 1 ? -1 : 0);
    c.disc(cx - r, wy, 2, SPECIAL.PAPER);
    c.disc(cx + r, wy, 2, SPECIAL.PAPER);
    c.px(cx - r, wy, RAMPS.R4[4]).px(cx + r, wy, RAMPS.R4[4]);
  }
  // 얼굴: 사선 눈 + 물결 입(보스 48px 는 눈 2×2)
  const eye = size >= 40 ? 2 : 1;
  const ey = cy - Math.floor(r * 0.25) + bob;
  const ex = Math.max(2, Math.floor(r * 0.35));
  c.rect(cx - ex - eye, ey, eye, eye, FACE).rect(cx + ex, ey, eye, eye, FACE);
  c.px(cx - ex - eye - 1, ey - 1, FACE).px(cx + ex + eye, ey - 1, FACE); // 사선
  const my = ey + 3 + (size >= 40 ? 2 : 0);
  c.px(cx - 1, my, FACE)
    .px(cx, my + 1, FACE)
    .px(cx + 1, my, FACE);
  return c.toTexture(scene, key);
}
