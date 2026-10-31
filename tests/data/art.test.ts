import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  PALETTE,
  PALETTE_SET,
  RAMPS,
  SPECIAL,
  UI,
  isPaletteColor,
  toInt,
} from '../../src/art/palette';

describe('팔레트 (02문서 2절: 66색 고정)', () => {
  it('램프 12개 × 5단계 + 특수색 6개 = 66색, 중복 없음', () => {
    expect(Object.keys(RAMPS)).toHaveLength(12);
    for (const ramp of Object.values(RAMPS)) expect(ramp).toHaveLength(5);
    expect(Object.keys(SPECIAL)).toHaveLength(6);
    expect(PALETTE).toHaveLength(66);
    expect(PALETTE_SET.size).toBe(66);
  });

  it('모두 소문자 #rrggbb 형식', () => {
    for (const c of PALETTE) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('UI 기본 색(02문서 8절)은 팔레트 안의 값이다', () => {
    for (const c of Object.values(UI)) expect(isPaletteColor(c), c).toBe(true);
    expect(UI.woodLight).toBe('#7b5337');
    expect(UI.positive).toBe('#4b8c42');
    expect(UI.warning).toBe('#e36540');
    expect(UI.info).toBe('#3e80b6');
  });

  it('각 램프는 0(어두움) → 4(밝음)로 명도가 오른다', () => {
    const luma = (hex: string) => {
      const n = toInt(hex);
      return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
    };
    for (const [id, ramp] of Object.entries(RAMPS)) {
      for (let i = 1; i < 5; i++)
        expect(luma(ramp[i]), `${id}[${i}]`).toBeGreaterThan(luma(ramp[i - 1]));
    }
  });

  it('팔레트 밖 색은 걸러진다', () => {
    expect(isPaletteColor('#000000')).toBe(false);
    expect(isPaletteColor('#FDFBF5')).toBe(true); // 대소문자 무시
  });
});

describe('폰트 · 라이선스 (12문서 1절)', () => {
  it('갈무리 woff2 와 OFL 문서가 public/fonts 에 있다', () => {
    for (const f of ['Galmuri7', 'Galmuri9', 'Galmuri11', 'Galmuri11-Bold', 'Galmuri14']) {
      expect(existsSync(`public/fonts/${f}.woff2`), f).toBe(true);
    }
    expect(readFileSync('public/fonts/OFL.txt', 'utf8')).toContain('SIL OPEN FONT LICENSE');
  });

  it('THIRD_PARTY_LICENSES.md 가 Phaser · ZzFX · Galmuri 를 모두 적는다', () => {
    const text = readFileSync('THIRD_PARTY_LICENSES.md', 'utf8');
    for (const name of ['Phaser', 'ZzFX', 'Galmuri']) expect(text).toContain(name);
  });
});
