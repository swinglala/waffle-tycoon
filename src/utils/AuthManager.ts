import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase, isSupabaseConnected } from '../config/supabase';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';

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

    // Capacitor: 딥링크로 돌아올 때 OAuth 토큰 처리
    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', async ({ url }) => {
        if (url.startsWith('waffletycoon://')) {
          // 인앱 브라우저 닫기
          try {
            await Browser.close();
          } catch (_) {
            // 이미 닫혀있을 수 있음
          }

          const hashPart = url.split('#')[1];
          if (hashPart) {
            const params = new URLSearchParams(hashPart);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            if (accessToken && refreshToken) {
              await supabase!.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            }
          }
        }
      });
    }
  }

  /**
   * Google OAuth 로그인
   */
  async signInWithGoogle(): Promise<{ error: Error | null }> {
    if (!isSupabaseConnected() || !supabase) {
      return { error: new Error('Supabase가 설정되지 않았습니다.') };
    }

    try {
      const isNative = Capacitor.isNativePlatform();
      const redirectUrl = isNative
        ? 'waffletycoon://auth-callback'
        : window.location.href.split('?')[0].split('#')[0];

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isNative,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (error) {
        console.error('[AuthManager] Google 로그인 실패:', error.message);
        return { error };
      }

      // 네이티브: SFSafariViewController(인앱 브라우저)로 열기
      if (isNative && data?.url) {
        await Browser.open({ url: data.url });
      }

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('알 수 없는 오류');
      console.error('[AuthManager] Google 로그인 예외:', error.message);
      return { error };
    }
  }

  /**
   * Kakao OAuth 로그인
   */
  async signInWithKakao(): Promise<{ error: Error | null }> {
    if (!isSupabaseConnected() || !supabase) {
      return { error: new Error('Supabase가 설정되지 않았습니다.') };
    }

    try {
      const isNative = Capacitor.isNativePlatform();
      const redirectUrl = isNative
        ? 'waffletycoon://auth-callback'
        : window.location.href.split('?')[0].split('#')[0];

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isNative,
          queryParams: { prompt: 'login' },
        },
      });

      if (error) {
        console.error('[AuthManager] Kakao 로그인 실패:', error.message);
        return { error };
      }

      // 네이티브: SFSafariViewController(인앱 브라우저)로 열기
      if (isNative && data?.url) {
        await Browser.open({ url: data.url });
      }

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('알 수 없는 오류');
      console.error('[AuthManager] Kakao 로그인 예외:', error.message);
      return { error };
    }
  }

  /**
   * Apple Sign In (iOS 네이티브)
   */
  async signInWithApple(): Promise<{ error: Error | null }> {
    if (!isSupabaseConnected() || !supabase) {
      return { error: new Error('Supabase가 설정되지 않았습니다.') };
    }

    try {
      // nonce 생성
      const rawNonce = this.generateNonce();
      const hashedNonce = await this.sha256(rawNonce);

      // iOS 네이티브 Apple Sign In 다이얼로그
      const result = await SignInWithApple.authorize({
        clientId: 'com.waffletycoon.app',
        redirectURI: 'https://udegsopkidgluonvywad.supabase.co/auth/v1/callback',
        scopes: 'email name',
        nonce: hashedNonce,
      });

      const idToken = result.response.identityToken;
      if (!idToken) {
        return { error: new Error('Apple에서 ID Token을 받지 못했습니다.') };
      }

      // Supabase에 ID Token으로 로그인
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
        nonce: rawNonce,
      });

      if (error) {
        console.error('[AuthManager] Apple 로그인 실패:', error.message);
        return { error };
      }

      // Apple은 첫 로그인에만 이름 제공 → user_metadata에 저장
      const givenName = result.response.givenName;
      const familyName = result.response.familyName;
      if (data.user && (givenName || familyName)) {
        const fullName = [familyName, givenName].filter(Boolean).join('');
        await supabase.auth.updateUser({
          data: { full_name: fullName },
        });
      }

      return { error: null };
    } catch (err: unknown) {
      // 사용자가 취소한 경우 무시
      if (err && typeof err === 'object' && 'message' in err) {
        const msg = (err as { message: string }).message;
        if (msg.includes('cancel') || msg.includes('1001')) {
          return { error: null };
        }
      }
      const error = err instanceof Error ? err : new Error('알 수 없는 오류');
      console.error('[AuthManager] Apple 로그인 예외:', error.message);
      return { error };
    }
  }

  private generateNonce(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const values = crypto.getRandomValues(new Uint8Array(length));
    for (let i = 0; i < length; i++) {
      result += chars[values[i] % chars.length];
    }
    return result;
  }

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
   * 계정 삭제 (데이터 + 인증 계정)
   */
  async deleteAccount(): Promise<{ error: Error | null }> {
    if (!isSupabaseConnected() || !supabase) {
      return { error: new Error('Supabase가 설정되지 않았습니다.') };
    }

    if (!this.currentUser) {
      return { error: new Error('로그인되어 있지 않습니다.') };
    }

    try {
      // DB 함수를 호출하여 게임 데이터 + 인증 계정 삭제
      const { error } = await supabase.rpc('delete_user_account');

      if (error) {
        console.error('[AuthManager] 계정 삭제 실패:', error.message);
        return { error };
      }

      // Supabase 세션 정리 (캐시된 토큰 제거)
      await supabase.auth.signOut({ scope: 'local' });

      // 로컬 데이터 전체 삭제
      localStorage.removeItem('waffleTycoon_hearts');
      localStorage.removeItem('waffleTycoon_progress');
      localStorage.removeItem('waffleTycoon_sound');
      localStorage.removeItem('waffle_hasLoggedIn');
      localStorage.removeItem('waffle_isGuest');

      this.currentUser = null;
      this.notifyListeners();

      console.log('[AuthManager] 계정 삭제 완료');
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('알 수 없는 오류');
      console.error('[AuthManager] 계정 삭제 예외:', error.message);
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
