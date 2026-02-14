import { useState, useEffect, useCallback, useRef } from "react";
import { ScreenManager } from "../ScreenManager";
import { HeartManager } from "../../utils/HeartManager";
import { ProgressManager } from "../../utils/ProgressManager";
import { AuthManager } from "../../utils/AuthManager";
import { CloudSaveManager, LocalSaveData } from "../../utils/CloudSaveManager";
import { SoundManager } from "../../utils/SoundManager";
import { HEART_CONFIG, TUTORIAL_CONFIG } from "../../types/game";

type PopupType =
  | "noHearts"
  | "heartPurchase"
  | "tutorial"
  | "placeholder";

interface PlaceholderData {
  title: string;
}

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
  const [placeholderData, setPlaceholderData] = useState<PlaceholderData>({
    title: "",
  });

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

    // BGM
    const soundManager = SoundManager.getInstance();
    soundManager.stopAll();
    soundManager.playBgm(undefined, "bgm_home", { volume: 0.5 });

    // Heart timer (1s interval)
    const heartInterval = setInterval(updateHeartsUI, 1000);

    // Auth state listener
    const authUnsubscribe = authManager.onAuthStateChange(async (user) => {
      updateUserUI();
      if (user && !isSyncing.current) {
        await syncWithCloud();
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

  const handlePlaceholderClick = useCallback((title: string) => {
    setPlaceholderData({ title });
    setPopupType("placeholder");
  }, []);

  const closePopup = useCallback(() => {
    setPopupType(null);
  }, []);

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
                style={{ width: "clamp(44px, 16cqw, 64px)", aspectRatio: "1" }}
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
                maxWidth: 76,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userName}
            </span>
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
            onClick={() => handlePlaceholderClick("랭킹")}
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
            <div className="popup-title">{placeholderData.title}</div>
            <div className="popup-message">준비 중입니다!</div>
            <div className="popup-buttons">
              <button className="btn btn-primary" onClick={closePopup}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
