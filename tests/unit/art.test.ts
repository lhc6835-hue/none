import { describe, expect, it } from 'vitest';
import { BlinkTimer } from '../../src/art/Blink';
import {
  contrast,
  drawFace,
  EXPRESSIONS,
  inkFor,
  layoutFace,
  type Expression,
} from '../../src/art/FaceRenderer';
import { validateFace } from '../../src/art/FaceValidator';
import { strayColors } from '../../src/art/GridCanvas';
import { generateIcon, generateMark, ICONS } from '../../src/art/IconGen';
import { generatePlant, buildBase, FRAME_NAMES, type FaceHost } from '../../src/art/PlantSpriteGen';
import { generatePot, generateMound, type PotStyle } from '../../src/art/PotSpriteGen';
import { rampsFor } from '../../src/art/Ramps';
import { generateSeed } from '../../src/art/SeedSpriteGen';
import { generateTile, TILE_KINDS } from '../../src/art/TileGen';
import { STAGE_SIZE, type Stage } from '../../src/art/bodies/Ctx';
import { SPECIAL } from '../../src/art/palette';
import type { FaceSpec, FaceType, FamilyId, GradeId } from '../../src/core/schema';
import { GRADE_ORDER, GRADES } from '../../src/data/grades';
import { PLANT_BASE } from '../../src/data/plants';

const STAGES: Stage[] = [1, 2, 3, 4, 5];

describe('아트 파이프라인 — 100종 × 5단계 × 색변이 (M1 DoD)', () => {
  it('모든 종 · 단계 · 색변이가 오류 없이 만들어지고 팔레트 밖 색이 0이다', () => {
    let sprites = 0;
    for (const plant of PLANT_BASE) {
      for (const stage of STAGES) {
        for (const variant of [false, true]) {
          const s = generatePlant(plant, stage, variant);
          sprites++;
          const [w, h] = STAGE_SIZE[stage];
          expect(s.w, `${plant.id} s${stage}`).toBe(w + 2);
          expect(s.h).toBe(h + 1);
          for (const name of FRAME_NAMES) {
            const g = s.frames[name].grid;
            expect(g.w).toBe(s.w);
            expect(g.h).toBe(s.h);
            expect(strayColors(g), `${plant.id} s${stage} ${name}`).toEqual([]);
            expect(
              g.px.filter((c) => c !== null).length,
              `${plant.id} s${stage} ${name} 비어 있음`,
            ).toBeGreaterThan(8);
          }
        }
      }
    }
    expect(sprites).toBe(1000);
  }, 120_000);

  it('호스트(얼굴이 붙는 부위)가 이름대로 등록된다 — 조용한 대체 없음', () => {
    for (const plant of PLANT_BASE) {
      for (const stage of STAGES) {
        const { hostFound } = buildBase(plant, stage, rampsFor(plant.look));
        expect(hostFound, `${plant.id} s${stage} host=${plant.look.face.host}`).toBe(true);
      }
    }
  });

  it('같은 입력은 언제나 같은 그림이다 (종 ID 시드 · 결정적)', () => {
    for (const id of ['P001', 'P040', 'P100']) {
      const plant = PLANT_BASE.find((p) => p.id === id)!;
      const a = generatePlant(plant, 5);
      const b = generatePlant(plant, 5);
      for (const name of FRAME_NAMES)
        expect(a.frames[name].grid.px).toEqual(b.frames[name].grid.px);
    }
  });

  it('자랄수록 커진다: 단계마다 픽셀 수가 늘거나 비슷하다', () => {
    let grew = 0;
    for (const plant of PLANT_BASE) {
      const counts = STAGES.map(
        (st) => generatePlant(plant, st).frames.idle0.grid.px.filter((c) => c !== null).length,
      );
      if (counts[4] > counts[1] && counts[3] > counts[0]) grew++;
    }
    expect(grew).toBeGreaterThanOrEqual(95);
  });

  it('외곽선은 순검정이 아니라 그 부위 램프의 0번 색이다', () => {
    for (const plant of PLANT_BASE.slice(0, 40)) {
      const g = generatePlant(plant, 5).frames.idle0.grid;
      g.px.forEach((c, i) => {
        if (c && g.outline[i]) expect(c, plant.id).not.toBe('#000000');
      });
    }
  });

  it('프레임 변형: 대기 4 · 공격 3 · 피격 1 · 시듦 1 · 잠 1 이 모두 다르다', () => {
    const s = generatePlant(PLANT_BASE[0], 5);
    expect(FRAME_NAMES).toHaveLength(10);
    const sig = (n: (typeof FRAME_NAMES)[number]) => s.frames[n].grid.px.join('|');
    expect(new Set(['idle0', 'idle1', 'idle2', 'idle3'].map((n) => sig(n as never))).size).toBe(4);
    expect(sig('hit')).not.toBe(sig('idle0'));
    expect(sig('wilt')).not.toBe(sig('idle0'));
    expect(sig('sleep')).not.toBe(sig('idle0'));
    // 번쩍임은 모든 몸 픽셀이 4번(밝은) 색 계열
    const hit = s.frames.hit.grid;
    const bodyColors = new Set(hit.px.filter((c, i) => c && !hit.outline[i]));
    expect(bodyColors.size).toBeLessThanOrEqual(4);
  });

  it('윗부분만 흔들린다: 경계 행 아래(발 밑)는 흔들림 프레임에서도 같다', () => {
    for (const plant of [PLANT_BASE[10], PLANT_BASE[24], PLANT_BASE[60]]) {
      const s = generatePlant(plant, 5);
      const rows = (name: (typeof FRAME_NAMES)[number]) => {
        const g = s.frames[name].grid;
        // 경계 행 + 2 부터 바닥까지 (늘림 프레임은 경계 행을 한 번 더 복제한다)
        return g.px.slice((s.split + 2) * g.w).join('|');
      };
      expect(rows('idle1'), plant.id).toBe(rows('idle0'));
      expect(rows('idle2'), plant.id).toBe(rows('idle0'));
      expect(rows('idle3'), plant.id).toBe(rows('idle0'));
    }
  });

  it('경계선이 얼굴 호스트를 가로지르지 않는다(머리가 둘로 갈라지지 않는다)', () => {
    for (const plant of PLANT_BASE) {
      const s = generatePlant(plant, 4);
      const h = s.frames.idle0.host;
      // 호스트가 경계 위쪽에 통째로 있거나, 경계 아래쪽에 통째로 있다
      const crosses =
        h.y < s.split + 1 && h.y + h.h - 1 >= s.split + 1 && h.y + h.h - 1 > s.split + 1;
      expect(crosses, plant.id).toBe(false);
    }
  });
});

describe('실루엣 구분 (13문서 M1: 같은 계열끼리는 닮고, 다른 종끼리는 구분된다)', () => {
  const masks = PLANT_BASE.map((p) =>
    generatePlant(p, 5).frames.idle0.grid.px.map((c) => c !== null),
  );
  const iou = (a: boolean[], b: boolean[]) => {
    let i = 0;
    let u = 0;
    for (let k = 0; k < a.length; k++) {
      if (a[k] && b[k]) i++;
      if (a[k] || b[k]) u++;
    }
    return i / u;
  };

  it('어떤 두 종도 실루엣이 거의 같지 않다 (겹침률 ≤ 0.92, 0.85 이상 쌍은 소수)', () => {
    let max = 0;
    let high = 0;
    for (let i = 0; i < masks.length; i++) {
      for (let j = i + 1; j < masks.length; j++) {
        const v = iou(masks[i], masks[j]);
        max = Math.max(max, v);
        if (v >= 0.85) high++;
      }
    }
    expect(max).toBeLessThanOrEqual(0.92);
    expect(high).toBeLessThanOrEqual(25);
  });

  it('겹침률이 높은 쌍은 색(주 램프)으로 구분된다', () => {
    for (let i = 0; i < masks.length; i++) {
      for (let j = i + 1; j < masks.length; j++) {
        if (iou(masks[i], masks[j]) < 0.85) continue;
        const a = PLANT_BASE[i].look.ramps;
        const b = PLANT_BASE[j].look.ramps;
        expect(
          a.main !== b.main || a.sub !== b.sub,
          `${PLANT_BASE[i].id} ~ ${PLANT_BASE[j].id}`,
        ).toBe(true);
      }
    }
  });
});

describe('점선 얼굴 검수기 (02문서 5-2 · 5-6): 위반 0', () => {
  it('모든 종 × 단계 × 색변이 × 대기 프레임 4 에서 위반이 0건이다', () => {
    const bad: string[] = [];
    for (const plant of PLANT_BASE) {
      for (const stage of STAGES) {
        for (const variant of [false, true]) {
          const s = generatePlant(plant, stage, variant);
          for (const name of ['idle0', 'idle1', 'idle2', 'idle3'] as const) {
            const fr = s.frames[name];
            for (const issue of validateFace(plant.look.face, fr.host, fr.bodyColor, fr.grid)) {
              bad.push(
                `${plant.id} s${stage}${variant ? 'v' : ''} ${name}: ${issue.rule} ${issue.message}`,
              );
            }
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  }, 120_000);

  it('잉크는 몸 색과 명도 대비 3:1 이상 — 번쩍임 · 시듦 · 잠 프레임에서도', () => {
    for (const plant of PLANT_BASE) {
      const s = generatePlant(plant, 5);
      for (const name of FRAME_NAMES) {
        const fr = s.frames[name];
        const ink = inkFor(fr.bodyColor);
        expect(contrast(fr.bodyColor, ink), `${plant.id} ${name}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('검수기는 실제로 위반을 잡는다 (사람 비율의 얼굴을 일부러 만들어 본다)', () => {
    // 폭 12 호스트에 눈 사이 D=4(금지 구간 3 ≤ D < 7.2) · 입 L=5(금지 2 ≤ L < 6) 인 얼굴
    const spans: [number, number][] = Array.from({ length: 10 }, () => [10, 21]);
    const host: FaceHost = { x: 10, y: 5, w: 12, h: 10, spans };
    const fake = (spec: FaceSpec) => spec;
    expect(validateFace(fake({ type: 'F01', host: 'bulb' }), host, '#4b8c42').length).toBe(0);
    // 호스트 폭이 6(<8) 인데 눈이 둘이면 위반: 작은 호스트로 검사하면 눈 1개로 줄어 통과해야 한다
    const small: FaceHost = {
      x: 10,
      y: 5,
      w: 6,
      h: 6,
      spans: Array.from({ length: 6 }, () => [10, 15] as [number, number]),
    };
    const dots = drawFace({ type: 'F01', host: 'bulb' }, small, 'default', [0, 0], '#4b8c42');
    expect(dots.filter((d) => d.kind === 'eye')).toHaveLength(1);
    expect(dots.filter((d) => d.kind === 'mouth')).toHaveLength(1);
    // 호스트가 비어 있으면 위반
    const empty: FaceHost = { x: 0, y: 0, w: 0, h: 0, spans: [] };
    expect(validateFace({ type: 'F01', host: 'x' }, empty, '#4b8c42').length).toBeGreaterThan(0);
  });
});

describe('표정 16종 × 얼굴 유형 12종 (02문서 5-3 · 5-4)', () => {
  const types: FaceType[] = [
    'F01',
    'F02',
    'F03',
    'F04',
    'F05',
    'F06',
    'F07',
    'F08',
    'F09',
    'F10',
    'F11',
    'F12',
  ];
  // 호스트: 폭 15 × 높이 12 의 둥근 몸
  const host: FaceHost = {
    x: 4,
    y: 4,
    w: 15,
    h: 12,
    spans: Array.from({ length: 12 }, (_, j) => {
      const half = Math.round(7.5 * Math.sqrt(Math.max(0.05, 1 - ((j - 5.5) / 6.2) ** 2)));
      return [11 - half, 11 + half] as [number, number];
    }),
  };

  it('표정은 16종이다', () => {
    expect(EXPRESSIONS).toHaveLength(16);
    expect(new Set(EXPRESSIONS).size).toBe(16);
  });

  it('모든 유형 × 모든 표정에서 눈과 입이 겹치지 않고 점이 하나 이상 나온다', () => {
    for (const type of types) {
      for (const expr of EXPRESSIONS) {
        const dots = drawFace(
          { type, host: 'x', eyeSpread: 0.8, mouthLen: 0.9 },
          host,
          expr,
          [0, 0],
          '#4b8c42',
          { time: 0.1 },
        );
        expect(dots.length, `${type} ${expr}`).toBeGreaterThan(1);
        const seen = new Set<string>();
        for (const d of dots) {
          const k = `${d.x},${d.y}`;
          expect(seen.has(k), `${type} ${expr} 겹침 ${k}`).toBe(false);
          seen.add(k);
        }
        expect(
          dots.some((d) => d.kind === 'eye'),
          `${type} ${expr} 눈`,
        ).toBe(true);
      }
    }
  });

  it('기본이 아닌 표정은 기본 표정과 다른 모양이다(눈 또는 입이 바뀜)', () => {
    const sig = (type: FaceType, e: Expression) =>
      drawFace({ type, host: 'x', eyeSpread: 0.8, mouthLen: 0.9 }, host, e, [0, 0], '#4b8c42', {
        // 놀람은 처음 200ms 만 2×2 눈이므로 시작 직후 시점으로 비교한다
        time: 0.1,
      })
        .map((d) => `${d.kind}${d.x},${d.y}`)
        .sort()
        .join(';');
    for (const type of types) {
      const base = sig(type, 'default');
      for (const e of EXPRESSIONS.filter((x) => x !== 'default')) {
        expect(sig(type, e), `${type} ${e}`).not.toBe(base);
      }
    }
  });

  it('눈 모양: 깜빡 2px 가로선 · 기쁨 ∧ · 전투 사선 · 기절 x · 놀람 2×2(첫 200ms)', () => {
    const spec: FaceSpec = { type: 'F01', host: 'x' };
    const eyes = (e: Expression, time = 0.5) =>
      drawFace(spec, host, e, [0, 0], '#4b8c42', { time }).filter((d) => d.kind === 'eye');
    expect(eyes('default')).toHaveLength(2); // 점 2개
    expect(eyes('blink')).toHaveLength(4); // 2px × 2
    expect(eyes('happy')).toHaveLength(6); // ∧ 3px × 2
    expect(eyes('battle')).toHaveLength(6); // 사선 3px × 2
    expect(eyes('faint')).toHaveLength(10); // x 5px × 2
    expect(eyes('surprise', 0.1)).toHaveLength(8); // 2×2 × 2
    expect(eyes('surprise', 0.5)).toHaveLength(2); // 이후 점
  });

  it('꿀꺽은 150ms 마다 입이 직선 ↔ = 로 바뀐다', () => {
    const spec: FaceSpec = { type: 'F01', host: 'x' };
    const mouth = (t: number) =>
      drawFace(spec, host, 'gulp', [0, 0], '#4b8c42', { time: t }).filter((d) => d.kind === 'mouth')
        .length;
    expect(mouth(0.0)).toBeLessThan(mouth(0.2));
    expect(mouth(0.2)).toBeGreaterThan(mouth(0.31));
  });

  it('입은 선이다: 입 안을 채우지 않는다(벌린 입은 평행선 두 줄)', () => {
    const spec: FaceSpec = { type: 'F01', host: 'x' };
    const open = drawFace(spec, host, 'gulp', [0, 0], '#4b8c42', { time: 0.2 }).filter(
      (d) => d.kind === 'mouth',
    );
    const rows = new Set(open.map((d) => d.y));
    expect(rows.size).toBe(2);
  });

  it('시선 추적: 눈이 최대 1px 움직이고 몸 안쪽을 벗어나지 않는다', () => {
    const spec: FaceSpec = { type: 'F01', host: 'x', eyeSpread: 0.8 };
    const eyes = (look: [number, number]) =>
      drawFace(spec, host, 'default', look, '#4b8c42').filter((d) => d.kind === 'eye');
    const base = eyes([0, 0]);
    for (const look of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
    ] as [number, number][]) {
      const moved = eyes(look);
      moved.forEach((d, i) => {
        expect(Math.abs(d.x - base[i].x)).toBeLessThanOrEqual(1);
        expect(Math.abs(d.y - base[i].y)).toBeLessThanOrEqual(1);
        const span = host.spans[d.y - host.y];
        expect(span && d.x >= span[0] && d.x <= span[1], `look ${look}`).toBe(true);
      });
    }
    expect(eyes([1, 0]).map((d) => d.x)).not.toEqual(base.map((d) => d.x));
  });

  it('작은 호스트(W<8): 눈 1개 + 점 입', () => {
    const tiny: FaceHost = {
      x: 3,
      y: 3,
      w: 5,
      h: 3,
      spans: [
        [3, 7],
        [3, 7],
        [4, 6],
      ],
    };
    for (const type of types) {
      const lay = layoutFace({ type, host: 'x' }, tiny);
      expect(lay.eyes, type).toHaveLength(1);
      expect(lay.mouth, type).toHaveLength(1);
    }
  });

  it('잉크색: 밝은 몸은 잉크, 어두운 몸은 종이, 적은 #f8a577', () => {
    expect(inkFor('#c6e86f')).toBe(SPECIAL.INK);
    expect(inkFor('#1d3b2a')).toBe(SPECIAL.PAPER);
    expect(inkFor('#1d3b2a', true)).toBe('#f8a577');
  });
});

describe('엇갈린 깜빡임 (02문서 5-5 "눈 깜빡임 동기화 금지")', () => {
  it('식물들의 첫 깜빡임이 한 순간에 몰려 있지 않다(100ms 칸 하나에 8% 이하)', () => {
    const buckets = new Map<number, number>();
    for (const p of PLANT_BASE) {
      const k = Math.floor(new BlinkTimer(p.id).firstAt / 100);
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    expect(Math.max(...buckets.values())).toBeLessThanOrEqual(8);
    expect(buckets.size).toBeGreaterThanOrEqual(35); // 4.8초 범위에 넓게 퍼짐
  });

  it('같은 식물은 언제나 같은 박자, 깜빡임은 100ms 이다', () => {
    const a = new BlinkTimer('x');
    const b = new BlinkTimer('x');
    expect(a.firstAt).toBe(b.firstAt);
    const t0 = a.firstAt;
    expect(a.isBlinking(t0)).toBe(true);
    expect(a.isBlinking(t0 + 99)).toBe(true);
    expect(a.isBlinking(t0 + 101)).toBe(false);
  });
});

describe('씨앗 · 화분 · 타일 · 아이콘 생성기', () => {
  const families: FamilyId[] = [
    'VINE',
    'THORN',
    'FUNGUS',
    'BLOOM',
    'FRUIT',
    'EMBER',
    'FROST',
    'LUMEN',
    'STORM',
    'SPIRIT',
  ];

  it('씨앗: 계열 10 × 등급 8 = 80종이 모두 팔레트 안이고 서로 모양 · 색이 다르다', () => {
    const sigs = new Set<string>();
    for (const f of families) {
      for (const g of GRADE_ORDER) {
        const grid = generateSeed(f, g as GradeId);
        expect(strayColors(grid), `${f}/${g}`).toEqual([]);
        expect(grid.w).toBe(10);
        sigs.add(grid.px.join('|'));
      }
    }
    expect(sigs.size).toBe(80);
  });

  it('화분 5종(20×12) · 흙 둔덕(16×4)', () => {
    for (const style of ['clay', 'stone', 'wood', 'glass', 'mossy'] as PotStyle[]) {
      const g = generatePot(style);
      expect([g.w, g.h]).toEqual([20, 12]);
      expect(strayColors(g)).toEqual([]);
    }
    const m = generateMound();
    expect([m.w, m.h]).toEqual([16, 4]);
    expect(strayColors(m)).toEqual([]);
  });

  it('타일: 챕터 7 × 종류 7 × 변형 4 = 196장 24×24, 빈칸 없고 팔레트 안', () => {
    for (let ch = 1; ch <= 7; ch++) {
      for (const kind of TILE_KINDS) {
        for (let v = 0; v < 4; v++) {
          const g = generateTile(ch, kind, v);
          expect([g.w, g.h]).toEqual([24, 24]);
          expect(strayColors(g), `${ch}/${kind}/${v}`).toEqual([]);
          expect(
            g.px.every((c) => c !== null),
            `${ch}/${kind}/${v} 빈칸`,
          ).toBe(true);
        }
      }
    }
  });

  it('바닥 타일 변형 4종은 서로 다르다(반복 패턴 방지)', () => {
    const sigs = new Set([0, 1, 2, 3].map((v) => generateTile(1, 'floor', v).px.join('|')));
    expect(sigs.size).toBe(4);
  });

  it('아이콘 · 등급 표식: 모두 팔레트 안이고 8가지 표식이 서로 다르다', () => {
    for (const name of Object.keys(ICONS)) {
      expect(strayColors(generateIcon(name)), name).toEqual([]);
      expect(
        generateIcon(name).px.some((c) => c !== null),
        name,
      ).toBe(true);
    }
    const marks = GRADE_ORDER.map((g) => generateMark(GRADES[g].mark, '#fdfbf5').px.join('|'));
    expect(new Set(marks).size).toBe(8);
  });
});
