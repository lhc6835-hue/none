// 식물 이름 규칙 (12문서 11절): 1–8자, 한글 · 영문 · 숫자. 금칙어는 간단한 목록으로 거른다.

import bannedWords from '../data/bannedWords.json';

export const NAME_MIN = 1;
export const NAME_MAX = 8;

export type NameError = 'length' | 'chars' | 'banned';
export type NameCheck = { ok: true; name: string } | { ok: false; error: NameError };

// 가-힣 = U+AC00–U+D7A3
const ALLOWED = /^[가-힣A-Za-z0-9]+$/;

export function validateName(input: string): NameCheck {
  const name = input.trim();
  // 글자 수는 화면에 보이는 글자 기준(이모지 등이 섞여도 코드 단위가 아니라 글자 단위)
  const length = [...name].length;
  if (length < NAME_MIN || length > NAME_MAX) return { ok: false, error: 'length' };
  if (!ALLOWED.test(name)) return { ok: false, error: 'chars' };
  const squashed = name.toLowerCase().replace(/[0-9]/g, '');
  if (bannedWords.words.some((w) => squashed.includes(w))) return { ok: false, error: 'banned' };
  return { ok: true, name };
}
