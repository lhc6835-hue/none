// 전투 HUD (06문서 1절): 상단(하트 · 양분 · 웨이브 · 지금 부르기 · 배속) / 하단(카드 · 도구 · 시너지) / 식물 정보 패널 / 보스 체력바

import Phaser from 'phaser';
import { PixelCanvas } from '../../art/PixelCanvas';
import { RAMPS, SPECIAL, toInt } from '../../art/palette';
import { GRADES } from '../../data/grades';
import { PLANT_BASE_BY_ID } from '../../data/plants';
import { t } from '../../i18n';
import { plantSpeciesName } from '../../i18n/names';
import type { BattleSim } from '../../systems/battle/BattleSim';
import { GARDEN_TOOLS } from '../../systems/battle/GardenTools';
import { upgradeCost, sellValue, familyOf } from '../../systems/battle/Towers';
import { PLANT_BATTLE_BY_ID } from '../../data/battle/plants';
import { Button } from '../../ui/Button';
import { ensurePanel } from '../../ui/Frames';
import { iconTexture, markTexture } from '../../ui/IconTex';
import { numberText } from '../../ui/NumberFont';
import { pixelText } from '../../ui/PixelText';
import { getApp } from '../context';
import { RollingNumber } from '../hub/HubHud';

export interface BattleHudHandlers {
  onCard: (index: number) => void;
  onTool: (slot: number) => void;
  onCallWave: () => void;
  onPause: () => void;
  onSpeed: () => void;
  onMenu: () => void;
  onUpgrade: (id: number, branch?: 'A' | 'B') => void;
  onSell: (id: number) => void;
  onTarget: (id: number) => void;
  onBloomMode: (id: number) => void;
  onBloomFire: (id: number) => void;
}

const D = 60;
const DIM = 'battle:dim';

/** 쓸 수 없는 카드 · 쿨다운 도구를 덮는 회색 점무늬(알파 없이 팔레트 색만) */
function ensureDim(scene: Phaser.Scene): string {
  if (scene.textures.exists(DIM)) return DIM;
  const c = new PixelCanvas(44, 44);
  for (let y = 0; y < 44; y++)
    for (let x = 0; x < 44; x++) if ((x + y) % 2 === 0) c.px(x, y, RAMPS.R12[2]);
  return c.toTexture(scene, DIM);
}
const TOOL_ICON: Record<string, string> = {
  SHOWER: 'drop',
  SHOVEL: 'hand',
  FERTILIZER: 'compost',
  LADYBUG: 'bug',
  SCARECROW: 'stake',
};

export class BattleHud {
  private nutrient: RollingNumber;
  private heartsNum: Phaser.GameObjects.Container | undefined;
  private heartIcon: Phaser.GameObjects.Image;
  private lastHearts = -1;
  private waveText: Phaser.GameObjects.Text;
  private countText: Phaser.GameObjects.Text;
  private callBtn: Button;
  private speedBtn: Button;
  private pauseBtn: Button;
  private cards: {
    box: Phaser.GameObjects.Container;
    cost: number;
    dim: Phaser.GameObjects.Image;
    costNum: Phaser.GameObjects.Container | null;
  }[] = [];
  private toolBoxes: {
    box: Phaser.GameObjects.Container;
    cd: Phaser.GameObjects.Text;
    veil: Phaser.GameObjects.Image;
  }[] = [];
  private bossGfx: Phaser.GameObjects.Graphics;
  private synText: Phaser.GameObjects.Text;
  private panel: Phaser.GameObjects.Container | undefined;
  private panelId: number | null = null;
  private panelSig = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: BattleSim,
    private readonly h: BattleHudHandlers,
  ) {
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      (o as unknown as { setDepth(n: number): void }).setDepth(D);
      return o;
    };
    add(scene.add.image(0, 0, ensurePanel(scene, 'wood', 640, 24)).setOrigin(0, 0));
    add(scene.add.image(0, 312, ensurePanel(scene, 'wood', 640, 48)).setOrigin(0, 0));
    this.heartIcon = add(scene.add.image(8, 6, iconTexture(scene, 'heart')).setOrigin(0, 0));
    add(scene.add.image(60, 6, iconTexture(scene, 'leaf')).setOrigin(0, 0));
    this.nutrient = add(new RollingNumber(scene, 74, 8, Math.floor(sim.nutrient)));
    this.waveText = add(pixelText(scene, 126, 6, '', { size: 9, bold: true }));
    this.countText = add(pixelText(scene, 214, 7, '', { size: 9, color: RAMPS.R10[1] }));
    this.callBtn = add(
      new Button(scene, 316, 12, {
        w: 72,
        h: 16,
        label: t('battle.start'),
        size: 9,
        variant: 'primary',
        onClick: h.onCallWave,
      }),
    );
    this.pauseBtn = add(
      new Button(scene, 540, 12, { w: 24, h: 16, label: 'II', size: 9, onClick: h.onPause }),
    );
    this.speedBtn = add(
      new Button(scene, 574, 12, { w: 32, h: 16, label: '1×', size: 9, onClick: h.onSpeed }),
    );
    add(
      new Button(scene, 612, 12, {
        w: 24,
        h: 16,
        label: '',
        icon: iconTexture(scene, 'gear'),
        onClick: h.onMenu,
      }),
    );
    this.bossGfx = scene.add.graphics().setDepth(D);
    this.synText = add(pixelText(scene, 488, 316, '', { size: 7, color: SPECIAL.INK }));
    this.buildCards();
    this.buildTools();
  }

  private buildCards(): void {
    const sc = this.scene;
    const { atlas } = getApp(sc);
    ensureDim(sc);
    this.sim.deck.forEach((load, i) => {
      const spec = PLANT_BATTLE_BY_ID.get(load.speciesId)!;
      const base = PLANT_BASE_BY_ID.get(load.speciesId)!;
      const g = GRADES[base.grade];
      const x = 8 + i * 47;
      const box = sc.add.container(x + 22, 336).setDepth(D + 1);
      const bg = sc.add.image(0, 0, ensurePanel(sc, 'leaf', 44, 44)).setOrigin(0.5);
      const tex = atlas.plant(load.speciesId, Math.max(3, Math.min(5, load.stage)) as 3, false);
      const img = sc.add.image(0, -2, tex.key, 'idle0').setOrigin(0.5, 0.5);
      const mark = sc.add.image(-17, -17, markTexture(sc, g.mark, g.color));
      const dim = sc.add.image(0, 0, DIM).setVisible(false);
      const costNum = numberText(
        sc,
        0,
        13,
        String(this.sim.placeCost(i)),
        SPECIAL.INK,
        '3x5',
        'left',
      );
      costNum.x = Math.round(-String(this.sim.placeCost(i)).length * 2);
      const key = pixelText(sc, 12, -20, String(i + 1), { size: 7, color: RAMPS.R10[1] });
      box.add([bg, img, mark, costNum, dim, key]);
      box.setSize(44, 44);
      box.setInteractive(new Phaser.Geom.Rectangle(0, 0, 44, 44), Phaser.Geom.Rectangle.Contains);
      box.on('pointerdown', () => this.h.onCard(i));
      this.cards.push({ box, cost: this.sim.placeCost(i), dim, costNum });
      void spec;
    });
  }

  private buildTools(): void {
    const sc = this.scene;
    this.sim.toolIds.forEach((id, slot) => {
      const x = 8 + this.sim.deck.length * 47 + 8 + slot * 42;
      const box = sc.add.container(x + 20, 336).setDepth(D + 1);
      const bg = sc.add.image(0, 0, ensurePanel(sc, 'stone', 40, 44)).setOrigin(0.5);
      const icon = sc.add.image(0, -4, iconTexture(sc, TOOL_ICON[id] ?? 'hand'));
      const label = pixelText(sc, 0, 10, ['Q', 'W'][slot], { size: 7, anchorX: 0.5 });
      const veil = sc.add.image(0, 0, DIM).setVisible(false);
      const cd = pixelText(sc, 0, -6, '', {
        size: 9,
        anchorX: 0.5,
        anchorY: 0.5,
        bold: true,
        color: SPECIAL.PAPER,
      });
      box.add([bg, icon, label, veil, cd]);
      box.setSize(40, 44);
      box.setInteractive(new Phaser.Geom.Rectangle(0, 0, 40, 44), Phaser.Geom.Rectangle.Contains);
      box.on('pointerdown', () => this.h.onTool(slot));
      this.toolBoxes.push({ box, cd, veil });
      void GARDEN_TOOLS;
    });
  }

  /** 카드 선택 표시(1px 들림) */
  setSelected(i: number): void {
    this.cards.forEach((c, k) => c.box.setY(k === i ? 333 : 336));
  }

  /** 하트를 잃을 때: 아이콘이 부풀었다 돌아온다 */
  punchHearts(): void {
    const icon = this.heartIcon;
    this.scene.tweens.killTweensOf(icon);
    icon.setScale(1.5);
    this.scene.tweens.add({ targets: icon, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }

  setSpeed(speed: number, paused: boolean): void {
    this.speedBtn.setLabel(`${speed}×`);
    this.pauseBtn.setLabel(paused ? '▶' : 'II');
  }

  update(): void {
    const sim = this.sim;
    this.nutrient.set(Math.floor(sim.nutrient), false);
    if (sim.hearts !== this.lastHearts) {
      this.lastHearts = sim.hearts;
      this.heartsNum?.destroy();
      this.heartsNum = numberText(
        this.scene,
        22,
        8,
        `${sim.hearts}`,
        sim.hearts <= sim.maxHearts * 0.3 ? RAMPS.R7[3] : SPECIAL.INK,
        '5x7',
      );
      this.heartsNum.setDepth(D);
    }
    this.waveText.setText(t('battle.wave', { n: Math.max(1, sim.wave), total: sim.totalWaves }));
    const secs = sim.secondsToNextWave;
    const canCall = sim.wave < sim.totalWaves && secs > 0;
    this.countText.setText(canCall ? t('battle.nextIn', { s: Math.ceil(secs) }) : '');
    this.callBtn.setLabel(sim.wave === 0 ? t('battle.start') : t('battle.callWave'));
    this.callBtn.setDisabled(!canCall);
    this.cards.forEach((c, i) => {
      const cost = sim.placeCost(i);
      const can = sim.nutrient >= cost;
      c.dim.setVisible(!can);
      if (cost !== c.cost) {
        c.cost = cost;
        c.costNum?.destroy();
        c.costNum = numberText(
          this.scene,
          Math.round(-String(cost).length * 2),
          13,
          String(cost),
          can ? SPECIAL.INK : RAMPS.R7[3],
          '3x5',
        );
        c.box.add(c.costNum);
      }
    });
    this.toolBoxes.forEach((b, slot) => {
      const cd = sim.toolCd[slot];
      b.veil.setVisible(cd > 0);
      b.cd.setText(cd > 0 ? String(Math.ceil(cd / 60)) : '');
    });
    // 보스 체력바(6px)
    const g = this.bossGfx;
    g.clear();
    const boss = sim.enemies.find((e) => e.boss && e.alive);
    if (boss) {
      const w = 360;
      g.fillStyle(toInt(SPECIAL.INK), 1).fillRect(140, 26, w + 4, 8);
      g.fillStyle(toInt(RAMPS.R7[3]), 1).fillRect(
        142,
        28,
        Math.round((w * boss.hp) / boss.maxHp),
        4,
      );
    }
    // 시너지
    const fam = new Map<string, Set<string>>();
    for (const tw of sim.towers) {
      const f = familyOf(tw.spec.id);
      if (!fam.has(f)) fam.set(f, new Set());
      fam.get(f)!.add(tw.spec.id);
    }
    const lines: string[] = [];
    for (const [f, set] of fam) {
      const n = set.size;
      const next = n >= 6 ? 6 : n >= 4 ? 6 : n >= 2 ? 4 : 2;
      lines.push(`${t(`family.${f}`)} ${n}/${next}`);
    }
    this.synText.setText(lines.slice(0, 5).join('\n'));
    this.refreshPanel();
  }

  // ===== 식물 정보 패널 =====
  showTower(id: number | null): void {
    this.panelId = id;
    this.panelSig = '';
    this.refreshPanel(true);
  }

  private refreshPanel(force = false): void {
    const sim = this.sim;
    const tw = this.panelId === null ? null : sim.towerById(this.panelId);
    if (!tw) {
      if (this.panel) {
        this.panel.destroy();
        this.panel = undefined;
      }
      this.panelId = null;
      return;
    }
    const upCost = upgradeCost(tw);
    const sig = `${tw.id}|${tw.level}|${tw.branch}|${tw.target}|${tw.manualBloom}|${Math.floor(tw.gauge * 10)}|${upCost}|${sim.nutrient >= (upCost ?? 0)}|${tw.down > 0}`;
    if (!force && sig === this.panelSig) return;
    this.panelSig = sig;
    this.panel?.destroy();
    const sc = this.scene;
    const w = 252;
    const h = 66;
    const c = sc.add.container(8, 242).setDepth(D + 5);
    this.panel = c;
    c.add(sc.add.image(0, 0, ensurePanel(sc, 'wood', w, h)).setOrigin(0, 0));
    c.add(
      pixelText(
        sc,
        8,
        5,
        `${plantSpeciesName(tw.spec.id)}${tw.load.nickname ? ` (${tw.load.nickname})` : ''}  Lv${tw.load.level} +${tw.level}`,
        { size: 9, bold: true },
      ),
    );
    c.add(
      pixelText(
        sc,
        8,
        17,
        t('battle.statLine', {
          dmg: Math.round(tw.stats.dmg),
          range: tw.stats.range >= 90 ? '∞' : tw.stats.range.toFixed(1),
          arch: t(`arch.${tw.spec.arch}`),
        }),
        { size: 9, color: RAMPS.R10[1] },
      ),
    );
    const btn = (
      x: number,
      y: number,
      bw: number,
      label: string,
      on: () => void,
      disabled = false,
      variant: 'default' | 'primary' = 'default',
    ) =>
      c.add(
        new Button(sc, x + bw / 2, y + 8, {
          w: bw,
          h: 16,
          label,
          size: 9,
          disabled,
          variant,
          onClick: on,
        }),
      );
    if (tw.level < 2) {
      btn(
        6,
        30,
        78,
        upCost === null ? t('battle.maxLevel') : t('battle.upgrade', { cost: upCost }),
        () => this.h.onUpgrade(tw.id),
        upCost === null || sim.nutrient < (upCost ?? 0) || tw.down > 0,
        'primary',
      );
    } else if (tw.level === 2) {
      btn(
        6,
        30,
        38,
        `A ${upCost}`,
        () => this.h.onUpgrade(tw.id, 'A'),
        sim.nutrient < (upCost ?? 0),
        'primary',
      );
      btn(
        46,
        30,
        38,
        `B ${upCost}`,
        () => this.h.onUpgrade(tw.id, 'B'),
        sim.nutrient < (upCost ?? 0),
        'primary',
      );
    } else {
      btn(6, 30, 78, t('battle.maxLevel'), () => undefined, true);
    }
    btn(88, 30, 70, t('battle.sell', { v: sellValue(tw, sim.tick) }), () => this.h.onSell(tw.id));
    btn(162, 30, 84, t(`battle.target.${tw.target}`), () => this.h.onTarget(tw.id));
    btn(6, 48, 78, tw.manualBloom ? t('battle.bloomManual') : t('battle.bloomAuto'), () =>
      this.h.onBloomMode(tw.id),
    );
    btn(
      88,
      48,
      70,
      t('battle.bloomFire'),
      () => this.h.onBloomFire(tw.id),
      tw.gauge < 1 || tw.bloomLeft > 0,
      tw.gauge >= 1 ? 'primary' : 'default',
    );
    c.add(
      pixelText(sc, 164, 50, `${Math.floor(tw.gauge * 100)}%`, { size: 9, color: RAMPS.R6[2] }),
    );
  }

  /** 카드/패널 위에 마우스가 있는가(맵 클릭과 구분) */
  overUi(x: number, y: number): boolean {
    if (y < 24 || y > 312) return true;
    if (this.panel && x >= 8 && x <= 260 && y >= 242 && y <= 308) return true;
    return false;
  }

  destroy(): void {
    this.bossGfx.destroy();
    this.panel?.destroy();
  }
}
