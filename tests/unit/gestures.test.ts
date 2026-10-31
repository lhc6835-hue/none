import { describe, expect, it } from 'vitest';
import {
  LapCounter,
  ReversalCounter,
  midOf,
  segmentHitsCircle,
  waterLevelAfter,
} from '../../src/scenes/care/gestures';

describe('손놀림 계산', () => {
  it('좌우 흔들기: 최소 이동 이상일 때만 방향 전환을 센다(손떨림 무시)', () => {
    const c = new ReversalCounter(10);
    [0, 3, 1, 4, 2].forEach((x) => c.push(x)); // 떨림
    expect(c.count).toBe(0);
    // 0 → 30 → 0 → 30 → 0: 방향 전환 3번
    [0, 15, 30, 15, 0, 15, 30, 15, 0].forEach((x) => c.push(x));
    expect(c.count).toBe(3);
  });

  it('뼛가루 흔들기 3번 = 3획(오른쪽 · 왼쪽 · 오른쪽), 더 흔들면 초과', () => {
    const c = new ReversalCounter(12);
    [100, 130, 100, 130].forEach((x) => c.push(x));
    expect(c.strokes).toBe(3);
    c.push(100);
    expect(c.strokes).toBe(4);
  });

  it('곰팡이 닦기 3번 왕복 = 6획', () => {
    const c = new ReversalCounter(6);
    [0, 12, 0, 12, 0, 12, 0].forEach((x) => c.push(x));
    expect(c.strokes).toBe(6);
  });

  it('원 돌리기: 중심 둘레를 두 바퀴 돌면 laps ≈ 2, 범위 밖은 세지 않는다', () => {
    const lap = new LapCounter(0, 0, 4, 40);
    for (let i = 0; i <= 72; i++) {
      const a = (i / 36) * Math.PI * 2;
      lap.push(Math.cos(a) * 20, Math.sin(a) * 20);
    }
    expect(lap.laps).toBeCloseTo(2, 1);
    lap.reset();
    for (let i = 0; i <= 72; i++) {
      const a = (i / 36) * Math.PI * 2;
      lap.push(Math.cos(a) * 80, Math.sin(a) * 80);
    }
    expect(lap.laps).toBe(0);
  });

  it('가위질: 선분이 시든 잎(원)을 가로지르면 맞고, 멀리 지나가면 빗나간다', () => {
    expect(segmentHitsCircle(0, 0, 40, 0, 20, 4, 6)).toBe(true);
    expect(segmentHitsCircle(0, 0, 40, 0, 20, 14, 6)).toBe(false);
    expect(segmentHitsCircle(0, 0, 10, 0, 30, 0, 6)).toBe(false); // 선분이 짧아 닿지 않음
  });

  it('물주기: 초당 25 오르고, 적정 구간 가운데가 간편 돌봄 값', () => {
    expect(waterLevelAfter(40, 2)).toBe(90);
    expect(midOf([50, 75])).toBe(62.5);
  });
});
