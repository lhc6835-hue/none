// 타이틀 로고 화면 객체: 글자 4개가 차례로 떨어져 내려앉고(탄성), 이후 물결처럼 1px씩 흔들린다.
// 정 · 원 의 '점 눈'은 2–4초마다 깜빡이고(가끔 두 번), 커서가 있는 쪽으로 1px 눈길을 준다(02문서 5-5절).
// '점' 머리 위 떡잎은 살랑거리고, 부제는 초록 리본 위에 얹혀 아래에서 올라온다.

import Phaser from 'phaser';
import { LOGO_GLYPHS } from '../art/logoGlyphs';
import { RAMPS, SPECIAL } from '../art/palette';
import {
  buildLogoEye,
  buildLogoGlyph,
  buildLogoSprout,
  buildRibbon,
  LOGO_COUNT,
  LOGO_EYE_SPOTS,
} from '../art/TitleLogo';
import { outlinedText } from '../ui/PixelText';

const GAP = 9;
const EYE_HALF_W = 5;

interface Eye {
  img: Phaser.GameObjects.Image;
  x: number;
  yOpen: number;
  yClosed: number;
}

function ensure(
  scene: Phaser.Scene,
  key: string,
  make: () => { toTexture: (s: Phaser.Scene, k: string) => string },
): string {
  if (!scene.textures.exists(key)) make().toTexture(scene, key);
  return key;
}

export class TitleLogo {
  private readonly letters: Phaser.GameObjects.Container[] = [];
  private readonly eyes: Eye[] = [];
  private sprout: Phaser.GameObjects.Image | undefined;
  private landed = false;
  private closedUntil = 0;
  private nextBlink = 0;
  private doubleAt = 0;
  private readonly top: number;

  constructor(
    private readonly scene: Phaser.Scene,
    cx: number,
    top: number,
    subtitle: string,
  ) {
    this.top = top;
    for (let i = 0; i < LOGO_COUNT; i++) ensure(scene, `logo:g${i}`, () => buildLogoGlyph(i));
    ensure(scene, 'logo:eye', () => buildLogoEye(false));
    ensure(scene, 'logo:eyeClosed', () => buildLogoEye(true));
    ensure(scene, 'logo:sprout0', () => buildLogoSprout(0));
    ensure(scene, 'logo:sprout1', () => buildLogoSprout(1));

    const widths = LOGO_GLYPHS.map((g) => g[0].length);
    const total = widths.reduce((a, b) => a + b, 0) + GAP * (LOGO_COUNT - 1);
    let x = Math.round(cx - total / 2);
    for (let i = 0; i < LOGO_COUNT; i++) {
      const box = scene.add.container(x, -70).setDepth(20);
      box.add(scene.add.image(-1, -1, `logo:g${i}`).setOrigin(0, 0));
      for (const spot of LOGO_EYE_SPOTS.filter((e) => e.glyph === i)) {
        const ex = Math.round(spot.cx - EYE_HALF_W) - 1;
        const yOpen = Math.round(spot.cy - 4) - 1;
        const img = scene.add.image(ex, yOpen, 'logo:eyeClosed').setOrigin(0, 0);
        this.eyes.push({ img, x: ex, yOpen, yClosed: Math.round(spot.cy - 1) - 1 });
        box.add(img);
      }
      if (i === 0) {
        this.sprout = scene.add.image(3, -10, 'logo:sprout0').setOrigin(0, 0).setVisible(false);
        box.add(this.sprout);
      }
      scene.tweens.add({
        targets: box,
        y: top,
        delay: 160 + i * 110,
        duration: 520,
        ease: 'Back.easeOut',
        onStart: () => scene.time.delayedCall(380, () => this.thud(i)),
      });
      this.letters.push(box);
      x += widths[i] + GAP;
    }
    // 눈은 감은 채로 내려앉았다가, 모두 착지하면 번쩍 뜬다
    for (const e of this.eyes) e.img.setY(e.yClosed);
    scene.time.delayedCall(160 + LOGO_COUNT * 110 + 520, () => {
      this.landed = true;
      this.setEyes(false);
      this.sprout?.setVisible(true);
      this.nextBlink = scene.time.now + 1800;
    });

    // 부제 리본
    const label = outlinedText(scene, 0, 0, subtitle, {
      size: 11,
      bold: true,
      color: SPECIAL.PAPER,
      outline: RAMPS.R1[0],
    });
    const rw = Math.round(label.width) + 16;
    const ribbon = ensure(scene, `logo:ribbon:${rw}`, () => buildRibbon(rw));
    const rimg = scene.add.image(0, 0, ribbon).setOrigin(0.5, 0);
    label.setPosition(Math.round(-label.width / 2), 2);
    const rbox = scene.add.container(cx, top + 62, [rimg, label]).setDepth(19);
    rbox.setVisible(false);
    scene.time.delayedCall(160 + LOGO_COUNT * 110 + 300, () => {
      rbox.setVisible(true);
      scene.tweens.add({ targets: rbox, y: top + 50, duration: 260, ease: 'Back.easeOut' });
    });
  }

  /** 글자가 내려앉는 순간 작은 '톡' 소리 대신 살짝 눌리는 느낌(1px) */
  private thud(i: number): void {
    const box = this.letters[i];
    this.scene.tweens.add({ targets: box, scaleY: 0.92, duration: 70, yoyo: true });
  }

  private setEyes(closed: boolean): void {
    for (const e of this.eyes) {
      e.img.setTexture(closed ? 'logo:eyeClosed' : 'logo:eye');
      e.img.setY(closed ? e.yClosed : e.yOpen);
    }
  }

  update(time: number, pointerX: number): void {
    if (!this.landed) return;
    // 물결 흔들림: 정수 1px 단계
    this.letters.forEach((box, i) => {
      box.y = this.top + Math.round(Math.sin(time / 520 + i * 0.85));
    });
    if (this.sprout)
      this.sprout.setTexture(Math.floor(time / 700) % 2 === 0 ? 'logo:sprout0' : 'logo:sprout1');
    // 깜빡임
    if (time >= this.nextBlink) {
      this.closedUntil = time + 110;
      this.doubleAt = Math.random() < 0.25 ? time + 260 : 0;
      this.nextBlink = time + 2200 + Math.random() * 2000;
    }
    if (this.doubleAt && time >= this.doubleAt) {
      this.closedUntil = time + 100;
      this.doubleAt = 0;
    }
    const closed = time < this.closedUntil;
    this.setEyes(closed);
    // 시선: 커서 쪽으로 1px
    for (const e of this.eyes) {
      const parent = e.img.parentContainer;
      const wx = (parent?.x ?? 0) + e.x + EYE_HALF_W;
      const look = Phaser.Math.Clamp(Math.round((pointerX - wx) / 90), -1, 1);
      e.img.setX(e.x + look);
    }
  }
}
