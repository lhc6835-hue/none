// 자동 명암 + 선택적 외곽선 (02문서 3 · 7절)
//  광원은 왼쪽 위 고정: 위 · 왼쪽 면은 3번, 기본면은 2번, 아래 · 오른쪽 면은 1번, 4번은 부위마다 1–2px 하이라이트.
//  외곽선은 1px. 바깥 외곽선은 그 부위 램프의 0번, 부위끼리 맞닿는 경계는 더 어두운 쪽 부위의 1번.
//  순검정 외곽선 금지(램프 0번만 쓴다). 몸통에는 디더링을 쓰지 않는다.

import type { PixelGrid, Role } from './PixelGrid';
import { PAPER_RAMP, type RampSet } from './Ramps';
import { toInt } from './palette';

/** 색이 정해진 격자. 프레임 변형(흔들림 · 번쩍임)은 이 위에서 한다. */
export interface ColorGrid {
  w: number;
  h: number;
  /** '#rrggbb' 또는 null */
  px: (string | null)[];
  /** 외곽선 픽셀 여부(눈은 외곽선 위에 놓일 수 없다) */
  outline: boolean[];
  /** 부위 번호(0 = 없음/외곽선) */
  part: number[];
  /** 각 픽셀이 쓴 램프 역할과 명암 단계(번쩍임 · 시듦 변환용). 외곽선은 tone 0 */
  role: (Role | null)[];
  tone: number[];
}

const luma = (hex: string): number => {
  const n = toInt(hex);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
};

export function emptyColorGrid(w: number, h: number): ColorGrid {
  const n = w * h;
  return {
    w,
    h,
    px: new Array<string | null>(n).fill(null),
    outline: new Array<boolean>(n).fill(false),
    part: new Array<number>(n).fill(0),
    role: new Array<Role | null>(n).fill(null),
    tone: new Array<number>(n).fill(0),
  };
}

export function shade(grid: PixelGrid, ramps: RampSet): ColorGrid {
  const { w, h } = grid;
  const out = emptyColorGrid(w, h);
  const same = (x: number, y: number, part: number) => grid.get(x, y)?.part === part;
  const tones = new Array<number>(w * h).fill(-1);

  // 1) 기본 명암: 같은 부위의 이웃이 없는 쪽이 '면의 가장자리'
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = grid.cells[y * w + x];
      if (!c) continue;
      let t: number;
      if (c.fix === 'h') t = 4;
      else if (c.fix === 'd') t = 1;
      else if (c.fix === 'L') t = 4;
      else {
        const lit = !same(x - 1, y, c.part) || !same(x, y - 1, c.part);
        const dark = !same(x + 1, y, c.part) || !same(x, y + 1, c.part);
        t = lit && !dark ? 3 : dark && !lit ? 1 : 2;
      }
      tones[y * w + x] = t;
    }
  }

  // 2) 부위마다 왼쪽 위에 1–2px 하이라이트(4번)
  const byPart = new Map<number, number[]>();
  grid.cells.forEach((c, i) => {
    if (c && !c.fix) byPart.set(c.part, [...(byPart.get(c.part) ?? []), i]);
  });
  for (const cells of byPart.values()) {
    if (cells.length < 6) continue;
    let best = -1;
    let bestScore = Infinity;
    for (const i of cells) {
      if (tones[i] !== 3) continue;
      const x = i % w;
      const y = Math.floor(i / w);
      // 바깥 가장자리가 아니라 한 칸 안쪽(양옆이 같은 부위)이면서 가장 왼쪽 위에 가까운 3번 칸
      const score = x * 1 + y * 1.25;
      if (tones[i + 1] === 3 || grid.get(x + 1, y)?.part === grid.cells[i]?.part) {
        if (score < bestScore) {
          bestScore = score;
          best = i;
        }
      }
    }
    if (best >= 0) {
      tones[best] = 4;
      if (tones[best + 1] === 3) tones[best + 1] = 4;
    }
  }

  // 3) 색 입히기
  for (let i = 0; i < w * h; i++) {
    const c = grid.cells[i];
    if (!c) continue;
    const ramp = ramps[c.role];
    const t = tones[i];
    out.px[i] = ramp[Math.max(0, Math.min(4, t))];
    out.part[i] = c.part;
    out.role[i] = c.role;
    out.tone[i] = t;
  }

  // 4) 부위 경계: 앞(번호가 큰) 부위와 맞닿은 뒤 부위 픽셀을 두 부위 1번 색 중 더 어두운 쪽으로
  //    (같은 역할끼리는 한 덩어리처럼 보이게 둔다)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = grid.cells[y * w + x];
      if (!c || c.fix === 'L') continue;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ]) {
        const n = grid.get(x + dx, y + dy);
        if (!n || n.part <= c.part || n.role === c.role || n.fix === 'L') continue;
        const a = ramps[c.role][1];
        const b = ramps[n.role][1];
        out.px[y * w + x] = luma(a) <= luma(b) ? a : b;
        out.tone[y * w + x] = 1;
        break;
      }
    }
  }

  // 5) 바깥 외곽선: 빈 칸이 채워진 칸과 4방향으로 맞닿으면 그 부위 램프 0번
  const border: { i: number; color: string }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid.filled(x, y)) continue;
      let pick: { part: number; role: Role } | null = null;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const n = grid.get(x + dx, y + dy);
        if (n && n.fix !== 'L' && (!pick || n.part > pick.part))
          pick = { part: n.part, role: n.role };
      }
      if (pick) border.push({ i: y * w + x, color: ramps[pick.role][0] });
    }
  }
  for (const b of border) {
    out.px[b.i] = b.color;
    out.outline[b.i] = true;
  }
  return out;
}

/** 번쩍임(피격): 모든 픽셀을 자기 램프의 4번 색으로. 외곽선은 3번. (02문서 7절 5) */
export function flash(src: ColorGrid, ramps: RampSet): ColorGrid {
  const out = cloneGrid(src);
  for (let i = 0; i < out.px.length; i++) {
    const role = src.role[i];
    if (src.px[i] === null) continue;
    out.px[i] = role ? (src.outline[i] ? ramps[role][3] : ramps[role][4]) : PAPER_RAMP[4];
  }
  return out;
}

/** 시듦: 채도를 낮춘 램프(주 → 이끼 R2, 나머지 → 돌 R11)로 바꾼다. 명암 단계는 유지. */
export function wilt(src: ColorGrid, dull: RampSet): ColorGrid {
  const out = cloneGrid(src);
  for (let i = 0; i < out.px.length; i++) {
    const role = src.role[i];
    if (src.px[i] === null || !role) continue;
    out.px[i] = dull[role][src.outline[i] ? 0 : src.tone[i]];
  }
  return out;
}

/** 잠: 한 단계 어둡게 */
export function darken(src: ColorGrid, ramps: RampSet): ColorGrid {
  const out = cloneGrid(src);
  for (let i = 0; i < out.px.length; i++) {
    const role = src.role[i];
    if (src.px[i] === null || !role) continue;
    out.px[i] = ramps[role][Math.max(0, (src.outline[i] ? 0 : src.tone[i]) - 1)];
  }
  return out;
}

export function cloneGrid(src: ColorGrid): ColorGrid {
  return {
    w: src.w,
    h: src.h,
    px: [...src.px],
    outline: [...src.outline],
    part: [...src.part],
    role: [...src.role],
    tone: [...src.tone],
  };
}
