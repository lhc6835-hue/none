// 이펙트 입자. 모든 효과는 "빠르게 터지고 천천히 사라지는" 리듬을 따른다.
import { bayer } from './frame.js';

export const K = { SPARK: 0, DROP: 1, PUFF: 2, SHARD: 3, STAR: 4, RING: 5, MOTE: 6 };
const MAX = 1600;

export class Fx {
  constructor(rng) { this.ps = []; this.lights = []; this.rng = rng; }

  add(p) { if (this.ps.length < MAX) this.ps.push(p); return p; }
  // 속도만큼 늘어나는 불꽃. 빛을 내고 바닥에 튕긴다
  spark(x, y, vx, vy, life, c1, c2, glow = 0.35, g = 0.18) {
    return this.add({ k: K.SPARK, x, y, vx, vy, life, max: life, c1, c2, glow, g, drag: 0.97 });
  }
  // 수액 방울: 땅에 닿으면 사라진다
  drop(x, y, vx, vy, life, c1, c2) {
    return this.add({ k: K.DROP, x, y, vx, vy, life, max: life, c1, c2, glow: 0.25, g: 0.2, drag: 0.99 });
  }
  // 반투명 연기·먼지: 부풀면서 옅어진다
  puff(x, y, vx, vy, life, r, c, a = 0.6, rise = 0.01) {
    return this.add({ k: K.PUFF, x, y, vx, vy, life, max: life, r0: r, c1: c, a, rise });
  }
  // 굴러가다 멈추는 파편
  shard(x, y, vx, vy, life, c1, c2, size = 2) {
    return this.add({ k: K.SHARD, x, y, vx, vy, life, max: life, c1, c2, size, g: 0.2, rest: false });
  }
  // 반짝이는 십자 별
  star(x, y, life, size, c1, c2, glow = 0.5) {
    return this.add({ k: K.STAR, x, y, vx: 0, vy: 0, life, max: life, size, c1, c2, glow });
  }
  // 퍼지는 고리
  ring(x, y, r0, r1, life, c1, glow = 0.3) {
    return this.add({ k: K.RING, x, y, vx: 0, vy: 0, life, max: life, r0, r1, c1, glow });
  }
  // 떠다니는 빛가루
  mote(x, y, vx, vy, life, c1, glow = 0.25) {
    return this.add({ k: K.MOTE, x, y, vx, vy, life, max: life, c1, glow, ph: this.rng.range(0, 6.28) });
  }
  // 순간 번쩍이고 제곱으로 꺼지는 빛
  flash(x, y, r, c, k, life) { this.lights.push({ x, y, r, c, k, life, max: life }); }

  update(terrain) {
    for (const p of this.ps) {
      p.life--;
      switch (p.k) {
        case K.SPARK: case K.DROP: {
          p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag;
          const nx = p.x + p.vx, ny = p.y + p.vy;
          if (terrain && terrain.solid(nx | 0, ny | 0)) {
            if (p.k === K.DROP) { p.life = 0; break; }
            if (terrain.solid(nx | 0, p.y | 0)) p.vx *= -0.4; else p.vy *= -0.35;
            p.vx *= 0.7;
          } else { p.x = nx; p.y = ny; }
          break;
        }
        case K.SHARD: {
          if (p.rest) break;
          p.vy += p.g; p.vx *= 0.99;
          const nx = p.x + p.vx, ny = p.y + p.vy;
          if (terrain && terrain.solid(nx | 0, ny | 0)) {
            if (Math.abs(p.vy) < 0.8) { p.rest = true; break; }
            p.vy *= -0.3; p.vx *= 0.6;
          } else { p.x = nx; p.y = ny; }
          break;
        }
        case K.PUFF:
          p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy = p.vy * 0.92 - p.rise;
          break;
        case K.MOTE:
          p.ph += 0.05;
          p.x += p.vx + Math.sin(p.ph) * 0.15; p.y += p.vy + Math.cos(p.ph * 0.7) * 0.1;
          break;
      }
    }
    this.ps = this.ps.filter(p => p.life > 0);
    for (const l of this.lights) l.life--;
    this.lights = this.lights.filter(l => l.life > 0);
  }

  draw(f) {
    for (const p of this.ps) {
      const t = 1 - p.life / p.max; // 0 → 1
      switch (p.k) {
        case K.SPARK: case K.DROP: {
          const sp = Math.hypot(p.vx, p.vy), L = Math.min(4, 0.6 + sp * 0.7);
          const ux = p.vx / (sp || 1), uy = p.vy / (sp || 1);
          f.line(p.x - ux * L, p.y - uy * L, p.x, p.y, p.c2, 1 - t * 0.6);
          f.px(p.x, p.y, t < 0.7 ? p.c1 : p.c2);
          if (p.k === K.DROP && t < 0.5) f.px(p.x + 1, p.y, p.c2);
          if (p.glow) f.glow(p.x, p.y, 4, p.c1, p.glow * (1 - t));
          break;
        }
        case K.SHARD: {
          const a = p.life / p.max < 0.25 ? p.life / p.max * 4 : 1;
          for (let yy = 0; yy < p.size; yy++)
            for (let xx = 0; xx < p.size; xx++) f.dot(p.x + xx, p.y + yy, yy === 0 ? p.c2 : p.c1, a);
          break;
        }
        case K.PUFF: {
          const r = p.r0 * (1 + t * 1.6);
          f.disc(p.x, p.y, r, p.c1, p.a * (1 - t) * (1 - t));
          break;
        }
        case K.STAR: {
          const e = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8; // 빠르게 커지고 천천히 작아진다
          const arm = Math.round(p.size * e);
          f.px(p.x, p.y, p.c2);
          for (let k = 1; k <= arm; k++) {
            const c = k === arm ? p.c1 : p.c2;
            f.px(p.x + k, p.y, c); f.px(p.x - k, p.y, c); f.px(p.x, p.y + k, c); f.px(p.x, p.y - k, c);
          }
          f.glow(p.x, p.y, 6 + arm * 2, p.c1, p.glow * e);
          break;
        }
        case K.RING: {
          const e = 1 - (1 - t) ** 3;
          const r = p.r0 + (p.r1 - p.r0) * e, a = 1 - t;
          const n = Math.max(8, Math.ceil(r * 6.3));
          for (let k = 0; k < n; k++) {
            const ang = (k / n) * Math.PI * 2;
            f.dot(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r, p.c1, a);
          }
          if (p.glow) f.glow(p.x, p.y, r + 6, p.c1, p.glow * a * 0.5);
          break;
        }
        case K.MOTE: {
          const a = Math.min(1, p.life / 30, (p.max - p.life) / 30);
          const sx = Math.floor(p.x) - f.cx, sy = Math.floor(p.y) - f.cy;
          if (a > bayer(sx & 3, sy & 3)) f.px(p.x, p.y, p.c1);
          f.glow(p.x, p.y, 5, p.c1, p.glow * a * (0.7 + 0.3 * Math.sin(p.ph * 3)));
          break;
        }
      }
    }
    for (const l of this.lights) f.glow(l.x, l.y, l.r, l.c, l.k * (l.life / l.max) ** 2);
  }
}
