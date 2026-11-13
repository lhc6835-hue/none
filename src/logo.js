// 타이틀 로고 「AMBERLINE」: 직접 디자인한 픽셀 글자, 호박빛 음영, 떨어지는 수액 방울, 물줄기로 긋는 밑줄.
import { PAL } from './core/color.js';
import { Rng } from './core/rng.js';

// 굵은 대문자 (칸 1개 = 2px로 키워서 그린다)
const GLYPHS = {
  A: ['..####..', '.######.', '##....##', '##....##', '########', '########', '##....##', '##....##', '##....##', '##....##'],
  M: ['##....##', '###..###', '########', '##.##.##', '##.##.##', '##....##', '##....##', '##....##', '##....##', '##....##'],
  B: ['######..', '#######.', '##...##.', '##...##.', '######..', '#######.', '##....##', '##....##', '########', '#######.'],
  E: ['########', '########', '##......', '##......', '######..', '######..', '##......', '##......', '########', '########'],
  R: ['######..', '#######.', '##...##.', '##...##.', '#######.', '######..', '##..##..', '##...##.', '##....##', '##....##'],
  L: ['##......', '##......', '##......', '##......', '##......', '##......', '##......', '##......', '########', '########'],
  I: ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '######', '######'],
  N: ['##....##', '###...##', '####..##', '##.##.##', '##.##.##', '##..####', '##...###', '##....##', '##....##', '##....##'],
};
const WORD = 'AMBERLINE';
const CELL = 3, GAP = 3, GH = 10 * CELL;

// 작은 픽셀 글꼴 3x5 (부제용)
const MINI = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], K: ['#.#', '##.', '#..', '##.', '#.#'], P: ['##.', '#.#', '##.', '#..', '#..'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  W: ['#.#', '#.#', '#.#', '###', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], ' ': ['...', '...', '...', '...', '...'],
};

function buildMask() {
  const widths = [...WORD].map(ch => GLYPHS[ch][0].length * CELL);
  const W = widths.reduce((a, b) => a + b, 0) + GAP * (WORD.length - 1);
  const mask = new Uint8Array(W * GH);   // 0 비었음, 1+ 글자 번호+1
  const letters = [];
  let ox = 0;
  [...WORD].forEach((ch, k) => {
    const g = GLYPHS[ch];
    g.forEach((row, r) => [...row].forEach((c, q) => {
      if (c !== '#') return;
      for (let dy = 0; dy < CELL; dy++) for (let dx = 0; dx < CELL; dx++) mask[(r * CELL + dy) * W + ox + q * CELL + dx] = k + 1;
    }));
    letters.push({ x: ox, w: widths[k] });
    ox += widths[k] + GAP;
  });
  return { mask, W, letters };
}

export class Logo {
  constructor() {
    const m = buildMask();
    this.mask = m.mask; this.W = m.W; this.letters = m.letters;
    this.parts = [];
    this.rng = new Rng(4242);
    // 수액 방울이 맺히는 자리: 글자 아랫면 중 몇 곳
    this.drips = [];
    const cand = [];
    for (let x = 0; x < this.W; x++) {
      for (let y = GH - 1; y >= 0; y--) {
        if (this.mask[y * this.W + x] && (y === GH - 1 || !this.mask[(y + 1) * this.W + x])) { cand.push({ x, y: y + 1 }); break; }
      }
    }
    for (let k = 0; k < 7; k++) {
      const c = cand[Math.floor((k + 0.5) / 7 * cand.length + this.rng.range(-4, 4))];
      if (c) this.drips.push({ x: c.x, y: c.y, period: this.rng.int(150, 260), off: this.rng.int(0, 200), len: this.rng.int(3, 7) });
    }
  }

  has(x, y) { return x >= 0 && y >= 0 && x < this.W && y < GH && this.mask[y * this.W + x] > 0; }

  // t: 타이틀이 열린 뒤 지난 틱
  draw(f, t, cx, cy) {
    const saved = [f.cx, f.cy];
    f.cx = 0; f.cy = 0;
    const W = this.W, x0 = Math.round(cx - W / 2), y0 = Math.round(cy - GH / 2 + Math.sin(t * 0.035) * 1.5);
    const S = PAL.sapS, L = PAL.sapL, ink = PAL.ink;

    // 글자마다 위에서 떨어져 내려온다 (빠르게 와서 살짝 튕긴다)
    const drop = this.letters.map((_, k) => {
      const s = (t - 8 - k * 5) / 18;
      if (s <= 0) return null;
      if (s >= 1) return 0;
      const e = 1 - Math.pow(1 - s, 3);
      return Math.round(-46 * (1 - e) + Math.sin(s * Math.PI) * -2);
    });
    this.letters.forEach((_, k) => {
      const s = (t - 8 - k * 5) / 18;
      if (s >= 1 && s < 1 + 1 / 18) this.landPuff(x0 + this.letters[k].x + this.letters[k].w / 2, y0 + GH);
    });
    const at = (x, y) => {
      const v = this.has(x, y) ? this.mask[y * W + x] : 0;
      return v && drop[v - 1] !== null ? v : 0;
    };
    const dy = x => {
      for (let k = 0; k < this.letters.length; k++) {
        const L2 = this.letters[k];
        if (x >= L2.x - 2 && x < L2.x + L2.w + 2) return drop[k] || 0;
      }
      return 0;
    };

    // 뒤쪽 빛
    if (t > 20) f.glow(cx, cy, 190, L[3], Math.min(0.16, (t - 20) * 0.004));

    // 그림자 → 외곽선 → 몸통 순서
    for (let y = -2; y < GH + 3; y++)
      for (let x = -2; x < W + 3; x++) {
        if (at(x - 2, y - 2) && !at(x, y)) f.blend(x0 + x, y0 + y + dy(x - 2), ink, 0.55);
      }
    for (let y = -1; y < GH + 1; y++)
      for (let x = -1; x < W + 1; x++) {
        if (at(x, y)) continue;
        let near = 0;
        for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1 && !near; b++) if (at(x + a, y + b)) near = at(x + a, y + b);
        if (near) f.px(x0 + x, y0 + y + (drop[near - 1] || 0), ink);
      }
    const shine = ((t - 70) % 220) * 1.4 - 30; // 광택이 왼쪽에서 오른쪽으로 훑는다
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < W; x++) {
        const v = at(x, y);
        if (!v) continue;
        const up = at(x, y - 1), dn = at(x, y + 1), lf = at(x - 1, y), rt = at(x + 1, y);
        const rel = y / GH;
        let c = rel < 0.3 ? L[4] : rel < 0.55 ? L[3] : rel < 0.8 ? S[4] : S[3];
        if (!up) c = S[6];
        else if (!lf) c = S[5];
        else if (!dn) c = S[1];
        else if (!rt) c = S[2];
        else if (y >= 3 && y <= 4 && (x - this.letters[v - 1].x) < 9) c = L[5]; // 유리 같은 반사
        const d = x + y * 0.6 - shine;
        if (d >= 0 && d < 4 && up) c = d < 2 ? PAL.white : L[5];
        f.px(x0 + x, y0 + y + (drop[v - 1] || 0), c);
      }

    // 밑줄: 물줄기가 지나가며 호박 선을 긋는다
    const lineY = y0 + GH + 5;
    const grow = Math.max(0, Math.min(1, (t - 60) / 45));
    const len = Math.round((W + 16) * (1 - Math.pow(1 - grow, 2)));
    const lx0 = x0 - 8;
    for (let x = 0; x < len; x++) {
      const wob = Math.round(Math.sin((lx0 + x) * 0.3) * 0.4);
      f.px(lx0 + x, lineY - 1 + wob, ink);
      f.px(lx0 + x, lineY + wob, S[5]);
      f.px(lx0 + x, lineY + 1 + wob, x % 9 === 0 ? S[4] : S[3]);
      f.px(lx0 + x, lineY + 2 + wob, S[1]);
      f.px(lx0 + x, lineY + 3 + wob, ink);
    }
    if (grow > 0 && grow < 1) {
      const hx = lx0 + len, hy = lineY + 1;
      f.circle(hx, hy, 2, L[4]); f.px(hx, hy - 1, PAL.white);
      f.glow(hx, hy, 16, L[4], 0.6);
      if (this.rng.next() < 0.6) this.parts.push({ x: hx, y: hy, vx: this.rng.range(-1.2, 0.4), vy: this.rng.range(-1.6, -0.2), life: 16, max: 16, c: L[5] });
    }
    // 밑줄 끝을 둥글게 막는다
    if (grow >= 1) {
      for (const ex of [lx0 - 1, lx0 + len]) for (let k = 0; k < 3; k++) f.px(ex, lineY + k, ink);
      if (t % 50 === 0) this.parts.push({ star: true, x: lx0 + this.rng.int(4, len - 4), y: lineY, life: 24, max: 24 });
    }

    // 글자 밑에 수액이 맺혀 똑 떨어진다
    if (t > 110) for (const d of this.drips) {
      const p = ((t + d.off) % d.period) / d.period;
      const dx = x0 + d.x, dyy = y0 + d.y + dy(d.x);
      if (p < 0.7) {
        const l = Math.round(d.len * (p / 0.7));
        for (let k = 0; k < l; k++) f.px(dx, dyy + k, k === l - 1 ? L[5] : L[3]);
        if (l > 2) { f.px(dx - 1, dyy + l - 2, L[2]); f.px(dx + 1, dyy + l - 2, L[2]); }
      } else {
        const fall = (p - 0.7) / 0.3, yy = dyy + d.len + fall * fall * 44;
        f.rect(dx, yy, 1, 2, L[4]); f.px(dx, yy, L[5]);
        f.glow(dx, yy, 5, L[4], 0.3 * (1 - fall));
      }
    }

    // 작은 입자
    for (const q of this.parts) {
      q.life--;
      if (q.star) {
        const e = q.life / q.max, a = Math.round(3 * Math.sin(e * Math.PI));
        for (let k = -a; k <= a; k++) { f.px(q.x + k, q.y, L[5]); f.px(q.x, q.y + k, L[5]); }
        f.px(q.x, q.y, PAL.white); f.glow(q.x, q.y, 8, L[4], 0.4 * e);
      } else {
        q.vy += 0.12; q.x += q.vx; q.y += q.vy;
        f.px(q.x, q.y, q.c); f.glow(q.x, q.y, 4, L[4], 0.3 * (q.life / q.max));
      }
    }
    this.parts = this.parts.filter(q => q.life > 0);

    // 부제: 작은 픽셀 글자
    if (t > 100) {
      const a = Math.min(1, (t - 100) / 30);
      if (a > 0.5 || (t >> 1) & 1) drawMini(f, 'BRIDGE THE SKY WITH SAP', cx, lineY + 10, PAL.cream[2], PAL.ink);
    }
    f.cx = saved[0]; f.cy = saved[1];
  }

  landPuff(x, y) {
    for (let k = 0; k < 5; k++) this.parts.push({ x: x + this.rng.range(-6, 6), y, vx: this.rng.range(-1, 1), vy: this.rng.range(-1.5, -0.4), life: 14, max: 14, c: PAL.sapL[4] });
  }
}

// 작은 글꼴을 화면에 찍는다
export function drawMini(f, str, cx, y, color, shadow) {
  const w = str.length * 4 - 1, x0 = Math.round(cx - w / 2);
  [...str].forEach((ch, k) => {
    const g = MINI[ch] || MINI[' '];
    g.forEach((row, r) => [...row].forEach((c, q) => {
      if (c !== '#') return;
      const x = x0 + k * 4 + q, yy = y + r;
      if (shadow) f.px(x + 1, yy + 1, shadow);
      f.px(x, yy, color);
    }));
  });
}
