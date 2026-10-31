import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/core/GameState';
import { STAGES } from '../../src/data/battle/stages';
import { runBattle, defaultLoad } from '../../src/systems/battle/Bot';
import { deckSlots, canDeploy } from '../../src/systems/battle/Loadouts';
import { recommendDeck, tagsOf, enemiesOf } from '../../src/systems/battle/Recommend';
import {
  addPlantExp,
  applyOutcome,
  expToNextPlant,
  stageUnlocked,
} from '../../src/systems/battle/Rewards';
import { createPlant } from '../../src/systems/garden/Garden';

const NOW = Date.UTC(2026, 9, 31, 3, 0, 0);

function stateWithPlants(ids: string[]) {
  const state = createInitialState(NOW);
  state.player.level = 4;
  const plants = ids.map((id, i) => {
    const p = createPlant(state, id, 'WINDOW', i, NOW);
    p.stage = 4;
    p.level = 3;
    p.quality = 3;
    state.plants.push(p);
    return p;
  });
  return { state, plants };
}

const result = (won: boolean, stars: 1 | 2 | 3 = 3, mvp: number | null = 1) => ({
  won,
  stars,
  heartsLeft: won ? 20 : 0,
  maxHearts: 20,
  seconds: 200,
  kills: 50,
  leaked: 0,
  mvp,
  towers: [],
});

describe('경험치 · 레벨', () => {
  it('필요 경험치 = round(100 × L^1.5), 넘치면 여러 레벨이 한꺼번에 오른다', () => {
    expect(expToNextPlant(1)).toBe(100);
    expect(expToNextPlant(4)).toBe(800);
    const p = { level: 1, exp: 0 };
    expect(addPlantExp(p, 100 + 283 + 10)).toBe(2);
    expect(p.level).toBe(3);
    expect(p.exp).toBe(10);
  });

  it('최대 레벨 30 에서는 더 오르지 않는다', () => {
    const p = { level: 30, exp: 0 };
    expect(addPlantExp(p, 999999)).toBe(0);
    expect(p.level).toBe(30);
  });
});

describe('전투 보상 정산', () => {
  const stage = STAGES[0];

  it('승리: 별 · 첫 클리어 보너스(잎전 2배 · 이슬 3) · 출전 식물 경험치 · 애정도', () => {
    const { state, plants } = stateWithPlants(['P011', 'P001', 'P031']);
    const uids = plants.map((p) => p.uid);
    const deployed = new Map([
      [uids[0], 500],
      [uids[1], 100],
    ]);
    const r = applyOutcome(state, stage, 'NORMAL', result(true), uids, deployed, uids[0], NOW);
    expect(r.won).toBe(true);
    expect(r.firstClear).toBe(true);
    expect(r.dew).toBe(3);
    expect(state.player.dew).toBe(3);
    expect(state.progress['1-1'].stars).toBe(3);
    const gain = (u: string) => r.plants.find((g) => g.uid === u)!.exp;
    expect(gain(uids[0])).toBeGreaterThan(gain(uids[1])); // MVP 1.5배
    expect(gain(uids[1])).toBeGreaterThan(gain(uids[2])); // 미출전 0.3배
    expect(plants[0].affection).toBeGreaterThan(plants[2].affection);
    // 두 번째 클리어는 첫 클리어 보너스 없음
    const r2 = applyOutcome(state, stage, 'NORMAL', result(true), uids, deployed, uids[0], NOW);
    expect(r2.firstClear).toBe(false);
    expect(r2.dew).toBe(0);
  });

  it('패배: 경험치 50% · 잎전 30%, 진행은 도전 횟수만 오른다', () => {
    const a = stateWithPlants(['P011']);
    const b = stateWithPlants(['P011']);
    const dep = (s: typeof a) => new Map([[s.plants[0].uid, 1]]);
    const win = applyOutcome(
      a.state,
      stage,
      'NORMAL',
      result(true),
      [a.plants[0].uid],
      dep(a),
      null,
      NOW,
    );
    const lose = applyOutcome(
      b.state,
      stage,
      'NORMAL',
      result(false),
      [b.plants[0].uid],
      dep(b),
      null,
      NOW,
    );
    expect(lose.plants[0].exp).toBe(Math.round(win.plants[0].exp * 0.5));
    expect(lose.coin).toBeLessThan(win.coin * 0.2); // 첫 클리어 2배 × 0.3
    expect(b.state.progress['1-1']).toEqual({ stars: 0, tries: 1, clears: {} });
    expect(lose.drops).toEqual([]);
  });

  it('같은 입력이면 같은 드랍(결정적)', () => {
    const run = () => {
      const { state, plants } = stateWithPlants(['P011']);
      return applyOutcome(
        state,
        stage,
        'NORMAL',
        result(true),
        [plants[0].uid],
        new Map([[plants[0].uid, 5]]),
        plants[0].uid,
        NOW,
      ).drops;
    };
    expect(run()).toEqual(run());
  });

  it('스테이지는 앞 스테이지를 클리어해야 열린다', () => {
    const { state } = stateWithPlants([]);
    expect(stageUnlocked(state, STAGES, 0)).toBe(true);
    expect(stageUnlocked(state, STAGES, 1)).toBe(false);
    state.progress['1-1'] = { stars: 1, tries: 1, clears: {} };
    expect(stageUnlocked(state, STAGES, 1)).toBe(true);
    expect(stageUnlocked(state, STAGES, 2)).toBe(false);
  });
});

describe('출격 준비', () => {
  it('덱 칸: 5칸, 정원사 Lv3 에서 6칸', () => {
    expect(deckSlots(1)).toBe(5);
    expect(deckSlots(2)).toBe(5);
    expect(deckSlots(3)).toBe(6);
  });

  it('씨앗 · 새싹(3단계 미만)은 출전할 수 없다', () => {
    const { plants } = stateWithPlants(['P011']);
    expect(canDeploy(plants[0])).toBe(true);
    plants[0].stage = 2;
    expect(canDeploy(plants[0])).toBe(false);
  });

  it('추천 덱: 비행 적이 나오는 스테이지에서는 하늘을 맞힐 수 있는 식물이 반드시 들어간다', () => {
    const boss = STAGES.find((s) => s.boss)!;
    expect(tagsOf(boss)).toContain('AIR');
    expect(enemiesOf(boss)).toContain('B1');
    // LOB(곡사)만 가득한 정원에 사수 하나가 섞여 있어도 사수를 뽑는다
    const { plants } = stateWithPlants(['P017', 'P024', 'P026', 'P041', 'P043', 'P044', 'P011']);
    const deck = recommendDeck(plants, boss, 5);
    expect(deck).toHaveLength(5);
    expect(deck).toContain(plants[6].uid);
  });

  it('추천 덱은 중복 없이 슬롯 수만큼, 후보가 모자라면 있는 만큼', () => {
    const { plants } = stateWithPlants(['P011', 'P001']);
    const d = recommendDeck(plants, STAGES[0], 5);
    expect(new Set(d).size).toBe(d.length);
    expect(d).toHaveLength(2);
  });
});

describe('도우미', () => {
  it('봇이 이긴 판의 별점은 하트 비율로 정해진다', () => {
    const r = runBattle({
      stage: STAGES[0],
      difficulty: 'WALK',
      deck: ['P011', 'P031', 'P001', 'P041', 'P012'].map((id) => defaultLoad(id)),
      seed: 'star',
    }).result;
    expect(r.won).toBe(true);
    const ratio = r.heartsLeft / r.maxHearts;
    expect(r.stars).toBe(ratio >= 0.9 ? 3 : ratio >= 0.5 ? 2 : 1);
  });
});
