/* eslint-disable @typescript-eslint/no-explicit-any */
// 휴대폰(터치) 환경: 세로로 들어도 화면이 크게 나오고(90° 돌려 표시), 손가락 좌표가 정확히 맞는지, 작은 가로 화면도 꽉 차는지.
import { devices, expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { bootToTitle, findButton, gamePoint, ko, waitForScene } from './helpers';

const SHOT_DIR = 'docs/screenshots';
mkdirSync(SHOT_DIR, { recursive: true });

const PHONES = {
  'iPhone 13 세로': devices['iPhone 13'],
  'iPhone 13 가로': devices['iPhone 13 landscape'],
  'Pixel 7 세로': devices['Pixel 7'],
} as const;

async function tap(page: Page, x: number, y: number): Promise<void> {
  const p = await gamePoint(page, x, y);
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(150);
}

async function canvasInfo(page: Page) {
  return page.evaluate(() => {
    const r = document.querySelector('canvas')!.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      w: r.width,
      h: r.height,
      iw: window.innerWidth,
      ih: window.innerHeight,
      rot: document.documentElement.dataset.rot,
    };
  });
}

test.describe('휴대폰 화면', () => {
  for (const [name, device] of Object.entries(PHONES)) {
    test(`${name}: 화면 안에 크게 들어오고 터치로 정원 → 출격 → 전투까지 간다`, async ({
      browser,
    }, info) => {
      test.skip(info.project.name !== 'desktop-1280x720', '자체 기기 설정을 쓰므로 한 번만');
      test.setTimeout(120_000);
      const { defaultBrowserType: _ignored, ...opts } = device as any;
      const ctx = await browser.newContext({
        ...opts,
        baseURL: info.project.use.baseURL as string,
      });
      const page = await ctx.newPage();
      const issues: string[] = [];
      page.on('pageerror', (e) => issues.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error' && !/GPU stall/.test(m.text())) issues.push(m.text());
      });
      await bootToTitle(page);

      // 1) 화면 안에 들어오고, 가능한 만큼 크다
      const c = await canvasInfo(page);
      expect(c.left).toBeGreaterThanOrEqual(-1);
      expect(c.top).toBeGreaterThanOrEqual(-1);
      expect(c.right).toBeLessThanOrEqual(c.iw + 1);
      expect(c.bottom).toBeLessThanOrEqual(c.ih + 1);
      const portrait = c.ih > c.iw;
      expect(c.rot).toBe(portrait ? '1' : '0');
      // 가로 화면이면 높이를 거의 다(≥ 88%), 세로 화면이면 폭을 거의 다(≥ 88%) 쓴다
      if (portrait) expect(c.w / c.iw).toBeGreaterThan(0.88);
      else expect(c.h / c.ih).toBeGreaterThan(0.88);
      await page.screenshot({
        path: `${SHOT_DIR}/mobile-${portrait ? 'portrait' : 'landscape'}-title.png`,
      });

      // 2) 손가락으로 새로 시작 → 정원
      await tap(page, 268, 332);
      await waitForScene(page, 'Hub');
      await page.evaluate(() => {
        const d = window.__dotline as any;
        for (const id of ['P011', 'P001', 'P031', 'P041', 'P012']) d.grant(id, 4, 6);
        d.services.state.player.level = 4;
      });

      // 3) 빠른 메뉴 '출격' → 출격 준비 → 추천 덱 → 출격
      await tap(page, 180, 337);
      await waitForScene(page, 'Sortie');
      await tap(page, 548, 236 + 40);
      await page.waitForTimeout(250);
      const go = await findButton(page, 'Sortie', ko['sortie.go']);
      await tap(page, go.x, go.y);
      await waitForScene(page, 'Battle');
      await page.waitForFunction(() => (window as any).__battle?.sim);

      // 4) 카드를 누르고 맵을 눌러 식물을 심는다(좌표 변환이 어긋나면 엉뚱한 칸에 심긴다)
      await tap(page, 8 + 22, 336); // 1번 카드
      const tx = 8;
      const ty = 3;
      await tap(page, 8 + tx * 24 + 12, 24 + ty * 24 + 12);
      await page.waitForTimeout(250);
      const planted = await page.evaluate(() => {
        const t = (window as any).__battle.sim.towers[0];
        return t ? { tx: t.tx, ty: t.ty } : null;
      });
      expect(planted).toEqual({ tx, ty });
      await page.screenshot({
        path: `${SHOT_DIR}/mobile-${portrait ? 'portrait' : 'landscape'}-battle.png`,
      });
      expect(issues).toEqual([]);
      await ctx.close();
    });
  }
});
