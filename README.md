# 앰버라인 (AMBERLINE)

등불 머리 정원사 「호롱」이 물대포로 수액을 뿜어, 금방 굳는 호박으로 길과 벽을 만들며 하늘섬을 잇는 픽셀 액션 게임이에요.

## 실행
```
npm install
npm run build     # dist/index.html 한 파일이 만들어져요. 브라우저로 열면 바로 돼요.
npm run dev       # 고칠 때마다 dist/index.html 을 다시 만들어요
```

## 조작
| | 키보드·마우스 | 터치 (가로 화면) |
|---|---|---|
| 이동 | A/D, ←/→ | 왼쪽 아래 ◀ ▶ |
| 점프 | W, 스페이스, ↑ (길게 누르면 더 높이) | 오른쪽 아래 점프 |
| 수액 뿜기 | 마우스로 겨누고 누르고 있기 | 화면을 누르고 있기 |
| 처음부터 | R | 오른쪽 위 「처음」 |

## 구조
- `src/core/` 픽셀 렌더러(색·빛 두 버퍼), 이펙트 입자, 합성 효과음, 시드 난수, 팔레트
- `src/world/` 지형·수액 시뮬레이션, 레벨, 패럴랙스 배경
- `src/entities/` 호롱, 물대포, 마름이 4종
- `docs/GDD.md` 기획서 · `docs/DECISIONS.md` 결정 기록

## 감사
이펙트 제작 방법은 [pixelfx](https://github.com/patch-gg/pixelfx) 스킬(MIT, Patch · Hugo Duprez)의 원칙을 참고했어요.
스킬은 `.claude/skills/pixelfx/`에 라이선스와 함께 설치되어 있고, 게임 코드는 직접 작성했어요.
