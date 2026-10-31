import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { PALETTE_SET, rgbToHex } from '../../src/art/palette';

export interface DotlineHandle {
  game: {
    scene: {
      isActive(key: string): boolean;
      getScenes(active: boolean): { scene: { key: string } }[];
    };
    scale: { width: number; height: number };
    canvas: HTMLCanvasElement;
  };
  services: { state: unknown };
}

declare global {
  interface Window {
    __dotline?: DotlineHandle;
  }
}

/** 부팅 → 로딩 → 타이틀(전환 포함) 까지 기다린다. */
export async function bootToTitle(page: Page, query = '?debug=1'): Promise<void> {
  await page.goto('/' + query);
  await page.waitForFunction(() => window.__dotline?.game.scene.isActive('Title') === true, null, {
    timeout: 30_000,
  });
  await settle(page);
}

/** 화면 전환(흙 디졸브)이 끝날 때까지 기다린다. */
export async function settle(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const g = window.__dotline?.game as unknown as {
        scene: { getScene(k: string): { isTransitioning: boolean } };
      };
      return g?.scene.getScene('UIOverlay')?.isTransitioning === false;
    },
    null,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(150);
}

export function activeScenes(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (window.__dotline?.game.scene.getScenes(true) ?? []).map((s) => s.scene.key),
  );
}

/** 논리 좌표(안전 영역 기준 640×360)를 페이지 좌표로 바꾼다. */
export async function gamePoint(
  page: Page,
  x: number,
  y: number,
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ([gx, gy]) => {
      const game = window.__dotline!.game;
      const rect = game.canvas.getBoundingClientRect();
      const k = rect.width / game.scale.width;
      const safeLeft = Math.floor((game.scale.width - 640) / 2);
      return { x: rect.left + (gx + safeLeft) * k, y: rect.top + gy * k };
    },
    [x, y] as const,
  );
}

export async function canvasRect(page: Page) {
  return page.evaluate(() => {
    const r = window.__dotline!.game.canvas.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      logicalW: window.__dotline!.game.scale.width,
      logicalH: window.__dotline!.game.scale.height,
      dpr: window.devicePixelRatio,
    };
  });
}

/** PNG 버퍼에서 쓰인 모든 색을 모은다. */
export function colorsOf(png: Buffer): Map<string, number> {
  const img = PNG.sync.read(png);
  const counts = new Map<string, number>();
  for (let i = 0; i < img.data.length; i += 4) {
    const hex = rgbToHex(img.data[i], img.data[i + 1], img.data[i + 2]);
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  return counts;
}

export function strayColors(png: Buffer): [string, number][] {
  return [...colorsOf(png)].filter(([hex]) => !PALETTE_SET.has(hex));
}

export function pixelAt(png: Buffer, x: number, y: number): string {
  const img = PNG.sync.read(png);
  const i = (y * img.width + x) * 4;
  return rgbToHex(img.data[i], img.data[i + 1], img.data[i + 2]);
}

/** 씬의 화면에 보이는 모든 글자를 모은다(컨테이너 안쪽 포함). */
export function visibleTexts(page: Page, sceneKey: string): Promise<string[]> {
  return page.evaluate((key) => {
    const scene = (
      window.__dotline!.game as unknown as {
        scene: { getScene(k: string): { children: { list: unknown[] } } };
      }
    ).scene.getScene(key);
    const out: string[] = [];
    const walk = (list: unknown[]) => {
      for (const o of list as {
        visible?: boolean;
        text?: string;
        list?: unknown[];
        type?: string;
      }[]) {
        if (o.visible === false) continue;
        if (o.type === 'Text' && typeof o.text === 'string') out.push(o.text);
        if (o.list) walk(o.list);
      }
    };
    walk(scene.children.list);
    return out;
  }, sceneKey);
}

/** Phaser 입력으로 논리 좌표를 클릭한다(호버 → 누름 → 뗌). */
export async function clickGame(page: Page, x: number, y: number): Promise<void> {
  const p = await gamePoint(page, x, y);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.up();
}

export async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction((k) => window.__dotline?.game.scene.isActive(k) === true, key, {
    timeout: 20_000,
  });
  await settle(page);
}

/**
 * 라벨 글자로 버튼(컨테이너)의 논리 좌표를 찾는다. 같은 글자가 여럿이면 nth 번째.
 * 모달 열기 애니메이션이 끝난 뒤(크기 1)에 부르는 것을 전제로 한다.
 */
export async function findButton(
  page: Page,
  sceneKey: string,
  label: string,
  nth = 0,
): Promise<{ x: number; y: number }> {
  const found = await page.evaluate(
    ([key, text, index]) => {
      type Node = {
        type?: string;
        x: number;
        y: number;
        list?: Node[];
        text?: string;
        visible?: boolean;
      };
      const scene = (
        window.__dotline!.game as unknown as {
          scene: { getScene(k: string): { children: { list: Node[] } } };
        }
      ).scene.getScene(key as string);
      const hits: { x: number; y: number }[] = [];
      const walk = (list: Node[], ox: number, oy: number) => {
        for (const o of list) {
          if (o.visible === false || o.type !== 'Container' || !o.list) continue;
          if (o.list.some((c) => c.type === 'Text' && c.text === text))
            hits.push({ x: ox + o.x, y: oy + o.y });
          walk(o.list, ox + o.x, oy + o.y);
        }
      };
      walk(scene.children.list, 0, 0);
      return hits[index as number] ?? null;
    },
    [sceneKey, label, nth] as const,
  );
  if (!found) throw new Error(`버튼을 찾지 못했습니다: ${label} (#${nth}) in ${sceneKey}`);
  return found;
}

/** 문자열 파일(JSON)을 읽는다. Playwright 로더는 JSON import 에 속성이 필요해 직접 파싱한다. */
function loadStrings(lang: 'ko' | 'en'): Record<string, string> {
  return JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8')) as Record<string, string>;
}
export const ko = loadStrings('ko');
export const en = loadStrings('en');

/** 허브에서 설정 창(톱니바퀴)을 열고 '타이틀로'를 눌러 타이틀로 돌아간다. */
export async function backToTitle(page: Page): Promise<void> {
  await clickGame(page, 588, 17);
  await page.waitForTimeout(450);
  const b = await findButton(page, 'UIOverlay', ko['hub.toTitle']);
  await clickGame(page, b.x, b.y);
  await waitForScene(page, 'Title');
}
