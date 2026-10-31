// 시드형 PRNG(sfc32). 용도별로 흐름을 나눠 쓴다(12문서 8절).
//   art    : 종 ID                      → 같은 종은 언제나 같은 모양
//   battle : 스테이지 시드 + 도전 횟수  → 같은 입력이면 같은 결과
//   garden : 식물 uid + 시각            → 오프라인 판정 재현
//   packet : 저장된 상태                → 봉투를 열 때마다 진행(저장 파일에 들어감)
//   daily  : 날짜

export type RngStream = 'art' | 'battle' | 'garden' | 'packet' | 'daily';
export type RngState = [number, number, number, number];

/** 문자열 → 128비트 시드(cyrb128). */
function hashSeed(str: string): RngState {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: string | number | RngState) {
    const s = Array.isArray(seed) ? seed : hashSeed(String(seed));
    [this.a, this.b, this.c, this.d] = s;
    // 시드 직후의 약한 상관을 털어낸다.
    for (let i = 0; i < 12; i++) this.next();
  }

  /** 저장 · 복원용 상태. 복원한 Rng는 이어서 같은 수열을 낸다. */
  static fromState(state: RngState): Rng {
    const r = Object.create(Rng.prototype) as Rng;
    [r.a, r.b, r.c, r.d] = state;
    return r;
  }

  state(): RngState {
    return [this.a, this.b, this.c, this.d];
  }

  /** [0, 1) */
  next(): number {
    this.a |= 0;
    this.b |= 0;
    this.c |= 0;
    this.d |= 0;
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  /** min 이상 max 이하의 정수 */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: 빈 배열');
    return items[Math.floor(this.next() * items.length)];
  }

  /** 가중치 추첨. 가중치 합이 0이면 오류. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    let total = 0;
    for (const w of weights) total += w;
    if (total <= 0) throw new Error('Rng.weighted: 가중치 합이 0');
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** 새 배열을 돌려주는 피셔-예이츠 */
  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}

/** 용도별 흐름 만들기: makeRng('garden', plant.uid, bucketTime) */
export function makeRng(stream: RngStream, ...parts: (string | number)[]): Rng {
  return new Rng(`${stream}:${parts.join(':')}`);
}
