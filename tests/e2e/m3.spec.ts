/* eslint-disable @typescript-eslint/no-explicit-any */
// M3 완료 기준(13문서) 자동 확인: 정원 문 → 출격 준비 → 전투(실제 포인터 입력) → 결과 · 보상 → 정원, 그리고 식물 종마다의 능력 시연.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import {
  bootToTitle,
  clickGame,
  findButton,
  ko,
  settle,
  strayColors,
  visibleTexts,
  waitForScene,
} from './helpers';

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

const DECK = ['P011', 'P001', 'P031', 'P041', 'P012'];

/** 새 게임 → 어린잎 이상 식물 5종을 정원에 바로 넣고 정원사 Lv4 로 */
async function newGameWithPlants(page: Page): Promise<string[]> {
  await bootToTitle(page);
  await clickGame(page, 268, 332);
  await waitForScene(page, 'Hub');
  return page.evaluate((ids) => {
    const d = window.__dotline as any;
    const uids = ids.map((id) => d.grant(id, 4, 6));
    d.services.state.player.level = 4;
    return uids as string[];
  }, DECK);
}

const sim = <T>(page: Page, fn: (s: any, b: any) => T): Promise<T> =>
  page.evaluate((src) => {
    const b = (window as any).__battle;
    return new Function('s', 'b', `return (${src})(s, b)`)(b.sim, b);
  }, fn.toString()) as Promise<T>;

/** 결과 화면: 한 단계씩 나오는 연출을 화면 탭으로 건너뛰고 버튼이 보일 때까지 기다린다 */
async function skipResult(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const sc = (window.__dotline as any).game.scene.getScene('Battle');
      return sc.children.list.some((o: any) => o.type === 'Container' && o.depth === 200);
    },
    null,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(400);
  await clickGame(page, 30, 200);
  await page.waitForTimeout(500);
}

const tileXY = (tx: number, ty: number): [number, number] => [8 + tx * 24 + 12, 24 + ty * 24 + 12];

async function hideDebug(page: Page): Promise<void> {
  await page.evaluate(() => (window.__dotline as any).game.scene.sleep('DebugOverlay'));
}

async function openSortie(page: Page): Promise<void> {
  await clickGame(page, 180, 337); // 빠른 메뉴 '출격'
  await waitForScene(page, 'Sortie');
  await page.waitForTimeout(200);
}

async function startBattle(page: Page): Promise<void> {
  await clickGame(page, 548, 236 + 40); // 추천 덱
  await page.waitForTimeout(250);
  const go = await findButton(page, 'Sortie', ko['sortie.go']);
  await clickGame(page, go.x, go.y);
  await waitForScene(page, 'Battle');
  await page.waitForFunction(() => (window as any).__battle?.sim);
  await page.waitForTimeout(300);
}

test.describe('M3 전투', () => {
  test('출격 준비: 지도 · 난이도 · 덱 · 추천 덱 · 빈 덱 안내', async ({ page }) => {
    const issues = watchConsole(page);
    await newGameWithPlants(page);
    await hideDebug(page);
    await openSortie(page);
    const texts = await visibleTexts(page, 'Sortie');
    expect(texts.some((t) => t.includes(ko['stage.1-1']))).toBe(true);
    expect(texts).toContain(ko['diff.WALK']);
    expect(texts).toContain(ko['sortie.go']);
    await page.screenshot({ path: `${SHOT_DIR}/m3-sortie.png` });

    // 덱이 비어 있으면 출격할 수 없고 안내가 뜬다
    const go = await findButton(page, 'Sortie', ko['sortie.go']);
    await clickGame(page, go.x, go.y);
    await page.waitForTimeout(400);
    expect(await visibleTexts(page, 'UIOverlay')).toContain(ko['sortie.needDeck']);
    expect(await page.evaluate(() => (window.__dotline as any).game.scene.isActive('Sortie'))).toBe(
      true,
    );

    // 잠긴 스테이지를 누르면 막힌다
    await clickGame(page, 8 + 84, 30 + 98);
    await page.waitForTimeout(300);
    expect(
      await page.evaluate(() => (window.__dotline as any).game.scene.getScene('Sortie').stageIndex),
    ).toBe(0);

    // 추천 덱 → 5칸이 채워진다
    await clickGame(page, 548, 236 + 40);
    await page.waitForTimeout(300);
    const st = await page.evaluate(() =>
      (window.__dotline as any).game.scene.getScene('Sortie').debugState(),
    );
    expect(st.deck.length).toBe(5);
    expect(issues).toEqual([]);
  });

  test('전투: 심기 · 강화 · 웨이브 · 일시정지 · 배속 · 회수(실제 입력)', async ({ page }) => {
    const issues = watchConsole(page);
    await newGameWithPlants(page);
    await hideDebug(page);
    await openSortie(page);
    await startBattle(page);

    const nut0 = await sim(page, (s) => s.nutrient);
    // 카드 1번 → 맵 클릭
    await page.keyboard.press('1');
    await page.waitForTimeout(100);
    const [x, y] = tileXY(8, 3);
    await clickGame(page, x, y);
    await page.waitForTimeout(300);
    expect(await sim(page, (s) => s.towers.length)).toBe(1);
    expect(await sim(page, (s) => s.nutrient)).toBeLessThan(nut0);

    // 길에는 심을 수 없다(거절 토스트)
    await page.keyboard.press('2');
    await clickGame(page, ...tileXY(9, 3));
    await page.waitForTimeout(300);
    expect(await sim(page, (s) => s.towers.length)).toBe(1);
    expect(await visibleTexts(page, 'UIOverlay')).toContain(ko['battle.place.path']);

    // 식물을 누르면 정보 패널 → 강화
    await page.keyboard.press('Escape');
    await clickGame(page, x, y);
    await page.waitForTimeout(300);
    const lvBefore = await sim(page, (s) => s.towers[0].level);
    const up = await findButton(
      page,
      'Battle',
      (await visibleTexts(page, 'Battle')).find((t) => t.startsWith('강화 ')) as string,
    );
    await clickGame(page, up.x, up.y);
    await page.waitForTimeout(300);
    expect(await sim(page, (s) => s.towers[0].level)).toBe(lvBefore + 1);

    // 첫 웨이브 부르기 → 웨이브 시작
    const start = await findButton(page, 'Battle', ko['battle.start']);
    await clickGame(page, start.x, start.y);
    await page.waitForTimeout(600);
    expect(await sim(page, (s) => s.wave)).toBeGreaterThanOrEqual(1);

    // 일시정지: 틱이 멈춘다(그동안에도 정보는 볼 수 있다)
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    const t0 = await sim(page, (s) => s.tick);
    await page.waitForTimeout(500);
    expect(await sim(page, (s) => s.tick)).toBe(t0);
    await page.keyboard.press('Space');

    // 배속(정원사 Lv4 → 2×): 같은 시간에 틱이 더 많이 흐른다
    await page.keyboard.press('F');
    await page.waitForTimeout(100);
    expect(await sim(page, (_s, b) => b.speed)).toBe(2);
    await page.keyboard.press('F');

    // 회수: 방금(3초 안) 심은 식물은 100% 환불
    await page.keyboard.press('2');
    await clickGame(page, ...tileXY(10, 3));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const before = await sim(page, (s) => ({ n: s.towers.length, nut: s.nutrient }));
    await clickGame(page, ...tileXY(10, 3));
    await page.keyboard.press('R');
    await page.waitForTimeout(250);
    const after = await sim(page, (s) => ({ n: s.towers.length, nut: s.nutrient }));
    expect(after.n).toBe(before.n - 1);
    expect(after.nut).toBeGreaterThan(before.nut);

    await page.screenshot({ path: `${SHOT_DIR}/m3-battle.png` });
    const clip = await page.screenshot({ clip: { x: 640, y: 80, width: 600, height: 480 } });
    expect(strayColors(clip).slice(0, 5)).toEqual([]);
    expect(issues).toEqual([]);
  });

  test('승리: 결과 화면 순서 · 보상 · 진행 저장 → 정원으로', async ({ page }) => {
    const issues = watchConsole(page);
    const uids = await newGameWithPlants(page);
    await hideDebug(page);
    await openSortie(page);
    await startBattle(page);
    // 강한 배치로 끝까지 돌려 실제 승리를 만든다(봇 없이 sim API 사용)
    await sim(page, (s) => {
      s.nutrient = 99999;
      const spots = [
        [8, 3],
        [10, 3],
        [8, 4],
        [10, 4],
        [8, 6],
      ];
      s.deck.forEach((_d: unknown, i: number) => {
        const [x, y] = spots[i];
        s.place(i, x, y);
      });
      for (const t of s.towers) {
        s.upgrade(t.id);
        s.upgrade(t.id);
        s.upgrade(t.id, 'A');
      }
      s.callWave();
      let n = 0;
      while (s.phase !== 'WON' && s.phase !== 'LOST' && n++ < 200000) {
        s.hearts = s.maxHearts;
        s.nutrient = 99999;
        s.step();
      }
      return s.phase;
    });
    expect(await sim(page, (s) => s.phase)).toBe('WON');
    await skipResult(page);
    expect(await visibleTexts(page, 'Battle')).toContain(ko['result.win']);
    const texts = await visibleTexts(page, 'Battle');
    expect(texts).toContain('MVP');
    expect(texts).toContain(ko['result.firstClear']);
    expect(texts).toContain(ko['result.home']);
    await page.screenshot({ path: `${SHOT_DIR}/m3-result.png` });

    const prog = await page.evaluate(() => (window.__dotline as any).services.state.progress);
    expect(prog['1-1'].stars).toBe(3);
    const exps = await page.evaluate(
      (ids) =>
        ids.map((u) =>
          (window.__dotline as any).services.state.plants.find((p: any) => p.uid === u),
        ),
      uids,
    );
    expect(exps.every((p: any) => p.exp > 0)).toBe(true);
    expect(
      (await page.evaluate(() => (window.__dotline as any).services.state.player.coin)) > 0,
    ).toBe(true);

    const home = await findButton(page, 'Battle', ko['result.home']);
    await clickGame(page, home.x, home.y);
    await waitForScene(page, 'Hub');
    expect(issues).toEqual([]);
  });

  test('패배: 시무룩 표정 · 원인 팁 · 일부 보상 · 다시 하기', async ({ page }) => {
    const issues = watchConsole(page);
    await newGameWithPlants(page);
    await hideDebug(page);
    await openSortie(page);
    await startBattle(page);
    await page.keyboard.press('1');
    await clickGame(page, ...tileXY(8, 3));
    await sim(page, (s) => {
      s.callWave();
      s.hearts = 0;
      s.phase = 'LOST';
    });
    await skipResult(page);
    const texts = await visibleTexts(page, 'Battle');
    expect(texts).toContain(ko['result.lose']);
    expect(texts).toContain(ko['result.tip']);
    expect(texts).not.toContain(ko['result.next']);
    await page.screenshot({ path: `${SHOT_DIR}/m3-defeat.png` });
    const retry = await findButton(page, 'Battle', ko['result.retry']);
    await clickGame(page, retry.x, retry.y);
    await waitForScene(page, 'Battle');
    await page.waitForTimeout(400);
    expect(await sim(page, (s) => s.hearts)).toBe(20);
    expect(await sim(page, (s) => s.phase)).toBe('PREP');
    const prog = await page.evaluate(() => (window.__dotline as any).services.state.progress);
    expect(prog['1-1'].stars).toBe(0);
    expect(prog['1-1'].tries).toBe(1);
    expect(issues).toEqual([]);
  });
});

// 능력 시연: 아키타입마다 대표 한 종씩 + 물 · 특수. 100종 전체는 단위 테스트(battle.test.ts)가 돌린다.
const SAMPLE = [
  'P011', // 사수
  'P013', // 저격
  'P017', // 곡사
  'P004', // 근접
  'P002', // 장판
  'P072', // 광선
  'P081', // 연쇄
  'P034', // 오라
  'P095', // 소환
  'P031', // 생산
  'P003', // 설치
  'P016', // 장벽
  'P006', // 특수(끌어당김)
  'P063', // 물 타일
];

test.describe('M3 능력 시연', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, '데스크톱에서만(오래 걸림)');
  test('대표 14종이 각자 맞는 방식으로 일한다', async ({ page }) => {
    test.setTimeout(240_000);
    const issues = watchConsole(page);
    for (const id of SAMPLE) {
      await page.goto(`/?debug=1&scene=AbilityDemo&plant=${id}`);
      await page.waitForFunction(
        () => (window as any).__battle?.sim && window.__dotline?.game.scene.isActive('Battle'),
        null,
        { timeout: 30_000 },
      );
      await settle(page);
      await page.waitForTimeout(3200);
      const r = await sim(page, (s) => {
        const t = s.towers[0];
        return {
          placed: !!t,
          did:
            !!t &&
            (t.dealt > 0 ||
              t.support > 0 ||
              s.fields.length > 0 ||
              s.summons.length > 0 ||
              s.nutrient > 99999 ||
              s.enemies.some((e: any) => e.icons.length > 0)),
        };
      });
      expect(r.placed, `${id} 배치`).toBe(true);
      expect(r.did, `${id} 동작`).toBe(true);
    }
    await page.evaluate(() => (window.__dotline as any).game.scene.sleep('DebugOverlay'));
    await page.screenshot({ path: `${SHOT_DIR}/m3-demo.png` });
    expect(issues).toEqual([]);
  });
});
