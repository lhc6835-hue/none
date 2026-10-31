// 자동 저장 (12문서 6절): 30초마다 · 중요한 일 직후('save:requested') · 탭이 숨겨질 때.
// setInterval을 쓰지 않는다. 씬이 매 프레임 tick(dt)을 불러 준다(일시정지 · 배속과 일치).

import type { Clock } from './Clock';
import type { EventBus } from './EventBus';
import type { GameEvents } from './events';
import type { GameState } from './GameState';
import type { SaveSystem } from './SaveSystem';

export const AUTOSAVE_INTERVAL_MS = 30_000;

export class AutoSave {
  private elapsed = 0;
  private dirty = false;
  private off: (() => void) | undefined;

  constructor(
    private readonly save: SaveSystem,
    private readonly getState: () => GameState | null,
    private readonly clock: Clock,
    private readonly bus: EventBus<GameEvents>,
  ) {
    this.off = bus.on('save:requested', ({ reason }) => this.flush(reason));
  }

  /** 상태가 바뀌었음을 알린다. 다음 주기에 저장한다. */
  markDirty(): void {
    this.dirty = true;
  }

  tick(dtMs: number): void {
    this.elapsed += dtMs;
    if (this.elapsed < AUTOSAVE_INTERVAL_MS) return;
    this.elapsed = 0;
    this.flush('interval');
  }

  /** 지금 바로 저장. 상태가 없으면(타이틀) 아무것도 하지 않는다. */
  flush(reason: string): boolean {
    const state = this.getState();
    if (!state) return false;
    const result = this.save.save(state, this.clock.now());
    this.dirty = false;
    if (result.ok) this.bus.emit('save:done', { ok: true, reason });
    else this.bus.emit('save:failed', { reason: result.reason });
    return result.ok;
  }

  get isDirty(): boolean {
    return this.dirty;
  }

  dispose(): void {
    this.off?.();
  }
}
