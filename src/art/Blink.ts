// 깜빡임 타이머: 모든 식물의 깜빡임을 무작위로 엇갈리게 한다(02문서 5-5 "눈 깜빡임 동기화 금지").
// 시드(식물 uid · 종 ID)로 정해져 같은 식물은 같은 박자, 다른 식물은 다른 박자를 갖는다. 깜빡임은 100ms.

import { Rng } from '../core/Rng';

export const BLINK_MS = 100;
const MIN_GAP_MS = 2000;
const MAX_GAP_MS = 6000;

export class BlinkTimer {
  private readonly rng: Rng;
  private next: number;
  private until = 0;

  constructor(seed: string) {
    this.rng = new Rng(`blink:${seed}`);
    this.next = this.rng.range(1200, MAX_GAP_MS);
  }

  /** 이 시각(ms)에 눈을 감고 있어야 하는가 */
  isBlinking(now: number): boolean {
    if (now >= this.next) {
      this.until = now + BLINK_MS;
      this.next = now + this.rng.range(MIN_GAP_MS, MAX_GAP_MS);
    }
    return now < this.until;
  }

  /** 첫 깜빡임 시각(테스트 · 엇갈림 검증용) */
  get firstAt(): number {
    return this.next;
  }
}
