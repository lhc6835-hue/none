import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RAMPS } from '../../src/art/palette';
import { PLANT_BATTLE, PLANT_BATTLE_BY_ID } from '../../src/data/battle/plants';
import { STAGES } from '../../src/data/battle/stages';
import { ENEMIES } from '../../src/data/battle/enemies';

const ARCH_KO: Record<string, string> = {
  사수: 'SHOOT',
  저격: 'SNIPE',
  곡사: 'LOB',
  근접: 'MELEE',
  장판: 'ZONE',
  광선: 'BEAM',
  연쇄: 'CHAIN',
  오라: 'AURA',
  소환: 'SUMMON',
  생산: 'PRODUCE',
  설치: 'TRAP',
  장벽: 'WALL',
  특수: 'SPECIAL',
};

interface Row {
  id: string;
  arch: string;
  cost: number;
  stats: string;
  text: string;
}

function docRows(): Row[] {
  const rows: Row[] = [];
  for (const f of ['07-plants-1', '07-plants-2', '07-plants-3', '07-plants-4']) {
    for (const line of readFileSync(`docs/${f}.md`, 'utf8').split('\n')) {
      if (!/^\| P\d{3} \|/.test(line)) continue;
      const c = line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((x) => x.trim());
      const [arch, cost] = c[5].split('·').map((x) => x.trim());
      rows.push({ id: c[0], arch: ARCH_KO[arch], cost: Number(cost), stats: c[6], text: c[7] });
    }
  }
  return rows;
}

describe('전투 데이터 — 07문서와 일치', () => {
  const rows = docRows();

  it('100종이 모두 있다', () => {
    expect(rows).toHaveLength(100);
    expect(PLANT_BATTLE).toHaveLength(100);
    for (const r of rows) expect(PLANT_BATTLE_BY_ID.has(r.id), r.id).toBe(true);
  });

  it('아키타입과 배치 비용이 문서 표와 같다', () => {
    const bad: string[] = [];
    for (const r of rows) {
      const p = PLANT_BATTLE_BY_ID.get(r.id)!;
      if (p.arch !== r.arch) bad.push(`${r.id} 아키타입 ${p.arch} ≠ ${r.arch}`);
      if (p.cost !== r.cost) bad.push(`${r.id} 비용 ${p.cost} ≠ ${r.cost}`);
    }
    expect(bad).toEqual([]);
  });

  it('피해 · 간격 · 사거리: 문서 표와 맞는다(일반 표기만)', () => {
    const bad: string[] = [];
    for (const r of rows) {
      const p = PLANT_BATTLE_BY_ID.get(r.id)!;
      if (!/^\d+(\.\d+)? \/ \d+(\.\d+)? \/ \d+(\.\d+)?$/.test(r.stats)) continue; // 틱 · 초당 · 특수 표기는 제외
      const [d, i, g] = r.stats.split('/').map((x) => Number(x.trim()));
      if (p.dmg !== d || p.interval !== i || p.range !== g)
        bad.push(`${r.id}: ${p.dmg}/${p.interval}/${p.range} ≠ ${r.stats}`);
    }
    expect(bad).toEqual([]);
  });

  it('종마다 이펙트(모양 · 색 · 타격 · 꼬리 · 시전)의 조합이 모두 다르다', () => {
    const seen = new Map<string, string>();
    for (const p of PLANT_BATTLE) {
      const f = p.fx;
      const key = [
        f.shape,
        f.color.join(),
        f.color2?.join() ?? '',
        f.hit,
        f.trail ?? '',
        f.cast ?? '',
      ].join('|');
      expect(seen.get(key), `${p.id} 와 ${seen.get(key)} 의 이펙트가 같다`).toBeUndefined();
      seen.set(key, p.id);
    }
  });

  it('이펙트 색은 모두 팔레트 램프 안이다', () => {
    for (const p of PLANT_BATTLE) {
      for (const c of [p.fx.color, p.fx.color2].filter(Boolean) as [string, number][]) {
        const ramp = (RAMPS as Record<string, readonly string[]>)[c[0]];
        expect(ramp, `${p.id} ${c[0]}`).toBeDefined();
        expect(ramp[c[1]], `${p.id} ${c.join()}`).toBeDefined();
      }
    }
  });

  it('특수 능력 종은 special 코드를 가진다', () => {
    for (const p of PLANT_BATTLE) if (p.arch === 'SPECIAL') expect(p.special, p.id).toBeTruthy();
  });
});

describe('스테이지 · 맵 · 적', () => {
  it('챕터 1 의 6개 스테이지, 모든 맵이 26×12 이고 입구에서 출구까지 길이 이어진다', () => {
    expect(STAGES).toHaveLength(6);
    for (const s of STAGES) {
      expect(s.map, s.id).toHaveLength(12);
      for (const row of s.map) expect(row.length, s.id).toBe(26);
      const flat = s.map.join('');
      expect(flat.includes('S'), s.id).toBe(true);
      expect(flat.split('X').length - 1, s.id).toBe(1);
      for (const w of s.waves)
        for (const g of w) expect(ENEMIES[g.e], `${s.id} ${g.e}`).toBeDefined();
    }
  });

  it('1-1 웨이브는 문서의 표와 같다(8웨이브, 마지막은 E01 ×30)', () => {
    const s = STAGES[0];
    expect(s.waves).toHaveLength(8);
    expect(s.waves[0]).toEqual([{ e: 'E01', n: 6, gap: 1.2, delay: 0, entrance: 0 }]);
    expect(s.waves[7][0]).toMatchObject({ e: 'E01', n: 30, gap: 0.4 });
  });

  it('새 적은 2웨이브에 처음 나오고 3웨이브는 새 적만 나온다(1-3 · 1-4 · 1-5)', () => {
    for (const id of ['1-3', '1-4', '1-5']) {
      const s = STAGES.find((x) => x.id === id)!;
      const firstSeen = s.waves.findIndex((w) => w.some((g) => g.e === s.newEnemy));
      expect(firstSeen, id).toBe(1);
      expect(
        s.waves[2].every((g) => g.e === s.newEnemy),
        `${id} 3웨이브`,
      ).toBe(true);
    }
  });
});
