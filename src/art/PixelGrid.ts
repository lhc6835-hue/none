// 부위(part) · 역할(role)을 기억하는 픽셀 격자. 스프라이트는 여기에 먼저 '모양'만 찍고,
// 색은 Shading 이 자동 명암으로 정한다(02문서 3 · 7절).
//
// 역할: M 주 램프 · S 보조 램프 · A 강조 램프(없으면 S) · X 특수(별 금 · 오로라 …, 없으면 A)
// 스탬프 문자: . 빈칸 · M S A X 역할 · h 강제 하이라이트 · d 강제 그림자 · L 발광(명암 제외)

export type Role = 'M' | 'S' | 'A' | 'X';
export type Fix = 'h' | 'd' | 'L';

export interface Cell {
  /** 부위 번호(1부터). 같은 번호끼리 한 덩어리로 보고 명암 · 경계를 계산한다 */
  part: number;
  role: Role;
  fix?: Fix;
}

export type Stamp = readonly string[];

const ROLE_CHARS = new Set(['M', 'S', 'A', 'X']);
export const STAMP_CHARS = new Set(['.', 'M', 'S', 'A', 'X', 'h', 'd', 'L']);

export class PixelGrid {
  readonly cells: (Cell | null)[];
  private nextPart = 1;
  /** 그리기 허용 영역(바깥 1px 은 외곽선 자리). 영역 밖에 찍으면 조용히 버린다. */
  private clip: { x0: number; y0: number; x1: number; y1: number };

  constructor(
    readonly w: number,
    readonly h: number,
    margin = 1,
  ) {
    this.cells = new Array<Cell | null>(w * h).fill(null);
    this.clip = { x0: margin, y0: margin, x1: w - 1 - margin, y1: h - 1 - margin };
  }

  /** 새 부위 번호를 받는다 */
  newPart(): number {
    return this.nextPart++;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): Cell | null {
    return this.inside(x, y) ? this.cells[y * this.w + x] : null;
  }

  filled(x: number, y: number): boolean {
    return this.get(x, y) !== null;
  }

  set(x: number, y: number, part: number, role: Role, fix?: Fix): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    const c = this.clip;
    if (xi < c.x0 || xi > c.x1 || yi < c.y0 || yi > c.y1) return;
    this.cells[yi * this.w + xi] = { part, role, fix };
  }

  erase(x: number, y: number): void {
    if (this.inside(x, y)) this.cells[y * this.w + x] = null;
  }

  rect(x: number, y: number, w: number, h: number, part: number, role: Role): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, part, role);
  }

  /** 채워진 타원. 가장자리가 규칙적인 계단이 되도록 행마다 반폭을 계산한다. */
  ellipse(cx: number, cy: number, rx: number, ry: number, part: number, role: Role): void {
    for (let dy = -Math.floor(ry); dy <= Math.floor(ry); dy++) {
      const t = ry === 0 ? 0 : dy / (ry + 0.35);
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)) - 0.15);
      for (let dx = -half; dx <= half; dx++) this.set(cx + dx, cy + dy, part, role);
    }
  }

  /** 볼록 다각형 채우기(행 단위 스캔). 결정 · 덫 같은 각진 모양에 쓴다. */
  polygon(points: readonly [number, number][], part: number, role: Role): void {
    const ys = points.map((p) => p[1]);
    for (let y = Math.ceil(Math.min(...ys)); y <= Math.floor(Math.max(...ys)); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y < y1) || (y1 <= y && y < y0))
          xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
      if (xs.length < 2) continue;
      for (let x = Math.round(Math.min(...xs)); x <= Math.round(Math.max(...xs)); x++)
        this.set(x, y, part, role);
    }
  }

  /** 굵기 t 의 선(브레젠험 + 사각 붓) */
  line(x0: number, y0: number, x1: number, y1: number, part: number, role: Role, t = 1): void {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const ex = Math.round(x1);
    const ey = Math.round(y1);
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.rect(x - Math.floor((t - 1) / 2), y - Math.floor((t - 1) / 2), t, t, part, role);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * 스탬프 찍기. (x, y)는 스탬프의 왼쪽 위. role 을 넘기면 M/S/A/X 칸을 그 역할로 덮어쓴다.
   * 'h' 'd' 'L' 칸은 강제 명암으로 남는다.
   */
  stamp(
    stamp: Stamp,
    x: number,
    y: number,
    part: number,
    opts: { flipX?: boolean; flipY?: boolean; role?: Role; map?: Partial<Record<Role, Role>> } = {},
  ): void {
    const rows = opts.flipY ? [...stamp].reverse() : stamp;
    rows.forEach((row, j) => {
      const chars = opts.flipX ? [...row].reverse() : [...row];
      chars.forEach((ch, i) => {
        if (ch === '.') return;
        if (ROLE_CHARS.has(ch)) {
          const role = opts.role ?? opts.map?.[ch as Role] ?? (ch as Role);
          this.set(x + i, y + j, part, role);
        } else {
          this.set(x + i, y + j, part, opts.role ?? 'M', ch as Fix);
        }
      });
    });
  }

  /** 스탬프의 가로 · 세로 크기 */
  static size(stamp: Stamp): { w: number; h: number } {
    return { w: Math.max(...stamp.map((r) => r.length)), h: stamp.length };
  }

  /** 이웃 없는 1px(고아 픽셀)을 지운다. 발광 'L' 칸은 반짝이일 수 있어 남긴다. */
  removeOrphans(): number {
    let removed = 0;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y * this.w + x];
        if (!c || c.fix === 'L') continue;
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if ((dx || dy) && this.filled(x + dx, y + dy)) neighbors++;
          }
        }
        if (neighbors === 0) {
          this.cells[y * this.w + x] = null;
          removed++;
        }
      }
    }
    return removed;
  }

  /** 채워진 픽셀의 경계 상자 */
  bounds(part?: number): { x: number; y: number; w: number; h: number } | null {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y * this.w + x];
        if (!c || (part !== undefined && c.part !== part)) continue;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  count(): number {
    return this.cells.reduce((n, c) => n + (c ? 1 : 0), 0);
  }
}
