// 돌봄 도구 13종의 손놀림 (04문서 5절). 입력(누르기 · 문지르기 · 끌기)을 읽어 로직(systems/garden)에 결과값을 넘기고,
// 돌려받은 결과를 host.perform() 으로 표정 · 몸짓 · 소리로 바로(같은 프레임에) 보여 준다.

import Phaser from 'phaser';
import { SPECIAL, toInt } from '../../art/palette';
import type { ProblemState } from '../../core/schema';
import { CARE } from '../../data/care';
import { t } from '../../i18n';
import { catchPest, prune, scrubMold, shape } from '../../systems/garden/CareTools';
import { harvest, pet, talk, type Phrase } from '../../systems/garden/CareSocial';
import { ReversalCounter, segmentHitsCircle } from './gestures';
import { Tool, type Pt } from './ToolBase';

// ---------- 6. 곰팡이 닦기 ----------
export class ScrubTool extends Tool {
  readonly action = 'SCRUB' as const;
  readonly hint = t('care.hint.scrub');
  private counters = new Map<ProblemState, ReversalCounter>();
  private active: ProblemState | null = null;
  private brush: Phaser.GameObjects.Image | undefined;
  private lastSfx = 0;

  private spotAt(x: number, y: number): ProblemState | null {
    for (const pr of this.h.plant.problems) {
      if (pr.kind !== 'MOLD') continue;
      const pos = this.h.problemPos(pr);
      if (Math.hypot(pos.x - x, pos.y - y) <= 13) return pr;
    }
    return null;
  }

  override down(p: Phaser.Input.Pointer): void {
    this.brush = this.own(this.h.sc.add.image(p.worldX, p.worldY, 'icon:brush').setDepth(80));
    const spot = this.spotAt(p.worldX, p.worldY);
    if (!spot) return;
    if (this.quick()) {
      this.h.perform(scrubMold(this.h.ctx(), spot, CARE.moldRubs, CARE.moldRubs));
      this.h.syncProblems();
      return;
    }
    this.active = spot;
    if (!this.counters.has(spot)) this.counters.set(spot, new ReversalCounter(5));
  }
  override move(p: Phaser.Input.Pointer): void {
    this.brush?.setPosition(Math.round(p.worldX), Math.round(p.worldY));
    if (!p.isDown) return;
    const spot = this.spotAt(p.worldX, p.worldY);
    if (!spot || spot !== this.active) return;
    const c = this.counters.get(spot);
    if (!c) return;
    const before = c.strokes;
    c.push(p.worldX);
    if (c.strokes !== before) {
      const now = this.h.sc.time.now;
      if (now - this.lastSfx > 60) {
        this.lastSfx = now;
        this.h.perform({ ok: true, perfect: false, reaction: 'ticklish', sfx: 'scrub' });
      }
      this.h.puff(p.worldX, p.worldY, 'scrub');
    }
    // 3번 왕복 = 6획
    if (c.strokes >= CARE.moldRubs * 2) {
      this.active = null;
      this.counters.delete(spot);
      this.h.perform(scrubMold(this.h.ctx(), spot, CARE.moldRubs, CARE.moldRubs));
      this.h.syncProblems();
    }
  }
  override up(): void {
    this.active = null;
    this.brush?.destroy();
    this.brush = undefined;
  }
}

// ---------- 7. 벌레 잡기 ----------
interface Bug {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
}
export class PestTool extends Tool {
  readonly action = 'PEST' as const;
  readonly hint = t('care.hint.pest');
  private bugs: Bug[] = [];
  private caught = 0;
  private missed = 0;
  private combo = 0;
  private timer: Phaser.Time.TimerEvent | undefined;

  override enter(): void {
    const pest = this.h.plant.problems.find((p) => p.kind === 'PEST');
    const n = pest?.n ?? 0;
    if (n === 0) {
      this.h.hint(t('care.noPests'));
      return;
    }
    const b = this.h.body;
    for (let i = 0; i < n; i++) {
      const img = this.own(
        this.h.sc.add
          .image(
            b.x + Phaser.Math.Between(4, b.width - 4),
            b.y + Phaser.Math.Between(4, b.height),
            'icon:bug',
          )
          .setDepth(40),
      );
      this.bugs.push({ img, vx: Phaser.Math.Between(-30, 30), vy: Phaser.Math.Between(-30, 30) });
    }
  }
  override update(_t: number, delta: number): void {
    const b = Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(this.h.body), 6, 6);
    for (const bug of this.bugs) {
      if (Math.random() < 0.03) {
        bug.vx = Phaser.Math.Between(-36, 36);
        bug.vy = Phaser.Math.Between(-36, 36);
      }
      bug.img.x += (bug.vx * delta) / 1000;
      bug.img.y += (bug.vy * delta) / 1000;
      if (bug.img.x < b.left || bug.img.x > b.right) bug.vx *= -1;
      if (bug.img.y < b.top || bug.img.y > b.bottom) bug.vy *= -1;
      bug.img.x = Phaser.Math.Clamp(bug.img.x, b.left, b.right);
      bug.img.y = Phaser.Math.Clamp(bug.img.y, b.top, b.bottom);
      bug.img.setPosition(Math.round(bug.img.x), Math.round(bug.img.y));
      bug.img.setFlipX(bug.vx < 0);
    }
  }
  override down(p: Phaser.Input.Pointer): void {
    // 판정 6×6px 보다 넉넉하게(터치 16px 이상): 반지름 10
    const i = this.bugs.findIndex((b) => Math.hypot(b.img.x - p.worldX, b.img.y - p.worldY) <= 10);
    if (i < 0) {
      if (this.bugs.length > 0) {
        this.missed++;
        this.combo = 0;
        this.h.perform({ ok: false, perfect: false, reaction: 'none', sfx: 'ui_error' });
      }
      return;
    }
    const [bug] = this.bugs.splice(i, 1);
    bug.img.destroy();
    this.caught++;
    this.combo++;
    this.h.perform({ ok: true, perfect: false, reaction: 'ticklish', sfx: null });
    this.h.sfx('bug_catch', { pitch: 1 + 0.1 * Math.min(this.combo, 8) });
    this.timer?.remove();
    if (this.bugs.length === 0) this.finish();
    else this.timer = this.h.sc.time.delayedCall(1800, () => this.finish());
  }
  private finish(): void {
    this.timer?.remove();
    if (this.caught === 0) return;
    const r = catchPest(this.h.ctx(), this.caught, this.missed);
    this.caught = 0;
    this.missed = 0;
    this.h.perform(r);
    this.h.syncProblems();
  }
  override leave(): void {
    if (this.caught > 0) this.finish();
    this.timer?.remove();
    this.bugs = [];
    super.leave();
  }
}

// ---------- 8–9. 가지치기 · 모양 다듬기 ----------
export class PruneTool extends Tool {
  readonly action = 'PRUNE' as const;
  readonly hint = t('care.hint.prune');
  private path: Pt[] = [];
  private trail: Phaser.GameObjects.Graphics | undefined;
  private shapes: Phaser.GameObjects.GameObject[] = [];

  override enter(): void {
    this.trail = this.own(this.h.sc.add.graphics().setDepth(75));
    if (this.h.plant.stage >= 4) this.buildShapeChips();
  }
  private buildShapeChips(): void {
    const items: Array<'NEAT' | 'BUSHY' | 'SPIKY'> = ['NEAT', 'BUSHY', 'SPIKY'];
    const c = this.h.tray(
      items.map((id) => ({ id, label: t(`care.shape.${id}`), icon: 'scissors' })),
      (id) => {
        this.h.perform(shape(this.h.ctx(), id as 'NEAT' | 'BUSHY' | 'SPIKY'));
      },
    );
    this.shapes.push(this.own(c));
  }
  override down(p: Phaser.Input.Pointer): void {
    this.path = [{ x: p.worldX, y: p.worldY }];
    // 간편 돌봄 · 숙련 4: 시든 잎을 탭하면 바로 자른다
    if (this.quick()) {
      const w = this.witherAt(p.worldX, p.worldY);
      if (w) {
        this.path = [];
        this.h.perform(prune(this.h.ctx(), w));
        this.h.syncProblems();
      }
    }
  }
  override move(p: Phaser.Input.Pointer): void {
    if (!p.isDown || this.path.length === 0) return;
    this.path.push({ x: p.worldX, y: p.worldY });
    const g = this.trail;
    if (!g) return;
    g.clear()
      .lineStyle(2, toInt(SPECIAL.PAPER), 1)
      .beginPath()
      .moveTo(this.path[0].x, this.path[0].y);
    for (const q of this.path) g.lineTo(q.x, q.y);
    g.strokePath();
  }
  private witherAt(x: number, y: number): ProblemState | null {
    for (const pr of this.h.plant.problems) {
      if (pr.kind !== 'WITHER') continue;
      const pos = this.h.problemPos(pr);
      if (Math.hypot(pos.x - x, pos.y - y) <= 11) return pr;
    }
    return null;
  }
  override up(): void {
    this.trail?.clear();
    const path = this.path;
    this.path = [];
    if (path.length < 2) return;
    let len = 0;
    for (let i = 1; i < path.length; i++)
      len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    if (len < 18) return;
    const hits: ProblemState[] = [];
    for (const pr of this.h.plant.problems) {
      if (pr.kind !== 'WITHER') continue;
      const pos = this.h.problemPos(pr);
      for (let i = 1; i < path.length; i++) {
        if (
          segmentHitsCircle(path[i - 1].x, path[i - 1].y, path[i].x, path[i].y, pos.x, pos.y, 9)
        ) {
          hits.push(pr);
          break;
        }
      }
    }
    if (hits.length > 0) {
      for (const pr of hits) this.h.perform(prune(this.h.ctx(), pr));
      this.h.syncProblems();
      return;
    }
    // 시든 잎이 아닌 곳을 가로질렀다 → 멀쩡한 잎을 자름
    const crosses = path.some((q) => this.h.body.contains(q.x, q.y));
    if (crosses) this.h.perform(prune(this.h.ctx(), 'HEALTHY'));
  }
}

// ---------- 12. 쓰다듬기 · 18. 수확 ----------
export class HandTool extends Tool {
  readonly action = 'PET' as const;
  readonly hint = t('care.hint.hand');
  private rubbing = false;
  private rubMs = 0;
  private lastMove = 0;
  private lastX = 0;
  private fruit: Phaser.GameObjects.Image[] = [];

  override enter(): void {
    if (this.h.plant.stage >= 5) {
      const b = this.h.body;
      for (let i = 0; i < 3; i++) {
        const img = this.own(
          this.h.sc.add
            .image(b.x + (b.width * (i + 1)) / 4, b.y + 6 + (i % 2) * 8, 'hub:sparkle')
            .setDepth(60),
        );
        img.setScale(2);
        this.h.sc.tweens.add({
          targets: img,
          y: img.y - 3,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        img.setInteractive({ useHandCursor: true });
        img.on('pointerdown', () => this.harvestNow());
        this.fruit.push(img);
      }
      this.h.hint(t('care.hint.harvest'));
    }
  }
  private harvestNow(): void {
    const r = harvest(this.h.ctx());
    this.h.perform(r);
    if (r.ok) {
      for (const f of this.fruit) f.destroy();
      this.fruit = [];
    }
  }
  override down(p: Phaser.Input.Pointer): void {
    if (!this.h.overPlant(p.worldX, p.worldY, 6)) return;
    if (this.quick()) {
      this.h.perform(pet(this.h.ctx(), 1.6));
      this.h.puff(p.worldX, p.worldY - 8, 'heart');
      return;
    }
    this.rubbing = true;
    this.rubMs = 0;
    this.lastX = p.worldX;
    this.lastMove = this.h.sc.time.now;
    this.h.perform({ ok: true, perfect: false, reaction: 'ticklish', sfx: null });
  }
  override move(p: Phaser.Input.Pointer): void {
    if (!this.rubbing) return;
    if (!this.h.overPlant(p.worldX, p.worldY, 6)) return;
    const now = this.h.sc.time.now;
    if (Math.abs(p.worldX - this.lastX) >= 1) {
      this.rubMs += Math.min(120, now - this.lastMove);
      this.lastX = p.worldX;
      if (Math.floor(this.rubMs / 300) !== Math.floor((this.rubMs - 60) / 300))
        this.h.puff(p.worldX, p.worldY - 10, 'heart');
    }
    this.lastMove = now;
    if (this.rubMs >= 1500) {
      this.rubMs = 0;
      this.h.perform(pet(this.h.ctx(), 1.5));
    }
  }
  override up(): void {
    this.rubbing = false;
    this.rubMs = 0;
  }
  override leave(): void {
    this.fruit = [];
    super.leave();
  }
}

// ---------- 13. 말 걸기 ----------
export class TalkTool extends Tool {
  readonly action = 'TALK' as const;
  readonly hint = t('care.hint.talk');
  override enter(): void {
    const phrases: Phrase[] = ['CHEER', 'PRAISE', 'BATTLE', 'COMFORT'];
    const c = this.h.tray(
      phrases.map((id) => ({ id, label: t(`care.phrase.${id}`), icon: 'speech' })),
      (id) => {
        const r = talk(this.h.ctx(), id as Phrase);
        this.h.perform(r);
        const mood = (r.info?.mood as number | undefined) ?? 0;
        this.h.answer(mood >= 12 ? '♥' : mood >= 8 ? '!' : mood > 0 ? '♪' : '…');
      },
    );
    this.own(c);
  }
}
