import { describe, expect, it } from 'vitest';
import { attach, hasBatchim, josa } from '../../src/i18n/josa';
import { format } from '../../src/i18n';

describe('josa — 받침 판단', () => {
  it('한글: 받침 있음/없음', () => {
    expect(hasBatchim('콩')).toBe(true);
    expect(hasBatchim('별')).toBe(true); // ㄹ받침도 받침
    expect(hasBatchim('토마토')).toBe(false);
    expect(hasBatchim('콩이')).toBe(false);
  });

  it('끝의 기호 · 공백은 건너뛴다', () => {
    expect(hasBatchim('콩!')).toBe(true);
    expect(hasBatchim('토마토 ')).toBe(false);
    expect(hasBatchim('')).toBe(false);
  });
});

describe('josa — 기획서 예시', () => {
  it('이/가: "콩이가 목말라요" / "별이 목말라요"', () => {
    expect(attach('콩이', '이/가') + ' 목말라요').toBe('콩이가 목말라요');
    expect(attach('별', '이/가') + ' 목말라요').toBe('별이 목말라요');
  });

  it('을/를 · 은/는 · 와/과', () => {
    expect(josa('물', '을/를')).toBe('을');
    expect(josa('나무', '을/를')).toBe('를');
    expect(josa('솔', '은/는')).toBe('은');
    expect(josa('토마토', '은/는')).toBe('는');
    expect(josa('달', '와/과')).toBe('과');
    expect(josa('해', '와/과')).toBe('와');
  });

  it('(이)야: 받침 있으면 이야, 없으면 야', () => {
    expect(attach('콩', '(이)야')).toBe('콩이야');
    expect(attach('토마토', '(이)야')).toBe('토마토야');
  });

  it('으로/로: ㄹ받침은 "로"', () => {
    expect(josa('집', '으로/로')).toBe('으로');
    expect(josa('나무', '으로/로')).toBe('로');
    expect(josa('별', '으로/로')).toBe('로');
    expect(josa('하늘', '으로/로')).toBe('로');
  });

  it('이에요/예요 · 아/야 · 이랑/랑 · 이나/나', () => {
    expect(attach('콩', '이에요/예요')).toBe('콩이에요');
    expect(attach('토마토', '이에요/예요')).toBe('토마토예요');
    expect(attach('콩', '아/야')).toBe('콩아');
    expect(attach('토마토', '아/야')).toBe('토마토야');
    expect(attach('콩', '이랑/랑')).toBe('콩이랑');
    expect(attach('별', '이나/나')).toBe('별이나');
  });
});

describe('josa — 한글이 아닌 끝글자(기본형)', () => {
  it('숫자는 한국어 읽기로 판단 (1=일, 2=이, 3=삼)', () => {
    expect(josa('토마토1', '이/가')).toBe('이'); // 일
    expect(josa('토마토2', '이/가')).toBe('가'); // 이
    expect(josa('토마토3', '이/가')).toBe('이'); // 삼
    expect(josa('토마토1', '으로/로')).toBe('로'); // 일은 ㄹ받침
  });

  it('알파벳은 글자 이름으로 판단 (L=엘, M=엠, A=에이)', () => {
    expect(josa('Bol', '이/가')).toBe('이');
    expect(josa('Tom', '이/가')).toBe('이');
    expect(josa('Mia', '이/가')).toBe('가');
    expect(josa('Bol', '으로/로')).toBe('로');
  });
});

describe('format — 문자열 보간과 조사 토큰', () => {
  it('{name|이/가} 로 이름과 조사를 함께 붙인다', () => {
    expect(format('{name|이/가} 목말라요', { name: '콩이' })).toBe('콩이가 목말라요');
    expect(format('{name|이/가} 목말라요', { name: '별' })).toBe('별이 목말라요');
  });

  it('일반 보간 · 없는 키는 그대로 둔다', () => {
    expect(format('{n}마리', { n: 3 })).toBe('3마리');
    expect(format('{missing}', { n: 1 })).toBe('{missing}');
  });
});
