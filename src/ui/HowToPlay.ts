// '게임 방법' 창: 키우기 → 지키기 → 모으기 세 칸 그림 설명(01문서 4절 핵심 루프).
// 타이틀 버튼 · 새 게임 시작 직후 · 정원 목표 패널의 '?' 에서 연다. 그림은 팔레트 색으로 직접 굽는다.

import type Phaser from 'phaser';
import { PixelCanvas } from '../art/PixelCanvas';
import { RAMPS, SPECIAL } from '../art/palette';
import { t } from '../i18n';
import { ensurePanel } from './Frames';
import type { ModalDef } from './Modal';
import { pixelText } from './PixelText';

const PANEL_W = 136;
const CARD_H = 178;
const ART_W = 120;
const ART_H = 56;

/** 점 눈 두 개 + 선 입(02문서 5절)을 몸 위에 찍는다 */
function face(
  c: PixelCanvas,
  x: number,
  y: number,
  spread: number,
  mouth: number,
  ink: string,
): void {
  c.px(x, y, ink).px(x + spread, y, ink);
  c.hline(x + Math.floor((spread - mouth) / 2) + 1, y + 2, mouth, ink);
}

function grass(c: PixelCanvas, top: number): void {
  c.rect(0, top, ART_W, ART_H - top, RAMPS.R1[2]);
  for (let x = 1; x < ART_W; x += 5) c.vline(x, top - 1, 2, RAMPS.R1[3]);
}

/** 1. 키우기: 화분 속 새싹 + 물뿌리개 물줄기 + 하트 */
function artGrow(): PixelCanvas {
  const c = new PixelCanvas(ART_W, ART_H);
  c.rect(0, 0, ART_W, ART_H, RAMPS.R4[4]);
  c.rect(0, 44, ART_W, 12, RAMPS.R10[3]);
  c.hline(0, 44, ART_W, RAMPS.R10[4]);
  // 화분
  c.rect(42, 34, 24, 12, RAMPS.R7[2]).hline(40, 32, 28, RAMPS.R7[3]).hline(40, 33, 28, RAMPS.R7[2]);
  c.rect(44, 46, 20, 2, RAMPS.R7[1]);
  c.hline(43, 34, 22, RAMPS.R10[1]);
  // 새싹 몸통(동글) + 떡잎
  c.vline(54, 22, 12, RAMPS.R1[1]);
  c.disc(54, 21, 8, RAMPS.R1[2]);
  c.disc(52, 19, 5, RAMPS.R1[3]);
  c.rect(40, 10, 8, 4, RAMPS.R1[3]).rect(60, 9, 8, 4, RAMPS.R1[3]);
  face(c, 48, 20, 12, 9, SPECIAL.INK);
  // 물뿌리개 + 물줄기
  c.rect(84, 8, 18, 12, RAMPS.R4[2]).rect(84, 8, 18, 2, RAMPS.R4[3]);
  for (let i = 0; i < 9; i++) c.px(83 - i, 12 + Math.floor(i / 2), RAMPS.R4[1]);
  c.rect(100, 4, 3, 6, RAMPS.R4[1]);
  for (const [x, y] of [
    [70, 20],
    [67, 26],
    [72, 28],
  ] as const)
    c.rect(x, y, 2, 3, RAMPS.R4[2]).px(x, y, RAMPS.R4[4]);
  // 하트
  c.rect(24, 10, 3, 2, RAMPS.R7[3]).rect(28, 10, 3, 2, RAMPS.R7[3]);
  c.rect(23, 12, 9, 2, RAMPS.R7[3]).rect(25, 14, 5, 2, RAMPS.R7[3]).rect(27, 16, 1, 1, RAMPS.R7[3]);
  return c;
}

/** 2. 지키기: 길을 따라 오는 잿빛 적 → 길가에 심은 식물이 공격 → 오른쪽 끝 어미나무 뿌리 */
function artDefend(): PixelCanvas {
  const c = new PixelCanvas(ART_W, ART_H);
  grass(c, 0);
  // 길
  c.rect(0, 30, ART_W, 12, RAMPS.R10[3])
    .hline(0, 30, ART_W, RAMPS.R10[2])
    .hline(0, 41, ART_W, RAMPS.R10[2]);
  for (let x = 6; x < ART_W - 18; x += 14)
    c.rect(x, 35, 4, 2, RAMPS.R9[4]).px(x + 4, 36, RAMPS.R9[4]);
  // 어미나무 뿌리(출구)
  c.rect(108, 18, 6, 22, RAMPS.R10[1]).rect(102, 36, 18, 4, RAMPS.R10[1]);
  c.disc(111, 12, 9, RAMPS.R1[1]).disc(109, 10, 5, RAMPS.R1[3]);
  // 적(잿빛 덩어리, 사선 눈)
  c.disc(22, 34, 6, RAMPS.R12[2]).disc(21, 33, 4, RAMPS.R12[3]);
  c.px(18, 31, RAMPS.R7[4]).px(19, 32, RAMPS.R7[4]).px(25, 32, RAMPS.R7[4]).px(26, 31, RAMPS.R7[4]);
  c.hline(19, 36, 6, RAMPS.R7[4]);
  // 식물(선인장) + 가시 투사체
  c.rect(52, 8, 10, 16, RAMPS.R2[2])
    .rect(52, 8, 3, 16, RAMPS.R2[3])
    .rect(50, 22, 14, 4, RAMPS.R7[2]);
  face(c, 53, 13, 7, 6, SPECIAL.INK);
  for (let i = 0; i < 3; i++)
    c.px(44 - i * 6, 22 + i * 3, RAMPS.R2[4]).px(43 - i * 6, 22 + i * 3, RAMPS.R2[3]);
  // 하트(지켜야 할 것)
  c.rect(96, 2, 2, 2, RAMPS.R7[3])
    .rect(99, 2, 2, 2, RAMPS.R7[3])
    .rect(95, 4, 7, 2, RAMPS.R7[3])
    .rect(97, 6, 3, 1, RAMPS.R7[3]);
  return c;
}

/** 3. 모으기: 씨앗 봉투 + 영양제 + 별(등급 빛) */
function artCollect(): PixelCanvas {
  const c = new PixelCanvas(ART_W, ART_H);
  c.rect(0, 0, ART_W, ART_H, RAMPS.R5[1]);
  for (let i = 0; i < 26; i++)
    c.px((i * 37) % ART_W, (i * 23) % ART_H, i % 3 === 0 ? SPECIAL.STARGOLD : RAMPS.R5[3]);
  // 봉투
  c.rect(20, 12, 30, 36, RAMPS.R6[3])
    .rect(20, 12, 30, 6, RAMPS.R6[4])
    .frame(19, 11, 32, 38, RAMPS.R6[1]);
  for (let x = 20; x < 50; x += 4) c.px(x, 17, RAMPS.R6[1]).px(x + 2, 16, RAMPS.R6[1]);
  c.disc(35, 32, 6, SPECIAL.CREAM);
  c.rect(33, 28, 4, 8, RAMPS.R1[2]).px(34, 27, RAMPS.R1[3]);
  // 영양제 앰플
  c.rect(62, 22, 10, 22, RAMPS.R1[2])
    .rect(62, 22, 3, 22, RAMPS.R1[3])
    .rect(64, 16, 6, 6, SPECIAL.CREAM);
  c.frame(61, 21, 12, 24, RAMPS.R1[0]);
  // 큰 별
  const star = [
    '....x....',
    '...xxx...',
    'xxxxxxxxx',
    '.xxxxxxx.',
    '..xxxxx..',
    '.xxx.xxx.',
    'xx.....xx',
  ];
  c.stamp(84, 18, star, { x: SPECIAL.STARGOLD });
  c.stamp(98, 6, ['.x.', 'xxx', '.x.'], { x: SPECIAL.PAPER });
  c.stamp(80, 40, ['.x.', 'xxx', '.x.'], { x: RAMPS.R9[4] });
  return c;
}

function artTexture(scene: Phaser.Scene, key: string, make: () => PixelCanvas): string {
  if (!scene.textures.exists(key)) make().toTexture(scene, key);
  return key;
}

/** '게임 방법' 모달. onDone 은 '알겠어요'를 눌렀을 때 */
export function howToPlayModal(onDone?: () => void): ModalDef {
  return {
    title: t('howto.title'),
    width: PANEL_W * 3 + 56,
    buttons: [{ label: t('howto.ok'), variant: 'primary', onClick: onDone }],
    build: (scene, parent, top, width) => {
      const steps = [
        { art: artTexture(scene, 'howto:grow', artGrow), id: 'grow', color: RAMPS.R1[2] },
        { art: artTexture(scene, 'howto:defend', artDefend), id: 'defend', color: RAMPS.R7[2] },
        { art: artTexture(scene, 'howto:collect', artCollect), id: 'collect', color: RAMPS.R5[2] },
      ];
      const gap = 12;
      const x0 = Math.round((width - (PANEL_W * 3 + gap * 2)) / 2);
      let maxH = 0;
      steps.forEach((s, i) => {
        const x = x0 + i * (PANEL_W + gap);
        const card = scene.add
          .image(x, top, ensurePanel(scene, 'leaf', PANEL_W, CARD_H))
          .setOrigin(0, 0);
        const art = scene.add.image(x + 6, top + 6, s.art).setOrigin(0, 0);
        const badge = scene.add
          .image(x + 4, top + 4, ensurePanel(scene, 'wood', 16, 16))
          .setOrigin(0, 0);
        const num = pixelText(scene, x + 12, top + 12, String(i + 1), {
          size: 9,
          bold: true,
          anchorX: 0.5,
          anchorY: 0.5,
        });
        const title = pixelText(scene, x + PANEL_W / 2, top + 68, t(`howto.${s.id}.title`), {
          size: 11,
          bold: true,
          anchorX: 0.5,
          color: s.color,
        });
        const body = pixelText(scene, x + 8, top + 86, t(`howto.${s.id}.body`), {
          size: 9,
          wrapWidth: PANEL_W - 16,
        });
        parent.add([card, art, badge, num, title, body]);
        if (i < 2) {
          const arrow = pixelText(scene, x + PANEL_W + gap / 2, top + 34, '▶', {
            size: 9,
            anchorX: 0.5,
            anchorY: 0.5,
            color: RAMPS.R10[2],
          });
          parent.add(arrow);
        }
        maxH = Math.max(maxH, CARD_H);
      });
      const loop = pixelText(scene, width / 2, top + maxH + 6, t('howto.loop'), {
        size: 9,
        anchorX: 0.5,
        color: RAMPS.R10[1],
      });
      parent.add(loop);
      return maxH + 22;
    },
  };
}
