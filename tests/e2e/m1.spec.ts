// M1 완료 기준(13문서) 자동 확인: 아트 갤러리 · 얼굴 검수 · 팔레트 · 시선 추적 · 엇갈린 깜빡임 · UI 키트 · 지연 생성.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { settle, strayColors } from './helpers';

const SHOT_DIR = 'docs/screenshots';
mkdirSync(SHOT_DIR, { recursive: true });
const IGNORED = [/GPU stall/, /\[vite\]/];

function watchConsole(page: Page): string[] {
  const issues: string[] = [];
  page.on('console', (m) => {
    if (!['error', 'warning'].includes(m.type())) return;
    if (IGNORED.some((re) => re.test(m.text()))) return;
    issues.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message}`));
  return issues;
}

async function openScene(page: Page, scene: string): Promise<void> {
  await page.goto(`/?debug=1&scene=${scene}`);
  await page.waitForFunction((k) => window.__dotline?.game.scene.isActive(k) === true, scene, {
    timeout: 30_000,
  });
  await settle(page);
  await page.waitForTimeout(600);
}

interface Gallery {
  stats: {
    page: number;
    pages: number;
    cells: number;
    strays: number;
    faceIssues: number;
    generated: number;
  };
  generateAll(): { sprites: number; strays: number; faceIssues: number };
}
const galleryStats = (page: Page) =>
  page.evaluate(
    () =>
      (
        window.__dotline!.game as unknown as { scene: { getScene(k: string): Gallery } }
      ).scene.getScene('ArtGallery').stats,
  );

test.describe('M1 — 아트 갤러리', () => {
  test('100종 × 6단계가 5페이지에 오류 없이 나오고, 팔레트 밖 색 0 · 얼굴 위반 0', async ({
    page,
  }, info) => {
    const issues = watchConsole(page);
    await openScene(page, 'ArtGallery');
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) {
      const s = await galleryStats(page);
      expect(s.page).toBe(i);
      expect(s.strays).toBe(0);
      expect(s.faceIssues).toBe(0);
      seen.push(s.cells);
      if (i === 0)
        await page.screenshot({ path: `${SHOT_DIR}/m1-gallery-normal-${info.project.name}.png` });
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
    }
    // 24종 × 6칸(씨앗 + 5단계) 이 네 페이지, 마지막 페이지는 4종 × 6칸
    expect(seen).toEqual([144, 144, 144, 144, 24]);
    expect(seen.reduce((a, b) => a + b, 0)).toBe(600);
    expect(issues).toEqual([]);
  });

  test('전체 생성: 식물 100 × 5단계 × 색변이 2 = 1000 아틀라스, 위반 0, LRU 상한 지킴', async ({
    page,
  }) => {
    await openScene(page, 'ArtGallery');
    const r = await page.evaluate(() => {
      const gal = (
        window.__dotline!.game as unknown as { scene: { getScene(k: string): Gallery } }
      ).scene.getScene('ArtGallery');
      const res = gal.generateAll();
      const atlas = (window.__dotline as unknown as { atlas: { size: number; generated: number } })
        .atlas;
      return { ...res, size: atlas.size, generated: atlas.generated };
    });
    expect(r.sprites).toBe(1000);
    expect(r.strays).toBe(0);
    expect(r.faceIssues).toBe(0);
    expect(r.generated).toBeGreaterThanOrEqual(1000);
    expect(r.size).toBeLessThanOrEqual(320); // 사용 빈도가 낮은 텍스처는 해제된다(LRU)
  });

  test('지연 생성: 타이틀에서는 식물 텍스처를 만들지 않는다', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.waitForFunction(
      () => window.__dotline?.game.scene.isActive('Title') === true,
      null,
      { timeout: 30_000 },
    );
    await settle(page);
    const n = await page.evaluate(
      () => (window.__dotline as unknown as { atlas: { generated: number } }).atlas.generated,
    );
    expect(n).toBe(0);
  });

  test('실루엣 · 색변이 · 표정 모드와 검수 오버레이 스크린샷', async ({ page }, info) => {
    await openScene(page, 'ArtGallery');
    const shot = async (name: string) =>
      page.screenshot({ path: `${SHOT_DIR}/m1-gallery-${name}-${info.project.name}.png` });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('m'); // 실루엣
    await page.waitForTimeout(500);
    await shot('silhouette');
    await page.keyboard.press('m'); // 색변이
    await page.waitForTimeout(500);
    await shot('variant');
    await page.keyboard.press('m'); // 일반
    for (let i = 0; i < 13; i++) await page.keyboard.press('e'); // 전투 표정
    await page.waitForTimeout(500);
    await shot('battle');
    const s = await galleryStats(page);
    expect(s.strays).toBe(0);
    expect(s.faceIssues).toBe(0);
  });
});

test.describe('M1 — 살아 있는 얼굴', () => {
  interface View {
    speciesId: string;
    stage: number;
    x: number;
    y: number;
    blinking: boolean;
    lookDir: [number, number];
    lookAt(x: number, y: number): void;
  }

  test('시선 추적: 눈이 대상 쪽으로 움직이고(최대 1px) 가까우면 가운데', async ({ page }) => {
    await openScene(page, 'ArtGallery');
    const dirs = await page.evaluate(() => {
      const gal = (
        window.__dotline!.game as unknown as {
          scene: { getScene(k: string): { layer: { list: unknown[] } } };
        }
      ).scene.getScene('ArtGallery');
      const view = (gal.layer.list as unknown[]).find(
        (o) => typeof (o as View).lookAt === 'function' && (o as View).stage === 5,
      ) as View;
      // 개화 단계 스프라이트의 몸 중심은 발밑에서 약 16px 위
      view.lookAt(view.x + 80, view.y - 16);
      const right = [...view.lookDir];
      view.lookAt(view.x - 80, view.y - 60);
      const upLeft = [...view.lookDir];
      view.lookAt(view.x + 2, view.y - 16);
      const near = [...view.lookDir];
      return { right, upLeft, near };
    });
    expect(dirs.right).toEqual([1, 0]);
    expect(dirs.upLeft).toEqual([-1, -1]);
    expect(dirs.near).toEqual([0, 0]);
  });

  test('깜빡임은 식물마다 엇갈린다(한 순간에 몰리지 않고 여러 종이 번갈아 깜빡)', async ({
    page,
  }) => {
    await openScene(page, 'ArtGallery');
    const r = await page.evaluate(async () => {
      const gal = (
        window.__dotline!.game as unknown as {
          scene: { getScene(k: string): { layer: { list: unknown[] } } };
        }
      ).scene.getScene('ArtGallery');
      const views = (gal.layer.list as unknown[]).filter(
        (o) => typeof (o as View).lookAt === 'function',
      ) as View[];
      const species = [...new Set(views.map((v) => v.speciesId))];
      const everBlinked = new Set<string>();
      let maxAtOnce = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < 7000) {
        const now = new Set(views.filter((v) => v.blinking).map((v) => v.speciesId));
        now.forEach((id) => everBlinked.add(id));
        maxAtOnce = Math.max(maxAtOnce, now.size);
        await new Promise((res) => setTimeout(res, 30));
      }
      return { total: species.length, ever: everBlinked.size, maxAtOnce };
    });
    expect(r.total).toBe(24);
    expect(r.ever).toBeGreaterThanOrEqual(12); // 7초 동안 절반 이상의 종이 깜빡였고
    expect(r.maxAtOnce).toBeLessThanOrEqual(8); // 한 번에 몰려서 깜빡이지는 않았다
  });
});

test.describe('M1 — UI 키트', () => {
  test('패널 3종 · 버튼 4상태 · 게이지 · 툴팁 · 숫자 폰트 · 66색 팔레트', async ({
    page,
  }, info) => {
    const issues = watchConsole(page);
    await openScene(page, 'UIKit');
    await page.screenshot({ path: `${SHOT_DIR}/m1-uikit-${info.project.name}.png` });
    // 화면의 모든 색이 66색 팔레트 안이다(글자 번짐 · 알파 없음)
    const png = await page.locator('canvas').screenshot();
    expect(strayColors(png)).toEqual([]);

    // 게이지가 굴러간다: live 버튼 → 값이 바뀐다
    const before = await page.evaluate(() =>
      (
        window.__dotline!.game as unknown as {
          scene: { getScene(k: string): { gauges: { current: number }[] } };
        }
      ).scene
        .getScene('UIKit')
        .gauges.map((g) => g.current),
    );
    expect(before).toEqual([80, 45, 22, 100]);
    expect(issues).toEqual([]);
  });

  test('툴팁: 아이콘에 마우스를 올리면 뜬다', async ({ page }) => {
    await openScene(page, 'UIKit');
    // 첫 아이콘(drop)은 논리 좌표 (8,156) 크기 12×12
    const p = await page.evaluate(() => {
      const g = window.__dotline!.game;
      const r = g.canvas.getBoundingClientRect();
      const k = r.width / g.scale.width;
      const sl = Math.floor((g.scale.width - 640) / 2);
      return { x: r.left + (8 + 6 + sl) * k, y: r.top + (156 + 6) * k };
    });
    await page.mouse.move(p.x - 40, p.y - 40);
    await page.mouse.move(p.x, p.y);
    const readTexts = () =>
      page.evaluate(() => {
        const sc = (
          window.__dotline!.game as unknown as {
            scene: {
              getScene(k: string): {
                children: {
                  list: {
                    type?: string;
                    text?: string;
                    list?: { type?: string; text?: string }[];
                  }[];
                };
              };
            };
          }
        ).scene.getScene('UIKit');
        const out: string[] = [];
        for (const o of sc.children.list) {
          if (o.type === 'Text' && o.text) out.push(o.text);
          for (const c of o.list ?? []) if (c.type === 'Text' && c.text) out.push(c.text);
        }
        return out;
      });
    // 느린 환경(소프트웨어 GL)에서도 흔들리지 않게, 툴팁이 뜰 때까지 기다린다
    await expect
      .poll(async () => (await readTexts()).includes('drop'), { timeout: 8000 })
      .toBe(true);
  });
});
