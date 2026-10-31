// 돌봄 도구 13종의 손놀림 (04문서 5절). 입력(누르기 · 문지르기 · 끌기)을 읽어 로직(systems/garden)에 결과값을 넘기고,
// 돌려받은 결과를 host.perform() 으로 표정 · 몸짓 · 소리로 바로(같은 프레임에) 보여 준다.

import Phaser from 'phaser';
import type { GameState } from '../../core/GameState';
import type { PlantInstance, ProblemState } from '../../core/schema';
import type { Settings } from '../../core/Settings';
import { type CareAction } from '../../data/care';
import type { PlantBase } from '../../data/plants';
import type { SfxId } from '../../data/sfx';
import { t } from '../../i18n';
import type { CareCtx, CareResult } from '../../systems/garden/Care';

export type ToolId =
  | 'water'
  | 'mist'
  | 'nutrient'
  | 'compost'
  | 'bone'
  | 'scrub'
  | 'pest'
  | 'prune'
  | 'hand'
  | 'talk'
  | 'snack'
  | 'repot'
  | 'stake';

export type PuffKind = 'water' | 'mist' | 'powder' | 'soil' | 'scrub' | 'heart';

export interface Pt {
  x: number;
  y: number;
}

export interface TrayEntry {
  id: string;
  label: string;
  count?: number;
  icon: string;
  /** 눌렀을 때: 끌어가기 시작(carry) 또는 바로 실행 */
  disabled?: boolean;
}

/** 도구가 화면에 요청하는 것들(CareScene 이 구현) */
export interface CareHost {
  readonly sc: Phaser.Scene;
  readonly plant: PlantInstance;
  readonly base: PlantBase;
  readonly state: GameState;
  readonly body: Phaser.Geom.Rectangle;
  readonly pot: Phaser.Geom.Rectangle;
  readonly soil: Phaser.Geom.Rectangle;
  readonly stemX: number;
  readonly layer: Phaser.GameObjects.Container;
  ctx(): CareCtx;
  settings(): Settings;
  mastery(action: CareAction): number;
  perform(r: CareResult, at?: Pt): void;
  /** 효과음(콤보 음처럼 음높이를 바꿀 때) */
  sfx(id: SfxId, opts?: { pitch?: number }): void;
  hint(text: string): void;
  /** 물 게이지 미리보기(눌러 둔 동안) */
  previewWater(level: number | null): void;
  /** 식물 위에 가루 · 물방울 같은 작은 입자 */
  puff(x: number, y: number, kind: PuffKind): void;
  /** 문제 표시를 다시 그린다 */
  syncProblems(): void;
  problemPos(p: ProblemState): Pt;
  /** 식물 위치(스프라이트 안쪽 0–1 비율)를 장면 좌표로 */
  tray(
    entries: TrayEntry[],
    onPick: (id: string, p: Phaser.Input.Pointer) => void,
  ): Phaser.GameObjects.Container;
  /** 식물이 말풍선으로 답한다(♪ ! … ♥) */
  answer(symbol: string): void;
  /** 식물에 닿을 만큼 가까운가(식물 몸 + 화분, 여유 포함) */
  overPlant(x: number, y: number, pad?: number): boolean;
  /** 식물 몸 위쪽 입 근처인가 */
  overMouth(x: number, y: number): boolean;
}

export abstract class Tool {
  abstract readonly action: CareAction;
  abstract readonly hint: string;
  protected objs: Phaser.GameObjects.GameObject[] = [];

  constructor(protected readonly h: CareHost) {}

  enter(): void {}
  leave(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }
  down(_p: Phaser.Input.Pointer): void {}
  move(_p: Phaser.Input.Pointer): void {}
  up(_p: Phaser.Input.Pointer): void {}
  update(_time: number, _delta: number): void {}

  /** 간편 돌봄 설정이거나 숙련 4 이상의 '짧게 탭' = 손놀림 없이 바로 완벽(04문서 5-2) */
  protected quick(): boolean {
    return this.h.settings().easyCare || this.h.mastery(this.action) >= 4;
  }
  protected own<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.objs.push(o);
    return o;
  }
}

// ---------- 끌어서 놓는 도구의 공통 부분 ----------
export abstract class CarryTool extends Tool {
  protected carrying: string | null = null;
  protected ghost: Phaser.GameObjects.Image | undefined;
  protected trayBox: Phaser.GameObjects.Container | undefined;
  protected abstract iconName: string;
  protected abstract entries(): TrayEntry[];
  /** 놓았을 때 실행. true 면 소비 처리가 끝난 것 */
  protected abstract drop(id: string, p: Phaser.Input.Pointer): void;

  override enter(): void {
    const entries = this.entries();
    if (entries.length === 0) {
      this.h.hint(t('care.noItems'));
      return;
    }
    this.trayBox = this.h.tray(entries, (id, p) => this.pick(id, p));
    this.own(this.trayBox);
  }
  protected pick(id: string, p: Phaser.Input.Pointer): void {
    this.carrying = id;
    this.ghost = this.own(
      this.h.sc.add.image(p.worldX, p.worldY, `icon:${this.iconName}`).setDepth(80),
    );
    this.onPick(id, p);
  }
  protected onPick(_id: string, _p: Phaser.Input.Pointer): void {}
  override move(p: Phaser.Input.Pointer): void {
    this.ghost?.setPosition(Math.round(p.worldX), Math.round(p.worldY));
    if (this.carrying) this.onCarry(p);
  }
  protected onCarry(_p: Phaser.Input.Pointer): void {}
  override up(p: Phaser.Input.Pointer): void {
    if (!this.carrying) return;
    const id = this.carrying;
    this.carrying = null;
    this.ghost?.destroy();
    this.ghost = undefined;
    this.drop(id, p);
  }
}
