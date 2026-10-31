// 화면 크기 계산 (12문서 2절). 순수 함수라 Phaser 없이 테스트한다.
//
// 논리 높이는 360 고정. 정수 배율 k를 정한 뒤 논리 폭은 clamp(640, floor(창 폭 / k), 800).
// 배율은 '기기 픽셀' 기준 정수로 맞춘다(소수점 DPR에서도 픽셀이 뭉개지지 않게).

export const SAFE_W = 640;
export const SAFE_H = 360;
export const MAX_W = 800;

export interface ScreenLayout {
  /** 정수 배율(기기 픽셀 기준) */
  k: number;
  /** 논리 해상도 폭(640–800) / 높이(360) */
  logicalW: number;
  logicalH: number;
  /** 논리 픽셀 1개가 차지하는 CSS 픽셀 수 (= k / dpr) */
  cssPerPixel: number;
  /** 캔버스의 CSS 크기 */
  cssW: number;
  cssH: number;
  /** 안전 영역(640×360)이 논리 화면 안에서 시작하는 x */
  safeX: number;
}

/** 정수 배율 대비 꽉 채우기가 이만큼 이상 커질 때만 비정수 배율을 쓴다(터치 화면 전용) */
export const FILL_GAIN = 1.12;

/**
 * 세로로 든 터치 기기에서는 화면을 90° 돌려서 쓴다(가로 화면을 세로 화면에 눕힘).
 * 데스크톱 브라우저의 좁은 창은 돌리지 않는다.
 */
export function shouldRotate(winW: number, winH: number, coarsePointer: boolean): boolean {
  return coarsePointer && winH > winW;
}

/**
 * allowFill: 터치 기기에서 정수 배율이 화면을 너무 못 채우면(기본 70% 안팎) 비정수 배율로 꽉 채운다.
 * 정수 배율보다 12% 이상 커질 때만 쓰므로, 844×390 처럼 정수 배율이 잘 맞는 화면은 그대로 선명하다.
 */
export function computeScreen(
  winW: number,
  winH: number,
  dpr = 1,
  allowFill = false,
): ScreenLayout {
  const integer = computeInteger(winW, winH, dpr);
  if (!allowFill) return integer;
  const s = Math.min(winW / SAFE_W, winH / SAFE_H);
  if (s < integer.cssPerPixel * FILL_GAIN) return integer;
  const logicalW = Math.min(MAX_W, Math.max(SAFE_W, Math.floor(winW / s)));
  return {
    k: s * (dpr > 0 ? dpr : 1),
    logicalW,
    logicalH: SAFE_H,
    cssPerPixel: s,
    cssW: logicalW * s,
    cssH: SAFE_H * s,
    safeX: Math.floor((logicalW - SAFE_W) / 2),
  };
}

function computeInteger(winW: number, winH: number, dpr: number): ScreenLayout {
  const ratio = dpr > 0 ? dpr : 1;
  const devW = winW * ratio;
  const devH = winH * ratio;
  // 높이로 정한 배율이, 안전 영역 폭 640이 창 폭에 안 들어가게 만들면 한 단계씩 낮춘다(4:3 · 세로 화면 대응).
  const byHeight = Math.floor(devH / SAFE_H);
  const byWidth = Math.floor(devW / SAFE_W);
  const k = Math.max(1, Math.min(byHeight, byWidth));
  const logicalW = Math.min(MAX_W, Math.max(SAFE_W, Math.floor(devW / k)));
  const cssPerPixel = k / ratio;
  return {
    k,
    logicalW,
    logicalH: SAFE_H,
    cssPerPixel,
    cssW: logicalW * cssPerPixel,
    cssH: SAFE_H * cssPerPixel,
    safeX: Math.floor((logicalW - SAFE_W) / 2),
  };
}
