// 점선 얼굴 (02문서 5절): 눈 = 점, 입 = 선. 얼굴은 몸에 그려 넣지 않고 런타임에 덧그린다.
//
//  drawFace(spec, host, 표정, 시선, 몸 색) → 1px 점 목록. 식물 · 적 · NPC 가 같은 레이어를 공유한다.
//  호스트(얼굴이 붙는 부위)는 프레임마다 다르다(숨쉬기 · 흔들림에 얼굴이 그대로 따라간다).
//  호스트 폭이 8 미만이면 눈 1개 + 점 입만 쓴다. 평상시 표정에서 5-2 의 과장 비율을 지킨다.

import type { FaceSpec } from '../core/schema';
import type { FaceHost } from './PlantSpriteGen';
import { RAMPS, SPECIAL, toInt } from './palette';

export type Expression =
  | 'default'
  | 'blink'
  | 'happy'
  | 'excited'
  | 'gulp'
  | 'thirsty'
  | 'hungry'
  | 'ticklish'
  | 'pain'
  | 'sulk'
  | 'sleep'
  | 'surprise'
  | 'shy'
  | 'battle'
  | 'hit'
  | 'faint';

/** 표정 16종 (02문서 5-4) */
export const EXPRESSIONS: readonly Expression[] = [
  'default',
  'blink',
  'happy',
  'excited',
  'gulp',
  'thirsty',
  'hungry',
  'ticklish',
  'pain',
  'sulk',
  'sleep',
  'surprise',
  'shy',
  'battle',
  'hit',
  'faint',
];

export interface FaceDot {
  x: number;
  y: number;
  color: string;
  kind: 'eye' | 'mouth';
}

export interface FaceOptions {
  /** 입이 움직이는 표정의 박자(초). 꿀꺽 150ms 교대 · 배고픔은 천천히 여닫힘 · 놀람은 처음 200ms 큰 눈 */
  time?: number;
  /** 전투에서 공격하는 순간(입이 '='로 벌어짐) */
  attacking?: boolean;
  /** 적 얼굴: 어두운 몸에는 종이색 대신 #f8a577 을 쓴다 */
  enemy?: boolean;
}

type Pt = [number, number];

const luminance = (hex: string): number => {
  const n = toInt(hex);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** 밝은 몸에는 잉크, 어두운 몸에는 종이(적은 #f8a577)를 자동으로 고른다(대비 3:1 이상, 02문서 5-1 4항) */
export function inkFor(bodyColor: string, enemy = false): string {
  const dark = enemy ? RAMPS.R7[4] : SPECIAL.PAPER;
  return contrast(bodyColor, SPECIAL.INK) >= contrast(bodyColor, dark) ? SPECIAL.INK : dark;
}

function spanAt(host: FaceHost, y: number): [number, number] | null {
  const j = y - host.y;
  return j >= 0 && j < host.spans.length ? host.spans[j] : null;
}

function widthAt(host: FaceHost, y: number): number {
  const s = spanAt(host, y);
  return s ? s[1] - s[0] + 1 : 0;
}

interface Layout {
  eyes: Pt[];
  /** 기본 입(평상시): 점 목록 */
  mouth: Pt[];
  mouthRow: number;
  /** 입 가운데 x · 길이 · 가로 입인지(F11 은 세로) */
  mouthCx: number;
  mouthLen: number;
  vertical: boolean;
  /** 입이 몸 밖으로 나가도 되는 유형(F02 · F08) */
  mayOverflow: boolean;
}

/** 평상시 얼굴 배치. 12가지 유형(02문서 5-3)과 미세 조정값(eyeSpread · mouthLen · offset)을 반영한다. */
export function layoutFace(spec: FaceSpec, host: FaceHost): Layout {
  const W = host.w;
  const H = host.h;
  const off = spec.offset ?? [0, 0];
  const top = host.y;
  const bottom = host.y + H - 1;
  const spread = spec.eyeSpread ?? 0.8;
  const mouthK = spec.mouthLen ?? 0.9;
  const center = (y: number): number => {
    const s = spanAt(host, y);
    return s ? Math.round((s[0] + s[1]) / 2) : host.x + Math.floor(W / 2);
  };

  // 작은 호스트(W < 8): 눈 1개 + 점 입. 눈 줄과 바로 아랫줄이 모두 몸 안쪽인 첫 자리를 찾는다.
  if (W < 8 || H < 2) {
    let eyeRow = top;
    for (let y = top; y < bottom; y++) {
      if (spanAt(host, y) && spanAt(host, y + 1)) {
        eyeRow = y;
        break;
      }
    }
    const mouthRow = Math.min(bottom, eyeRow + 1);
    return {
      eyes: [[center(eyeRow), eyeRow]],
      mouth: [[center(mouthRow), mouthRow]],
      mouthRow,
      mouthCx: center(mouthRow),
      mouthLen: 1,
      vertical: false,
      mayOverflow: false,
    };
  }

  const type = spec.type;
  const dMin = Math.ceil(0.6 * W);
  const wide = ['F01', 'F02', 'F06', 'F07', 'F09', 'F10', 'F11', 'F12'].includes(type);
  const baseLen = Math.max(Math.ceil(0.5 * W), Math.round(W * (0.45 + 0.4 * mouthK)));
  const far = type === 'F03' || type === 'F09'; // 눈에서 멀리 떨어진 입
  const gap = far ? Math.max(2, Math.ceil(0.4 * H)) : 1; // 눈 줄 → 입 줄
  const lowerEye = type === 'F06' ? 1 : 0; // 짝짝이: 오른쪽 눈이 한 줄 아래
  const seam = Math.max(Math.ceil(0.5 * H), 3);
  const needEye = wide ? dMin + (type === 'F06' ? 3 : 1) : 4;
  const needMouth =
    type === 'F03' || type === 'F11' ? 1 : type === 'F02' || type === 'F08' ? 3 : baseLen;
  const mouthRowOf = (y: number): number => (type === 'F07' ? y - gap : y + lowerEye + gap);

  // 눈 줄 고르기: 눈이 들어갈 폭 · 입이 들어갈 폭을 함께 만족하는 줄 중 원하는 높이에 가장 가까운 것
  const want = far ? top + 1 : top + Math.round(H * 0.32) + off[1];
  const pick = (eyeW: number, mouthW: number): number => {
    let best = -1;
    let bestScore = Infinity;
    for (let y = top + 1; y <= bottom - 1; y++) {
      const m = mouthRowOf(y);
      if (m < top || m > bottom) continue;
      if (type === 'F11' && y + seam > bottom + 1) continue;
      if (widthAt(host, y) < eyeW || widthAt(host, y + lowerEye) < eyeW) continue;
      if (type !== 'F11' && widthAt(host, m) < mouthW) continue;
      const score = Math.abs(y - want);
      if (score < bestScore) {
        bestScore = score;
        best = y;
      }
    }
    return best;
  };
  let row = pick(needEye, needMouth);
  if (row < 0) row = pick(needEye, 1);
  if (row < 0) row = pick(4, 1);
  if (row < 0) row = Math.min(bottom - 1, Math.max(top + 1, want));

  const s = spanAt(host, row) ?? [host.x, host.x + W - 1];
  const inset = s[1] - s[0] + 1 >= (wide ? dMin : 2) + 3 ? 1 : 0;
  const lo = s[0] + inset;
  const hi = s[1] - inset;
  const D = Math.min(wide ? Math.max(dMin, Math.round(W * (0.45 + 0.5 * spread))) : 2, hi - lo);
  const mid = (lo + hi) / 2 + off[0];

  let eyes: Pt[];
  switch (type) {
    case 'F05': // 외눈
      eyes = [[Math.round(mid), row]];
      break;
    case 'F08': // 옆얼굴: 오른쪽으로 쏠린 붙은 눈
      eyes = [
        [hi - 3, row],
        [hi - 1, row],
      ];
      break;
    case 'F12': // 세눈: 양 끝과 가운데(최대 3개)
      eyes = [
        [lo, row],
        [Math.round((lo + hi) / 2), row],
        [hi, row],
      ];
      break;
    case 'F06': {
      const r2 = row + 1;
      const s2 = spanAt(host, r2) ?? s;
      // 두 줄의 구간이 어긋나도(윗부분 흔들림) 간격 D ≥ 0.6W 를 지키도록 여유를 둔다
      const x1 = Math.max(s[0], Math.min(lo, s2[1] - dMin - 1));
      eyes = [
        [x1, row],
        [Math.min(s2[1], x1 + dMin + 1), r2],
      ];
      break;
    }
    case 'F09': // 분리형: 위쪽 양 끝
      eyes = [
        [lo, row],
        [hi, row],
      ];
      break;
    case 'F04': // 붙은 눈(사이에 1px)
      eyes = [
        [Math.round(mid) - 1, row],
        [Math.round(mid) + 1, row],
      ];
      break;
    default: {
      const x1 = Math.round(mid - D / 2);
      eyes = [
        [x1, row],
        [x1 + D, row],
      ];
    }
  }

  // ---- 입 ----
  if (type === 'F11') {
    // 세로 입: 눈 줄에서 시작해 아래로 이어지는 이음매
    const cx = Math.round((s[0] + s[1]) / 2);
    const pts: Pt[] = [];
    for (let i = 0; i < seam && row + i <= bottom; i++) pts.push([cx, row + i]);
    return {
      eyes,
      mouth: pts,
      mouthRow: row,
      mouthCx: cx,
      mouthLen: pts.length,
      vertical: true,
      mayOverflow: false,
    };
  }

  const mrow = mouthRowOf(row);
  const msp = spanAt(host, mrow) ?? s;
  const mcx =
    type === 'F08' ? Math.round((lo + hi) / 2) + 1 : Math.round((msp[0] + msp[1]) / 2) + off[0];
  const len =
    type === 'F03'
      ? 1
      : type === 'F09'
        ? Math.max(Math.ceil(0.5 * W), Math.round(W * 0.6))
        : baseLen;
  let mouth: Pt[] = [];
  let mayOverflow = false;
  if (type === 'F02') {
    // 지평선 입: 몸 밖으로 1–2px 나간다
    for (let x = msp[0] - 2; x <= msp[1] + 2; x++) mouth.push([x, mrow]);
    mayOverflow = true;
  } else if (type === 'F08') {
    for (let x = Math.round((msp[0] + msp[1]) / 2); x <= msp[1] + 2; x++) mouth.push([x, mrow]);
    mayOverflow = true;
  } else {
    const l = Math.max(1, Math.min(len, msp[1] - msp[0] + 1));
    const x0 = Math.round(mcx - (l - 1) / 2);
    mouth = [];
    for (let i = 0; i < l; i++)
      mouth.push([x0 + i, type === 'F10' && i % 2 === 1 ? mrow + 1 : mrow]);
  }
  return {
    eyes,
    mouth,
    mouthRow: mrow,
    mouthCx: mcx,
    mouthLen: mouth.length,
    vertical: false,
    mayOverflow,
  };
}

// ---- 눈 모양(눈 중심 기준 상대 좌표) ----
const DOT: Pt[] = [[0, 0]];
const LINE_L: Pt[] = [
  [0, 0],
  [1, 0],
];
const LINE_R: Pt[] = [
  [-1, 0],
  [0, 0],
];
const CARET: Pt[] = [
  [-1, 1],
  [0, 0],
  [1, 1],
];
const GT: Pt[] = [
  [-1, -1],
  [0, 0],
  [-1, 1],
];
const LT: Pt[] = [
  [1, -1],
  [0, 0],
  [1, 1],
];
const BACKSLASH: Pt[] = [
  [-1, -1],
  [0, 0],
  [1, 1],
];
const SLASH: Pt[] = [
  [1, -1],
  [0, 0],
  [-1, 1],
];
const CROSS: Pt[] = [
  [-1, -1],
  [1, -1],
  [0, 0],
  [-1, 1],
  [1, 1],
];
const BIG: Pt[] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

function eyeShape(expr: Expression, index: number, count: number, time: number): Pt[] {
  const left = index < count / 2 || count === 1;
  switch (expr) {
    case 'blink':
    case 'gulp':
    case 'sleep':
    case 'pain':
      return left ? LINE_L : LINE_R;
    case 'happy':
    case 'excited':
      return CARET;
    case 'ticklish':
    case 'hit':
      return left ? GT : LT;
    case 'battle':
      return left ? BACKSLASH : SLASH;
    case 'faint':
      return CROSS;
    case 'surprise':
      return time < 0.2 ? BIG : DOT;
    default:
      return DOT;
  }
}

/** 표정에 따른 눈 위치 보정(아래 · 옆으로 시선) */
function eyeShift(expr: Expression): Pt {
  switch (expr) {
    case 'thirsty':
      return [0, 1];
    case 'sulk':
      return [-1, 1];
    case 'shy':
      return [1, 0];
    default:
      return [0, 0];
  }
}

function mouthShape(expr: Expression, lay: Layout, opts: FaceOptions): Pt[] {
  const t = opts.time ?? 0;
  const base = lay.mouth;
  if (lay.vertical) {
    // 세로 이음매 입(덫): 먹을 때 · 신날 때 · 공격할 때 이음매가 두 줄로 벌어졌다 닫힌다
    const open =
      (expr === 'hungry' && Math.sin(t * 2.2) > 0) ||
      (expr === 'gulp' && Math.floor(t / 0.15) % 2 === 1) ||
      expr === 'excited' ||
      (opts.attacking === true && expr === 'battle');
    return open ? [...base, ...base.map(([x, y]): Pt => [x + 1, y])] : base;
  }
  const row = lay.mouthRow;
  const cx = lay.mouthCx;
  const xs = base.map((p) => p[0]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const line = (a: number, b: number, r: number): Pt[] => {
    const out: Pt[] = [];
    for (let x = a; x <= b; x++) out.push([x, r]);
    return out;
  };
  const equals = (a: number, b: number): Pt[] => [...line(a, b, row), ...line(a, b, row + 1)];
  const smile = (a: number, b: number): Pt[] => {
    const out = line(a, b, row);
    if (b - a >= 2) {
      out[0] = [a, row - 1];
      out[out.length - 1] = [b, row - 1];
    }
    return out;
  };
  if (opts.attacking && expr === 'battle') return equals(x0, x1);
  switch (expr) {
    case 'happy':
      return smile(x0, x1);
    case 'excited':
      return smile(x0 - 1, x1 + 1);
    case 'gulp':
      return Math.floor(t / 0.15) % 2 === 0 ? line(x0, x1, row) : equals(x0, x1);
    case 'hungry':
      return Math.sin(t * 2.2) > 0 ? equals(x0, x1) : line(x0, x1, row);
    case 'thirsty':
    case 'ticklish':
    case 'pain':
    case 'hit': {
      const len = expr === 'thirsty' ? Math.max(3, Math.round(base.length / 2)) : base.length;
      const a = Math.round(cx - (len - 1) / 2);
      const out: Pt[] = [];
      for (let i = 0; i < len; i++) out.push([a + i, i % 2 === 1 ? row + 1 : row]);
      return out;
    }
    case 'sulk': {
      const out = line(x0, x1, row);
      if (out.length >= 3) {
        out[0] = [x0, row + 1];
        out[out.length - 1] = [x1, row + 1];
      }
      return out;
    }
    case 'sleep':
    case 'surprise':
      return [[cx, row]];
    case 'shy':
      return line(cx, cx + 1, row);
    default:
      return base;
  }
}

/**
 * 얼굴 점 목록을 만든다.
 * @param bodyColor 눈 · 입이 놓일 몸 색(잉크 선택용)
 * @param look 시선 방향 [-1|0|1, -1|0|1]. 눈이 최대 1px 움직인다(몸 안쪽일 때만)
 */
export function drawFace(
  spec: FaceSpec,
  host: FaceHost,
  expr: Expression,
  look: readonly [number, number],
  bodyColor: string,
  opts: FaceOptions = {},
): FaceDot[] {
  const ink = inkFor(bodyColor, opts.enemy);
  const lay = layoutFace(spec, host);
  const inside = (x: number, y: number): boolean => {
    const s = spanAt(host, y);
    return s !== null && x >= s[0] && x <= s[1];
  };
  const dots: FaceDot[] = [];
  const seen = new Set<string>();
  const add = (x: number, y: number, kind: FaceDot['kind']) => {
    const key = `${x},${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    dots.push({ x, y, color: ink, kind });
  };
  const shift = eyeShift(expr);
  const time = opts.time ?? 0;
  lay.eyes.forEach(([ex, ey], i) => {
    // 시선: 몸 안쪽일 때만 최대 1px 움직인다
    let gx = ex + shift[0];
    let gy = ey + shift[1];
    if (look[0] && inside(gx + look[0], gy)) gx += look[0];
    if (look[1] && inside(gx, gy + look[1])) gy += look[1];
    if (!inside(gx, gy)) {
      gx = ex;
      gy = ey;
    }
    for (const [dx, dy] of eyeShape(expr, i, lay.eyes.length, time)) add(gx + dx, gy + dy, 'eye');
  });
  for (const [mx, my] of mouthShape(expr, lay, opts)) {
    if (!lay.mayOverflow && !inside(mx, my)) continue; // 몸 밖으로 새지 않게
    add(mx, my, 'mouth');
  }
  return dots;
}
