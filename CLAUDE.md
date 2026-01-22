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
│   └── GameScene.ts     # 메인 게임 로직
└── types/
    └── game.ts          # 타입 정의, 게임 상수
```

## 씬 흐름

```
BootScene (에셋 로딩) → HomeScene (메인 메뉴) → GameScene (게임 플레이)
```

### HomeScene (홈 화면)
- **타이틀**: "와플 타이쿤" + 🧇 이모지
- **시작 버튼**: "N일차 시작하기" (중앙)
- **사이드 버튼** (우상단): 🏆 랭킹, ⚙️ 설정, ❓ 도움말
  - 현재 placeholder 팝업 ("준비 중입니다!")
- 추후 LocalStorage 연동으로 진행 상황 저장 대비

### 일시정지 기능 (GameScene)
- **X 버튼**: 헤더 오른쪽 끝
- **일시정지 팝업**:
  - 🔄 재시도: 현재 일차 다시 시작
  - 🚪 종료: 홈 화면으로 이동
- **확인 팝업**: 재시도/종료 전 "확인/취소" 확인 필요

## 게임 메커니즘

### 와플 굽기 (3x3 굽는판)
- **익힘 단계**: EMPTY → BATTER → UNDERCOOKED → COOKED → PERFECT → BURNT
- **각 단계 소요 시간**: 3초 (강불 시 1.5초)
- 빈 칸 클릭 → 반죽 올리기
- 익은 와플 클릭 → 작업 트레이로 이동

### 작업 흐름
1. 굽는판에서 와플 굽기
2. 작업 트레이로 이동 (탄 와플 제외 판매 가능)
3. 잼 버튼 → 완성품 트레이로 이동
4. 손님 클릭 → 와플 판매

### 가격표
| 익힘 단계 | 가격 |
|-----------|------|
| 덜익음 (UNDERCOOKED) | 1,500원 |
| 익음 (COOKED) | 2,000원 |
| 퍼펙트 (PERFECT) | 2,500원 |
| 탄 것 (BURNT) | 판매 불가 |

### 손님 시스템
- **최대 동시 손님**: 3명 (고정 슬롯)
- **등장 간격**: 5~10초
- **대기 시간**: 15~30초 (종류별 배율 적용)
- **주문 개수**: 1~3개

#### 손님 종류
| 종류 | 등장 시기 | 대기 배율 |
|------|-----------|-----------|
| dog, hamster, horse | Day 1~3 | 1.0 |
| turtle | Day 1~3 | 1.5 (느긋) |
| bear, rabbit | Day 4+ | 0.8 (급함) |

- 게이지 25% 이하 → 화난 이미지로 전환

### Day 시스템
- **하루 시간**: 60초
- **시작 목표**: 20,000원
- **목표 증가**: +5,000원/일
- 목표 달성 → 다음 날
- 목표 미달 → 재도전

### 강불 버튼
- 3초간 굽기 속도 2배
- 쿨다운 없음 (남용 가능)

## 에셋 (public/assets/images/)

### 와플 이미지
- `waffle_batter.png` ~ `waffle_burnt.png` (5종)
- `waffle_apple_jam_*.png` (완성품 3종)

### UI 이미지
- `grill_slot_empty.png` - 빈 굽는판 칸
- `btn_apple_jam.png` - 잼 바르기 버튼
- `btn_trash.png` - 버리기 버튼
- `ready_tray.png` - 작업 트레이 배경
- `finished_plate.png` - 완성품 트레이 배경
- `customer_background.png` - 손님 영역 배경
- `home_background.png` - 홈 화면 배경

### 손님 이미지
- `customer_{type}.png` - 일반 (6종)
- `customer_{type}_angry.png` - 화난 버전 (6종)
- 종류: dog, hamster, turtle, horse, bear, rabbit

## 개발 명령어

```bash
npm run dev          # 개발 서버 (Vite)
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 미리보기

# Capacitor (모바일)
npm run cap:sync     # 빌드 후 네이티브 동기화
npm run cap:open:ios # iOS 프로젝트 열기 (Xcode)
npm run cap:open:android # Android 프로젝트 열기 (Android Studio)
npm run build:mobile # 빌드 + 동기화
```

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

## 주요 타입 (types/game.ts)

```typescript
enum CookingStage { EMPTY, BATTER, UNDERCOOKED, COOKED, PERFECT, BURNT }
type CustomerType = 'dog' | 'hamster' | 'turtle' | 'horse' | 'bear' | 'rabbit'

interface GrillSlot { stage: CookingStage; cookTime: number }
interface TrayWaffle { stage: CookingStage; hasJam: boolean }
interface Customer { id, type, waffleCount, waitTime, maxWaitTime }
interface GameState { day, money, targetMoney, timeRemaining, maxTime, isStrongFire, strongFireRemaining }
```

## 향후 개발 아이디어

- [ ] 토핑 종류 추가 (초코, 크림 등)
- [ ] 업그레이드 시스템 (굽는판 확장, 강불 지속시간 등)
- [ ] 사운드 효과 및 BGM
- [ ] 저장/불러오기 (LocalStorage)
- [ ] 새로운 손님 종류
- [ ] 특수 주문 (특정 익힘 단계 요구)
