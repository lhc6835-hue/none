// 문자열 가져오기. 화면에 나오는 모든 글자는 ko.json / en.json 에서 온다(12문서 4절 5항).
//
// 보간:  "{n}마리"            → t('key', { n: 3 })
// 조사:  "{name|이/가} 목말라요" → t('key', { name: '콩이' })  → "콩이가 목말라요"
//         (이름 뒤에 알맞은 조사가 자동으로 붙는다. '이(가)' 식 얼버무리기는 쓰지 않는다)

import type { Language } from '../core/Settings';
import { attach, isJosaPair } from './josa';
import en from './en.json';
import ko from './ko.json';

export type StringTable = Record<string, string>;
export type Params = Record<string, string | number>;

export const TABLES: Record<Language, StringTable> = { ko, en };

let current: Language = 'ko';
const warned = new Set<string>();

export function setLanguage(lang: Language): void {
  current = lang;
}

export function getLanguage(): Language {
  return current;
}

export function hasKey(key: string, lang: Language = current): boolean {
  return Object.prototype.hasOwnProperty.call(TABLES[lang], key);
}

const TOKEN = /\{(\w+)(?:\|([^}]+))?\}/g;

export function format(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(TOKEN, (whole, name: string, pair?: string) => {
    if (!(name in params)) return whole;
    const value = String(params[name]);
    if (pair === undefined) return value;
    return isJosaPair(pair) ? attach(value, pair) : value;
  });
}

export function t(key: string, params?: Params): string {
  const raw = TABLES[current][key] ?? TABLES.ko[key];
  if (raw === undefined) {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[i18n] 문자열 키가 없습니다: ${key}`);
    }
    return `[${key}]`;
  }
  return format(raw, params);
}
