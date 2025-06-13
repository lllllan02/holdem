import type { Card } from "../services/websocket";

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
}

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
  onSit,
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
  onSit?: () => void;
}) {
  const isEmpty = !player;
  const canSit = isEmpty && gameStatus === "waiting";

  // 调试信息
  if (!isEmpty && (isSmallBlind || isBigBlind)) {
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
        boxShadow: isCurrentPlayer ? "0 0 15px #FFD700" : 
                   (!isEmpty && player?.winAmount && player.winAmount > 0 && gamePhase === "showdown") ? "0 0 20px rgba(255, 215, 0, 0.9)" : "none",
        border: isCurrentPlayer ? "3px solid #FFD700" : 
                (!isEmpty && player?.winAmount && player.winAmount > 0 && gamePhase === "showdown") ? "3px solid #FFD700" : "2px solid #666",
        animation: (!isEmpty && player?.winAmount && player.winAmount > 0 && gamePhase === "showdown") ? "winnerPulse 1.5s ease-in-out infinite" : "none",
        background: (!isEmpty && player?.winAmount && player.winAmount > 0 && gamePhase === "showdown") ? "rgba(255, 215, 0, 0.2)" : 
                   isEmpty ? "rgba(60,60,70,0.6)" : "rgba(255, 215, 0, 0.1)",
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

      {/* 准备状态标识 */}
      {!isEmpty && gameStatus === "waiting" && player.isReady && (
        <div
          style={{
            position: "absolute",
            top: "-8px",
            right: isDealer ? "-35px" : "-8px", // 如果有庄家标识，向左偏移
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
          已准备
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
        <>
          <div 
            className="player-seat-name"
            style={{
              color: (player.winAmount && player.winAmount > 0 && gamePhase === "showdown") ? "#FFD700" : "#FFD700",
              textShadow: (player.winAmount && player.winAmount > 0 && gamePhase === "showdown") ? "0 0 10px rgba(255, 215, 0, 0.8)" : "none",
              fontWeight: (player.winAmount && player.winAmount > 0 && gamePhase === "showdown") ? "bold" : "normal",
            }}
          >
            {(player.winAmount && player.winAmount > 0 && gamePhase === "showdown") ? "🏆 " : ""}{player.name}
          </div>
          
          {/* 显示玩家拥有的筹码 */}
          <div className="player-seat-chips">{player.chips}</div>
          
          {/* 获胜金额显示 */}
          {(player.winAmount && player.winAmount > 0 && gamePhase === "showdown") ? (
            <div
              style={{
                position: "absolute",
                top: "-30px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "linear-gradient(135deg, #FFD700, #FFA500)",
                color: "#000",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
                border: "2px solid #FFD700",
                whiteSpace: "nowrap",
                boxShadow: "0 0 15px rgba(255, 215, 0, 0.6)",
                animation: "winnerPulse 1.5s ease-in-out infinite",
                zIndex: 5,
              }}
            >
              +{player.winAmount}
            </div>
          ) : null}

          {/* 当前下注显示 - 只有当下注大于0时才显示 */}
          {(gameStatus === "playing" && player.currentBet && player.currentBet > 0) ? (
            <div
              style={{
                position: "absolute",
                bottom: "-25px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(255, 215, 0, 0.9)",
                color: "#000",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "bold",
                border: "1px solid #FFD700",
                whiteSpace: "nowrap",
              }}
            >
              下注: {player.currentBet}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
