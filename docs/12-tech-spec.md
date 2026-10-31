# 12. 기술 명세

## 1. 기술 스택

| 항목 | 선택 | 비고 |
|---|---|---|
| 언어 | TypeScript 5.x, `strict: true` | `any` 금지(불가피하면 주석으로 이유) |
| 번들러 | Vite 5 이상 | `npm run dev` 한 번으로 실행 |
| 게임 프레임워크 | Phaser 3(최신 3.x 안정판) | WebGL 기본, Canvas 대체 |
| 테스트 | Vitest(단위 · 데이터 · 시뮬레이션), Playwright(E2E · 스크린샷) | |
| 코드 품질 | ESLint + Prettier | 커밋 전 `npm run lint` 통과 |
| 폰트 | Galmuri(SIL OFL 1.1) | `public/fonts/`에 woff2와 `OFL.txt`를 함께 둠 |
| 효과음 | ZzFX(MIT) | `src/audio/zzfx.ts`로 가져오고 라이선스 주석 유지 |
| 라이선스 문서 | `THIRD_PARTY_LICENSES.md` | Phaser(MIT) · ZzFX(MIT) · Galmuri(OFL) |

## 2. 화면 크기와 배율

- 논리 높이는 **360 고정**. 정수 배율 `k = max(1, floor(창 높이 / 360))`를 정한 뒤, 논리 폭은 `clamp(640, floor(창 폭 / k), 800)`.
- 캔버스의 CSS 크기는 `논리 폭 × k` × `360 × k`로 두고 가운데 정렬한다. 남는 테두리는 현재 장면의 배경색으로 칠한다.
- 모든 씬은 **가운데 640×360 안전 영역**을 기준으로 UI를 배치하고, 그보다 넓으면 배경 · 장식만 늘린다.
- Phaser 설정: `pixelArt: true`, `roundPixels: true`, `antialias: false`, `scale.mode: NONE`(배율은 위 규칙으로 직접 계산), 창 크기가 바뀌면 다시 계산.

## 3. 폴더 구조

```
/
├─ docs/                       # 이 기획서
├─ public/
│  ├─ fonts/                   # Galmuri woff2 + OFL.txt
│  └─ art/                     # (선택) 손그림 PNG 교체용. manifest.json에 등록된 것만 사용
├─ scripts/
│  ├─ sim.ts                   # 헤드리스 전투 시뮬레이터(밸런스 점검)
│  ├─ gen-icons.ts             # 팔레트 픽셀맵 → PWA 아이콘 PNG
│  └─ validate-data.ts         # 데이터 검증(테스트에서도 사용)
├─ src/
│  ├─ main.ts                  # 부팅, Phaser 게임 생성
│  ├─ config.ts                # 해상도 · 상수
│  ├─ core/                    # 프레임워크 독립: 상태 · 이벤트 · 난수 · 시간 · 저장
│  │  ├─ GameState.ts  EventBus.ts  Rng.ts  Clock.ts  SaveSystem.ts  migrations/
│  ├─ systems/                 # 순수 로직(Phaser를 import하지 않음 → 단위 테스트 가능)
│  │  ├─ garden/  Growth.ts Needs.ts CareActions.ts Problems.ts Personality.ts Affection.ts Quality.ts Traits.ts Offline.ts
│  │  ├─ breeding/ Breeding.ts
│  │  ├─ economy/  Inventory.ts Shop.ts Merchant.ts Rewards.ts Packets.ts
│  │  ├─ meta/     PlayerLevel.ts Research.ts Quests.ts Achievements.ts Codex.ts Calendar.ts Mail.ts Events.ts
│  │  └─ battle/   BattleSim.ts Map.ts Paths.ts Waves.ts Units.ts Enemies.ts Projectiles.ts
│  │               Statuses.ts Damage.ts Targeting.ts Synergy.ts Abilities.ts Tools.ts SpatialHash.ts
│  │               abilities/custom/   # 데이터로 표현하기 어려운 고유 능력(P0xx.ts)
│  ├─ art/                     # 절차적 픽셀아트
│  │  ├─ palette.ts  PixelGrid.ts  Shading.ts  Outline.ts
│  │  ├─ stamps/               # ASCII 부품 스탬프
│  │  ├─ PlantSpriteGen.ts  SeedSpriteGen.ts  PotSpriteGen.ts  EnemySpriteGen.ts  TileGen.ts  IconGen.ts
│  │  ├─ FaceRenderer.ts  FaceValidator.ts
│  │  └─ AtlasCache.ts         # 지연 생성 + 캐시
│  ├─ audio/   zzfx.ts  Sfx.ts  Sequencer.ts  Songs.ts  Humming.ts  AudioBus.ts
│  ├─ ui/      Panel9.ts  Button.ts  Tooltip.ts  Gauge.ts  Toast.ts  Modal.ts  Transitions.ts  PixelText.ts  NumberFont.ts
│  ├─ scenes/  Boot  Preload  Title  Hub  Care  Planting  PacketOpen  Breeding  Codex  Research  Workbench
│  │           Shop  Merchant  Mail  Quests  Calendar  Decorate  Photo  WorldMap  DeckSelect  Battle  Result
│  │           Settings  UIOverlay  DebugOverlay
│  ├─ data/    grades.ts families.ts plants/*.ts enemies.ts bosses.ts stages/*.ts items.ts soils.ts pots.ts
│  │           tools.ts traits.ts personalities.ts recipes.ts rituals.ts rewards.ts research.ts quests.ts
│  │           achievements.ts codexRewards.ts events.ts mutators.ts songs.ts sfx.ts
│  └─ i18n/    ko.json  en.json  josa.ts
└─ tests/      unit/  data/  sim/  e2e/
```

## 4. 구조 원칙

1. **상태는 한 곳**: `GameState`가 저장 대상인 모든 상태를 가진 순수 객체다. 씬은 상태를 직접 바꾸지 않고 시스템 함수를 호출한다.
2. **로직과 화면 분리**: `systems/`는 Phaser를 모른다. 씬은 `EventBus` 이벤트(`plant:watered`, `battle:enemyKilled` 등)를 듣고 연출만 한다.
3. **결정적 전투**: `BattleSim`은 1/60초 고정 간격으로만 진행하고, 난수는 `(스테이지 시드, 도전 횟수)`로 만든 RNG만 쓴다. `BattleScene`은 시뮬레이션 상태를 보간해서 그리기만 한다. → 같은 입력이면 같은 결과, 헤드리스 시뮬레이터 가능.
4. **데이터 주도**: 식물 · 적 · 스테이지 · 아이템 · 보상 · 연구 · 의뢰는 전부 `data/`에 있다. 새 식물을 추가하는 일 = 데이터 한 항목 + (필요하면) 고유 능력 스크립트 하나.
5. **문자열 분리**: 화면에 나오는 모든 글자는 `i18n/*.json`에서 가져온다. 코드에 한글 문자열을 직접 쓰지 않는다.

## 5. 핵심 데이터 스키마 (요약)

```ts
type GradeId = 'SHADE'|'DEW'|'SUN'|'DUSK'|'MOON'|'STAR'|'AURORA'|'ORIGIN';
type FamilyId = 'VINE'|'THORN'|'FUNGUS'|'BLOOM'|'FRUIT'|'EMBER'|'FROST'|'LUMEN'|'STORM'|'SPIRIT';
type Archetype = 'SHOOT'|'SNIPE'|'LOB'|'MELEE'|'ZONE'|'BEAM'|'CHAIN'|'AURA'|'SUMMON'|'PRODUCE'|'TRAP'|'WALL'|'SPECIAL';
type DamageType = 'PHYS'|'POISON'|'FIRE'|'FROST'|'SHOCK'|'LIGHT'|'SPIRIT';
type RampId = 'R1'|'R2'|'R3'|'R4'|'R5'|'R6'|'R7'|'R8'|'R9'|'R10'|'R11'|'R12';

interface FaceSpec {
  type: 'F01'|'F02'|'F03'|'F04'|'F05'|'F06'|'F07'|'F08'|'F09'|'F10'|'F11'|'F12';
  host: string;                 // 바디 플랜의 부위 이름(예: 'bulb', 'flowerCenter')
  eyeSpread?: number;           // 0.6–1.0
  mouthLen?: number;            // 0.5–1.2
  offset?: [number, number];
}

interface PlantLook {
  body: 'BULB'|'STALK'|'ROSETTE'|'VINE'|'CAP'|'PITCHER'|'TRAP'|'BUSH'|'COLUMN'|'FLOWER'|'POD'|'FROND'|'CRYSTAL'|'WISP'|'BONSAI'|'LILY';
  ramps: { main: RampId; sub: RampId; accent?: RampId; special?: 'STARGOLD'|'AURORA'|'ORIGIN'|'SILVER'|'TOXIC'|'ARCANE' };
  variantRamps: { main: RampId; sub: RampId };
  parts: Record<string, string|number|boolean>;  // 잎 모양, 꽃잎 수, 가시 밀도 등 바디 플랜별 매개변수
  face: FaceSpec;
  translucent?: boolean;        // 영혼 계열
}

interface AttackSpec {
  archetype: Archetype;
  damage: number; interval: number; range: number; minRange?: number;
  damageType: DamageType;
  hitsAir: boolean;
  projectile?: { speed: number; homing?: boolean; pierce?: number; count?: number; spreadDeg?: number };
  onHit?: Effect[];
}

type Effect =
  | { kind: 'status'; status: StatusId; stacks?: number; duration?: number; magnitude?: number; chance?: number }
  | { kind: 'splash'; radius: number; ratio: number }
  | { kind: 'chain'; targets: number; falloff: number }
  | { kind: 'knockback' | 'pull'; tiles: number }
  | { kind: 'execute'; threshold: number; bonusSap?: number }
  | { kind: 'armorShred'; amount: number; max: number; duration: number }
  | { kind: 'custom'; scriptId: string; params?: Record<string, number> };

interface Passive {
  kind: 'aura' | 'periodic' | 'onKill' | 'onDeath' | 'terrain' | 'produce' | 'summon' | 'trap' | 'custom';
  params: Record<string, number | string | boolean>;
}

interface PlantSpecies {
  id: string;                   // 'P001'
  nameKey: string;              // i18n 키
  grade: GradeId; family: FamilyId;
  cost: number;
  attack?: AttackSpec; passives: Passive[];
  bloomSkill: { kind: 'generic' } | { kind: 'custom'; scriptId: string; params: Record<string, number> };
  battleHpMul?: number;
  placement: ('SOIL'|'FERTILE'|'SHADE'|'WATER'|'PATH')[];
  care: {
    light: 1|2|3; water: 'LOW'|'MID'|'HIGH'; temp: 'COOL'|'MID'|'WARM'; active: 'DAY'|'NIGHT';
    favoriteNutrient: 'GREEN'|'GROW'|'SWEET'|'STRONG';
    music?: SongGenre; phrase?: 'CHEER'|'PRAISE'|'BATTLE'|'COMFORT';
    needsNightExposure?: boolean; needsStake?: boolean; aquatic?: boolean;
    special?: string;           // 고유 조건 스크립트 ID(태초 등)
  };
  look: PlantLook;
  acquire: Acquire[];
  flavorKey: string;
  hum: { note: 0|1|2|3|4; octave: number; motif: number[] };
}

interface PlantInstance {
  uid: string; speciesId: string; nickname: string;
  stage: 0|1|2|3|4|5; gp: number;
  needs: { water: number; nutrition: number; hygiene: number; mood: number };
  problems: ProblemState[];     // 곰팡이 점 좌표, 벌레, 시든 잎, 상태이상 타이머 등
  personality: PersonalityId; affection: number; affectionToday: number;
  quality?: 1|2|3|4|5; qualityLog: { sum: number; count: number; perfect: number; actions: number };
  traits: TraitId[]; reservedTraits: TraitId[];
  variant: boolean; level: number; exp: number; awakened: boolean;
  potId: string; soilId: string; soilFertility: 0|1|2|3; location: { zone: ZoneId; slot: number };
  shape?: 'NEAT'|'BUSHY'|'SPIKY';
  mastery?: never;              // 숙련도는 플레이어 단위(GameState.mastery)
  diary: DiaryEntry[]; flags: Record<string, boolean>;
  lastUpdated: number;          // 오프라인 계산 기준 시각(ms)
}

interface StageDef {
  id: string;                   // '1-1'
  chapter: number; nameKey: string;
  map: string[];                // 26자 × 12줄(08 문서 4절 범례)
  paths: { id: number; tiles: [number, number][] }[];
  flyPaths?: { id: number; points: [number, number][] }[];
  night?: boolean; startSap?: number; waveGap: [number, number];
  waves: Wave[];                // 보통 기준. 다른 난이도는 규칙으로 변환(09 문서 1절)
  fixedMutator?: MutatorId;     // 폭풍우용
  newEnemy?: string; tips?: string[];
}
interface Wave { groups: { enemy: string; count: number; gap: number; delay: number; path: number; elite?: ElitePrefix[] }[] }
```
- 적 · 보스 · 아이템 · 보상표 · 레시피 · 연구 · 의뢰 · 업적도 같은 방식으로 문서의 표 열을 그대로 필드로 옮긴다.
- 고유 능력은 가능한 한 `Effect`와 `Passive` 조합으로 표현하고, 안 되는 것만 `custom` 스크립트로 만든다. 스크립트는 `(sim, unit, params) => void` 형태의 훅(`onTick`, `onHit`, `onKill`, `onBloom`)만 구현한다.

## 6. 저장

- `localStorage` 키 `dotline.save.v1`(본 저장) + `dotline.save.backup`(직전 정상 저장본). 저장할 때마다 본 저장을 백업으로 돌리고 새로 쓴다.
- 형식: `{ version, savedAt, checksum, state }`. `checksum`은 `state` JSON의 CRC32.
- 불러올 때 체크섬이 틀리면 백업으로 복구하고 "저장 파일이 손상되어 직전 저장본으로 불러왔어요" 안내.
- **버전 마이그레이션**: `migrations/v1_to_v2.ts`처럼 단계별 함수. 테스트로 옛 저장 파일 샘플이 최신으로 올라오는지 확인.
- 자동 저장: 30초마다, 중요한 일(개화 · 봉투 개봉 · 전투 종료 · 구매)이 끝난 직후, `visibilitychange`(탭 숨김)일 때.
- 내보내기 · 가져오기: `base64(JSON)` 문자열. 가져오기 전에 현재 저장을 백업.
- 저장 용량 목표 500KB 이하(식물 일기는 최근 50개까지만 보관).

## 7. 시간 · 오프라인

- `Clock` 인터페이스(`now()`)로 시간을 감싼다. 테스트와 디버그에서 가짜 시계로 바꿔 끼운다.
- 불러오기 시: `경과 = min(지금 − lastUpdated, 12시간)`. 경과가 음수(시계를 되돌림)면 0으로 보고 `lastUpdated`만 갱신.
- 오프라인 계산은 **10분 단위 묶음**으로 돌린다(최대 72묶음 × 식물 수). 묶음마다 욕구 감소(절반 속도, 하한 20), 곰팡이 · 해충 판정, GP 적립을 처리한다. 판정용 난수는 `(식물 uid, 묶음 시각)` 시드로 만든다.
- 결과는 '그동안 있었던 일' 카드로 요약해 보여 준다.

## 8. 난수

- `sfc32` 같은 시드형 PRNG를 쓰고, 용도별로 흐름을 나눈다: `art`(종 ID), `battle`(스테이지 시드 + 도전 횟수), `garden`(식물 uid + 시각), `packet`(저장된 상태, 봉투를 열 때마다 진행), `daily`(날짜).
- 봉투 RNG 상태와 천장 카운트는 저장 파일에 들어간다.

## 9. 렌더링 · 성능

| 항목 | 기준 |
|---|---|
| 프레임 | 중급 모바일(2020년대 초 안드로이드)에서 60fps, 최악 장면(적 300 + 투사체 600)에서도 45fps 이상 |
| 풀링 | 적 · 투사체 · 파티클 · 피해 숫자 · 상태 아이콘은 모두 오브젝트 풀. 전투 중 매 프레임 새 객체 할당 금지 |
| 대상 찾기 | 2타일 크기 칸의 공간 해시 |
| 텍스처 | 절차 생성 결과를 캔버스 → Phaser 텍스처로 등록. 종 단위 아틀라스, 사용 빈도가 낮으면 해제(LRU) |
| 상한 | 적 300 · 투사체 600 · 파티클 800(설정 '낮음'이면 300) |
| 메모리 | 300MB 이하 |
| 첫 로딩 | 4G 기준 3초 이내. 번들(폰트 제외) 5MB 이하 |
| 백그라운드 | 탭이 숨겨지면 렌더 정지, 전투는 자동 일시정지 |

## 10. 입력

- 마우스와 터치를 하나의 포인터 처리로 통합. 끌어서 놓기는 `DragManager` 하나가 담당(돌봄 도구 · 화분 이동 · 씨앗 심기 · 카드 배치).
- 브라우저 기본 동작 막기: 오른쪽 클릭 메뉴, 두 손가락 확대, 당겨서 새로고침, 텍스트 선택.
- 키보드 단축키는 06 문서 14절. 설정에서 바꿀 수 있다.

## 11. 한국어 처리

- 플레이어가 식물 이름을 짓기 때문에 **조사 자동 처리**가 필요하다: `josa(이름, '이/가')`, `'을/를'`, `'은/는'`, `'와/과'`, `'(이)야'`. 이름의 마지막 글자에 받침이 있는지로 판단한다(한글이 아니면 기본형).
  - 예) "콩이**가** 목말라요" / "별**이** 목말라요"
- 이름 규칙: 1–8자, 한글 · 영문 · 숫자. 금칙어 필터는 간단한 목록으로.

## 12. 디버그 도구 (`?debug=1`)

- 치트 패널: 재화 · 아이템 추가, 시간 앞으로 감기(오프라인 n시간 흉내), 식물 단계 설정, 애정도 설정, 날씨 · 계절 강제, 웨이브 소환, 무적, 배속 ×10
- 표시: FPS, 히트박스, 사거리, 경로, 공간 해시 칸, 상태이상 수치
- **아트 갤러리**: 100종 × 6단계 × 표정 16종을 격자로 표시. 실루엣 모드 · 색변이 모드 · 얼굴 검수 오버레이(위반은 빨간 테두리)
- 팔레트 검사: 화면에 팔레트 밖 색이 있으면 경고
- 시뮬레이터 UI: 스테이지 · 난이도 · 덱을 골라 N판 자동 실행 → 클리어율 · 평균 남은 하트 · 누수 원인

## 13. 테스트

| 종류 | 내용 | 통과 기준 |
|---|---|---|
| 단위 | 성장 · 컨디션 · 욕구 감소 · 오프라인 · 피해 · 장갑 · 상태이상 중첩 · 시너지 · 보상 확률 분포(10만 회) · 교배 결과 · 조사 처리 · 저장 마이그레이션 | 전부 통과 |
| 데이터 | 100종 · 적 34 · 보스 7 · 스테이지 42의 필수 필드, ID 중복 없음, 레시피가 존재하는 ID만 참조, 맵 26×12 · 경로 연결성, 문자열 키 누락 없음 | 전부 통과 |
| 아트 | 모든 종 × 단계 생성 성공, 팔레트 밖 색 0, 얼굴 규칙 위반 0 | 전부 통과 |
| 시뮬레이션 | 봇이 권장 덱으로 각 스테이지 · 난이도를 200판 | 06 문서 15절의 목표 클리어율 ±10%p 안 |
| E2E | 부팅 → 타이틀 → 새 게임 → 튜토리얼 T4까지 진행, 온실 · 전투 · 결과 화면 스크린샷(1280×720, 844×390) | 콘솔 오류 0, 스크린샷 육안 확인 |

## 14. 빌드 · 배포

- 명령: `npm run dev` · `build` · `preview` · `test` · `test:e2e` · `sim` · `lint` · `validate`
- 결과물: 정적 파일 `dist/` → itch.io · GitHub Pages 등에 그대로 올릴 수 있음
- PWA: `manifest.webmanifest` + 서비스 워커(오프라인 캐시), 아이콘은 `scripts/gen-icons.ts`가 팔레트 픽셀맵으로 PNG 생성
- 나중에 패키징: PC는 Tauri 또는 Electron, 모바일은 Capacitor(가로 고정, 로컬 알림)
