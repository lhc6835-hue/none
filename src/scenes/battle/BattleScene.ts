// 전투 화면 (06문서): 시뮬레이션(BattleSim)을 고정 간격 1/60초로 돌리고, 상태를 읽어 그린다.
//  - 배속은 같은 간격 계산을 여러 번 하는 것이라 결과가 같다 · 탭을 벗어나면 자동 일시정지
//  - 일시정지 중에도 배치 · 강화 · 정보 보기가 된다(초보 배려)

import Phaser from 'phaser';
import { RAMPS, SPECIAL } from '../../art/palette';
import type { GameState } from '../../core/GameState';
import { DIFFICULTY_ORDER, type DifficultyId } from '../../data/battle/difficulty';
import { PLANT_BATTLE_BY_ID } from '../../data/battle/plants';
import { STAGE_BY_ID } from '../../data/battle/stages';
import { t } from '../../i18n';
import { BattleSim } from '../../systems/battle/BattleSim';
import { GARDEN_TOOLS } from '../../systems/battle/GardenTools';
import { loadoutOf } from '../../systems/battle/Loadouts';
import { upgradeCost } from '../../systems/battle/Towers';
import type { Loadout } from '../../systems/battle/types';
import { applySafeArea, safeLeft, setBackdrop } from '../../ui/Layout';
import { pixelText } from '../../ui/PixelText';
import { getApp } from '../context';
import { overlay } from '../UIOverlay';
import { BattleHud } from './BattleHud';
import { drainEvents } from './BattleEvents';
import { BattleView } from './BattleView';
import { FxLayer, MAP_X, MAP_Y, TILE, px, py } from './FxLayer';
import * as banners from './BattleBanners';
import * as ending from './BattleEnding';

export interface BattleSceneData {
  stageId: string;
  difficulty: DifficultyId;
  /** 정원에서 데려가는 식물(uid). 데모 · 테스트에서는 deck 으로 직접 넘긴다 */
  deckUids?: string[];
  deck?: Loadout[];
  tools?: string[];
  seed?: string;
  /** 연습/시연: 보상 · 저장 없음 */
  practice?: boolean;
  /** 나갈 때 돌아갈 씬(기본: 정원) */
  returnTo?: string;
}

const STEP = 1 / 60;
const MAX_STEPS = 12;

export class BattleScene extends Phaser.Scene {
  sim!: BattleSim;
  view!: BattleView;
  fx!: FxLayer;
  hud!: BattleHud;
  state: GameState | null = null;
  data0!: BattleSceneData;
  speed = 1;
  paused = false;
  acc = 0;
  ended = false;
  lastHitSfx = 0;
  /** 이번 판에 실제로 심은 식물(uid → 기여) */
  placedUids = new Set<string>();
  selectedCard = -1;
  selectedTower: number | null = null;
  toolSlot = -1;
  endTimer: Phaser.Time.TimerEvent | undefined;
  private shakeUntil = 0;
  private shakeAmp = 0;
  private offs: (() => void)[] = [];
  private floats: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Battle');
  }

  init(data: BattleSceneData): void {
    this.data0 = data;
  }

  create(): void {
    const app = getApp(this);
    const data = this.data0;
    this.state = app.services.state;
    setBackdrop(RAMPS.R4[0]);
    applySafeArea(this);
    this.cameras.main.setBackgroundColor(RAMPS.R4[0]);
    const stage = STAGE_BY_ID.get(data.stageId);
    if (!stage) throw new Error(`알 수 없는 스테이지: ${data.stageId}`);
    const now = app.services.clock.now();
    let deck: Loadout[] = data.deck ?? [];
    if (!data.deck && this.state) {
      const st = this.state;
      deck = (data.deckUids ?? [])
        .map((uid) => st.plants.find((p) => p.uid === uid))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => loadoutOf(st, p, now));
    }
    const attempt = this.state?.progress[stage.id]?.tries ?? 0;
    this.sim = new BattleSim({
      stage,
      difficulty: data.difficulty,
      deck,
      seed: data.seed ?? String(this.state?.meta.createdAt ?? 0),
      attempt,
      recordEvents: true,
      tools: data.tools ?? this.toolsFor(),
    });
    this.speed = 1;
    this.paused = false;
    this.acc = 0;
    this.ended = false;
    this.placedUids = new Set();
    this.selectedCard = -1;
    this.selectedTower = null;
    this.toolSlot = -1;
    this.floats = [];
    this.offs = [];

    this.fx = new FxLayer(this);
    this.view = new BattleView(this, this.sim, this.fx);
    this.hud = new BattleHud(this, this.sim, {
      onCard: (i) => this.pickCard(i),
      onTool: (s) => this.pickTool(s),
      onCallWave: () => this.callWave(),
      onPause: () => this.togglePause(),
      onSpeed: () => this.cycleSpeed(),
      onMenu: () => this.openMenu(),
      onUpgrade: (id, b) => this.upgrade(id, b),
      onSell: (id) => this.sell(id),
      onTarget: (id) => this.cycleTarget(id),
      onBloomMode: (id) => {
        this.sim.toggleManualBloom(id);
        getApp(this).sfx.play('ui_click');
      },
      onBloomFire: (id) => this.sim.fireBloom(id),
    });
    this.hud.setSpeed(this.speed, this.paused);

    // 입력
    const zone = this.add
      .zone(MAP_X, MAP_Y, 26 * TILE, 12 * TILE)
      .setOrigin(0, 0)
      .setInteractive()
      .setDepth(2);
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.onMapTap(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.view.hover = { x: p.x, y: p.y };
    });
    this.bindKeys();
    const onVis = (): void => {
      if (document.visibilityState === 'hidden' && !this.ended && !this.paused) this.togglePause();
    };
    document.addEventListener('visibilitychange', onVis);
    this.offs.push(() => document.removeEventListener('visibilitychange', onVis));
    this.events.once('shutdown', () => this.teardown());

    // 시작 안내: 첫 웨이브 전 준비 시간
    banners.stageBanner(
      this,
      `${stage.id}  ${t(`stage.${stage.id}`)}`,
      t(`diff.${data.difficulty}`),
    );
    if (getApp(this).services.debug)
      (window as unknown as { __battle?: BattleScene }).__battle = this;
  }

  /** 장착 도구: 정원사 레벨로 열린 것 중 앞 2개 */
  private toolsFor(): string[] {
    const lv = this.state?.player.level ?? 1;
    const open = Object.values(GARDEN_TOOLS).filter((d) => d.unlockLevel <= lv);
    const picks = (this.state?.loadout.tools ?? []).filter((id) => open.some((d) => d.id === id));
    const out = picks.slice(0, 2);
    for (const d of open) if (out.length < 2 && !out.includes(d.id)) out.push(d.id);
    return out;
  }

  // ===== 키보드 =====
  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    const on = (key: string, fn: () => void): void => {
      kb.on(`keydown-${key}`, fn);
      this.offs.push(() => kb.off(`keydown-${key}`, fn));
    };
    for (let i = 1; i <= 8; i++) on(String(i), () => this.pickCard(i - 1));
    on('Q', () => this.pickTool(0));
    on('W', () => this.pickTool(1));
    on('SPACE', () => this.togglePause());
    on('F', () => this.cycleSpeed());
    on('U', () => this.selectedTower !== null && this.upgrade(this.selectedTower));
    on('R', () => this.selectedTower !== null && this.sell(this.selectedTower));
    on('ESC', () => this.cancelPick());
    on('TAB', () => this.cycleTower());
  }

  // ===== 카드 · 도구 · 선택 =====
  pickCard(i: number): void {
    const sim = this.sim;
    if (this.ended || i < 0 || i >= sim.deck.length) return;
    const app = getApp(this);
    this.toolSlot = -1;
    if (this.selectedCard === i) {
      this.cancelPick();
      return;
    }
    if (sim.nutrient < sim.placeCost(i)) {
      app.sfx.play('ui_error');
      this.toast(t('battle.noNutrient'));
      return;
    }
    app.sfx.play('ui_click');
    this.selectedCard = i;
    this.selectedTower = null;
    this.hud.showTower(null);
    this.hud.setSelected(i);
    this.view.place = PLANT_BATTLE_BY_ID.get(sim.deck[i].speciesId) ?? null;
    this.view.rangeOf = null;
  }

  pickTool(slot: number): void {
    const sim = this.sim;
    if (this.ended || slot >= sim.toolIds.length) return;
    const app = getApp(this);
    if (sim.toolCd[slot] > 0) {
      app.sfx.play('ui_error');
      return;
    }
    this.cancelPick();
    this.toolSlot = this.toolSlot === slot ? -1 : slot;
    app.sfx.play('ui_click');
  }

  cancelPick(): void {
    this.selectedCard = -1;
    this.toolSlot = -1;
    this.view.place = null;
    this.hud.setSelected(-1);
  }

  private cycleTower(): void {
    const ts = this.sim.towers;
    if (!ts.length) return;
    const idx = ts.findIndex((x) => x.id === this.selectedTower);
    this.selectTower(ts[(idx + 1) % ts.length].id);
  }

  selectTower(id: number | null): void {
    this.selectedTower = id;
    this.view.rangeOf = id;
    this.hud.showTower(id);
  }

  // ===== 맵 탭 =====
  private onMapTap(p: Phaser.Input.Pointer): void {
    if (this.ended || this.hud.overUi(p.x, p.y)) return;
    const sim = this.sim;
    const app = getApp(this);
    const tx = Math.floor((p.x - MAP_X) / TILE);
    const ty = Math.floor((p.y - MAP_Y) / TILE);
    if (tx < 0 || ty < 0 || tx >= 26 || ty >= 12) return;
    if (this.toolSlot >= 0) {
      if (sim.useTool(this.toolSlot, tx + 0.5, ty + 0.5)) this.toolSlot = -1;
      else app.sfx.play('ui_error');
      return;
    }
    if (this.selectedCard >= 0) {
      const idx = this.selectedCard;
      const r = sim.place(idx, tx, ty);
      if (r.ok) {
        const tw = sim.towers[sim.towers.length - 1];
        if (tw?.load.uid) this.placedUids.add(tw.load.uid);
        if (sim.nutrient < sim.placeCost(idx)) this.cancelPick();
      } else {
        app.sfx.play('ui_error');
        this.toast(t(`battle.place.${r.reason ?? 'tile'}`));
        this.shakeCard(idx);
      }
      return;
    }
    const tower = sim.towers.find((x) => x.tx === tx && x.ty === ty);
    this.selectTower(tower ? tower.id : null);
    if (tower) app.sfx.play('ui_click');
  }

  private shakeCard(_i: number): void {
    this.shake(1, 120);
  }

  // ===== 명령 =====
  callWave(): void {
    if (this.ended) return;
    if (this.sim.callWave()) getApp(this).sfx.play('ui_click');
  }

  upgrade(id: number, branch?: 'A' | 'B'): void {
    const tw = this.sim.towerById(id);
    if (!tw) return;
    const cost = upgradeCost(tw);
    if (cost === null || !this.sim.upgrade(id, branch)) {
      getApp(this).sfx.play('ui_error');
      return;
    }
    this.hud.showTower(id);
  }

  sell(id: number): void {
    this.sim.sell(id);
    if (this.selectedTower === id) this.selectTower(null);
  }

  cycleTarget(id: number): void {
    const tw = this.sim.towerById(id);
    if (!tw) return;
    const modes = ['FIRST', 'LAST', 'STRONG', 'CLOSE', 'AIR'] as const;
    this.sim.setTarget(id, modes[(modes.indexOf(tw.target) + 1) % modes.length]);
    getApp(this).sfx.play('ui_click');
  }

  togglePause(): void {
    this.paused = !this.paused;
    getApp(this).sfx.play('ui_click');
    this.hud.setSpeed(this.speed, this.paused);
  }

  /** 1× → 2×(정원사 Lv3) → 3×(챕터 3 클리어) */
  maxSpeed(): number {
    const lv = this.state?.player.level ?? 3;
    const ch3 = Object.keys(this.state?.progress ?? {}).some(
      (k) => k.startsWith('3-') && (this.state?.progress[k]?.stars ?? 0) > 0,
    );
    return ch3 ? 3 : lv >= 3 ? 2 : 1;
  }

  cycleSpeed(): void {
    const app = getApp(this);
    const max = this.maxSpeed();
    if (max === 1) {
      app.sfx.play('ui_error');
      this.toast(t('battle.speedLocked'));
      return;
    }
    this.speed = this.speed >= max ? 1 : this.speed + 1;
    app.sfx.play('ui_click');
    this.hud.setSpeed(this.speed, this.paused);
  }

  openMenu(): void {
    ending.openMenu(this);
  }

  // ===== 연출 도우미(BattleEvents 가 부른다) =====
  toast(text: string): void {
    overlay(this).toast(text);
  }

  shake(amp: number, ms: number): void {
    this.shakeAmp = amp;
    this.shakeUntil = this.time.now + ms;
  }

  heartPunch(): void {
    banners.heartPunch(this);
  }

  floatText(x: number, y: number, text: string, crit = false, color?: string): void {
    const label = pixelText(this, x, y, text, {
      size: crit ? 9 : 7,
      bold: crit,
      anchorX: 0.5,
      anchorY: 0.5,
      color: color ?? (crit ? RAMPS.R9[4] : SPECIAL.PAPER),
    }).setDepth(50);
    this.floats.push(label);
    this.tweens.add({
      targets: label,
      y: y - 12,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        label.destroy();
        this.floats = this.floats.filter((f) => f !== label);
      },
    });
  }

  waveBanner(text: string): void {
    banners.waveBanner(this, text);
  }

  bossBanner(name: string): void {
    banners.bossBanner(this, name);
  }

  bloomBanner(plant: string, skill: string, color: string): void {
    banners.bloomBanner(this, plant, skill, color);
  }

  // ===== 매 프레임 =====
  override update(time: number, delta: number): void {
    const dt = Math.min(delta, 100) / 1000;
    if (!this.ended && !this.paused) {
      this.acc += dt * this.speed;
      let n = 0;
      while (this.acc >= STEP && n < MAX_STEPS) {
        this.sim.step();
        this.acc -= STEP;
        n++;
        if (this.sim.phase === 'WON' || this.sim.phase === 'LOST') break;
      }
      if (n === MAX_STEPS) this.acc = 0;
    }
    drainEvents(this, time);
    if (this.sim.towers.length && Math.floor(time / 700) !== Math.floor((time - delta) / 700))
      this.view.lookAll();
    this.view.sync(time);
    this.fx.update(dt);
    this.hud.update();
    const shaking = this.time.now < this.shakeUntil;
    const jitter = (): number =>
      shaking ? Math.round((Math.random() - 0.5) * 2 * this.shakeAmp) : 0;
    this.cameras.main.setScroll(-safeLeft(this) + jitter(), jitter());
    if (!this.ended && (this.sim.phase === 'WON' || this.sim.phase === 'LOST')) {
      this.ended = true;
      ending.begin(this);
    }
  }

  /** 지금 장면에서 타일 좌표의 화면 위치(테스트용) */
  tileCenter(tx: number, ty: number): { x: number; y: number } {
    return { x: px(tx) + TILE / 2, y: py(ty) + TILE / 2 };
  }

  difficultyIndex(): number {
    return DIFFICULTY_ORDER.indexOf(this.data0.difficulty);
  }

  private teardown(): void {
    this.endTimer?.remove();
    for (const o of this.offs) o();
    this.offs = [];
    this.view.destroy();
    this.fx.destroy();
    this.hud.destroy();
    this.tweens.killAll();
    if (getApp(this).services.debug)
      (window as unknown as { __battle?: unknown }).__battle = undefined;
  }
}
