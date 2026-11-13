// 주인공 「호롱」: 유리 등불 머리, 청록 목도리, 등에 멘 수액통, 손에 든 놋쇠 노즐.
import { makeSprite } from '../core/frame.js';
import { PAL } from '../core/color.js';
import { moveBody } from './body.js';
import { GRAVITY, MAX_FALL } from '../config.js';
import { sfx, setJet } from '../core/audio.js';

const MAP = {
  o: PAL.ink, C: PAL.brass[2], c: PAL.brass[1],
  g: PAL.teal[3], A: PAL.sapL[5], a: PAL.sapL[4], d: PAL.sapL[3], e: PAL.sapS[0],
  S: PAL.teal[1], s: PAL.teal[2], p: PAL.cream[2], P: PAL.cream[1],
  B: PAL.brass[1], b: PAL.sapS[1], w: PAL.sapL[3],
};
// 오른쪽을 보는 몸 (다리는 따로 그린다)
const BODY = makeSprite([
  '.....oooooooo...',
  '....oCCCCcccco..',
  '....oggggggggo..',
  '...ogAAaaaaaago.',
  '...ogAaaaaaaago.',
  '...ogaaaaeaeago.',
  '...ogaaaaeaeago.',
  '...ogdaaaaaadgo.',
  '...ogddaaaaddgo.',
  '....oggggggggo..',
  '.oooooSssssssso.',
  '.oBBbbopppppppo.',
  '.oBwwbopppppppo.',
  '.oBwwbopppppPPo.',
  '.oBBbboppppPPPo.',
  '..ooooooPPPPPo..',
], MAP);

export const TANK_MAX = 100;
const RUN = 1.75, ACC_G = 0.4, ACC_A = 0.22, JUMP_V = 5.1;
const NOZZLE_SPEED = 6.9;

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 10; this.h = 19;
    this.vx = 0; this.vy = 0; this.onGround = false; this.hitWall = false;
    this.face = 1; this.aim = 0; this.hp = 3; this.tank = TANK_MAX;
    this.coyote = 0; this.invuln = 0; this.knock = 0; this.dead = false; this.deathT = 0;
    this.firing = false; this.fireIdle = 0; this.runT = 0; this.squash = 0; this.blink = 0;
    this.emptyT = 0;
  }
  get cx() { return this.x + this.w / 2; }
  // 노즐 끝 위치
  nozzle() {
    const hx = this.x + 5 + this.face * 1, hy = this.y + 12;
    return { x: hx + Math.cos(this.aim) * 9, y: hy + Math.sin(this.aim) * 9, hx, hy };
  }

  update(G, input) {
    if (this.dead) { setJet(false); return; }
    const T = G.terrain;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (this.knock > 0) this.knock--;
    else this.vx += Math.max(-(this.onGround ? ACC_G : ACC_A), Math.min(this.onGround ? ACC_G : ACC_A, dir * RUN - this.vx));

    if (this.onGround) this.coyote = 6; else if (this.coyote > 0) this.coyote--;
    if (input.jumpBuffered() && this.coyote > 0) {
      input.consumeJump();
      this.vy = -JUMP_V; this.coyote = 0; this.onGround = false; this.squash = -3;
      sfx('jump');
      for (let k = 0; k < 5; k++) G.fx.puff(this.cx + G.rng.range(-4, 4), this.y + this.h, G.rng.range(-0.6, 0.6), -0.2, 22, 2, PAL.cream[2], 0.35);
    }
    this.vy += GRAVITY * (this.vy < 0 && !input.jumpHeld ? 2.1 : 1);
    this.vy = Math.min(this.vy, MAX_FALL);
    moveBody(this, T, 4);
    if (this.landed > 2.5) {
      this.squash = 4; sfx('land');
      for (let k = 0; k < 6; k++) G.fx.puff(this.cx + G.rng.range(-5, 5), this.y + this.h - 1, G.rng.range(-0.9, 0.9), -0.15, 24, 2, PAL.cream[1], 0.4);
    }
    if (this.squash > 0) this.squash--; else if (this.squash < 0) this.squash++;
    if (Math.abs(this.vx) > 0.3 && this.onGround) this.runT += Math.abs(this.vx) * 0.12;
    else this.runT = 0;

    // 조준과 발사
    const hx = this.x + 5, hy = this.y + 12;
    this.aim = Math.atan2(input.aimY - hy, input.aimX - hx);
    this.face = Math.cos(this.aim) >= 0 ? 1 : -1;
    const wants = input.fire;
    this.firing = wants && this.tank > 0.5;
    if (this.firing) {
      this.tank = Math.max(0, this.tank - 0.75);
      this.fireIdle = 0;
      const n = this.nozzle();
      G.stream.emit(n.x, n.y, this.aim, NOZZLE_SPEED, this.vx * 0.4, this.vy * 0.2, G.rng);
      // 노즐 끝 물보라
      if (G.tick % 3 === 0) G.fx.drop(n.x, n.y, Math.cos(this.aim + G.rng.range(-0.6, 0.6)) * 1.2, Math.sin(this.aim) * 1.2 - 0.5, 14, PAL.sapL[5], PAL.sapL[3]);
      G.fx.flash(n.x, n.y, 10, PAL.sapL[4], 0.35, 2);
    } else {
      this.fireIdle++;
      if (this.fireIdle > 18) this.tank = Math.min(TANK_MAX, this.tank + 0.45);
      if (wants && this.emptyT <= 0) { sfx('empty', 0.2); this.emptyT = 20; }
    }
    if (this.emptyT > 0) this.emptyT--;
    setJet(this.firing);
    if (this.invuln > 0) this.invuln--;
    if (this.blink > 0) this.blink--; else if (G.rng.next() < 0.006) this.blink = 7;
  }

  hurt(G, fromX) {
    if (this.invuln > 0 || this.dead) return;
    this.hp--; this.invuln = 80; this.knock = 10;
    this.vx = (this.cx < fromX ? -1 : 1) * 3; this.vy = -3.2;
    G.shake(4); G.stop(5); sfx('hurt');
    for (let k = 0; k < 10; k++) G.fx.spark(this.cx, this.y + 8, G.rng.range(-2.5, 2.5), G.rng.range(-3, 0), 22, PAL.red[3], PAL.red[2], 0.4);
    if (this.hp <= 0) this.die(G);
  }
  die(G) {
    if (this.dead) return;
    this.dead = true; this.deathT = 70;
    setJet(false); sfx('hurt');
    for (let k = 0; k < 20; k++) G.fx.spark(this.cx, this.y + 6, G.rng.range(-3, 3), G.rng.range(-4, 0), 34, PAL.sapL[5], PAL.sapL[3], 0.5);
    for (let k = 0; k < 6; k++) G.fx.puff(this.cx, this.y + 8, G.rng.range(-1, 1), G.rng.range(-1, 0), 40, 4, PAL.cream[2], 0.5);
    G.fx.flash(this.cx, this.y + 6, 40, PAL.sapL[4], 0.8, 30);
  }

  draw(f, tick) {
    if (this.dead) return;
    if (this.invuln > 0 && (tick >> 2) & 1) return;
    const flip = this.face < 0;
    const x = Math.round(this.x) - (flip ? 2 : 4);
    const sq = this.squash > 0 ? 1 : 0, st = this.squash < 0 ? -1 : 0;
    const idle = this.onGround && Math.abs(this.vx) < 0.3 ? ((tick >> 5) & 1) : 0;
    const y = Math.round(this.y) + sq + st + idle;

    // 목도리 꼬리: 뒤로 휘날린다
    const neckX = x + (flip ? 15 - 6 : 6), neckY = y + 10;
    const flutter = Math.abs(this.vx) > 0.3 || !this.onGround ? 1.3 : 0.6;
    for (let k = 1; k <= 7; k++) {
      const px = neckX - this.face * k;
      const py = neckY + 1 + Math.round(Math.sin(tick * 0.22 + k * 0.9) * flutter * Math.min(1, k / 3) + k * 0.3 - (this.vy < -1 ? k * 0.3 : 0));
      f.px(px, py, k % 3 === 0 ? PAL.teal[1] : PAL.teal[2]);
      if (k < 4) f.px(px, py + 1, PAL.teal[1]);
    }

    f.sprite(BODY, x, y, flip);
    // 눈 깜빡임
    if (this.blink > 0) {
      const ex = (c) => x + (flip ? 15 - c : c);
      f.px(ex(9), y + 5, PAL.sapL[4]); f.px(ex(11), y + 5, PAL.sapL[4]);
    }
    // 등불 속 빛이 일렁인다
    const fl = 0.5 + 0.5 * Math.sin(tick * 0.17) * Math.sin(tick * 0.051);
    f.px(x + (flip ? 15 - 6 : 6), y + 4 + ((tick >> 4) & 1), PAL.sapL[5]);

    // 다리
    const legY = y + 16 - sq;
    const pants = PAL.stone[2];
    const ph = Math.floor(this.runT) & 3;
    const offs = !this.onGround ? [[-1, -1], [1, -1]] : this.runT === 0 ? [[0, 0], [0, 0]] :
      [[[-1, 0], [1, 0]], [[0, -1], [0, 0]], [[1, 0], [-1, 0]], [[0, 0], [0, -1]]][ph];
    const legX = [x + (flip ? 15 - 9 : 8), x + (flip ? 15 - 12 : 11)];
    for (let k = 0; k < 2; k++) {
      const lx = legX[k] + offs[k][0] * this.face, ly = legY + offs[k][1];
      f.rect(lx, ly, 2, 2, pants);
      f.rect(lx, ly + 2, 2, 1, PAL.ink);
    }

    // 노즐: 호스 + 놋쇠 관
    const n = this.nozzle();
    const recoil = this.firing ? ((tick & 1) ? 1 : 0) : 0;
    const bx = x + (flip ? 15 - 3 : 3), by = y + 13;
    f.line(bx, by, n.hx, n.hy + 1, PAL.sapS[1]);
    const ax = Math.cos(this.aim), ay = Math.sin(this.aim);
    f.beam(n.hx, n.hy, n.x - ax * recoil, n.y - ay * recoil, 1.1, PAL.brass[1]);
    f.px(n.x - ax * recoil, n.y - ay * recoil, PAL.brass[2]);
    f.px(n.hx, n.hy, PAL.cream[2]); // 손

    // 등불 빛
    f.glow(x + (flip ? 7 : 8), y + 5, 30, PAL.sapL[4], 0.09 + 0.04 * fl);
    f.glow(x + (flip ? 7 : 8), y + 5, 6, PAL.sapL[5], 0.12);
  }
}
