// 전투 화면의 그림: 맵 · 식물 · 적 · 투사체 · 장판 · 소환수 · 광선을 시뮬레이션 상태에서 그린다(상태를 바꾸지 않는다).

import Phaser from 'phaser';
import { enemyTexture } from '../../art/EnemyArt';
import { gridToCanvas } from '../../art/GridCanvas';
import { generateMound } from '../../art/PotSpriteGen';
import { bakeBattleMap, buildEntryArt, buildRootsArt } from '../../art/BattleMapArt';
import { RAMPS, SPECIAL, toInt } from '../../art/palette';
import type { Stage } from '../../art/bodies/Ctx';
import { rampColor } from '../../art/BattleFx';
import type { PlantBattle, StatusKind } from '../../data/battle/types';
import type { BattleSim } from '../../systems/battle/BattleSim';
import { canPlaceOn } from '../../systems/battle/Towers';
import type { Tower } from '../../systems/battle/types';
import type { Expression } from '../../art/FaceRenderer';
import { PlantView } from '../../ui/PlantView';
import { FxLayer, MAP_X, MAP_Y, TILE, px, py } from './FxLayer';

const STATUS_COLOR: Partial<Record<StatusKind, string>> = {
  SLOW: RAMPS.R4[3],
  BIND: RAMPS.R1[3],
  STUN: RAMPS.R9[3],
  CHILL: RAMPS.R4[4],
  FREEZE: SPECIAL.PAPER,
  POISON: RAMPS.R5[3],
  BURN: RAMPS.R7[3],
  WET: RAMPS.R3[3],
  CHARM: RAMPS.R6[3],
  SLEEP: RAMPS.R11[4],
  SHRED: RAMPS.R11[3],
  MARK: RAMPS.R9[4],
};

interface TowerSprite {
  box: Phaser.GameObjects.Container;
  view: PlantView;
  exprUntil: number;
}

export class BattleView {
  private towers = new Map<number, TowerSprite>();
  private enemies = new Map<number, Phaser.GameObjects.Image>();
  private projs = new Map<number, Phaser.GameObjects.Image>();
  private summons = new Map<number, Phaser.GameObjects.Image>();
  private flash = new Map<number, number>();
  private bars: Phaser.GameObjects.Graphics;
  private fieldGfx: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Graphics;
  private trailTick = 0;
  hover: { x: number; y: number } | null = null;
  rangeOf: number | null = null;
  place: PlantBattle | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: BattleSim,
    private readonly fx: FxLayer,
  ) {
    this.bakeMap();
    this.fieldGfx = scene.add.graphics().setDepth(6);
    this.bars = scene.add.graphics().setDepth(30);
    this.overlay = scene.add.graphics().setDepth(31);
  }

  // ===== 맵 =====
  /** 맵 한 장(이웃을 보고 둥글린 길 · 물가 · 소품)과 입구 굴 · 출구 어미나무 뿌리 */
  private bakeMap(): void {
    const sim = this.sim;
    const key = `battle:map:${sim.stage.id}`;
    if (!this.scene.textures.exists(key))
      bakeBattleMap(sim.stage.chapter, sim.map.tiles).toTexture(this.scene, key);
    this.scene.add.image(MAP_X, MAP_Y, key).setOrigin(0, 0).setDepth(1);
    if (!this.scene.textures.exists('battle:roots2'))
      buildRootsArt().toTexture(this.scene, 'battle:roots2');
    if (!this.scene.textures.exists('battle:entry'))
      buildEntryArt().toTexture(this.scene, 'battle:entry');
    const ex = sim.map.exit;
    this.scene.add
      .image(px(ex.x) + 12, py(ex.y) + 22, 'battle:roots2')
      .setOrigin(0.5, 1)
      .setDepth(5);
    for (const e of sim.map.entries)
      this.scene.add
        .image(px(e.x) + 12, py(e.y) + 12, 'battle:entry')
        .setOrigin(0.5, 0.5)
        .setDepth(2);
  }

  // ===== 매 프레임 =====
  sync(time: number): void {
    this.syncTowers(time);
    this.syncEnemies(time);
    this.syncProjectiles();
    this.syncSummons(time);
    this.drawFields(time);
    this.drawOverlay(time);
  }

  private syncTowers(time: number): void {
    const sim = this.sim;
    const alive = new Set<number>();
    for (const t of sim.towers) {
      alive.add(t.id);
      let s = this.towers.get(t.id);
      if (!s) {
        s = this.makeTower(t);
        this.towers.set(t.id, s);
      }
      s.box.setDepth(10 + t.ty);
      if (s.exprUntil && time > s.exprUntil) {
        s.exprUntil = 0;
        s.view.setExpression('default');
      }
      s.view.hold(t.down > 0 ? 'hit' : null);
      if (t.down > 0) s.view.setExpression('faint');
    }
    for (const [id, s] of this.towers) {
      if (!alive.has(id)) {
        s.box.destroy();
        this.towers.delete(id);
      }
    }
  }

  private makeTower(t: Tower): TowerSprite {
    const sc = this.scene;
    const box = sc.add.container(px(t.tx) + TILE / 2, py(t.ty) + TILE - 3);
    const mk = 'battle:mound';
    if (!sc.textures.exists(mk)) sc.textures.addCanvas(mk, gridToCanvas(generateMound()));
    const mound = sc.add.image(0, 2, mk).setOrigin(0.5, 1);
    const view = new PlantView(sc, 0, -1, {
      speciesId: t.spec.id,
      stage: Math.max(3, Math.min(5, t.load.stage)) as Stage,
      seed: `b${t.id}`,
    });
    box.add([mound, view]);
    // 배치 연출: 흙이 볼록 → 새싹이 쑥 → 퐁
    box.setScale(1, 0.4);
    sc.tweens.add({ targets: box, scaleY: 1, duration: 260, ease: 'Back.easeOut' });
    this.fx.sparkles(box.x, box.y - 6, rampColor(t.spec.fx.color), 5);
    return { box, view, exprUntil: 0 };
  }

  setExpr(towerId: number, expr: Expression, ms: number, time: number): void {
    const s = this.towers.get(towerId);
    if (!s) return;
    s.view.setExpression(expr);
    s.exprUntil = time + ms;
  }

  /** 모든 식물이 시선을 맞춘다: 가장 가까운 적을 쳐다본다 */
  lookAll(): void {
    for (const t of this.sim.towers) {
      const s = this.towers.get(t.id);
      if (!s) continue;
      let best: { x: number; y: number } | null = null;
      let bd = 99;
      for (const e of this.sim.enemies) {
        const d = Math.hypot(e.x - t.x, e.y - t.y);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      if (best) s.view.lookAt(px(best.x), py(best.y));
    }
  }

  lookTo(towerId: number, x: number, y: number): void {
    this.towers.get(towerId)?.view.lookAt(x, y);
  }

  towerPos(id: number): { x: number; y: number } | null {
    const s = this.towers.get(id);
    return s ? { x: s.box.x, y: s.box.y - 10 } : null;
  }

  hitFlash(uid: number, time: number): void {
    this.flash.set(uid, time + 70);
  }

  private syncEnemies(time: number): void {
    const sim = this.sim;
    const live = new Set<number>();
    const g = this.bars;
    g.clear();
    for (const e of sim.enemies) {
      if (!e.alive) continue;
      live.add(e.uid);
      let img = this.enemies.get(e.uid);
      const frame = Math.floor(time / 220 + e.uid) % 2;
      const size = Math.round(e.def.size * (e.def.id === 'E22' ? 1 : 1));
      const key = enemyTexture(this.scene, e.def.id, size, frame, e.flying);
      if (!img) {
        img = this.scene.add.image(0, 0, key).setOrigin(0.5, 0.6);
        this.enemies.set(e.uid, img);
      } else if (img.texture.key !== key) img.setTexture(key);
      const sx = px(e.x);
      const sy = py(e.y) - (e.flying ? 9 : 0) + (e.flying ? Math.sin(time / 180 + e.uid) * 1.5 : 0);
      img
        .setPosition(Math.round(sx), Math.round(sy))
        .setDepth(8 + e.y * 0.01 + (e.flying ? 20 : 0));
      const f = this.flash.get(e.uid) ?? 0;
      if (f > time) img.setTintFill(toInt(SPECIAL.PAPER));
      else img.clearTint();
      img.setFlipX(e.backward);
      // 체력바(1px): 보스는 HUD 에서
      if (!e.boss && e.hp < e.maxHp) {
        const w = Math.max(8, Math.round(e.def.size * 0.8));
        g.fillStyle(toInt(SPECIAL.INK), 1).fillRect(
          Math.round(sx - w / 2) - 1,
          Math.round(sy - e.def.size / 2) - 5,
          w + 2,
          3,
        );
        g.fillStyle(toInt(RAMPS.R7[3]), 1).fillRect(
          Math.round(sx - w / 2),
          Math.round(sy - e.def.size / 2) - 4,
          Math.max(1, Math.round((w * e.hp) / e.maxHp)),
          1,
        );
      }
      if (e.elite)
        g.fillStyle(toInt(RAMPS.R9[3]), 1).fillRect(
          Math.round(sx - 3),
          Math.round(sy - e.def.size / 2) - 8,
          6,
          2,
        );
      // 상태이상 아이콘(3×3, 최대 3개)
      e.icons.slice(0, 3).forEach((k, i) => {
        g.fillStyle(toInt(SPECIAL.INK), 1).fillRect(
          Math.round(sx) - 6 + i * 5,
          Math.round(sy - e.def.size / 2) - 11,
          5,
          5,
        );
        g.fillStyle(toInt(STATUS_COLOR[k] ?? SPECIAL.PAPER), 1).fillRect(
          Math.round(sx) - 5 + i * 5,
          Math.round(sy - e.def.size / 2) - 10,
          3,
          3,
        );
      });
      if (e.stealth && e.revealed <= sim.tick) img.setVisible(false);
      else img.setVisible(true);
    }
    for (const [uid, img] of this.enemies) {
      if (!live.has(uid)) {
        img.destroy();
        this.enemies.delete(uid);
        this.flash.delete(uid);
      }
    }
  }

  private syncProjectiles(): void {
    const sim = this.sim;
    const live = new Set<number>();
    this.trailTick++;
    for (const p of sim.projectiles) {
      if (p.t < 0) continue;
      live.add(p.id);
      let img = this.projs.get(p.id);
      if (!img) {
        img = this.scene.add.image(0, 0, this.fx.shapeTexture(p.fx)).setDepth(35);
        this.projs.set(p.id, img);
      }
      let y = py(p.y);
      if (p.kind === 'lob') y -= Math.sin((p.t / p.dur) * Math.PI) * 22;
      img.setPosition(Math.round(px(p.x)), Math.round(y));
      if (['needle', 'thorn', 'bolt', 'leaf'].includes(p.fx.shape))
        img.setRotation(p.kind === 'lob' ? 0 : p.dir);
      if (this.trailTick % 2 === 0) this.fx.trail(img.x, img.y, p.fx);
    }
    for (const [id, img] of this.projs) {
      if (!live.has(id)) {
        img.destroy();
        this.projs.delete(id);
      }
    }
  }

  private syncSummons(time: number): void {
    const live = new Set<number>();
    for (const s of this.sim.summons) {
      live.add(s.id);
      let img = this.summons.get(s.id);
      if (!img) {
        img = this.scene.add.image(0, 0, this.fx.shapeTexture(s.fx)).setDepth(33);
        if (s.kind === 'BLOCKER') img.setScale(2);
        this.summons.set(s.id, img);
      }
      img.setPosition(
        Math.round(px(s.x)),
        Math.round(py(s.y) - 6 + Math.sin(time / 200 + s.id) * 2),
      );
    }
    for (const [id, img] of this.summons) {
      if (!live.has(id)) {
        img.destroy();
        this.summons.delete(id);
      }
    }
  }

  private drawFields(time: number): void {
    const g = this.fieldGfx;
    g.clear();
    for (const f of this.sim.fields) {
      const c1 = toInt(rampColor(f.fx.color));
      const c2 = toInt(f.fx.color2 ? rampColor(f.fx.color2) : rampColor(f.fx.color));
      const x = px(f.x);
      const y = py(f.y);
      const R = Math.max(5, f.r * TILE);
      const tileLike = ['LAVA', 'VINE', 'TANGLE', 'TRAP', 'PATCH', 'COTTON', 'DECOY'].includes(
        f.kind,
      );
      if (tileLike) {
        g.fillStyle(f.kind === 'LAVA' ? toInt(RAMPS.R7[2]) : c1, 1);
        for (let i = 0; i < 9; i++)
          g.fillRect(
            Math.round(x - 9 + (i % 3) * 7 + ((i + Math.floor(time / 200)) % 2)),
            Math.round(y - 9 + Math.floor(i / 3) * 7),
            4,
            4,
          );
        g.fillStyle(c2, 1).fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      } else {
        // 구름 · 파동 · 장판: 도는 점
        const n = Math.max(8, Math.floor(R * 1.2));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + time / 600;
          g.fillStyle(i % 2 ? c1 : c2, 1).fillRect(
            Math.round(x + Math.cos(a) * R),
            Math.round(y + Math.sin(a) * R * 0.7),
            2,
            2,
          );
        }
      }
    }
  }

  private drawOverlay(time: number): void {
    const g = this.overlay;
    g.clear();
    const sim = this.sim;
    // 놓을 수 있는 칸: 초록으로 깜빡임
    if (this.place) {
      const on = Math.floor(time / 300) % 2 === 0;
      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 26; x++) {
          if (
            !canPlaceOn(this.place, sim.map.tiles[y][x]) ||
            sim.towers.some((t) => t.tx === x && t.ty === y)
          )
            continue;
          g.lineStyle(1, toInt(on ? RAMPS.R1[4] : RAMPS.R1[3]), 1).strokeRect(
            px(x) + 1,
            py(y) + 1,
            TILE - 2,
            TILE - 2,
          );
        }
      }
      if (this.hover) {
        const hx = Math.floor((this.hover.x - MAP_X) / TILE);
        const hy = Math.floor((this.hover.y - MAP_Y) / TILE);
        if (hx >= 0 && hx < 26 && hy >= 0 && hy < 12) {
          const ok =
            canPlaceOn(this.place, sim.map.tiles[hy][hx]) &&
            !sim.towers.some((t) => t.tx === hx && t.ty === hy);
          g.fillStyle(toInt(ok ? RAMPS.R1[3] : RAMPS.R7[3]), 1)
            .fillRect(px(hx), py(hy), 2, TILE)
            .fillRect(px(hx) + TILE - 2, py(hy), 2, TILE);
          this.dotCircle(g, px(hx) + 12, py(hy) + 12, this.place.range * TILE, RAMPS.R9[4]);
        }
      }
    }
    if (this.rangeOf !== null) {
      const t = sim.towerById(this.rangeOf);
      if (t)
        this.dotCircle(
          g,
          px(t.tx) + 12,
          py(t.ty) + 12,
          sim.eff(t).range * TILE,
          rampColor(t.spec.fx.color),
        );
    }
    // 광선: 식물 → 대상
    for (const t of sim.towers) {
      if (t.spec.arch !== 'BEAM' || !t.aux.beamTarget) continue;
      const e = sim.enemyByUid(t.aux.beamTarget);
      if (!e) continue;
      const c1 = toInt(rampColor(t.spec.fx.color));
      const c2 = toInt(rampColor(t.spec.fx.color2 ?? t.spec.fx.color));
      const x1 = px(t.x);
      const y1 = py(t.y) - 8;
      const x2 = px(e.x);
      const y2 = py(e.y) - 4;
      const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
      const w = 1 + Math.min(2, Math.floor((t.aux.beamHeld ?? 0) / 90));
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        g.fillStyle(i % 6 < 3 ? c1 : c2, 1).fillRect(
          Math.round(x1 + (x2 - x1) * k),
          Math.round(y1 + (y2 - y1) * k) + (Math.floor(time / 60) % 2),
          w,
          w,
        );
      }
    }
    // 식물 HP 바(상처 입었을 때) · 개화기 게이지
    for (const t of sim.towers) {
      const s = this.towers.get(t.id);
      if (!s) continue;
      const x = Math.round(s.box.x) - 8;
      const y = Math.round(s.box.y) + 2;
      g.fillStyle(toInt(SPECIAL.INK), 1).fillRect(x - 1, y - 1, 18, 3);
      g.fillStyle(toInt(t.gauge >= 1 ? RAMPS.R9[4] : RAMPS.R6[3]), 1).fillRect(
        x,
        y,
        Math.round(16 * t.gauge),
        1,
      );
      if (t.hp < t.maxHp)
        g.fillStyle(toInt(RAMPS.R1[3]), 1).fillRect(x, y - 3, Math.round((16 * t.hp) / t.maxHp), 1);
      if (t.level > 0)
        for (let i = 0; i < t.level; i++)
          g.fillStyle(toInt(RAMPS.R9[4]), 1).fillRect(x + 14 - i * 3, y + 3, 2, 2);
    }
  }

  private dotCircle(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    r: number,
    color: string,
  ): void {
    g.fillStyle(toInt(color), 1);
    const n = Math.max(16, Math.floor(r / 2));
    for (let i = 0; i < n; i += 2) {
      const a = (i / n) * Math.PI * 2;
      g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
  }

  destroy(): void {
    for (const s of this.towers.values()) s.box.destroy();
    for (const m of [this.enemies, this.projs, this.summons])
      for (const i of m.values()) i.destroy();
    this.fieldGfx.destroy();
    this.bars.destroy();
    this.overlay.destroy();
  }
}
