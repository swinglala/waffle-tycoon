// 와플 익힘 단계
export enum CookingStage {
  EMPTY = 'empty',
  BATTER = 'batter',       // 반죽 🟡
  UNDERCOOKED = 'undercooked', // 덜익음 🟠
  COOKED = 'cooked',       // 익음 🔴
  PERFECT = 'perfect',     // 퍼펙트 ✨
  BURNT = 'burnt',         // 탐 💀
}

// 굽는판 한 칸
export interface GrillSlot {
  stage: CookingStage;
  cookTime: number;  // 현재 단계에서 경과 시간
}

// 트레이 와플 (작업 트레이용)
export interface TrayWaffle {
  stage: CookingStage;  // 어떤 익힘 상태로 꺼냈는지
  hasJam: boolean;
}

// 손님 종류
export type CustomerType = 'dog' | 'hamster' | 'turtle' | 'horse' | 'bear' | 'rabbit';

// 손님
export interface Customer {
  id: number;
  type: CustomerType;      // 손님 종류
  waffleCount: number;     // 주문 와플 개수 (1~3)
  waitTime: number;        // 남은 대기 시간
  maxWaitTime: number;     // 최대 대기 시간
}

// 손님별 대기 시간 배율 (거북이는 더 오래 기다림)
export const CUSTOMER_WAIT_MULTIPLIER: Record<CustomerType, number> = {
  dog: 1,
  hamster: 1,
  horse: 1,
  turtle: 1.5,    // 거북이는 50% 더 오래 기다림
  bear: 0.8,      // 곰은 조금 급함
  rabbit: 0.8,    // 토끼도 조금 급함
};

// 게임 설정 상수
export const GAME_CONFIG = {
  // 손님 설정
  CUSTOMER_SPAWN_MIN: 5,      // 최소 등장 간격 (초)
  CUSTOMER_SPAWN_MAX: 10,     // 최대 등장 간격 (초)
  CUSTOMER_WAIT_MIN: 15,      // 최소 대기 시간 (초)
  CUSTOMER_WAIT_MAX: 30,      // 최대 대기 시간 (초)
  CUSTOMER_ORDER_MIN: 1,      // 최소 주문 개수
  CUSTOMER_ORDER_MAX: 3,      // 최대 주문 개수
  MAX_CUSTOMERS: 3,           // 최대 동시 손님 수

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
