import { useState, useCallback } from 'react';
import { SoundManager } from '../../utils/SoundManager';
import { AuthManager } from '../../utils/AuthManager';
import { ProgressManager } from '../../utils/ProgressManager';
import { HeartManager } from '../../utils/HeartManager';
import { ScreenManager } from '../ScreenManager';
import { TEST_ACCOUNTS } from '../../config/constants';
import '../styles.css';

type PopupType = 'logout' | 'deleteAccount' | 'developer' | null;

export default function SettingsScreen() {
  const screenManager = ScreenManager.getInstance();
  const soundManager = SoundManager.getInstance();
  const authManager = AuthManager.getInstance();

  const [bgmEnabled, setBgmEnabled] = useState(soundManager.isBgmEnabled());
  const [sfxEnabled, setSfxEnabled] = useState(soundManager.isSfxEnabled());
  const [showPopup, setShowPopup] = useState<PopupType>(null);
  const [showLoading, setShowLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isLoggedIn = authManager.isLoggedIn();
  const userEmail = authManager.getUser()?.email ?? '';
  const isTestAccount = TEST_ACCOUNTS.includes(userEmail);

  const handleBgmToggle = useCallback((checked: boolean) => {
    setBgmEnabled(checked);
    soundManager.setBgmEnabled(checked);
    soundManager.syncBgm(undefined, 'bgm_home', { volume: 0.5 });
  }, [soundManager]);

  const handleSfxToggle = useCallback((checked: boolean) => {
    setSfxEnabled(checked);
    soundManager.setSfxEnabled(checked);
    if (checked) {
      soundManager.playSfx(undefined, 'sfx_coin', { volume: 0.5 });
    }
  }, [soundManager]);

  const handleAuthButtonClick = useCallback(() => {
    if (isLoggedIn) {
      setShowPopup('logout');
    } else {
      screenManager.showScreen('login');
    }
  }, [isLoggedIn, screenManager]);

  const handleLogout = useCallback(async () => {
    setShowPopup(null);
    await authManager.signOut();
    ProgressManager.getInstance().resetProgress();
    HeartManager.getInstance().resetHearts();
    localStorage.removeItem('waffle_hasLoggedIn');
    localStorage.removeItem('waffle_isGuest');
    screenManager.showScreen('login');
  }, [authManager, screenManager]);

  const handleDeleteAccount = useCallback(async () => {
    setShowPopup(null);
    setShowLoading(true);

    const { error } = await authManager.deleteAccount();

    setShowLoading(false);

    if (error) {
      setErrorMessage('계정 삭제에 실패했습니다.\n다시 시도해주세요.');
      setTimeout(() => setErrorMessage(null), 2000);
      return;
    }

    ProgressManager.getInstance().resetProgress();
    HeartManager.getInstance().resetHearts();
    screenManager.showScreen('login');
  }, [authManager, screenManager]);

  const handleTestAddHeart = useCallback(() => {
    HeartManager.getInstance().addHeart();
  }, []);

  const handleTestAddStars = useCallback(() => {
    ProgressManager.getInstance().addStars(10);
  }, []);

  const handleTestAdvanceDay = useCallback(() => {
    ProgressManager.getInstance().advanceToNextDay();
  }, []);

  const handleTestReset = useCallback(() => {
    ProgressManager.getInstance().resetProgress();
    HeartManager.getInstance().resetHearts();
  }, []);

  const handleTestUITest = useCallback(() => {
    setShowPopup(null);
    screenManager.startPhaserScene('TestScene');
  }, [screenManager]);

  const handleBackToHome = useCallback(() => {
    screenManager.showScreen('home');
  }, [screenManager]);

  return (
    <div className="screen screen-settings">
      {/* 헤더 */}
      <div className="header">
        <span className="header-title">설정</span>
      </div>

      {/* 스크롤 영역 */}
      <div className="scroll-content" style={{ padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* 사운드 설정 섹션 */}
        <div className="section-title">사운드 설정</div>

        {/* BGM 토글 */}
        <div className="toggle-row">
          <span className="toggle-label">🎵 배경음악 (BGM)</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={bgmEnabled}
              onChange={(e) => handleBgmToggle(e.target.checked)}
            />
            <span className="toggle-track"></span>
            <span className="toggle-knob"></span>
          </label>
        </div>

        {/* SFX 토글 */}
        <div className="toggle-row">
          <span className="toggle-label">🔔 효과음 (SFX)</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={sfxEnabled}
              onChange={(e) => handleSfxToggle(e.target.checked)}
            />
            <span className="toggle-track"></span>
            <span className="toggle-knob"></span>
          </label>
        </div>

        {/* 구분선 */}
        <div className="section-divider"></div>

        {/* 계정 관리 섹션 */}
        <div className="section-title">계정 관리</div>

        {/* 로그인/로그아웃 버튼 */}
        <button
          className={`btn ${isLoggedIn ? 'btn-danger' : 'btn-blue'}`}
          style={{ width: '100%', marginBottom: 0, fontSize: 'clamp(18px, 6cqw, 24px)', padding: 14 }}
          onClick={handleAuthButtonClick}
        >
          {isLoggedIn ? '로그아웃' : '로그인'}
        </button>

        {/* 계정 삭제 버튼 (로그인 상태에서만) */}
        {isLoggedIn && (
          <button
            className="btn btn-gray"
            style={{ width: '100%', marginBottom: 0, fontSize: 'clamp(18px, 6cqw, 24px)', padding: 14 }}
            onClick={() => setShowPopup('deleteAccount')}
          >
            계정 삭제
          </button>
        )}

        {/* 개발자 버튼 (테스트 계정에서만) */}
        {isTestAccount && (
          <>
            <div className="section-divider"></div>
            <button
              className="btn"
              style={{ width: '100%', marginBottom: 0, fontSize: 'clamp(18px, 6cqw, 24px)', padding: 14, background: '#9C27B0', color: '#fff', border: '3px solid #7B1FA2' }}
              onClick={() => setShowPopup('developer')}
            >
              개발자
            </button>
          </>
        )}

        {/* 버전 정보 */}
        <div className="version-text">Waffle Tycoon v1.0.0</div>
      </div>

      {/* 푸터 (홈 버튼) */}
      <div className="footer">
        <button className="btn-back" onClick={handleBackToHome}>
          <img src="assets/images/home_100.png" alt="Home" /> 홈으로
        </button>
      </div>

      {/* 로그아웃 확인 팝업 */}
      {showPopup === 'logout' && (
        <div
          className="popup-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPopup(null); }}
        >
          <div className="popup">
            <div className="popup-title">로그아웃</div>
            <div className="popup-message">정말 로그아웃 하시겠습니까?</div>
            <div className="popup-buttons">
              <button className="btn btn-danger" onClick={handleLogout}>
                로그아웃
              </button>
              <button className="btn btn-primary" onClick={() => setShowPopup(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계정 삭제 확인 팝업 */}
      {showPopup === 'deleteAccount' && (
        <div
          className="popup-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPopup(null); }}
        >
          <div className="popup" style={{ width: 420 }}>
            <div className="popup-title error">계정 삭제</div>
            <div className="popup-message">
              정말 계정을 삭제하시겠습니까?<br/><br/>
              모든 게임 데이터가 영구적으로<br/>
              삭제되며 복구할 수 없습니다.
            </div>
            <div className="popup-buttons">
              <button className="btn btn-danger" onClick={handleDeleteAccount}>
                삭제
              </button>
              <button className="btn btn-primary" onClick={() => setShowPopup(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 개발자 팝업 */}
      {showPopup === 'developer' && (
        <div
          className="popup-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPopup(null); }}
        >
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-title">테스트 메뉴</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <button className="btn" style={{ background: '#E85A4F', color: '#fff', padding: 12, fontSize: 18 }} onClick={handleTestAddHeart}>
                하트 +1
              </button>
              <button className="btn" style={{ background: '#FFD700', color: '#fff', padding: 12, fontSize: 18 }} onClick={handleTestAddStars}>
                별 +10
              </button>
              <button className="btn" style={{ background: '#4CAF50', color: '#fff', padding: 12, fontSize: 18 }} onClick={handleTestAdvanceDay}>
                Day +1
              </button>
              <button className="btn" style={{ background: '#9E9E9E', color: '#fff', padding: 12, fontSize: 18 }} onClick={handleTestReset}>
                초기화
              </button>
            </div>
            <button className="btn" style={{ background: '#9C27B0', color: '#fff', padding: 12, fontSize: 18, width: '100%', marginBottom: 12 }} onClick={handleTestUITest}>
              UI 테스트
            </button>
            <div className="popup-buttons">
              <button className="btn btn-primary" onClick={() => setShowPopup(null)}>
                닫기
              </button>
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

      {/* 에러 토스트 */}
      {errorMessage && (
        <div className="toast">{errorMessage}</div>
      )}
    </div>
  );
}
