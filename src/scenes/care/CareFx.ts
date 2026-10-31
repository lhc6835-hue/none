// 돌보기 반응 효과(표정 · 몸짓 · 입자 · 문제 표시). 모든 돌봄은 같은 프레임 안에 표정 · 몸짓 · 소리로 답한다.

import Phaser from 'phaser';
import { RAMPS, SPECIAL, toInt } from '../../art/palette';
import { t } from '../../i18n';
import type { CareResult, Reaction } from '../../systems/garden/Care';
import { iconTexture } from '../../ui/IconTex';
import { moodExpression } from '../../ui/PlantMood';
import { pixelText } from '../../ui/PixelText';
import { type Pt } from './Tools';
import type { CareScene } from '../CareScene';
import { PX, PY, REACTION_EXPR } from './CareConfig';

export function puff(
  s: CareScene,
  x: number,
  y: number,
  kind: 'water' | 'mist' | 'powder' | 'soil' | 'scrub' | 'heart',
): void {
  const color = {
    water: RAMPS.R4[3],
    mist: RAMPS.R4[4],
    powder: SPECIAL.PAPER,
    soil: RAMPS.R10[3],
    scrub: RAMPS.R3[4],
    heart: RAMPS.R6[3],
  }[kind];
  const n = kind === 'heart' ? 1 : 3;
  for (let i = 0; i < n; i++) {
    const img =
      kind === 'heart'
        ? s.add.image(x, y, iconTexture(s, 'heart'))
        : s.add.rectangle(x + Phaser.Math.Between(-4, 4), y, 2, 2, toInt(color));
    img.setDepth(72);
    const dy = kind === 'water' ? 26 : kind === 'heart' ? -18 : -8 - Phaser.Math.Between(0, 6);
    s.tweens.add({
      targets: img,
      y: y + dy,
      x: img.x + Phaser.Math.Between(-5, 5),
      duration: kind === 'heart' ? 700 : 340,
      ease: kind === 'water' ? 'Quad.easeIn' : 'Cubic.easeOut',
      onComplete: () => img.destroy(),
    });
  }
}

export function answer(s: CareScene, symbol: string): void {
  s.bubble?.destroy();
  const b = s.body;
  const img = s.add.image(0, 0, 'hub:bubble').setOrigin(0.5, 1);
  const txt = pixelText(s, 0, -9, symbol, { size: 11, anchorX: 0.5, anchorY: 0.5 });
  s.bubble = s.add.container(Math.round(b.right + 8), Math.round(b.y + 4), [img, txt]).setDepth(70);
  s.bubble.setScale(1);
  s.tweens.add({
    targets: s.bubble,
    y: s.bubble.y - 4,
    duration: 220,
    ease: 'Back.easeOut',
  });
  s.time.delayedCall(1300, () => s.bubble?.destroy());
}

export function perform(s: CareScene, r: CareResult, at?: Pt): void {
  if (r.sfx) s.sfx(r.sfx);
  const expr = REACTION_EXPR[r.reaction];
  if (expr) {
    s.view.setExpression(expr);
    s.exprUntil = s.time.now + 1300;
  }
  bodyReact(s, r.reaction);
  if (r.perfect) {
    s.floatText(t('care.perfect'), RAMPS.R9[4], at);
    for (let i = 0; i < 6; i++) s.puffSparkle();
  } else if (!r.ok && r.reason) {
    s.hint(t(`care.fail.${r.reason}`));
  }
  const aff = r.info?.affection;
  if (typeof aff === 'number' && aff > 0) s.floatText(`♡+${aff}`, RAMPS.R6[3], at, 16);
  s.refreshAll();
}

export function bodyReact(s: CareScene, reaction: Reaction): void {
  const v = s.view;
  if (reaction === 'none') return;
  s.tweens.killTweensOf(v);
  v.setPosition(0, -11);
  const base = { y: -11 };
  switch (reaction) {
    case 'happy':
    case 'excited':
      s.tweens.add({
        targets: v,
        y: base.y - (reaction === 'excited' ? 5 : 3),
        duration: 110,
        yoyo: true,
        repeat: reaction === 'excited' ? 1 : 0,
        ease: 'Quad.easeOut',
        onComplete: () => v.setPosition(0, -11),
      });
      break;
    case 'gulp':
    case 'surprise':
      s.tweens.add({
        targets: v,
        scaleY: 1.1,
        duration: 90,
        yoyo: true,
        onComplete: () => v.setScale(1),
      });
      break;
    case 'ticklish':
    case 'pain':
    case 'shy':
      s.tweens.add({
        targets: v,
        x: { from: reaction === 'pain' ? -2 : -1, to: 0 },
        duration: 140,
        ease: 'Bounce.easeOut',
      });
      break;
    case 'sulk':
      s.tweens.add({ targets: v, y: -10, duration: 200, yoyo: true });
      break;
  }
}

export function puffSparkle(s: CareScene): void {
  const b = s.body;
  const star = s.add
    .image(
      b.x + Phaser.Math.Between(0, b.width),
      b.y + Phaser.Math.Between(0, b.height),
      'hub:sparkle',
    )
    .setDepth(72);
  s.tweens.add({
    targets: star,
    y: star.y - 16,
    duration: 600,
    ease: 'Cubic.easeOut',
    onComplete: () => star.destroy(),
  });
}

export function floatText(s: CareScene, text: string, color: string, at?: Pt, dy = 0): void {
  const b = s.body;
  const x = at?.x ?? b.centerX;
  const y = (at?.y ?? b.y) - 12 - dy;
  const label = pixelText(s, x, y, text, { size: 11, bold: true, anchorX: 0.5, color });
  label.setDepth(73);
  const shadow = pixelText(s, x + 1, y + 1, text, {
    size: 11,
    bold: true,
    anchorX: 0.5,
    color: SPECIAL.INK,
  });
  shadow.setDepth(72);
  s.tweens.add({
    targets: [label, shadow],
    y: `-=${14}`,
    duration: 700,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      label.destroy();
      shadow.destroy();
    },
  });
}

export function restoreExpression(s: CareScene): void {
  const env = s.session.envOf(s.plant);
  const { expression, sleeping } = moodExpression(s.plant, s.base, env);
  s.view.setExpression(expression);
  s.view.hold(sleeping ? 'sleep' : null);
}

/** 문제 표시(곰팡이 점 · 시든 잎 · 뿌리 삐져나옴 · 쓰러짐) */
export function syncProblems(s: CareScene): void {
  const p = s.plant;
  const sig =
    p.problems.map((q) => `${q.kind}:${q.x ?? ''}:${q.y ?? ''}:${q.n ?? ''}`).join('|') +
    `|${s.toolId}|${p.flags.staked}`;
  if (sig === s.problemSig) return;
  s.problemSig = sig;
  s.problemLayer.removeAll(true);
  const hasKind = (k: string) => p.problems.some((q) => q.kind === k);
  for (const pr of p.problems) {
    const pos = s.problemPos(pr);
    if (pr.kind === 'MOLD') {
      s.problemLayer.add(s.add.image(pos.x, pos.y, iconTexture(s, 'mold')));
    } else if (pr.kind === 'WITHER') {
      const leaf = s.add.image(pos.x, pos.y, iconTexture(s, 'wither'));
      s.problemLayer.add(leaf);
      s.tweens.add({
        targets: leaf,
        angle: { from: -6, to: 6 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (pr.kind === 'PEST' && s.toolId !== 'pest') {
      const n = Math.min(pr.n ?? 3, 8);
      for (let i = 0; i < n; i++) {
        const bug = s.add.image(
          s.body.x + 6 + ((i * 17) % Math.max(10, s.body.width - 12)),
          s.body.y + 10 + ((i * 23) % Math.max(10, s.body.height - 14)),
          iconTexture(s, 'bug'),
        );
        s.problemLayer.add(bug);
        s.tweens.add({
          targets: bug,
          x: bug.x + 4,
          duration: 500 + i * 60,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }
  if (hasKind('ROOTBOUND'))
    s.problemLayer.add(s.add.image(PX, PY + 8, iconTexture(s, 'roots')).setScale(2));
  s.view.setAngle(hasKind('TOPPLED') ? -12 : 0);
  if (s.base.care.needsStake && p.flags.staked) {
    const g = s.add.graphics();
    g.fillStyle(toInt(RAMPS.R9[3]), 1).fillRect(
      PX + 6,
      s.body.y + 6,
      3,
      s.body.bottom - s.body.y - 6,
    );
    s.problemLayer.add(g);
  }
}
