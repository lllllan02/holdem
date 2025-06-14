import React from "react";
import CommunityCards from "./CommunityCards";
import PlayerSeat from "./PlayerSeat";
import type { Card } from "../services/websocket";
import { getHandName } from "../services/websocket";

// 获取花色符号
function getSuitSymbol(suit: string): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    default: return '';
  }
}

// 获取花色颜色
function getSuitColor(suit: string): string {
  return (suit === 'hearts' || suit === 'diamonds') ? '#ff0000' : '#000000';
}

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
  holeCards?: Card[];
  handRank?: {
    rank: number;
  };
  winAmount?: number;
  status?: string;
}

export default function PokerTable({
  seatedPlayers = {},
  currentUserSeat,
  gameStatus = "waiting",
  gamePhase = "",
  communityCards = [],
  pot = 0,
  dealerPos = -1,
  currentPlayer = -1,
  showdownOrder = [],
  currentShowdown = -1,
  onSit,
  onLeave,
}: {
  seatedPlayers?: { [seat: string]: Player };
  currentUserSeat?: string | null;
  gameStatus?: string;
  gamePhase?: string;
  communityCards?: Card[];
  pot?: number;
  dealerPos?: number;
  currentPlayer?: number;
  showdownOrder?: number[];
  currentShowdown?: number;
  onSit?: (seat: string) => void;
  onLeave?: (seat: string) => void;
}) {
  // 判断是否应该显示某个座位的手牌
  const shouldShowCard = (seatIndex: number) => {
    // 在最终摊牌阶段，只有当玩家有手牌时才显示
    if (gamePhase === "showdown") {
      const player = seatedPlayers[`${seatIndex + 1}`];
      return player && player.holeCards && player.holeCards.length > 0;
    }
    
    // 在逐步摊牌阶段，根据进度显示
    if (gamePhase !== "showdown_reveal") return false;
    
    // 找到该座位在摊牌顺序中的位置
    const orderIndex = showdownOrder.indexOf(seatIndex);
    if (orderIndex === -1) return false; // 不在摊牌顺序中
    
    // 如果当前摊牌进度已经到达或超过该玩家，则显示手牌
    const shouldShow = orderIndex <= currentShowdown;
    
    // 添加调试信息
    console.log(`[摊牌调试] 座位${seatIndex + 1}: gamePhase=${gamePhase}, orderIndex=${orderIndex}, currentShowdown=${currentShowdown}, shouldShow=${shouldShow}`);
    
    return shouldShow;
  };

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
          <CommunityCards cards={communityCards} gameStatus={gameStatus} />
        </div>
        
        {/* 覆盖层 - 隐藏可能的意外显示内容 */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "30%",
            transform: "translate(-50%, -50%)",
            width: "200px",
            height: "100px",
            background: "transparent",
            zIndex: 5,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {/* 这个div用来覆盖任何意外的显示内容 */}
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
              px = width / 2;
              py = height / 2;
          }
          
          // 获取该座位的玩家信息
          const player = seatedPlayers[pos.seat];
          const isCurrentUserSeat = currentUserSeat === pos.seat;
          
          // 计算座位索引（座位1对应索引0）
          const seatIndex = parseInt(pos.seat.replace("座位", "")) - 1;
          
          // 判断各种状态
          let isDealer = dealerPos === seatIndex;
          
          // 计算小盲和大盲位置
          let isSmallBlind = false;
          let isBigBlind = false;
          
          // 添加更多调试信息
          if (seatIndex === 0) { // 只在第一个座位就打印
            console.log(`[调试] gameStatus: ${gameStatus}, dealerPos: ${dealerPos}`);
            console.log(`[调试] seatedPlayers:`, seatedPlayers);
          }
          
          if (gameStatus === "playing") {
            // 获取所有有人的座位索引
            const occupiedSeats = Object.keys(seatedPlayers)
              .map(seat => parseInt(seat.replace("座位", "")) - 1)
              .sort((a, b) => a - b);
            
            const playerCount = occupiedSeats.length;
            
            // 如果dealerPos为-1，使用第一个有人的座位作为庄家
            let actualDealerPos = dealerPos;
            if (dealerPos < 0 && occupiedSeats.length > 0) {
              actualDealerPos = occupiedSeats[0];
              console.log(`[盲注调试] dealerPos为-1，使用第一个有人座位作为庄家: 座位${actualDealerPos + 1}`);
              // 更新庄家标识
              isDealer = actualDealerPos === seatIndex;
            }
            
                                      // 新的盲注逻辑：从座位1开始作为小盲，然后按座位顺序轮流
            // 小盲位置 = 第一个有人的座位（座位1优先）
            // 大盲位置 = 小盲后面的下一个有人座位
            const smallBlindSeat = occupiedSeats[0]; // 第一个有人的座位作为小盲
            const bigBlindSeat = occupiedSeats[1]; // 第二个有人的座位作为大盲
            
            isSmallBlind = seatIndex === smallBlindSeat;
            isBigBlind = seatIndex === bigBlindSeat;
            
            // 调试信息 - 改为在第一个座位就打印
            if (i === 0) { // 只在第一个座位打印一次
              console.log(`[盲注调试] 玩家数量: ${playerCount}, 原始庄家位置: 座位${dealerPos + 1}, 实际庄家位置: 座位${actualDealerPos + 1}`);
              console.log(`[盲注调试] 有人座位:`, occupiedSeats.map(s => `座位${s + 1}`));
              console.log(`[盲注调试] 当前玩家: 座位${currentPlayer + 1}`);
              console.log(`[盲注调试] 当前检查座位: 座位${seatIndex + 1}, isSmallBlind: ${isSmallBlind}, isBigBlind: ${isBigBlind}`);
              console.log(`[盲注调试] 新逻辑 - 小盲: 座位${smallBlindSeat + 1}, 大盲: 座位${bigBlindSeat + 1}`);
            }
          }
          
          const isCurrentPlayerTurn = currentPlayer === seatIndex;
          
          // 检查是否是当前用户的座位
          const isCurrentUser = !!isCurrentUserSeat;
          
          // 计算手牌显示位置（在桌内合适位置）
          let cardX = px;
          let cardY = py;
          
          // 桌子的边界和中心
          const tableMargin = 80; // 距离桌边的距离
          
          if (pos.seat.includes("1") || pos.seat.includes("2")) {
            // 左侧座位：手牌显示在选手右侧，朝向桌子中心
            cardX = margin + tableMargin;
            cardY = py; // 与选手Y坐标对齐
          } else if (pos.seat.includes("6") || pos.seat.includes("7")) {
            // 右侧座位：手牌显示在选手左侧，朝向桌子中心
            cardX = width - margin - tableMargin;
            cardY = py; // 与选手Y坐标对齐
          } else if (pos.seat.includes("3")) {
            // 座位3：手牌显示在选手下方，朝向桌子中心
            cardX = px; // 与选手X坐标对齐
            cardY = margin + tableMargin;
          } else if (pos.seat.includes("4")) {
            // 座位4：手牌显示在选手下方，朝向桌子中心
            cardX = px; // 与选手X坐标对齐
            cardY = margin + tableMargin;
          } else if (pos.seat.includes("5")) {
            // 座位5：手牌显示在选手下方，朝向桌子中心
            cardX = px; // 与选手X坐标对齐
            cardY = margin + tableMargin;
          }

          return (
            <React.Fragment key={i}>
              {/* 桌沿外圈的玩家座位 */}
              <PlayerSeat
                player={player}
                seat={pos.seat}
                gameStatus={gameStatus}
                gamePhase={gamePhase}
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
              
              {/* 手牌显示在桌内 */}
              {player && (
                <div style={{
                  position: "absolute",
                  left: cardX,
                  top: cardY,
                  transform: "translate(-50%, -50%)",
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 3,
                  // 获胜者动画效果
                  ...(player.winAmount && player.winAmount > 0 && gamePhase === "showdown" ? {
                    animation: "winnerGlow 2s ease-in-out infinite",
                    filter: "drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))",
                  } : {}),
                }}>
                  {/* 手牌或弃牌标签 */}
                  {player && player.status === "folded" ? (
                    <div style={{
                      background: "rgba(255, 0, 0, 0.8)",
                      color: "white",
                      padding: "8px 20px",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: "bold",
                      transform: "rotate(-15deg)",
                      border: "2px solid #ff0000",
                      boxShadow: "0 0 15px rgba(255, 0, 0, 0.6)",
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      letterSpacing: "1px",
                      textTransform: "uppercase"
                    }}>
                      弃牌
                    </div>
                  ) : (
                    player.holeCards && player.holeCards.length > 0 && (
                      <div style={{
                        display: 'flex',
                        gap: '3px',
                      }}>
                        {player.holeCards.map((card, index) => (
                          <div
                            key={index}
                            style={{
                              width: '36px',
                              height: '50px',
                              background: (isCurrentUser || (gamePhase === "showdown_reveal" && shouldShowCard(seatIndex)) || gamePhase === "showdown") && card.suit ? 'white' : '#2d3748',
                              border: '1px solid #4a5568',
                              borderRadius: '5px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              boxShadow: '0 3px 6px rgba(0,0,0,0.4)',
                            }}
                          >
                            {(() => {
                              const shouldShow = isCurrentUser || (gamePhase === "showdown_reveal" && shouldShowCard(seatIndex)) || gamePhase === "showdown";
                              const hasCard = card.suit && card.rank;
                              
                              return shouldShow && hasCard ? (
                                <>
                                  <div style={{ color: getSuitColor(card.suit) }}>{card.rank}</div>
                                  <div style={{ color: getSuitColor(card.suit), fontSize: '14px' }}>
                                    {getSuitSymbol(card.suit)}
                                  </div>
                                </>
                              ) : (
                                <div style={{ color: '#a0aec0', fontSize: '16px' }}>?</div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    )
                  )}
                  
                  {/* 牌型显示 - 在摊牌阶段显示 */}
                  {((gamePhase === "showdown_reveal" && shouldShowCard(seatIndex)) || gamePhase === "showdown") && player.handRank && player.status !== "folded" && (
                    <div
                      style={{
                        background: player.winAmount && player.winAmount > 0 ? "rgba(255, 215, 0, 0.9)" : "rgba(76, 175, 80, 0.9)",
                        color: player.winAmount && player.winAmount > 0 ? "#000" : "white",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        boxShadow: player.winAmount && player.winAmount > 0 ? "0 0 15px rgba(255, 215, 0, 0.8)" : "0 2px 6px rgba(0,0,0,0.3)",
                        border: player.winAmount && player.winAmount > 0 ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.3)",
                        animation: player.winAmount && player.winAmount > 0 ? "winnerPulse 1.5s ease-in-out infinite" : "none",
                      }}
                    >
                      {player.winAmount && player.winAmount > 0 ? "🏆 " : ""}{getHandName(player.handRank.rank)}
                    </div>
                  )}
                </div>
              )}

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
