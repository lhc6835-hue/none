// 저장 버전 마이그레이션 (12문서 6절).
// 새 버전을 만들 때: SAVE_VERSION을 올리고, `vN_to_vN+1.ts` 를 만들어 아래 표에 등록한다.
// 각 함수는 N 버전 state를 받아 N+1 버전 state를 돌려준다(원본을 바꾸지 않는다).

export type Migration = (state: unknown) => unknown;
export type MigrationTable = Record<number, Migration>;

/** key = 출발 버전. 예) 1: v1_to_v2 */
export const MIGRATIONS: MigrationTable = {};

export class MigrationError extends Error {}

export function migrateState(
  state: unknown,
  from: number,
  to: number,
  table: MigrationTable = MIGRATIONS,
): unknown {
  let current = state;
  for (let v = from; v < to; v++) {
    const step = table[v];
    if (!step) throw new MigrationError(`v${v} → v${v + 1} 마이그레이션이 없습니다`);
    current = step(current);
  }
  return current;
}
