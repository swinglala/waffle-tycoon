// 와플 익힘 단계
export enum CookingStage {
  EMPTY = 'empty',
  BATTER = 'batter',       // 반죽 🟡
  UNDERCOOKED = 'undercooked', // 덜익음 🟠
  COOKED = 'cooked',       // 익음 🔴
  PERFECT = 'perfect',     // 퍼펙트 ✨
  BURNT = 'burnt',         // 탐 💀
}

// 잼 종류
export enum JamType {
  NONE = 'none',
  APPLE = 'apple',
  BERRY = 'berry',
  PISTACHIO = 'pistachio',
}

// 굽는판 한 칸
export interface GrillSlot {
  stage: CookingStage;
  cookTime: number;  // 현재 단계에서 경과 시간
}

// 트레이 와플 (작업 트레이용)
export interface TrayWaffle {
  stage: CookingStage;  // 어떤 익힘 상태로 꺼냈는지
  jamType: JamType;     // 바른 잼 종류 (NONE이면 잼 없음)
}

// 손님 종류
export type CustomerType = 'dog' | 'hamster' | 'turtle' | 'horse' | 'bear' | 'rabbit' | 'fox';

// 손님
export interface Customer {
  id: number;
  type: CustomerType;      // 손님 종류
  waffleCount: number;     // 주문 와플 개수
  waitTime: number;        // 남은 대기 시간
  maxWaitTime: number;     // 최대 대기 시간
  preferredJam: JamType;   // 선호 잼 (주문한 잼)
}

// 손님별 설정
export interface CustomerConfig {
  waitTime: number;           // 대기 시간 (초)
  orderMin: number;           // 최소 주문 개수
  orderMax: number;           // 최대 주문 개수
  jamPreference: JamType | null;  // 선호 잼 (null = 아무거나)
  jamPreferenceChance: number;    // 선호 잼 확률 (0~1)
  appearDay: number;          // 등장 시작일
  requiresPerfect: boolean;   // 퍼펙트 와플만 가능 여부
  spawnWeight: number;        // 등장 가중치 (1.0 = 기본, 낮을수록 덜 등장)
  spawnCooldown: number;      // 등장 후 쿨다운 (초, 연속 등장 방지)
}

// 손님별 상세 설정
export const CUSTOMER_CONFIG: Record<CustomerType, CustomerConfig> = {
  dog: {
    waitTime: 15,
    orderMin: 1,
    orderMax: 2,
    jamPreference: null,      // 아무거나
    jamPreferenceChance: 0,
    appearDay: 1,
    requiresPerfect: false,
    spawnWeight: 1.0,
    spawnCooldown: 0,
  },
  hamster: {
    waitTime: 15,
    orderMin: 1,
    orderMax: 2,
    jamPreference: JamType.PISTACHIO,  // 피스타치오 선호
    jamPreferenceChance: 0.7,          // 70%
    appearDay: 1,
    requiresPerfect: false,
    spawnWeight: 1.0,
    spawnCooldown: 0,
  },
  horse: {
    waitTime: 12,
    orderMin: 1,
    orderMax: 2,
    jamPreference: JamType.BERRY,      // 딸기(베리) 선호
    jamPreferenceChance: 0.6,          // 60%
    appearDay: 1,
    requiresPerfect: false,
    spawnWeight: 1.0,
    spawnCooldown: 0,
  },
  turtle: {
    waitTime: 22,
    orderMin: 2,
    orderMax: 3,
    jamPreference: null,      // 아무거나
    jamPreferenceChance: 0,
    appearDay: 1,
    requiresPerfect: false,
    spawnWeight: 1.0,
    spawnCooldown: 0,
  },
  rabbit: {
    waitTime: 8,
    orderMin: 1,
    orderMax: 2,
    jamPreference: JamType.BERRY,      // 딸기(베리) 선호
    jamPreferenceChance: 0.8,          // 80%
    appearDay: 5,
    requiresPerfect: false,
    spawnWeight: 1.0,
    spawnCooldown: 10,         // 등장 후 10초간 재등장 불가 (연속 등장 방지)
  },
  bear: {
    waitTime: 18,
    orderMin: 5,
    orderMax: 7,
    jamPreference: JamType.APPLE,      // 사과 선호
    jamPreferenceChance: 0.9,          // 90%
    appearDay: 10,
    requiresPerfect: false,
    spawnWeight: 0.15,         // 낮은 등장 확률 (하루 2~3번)
    spawnCooldown: 20,         // 등장 후 20초간 재등장 불가
  },
  fox: {
    waitTime: 12,
    orderMin: 1,
    orderMax: 2,
    jamPreference: JamType.PISTACHIO,  // 피스타치오 선호
    jamPreferenceChance: 0.8,          // 80%
    appearDay: 15,
    requiresPerfect: true,             // 퍼펙트만 가능!
    spawnWeight: 1.0,
    spawnCooldown: 0,
  },
};

// 게임 설정 상수
export const GAME_CONFIG = {
  MAX_CUSTOMERS: 3,             // 최대 동시 손님 수
  DAY_TIME: 60,                 // 하루 시간 (초) - 1분
};

// 게임 상태
export interface GameState {
  day: number;
  money: number;
  targetMoney: number;
  timeRemaining: number;   // 남은 시간 (초)
  maxTime: number;         // 하루 제한 시간
  isStrongFire: boolean;   // 강불 상태
  strongFireRemaining: number; // 강불 남은 시간
}

// 익힘 단계별 필요 시간 (초)
export const COOKING_TIMES: Record<CookingStage, number> = {
  [CookingStage.EMPTY]: 0,
  [CookingStage.BATTER]: 8,      // 반죽 → 덜익음: 8초
  [CookingStage.UNDERCOOKED]: 6, // 덜익음 → 익음: 6초
  [CookingStage.COOKED]: 6,      // 익음 → 퍼펙트: 6초
  [CookingStage.PERFECT]: 6,     // 퍼펙트 → 탐: 6초
  [CookingStage.BURNT]: 999,     // 탐은 더 이상 진행 안함
};

// 단계별 색상
export const STAGE_COLORS: Record<CookingStage, number> = {
  [CookingStage.EMPTY]: 0x8B7355,
  [CookingStage.BATTER]: 0xF5DEB3,     // 밀가루색
  [CookingStage.UNDERCOOKED]: 0xDEB887, // 연한 갈색
  [CookingStage.COOKED]: 0xCD853F,      // 갈색
  [CookingStage.PERFECT]: 0xFFD700,     // 금색
  [CookingStage.BURNT]: 0x2F1810,       // 검은색
};

// 단계별 이모지
export const STAGE_EMOJI: Record<CookingStage, string> = {
  [CookingStage.EMPTY]: '',
  [CookingStage.BATTER]: '🟡',
  [CookingStage.UNDERCOOKED]: '🟠',
  [CookingStage.COOKED]: '🔴',
  [CookingStage.PERFECT]: '✨',
  [CookingStage.BURNT]: '💀',
};

// 가격표
export const WAFFLE_PRICES: Record<CookingStage, number> = {
  [CookingStage.EMPTY]: 0,
  [CookingStage.BATTER]: 0,
  [CookingStage.UNDERCOOKED]: 1500,  // 덜익음 + 잼
  [CookingStage.COOKED]: 2000,       // 익음 + 잼
  [CookingStage.PERFECT]: 2500,      // 퍼펙트 + 잼
  [CookingStage.BURNT]: 0,           // 판매 불가
};

// 하트 시스템 설정
export const HEART_CONFIG = {
  MAX_HEARTS: 5,              // 최대 하트 수
  RECHARGE_TIME: 15 * 60,     // 충전 시간 (초) - 15분
};

// 하트 상태 (localStorage 저장용)
export interface HeartState {
  hearts: number;             // 현재 하트 수
  lastRechargeTime: number;   // 마지막 충전 시간 (timestamp)
}

// ========================================
// 별/샵 시스템
// ========================================

// 잼 가격 배율
export const JAM_PRICE_MULTIPLIER: Record<JamType, number> = {
  [JamType.NONE]: 0,
  [JamType.APPLE]: 1.0,
  [JamType.BERRY]: 1.3,
  [JamType.PISTACHIO]: 1.5,
};

// 잼별 표시 이름
export const JAM_DISPLAY_NAME: Record<JamType, string> = {
  [JamType.NONE]: '',
  [JamType.APPLE]: '사과잼',
  [JamType.BERRY]: '베리잼',
  [JamType.PISTACHIO]: '피스타치오잼',
};

// Day별 주문 개수 테이블
export const DAY_ORDERS: Record<number, number> = {
  1: 10,
  2: 12,
  3: 14,
  4: 16,
  5: 18,
  6: 20,
  7: 22,
  8: 24,
  9: 26,
  10: 28,
};

// Day별 주문 개수 반환
export function getDayOrders(day: number): number {
  if (day <= 10) {
    return DAY_ORDERS[day] || 28;
  }
  // Day 11+: 28 + (day - 10) * 2
  return 28 + (day - 10) * 2;
}

// 주문 개수 기반 목표 금액 계산 (80% 달성 기준)
export function getDayTarget(day: number): number {
  const orders = getDayOrders(day);
  return Math.floor(orders * 2500 * 0.8);
}

// 손님 등장 간격 계산 (초)
export function getSpawnInterval(day: number, dayTime: number): { min: number; max: number } {
  const orders = getDayOrders(day);
  const avgOrderPerCustomer = 1.5;
  const expectedCustomers = orders / avgOrderPerCustomer;
  const avgInterval = dayTime / expectedCustomers;

  // ±30% 변동
  return {
    min: avgInterval * 0.7,
    max: avgInterval * 1.3,
  };
}

// 업그레이드 종류
export enum UpgradeType {
  BERRY_JAM = 'berry_jam',                   // 베리잼 해금
  PISTACHIO_JAM = 'pistachio_jam',           // 피스타치오잼 해금
  BATTER = 'batter',                         // 반죽 개선 (와플 가격 +50원/레벨)
  FIRE_STRENGTH = 'fire_strength',           // 화력 강화 (굽기속도 +10%/레벨)
  TIME_EXTENSION = 'time_extension',         // 시간 연장 (+5초/레벨)
  WORK_TRAY_CAPACITY = 'work_tray_capacity', // 준비 트레이 확장 (+1/레벨)
  FINISHED_TRAY_CAPACITY = 'finished_tray_capacity', // 완성 트레이 확장 (+1/레벨)
}

// 업그레이드 설정 인터페이스
export interface UpgradeConfig {
  name: string;           // 표시 이름
  description: string;    // 설명
  costs: number[];        // 레벨별 별 비용
  maxLevel: number;       // 최대 레벨
}

// 업그레이드 설정
export const UPGRADE_CONFIGS: Record<UpgradeType, UpgradeConfig> = {
  [UpgradeType.BERRY_JAM]: {
    name: '🍓 베리잼',
    description: '가격 1.3배 잼 해금',
    costs: [7],
    maxLevel: 1,
  },
  [UpgradeType.PISTACHIO_JAM]: {
    name: '🥜 피스타치오잼',
    description: '가격 1.5배 잼 해금',
    costs: [13],
    maxLevel: 1,
  },
  [UpgradeType.BATTER]: {
    name: '🧈 반죽 개선',
    description: '와플 가격 +50원/레벨',
    costs: [7, 10, 13, 16, 19],
    maxLevel: 5,
  },
  [UpgradeType.FIRE_STRENGTH]: {
    name: '🔥 화력 강화',
    description: '굽기속도 +10%/레벨',
    costs: [7, 10, 13],
    maxLevel: 3,
  },
  [UpgradeType.TIME_EXTENSION]: {
    name: '⏱️ 시간 연장',
    description: '하루 시간 +5초/레벨',
    costs: [4, 7, 10, 13, 16],
    maxLevel: 5,
  },
  [UpgradeType.WORK_TRAY_CAPACITY]: {
    name: '📥 준비트레이',
    description: '준비 트레이 +1/레벨',
    costs: [4, 7, 10, 13, 16],
    maxLevel: 5,
  },
  [UpgradeType.FINISHED_TRAY_CAPACITY]: {
    name: '📤 완성트레이',
    description: '완성 트레이 +1/레벨',
    costs: [4, 7, 10, 13, 16],
    maxLevel: 5,
  },
};

// 진행상황 저장 구조
export interface ProgressState {
  totalStars: number;                     // 총 별 (누적, 구매 시 차감)
  currentDay: number;                     // 현재 진행 일차
  dayStars: Record<number, number>;       // 일차별 획득한 별 (재도전 시 비교용)
  dayMoney: Record<number, number>;       // 일차별 최고 금액 (Day Tree 표시용)
  upgrades: Record<UpgradeType, number>;  // 업그레이드 레벨
  unlockedJams: JamType[];                // 해금된 잼 목록
}

// 트레이 설정
export const TRAY_CONFIG = {
  WORK_BASE_CAPACITY: 5,      // 준비 트레이 기본 용량
  FINISHED_BASE_CAPACITY: 5,  // 완성 트레이 기본 용량
  CAPACITY_PER_UPGRADE: 1,    // 업그레이드당 추가 용량
};

// 시간 설정
export const TIME_CONFIG = {
  BASE_DAY_TIME: 60,          // 기본 하루 시간 (초)
  TIME_PER_UPGRADE: 5,        // 업그레이드당 추가 시간 (초)
};

// 별 계산 설정
export const STAR_CONFIG = {
  MAX_STARS_PER_DAY: 3,       // 하루 최대 별
  TWO_STAR_THRESHOLD: 3000,   // 2별 기준 초과 금액 (0 < excess <= 3000)
};

// ========================================
// 튜토리얼 시스템
// ========================================

// 튜토리얼 단계 enum
export enum TutorialStep {
  GRILL_TOUCH = 0,        // 1. 굽는판 터치
  HEAT_EXPLANATION = 1,   // 2. 열 설명
  STRONG_FIRE = 2,        // 3. 강불 버튼
  PICK_PERFECT = 3,       // 4. 퍼펙트 굽기 꺼내기
  BURN_WARNING = 4,       // 5. 타는 경고
  APPLY_JAM = 5,          // 6. 잼 바르기
  TRASH_BURNT = 6,        // 7. 탄 와플 버리기
  SERVE_CUSTOMER = 7,     // 8. 손님 주문 완료
  STAR_EXPLANATION = 8,   // 9. 별/목표금액 설명
  COMPLETE = 9,           // 완료
}

// 튜토리얼 메시지
export const TUTORIAL_MESSAGES: Record<TutorialStep, string> = {
  [TutorialStep.GRILL_TOUCH]: "굽는판을 터치해서\n반죽을 올려보세요!",
  [TutorialStep.HEAT_EXPLANATION]: "위치마다 굽기 속도가 달라요!\n가운데가 가장 빨라요",
  [TutorialStep.STRONG_FIRE]: "강불 버튼을 눌러\n3초간 빠르게 구워보세요!",
  [TutorialStep.PICK_PERFECT]: "퍼펙트가 되면 터치해서\n준비트레이로 이동하세요!",
  [TutorialStep.BURN_WARNING]: "퍼펙트를 놓치면\n와플이 타버려요!",
  [TutorialStep.APPLY_JAM]: "잼 버튼을 눌러\n완성품 트레이로 보내세요!",
  [TutorialStep.TRASH_BURNT]: "탄 와플은 쓰레기통에\n버려야 해요!",
  [TutorialStep.SERVE_CUSTOMER]: "손님을 터치해서\n와플을 판매하세요!",
  [TutorialStep.STAR_EXPLANATION]: "",  // 별도 메서드에서 처리
  [TutorialStep.COMPLETE]: "",
};

// 튜토리얼 설정
export const TUTORIAL_CONFIG = {
  HIGHLIGHT_ALPHA: 0.7,      // 어둡게 처리할 알파값
  HIGHLIGHT_DEPTH: 300,      // 하이라이트 오버레이 depth
  INSTRUCTION_DEPTH: 400,    // 안내 팝업 depth
  STORAGE_KEY: 'waffleTycoon_tutorial', // localStorage 키
};
