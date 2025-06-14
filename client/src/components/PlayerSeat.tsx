import type { Card } from "../services/websocket";
import { useEffect } from "react";

interface Player {
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

export default function PlayerSeat({
  player,
  seat,
  style = {},
  gameStatus = "waiting",
  isDealer = false,
  isSmallBlind = false,
  isBigBlind = false,
  isCurrentPlayer = false,
  onSit,
  isEmpty,
  onLeave,
  seatNumber,
}: {
  player?: Player;
  seat: string;
  style?: React.CSSProperties;
  gameStatus?: string;
  isDealer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  isCurrentPlayer?: boolean;
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

  const canSit = isEmpty && gameStatus === "waiting";

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
        boxShadow: isCurrentPlayer ? "0 0 15px #FFD700" : "none",
        border: isCurrentPlayer ? "3px solid #FFD700" : "2px solid #666",
        background: isEmpty ? "rgba(60,60,70,0.6)" : "rgba(255, 215, 0, 0.1)",
      }}
      onClick={canSit ? onSit : undefined}
    >
      <div className="player-seat-label">{seat}</div>

      {isDealer && !isEmpty && (
        <div
          style={{
            position: "absolute",
            top: "-10px",
            right: "-10px",
            background: "#FFD700",
            color: "#000",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "bold",
            border: "2px solid #FFA500",
            zIndex: 3,
          }}
        >
          D
        </div>
      )}

      {isSmallBlind && !isEmpty && (
        <div
          style={{
            position: "absolute",
            top: "-8px",
            left: isBigBlind ? "-35px" : "-8px", // 如果同时是大盲，向左偏移
            background: "#4CAF50",
            color: "white",
            borderRadius: "4px",
            padding: "2px 6px",
            fontSize: "10px",
            fontWeight: "bold",
            whiteSpace: "nowrap",
            zIndex: 2,
          }}
        >
          小盲
        </div>
      )}

      {isBigBlind && !isEmpty && (
        <div
          style={{
            position: "absolute",
            top: "-8px",
            left: isSmallBlind ? "20px" : "-8px", // 如果同时是小盲，向右偏移
            background: "#2196F3",
            color: "white",
            borderRadius: "4px",
            padding: "2px 6px",
            fontSize: "10px",
            fontWeight: "bold",
            whiteSpace: "nowrap",
            zIndex: 2,
          }}
        >
          大盲
        </div>
      )}

      {isEmpty ? (
        <div className="player-seat-empty">
          {gameStatus === "playing" ? "游戏中" : "点击落座"}
        </div>
      ) : (
        player && (
          <>
            <div
              className="player-seat-name"
              style={{
                color: "#FFD700",
                opacity: player.status === "folded" ? 0.5 : 1,
              }}
            >
              {player.name}
            </div>
            <div className="player-seat-chips">{player.chips}</div>
            {player.currentBet && player.currentBet > 0 && (
              <div className="player-bet-amount">{player.currentBet}</div>
            )}
            {!isEmpty && gameStatus === "waiting" && onLeave && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onLeave();
                }}
                style={{
                  position: "absolute",
                  bottom: "-20px",
                  right: "0",
                  background: "#F44336",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                离开
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
