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

export function computeScreen(winW: number, winH: number, dpr = 1): ScreenLayout {
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
