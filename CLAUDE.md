# 와플 타이쿤 (Waffle Tycoon)

모바일 2D 타이쿤 게임 - Phaser 3 기반

## 기술 스택

- **게임 엔진**: Phaser 3.80.1
- **언어**: TypeScript 5.4
- **빌드**: Vite 5.4
- **모바일 래퍼**: Capacitor 6.0 (iOS/Android)
- **화면 크기**: 720x1280 (9:16 세로 모바일)
- **백엔드**: Supabase (인증, 클라우드 저장)

## 프로젝트 구조

```
src/
├── main.ts              # 엔트리포인트, Phaser.Game 인스턴스 생성
├── config/
│   ├── gameConfig.ts    # Phaser 게임 설정
│   ├── constants.ts     # 화면 크기 상수 (720x1280)
│   └── supabase.ts      # Supabase 클라이언트 설정
├── scenes/
│   ├── BootScene.ts     # 에셋 로딩 씬
│   ├── HomeScene.ts     # 홈 화면 (메인 메뉴, 로그인)
│   ├── GameScene.ts     # 메인 게임 로직
│   ├── ShopScene.ts     # 상점 화면
│   └── DayTreeScene.ts  # Day 트리 (재도전/별 확인)
├── utils/
│   ├── HeartManager.ts  # 하트 시스템 관리
│   ├── ProgressManager.ts # 진행상황/별/업그레이드 관리
│   ├── AuthManager.ts   # Google OAuth 인증 관리
│   └── CloudSaveManager.ts # 클라우드 저장/동기화
└── types/
    └── game.ts          # 타입 정의, 게임 상수
```

## 씬 흐름

```
BootScene (에셋 로딩) → HomeScene (메인 메뉴) → GameScene (게임 플레이)
                              ↓
                    ┌─────────┴─────────┐
               ShopScene (상점)    DayTreeScene (Day 트리)
```

### HomeScene (홈 화면)
- **타이틀**: "와플 타이쿤"
- **하트 표시**: 현재 하트 개수 및 충전 타이머
- **별 표시**: 총 보유 별 개수
- **시작 버튼**: "N일차 시작하기" (중앙)
- **사이드 버튼**:
  - 🏆 랭킹 (준비 중)
  - 🛒 상점 → ShopScene으로 이동
  - 📅 Day 트리 → DayTreeScene으로 이동
  - ⚙️ 설정 (헤더 오른쪽, 준비 중)

### DayTreeScene (Day 트리)
- **3열 그리드 레이아웃**: Day 1부터 순서대로 표시
- **Day 셀 상태**:
  | 상태 | 표시 | 클릭 |
  |------|------|------|
  | 완료 (1-3별) | Day N + ⭐⭐⭐ | 가능 (재도전) |
  | 완료 (0별) | Day N + ☆☆☆ | 가능 (재도전) |
  | 진행중 | Day N + "진행중" | 가능 (시작) |
  | 잠김 | Day N + 🔒 | 불가 |
- **3별 완료 셀**: 황금색 테두리, 연한 노란 배경
- **스크롤**: 터치/드래그 또는 마우스 휠로 스크롤
- **하트 비용**: 재도전 시 하트 1개 사용 (성공 시 환불)
- **돌아가기 버튼**: HomeScene으로 이동

### ShopScene (상점)
- **2행 그리드 레이아웃**:
  - 1행: 🧈 반죽 개선, 🔥 화력 강화, ⏱️ 시간 연장
  - 2행: 📥 준비트레이, 📤 완성트레이
- **별로 구매**: 레벨별 다른 비용
- **돌아가기 버튼**: HomeScene으로 이동

### 하트 시스템
- **최대 하트**: 5개
- **충전 시간**: 15분에 1개 자동 충전
- **사용 규칙**:
  - 게임 시작 시 하트 1개 사용
  - 목표 달성 시 하트 반환 (차감 안됨)
  - 목표 미달성 시 하트 차감 유지
  - 재도전 시 추가 하트 사용 안함 (같은 일차)
- **저장**: LocalStorage에 하트 수와 마지막 충전 시간 저장

### 일시정지 기능 (GameScene)
- **X 버튼**: 헤더 오른쪽 끝
- **일시정지 팝업**:
  - 🔄 재시도: 현재 일차 다시 시작
  - 🚪 종료: 홈 화면으로 이동
- **확인 팝업**: 재시도/종료 전 "확인/취소" 확인 필요

---

## 게임 메커니즘

### 와플 굽기 (3x3 굽는판)
- **익힘 단계**: EMPTY → BATTER → UNDERCOOKED → COOKED → PERFECT → BURNT
- **단계별 소요 시간**:
  | 단계 | 시간 |
  |------|------|
  | BATTER → UNDERCOOKED | 8초 |
  | UNDERCOOKED → COOKED | 6초 |
  | COOKED → PERFECT | 6초 |
  | PERFECT → BURNT | 6초 |
- **화구별 열 배율** (중앙이 가장 빠름):
  ```
  [1.0] [1.2] [1.0]
  [1.2] [1.5] [1.2]
  [1.0] [1.2] [1.0]
  ```
- 빈 칸 클릭 → 반죽 올리기
- 익은 와플 클릭 → 작업 트레이로 이동

### 작업 흐름
1. 굽는판에서 와플 굽기
2. 작업 트레이로 이동 (탄 와플 제외)
3. 잼 버튼 클릭 → 완성품 트레이로 이동
4. 손님 클릭 → 와플 판매

### 강불 버튼
- 3초간 굽기 속도 2배
- 쿨다운 없음 (남용 가능)

### 콤보 시스템
손님에게 와플을 빠르게 연속 판매하면 콤보 발동!

| 항목 | 설정값 |
|------|--------|
| 콤보 발동 조건 | 2초 이내 다음 판매 |
| 보너스 금액 | 100원 × 콤보 수 |
| 최대 콤보 | 무제한 |
| 리셋 조건 | 2초 초과 시 |

**보너스 예시:**
- 1콤보: +100원
- 5콤보: +500원
- 10콤보: +1,000원

**콤보 UI:**
- COMBO 이미지 + 콤보 수 표시
- 콤보 효과음 재생
- 콤보 수에 따라 색상 변화 (주황→빨강→마젠타→금색)

---

## 잼 시스템

### 잼 종류 (모두 기본 해금)
| 잼 | 가격 배율 |
|----|-----------|
| 🍎 사과잼 (APPLE) | 1.0배 |
| 🍓 베리잼 (BERRY) | 1.3배 |
| 🥜 피스타치오잼 (PISTACHIO) | 1.5배 |

### 가격 계산
```
최종가격 = (기본가격 + 반죽보너스) × 잼배율
```

### 기본 가격표
| 익힘 단계 | 기본 가격 |
|-----------|-----------|
| 덜익음 (UNDERCOOKED) | 1,500원 |
| 익음 (COOKED) | 2,000원 |
| 퍼펙트 (PERFECT) | 2,500원 |
| 탄 것 (BURNT) | 판매 불가 |

---

## 손님 시스템

### 기본 설정
- **최대 동시 손님**: 3명 (고정 슬롯, 랜덤 배치)
- **등장 간격**: Day별 주문 개수 기반 자동 계산 (아래 Day 시스템 참조)
- **게이지 25% 이하**: 화난 이미지로 전환

### 손님 상세 정보

| 종류 | 대기시간 | 주문수 | 등장일 | 특수조건 | 등장가중치 | 쿨다운 |
|------|----------|--------|--------|----------|------------|--------|
| 🐕 dog | 15초 | 1~2개 | Day 1 | - | 1.0 | 0초 |
| 🐹 hamster | 15초 | 1~2개 | Day 1 | - | 1.0 | 0초 |
| 🐴 horse | 12초 | 1~2개 | Day 1 | - | 1.0 | 0초 |
| 🐢 turtle | 22초 | 2~3개 | Day 1 | - | 1.0 | 0초 |
| 🐰 rabbit | 8초 | 1~2개 | Day 5 | - | 1.0 | 10초 |
| 🐻 bear | 18초 | Day별* | Day 10 | - | 0.15 | 20초 |
| 🦊 fox | 12초 | 1~2개 | Day 15 | 퍼펙트만! | 1.0 | 0초 |

### 손님별 특징
- **dog**: 기본 손님
- **hamster**: 기본 손님
- **horse**: 약간 급함
- **turtle**: 느긋함, 대량 주문
- **rabbit**: 매우 급함 (8초), 연속 등장 방지 (10초 쿨다운)
- **bear**: 대량 주문 (Day 10~19: 5개, Day 20~29: 5~6개, Day 30+: 5~7개), 드물게 등장 (가중치 0.15, 20초 쿨다운)
- **fox**: **퍼펙트 와플만** 받음, **조건 만족 시 1.5배 금액 지불**

### 주문 잼
- 모든 손님이 해금된 잼 중 **랜덤**으로 주문

---

## Day 시스템

### 주문 개수 기반 시스템
Day별 주문 개수가 기준이 되어 목표 금액과 손님 등장 간격이 결정됩니다.

### 주문 개수 테이블
| Day | 주문 개수 | 목표 금액 (80%) | 3별 기준 (+5,000) | 손님 등장 간격 |
|-----|----------|-----------------|-------------------|---------------|
| 1 | 10개 | 20,000원 | 25,000원 | 6~11초 |
| 2 | 12개 | 24,000원 | 29,000원 | 5~9초 |
| 3 | 14개 | 28,000원 | 33,000원 | 4.5~8초 |
| 4 | 16개 | 32,000원 | 37,000원 | 4~7초 |
| 5 | 18개 | 36,000원 | 41,000원 | 3.5~6초 |
| 6 | 20개 | 40,000원 | 45,000원 | 3~5.5초 |
| 7 | 22개 | 44,000원 | 49,000원 | 2.9~5초 |
| 8 | 24개 | 48,000원 | 53,000원 | 2.6~4.5초 |
| 9 | 26개 | 52,000원 | 57,000원 | 2.4~4.2초 |
| 10 | 28개 | 56,000원 | 61,000원 | 2.2~4초 |
| 11+ | 28 + (day-10)×2 | 계산식 적용 | 계산식 적용 | 계산식 적용 |

### 계산 공식
```typescript
// 주문 개수
getDayOrders(day) = day <= 10 ? DAY_ORDERS[day] : 28 + (day - 10) * 2

// 목표 금액 = 주문 개수 × 퍼펙트 가격(2,500원) × 달성률(80%)
getDayTarget(day) = getDayOrders(day) * 2500 * 0.8

// 손님 등장 간격 = 하루 시간 / (주문 개수 / 평균 주문량 1.5) × (±30% 변동)
getSpawnInterval(day, dayTime) = {
  min: avgInterval * 0.7,
  max: avgInterval * 1.3
}
```

### 하루 시간
- **기본**: 60초
- **시간 연장 업그레이드**: +5초/레벨 (최대 +25초)

---

## 별 시스템

### 별 획득 조건
| 조건 | 별 |
|------|-----|
| 목표금액 미달성 | 0개 |
| 목표금액 ~ +2,400원 | 1개 |
| 목표금액 +2,500원 ~ +4,900원 | 2개 |
| 목표금액 +5,000원 이상 | 3개 |

### 재도전 시
- 같은 날 재도전 시 기존 별보다 높아야만 추가 적립
- 예: 기존 1별 → 새로 2별 획득 → 총 1별 추가 적립

---

## 업그레이드 시스템 (상점)

### 능력 강화 (레벨별 비용)
| 업그레이드 | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 | 효과 |
|------------|-----|-----|-----|-----|-----|------|
| 🧈 반죽 개선 | ⭐7 | ⭐10 | ⭐13 | ⭐16 | ⭐19 | 와플 가격 +50원/레벨 |
| 🔥 화력 강화 | ⭐7 | ⭐10 | ⭐13 | - | - | 굽기속도 +10%/레벨 |
| ⏱️ 시간 연장 | ⭐4 | ⭐7 | ⭐10 | ⭐13 | ⭐16 | 하루 시간 +5초/레벨 |

### 트레이 확장 (레벨별 비용)
| 업그레이드 | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 | 효과 |
|------------|-----|-----|-----|-----|-----|------|
| 📥 준비트레이 | ⭐4 | ⭐7 | ⭐10 | ⭐13 | ⭐16 | 용량 +1/레벨 (기본 5) |
| 📤 완성트레이 | ⭐4 | ⭐7 | ⭐10 | ⭐13 | ⭐16 | 용량 +1/레벨 (기본 5) |

---

## 에셋 (public/assets/images/)

### 와플 이미지
- `waffle_batter.png` ~ `waffle_burnt.png` (5종)
- `waffle_apple_jam_*.png` (완성품 3종: undercooked, cooked, perfect)

### UI 이미지
- `grill_slot_empty.png` - 빈 굽는판 칸
- `btn_apple_jam.png`, `btn_berry_jam.png`, `btn_pistachio_jam.png` - 잼 버튼
- `btn_trash.png` - 버리기 버튼
- `ready_tray.png` - 작업 트레이 배경
- `finished_plate.png` - 완성품 트레이 배경
- `customer_background.png` - 손님 영역 배경
- `home_background.png` - 홈 화면 배경

### 주문 이미지
- `order_apple_jam.png`, `order_berry_jam.png`, `order_pistachio_jam.png`

### 손님 이미지
- `customer_{type}.png` - 일반 (7종)
- `customer_{type}_angry.png` - 화난 버전 (7종)
- 종류: dog, hamster, turtle, horse, bear, rabbit, fox

### 콤보 이미지
- `combo.png` - 콤보 텍스트 이미지

### 효과음 (public/assets/audio/)
- `combo.mp3` - 콤보 효과음
- `stage_success.mp3` - 스테이지 성공 효과음
- `stage_fail.mp3` - 스테이지 실패 효과음

### BGM (public/assets/audio/)
- `home_bgm.mp3` - 홈 화면 BGM (루프, volume: 0.5)
- `play_bgm.mp3` - 게임 플레이 BGM (루프, volume: 0.4)

---

## 개발 명령어

```bash
npm run dev          # 개발 서버 (Vite)
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 미리보기
npm run deploy       # 빌드 후 GitHub Pages 배포

# Capacitor (모바일)
npm run cap:sync     # 빌드 후 네이티브 동기화
npm run cap:open:ios # iOS 프로젝트 열기 (Xcode)
npm run cap:open:android # Android 프로젝트 열기 (Android Studio)
npm run build:mobile # 빌드 + 동기화
```

---

## 레이아웃 Y 좌표 (GameScene.ts)

```typescript
HEADER_Y = 45          // 상단 바 (Day, 돈)
TIME_BAR_Y = 90        // 시간 바
CUSTOMER_Y = 190       // 손님 영역
FINISHED_TRAY_Y = 355  // 완성품 트레이
TOPPING_BTN_Y = 455    // 잼/버리기 버튼
WORK_TRAY_Y = 535      // 작업 트레이
GRILL_START_Y = 680    // 3x3 굽는판 시작
```

---

## 주요 타입 (types/game.ts)

```typescript
// 익힘 단계
enum CookingStage { EMPTY, BATTER, UNDERCOOKED, COOKED, PERFECT, BURNT }

// 잼 종류
enum JamType { NONE, APPLE, BERRY, PISTACHIO }

// 손님 종류
type CustomerType = 'dog' | 'hamster' | 'turtle' | 'horse' | 'bear' | 'rabbit' | 'fox'

// 업그레이드 종류
enum UpgradeType {
  BATTER, FIRE_STRENGTH, TIME_EXTENSION,
  WORK_TRAY_CAPACITY, FINISHED_TRAY_CAPACITY
}

// 주요 인터페이스
interface GrillSlot { stage: CookingStage; cookTime: number }
interface TrayWaffle { stage: CookingStage; jamType: JamType }
interface Customer { id, type, waffleCount, waitTime, maxWaitTime, preferredJam }
interface GameState { day, money, targetMoney, timeRemaining, maxTime, isStrongFire, strongFireRemaining, lastSaleTime, comboCount }
interface ProgressState { totalStars, currentDay, dayStars, upgrades, unlockedJams }
```

---

## LocalStorage 키

| 키 | 용도 |
|----|------|
| `waffleTycoon_hearts` | 하트 상태 (hearts, lastRechargeTime) |
| `waffleTycoon_progress` | 진행상황 (별, 일차, 업그레이드) |

---

## Supabase 연동 (회원/클라우드 저장)

### 설정
- **프로젝트**: `udegsopkidgluonvywad`
- **환경변수**: `.env` 파일에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정
- **MCP 서버**: [supabase-community/supabase-mcp](https://github.com/supabase-community/supabase-mcp) 사용 가능

### 인증 (AuthManager.ts)
- **Google OAuth** 로그인/로그아웃
- `signInWithGoogle()` - Google 로그인
- `signOut()` - 로그아웃
- `getUser()` - 현재 사용자 정보
- `getDisplayName()` - 표시 이름
- `onAuthStateChange()` - 인증 상태 변경 리스너

### 클라우드 저장 (CloudSaveManager.ts)
- `saveToCloud(data)` - 클라우드에 저장
- `loadFromCloud()` - 클라우드에서 불러오기
- `syncWithLocal(localData)` - 로컬 ↔ 클라우드 동기화

### 데이터베이스 테이블
```sql
-- game_progress 테이블
CREATE TABLE game_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  total_stars INTEGER,
  current_day INTEGER,
  day_stars JSONB,
  day_money JSONB,
  upgrades JSONB,
  unlocked_jams TEXT[],
  hearts INTEGER,
  last_recharge_time BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 동기화 전략
```
앱 시작 → 로그인 확인
├─ 비로그인: LocalStorage만 사용
└─ 로그인: 클라우드 데이터 로드 → 로컬과 비교 → 병합

저장 시점 (Day 완료, 업그레이드 등)
├─ LocalStorage 저장 (항상)
└─ 로그인 시: 클라우드에도 저장 (2초 디바운스)

병합 기준: 더 높은 별/일차 우선
```

### HomeScene UI
- **로그인 버튼**: 헤더 왼쪽 (Guest 옆)
- **로그인 시**: 프로필 이름 표시 + 로그아웃 버튼
- **비로그인 시**: "👤 Guest" + 파란색 로그인 버튼

---

## 향후 개발 아이디어

### 우선 개발
- [ ] 튜토리얼 만들기
- [ ] 효과음, 배경음 만들기
- [x] Day 트리 만들기 ✅
- [x] 콤보 시스템 ✅

### 추후 개발
- [x] 회원 시스템 (Google 로그인, 클라우드 저장) ✅
- [ ] 랭킹 시스템 구현
- [ ] 설정 화면 (사운드 on/off 등)
- [ ] 새로운 손님 종류 추가
- [ ] 특수 이벤트 (행운의 날, 러시아워 등)
- [ ] 업적 시스템
