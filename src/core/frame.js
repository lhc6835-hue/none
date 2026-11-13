// 픽셀 렌더러: 색 버퍼(불투명·디더·반투명)와 빛 버퍼(더하기)를 따로 그린 뒤 합친다.
import { rgba, chR, chG, chB, chA } from './color.js';

// 4x4 바이어 행렬: 알파를 디더 무늬로 바꿀 때 쓴다
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

export class Frame {
  constructor(w, h, withLight = true) {
    this.w = w; this.h = h;
    this.img = new ImageData(w, h);
    this.out = new Uint32Array(this.img.data.buffer);
    if (withLight) {
      this.lightImg = new ImageData(w, h);
      this.lout = new Uint32Array(this.lightImg.data.buffer);
      this.light = new Float32Array(w * h * 3);
    }
    this.cx = 0; this.cy = 0;
  }
  clear() { this.out.fill(0); if (this.light) this.light.fill(0); }
  setCam(x, y) { this.cx = Math.round(x); this.cy = Math.round(y); }

  idx(x, y) {
    const sx = Math.floor(x) - this.cx, sy = Math.floor(y) - this.cy;
    if (sx < 0 || sy < 0 || sx >= this.w || sy >= this.h) return -1;
    return sy * this.w + sx;
  }
  px(x, y, c) { const i = this.idx(x, y); if (i >= 0) this.out[i] = c; }
  // 디더 알파: 반투명 대신 바이어 무늬로 찍는다
  dot(x, y, c, a) {
    if (a <= 0) return;
    const sx = Math.floor(x) - this.cx, sy = Math.floor(y) - this.cy;
    if (sx < 0 || sy < 0 || sx >= this.w || sy >= this.h) return;
    if (a >= 1 || a > bayer(sx, sy)) this.out[sy * this.w + sx] = c;
  }
  // 진짜 반투명: 연기·안개·구름처럼 부드러운 것에 쓴다
  blend(x, y, c, a) {
    if (a <= 0) return;
    const i = this.idx(x, y);
    if (i < 0) return;
    if (a >= 1) { this.out[i] = c; return; }
    const d = this.out[i], da = chA(d) / 255;
    const oa = a + da * (1 - a);
    const f1 = a / oa, f2 = (da * (1 - a)) / oa;
    this.out[i] = rgba(chR(c) * f1 + chR(d) * f2, chG(c) * f1 + chG(d) * f2, chB(c) * f1 + chB(d) * f2, oa * 255);
  }
  rect(x, y, w, h, c, a = 1) {
    x = Math.floor(x); y = Math.floor(y);
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) a >= 1 ? this.px(xx, yy, c) : this.blend(xx, yy, c, a);
  }
  // 꽉 찬 원
  circle(x, y, r, c) {
    const r2 = r * r;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++)
        if (dx * dx + dy * dy <= r2) this.px(x + dx, y + dy, c);
  }
  // 가장자리가 부드럽게 옅어지는 반투명 원 (연기, 김)
  disc(x, y, r, c, a) {
    if (a <= 0 || r <= 0) return;
    const R = Math.ceil(r);
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        const d = (dx * dx + dy * dy) / (r * r);
        if (d < 1) this.blend(x + dx, y + dy, c, a * (1 - d * d));
      }
  }
  line(x0, y0, x1, y1, c, a = 1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      a >= 1 ? this.px(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c) : this.dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c, a);
    }
  }
  // 두께 있는 선 (캡슐). 물줄기, 총구에 쓴다
  beam(x0, y0, x1, y1, r, c, a = 1) {
    const minx = Math.floor(Math.min(x0, x1) - r), maxx = Math.ceil(Math.max(x0, x1) + r);
    const miny = Math.floor(Math.min(y0, y1) - r), maxy = Math.ceil(Math.max(y0, y1) + r);
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, r2 = r * r;
    for (let y = miny; y <= maxy; y++)
      for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5, py = y + 0.5;
        let t = ((px - x0) * dx + (py - y0) * dy) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = px - (x0 + dx * t), ey = py - (y0 + dy * t);
        if (ex * ex + ey * ey <= r2) a >= 1 ? this.px(x, y, c) : this.blend(x, y, c, a);
      }
  }
  // 빛: 색 버퍼 위에 더해진다. 가운데가 가장 밝고 바깥으로 제곱으로 줄어든다
  glow(x, y, r, c, k) {
    if (k <= 0 || r <= 0 || !this.light) return;
    const sx = x - this.cx, sy = y - this.cy, w = this.w, L = this.light;
    const x0 = Math.max(0, Math.floor(sx - r)), x1 = Math.min(w - 1, Math.ceil(sx + r));
    const y0 = Math.max(0, Math.floor(sy - r)), y1 = Math.min(this.h - 1, Math.ceil(sy + r));
    if (x0 > x1 || y0 > y1) return;
    const cr = (chR(c) / 255) * k, cg = (chG(c) / 255) * k, cb = (chB(c) / 255) * k, r2 = r * r;
    for (let yy = y0; yy <= y1; yy++) {
      const dy = yy + 0.5 - sy;
      for (let xx = x0; xx <= x1; xx++) {
        const dx = xx + 0.5 - sx, d2 = dx * dx + dy * dy;
        if (d2 >= r2) continue;
        let f = 1 - Math.sqrt(d2) / r; f *= f;
        const j = (yy * w + xx) * 3;
        L[j] += cr * f; L[j + 1] += cg * f; L[j + 2] += cb * f;
      }
    }
  }
  // 스프라이트: data는 0이면 투명
  sprite(s, x, y, flip = false, tint = 0) {
    x = Math.floor(x); y = Math.floor(y);
    for (let r = 0; r < s.h; r++)
      for (let q = 0; q < s.w; q++) {
        const c = s.data[r * s.w + (flip ? s.w - 1 - q : q)];
        if (c) this.px(x + q, y + r, tint || c);
      }
  }
  // 빛 없는 레이어용: 캔버스 하나로 만든다
  toCanvas() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    c.getContext('2d').putImageData(this.img, 0, 0);
    return c;
  }
  present(fgCtx, lightCtx) {
    const L = this.light, o = this.lout;
    for (let i = 0, j = 0; i < o.length; i++, j += 3) {
      const r = L[j], g = L[j + 1], b = L[j + 2];
      o[i] = r + g + b === 0 ? 0xff000000 : rgba(Math.min(255, r * 255), Math.min(255, g * 255), Math.min(255, b * 255));
    }
    fgCtx.putImageData(this.img, 0, 0);
    lightCtx.putImageData(this.lightImg, 0, 0);
  }
}

// 문자열 그림 → 스프라이트. map은 글자 → 색
export function makeSprite(rows, map) {
  const h = rows.length, w = rows[0].length, data = new Uint32Array(w * h);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`스프라이트 줄 길이가 달라요: ${y}번째 줄`);
    [...row].forEach((ch, x) => { if (ch !== '.') data[y * w + x] = map[ch]; });
  });
  return { w, h, data };
}
