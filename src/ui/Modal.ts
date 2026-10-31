// 모달 창 (10문서 2절 "작은 창(모달)은 하나의 UI 오버레이 씬에서 띄운다")
//  열기 160ms(크기 0.9→1 + 페이드, easeOutBack) · 닫기 120ms(easeInCubic)
//  뒤 배경은 알파 대신 디더링 점무늬로 어둡게 한다(팔레트 안의 색만 쓰기 위해).

import Phaser from 'phaser';
import { PixelCanvas } from '../art/PixelCanvas';
import { SPECIAL } from '../art/palette';
import { getApp } from '../scenes/context';
import { Button } from './Button';
import { ensurePanel, type ButtonVariant, type PanelStyle } from './Frames';
import { pixelText } from './PixelText';

export interface ModalButton {
  label: string;
  variant?: ButtonVariant;
  /** false 로 두면 눌러도 창이 닫히지 않는다 */
  closes?: boolean;
  onClick?: () => void;
}

export interface ModalDef {
  title: string;
  body?: string;
  width?: number;
  style?: PanelStyle;
  buttons: ModalButton[];
  /** 본문 아래에 넣을 사용자 정의 내용. 쓴 높이(px)를 돌려준다. */
  build?: (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    top: number,
    width: number,
  ) => number;
}

const PAD = 14; // 테두리(4) + 여백
const DIM_KEY = 'ui:modal-dim';

function ensureDim(scene: Phaser.Scene): string {
  if (scene.textures.exists(DIM_KEY)) return DIM_KEY;
  const c = new PixelCanvas(800, 360);
  for (let y = 0; y < 360; y += 2) for (let x = 0; x < 800; x += 2) c.px(x, y, SPECIAL.INK);
  return c.toTexture(scene, DIM_KEY);
}

export class Modal {
  private root: Phaser.GameObjects.Container | undefined;
  private closing = false;

  constructor(private readonly scene: Phaser.Scene) {}

  get isOpen(): boolean {
    return this.root !== undefined;
  }

  open(def: ModalDef): void {
    if (this.root) this.destroyNow();
    const scene = this.scene;
    const w = def.width ?? 260;
    const inner = w - PAD * 2;

    // 1) 내용 먼저 만들어 높이를 잰다
    const content = scene.add.container(0, 0);
    let y = PAD;
    const title = pixelText(scene, w / 2, y, def.title, {
      size: 14,
      color: SPECIAL.INK,
      anchorX: 0.5,
    });
    content.add(title);
    y += title.height + 6;
    if (def.body) {
      const body = pixelText(scene, w / 2, y, def.body, {
        size: 11,
        anchorX: 0.5,
        align: 'center',
        wrapWidth: inner,
      });
      content.add(body);
      y += body.height + 8;
    }
    if (def.build) {
      const custom = scene.add.container(PAD, 0);
      content.add(custom);
      y += def.build(scene, custom, y, inner) + 8;
    }

    const btnH = 20;
    const count = def.buttons.length;
    const gap = 6;
    const btnW = Math.min(112, Math.floor((inner - gap * (count - 1)) / count));
    const rowW = btnW * count + gap * (count - 1);
    def.buttons.forEach((b, i) => {
      const bx = w / 2 - rowW / 2 + btnW / 2 + i * (btnW + gap);
      const button = new Button(scene, bx, y + btnH / 2, {
        w: btnW,
        h: btnH,
        label: b.label,
        variant: b.variant,
        onClick: () => {
          b.onClick?.();
          if (b.closes !== false) this.close();
        },
      });
      content.add(button);
    });
    y += btnH + 2 + PAD;
    const h = Math.round(y);

    // 2) 패널 · 배경 · 컨테이너 조립
    const panel = scene.add
      .image(0, 0, ensurePanel(scene, def.style ?? 'wood', w, h))
      .setOrigin(0, 0);
    const dim = scene.add.image(-80, 0, ensureDim(scene)).setOrigin(0, 0);
    const blocker = scene.add.zone(-80, 0, 800, 360).setOrigin(0, 0).setInteractive(); // 뒤 클릭 막기
    const holder = scene.add.container(
      Math.round(320 - w / 2) + w / 2,
      Math.round(180 - h / 2) + h / 2,
    );
    panel.setPosition(-w / 2, -h / 2);
    content.setPosition(-w / 2, -h / 2);
    holder.add([panel, content]);

    const root = scene.add.container(0, 0, [dim, blocker, holder]).setDepth(100);
    this.root = root;
    this.closing = false;

    getApp(scene).sfx.play('ui_open');
    holder.setScale(0.9).setAlpha(0);
    scene.tweens.add({ targets: holder, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });
  }

  close(): void {
    const root = this.root;
    if (!root || this.closing) return;
    this.closing = true;
    getApp(this.scene).sfx.play('ui_close');
    const holder = root.list[2] as Phaser.GameObjects.Container;
    this.scene.tweens.add({
      targets: holder,
      scale: 0.9,
      alpha: 0,
      duration: 120,
      ease: 'Cubic.easeIn',
      onComplete: () => this.destroyNow(),
    });
  }

  private destroyNow(): void {
    this.root?.destroy();
    this.root = undefined;
    this.closing = false;
  }
}
