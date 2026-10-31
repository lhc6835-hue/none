import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// 기획서 12문서 4절 · 13문서 7절의 금지 목록을 린트 규칙으로 못 박는다.
// 화면에 나오는 글자만 i18n 으로 뺀다. 개발자용 예외 메시지(new XxxError)와 console 로그는 예외로 둔다.
const DEV_ONLY_LITERAL =
  ':not(NewExpression[callee.name=/Error$/] > Literal):not(CallExpression[callee.object.name="console"] > Literal)';
const DEV_ONLY_TEMPLATE =
  ':not(NewExpression[callee.name=/Error$/] > TemplateLiteral > TemplateElement):not(CallExpression[callee.object.name="console"] > TemplateLiteral > TemplateElement)';
const HANGUL_LITERAL = {
  selector: `Literal[value=/[가-힣ㄱ-ㅎ]/]${DEV_ONLY_LITERAL}`,
  message: '코드에 한글 문자열을 직접 쓰지 않는다. src/i18n/*.json 에 두고 t()로 가져온다.',
};
const HANGUL_TEMPLATE = {
  selector: `TemplateElement[value.raw=/[가-힣ㄱ-ㅎ]/]${DEV_ONLY_TEMPLATE}`,
  message: '코드에 한글 문자열을 직접 쓰지 않는다. src/i18n/*.json 에 두고 t()로 가져온다.',
};
const NONDETERMINISTIC = [
  {
    selector: "MemberExpression[object.name='Math'][property.name='random']",
    message: '결정적 로직에서는 Math.random 대신 시드 RNG(core/Rng)를 쓴다.',
  },
  {
    selector: 'CallExpression[callee.name=/^(setTimeout|setInterval)$/]',
    message: 'setTimeout/setInterval 대신 씬 시간(트윈·타이머)을 써서 일시정지와 배속에 맞춘다.',
  },
  {
    selector: "MemberExpression[object.name='Date'][property.name='now']",
    message: '시간은 Clock 인터페이스로만 읽는다.',
  },
  {
    selector: "NewExpression[callee.name='Date']",
    message: '시간은 Clock 인터페이스로만 읽는다.',
  },
];

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'public/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'no-restricted-syntax': ['error', HANGUL_LITERAL, HANGUL_TEMPLATE],
    },
  },
  // 순수 로직 계층: Phaser 금지 + 비결정 API 금지
  {
    files: ['src/systems/**/*.ts', 'src/core/**/*.ts'],
    ignores: ['src/core/Clock.ts', 'src/core/Rng.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['phaser', 'phaser/*'],
              message: 'systems/ · core/ 는 Phaser를 import하지 않는다.',
            },
          ],
        },
      ],
      'no-restricted-syntax': ['error', HANGUL_LITERAL, HANGUL_TEMPLATE, ...NONDETERMINISTIC],
    },
  },
  // 시계는 Clock.ts에서만, 난수 시드 해시는 Rng.ts에서만 다룬다.
  {
    files: ['src/core/Rng.ts', 'src/core/Clock.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['phaser', 'phaser/*'], message: 'core/ 는 Phaser를 import하지 않는다.' },
          ],
        },
      ],
    },
  },
  // 조사 처리는 한글 음절 범위를 직접 다룬다.
  {
    files: ['src/i18n/josa.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  // 테스트 · 스크립트는 한글 기대값을 써도 된다.
  {
    files: ['tests/**/*.ts', 'scripts/**/*.ts', '*.config.ts', '*.config.js'],
    rules: { 'no-restricted-syntax': 'off', 'max-lines': 'off' },
  },
);
