import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { AuthManager } from '../../utils/AuthManager';
import { ScreenManager } from '../ScreenManager';
import '../styles.css';

export default function LoginScreen() {
  const screenManager = ScreenManager.getInstance();
  const authManager = AuthManager.getInstance();

  const [showLoading, setShowLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = authManager.onAuthStateChange((user) => {
      if (user) {
        localStorage.setItem('waffle_hasLoggedIn', 'true');
        localStorage.removeItem('waffle_isGuest');
        screenManager.showScreen('home');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [authManager, screenManager]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const listenBrowserFinished = useCallback(async () => {
    const handler = await Browser.addListener('browserFinished', () => {
      setTimeout(() => {
        if (!authManager.isLoggedIn()) {
          setShowLoading(false);
        }
        handler.remove();
      }, 500);
    });
  }, [authManager]);

  const handleGoogleLogin = useCallback(async () => {
    setShowLoading(true);
    const { error } = await authManager.signInWithGoogle();

    if (error) {
      console.error('Google 로그인 실패:', error.message);
      setShowLoading(false);
      setErrorMessage('로그인에 실패했습니다.');
      return;
    }

    if (Capacitor.isNativePlatform()) {
      listenBrowserFinished();
    }
  }, [authManager, listenBrowserFinished]);

  const handleKakaoLogin = useCallback(async () => {
    setShowLoading(true);
    const { error } = await authManager.signInWithKakao();

    if (error) {
      console.error('Kakao 로그인 실패:', error.message);
      setShowLoading(false);
      setErrorMessage('로그인에 실패했습니다.');
      return;
    }

    if (Capacitor.isNativePlatform()) {
      listenBrowserFinished();
    }
  }, [authManager, listenBrowserFinished]);

  const handleAppleLogin = useCallback(async () => {
    setShowLoading(true);
    const { error } = await authManager.signInWithApple();

    if (error) {
      console.error('Apple 로그인 실패:', error.message);
      setShowLoading(false);
      setErrorMessage('로그인에 실패했습니다.');
      return;
    }

    if (!authManager.isLoggedIn()) {
      setShowLoading(false);
    }
  }, [authManager]);

  const handleGuestLogin = useCallback(() => {
    localStorage.setItem('waffle_hasLoggedIn', 'true');
    localStorage.setItem('waffle_isGuest', 'true');
    screenManager.showScreen('home');
  }, [screenManager]);

  return (
    <div className="screen screen-login" style={{ backgroundColor: '#FFF8E7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* 로고 */}
      <img
        src="assets/images/logo.png"
        style={{ width: '60%', maxWidth: 300, marginBottom: 40, marginTop: '-10%' }}
        alt="Waffle Tycoon"
      />

      {/* 버튼 영역 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Kakao Login */}
        <button className="btn-image" onClick={handleKakaoLogin}>
          <img src="assets/images/kakao_login_medium_narrow.png" alt="Kakao Login" />
        </button>

        {/* Google Login */}
        <button className="btn-image" onClick={handleGoogleLogin}>
          <img src="assets/images/web_light_sq_ctn@1x.png" alt="Google Login" />
        </button>

        {/* Apple Login (iOS 네이티브에서만) */}
        {Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && (
          <button className="btn-image" onClick={handleAppleLogin}>
            <img src="assets/images/apple_login.png" alt="Apple Login" />
          </button>
        )}

        {/* Guest Login */}
        <button
          onClick={handleGuestLogin}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 275,
            height: 68,
            backgroundColor: '#E0E0E0',
            border: '1px solid black',
            borderRadius: 4,
            cursor: 'pointer',
            gap: 8,
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 'clamp(18px, 6cqw, 24px)',
            color: '#000',
          }}
        >
          <img
            src="assets/images/profile.png"
            style={{ width: 40, height: 40 }}
            alt="Guest"
          />
          <span>게스트로 시작</span>
        </button>
      </div>

      {/* 하단 안내 텍스트 */}
      <p style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(14px, 4.5cqw, 18px)', color: '#9CA3AF', marginTop: 28 }}>
        게스트는 기기에만 데이터가 저장됩니다
      </p>

      {/* 로딩 오버레이 */}
      {showLoading && (
        <div className="loading-overlay">
          <span className="loading-text">로그인 중...</span>
        </div>
      )}

      {/* 에러 토스트 */}
      {errorMessage && (
        <div className="toast">{errorMessage}</div>
      )}
    </div>
  );
}
