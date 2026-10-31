import { describe, expect, it } from 'vitest';
import { GRADES, GRADE_ORDER } from '../../src/data/grades';
import { PLANT_BASE } from '../../src/data/plants';
import { TABLES } from '../../src/i18n';
import type { FamilyId, GradeId } from '../../src/core/schema';
import { PALETTE_SET } from '../../src/art/palette';

describe('식물 100종 기본 데이터 (07문서 → scripts/gen-plant-looks.ts)', () => {
  it('P001–P100 이 순서대로 100개, 중복 없음', () => {
    expect(PLANT_BASE).toHaveLength(100);
    expect(PLANT_BASE.map((p) => p.id)).toEqual(
      Array.from({ length: 100 }, (_, i) => `P${String(i + 1).padStart(3, '0')}`),
    );
    expect(new Set(PLANT_BASE.map((p) => p.id)).size).toBe(100);
  });

  it('계열마다 10종', () => {
    const count = new Map<FamilyId, number>();
    for (const p of PLANT_BASE) count.set(p.family, (count.get(p.family) ?? 0) + 1);
    expect([...count.values()]).toEqual(new Array(10).fill(10));
  });

  it('등급별 종 수가 03문서 표와 같다 (18·18·16·14·12·10·8·4)', () => {
    const count = new Map<GradeId, number>();
    for (const p of PLANT_BASE) count.set(p.grade, (count.get(p.grade) ?? 0) + 1);
    for (const id of GRADE_ORDER) expect(count.get(id), id).toBe(GRADES[id].speciesCount);
  });

  it('모든 종이 필수 look 필드를 갖고, 램프는 R1–R12 이다', () => {
    for (const p of PLANT_BASE) {
      const l = p.look;
      expect(l.body, p.id).toBeTruthy();
      expect(l.ramps.main, p.id).toMatch(/^R(1[0-2]|[1-9])$/);
      expect(l.ramps.sub, p.id).toMatch(/^R(1[0-2]|[1-9])$/);
      expect(l.variantRamps.main, p.id).toMatch(/^R(1[0-2]|[1-9])$/);
      expect(l.variantRamps.sub, p.id).toMatch(/^R(1[0-2]|[1-9])$/);
      expect(l.face.type, p.id).toMatch(/^F(0[1-9]|1[0-2])$/);
      expect(l.face.host, p.id).toBeTruthy();
      expect(l.face.eyeSpread).toBeGreaterThanOrEqual(0.6);
      expect(l.face.eyeSpread).toBeLessThanOrEqual(1.0);
      expect(l.face.mouthLen).toBeGreaterThanOrEqual(0.5);
      expect(l.face.mouthLen).toBeLessThanOrEqual(1.2);
    }
  });

  it('F12(세눈)는 최대 6종 (02문서 5-3)', () => {
    expect(PLANT_BASE.filter((p) => p.look.face.type === 'F12').length).toBeLessThanOrEqual(6);
  });

  it('색변이 램프는 종마다 본래 램프와 다르다', () => {
    for (const p of PLANT_BASE) {
      const same =
        p.look.variantRamps.main === p.look.ramps.main &&
        p.look.variantRamps.sub === p.look.ramps.sub;
      expect(same, p.id).toBe(false);
    }
  });

  it('한국어 · 영어 이름이 모두 있다', () => {
    for (const p of PLANT_BASE) {
      expect(TABLES.ko[p.nameKey], p.id).toBeTruthy();
      expect(TABLES.en[p.nameKey], p.id).toBeTruthy();
    }
  });
});

describe('빛 등급 데이터 (03문서 1 · 2절)', () => {
  it('8단계, 능력치 배율 · 기본 비용 · 개화 시간이 표와 같다', () => {
    expect(GRADE_ORDER).toHaveLength(8);
    expect(GRADE_ORDER.map((g) => GRADES[g].statMul)).toEqual([
      1.0, 1.2, 1.45, 1.75, 2.1, 2.5, 3.0, 3.6,
    ]);
    expect(GRADE_ORDER.map((g) => GRADES[g].baseCost)).toEqual([
      50, 75, 100, 130, 165, 200, 250, 320,
    ]);
    expect(GRADE_ORDER.map((g) => GRADES[g].bloomMinutes)).toEqual([
      6, 15, 30, 60, 120, 240, 480, 960,
    ]);
    expect(GRADE_ORDER.map((g) => GRADES[g].revealSec)).toEqual([
      0.6, 0.8, 1.0, 1.2, 1.5, 1.8, 2.2, 3.0,
    ]);
  });

  it('등급 표식은 모양 × 개수(1–8)로 구분되고 색은 팔레트 안', () => {
    expect(GRADE_ORDER.map((g) => GRADES[g].markCount)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(GRADE_ORDER.map((g) => GRADES[g].mark)).size).toBe(8);
    for (const g of GRADE_ORDER) {
      for (const c of [GRADES[g].color, GRADES[g].border, GRADES[g].text])
        expect(PALETTE_SET.has(c), `${g} ${c}`).toBe(true);
    }
  });
});
