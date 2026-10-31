# CLAUDE.md — 점선정원: 씨앗 수비대

이 저장소는 픽셀아트 육성 타워디펜스 게임 「점선정원: 씨앗 수비대」를 만드는 곳이다. **기획서는 `docs/`이고, 기획서가 유일한 기준이다.**

## 작업 전에
- `docs/README.md` → `docs/01-vision.md` → `docs/13-roadmap-qa.md` 순서로 읽고, 지금 진행 중인 마일스톤에 필요한 문서만 더 읽는다.
- 진행 상황과 기획 변경은 `docs/DECISIONS.md`에 기록한다.

## 꼭 지킬 것
1. 마일스톤(M0–M7)은 순서대로 하나씩. 끝낼 때마다 lint · test 통과 → 실제 실행 → Playwright 스크린샷 확인 → 완료 기준(DoD) 대조 → 커밋.
2. 아트는 `docs/02-art-direction.md`의 절차적 픽셀아트 규칙을 따른다. 66색 팔레트 밖의 색 금지, 정수 배율만, 믹셀 금지.
3. 얼굴은 눈(점)과 입(선)만 쓰고, `FaceRenderer`로 런타임에 그린다. 과장 비율 검수기(02 문서 5-2절)를 통과해야 한다.
4. 화면의 모든 상태 변화에는 애니메이션 · 소리 반응이 따른다(10 문서 3절, 13 문서 「손맛 20」).
5. 글자는 `src/i18n/*.json`, 밸런스 수치는 `src/data/`에만 둔다. 식물 이름에는 조사 처리(`josa`)를 쓴다.
6. `systems/`는 Phaser를 import하지 않는다. 전투는 고정 간격 결정적 시뮬레이션이고 `Math.random` · `setTimeout`을 쓰지 않는다.
7. 범위를 몰래 줄이지 않는다. 바꿔야 하면 DECISIONS.md에 이유와 함께 적는다.

## 명령
`npm run dev` · `npm run build` · `npm test` · `npm run test:e2e` · `npm run sim` · `npm run lint` · `npm run validate`
