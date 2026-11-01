// 돌보기 화면 (04문서 11절): 식물 하나를 월드 ×2 로 크게 보며 18종 돌봄을 손으로 한다.
//  - 모든 돌봄은 같은 프레임 안에 표정 · 몸짓 · 소리로 답한다(perform)
//  - 새싹이 되면 '처음 눈뜨기' 연출 → 이름 짓기(이 게임에서 가장 귀여운 순간)

import Phaser from 'phaser';
import { objectTextures } from '../art/HubObjects';
import { gridToCanvas } from '../art/GridCanvas';
import { phaseAt, skyTexture } from '../art/HubArt';
import { generatePot } from '../art/PotSpriteGen';
import { RAMPS, SPECIAL } from '../art/palette';
import type { Stage } from '../art/bodies/Ctx';
import { localParts } from '../core/Clock';
import type { GameState } from '../core/GameState';
import type { PlantInstance, ProblemState } from '../core/schema';
import type { Settings } from '../core/Settings';
import { type CareAction } from '../data/care';
import { PERSONALITIES } from '../data/personalities';
import { POT_STYLE_OF } from '../art/HubArt';
import type { PlantBase } from '../data/plants';
import type { SfxId } from '../data/sfx';
import { hasKey, t } from '../i18n';
import { plantDisplayName, plantSpeciesName } from '../i18n/names';
import type { CareCtx, CareResult } from '../systems/garden/Care';
import { baseOf, bubbleOf, plantByUid, type BubbleKind } from '../systems/garden/Garden';
import { GardenSession } from '../systems/garden/Session';
import { Button } from '../ui/Button';
import { ensurePanel } from '../ui/Frames';
import { Gauge } from '../ui/Gauge';
import { iconTexture } from '../ui/IconTex';
import { applySafeArea, setBackdrop } from '../ui/Layout';
import { buildCareBackdrop, buildCareFront, CARE_WINDOW } from '../art/CareBackdrop';
import { NameInput } from '../ui/NameInput';
import { numberText } from '../ui/NumberFont';
import { PlantView } from '../ui/PlantView';
import { pixelText } from '../ui/PixelText';
import { Tooltip } from '../ui/Tooltip';
import { getApp, type AppContext } from './context';
import { type CareHost, type Pt, type Tool, type ToolId, type TrayEntry } from './care/Tools';
import { overlay } from './UIOverlay';
import * as ceremony from './care/CareCeremony';
import * as fx from './care/CareFx';
import * as panels from './care/CarePanels';
import { PX, PY, SCALE, TOOLS } from './care/CareConfig';
import type { PuffKind } from './care/Tools';

export interface CareSceneData {
  uid: string;
  ceremony?: boolean;
}

export class CareScene extends Phaser.Scene implements CareHost {
  plant!: PlantInstance;
  base!: PlantBase;
  state!: GameState;
  readonly body = new Phaser.Geom.Rectangle();
  readonly pot = new Phaser.Geom.Rectangle();
  readonly soil = new Phaser.Geom.Rectangle();
  stemX = PX;
  layer!: Phaser.GameObjects.Container;

  app!: AppContext;
  session!: GardenSession;
  root!: Phaser.GameObjects.Container;
  view!: PlantView;
  potImg!: Phaser.GameObjects.Image;
  problemLayer!: Phaser.GameObjects.Container;
  problemSig = '';
  gauges!: Record<'water' | 'nutrition' | 'hygiene' | 'mood', Gauge>;
  growth!: Gauge;
  growthText!: Phaser.GameObjects.Text;
  nameText!: Phaser.GameObjects.Text;
  metaText!: Phaser.GameObjects.Text;
  condText!: Phaser.GameObjects.Text;
  hintText!: Phaser.GameObjects.Text;
  bandGfx!: Phaser.GameObjects.Graphics;
  toolButtons = new Map<ToolId, Button>();
  badges = new Map<ToolId, Phaser.GameObjects.Image>();
  tool: Tool | null = null;
  toolId: ToolId | null = null;
  tooltip!: Tooltip;
  lastTick = -1;
  exprUntil = 0;
  bubble: Phaser.GameObjects.Container | undefined;
  busy = false;
  ceremonyActive = false;
  nameInput: NameInput | undefined;
  card: Phaser.GameObjects.Container | undefined;
  offs: (() => void)[] = [];
  ui: Phaser.GameObjects.GameObject[] = [];
  pendingCeremony = false;

  constructor() {
    super('Care');
  }

  // ===== 호스트(도구가 쓰는 기능) =====
  get sc(): Phaser.Scene {
    return this;
  }
  ctx(): CareCtx {
    return this.session.ctxFor(this.plant);
  }
  settings(): Settings {
    return this.app.services.settings.get();
  }
  mastery(action: CareAction): number {
    return this.state.mastery[action] ?? 0;
  }
  hint(text: string): void {
    this.hintText.setText(text);
  }
  sfx(id: SfxId, opts?: { pitch?: number }): void {
    this.app.sfx.play(id, opts);
  }
  previewWater(level: number | null): void {
    this.gauges.water.setValue(
      level === null ? this.plant.needs.water : Math.min(110, level),
      false,
    );
    this.drawBand(level);
  }
  overPlant(x: number, y: number, pad = 0): boolean {
    const r = Phaser.Geom.Rectangle.Union(this.body, this.pot, new Phaser.Geom.Rectangle());
    Phaser.Geom.Rectangle.Inflate(r, pad * 2, pad * 2);
    return r.contains(x, y);
  }
  overMouth(x: number, y: number): boolean {
    const b = this.body;
    return x >= b.x - 10 && x <= b.right + 10 && y >= b.y - 10 && y <= b.y + b.height * 0.7;
  }
  problemPos(p: ProblemState): Pt {
    return {
      x: Math.round(this.body.x + (p.x ?? 0.5) * this.body.width),
      y: Math.round(this.body.y + (p.y ?? 0.5) * this.body.height),
    };
  }

  tray(
    entries: TrayEntry[],
    onPick: (id: string, p: Phaser.Input.Pointer) => void,
  ): Phaser.GameObjects.Container {
    const w = Math.min(560, entries.length * 94 + 12);
    const c = this.add.container(0, 0).setDepth(65);
    const x0 = 320 - w / 2;
    c.add(this.add.image(x0, 296, ensurePanel(this, 'wood', w, 30)).setOrigin(0, 0));
    entries.forEach((e, i) => {
      const x = x0 + 6 + i * 94;
      const chip = this.add
        .zone(x, 301, 90, 20)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      const bg = this.add.image(x, 301, ensurePanel(this, 'leaf', 90, 20)).setOrigin(0, 0);
      const icon = this.add.image(x + 9, 311, iconTexture(this, e.icon));
      const label = pixelText(this, x + 17, 304, e.label, { size: 9, color: SPECIAL.INK });
      if (label.width > 56) label.setScale(1);
      c.add([bg, icon, label]);
      if (e.count !== undefined) {
        c.add(
          numberText(
            this,
            x + 86 - String(e.count).length * 4,
            306,
            String(e.count),
            SPECIAL.INK,
            '3x5',
          ),
        );
      }
      chip.on('pointerdown', (p: Phaser.Input.Pointer) => {
        this.sfx('ui_click');
        onPick(e.id, p);
      });
      c.add(chip);
    });
    return c;
  }

  // ---- 효과 · 패널 · 연출은 care/ 아래 모듈이 맡는다 ----
  puff(x: number, y: number, kind: PuffKind): void {
    fx.puff(this, x, y, kind);
  }
  answer(symbol: string): void {
    fx.answer(this, symbol);
  }
  perform(r: CareResult, at?: Pt): void {
    fx.perform(this, r, at);
  }
  puffSparkle(): void {
    fx.puffSparkle(this);
  }
  floatText(text: string, color: string, at?: Pt, dy = 0): void {
    fx.floatText(this, text, color, at, dy);
  }
  restoreExpression(): void {
    fx.restoreExpression(this);
  }
  syncProblems(): void {
    fx.syncProblems(this);
  }
  drawBand(preview: number | null = null): void {
    panels.drawBand(this, preview);
  }
  buildToolbar(): void {
    panels.buildToolbar(this);
  }
  updateBadges(): void {
    panels.updateBadges(this);
  }
  refreshAll(animate = true): void {
    panels.refreshAll(this, animate);
  }
  startCeremony(): void {
    ceremony.startCeremony(this);
  }

  // ===== 생성 =====
  init(data: CareSceneData): void {
    this.pendingCeremony = data.ceremony === true;
    this.dataUid = data.uid;
  }
  dataUid = '';

  create(): void {
    this.app = getApp(this);
    const services = this.app.services;
    const state = services.state;
    const plant = state ? plantByUid(state, this.dataUid) : undefined;
    if (!state || !plant) {
      this.scene.start('Hub');
      return;
    }
    this.state = state;
    this.plant = plant;
    this.base = baseOf(plant.speciesId);
    this.session = new GardenSession(state, services.clock, services.bus);
    this.tool = null;
    this.toolId = null;
    this.toolButtons.clear();
    this.badges.clear();
    this.problemSig = '';
    this.exprUntil = 0;
    this.busy = false;
    this.ceremonyActive = false;
    this.offs = [];
    this.ui = [];

    setBackdrop(RAMPS.R10[0]);
    applySafeArea(this);
    objectTextures(this);
    this.tooltip = new Tooltip(this);
    this.drawBackground();
    this.buildPlant();
    panels.buildPanels(this);
    this.buildToolbar();
    this.layer = this.add.container(0, 0).setDepth(66);

    // 입력: 도구에 전달
    const zone = this.add.zone(-80, 0, 800, 360).setOrigin(0, 0).setInteractive().setDepth(2);
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.tool?.down(p));
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.keyboard?.on('keydown-ESC', () => this.leave());

    const bus = services.bus;
    this.offs.push(
      bus.on('plant:stageUp', (e) => {
        if (e.uid === this.plant.uid) this.onStageUp(e.to);
      }),
      bus.on('player:levelUp', (e) => {
        overlay(this).toast(t('hub.levelUp', { level: e.level }));
        this.sfx('stage_up');
        this.buildToolbar();
      }),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.offs) off();
      this.input.off('pointermove', this.onMove, this);
      this.input.off('pointerup', this.onUp, this);
      this.nameInput?.destroy();
      this.tool?.leave();
      this.tooltip.hide();
    });

    this.refreshAll(false);
    this.session.advance();
    if (this.pendingCeremony || plant.flags.needsName) this.startCeremony();
    else this.hint(t('care.hint.default'));
  }

  // ===== 배경 · 식물 =====
  drawBackground(): void {
    if (!this.textures.exists('care:room')) buildCareBackdrop().toTexture(this, 'care:room');
    if (!this.textures.exists('care:roomFront')) buildCareFront().toTexture(this, 'care:roomFront');
    this.add.image(-80, 0, 'care:room').setOrigin(0, 0).setDepth(0);
    // 창: 지금 하늘이 보인다
    const phase = phaseAt(localParts(this.session.now()).hourFloat);
    const w = CARE_WINDOW;
    const sky = this.add
      .image(w.x - 180, w.y - 40, skyTexture(this, phase, false))
      .setOrigin(0, 0)
      .setDepth(1);
    sky.setCrop(180, 40, w.w, w.h);
    this.add.image(-80, 0, 'care:roomFront').setOrigin(0, 0).setDepth(2);
  }

  potTexture(): string {
    const style = POT_STYLE_OF[this.plant.potId] ?? 'clay';
    const key = `pot:${style}`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, gridToCanvas(generatePot(style)));
    return key;
  }

  buildPlant(): void {
    this.root?.destroy();
    this.problemLayer?.destroy();
    const p = this.plant;
    this.root = this.add.container(PX, PY).setScale(SCALE).setDepth(10);
    this.potImg = this.add.image(0, 0, this.potTexture()).setOrigin(0.5, 1);
    this.view = new PlantView(this, 0, -11, {
      speciesId: p.speciesId,
      stage: p.stage as Stage,
      variant: p.variant,
      seed: p.uid,
    });
    this.root.add([this.view, this.potImg]);
    this.root.bringToTop(this.potImg);
    const w = this.view.width;
    const h = this.view.height;
    this.body.setTo(PX - w, PY - SCALE * (11 + h), SCALE * w, SCALE * h);
    this.pot.setTo(PX - 20, PY - 24, 40, 24);
    this.soil.setTo(PX - 34, PY - 28, 68, 10);
    this.stemX = PX;
    this.problemLayer = this.add.container(0, 0).setDepth(20);
    this.problemSig = '';
    this.restoreExpression();
  }

  // ===== 패널(게이지 · 상단 막대) =====
  // ===== 도구 막대 =====
  selectTool(id: ToolId): void {
    if (this.busy || this.ceremonyActive) return;
    const same = this.toolId === id;
    this.tool?.leave();
    this.tool = null;
    this.toolId = null;
    this.problemSig = '';
    if (!same) {
      const def = TOOLS.find((d) => d.id === id)!;
      this.toolId = id;
      this.tool = def.make(this);
      this.hint(this.tool.hint);
      this.tool.enter();
    } else this.hint(t('care.hint.default'));
    panels.highlightTool(this);
    this.syncProblems();
  }

  // ===== 입력 =====
  onMove(p: Phaser.Input.Pointer): void {
    // 식물이 커서 · 도구를 눈으로 따라온다
    this.view.lookAt((p.worldX - PX) / SCALE, (p.worldY - PY) / SCALE);
    if (overlay(this).hasModal || this.ceremonyActive) return;
    this.tool?.move(p);
  }
  onUp(p: Phaser.Input.Pointer): void {
    if (overlay(this).hasModal) return;
    this.tool?.up(p);
  }

  // ===== 반응: 모든 돌봄은 같은 프레임에 표정 · 몸짓 · 소리로 답한다 =====
  // ===== 갱신 =====
  // ===== 시간 진행 =====
  override update(time: number, delta: number): void {
    if (this.ceremonyActive) return;
    const rep = this.session.advance();
    if (rep && rep.lines.length > 0) this.refreshAll(false);
    if (this.state.garden.lastTickAt !== this.lastTick) {
      this.lastTick = this.state.garden.lastTickAt;
      this.refreshAll();
    }
    if (this.exprUntil && time > this.exprUntil) {
      this.exprUntil = 0;
      this.restoreExpression();
    }
    this.tool?.update(time, delta);
    this.view.setAngle(this.plant.problems.some((q) => q.kind === 'TOPPLED') ? -12 : 0);
  }

  onStageUp(to: number): void {
    this.sfx('stage_up');
    this.buildPlant();
    this.root.setScale(SCALE * 1.15);
    this.tweens.add({
      targets: this.root,
      scaleX: SCALE,
      scaleY: SCALE,
      duration: 400,
      ease: 'Back.easeOut',
    });
    for (let i = 0; i < 10; i++) this.puffSparkle();
    this.floatText(t(`stage.${to}`), RAMPS.R9[4]);
    this.refreshAll(false);
    if (this.plant.flags.needsName && !this.ceremonyActive)
      this.time.delayedCall(900, () => this.startCeremony());
  }

  // ===== 식물 정보 =====
  openInfo(): void {
    const p = this.plant;
    const pers = t(PERSONALITIES[p.personality].nameKey);
    const lines = [
      p.stage >= 2
        ? t('care.info.personality', { value: pers })
        : t('care.info.personalityUnknown'),
      t('care.info.likes', {
        light: t(`care.light.${this.base.care.light}`),
        water: t(`care.water.${this.base.care.water}`),
        temp: t(`care.temp.${this.base.care.temp}`),
      }),
      p.stage >= 5 && p.traits.length > 0
        ? t('care.info.traits', { value: p.traits.map((id) => t(`trait.${id}`)).join(', ') })
        : t('care.info.traitsUnknown'),
    ];
    const diary = p.diary
      .slice(-3)
      .map((d) =>
        hasKey(`diary.${d.kind}`) ? t(`diary.${d.kind}`, { name: String(d.name ?? '') }) : d.kind,
      );
    overlay(this).openModal({
      title: `${plantDisplayName(p)} (${plantSpeciesName(p.speciesId)})`,
      body: [...lines, '', t('care.info.diary'), ...diary].join('\n'),
      width: 320,
      buttons: [{ label: t('common.close') }],
    });
  }

  leave(): void {
    if (this.ceremonyActive || this.busy) return;
    this.app.services.autoSave.flush('care');
    overlay(this).transitionTo('Care', 'Hub');
  }

  // ===== 처음 눈뜨기 → 이름 짓기 (이 게임에서 가장 귀여운 순간) =====
  get bubbleKind(): BubbleKind {
    return bubbleOf(this.plant, this.base, this.session.envOf(this.plant));
  }
}
