import { useState, useEffect, useCallback } from "react";
import { RankingManager, RankingTab, RankingResult } from "../../utils/RankingManager";
import { AuthManager } from "../../utils/AuthManager";

interface RankingPopupProps {
  onClose: () => void;
}

export default function RankingPopup({ onClose }: RankingPopupProps) {
  const [activeTab, setActiveTab] = useState<RankingTab>("day");
  const [loading, setLoading] = useState(true);
  const [rankingData, setRankingData] = useState<RankingResult | null>(null);

  const rankingManager = RankingManager.getInstance();
  const authManager = AuthManager.getInstance();

  const isGuest = !authManager.isLoggedIn() && localStorage.getItem("waffle_isGuest") === "true";

  const fetchData = useCallback(async (tab: RankingTab) => {
    setLoading(true);
    try {
      const result = await rankingManager.fetchRankings(tab);
      setRankingData(result);
    } catch (error) {
      console.error("[RankingPopup] Failed to fetch rankings:", error);
      setRankingData({ topList: [], myRank: null, error: error as Error });
    } finally {
      setLoading(false);
    }
  }, [rankingManager]);

  useEffect(() => {
    if (!isGuest) {
      fetchData(activeTab);
    } else {
      setLoading(false);
    }
  }, [activeTab, fetchData, isGuest]);

  const handleTabChange = (tab: RankingTab) => {
    setActiveTab(tab);
  };

  const formatValue = (value: number, tab: RankingTab): string => {
    if (tab === "day") {
      return `${value}일차`;
    } else {
      return `${value.toLocaleString()}원`;
    }
  };

  const getRankColor = (rank: number): string => {
    if (rank === 1) return "#FFD700"; // Gold
    if (rank === 2) return "#C0C0C0"; // Silver
    if (rank === 3) return "#CD7F32"; // Bronze
    return "#5D4E37"; // Default brown
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="popup-overlay"
      onClick={handleOverlayClick}
      style={{ zIndex: 1000 }}
    >
      <div
        className="popup"
        style={{
          width: "85%",
          maxWidth: "85%",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxHeight: "80vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div
          style={{
            fontSize: "clamp(24px, 7cqw, 32px)",
            fontWeight: "bold",
            color: "#5D4E37",
            fontFamily: "var(--font-primary)",
            textAlign: "center",
          }}
        >
          랭킹
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: "8px",
              border: activeTab === "day" ? "2px solid #8B6914" : "2px solid transparent",
              background: activeTab === "day" ? "#D4A574" : "#F5E6D3",
              color: activeTab === "day" ? "#5D4E37" : "#8B7355",
              fontFamily: "var(--font-primary)",
              fontSize: "clamp(16px, 5cqw, 22px)",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={() => handleTabChange("day")}
          >
            일차
          </button>
          <button
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: "8px",
              border: activeTab === "money" ? "2px solid #8B6914" : "2px solid transparent",
              background: activeTab === "money" ? "#D4A574" : "#F5E6D3",
              color: activeTab === "money" ? "#5D4E37" : "#8B7355",
              fontFamily: "var(--font-primary)",
              fontSize: "clamp(16px, 5cqw, 22px)",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={() => handleTabChange("money")}
          >
            누적 금액
          </button>
        </div>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            minHeight: "200px",
            overflowY: "auto",
            fontFamily: "var(--font-primary)",
          }}
        >
          {isGuest ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#8B7355",
                fontSize: "clamp(16px, 5cqw, 20px)",
              }}
            >
              로그인하면 랭킹에 등록할 수 있습니다
            </div>
          ) : loading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#8B7355",
                fontSize: "clamp(16px, 5cqw, 20px)",
              }}
            >
              로딩 중...
            </div>
          ) : rankingData?.error || !rankingData || rankingData.topList.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#8B7355",
                fontSize: "clamp(16px, 5cqw, 20px)",
              }}
            >
              랭킹 데이터가 없습니다
            </div>
          ) : (
            <div>
              {/* Top 10 List */}
              <div>
                {rankingData.topList.map((entry) => (
                  <div
                    key={entry.rank}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderBottom: "1px solid #E8D5C0",
                      background: entry.isMe ? "#FFF0D4" : "transparent",
                      fontWeight: entry.isMe ? "bold" : "normal",
                    }}
                  >
                    <span
                      style={{
                        width: "30px",
                        textAlign: "center",
                        fontWeight: "bold",
                        color: getRankColor(entry.rank),
                        fontSize: "clamp(14px, 4.5cqw, 20px)",
                      }}
                    >
                      {entry.rank}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        paddingLeft: "12px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "clamp(14px, 4.5cqw, 20px)",
                        color: "#5D4E37",
                      }}
                    >
                      {entry.displayName}
                    </span>
                    <span
                      style={{
                        minWidth: "80px",
                        textAlign: "right",
                        fontSize: "clamp(14px, 4.5cqw, 20px)",
                        color: "#5D4E37",
                      }}
                    >
                      {formatValue(entry.value, activeTab)}
                    </span>
                  </div>
                ))}
              </div>

              {/* My Rank Section */}
              {rankingData.myRank && !rankingData.topList.some(e => e.isMe) && (
                <>
                  <div
                    style={{
                      height: "2px",
                      background: "#D4A574",
                      margin: "12px 0",
                    }}
                  />
                  <div
                    style={{
                      background: "#FFF0D4",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontWeight: "bold",
                      fontSize: "clamp(14px, 4.5cqw, 20px)",
                      color: "#5D4E37",
                    }}
                  >
                    <span>내 순위: #{rankingData.myRank.rank}</span>
                    <span>{formatValue(rankingData.myRank.value, activeTab)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
