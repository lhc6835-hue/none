# 점선정원 : 씨앗 수비대 (DOTLINE GARDEN)

점 두 개와 선 하나로 웃는 판타지 식물을 씨앗부터 키우고, 그 아이들로 정원을 지키는 **픽셀아트 육성 타워디펜스**.

- 기획서: [docs/README.md](docs/README.md)(분할본) · [docs/GDD-full.md](docs/GDD-full.md)(통합본)
- 구현 가이드: [docs/13-roadmap-qa.md](docs/13-roadmap-qa.md)의 「마스터 프롬프트」부터 시작

현재 상태: **M0(프로젝트 뼈대) · M1(아트 파이프라인 · 얼굴) · M2(정원 · 돌봄 코어) 완료**(M2 의 '사람이 직접 30분 플레이' 확인만 남음 — `docs/DECISIONS.md`). 다음은 M3(전투 코어).

```
npm install            # 의존성 설치 (.npmrc 에 legacy-peer-deps 설정이 들어 있음)
npm run dev            # 개발 서버 (http://localhost:5173, ?debug=1 로 디버그 오버레이)
npm run lint           # ESLint + Prettier
npm test               # 단위 · 데이터 테스트 (Vitest)
npm run test:e2e       # 브라우저 E2E · 스크린샷 (Playwright, 1280×720 · 844×390)
npm run build          # 타입 검사 + 프로덕션 빌드(dist/)
npx tsx scripts/art-preview.ts out.png --cols=10 --stages=5 --faces=1   # 식물 시트 PNG
npx tsx scripts/face-audit.ts      # 얼굴 검수(모든 종 × 단계 × 색변이)
# 디버그 씬: http://localhost:5173/?debug=1&scene=ArtGallery  (또는 UIKit)
```

진행 기록과 기획서와 다르게 정한 내용은 [docs/DECISIONS.md](docs/DECISIONS.md), 스크린샷은 `docs/screenshots/` 에 있다.
