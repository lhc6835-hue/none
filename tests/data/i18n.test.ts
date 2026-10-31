import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isJosaPair } from '../../src/i18n/josa';
import { TABLES } from '../../src/i18n';

const ko = TABLES.ko;
const en = TABLES.en;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

const TOKEN = /\{(\w+)(?:\|([^}]+))?\}/g;
const tokens = (s: string) => [...s.matchAll(TOKEN)].map((m) => m[0]).sort();

describe('i18n — 문자열 키 검사 (12문서 13절 "문자열 키 누락 없음")', () => {
  it('한국어와 영어의 키 집합이 같다', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort());
  });

  it('두 언어에서 보간 토큰({n}, {name|이/가})이 같다', () => {
    for (const key of Object.keys(ko)) {
      // 조사 토큰은 한국어에만 필요하므로 이름만 비교한다
      const names = (s: string) => [...s.matchAll(TOKEN)].map((m) => m[1]).sort();
      expect(names(en[key]), key).toEqual(names(ko[key]));
    }
  });

  it('조사 토큰은 지원하는 조사 쌍만 쓴다', () => {
    for (const [key, text] of Object.entries(ko)) {
      for (const m of text.matchAll(TOKEN)) {
        if (m[2] !== undefined) expect(isJosaPair(m[2]), `${key}: ${m[0]}`).toBe(true);
      }
    }
    expect(tokens('{a} {b|이/가}')).toHaveLength(2);
  });

  it('빈 문자열이 없다', () => {
    for (const [key, text] of Object.entries({ ...ko }))
      expect(text.length, key).toBeGreaterThan(0);
    for (const [key, text] of Object.entries({ ...en }))
      expect(text.length, key).toBeGreaterThan(0);
  });

  it('코드에서 쓰는 문자열 키가 모두 문자열 파일에 있다', () => {
    const NAMESPACES = [
      'game',
      'boot',
      'common',
      'title',
      'hub',
      'settings',
      'credits',
      'name',
      'save',
    ];
    const literal = new RegExp(`['"\`]((?:${NAMESPACES.join('|')})\\.[A-Za-z0-9_.]+)['"\`]`, 'g');
    const missing: string[] = [];
    for (const file of sourceFiles('src')) {
      if (file.includes('i18n')) continue;
      const code = readFileSync(file, 'utf8');
      for (const m of code.matchAll(literal)) {
        if (!(m[1] in ko)) missing.push(`${file}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
