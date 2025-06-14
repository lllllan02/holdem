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
        position: "absolute",
        width: "80px",
        height: "120px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        background: "transparent",
        border: "none",
      }}
      onClick={canSit ? onSit : undefined}
    >
      {/* 头像圆圈 */}
      <div
        style={{
          position: "relative",
          width: "80px",
          height: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
            <img
              src={`/api/avatar/${player.userId}`}
              alt={player.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: player.status === "folded" ? 0.5 : 1,
              }}
            />
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
              {gameStatus === "playing" ? "游戏中" : "点击落座"}
            </div>
          )}
        </div>
      </div>

      {/* 信息框 */}
      {!isEmpty && player && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.7)",
            borderRadius: "4px",
            padding: "4px 8px",
            textAlign: "center",
            border: "1px solid #666",
            width: "100%",
          }}
        >
          <div
            style={{
              color: "#FFD700",
              fontSize: "12px",
              fontWeight: "bold",
              opacity: player.status === "folded" ? 0.5 : 1,
            }}
          >
            {player.name}
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: "11px",
            }}
          >
            {player.chips}
          </div>
        </div>
      )}

      {/* 下注金额 */}
      {!isEmpty && player && player.currentBet && player.currentBet > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.7)",
            color: "#FFD700",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "12px",
            marginTop: "4px",
          }}
        >
          {player.currentBet}
        </div>
      )}

      {/* Dealer 标记 */}
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

      {/* 盲注标记 */}
      {isSmallBlind && !isEmpty && (
        <div
          style={{
            position: "absolute",
            top: "-8px",
            left: isBigBlind ? "-35px" : "-8px",
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
            left: isSmallBlind ? "20px" : "-8px",
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

      {/* 离开按钮 */}
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
    </div>
  );
}
