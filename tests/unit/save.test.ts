import { describe, expect, it } from 'vitest';
import { crc32 } from '../../src/core/crc32';
import { createInitialState, SAVE_VERSION } from '../../src/core/GameState';
import { MemoryStorage, SAVE_KEY, BACKUP_KEY, SaveSystem } from '../../src/core/SaveSystem';
import type { MigrationTable } from '../../src/core/migrations';

const T0 = 1_700_000_000_000;

function freshState(coin = 0) {
  const s = createInitialState(T0);
  s.player.coin = coin;
  return s;
}

describe('crc32', () => {
  it('알려진 값과 일치한다', () => {
    expect(crc32('123456789')).toBe(0xcbf43926);
    expect(crc32('')).toBe(0);
  });
});

describe('SaveSystem — 저장 → 불러오기 왕복', () => {
  it('저장한 상태가 그대로 돌아온다', () => {
    const storage = new MemoryStorage();
    const save = new SaveSystem(storage);
    const state = freshState(123);
    state.player.name = '콩이네 정원';
    state.flags.tutorialSeen = true;

    expect(save.save(state, T0 + 1000).ok).toBe(true);
    const loaded = new SaveSystem(storage).load();
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state).toEqual(state);
    expect(loaded.savedAt).toBe(T0 + 1000);
  });

  it('저장이 없으면 none', () => {
    expect(new SaveSystem(new MemoryStorage()).load().status).toBe('none');
  });

  it('저장할 때마다 saveCount와 lastPlayedAt이 갱신된다', () => {
    const save = new SaveSystem(new MemoryStorage());
    const state = freshState();
    save.save(state, T0 + 5);
    save.save(state, T0 + 9);
    expect(state.meta.saveCount).toBe(2);
    expect(state.meta.lastPlayedAt).toBe(T0 + 9);
  });
});

describe('SaveSystem — 체크섬 손상 → 백업 복구', () => {
  it('본 저장이 손상되면 직전 저장본으로 복구한다', () => {
    const storage = new MemoryStorage();
    const save = new SaveSystem(storage);
    save.save(freshState(100), T0 + 1); // 저장 1
    save.save(freshState(200), T0 + 2); // 저장 2 (저장 1이 백업으로)

    // 본 저장의 내용을 몰래 바꾼다(체크섬은 그대로)
    const raw = storage.getItem(SAVE_KEY) as string;
    storage.setItem(SAVE_KEY, raw.replace('"coin":200', '"coin":999999'));

    const result = new SaveSystem(storage).load();
    expect(result.status).toBe('recovered');
    if (result.status !== 'recovered') return;
    expect(result.state.player.coin).toBe(100);
  });

  it('JSON이 깨져도 백업으로 복구한다', () => {
    const storage = new MemoryStorage();
    const save = new SaveSystem(storage);
    save.save(freshState(1), T0 + 1);
    save.save(freshState(2), T0 + 2);
    storage.setItem(SAVE_KEY, '{"version":1,"state":');
    expect(new SaveSystem(storage).load().status).toBe('recovered');
  });

  it('복구 후 저장해도 좋은 백업을 손상본으로 덮지 않는다', () => {
    const storage = new MemoryStorage();
    const save = new SaveSystem(storage);
    save.save(freshState(1), T0 + 1);
    save.save(freshState(2), T0 + 2);
    storage.setItem(SAVE_KEY, 'garbage');

    const sys = new SaveSystem(storage);
    const loaded = sys.load();
    expect(loaded.status).toBe('recovered');
    // 복구한 상태를 다시 저장: 본 저장이 손상 상태이므로 백업은 그대로 있어야 한다
    if (loaded.status === 'recovered') sys.save(loaded.state, T0 + 3);
    expect(new SaveSystem(storage).load().status).toBe('ok');
    expect(storage.getItem(BACKUP_KEY)).not.toBe('garbage');
  });

  it('본 저장과 백업이 모두 손상되면 corrupt', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, 'x');
    storage.setItem(BACKUP_KEY, 'y');
    expect(new SaveSystem(storage).load().status).toBe('corrupt');
  });
});

describe('SaveSystem — 마이그레이션', () => {
  it('옛 버전 저장이 최신으로 올라온다', () => {
    const storage = new MemoryStorage();
    // v1 형식의 옛 저장 샘플을 만든다: player.coin 이 plain number 이던 시절
    const old = { ...freshState(50), version: 1 };
    new SaveSystem(storage, {}, 1).save(old, T0);

    // v2 에서는 player.gold 로 이름을 바꿨다고 가정한 마이그레이션
    const table: MigrationTable = {
      1: (s) => {
        const st = s as { player: Record<string, unknown> };
        const { coin, ...rest } = st.player;
        return { ...st, player: { ...rest, gold: coin } };
      },
    };
    const upgraded = new SaveSystem(storage, table, 2).load();
    expect(upgraded.status).toBe('ok');
    if (upgraded.status !== 'ok') return;
    expect(upgraded.state.version).toBe(2);
    expect((upgraded.state.player as unknown as { gold: number }).gold).toBe(50);
  });

  it('마이그레이션 함수가 빠져 있으면 오류 대신 corrupt', () => {
    const storage = new MemoryStorage();
    new SaveSystem(storage, {}, 1).save(freshState(), T0);
    expect(new SaveSystem(storage, {}, 3).load().status).toBe('corrupt');
  });

  it('더 새 버전의 저장은 tooNew 이고 덮어쓰지 않는다', () => {
    const storage = new MemoryStorage();
    new SaveSystem(storage, {}, 9).save({ ...freshState(), version: 9 }, T0);
    const sys = new SaveSystem(storage, {}, SAVE_VERSION);
    expect(sys.load().status).toBe('tooNew');
    const before = storage.getItem(SAVE_KEY);
    expect(sys.save(freshState(), T0 + 1).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(before);
  });
});

describe('SaveSystem — 내보내기 · 가져오기', () => {
  it('내보낸 코드를 가져오면 같은 상태가 된다 (한글 포함)', () => {
    const a = new SaveSystem(new MemoryStorage());
    const state = freshState(77);
    state.player.name = '점박이';
    const code = a.exportCode(state, T0);

    const storageB = new MemoryStorage();
    const b = new SaveSystem(storageB);
    const result = b.importCode(code, T0 + 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.player.name).toBe('점박이');
    expect(result.state.player.coin).toBe(77);
    expect(b.load().status).toBe('ok');
  });

  it('가져오기 전에 현재 저장을 백업으로 돌린다', () => {
    const storage = new MemoryStorage();
    const sys = new SaveSystem(storage);
    sys.save(freshState(1), T0);
    const code = new SaveSystem(new MemoryStorage()).exportCode(freshState(2), T0);
    expect(sys.importCode(code, T0 + 1).ok).toBe(true);
    const backup = JSON.parse(storage.getItem(BACKUP_KEY) as string) as {
      state: { player: { coin: number } };
    };
    expect(backup.state.player.coin).toBe(1);
  });

  it('깨진 코드는 거절한다', () => {
    const sys = new SaveSystem(new MemoryStorage());
    expect(sys.importCode('이건 저장 코드가 아니에요', T0).ok).toBe(false);
    const good = sys.exportCode(freshState(5), T0);
    const tampered = btoa(atob(good).replace('"coin":5', '"coin":9'));
    const r = sys.importCode(tampered, T0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('checksum');
  });
});

describe('SaveSystem — 새 게임', () => {
  it('reset 하면 본 저장이 지워지고 이전 저장은 백업에 남는다', () => {
    const storage = new MemoryStorage();
    const sys = new SaveSystem(storage);
    sys.save(freshState(42), T0);
    sys.reset();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(sys.load().status).toBe('recovered'); // 백업은 살아 있다
  });
});
