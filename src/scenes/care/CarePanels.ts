// 돌보기 화면의 패널: 상단 막대 · 욕구 게이지 · 도구 막대 · 추천 배지.

import Phaser from 'phaser';
import { RAMPS, SPECIAL, toInt } from '../../art/palette';
import { CARE_UNLOCK } from '../../data/care';
import { GRADES } from '../../data/grades';
import { ZONES } from '../../data/zones';
import { t } from '../../i18n';
import { plantDisplayName } from '../../i18n/names';
import { affectionLevel } from '../../systems/garden/Affection';
import { needsRepot, stageProgress } from '../../systems/garden/Growth';
import {
  battleConditionTier,
  conditionOf,
  derivedStatuses,
  waterRangeOf,
} from '../../systems/garden/Needs';
import { Button } from '../../ui/Button';
import { ensurePanel } from '../../ui/Frames';
import { Gauge } from '../../ui/Gauge';
import { iconTexture } from '../../ui/IconTex';
import { pixelText } from '../../ui/PixelText';
import { type ToolId } from './Tools';
import type { CareScene } from '../CareScene';
import { TOOLS } from './CareConfig';

export function buildPanels(s: CareScene): void {
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    s.ui.push(o);
    return o;
  };
  // 상단 막대
  add(
    s.add
      .image(0, 0, ensurePanel(s, 'wood', 640, 34))
      .setOrigin(0, 0)
      .setDepth(60),
  );
  add(
    new Button(s, 44, 17, {
      w: 76,
      h: 20,
      label: t('care.back'),
      size: 9,
      icon: iconTexture(s, 'arrowL'),
      onClick: () => s.leave(),
    }).setDepth(61),
  );
  s.nameText = add(pixelText(s, 92, 5, '', { size: 11, bold: true }).setDepth(61));
  s.metaText = add(pixelText(s, 92, 19, '', { size: 9, color: RAMPS.R10[1] }).setDepth(61));
  s.growth = new Gauge(s, 330, 12, 190, 'growth', 0, false).setDepth(61);
  s.ui.push(s.growth);
  s.growthText = add(pixelText(s, 330, 21, '', { size: 9, color: RAMPS.R10[1] }).setDepth(61));
  add(
    new Button(s, 596, 17, {
      w: 56,
      h: 20,
      label: t('care.info'),
      size: 9,
      onClick: () => s.openInfo(),
    }).setDepth(61),
  );

  // 왼쪽 욕구 게이지 4종
  const rows: Array<['water' | 'nutrition' | 'hygiene' | 'mood', string]> = [
    ['water', 'drop'],
    ['nutrition', 'leaf'],
    ['hygiene', 'mold'],
    ['mood', 'heart'],
  ];
  s.gauges = {} as typeof s.gauges;
  s.add
    .image(8, 42, ensurePanel(s, 'wood', 160, 148))
    .setOrigin(0, 0)
    .setDepth(50);
  rows.forEach(([key, icon], i) => {
    const y = 52 + i * 30;
    s.add.image(16, y, iconTexture(s, icon)).setOrigin(0, 0).setDepth(51);
    pixelText(s, 32, y + 1, t(`need.${key}`), { size: 9, color: SPECIAL.INK }).setDepth(51);
    const g = new Gauge(s, 32, y + 14, 100, key, s.plant.needs[key]).setDepth(51);
    s.gauges[key] = g;
  });
  s.bandGfx = s.add.graphics().setDepth(52);
  s.condText = pixelText(s, 16, 172, '', { size: 9, color: SPECIAL.INK }).setDepth(51);
  s.hintText = pixelText(s, 320, 277, '', {
    size: 11,
    anchorX: 0.5,
    color: SPECIAL.PAPER,
  }).setDepth(40);
}

export function drawBand(s: CareScene, preview: number | null = null): void {
  const g = s.bandGfx;
  g.clear();
  if (s.base.care.aquatic) return;
  const [lo, hi] = waterRangeOf(s.base);
  const x0 = 33;
  const w = 98;
  const y = 52 + 14;
  // 적정 구간 목표선(04문서 3절): 게이지 위아래로 튀어나온 두 눈금
  for (const v of [lo, hi]) {
    const x = Math.round(x0 + (w * v) / 100);
    g.fillStyle(toInt(RAMPS.R9[4]), 1).fillRect(x, y - 2, 1, 11);
    g.fillStyle(toInt(SPECIAL.INK), 1)
      .fillRect(x - 1, y - 2, 1, 1)
      .fillRect(x + 1, y - 2, 1, 1);
  }
  if (preview !== null) {
    const inRange = preview >= lo && preview <= hi;
    const x = Math.round(x0 + (w * Math.min(100, preview)) / 100);
    g.fillStyle(
      toInt(inRange ? RAMPS.R1[4] : preview > 100 ? RAMPS.R7[3] : SPECIAL.PAPER),
      1,
    ).fillRect(x, y - 4, 1, 15);
  }
}

export function buildToolbar(s: CareScene): void {
  for (const b of s.toolButtons.values()) b.destroy();
  for (const b of s.badges.values()) b.destroy();
  s.toolButtons.clear();
  s.badges.clear();
  const bw = 38;
  const gap = 3;
  const total = TOOLS.length * bw + (TOOLS.length - 1) * gap;
  TOOLS.forEach((def, i) => {
    const unlocked = s.state.player.level >= CARE_UNLOCK[def.action];
    const x = 320 - total / 2 + bw / 2 + i * (bw + gap);
    const b = new Button(s, x, 337, {
      w: bw,
      h: 22,
      label: '',
      icon: iconTexture(s, def.icon),
      disabled: !unlocked,
      onClick: () => s.selectTool(def.id),
    });
    b.setDepth(62);
    s.tooltip.attach(
      b,
      () =>
        unlocked
          ? t(`care.tool.${def.id}`)
          : t('care.toolLocked', {
              name: t(`care.tool.${def.id}`),
              level: CARE_UNLOCK[def.action],
            }),
      () => ({ x, y: 322 }),
    );
    s.toolButtons.set(def.id, b);
  });
  updateBadges(s);
  highlightTool(s);
}

export function highlightTool(s: CareScene): void {
  for (const [id, b] of s.toolButtons) {
    b.setY(id === s.toolId ? 335 : 337);
  }
}

/** 지금 필요한 도구에 '!' (점박이의 추천) */

/** 지금 필요한 도구에 '!' (점박이의 추천) */
export function updateBadges(s: CareScene): void {
  const p = s.plant;
  const need = new Set<ToolId>();
  const env = s.session.envOf(p);
  const st = derivedStatuses(p, s.base, env);
  const has = (k: string) => p.problems.some((q) => q.kind === k);
  if (st.includes('THIRSTY')) need.add('water');
  if (st.includes('HUNGRY')) need.add('nutrient');
  if (has('MOLD')) need.add('scrub');
  if (has('PEST')) need.add('pest');
  if (has('WITHER')) need.add('prune');
  if (has('ROOTBOUND') || needsRepot(p)) need.add('repot');
  if (has('TOPPLED') || (s.base.care.needsStake && !p.flags.staked && p.stage >= 3))
    need.add('stake');
  if (st.includes('SULKY')) need.add('hand');
  if (p.stage >= 5) need.add('hand');
  for (const b of s.badges.values()) b.destroy();
  s.badges.clear();
  for (const id of need) {
    const btn = s.toolButtons.get(id);
    if (!btn || btn.isDisabled) continue;
    const badge = s.add.image(btn.x + 14, btn.y - 12, 'hub:badge').setDepth(64);
    s.tweens.add({
      targets: badge,
      y: badge.y - 2,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    s.badges.set(id, badge);
  }
}

export function refreshAll(s: CareScene, animate = true): void {
  const p = s.plant;
  const env = s.session.envOf(p);
  for (const k of ['water', 'nutrition', 'hygiene', 'mood'] as const) {
    s.gauges[k].setValue(p.needs[k], animate);
  }
  s.drawBand(null);
  s.nameText.setText(plantDisplayName(p));
  const lv = affectionLevel(p.affection);
  const stars = p.quality ? '★'.repeat(p.quality) : '★?';
  s.metaText.setText(
    `♡${lv}  ${stars}  ${t(GRADES[s.base.grade].nameKey)} · ${t(ZONES[p.location.zone].nameKey)}`,
  );
  s.growth.setValue(p.stage >= 5 ? 100 : stageProgress(s.base, p) * 100, animate);
  s.growthText.setText(
    p.stage >= 5 ? t('care.bloomed') : `${t(`stage.${p.stage}`)} → ${t(`stage.${p.stage + 1}`)}`,
  );
  const cond = conditionOf(p, s.base, env).value;
  const tier = battleConditionTier(cond);
  s.condText.setText(
    t('care.condition', { value: cond.toFixed(2), tier: t(`condition.${tier.key}`) }),
  );
  updateBadges(s);
  s.syncProblems();
}

/** 문제 표시(곰팡이 점 · 시든 잎 · 뿌리 삐져나옴 · 쓰러짐) */
