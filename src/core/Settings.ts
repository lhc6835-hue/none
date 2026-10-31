// 설정 · 접근성 (10문서 5절). 기기별 취향이라 세이브와 분리해 따로 저장한다(키 dotline.settings.v1).
// 타이틀 화면(게임 시작 전)에서도 바꿀 수 있어야 하고, 새 게임을 시작해도 유지되어야 하기 때문이다.

import type { EventBus } from './EventBus';
import type { GameEvents } from './events';
import type { StorageLike } from './SaveSystem';

export type Language = 'ko' | 'en';
export type ParticleQuality = 'HIGH' | 'MID' | 'LOW';
export type TextSize = 'NORMAL' | 'LARGE';

export interface Settings {
  language: Language;
  // 소리: 전체 · 배경음 · 효과음 · 식물 콧노래 (0–1)
  volume: { master: number; music: number; sfx: number; hum: number };
  vibration: boolean;
  // 화면
  shake: boolean;
  reduceFlash: boolean;
  particles: ParticleQuality;
  damageNumbers: boolean;
  gradeAura: boolean;
  fpsCap: 30 | 60;
  // 조작
  easyCare: boolean;
  longPressMs: number;
  leftHanded: boolean;
  // 글자 · 색각
  textSize: TextSize;
  highContrast: boolean;
  alwaysShowGradeMark: boolean;
}

export const SETTINGS_KEY = 'dotline.settings.v1';

export function defaultSettings(): Settings {
  return {
    language: 'ko',
    volume: { master: 0.8, music: 0.7, sfx: 0.9, hum: 0.8 },
    vibration: true,
    shake: true,
    reduceFlash: false,
    particles: 'MID',
    damageNumbers: true,
    gradeAura: true,
    fpsCap: 60,
    easyCare: false,
    longPressMs: 400,
    leftHanded: false,
    textSize: 'NORMAL',
    highContrast: false,
    alwaysShowGradeMark: false,
  };
}

const clamp01 = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

/** 저장된 값(믿을 수 없는 입력)을 기본값 위에 안전하게 덮어쓴다. 모르는 키와 잘못된 타입은 버린다. */
export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const vol = (r.volume && typeof r.volume === 'object' ? r.volume : {}) as Record<string, unknown>;
  const bool = (v: unknown, fb: boolean) => (typeof v === 'boolean' ? v : fb);
  const oneOf = <T extends string | number>(v: unknown, list: readonly T[], fb: T): T =>
    list.includes(v as T) ? (v as T) : fb;
  return {
    language: oneOf(r.language, ['ko', 'en'] as const, d.language),
    volume: {
      master: clamp01(vol.master, d.volume.master),
      music: clamp01(vol.music, d.volume.music),
      sfx: clamp01(vol.sfx, d.volume.sfx),
      hum: clamp01(vol.hum, d.volume.hum),
    },
    vibration: bool(r.vibration, d.vibration),
    shake: bool(r.shake, d.shake),
    reduceFlash: bool(r.reduceFlash, d.reduceFlash),
    particles: oneOf(r.particles, ['HIGH', 'MID', 'LOW'] as const, d.particles),
    damageNumbers: bool(r.damageNumbers, d.damageNumbers),
    gradeAura: bool(r.gradeAura, d.gradeAura),
    fpsCap: oneOf(r.fpsCap, [30, 60] as const, d.fpsCap),
    easyCare: bool(r.easyCare, d.easyCare),
    longPressMs:
      typeof r.longPressMs === 'number' && Number.isFinite(r.longPressMs)
        ? Math.min(1200, Math.max(150, Math.round(r.longPressMs)))
        : d.longPressMs,
    leftHanded: bool(r.leftHanded, d.leftHanded),
    textSize: oneOf(r.textSize, ['NORMAL', 'LARGE'] as const, d.textSize),
    highContrast: bool(r.highContrast, d.highContrast),
    alwaysShowGradeMark: bool(r.alwaysShowGradeMark, d.alwaysShowGradeMark),
  };
}

export class SettingsStore {
  private current: Settings;

  constructor(
    private readonly storage: StorageLike,
    private readonly bus?: EventBus<GameEvents>,
  ) {
    this.current = this.read();
  }

  get(): Settings {
    return this.current;
  }

  /** 일부만 바꾼다. volume 은 부분 갱신을 허용한다. */
  update(
    patch: Partial<Omit<Settings, 'volume'>> & { volume?: Partial<Settings['volume']> },
  ): Settings {
    const merged = sanitizeSettings({
      ...this.current,
      ...patch,
      volume: { ...this.current.volume, ...patch.volume },
    });
    this.current = merged;
    this.write();
    this.bus?.emit('settings:changed', { settings: merged });
    return merged;
  }

  private read(): Settings {
    try {
      const text = this.storage.getItem(SETTINGS_KEY);
      return text ? sanitizeSettings(JSON.parse(text)) : defaultSettings();
    } catch {
      return defaultSettings();
    }
  }

  private write(): void {
    try {
      this.storage.setItem(SETTINGS_KEY, JSON.stringify(this.current));
    } catch {
      // 저장 공간이 막혀도 이번 실행 동안은 설정이 유지된다
    }
  }
}
