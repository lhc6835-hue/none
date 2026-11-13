// 지형 격자: 1칸 = 1픽셀. 바위, 액체 수액, 굳은 호박 세 가지가 있다.
import { PAL, mix } from '../core/color.js';
import { hash2 } from '../core/rng.js';

export const EMPTY = 0, ROCK = 1, LIQ = 2, AMBER = 3;
export const HARDEN_MIN = 14;    // 이만큼 지나고 멈춰 있으면 굳는다 (약 0.25초)
export const HARDEN_MAX = 40;    // 이만큼 지나면 무조건 굳는다 (약 0.7초)
export const AMBER_LIFE = 35 * 60;
export const CRACK_TIME = 150;

export class Terrain {
  constructor(w, h) {
    this.w = w; this.h = h;
    const n = w * h;
    this.grid = new Uint8Array(n);
    this.age = new Uint8Array(n);
    this.rest = new Uint8Array(n);
    this.born = new Uint32Array(n);
    this.art = new Uint32Array(n);   // 바위 그림 (한 번만 칠한다)
    this.deco = new Uint32Array(n);  // 풀·꽃·덩굴 (부딪히지 않는 장식)
    this.liquids = [];
    this.ambers = [];
    this.hardenedThisTick = 0;
  }

  cell(x, y) {
    if (x < 0 || x >= this.w) return ROCK;
    if (y < 0 || y >= this.h) return EMPTY;
    return this.grid[y * this.w + x];
  }
  solid(x, y) { const c = this.cell(x, y); return c === ROCK || c === AMBER; }
  filled(x, y) { return this.cell(x, y) !== EMPTY; }
  isEmpty(x, y) { return x >= 0 && x < this.w && y >= 0 && y < this.h && this.grid[y * this.w + x] === EMPTY; }

  // 상자가 단단한 칸과 겹치는지
  boxHits(x, y, w, h) {
    const x0 = Math.floor(x), x1 = Math.floor(x + w - 0.001);
    const y0 = Math.floor(y), y1 = Math.floor(y + h - 0.001);
    for (let cy = y0; cy <= y1; cy++)
      for (let cx = x0; cx <= x1; cx++) if (this.solid(cx, cy)) return true;
    return false;
  }

  // 수액을 붓는다. 비어 있는 이웃 칸으로 번지며 count칸까지 채운다
  deposit(px, py, count) {
    let sx = Math.max(0, Math.min(this.w - 1, px | 0)), sy = Math.max(0, Math.min(this.h - 1, py | 0));
    if (!this.isEmpty(sx, sy)) {
      let found = false;
      for (let r = 1; r <= 2 && !found; r++)
        for (let dy = -r; dy <= r && !found; dy++)
          for (let dx = -r; dx <= r && !found; dx++)
            if (this.isEmpty(sx + dx, sy + dy)) { sx += dx; sy += dy; found = true; }
      if (!found) return 0;
    }
    const W = this.w, lim = count * 0.7 + 1.5;
    const q = [sy * W + sx], seen = new Set(q);
    let placed = 0;
    for (let h = 0; h < q.length && placed < count; h++) {
      const i = q[h];
      if (this.grid[i] !== EMPTY) continue;
      const x = i % W, y = (i / W) | 0;
      if ((x - sx) ** 2 + (y - sy) ** 2 > lim) continue;
      this.grid[i] = LIQ; this.age[i] = 0; this.rest[i] = 0;
      this.liquids.push(i); placed++;
      for (const j of [i + W, i - 1, i + 1, i - W]) { // 아래·옆부터 고이고 위로는 마지막에
        if (j < 0 || j >= this.grid.length || seen.has(j)) continue;
        seen.add(j); q.push(j);
      }
    }
    return placed;
  }

  neighbors(x, y) {
    let n = 0, wall = false;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const c = this.cell(x + dx, y + dy);
        if (c !== EMPTY) n++;
        if (c === ROCK || c === AMBER) wall = true;
      }
    return { n, wall };
  }

  // 액체 흐름: 끈적해서 벽에 붙고, 덩어리째 조금 처지다가 금방 굳는다
  update(tick, rng, fx) {
    const W = this.w, G = this.grid;
    this.liquids.sort((a, b) => b - a); // 아래 줄부터
    const next = [];
    this.hardenedThisTick = 0;
    for (let i of this.liquids) {
      if (G[i] !== LIQ) continue;
      const x = i % W, y = (i / W) | 0;
      const a = Math.min(255, this.age[i] + 1);
      if (y >= this.h - 1) { G[i] = EMPTY; continue; }
      const { n, wall } = this.neighbors(x, y);
      let j = i;
      if (G[i + W] === EMPTY) {
        const p = wall ? 0.03 : n >= 3 ? 0.12 : n >= 2 ? 0.45 : 1;
        if (rng.next() < p) j = i + W;
      } else if (rng.next() < (wall ? 0.04 : n >= 5 ? 0.1 : 0.3)) {
        const d = rng.sign();
        if (this.isEmpty(x + d, y + 1)) j = i + W + d;
        else if (this.isEmpty(x - d, y + 1)) j = i + W - d;
        else if (rng.next() < 0.25 && this.isEmpty(x + d, y)) j = i + d;
      }
      if (j !== i) { G[j] = LIQ; G[i] = EMPTY; this.rest[j] = 0; i = j; }
      else if (this.rest[i] < 255) this.rest[i]++;
      this.age[i] = a;
      if ((a > HARDEN_MIN && this.rest[i] > 3) || a > HARDEN_MAX) {
        G[i] = AMBER; this.born[i] = tick; this.ambers.push(i);
        this.hardenedThisTick++;
        // 굳는 순간 표면에서 가끔 반짝인다
        if (fx && rng.next() < 0.012 && G[i - W] === EMPTY) {
          fx.star(x, y - 1, 22, 2, PAL.sapS[6], PAL.white, 0.35);
        }
      } else next.push(i);
    }
    this.liquids = next;
  }

  // 오래된 호박은 부서진다
  decay(tick, rng, fx) {
    let crumbled = 0;
    const keep = [];
    for (const i of this.ambers) {
      if (this.grid[i] !== AMBER) continue;
      if (tick - this.born[i] > AMBER_LIFE) {
        this.grid[i] = EMPTY; crumbled++;
        if (fx && rng.next() < 0.06) {
          const x = i % this.w, y = (i / this.w) | 0;
          fx.shard(x, y, rng.range(-0.6, 0.6), rng.range(-1, 0), rng.int(40, 70), PAL.sapS[2], PAL.sapS[4], rng.next() < 0.3 ? 2 : 1);
          if (rng.next() < 0.3) fx.puff(x, y, rng.range(-0.2, 0.2), -0.1, 40, 3, PAL.sapS[3], 0.25);
        }
      } else keep.push(i);
    }
    this.ambers = keep;
    return crumbled;
  }

  // 원 모양으로 호박·액체를 깎는다 (바위는 그대로)
  erode(px, py, r, rng, fx) {
    const cx = Math.floor(px), cy = Math.floor(py);
    let removed = 0;
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= this.w || y < 0 || y >= this.h) continue;
        const i = y * this.w + x;
        if (this.grid[i] === AMBER || this.grid[i] === LIQ) {
          this.grid[i] = EMPTY; removed++;
          if (fx && rng.next() < 0.25)
            fx.shard(x, y, rng.range(-1.5, 1.5), rng.range(-2, 0), rng.int(30, 60), PAL.sapS[2], PAL.sapS[5], 1);
        }
      }
    return removed;
  }

  // 지면 높이 찾기 (x열에서 위에서부터 처음 만나는 단단한 칸)
  groundY(x, from = 0) {
    for (let y = from; y < this.h; y++) if (this.solid(x, y)) return y;
    return this.h;
  }

  // ─── 바위 그림 칠하기 (레벨을 다 만든 뒤 한 번) ───────────────
  paint(rng) {
    const W = this.w, H = this.h, G = this.grid, art = this.art, deco = this.deco;
    const down = new Uint16Array(W * H); // 위쪽 빈칸에서부터 깊이
    const up = new Uint16Array(W * H);   // 아래쪽 빈칸까지 거리
    for (let x = 0; x < W; x++) {
      let d = 0;
      for (let y = 0; y < H; y++) { const i = y * W + x; d = G[i] === ROCK ? d + 1 : 0; down[i] = d; }
      d = 0;
      for (let y = H - 1; y >= 0; y--) { const i = y * W + x; d = G[i] === ROCK ? d + 1 : 0; up[i] = d; }
    }
    const S = PAL.stone, Gr = PAL.grass, D = PAL.dirt;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (G[i] !== ROCK) continue;
        const d = down[i], u = up[i], n = hash2(x, y, 3);
        const leftOpen = x > 0 && G[i - 1] !== ROCK, rightOpen = x < W - 1 && G[i + 1] !== ROCK;
        const wave = Math.sin(x * 0.21) * 1.2 + Math.sin(x * 0.07) * 1.5;
        let c;
        if (d === 1) c = n < 0.5 ? Gr[4] : Gr[3];
        else if (d <= 3) c = Gr[2 + (n < 0.3 ? 1 : 0)];
        else if (d <= 5 + wave * 0.5) c = (n < 0.45 ? Gr[1] : D[2]);
        else if (d <= 16 + wave) {
          c = D[2 - ((d >> 2) & 1)];
          if (n < 0.04) c = D[3];
        } else {
          // 깊은 바위: 부드럽게 굽이치는 지층 두 겹
          const strata = (y + wave * 2 + Math.sin(x * 0.03) * 3) / 9;
          const fr = strata - Math.floor(strata);
          const band = Math.floor(strata) & 1;
          c = band ? S[3] : S[2];
          if (fr < 0.12 && n < 0.5) c = S[band ? 2 : 3];
        }
        // 빛은 왼쪽 위에서 온다: 왼쪽 가장자리는 밝게, 오른쪽은 어둡게
        if (d > 1 && leftOpen) c = d < 6 ? Gr[3] : S[4];
        if (d > 1 && rightOpen) c = d < 6 ? Gr[1] : S[1];
        // 아랫면: 그늘진 테두리
        if (u <= 1) c = S[0];
        else if (u <= 3) c = S[1];
        else if (u <= 6 && d > 16) c = mix(c, S[1], 0.6);
        art[i] = c;
      }
    // 박힌 자갈: 위는 밝고 아래는 그늘진 작은 돌
    for (let y = 0; y < H - 1; y++)
      for (let x = 1; x < W - 2; x++) {
        const i = y * W + x;
        if (G[i] !== ROCK || down[i] < 20 || up[i] < 6 || hash2(x, y, 5) > 0.004) continue;
        art[i] = S[5]; art[i + 1] = S[4]; art[i + W] = S[1]; art[i + W + 1] = S[1];
      }
    // 장식: 풀, 꽃, 아래로 늘어진 뿌리
    for (let x = 0; x < W; x++)
      for (let y = 1; y < H - 1; y++) {
        const i = y * W + x;
        if (G[i] !== ROCK) continue;
        if (G[i - W] === EMPTY) {
          const r = hash2(x, y, 11);
          if (r < 0.55) {
            const h = 1 + Math.floor(hash2(x, y, 12) * (r < 0.15 ? 4 : 2));
            for (let k = 1; k <= h; k++) if (y - k >= 0 && G[i - k * W] === EMPTY)
              deco[i - k * W] = k === h ? Gr[4] : Gr[3];
          } else if (r < 0.6 && y > 3) {
            const fc = PAL.flower[Math.floor(hash2(x, y, 13) * 3)];
            deco[i - W] = Gr[2]; deco[i - 2 * W] = Gr[3]; deco[i - 3 * W] = fc;
            if (x > 0) deco[i - 3 * W - 1] = mix(fc, PAL.ink, 0.25);
          }
        }
        if (G[i + W] === EMPTY && hash2(x, y, 14) < 0.12) {
          const len = 2 + Math.floor(hash2(x, y, 15) * 10);
          for (let k = 1; k <= len; k++) {
            const j = i + k * W;
            if (y + k >= H || G[j] !== EMPTY) break;
            deco[j] = k > len - 2 ? Gr[2] : (hash2(x, k, 16) < 0.5 ? Gr[1] : PAL.leaf[1]);
          }
        }
      }
  }

  // ─── 화면에 그리기 ─────────────────────────────────────────
  render(f, tick) {
    const W = this.w, G = this.grid, out = f.out, FW = f.w;
    const L = PAL.sapL, S = PAL.sapS;
    for (let sy = 0; sy < f.h; sy++) {
      const y = sy + f.cy;
      if (y < 0 || y >= this.h) continue;
      for (let sx = 0; sx < FW; sx++) {
        const x = sx + f.cx;
        if (x < 0 || x >= W) continue;
        const i = y * W + x, g = G[i];
        let c = 0;
        if (g === EMPTY) { c = this.deco[i]; if (!c) continue; }
        else if (g === ROCK) c = this.art[i];
        else if (g === LIQ) {
          const a = this.age[i];
          const top = y > 0 && G[i - W] === EMPTY;
          let k = a < 4 ? 5 : a < 9 ? 4 : 3;
          if (!top && (y + 1 >= this.h || G[i + W] === EMPTY)) k = 2;
          if (top && ((x + (tick >> 1)) % 7 === 0)) k = 5;
          c = L[k];
          if ((x * 7 + y * 3) % 5 === 0) f.glow(x, y, 5, L[4], 0.05);
        } else {
          // 굳은 호박: 윗면은 밝은 테, 속은 깊은 주황, 기포와 흐르는 광택
          const up = y > 0 ? G[i - W] : EMPTY, dn = y + 1 < this.h ? G[i + W] : EMPTY;
          const lf = x > 0 ? G[i - 1] : ROCK, rt = x + 1 < W ? G[i + 1] : ROCK;
          let k;
          if (up === EMPTY && dn === EMPTY) k = 4;      // 얇은 가닥은 한 색으로
          else if (up === EMPTY) k = 5;
          else if (dn === EMPTY) k = 1;
          else if (lf === EMPTY) k = 4;
          else if (rt === EMPTY) k = 2;
          else {
            const up2 = y > 1 ? G[i - 2 * W] : EMPTY;
            k = up2 === EMPTY ? 4 : 3;
            const h = hash2(x, y, 21);
            if (h < 0.025) k = 5;          // 기포
            else if (h > 0.97) k = 2;
          }
          if (k >= 3 && ((x + y + (tick >> 2)) & 63) < 2) k = 6; // 광택이 천천히 흐른다
          c = S[k];
          const left = AMBER_LIFE - (tick - this.born[i]);
          if (left < CRACK_TIME) {
            const crack = hash2(x >> 1, y >> 1, 22) < 0.3 + 0.5 * (1 - left / CRACK_TIME);
            if (crack) c = S[0];
          }
        }
        out[sy * FW + sx] = c;
      }
    }
  }
}

// 바위를 채운다: fn(x, y)가 true인 곳
export function fillRock(t, x0, y0, x1, y1, fn) {
  for (let y = Math.max(0, y0); y < Math.min(t.h, y1); y++)
    for (let x = Math.max(0, x0); x < Math.min(t.w, x1); x++)
      if (!fn || fn(x, y)) t.grid[y * t.w + x] = ROCK;
}
