// 헤드리스 자동 배치 봇 (06문서 15절 · 12문서 12절): 사람 대신 꺾꽂이 · 강화를 해서 클리어율을 잰다.
// 전략은 단순하다: 길을 많이 덮는 칸에 공격 식물을 심고, 생산 식물은 안전한 곳에, 남는 양분은 강화에 쓴다.

import { PLANT_BATTLE_BY_ID } from '../../data/battle/plants';
import { type BattleResult, BattleSim, type SimOptions } from './BattleSim';
import { nearestOnRoute } from './Paths';
import { canPlaceOn } from './Towers';
import type { Loadout } from './types';

export const defaultLoad = (speciesId: string, o: Partial<Loadout> = {}): Loadout => ({
  speciesId,
  level: 1,
  stars: 2,
  hearts: 0,
  stage: 5,
  condition: 1,
  traits: [],
  ...o,
});

/** 한 칸이 길을 얼마나 덮는지(사거리 안 길 지점 수) */
function coverage(sim: BattleSim, tx: number, ty: number, range: number): number {
  let n = 0;
  for (const r of sim.map.routes) {
    for (let s = 0; s < r.length; s += 0.5) {
      const i = Math.min(
        r.pts.length - 1,
        Math.max(
          0,
          r.cum.findIndex((c) => c >= s),
        ),
      );
      const p = r.pts[i];
      if (Math.hypot(p.x - (tx + 0.5), p.y - (ty + 0.5)) <= range) n++;
    }
  }
  return n;
}

export class Bot {
  private order: number[] = [];
  private cursor = 0;

  constructor(private readonly sim: BattleSim) {
    this.order = sim.deck.map((_, i) => i);
  }

  /** 20틱마다 한 번 불러 준다 */
  act(): void {
    const sim = this.sim;
    if (sim.phase === 'WON' || sim.phase === 'LOST') return;
    // 1) 새 식물 심기
    for (let tries = 0; tries < this.order.length; tries++) {
      const idx = this.order[this.cursor % this.order.length];
      const cost = sim.placeCost(idx);
      const reserve = sim.towers.length < 3 ? 0 : 20;
      if (sim.nutrient < cost + reserve) break;
      const tile = this.bestTile(idx);
      if (!tile) {
        this.cursor++;
        continue;
      }
      if (sim.place(idx, tile.x, tile.y).ok) {
        this.cursor++;
        return;
      }
      this.cursor++;
    }
    // 2) 강화: 가장 싼 강화부터, 분기는 A
    const ups = sim.towers
      .filter((t) => t.level < 3 && t.down <= 0)
      .map((t) => ({ t, cost: Math.round(t.spec.cost * [0.5, 0.75, 1.1][t.level]) }))
      .sort((a, b) => a.cost - b.cost);
    for (const u of ups) {
      if (sim.nutrient >= u.cost + (sim.towers.length < this.sim.deck.length ? 40 : 0)) {
        sim.upgrade(u.t.id, 'A');
        return;
      }
    }
  }

  private bestTile(deckIndex: number): { x: number; y: number } | null {
    const sim = this.sim;
    const load = sim.deck[deckIndex];
    const spec = PLANT_BATTLE_BY_ID.get(load.speciesId)!;
    const range = spec.range > 90 ? 6 : Math.max(1.5, spec.range);
    let best: { x: number; y: number; score: number } | null = null;
    for (let y = 0; y < sim.map.tiles.length; y++) {
      for (let x = 0; x < sim.map.tiles[0].length; x++) {
        const tile = sim.map.tiles[y][x];
        if (!canPlaceOn(spec, tile) || sim.towers.some((t) => t.tx === x && t.ty === y)) continue;
        let score = 0;
        if (spec.arch === 'PRODUCE') {
          // 생산: 길에서 먼 곳
          const d = Math.min(...sim.map.routes.map((r) => nearestOnRoute(r, x + 0.5, y + 0.5).d));
          score = d * 2;
        } else if (spec.arch === 'AURA') {
          let near = 0;
          for (const t of sim.towers)
            if (Math.hypot(t.tx - x, t.ty - y) <= Math.max(2, range)) near++;
          score = near * 8 + coverage(sim, x, y, 2);
        } else if (spec.arch === 'WALL' || spec.arch === 'TRAP') {
          score =
            coverage(sim, x, y, spec.arch === 'WALL' ? 0.6 : range) + (tile === 'PATH' ? 2 : 0);
        } else {
          score = coverage(sim, x, y, range) + (tile === 'FERTILE' ? 6 : 0);
        }
        // 이미 같은 칸 근처가 몰리지 않게 약간 분산
        for (const t of sim.towers) if (Math.hypot(t.tx - x, t.ty - y) < 1.1) score -= 3;
        if (!best || score > best.score) best = { x, y, score };
      }
    }
    return best && best.score > 0 ? best : null;
  }
}

/** 한 판을 끝까지(또는 시간 제한까지) 돌린다 */
export function runBattle(
  opts: SimOptions,
  maxSeconds = 40 * 60,
): { sim: BattleSim; result: BattleResult } {
  const sim = new BattleSim({ ...opts, recordEvents: false });
  const bot = new Bot(sim);
  const limit = maxSeconds * 60;
  while (sim.phase !== 'WON' && sim.phase !== 'LOST' && sim.tick < limit) {
    if (sim.tick % 20 === 0) bot.act();
    sim.step();
  }
  return { sim, result: sim.result() };
}
