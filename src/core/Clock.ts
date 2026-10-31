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

export interface LocalParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  /** 0–23 */
  hour: number;
  minute: number;
  /** 'YYYY-MM-DD' — 날씨 · 일일 판정의 시드 */
  dateKey: string;
  /** 실수 시각(0–24) */
  hourFloat: number;
}

/**
 * ms(epoch)를 현지 시각 요소로 푼다. offsetMin 을 생략하면 기기의 시간대를 쓴다.
 * 테스트에서는 offsetMin 을 직접 줘서 시간대와 무관하게 같은 결과를 얻는다.
 */
export function localParts(ms: number, offsetMin?: number): LocalParts {
  const off = offsetMin ?? -new Date(ms).getTimezoneOffset();
  const d = new Date(ms + off * 60_000);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const p2 = (n: number) => String(n).padStart(2, '0');
  return {
    year,
    month,
    day,
    hour,
    minute,
    dateKey: `${year}-${p2(month)}-${p2(day)}`,
    hourFloat: hour + minute / 60,
  };
}
