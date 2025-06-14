import type { Card } from "../services/websocket";
import { useEffect } from "react";

interface Player {
  userId: string;
  name: string;
  chips: number;
  currentBet?: number;
  holeCards?: Card[];
  isReady?: boolean;
  handRank?: {
    rank: number;
  };
  winAmount?: number;
  status?: string;
}

// 获取花色符号
export function getSuitSymbol(suit: string): string {
  switch (suit) {
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    case "spades":
      return "♠";
    default:
      return "";
  }
}

// 在文件顶部添加样式
const hoverStyle = `
  .hover-overlay {
    opacity: 0;
    transition: opacity 0.2s;
  }
  .hover-overlay:hover {
    opacity: 1 !important;
  }
`;

export default function PlayerSeat({
  player,
  seat,
  style = {},
  gameStatus = "waiting",
  gamePhase = "",
  isDealer = false,
  isSmallBlind = false,
  isBigBlind = false,
  isCurrentPlayer = false,
  isCurrentUser = false,
  onSit,
  isEmpty,
  onLeave,
  seatNumber,
}: {
  player?: Player;
  seat: string;
  style?: React.CSSProperties;
  gameStatus?: string;
  gamePhase?: string;
  isDealer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  isCurrentPlayer?: boolean;
  isCurrentUser?: boolean;
  onSit?: () => void;
  isEmpty: boolean;
  onLeave?: () => void;
  seatNumber: string;
}) {
  useEffect(() => {
    if (!isEmpty && player) {
      console.log(`[PlayerSeat ${seatNumber}] 状态更新:`, {
        gameStatus,
        playerName: player.name,
        isReady: player.isReady,
        isEmpty,
      });
    }
  }, [gameStatus, player, isEmpty, seatNumber]);

  const canSit = isEmpty && (gameStatus === "waiting" || gamePhase === "showdown");

  // 调试信息
  if (!isEmpty && player && (isSmallBlind || isBigBlind)) {
    console.log(
      `[PlayerSeat调试] ${seat} - ${player.name}: 小盲=${isSmallBlind}, 大盲=${isBigBlind}`
    );
  }

  return (
    <div
      className={`player-seat ${isEmpty ? "empty" : "occupied"}`}
      style={{
        ...style,
        cursor: canSit ? "pointer" : "default",
        opacity: isEmpty && gameStatus === "playing" ? 0.5 : 1,
        position: "absolute",
        width: "140px",
        height: "200px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "transparent",
        border: "none",
      }}
      onClick={canSit ? onSit : undefined}
    >
      {/* 顶部标记区域 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "24px",
          display: "flex",
          justifyContent: "center",
          gap: "4px",
          padding: "0 4px",
        }}
      >
        {/* 盲注标记 */}
        {(isSmallBlind || isBigBlind) && !isEmpty && (
          <>
            {isSmallBlind && (
              <div
                style={{
                  background: "#4CAF50",
                  color: "white",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                小盲
              </div>
            )}
            {isBigBlind && (
              <div
                style={{
                  background: "#2196F3",
                  color: "white",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                大盲
              </div>
            )}
          </>
        )}
      </div>

      {/* Dealer 标记 */}
      {isDealer && !isEmpty && (
        <div
          style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            background: "#FFD700",
            color: "#000",
            borderRadius: "50%",
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: "bold",
            border: "2px solid #FFA500",
            zIndex: 3,
          }}
        >
          D
        </div>
      )}

      {/* 头像区域 */}
      <style>{hoverStyle}</style>
      <div
        style={{
          position: "relative",
          width: "80px",
          height: "80px",
          marginTop: "28px",
          cursor: !isEmpty && isCurrentUser && (gameStatus === "waiting" || gamePhase === "showdown") ? "pointer" : "default",
        }}
        onClick={(e) => {
          if (!isEmpty && isCurrentUser && (gameStatus === "waiting" || gamePhase === "showdown")) {
            e.stopPropagation();
            onLeave?.();
          }
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: isCurrentPlayer ? "3px solid #FFD700" : "2px solid #666",
            boxShadow: isCurrentPlayer ? "0 0 15px #FFD700" : "none",
            background: isEmpty ? "rgba(60,60,70,0.6)" : "rgba(0, 0, 0, 0.2)",
            overflow: "hidden",
          }}
        >
          {!isEmpty && player && (
            <>
              <img
                src={`/api/avatar/${player.userId}`}
                alt={player.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: player.status === "folded" ? 0.5 : 1,
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/default-avatar.svg";
                }}
              />
              {/* 可离座时显示提示 - 只在当前用户的座位上显示 */}
              {(gameStatus === "waiting" || gamePhase === "showdown") && isCurrentUser && (
                <div
                  className="hover-overlay"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0, 0, 0, 0.5)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                  }}
                >
                  点击离座
                </div>
              )}
            </>
          )}
          {isEmpty && (
            <div 
              style={{ 
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "#999", 
                fontSize: "14px",
                whiteSpace: "nowrap",
              }}
            >
              {gameStatus === "playing" && gamePhase !== "showdown" ? "游戏中" : "点击落座"}
            </div>
          )}
        </div>
      </div>

      {/* 用户信息区域 */}
      {!isEmpty && player && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.7)",
            borderRadius: "4px",
            padding: "4px 8px",
            textAlign: "center",
            border: "1px solid #666",
            width: "100px",
            marginTop: "8px",
          }}
        >
          <div
            style={{
              color: "#FFD700",
              fontSize: "14px",
              fontWeight: "bold",
              opacity: player.status === "folded" ? 0.5 : 1,
            }}
          >
            {player.name}
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: "12px",
              marginTop: "2px",
            }}
          >
            {player.chips}
          </div>
        </div>
      )}

      {/* 准备状态 */}
      {!isEmpty && gameStatus === "waiting" && (
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            background: player?.isReady ? "#4CAF50" : "#FFA000",
            color: "white",
            padding: "2px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            whiteSpace: "nowrap",
          }}
        >
          {player?.isReady ? "已准备" : "未准备"}
        </div>
      )}

      {/* 下注金额 */}
      {!isEmpty && player && player.currentBet && player.currentBet > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "-25px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.7)",
            color: "#FFD700",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "12px",
            zIndex: 2,
          }}
        >
          {player.currentBet}
        </div>
      )}
    </div>
  );
}
