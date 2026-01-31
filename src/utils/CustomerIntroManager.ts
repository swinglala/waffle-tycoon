import {
  CustomerType,
  CustomerIntroConfig,
  CUSTOMER_INTRO_CONFIG,
  CUSTOMER_INTRO_STORAGE_KEY,
} from "../types/game";

/**
 * 손님 소개 관리자
 * Day 5, 10, 15에 처음 도달할 때 새로운 손님 소개 팝업 표시를 관리
 */
export class CustomerIntroManager {
  private static instance: CustomerIntroManager;
  private seenIntros: Set<CustomerType>;

  private constructor() {
    this.seenIntros = this.loadSeenIntros();
  }

  static getInstance(): CustomerIntroManager {
    if (!CustomerIntroManager.instance) {
      CustomerIntroManager.instance = new CustomerIntroManager();
    }
    return CustomerIntroManager.instance;
  }

  /**
   * localStorage에서 이미 본 소개 목록 불러오기
   */
  private loadSeenIntros(): Set<CustomerType> {
    const saved = localStorage.getItem(CUSTOMER_INTRO_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CustomerType[];
        return new Set(parsed);
      } catch {
        // 파싱 실패시 빈 Set
      }
    }
    return new Set();
  }

  /**
   * 이미 본 소개 목록 저장
   */
  private saveSeenIntros(): void {
    const arr = Array.from(this.seenIntros);
    localStorage.setItem(CUSTOMER_INTRO_STORAGE_KEY, JSON.stringify(arr));
  }

  /**
   * 해당 Day에 보여줄 손님 소개 반환
   * 이미 봤으면 null 반환
   */
  getIntroForDay(day: number): { type: CustomerType; config: CustomerIntroConfig } | null {
    // Day별 등장 손님 매핑
    const dayToCustomer: Record<number, CustomerType> = {
      5: "rabbit",
      10: "bear",
      15: "fox",
    };

    const customerType = dayToCustomer[day];
    if (!customerType) {
      return null; // 해당 Day에 소개할 손님 없음
    }

    // 이미 본 소개인지 확인
    if (this.seenIntros.has(customerType)) {
      return null;
    }

    const config = CUSTOMER_INTRO_CONFIG[customerType];
    if (!config) {
      return null;
    }

    return { type: customerType, config };
  }

  /**
   * 소개를 본 것으로 표시
   */
  markIntroSeen(type: CustomerType): void {
    this.seenIntros.add(type);
    this.saveSeenIntros();
  }

  /**
   * 특정 손님의 소개를 봤는지 확인
   */
  hasSeenIntro(type: CustomerType): boolean {
    return this.seenIntros.has(type);
  }

  /**
   * 모든 소개 기록 초기화 (디버그용)
   */
  resetSeenIntros(): void {
    this.seenIntros.clear();
    localStorage.removeItem(CUSTOMER_INTRO_STORAGE_KEY);
  }
}
