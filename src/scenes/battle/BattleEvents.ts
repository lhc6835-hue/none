// 시뮬레이션 이벤트 → 화면 반응. 전투에서 일어나는 모든 일은 같은 프레임에 모양 · 소리로 답한다(10문서 3절).

import { rampColor } from '../../art/BattleFx';
import { RAMPS, SPECIAL } from '../../art/palette';
import type { SfxId } from '../../data/sfx';
import { familyOf } from '../../systems/battle/Towers';
import { hasKey, t } from '../../i18n';
import { plantSpeciesName } from '../../i18n/names';
import type { BattleScene } from './BattleScene';
import { px, py } from './FxLayer';

const FAMILY_SHOT: Record<string, SfxId> = {
  VINE: 'shoot_vine',
  THORN: 'shoot_thorn',
  FUNGUS: 'shoot_fungus',
  BLOOM: 'shoot_bloom',
  FRUIT: 'shoot_fruit',
  EMBER: 'shoot_ember',
  FROST: 'shoot_frost',
  LUMEN: 'shoot_lumen',
  STORM: 'shoot_storm',
  SPIRIT: 'shoot_spirit',
};

const HIT_SOFT_MS = 90;

/** 한 프레임 동안 쌓인 이벤트를 모두 처리한다 */
export function drainEvents(s: BattleScene, time: number): void {
  const sim = s.sim;
  const evs = sim.events;
  if (evs.length === 0) return;
  sim.events = [];
  const fx = s.fx;
  let shotSounds = 0;
  let hitSounds = 0;
  for (const ev of evs) {
    switch (ev.t) {
      case 'shot': {
        const x1 = px(ev.from.x);
        const y1 = py(ev.from.y) - 8;
        const x2 = px(ev.to.x);
        const y2 = py(ev.to.y) - 4;
        const tower = sim.towerById(ev.tower);
        if (ev.kind === 'instant' || ev.kind === 'chain' || ev.kind === 'melee')
          fx.shotLine(x1, y1, x2, y2, ev.fx, ev.kind);
        else if (ev.kind === 'roll') fx.hit(x1, y1, ev.fx);
        else fx.hit(x1, y1 - 2, { ...ev.fx, hit: 'puff' });
        if (tower) {
          s.view.setExpr(tower.id, 'battle', 180, time);
          s.view.lookTo(tower.id, x2, y2);
        }
        if (shotSounds++ < 3) {
          const fam = tower ? familyOf(tower.spec.id) : 'VINE';
          fx.sfx(ev.kind === 'melee' ? 'melee_hit' : (FAMILY_SHOT[fam] ?? 'shoot'));
        }
        break;
      }
      case 'hit': {
        const e = sim.enemyByUid(ev.enemy);
        s.view.hitFlash(ev.enemy, time);
        fx.hit(px(ev.x), py(ev.y) - 4, ev.fx, ev.crit);
        if (ev.crit) s.floatText(px(ev.x), py(ev.y) - 14, String(Math.round(ev.amount)), true);
        else if (ev.amount >= 20)
          s.floatText(px(ev.x), py(ev.y) - 12, String(Math.round(ev.amount)));
        if (e?.boss && hitSounds++ < 1) fx.sfx('hit_big');
        else if (hitSounds++ < 2 && time - s.lastHitSfx > HIT_SOFT_MS) {
          s.lastHitSfx = time;
          fx.sfx('hit_soft');
        }
        break;
      }
      case 'status': {
        const e = sim.enemyByUid(ev.enemy);
        if (e) fx.sparkles(px(e.x), py(e.y) - 6, RAMPS.R9[3], 3);
        break;
      }
      case 'kill': {
        fx.death(px(ev.x), py(ev.y) - 4, ev.boss);
        s.floatText(px(ev.x), py(ev.y) - 16, `+${ev.reward}`, false, RAMPS.R1[4]);
        fx.sfx(ev.boss ? 'boss_roar' : 'kill_ash');
        if (ev.boss) s.shake(5, 360);
        break;
      }
      case 'leak': {
        fx.sfx('leak');
        s.shake(3, 220);
        s.heartPunch();
        for (const tw of sim.towers) s.view.setExpr(tw.id, 'sulk', 600, time);
        break;
      }
      case 'bloom': {
        const tw = sim.towerById(ev.tower);
        if (!tw) break;
        const x = px(tw.tx) + 12;
        const y = py(tw.ty) + 8;
        fx.ring(x, y, 34, rampColor(tw.spec.fx.color), 0.5);
        fx.ring(x, y, 20, SPECIAL.PAPER, 0.35);
        fx.sparkles(x, y, rampColor(tw.spec.fx.color), 14);
        fx.sfx('bloom_cast');
        s.view.setExpr(tw.id, 'excited', 1400, time);
        s.bloomBanner(
          plantSpeciesName(tw.spec.id),
          t(hasKey(ev.name) ? ev.name : 'bloom.common'),
          rampColor(tw.spec.fx.color),
        );
        break;
      }
      case 'ring': {
        const col = rampColor(ev.fx.color);
        fx.ring(px(ev.x), py(ev.y), Math.max(8, ev.r * 24), col, ev.kind === 'bloom' ? 0.6 : 0.4);
        if (ev.kind === 'impact') fx.hit(px(ev.x), py(ev.y), ev.fx, true);
        if (ev.kind === 'time') s.shake(2, 200);
        break;
      }
      case 'place': {
        fx.sfx('plant_place');
        break;
      }
      case 'remove': {
        fx.sfx('sell');
        break;
      }
      case 'upgrade': {
        const tw = sim.towerById(ev.tower);
        fx.sfx('upgrade');
        if (tw) {
          fx.sparkles(px(tw.tx) + 12, py(tw.ty) + 6, RAMPS.R9[4], 10);
          fx.ring(px(tw.tx) + 12, py(tw.ty) + 12, 18, RAMPS.R9[4], 0.35);
          s.view.setExpr(tw.id, 'happy', 700, time);
        }
        break;
      }
      case 'wave': {
        fx.sfx('wave_start');
        s.waveBanner(t('battle.wave', { n: ev.wave, total: ev.total }));
        break;
      }
      case 'waveClear': {
        fx.sfx('wave_clear');
        if (ev.bonus > 0) s.toast(t('battle.waveClear', { n: ev.bonus }));
        break;
      }
      case 'spawn': {
        const e = sim.enemyByUid(ev.enemy);
        if (e?.boss) {
          fx.sfx('boss_roar');
          s.bossBanner(t(e.def.nameKey));
          s.shake(4, 500);
        }
        break;
      }
      case 'toast':
        s.toast(t(ev.key, ev.params));
        break;
      case 'down': {
        const tw = sim.towerById(ev.tower);
        if (tw) fx.sparkles(px(tw.tx) + 12, py(tw.ty) + 6, RAMPS.R12[3], 8);
        fx.sfx('ui_error');
        break;
      }
      case 'up':
        fx.sfx('heart');
        break;
      case 'synergy': {
        fx.sfx('synergy');
        s.toast(t('battle.synergy', { family: t(`family.${ev.family}`), n: ev.tier }));
        for (const tw of sim.towers) {
          if (familyOf(tw.spec.id) === ev.family) {
            fx.sparkles(px(tw.tx) + 12, py(tw.ty) + 4, RAMPS.R9[4], 5);
            s.view.setExpr(tw.id, 'happy', 700, time);
          }
        }
        break;
      }
      case 'heart':
        s.heartPunch();
        break;
      case 'tool': {
        fx.sfx('tool_use');
        fx.ring(px(ev.x), py(ev.y), 26, ev.id === 'SHOWER' ? RAMPS.R3[3] : RAMPS.R9[3], 0.4);
        fx.sparkles(px(ev.x), py(ev.y), ev.id === 'SHOWER' ? RAMPS.R3[3] : RAMPS.R9[3], 8);
        break;
      }
      case 'end':
        break;
    }
  }
}
