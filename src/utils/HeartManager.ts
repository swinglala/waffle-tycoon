import { HEART_CONFIG, HeartState } from "../types/game";

const STORAGE_KEY = "waffleTycoon_hearts";

// 클라우드 동기화 콜백 타입
type CloudSyncCallback = () => void;

export class HeartManager {
  private static instance: HeartManager;
  private state: HeartState;
  private cloudSyncCallback: CloudSyncCallback | null = null;

  private constructor() {
    this.state = this.loadState();
    this.rechargeHearts();
  }

  static getInstance(): HeartManager {
    if (!HeartManager.instance) {
      HeartManager.instance = new HeartManager();
    }
    return HeartManager.instance;
  }

  private loadState(): HeartState {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // 파싱 실패시 기본값
      }
    }
    // 기본값: 최대 하트로 시작
    return {
      hearts: HEART_CONFIG.MAX_HEARTS,
      lastRechargeTime: Date.now(),
    };
  }

  private saveState(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    // 클라우드 동기화 트리거
    this.triggerCloudSync();
  }

  /**
   * 클라우드 동기화 트리거
   */
  private triggerCloudSync(): void {
    if (this.cloudSyncCallback) {
      this.cloudSyncCallback();
    }
  }

  // 시간 경과에 따른 하트 충전
  rechargeHearts(): void {
    const now = Date.now();
    const elapsed = Math.floor((now - this.state.lastRechargeTime) / 1000); // 초 단위
    const heartsToAdd = Math.floor(elapsed / HEART_CONFIG.RECHARGE_TIME);

    if (heartsToAdd > 0 && this.state.hearts < HEART_CONFIG.MAX_HEARTS) {
      this.state.hearts = Math.min(
        this.state.hearts + heartsToAdd,
        HEART_CONFIG.MAX_HEARTS
      );
      // 마지막 충전 시간 업데이트 (남은 시간 유지)
      this.state.lastRechargeTime += heartsToAdd * HEART_CONFIG.RECHARGE_TIME * 1000;
      this.saveState();
    }

    // 하트가 최대면 타이머 리셋
    if (this.state.hearts >= HEART_CONFIG.MAX_HEARTS) {
      this.state.lastRechargeTime = now;
      this.saveState();
    }
  }

  getHearts(): number {
    this.rechargeHearts();
    return this.state.hearts;
  }

  // 다음 하트까지 남은 시간 (초)
  getTimeToNextHeart(): number {
    if (this.state.hearts >= HEART_CONFIG.MAX_HEARTS) {
      return 0;
    }
    const now = Date.now();
    const elapsed = Math.floor((now - this.state.lastRechargeTime) / 1000);
    return HEART_CONFIG.RECHARGE_TIME - (elapsed % HEART_CONFIG.RECHARGE_TIME);
  }

  // 하트 사용 (게임 시작시)
  useHeart(): boolean {
    this.rechargeHearts();
    if (this.state.hearts > 0) {
      this.state.hearts--;
      // 하트가 최대에서 줄어들면 충전 타이머 시작
      if (this.state.hearts === HEART_CONFIG.MAX_HEARTS - 1) {
        this.state.lastRechargeTime = Date.now();
      }
      this.saveState();
      return true;
    }
    return false;
  }

  // 하트 반환 (목표 달성시)
  refundHeart(): void {
    this.state.hearts = Math.min(
      this.state.hearts + 1,
      HEART_CONFIG.MAX_HEARTS
    );
    this.saveState();
  }

  // 하트가 있는지 확인
  hasHeart(): boolean {
    this.rechargeHearts();
    return this.state.hearts > 0;
  }

  // 포맷된 시간 문자열 (MM:SS)
  formatTimeToNextHeart(): string {
    const seconds = this.getTimeToNextHeart();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // ========================================
  // 클라우드 동기화 관련 메서드
  // ========================================

  /**
   * 클라우드 동기화 콜백 등록
   * CloudSaveManager와 연동할 때 사용
   */
  setCloudSyncCallback(callback: CloudSyncCallback | null): void {
    this.cloudSyncCallback = callback;
  }

  /**
   * 현재 상태 반환 (클라우드 저장용)
   */
  getState(): HeartState {
    return { ...this.state };
  }

  /**
   * 외부 데이터로 상태 덮어쓰기 (클라우드 불러오기용)
   * @returns 변경 여부
   */
  loadFromExternalData(data: HeartState): boolean {
    const hasChanged =
      data.hearts !== this.state.hearts ||
      data.lastRechargeTime !== this.state.lastRechargeTime;

    this.state = {
      hearts: data.hearts ?? HEART_CONFIG.MAX_HEARTS,
      lastRechargeTime: data.lastRechargeTime ?? Date.now(),
    };
    // 불러온 후 충전 계산
    this.rechargeHearts();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));

    return hasChanged;
  }
}
