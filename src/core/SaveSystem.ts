// 저장 (12문서 6절)
//  - localStorage 키 dotline.save.v1(본 저장) + dotline.save.backup(직전 정상 저장본)
//  - 형식 { version, savedAt, checksum, state }, checksum = state JSON의 CRC32
//  - 체크섬이 틀리면 백업으로 복구
//  - 내보내기 · 가져오기: base64(JSON)

import { crc32 } from './crc32';
import { normalizeState, SAVE_VERSION, type GameState } from './GameState';
import { MIGRATIONS, migrateState, type MigrationTable } from './migrations';

export const SAVE_KEY = 'dotline.save.v1';
export const BACKUP_KEY = 'dotline.save.backup';
/** 저장 용량 목표(바이트) */
export const SAVE_SIZE_TARGET = 500 * 1024;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveEnvelope {
  version: number;
  savedAt: number;
  checksum: number;
  state: unknown;
}

export type LoadResult =
  /** 저장이 아예 없음 → 새 게임 */
  | { status: 'none' }
  /** 정상 */
  | { status: 'ok'; state: GameState; savedAt: number }
  /** 본 저장이 손상되어 직전 저장본으로 불러옴 */
  | { status: 'recovered'; state: GameState; savedAt: number }
  /** 본 저장과 백업이 모두 손상됨 → 새 게임(손상본은 보존) */
  | { status: 'corrupt' }
  /** 이 게임보다 새 버전에서 만든 저장 → 덮어쓰지 않는다 */
  | { status: 'tooNew'; version: number };

export type SaveResult = { ok: true; bytes: number } | { ok: false; reason: string };
export type ImportResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: 'format' | 'checksum' | 'tooNew' | 'migrate' };

type Parsed = { kind: 'ok'; envelope: SaveEnvelope } | { kind: 'broken' };

/** 문자열을 봉투로 읽고 체크섬을 확인한다. */
function parseEnvelope(raw: string | null): Parsed | null {
  if (raw === null) return null;
  try {
    const env = JSON.parse(raw) as Partial<SaveEnvelope> | null;
    if (
      !env ||
      typeof env !== 'object' ||
      typeof env.version !== 'number' ||
      typeof env.checksum !== 'number' ||
      env.state === undefined
    ) {
      return { kind: 'broken' };
    }
    if (crc32(JSON.stringify(env.state)) !== env.checksum) return { kind: 'broken' };
    return { kind: 'ok', envelope: env as SaveEnvelope };
  } catch {
    return { kind: 'broken' };
  }
}

export function makeEnvelope(state: GameState, savedAt: number): SaveEnvelope {
  return { version: state.version, savedAt, checksum: crc32(JSON.stringify(state)), state };
}

export class SaveSystem {
  /** 새 버전 저장을 만났을 때 true. 이 동안은 저장을 막아 원본을 지킨다. */
  blocked = false;

  constructor(
    private readonly storage: StorageLike,
    private readonly migrations: MigrationTable = MIGRATIONS,
    private readonly currentVersion: number = SAVE_VERSION,
  ) {}

  /** 본 저장을 읽는다. 손상되면 백업으로 복구한다. */
  load(): LoadResult {
    const mainRaw = this.read(SAVE_KEY);
    const backupRaw = this.read(BACKUP_KEY);
    if (mainRaw === null && backupRaw === null) return { status: 'none' };

    const main = parseEnvelope(mainRaw);
    if (main?.kind === 'ok') {
      const r = this.finish(main.envelope);
      if (r.status === 'tooNew') this.blocked = true;
      if (r.status !== 'corrupt') return r;
    }
    const backup = parseEnvelope(backupRaw);
    if (backup?.kind === 'ok') {
      const r = this.finish(backup.envelope);
      if (r.status === 'ok') return { status: 'recovered', state: r.state, savedAt: r.savedAt };
      if (r.status === 'tooNew') this.blocked = true;
      return r;
    }
    return { status: 'corrupt' };
  }

  /** 마이그레이션까지 마친 결과 */
  private finish(env: SaveEnvelope): LoadResult {
    if (env.version > this.currentVersion) return { status: 'tooNew', version: env.version };
    try {
      const migrated = migrateState(env.state, env.version, this.currentVersion, this.migrations);
      const state = normalizeState(migrated as GameState);
      state.version = this.currentVersion;
      return { status: 'ok', state, savedAt: env.savedAt };
    } catch {
      return { status: 'corrupt' };
    }
  }

  /**
   * 저장. 지금 본 저장이 정상일 때만 백업으로 돌린다(손상본으로 좋은 백업을 덮지 않기 위해).
   */
  save(state: GameState, now: number): SaveResult {
    if (this.blocked) return { ok: false, reason: 'blocked' };
    try {
      const currentRaw = this.read(SAVE_KEY);
      if (currentRaw !== null && parseEnvelope(currentRaw)?.kind === 'ok') {
        this.storage.setItem(BACKUP_KEY, currentRaw);
      }
      state.meta.lastPlayedAt = now;
      state.meta.saveCount += 1;
      const text = JSON.stringify(makeEnvelope(state, now));
      this.storage.setItem(SAVE_KEY, text);
      return { ok: true, bytes: text.length };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'unknown' };
    }
  }

  /** 새 게임을 시작하며 기존 저장을 지운다(백업은 한 번 남겨 둔다). */
  reset(): void {
    const currentRaw = this.read(SAVE_KEY);
    if (currentRaw !== null) this.storage.setItem(BACKUP_KEY, currentRaw);
    this.storage.removeItem(SAVE_KEY);
    this.blocked = false;
  }

  hasSave(): boolean {
    return this.read(SAVE_KEY) !== null || this.read(BACKUP_KEY) !== null;
  }

  // ---- 내보내기 · 가져오기 ----

  exportCode(state: GameState, now: number): string {
    return toBase64(JSON.stringify(makeEnvelope(state, now)));
  }

  /** 가져오기 전에 현재 저장을 백업으로 돌린다. */
  importCode(code: string, now: number): ImportResult {
    let env: SaveEnvelope;
    try {
      const parsed = parseEnvelope(fromBase64(code.trim()));
      if (!parsed) return { ok: false, reason: 'format' };
      if (parsed.kind === 'broken') return { ok: false, reason: 'checksum' };
      env = parsed.envelope;
    } catch {
      return { ok: false, reason: 'format' };
    }
    const result = this.finish(env);
    if (result.status === 'tooNew') return { ok: false, reason: 'tooNew' };
    if (result.status !== 'ok') return { ok: false, reason: 'migrate' };

    const currentRaw = this.read(SAVE_KEY);
    if (currentRaw !== null && parseEnvelope(currentRaw)?.kind === 'ok') {
      this.storage.setItem(BACKUP_KEY, currentRaw);
    }
    this.blocked = false;
    const saved = this.save(result.state, now);
    if (!saved.ok) return { ok: false, reason: 'format' };
    return { ok: true, state: result.state };
  }

  private read(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch {
      return null;
    }
  }
}

// ---- UTF-8 안전 base64 ----

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(code: string): string {
  const bin = atob(code);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** 메모리 저장소. 테스트와 localStorage를 못 쓰는 환경(사생활 보호 모드)의 대체품. */
export class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}
