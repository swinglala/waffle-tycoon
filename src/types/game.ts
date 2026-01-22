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
    spawnCooldown: 0,
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
  // 손님 설정 (Day 1 기준, Day 5+에서 빨라짐)
  CUSTOMER_SPAWN_MIN_SLOW: 5,   // Day 1 최소 등장 간격 (초)
  CUSTOMER_SPAWN_MAX_SLOW: 10,  // Day 1 최대 등장 간격 (초)
  CUSTOMER_SPAWN_MIN_FAST: 2,   // Day 5+ 최소 등장 간격 (초)
  CUSTOMER_SPAWN_MAX_FAST: 5,   // Day 5+ 최대 등장 간격 (초)
  MAX_CUSTOMERS: 3,             // 최대 동시 손님 수

  // 하루 설정
  DAY_TIME: 60,               // 하루 시간 (초) - 1분
  BASE_TARGET: 20000,         // 기본 목표 금액
  TARGET_INCREASE: 5000,      // 하루당 목표 증가량
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

// Day 목표금액 테이블 (1~10일) - 5000원씩 증가
export const DAY_TARGETS: Record<number, number> = {
  1: 20000,
  2: 25000,
  3: 30000,
  4: 35000,
  5: 40000,
  6: 45000,
  7: 50000,
  8: 55000,
  9: 60000,
  10: 65000,
};

// Day 목표금액 계산 함수
export function getDayTarget(day: number): number {
  if (day <= 10) {
    return DAY_TARGETS[day] || 65000;
  }
  // Day 11+: 65000 + (day - 10) * 5000
  return 65000 + (day - 10) * 5000;
}

// 업그레이드 종류
export enum UpgradeType {
  BATTER = 'batter',               // 반죽 개선 (와플 가격 +50원/레벨)
  BERRY_JAM = 'berry_jam',         // 베리잼 해금
  PISTACHIO_JAM = 'pistachio_jam', // 피스타치오잼 해금
  FIRE_STRENGTH = 'fire_strength', // 화력 강화 (굽기속도 +10%/레벨)
  TRAY_CAPACITY = 'tray_capacity', // 트레이 확장 (+2/레벨)
}

// 업그레이드 설정 인터페이스
export interface UpgradeConfig {
  name: string;           // 표시 이름
  description: string;    // 설명
  cost: number;           // 별 비용
  maxLevel: number;       // 최대 레벨
}

// 업그레이드 설정
export const UPGRADE_CONFIGS: Record<UpgradeType, UpgradeConfig> = {
  [UpgradeType.BATTER]: {
    name: '반죽 개선',
    description: '와플 판매 가격 +50원/레벨',
    cost: 7,
    maxLevel: 5,
  },
  [UpgradeType.BERRY_JAM]: {
    name: '베리잼 해금',
    description: '가격 1.3배 잼 추가',
    cost: 7,
    maxLevel: 1,
  },
  [UpgradeType.PISTACHIO_JAM]: {
    name: '피스타치오잼 해금',
    description: '가격 1.5배 잼 추가',
    cost: 10,
    maxLevel: 1,
  },
  [UpgradeType.FIRE_STRENGTH]: {
    name: '화력 강화',
    description: '기본 굽기속도 +10%/레벨',
    cost: 7,
    maxLevel: 3,
  },
  [UpgradeType.TRAY_CAPACITY]: {
    name: '트레이 확장',
    description: '트레이 용량 +2/레벨',
    cost: 7,
    maxLevel: 5,
  },
};

// 진행상황 저장 구조
export interface ProgressState {
  totalStars: number;                     // 총 별 (누적, 구매 시 차감)
  currentDay: number;                     // 현재 진행 일차
  dayStars: Record<number, number>;       // 일차별 획득한 별 (재도전 시 비교용)
  upgrades: Record<UpgradeType, number>;  // 업그레이드 레벨
  unlockedJams: JamType[];                // 해금된 잼 목록
}

// 트레이 설정
export const TRAY_CONFIG = {
  BASE_CAPACITY: 5,         // 기본 용량
  CAPACITY_PER_UPGRADE: 2,  // 업그레이드당 추가 용량
};

// 별 계산 설정
export const STAR_CONFIG = {
  MAX_STARS_PER_DAY: 3,     // 하루 최대 별
  MONEY_PER_STAR: 3000,     // 별 1개당 초과 금액
};
