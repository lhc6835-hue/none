// 능력 시연(디버그 · 도감 미리보기): 식물 한 종을 맵에 심고 적을 계속 흘려 보내 공격 방식 · 이펙트 · 개화기를 보여 준다.
// ?debug=1&scene=AbilityDemo&plant=P011 로 열고, ◀ ▶ 로 100종을 넘겨 본다. 결과 · 보상 · 저장은 없다.

import { RAMPS, SPECIAL } from '../../art/palette';
import { PLANT_BATTLE } from '../../data/battle/plants';
import { t } from '../../i18n';
import { plantSpeciesName } from '../../i18n/names';
import { defaultLoad } from '../../systems/battle/Bot';
import { Button } from '../../ui/Button';
import { pixelText } from '../../ui/PixelText';
import type { BattleScene, BattleSceneData } from './BattleScene';

const LAND: [number, number][] = [
  [10, 3],
  [10, 4],
  [8, 3],
  [8, 4],
  [11, 3],
  [10, 2],
  [8, 6],
  [11, 6],
];
const WATER: [number, number][] = [
  [13, 7],
  [14, 7],
  [13, 8],
  [14, 6],
];
const PATH: [number, number][] = [
  [9, 3],
  [9, 4],
];

export function demoIndex(speciesId: string): number {
  return Math.max(
    0,
    PLANT_BATTLE.findIndex((p) => p.id === speciesId),
  );
}

/** 시연용 전투 데이터: 해당 종 + 도우미(가시 사수) */
export function demoData(speciesId: string): BattleSceneData {
  const spec = PLANT_BATTLE.find((p) => p.id === speciesId) ?? PLANT_BATTLE[0];
  const water = spec.flags?.includes('WATER_ONLY') ?? false;
  return {
    stageId: water ? '1-5' : '1-1',
    difficulty: 'WALK',
    deck: [
      defaultLoad(spec.id, { stage: 5, stars: 3, level: 10 }),
      defaultLoad('P011', { stage: 5 }),
    ],
    practice: true,
    seed: `demo-${spec.id}`,
    demo: spec.id,
    returnTo: 'Title',
  };
}

export function setupDemo(s: BattleScene): void {
  const sim = s.sim;
  const spec = PLANT_BATTLE.find((p) => p.id === s.data0.demo)!;
  const water = spec.flags?.includes('WATER_ONLY') ?? false;
  const spots = water ? WATER : spec.arch === 'WALL' ? PATH : LAND;
  sim.nutrient = 99999;
  let at: [number, number] | null = null;
  for (const [x, y] of spots) {
    if (sim.place(0, x, y).ok) {
      at = [x, y];
      break;
    }
  }
  const tw = sim.towers[0];
  if (at && tw && (spec.arch === 'AURA' || spec.arch === 'PRODUCE'))
    sim.place(1, at[0] + 1, at[1] + (at[1] > 6 ? -1 : 1));
  if (tw) {
    s.selectTower(tw.id);
    tw.gauge = 0.6;
  }
  s.skipBanner = true;
  sim.countdown = Infinity; // 실제 웨이브는 시작하지 않는다

  const idx = demoIndex(spec.id);
  const n = PLANT_BATTLE.length;
  const go = (d: number): void => {
    const next = PLANT_BATTLE[(idx + d + n) % n].id;
    s.scene.restart(demoData(next));
  };
  const bar = s.add.container(0, 0).setDepth(130);
  bar.add(new Button(s, 150, 40, { w: 28, h: 16, label: '◀', size: 9, onClick: () => go(-1) }));
  bar.add(new Button(s, 490, 40, { w: 28, h: 16, label: '▶', size: 9, onClick: () => go(1) }));
  bar.add(
    new Button(s, 442, 40, {
      w: 56,
      h: 16,
      label: t('battle.bloomFire'),
      size: 9,
      variant: 'primary',
      onClick: () => {
        const t0 = sim.towers[0];
        if (t0) {
          t0.gauge = 1;
          sim.fireBloom(t0.id);
        }
      },
    }),
  );
  bar.add(
    pixelText(
      s,
      320,
      32,
      `${spec.id} ${plantSpeciesName(spec.id)} · ${t(`arch.${spec.arch}`)}  (${idx + 1}/${n})`,
      { size: 9, bold: true, anchorX: 0.5, color: SPECIAL.PAPER },
    ),
  );
  bar.add(
    pixelText(s, 320, 46, t(`arch.${spec.arch}.desc`), {
      size: 7,
      anchorX: 0.5,
      color: RAMPS.R9[4],
    }),
  );
  const kb = s.input.keyboard;
  if (kb) {
    const l = (): void => go(-1);
    const r = (): void => go(1);
    kb.on('keydown-LEFT', l);
    kb.on('keydown-RIGHT', r);
    s.events.once('shutdown', () => {
      kb.off('keydown-LEFT', l);
      kb.off('keydown-RIGHT', r);
    });
  }
}

/** 90틱(1.5초)마다 적을 세 마리씩 흘려 보낸다. 개화기도 주기적으로 채운다 */
export function tickDemo(s: BattleScene): void {
  const sim = s.sim;
  const spec = PLANT_BATTLE.find((p) => p.id === s.data0.demo)!;
  const water = spec.flags?.includes('WATER_ONLY') ?? false;
  const onPath = spec.arch === 'WALL';
  const i = sim.tick;
  if (i % 90 === 0) {
    for (let k = 0; k < 3; k++) {
      sim.spawnEnemy(k === 2 && i % 270 === 0 ? 'E02' : 'E01', 0, 1, {
        s: water ? 15 + k * 0.5 : onPath ? 11 + k * 0.1 : 8.5 + k * 0.4,
      });
    }
  }
  const tw = sim.towers[0];
  if (tw && i % 900 === 600) tw.gauge = 1;
  if (sim.hearts < sim.maxHearts) sim.hearts = sim.maxHearts;
}
