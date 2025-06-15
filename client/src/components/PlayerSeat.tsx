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

// 悬停效果样式
const hoverStyle = `
  .hover-overlay {
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .player-seat:hover .hover-overlay {
    opacity: 1;
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
  // 判断是否可以落座
  const canSit =
    isEmpty &&
    (gameStatus === "waiting" || gamePhase === "showdown") &&
    !isCurrentUser;

  useEffect(() => {
    if (isCurrentPlayer) {
      console.log(
        `[当前玩家] 座位${seatNumber}, 玩家:${player?.name}, 状态:${player?.status}`
      );
    }
  }, [isCurrentPlayer, seatNumber, player]);

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
        {/* 大小盲注标记 */}
        {!isEmpty && (isSmallBlind || isBigBlind) && (
          <div
            style={{
              position: "absolute",
              top: "-8px",
              left: "-8px",
              zIndex: 4,
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: isSmallBlind ? "#4CAF50" : "#2196F3",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "bold",
              border: `2px solid ${isSmallBlind ? "#45a049" : "#1976D2"}`,
              boxShadow: `0 2px 4px ${isSmallBlind ? "rgba(76, 175, 80, 0.3)" : "rgba(33, 150, 243, 0.3)"}`,
            }}
          >
            {isSmallBlind ? "小" : "大"}
          </div>
        )}

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
            background: isEmpty ? "rgba(60,60,70,0.6)" : "transparent",
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
