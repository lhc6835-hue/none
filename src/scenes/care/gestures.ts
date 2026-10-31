// 돌봄 손놀림 계산(04문서 5절). 화면과 무관한 순수 함수라 따로 테스트한다.

/** 좌우로 흔들거나 문지를 때 '방향이 바뀐 횟수'를 센다. minTravel 이상 움직여야 한 번으로 친다(손떨림 무시). */
export class ReversalCounter {
  count = 0;
  private dir: -1 | 0 | 1 = 0;
  private anchor = 0;
  private started = false;

  constructor(private readonly minTravel = 10) {}

  /** 새 위치를 넣는다. 방향이 바뀌었으면 true */
  push(x: number): boolean {
    if (!this.started) {
      this.started = true;
      this.anchor = x;
      return false;
    }
    if (this.dir === 0) {
      if (Math.abs(x - this.anchor) >= this.minTravel) {
        this.dir = x > this.anchor ? 1 : -1;
        this.anchor = x;
      }
      return false;
    }
    if (this.dir === 1) {
      if (x > this.anchor) this.anchor = x;
      else if (this.anchor - x >= this.minTravel) {
        this.dir = -1;
        this.anchor = x;
        this.count++;
        return true;
      }
    } else if (x < this.anchor) this.anchor = x;
    else if (x - this.anchor >= this.minTravel) {
      this.dir = 1;
      this.anchor = x;
      this.count++;
      return true;
    }
    return false;
  }

  /** 한 번 쓸고 지나간 획의 수(첫 획 포함). '3번 흔들기' = 3획, '3번 왕복' = 6획 */
  get strokes(): number {
    return this.dir === 0 ? 0 : this.count + 1;
  }

  reset(): void {
    this.count = 0;
    this.dir = 0;
    this.started = false;
  }
}

/** 한 점을 중심으로 원을 그리며 문지른 바퀴 수(퇴비 섞기). 반지름이 범위를 벗어나면 세지 않는다. */
export class LapCounter {
  private total = 0;
  private last: number | null = null;

  constructor(
    private readonly cx: number,
    private readonly cy: number,
    private readonly rMin = 4,
    private readonly rMax = 60,
  ) {}

  push(x: number, y: number): void {
    const r = Math.hypot(x - this.cx, y - this.cy);
    if (r < this.rMin || r > this.rMax) {
      this.last = null;
      return;
    }
    const a = Math.atan2(y - this.cy, x - this.cx);
    if (this.last !== null) {
      let d = a - this.last;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      this.total += d;
    }
    this.last = a;
  }

  get laps(): number {
    return Math.abs(this.total) / (Math.PI * 2);
  }

  reset(): void {
    this.total = 0;
    this.last = null;
  }
}

/** 선분 (a→b) 이 중심 c · 반지름 r 인 원에 닿는가(가위질 판정) */
export function segmentHitsCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2));
  return Math.hypot(ax + dx * t - cx, ay + dy * t - cy) <= r;
}

/** 물주기 게이지: 눌러 둔 시간(초)에 따라 수분이 초당 25 오른다 */
export const waterLevelAfter = (start: number, heldSec: number, ratePerSec = 25): number =>
  start + heldSec * ratePerSec;

/** 적정 구간의 가운데(간편 돌봄 · 빠른 돌봄의 '바로 완벽' 값) */
export const midOf = (range: readonly [number, number]): number => (range[0] + range[1]) / 2;
