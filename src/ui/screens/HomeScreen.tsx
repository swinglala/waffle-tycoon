import { useState, useEffect, useCallback, useRef } from "react";
import { ScreenManager } from "../ScreenManager";
import { HeartManager } from "../../utils/HeartManager";
import { ProgressManager } from "../../utils/ProgressManager";
import { AuthManager } from "../../utils/AuthManager";
import { CloudSaveManager, LocalSaveData } from "../../utils/CloudSaveManager";
import { SoundManager } from "../../utils/SoundManager";
import { HEART_CONFIG, TUTORIAL_CONFIG } from "../../types/game";
import RankingPopup from "../components/RankingPopup";

type PopupType =
  | "noHearts"
  | "heartPurchase"
  | "tutorial"
  | "placeholder"
  | "ranking"
  | "profile";

export default function HomeScreen() {
  const screenManager = ScreenManager.getInstance();
  const heartManager = HeartManager.getInstance();
  const progressManager = ProgressManager.getInstance();
  const authManager = AuthManager.getInstance();
  const cloudSaveManager = CloudSaveManager.getInstance();

  const [hearts, setHearts] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [currentDay, setCurrentDay] = useState(1);
  const [timerText, setTimerText] = useState("");
  const [userName, setUserName] = useState("");
  const [popupType, setPopupType] = useState<PopupType | null>(null);
  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [profileConfirm, setProfileConfirm] = useState<"logout" | "deleteAccount" | null>(null);
  const [showLoading, setShowLoading] = useState(false);

  const isSyncing = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update hearts and stars UI
  const updateHeartsUI = useCallback(() => {
    const currentHearts = heartManager.getHearts();
    const stars = progressManager.getTotalStars();
    setHearts(currentHearts);
    setTotalStars(stars);

    if (currentHearts < HEART_CONFIG.MAX_HEARTS) {
      const timeStr = heartManager.formatTimeToNextHeart();
      setTimerText(`다음 하트: ${timeStr}`);
    } else {
      setTimerText("하트 충전 완료!");
    }
  }, [heartManager, progressManager]);

  // Update user display name
  const updateUserUI = useCallback(() => {
    const displayName = authManager.getDisplayName();
    setUserName(displayName);
  }, [authManager]);

  // Cloud sync
  const syncWithCloud = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      const localData: LocalSaveData = {
        progress: progressManager.getState(),
        hearts: heartManager.getState(),
      };

      const { mergedData, source, error } =
        await cloudSaveManager.syncWithLocal(localData);

      if (error) {
        console.error("[HomeScreen] 클라우드 동기화 실패:", error.message);
        return;
      }

      if (source === "cloud" || source === "merged") {
        progressManager.loadFromExternalData(mergedData.progress);
        heartManager.loadFromExternalData(mergedData.hearts);
        setCurrentDay(mergedData.progress.currentDay);
        updateHeartsUI();
      }
    } finally {
      isSyncing.current = false;
    }
  }, [heartManager, progressManager, cloudSaveManager, updateHeartsUI]);

  // Debounced cloud sync callback
  const setupCloudSyncCallbacks = useCallback(() => {
    const debouncedSync = () => {
      if (!cloudSaveManager.canSaveToCloud()) return;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      syncTimeoutRef.current = setTimeout(async () => {
        const localData: LocalSaveData = {
          progress: progressManager.getState(),
          hearts: heartManager.getState(),
        };
        await cloudSaveManager.saveToCloud(localData);
      }, 2000);
    };

    progressManager.setCloudSyncCallback(debouncedSync);
    heartManager.setCloudSyncCallback(debouncedSync);

    return () => {
      progressManager.setCloudSyncCallback(null);
      heartManager.setCloudSyncCallback(null);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [heartManager, progressManager, cloudSaveManager]);

  // Check first-time tutorial
  const checkFirstTimeTutorial = useCallback(() => {
    const tutorialCompleted = localStorage.getItem(TUTORIAL_CONFIG.STORAGE_KEY);
    if (!tutorialCompleted) {
      setPopupType("tutorial");
    }
  }, []);

  // Effects
  useEffect(() => {
    // Initialize
    setCurrentDay(progressManager.getCurrentDay());
    updateHeartsUI();
    updateUserUI();

    // Load nickname
    if (authManager.isLoggedIn()) {
      cloudSaveManager.getNickname().then(({ nickname: n }) => {
        if (n) setNickname(n);
      });
    }

    // BGM
    const soundManager = SoundManager.getInstance();
    soundManager.stopAll();
    soundManager.playBgm(undefined, "bgm_home", { volume: 0.5 });

    // Heart timer (1s interval)
    const heartInterval = setInterval(updateHeartsUI, 1000);

    // Auth state listener
    const authUnsubscribe = authManager.onAuthStateChange(async (user) => {
      updateUserUI();
      if (user) {
        // Load nickname on auth
        cloudSaveManager.getNickname().then(({ nickname: n }) => {
          if (n) setNickname(n);
        });
        if (!isSyncing.current) {
          await syncWithCloud();
        }
      }
    });

    // Cloud sync callbacks
    const cleanupSync = setupCloudSyncCallbacks();

    // Tutorial check
    checkFirstTimeTutorial();

    return () => {
      clearInterval(heartInterval);
      authUnsubscribe();
      cleanupSync();
    };
  }, [
    updateHeartsUI,
    updateUserUI,
    authManager,
    syncWithCloud,
    setupCloudSyncCallbacks,
    checkFirstTimeTutorial,
    progressManager,
  ]);

  // Handlers
  const handleStartClick = useCallback(() => {
    if (heartManager.hasHeart()) {
      screenManager.startPhaserScene("GameScene", { day: currentDay });
    } else {
      setPopupType("noHearts");
    }
  }, [heartManager, screenManager, currentDay]);

  const handlePlusClick = useCallback(() => {
    setPopupType("heartPurchase");
  }, []);

  const handleHeartPurchase = useCallback(() => {
    progressManager.useStars(1);
    heartManager.addHeart();
    updateHeartsUI();
  }, [progressManager, heartManager, updateHeartsUI]);

  const handleTutorialStart = useCallback(() => {
    screenManager.startPhaserScene("TutorialScene");
  }, [screenManager]);

  const handleTutorialSkip = useCallback(() => {
    localStorage.setItem(TUTORIAL_CONFIG.STORAGE_KEY, "true");
    setPopupType(null);
  }, []);

  const closePopup = useCallback(() => {
    setPopupType(null);
  }, []);

  // Nickname handlers
  const handleProfileClick = useCallback(() => {
    if (!authManager.isLoggedIn()) return;
    // Load current nickname when opening
    cloudSaveManager.getNickname().then(({ nickname: n }) => {
      if (n) {
        setNickname(n);
        setNicknameInput(n);
      } else {
        setNickname("");
        setNicknameInput("");
      }
    });
    setPopupType("profile");
  }, [authManager, cloudSaveManager]);

  const handleNicknameSave = useCallback(async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed || trimmed === nickname) return;
    if (trimmed.length > 10) {
      setNicknameError("닉네임은 10자 이내로 입력해주세요.");
      setTimeout(() => setNicknameError(null), 2000);
      return;
    }
    setNicknameSaving(true);
    const { error } = await cloudSaveManager.saveNickname(trimmed);
    setNicknameSaving(false);
    if (error) {
      setNicknameError("닉네임 저장에 실패했습니다.");
      setTimeout(() => setNicknameError(null), 2000);
      return;
    }
    setNickname(trimmed);
  }, [nicknameInput, nickname, cloudSaveManager]);

  const handleLogout = useCallback(async () => {
    setProfileConfirm(null);
    setPopupType(null);
    await authManager.signOut();
    progressManager.resetProgress();
    heartManager.resetHearts();
    localStorage.removeItem("waffle_hasLoggedIn");
    localStorage.removeItem("waffle_isGuest");
    screenManager.showScreen("login");
  }, [authManager, screenManager, progressManager, heartManager]);

  const handleDeleteAccount = useCallback(async () => {
    setProfileConfirm(null);
    setPopupType(null);
    setShowLoading(true);
    const { error } = await authManager.deleteAccount();
    setShowLoading(false);
    if (error) {
      setNicknameError("계정 삭제에 실패했습니다.");
      setTimeout(() => setNicknameError(null), 2000);
      return;
    }
    progressManager.resetProgress();
    heartManager.resetHearts();
    screenManager.showScreen("login");
  }, [authManager, screenManager, progressManager, heartManager]);

  // Render day display
  const renderDayDisplay = () => {
    const digits = currentDay.toString().split("");
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {digits.map((digit, index) => (
          <img
            key={index}
            src={`assets/images/number_${digit}.png`}
            style={{
              height: "clamp(60px, 23cqw, 90px)",
              margin: "0 calc(clamp(14px, 6cqw, 24px) * -1)",
            }}
            alt={digit}
          />
        ))}
        <img
          src="assets/images/day.png"
          style={{
            height: "clamp(66px, 26cqw, 100px)",
            marginLeft: "calc(clamp(8px, 3cqw, 12px) * -1)",
          }}
          alt="day"
        />
      </div>
    );
  };

  // Render heart images
  const renderHeartImages = () => {
    const heartArray = Array.from(
      { length: HEART_CONFIG.MAX_HEARTS },
      (_, i) => i,
    );
    return heartArray.map((i) => (
      <img
        key={i}
        src="assets/images/heart.png"
        style={{
          width: "clamp(22px, 7cqw, 34px)",
          aspectRatio: "1",
          opacity: i < hearts ? 1 : 0.4,
          filter: i < hearts ? "none" : "grayscale(1) brightness(0.5)",
        }}
        alt="heart"
      />
    ));
  };

  // Check if plus button should show
  const shouldShowPlus = hearts < HEART_CONFIG.MAX_HEARTS;
  // Heart purchase popup state
  const canBuyHeart = totalStars >= 1 && hearts < HEART_CONFIG.MAX_HEARTS;

  const panelBg = "rgba(245, 230, 211, 0.95)";

  return (
    <div className="screen screen-home" style={{ position: "relative" }}>
      {/* Background (zoomed in) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-25%",
            backgroundImage: "url(assets/images/home_background.png)",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "5vh 8px 0",
            flexShrink: 0,
          }}
        >
          {/* Profile Area */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "calc(clamp(44px, 16cqw, 64px) + 16px)",
              }}
            >
              <div
                style={{
                  background: panelBg,
                  borderRadius: 16,
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                <img
                  src="assets/images/profile.png"
                  style={{ width: "clamp(44px, 16cqw, 64px)", aspectRatio: "1", cursor: authManager.isLoggedIn() ? "pointer" : "default" }}
                  onClick={handleProfileClick}
                  alt="profile"
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-primary)",
                  fontSize: "clamp(11px, 3.5cqw, 14px)",
                  color: "#5D4E37",
                  fontWeight: "bold",
                  marginTop: 4,
                  textAlign: "center",
                  width: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {nickname || userName}
              </span>
            </div>
          </div>

          {/* Hearts + Stars Area */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: 6,
              flexShrink: 0,
              padding: "0 4px",
            }}
          >
            {/* Heart Panel */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: panelBg,
                borderRadius: 16,
                padding: "8px 10px",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                {renderHeartImages()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                <span
                  style={{
                    fontFamily: "var(--font-primary)",
                    fontSize: "clamp(13px, 4cqw, 17px)",
                    lineHeight: 1,
                    color: "#8B7355",
                    flex: 1,
                    textAlign: "center",
                  }}
                >
                  {timerText}
                </span>
                <img
                  src="assets/images/plus.png"
                  style={{
                    width: "clamp(22px, 7cqw, 30px)",
                    aspectRatio: "1",
                    cursor: "pointer",
                    flexShrink: 0,
                    display: "block",
                    visibility: shouldShowPlus ? "visible" : "hidden",
                  }}
                  onClick={shouldShowPlus ? handlePlusClick : undefined}
                  alt="plus"
                />
              </div>
            </div>

            {/* Star Panel */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: panelBg,
                borderRadius: 16,
                padding: "8px 10px",
                gap: 4,
              }}
            >
              <img
                src="assets/images/star.png"
                style={{
                  width: "clamp(20px, 6.5cqw, 26px)",
                  aspectRatio: "1",
                }}
                alt="star"
              />
              <span
                style={{
                  fontFamily: "var(--font-primary)",
                  fontSize: "clamp(16px, 5cqw, 22px)",
                  color: "#000",
                  fontWeight: "bold",
                }}
              >
                {totalStars}
              </span>
            </div>
          </div>

          {/* Settings Button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                background: panelBg,
                borderRadius: "50%",
                padding: 8,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
              onClick={() => screenManager.showScreen("settings")}
            >
              <img
                src="assets/images/setting.png"
                style={{ width: "clamp(30px, 10cqw, 44px)", aspectRatio: "1" }}
                alt="settings"
              />
            </div>
          </div>
        </div>

        {/* Side Buttons */}
        <div
          style={{
            position: "absolute",
            right: 10,
            top: "15%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            background: panelBg,
            borderRadius: 16,
            padding: 8,
            zIndex: 2,
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
          }}
        >
          <img
            src="assets/images/rank.png"
            style={{
              width: "clamp(40px, 14cqw, 58px)",
              aspectRatio: "1",
              cursor: "pointer",
            }}
            onClick={() => setPopupType("ranking")}
            alt="rank"
          />
          <img
            src="assets/images/shop.png"
            style={{
              width: "clamp(40px, 14cqw, 58px)",
              aspectRatio: "1",
              cursor: "pointer",
            }}
            onClick={() => screenManager.showScreen("shop")}
            alt="shop"
          />
          <img
            src="assets/images/calendar.png"
            style={{
              width: "clamp(40px, 14cqw, 58px)",
              aspectRatio: "1",
              cursor: "pointer",
            }}
            onClick={() => screenManager.showScreen("daytree")}
            alt="calendar"
          />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Day Display */}
        {renderDayDisplay()}

        {/* Start Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingBottom: "31%",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "relative",
              cursor: "pointer",
              width: "fit-content",
            }}
            onClick={handleStartClick}
          >
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 4,
                right: -4,
                bottom: -8,
                background: "#5a4010",
                borderRadius: 20,
                opacity: 0.8,
              }}
            />
            <div
              style={{
                position: "relative",
                background: "#e8d4b8",
                border: "2px solid #9a7040",
                borderRadius: 20,
                padding: "5px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src="assets/images/start.png"
                style={{ height: "clamp(70px, 25cqw, 84px)", width: "auto" }}
                alt="start"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Popups */}
      {popupType === "noHearts" && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-title error">하트 부족</div>
            <div className="popup-message">
              하트가 없어요!
              <br />
              다음 하트까지: {heartManager.formatTimeToNextHeart()}
            </div>
            <div className="popup-buttons">
              <button className="btn btn-primary" onClick={closePopup}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {popupType === "heartPurchase" && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-title">하트 구매</div>
            <button
              className={`btn ${canBuyHeart ? "btn-success" : "btn-disabled"}`}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                marginBottom: 12,
              }}
              onClick={() => {
                if (canBuyHeart) {
                  handleHeartPurchase();
                }
              }}
              disabled={!canBuyHeart}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <img
                  src="assets/images/heart.png"
                  style={{ width: 22, height: 22 }}
                  alt="heart"
                />{" "}
                1 구매하기
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                1{" "}
                <img
                  src="assets/images/star.png"
                  style={{ width: 22, height: 22 }}
                  alt="star"
                />
              </span>
            </button>
            <div className="popup-buttons">
              <button className="btn btn-primary" onClick={closePopup}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {popupType === "tutorial" && (
        <div className="popup-overlay" onClick={(e) => e.stopPropagation()}>
          <div
            className="popup"
            style={{ width: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-title">환영합니다!</div>
            <div className="popup-message">
              처음이시네요!
              <br />
              튜토리얼을 통해
              <br />
              와플 굽는 법을 배워볼까요?
            </div>
            <div className="popup-buttons">
              <button className="btn btn-success" onClick={handleTutorialStart}>
                튜토리얼 시작
              </button>
              <button className="btn btn-gray" onClick={handleTutorialSkip}>
                건너뛰고 바로 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {popupType === "placeholder" && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-title">알림</div>
            <div className="popup-message">준비 중입니다!</div>
            <div className="popup-buttons">
              <button className="btn btn-primary" onClick={closePopup}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {popupType === "ranking" && (
        <RankingPopup onClose={closePopup} />
      )}

      {popupType === "profile" && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup" style={{ width: "85%", maxWidth: "85%", padding: 20, display: "flex", flexDirection: "column", gap: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "clamp(24px, 7cqw, 32px)", fontWeight: "bold", color: "#5D4E37", fontFamily: "var(--font-primary)", textAlign: "center" }}>
              계정 관리
            </div>

            {/* 닉네임 섹션 */}
            <div>
              <div style={{ fontSize: "clamp(16px, 5cqw, 20px)", fontWeight: "bold", color: "#5D4E37", fontFamily: "var(--font-primary)", marginBottom: 8 }}>
                닉네임
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="닉네임 입력 (최대 10자)"
                  maxLength={10}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: "2px solid #8B6914",
                    background: "#FFF8E7",
                    fontFamily: "var(--font-primary)",
                    fontSize: "clamp(16px, 5cqw, 22px)",
                    color: "#5D4E37",
                    outline: "none",
                  }}
                />
                <button
                  className="btn btn-primary"
                  style={{ padding: "12px 16px", fontSize: "clamp(16px, 5cqw, 20px)", whiteSpace: "nowrap" }}
                  onClick={handleNicknameSave}
                  disabled={nicknameSaving || !nicknameInput.trim() || nicknameInput.trim() === nickname}
                >
                  {nicknameSaving ? "저장 중..." : "저장"}
                </button>
              </div>
              {nickname && (
                <div style={{ fontSize: "clamp(13px, 4cqw, 16px)", color: "#8B7355", paddingLeft: 4, marginTop: 6 }}>
                  현재 닉네임: {nickname}
                </div>
              )}
            </div>

            {/* 구분선 */}
            <div style={{ height: 2, background: "#E8D5C0" }} />

            {/* 계정 버튼 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                className="btn btn-danger"
                style={{ width: "100%", fontSize: "clamp(16px, 5cqw, 20px)", padding: 12 }}
                onClick={() => setProfileConfirm("logout")}
              >
                로그아웃
              </button>
              <button
                className="btn btn-gray"
                style={{ width: "100%", fontSize: "clamp(14px, 4.5cqw, 18px)", padding: 10 }}
                onClick={() => setProfileConfirm("deleteAccount")}
              >
                계정 삭제
              </button>
            </div>

            {nicknameError && (
              <div style={{ fontSize: "clamp(13px, 4cqw, 16px)", color: "#E85A4F", textAlign: "center" }}>
                {nicknameError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={closePopup}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 로그아웃 확인 */}
      {profileConfirm === "logout" && (
        <div className="popup-overlay" style={{ zIndex: 1001 }} onClick={() => setProfileConfirm(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-title">로그아웃</div>
            <div className="popup-message">정말 로그아웃 하시겠습니까?</div>
            <div className="popup-buttons">
              <button className="btn btn-danger" onClick={handleLogout}>로그아웃</button>
              <button className="btn btn-primary" onClick={() => setProfileConfirm(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 계정 삭제 확인 */}
      {profileConfirm === "deleteAccount" && (
        <div className="popup-overlay" style={{ zIndex: 1001 }} onClick={() => setProfileConfirm(null)}>
          <div className="popup" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="popup-title error">계정 삭제</div>
            <div className="popup-message">
              정말 계정을 삭제하시겠습니까?<br/><br/>
              모든 게임 데이터가 영구적으로<br/>
              삭제되며 복구할 수 없습니다.
            </div>
            <div className="popup-buttons">
              <button className="btn btn-danger" onClick={handleDeleteAccount}>삭제</button>
              <button className="btn btn-primary" onClick={() => setProfileConfirm(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 로딩 오버레이 */}
      {showLoading && (
        <div className="loading-overlay">
          <span className="loading-text">계정 삭제 중...</span>
        </div>
      )}
    </div>
  );
}
