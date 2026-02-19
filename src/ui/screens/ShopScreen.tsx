import { useState, useCallback } from 'react';
import { UpgradeType, UpgradeCategory, UPGRADE_CONFIGS } from '../../types/game';
import { ProgressManager } from '../../utils/ProgressManager';
import { ScreenManager } from '../ScreenManager';

// 카테고리별 업그레이드 그룹
const UPGRADE_BY_CATEGORY: Record<UpgradeCategory, UpgradeType[]> = {
  [UpgradeCategory.BASIC]: [
    UpgradeType.BATTER,
    UpgradeType.FIRE_STRENGTH,
    UpgradeType.TIME_EXTENSION,
    UpgradeType.WORK_TRAY_CAPACITY,
    UpgradeType.FINISHED_TRAY_CAPACITY,
  ],
  [UpgradeCategory.CUSTOMER]: [UpgradeType.KINDNESS, UpgradeType.TIP_BONUS],
  [UpgradeCategory.COOKING]: [UpgradeType.KEEP_WARM, UpgradeType.BURN_PROTECTION],
  [UpgradeCategory.SALES]: [UpgradeType.COMBO_MASTER, UpgradeType.COMBO_BONUS, UpgradeType.LUCKY_WAFFLE],
  [UpgradeCategory.STRONG_FIRE]: [UpgradeType.STRONG_FIRE_DURATION, UpgradeType.STRONG_FIRE_POWER],
};

const CATEGORY_NAMES: Record<UpgradeCategory, string> = {
  [UpgradeCategory.BASIC]: '기본',
  [UpgradeCategory.CUSTOMER]: '손님',
  [UpgradeCategory.COOKING]: '굽기',
  [UpgradeCategory.SALES]: '판매',
  [UpgradeCategory.STRONG_FIRE]: '강불',
};

const CATEGORY_ORDER: UpgradeCategory[] = [
  UpgradeCategory.BASIC,
  UpgradeCategory.CUSTOMER,
  UpgradeCategory.COOKING,
  UpgradeCategory.SALES,
  UpgradeCategory.STRONG_FIRE,
];

// 업그레이드 이미지 키 → 실제 파일 경로 매핑
const IMAGE_KEY_MAP: Record<string, string> = {
  upgrade_bowl: 'assets/images/bowl.png',
  upgrade_fire: 'assets/images/big_fire.png',
  upgrade_time: 'assets/images/time.png',
  upgrade_ready_tray: 'assets/images/ready_tray.png',
  upgrade_finished_tray: 'assets/images/finished_tray.png',
  upgrade_perfect: 'assets/images/waffle_perfect.png',
  upgrade_burnt: 'assets/images/waffle_burnt.png',
  upgrade_combo: 'assets/images/combo.png',
  upgrade_smile: 'assets/images/smile.png',
  upgrade_bonus: 'assets/images/bonus.png',
  upgrade_luck: 'assets/images/luck.png',
};

interface UpgradeCardProps {
  type: UpgradeType;
  onRequestPurchase: (type: UpgradeType) => void;
  onInsufficientStars: () => void;
}

function UpgradeCard({ type, onRequestPurchase, onInsufficientStars }: UpgradeCardProps) {
  const progressManager = ProgressManager.getInstance();
  const config = UPGRADE_CONFIGS[type];
  const currentLevel = progressManager.getUpgradeLevel(type);
  const isMaxed = currentLevel >= config.maxLevel;
  const canBuy = progressManager.canPurchaseUpgrade(type);
  const nextCost = progressManager.getUpgradeCost(type);

  const imgSrc = config.imageKey ? (IMAGE_KEY_MAP[config.imageKey] || `assets/images/${config.imageKey}.png`) : '';

  const handleClick = useCallback(() => {
    if (isMaxed) return;
    if (progressManager.canPurchaseUpgrade(type)) {
      onRequestPurchase(type);
    } else {
      onInsufficientStars();
    }
  }, [type, isMaxed, progressManager, onRequestPurchase, onInsufficientStars]);

  const btnStyle: React.CSSProperties = isMaxed
    ? { background: '#4CAF50', border: '2px solid #388E3C', color: '#fff', cursor: 'default' }
    : canBuy
    ? { background: '#D4A574', border: '2px solid #6B3E26', color: '#5D4E37', cursor: 'pointer' }
    : { background: '#CCC', border: '2px solid #999', color: '#999', cursor: 'default' };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: `3px solid ${isMaxed ? '#4CAF50' : '#8B6914'}`,
        borderRadius: 8,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {imgSrc && (
        <img
          src={imgSrc}
          alt={config.name}
          style={{ width: 'clamp(50px, 20cqw, 80px)', aspectRatio: '1', objectFit: 'contain' }}
        />
      )}
      <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(14px, 4.5cqw, 18px)', fontWeight: 'bold', textAlign: 'center', color: isMaxed ? '#4CAF50' : '#5D4E37' }}>
        {config.name}
      </div>
      <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(11px, 3.5cqw, 14px)', color: isMaxed ? '#4CAF50' : '#8B7355' }}>
        {isMaxed
          ? 'MAX'
          : currentLevel === 0
          ? 'LV.0 > LV.1'
          : `LV.${currentLevel} > LV.${currentLevel + 1}`}
      </div>
      <div style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(11px, 3cqw, 14px)', color: '#7D6E57', textAlign: 'center', lineHeight: 1.3 }}>
        {config.description}
      </div>
      <button
        onClick={handleClick}
        style={{
          width: '100%',
          padding: 8,
          borderRadius: 6,
          fontFamily: 'var(--font-primary)',
          fontSize: 'clamp(14px, 4.5cqw, 18px)',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          marginTop: 'auto',
          ...btnStyle,
        }}
      >
        {isMaxed ? (
          'MAX'
        ) : (
          <>
            <img src="assets/images/star.png" alt="star" style={{ width: 20, height: 20 }} />
            {nextCost}
          </>
        )}
      </button>
    </div>
  );
}

export default function ShopScreen() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmType, setConfirmType] = useState<UpgradeType | null>(null);

  const progressManager = ProgressManager.getInstance();
  const screenManager = ScreenManager.getInstance();

  const handleRequestPurchase = useCallback((type: UpgradeType) => {
    setConfirmType(type);
  }, []);

  const handleConfirmPurchase = useCallback(() => {
    if (confirmType === null) return;
    if (progressManager.purchaseUpgrade(confirmType)) {
      setRefreshKey((k) => k + 1);
    }
    setConfirmType(null);
  }, [confirmType, progressManager]);

  const handleInsufficientStars = useCallback(() => {
    setToastMessage('별이 부족해요!');
    setTimeout(() => setToastMessage(null), 1500);
  }, []);

  const handleBackClick = useCallback(() => {
    screenManager.showScreen('home');
  }, [screenManager]);

  return (
    <div className="screen screen-shop" key={refreshKey}>
      <div className="header" style={{ flexDirection: 'column', gap: 4 }}>
        <span className="header-title">상점</span>
        <span className="header-subtitle">
          <img src="assets/images/star.png" alt="star" /> {progressManager.getTotalStars()}
        </span>
      </div>

      <div className="scroll-content" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CATEGORY_ORDER.map((category) => (
          <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="category-header" style={{ margin: 0 }}>{CATEGORY_NAMES[category]}</div>
            <div className="grid-3col">
              {UPGRADE_BY_CATEGORY[category].map((type) => (
                <UpgradeCard
                  key={type}
                  type={type}
                  onRequestPurchase={handleRequestPurchase}
                  onInsufficientStars={handleInsufficientStars}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="footer">
        <button className="btn-back" onClick={handleBackClick}>
          <img src="assets/images/home_100.png" alt="home" /> 홈으로
        </button>
      </div>

      {/* 구매 확인 팝업 */}
      {confirmType !== null && (() => {
        const config = UPGRADE_CONFIGS[confirmType];
        const cost = progressManager.getUpgradeCost(confirmType);
        const currentLevel = progressManager.getUpgradeLevel(confirmType);
        return (
          <div
            className="popup-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setConfirmType(null); }}
          >
            <div className="popup">
              <div className="popup-title">업그레이드 구매</div>
              <div className="popup-message">
                <strong>{config.name}</strong> LV.{currentLevel} → LV.{currentLevel + 1}<br />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <img src="assets/images/star.png" alt="star" style={{ width: 20, height: 20, flexShrink: 0, transform: 'translateY(2px)' }} />
                  <span><strong>{cost}</strong>개를 사용합니다.</span>
                </span>
              </div>
              <div className="popup-buttons">
                <button className="btn btn-primary" onClick={handleConfirmPurchase}>
                  구매
                </button>
                <button className="btn btn-gray" onClick={() => setConfirmType(null)}>
                  취소
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
}
