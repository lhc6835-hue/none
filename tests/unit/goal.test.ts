// 정원 '다음 할 일' 패널의 단계 고르기(10문서 4절 튜토리얼 흐름을 플레이 내내 이어 주는 장치)
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/core/GameState';
import { createPlant } from '../../src/systems/garden/Garden';
import { currentGoal } from '../../src/scenes/hub/goalLogic';

const NOW = 1_700_000_000_000;

function withPlant(
  stage: number,
  needs?: Partial<{ water: number; nutrition: number; hygiene: number; mood: number }>,
) {
  const state = createInitialState(NOW);
  const p = createPlant(state, 'P011', 'WINDOW', 0, NOW);
  p.stage = stage as typeof p.stage;
  p.nickname = '콩이';
  Object.assign(p.needs, { water: 60, nutrition: 60, hygiene: 100, mood: 70 }, needs);
  state.plants.push(p);
  return state;
}

describe('정원 다음 할 일', () => {
  it('식물이 없으면 씨앗 심기, 대상은 씨앗 상자', () => {
    const g = currentGoal(createInitialState(NOW));
    expect(g.id).toBe('plant');
    expect(g.target).not.toBeNull();
  });

  it('목마른 식물이 있으면 돌봄이 먼저이고, 조사가 이름에 맞게 붙는다', () => {
    const g = currentGoal(withPlant(2, { water: 10 }));
    expect(g.id).toBe('care');
    expect(g.text).toContain('콩이가');
  });

  it('곰팡이 · 벌레 같은 문제가 있으면 청결 돌봄', () => {
    const s = withPlant(3);
    s.plants[0].problems.push({ kind: 'MOLD' } as never);
    expect(currentGoal(s).text).toContain('곰팡이');
  });

  it('어린잎이 없으면 키우기, 어린잎이 생기면 첫 출격(1-1)', () => {
    expect(currentGoal(withPlant(2)).id).toBe('grow');
    const s = withPlant(3);
    const g = currentGoal(s);
    expect(g.id).toBe('sortie');
    expect(g.text).toContain('1-1');
  });

  it('1-1 을 깨면 다음 스테이지를, 모두 깨면 더 높은 난이도를 권한다', () => {
    const s = withPlant(4);
    s.progress['1-1'] = { stars: 3, tries: 1, clears: { NORMAL: 1 } };
    expect(currentGoal(s).id).toBe('next');
    for (const id of ['1-2', '1-3', '1-4', '1-5', '1-6'])
      s.progress[id] = { stars: 2, tries: 1, clears: { NORMAL: 1 } };
    expect(currentGoal(s).id).toBe('master');
  });
});
