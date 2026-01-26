import { supabase, isSupabaseConnected } from '../config/supabase';
import { AuthManager } from './AuthManager';
import { ProgressState, JamType, UpgradeType } from '../types/game';

// 클라우드 저장 데이터 인터페이스
export interface CloudSaveData {
  // 진행상황
  total_stars: number;
  current_day: number;
  day_stars: Record<number, number>;
  day_money: Record<number, number>;
  upgrades: Record<UpgradeType, number>;
  unlocked_jams: JamType[];
  // 하트 상태
  hearts: number;
  last_recharge_time: number;
}

// 로컬 저장 데이터 인터페이스 (기존 형식)
export interface LocalSaveData {
  progress: ProgressState;
  hearts: {
    hearts: number;
    lastRechargeTime: number;
  };
}

export class CloudSaveManager {
  private static instance: CloudSaveManager;
  private authManager: AuthManager;
  private isSyncing = false;

  private constructor() {
    this.authManager = AuthManager.getInstance();
  }

  static getInstance(): CloudSaveManager {
    if (!CloudSaveManager.instance) {
      CloudSaveManager.instance = new CloudSaveManager();
    }
    return CloudSaveManager.instance;
  }

  /**
   * 클라우드에 데이터 저장
   */
  async saveToCloud(data: LocalSaveData): Promise<{ error: Error | null }> {
    if (!isSupabaseConnected() || !supabase) {
      return { error: new Error('Supabase가 설정되지 않았습니다.') };
    }

    const user = this.authManager.getUser();
    if (!user) {
      return { error: new Error('로그인이 필요합니다.') };
    }

    try {
      const cloudData: CloudSaveData = {
        total_stars: data.progress.totalStars,
        current_day: data.progress.currentDay,
        day_stars: data.progress.dayStars,
        day_money: data.progress.dayMoney,
        upgrades: data.progress.upgrades,
        unlocked_jams: data.progress.unlockedJams,
        hearts: data.hearts.hearts,
        last_recharge_time: data.hearts.lastRechargeTime,
      };

      const { error } = await supabase
        .from('game_progress')
        .upsert(
          {
            user_id: user.id,
            ...cloudData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('[CloudSave] 저장 실패:', error.message);
        return { error };
      }

      console.log('[CloudSave] 클라우드 저장 완료');
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('저장 중 오류 발생');
      console.error('[CloudSave] 저장 예외:', error.message);
      return { error };
    }
  }

  /**
   * 클라우드에서 데이터 불러오기
   */
  async loadFromCloud(): Promise<{ data: LocalSaveData | null; error: Error | null }> {
    if (!isSupabaseConnected() || !supabase) {
      return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
    }

    const user = this.authManager.getUser();
    if (!user) {
      return { data: null, error: new Error('로그인이 필요합니다.') };
    }

    try {
      const { data: cloudData, error } = await supabase
        .from('game_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // 데이터가 없는 경우 (신규 유저)
        if (error.code === 'PGRST116') {
          console.log('[CloudSave] 클라우드 데이터 없음 (신규 유저)');
          return { data: null, error: null };
        }
        console.error('[CloudSave] 불러오기 실패:', error.message);
        return { data: null, error };
      }

      if (!cloudData) {
        return { data: null, error: null };
      }

      // 클라우드 데이터를 로컬 형식으로 변환
      const localData: LocalSaveData = {
        progress: {
          totalStars: cloudData.total_stars || 0,
          currentDay: cloudData.current_day || 1,
          dayStars: cloudData.day_stars || {},
          dayMoney: cloudData.day_money || {},
          upgrades: cloudData.upgrades || {},
          unlockedJams: cloudData.unlocked_jams || [JamType.APPLE],
        },
        hearts: {
          hearts: cloudData.hearts ?? 5,
          lastRechargeTime: cloudData.last_recharge_time || Date.now(),
        },
      };

      console.log('[CloudSave] 클라우드 데이터 불러오기 완료');
      return { data: localData, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('불러오기 중 오류 발생');
      console.error('[CloudSave] 불러오기 예외:', error.message);
      return { data: null, error };
    }
  }

  /**
   * 로컬과 클라우드 데이터 동기화
   * 더 높은 별/일차 기준으로 병합
   */
  async syncWithLocal(localData: LocalSaveData): Promise<{
    mergedData: LocalSaveData;
    source: 'local' | 'cloud' | 'merged';
    error: Error | null;
  }> {
    if (this.isSyncing) {
      return { mergedData: localData, source: 'local', error: null };
    }

    this.isSyncing = true;

    try {
      const { data: cloudData, error } = await this.loadFromCloud();

      if (error || !cloudData) {
        // 클라우드 데이터가 없으면 로컬 데이터를 클라우드에 업로드
        if (!error) {
          await this.saveToCloud(localData);
        }
        return { mergedData: localData, source: 'local', error };
      }

      // 병합 로직: 더 진행된 데이터 기준
      const mergedData = this.mergeData(localData, cloudData);
      const source = this.determineSource(localData, cloudData, mergedData);

      // 병합된 데이터를 클라우드에 저장
      if (source === 'merged' || source === 'local') {
        await this.saveToCloud(mergedData);
      }

      console.log(`[CloudSave] 동기화 완료 (소스: ${source})`);
      return { mergedData, source, error: null };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 두 데이터를 병합 (각 필드별 최대값 기준)
   */
  private mergeData(local: LocalSaveData, cloud: LocalSaveData): LocalSaveData {
    // 업그레이드는 각 항목별 최대값 사용
    const mergedUpgrades: Record<string, number> = {};
    const allUpgradeKeys = new Set([
      ...Object.keys(local.progress.upgrades || {}),
      ...Object.keys(cloud.progress.upgrades || {}),
    ]);
    allUpgradeKeys.forEach((key) => {
      const localVal = (local.progress.upgrades as Record<string, number>)?.[key] || 0;
      const cloudVal = (cloud.progress.upgrades as Record<string, number>)?.[key] || 0;
      mergedUpgrades[key] = Math.max(localVal, cloudVal);
    });

    // dayStars도 각 일차별 최대값 사용
    const mergedDayStars: Record<number, number> = {};
    const allDayKeys = new Set([
      ...Object.keys(local.progress.dayStars || {}).map(Number),
      ...Object.keys(cloud.progress.dayStars || {}).map(Number),
    ]);
    allDayKeys.forEach((day) => {
      const localVal = local.progress.dayStars?.[day] || 0;
      const cloudVal = cloud.progress.dayStars?.[day] || 0;
      mergedDayStars[day] = Math.max(localVal, cloudVal);
    });

    // dayMoney도 각 일차별 최대값 사용
    const mergedDayMoney: Record<number, number> = {};
    const allMoneyKeys = new Set([
      ...Object.keys(local.progress.dayMoney || {}).map(Number),
      ...Object.keys(cloud.progress.dayMoney || {}).map(Number),
    ]);
    allMoneyKeys.forEach((day) => {
      const localVal = local.progress.dayMoney?.[day] || 0;
      const cloudVal = cloud.progress.dayMoney?.[day] || 0;
      mergedDayMoney[day] = Math.max(localVal, cloudVal);
    });

    // unlockedJams는 합집합
    const mergedJams = [...new Set([
      ...(local.progress.unlockedJams || []),
      ...(cloud.progress.unlockedJams || []),
    ])];

    // 하트는 더 많은 쪽
    const mergedHearts = Math.max(
      local.hearts?.hearts || 0,
      cloud.hearts?.hearts || 0
    );

    return {
      progress: {
        totalStars: Math.max(local.progress.totalStars, cloud.progress.totalStars),
        currentDay: Math.max(local.progress.currentDay, cloud.progress.currentDay),
        dayStars: mergedDayStars,
        dayMoney: mergedDayMoney,
        upgrades: mergedUpgrades as typeof local.progress.upgrades,
        unlockedJams: mergedJams,
      },
      hearts: {
        hearts: mergedHearts,
        lastRechargeTime: Math.max(
          local.hearts?.lastRechargeTime || 0,
          cloud.hearts?.lastRechargeTime || 0
        ),
      },
    };
  }

  /**
   * 데이터 소스 판별
   */
  private determineSource(
    local: LocalSaveData,
    cloud: LocalSaveData,
    merged: LocalSaveData
  ): 'local' | 'cloud' | 'merged' {
    const isLocalSame =
      local.progress.totalStars === merged.progress.totalStars &&
      local.progress.currentDay === merged.progress.currentDay;
    const isCloudSame =
      cloud.progress.totalStars === merged.progress.totalStars &&
      cloud.progress.currentDay === merged.progress.currentDay;

    if (isLocalSame && !isCloudSame) return 'local';
    if (isCloudSame && !isLocalSame) return 'cloud';
    return 'merged';
  }

  /**
   * 로그인 여부에 따라 클라우드 저장 가능 여부 반환
   */
  canSaveToCloud(): boolean {
    return isSupabaseConnected() && this.authManager.isLoggedIn();
  }
}
