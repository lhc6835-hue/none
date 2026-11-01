// 온실 허브 (10문서 1절): 가로 1600 × 세로 360 의 살아 있는 온실. 화면 안의 사물이 곧 메뉴다.
//  - 끌기 · 휠 · 방향키 · 가장자리 화살표로 이동(관성 스크롤), 패럴랙스 4겹
//  - 식물 선반: 탭하면 돌보기, 끌어서 다른 칸으로 옮기기, 빈 칸을 탭하면 씨앗 심기
//  - 사물: 씨앗 상자 · 축음기 · 난로 · 선풍기 · 블라인드 · 정원 문
//  - 실제 시각의 낮 · 노을 · 밤과 날짜 시드 날씨

import Phaser from 'phaser';
import { objectTextures } from '../art/HubObjects';
import { RAMPS } from '../art/palette';
import type { GameState } from '../core/GameState';
import type { SongGenre, ZoneId } from '../core/schema';
import { MAX_PAN, START_PAN, slotX, slotY } from '../data/hubLayout';
import { HUB_ZONES, ZONES } from '../data/zones';
import { t } from '../i18n';
import { plantDisplayName } from '../i18n/names';
import { isZoneUnlocked, openSlots, plantByUid, plantsIn } from '../systems/garden/Garden';
import { GardenSession } from '../systems/garden/Session';
import type { OfflineReport } from '../systems/garden/Offline';
import { applySafeArea, setBackdrop } from '../ui/Layout';
import { Tooltip } from '../ui/Tooltip';
import { getApp } from './context';
import { HubHud } from './hub/HubHud';
import { HubGoal } from './hub/HubGoal';
import { HubSky } from './hub/HubSky';
import { PlantSpot } from './hub/PlantSpot';
import { cheatModal } from './hub/HubCheats';
import { overlay } from './UIOverlay';
import { localParts } from '../core/Clock';
import * as hubFurniture from './hub/HubFurniture';
import * as hubDrag from './hub/HubDrag';
import * as hubFx from './hub/HubFx';
import * as hubActions from './hub/HubActions';

type Press =
  | { kind: 'pan'; x: number; t: number; moved: boolean }
  | { kind: 'object'; x: number; y: number; t: number; moved: boolean; tap: () => void }
  | { kind: 'spot'; spot: PlantSpot; x: number; y: number; t: number; moved: boolean };

interface Drag {
  uid: string;
  ghost: Phaser.GameObjects.Container;
  from: PlantSpot;
}

const TAP_SLOP = 8;

export class HubScene extends Phaser.Scene {
  state!: GameState;
  session!: GardenSession;
  world!: Phaser.GameObjects.Container;
  sky!: HubSky;
  hud!: HubHud;
  tooltip!: Tooltip;
  spots: PlantSpot[] = [];
  pan = START_PAN;
  goal: HubGoal | undefined;
  vel = 0;
  press: Press | null = null;
  drag: Drag | null = null;
  lastSyncTick = -1;
  skyCheckAt = 0;
  panTween: Phaser.Tweens.Tween | undefined;
  noteAt = 0;
  lookAt = 0;
  phono: Phaser.GameObjects.Image | undefined;
  flame: Phaser.GameObjects.Image | undefined;
  fan: Phaser.GameObjects.Image | undefined;
  blindGfx: Phaser.GameObjects.Graphics | undefined;
  blindButtons: Phaser.GameObjects.Image[] = [];
  zoneTags: Phaser.GameObjects.GameObject[] = [];
  offs: (() => void)[] = [];
  ceremonyQueued = false;
  keys: Record<string, Phaser.Input.Keyboard.Key> = {};

  constructor() {
    super('Hub');
  }

  // ===== 생성 =====
  create(): void {
    const app = getApp(this);
    const { services } = app;
    if (!services.state) {
      this.scene.start('Title');
      return;
    }
    this.state = services.state;
    this.goal = undefined; // 다시 들어올 때 지난 화면의 패널(이미 지워진 객체)을 쓰지 않게
    this.session = new GardenSession(this.state, services.clock, services.bus);
    this.press = null;
    this.drag = null;
    this.vel = 0;
    this.spots = [];
    this.blindButtons = [];
    this.zoneTags = [];
    this.offs = [];
    this.ceremonyQueued = false;

    setBackdrop(RAMPS.R4[0]);
    applySafeArea(this);
    objectTextures(this);
    this.tooltip = new Tooltip(this);

    // 월드(1.0): 바닥 그림 위에 사물 · 선반 · 화분
    const panZone = this.add.zone(-80, 0, 800, 360).setOrigin(0, 0).setInteractive().setDepth(1);
    this.world = this.add.container(0, 0).setDepth(10);
    this.sky = new HubSky(this, this.world, () => services.settings.get().particles);
    const now = this.session.now();
    const parts = localParts(now);
    this.sky.build(parts.hourFloat, this.session.world().weather);

    this.pan = Phaser.Math.Clamp(this.state.garden.hubPan ?? START_PAN, 0, MAX_PAN);
    this.buildObjects();
    this.refreshSpots();
    this.buildBlinds();

    this.hud = new HubHud(this, this.state, {
      onSettings: () => this.openSettings(),
      onBag: () => this.openBag(),
      onSoon: (feature) => this.soon(feature),
      onArrow: (dir) => this.glide(dir * 320),
    });
    this.goal = new HubGoal(this);
    this.applyPan(this.pan);

    // 입력
    panZone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.panTween?.stop();
      this.vel = 0;
      this.press = { kind: 'pan', x: p.x, t: this.time.now, moved: false };
    });
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => {
      if (overlay(this).hasModal) return;
      this.glide((dx + dy) * 0.6, 120);
    });
    const kb = this.input.keyboard;
    if (kb) {
      this.keys.left = kb.addKey('LEFT');
      this.keys.right = kb.addKey('RIGHT');
      this.keys.a = kb.addKey('A');
      this.keys.d = kb.addKey('D');
      if (services.debug) kb.on('keydown-C', () => overlay(this).openModal(cheatModal(this)));
    }

    // 이벤트
    const bus = services.bus;
    this.offs.push(
      bus.on('plant:stageUp', (e) => this.onStageUp(e.uid, e.to)),
      bus.on('plant:bloom', (e) => this.onBloom(e.uid)),
      bus.on('plant:eyesOpen', () => this.queueCeremony(1100)),
      bus.on('player:levelUp', (e) => {
        overlay(this).toast(t('hub.levelUp', { level: e.level }));
        app.sfx.play('stage_up');
        this.refreshAfterUnlock();
      }),
      bus.on('plant:problem', (e) => {
        if (e.kind === 'MOLD' || e.kind === 'PEST') app.sfx.play('mold_pop');
        this.syncSpots();
      }),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.offs) off();
      this.state.garden.hubPan = this.pan;
      this.input.off('pointermove', this.onMove, this);
      this.input.off('pointerup', this.onUp, this);
      this.tooltip.hide();
    });

    // 접속 직후: 그동안 있었던 일 → 처음 눈뜨기 대기
    const report = this.session.advance();
    this.syncSpots();
    if (report) this.afterOffline(report);
    else this.queueCeremony(700);
    this.hud.refresh(this.state, false);
  }

  // ===== 사물 · 표지 =====
  // ===== 칸 =====
  /** 모든 칸을 다시 만든다(심기 · 옮기기 · 레벨업 뒤) */
  refreshSpots(): void {
    for (const s of this.spots) s.destroy();
    this.spots = [];
    for (const zone of HUB_ZONES) {
      const unlocked = isZoneUnlocked(this.state, zone);
      const opened = openSlots(this.state, zone);
      for (let slot = 0; slot < ZONES[zone].slots; slot++) {
        const plant = plantsIn(this.state, zone).find((p) => p.location.slot === slot);
        const kind = plant ? 'plant' : unlocked && slot < opened ? 'empty' : 'locked';
        const spot = new PlantSpot(
          this,
          this.world,
          zone,
          slot,
          slotX(zone, slot),
          slotY(zone),
          kind,
          plant,
        );
        spot.hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
          this.panTween?.stop();
          this.vel = 0;
          this.press = { kind: 'spot', spot, x: p.x, y: p.y, t: this.time.now, moved: false };
        });
        if (plant) {
          this.tooltip.attach(
            spot.hit,
            () => this.plantTip(plant.uid),
            () => ({ x: slotX(zone, slot) - this.pan, y: slotY(zone) - 40 }),
          );
        }
        this.spots.push(spot);
      }
    }
    this.syncSpots();
  }

  plantTip(uid: string): string {
    const p = plantByUid(this.state, uid);
    if (!p) return '';
    const stage = t(`stage.${p.stage}`);
    return t('hub.plantTip', { name: plantDisplayName(p), stage });
  }

  /** 표정 · 말풍선 갱신 */
  syncSpots(): void {
    for (const s of this.spots) {
      if (s.plant) s.sync(this.session.envOf(s.plant));
    }
    this.goal?.refresh();
  }

  refreshAfterUnlock(): void {
    this.buildZoneTags();
    this.buildBlinds();
    this.refreshSpots();
    this.hud.refresh(this.state);
  }

  // ===== 입력 =====
  onMove(p: Phaser.Input.Pointer): void {
    const pr = this.press;
    if (!pr || !p.isDown) return;
    if (pr.kind === 'pan') {
      const dx = p.x - pr.x;
      if (Math.abs(dx) > TAP_SLOP || pr.moved) {
        pr.moved = true;
        this.scrollBy(-(p.x - p.prevPosition.x));
        this.vel = -(p.x - p.prevPosition.x) / Math.max(1, this.game.loop.delta);
      }
      return;
    }
    const moved = Math.hypot(p.x - pr.x, p.y - pr.y) > TAP_SLOP;
    if (moved) pr.moved = true;
    if (!pr.moved) return;
    if (pr.kind === 'object') {
      this.scrollBy(-(p.x - p.prevPosition.x));
      this.vel = -(p.x - p.prevPosition.x) / Math.max(1, this.game.loop.delta);
      return;
    }
    // 칸을 누른 채 움직임: 식물이 있으면 들어 올리기, 빈 칸이면 이동
    if (pr.spot.plant) {
      if (!this.drag) this.startDrag(pr.spot);
      this.moveDrag(p);
    } else {
      this.scrollBy(-(p.x - p.prevPosition.x));
      this.vel = -(p.x - p.prevPosition.x) / Math.max(1, this.game.loop.delta);
    }
  }

  onUp(p: Phaser.Input.Pointer): void {
    const pr = this.press;
    this.press = null;
    if (!pr) return;
    if (this.drag) {
      this.endDrag(p);
      return;
    }
    if (pr.moved) return; // 끌기였다(관성은 update 가 이어서 처리)
    if (pr.kind === 'object') pr.tap();
    else if (pr.kind === 'spot') this.tapSpot(pr.spot);
  }

  tapSpot(spot: PlantSpot): void {
    const app = getApp(this);
    if (spot.kind === 'plant' && spot.plant) {
      app.sfx.play('ui_click');
      this.openCare(spot.plant.uid);
    } else if (spot.kind === 'empty') {
      this.openSeedPicker({ zone: spot.zone, slot: spot.slot });
    } else {
      const open = openSlots(this.state, spot.zone);
      const unlocked = isZoneUnlocked(this.state, spot.zone);
      app.sfx.play('ui_error');
      overlay(this).toast(
        unlocked && spot.slot >= open
          ? t('hub.slotLocked')
          : t('hub.zoneLockedToast', { level: ZONES[spot.zone].unlockLevel }),
      );
    }
  }

  // ===== 이동(팬) =====
  scrollBy(dx: number): void {
    this.applyPan(this.pan + dx);
  }

  glide(dx: number, ms = 360): void {
    this.panTween?.stop();
    const from = this.pan;
    const to = Phaser.Math.Clamp(this.pan + dx, 0, MAX_PAN);
    const o = { v: from };
    this.panTween = this.tweens.add({
      targets: o,
      v: to,
      duration: ms,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.applyPan(o.v),
    });
  }

  applyPan(px: number): void {
    const clamped = Phaser.Math.Clamp(px, 0, MAX_PAN);
    if (clamped !== px) this.vel = 0;
    this.pan = clamped;
    this.world.x = -Math.round(clamped);
    this.sky.setPan(clamped);
    this.hud?.setArrows(clamped > 4, clamped < MAX_PAN - 4);
  }

  // ===== 사물 동작 =====
  // ===== 심기 =====
  // ===== 돌보기 · 처음 눈뜨기 =====
  // ===== 연출 =====
  // ===== 프레임 =====
  override update(time: number, delta: number): void {
    this.goal?.update(time);
    // 정원 진행
    const report = this.session.advance();
    if (report) this.afterOffline(report);
    if (this.state.garden.lastTickAt !== this.lastSyncTick) {
      this.lastSyncTick = this.state.garden.lastTickAt;
      this.syncSpots();
      this.hud.refresh(this.state);
    }
    if (time > this.skyCheckAt) {
      this.skyCheckAt = time + 20_000;
      const p = localParts(this.session.now());
      if (this.sky.sync(p.hourFloat, this.session.world().weather)) this.applyPan(this.pan);
    }

    // 키보드 이동
    const left = this.keys.left?.isDown || this.keys.a?.isDown;
    const right = this.keys.right?.isDown || this.keys.d?.isDown;
    if (left || right) {
      this.panTween?.stop();
      this.vel = 0;
      this.scrollBy(((right ? 1 : 0) - (left ? 1 : 0)) * 0.35 * delta);
    }

    // 관성
    if (!this.press && Math.abs(this.vel) > 0.01) {
      const before = this.pan;
      this.scrollBy(this.vel * delta);
      this.vel *= Math.pow(0.9, delta / 16);
      // 구역 경계를 지나면 살짝 감속(10문서 1절)
      for (const edge of [320, 960, 1280]) {
        if ((before + 320 - edge) * (this.pan + 320 - edge) < 0) this.vel *= 0.5;
      }
    }

    this.sky.update(time, delta, this.pan);
    this.animateObjects(time);

    // 식물이 커서를 눈으로 따라온다
    const ptr = this.input.activePointer;
    if (time - this.lookAt > 90) {
      this.lookAt = time;
      for (const s of this.spots) s.setLook(ptr.worldX + this.pan, ptr.worldY);
    }
  }

  // ---- 길어진 부분은 하위 모듈이 맡는다 ----
  buildObjects(): void {
    hubFurniture.buildObjects(this);
  }
  buildZoneTags(): void {
    hubFurniture.buildZoneTags(this);
  }
  buildBlinds(): void {
    hubFurniture.buildBlinds(this);
  }
  drawBlinds(): void {
    hubFurniture.drawBlinds(this);
  }
  startDrag(spot: PlantSpot): void {
    hubDrag.startDrag(this, spot);
  }
  moveDrag(p: Phaser.Input.Pointer): void {
    hubDrag.moveDrag(this, p);
  }
  endDrag(p: Phaser.Input.Pointer): void {
    hubDrag.endDrag(this, p);
  }
  onStageUp(uid: string, to: number): void {
    hubFx.onStageUp(this, uid, to);
  }
  onBloom(uid: string): void {
    hubFx.onBloom(this, uid);
  }
  sparkle(x: number, y: number): void {
    hubFx.sparkle(this, x, y);
  }
  dustBurst(x: number, y: number): void {
    hubFx.dustBurst(this, x, y);
  }
  animateObjects(time: number): void {
    hubFx.animateObjects(this, time);
  }
  soon(feature: string): void {
    hubActions.soon(this, feature);
  }
  openSettings(): void {
    hubActions.openSettings(this);
  }
  openBag(): void {
    hubActions.openBag(this);
  }
  openMusic(): void {
    hubActions.openMusic(this);
  }
  setMusicGenre(genre: SongGenre | null): void {
    hubActions.setMusicGenre(this, genre);
  }
  toggleDevice(device: 'stove' | 'fan'): void {
    hubActions.toggleDevice(this, device);
  }
  cycleBlind(zone: ZoneId): void {
    hubActions.cycleBlind(this, zone);
  }
  lockedToast(level: number): void {
    hubActions.lockedToast(this, level);
  }
  openSeedPicker(target: { zone: ZoneId; slot: number } | null): void {
    hubActions.openSeedPicker(this, target);
  }
  plantSeedAt(speciesId: string, target: { zone: ZoneId; slot: number } | null): boolean {
    return hubActions.plantSeedAt(this, speciesId, target);
  }
  openCare(uid: string): void {
    hubActions.openCare(this, uid);
  }
  queueCeremony(delay: number): void {
    hubActions.queueCeremony(this, delay);
  }
  afterOffline(report: OfflineReport): void {
    hubActions.afterOffline(this, report);
  }
}
