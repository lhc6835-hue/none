/* eslint-disable @typescript-eslint/no-explicit-any */
// M2 완료 기준(13문서) 자동 확인: 허브 · 심기 · 돌봄 18종(실제 포인터 입력) · 처음 눈뜨기 → 이름 짓기 · 오프라인 카드.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { HUB_OBJECTS } from '../../src/data/hubLayout';
import { PLANT_BASE_BY_ID } from '../../src/data/plants';
import { thresholdGp } from '../../src/systems/garden/Growth';
import {
  bootToTitle,
  clickGame,
  findButton,
  gamePoint,
  ko,
  passHowTo,
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

async function newGame(page: Page): Promise<void> {
  await bootToTitle(page);
  await clickGame(page, 268, 332); // 새로 시작
  await passHowTo(page);
  await waitForScene(page, 'Hub');
}

/** 안전 영역 좌표를 눌러 끌기 */
async function drag(page: Page, pts: [number, number][], step = 16): Promise<void> {
  const first = await gamePoint(page, pts[0][0], pts[0][1]);
  await page.mouse.move(first.x, first.y);
  await page.waitForTimeout(60);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) {
    const p = await gamePoint(page, x, y);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(step);
  }
  await page.mouse.up();
  await page.waitForTimeout(80);
}

async function hold(page: Page, x: number, y: number, ms: number): Promise<void> {
  const p = await gamePoint(page, x, y);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(60);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(80);
}

/** 씬 안의 글자(Text)의 화면 좌표(월드 변환 포함)를 찾는다. */
async function textPos(page: Page, scene: string, text: string): Promise<{ x: number; y: number }> {
  const r = await page.evaluate(
    ([key, txt]) => {
      const sc = (window.__dotline!.game as any).scene.getScene(key);
      const walk = (list: any[]): any => {
        for (const o of list) {
          if (o.visible === false) continue;
          if (o.type === 'Text' && o.text === txt) {
            const m = o.getWorldTransformMatrix();
            return { x: m.tx, y: m.ty };
          }
          if (o.list) {
            const f = walk(o.list);
            if (f) return f;
          }
        }
        return null;
      };
      return walk(sc.children.list);
    },
    [scene, text] as const,
  );
  if (!r) throw new Error(`글자를 찾지 못했습니다: ${text}`);
  return r;
}

const care = <T>(page: Page, fn: (c: any, args: any[]) => T, ...args: unknown[]): Promise<T> =>
  page.evaluate(
    ([src, a]) => {
      const c = (window.__dotline!.game as any).scene.getScene('Care');
      return new Function('c', 'args', `return (${src})(c, args)`)(c, a);
    },
    [fn.toString(), args] as const,
  ) as Promise<T>;

const state = <T>(
  page: Page,
  fn: (s: any, d: any, args: any[]) => T,
  ...args: unknown[]
): Promise<T> =>
  page.evaluate(
    ([src, a]) => {
      const d = window.__dotline as any;
      return new Function('s', 'd', 'args', `return (${src})(s, d, args)`)(d.services.state, d, a);
    },
    [fn.toString(), args] as const,
  ) as Promise<T>;

async function openCare(page: Page, uid: string, ceremony = false): Promise<void> {
  await page.evaluate(
    ([u, c]) => {
      const sc = (window.__dotline!.game as any).scene;
      sc.getScene('Hub')
        .scene.get('UIOverlay')
        .transitionTo('Hub', 'Care', { uid: u, ceremony: c });
    },
    [uid, ceremony] as const,
  );
  await waitForScene(page, 'Care');
  await page.waitForTimeout(300);
}

async function pickTool(page: Page, id: string): Promise<void> {
  const b = await care(
    page,
    (c, [tid]) => {
      const btn = c.toolButtons.get(tid);
      return { x: btn.x, y: btn.y };
    },
    id,
  );
  await clickGame(page, b.x, b.y);
  await page.waitForTimeout(120);
}

async function plantCenter(page: Page): Promise<{ x: number; y: number }> {
  return care(page, (c) => ({ x: c.body.centerX, y: c.body.centerY }));
}

test.describe('M2 — 허브', () => {
  test('새 게임: 시작 지급품 · 허브 화면 · 가로 이동 · 스크린샷(팔레트 순도)', async ({ page }) => {
    const issues = watchConsole(page);
    await newGame(page);
    const inv = await state(page, (s) => s.inventory);
    expect(inv['seed:P011']).toBe(1);
    expect(inv.GREEN).toBeGreaterThan(0);
    expect(inv['pot:CLAY:2']).toBeGreaterThan(0);
    const texts = await visibleTexts(page, 'Hub');
    for (const key of ['hub.quick.bag', 'hub.quick.sortie']) expect(texts).toContain(ko[key]);

    // 가로 이동: 오른쪽 화살표
    const pan0 = await page.evaluate(
      () => (window.__dotline!.game as any).scene.getScene('Hub').pan,
    );
    await clickGame(page, 630, 180);
    await page.waitForTimeout(700);
    const pan1 = await page.evaluate(
      () => (window.__dotline!.game as any).scene.getScene('Hub').pan,
    );
    expect(pan1).toBeGreaterThan(pan0 + 100);
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(600);
    await page.keyboard.up('ArrowLeft');
    const pan2 = await page.evaluate(
      () => (window.__dotline!.game as any).scene.getScene('Hub').pan,
    );
    expect(pan2).toBeLessThan(pan1);

    // 스크린샷: 디버그 오버레이(왼쪽 위)를 뺀 영역의 색이 모두 팔레트 안에 있다
    await page.evaluate(() =>
      (window.__dotline!.game as any).scene.getScene('Hub').applyPan?.(320),
    );
    await page.waitForTimeout(300);
    const shot = await page.screenshot({ path: `${SHOT_DIR}/m2-hub.png` });
    const clip = await page.screenshot({
      clip: { x: 400, y: 80, width: 480, height: 480 },
    });
    expect(strayColors(clip).slice(0, 5)).toEqual([]);
    expect(shot.length).toBeGreaterThan(1000);
    expect(issues).toEqual([]);
  });

  test('씨앗 상자를 누르면 씨앗 목록이 뜨고, 고르면 선반에 심긴다(퐁)', async ({ page }) => {
    const issues = watchConsole(page);
    await newGame(page);
    await page.evaluate(() => (window.__dotline!.game as any).scene.getScene('Hub').applyPan(0));
    await page.waitForTimeout(200);
    // 씨앗 상자(월드 350,330) → 화면 x = 350 - pan
    await clickGame(page, HUB_OBJECTS.seedBox.x, HUB_OBJECTS.seedBox.y - 10);
    await page.waitForTimeout(500);
    expect(await visibleTexts(page, 'UIOverlay')).toContain(ko['seed.title']);
    const row = await findButton(page, 'UIOverlay', `${ko['plant.P011.name']}  ×1`);
    await clickGame(page, row.x, row.y);
    await page.waitForTimeout(500);
    const plants = await state(page, (s) => s.plants.map((p: any) => p.speciesId));
    expect(plants).toEqual(['P011']);
    expect(await state(page, (s) => s.inventory['seed:P011'] ?? 0)).toBe(0);
    await page.screenshot({ path: `${SHOT_DIR}/m2-planted.png` });
    expect(issues).toEqual([]);
  });

  test('축음기 · 블라인드 · 난로를 눌러 온실 설정을 바꾼다(레벨 해금)', async ({ page }) => {
    const issues = watchConsole(page);
    await newGame(page);
    await state(page, (s) => {
      s.player.level = 6;
    });
    // 레벨이 바뀌었으니 허브를 다시 연다
    await page.evaluate(() => {
      const sc = (window.__dotline!.game as any).scene;
      sc.getScene('Hub').scene.restart();
    });
    await page.waitForTimeout(600);
    // 축음기(월드 800,330): pan 을 맞추고 누른다
    await page.evaluate(() => (window.__dotline!.game as any).scene.getScene('Hub').applyPan(480));
    await page.waitForTimeout(200);
    await clickGame(page, HUB_OBJECTS.phonograph.x - 480, HUB_OBJECTS.phonograph.y - 18);
    await page.waitForTimeout(500);
    expect(await visibleTexts(page, 'UIOverlay')).toContain(ko['music.title']);
    const g = await findButton(page, 'UIOverlay', ko['music.LULLABY']);
    await clickGame(page, g.x, g.y);
    await page.waitForTimeout(400);
    expect(await state(page, (s) => s.garden.music)).toBe('LULLABY');
    // 난로(월드 1318,330)
    await page.evaluate(() => (window.__dotline!.game as any).scene.getScene('Hub').applyPan(960));
    await page.waitForTimeout(250);
    await clickGame(page, HUB_OBJECTS.stove.x - 960, HUB_OBJECTS.stove.y - 10);
    await page.waitForTimeout(300);
    expect(await state(page, (s) => s.garden.stove)).toBe(true);
    expect(issues).toEqual([]);
  });
});

test.describe('M2 — 돌보기 18종', () => {
  test('물 · 분무 · 영양제 · 퇴비 · 뼛가루 · 솔 · 핀셋 · 가위 · 모양 · 쓰다듬기 · 말 걸기 · 간식 · 분갈이 · 지지대 · 수확', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const issues = watchConsole(page);
    await newGame(page);
    // 준비: 레벨 10, 물건 넉넉히, 식물 2그루(선인장 · 덩굴)
    const uids = await state(page, (s, d) => {
      s.player.level = 10;
      for (const [k, n] of Object.entries({
        GREEN: 5,
        BONE_1: 5,
        COMPOST: 5,
        SNACK_BUG_JAR: 3,
        'pot:CLAY:2': 3,
        'pot:CLAY:3': 3,
      }))
        s.inventory[k] = n;
      const hub = d.game.scene.getScene('Hub');
      s.inventory['seed:P002'] = 1;
      hub.plantSeedAt('P011', { zone: 'WINDOW', slot: 0 });
      hub.plantSeedAt('P002', { zone: 'WINDOW', slot: 1 }); // 지지대 없이 키우는 종
      s.inventory['seed:P001'] = 1;
      hub.plantSeedAt('P001', { zone: 'WINDOW', slot: 2 }); // 덩굴: 지지대가 필요한 종
      // 이 테스트는 눈뜨기 연출을 따로 보지 않는다(그늘 등급은 6분이면 개화해 도중에 새싹이 된다)
      for (const p of s.plants) {
        p.flags.eyesOpened = true;
        p.flags.personalityRolled = true;
      }
      return s.plants.map((p: any) => p.uid);
    });
    const [cactus, , vine] = uids as string[];
    // 선인장을 새싹(성격 확정 · 이름 짓기 끝난 상태)으로
    await state(
      page,
      (s, _d, [uid]) => {
        const p = s.plants.find((q: any) => q.uid === uid);
        p.stage = 3;
        p.flags.eyesOpened = true;
        p.flags.personalityRolled = true;
        p.flags.repotted2 = true;
        p.nickname = '콩이';
        p.gp = 100;
        p.needs.water = 20;
        p.needs.mood = 40;
      },
      cactus,
    );
    await openCare(page, cactus);
    await page.screenshot({ path: `${SHOT_DIR}/m2-care.png` });

    const mastery = () => state(page, (s) => ({ ...s.mastery }));

    // 1. 물주기: 누르고 있다 뗀다
    await pickTool(page, 'water');
    const c0 = await plantCenter(page);
    await hold(page, c0.x, c0.y, 1100);
    expect((await mastery()).WATER).toBe(1);
    expect(await state(page, (s) => s.plants[0].needs.water)).toBeGreaterThan(35);

    // 2. 분무: 연타 4번
    await pickTool(page, 'mist');
    for (let i = 0; i < 4; i++) {
      await clickGame(page, c0.x, c0.y);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(900);
    expect((await mastery()).MIST).toBe(1);

    // 3. 영양제: 앰플을 끌어다 흙에 놓는다
    await pickTool(page, 'nutrient');
    const chip = await textPos(page, 'Care', ko['item.GREEN']);
    const soil = await care(page, (c) => ({ x: c.soil.centerX, y: c.soil.centerY }));
    await drag(page, [
      [chip.x + 10, chip.y + 4],
      [soil.x + 40, soil.y - 40],
      [soil.x, soil.y],
    ]);
    expect((await mastery()).NUTRIENT).toBe(1);

    // 4. 퇴비: 흙 위에서 원 2바퀴
    await pickTool(page, 'compost');
    const ring: [number, number][] = [];
    for (let i = 0; i <= 100; i++) {
      const a = (i / 24) * Math.PI;
      ring.push([soil.x + Math.cos(a) * 22, soil.y + Math.sin(a) * 6 + 2]);
    }
    await drag(page, ring, 14);
    expect((await mastery()).COMPOST).toBe(1);

    // 5. 뼛가루: 끌어다 좌우로 3번 흔들기
    await pickTool(page, 'bone');
    const bchip = await textPos(page, 'Care', ko['item.BONE_1']);
    await drag(page, [
      [bchip.x + 10, bchip.y + 4],
      [c0.x, c0.y],
      [c0.x + 30, c0.y],
      [c0.x - 30, c0.y],
      [c0.x + 30, c0.y],
      [c0.x + 30, c0.y],
    ]);
    expect((await mastery()).BONE).toBe(1);

    // 6. 곰팡이 닦기: 점 위를 3번 왕복
    await state(page, (s) => {
      s.plants[0].problems.push({ kind: 'MOLD', since: Date.now(), x: 0.4, y: 0.5 });
    });
    await care(page, (c) => c.syncProblems());
    await pickTool(page, 'scrub');
    const spot = await care(page, (c) =>
      c.problemPos(c.plant.problems.find((q: any) => q.kind === 'MOLD')),
    );
    const rub: [number, number][] = [[spot.x - 6, spot.y]];
    for (let i = 0; i < 8; i++) rub.push([spot.x + (i % 2 === 0 ? 8 : -8), spot.y]);
    await drag(page, rub, 30);
    expect((await mastery()).SCRUB).toBe(1);
    expect(await state(page, (s) => s.plants[0].problems.some((q: any) => q.kind === 'MOLD'))).toBe(
      false,
    );

    // 7. 벌레 잡기: 기어다니는 벌레를 하나씩
    await state(page, (s) => {
      s.plants[0].problems.push({ kind: 'PEST', since: Date.now(), n: 2 });
    });
    await pickTool(page, 'pest');
    for (let guard = 0; guard < 20; guard++) {
      const bug = await care(page, (c) => {
        const b = c.tool?.bugs?.[0];
        return b ? { x: b.img.x, y: b.img.y } : null;
      });
      if (!bug) break;
      await clickGame(page, bug.x, bug.y);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    expect((await mastery()).PEST).toBe(1);
    expect(await state(page, (s) => s.inventory.BUG_JAR ?? 0)).toBeGreaterThanOrEqual(2);

    // 8. 가지치기: 시든 잎을 가로질러 긋는다
    await state(page, (s) => {
      s.plants[0].problems.push({ kind: 'WITHER', since: Date.now(), x: 0.7, y: 0.3 });
    });
    await care(page, (c) => c.syncProblems());
    await pickTool(page, 'prune');
    const leaf = await care(page, (c) =>
      c.problemPos(c.plant.problems.find((q: any) => q.kind === 'WITHER')),
    );
    await drag(
      page,
      [
        [leaf.x - 14, leaf.y - 6],
        [leaf.x, leaf.y],
        [leaf.x + 14, leaf.y + 6],
      ],
      30,
    );
    expect((await mastery()).PRUNE).toBe(1);

    // 9. 모양 다듬기(성숙 이상): 단정
    await state(page, (s) => {
      s.plants[0].stage = 4;
    });
    await pickTool(page, 'hand');
    await pickTool(page, 'prune');
    const neat = await textPos(page, 'Care', ko['care.shape.NEAT']);
    await clickGame(page, neat.x + 6, neat.y + 4);
    await page.waitForTimeout(150);
    expect((await mastery()).SHAPE).toBe(1);

    // 12. 쓰다듬기: 1.5초 넘게 문지르기
    await pickTool(page, 'hand');
    const rubPath: [number, number][] = [];
    for (let i = 0; i < 60; i++) rubPath.push([c0.x + (i % 2 === 0 ? 10 : -10), c0.y]);
    await drag(page, rubPath, 35);
    expect((await mastery()).PET).toBeGreaterThanOrEqual(1);

    // 13. 말 걸기
    await pickTool(page, 'talk');
    const phrase = await textPos(page, 'Care', ko['care.phrase.CHEER']);
    await clickGame(page, phrase.x + 8, phrase.y + 4);
    expect((await mastery()).TALK).toBe(1);

    // 17. 간식: 입 근처로 끌어다 주기
    await pickTool(page, 'snack');
    const sn = await textPos(page, 'Care', ko['item.SNACK_BUG_JAR']);
    await drag(page, [
      [sn.x + 10, sn.y + 4],
      [c0.x, c0.y - 40],
      [c0.x, c0.y - 30],
    ]);
    expect((await mastery()).SNACK).toBe(1);

    // 10. 분갈이: 뽑기 → 화분 → 흙 → 흙 채우기 3번 → 토닥토닥 3번
    await state(page, (s) => {
      s.plants[0].stage = 3;
    });
    await care(page, (c) => c.syncProblems());
    await pickTool(page, 'repot');
    await drag(page, [
      [c0.x, c0.y],
      [c0.x, c0.y - 20],
      [c0.x, c0.y - 40],
    ]);
    const potChip = await textPos(page, 'Care', `${ko['pot.CLAY']} (${ko['pot.size.2']})`);
    await clickGame(page, potChip.x + 8, potChip.y + 4);
    const soilChip = await textPos(page, 'Care', ko['soil.BASIC']);
    await clickGame(page, soilChip.x + 8, soilChip.y + 4);
    for (let i = 0; i < 6; i++) {
      await clickGame(page, c0.x, c0.y);
      await page.waitForTimeout(120);
    }
    expect((await mastery()).REPOT).toBe(1);

    // 18. 수확: 개화한 식물의 열매를 누른다
    await state(page, (s) => {
      const p = s.plants[0];
      p.stage = 5;
      p.gp = 99999;
    });
    await care(page, (c) => c.buildToolbar());
    await pickTool(page, 'hand'); // 수확 목표(열매)는 도구를 고를 때 만들어진다
    const fruit = await care(page, (c) => {
      const f = c.tool?.fruit?.[0];
      return f ? { x: f.x, y: f.y } : null;
    });
    expect(fruit).not.toBeNull();
    await clickGame(page, fruit!.x, fruit!.y);
    await page.waitForTimeout(200);
    expect((await mastery()).HARVEST).toBe(1);
    expect(await state(page, (s) => s.inventory.POLLEN ?? 0)).toBeGreaterThan(0);

    // 11. 지지대: 덩굴 식물 옆에 꽂기
    await state(
      page,
      (s, _d, [uid]) => {
        const p = s.plants.find((q: any) => q.uid === uid);
        p.stage = 3;
        p.flags.eyesOpened = true;
        p.flags.personalityRolled = true;
        p.nickname = '덩이';
      },
      vine,
    );
    await page.evaluate(() =>
      (window.__dotline!.game as any).scene
        .getScene('Care')
        .scene.get('UIOverlay')
        .transitionTo('Care', 'Hub'),
    );
    await waitForScene(page, 'Hub');
    await openCare(page, vine);
    await pickTool(page, 'stake');
    const stem = await care(page, (c) => ({ x: c.stemX, y: c.body.centerY }));
    await drag(page, [
      [300, 250],
      [stem.x - 20, stem.y],
      [stem.x, stem.y],
    ]);
    expect((await mastery()).STAKE).toBe(1);
    expect(
      await state(page, (s) => s.plants.find((q: any) => q.speciesId === 'P001').flags.staked),
    ).toBe(true);

    // 14–16 (축음기 · 블라인드 · 난로)는 허브에서: 앞 테스트가 확인했다. 숙련도 합계로 18종 전부 사용했는지 본다.
    await state(page, (_s, d) => {
      const hub = d.game.scene.getScene('Hub');
      hub.setMusicGenre('LULLABY');
      hub.cycleBlind('WINDOW');
      hub.toggleDevice('fan');
    });
    const final = await mastery();
    for (const k of [
      'WATER',
      'MIST',
      'NUTRIENT',
      'BONE',
      'COMPOST',
      'SCRUB',
      'PEST',
      'PRUNE',
      'SHAPE',
      'REPOT',
      'STAKE',
      'PET',
      'TALK',
      'MUSIC',
      'LIGHT',
      'TEMP',
      'SNACK',
      'HARVEST',
    ])
      expect(final[k], k).toBeGreaterThanOrEqual(1);
    expect(issues).toEqual([]);
  });
});

test.describe('M2 — 처음 눈뜨기 · 이름 짓기', () => {
  test('새싹이 되면 눈뜨기 연출 후 이름 카드가 뜨고, 이름을 짓는다', async ({ page }) => {
    test.setTimeout(90_000);
    const issues = watchConsole(page);
    await newGame(page);
    const base = PLANT_BASE_BY_ID.get('P011')!;
    const uid = await state(
      page,
      (s, d, [gp]) => {
        const hub = d.game.scene.getScene('Hub');
        hub.plantSeedAt('P011', { zone: 'WINDOW', slot: 0 });
        const p = s.plants[0];
        p.stage = 1;
        p.gp = gp as number;
        return p.uid;
      },
      thresholdGp(base, 2) - 0.2,
    );
    // 라이브 틱으로 새싹이 되는 순간 → 허브가 눈뜨기 연출로 간다
    await page.waitForFunction(() => (window.__dotline!.game as any).scene.isActive('Care'), null, {
      timeout: 20_000,
    });
    await settle(page);
    expect(await state(page, (s) => s.plants[0].flags.needsName)).toBe(true);
    await page.screenshot({ path: `${SHOT_DIR}/m2-eyes-closed.png` });
    // 이름 카드 (눈뜨기 연출 약 4초 뒤)
    await page.waitForSelector('#plant-name', { timeout: 15_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOT_DIR}/m2-name-card.png` });
    // 잘못된 이름은 막고 안내한다
    await page.fill('#plant-name', '');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(await state(page, (s) => s.plants[0].nickname)).toBe('');
    await page.fill('#plant-name', '몽글');
    const ok = await findButton(page, 'Care', ko['name.confirm']);
    await clickGame(page, ok.x, ok.y);
    await page.waitForTimeout(700);
    expect(await state(page, (s) => s.plants[0].nickname)).toBe('몽글');
    expect(await state(page, (s) => s.plants[0].flags.needsName)).toBeUndefined();
    expect(await page.$('#plant-name')).toBeNull();
    await page.screenshot({ path: `${SHOT_DIR}/m2-name-stamp.png` });
    expect(uid).toBeTruthy();
    expect(issues).toEqual([]);
  });
});

test.describe('M2 — 치트 패널(디버그 시간 가속)', () => {
  test('C 키로 열고 시간 +12시간을 누르면 식물이 자라고 오프라인 카드가 나온다', async ({
    page,
  }) => {
    const issues = watchConsole(page);
    await newGame(page);
    await state(page, (s, d) => {
      d.game.scene.getScene('Hub').plantSeedAt('P011', { zone: 'WINDOW', slot: 0 });
      s.plants[0].flags.eyesOpened = true;
      s.plants[0].flags.personalityRolled = true;
    });
    await page.keyboard.press('c');
    await page.waitForTimeout(400);
    expect(await visibleTexts(page, 'UIOverlay')).toContain('Cheats (debug)');
    const row = await findButton(page, 'UIOverlay', 'Time +12 hours');
    await clickGame(page, row.x, row.y);
    await page.waitForTimeout(1500);
    expect(await state(page, (s) => s.plants[0].gp)).toBeGreaterThan(100);
    expect(await visibleTexts(page, 'UIOverlay')).toContain(ko['offline.title']);
    expect(issues).toEqual([]);
  });
});

test.describe('M2 — 오프라인', () => {
  test('접속하지 않은 시간만큼 자라고 "그동안 있었던 일" 카드가 나온다', async ({ page }) => {
    const issues = watchConsole(page);
    await newGame(page);
    await state(page, (s, d) => {
      d.game.scene.getScene('Hub').plantSeedAt('P011', { zone: 'WINDOW', slot: 0 });
      s.plants[0].stage = 1;
      s.plants[0].flags.eyesOpened = true;
      s.plants[0].flags.personalityRolled = true;
      s.plants[0].nickname = '콩이';
      s.garden.lastTickAt = Date.now() - 5 * 3_600_000; // 5시간 전에 닫았다
      s.meta.lastPlayedAt = Date.now() - 5 * 3_600_000;
    });
    await page.waitForTimeout(900);
    const texts = await visibleTexts(page, 'UIOverlay');
    expect(texts).toContain(ko['offline.title']);
    expect(await state(page, (s) => s.plants[0].gp)).toBeGreaterThan(100);
    await page.screenshot({ path: `${SHOT_DIR}/m2-offline.png` });
    expect(issues).toEqual([]);
  });
});
