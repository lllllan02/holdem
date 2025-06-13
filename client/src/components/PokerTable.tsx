import React from "react";
import CommunityCards from "./CommunityCards";
import PlayerSeat from "./PlayerSeat";
import type { Card } from "../services/websocket";

const SEAT_POSITIONS = [
  // 7个座位，从左下开始顺时针排列
  // 左侧2人（从下到上）
  { x: 0.07, y: 0.65, seat: "座位1" },
  { x: 0.07, y: 0.35, seat: "座位2" },
  // 上方3人（从左到右）
  { x: 0.25, y: 0.09, seat: "座位3" },
  { x: 0.5, y: 0.09, seat: "座位4" },
  { x: 0.75, y: 0.09, seat: "座位5" },
  // 右侧2人（从上到下）
  { x: 0.93, y: 0.35, seat: "座位6" },
  { x: 0.93, y: 0.65, seat: "座位7" },
];

interface Player {
  name: string;
  chips: number;
  currentBet?: number;
}

export default function PokerTable({
  seatedPlayers = {},
  currentUserSeat,
  gameStatus = "waiting",
  communityCards = [],
  pot = 0,
  dealerPos = -1,
  currentPlayer = -1,
  smallBlind = 10,
  bigBlind = 20,
  onSit,
  onLeave,
}: {
  seatedPlayers?: { [seat: string]: Player };
  currentUserSeat?: string | null;
  gameStatus?: string;
  communityCards?: Card[];
  pot?: number;
  dealerPos?: number;
  currentPlayer?: number;
  smallBlind?: number;
  bigBlind?: number;
  onSit?: (seat: string) => void;
  onLeave?: (seat: string) => void;
}) {
  const width = 900,
    height = 500;
  const margin = 18;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1a1a1a",
        overflow: "hidden",
      }}
    >
      <div
        className="poker-table"
        style={{ width, height, position: "relative" }}
      >
        <svg
          width={width}
          height={height}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          {/* 统一边距 */}
          {(() => {
            const rxRatio = 0.48;
            // 外层为桌沿
            const outerX = 0;
            const outerY = 0;
            const outerW = width;
            const outerH = height;
            const outerRx = outerH * rxRatio;
            const outerRy = outerH * rxRatio;
            // 内层为桌面
            const innerX = margin;
            const innerY = margin;
            const innerW = width - margin * 2;
            const innerH = height - margin * 2;
            const innerRx = innerH * rxRatio;
            const innerRy = innerH * rxRatio;
            return (
              <>
                {/* 桌沿：#00D8A7 */}
                <rect
                  x={outerX}
                  y={outerY}
                  width={outerW}
                  height={outerH}
                  rx={outerRx}
                  ry={outerRy}
                  fill="#00D8A7"
                />
                {/* 桌面：#00A270 */}
                <rect
                  x={innerX}
                  y={innerY}
                  width={innerW}
                  height={innerH}
                  rx={innerRx}
                  ry={innerRy}
                  fill="#00A270"
                />
              </>
            );
          })()}
        </svg>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "38%",
            transform: "translate(-50%, 0)",
            display: "flex",
            gap: "16px",
          }}
        >
          <CommunityCards cards={communityCards} />
        </div>
        
        {/* 底池显示 */}
        {pot > 0 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "60%",
              transform: "translate(-50%, -50%)",
              background: "rgba(255, 215, 0, 0.9)",
              color: "#000",
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "16px",
              fontWeight: "bold",
              border: "2px solid #FFD700",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            底池: {pot}
          </div>
        )}
        {/* 玩家座位放到桌沿外圈，手牌放到桌面内圈 */}
        {SEAT_POSITIONS.map((pos, i) => {
          const cx = width / 2,
            cy = height / 2;

          // 重新设计整齐的布局
          let px, py;

          switch (pos.seat) {
            // 左侧2人（从下到上）
            case "座位1":
              px = -80; // 完全移到桌面外左侧
              py = height * 0.65;
              break;
            case "座位2":
              px = -80; // 完全移到桌面外左侧
              py = height * 0.35;
              break;
            // 上方3人（从左到右）
            case "座位3":
              px = width * 0.25;
              py = -80; // 完全移到桌面外上方
              break;
            case "座位4":
              px = width * 0.5;
              py = -80; // 完全移到桌面外上方
              break;
            case "座位5":
              px = width * 0.75;
              py = -80; // 完全移到桌面外上方
              break;
            // 右侧2人（从上到下）
            case "座位6":
              px = width + 80; // 完全移到桌面外右侧
              py = height * 0.35;
              break;
            case "座位7":
              px = width + 80; // 完全移到桌面外右侧
              py = height * 0.65;
              break;
            default:
              px = cx;
              py = cy;
          }
          // 获取该座位的玩家信息
          const player = seatedPlayers[pos.seat];
          const isCurrentUserSeat = currentUserSeat === pos.seat;
          
          // 计算座位索引（座位1对应索引0）
          const seatIndex = parseInt(pos.seat.replace("座位", "")) - 1;
          
          // 判断各种状态
          const isDealer = dealerPos === seatIndex;
          const isSmallBlind = gameStatus === "playing" && dealerPos >= 0 && 
            ((dealerPos + 1) % 7) === seatIndex;
          const isBigBlind = gameStatus === "playing" && dealerPos >= 0 && 
            ((dealerPos + 2) % 7) === seatIndex;
          const isCurrentPlayerTurn = currentPlayer === seatIndex;

          return (
            <React.Fragment key={i}>
              {/* 桌沿外圈的玩家座位 */}
              <PlayerSeat
                player={player}
                seat={pos.seat}
                gameStatus={gameStatus}
                isDealer={isDealer}
                isSmallBlind={isSmallBlind}
                isBigBlind={isBigBlind}
                isCurrentPlayer={isCurrentPlayerTurn}
                onSit={() => onSit?.(pos.seat)}
                style={{
                  position: "absolute",
                  left: px,
                  top: py,
                  transform: "translate(-50%, -50%)",
                  zIndex: 2,
                }}
              />

              {/* 如果是当前用户的座位，显示离开按钮 */}
              {isCurrentUserSeat && gameStatus === "waiting" && (
                <button
                  onClick={() => onLeave?.(pos.seat)}
                  style={{
                    position: "absolute",
                    // 所有按钮都朝向桌子中心内侧
                    left:
                      pos.seat.includes("1") || pos.seat.includes("2")
                        ? px + 50 // 左侧座位：按钮在右侧（朝内）
                        : pos.seat.includes("6") || pos.seat.includes("7")
                        ? px - 50 // 右侧座位：按钮在左侧（朝内）
                        : px, // 上方座位：按钮在中间
                    top:
                      pos.seat.includes("3") ||
                      pos.seat.includes("4") ||
                      pos.seat.includes("5")
                        ? py + 50 // 上方座位：按钮在下方（朝内）
                        : py, // 左右座位：按钮在中间
                    transform: "translate(-50%, -50%)",
                    // 左侧座位的按钮竖着显示
                    writingMode:
                      pos.seat.includes("1") || pos.seat.includes("2")
                        ? ("vertical-rl" as const)
                        : ("horizontal-tb" as const),
                    zIndex: 3,
                    padding: "4px 8px",
                    fontSize: "12px",
                    backgroundColor: "#ff4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  离开
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
