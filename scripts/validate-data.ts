// 데이터 검증 (12문서 3절). 검사 항목은 tests/data/*.test.ts 에 있고, 여기서는 그것을 그대로 실행한다.
// M0: 문자열 키 · 팔레트 · 폰트/라이선스. M4 에서 식물 100 · 적 34 · 보스 7 · 스테이지 42 · 레시피 33 · 의식 4 검사를 같은 폴더에 추가한다.

import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['vitest', 'run', 'tests/data'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
