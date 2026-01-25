import {
  ProgressState,
  UpgradeType,
  JamType,
  UPGRADE_CONFIGS,
  TRAY_CONFIG,
  TIME_CONFIG,
  STAR_CONFIG,
  getDayTarget,
} from "../types/game";

const STORAGE_KEY = "waffleTycoon_progress";

// 클라우드 동기화 콜백 타입
type CloudSyncCallback = () => void;

export class ProgressManager {
  private static instance: ProgressManager;
  private state: ProgressState;
  private cloudSyncCallback: CloudSyncCallback | null = null;

  private constructor() {
    this.state = this.loadState();
  }

  static getInstance(): ProgressManager {
    if (!ProgressManager.instance) {
      ProgressManager.instance = new ProgressManager();
    }
    return ProgressManager.instance;
  }

  private getDefaultState(): ProgressState {
    return {
      totalStars: 0,
      currentDay: 1,
      dayStars: {},
      upgrades: {
        [UpgradeType.BATTER]: 0,
        [UpgradeType.BERRY_JAM]: 0,
        [UpgradeType.PISTACHIO_JAM]: 0,
        [UpgradeType.FIRE_STRENGTH]: 0,
        [UpgradeType.TIME_EXTENSION]: 0,
        [UpgradeType.WORK_TRAY_CAPACITY]: 0,
        [UpgradeType.FINISHED_TRAY_CAPACITY]: 0,
      },
      unlockedJams: [JamType.APPLE], // 기본으로 사과잼 해금
    };
  }

  private loadState(): ProgressState {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 기본값과 병합 (새로운 필드 대응)
        return { ...this.getDefaultState(), ...parsed };
      } catch {
        // 파싱 실패시 기본값
      }
    }
    return this.getDefaultState();
  }

  private saveState(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    // 클라우드 동기화 트리거
    this.triggerCloudSync();
  }

  // ========================================
  // 별 관련 메서드
  // ========================================

  /**
   * 별 계산: (벌어들인돈 - 목표금액) / 2500, 최대 3개
   */
  calculateStars(earnedMoney: number, day: number): number {
    const target = getDayTarget(day);
    const excess = earnedMoney - target;

    if (excess <= 0) {
      return 0;
    }

    const stars = Math.floor(excess / STAR_CONFIG.MONEY_PER_STAR);
    return Math.min(stars, STAR_CONFIG.MAX_STARS_PER_DAY);
  }

  /**
   * Day 완료 시 별 적립
   * 같은 날 재도전 시 기존 별보다 높아야만 추가 적립
   * @returns 이번에 새로 적립된 별 수
   */
  completeDayWithStars(day: number, earnedMoney: number): number {
    const newStars = this.calculateStars(earnedMoney, day);
    const previousStars = this.state.dayStars[day] || 0;

    if (newStars > previousStars) {
      // 추가로 적립할 별 = 새 별 - 기존 별
      const additionalStars = newStars - previousStars;
      this.state.totalStars += additionalStars;
      this.state.dayStars[day] = newStars;
      this.saveState();
      return newStars; // UI에는 총 획득 별 표시
    }

    return previousStars; // 기존 별 유지
  }

  /**
   * Day 성공 시 다음 날로 진행
   */
  advanceToNextDay(): void {
    this.state.currentDay += 1;
    this.saveState();
  }

  getTotalStars(): number {
    return this.state.totalStars;
  }

  getCurrentDay(): number {
    return this.state.currentDay;
  }

  getDayStars(day: number): number {
    return this.state.dayStars[day] || 0;
  }

  // ========================================
  // 업그레이드 관련 메서드
  // ========================================

  getUpgradeLevel(type: UpgradeType): number {
    return this.state.upgrades[type] || 0;
  }

  canPurchaseUpgrade(type: UpgradeType): boolean {
    const config = UPGRADE_CONFIGS[type];
    const currentLevel = this.getUpgradeLevel(type);

    // 이미 최대 레벨
    if (currentLevel >= config.maxLevel) {
      return false;
    }

    // 다음 레벨 비용 (costs 배열에서 현재 레벨 인덱스)
    const nextCost = config.costs[currentLevel];

    // 별이 부족
    if (this.state.totalStars < nextCost) {
      return false;
    }

    return true;
  }

  /**
   * 다음 레벨 업그레이드 비용 반환
   */
  getUpgradeCost(type: UpgradeType): number {
    const config = UPGRADE_CONFIGS[type];
    const currentLevel = this.getUpgradeLevel(type);

    if (currentLevel >= config.maxLevel) {
      return 0;
    }

    return config.costs[currentLevel];
  }

  /**
   * 업그레이드 구매
   * @returns 구매 성공 여부
   */
  purchaseUpgrade(type: UpgradeType): boolean {
    if (!this.canPurchaseUpgrade(type)) {
      return false;
    }

    const cost = this.getUpgradeCost(type);
    this.state.totalStars -= cost;
    this.state.upgrades[type] += 1;

    // 잼 해금 처리
    if (type === UpgradeType.BERRY_JAM && !this.state.unlockedJams.includes(JamType.BERRY)) {
      this.state.unlockedJams.push(JamType.BERRY);
    }
    if (type === UpgradeType.PISTACHIO_JAM && !this.state.unlockedJams.includes(JamType.PISTACHIO)) {
      this.state.unlockedJams.push(JamType.PISTACHIO);
    }

    this.saveState();
    return true;
  }

  // ========================================
  // 게임 효과 계산 메서드
  // ========================================

  /**
   * 현재 준비 트레이 용량
   */
  getWorkTrayCapacity(): number {
    const level = this.getUpgradeLevel(UpgradeType.WORK_TRAY_CAPACITY);
    return TRAY_CONFIG.WORK_BASE_CAPACITY + level * TRAY_CONFIG.CAPACITY_PER_UPGRADE;
  }

  /**
   * 현재 완성 트레이 용량
   */
  getFinishedTrayCapacity(): number {
    const level = this.getUpgradeLevel(UpgradeType.FINISHED_TRAY_CAPACITY);
    return TRAY_CONFIG.FINISHED_BASE_CAPACITY + level * TRAY_CONFIG.CAPACITY_PER_UPGRADE;
  }

  /**
   * 현재 하루 시간 (시간 연장 업그레이드 적용)
   */
  getDayTime(): number {
    const level = this.getUpgradeLevel(UpgradeType.TIME_EXTENSION);
    return TIME_CONFIG.BASE_DAY_TIME + level * TIME_CONFIG.TIME_PER_UPGRADE;
  }

  /**
   * 굽기 속도 배율 (1.0 = 기본, 1.1 = 10% 빠름)
   */
  getCookingSpeedMultiplier(): number {
    const level = this.getUpgradeLevel(UpgradeType.FIRE_STRENGTH);
    return 1.0 + level * 0.1;
  }

  /**
   * 반죽 개선 가격 보너스 (레벨 * 50원)
   */
  getBatterPriceBonus(): number {
    const level = this.getUpgradeLevel(UpgradeType.BATTER);
    return level * 50;
  }

  /**
   * 해금된 잼 목록
   */
  getUnlockedJams(): JamType[] {
    return [...this.state.unlockedJams];
  }

  /**
   * 잼이 해금되었는지 확인
   */
  isJamUnlocked(jamType: JamType): boolean {
    return this.state.unlockedJams.includes(jamType);
  }

  // ========================================
  // 디버그/리셋 메서드
  // ========================================

  /**
   * 진행상황 초기화 (디버그용)
   */
  resetProgress(): void {
    this.state = this.getDefaultState();
    this.saveState();
  }

  /**
   * 별 추가 (디버그용)
   */
  addStars(amount: number): void {
    this.state.totalStars += amount;
    this.saveState();
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
   * 클라우드 동기화 트리거
   */
  private triggerCloudSync(): void {
    if (this.cloudSyncCallback) {
      this.cloudSyncCallback();
    }
  }

  /**
   * 현재 상태 반환 (클라우드 저장용)
   */
  getState(): ProgressState {
    return { ...this.state };
  }

  /**
   * 외부 데이터로 상태 덮어쓰기 (클라우드 불러오기용)
   * @returns 변경 여부
   */
  loadFromExternalData(data: ProgressState): boolean {
    // 기존 상태와 비교하여 변경 여부 확인
    const hasChanged =
      data.totalStars !== this.state.totalStars ||
      data.currentDay !== this.state.currentDay;

    this.state = {
      ...this.getDefaultState(),
      ...data,
    };
    this.saveState();

    return hasChanged;
  }
}
