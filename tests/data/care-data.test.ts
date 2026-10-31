import { describe, expect, it } from 'vitest';
import { BONES, NUTRIENTS } from '../../src/data/items';
import { PERSONALITIES } from '../../src/data/personalities';
import { POTS } from '../../src/data/pots';
import { SOILS } from '../../src/data/soils';
import { TRAITS } from '../../src/data/traits';
import { ZONES } from '../../src/data/zones';
import { TABLES } from '../../src/i18n';

describe('돌봄 데이터의 이름 키가 문자열 파일에 모두 있다', () => {
  const keys = [
    ...Object.values(PERSONALITIES).map((x) => x.nameKey),
    ...Object.values(ZONES).map((x) => x.nameKey),
    ...Object.values(NUTRIENTS).map((x) => x.nameKey),
    ...Object.values(BONES).map((x) => x.nameKey),
    ...Object.values(SOILS).map((x) => x.nameKey),
    ...Object.values(POTS).map((x) => x.nameKey),
  ];
  it('ko · en 둘 다', () => {
    for (const k of keys) {
      expect(TABLES.ko[k], k).toBeTruthy();
      expect(TABLES.en[k], k).toBeTruthy();
    }
  });

  it('성격 8 · 구역 9 · 영양제 10 · 뼛가루 3 · 흙 8 · 화분 9 · 형질 30', () => {
    expect(Object.keys(PERSONALITIES)).toHaveLength(8);
    expect(Object.keys(ZONES)).toHaveLength(9);
    expect(Object.keys(NUTRIENTS)).toHaveLength(10);
    expect(Object.keys(BONES)).toHaveLength(3);
    expect(Object.keys(SOILS)).toHaveLength(8);
    expect(Object.keys(POTS)).toHaveLength(9);
    expect(TRAITS).toHaveLength(30);
    expect(new Set(TRAITS.map((t) => t.id)).size).toBe(30);
    expect(TRAITS.filter((t) => t.rarity === 'COMMON')).toHaveLength(10);
    expect(TRAITS.filter((t) => t.rarity === 'UNCOMMON')).toHaveLength(10);
    expect(TRAITS.filter((t) => t.rarity === 'RARE')).toHaveLength(10);
  });
});
