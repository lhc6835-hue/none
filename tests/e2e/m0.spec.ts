// M0 완료 기준(13문서) 자동 확인: 정수 배율 · 안전 영역 · 레터박스 · 저장 복구 · 디버그 오버레이.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { RAMPS } from '../../src/art/palette';
import { computeScreen } from '../../src/core/Screen';
import {
  backToTitle,
  bootToTitle,
  canvasRect,
  clickGame,
  en,
  ko,
  findButton,
  pixelAt,
  settle,
  strayColors,
  visibleTexts,
  waitForScene,
  activeScenes as activeKeys,
} from './helpers';

const SHOT_DIR = 'docs/screenshots';
mkdirSync(SHOT_DIR, { recursive: true });

// 한글 문구는 문자열 파일에서 읽어 검증한다(테스트에 문구를 복붙하지 않는다).

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

test.describe('M0 — 부팅 · 화면', () => {
  test('타이틀까지 오류 없이 부팅하고 스크린샷을 남긴다', async ({ page }, info) => {
    const issues = watchConsole(page);
    await bootToTitle(page);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOT_DIR}/m0-title-${info.project.name}.png` });
    expect(issues).toEqual([]);
  });

  test('화면 전체가 66색 팔레트 안의 색만 쓴다(글자 번짐 없음)', async ({ page }) => {
    await bootToTitle(page);
    await page.waitForTimeout(500);
    const png = await page.locator('canvas').screenshot();
    expect(strayColors(png)).toEqual([]);
  });

  const sizes: [number, number][] = [
    [1280, 720],
    [1920, 1080],
    [2560, 1440],
    [844, 390],
    [1024, 768],
    [1366, 768],
    [1281, 721],
    [2340, 1080],
  ];
  for (const [w, h] of sizes) {
    test(`창 ${w}×${h}: 정수 배율 · 정수 좌표 · 안전 영역 유지 · 남는 곳은 배경색`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: h });
      await bootToTitle(page);
      const expected = computeScreen(w, h, 1);
      const r = await canvasRect(page);

      expect(r.logicalH).toBe(360);
      expect(r.logicalW).toBe(expected.logicalW);
      expect(r.logicalW).toBeGreaterThanOrEqual(640); // 안전 영역 640×360 유지
      expect(r.width).toBeCloseTo(expected.cssW, 3);
      expect(r.height).toBeCloseTo(expected.cssH, 3);
      expect(Number.isInteger(r.width / r.logicalW)).toBe(true); // 정수 배율
      expect(Number.isInteger(r.left)).toBe(true); // 반 픽셀 어긋남 없음
      expect(Number.isInteger(r.top)).toBe(true);
      expect(r.left + r.width).toBeLessThanOrEqual(w);
      expect(r.top + r.height).toBeLessThanOrEqual(h);

      // 남는 영역은 현재 장면(타이틀)의 배경색
      const full = await page.screenshot();
      if (r.left > 2) expect(pixelAt(full, 1, 1)).toBe(RAMPS.R4[0]);
      if (r.top > 2) expect(pixelAt(full, Math.floor(w / 2), 1)).toBe(RAMPS.R4[0]);
    });
  }

  test('실행 중에 창 크기를 바꿔도 배율이 다시 맞고 버튼이 눌린다', async ({ page }) => {
    await bootToTitle(page);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(400);
    const r = await canvasRect(page);
    expect(r.width / r.logicalW).toBe(3);
    // 설정 버튼(논리 372,332)을 눌러 모달이 열리는지로 좌표 변환이 맞는지 확인
    await clickGame(page, 372, 332);
    await page.waitForTimeout(500);
    const texts = await visibleTexts(page, 'UIOverlay');
    expect(texts).toContain(ko['settings.title']);
  });
});

test.describe('M0 — 디버그 오버레이', () => {
  test('?debug=1 이면 FPS 오버레이가 뜬다', async ({ page }) => {
    await bootToTitle(page, '?debug=1');
    await page.waitForTimeout(600);
    const texts = await visibleTexts(page, 'DebugOverlay');
    expect(texts.join('\n')).toMatch(/FPS \d+/);
    expect(texts.join('\n')).toMatch(/screen x\d/);
  });

  test('?debug 없이는 오버레이도 전역 핸들도 없다', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => window.__dotline === undefined)).toBe(true);
    await expect(page.locator('canvas')).toHaveCount(1);
  });
});

test.describe('M0 — 저장 · 설정', () => {
  test('새로 시작 → 허브 → 새로고침 → 이어하기', async ({ page }) => {
    await bootToTitle(page);
    expect(await page.evaluate(() => localStorage.getItem('dotline.save.v1'))).toBeNull();
    await clickGame(page, 268, 332); // 새로 시작 (저장이 없으니 확인창 없이 시작)
    await waitForScene(page, 'Hub');
    expect(await page.evaluate(() => localStorage.getItem('dotline.save.v1'))).not.toBeNull();

    await page.reload();
    await page.waitForFunction(
      () => window.__dotline?.game.scene.isActive('Title') === true,
      null,
      {
        timeout: 30_000,
      },
    );
    await settle(page);
    const texts = await visibleTexts(page, 'Title');
    expect(texts).toContain(ko['title.tapHint']); // 저장이 있으면 '아무 데나' 안내
    await clickGame(page, 40, 150); // 아무 데나 눌러 이어하기
    await waitForScene(page, 'Hub');
  });

  test('저장이 있을 때 새로 시작은 확인을 묻고, 아니요를 누르면 저장이 그대로다', async ({
    page,
  }) => {
    await bootToTitle(page);
    await clickGame(page, 268, 332);
    await waitForScene(page, 'Hub');
    const saved = await page.evaluate(() => localStorage.getItem('dotline.save.v1'));
    expect(saved).not.toBeNull();

    await backToTitle(page);
    await clickGame(page, 268, 332); // 새로 시작 → 확인창
    await page.waitForTimeout(500);
    expect(await visibleTexts(page, 'UIOverlay')).toContain(ko['title.newGameConfirm.title']);

    // 모달 뒤의 버튼은 눌리지 않아야 한다(뒤 클릭 막기): 설정 버튼을 눌러도 설정창이 뜨지 않는다
    await clickGame(page, 372, 332);
    await page.waitForTimeout(300);
    expect(await visibleTexts(page, 'UIOverlay')).not.toContain(ko['settings.title']);

    const no = await findButton(page, 'UIOverlay', ko['title.newGameConfirm.no']);
    await clickGame(page, no.x, no.y);
    await page.waitForTimeout(400);
    expect(await visibleTexts(page, 'UIOverlay')).not.toContain(ko['title.newGameConfirm.title']);
    expect(await activeKeys(page)).toContain('Title'); // 장면은 그대로
    expect(await page.evaluate(() => localStorage.getItem('dotline.save.v1'))).toBe(saved);
  });

  test('저장이 있을 때 "네, 새로 시작해요"를 누르면 이전 저장은 백업으로 남는다', async ({
    page,
  }) => {
    await bootToTitle(page);
    await clickGame(page, 268, 332);
    await waitForScene(page, 'Hub');
    await page.evaluate(() => {
      const s = window.__dotline!.services as unknown as { state: { player: { coin: number } } };
      s.state.player.coin = 4321;
    });
    await page.evaluate(() => {
      (
        window.__dotline!.services as unknown as { autoSave: { flush(r: string): boolean } }
      ).autoSave.flush('t');
    });
    await backToTitle(page);
    await clickGame(page, 268, 332);
    await page.waitForTimeout(500);
    const yes = await findButton(page, 'UIOverlay', ko['title.newGameConfirm.yes']);
    await clickGame(page, yes.x, yes.y);
    await waitForScene(page, 'Hub');
    const backup = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('dotline.save.backup') ?? 'null'),
    );
    expect(backup.state.player.coin).toBe(4321);
    const coin = await page.evaluate(
      () =>
        (window.__dotline!.services as unknown as { state: { player: { coin: number } } }).state
          .player.coin,
    );
    expect(coin).toBe(0);
  });

  test('본 저장이 손상되면 직전 저장본으로 복구하고 안내한다', async ({ page }) => {
    await bootToTitle(page);
    await clickGame(page, 268, 332);
    await waitForScene(page, 'Hub');
    // 두 번째 저장을 만들어 첫 저장이 백업으로 밀려나게 한다
    await page.evaluate(() => {
      (
        window.__dotline!.services as unknown as { autoSave: { flush(r: string): boolean } }
      ).autoSave.flush('test');
    });
    // 탭이 숨겨질 때의 자동 저장이 손상본을 덮어쓰지 않도록 메모리 상태를 비운다
    // (저장이 손상된 채 비정상 종료된 상황을 흉내 낸다)
    await page.evaluate(() => {
      (window.__dotline!.services as unknown as { state: unknown }).state = null;
      localStorage.setItem('dotline.save.v1', '{"version":1,"state":broken');
    });
    await page.reload();
    await page.waitForFunction(
      () => window.__dotline?.game.scene.isActive('Title') === true,
      null,
      {
        timeout: 30_000,
      },
    );
    await settle(page);
    await page.waitForTimeout(900);
    const texts = await visibleTexts(page, 'UIOverlay');
    expect(texts).toContain(ko['title.notice.recovered']);
    const state = await page.evaluate(() => window.__dotline!.services.state !== null);
    expect(state).toBe(true);
  });

  test('음량 설정은 즉시 반영되고 새로고침해도 유지된다', async ({ page }) => {
    await bootToTitle(page);
    await clickGame(page, 372, 332); // 설정
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => localStorage.getItem('dotline.settings.v1'))).toBeNull();

    const minus = await findButton(page, 'UIOverlay', '-', 0); // 전체 음량 [-]
    await clickGame(page, minus.x, minus.y);
    await page.waitForTimeout(200);
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('dotline.settings.v1') ?? 'null'),
    );
    expect(saved.volume.master).toBeCloseTo(0.7, 5);
    expect(await visibleTexts(page, 'UIOverlay')).toContain('70%'); // 숫자가 바로 바뀐다

    await page.reload();
    await page.waitForFunction(
      () => window.__dotline?.game.scene.isActive('Title') === true,
      null,
      {
        timeout: 30_000,
      },
    );
    const master = await page.evaluate(
      () =>
        (
          window.__dotline!.services as unknown as {
            settings: { get(): { volume: { master: number } } };
          }
        ).settings.get().volume.master,
    );
    expect(master).toBeCloseTo(0.7, 5);
  });

  test('언어를 English 로 바꾸면 타이틀이 영어로 다시 그려진다', async ({ page }) => {
    await bootToTitle(page);
    await clickGame(page, 372, 332);
    await page.waitForTimeout(500);
    const en_btn = await findButton(page, 'UIOverlay', ko['settings.language.en']);
    await clickGame(page, en_btn.x, en_btn.y);
    await page.waitForTimeout(700);
    const texts = await visibleTexts(page, 'Title');
    expect(texts).toContain(en['title.newGame']);
    expect(texts).not.toContain(ko['title.newGame']);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
  });
});
