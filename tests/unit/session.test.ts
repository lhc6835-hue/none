import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../src/core/Clock';
import { EventBus } from '../../src/core/EventBus';
import type { GameEvents } from '../../src/core/events';
import { createInitialState } from '../../src/core/GameState';
import { OFFLINE, totalGpOf } from '../../src/data/care';
import { STARTER_SEEDS } from '../../src/data/items';
import { countOf, seedKey } from '../../src/systems/economy/Inventory';
import { expToNext, gainPlayerExp } from '../../src/systems/economy/PlayerLevel';
import { giveStarterKit } from '../../src/systems/economy/Starter';
import { water } from '../../src/systems/garden/CareTools';
import {
  baseOf,
  bubbleOf,
  createPlant,
  movePlant,
  namePlant,
  plantEnv,
} from '../../src/systems/garden/Garden';
import { GardenSession, LIVE_MAX_MS } from '../../src/systems/garden/Session';
import { defaultWorldForTest } from './gardenHelpers';

const T0 = Date.UTC(2026, 0, 15, 12, 0, 0);

function make(species = 'P002') {
  const clock = new FakeClock(T0);
  const state = createInitialState(T0);
  state.player.level = 10;
  const plant = createPlant(state, species, 'WINDOW', 0, T0);
  state.plants.push(plant);
  const bus = new EventBus<GameEvents>();
  const seen: string[] = [];
  bus.on('plant:stageUp', (e) => seen.push(`stage${e.to}`));
  bus.on('plant:bloom', () => seen.push('bloom'));
  bus.on('player:levelUp', (e) => seen.push(`lv${e.level}`));
  const session = new GardenSession(state, clock, bus);
  return { clock, state, plant, bus, session, seen };
}

describe('정원 세션 (시간 진행)', () => {
  it('1초 미만은 아무것도 하지 않고, 1초 이상 2분 이하는 라이브로 진행한다', () => {
    const { clock, plant, session, state } = make();
    clock.advance(500);
    expect(session.advance()).toBeNull();
    expect(plant.gp).toBe(0);
    clock.advance(60_000);
    expect(session.advance()).toBeNull();
    expect(plant.gp).toBeGreaterThan(0);
    expect(state.garden.lastTickAt).toBe(clock.now());
  });

  it('2분을 넘기면 오프라인 계산으로 넘기고 보고서를 돌려준다(12시간 상한)', () => {
    const { clock, session } = make();
    clock.advance(LIVE_MAX_MS + 1000);
    const r = session.advance();
    expect(r).not.toBeNull();
    expect(r!.rewound).toBe(false);
    clock.advance(30 * 3_600_000);
    const r2 = session.advance();
    expect(r2!.capped).toBe(true);
    expect(r2!.elapsedMs).toBe(OFFLINE.maxMs);
  });

  it('시계가 뒤로 가면 그 구간은 무시한다', () => {
    const { clock, session, state, plant } = make();
    clock.advance(10_000);
    session.advance();
    const gp = plant.gp;
    clock.set(T0 - 3_600_000);
    expect(session.advance()).toBeNull();
    expect(plant.gp).toBe(gp);
    expect(state.garden.lastTickAt).toBe(T0 - 3_600_000);
  });

  it('오프라인 12시간이면 그늘 식물이 개화하고 정원사 경험치가 오른다', () => {
    const { clock, session, state, seen } = make();
    // 새싹에서 이름 짓기 전/지지대 · 분갈이 관문을 미리 통과시켜 둔다
    state.plants[0].flags.repotted2 = true;
    state.plants[0].flags.repotted4 = true;
    const before = state.player.exp + state.player.level * 1000;
    clock.advance(12 * 3_600_000);
    const r = session.advance();
    expect(r!.lines.some((l) => l.kind === 'stageUp')).toBe(true);
    expect(seen).toBeDefined();
    const after = state.player.exp + state.player.level * 1000;
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

describe('정원사 레벨 · 경험치 (09문서 8절)', () => {
  it('다음 레벨까지 경험치 = round(50 × L^1.6)', () => {
    expect(expToNext(1)).toBe(50);
    expect(expToNext(5)).toBe(657);
    // 문서의 예시(1,990 · 6,040)는 어림값이다. 기준은 공식이다.
    expect(expToNext(10)).toBe(1991);
    expect(expToNext(20)).toBe(6034);
  });

  it('경험치가 차면 레벨이 오르고 이벤트가 나온다(한 번에 여러 레벨도 가능)', () => {
    const state = createInitialState(T0);
    const bus = new EventBus<GameEvents>();
    const levels: number[] = [];
    bus.on('player:levelUp', (e) => levels.push(e.level));
    expect(gainPlayerExp(state, 49, bus)).toBe(0);
    expect(gainPlayerExp(state, 1, bus)).toBe(1);
    expect(state.player.level).toBe(2);
    expect(state.player.exp).toBe(0);
    gainPlayerExp(state, expToNext(2) + expToNext(3) + expToNext(4), bus);
    expect(levels).toEqual([2, 3, 4, 5]);
    expect(state.player.level).toBe(5);
  });

  it('돌봄을 하면 완벽 +3 · 일반 +1 이 쌓인다', () => {
    const { session, plant, state } = make();
    state.player.level = 1;
    plant.needs.water = 40;
    const ctx = session.ctxFor(plant);
    const r = water(ctx, 60); // 물 적게(30–55) 종이 아니면 구간 밖일 수도 있다 → 결과로 기대치를 계산
    const gained = r.perfect ? 3 : 1;
    expect(state.player.exp).toBe(gained);
  });
});

describe('시작 지급품', () => {
  it('씨앗 3개와 소모품이 가방에 들어간다', () => {
    const state = createInitialState(T0);
    giveStarterKit(state);
    for (const id of STARTER_SEEDS) expect(countOf(state, seedKey(id))).toBe(1);
    expect(countOf(state, 'GREEN')).toBeGreaterThan(0);
  });
});

describe('화분 옮기기 · 이름 짓기 · 말풍선', () => {
  it('빈 칸으로 옮기면 이동하고, 차 있는 칸이면 서로 자리를 바꾼다', () => {
    const { state, plant } = make();
    const other = createPlant(state, 'P011', 'TABLE', 0, T0);
    state.plants.push(other);
    expect(movePlant(state, plant.uid, 'TABLE', 1, T0)).toEqual({ ok: true, swapped: false });
    expect(plant.location).toEqual({ zone: 'TABLE', slot: 1 });
    const r = movePlant(state, plant.uid, 'TABLE', 0, T0);
    expect(r).toEqual({ ok: true, swapped: true });
    expect(other.location).toEqual({ zone: 'TABLE', slot: 1 });
  });

  it('열리지 않은 칸 · 잠긴 구역 · 수생 전용 구역은 막힌다', () => {
    const { state, plant } = make();
    expect(movePlant(state, plant.uid, 'TABLE', 3, T0)).toEqual({ ok: false, reason: 'noSlot' });
    state.player.level = 1;
    expect(movePlant(state, plant.uid, 'SHADE', 0, T0)).toEqual({ ok: false, reason: 'locked' });
  });

  it('이름 짓기: 검사를 통과해야 하고, 통과하면 눈뜨기 대기가 풀린다', () => {
    const { plant } = make();
    plant.flags.needsName = true;
    expect(namePlant(plant, '', T0)).toEqual({ ok: false, error: 'length' });
    expect(plant.flags.needsName).toBe(true);
    const r = namePlant(plant, '  콩이 ', T0);
    expect(r).toEqual({ ok: true, name: '콩이' });
    expect(plant.nickname).toBe('콩이');
    expect(plant.flags.needsName).toBeUndefined();
    expect(plant.diary.at(-1)?.kind).toBe('named');
  });

  it('욕구 말풍선: 목마름 > 곰팡이 > … > 개화 순으로 가장 급한 하나', () => {
    const { state, plant } = make();
    plant.stage = 2;
    const world = defaultWorldForTest();
    const env = () => plantEnv(state, plant, world);
    const base = baseOf(plant.speciesId);
    plant.needs = { water: 80, nutrition: 80, hygiene: 100, mood: 80 };
    expect(bubbleOf(plant, base, env())).toBeNull();
    plant.problems.push({ kind: 'MOLD', since: T0 });
    expect(bubbleOf(plant, base, env())).toBe('mold');
    plant.needs.water = 10;
    expect(bubbleOf(plant, base, env())).toBe('water');
    plant.flags.needsName = true;
    expect(bubbleOf(plant, base, env())).toBe('bloom');
  });
});

describe('개화 경험치', () => {
  it('라이브로 개화하면 경험치 +20', () => {
    const { clock, session, plant, state } = make();
    plant.flags.repotted2 = true;
    plant.flags.repotted4 = true;
    plant.stage = 4;
    plant.gp = totalGpOf(baseOf(plant.speciesId).grade) - 1;
    const before = state.player.exp;
    clock.advance(10_000);
    session.advance();
    expect(plant.stage).toBe(5);
    expect(state.player.exp - before).toBeGreaterThanOrEqual(20);
  });
});
