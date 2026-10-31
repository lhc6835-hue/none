import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/EventBus';
import type { GameEvents } from '../../src/core/events';
import { createInitialState, normalizeState, type GameState } from '../../src/core/GameState';
import { Rng, makeRng } from '../../src/core/Rng';
import { AFFECTION, OFFLINE, STAGE_RATIO, totalGpOf } from '../../src/data/care';
import { PLANT_BASE } from '../../src/data/plants';
import { addItem, takeItem, countOf } from '../../src/systems/economy/Inventory';
import { affectionLevel, gainAffection } from '../../src/systems/garden/Affection';
import { fail } from '../../src/systems/garden/Care';
import { snack } from '../../src/systems/garden/CareSocial';
import { nutrient, water, mist, boneMeal, repot } from '../../src/systems/garden/CareTools';
import { baseOf, createPlant, plantEnv } from '../../src/systems/garden/Garden';
import { envFor, seasonOf, weatherOn, defaultWorldForTest } from './gardenHelpers';
import { addGp, stageForGp, thresholdGp } from '../../src/systems/garden/Growth';
import { applyDecay, conditionOf, decayRates } from '../../src/systems/garden/Needs';
import { simulateOffline } from '../../src/systems/garden/Offline';
import { moldChance, hasProblem } from '../../src/systems/garden/Problems';
import { starsFor } from '../../src/systems/garden/Quality';
import { rollTrait, traitSlots } from '../../src/systems/garden/Traits';

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);
const world = defaultWorldForTest();

function setup(species = 'P001', level = 10) {
  const state: GameState = createInitialState(NOW);
  state.player.level = level;
  const plant = createPlant(state, species, 'WINDOW', 0, NOW);
  state.plants.push(plant);
  const bus = new EventBus<GameEvents>();
  const events: string[] = [];
  bus.on('plant:stageUp', (e) => events.push(`stage${e.to}`));
  bus.on('plant:bloom', () => events.push('bloom'));
  bus.on('plant:eyesOpen', () => events.push('eyes'));
  bus.on('plant:problem', (e) => events.push(e.kind));
  const base = baseOf(species);
  const env = plantEnv(state, plant, world);
  const ctx = (rngSeed = 'care') => ({
    state,
    plant,
    base,
    env,
    now: NOW,
    dateKey: '2026-01-15',
    bus,
    rng: new Rng(rngSeed),
  });
  return { state, plant, base, env, bus, events, ctx };
}

describe('성장 단계와 GP (04문서 2절)', () => {
  it('개화까지 총 GP = 개화 시간(분) × 60 (그늘 360 … 태초 57,600)', () => {
    expect(
      ['SHADE', 'DEW', 'SUN', 'DUSK', 'MOON', 'STAR', 'AURORA', 'ORIGIN'].map((g) =>
        totalGpOf(g as never),
      ),
    ).toEqual([360, 900, 1800, 3600, 7200, 14400, 28800, 57600]);
  });

  it('단계 임계값은 누적 GP 비율 0 · 5 · 15 · 35 · 65 · 100%', () => {
    const base = baseOf('P001');
    expect([...STAGE_RATIO]).toEqual([0, 0.05, 0.15, 0.35, 0.65, 1]);
    expect(thresholdGp(base, 1)).toBe(18);
    expect(thresholdGp(base, 5)).toBe(360);
    expect(stageForGp(base, 17)).toBe(0);
    expect(stageForGp(base, 18)).toBe(1);
    expect(stageForGp(base, 360)).toBe(5);
  });

  it('새싹이 되는 순간 처음 눈뜨기 이벤트가 한 번만 나오고 이름을 기다린다', () => {
    const { plant, base, bus, events } = setup();
    addGp(plant, base, thresholdGp(base, 2), NOW, bus);
    expect(plant.stage).toBe(2);
    expect(events.filter((e) => e === 'eyes')).toHaveLength(1);
    expect(plant.flags.needsName).toBe(true);
    expect(plant.flags.personalityRolled).toBe(true); // 성격은 새싹 단계에서 정해진다
  });

  it('분갈이 관문: 2→3 단계는 분갈이를 해야 넘어간다(큰 GP 가 한 번에 들어와도 99%에서 멈춤)', () => {
    const { plant, base, bus, ctx, state } = setup('P002');
    addGp(plant, base, thresholdGp(base, 2), NOW, bus);
    addGp(plant, base, 9999, NOW, bus);
    expect(plant.stage).toBe(2);
    expect(hasProblem(plant, 'ROOTBOUND')).toBe(true);
    expect(plant.gp).toBe(Math.round(thresholdGp(base, 3) * 0.99));
    // 새 화분(중)으로 분갈이하면 관문이 풀리고 다음 단계로 간다
    addItem(state, 'pot:CLAY:2', 1);
    expect(repot(ctx(), 'CLAY', 'BASIC', 10).ok).toBe(true);
    addGp(plant, base, 9999, NOW, bus);
    // 첫 관문을 지나 4단계까지 가지만, 4→5 는 두 번째 분갈이(큰 화분)가 필요하다
    expect(plant.stage).toBe(4);
    expect(hasProblem(plant, 'ROOTBOUND')).toBe(true);
    expect(plant.gp).toBe(Math.round(thresholdGp(base, 5) * 0.99));
    addItem(state, 'pot:CLAY:3', 1);
    expect(repot(ctx(), 'CLAY', 'BASIC', 10).ok).toBe(true);
    addGp(plant, base, 9999, NOW, bus);
    expect(plant.stage).toBe(5);
    // 화분 크기는 최대 3 이라 세 번째 분갈이는 없다(분갈이는 정확히 두 번)
    expect(repot(ctx(), 'CLAY', 'BASIC', 10).ok).toBe(false);
  });

  it('지지대가 필요한 종은 지지대 없이 성숙(4)으로 못 가고 쓰러진다', () => {
    const { plant, base, bus } = setup('P001'); // 꼬불덩굴(덩굴형)
    plant.flags.repotted2 = true;
    addGp(plant, base, 9999, NOW, bus);
    expect(plant.stage).toBe(3);
    expect(hasProblem(plant, 'TOPPLED')).toBe(true);
    expect(plant.gp).toBeLessThan(thresholdGp(base, 4));
  });

  it('개화하면 자질(★)과 등급별 칸 수의 형질이 확정된다', () => {
    const { plant, base, bus, events } = setup('P002');
    plant.flags.repotted2 = true;
    plant.flags.repotted4 = true;
    addGp(plant, base, totalGpOf(base.grade), NOW, bus);
    expect(plant.stage).toBe(5);
    expect(events).toContain('bloom');
    expect(plant.quality).toBeGreaterThanOrEqual(1);
    expect(plant.traits).toHaveLength(traitSlots(base.grade, plant.quality ?? 1));
  });
});

describe('욕구 · 컨디션 (04문서 3절)', () => {
  it('어린 단계 수분은 시간당 30(성격 느긋은 -20%)씩 줄어든다', () => {
    const { plant, base } = setup();
    plant.personality = 'GLUTTON'; // 수분 감소는 그대로 30
    const r = decayRates(plant, base);
    expect(r.water).toBeCloseTo(30, 5);
    expect(r.nutrition).toBeCloseTo(12 * 1.3, 5); // 먹보: 양분 감소 +30%
    applyDecay(plant, r, 3600);
    expect(plant.needs.water).toBeCloseTo(55 - 30, 5);
  });

  it('컨디션 = 1.0 + 보정의 합 (갓 심은 그늘 식물: 양분 +0.10 · 청결 +0.05)', () => {
    const { plant, base, env } = setup();
    expect(conditionOf(plant, base, env).value).toBeCloseTo(1.15, 5);
    plant.needs.water = 10;
    expect(conditionOf(plant, base, env).value).toBeCloseTo(1.15 - 0.4, 5);
    plant.needs.water = 0;
    plant.needs.nutrition = 0;
    plant.needs.hygiene = 0;
    plant.needs.mood = 0;
    expect(conditionOf(plant, base, env).value).toBe(0.3); // 하한 0.3
  });
});

describe('문제 발생 확률 (04문서 6절)', () => {
  it('곰팡이: 4% × 습도 × 청결 × 과습 × 이웃 × 등급 배율', () => {
    const { plant, base, env, state } = setup('P002');
    const noNb = { infected: false, fungus: false };
    const p = moldChance(plant, base, env, noNb, NOW);
    expect(p).toBeCloseTo(0.04 * 0.6, 5); // 그늘 등급 ×0.6, 보통 습도
    plant.needs.hygiene = 40;
    expect(moldChance(plant, base, env, noNb, NOW)).toBeCloseTo(0.04 * 0.6 * 1.5, 5);
    plant.needs.hygiene = 100;
    expect(moldChance(plant, base, env, { infected: true, fungus: false }, NOW)).toBeCloseTo(
      p * 2,
      5,
    );
    expect(moldChance(plant, base, env, { infected: false, fungus: true }, NOW)).toBeCloseTo(
      p * 0.3,
      5,
    );
    plant.needs.water = 110;
    expect(moldChance(plant, base, env, noNb, NOW)).toBeCloseTo(p * 2, 5);
    void state;
  });

  it('버섯 계열은 곰팡이에 걸리지 않는다', () => {
    const { plant, base, env } = setup('P021');
    expect(moldChance(plant, base, env, { infected: true, fungus: false }, NOW)).toBe(0);
  });
});

describe('오프라인 (04문서 2-3 · 12문서 7절)', () => {
  const hours = (h: number) => h * 3_600_000;

  it('경과는 12시간 상한, 10분 묶음 72개까지만 계산한다', () => {
    const { state, plant } = setup();
    const r = simulateOffline(state, NOW, NOW + hours(30));
    expect(r.capped).toBe(true);
    expect(r.elapsedMs).toBe(OFFLINE.maxMs);
    expect(r.batches).toBe(72);
    expect(plant.lastUpdated).toBe(NOW + hours(30));
  });

  it('욕구는 20 밑으로 떨어지지 않는다(죽거나 큰 병에 걸리지 않는다)', () => {
    const { state, plant } = setup('P011');
    simulateOffline(state, NOW, NOW + hours(12));
    for (const v of Object.values(plant.needs)) expect(v).toBeGreaterThanOrEqual(20);
  });

  it('시계를 뒤로 돌리면 그 구간은 무시하고 시각만 갱신한다', () => {
    const { state, plant } = setup();
    const before = JSON.stringify(plant.needs);
    const r = simulateOffline(state, NOW, NOW - hours(5));
    expect(r.rewound).toBe(true);
    expect(r.elapsedMs).toBe(0);
    expect(JSON.stringify(plant.needs)).toBe(before);
    expect(state.garden.lastTickAt).toBe(NOW - hours(5));
  });

  it('12시간 방치하면 그늘 식물이 개화하고 보고서에 단계 · 개화가 남는다', () => {
    const { state, plant } = setup('P002');
    plant.flags.repotted2 = true;
    plant.flags.repotted4 = true;
    const r = simulateOffline(state, NOW, NOW + hours(12));
    expect(plant.stage).toBe(5);
    expect(r.lines.some((l) => l.kind === 'bloom')).toBe(true);
    expect(r.lines.filter((l) => l.kind === 'stageUp').length).toBeGreaterThanOrEqual(1);
  });

  it('같은 입력이면 같은 결과다(판정 난수는 식물 uid · 묶음 시각 시드)', () => {
    const run = () => {
      const { state, plant } = setup('P002');
      const r = simulateOffline(state, NOW, NOW + hours(12));
      return JSON.stringify({
        needs: plant.needs,
        gp: plant.gp,
        problems: plant.problems,
        lines: r.lines,
      });
    };
    expect(run()).toBe(run());
  });
});

describe('애정도 · 자질 · 형질', () => {
  it('♡ 단계는 누적 20 · 50 · 100 … 1,250', () => {
    expect(AFFECTION.thresholds).toEqual([20, 50, 100, 170, 260, 380, 530, 720, 950, 1250]);
    expect([0, 19, 20, 49, 50, 1249, 1250].map(affectionLevel)).toEqual([0, 0, 1, 1, 2, 9, 10]);
  });

  it('하루 한 식물당 최대 60 (몰아서 올리기 방지), 날짜가 바뀌면 다시 쌓인다', () => {
    const { plant } = setup();
    plant.personality = 'LAID_BACK';
    for (let i = 0; i < 100; i++) gainAffection(plant, 5, '2026-01-15');
    expect(plant.affection).toBe(60);
    gainAffection(plant, 5, '2026-01-16');
    expect(plant.affection).toBe(65);
  });

  it('자질 ★: 0.8 · 1.0 · 1.15 · 1.3 경계', () => {
    expect([0.79, 0.8, 0.99, 1.0, 1.14, 1.15, 1.29, 1.3, 1.5].map(starsFor)).toEqual([
      1, 2, 2, 3, 3, 4, 4, 5, 5,
    ]);
  });

  it('형질 추첨 분포는 흔함 70% · 드묾 25% · 희귀 5% (10만 회)', () => {
    const rng = new Rng('traits');
    const c = { COMMON: 0, UNCOMMON: 0, RARE: 0 } as Record<string, number>;
    const names = new Map<string, string>();
    for (let i = 0; i < 100_000; i++) {
      const id = rollTrait(rng);
      if (!names.has(id)) names.set(id, id);
      const idx = [
        'STURDY_STEM',
        'SHARP_LEAF',
        'LONG_ROOT',
        'DILIGENT',
        'FIRM_ROOT',
        'THRIFTY',
        'WATER_HIPPO',
        'LIGHT_EATER',
        'TIDY_LEAF',
        'EARLY_BIRD',
      ].includes(id)
        ? 'COMMON'
        : [
              'GOLDEN_ROOT',
              'TWIN_BLOOM',
              'GIANT',
              'STAR_BEARER',
              'UNYIELDING',
              'RESONANCE',
              'LIGHT_DEVOURER',
              'OLD_SOUL',
              'FIRST_SNOW',
              'GENE_STAR',
            ].includes(id)
          ? 'RARE'
          : 'UNCOMMON';
      c[idx]++;
    }
    expect(c.COMMON / 100_000).toBeCloseTo(0.7, 1);
    expect(c.UNCOMMON / 100_000).toBeCloseTo(0.25, 1);
    expect(c.RARE / 100_000).toBeCloseTo(0.05, 1);
    expect(names.size).toBe(30);
  });
});

describe('돌봄 행동 (04문서 5절)', () => {
  it('물주기: 적정 구간에서 떼면 완벽 → 기분 +5 · 생기 버프 10분 · 관찰 노트 +1', () => {
    const { ctx, plant, state } = setup(); // P001: 물 많이 70–95
    const r = water(ctx(), 80);
    expect(r.perfect).toBe(true);
    expect(plant.needs.mood).toBe(75);
    expect(plant.timers.vitality).toBe(NOW + 600_000);
    expect(state.player.notes).toBe(1);
    expect(state.mastery.WATER).toBe(1);
  });

  it('물주기: 100 을 넘기면 흘러넘침 → 완벽 아님 · 과습 카운트 +1', () => {
    const { ctx, plant } = setup();
    const r = water(ctx(), 115);
    expect(r.perfect).toBe(false);
    expect(r.info?.overflow).toBe(true);
    expect(plant.timers.overwaterCount).toBe(1);
  });

  it('도구는 정원사 레벨에 맞춰 해금된다 (분무는 Lv2, 뼛가루는 Lv4)', () => {
    const lv1 = setup('P001', 1);
    expect(mist(lv1.ctx(), 4)).toMatchObject({ ok: false, reason: 'locked' });
    addItem(lv1.state, 'BONE_1', 1);
    expect(boneMeal(lv1.ctx(), 'BONE_1', 3).reason).toBe('locked');
    const lv4 = setup('P001', 4);
    addItem(lv4.state, 'BONE_1', 1);
    lv4.plant.stage = 0;
    const r = boneMeal(lv4.ctx(), 'BONE_1', 3);
    expect(r.perfect).toBe(true);
    expect(lv4.plant.gp).toBeCloseTo(360 * 0.08, 5); // 총 GP 의 8%
    expect(lv4.plant.stage).toBeGreaterThanOrEqual(1);
  });

  it('영양제: 좋아하는 영양제는 ×1.5, 한 단계에서 3개를 넘기면 영양 과다', () => {
    const { ctx, plant, state, base } = setup('P002'); // 좋아하는 영양제: 달콤
    expect(base.care.favoriteNutrient).toBe('SWEET');
    addItem(state, 'GREEN', 9);
    addItem(state, 'SWEET', 1);
    plant.needs.mood = 20;
    const r = nutrient(ctx(), 'SWEET');
    expect(r.reaction).toBe('excited');
    expect(plant.needs.mood).toBeCloseTo(20 + 30 * 1.5, 5);
    expect(state.flags['codex.favorite.P002']).toBe(true);
    for (let i = 0; i < 3; i++) nutrient(ctx(), 'GREEN');
    expect(hasProblem(plant, 'EXCESS_NUTRIENT')).toBe(true); // 영양제 4개째(달콤 + 초록 3)
  });

  it('간식: 계열이 맞지 않으면 고개를 돌리고 소모되지 않는다', () => {
    const { ctx, state, plant } = setup('P031'); // 꽃 계열 → 설탕물
    plant.stage = 2;
    addItem(state, 'SNACK_CHARCOAL', 1);
    const r = snack(ctx(), 'SNACK_CHARCOAL');
    expect(r).toMatchObject({ ok: false, reason: 'turnAway' });
    expect(countOf(state, 'SNACK_CHARCOAL')).toBe(1);
    addItem(state, 'SNACK_SUGAR_WATER', 1);
    expect(snack(ctx(), 'SNACK_SUGAR_WATER').ok).toBe(true);
  });

  it('fail() 도우미는 효과음과 함께 실패 결과를 만든다', () => {
    expect(fail('noItem')).toMatchObject({ ok: false, sfx: 'ui_error', reason: 'noItem' });
  });
});

describe('환경 · 날씨 · 인벤토리 · 저장 정규화', () => {
  it('날씨는 날짜가 같으면 언제나 같고 계절은 월로 정해진다', () => {
    const p = {
      year: 2026,
      month: 1,
      day: 15,
      hour: 12,
      minute: 0,
      dateKey: '2026-01-15',
      hourFloat: 12,
    };
    expect(weatherOn(p)).toBe(weatherOn(p));
    expect([1, 3, 6, 9, 12].map(seasonOf)).toEqual([
      'WINTER',
      'SPRING',
      'SUMMER',
      'AUTUMN',
      'WINTER',
    ]);
    expect(makeRng('daily', 'x').next()).toBe(makeRng('daily', 'x').next());
  });

  it('구역 환경: 블라인드 · 난로 · 선풍기가 빛과 온도를 바꾼다', () => {
    const house = { music: null, blinds: {}, stove: false, fan: false } as const;
    const w = { night: false, weather: 'CLOUDY', season: 'SPRING' } as const;
    expect(envFor('TABLE', w, house).light).toBe(2);
    expect(envFor('TABLE', w, { ...house, blinds: { TABLE: 'OPEN' } }).light).toBe(3);
    expect(envFor('SHADE', w, house).temp).toBe('COOL');
    expect(envFor('SHADE', w, { ...house, stove: true }).temp).toBe('MID');
    expect(envFor('WINDOW', { ...w, weather: 'SUNNY' }, house).light).toBe(3);
  });

  it('가방: 없는 것은 쓸 수 없고 칸당 99개를 넘지 않는다', () => {
    const s = createInitialState(NOW);
    expect(takeItem(s, 'GREEN')).toBe(false);
    addItem(s, 'GREEN', 150);
    expect(countOf(s, 'GREEN')).toBe(99);
    expect(takeItem(s, 'GREEN', 99)).toBe(true);
    expect(s.inventory.GREEN).toBeUndefined();
  });

  it('옛 저장에 없는 항목은 기본값으로 채운다(저장이 깨지지 않는다)', () => {
    const s = createInitialState(NOW) as unknown as Record<string, unknown>;
    delete s.inventory;
    delete (s.garden as Record<string, unknown>).nextUid;
    const fixed = normalizeState(s as unknown as GameState);
    expect(fixed.inventory).toEqual({});
    expect(fixed.garden.nextUid).toBe(1);
  });
});

describe('식물 돌봄 데이터 (07문서 돌봄 열)', () => {
  it('100종 모두 빛 1–3 · 물 · 온도 · 낮/밤 · 좋아하는 영양제가 있다', () => {
    for (const p of PLANT_BASE) {
      expect([1, 2, 3], p.id).toContain(p.care.light);
      expect(['LOW', 'MID', 'HIGH'], p.id).toContain(p.care.water);
      expect(['COOL', 'MID', 'WARM'], p.id).toContain(p.care.temp);
      expect(['DAY', 'NIGHT'], p.id).toContain(p.care.active);
      expect(['GREEN', 'GROW', 'SWEET', 'STRONG'], p.id).toContain(p.care.favoriteNutrient);
    }
  });

  it('덩굴형은 모두 지지대가 필요하고, 오로라 이상은 밤 노출이 필요하며, 태초 4종은 고유 조건이 있다', () => {
    for (const p of PLANT_BASE.filter((x) => x.look.body === 'VINE'))
      expect(p.care.needsStake, p.id).toBe(true);
    for (const p of PLANT_BASE.filter((x) => x.grade === 'AURORA'))
      expect(p.care.needsNightExposure, p.id).toBe(true);
    expect(PLANT_BASE.filter((p) => p.care.special).map((p) => p.id)).toEqual([
      'P040',
      'P060',
      'P080',
      'P090',
    ]);
  });

  it('별빛 이상 중 좋아하는 음악 · 말이 있는 종은 모두 유효한 값이다', () => {
    for (const p of PLANT_BASE.filter((x) => x.care.music)) {
      expect(['LULLABY', 'WALTZ', 'MARCH', 'RAIN', 'JAZZ', 'MYSTIC'], p.id).toContain(p.care.music);
      expect(['CHEER', 'PRAISE', 'BATTLE', 'COMFORT'], p.id).toContain(p.care.phrase);
    }
  });
});
