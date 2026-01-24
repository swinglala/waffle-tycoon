# 와플 타이쿤 (Waffle Tycoon)

모바일 2D 타이쿤 게임 - Phaser 3 기반

## 기술 스택

- **게임 엔진**: Phaser 3.80.1
- **언어**: TypeScript 5.4
- **빌드**: Vite 5.4
- **모바일 래퍼**: Capacitor 6.0 (iOS/Android)
- **화면 크기**: 720x1280 (9:16 세로 모바일)

## 프로젝트 구조

```
src/
├── main.ts              # 엔트리포인트, Phaser.Game 인스턴스 생성
├── config/
│   ├── gameConfig.ts    # Phaser 게임 설정
│   └── constants.ts     # 화면 크기 상수 (720x1280)
├── scenes/
│   ├── BootScene.ts     # 에셋 로딩 씬
│   ├── HomeScene.ts     # 홈 화면 (메인 메뉴)
│   ├── GameScene.ts     # 메인 게임 로직
│   └── ShopScene.ts     # 상점 화면
├── utils/
│   ├── HeartManager.ts  # 하트 시스템 관리
│   └── ProgressManager.ts # 진행상황/별/업그레이드 관리
└── types/
    └── game.ts          # 타입 정의, 게임 상수
```

## 씬 흐름

```
BootScene (에셋 로딩) → HomeScene (메인 메뉴) → GameScene (게임 플레이)
                              ↓
                         ShopScene (상점)
```

### HomeScene (홈 화면)
- **타이틀**: "와플 타이쿤"
- **하트 표시**: 현재 하트 개수 및 충전 타이머
- **별 표시**: 총 보유 별 개수
- **시작 버튼**: "N일차 시작하기" (중앙)
- **사이드 버튼**:
  - 🏆 랭킹 (준비 중)
  - 🛒 상점 → ShopScene으로 이동
  - ⚙️ 설정 (준비 중)

### ShopScene (상점)
- **3열 그리드 레이아웃**:
  - 1행: 🍓 베리잼, 🥜 피스타치오잼
  - 2행: 🧈 반죽 개선, 🔥 화력 강화, ⏱️ 시간 연장
  - 3행: 📥 준비트레이, 📤 완성트레이
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

---

## 잼 시스템

### 잼 종류
| 잼 | 가격 배율 | 해금 조건 |
|----|-----------|-----------|
| 🍎 사과잼 (APPLE) | 1.0배 | 기본 해금 |
| 🍓 베리잼 (BERRY) | 1.3배 | 상점에서 ⭐7 |
| 🥜 피스타치오잼 (PISTACHIO) | 1.5배 | 상점에서 ⭐13 |

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
- **등장 간격**: Day 1 (5~10초) → Day 5+ (2~5초) 점진적 증가
- **게이지 25% 이하**: 화난 이미지로 전환

### 손님 상세 정보

| 종류 | 대기시간 | 주문수 | 선호잼 | 선호확률 | 등장일 | 특수조건 | 등장가중치 | 쿨다운 |
|------|----------|--------|--------|----------|--------|----------|------------|--------|
| 🐕 dog | 15초 | 1~2개 | 없음 | - | Day 1 | - | 1.0 | 0초 |
| 🐹 hamster | 15초 | 1~2개 | 피스타치오 | 70% | Day 1 | - | 1.0 | 0초 |
| 🐴 horse | 12초 | 1~2개 | 베리 | 60% | Day 1 | - | 1.0 | 0초 |
| 🐢 turtle | 22초 | 2~3개 | 없음 | - | Day 1 | - | 1.0 | 0초 |
| 🐰 rabbit | 8초 | 1~2개 | 베리 | 80% | Day 5 | - | 1.0 | 0초 |
| 🐻 bear | 18초 | 5~7개 | 사과 | 90% | Day 10 | - | 0.15 | 20초 |
| 🦊 fox | 12초 | 1~2개 | 피스타치오 | 80% | Day 15 | 퍼펙트만! | 1.0 | 0초 |

### 손님별 특징
- **dog**: 기본 손님, 아무 잼이나 OK
- **hamster**: 피스타치오 선호
- **horse**: 베리 선호, 약간 급함
- **turtle**: 느긋함, 대량 주문
- **rabbit**: 매우 급함 (8초), 베리 좋아함
- **bear**: 대량 주문 (5~7개), 드물게 등장 (가중치 0.15, 20초 쿨다운)
- **fox**: **퍼펙트 와플만** 받음! 피스타치오 선호

---

## Day 시스템

### 목표 금액 테이블
| Day | 목표 금액 |
|-----|-----------|
| 1 | 20,000원 |
| 2 | 25,000원 |
| 3 | 30,000원 |
| 4 | 35,000원 |
| 5 | 40,000원 |
| 6 | 45,000원 |
| 7 | 50,000원 |
| 8 | 55,000원 |
| 9 | 60,000원 |
| 10 | 65,000원 |
| 11+ | 65,000 + (day-10) × 5,000원 |

### 하루 시간
- **기본**: 60초
- **시간 연장 업그레이드**: +5초/레벨 (최대 +25초)

---

## 별 시스템

### 별 획득 조건
```
별 개수 = floor((벌어들인돈 - 목표금액) / 2500)
최대 3개
```

### 재도전 시
- 같은 날 재도전 시 기존 별보다 높아야만 추가 적립
- 예: 기존 1별 → 새로 2별 획득 → 총 1별 추가 적립

---

## 업그레이드 시스템 (상점)

### 잼 해금
| 업그레이드 | 비용 | 효과 |
|------------|------|------|
| 🍓 베리잼 | ⭐7 | 가격 1.3배 잼 해금 |
| 🥜 피스타치오잼 | ⭐13 | 가격 1.5배 잼 해금 |

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
  BERRY_JAM, PISTACHIO_JAM,
  BATTER, FIRE_STRENGTH, TIME_EXTENSION,
  WORK_TRAY_CAPACITY, FINISHED_TRAY_CAPACITY
}

// 주요 인터페이스
interface GrillSlot { stage: CookingStage; cookTime: number }
interface TrayWaffle { stage: CookingStage; jamType: JamType }
interface Customer { id, type, waffleCount, waitTime, maxWaitTime, preferredJam }
interface GameState { day, money, targetMoney, timeRemaining, maxTime, isStrongFire, strongFireRemaining }
interface ProgressState { totalStars, currentDay, dayStars, upgrades, unlockedJams }
```

---

## LocalStorage 키

| 키 | 용도 |
|----|------|
| `waffleTycoon_hearts` | 하트 상태 (hearts, lastRechargeTime) |
| `waffleTycoon_progress` | 진행상황 (별, 일차, 업그레이드) |

---

## 향후 개발 아이디어

- [ ] 사운드 효과 및 BGM
- [ ] 랭킹 시스템 구현
- [ ] 설정 화면 (사운드 on/off 등)
- [ ] 새로운 손님 종류 추가
- [ ] 특수 이벤트 (행운의 날, 러시아워 등)
- [ ] 업적 시스템
