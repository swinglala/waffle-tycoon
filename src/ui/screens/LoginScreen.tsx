import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { AuthManager } from "../../utils/AuthManager";
import { ScreenManager } from "../ScreenManager";
import "../styles.css";

export default function LoginScreen() {
  const screenManager = ScreenManager.getInstance();
  const authManager = AuthManager.getInstance();

  const [showLoading, setShowLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = authManager.onAuthStateChange((user) => {
      if (user) {
        localStorage.setItem("waffle_hasLoggedIn", "true");
        localStorage.removeItem("waffle_isGuest");
        screenManager.showScreen("home");
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
    const handler = await Browser.addListener("browserFinished", () => {
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
      console.error("Google 로그인 실패:", error.message);
      setShowLoading(false);
      setErrorMessage("로그인에 실패했습니다.");
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
      console.error("Kakao 로그인 실패:", error.message);
      setShowLoading(false);
      setErrorMessage("로그인에 실패했습니다.");
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
      console.error("Apple 로그인 실패:", error.message);
      setShowLoading(false);
      setErrorMessage("로그인에 실패했습니다.");
      return;
    }

    if (!authManager.isLoggedIn()) {
      setShowLoading(false);
    }
  }, [authManager]);

  const handleGuestLogin = useCallback(() => {
    localStorage.setItem("waffle_hasLoggedIn", "true");
    localStorage.setItem("waffle_isGuest", "true");
    screenManager.showScreen("home");
  }, [screenManager]);

  return (
    <div
      className="screen screen-login"
      style={{
        backgroundColor: "#FFF8E7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 로고 */}
      <img
        src="assets/images/logo.png"
        style={{
          width: "60%",
          maxWidth: 300,
          marginBottom: 40,
          marginTop: "-10%",
        }}
        alt="Waffle Tycoon"
      />

      {/* 버튼 영역 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Kakao Login */}
        <button
          onClick={handleKakaoLogin}
          style={{
            display: "flex",
            height: "clamp(48px, 13cqw, 64px)",
            width: "clamp(275px, 70cqw, 400px)",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            borderRadius: 12,
            backgroundColor: "#FEE500",
            border: "none",
            fontSize: "clamp(16px, 4.5cqw, 20px)",
            fontWeight: 500,
            fontFamily: "Pretendard, sans-serif",
            color: "#191919",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path
              fill="#191919"
              d="M24 4C12.402 4 3 11.469 3 20.595c0 5.89 3.872 11.06 9.687 13.973l-2.47 9.107a.75.75 0 0 0 1.14.808l10.59-7.02c.68.047 1.364.072 2.053.072 11.598 0 21-7.469 21-16.94C45 11.469 35.598 4 24 4z"
            />
          </svg>
          카카오로 로그인
        </button>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          style={{
            display: "flex",
            height: "clamp(48px, 13cqw, 64px)",
            width: "clamp(275px, 70cqw, 400px)",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            borderRadius: 12,
            backgroundColor: "#fff",
            border: "1px solid #E5E7EB",
            fontSize: "clamp(16px, 4.5cqw, 20px)",
            fontWeight: 500,
            fontFamily: "Pretendard, sans-serif",
            color: "#1F2024",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Google로 로그인
        </button>

        {/* Apple Login (iOS 네이티브에서만) */}
        {Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios" && (
          <button
            onClick={handleAppleLogin}
            style={{
              display: "flex",
              height: "clamp(48px, 13cqw, 64px)",
              width: "clamp(275px, 70cqw, 400px)",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              borderRadius: 12,
              backgroundColor: "#000",
              border: "none",
              fontSize: "clamp(16px, 4.5cqw, 20px)",
              fontWeight: 500,
              fontFamily: "Pretendard, sans-serif",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 12 12" fill="none">
              <path
                d="M9.408 6.432c-.012-1.2.984-1.776 1.032-1.812-.564-.828-1.44-.936-1.752-.948-.744-.072-1.452.444-1.836.444-.384 0-.972-.432-1.596-.42-.828.012-1.584.48-2.016 1.224-.852 1.5-.216 3.72.612 4.932.408.6.888 1.26 1.524 1.236.612-.024.84-.384 1.584-.384s.96.384 1.596.372c.66-.012 1.08-.6 1.488-1.2.468-.684.66-1.356.672-1.392-.012-.012-1.296-.492-1.308-1.956z"
                fill="#fff"
              />
              <path
                d="M7.848 1.2C8.184.792 8.412.228 8.352-.336 7.872-.312 7.284-.012 6.936.384 6.624.744 6.348 1.32 6.42 1.872 6.948 1.92 7.5 1.608 7.848 1.2z"
                fill="#fff"
              />
            </svg>
            Apple로 로그인
          </button>
        )}

        {/* Guest Login */}
        <button
          onClick={handleGuestLogin}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "clamp(275px, 70cqw, 400px)",
            height: "clamp(48px, 13cqw, 64px)",
            backgroundColor: "#E0E0E0",
            border: "1px solid #bbb",
            borderRadius: 12,
            cursor: "pointer",
            fontFamily: "Pretendard, sans-serif",
            fontSize: "clamp(16px, 4.5cqw, 20px)",
            fontWeight: 500,
            color: "#000",
            gap: 8,
          }}
        >
          <img
            src="assets/images/profile.png"
            style={{ width: 40, height: 40 }}
            alt="Guest"
          />
          게스트로 로그인
        </button>
      </div>

      {/* 하단 안내 텍스트 */}
      <p
        style={{
          fontFamily: "var(--font-primary)",
          fontSize: "clamp(14px, 4.5cqw, 18px)",
          color: "#9CA3AF",
          marginTop: 28,
        }}
      >
        게스트는 기기에만 데이터가 저장됩니다
      </p>

      {/* 로딩 오버레이 */}
      {showLoading && (
        <div className="loading-overlay">
          <span className="loading-text">로그인 중...</span>
        </div>
      )}

      {/* 에러 토스트 */}
      {errorMessage && <div className="toast">{errorMessage}</div>}
    </div>
  );
}
