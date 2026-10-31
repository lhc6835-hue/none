// 시간은 항상 Clock으로만 읽는다. 테스트와 디버그(시간 앞으로 감기)에서 가짜 시계로 바꿔 끼운다.

export interface Clock {
  /** 현재 시각(ms, epoch) */
  now(): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

/** 테스트 · 디버그용. 수동으로만 시간이 흐른다. */
export class FakeClock implements Clock {
  private t: number;

  constructor(start = 0) {
    this.t = start;
  }

  now(): number {
    return this.t;
  }

  set(ms: number): void {
    this.t = ms;
  }

  advance(ms: number): void {
    this.t += ms;
  }
}

/**
 * 디버그 '시간 앞으로 감기'용. 실제 시계 위에 오프셋을 얹는다.
 * 오프라인 n시간을 흉내 낼 때 offset만 늘리면 된다.
 */
export class OffsetClock implements Clock {
  private offset = 0;

  constructor(private readonly base: Clock = systemClock) {}

  now(): number {
    return this.base.now() + this.offset;
  }

  skip(ms: number): void {
    this.offset += ms;
  }

  get skipped(): number {
    return this.offset;
  }
}
