import { useState, useCallback } from 'react';
import { ProgressManager } from '../../utils/ProgressManager';
import { HeartManager } from '../../utils/HeartManager';
import { getDayTarget, TUTORIAL_CONFIG } from '../../types/game';
import { ScreenManager } from '../ScreenManager';

interface TutorialCellProps {
  onStart: () => void;
}

function TutorialCell({ onStart }: TutorialCellProps) {
  const tutorialCompleted = localStorage.getItem(TUTORIAL_CONFIG.STORAGE_KEY) === 'true';

  return (
    <div
      onClick={onStart}
      style={{
        borderRadius: 8,
        padding: 16,
        textAlign: 'center',
        cursor: 'pointer',
        margin: 0,
        border: `3px solid ${tutorialCompleted ? '#4CAF50' : '#FF9800'}`,
        backgroundColor: tutorialCompleted ? '#E8F5E9' : '#FFF3E0',
      }}
    >
      <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(18px, 6cqw, 24px)', color: '#5D4E37', fontWeight: 'bold', marginBottom: 6 }}>
        튜토리얼
      </div>
      {tutorialCompleted ? (
        <>
          <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(16px, 5cqw, 20px)', color: '#4CAF50', fontWeight: 'bold' }}>
            완료
          </div>
          <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(13px, 4cqw, 16px)', color: '#7D6E57', marginTop: 4 }}>
            다시 보기
          </div>
        </>
      ) : (
        <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(16px, 5cqw, 20px)', color: '#FF9800', fontWeight: 'bold' }}>
          시작하기
        </div>
      )}
    </div>
  );
}

interface DayCellProps {
  day: number;
  currentDay: number;
  onClick: () => void;
}

function DayCell({ day, currentDay, onClick }: DayCellProps) {
  const progressManager = ProgressManager.getInstance();
  const isCompleted = day < currentDay;
  const stars = progressManager.getDayStars(day);

  let borderColor = '#2196F3';
  let bgColor = '#E3F2FD';
  if (isCompleted) {
    if (stars === 3) {
      borderColor = '#FFD700';
      bgColor = '#FFF9C4';
    } else {
      borderColor = '#4CAF50';
      bgColor = '#fff';
    }
  }

  return (
    <div
      onClick={onClick}
      style={{
        border: `3px solid ${borderColor}`,
        backgroundColor: bgColor,
        borderRadius: 8,
        padding: '10px 4px',
        textAlign: 'center',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(16px, 5cqw, 20px)', color: '#5D4E37', fontWeight: 'bold' }}>
        - {day}일차 -
      </div>

      {isCompleted ? (
        <>
          <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {[0, 1, 2].map((i) => (
              <img
                key={i}
                src="assets/images/star.png"
                alt="star"
                style={{
                  width: 'clamp(20px, 7cqw, 28px)',
                  aspectRatio: '1',
                  opacity: i >= stars ? 0.3 : 1,
                  filter: i >= stars ? 'grayscale(1) brightness(0.5)' : 'none',
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: 'clamp(13px, 4cqw, 16px)',
              fontWeight: 'bold',
              color: progressManager.getDayMoney(day) >= getDayTarget(day) ? '#4CAF50' : '#E85A4F',
            }}
          >
            {progressManager.getDayMoney(day).toLocaleString()}원
          </div>
          <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(10px, 3cqw, 12px)', color: '#7D6E57' }}>
            / {getDayTarget(day).toLocaleString()}원
          </div>
        </>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(13px, 4cqw, 16px)', color: '#2196F3' }}>
            목표: {getDayTarget(day).toLocaleString()}원
          </div>
          <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(14px, 4.5cqw, 18px)', color: '#2196F3', fontWeight: 'bold' }}>
            진행중
          </div>
        </>
      )}
    </div>
  );
}

interface PopupProps {
  type: 'confirm' | 'noHearts';
  day?: number;
  onClose: () => void;
  onStart?: () => void;
}

function Popup({ type, day, onClose, onStart }: PopupProps) {
  const progressManager = ProgressManager.getInstance();
  const heartManager = HeartManager.getInstance();

  if (type === 'noHearts') {
    const timeStr = heartManager.formatTimeToNextHeart();
    return (
      <div className="popup-overlay" onClick={onClose}>
        <div className="popup" onClick={(e) => e.stopPropagation()}>
          <div className="popup-title error">하트 부족</div>
          <div className="popup-message" style={{ whiteSpace: 'pre-line' }}>
            하트가 없어요!{'\n'}다음 하트까지: {timeStr}
          </div>
          <div className="popup-buttons">
            <button className="btn btn-primary" onClick={onClose}>
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!day || !onStart) return null;

  const currentDay = progressManager.getCurrentDay();
  const isRetry = day < currentDay;
  const stars = progressManager.getDayStars(day);
  const target = getDayTarget(day);

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-title">{isRetry ? `${day}일차 재도전` : `${day}일차 시작`}</div>
        <div className="popup-message">목표: ₩{target.toLocaleString()}</div>

        {isRetry && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(14px, 4.5cqw, 18px)', color: '#5D4E37' }}>
              현재 기록:
            </span>
            {[0, 1, 2].map((i) => (
              <img
                key={i}
                src="assets/images/star.png"
                alt="star"
                style={{
                  width: 22,
                  aspectRatio: '1',
                  opacity: i >= stars ? 0.3 : 1,
                  filter: i >= stars ? 'grayscale(1) brightness(0.5)' : 'none',
                }}
              />
            ))}
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(13px, 4cqw, 16px)', color: '#E85A4F', marginBottom: 12 }}>
          ❤️ 하트 1개 소모
        </div>

        <div className="popup-buttons">
          <button className="btn btn-success" onClick={onStart}>
            {isRetry ? '재도전' : '시작'}
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DayTreeScreen() {
  const [popupType, setPopupType] = useState<'confirm' | 'noHearts' | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const progressManager = ProgressManager.getInstance();
  const heartManager = HeartManager.getInstance();
  const screenManager = ScreenManager.getInstance();

  const currentDay = progressManager.getCurrentDay();
  const totalStars = progressManager.getTotalStars();

  const handleTutorialStart = useCallback(() => {
    screenManager.startPhaserScene('TutorialScene');
  }, [screenManager]);

  const handleDayClick = useCallback(
    (day: number) => {
      if (!heartManager.hasHeart()) {
        setPopupType('noHearts');
        return;
      }
      setSelectedDay(day);
      setPopupType('confirm');
    },
    [heartManager]
  );

  const handlePopupClose = useCallback(() => {
    setPopupType(null);
    setSelectedDay(null);
  }, []);

  const handleStart = useCallback(() => {
    if (selectedDay === null) return;
    heartManager.useHeart();
    screenManager.startPhaserScene('GameScene', { day: selectedDay, skipHeart: true });
    handlePopupClose();
  }, [selectedDay, heartManager, screenManager, handlePopupClose]);

  const handleBackClick = useCallback(() => {
    screenManager.showScreen('home');
  }, [screenManager]);

  const days = Array.from({ length: currentDay }, (_, i) => i + 1);

  return (
    <div className="screen screen-daytree">
      <div className="header" style={{ flexDirection: 'column', gap: 4 }}>
        <span className="header-title">데이트리</span>
        <span className="header-subtitle">
          <img src="assets/images/star.png" alt="star" /> {totalStars}
        </span>
      </div>

      <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(13px, 4cqw, 16px)', color: '#7D6E57', textAlign: 'center', padding: '10px 20px 4px', flexShrink: 0, whiteSpace: 'pre-line' }}>
        재도전으로 더 많은 별을 모아보세요!{'\n'}재도전 시, 하트 1개 소모
      </div>

      <div className="scroll-content" style={{ padding: '10px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <TutorialCell onStart={handleTutorialStart} />
        <div className="grid-3col">
          {days.map((day) => (
            <DayCell
              key={day}
              day={day}
              currentDay={currentDay}
              onClick={() => handleDayClick(day)}
            />
          ))}
        </div>
      </div>

      <div className="footer">
        <button className="btn-back" onClick={handleBackClick}>
          <img src="assets/images/home_100.png" alt="home" /> 홈으로
        </button>
      </div>

      {popupType && (
        <Popup
          type={popupType}
          day={selectedDay ?? undefined}
          onClose={handlePopupClose}
          onStart={popupType === 'confirm' ? handleStart : undefined}
        />
      )}
    </div>
  );
}
