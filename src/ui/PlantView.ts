// 식물 한 그루의 화면 표현: 몸(프레임 아틀라스) + 얼굴 레이어(FaceRenderer 가 런타임에 덧그림).
//  - 대기 4프레임(1.6초 주기 숨쉬기 · 흔들림), 깜빡임은 식물마다 엇갈린 무작위 타이머(02문서 5-5)
//  - 시선 추적: 눈 점이 커서 · 도구 · 적 쪽으로 최대 1px 움직인다
//  - 같은 얼굴 레이어를 식물 · 적 · NPC 가 공유한다(원점은 발밑 중앙)

import Phaser from 'phaser';
import { BlinkTimer } from '../art/Blink';
import { drawFace, type Expression } from '../art/FaceRenderer';
import { SPECIAL, toInt } from '../art/palette';
import type { FrameName, PlantSprite } from '../art/PlantSpriteGen';
import type { Stage } from '../art/bodies/Ctx';
import { PLANT_BASE_BY_ID } from '../data/plants';
import { getApp } from '../scenes/context';

export interface PlantViewOptions {
  speciesId: string;
  /** 0 = 씨앗(흙 위에 씨앗만 보인다) */
  stage: Stage | 0;
  variant?: boolean;
  expression?: Expression;
  /** 식물마다 깜빡임을 엇갈리게 하는 시드(uid) */
  seed?: string;
  /** 실루엣 모드: 몸을 잉크색으로 칠하고 얼굴을 숨긴다 */
  silhouette?: boolean;
  /** 대기 애니메이션 끄기(갤러리 정지 화면 등) */
  still?: boolean;
}

const IDLE_FRAMES: FrameName[] = ['idle0', 'idle1', 'idle2', 'idle3'];
const IDLE_MS = 400;

export class PlantView extends Phaser.GameObjects.Container {
  readonly speciesId: string;
  readonly stage: Stage | 0;
  private readonly bodyImage: Phaser.GameObjects.Image;
  private readonly faceGfx: Phaser.GameObjects.Graphics;
  private readonly sprite: PlantSprite;
  private expression: Expression;
  private look: [number, number] = [0, 0];
  private frame: FrameName = 'idle0';
  private holdFrame: FrameName | null = null;
  private readonly blink: BlinkTimer;
  private exprSince = 0;
  private readonly phase: number;
  private silhouette: boolean;
  private still: boolean;
  private dirty = true;
  private isBlink = false;
  private lastKey = '';

  constructor(scene: Phaser.Scene, x: number, y: number, opts: PlantViewOptions) {
    super(scene, Math.round(x), Math.round(y));
    this.speciesId = opts.speciesId;
    this.stage = opts.stage;
    this.expression = opts.expression ?? 'default';
    this.silhouette = opts.silhouette ?? false;
    this.still = opts.still ?? false;
    this.blink = new BlinkTimer(opts.seed ?? opts.speciesId);
    this.phase = Math.floor(this.blink.firstAt) % 4;

    const { atlas } = getApp(scene);
    if (opts.stage === 0) {
      // 씨앗(단계 0): 흙 위에 씨앗 끝이 살짝 보인다. 얼굴 · 프레임 애니메이션이 없다.
      const base = PLANT_BASE_BY_ID.get(opts.speciesId);
      if (!base) throw new Error(`없는 식물: ${opts.speciesId}`);
      this.sprite = { w: 10, h: 10, translucent: false } as unknown as PlantSprite;
      this.bodyImage = scene.add.image(0, 3, atlas.seed(base.family, base.grade)).setOrigin(0.5, 1);
      this.faceGfx = scene.add.graphics();
      this.add([this.bodyImage, this.faceGfx]);
      this.setSize(10, 10);
      scene.add.existing(this);
      return;
    }
    const tex = atlas.plant(opts.speciesId, opts.stage, opts.variant ?? false);
    atlas.pin(tex.key);
    this.sprite = tex.sprite;
    this.bodyImage = scene.add.image(0, 0, tex.key, 'idle0').setOrigin(0.5, 1);
    this.faceGfx = scene.add.graphics();
    this.add([this.bodyImage, this.faceGfx]);
    this.setSize(tex.sprite.w, tex.sprite.h);
    if (tex.sprite.translucent) this.bodyImage.setAlpha(0.7); // 영혼 계열 몸통만 70%, 얼굴은 100%
    if (this.silhouette) this.bodyImage.setTintFill(toInt(SPECIAL.INK));

    scene.add.existing(this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this);
      atlas.unpin(tex.key);
    });
  }

  /** 지금 눈을 감고 있는가(테스트 · 디버그용) */
  get blinking(): boolean {
    return this.isBlink;
  }

  /** 현재 시선 방향(테스트 · 디버그용) */
  get lookDir(): readonly [number, number] {
    return this.look;
  }

  setExpression(expr: Expression): this {
    if (expr !== this.expression) {
      this.expression = expr;
      this.exprSince = this.scene.time.now;
      this.dirty = true;
    }
    return this;
  }

  /** 시선: 대상의 월드 좌표를 주면 눈이 그쪽으로 최대 1px 움직인다 */
  lookAt(wx: number, wy: number): this {
    const dx = wx - this.x;
    const dy = wy - (this.y - this.sprite.h / 2);
    const next: [number, number] = [
      Math.abs(dx) < 10 ? 0 : Math.sign(dx),
      Math.abs(dy) < 10 ? 0 : Math.sign(dy),
    ];
    if (next[0] !== this.look[0] || next[1] !== this.look[1]) {
      this.look = next;
      this.dirty = true;
    }
    return this;
  }

  /** 프레임을 고정한다(공격 · 피격 · 시듦 · 잠). null 이면 대기 애니메이션으로 돌아간다. */
  hold(frame: FrameName | null): this {
    this.holdFrame = frame;
    this.dirty = true;
    return this;
  }

  setSilhouette(on: boolean): this {
    this.silhouette = on;
    if (on) this.bodyImage.setTintFill(toInt(SPECIAL.INK));
    else this.bodyImage.clearTint();
    this.dirty = true;
    return this;
  }

  private tick(time: number): void {
    if (!this.active) return;
    let frame: FrameName =
      this.holdFrame ?? IDLE_FRAMES[(Math.floor(time / IDLE_MS) + this.phase) % 4];
    if (this.still && !this.holdFrame) frame = 'idle0';
    // 깜빡임: 평소 표정일 때만, 2–6초마다 100ms. 식물마다 타이머가 달라 엇갈린다.
    let expr = this.expression;
    this.isBlink = expr === 'default' && this.blink.isBlinking(time);
    if (this.isBlink) expr = 'blink';
    // 입이 움직이는 표정(꿀꺽 · 배고픔 · 놀람)만 시간에 따라 다시 그린다
    const animated = expr === 'gulp' || expr === 'hungry' || expr === 'surprise';
    const bucket = animated ? Math.floor((time - this.exprSince) / 75) : 0;
    const key = `${frame}|${expr}|${this.look[0]},${this.look[1]}|${bucket}`;
    if (frame !== this.frame) {
      this.frame = frame;
      this.bodyImage.setFrame(frame);
    }
    if (!this.dirty && key === this.lastKey) return;
    this.lastKey = key;
    this.dirty = false;
    this.drawFaceFor(expr, (time - this.exprSince) / 1000);
  }

  private drawFaceFor(expr: Expression, elapsed: number): void {
    const g = this.faceGfx;
    g.clear();
    if (this.silhouette) return;
    const spec = PLANT_BASE_BY_ID.get(this.speciesId)?.look.face;
    const fr = this.sprite.frames[this.frame];
    if (!spec || fr.host.w === 0) return;
    // 얼굴 레이어는 몸 프레임과 같은 좌표계(프레임 왼쪽 위 = (-w/2, -h))
    const ox = -Math.floor(this.sprite.w / 2);
    const oy = -this.sprite.h;
    for (const d of drawFace(spec, fr.host, expr, this.look, fr.bodyColor, { time: elapsed })) {
      g.fillStyle(toInt(d.color), 1);
      g.fillRect(ox + d.x, oy + d.y, 1, 1);
    }
  }
}
