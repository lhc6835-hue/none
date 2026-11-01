// 도구가 열리기 전의 문제(곰팡이 · 벌레 · 시든 잎)는 정원에 남지 않는다
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/core/GameState';
import { createPlant } from '../../src/systems/garden/Garden';
import { dropLockedProblems } from '../../src/systems/garden/Problems';

describe('잠긴 도구의 문제 치우기', () => {
  it('Lv1 에서는 곰팡이 · 벌레 · 시든 잎을 치우고 청결을 되돌린다', () => {
    const state = createInitialState(1_000);
    const p = createPlant(state, 'P011', 'WINDOW', 0, 1_000);
    p.problems.push(
      { kind: 'MOLD', since: 0 },
      { kind: 'PEST', since: 0, n: 4 },
      { kind: 'WITHER', since: 0 },
    );
    p.needs.hygiene = 80;
    expect(dropLockedProblems(p, 1)).toBe(3);
    expect(p.problems).toHaveLength(0);
    expect(p.needs.hygiene).toBe(100);
  });

  it('벌레 도구(Lv3)가 열리면 벌레는 남는다', () => {
    const state = createInitialState(1_000);
    const p = createPlant(state, 'P011', 'WINDOW', 0, 1_000);
    p.problems.push({ kind: 'PEST', since: 0, n: 4 });
    expect(dropLockedProblems(p, 3)).toBe(0);
    expect(p.problems).toHaveLength(1);
  });
});
