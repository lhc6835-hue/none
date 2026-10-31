import { describe, expect, it } from 'vitest';
import { PixelGrid, STAMP_CHARS } from '../../src/art/PixelGrid';
import { STAMPS, stampsOf } from '../../src/art/stamps';

describe('스탬프 라이브러리 (02문서 7절: 60개 이상)', () => {
  it('60개 이상이고 아이디가 "분류.이름" 형식이다', () => {
    expect(Object.keys(STAMPS).length).toBeGreaterThanOrEqual(60);
    for (const id of Object.keys(STAMPS)) expect(id).toMatch(/^[a-z0-9]+\.[A-Za-z0-9]+$/);
  });

  it('요구한 분류별 개수를 채운다', () => {
    const need: Record<string, number> = {
      leaf: 6, // 둥근 · 뾰족 · 하트 · 바늘 · 깃털 · 넓적
      petal: 4,
      flower: 8, // 꽃잎 3 · 4 · 5 · 6장
      cap: 4,
      thorn: 3,
      fruit: 6,
      tendril: 4,
      crystal: 3,
      bulb: 4,
      stem: 1,
      seed: 10, // 계열별
    };
    for (const [prefix, min] of Object.entries(need)) {
      expect(stampsOf(prefix).length, prefix).toBeGreaterThanOrEqual(min);
    }
  });

  it('모든 행의 길이가 같고, 허용된 문자만 쓰며, 비어 있지 않다', () => {
    for (const [id, rows] of Object.entries(STAMPS)) {
      const w = rows[0].length;
      expect(rows.length, id).toBeGreaterThan(1);
      for (const row of rows) {
        expect(row.length, `${id}: "${row}"`).toBe(w);
        for (const ch of row) expect(STAMP_CHARS.has(ch), `${id}: '${ch}'`).toBe(true);
      }
      expect(rows.join('').replace(/\./g, '').length, id).toBeGreaterThan(3);
    }
  });

  it('씨앗은 8×8 이다', () => {
    for (const id of stampsOf('seed')) {
      expect(STAMPS[id].length, id).toBe(8);
      expect(STAMPS[id][0].length, id).toBe(8);
    }
  });

  it('스탬프의 모든 픽셀이 서로 이어져 있다(조각난 스탬프 없음)', () => {
    // 조각이 흩어진 스탬프는 고아 픽셀을 만든다. 8방향 연결로 한 덩어리인지 확인한다.
    for (const [id, rows] of Object.entries(STAMPS)) {
      if (id.startsWith('star.') || id.startsWith('crystal.flake')) continue; // 발광 점 모양
      const g = new PixelGrid(rows[0].length + 2, rows.length + 2);
      g.stamp(rows, 1, 1, 1);
      const cells = g.cells.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
      const seen = new Set<number>([cells[0]]);
      const stack = [cells[0]];
      while (stack.length) {
        const i = stack.pop() as number;
        const x = i % g.w;
        const y = Math.floor(i / g.w);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const j = (y + dy) * g.w + (x + dx);
            if (g.filled(x + dx, y + dy) && !seen.has(j)) {
              seen.add(j);
              stack.push(j);
            }
          }
        }
      }
      expect(seen.size, `${id} 가 여러 조각입니다`).toBe(cells.length);
    }
  });
});
