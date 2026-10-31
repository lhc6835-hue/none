// 한국어 조사 자동 처리 (12문서 11절). 이름의 마지막 글자에 받침이 있는지로 판단한다.
//   josa('콩이', '이/가')   → '가'      josa('별', '이/가')   → '이'
//   attach('토마토', '은/는') → '토마토는'
// 한글이 아닌 끝글자(기본형): 숫자는 한국어 읽기(1=일, 2=이 …), 알파벳은 글자 이름(L=엘, A=에이 …)으로
// 받침을 판단한다. 읽을 수 없는 기호는 받침이 없는 것으로 본다. 'ㄹ'받침은 '(으)로' 계열에서만 따로 본다.

export type JosaPair =
  | '이/가'
  | '을/를'
  | '은/는'
  | '와/과'
  | '으로/로'
  | '이랑/랑'
  | '이나/나'
  | '이에요/예요'
  | '아/야'
  | '(이)야';

interface PairForm {
  /** 받침이 있을 때 */
  closed: string;
  /** 받침이 없을 때 */
  open: string;
  /** 'ㄹ'받침을 받침 없음으로 취급(으로/로) */
  rieulIsOpen?: boolean;
}

const PAIRS: Record<JosaPair, PairForm> = {
  '이/가': { closed: '이', open: '가' },
  '을/를': { closed: '을', open: '를' },
  '은/는': { closed: '은', open: '는' },
  '와/과': { closed: '과', open: '와' },
  '으로/로': { closed: '으로', open: '로', rieulIsOpen: true },
  '이랑/랑': { closed: '이랑', open: '랑' },
  '이나/나': { closed: '이나', open: '나' },
  '이에요/예요': { closed: '이에요', open: '예요' },
  '아/야': { closed: '아', open: '야' },
  '(이)야': { closed: '이야', open: '야' },
};

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const RIEUL_FINAL = 8;

// 알파벳 글자 이름 읽기: 받침 종류 (0 없음 · 1 있음 · 2 ㄹ받침)
const LATIN_FINAL: Record<string, number> = {
  a: 0,
  b: 0,
  c: 0,
  d: 0,
  e: 0,
  f: 0,
  g: 0,
  h: 0,
  i: 0,
  j: 0,
  k: 0,
  l: 2,
  m: 1,
  n: 1,
  o: 0,
  p: 0,
  q: 0,
  r: 2,
  s: 0,
  t: 0,
  u: 0,
  v: 0,
  w: 0,
  x: 0,
  y: 0,
  z: 0,
};
// 숫자 읽기: 0 영 · 1 일(ㄹ) · 2 이 · 3 삼 · 4 사 · 5 오 · 6 육 · 7 칠(ㄹ) · 8 팔(ㄹ) · 9 구
const DIGIT_FINAL: Record<string, number> = {
  '0': 1,
  '1': 2,
  '2': 0,
  '3': 1,
  '4': 0,
  '5': 0,
  '6': 1,
  '7': 2,
  '8': 2,
  '9': 0,
};

type FinalKind = 'open' | 'closed' | 'rieul';

/** 조사를 붙일 기준이 되는 끝글자(뒤쪽의 기호 · 공백 · 괄호는 건너뜀) */
function lastLetter(word: string): string {
  for (let i = word.length - 1; i >= 0; i--) {
    const ch = word[i];
    const code = ch.charCodeAt(0);
    if (code >= HANGUL_START && code <= HANGUL_END) return ch;
    if (/[0-9A-Za-z]/.test(ch)) return ch;
    // 단독 자음 자모(ㄱ–ㅎ)는 글자 이름이 모두 받침으로 끝난다(기역, 니은 …)
    if (code >= 0x3131 && code <= 0x314e) return ch;
  }
  return '';
}

function finalKind(word: string): FinalKind {
  const ch = lastLetter(word);
  if (ch === '') return 'open';
  const code = ch.charCodeAt(0);
  if (code >= HANGUL_START && code <= HANGUL_END) {
    const jong = (code - HANGUL_START) % 28;
    if (jong === 0) return 'open';
    return jong === RIEUL_FINAL ? 'rieul' : 'closed';
  }
  if (code >= 0x3131 && code <= 0x314e) return code === 0x3139 ? 'rieul' : 'closed';
  const table = /[0-9]/.test(ch) ? DIGIT_FINAL : LATIN_FINAL;
  const kind = table[ch.toLowerCase()];
  return kind === 2 ? 'rieul' : kind === 1 ? 'closed' : 'open';
}

/** 마지막 글자에 받침이 있는가 ('ㄹ'받침 포함) */
export function hasBatchim(word: string): boolean {
  return finalKind(word) !== 'open';
}

/** 조사만 돌려준다. 예) josa('콩이', '이/가') → '가' */
export function josa(word: string, pair: JosaPair): string {
  const form = PAIRS[pair];
  if (!form) throw new Error(`알 수 없는 조사: ${String(pair)}`);
  const kind = finalKind(word);
  const open = kind === 'open' || (form.rieulIsOpen === true && kind === 'rieul');
  return open ? form.open : form.closed;
}

/** 단어 + 조사. 예) attach('토마토', '은/는') → '토마토는' */
export function attach(word: string, pair: JosaPair): string {
  return word + josa(word, pair);
}

export function isJosaPair(value: string): value is JosaPair {
  return Object.prototype.hasOwnProperty.call(PAIRS, value);
}
