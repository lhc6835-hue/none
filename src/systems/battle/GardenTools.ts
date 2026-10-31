// 정원사 도구 (06문서 11절): 소나기 · 삽 내려찍기 · 비료 폭탄 · 무당벌레 출동 · 허수아비

import { CHAPTER_HP_MUL } from '../../data/battle/enemies';
import type { BattleSim } from './BattleSim';
import { dealDamage } from './Damage';
import { applyStatus } from './Status';
import { nearestOnRoute } from './Paths';
import { tk } from './types';

export interface ToolDef {
  id: string;
  nameKey: string;
  cd: number;
  unlockLevel: number;
}

export const GARDEN_TOOLS: Record<string, ToolDef> = {
  SHOWER: { id: 'SHOWER', nameKey: 'tool.SHOWER', cd: 45, unlockLevel: 1 },
  SHOVEL: { id: 'SHOVEL', nameKey: 'tool.SHOVEL', cd: 40, unlockLevel: 1 },
  FERTILIZER: { id: 'FERTILIZER', nameKey: 'tool.FERTILIZER', cd: 60, unlockLevel: 3 },
  LADYBUG: { id: 'LADYBUG', nameKey: 'tool.LADYBUG', cd: 75, unlockLevel: 6 },
  SCARECROW: { id: 'SCARECROW', nameKey: 'tool.SCARECROW', cd: 70, unlockLevel: 7 },
};

export function toolTick(sim: BattleSim): void {
  for (let i = 0; i < sim.toolCd.length; i++) if (sim.toolCd[i] > 0) sim.toolCd[i]--;
}

/** 도구 사용. 성공하면 true */
export function useTool(sim: BattleSim, slot: number, x: number, y: number): boolean {
  const id = sim.toolIds[slot];
  const def = id ? GARDEN_TOOLS[id] : undefined;
  if (!def || sim.toolCd[slot] > 0 || sim.phase === 'WON' || sim.phase === 'LOST') return false;
  const mul = CHAPTER_HP_MUL[sim.stage.chapter - 1];
  sim.toolCd[slot] = tk(def.cd);
  sim.emit({ t: 'tool', slot, x, y, id });
  switch (id) {
    case 'SHOWER':
      for (const t of sim.towers) {
        if (Math.abs(t.x - x) <= 1.2 && Math.abs(t.y - y) <= 1.2) {
          t.buffs.push({ aspd: 0.3, dmg: 0, range: 0, crit: 0, until: sim.tick + tk(6) });
          t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.3);
        }
      }
      break;
    case 'SHOVEL':
      for (const e of sim.enemiesNear(x, y, 1, { air: false })) {
        dealDamage(sim, e, 40 * mul, null, { type: 'PHYS', area: true });
        applyStatus(sim, e, { k: 'STUN', dur: 1.5 }, null);
      }
      break;
    case 'FERTILIZER':
      for (const e of sim.enemiesNear(x, y, 1.5, { air: false })) {
        dealDamage(sim, e, 120 * mul, null, { type: 'POISON', area: true });
        applyStatus(sim, e, { k: 'SLOW', amt: 0.4, dur: 2 }, null);
      }
      break;
    case 'LADYBUG':
      for (let i = 0; i < 6; i++) {
        sim.addSummon({
          tower: 0,
          x: x + (i - 2.5) * 0.2,
          y,
          hp: 1,
          maxHp: 1,
          cd: 0,
          holding: [],
          kind: 'LADYBUG',
          life: tk(8),
          dmg: 12 * mul,
          fx: { shape: 'orb', color: ['R7', 3], hit: 'puff' },
        });
      }
      break;
    case 'SCARECROW': {
      const route = sim.map.routes[0];
      const near = nearestOnRoute(route, x, y);
      void near;
      sim.addField({
        kind: 'DECOY',
        tower: 0,
        x,
        y,
        r: 0.7,
        left: tk(10),
        period: 30,
        nextTick: sim.tick + 30,
        fx: { shape: 'none', color: ['R10', 3], hit: 'puff' },
        v: { air: 0 },
        on: [],
        type: 'PHYS',
      });
      break;
    }
    default:
      return false;
  }
  return true;
}
