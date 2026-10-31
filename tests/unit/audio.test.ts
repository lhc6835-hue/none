import { describe, expect, it } from 'vitest';
import type { AudioBus } from '../../src/audio/AudioBus';
import { MAX_VOICES, renderSfx, Sfx } from '../../src/audio/Sfx';
import { zzfxG } from '../../src/audio/zzfx';
import { Rng } from '../../src/core/Rng';
import { SFX, type SfxId } from '../../src/data/sfx';

const ids = Object.keys(SFX) as SfxId[];

describe('ZzFX 샘플 생성', () => {
  it('같은 난수면 같은 샘플이 나온다 (결정적)', () => {
    const a = zzfxG([0.5, 0.05, 880, 0, 0.01, 0.05, 1, 1.5], () => 0.25);
    const b = zzfxG([0.5, 0.05, 880, 0, 0.01, 0.05, 1, 1.5], () => 0.25);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('길이는 어택+서스테인+릴리스에 맞고 소리가 있다', () => {
    const s = zzfxG([1, 0, 440, 0, 0.1, 0.1, 0]);
    // 어택 0 → 최소 어택 9샘플, 서스테인 0.1초 + 릴리스 0.1초
    expect(s.length).toBeGreaterThan(44100 * 0.2 - 10);
    expect(s.length).toBeLessThan(44100 * 0.2 + 20);
    expect(Math.max(...Array.from(s).map(Math.abs))).toBeGreaterThan(0.05);
  });

  it('모든 파형(사인·삼각·톱니·탄젠트·노이즈·사각)이 유한한 값을 낸다', () => {
    const rng = new Rng('waves');
    for (let shape = 0; shape <= 5; shape++) {
      const s = zzfxG([1, 0, 300, 0.01, 0.02, 0.05, shape], () => rng.next());
      expect(s.every(Number.isFinite), `shape ${shape}`).toBe(true);
    }
  });

  it('필터 · 딜레이 · 비트크러시 · 반복 옵션도 안전하다', () => {
    const s = zzfxG([
      1, 0, 300, 0.01, 0.05, 0.1, 0, 1, 5, 0, 100, 0.02, 0.05, 0.2, 5, 0.3, 0.05, 0.5, 0.02, 0.4,
      800,
    ]);
    expect(s.every(Number.isFinite)).toBe(true);
  });
});

describe('효과음 데이터', () => {
  it('모든 효과음이 -1~1 범위의 유한한 소리로 렌더링된다', () => {
    for (const id of ids) {
      const s = renderSfx(id);
      expect(s.length, id).toBeGreaterThan(100);
      expect(
        s.every((v) => Number.isFinite(v) && Math.abs(v) <= 1.5),
        id,
      ).toBe(true);
      expect(Math.max(...Array.from(s).map(Math.abs)), id).toBeGreaterThan(0.01);
    }
  });

  it('렌더링은 시드 고정이라 언제나 같은 소리다', () => {
    for (const id of ids) expect(Array.from(renderSfx(id))).toEqual(Array.from(renderSfx(id)));
  });

  it('여러 음짜리(오류음 · 이름 도장)는 단일 음보다 길다', () => {
    expect(renderSfx('ui_error').length).toBeGreaterThan(renderSfx('ui_click').length * 2);
  });
});

/** 재생 호출만 기록하는 가짜 AudioBus */
function fakeBus() {
  const state = { time: 0, ready: true, played: [] as { stopped: boolean }[] };
  const bus = {
    get ready() {
      return state.ready;
    },
    get now() {
      return state.time;
    },
    play: () => {
      const source = {
        stopped: false,
        onended: null as null | (() => void),
        stop() {
          this.stopped = true;
        },
      };
      state.played.push(source);
      return source;
    },
  };
  return { bus: bus as unknown as AudioBus, state };
}

describe('Sfx 믹싱 규칙 (11문서 2절)', () => {
  it('오디오가 깨어나기 전에는 재생하지 않는다', () => {
    const { bus, state } = fakeBus();
    state.ready = false;
    expect(new Sfx(bus).play('ui_click')).toBe(false);
  });

  it('같은 효과음은 40ms 안에 다시 재생하지 않는다', () => {
    const { bus, state } = fakeBus();
    const sfx = new Sfx(bus);
    expect(sfx.play('shoot')).toBe(true);
    state.time = 0.02;
    expect(sfx.play('shoot')).toBe(false);
    state.time = 0.05;
    expect(sfx.play('shoot')).toBe(true);
  });

  it('동시 재생은 최대 12개, 넘치면 우선순위 낮은 것부터 생략한다', () => {
    const { bus, state } = fakeBus();
    const sfx = new Sfx(bus);
    // 서로 다른 시각에 낮은 우선순위(shoot)를 12개 채운다
    for (let i = 0; i < MAX_VOICES; i++) {
      state.time = i * 1;
      expect(sfx.play('shoot')).toBe(true);
    }
    expect(sfx.activeVoices).toBe(MAX_VOICES);
    // 같은 우선순위는 못 들어온다
    state.time = 100;
    expect(sfx.play('shoot')).toBe(false);
    // 더 높은 우선순위(UI)는 낮은 것을 밀어내고 들어온다
    expect(sfx.play('ui_click')).toBe(true);
    expect(state.played.filter((p) => p.stopped)).toHaveLength(1);
    expect(sfx.activeVoices).toBe(MAX_VOICES);
  });
});
