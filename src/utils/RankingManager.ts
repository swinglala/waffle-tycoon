import { supabase, isSupabaseConnected } from '../config/supabase';
import { AuthManager } from './AuthManager';

export interface RankingEntry {
  rank: number;
  displayName: string;
  value: number; // current_day or total_money
  isMe: boolean;
}

export interface RankingResult {
  topList: RankingEntry[];
  myRank: RankingEntry | null;
  error: Error | null;
}

export type RankingTab = 'day' | 'money';

export class RankingManager {
  private static instance: RankingManager;
  private authManager: AuthManager;

  private constructor() {
    this.authManager = AuthManager.getInstance();
  }

  static getInstance(): RankingManager {
    if (!RankingManager.instance) {
      RankingManager.instance = new RankingManager();
    }
    return RankingManager.instance;
  }

  /**
   * Fetch rankings based on tab (day or money)
   */
  async fetchRankings(tab: RankingTab): Promise<RankingResult> {
    if (!isSupabaseConnected() || !supabase) {
      return {
        topList: [],
        myRank: null,
        error: new Error('Supabase가 설정되지 않았습니다.'),
      };
    }

    try {
      const currentUser = this.authManager.getUser();
      const currentUserId = currentUser?.id;

      // Query top 10 based on tab
      const orderColumn = tab === 'day' ? 'current_day' : 'total_money';
      const { data, error } = await supabase
        .from('game_progress')
        .select('user_id, display_name, current_day, total_money')
        .order(orderColumn, { ascending: false })
        .limit(10);

      if (error) {
        console.error('[RankingManager] 랭킹 조회 실패:', error.message);
        return { topList: [], myRank: null, error };
      }

      if (!data || data.length === 0) {
        return { topList: [], myRank: null, error: null };
      }

      // Map to RankingEntry
      const topList: RankingEntry[] = data.map((entry, index) => ({
        rank: index + 1,
        displayName: entry.display_name || 'User',
        value: tab === 'day' ? entry.current_day : entry.total_money,
        isMe: currentUserId ? entry.user_id === currentUserId : false,
      }));

      // Check if current user is in top 10
      const myEntryInTop = topList.find((entry) => entry.isMe);

      let myRank: RankingEntry | null = null;

      if (currentUserId && !myEntryInTop) {
        // User not in top 10, fetch their rank
        const { data: userData, error: userError } = await supabase
          .from('game_progress')
          .select('user_id, display_name, current_day, total_money')
          .eq('user_id', currentUserId)
          .single();

        if (!userError && userData) {
          const userValue = tab === 'day' ? userData.current_day : userData.total_money;

          // Count how many users have higher value
          const { count, error: countError } = await supabase
            .from('game_progress')
            .select('*', { count: 'exact', head: true })
            .gt(orderColumn, userValue);

          if (!countError && count !== null) {
            myRank = {
              rank: count + 1,
              displayName: userData.display_name || 'User',
              value: userValue,
              isMe: true,
            };
          }
        }
      } else if (myEntryInTop) {
        // User is in top 10
        myRank = myEntryInTop;
      }

      return { topList, myRank, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('랭킹 조회 중 오류 발생');
      console.error('[RankingManager] 랭킹 조회 예외:', error.message);
      return { topList: [], myRank: null, error };
    }
  }
}
