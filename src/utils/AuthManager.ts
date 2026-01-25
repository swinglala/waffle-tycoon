import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConnected } from '../config/supabase';

export type AuthStateChangeCallback = (user: User | null) => void;

export class AuthManager {
  private static instance: AuthManager;
  private currentUser: User | null = null;
  private listeners: AuthStateChangeCallback[] = [];

  private constructor() {
    this.initializeAuth();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private async initializeAuth(): Promise<void> {
    if (!isSupabaseConnected() || !supabase) {
      console.log('[AuthManager] Supabase 미연결 상태 - 인증 기능 비활성화');
      return;
    }

    // 현재 세션 확인
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      this.currentUser = session.user;
      this.notifyListeners();
    }

    // 인증 상태 변경 리스너 등록
    supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        this.currentUser = session?.user || null;
        this.notifyListeners();
        console.log('[AuthManager] 인증 상태 변경:', _event, this.currentUser?.email);
      }
    );
  }

  /**
   * Google OAuth 로그인
   */
  async signInWithGoogle(): Promise<{ error: Error | null }> {
    if (!isSupabaseConnected() || !supabase) {
      return { error: new Error('Supabase가 설정되지 않았습니다.') };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('[AuthManager] Google 로그인 실패:', error.message);
        return { error };
      }

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('알 수 없는 오류');
      console.error('[AuthManager] Google 로그인 예외:', error.message);
      return { error };
    }
  }

  /**
   * 로그아웃
   */
  async signOut(): Promise<{ error: Error | null }> {
    if (!isSupabaseConnected() || !supabase) {
      return { error: new Error('Supabase가 설정되지 않았습니다.') };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthManager] 로그아웃 실패:', error.message);
        return { error };
      }

      this.currentUser = null;
      this.notifyListeners();
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('알 수 없는 오류');
      console.error('[AuthManager] 로그아웃 예외:', error.message);
      return { error };
    }
  }

  /**
   * 현재 로그인된 사용자 반환
   */
  getUser(): User | null {
    return this.currentUser;
  }

  /**
   * 로그인 여부 확인
   */
  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  /**
   * 사용자 표시 이름 반환
   */
  getDisplayName(): string {
    if (!this.currentUser) {
      return 'Guest';
    }
    return (
      this.currentUser.user_metadata?.full_name ||
      this.currentUser.user_metadata?.name ||
      this.currentUser.email?.split('@')[0] ||
      'User'
    );
  }

  /**
   * 사용자 프로필 이미지 URL 반환
   */
  getAvatarUrl(): string | null {
    return this.currentUser?.user_metadata?.avatar_url || null;
  }

  /**
   * 인증 상태 변경 리스너 등록
   */
  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    this.listeners.push(callback);
    // 현재 상태로 즉시 콜백 호출
    callback(this.currentUser);

    // 리스너 해제 함수 반환
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.currentUser));
  }
}
