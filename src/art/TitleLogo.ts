// 타이틀 로고 '점선정원' (10문서 1-3절): 글자마다 따로 굽고(떨어지며 등장 · 물결처럼 흔들림),
// 정 · 원 의 ㅇ 자리는 깜빡이는 '점 눈'이 된다. 이름 그대로 점(눈) 두 개가 있는 얼굴 글씨.
// 색: 위는 종이색 → 노랑 → 주황으로 내려가는 띠, 1px 보라 외곽선, 오른쪽 아래 분홍 그림자. 팔레트 색만 쓴다.

import { PixelCanvas } from './PixelCanvas';
import { LOGO_EYES, LOGO_GLYPHS } from './logoGlyphs';
import { RAMPS, SPECIAL } from './palette';

/** 글자 캔버스 여백: 외곽선 1px(왼 · 위) + 외곽선 · 그림자(오른 · 아래) */
export const LOGO_PAD = 1;
const SHADOW = RAMPS.R6[1];
const OUTLINE = RAMPS.R5[0];
const BANDS = [
  SPECIAL.PAPER,
  RAMPS.R9[4],
  RAMPS.R9[4],
  RAMPS.R9[3],
  RAMPS.R9[3],
  RAMPS.R8[3],
  RAMPS.R8[2],
];

export interface LogoGlyph {
  key: string;
  w: number;
  h: number;
}

function masked(rows: readonly string[]): (x: number, y: number) => boolean {
  return (x, y) => y >= 0 && y < rows.length && x >= 0 && x < rows[0].length && rows[y][x] === '#';
}

/** 그림자 → 외곽선 → 채우기(가로 띠 그라데이션 + 윗면 하이라이트) */
function paintShape(
  c: PixelCanvas,
  on: (x: number, y: number) => boolean,
  w: number,
  h: number,
): void {
  const ox = LOGO_PAD;
  const oy = LOGO_PAD;
  for (let y = -1; y <= h + 2; y++)
    for (let x = -1; x <= w + 2; x++) {
      if (on(x, y)) continue;
      if (on(x - 1, y - 2) || on(x - 1, y - 1) || on(x, y - 2)) c.px(ox + x, oy + y, SHADOW);
    }
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++) {
      if (on(x, y)) continue;
      if (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1))
        c.px(ox + x, oy + y, OUTLINE);
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      let color = BANDS[Math.min(BANDS.length - 1, Math.floor((y * BANDS.length) / h))];
      if (!on(x, y - 1)) color = SPECIAL.PAPER;
      else if (!on(x, y + 1)) color = RAMPS.R8[1];
      c.px(ox + x, oy + y, color);
    }
}

/** 글자 하나를 굽는다 */
export function buildLogoGlyph(index: number): PixelCanvas {
  const rows = LOGO_GLYPHS[index];
  const w = rows[0].length;
  const h = rows.length;
  const c = new PixelCanvas(w + LOGO_PAD + 3, h + LOGO_PAD + 3);
  paintShape(c, masked(rows), w, h);
  return c;
}

/** 눈 점(꽉 찬 타원) 또는 감은 눈(가로선). ㅇ 을 채워 '점'으로 만든 것이라 글자와 같은 재질로 굽는다 */
export function buildLogoEye(closed: boolean): PixelCanvas {
  const rx = 5;
  const w = rx * 2 + 1;
  const h = closed ? 3 : 9;
  const on = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    if (closed) return true;
    const dx = (x - rx) / (rx + 0.4);
    const dy = (y - (h - 1) / 2) / ((h - 1) / 2 + 0.4);
    return dx * dx + dy * dy <= 1;
  };
  const c = new PixelCanvas(w + LOGO_PAD + 3, h + LOGO_PAD + 3);
  paintShape(c, on, w, h);
  return c;
}

/** '점' 머리 위의 떡잎 두 장(살랑 흔들리는 프레임 2개) */
export function buildLogoSprout(frame: 0 | 1): PixelCanvas {
  const rows =
    frame === 0
      ? [
          '..ll....LL..',
          '.lll...LLL..',
          '.lll..LLL...',
          '..ll.LL.....',
          '....ss......',
          '....ss......',
          '....ss......',
        ]
      : [
          '.ll.....LL..',
          '.lll...LLL..',
          '..ll..LLL...',
          '...l.LL.....',
          '....ss......',
          '....ss......',
          '....ss......',
        ];
  const w = rows[0].length;
  const h = rows.length;
  const on = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.';
  const c = new PixelCanvas(w + 2, h + 2);
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++)
      if (!on(x, y) && (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1)))
        c.px(x + 1, y + 1, RAMPS.R1[0]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      const color = ch === 's' ? RAMPS.R1[2] : ch === 'l' ? RAMPS.R1[3] : RAMPS.R1[4];
      c.px(x + 1, y + 1, on(x, y - 1) ? color : RAMPS.R1[4]);
    }
  return c;
}

/** 부제 띠(리본): 가운데 띠 + 뒤로 접힌 양 끝 꼬리(끝이 V 자로 파임) */
export function buildRibbon(w: number): PixelCanvas {
  const h = 15;
  const tail = 9;
  const W = w + tail * 2 + 2;
  const c = new PixelCanvas(W, h + 6);
  const mid = 5 + Math.floor((h - 3) / 2);
  for (const left of [true, false]) {
    const x0 = left ? 0 : W - tail;
    c.rect(x0, 5, tail, h - 2, RAMPS.R1[1]);
    c.hline(x0, 5, tail, RAMPS.R1[2]);
    c.hline(x0, 5 + h - 3, tail, RAMPS.R1[0]);
    for (let i = 0; i < 4; i++) {
      const x = left ? x0 + i : x0 + tail - 1 - i;
      c.erase(x, mid - (3 - i), 1, (3 - i) * 2 + 1);
    }
    // 접힌 자리 그림자
    c.rect(left ? tail - 1 : W - tail - 1, h, 2, 4, RAMPS.R1[0]);
  }
  const x0 = tail - 1;
  c.rect(x0 - 1, 0, w + 6, h + 2, RAMPS.R1[0]);
  c.rect(x0, 1, w + 4, h, RAMPS.R1[2]);
  c.hline(x0, 1, w + 4, RAMPS.R1[4]);
  c.hline(x0, 2, w + 4, RAMPS.R1[3]);
  c.hline(x0, h, w + 4, RAMPS.R1[1]);
  return c;
}

export const LOGO_EYE_SPOTS = LOGO_EYES;
export const LOGO_COUNT = LOGO_GLYPHS.length;
