import { describe, expect, it, vi } from 'vitest';
import { FakeClock, OffsetClock } from '../../src/core/Clock';
import { EventBus } from '../../src/core/EventBus';
import { makeRng, Rng } from '../../src/core/Rng';
import { computeScreen, shouldRotate } from '../../src/core/Screen';
import { AutoSave, AUTOSAVE_INTERVAL_MS } from '../../src/core/AutoSave';
import { createInitialState } from '../../src/core/GameState';
import { MemoryStorage, SaveSystem } from '../../src/core/SaveSystem';
import type { GameEvents } from '../../src/core/events';
import { validateName } from '../../src/systems/Naming';

describe('Rng — 시드형 난수', () => {
  it('같은 시드는 같은 수열', () => {
    const a = new Rng('P001');
    const b = new Rng('P001');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('다른 시드는 다른 수열, 값은 [0,1)', () => {
    const a = new Rng('P001');
    const b = new Rng('P002');
    expect(a.next()).not.toBe(b.next());
    const r = new Rng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('상태를 저장했다가 복원하면 이어서 같은 수열을 낸다 (봉투 RNG)', () => {
    const a = new Rng('packet');
    for (let i = 0; i < 7; i++) a.next();
    const restored = Rng.fromState(a.state());
    expect(Array.from({ length: 10 }, () => restored.next())).toEqual(
      Array.from({ length: 10 }, () => a.next()),
    );
  });

  it('용도별 흐름은 서로 독립이다', () => {
    expect(makeRng('art', 'P001').next()).not.toBe(makeRng('battle', 'P001').next());
    expect(makeRng('garden', 'u1', 600).next()).toBe(makeRng('garden', 'u1', 600).next());
  });

  it('int 는 양 끝을 포함하고 고르게 퍼진다', () => {
    const r = new Rng('dist');
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 40000; i++) counts[r.int(0, 3)]++;
    for (const c of counts) expect(c).toBeGreaterThan(9000);
  });

  it('weighted 추첨 분포 (10만 회)', () => {
    const r = new Rng('weights');
    const hits = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 100000; i++) hits[r.weighted(['a', 'b', 'c'] as const, [70, 25, 5])]++;
    expect(hits.a / 100000).toBeCloseTo(0.7, 1);
    expect(hits.b / 100000).toBeCloseTo(0.25, 1);
    expect(hits.c / 100000).toBeCloseTo(0.05, 1);
  });

  it('shuffle 은 원본을 바꾸지 않고 요소를 보존한다', () => {
    const src = [1, 2, 3, 4, 5, 6];
    const out = new Rng('s').shuffle(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(src);
  });
});

describe('Clock', () => {
  it('FakeClock 은 수동으로만 흐른다', () => {
    const c = new FakeClock(1000);
    c.advance(500);
    expect(c.now()).toBe(1500);
  });

  it('OffsetClock 은 기반 시계 위에 감기 오프셋을 얹는다', () => {
    const base = new FakeClock(0);
    const c = new OffsetClock(base);
    c.skip(3_600_000);
    base.advance(10);
    expect(c.now()).toBe(3_600_010);
  });
});

describe('EventBus', () => {
  it('구독 · 해제 · once', () => {
    const bus = new EventBus<GameEvents>();
    const fn = vi.fn();
    const off = bus.on('plant:watered', fn);
    bus.emit('plant:watered', { uid: 'a' });
    off();
    bus.emit('plant:watered', { uid: 'b' });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ uid: 'a' });

    const once = vi.fn();
    bus.once('battle:enemyKilled', once);
    bus.emit('battle:enemyKilled', { enemyId: 'e1' });
    bus.emit('battle:enemyKilled', { enemyId: 'e2' });
    expect(once).toHaveBeenCalledTimes(1);
  });

  it('순회 중 구독이 바뀌어도 안전하다', () => {
    const bus = new EventBus<GameEvents>();
    const calls: string[] = [];
    const off1 = bus.on('plant:watered', () => {
      calls.push('1');
      off1();
    });
    bus.on('plant:watered', () => calls.push('2'));
    bus.emit('plant:watered', { uid: 'x' });
    bus.emit('plant:watered', { uid: 'x' });
    expect(calls).toEqual(['1', '2', '2']);
  });
});

describe('Screen — 정수 배율과 안전 영역 (12문서 2절)', () => {
  it('1280×720 → ×2, 논리 640×360, 캔버스 1280×720', () => {
    const s = computeScreen(1280, 720);
    expect(s).toMatchObject({
      k: 2,
      logicalW: 640,
      logicalH: 360,
      cssW: 1280,
      cssH: 720,
      safeX: 0,
    });
  });

  it('1920×1080 → ×3', () => {
    expect(computeScreen(1920, 1080)).toMatchObject({ k: 3, logicalW: 640, cssW: 1920 });
  });

  it('2560×1440 → ×4', () => {
    expect(computeScreen(2560, 1440)).toMatchObject({ k: 4, logicalW: 640, cssW: 2560 });
  });

  it('844×390 (모바일 가로) → ×1, 논리 폭 800 (좌우 80씩 연장)', () => {
    const s = computeScreen(844, 390);
    expect(s).toMatchObject({ k: 1, logicalW: 800, cssW: 800, cssH: 360, safeX: 80 });
  });

  it('1024×768 (4:3) → ×1 로 낮춰 가로가 넘치지 않는다', () => {
    const s = computeScreen(1024, 768);
    expect(s.k).toBe(1);
    expect(s.cssW).toBeLessThanOrEqual(1024);
  });

  it('19.5:9 같은 긴 화면은 논리 폭이 800까지 늘어난다', () => {
    const s = computeScreen(2340, 1080);
    expect(s.k).toBe(3);
    expect(s.logicalW).toBe(780);
    expect(s.safeX).toBe(70);
  });

  it('논리 폭은 항상 640~800, 캔버스는 항상 창 안에 들어간다 (무작위 창 1만 개)', () => {
    const r = new Rng('screens');
    for (let i = 0; i < 10000; i++) {
      const w = r.int(640, 3840);
      const h = r.int(360, 2160);
      const s = computeScreen(w, h);
      expect(s.logicalW).toBeGreaterThanOrEqual(640);
      expect(s.logicalW).toBeLessThanOrEqual(800);
      expect(Number.isInteger(s.k)).toBe(true);
      expect(s.cssW).toBeLessThanOrEqual(w);
      expect(s.cssH).toBeLessThanOrEqual(h);
      expect(Number.isInteger(s.safeX)).toBe(true);
    }
  });

  it('소수점 DPR 에서도 기기 픽셀 기준 정수 배율이다', () => {
    const s = computeScreen(1440, 810, 1.25); // 기기 1800×1012
    expect(s.k).toBe(2);
    expect(s.cssPerPixel).toBeCloseTo(1.6);
  });

  it('DPR 2 는 DPR 1 과 같은 CSS 크기를 낸다', () => {
    expect(computeScreen(1280, 720, 2).cssW).toBe(computeScreen(1280, 720, 1).cssW);
  });
});

describe('AutoSave', () => {
  function setup() {
    const clock = new FakeClock(1000);
    const bus = new EventBus<GameEvents>();
    const storage = new MemoryStorage();
    const state = createInitialState(1000);
    const auto = new AutoSave(new SaveSystem(storage), () => state, clock, bus);
    return { clock, bus, storage, state, auto };
  }

  it('30초가 쌓이면 저장한다 (setInterval 없이 tick 으로)', () => {
    const { auto, state } = setup();
    auto.tick(AUTOSAVE_INTERVAL_MS - 1);
    expect(state.meta.saveCount).toBe(0);
    auto.tick(1);
    expect(state.meta.saveCount).toBe(1);
  });

  it("'save:requested' 이벤트가 오면 즉시 저장한다", () => {
    const { bus, state } = setup();
    bus.emit('save:requested', { reason: 'bloom' });
    expect(state.meta.saveCount).toBe(1);
  });

  it('상태가 없으면(타이틀) 저장하지 않는다', () => {
    const bus = new EventBus<GameEvents>();
    const auto = new AutoSave(
      new SaveSystem(new MemoryStorage()),
      () => null,
      new FakeClock(),
      bus,
    );
    expect(auto.flush('x')).toBe(false);
  });
});

describe('Naming — 이름 규칙 (1–8자, 한글·영문·숫자)', () => {
  it('정상 이름', () => {
    expect(validateName('콩이')).toEqual({ ok: true, name: '콩이' });
    expect(validateName(' Tom2 ')).toEqual({ ok: true, name: 'Tom2' });
    expect(validateName('가나다라마바사아')).toMatchObject({ ok: true });
  });

  it('길이 위반', () => {
    expect(validateName('')).toEqual({ ok: false, error: 'length' });
    expect(validateName('가나다라마바사아자')).toEqual({ ok: false, error: 'length' });
  });

  it('허용되지 않는 문자', () => {
    expect(validateName('콩 이')).toEqual({ ok: false, error: 'chars' });
    expect(validateName('콩!')).toEqual({ ok: false, error: 'chars' });
    expect(validateName('😀')).toEqual({ ok: false, error: 'chars' });
  });

  it('금칙어', () => {
    expect(validateName('Fuck')).toEqual({ ok: false, error: 'banned' });
    expect(validateName('씨발1')).toEqual({ ok: false, error: 'banned' });
  });
});

describe('휴대폰 화면 맞춤', () => {
  it('세로로 든 터치 기기만 돌려 쓴다(데스크톱의 좁은 창은 그대로)', () => {
    expect(shouldRotate(390, 664, true)).toBe(true);
    expect(shouldRotate(750, 342, true)).toBe(false);
    expect(shouldRotate(500, 900, false)).toBe(false);
  });

  it('작은 가로 화면(750×342, DPR 3): 정수 배율은 화면의 70%만 써서 꽉 채운다', () => {
    const integer = computeScreen(750, 342, 3);
    expect(integer.k).toBe(2);
    expect(integer.cssH / 342).toBeLessThan(0.75);
    const fill = computeScreen(750, 342, 3, true);
    expect(fill.cssH).toBeCloseTo(342, 5);
    expect(fill.cssW).toBeLessThanOrEqual(750 + 1e-6);
    expect(fill.logicalW).toBeGreaterThanOrEqual(640);
    expect(fill.logicalW).toBeLessThanOrEqual(800);
  });

  it('정수 배율이 이미 잘 맞는 화면(844×390, DPR 3)은 꽉 채우기를 쓰지 않는다(선명함 유지)', () => {
    const a = computeScreen(844, 390, 3, true);
    expect(a).toEqual(computeScreen(844, 390, 3, false));
    expect(Number.isInteger(a.k)).toBe(true);
  });

  it('세로 화면을 돌린 크기(664×390)도 가로 화면처럼 계산된다', () => {
    const l = computeScreen(664, 390, 3, true);
    expect(l.cssW).toBeLessThanOrEqual(664 + 1e-6);
    expect(l.cssH).toBeLessThanOrEqual(390 + 1e-6);
    expect(l.cssW / 664).toBeGreaterThan(0.95);
  });

  it('데스크톱(꽉 채우기 끔)은 항상 정수 배율', () => {
    for (const [w, h] of [
      [1366, 768],
      [1281, 721],
      [1024, 768],
    ]) {
      expect(Number.isInteger(computeScreen(w, h, 1).k)).toBe(true);
    }
  });
});
