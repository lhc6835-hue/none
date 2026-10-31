// 얼굴 검수기 (02문서 5-2 · 5-6절). 평상시 표정에서 '과장 비율' 규칙을 지키는지 자동으로 판정한다.
// 호스트(얼굴이 붙는 부위)의 폭을 W, 높이를 H 라고 할 때:
//   두 눈 사이 거리 D : D = 2(붙은 눈) 이거나 D ≥ 0.6W(넓은 미간).         금지: 3 ≤ D < 0.6W
//   입 길이 L         : L = 1(점 입) 이거나 L ≥ 0.5W(긴 입).               금지: 2 ≤ L < 0.5W
//   눈-입 세로 간격 V : V = 1(바로 아랫줄) 이거나 V ≥ 0.4H(멀리 떨어짐).   금지: 그 사이
//   호스트 폭 W < 8   : 눈 1개 + 점 입만 허용
//   눈은 외곽선 위가 아니라 몸 안쪽 픽셀에 놓는다. 잉크색은 몸 색과 명도 대비 3:1 이상.
// 예외: F02 · F08 의 입은 몸 밖으로 나가도 되고, F11 은 입이 세로 이음매라 L · V 대신 seam length ≥ 0.5H.

import type { FaceSpec } from '../core/schema';
import { contrast, drawFace, type FaceDot } from './FaceRenderer';
import type { FaceHost } from './PlantSpriteGen';
import type { ColorGrid } from './Shading';
import { SPECIAL } from './palette';

export interface FaceIssue {
  rule:
    | 'D'
    | 'L'
    | 'V'
    | 'small'
    | 'eyeCount'
    | 'eyeOutside'
    | 'mouthOutside'
    | 'eyeOnOutline'
    | 'contrast'
    | 'seam';
  message: string;
}

const MIN_CONTRAST = 3;

export function validateFace(
  spec: FaceSpec,
  host: FaceHost,
  bodyColor: string,
  grid?: ColorGrid,
): FaceIssue[] {
  const issues: FaceIssue[] = [];
  const bad = (rule: FaceIssue['rule'], message: string) => issues.push({ rule, message });
  const dots = drawFace(spec, host, 'default', [0, 0], bodyColor);
  const eyes = dots.filter((d) => d.kind === 'eye');
  const mouth = dots.filter((d) => d.kind === 'mouth');
  const W = host.w;
  const H = host.h;

  if (W === 0 || eyes.length === 0) {
    bad('eyeCount', `host is empty or has no eye (W=${W})`);
    return issues;
  }
  if (eyes.length > 3) bad('eyeCount', `${eyes.length} eyes (max 3)`);

  const inside = (d: FaceDot) => {
    const j = d.y - host.y;
    const s = j >= 0 && j < host.spans.length ? host.spans[j] : null;
    return s !== null && d.x >= s[0] && d.x <= s[1];
  };
  for (const e of eyes)
    if (!inside(e)) bad('eyeOutside', `eye (${e.x},${e.y}) is not on the body interior`);
  const ratio = contrast(bodyColor, dots[0]?.color ?? SPECIAL.INK);
  if (ratio < MIN_CONTRAST)
    bad('contrast', `ink/body contrast ${ratio.toFixed(2)} < ${MIN_CONTRAST}`);
  if (grid) {
    for (const d of dots) {
      const i = d.y * grid.w + d.x;
      if (d.kind === 'eye' && grid.outline[i])
        bad('eyeOnOutline', `eye (${d.x},${d.y}) is on the outline`);
    }
  }

  // 작은 호스트: 눈 1개 + 점 입
  if (W < 8) {
    if (eyes.length !== 1 || mouth.length !== 1)
      bad(
        'small',
        `W=${W} < 8 needs 1 eye + dot mouth, got ${eyes.length} eyes / ${mouth.length}px mouth`,
      );
    return issues;
  }

  const overflowOk = spec.type === 'F02' || spec.type === 'F08';
  if (!overflowOk)
    for (const m of mouth)
      if (!inside(m)) bad('mouthOutside', `mouth (${m.x},${m.y}) is outside the body`);

  // D: 가장 바깥 두 눈 사이
  if (eyes.length >= 2) {
    const xs = eyes.map((e) => e.x);
    const D = Math.max(...xs) - Math.min(...xs);
    if (!(D === 2 || D >= 0.6 * W))
      bad('D', `eye distance D=${D} (allowed: 2 or >=${(0.6 * W).toFixed(1)}, W=${W})`);
  }

  if (spec.type === 'F11') {
    const seam = mouth.length;
    if (seam < 0.5 * H) bad('seam', `seam length ${seam} < 0.5H(${(0.5 * H).toFixed(1)})`);
    return issues;
  }

  // L: 입 길이(가로로 걸친 칸 수)
  const mxs = mouth.map((m) => m.x);
  const L = mxs.length ? Math.max(...mxs) - Math.min(...mxs) + 1 : 0;
  if (!(L === 1 || L >= 0.5 * W))
    bad('L', `mouth length L=${L} (allowed: 1 or >=${(0.5 * W).toFixed(1)}, W=${W})`);

  // V: 입과 가장 가까운 눈 줄 사이의 세로 간격
  const mTop = Math.min(...mouth.map((m) => m.y));
  const eyeYs = eyes.map((e) => e.y);
  const eyeRef = mTop >= Math.min(...eyeYs) ? Math.max(...eyeYs) : Math.min(...eyeYs);
  const V = Math.abs(mTop - eyeRef);
  if (!(V === 1 || V >= 0.4 * H))
    bad('V', `eye-mouth gap V=${V} (allowed: 1 or >=${(0.4 * H).toFixed(1)}, H=${H})`);
  return issues;
}
