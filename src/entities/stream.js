// 물대포: 물방울을 매 틱 두 줄로 쏘고, 같은 줄의 이웃끼리 굵은 선으로 이어 하나의 물줄기로 그린다.
import { PAL } from '../core/color.js';
import { sfx } from '../core/audio.js';

const G_DROP = 0.065;
const LANES = 2;
const PER_HIT = 5;         // 물방울 하나가 땅에 남기는 칸 수
const LINK = 15;           // 이 거리 안이면 선으로 잇는다

export class Stream {
  constructor() { this.drops = []; this.seq = 0; this.burst = 0; this.wasFiring = false; }

  emit(x, y, ang, speed, pvx, pvy, rng) {
    if (!this.wasFiring) this.burst++;
    this.wasFiring = true;
    this.lastEmit = true;
    for (let k = 0; k < LANES; k++) {
      const a = ang + rng.range(-0.03, 0.03) + (k - 0.5) * 0.025;
      const sp = speed * rng.range(0.97, 1.03);
      this.drops.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp + pvx, vy: Math.sin(a) * sp + pvy,
        lane: k, burst: this.burst, id: this.seq++, age: 0, dead: false, wob: rng.range(0, 6.28) });
    }
  }

  update(G) {
    if (!this.lastEmit) this.wasFiring = false;
    this.lastEmit = false;
    const T = G.terrain;
    for (const d of this.drops) {
      if (d.dead) continue;
      d.age++; d.px = d.x; d.py = d.y;
      d.vy += G_DROP;
      const steps = Math.max(1, Math.ceil(Math.hypot(d.vx, d.vy) / 1.5));
      for (let s = 0; s < steps && !d.dead; s++) {
        const nx = d.x + d.vx / steps, ny = d.y + d.vy / steps;
        if (nx < 0 || nx >= T.w || ny >= T.h + 10 || d.age > 160) { d.dead = true; break; }
        // 적에 맞으면 굳어 가며 무거워진다
        for (const e of G.enemies) {
          if (!e.dead && nx >= e.x && nx < e.x + e.w && ny >= e.y && ny < e.y + e.h) {
            e.coatHit(G, nx, ny); d.dead = true; break;
          }
        }
        if (d.dead) break;
        if (ny >= 0 && T.filled(nx | 0, ny | 0)) {
          const placed = T.deposit(d.x, d.y, PER_HIT);
          this.splash(G, d, placed);
          d.dead = true; break;
        }
        d.x = nx; d.y = ny;
      }
    }
    this.drops = this.drops.filter(d => !d.dead);
  }

  splash(G, d, placed) {
    const rng = G.rng;
    if (rng.next() < 0.35) {
      const sp = Math.hypot(d.vx, d.vy);
      const bx = -d.vx / sp, by = -d.vy / sp;
      G.fx.drop(d.x, d.y, (bx + rng.range(-0.8, 0.8)) * rng.range(0.6, 1.8), (by - 0.6 + rng.range(-0.5, 0.3)) * rng.range(0.6, 1.6),
        rng.int(10, 20), PAL.sapL[5], PAL.sapL[3]);
    }
    if (rng.next() < 0.05) G.fx.puff(d.x, d.y, rng.range(-0.3, 0.3), -0.2, 20, 2, PAL.sapL[4], 0.25);
    if (placed && rng.next() < 0.3) sfx('splat', 0.05);
    G.fx.flash(d.x, d.y, 8, PAL.sapL[4], 0.18, 3);
  }

  draw(f) {
    const prev = new Array(LANES).fill(null);
    // 바깥 몸통 → 안쪽 밝은 심 순서로 두 번 그린다
    const pairs = [];
    for (const d of this.drops) {
      const p = prev[d.lane];
      if (p && p.burst === d.burst && d.id - p.id <= LANES * 2 && Math.hypot(d.x - p.x, d.y - p.y) < LINK) pairs.push([p, d]);
      prev[d.lane] = d;
    }
    for (const [a, b] of pairs) f.beam(a.x, a.y, b.x, b.y, 1.9, PAL.sapL[2]);
    for (const [a, b] of pairs) f.beam(a.x, a.y, b.x, b.y, 1.1, PAL.sapL[3]);
    for (const [a, b] of pairs) {
      const t = Math.sin(a.wob + a.age * 0.5) > 0.3;
      f.line(a.x, a.y - 0.6, b.x, b.y - 0.6, t ? PAL.sapL[5] : PAL.sapL[4]);
    }
    // 물줄기 끝과 떨어져 나온 방울
    const linked = new Set();
    for (const [a, b] of pairs) { linked.add(a); linked.add(b); }
    for (const d of this.drops) {
      if (!linked.has(d)) { f.circle(d.x, d.y, 1.2, PAL.sapL[3]); f.px(d.x, d.y - 1, PAL.sapL[5]); }
      if (d.id % 3 === 0) f.glow(d.x, d.y, 9, PAL.sapL[4], 0.09);
    }
  }
}
