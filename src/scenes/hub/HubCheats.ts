// 디버그 치트 패널(?debug=1 에서 허브 C 키): 시간 가속 · 레벨 · 물건 · 성장 점수. 플레이어에게는 보이지 않는다.
// 화면의 글자는 개발자용이라 영어로 쓴다(i18n 대상 아님, 12문서 12절).

import { OffsetClock } from '../../core/Clock';
import { BONES, NUTRIENTS, SNACKS, STARTER_SEEDS } from '../../data/items';
import { PLANT_BASE_BY_ID } from '../../data/plants';
import { addItem, seedKey } from '../../systems/economy/Inventory';
import { addGp, thresholdGp } from '../../systems/garden/Growth';
import type { ModalDef } from '../../ui/Modal';
import { pagedList } from '../../ui/panels/Lists';
import type { HubScene } from '../HubScene';
import { getApp } from '../context';
import { overlay } from '../UIOverlay';

export function cheatModal(s: HubScene): ModalDef {
  const app = getApp(s);
  const { services } = app;
  const state = services.state!;
  const done = (msg: string) => {
    overlay(s).toast(msg);
    s.refreshAfterUnlock();
  };
  const skip = (ms: number, label: string) => () => {
    if (services.clock instanceof OffsetClock) {
      services.clock.skip(ms);
      done(`time +${label}`);
    } else done('clock is not skippable');
  };
  const rows = [
    { label: 'Time +1 hour', onClick: skip(3_600_000, '1h') },
    { label: 'Time +12 hours', onClick: skip(12 * 3_600_000, '12h') },
    {
      label: 'Gardener Lv +1',
      onClick: () => {
        state.player.level += 1;
        done(`Lv ${state.player.level}`);
      },
    },
    {
      label: 'Gardener Lv 10',
      onClick: () => {
        state.player.level = Math.max(10, state.player.level);
        done('Lv 10');
      },
    },
    {
      label: 'Give care items',
      onClick: () => {
        for (const id of [...Object.keys(NUTRIENTS), ...Object.keys(BONES), ...SNACKS, 'COMPOST'])
          addItem(state, id, 5);
        for (const size of [2, 3]) addItem(state, `pot:CLAY:${size}`, 5);
        done('items +5');
      },
    },
    {
      label: 'Give starter seeds',
      onClick: () => {
        for (const id of STARTER_SEEDS) addItem(state, seedKey(id), 1);
        done('seeds +1');
      },
    },
    {
      label: 'All plants to next stage',
      onClick: () => {
        const now = s.session.now();
        for (const p of state.plants) {
          const base = PLANT_BASE_BY_ID.get(p.speciesId);
          if (!base || p.stage >= 5) continue;
          addGp(p, base, thresholdGp(base, p.stage + 1) - p.gp + 0.1, now, services.bus);
        }
        done('stage +1');
      },
    },
    {
      label: 'Needs to 100',
      onClick: () => {
        for (const p of state.plants)
          p.needs = { water: 100, nutrition: 100, hygiene: 100, mood: 100 };
        done('needs 100');
      },
    },
    {
      label: 'Add +100 coin / +10 dew',
      onClick: () => {
        state.player.coin += 100;
        state.player.dew += 10;
        done('currency +');
      },
    },
  ];
  return {
    title: 'Cheats (debug)',
    width: 260,
    build: pagedList(rows, 5),
    buttons: [{ label: 'Close' }],
  };
}
