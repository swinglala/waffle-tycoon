import {
  ProgressState,
  UpgradeType,
  JamType,
  UPGRADE_CONFIGS,
  TRAY_CONFIG,
  TIME_CONFIG,
  STAR_CONFIG,
  KINDNESS_CONFIG,
  TIP_CONFIG,
  KEEP_WARM_CONFIG,
  BURN_PROTECTION_CONFIG,
  COMBO_UPGRADE_CONFIG,
  LUCKY_CONFIG,
  STRONG_FIRE_CONFIG,
  COMBO_CONFIG,
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
      dayMoney: {},
      upgrades: {
        // 🧈 기본 업그레이드
        [UpgradeType.BATTER]: 0,
        [UpgradeType.FIRE_STRENGTH]: 0,
        [UpgradeType.TIME_EXTENSION]: 0,
        [UpgradeType.WORK_TRAY_CAPACITY]: 0,
        [UpgradeType.FINISHED_TRAY_CAPACITY]: 0,
        // 🐾 손님 업그레이드
        [UpgradeType.KINDNESS]: 0,
        [UpgradeType.TIP_BONUS]: 0,
        // 🔥 굽기 업그레이드
        [UpgradeType.KEEP_WARM]: 0,
        [UpgradeType.BURN_PROTECTION]: 0,
        // 💰 판매 업그레이드
        [UpgradeType.COMBO_MASTER]: 0,
        [UpgradeType.COMBO_BONUS]: 0,
        [UpgradeType.LUCKY_WAFFLE]: 0,
        // 🔥 강불 업그레이드
        [UpgradeType.STRONG_FIRE_DURATION]: 0,
        [UpgradeType.STRONG_FIRE_POWER]: 0,
      },
      unlockedJams: [JamType.APPLE, JamType.BERRY, JamType.PISTACHIO], // 모든 잼 기본 해금
    };
  }

  private loadState(): ProgressState {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const defaultState = this.getDefaultState();
        // 기본값과 병합 (새로운 필드 대응) - 중첩 객체도 병합
        return {
          ...defaultState,
          ...parsed,
          upgrades: {
            ...defaultState.upgrades,
            ...(parsed.upgrades || {}),
          },
        };
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
   * 별 계산:
   * - 목표금액 미달 → 0별
   * - 목표금액 ~ +2400원 → 1별
   * - 목표금액 +2500원 ~ +4900원 → 2별
   * - 목표금액 +5000원 이상 → 3별
   */
  calculateStars(earnedMoney: number, day: number): number {
    const target = getDayTarget(day);
    const excess = earnedMoney - target;

    if (excess < 0) {
      return 0;
    } else if (excess <= STAR_CONFIG.ONE_STAR_MAX) {
      // 목표금액 ~ +2400원
      return 1;
    } else if (excess <= STAR_CONFIG.TWO_STAR_MAX) {
      // +2500원 ~ +4900원
      return 2;
    } else {
      // +5000원 이상
      return 3;
    }
  }

  /**
   * Day 완료 시 별 적립 및 금액 저장
   * 같은 날 재도전 시 기존 별보다 높아야만 추가 적립
   * 금액은 최고 기록만 저장
   * @returns 이번에 새로 적립된 별 수
   */
  completeDayWithStars(day: number, earnedMoney: number): number {
    const newStars = this.calculateStars(earnedMoney, day);
    const previousStars = this.state.dayStars[day] || 0;
    const previousMoney = this.state.dayMoney[day] || 0;

    // 금액은 최고 기록만 저장
    if (earnedMoney > previousMoney) {
      this.state.dayMoney[day] = earnedMoney;
    }

    if (newStars > previousStars) {
      // 추가로 적립할 별 = 새 별 - 기존 별
      const additionalStars = newStars - previousStars;
      this.state.totalStars += additionalStars;
      this.state.dayStars[day] = newStars;
      this.saveState();
      return newStars; // UI에는 총 획득 별 표시
    }

    this.saveState();
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

  getDayMoney(day: number): number {
    return this.state.dayMoney[day] || 0;
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
  // 🐾 손님 업그레이드 효과
  // ========================================

  /**
   * 친절 서비스 - 손님 대기시간 보너스 (초)
   */
  getKindnessBonus(): number {
    const level = this.getUpgradeLevel(UpgradeType.KINDNESS);
    return level * KINDNESS_CONFIG.WAIT_TIME_PER_LEVEL;
  }

  /**
   * 단골 보너스 - 팁 확률 (0.0 ~ 1.0)
   */
  getTipChance(): number {
    const level = this.getUpgradeLevel(UpgradeType.TIP_BONUS);
    return TIP_CONFIG.BASE_CHANCE + level * TIP_CONFIG.CHANCE_PER_LEVEL;
  }

  /**
   * 팁 금액
   */
  getTipAmount(): number {
    return TIP_CONFIG.TIP_AMOUNT;
  }

  // ========================================
  // 🔥 굽기 업그레이드 효과
  // ========================================

  /**
   * 보온 기능 - 퍼펙트 유지시간 보너스 (초)
   */
  getKeepWarmBonus(): number {
    const level = this.getUpgradeLevel(UpgradeType.KEEP_WARM);
    return level * KEEP_WARM_CONFIG.TIME_PER_LEVEL;
  }

  /**
   * 탄 방지 - BURNT까지 시간 보너스 (초)
   */
  getBurnProtectionBonus(): number {
    const level = this.getUpgradeLevel(UpgradeType.BURN_PROTECTION);
    return level * BURN_PROTECTION_CONFIG.TIME_PER_LEVEL;
  }

  // ========================================
  // 💰 판매 업그레이드 효과
  // ========================================

  /**
   * 콤보 마스터 - 콤보 유지시간 (초)
   */
  getComboThreshold(): number {
    const level = this.getUpgradeLevel(UpgradeType.COMBO_MASTER);
    return COMBO_CONFIG.COMBO_THRESHOLD + level * COMBO_UPGRADE_CONFIG.TIME_PER_LEVEL;
  }

  /**
   * 콤보 보너스 - 콤보당 보너스 금액 (원)
   */
  getComboBonusPerCombo(): number {
    const level = this.getUpgradeLevel(UpgradeType.COMBO_BONUS);
    return COMBO_CONFIG.BONUS_PER_COMBO + level * COMBO_UPGRADE_CONFIG.BONUS_PER_LEVEL;
  }

  /**
   * 럭키 와플 - 럭키 발동 확률 (0.0 ~ 1.0)
   */
  getLuckyChance(): number {
    const level = this.getUpgradeLevel(UpgradeType.LUCKY_WAFFLE);
    if (level === 0) return 0; // 업그레이드 안 하면 0%
    return LUCKY_CONFIG.BASE_CHANCE + (level - 1) * LUCKY_CONFIG.CHANCE_PER_LEVEL;
  }

  /**
   * 럭키 발동 여부 체크
   */
  rollLucky(): boolean {
    return Math.random() < this.getLuckyChance();
  }

  // ========================================
  // 🔥 강불 업그레이드 효과
  // ========================================

  /**
   * 강불 지속시간 (초)
   */
  getStrongFireDuration(): number {
    const level = this.getUpgradeLevel(UpgradeType.STRONG_FIRE_DURATION);
    return STRONG_FIRE_CONFIG.BASE_DURATION + level * STRONG_FIRE_CONFIG.DURATION_PER_LEVEL;
  }

  /**
   * 강불 배율
   */
  getStrongFireMultiplier(): number {
    const level = this.getUpgradeLevel(UpgradeType.STRONG_FIRE_POWER);
    return STRONG_FIRE_CONFIG.BASE_MULTIPLIER + level * STRONG_FIRE_CONFIG.MULTIPLIER_PER_LEVEL;
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

    const defaultState = this.getDefaultState();
    this.state = {
      ...defaultState,
      ...data,
      // 중첩 객체 병합 (새로운 업그레이드 키 보존)
      upgrades: {
        ...defaultState.upgrades,
        ...(data.upgrades || {}),
      },
    };
    this.saveState();

    return hasChanged;
  }
}
