// 돌봄 도구 13종의 손놀림 (04문서 5절). 입력(누르기 · 문지르기 · 끌기)을 읽어 로직(systems/garden)에 결과값을 넘기고,
// 돌려받은 결과를 host.perform() 으로 표정 · 몸짓 · 소리로 바로(같은 프레임에) 보여 준다.

import Phaser from 'phaser';
import { BONES, NUTRIENTS, SNACKS } from '../../data/items';
import { CARE } from '../../data/care';
import { t } from '../../i18n';
import { itemName } from '../../i18n/names';
import { countOf } from '../../systems/economy/Inventory';
import { boneMeal, compost, mist, nutrient, water } from '../../systems/garden/CareTools';
import { snack } from '../../systems/garden/CareSocial';
import { waterRangeOf } from '../../systems/garden/Needs';
import { LapCounter, ReversalCounter, midOf } from './gestures';
import { Tool, CarryTool, type Pt, type TrayEntry } from './ToolBase';

// ---------- 1. 물주기 ----------
export class WaterTool extends Tool {
  readonly action = 'WATER' as const;
  readonly hint = t('care.hint.water');
  private pouring = false;
  private level = 0;
  private startedAt = 0;
  private dropAt = 0;
  private sfxAt = 0;
  private can: Phaser.GameObjects.Image | undefined;
  private pointer: Pt = { x: 0, y: 0 };

  override down(p: Phaser.Input.Pointer): void {
    if (!this.h.overPlant(p.worldX, p.worldY, 14)) return;
    this.pouring = true;
    this.level = this.h.plant.needs.water;
    this.startedAt = this.h.sc.time.now;
    this.pointer = { x: p.worldX, y: p.worldY };
    this.can = this.own(this.h.sc.add.image(0, 0, 'icon:can').setDepth(70));
    this.can!.setAngle(-24);
  }
  override move(p: Phaser.Input.Pointer): void {
    this.pointer = { x: p.worldX, y: p.worldY };
  }
  override update(time: number, delta: number): void {
    if (!this.pouring) return;
    this.level += (CARE.waterPerSecond * delta) / 1000;
    this.h.previewWater(this.level);
    this.can?.setPosition(Math.round(this.pointer.x - 18), Math.round(this.pointer.y - 26));
    if (time > this.sfxAt) {
      this.sfxAt = time + 90;
      this.h.perform({ ok: true, perfect: false, reaction: 'gulp', sfx: 'water_pour' }, undefined);
    }
    if (time > this.dropAt) {
      this.dropAt = time + 60;
      this.h.puff(this.pointer.x - 10 + Phaser.Math.Between(-3, 3), this.pointer.y - 18, 'water');
    }
  }
  override up(_p: Phaser.Input.Pointer): void {
    if (!this.pouring) return;
    this.pouring = false;
    this.can?.destroy();
    this.can = undefined;
    const held = this.h.sc.time.now - this.startedAt;
    let level = this.level;
    if (held < 260 && this.quick()) level = midOf(waterRangeOf(this.h.base));
    this.h.previewWater(null);
    this.h.perform(water(this.h.ctx(), level));
  }
  override leave(): void {
    this.h.previewWater(null);
    super.leave();
  }
}

// ---------- 2. 분무 ----------
export class MistTool extends Tool {
  readonly action = 'MIST' as const;
  readonly hint = t('care.hint.mist');
  private taps = 0;
  private timer: Phaser.Time.TimerEvent | undefined;

  override down(p: Phaser.Input.Pointer): void {
    if (!this.h.overPlant(p.worldX, p.worldY, 14)) return;
    this.taps = this.quick() ? 4 : this.taps + 1;
    this.h.puff(p.worldX, p.worldY - 10, 'mist');
    this.h.perform({ ok: true, perfect: false, reaction: 'ticklish', sfx: 'mist' });
    this.timer?.remove();
    if (this.taps >= 5 || this.quick()) this.finish();
    else this.timer = this.h.sc.time.delayedCall(700, () => this.finish());
  }
  private finish(): void {
    this.timer?.remove();
    const taps = this.taps;
    this.taps = 0;
    if (taps === 0) return;
    this.h.perform(mist(this.h.ctx(), taps));
  }
  override leave(): void {
    this.timer?.remove();
    super.leave();
  }
}

// ---------- 3. 영양제 ----------
export class NutrientTool extends CarryTool {
  readonly action = 'NUTRIENT' as const;
  readonly hint = t('care.hint.nutrient');
  protected iconName = 'ampoule';
  protected entries(): TrayEntry[] {
    return Object.keys(NUTRIENTS)
      .filter((id) => countOf(this.h.state, id) > 0)
      .map((id) => ({
        id,
        label: itemName(id),
        count: countOf(this.h.state, id),
        icon: 'ampoule',
      }));
  }
  protected drop(id: string, p: Phaser.Input.Pointer): void {
    const onSoil = this.h.overPlant(p.worldX, p.worldY, 10);
    if (!onSoil) {
      // 짧게 눌렀다 뗀 것(끌지 않음)은 간편 돌봄이면 바로 쓴다
      if (this.quick() && p.getDistance() < 8) this.h.perform(nutrient(this.h.ctx(), id));
      else this.h.hint(t('care.dragToSoil'));
      return;
    }
    this.h.puff(p.worldX, p.worldY, 'soil');
    this.h.perform(nutrient(this.h.ctx(), id));
    this.refreshTray();
  }
  private refreshTray(): void {
    this.leave();
    this.enter();
  }
}

// ---------- 4. 뼛가루 ----------
export class BoneTool extends CarryTool {
  readonly action = 'BONE' as const;
  readonly hint = t('care.hint.bone');
  protected iconName = 'bone';
  private shakes = new ReversalCounter(12);
  protected entries(): TrayEntry[] {
    return Object.keys(BONES)
      .filter((id) => countOf(this.h.state, id) > 0)
      .map((id) => ({ id, label: itemName(id), count: countOf(this.h.state, id), icon: 'bone' }));
  }
  protected override onPick(): void {
    this.shakes = new ReversalCounter(12);
  }
  protected override onCarry(p: Phaser.Input.Pointer): void {
    if (!this.h.overPlant(p.worldX, p.worldY, 24)) return;
    if (this.shakes.push(p.worldX)) {
      this.h.puff(p.worldX, p.worldY + 10, 'powder');
      this.h.perform({ ok: true, perfect: false, reaction: 'ticklish', sfx: 'bone_shake' });
    }
  }
  protected drop(id: string, p: Phaser.Input.Pointer): void {
    let strokes = this.shakes.strokes;
    if (strokes === 0 && this.quick() && p.getDistance() < 8) strokes = 3; // 간편 돌봄 · 숙련 4
    if (strokes === 0) {
      this.h.hint(t('care.shakeMore'));
      return;
    }
    this.h.perform(boneMeal(this.h.ctx(), id, strokes));
    this.leave();
    this.enter();
  }
}

// ---------- 5. 퇴비 섞기 ----------
export class CompostTool extends Tool {
  readonly action = 'COMPOST' as const;
  readonly hint = t('care.hint.compost');
  private lap: LapCounter | undefined;
  private down0 = false;
  private lastPuff = 0;

  override down(p: Phaser.Input.Pointer): void {
    const s = this.h.soil;
    if (
      !Phaser.Geom.Rectangle.Contains(
        Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(s), 16, 14),
        p.worldX,
        p.worldY,
      )
    )
      return;
    this.down0 = true;
    this.lap = new LapCounter(s.centerX, s.centerY, 3, 44);
    if (this.quick()) {
      this.down0 = false;
      this.h.perform(compost(this.h.ctx(), 2));
    }
  }
  override move(p: Phaser.Input.Pointer): void {
    if (!this.down0 || !this.lap) return;
    this.lap.push(p.worldX, p.worldY);
    if (this.h.sc.time.now - this.lastPuff > 90) {
      this.lastPuff = this.h.sc.time.now;
      this.h.puff(p.worldX, p.worldY, 'soil');
    }
    if (this.lap.laps >= 2) {
      this.down0 = false;
      this.h.perform(compost(this.h.ctx(), this.lap.laps));
    }
  }
  override up(_p: Phaser.Input.Pointer): void {
    if (!this.down0 || !this.lap) return;
    this.down0 = false;
    if (this.lap.laps < 1) this.h.hint(t('care.circleMore'));
    else this.h.perform(compost(this.h.ctx(), this.lap.laps));
  }
}

// ---------- 17. 간식 ----------
export class SnackTool extends CarryTool {
  readonly action = 'SNACK' as const;
  readonly hint = t('care.hint.snack');
  protected iconName = 'snack';
  protected entries(): TrayEntry[] {
    return SNACKS.filter((id) => countOf(this.h.state, id) > 0).map((id) => ({
      id,
      label: itemName(id),
      count: countOf(this.h.state, id),
      icon: 'snack',
    }));
  }
  protected override onCarry(p: Phaser.Input.Pointer): void {
    // 입 근처로 가면 식물이 입을 벌린다(먹보는 더)
    if (this.h.overMouth(p.worldX, p.worldY))
      this.h.perform({ ok: true, perfect: false, reaction: 'surprise', sfx: null });
  }
  protected drop(id: string, p: Phaser.Input.Pointer): void {
    if (!this.h.overMouth(p.worldX, p.worldY) && !(this.quick() && p.getDistance() < 8)) {
      this.h.hint(t('care.dragToMouth'));
      return;
    }
    this.h.perform(snack(this.h.ctx(), id));
    this.leave();
    this.enter();
  }
}
