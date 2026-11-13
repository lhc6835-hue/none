// 적: 수액이 마른 세계에서 태어난 「마름이」들. 외눈, 세 가지 색, 진한 외곽선.
import { PAL } from '../core/color.js';
import { moveBody, overlap } from './body.js';
import { GRAVITY, MAX_FALL } from '../config.js';
import { AMBER, LIQ, EMPTY } from '../world/terrain.js';
import { sfx } from '../core/audio.js';

// 발 앞쪽 아래에 디딜 땅이 있는지 (호박 바닥의 작은 구멍은 무시한다)
function groundAhead(T, x, footY) {
  for (let d = 1; d <= 5; d++) if (T.solid(Math.floor(x), Math.floor(footY + d))) return true;
  return false;
}

class Enemy {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0; this.onGround = false; this.hitWall = false;
    this.coat = 0; this.coatT = 0; this.flash = 0; this.dead = false; this.dir = -1;
    this.coatRate = 0.03; this.harmful = true; this.flies = false;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  slow() { return 1 - Math.min(0.85, this.coat * 0.9); }
  inShape(dx, dy) { // 기본: 상자에 꽉 찬 타원
    const u = (dx + 0.5 - this.w / 2) / (this.w / 2), v = (dy + 0.5 - this.h / 2) / (this.h / 2);
    return u * u + v * v <= 1.05;
  }
  coatHit(G, x, y) {
    this.coat += this.coatRate; this.coatT = 45; this.flash = 2;
    if (G.rng.next() < 0.25) G.fx.drop(x, y, G.rng.range(-1, 1), G.rng.range(-1.5, -0.3), 14, PAL.sapL[5], PAL.sapL[3]);
    if (this.coat >= 1) this.petrify(G);
  }
  tickCoat() {
    if (this.flash > 0) this.flash--;
    if (this.coatT > 0) this.coatT--; else this.coat = Math.max(0, this.coat - 0.005);
  }
  // 통째로 굳어 호박 지형이 된다
  petrify(G) {
    if (this.dead) return;
    this.dead = true;
    const T = G.terrain, x0 = Math.floor(this.x), y0 = Math.floor(this.y);
    for (let dy = 0; dy < this.h; dy++)
      for (let dx = 0; dx < this.w; dx++) {
        if (!this.inShape(dx, dy)) continue;
        const x = x0 + dx, y = y0 + dy;
        if (x < 0 || x >= T.w || y < 0 || y >= T.h) continue;
        const i = y * T.w + x;
        if (T.grid[i] === EMPTY || T.grid[i] === LIQ) { T.grid[i] = AMBER; T.born[i] = G.tick; T.ambers.push(i); }
      }
    const cx = this.cx, cy = this.cy;
    G.fx.ring(cx, cy, 2, 22, 26, PAL.sapL[5], 0.5);
    G.fx.flash(cx, cy, 46, PAL.sapL[4], 0.9, 24);
    for (let k = 0; k < 4; k++) G.fx.star(cx + G.rng.range(-8, 8), cy + G.rng.range(-8, 6), G.rng.int(20, 34), G.rng.int(2, 4), PAL.sapS[6], PAL.white, 0.5);
    for (let k = 0; k < 10; k++) G.fx.spark(cx, cy, G.rng.range(-2.5, 2.5), G.rng.range(-3, 0.5), G.rng.int(18, 30), PAL.sapL[5], PAL.sapL[3], 0.4);
    for (let k = 0; k < 5; k++) G.fx.puff(cx + G.rng.range(-5, 5), cy, G.rng.range(-0.5, 0.5), -0.3, 34, 3, PAL.cream[2], 0.3);
    G.stop(4); G.shake(2); G.petrified++;
    sfx('petrify', 0.05);
  }
  // 몸에 묻은 수액: 아래부터 차오른다
  drawCoat(f) {
    if (this.coat <= 0) return;
    const x0 = Math.floor(this.x), y0 = Math.floor(this.y), line = this.h * (1 - this.coat);
    for (let dy = 0; dy < this.h; dy++) {
      if (dy < line) continue;
      for (let dx = 0; dx < this.w; dx++) {
        if (!this.inShape(dx, dy)) continue;
        const top = dy - line < 1.2;
        f.blend(x0 + dx, y0 + dy, top ? PAL.sapL[5] : PAL.sapL[3], top ? 0.95 : 0.7);
      }
    }
    f.glow(this.cx, this.cy, 12, PAL.sapL[4], 0.12 * this.coat);
  }
  touchPlayer(G) {
    const p = G.player;
    if (!this.harmful || p.dead || this.dead) return;
    if (overlap(this, { x: p.x + 1, y: p.y + 2, w: p.w - 2, h: p.h - 2 })) p.hurt(G, this.cx);
  }
  // 외곽선이 있는 음영 원 (빛은 왼쪽 위)
  static ball(f, cx, cy, r, R, flash) {
    const n = Math.ceil(r);
    for (let dy = -n; dy <= n; dy++)
      for (let dx = -n; dx <= n; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > r) continue;
        let c;
        if (d > r - 1) c = PAL.ink;
        else {
          const l = (dx + dy) / r;
          c = l < -0.55 ? R[4] : l < -0.05 ? R[3] : l < 0.5 ? R[2] : R[1];
        }
        f.px(cx + dx, cy + dy, flash && d <= r - 1 ? PAL.white : c);
      }
  }
}

// ─── 굴림이: 노려보다가 돌진하는 돌덩이 ───────────────────────
class Rolly extends Enemy {
  constructor(x, y) { super(x, y, 13, 13); this.state = 'patrol'; this.t = 0; this.rot = 0; this.coatRate = 0.028; }
  inShape(dx, dy) { const u = dx + 0.5 - 6.5, v = dy + 0.5 - 6.5; return u * u + v * v <= 42; }
  update(G) {
    this.tickCoat();
    const p = G.player, T = G.terrain, slow = this.slow();
    switch (this.state) {
      case 'patrol': {
        const ahead = groundAhead(T, this.cx + this.dir * 8, this.y + this.h);
        if (this.hitWall || (this.onGround && !ahead)) this.dir *= -1;
        this.vx = this.dir * 0.45 * slow;
        if (!p.dead && Math.abs(p.y + p.h - (this.y + this.h)) < 30 && (p.cx - this.cx) * this.dir > 0 && Math.abs(p.cx - this.cx) < 160) {
          this.state = 'windup'; this.t = 30;
        }
        break;
      }
      case 'windup':
        this.vx = 0;
        if (G.tick % 4 === 0) G.fx.puff(this.cx - this.dir * 5, this.y + this.h, -this.dir * 0.6, -0.2, 18, 2, PAL.cream[1], 0.3);
        if (--this.t <= 0) { this.state = 'charge'; this.t = 100; }
        break;
      case 'charge':
        this.vx = this.dir * 2.6 * slow;
        if (G.tick % 3 === 0) G.fx.puff(this.cx - this.dir * 6, this.y + this.h - 1, -this.dir * 0.4, -0.15, 20, 2, PAL.cream[1], 0.35);
        if (this.hitWall) {
          const fx = this.cx + this.dir * 8, fy = this.cy;
          const broke = T.erode(fx, fy, 5, G.rng, G.fx);
          this.state = 'stun'; this.t = 110; this.vx = -this.dir * 1.2; this.vy = -2;
          G.shake(broke > 10 ? 4 : 3); sfx('stun', 0.1);
          for (let k = 0; k < 3; k++) G.fx.star(fx, fy + G.rng.range(-5, 5), 16, 3, PAL.brass[2], PAL.white, 0.3);
        } else if (--this.t <= 0) this.state = 'patrol';
        break;
      case 'stun':
        this.vx *= 0.85;
        if (--this.t <= 0) this.state = 'patrol';
        break;
    }
    this.harmful = this.state !== 'stun';
    this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
    moveBody(this, T, 3);
    this.rot += this.vx / 6.5;
    if (this.y > T.h + 20) this.dead = true;
    this.touchPlayer(G);
  }
  draw(f, tick) {
    const shake = this.state === 'windup' ? ((tick >> 1) & 1 ? 1 : -1) : 0;
    const cx = Math.round(this.cx) + shake, cy = Math.round(this.cy), R = PAL.rolly;
    // 발
    const step = this.onGround && Math.abs(this.vx) > 0.1 ? (tick >> 3) & 1 : 0;
    f.rect(cx - 4 + step, cy + 5, 3, 2, PAL.ink); f.rect(cx + 2 - step, cy + 5, 3, 2, PAL.ink);
    Enemy.ball(f, cx, cy, 6.6, R, this.flash > 0);
    // 굴러가며 도는 금
    for (let k = 0; k < 3; k++) {
      const a = this.rot + k * 2.1;
      for (let r = 2; r < 5.5; r += 0.7) f.px(cx + Math.cos(a + r * 0.15) * r, cy + Math.sin(a + r * 0.15) * r, R[1]);
    }
    // 외눈
    const ex = cx + this.dir * 2, ey = cy - 2;
    if (this.state === 'stun') {
      f.px(ex - 1, ey - 1, PAL.ink); f.px(ex + 1, ey + 1, PAL.ink); f.px(ex, ey, PAL.ink); f.px(ex + 1, ey - 1, PAL.ink); f.px(ex - 1, ey + 1, PAL.ink);
      for (let k = 0; k < 3; k++) {
        const a = tick * 0.12 + k * 2.1;
        f.px(cx + Math.cos(a) * 7, cy - 9 + Math.sin(a) * 2, PAL.brass[2]);
      }
    } else {
      f.rect(ex - 1, ey - 1, 3, 3, PAL.white);
      if (this.state === 'patrol' && ((tick + this.x) % 180) < 6) f.rect(ex - 1, ey - 1, 3, 3, R[3]);
      const angry = this.state !== 'patrol';
      f.px(ex + this.dir, ey, angry ? PAL.red[2] : PAL.ink);
      if (angry) { f.px(ex - 1, ey - 2, PAL.ink); f.px(ex, ey - 2, PAL.ink); f.px(ex + 1, ey - 2 + (this.dir > 0 ? 1 : 0), PAL.ink); }
      if (angry) f.glow(ex + this.dir, ey, 6, PAL.red[2], 0.25);
    }
    this.drawCoat(f);
  }
}

// ─── 톡톡이: 씨앗을 뱉는 꽃봉오리 ───────────────────────────
class Pod extends Enemy {
  constructor(x, y) { super(x, y, 13, 17); this.t = 80; this.aim = Math.PI; this.recoil = 0; this.coatRate = 0.022; }
  inShape(dx, dy) { if (dy > 11) return dx > 3 && dx < 10; const u = (dx + 0.5 - 6.5) / 6, v = (dy + 0.5 - 6) / 6; return u * u + v * v <= 1; }
  update(G) {
    this.tickCoat();
    const p = G.player;
    if (this.recoil > 0) this.recoil--;
    if (!p.dead) {
      const dx = p.cx - this.cx, dy = p.y + 8 - (this.y + 6), d = Math.hypot(dx, dy);
      if (d < 230) {
        const want = Math.atan2(dy, dx);
        this.aim += Math.atan2(Math.sin(want - this.aim), Math.cos(want - this.aim)) * 0.08;
        this.t -= this.slow();
        if (this.t <= 0) {
          const sp = 1.9;
          const mx = this.cx + Math.cos(this.aim) * 5, my = this.y + 6 + Math.sin(this.aim) * 5;
          G.seeds.push(new Seed(mx, my, Math.cos(this.aim) * sp, Math.sin(this.aim) * sp));
          this.t = 120; this.recoil = 8; sfx('spit', 0.1);
          for (let k = 0; k < 4; k++) G.fx.puff(mx, my, Math.cos(this.aim) * 0.8 + G.rng.range(-0.3, 0.3), Math.sin(this.aim) * 0.8, 16, 2, PAL.pod[3], 0.4);
        }
      }
    }
    this.touchPlayer(G);
  }
  draw(f, tick) {
    const x = Math.round(this.x), y = Math.round(this.y), cx = x + 6, P = PAL.pod, Lf = PAL.leaf;
    const sway = Math.round(Math.sin(tick * 0.04 + this.x) * 0.6);
    // 잎과 줄기
    for (let k = 0; k < 5; k++) {
      f.px(cx - 2 - k, y + 16 - Math.floor(k * 0.6), k === 4 ? Lf[3] : Lf[2]);
      f.px(cx - 2 - k, y + 17 - Math.floor(k * 0.6), Lf[1]);
      f.px(cx + 2 + k, y + 16 - Math.floor(k * 0.5), k === 4 ? Lf[3] : Lf[2]);
      f.px(cx + 2 + k, y + 17 - Math.floor(k * 0.5), Lf[1]);
    }
    f.rect(cx - 1, y + 11, 2, 6, Lf[1]); f.px(cx - 1, y + 11, Lf[2]);
    // 봉오리
    const sq = this.recoil > 4 ? 1 : 0;
    const bx = cx + sway, by = y + 6 + sq;
    Enemy.ball(f, bx, by, 6.2 - sq * 0.3, P, this.flash > 0);
    // 꽃잎 가시
    for (const [dx, h] of [[-3, 3], [0, 4], [3, 3]]) for (let k = 1; k <= h; k++) f.px(bx + dx + (k === h ? Math.sign(dx) : 0), by - 6 - k + 1, k === h ? P[4] : P[3]);
    // 입: 겨누는 쪽으로 열리고, 쏘기 전엔 빨갛게 달아오른다
    const charging = this.t < 26;
    const mx = bx + Math.round(Math.cos(this.aim) * 3), my = by + Math.round(Math.sin(this.aim) * 3);
    f.circle(mx, my, charging ? 2 : 1.5, PAL.ink);
    if (charging) { f.px(mx, my, (tick >> 1) & 1 ? PAL.red[3] : PAL.red[2]); f.glow(mx, my, 10, PAL.red[2], 0.35 * (1 - this.t / 26)); }
    // 외눈 (입 반대쪽 위)
    const ex = bx - Math.round(Math.cos(this.aim) * 2), ey = by - 3;
    f.px(ex, ey, PAL.white); f.px(ex + 1, ey, PAL.white); f.px(ex + (Math.cos(this.aim) > 0 ? 1 : 0), ey, PAL.ink);
    this.drawCoat(f);
  }
}

export class Seed {
  constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = 300; this.dead = false; }
  update(G) {
    const T = G.terrain;
    for (let s = 0; s < 2 && !this.dead; s++) {
      this.x += this.vx / 2; this.y += this.vy / 2;
      if (--this.life <= 0 || this.x < 0 || this.x >= T.w || this.y >= T.h) { this.dead = true; break; }
      if (T.filled(this.x | 0, this.y | 0)) {
        const c = T.cell(this.x | 0, this.y | 0);
        if (c === AMBER || c === LIQ) T.erode(this.x, this.y, 3, G.rng, G.fx);
        for (let k = 0; k < 5; k++) G.fx.spark(this.x, this.y, G.rng.range(-1.5, 1.5), G.rng.range(-2, 0.5), 14, PAL.red[3], PAL.pod[2], 0.3);
        G.fx.puff(this.x, this.y, 0, -0.2, 18, 3, PAL.pod[2], 0.35);
        sfx('seedHit', 0.06);
        this.dead = true; break;
      }
      const p = G.player;
      if (!p.dead && this.x > p.x - 1 && this.x < p.x + p.w + 1 && this.y > p.y && this.y < p.y + p.h) {
        p.hurt(G, this.x); this.dead = true;
      }
    }
    if (G.tick % 4 === 0) G.fx.puff(this.x, this.y, 0, 0, 14, 1.2, PAL.pod[1], 0.3, 0);
  }
  draw(f, tick) {
    f.circle(this.x, this.y, 1.6, PAL.pod[0]);
    f.px(this.x, this.y, (tick >> 2) & 1 ? PAL.red[2] : PAL.red[3]);
    f.glow(this.x, this.y, 8, PAL.red[2], 0.3);
  }
}

// ─── 팔랑이: 먼지 나방. 굳히면 공중에 떠 있는 발판이 된다 ─────────
class Flit extends Enemy {
  constructor(x, y) {
    super(x, y, 10, 8); this.hx = x; this.hy = y; this.state = 'hover'; this.t = 60; this.ph = x * 0.1;
    this.tx = 0; this.ty = 0; this.coatRate = 0.05; this.flies = true;
  }
  update(G) {
    this.tickCoat();
    const p = G.player, slow = this.slow();
    this.ph += 0.05;
    if (this.coat > 0.45) { // 무거워져서 가라앉는다
      this.vy = Math.min(this.vy + 0.05, 1.2); this.vx *= 0.9;
      this.x += this.vx; this.y += this.vy;
      if (G.terrain.boxHits(this.x, this.y, this.w, this.h)) { this.y -= this.vy; this.vy = 0; }
    } else {
      switch (this.state) {
        case 'hover': {
          const tx = this.hx + Math.sin(this.ph) * 18, ty = this.hy + Math.sin(this.ph * 2.1) * 6;
          this.x += (tx - this.x) * 0.05 * slow; this.y += (ty - this.y) * 0.05 * slow;
          if (!p.dead && Math.abs(p.cx - this.cx) < 120 && p.y > this.y - 20 && --this.t <= 0) {
            this.state = 'aim'; this.t = 26; this.tx = p.cx; this.ty = p.y + 8;
          }
          break;
        }
        case 'aim':
          this.y -= 0.3;
          if (--this.t <= 0) { this.state = 'dive'; this.t = 60; }
          break;
        case 'dive': {
          const dx = this.tx - this.cx, dy = this.ty - this.cy, d = Math.hypot(dx, dy) || 1;
          const sp = 2.3 * slow;
          this.x += (dx / d) * sp; this.y += (dy / d) * sp;
          if (G.tick % 3 === 0) G.fx.puff(this.cx, this.cy, 0, 0, 16, 1.5, PAL.moth[3], 0.3, 0);
          if (d < 4 || --this.t <= 0 || G.terrain.boxHits(this.x, this.y, this.w, this.h)) { this.state = 'back'; }
          break;
        }
        case 'back':
          this.x += (this.hx - this.x) * 0.04; this.y += (this.hy - this.y) * 0.04;
          if (Math.hypot(this.hx - this.x, this.hy - this.y) < 4) { this.state = 'hover'; this.t = 90; }
          break;
      }
    }
    this.dir = p.cx > this.cx ? 1 : -1;
    if (this.y > G.terrain.h + 10) this.dead = true;
    this.touchPlayer(G);
  }
  draw(f, tick) {
    const x = Math.round(this.x), y = Math.round(this.y), M = PAL.moth;
    const flap = this.coat > 0.45 ? 0 : (tick >> (this.state === 'dive' ? 1 : 2)) & 1;
    // 날개 (반투명)
    for (const s of [-1, 1]) {
      const wx = x + 5 + s * 3;
      for (let k = 0; k < 4; k++)
        for (let j = 0; j <= 3 - k; j++) {
          const py = flap ? y + 1 - k : y + 4 + k;
          f.blend(wx + s * j, py, k === 0 || j === 3 - k ? M[3] : M[4], 0.8);
        }
    }
    // 몸통: 보송보송한 타원
    for (let dy = 0; dy < 6; dy++)
      for (let dx = 0; dx < 8; dx++) {
        const u = (dx - 3.5) / 4, v = (dy - 2.5) / 3, d = u * u + v * v;
        if (d > 1.1) continue;
        let c = d > 0.75 ? PAL.ink : (dx + dy < 5 ? M[3] : dy > 3 ? M[1] : M[2]);
        if (d > 0.75 && ((dx + dy + (tick >> 3)) & 1)) c = M[1];
        f.px(x + 1 + dx, y + 1 + dy, this.flash > 0 ? PAL.white : c);
      }
    // 더듬이와 외눈
    f.px(x + 3, y, M[1]); f.px(x + 2, y - 1, M[2]); f.px(x + 6, y, M[1]); f.px(x + 7, y - 1, M[2]);
    const ex = x + 4 + (this.dir > 0 ? 1 : -1);
    f.px(ex, y + 3, PAL.white); f.px(ex + 1, y + 3, PAL.white);
    f.px(ex + (this.dir > 0 ? 1 : 0), y + 3, this.state === 'aim' || this.state === 'dive' ? PAL.red[2] : PAL.ink);
    if (this.state === 'aim') f.glow(ex, y + 3, 6, PAL.red[2], 0.3);
    this.drawCoat(f);
  }
}

// ─── 갉작이: 호박을 찾아가 갉아먹는 마디 애벌레 ──────────────────
class Grub extends Enemy {
  constructor(x, y) { super(x, y, 15, 7); this.eatT = 0; this.seekT = 0; this.target = null; this.chew = 0; this.coatRate = 0.035; }
  update(G) {
    this.tickCoat();
    const T = G.terrain, slow = this.slow();
    // 앞에 호박이 있으면 갉는다
    const fx = Math.floor(this.cx + this.dir * (this.w / 2 + 1));
    let amberAhead = -1;
    for (let dy = -3; dy < this.h + 3; dy++) if (T.cell(fx, Math.floor(this.y + dy)) === AMBER) { amberAhead = Math.floor(this.y + dy); break; }
    if (amberAhead >= 0) {
      this.vx = 0; this.chew++;
      if (--this.eatT <= 0) {
        T.erode(fx + this.dir, amberAhead + 1, 2, G.rng, G.fx);
        this.eatT = 10; sfx('chomp', 0.08);
      }
    } else {
      this.chew = 0;
      // 가까운 호박 냄새를 맡는다
      if (--this.seekT <= 0) {
        this.seekT = 20; this.target = null;
        for (let d = 8; d < 90 && !this.target; d += 3)
          for (const s of [1, -1]) {
            const x = Math.floor(this.cx + s * d);
            for (let dy = -6; dy < this.h + 4; dy += 2) if (T.cell(x, Math.floor(this.y + dy)) === AMBER) { this.target = s; break; }
            if (this.target) break;
          }
      }
      if (this.target) this.dir = this.target;
      const ahead = groundAhead(T, this.cx + this.dir * 9, this.y + this.h);
      if (this.hitWall || (this.onGround && !ahead)) { this.dir *= -1; this.target = null; this.seekT = 40; }
      this.vx = this.dir * 0.4 * slow;
    }
    this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
    moveBody(this, T, 2);
    if (this.y > T.h + 20) this.dead = true;
    this.touchPlayer(G);
  }
  draw(f, tick) {
    const x = Math.round(this.x), y = Math.round(this.y), Gr = PAL.grub;
    const head = this.dir > 0 ? 2 : 0;
    for (let s = 0; s < 3; s++) {
      const sx = x + 3 + s * 4.5, bob = Math.round(Math.sin(tick * 0.2 + s * 1.3) * (Math.abs(this.vx) > 0.05 ? 0.8 : 0.2));
      const r = s === head ? 3.6 : 3.1;
      Enemy.ball(f, sx, y + 3.5 + bob, r, Gr, this.flash > 0);
      if (s !== head) f.px(sx, y + 1 + bob, Gr[1]);
    }
    const hx = x + 3 + head * 4.5, hy = y + 3;
    // 외눈과 턱
    f.px(hx + this.dir, hy - 1, PAL.white); f.px(hx + this.dir * 2, hy - 1, PAL.ink);
    const open = this.chew > 0 && (tick >> 2) & 1;
    f.px(hx + this.dir * 3, hy + 1, PAL.ink); f.px(hx + this.dir * 4, hy + (open ? 0 : 1), PAL.ink);
    f.px(hx + this.dir * 3, hy + 3, PAL.ink); f.px(hx + this.dir * 4, hy + (open ? 4 : 3), PAL.ink);
    this.drawCoat(f);
  }
}

export function createEnemy(spec, terrain) {
  const gy = x => terrain.groundY(Math.floor(x), 60);
  switch (spec.type) {
    case 'rolly': return new Rolly(spec.x, gy(spec.x + 6) - 13);
    case 'pod': return new Pod(spec.x, gy(spec.x + 6) - 17);
    case 'flit': return new Flit(spec.x, spec.y);
    case 'grub': return new Grub(spec.x, gy(spec.x + 7) - 7);
  }
  throw new Error(`모르는 적: ${spec.type}`);
}
