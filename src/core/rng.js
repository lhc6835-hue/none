// 시드가 있는 난수. 같은 시드면 같은 결과가 나온다.
export class Rng {
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.next() < p; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
}

// 좌표로 정해지는 0..1 값 (텍스처용)
export function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// 1차원 값 노이즈 (부드러운 산 능선 등)
export function vnoise(x, s = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash2(i, 0, s) * (1 - u) + hash2(i + 1, 0, s) * u;
}
export function fbm(x, s = 0, oct = 4) {
  let v = 0, a = 0.5, f = 1, n = 0;
  for (let k = 0; k < oct; k++) { v += vnoise(x * f, s + k * 17) * a; n += a; a *= 0.5; f *= 2; }
  return v / n;
}
