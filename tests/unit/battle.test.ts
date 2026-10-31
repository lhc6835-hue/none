import { describe, expect, it } from 'vitest';
import { PLANT_BATTLE } from '../../src/data/battle/plants';
import { STAGES } from '../../src/data/battle/stages';
import { BattleSim } from '../../src/systems/battle/BattleSim';
import { Bot, defaultLoad, runBattle } from '../../src/systems/battle/Bot';
import { applyStatus } from '../../src/systems/battle/Status';
import { tk } from '../../src/systems/battle/types';

const stage = (id: string) => STAGES.find((s) => s.id === id)!;
const DECK = ['P011', 'P031', 'P001', 'P041', 'P012'].map((id) => defaultLoad(id));

function mk(id = '1-1', deck = DECK) {
  return new BattleSim({
    stage: stage(id),
    difficulty: 'NORMAL',
    deck,
    seed: 't',
    recordEvents: false,
  });
}

describe('전투 시뮬레이션 — 기본 규칙', () => {
  it('배치: 길 · 바위에는 못 심고, 비용이 모자라면 거절한다', () => {
    const sim = mk();
    expect(sim.place(0, 1, 1).ok).toBe(false); // 입구 칸
    expect(sim.place(0, 9, 1).reason).toBe('path');
    expect(sim.place(0, 16, 1).reason).toBe('tile'); // 바위
    sim.nutrient = 0;
    expect(sim.place(0, 3, 3).reason).toBe('cost');
    sim.nutrient = 500;
    expect(sim.place(0, 3, 3).ok).toBe(true);
    expect(sim.place(0, 3, 3).reason).toBe('occupied');
  });

  it('같은 식물을 또 심으면 비용이 10% 올라간다(최대 +50%)', () => {
    const sim = mk();
    sim.nutrient = 9999;
    const first = sim.placeCost(0);
    sim.place(0, 3, 3);
    expect(sim.placeCost(0)).toBe(Math.round(first * 1.1));
    for (let i = 0; i < 8; i++) sim.place(0, 3 + i, 4);
    expect(sim.placeCost(0)).toBe(Math.round(first * 1.5));
  });

  it('회수: 3초 안이면 100%, 그 뒤에는 70% 환불', () => {
    const sim = mk();
    sim.nutrient = 1000;
    sim.place(0, 3, 3);
    const t = sim.towers[0];
    const paid = t.invested;
    const before = sim.nutrient;
    expect(sim.sell(t.id)).toBe(paid);
    expect(sim.nutrient).toBe(before + paid);
    sim.place(0, 3, 3);
    for (let i = 0; i < 200; i++) sim.step();
    const t2 = sim.towers[0];
    expect(sim.sell(t2.id)).toBe(Math.floor(t2.invested * 0.7));
  });

  it('강화: 3단계에서는 분기를 골라야 하고, 능력치가 올라간다', () => {
    const sim = mk();
    sim.nutrient = 5000;
    sim.place(0, 3, 3);
    const t = sim.towers[0];
    const d0 = t.stats.dmg;
    expect(sim.upgrade(t.id)).toBe(true);
    expect(sim.upgrade(t.id)).toBe(true);
    expect(sim.upgrade(t.id)).toBe(false); // 분기 없이 +3 불가
    expect(sim.upgrade(t.id, 'A')).toBe(true);
    expect(t.stats.dmg).toBeGreaterThan(d0 * 1.8);
    expect(t.branch).toBe('A');
    expect(t.stats.interval).toBeLessThan(1.0 * 0.7); // 사수 분기 A: 연사 간격 −35%
  });

  it('양분은 3초마다 +4, 웨이브는 준비 시간 20초 뒤에 시작한다', () => {
    const sim = mk();
    const n0 = sim.nutrient;
    for (let i = 0; i < tk(3) + 1; i++) sim.step();
    expect(sim.nutrient).toBe(n0 + 4);
    expect(sim.wave).toBe(0);
    for (let i = 0; i < tk(20); i++) sim.step();
    expect(sim.wave).toBe(1);
  });

  it('난이도: 산책은 하트 30 · 웨이브 −2, 보통은 하트 20', () => {
    const w = new BattleSim({ stage: stage('1-2'), difficulty: 'WALK', deck: DECK });
    const n = mk('1-2');
    expect(w.maxHearts).toBe(30);
    expect(w.totalWaves).toBe(n.totalWaves - 2);
    expect(n.maxHearts).toBe(20);
  });
});

describe('상태이상 (06문서 9-2)', () => {
  function enemy(sim: BattleSim, id = 'E01', boss = false) {
    const e = sim.spawnEnemy(boss ? 'B1' : id, 0, 1);
    return e;
  }

  it('둔화는 가장 강한 것 하나만, 상한 70%(보스 40%)', () => {
    const sim = mk();
    const e = enemy(sim);
    applyStatus(sim, e, { k: 'SLOW', amt: 0.3, dur: 2 }, null);
    applyStatus(sim, e, { k: 'SLOW', amt: 0.2, dur: 2 }, null);
    expect(e.slowAmt).toBe(0.3);
    applyStatus(sim, e, { k: 'SLOW', amt: 0.9, dur: 2 }, null);
    expect(e.slowAmt).toBe(0.7);
    const b = enemy(sim, 'B1', true);
    applyStatus(sim, b, { k: 'SLOW', amt: 0.9, dur: 2 }, null);
    expect(b.slowAmt).toBe(0.4);
  });

  it('냉기 5중첩이면 빙결 1.5초 → 2초간 냉기 면역, 보스는 빙결 대신 둔화', () => {
    const sim = mk();
    const e = enemy(sim);
    for (let i = 0; i < 5; i++) applyStatus(sim, e, { k: 'CHILL', n: 1 }, null);
    expect(e.freezeUntil).toBeGreaterThan(sim.tick);
    const until = e.freezeUntil;
    applyStatus(sim, e, { k: 'CHILL', n: 5 }, null);
    expect(e.freezeUntil).toBe(until); // 면역
    const b = enemy(sim, 'B1', true);
    for (let i = 0; i < 5; i++) applyStatus(sim, b, { k: 'CHILL', n: 1 }, null);
    expect(b.freezeUntil).toBe(0);
  });

  it('독은 최대 10중첩, 화상은 최대 5중첩', () => {
    const sim = mk();
    const e = enemy(sim);
    for (let i = 0; i < 20; i++) {
      applyStatus(sim, e, { k: 'POISON', n: 1 }, null);
      applyStatus(sim, e, { k: 'BURN', n: 1 }, null);
    }
    expect(e.poison).toBe(10);
    expect(e.burn).toBe(5);
  });

  it('보스는 속박에 면역(대신 둔화 50%), 기절은 지속 ×0.3', () => {
    const sim = mk();
    const b = enemy(sim, 'B1', true);
    applyStatus(sim, b, { k: 'BIND', dur: 2 }, null);
    expect(b.bindUntil).toBe(0);
    expect(b.slowAmt).toBe(0.4); // 둔화 상한 40%
    applyStatus(sim, b, { k: 'STUN', dur: 2 }, null);
    expect(b.stunUntil - sim.tick).toBe(tk(0.6));
  });

  it('장갑은 물리만 깎는다: 받는 피해 = max(피해×0.2, 피해−장갑)', () => {
    const sim = mk();
    const e = sim.spawnEnemy('E02', 0, 1); // 장갑 3
    const hp = e.hp;
    sim.hurt(e, 10, null, 'PHYS');
    expect(hp - e.hp).toBeCloseTo(7, 5);
    const hp2 = e.hp;
    sim.hurt(e, 2, null, 'PHYS');
    expect(hp2 - e.hp).toBeCloseTo(0.4, 5); // 최소 20%
    const hp3 = e.hp;
    sim.hurt(e, 10, null, 'FIRE');
    expect(hp3 - e.hp).toBeCloseTo(10, 5);
  });
});

describe('결정성 · 클리어율', () => {
  it('같은 입력이면 같은 결과다(처치 · 하트 · 시간까지)', () => {
    const a = runBattle(
      { stage: stage('1-2'), difficulty: 'NORMAL', deck: DECK, seed: 'x' },
      600,
    ).result;
    const b = runBattle(
      { stage: stage('1-2'), difficulty: 'NORMAL', deck: DECK, seed: 'x' },
      600,
    ).result;
    expect(a).toEqual(b);
  });

  it('1-1 산책 · 보통은 봇이 끝까지 이긴다', () => {
    for (const d of ['WALK', 'NORMAL'] as const) {
      const r = runBattle({ stage: stage('1-1'), difficulty: d, deck: DECK, seed: 'win' }).result;
      expect(r.won, `1-1 ${d}`).toBe(true);
    }
  });

  it('봇 배치기는 Bot 클래스를 노출한다', () => {
    expect(typeof Bot).toBe('function');
  });
});

describe('식물 100종이 전부 전투에서 동작한다', () => {
  // 종마다 1-1 맵에서 적 무리를 앞에 세워 놓고 20초 돌려 본다: 예외 없이, 무언가 하는지(피해 · 상태이상 · 양분 · 보조)
  it.each(PLANT_BATTLE.map((p) => [p.id, p.arch] as const))('%s (%s)', (id) => {
    const spec = PLANT_BATTLE.find((p) => p.id === id)!;
    const water = spec.flags?.includes('WATER_ONLY') ?? false;
    // 오라 · 보조 식물은 도와줄 아군(가시 사수)이 있어야 의미가 있다
    const deck = [defaultLoad(id, { stage: 5, stars: 3 }), defaultLoad('P011', { stage: 5 })];
    const sim = new BattleSim({
      stage: stage(water ? '1-5' : '1-1'),
      difficulty: 'NORMAL',
      deck,
      seed: id,
    });
    sim.nutrient = 9999;
    const onPath = spec.arch === 'WALL';
    const land = [
      [10, 3],
      [10, 4],
      [8, 3],
      [8, 4],
      [11, 3],
      [10, 2],
      [8, 6],
      [11, 6],
    ];
    const spots = water
      ? [
          [13, 7],
          [14, 7],
          [13, 8],
          [14, 6],
        ]
      : onPath
        ? [
            [9, 3],
            [9, 4],
          ]
        : land;
    let placed = false;
    for (const [x, y] of spots) if (!placed) placed = sim.place(0, x, y).ok;
    expect(placed, `${id} 배치`).toBe(true);
    const t = sim.towers[0];
    if (spec.arch === 'AURA' || spec.arch === 'PRODUCE')
      sim.place(1, t.tx + 1, t.ty + (t.ty > 6 ? -1 : 1));
    for (let i = 0; i < 1200; i++) {
      if (i % 90 === 0) {
        for (let k = 0; k < 3; k++) {
          // 물 타일 식물은 물가(길 s≈13)에, 그 밖에는 칸 근처 길에 적을 공급한다
          sim.spawnEnemy(k === 2 && i % 270 === 0 ? 'E02' : 'E01', 0, 1, {
            s: water ? 15 + k * 0.5 : onPath ? 11 + k * 0.1 : 8.5 + k * 0.4,
          });
        }
      }
      if (i === 400) t.gauge = 1; // 개화기도 한 번 발동시킨다
      sim.step();
    }
    const acted =
      t.dealt > 0 ||
      t.support > 0 ||
      sim.nutrient > 9999 ||
      sim.fields.length > 0 ||
      sim.summons.length > 0 ||
      t.kills > 0 ||
      sim.enemies.some((e) => e.icons.length > 0) ||
      sim.towers.some((x) => x.support > 0);
    expect(acted, `${id} ${spec.arch} 아무 일도 하지 않았다`).toBe(true);
  });
});
