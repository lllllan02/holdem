import { useState, useEffect } from "react";
import "./App.css";
import type { User } from "./types/user";
import PokerTable from "./components/PokerTable";
import UserInfoCompact from "./components/UserInfoCompact";
import { wsService, type GameState, type Player as WSPlayer, getHandName } from "./services/websocket";

// 将WebSocket的Player转换为本地Player格式
const convertWSPlayerToLocal = (wsPlayer: WSPlayer, _: number) => {
  // 检查是否为空座位
  if (!wsPlayer || wsPlayer.status === "empty" || !wsPlayer.name || wsPlayer.name === "") {
    return undefined;
  }
  
  return {
    name: wsPlayer.name,
    chips: wsPlayer.chips,
    currentBet: wsPlayer.currentBet,
    holeCards: wsPlayer.holeCards || [],
    handRank: wsPlayer.handRank,
    winAmount: wsPlayer.winAmount,
  };
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentUserSeat, setCurrentUserSeat] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRaiseInput, setShowRaiseInput] = useState<boolean>(false);
  const [raiseAmount, setRaiseAmount] = useState<string>("");

  // 获取用户信息
  const fetchUser = async () => {
    try {
      const response = await fetch("/api/user");
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setErrorMessage("获取用户信息失败，请刷新页面重试");
    }
  };

  // 更新用户名
  const updateUserName = async (name: string) => {
    try {
      const response = await fetch("/api/user/name", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error("Failed to update user name:", error);
      setErrorMessage("更新用户名失败，请重试");
    }
  };

  // 清除错误消息
  const clearError = () => {
    setErrorMessage(null);
  };

  // 处理加注输入框的键盘事件
  const handleRaiseKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      confirmRaise();
    } else if (e.key === 'Escape') {
      cancelRaise();
    }
  };

  // 落座功能 - 通过WebSocket发送
  const handleSit = (seat: string) => {
    if (user && !currentUserSeat) {
      const seatNumber = parseInt(seat.replace("座位", ""));
      wsService.sitDown(seatNumber);
    }
  };

  // 离开座位功能 - 通过WebSocket发送
  const handleLeave = (seat: string) => {
    const seatNumber = parseInt(seat.replace("座位", ""));
    wsService.leaveSeat(seatNumber);
  };

  // 从游戏状态中提取座位信息
  const getSeatedPlayersFromGameState = () => {
    if (!gameState) return {};
    
    const seatedPlayers: { [seat: string]: { name: string; chips: number } } = {};
    
    gameState.players.forEach((player, index) => {
      const localPlayer = convertWSPlayerToLocal(player, index);
      if (localPlayer) {
        seatedPlayers[`座位${index + 1}`] = localPlayer;
      }
    });
    
    return seatedPlayers;
  };

  // 检查当前用户的座位
  const getCurrentUserSeat = () => {
    if (!gameState || !user) return null;
    
    const userPlayerIndex = gameState.players.findIndex(player => player.userId === user.id);
    if (userPlayerIndex !== -1 && gameState.players[userPlayerIndex].status !== "empty") {
      return `座位${userPlayerIndex + 1}`;
    }
    
    return null;
  };

  // 检查是否轮到当前用户行动
  const isCurrentUserTurn = () => {
    if (!gameState || !user || gameState.currentPlayer < 0) return false;
    const currentPlayer = gameState.players[gameState.currentPlayer];
    return currentPlayer && currentPlayer.userId === user.id;
  };

  // 玩家行动功能
  const handleFold = () => {
    wsService.fold();
  };

  const handleCall = () => {
    wsService.call();
  };

  const handleCheck = () => {
    wsService.check();
  };

  const handleRaise = () => {
    // 显示加注输入框
    const minRaise = (gameState?.currentBet || 0) + (gameState?.bigBlind || 20);
    setRaiseAmount(minRaise.toString());
    setShowRaiseInput(true);
  };

  // 确认加注
  const confirmRaise = () => {
    const amount = parseInt(raiseAmount);
    if (isNaN(amount)) {
      setErrorMessage("请输入有效的数字");
      // 重置为最小加注金额
      setRaiseAmount(getMinRaise().toString());
      return;
    }

    const minRaise = (gameState?.currentBet || 0) + (gameState?.bigBlind || 20);
    if (amount < minRaise) {
      setErrorMessage(`加注金额至少需要 ${minRaise}`);
      // 重置为最小加注金额
      setRaiseAmount(minRaise.toString());
      return;
    }

    // 检查玩家筹码是否足够
    if (gameState && user) {
      const userPlayerIndex = gameState.players.findIndex(player => player.userId === user.id);
      if (userPlayerIndex !== -1) {
        const userPlayer = gameState.players[userPlayerIndex];
        const raiseAmountNeeded = amount - userPlayer.currentBet;
        const maxPossible = userPlayer.chips + userPlayer.currentBet;
        if (raiseAmountNeeded > userPlayer.chips) {
          setErrorMessage(`筹码不足，最多可加注到 ${maxPossible}`);
          // 重置为最大可能的加注金额
          setRaiseAmount(maxPossible.toString());
          return;
        }
      }
    }

    wsService.raise(amount);
    setShowRaiseInput(false);
    setRaiseAmount("");
  };

  // 取消加注
  const cancelRaise = () => {
    setShowRaiseInput(false);
    setRaiseAmount("");
    // 清除可能存在的错误消息
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  // 获取最小加注金额
  const getMinRaise = () => {
    return (gameState?.currentBet || 0) + (gameState?.bigBlind || 20);
  };

  // 获取玩家当前筹码
  const getCurrentUserChips = () => {
    if (!gameState || !user) return 0;
    const userPlayerIndex = gameState.players.findIndex(player => player.userId === user.id);
    if (userPlayerIndex === -1) return 0;
    return gameState.players[userPlayerIndex].chips;
  };

  // 计算跟注金额
  const getCallAmount = () => {
    if (!gameState || !user) return 0;
    const userPlayerIndex = gameState.players.findIndex(player => player.userId === user.id);
    if (userPlayerIndex === -1) return 0;
    const userPlayer = gameState.players[userPlayerIndex];
    return gameState.currentBet - userPlayer.currentBet;
  };

  // 检查是否可以过牌
  const canCheck = () => {
    return getCallAmount() === 0;
  };

  // 获取当前用户的准备状态
  const getCurrentUserReady = () => {
    if (!gameState || !user) return false;
    const userPlayer = gameState.players.find(player => player.userId === user.id);
    return userPlayer?.isReady || false;
  };

  // 获取当前用户的筹码数量
  const getCurrentUserChipsInSeat = () => {
    if (!gameState || !user) return 0;
    const userPlayer = gameState.players.find(player => player.userId === user.id);
    return userPlayer?.chips || 0;
  };

  // 准备游戏
  const handleReady = () => {
    wsService.ready();
  };

  // 取消准备
  const handleUnready = () => {
    wsService.unready();
  };

  // 检查是否可以显示准备按钮
  const canShowReadyButton = () => {
    if (!gameState || !currentUserSeat) return false;
    return gameState.gameStatus === "waiting";
  };

  // 获取准备状态文本
  const getReadyStatusText = () => {
    if (!gameState) return "";
    const readyCount = gameState.players.filter(p => p.status !== "empty" && p.isReady).length;
    const totalCount = gameState.players.filter(p => p.status !== "empty").length;
    if (totalCount === 0) return "";
    return `${readyCount}/${totalCount} 已准备`;
  };

  useEffect(() => {
    fetchUser();
    
    // 注册WebSocket回调
    wsService.onGameState((newGameState: GameState) => {
      console.log("Received game state:", newGameState);
      
      // 添加手牌调试信息
      if (newGameState.players) {
        newGameState.players.forEach((player, index) => {
          if (player.holeCards && player.holeCards.length > 0) {
            console.log(`Player ${index + 1} (${player.name}) has ${player.holeCards.length} hole cards:`, player.holeCards);
          }
          // 添加牌型调试信息
          if (player.handRank) {
            console.log(`Player ${index + 1} (${player.name}) handRank:`, player.handRank);
            console.log(`Player ${index + 1} (${player.name}) handRank.rank:`, player.handRank.rank);
            console.log(`Player ${index + 1} (${player.name}) getHandName result:`, getHandName(player.handRank.rank));
          } else {
            console.log(`Player ${index + 1} (${player.name}) has no handRank`);
          }
        });
      }
      
      // 添加摊牌调试信息
      if (newGameState.gamePhase === "showdown_reveal") {
        console.log(`[摊牌状态] gamePhase: ${newGameState.gamePhase}`);
        console.log(`[摊牌状态] showdownOrder:`, newGameState.showdownOrder);
        console.log(`[摊牌状态] currentShowdown:`, newGameState.currentShowdown);
      }
      setGameState(newGameState);
    });

    wsService.onError((error: string) => {
      console.error("WebSocket error:", error);
      setErrorMessage(error);
      // 3秒后自动清除错误消息
      setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
    });
  }, []);

  // 更新当前用户座位
  useEffect(() => {
    setCurrentUserSeat(getCurrentUserSeat());
  }, [gameState, user]);

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  const seatedPlayers = getSeatedPlayersFromGameState();

  return (
    <div className="main-area">
      {/* 错误提示组件 */}
      {errorMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #ff6b6b, #ee5a52)",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            zIndex: showRaiseInput ? 20 : 1000, // 如果加注面板打开，降低错误提示的层级
            boxShadow: "0 4px 12px rgba(255, 107, 107, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            maxWidth: "400px",
            animation: "slideDown 0.3s ease-out",
          }}
        >
          <span>⚠️</span>
          <span>{errorMessage}</span>
          <button
            onClick={clearError}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              color: "white",
              borderRadius: "50%",
              width: "20px",
              height: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              lineHeight: "1",
            }}
          >
            ×
          </button>
        </div>
      )}
      
      <PokerTable
        seatedPlayers={seatedPlayers}
        currentUserSeat={currentUserSeat}
        gameStatus={gameState?.gameStatus || "waiting"}
        gamePhase={gameState?.gamePhase || ""}
        communityCards={gameState?.communityCards || []}
        pot={gameState?.pot || 0}
        dealerPos={gameState?.dealerPos || -1}
        currentPlayer={gameState?.currentPlayer || -1}
        showdownOrder={gameState?.showdownOrder || []}
        currentShowdown={gameState?.currentShowdown || -1}
        onSit={handleSit}
        onLeave={handleLeave}
      />
      <UserInfoCompact user={user} onUpdateName={updateUserName} />
      
      {/* 倒计时显示 - 使用flexbox居中 */}
      {canShowReadyButton() && gameState?.countdownTimer !== undefined && gameState.countdownTimer > 0 && (
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
            pointerEvents: "none", // 不阻挡其他元素的点击
            zIndex: 11,
          }}
        >
          <div
            style={{
              marginTop: "-50px", // 稍微向上偏移
              background: "rgba(255, 215, 0, 0.95)",
              color: "#000",
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "18px",
              fontWeight: "bold",
              border: "2px solid #FFD700",
              boxShadow: "0 4px 12px rgba(255, 215, 0, 0.5)",
              animation: "pulse 1s infinite",
              whiteSpace: "nowrap",
              pointerEvents: "auto", // 恢复这个元素的点击事件
            }}
          >
            游戏即将开始 {gameState.countdownTimer}
          </div>
        </div>
      )}
      
      {/* 准备/取消准备按钮 */}
      {canShowReadyButton() && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, 80px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            zIndex: 10,
          }}
        >
          {/* 准备状态显示 */}
          {getReadyStatusText() && (
            <div
              style={{
                background: "rgba(0, 0, 0, 0.8)",
                color: "white",
                padding: "4px 12px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "8px",
              }}
            >
              {getReadyStatusText()}
            </div>
          )}
          
          {/* 准备按钮或筹码不足提示 - 固定位置 */}
          {getCurrentUserChipsInSeat() <= 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  background: "rgba(255, 193, 7, 0.9)",
                  color: "#000",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  textAlign: "center",
                  border: "2px solid #FFC107",
                  boxShadow: "0 2px 8px rgba(255, 193, 7, 0.3)",
                }}
              >
                ⚠️ 筹码不足，无法准备
              </div>
              <button
                onClick={() => handleLeave(currentUserSeat!)}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  transition: "all 0.2s ease",
                  minWidth: "120px",
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#5a6268"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#6c757d"}
              >
                离开座位
              </button>
            </div>
          ) : !getCurrentUserReady() ? (
            <button
              onClick={handleReady}
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                transition: "all 0.2s ease",
                minWidth: "120px",
              }}
            >
              准备
            </button>
          ) : (
            <button
              onClick={handleUnready}
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                transition: "all 0.2s ease",
                minWidth: "120px",
              }}
            >
              取消准备
            </button>
          )}
        </div>
      )}
      
      {/* 玩家行动按钮 */}
      {isCurrentUserTurn() && !showRaiseInput && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, 80px)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 10,
          }}
        >
          <button
            onClick={handleFold}
            style={{
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              minWidth: "80px",
            }}
          >
            弃牌
          </button>
          
          {canCheck() ? (
            <button
              onClick={handleCheck}
              style={{
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: "bold",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                minWidth: "80px",
              }}
            >
              过牌
            </button>
          ) : (
            <button
              onClick={handleCall}
              style={{
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: "bold",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                minWidth: "80px",
              }}
            >
              跟注 {getCallAmount()}
            </button>
          )}
          
          <button
            onClick={handleRaise}
            style={{
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: "#fd7e14",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              minWidth: "80px",
            }}
          >
            加注
          </button>
        </div>
      )}
      
      {/* 加注输入界面 */}
      {isCurrentUserTurn() && showRaiseInput && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 15,
          }}
          onClick={cancelRaise} // 点击背景关闭
        >
          <div
            style={{
              background: "rgba(0, 0, 0, 0.95)",
              padding: "24px",
              borderRadius: "16px",
              border: "2px solid #fd7e14",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              minWidth: "320px",
              maxWidth: "400px",
              maxHeight: "90vh", // 限制最大高度
              overflow: "auto", // 添加滚动
              boxShadow: "0 12px 32px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()} // 阻止点击面板内容时关闭
          >
          <div style={{ color: "white", fontSize: "18px", fontWeight: "bold", textAlign: "center" }}>
            选择加注金额
          </div>
          
          <div style={{ 
            color: "#ccc", 
            fontSize: "13px", 
            textAlign: "center",
            background: "rgba(255,255,255,0.1)",
            padding: "8px",
            borderRadius: "8px"
          }}>
            最小加注: {getMinRaise()} | 您的筹码: {getCurrentUserChips()} | 底池: {gameState?.pot || 0}
          </div>
          
          {/* 输入框和滑块 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="number"
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(e.target.value)}
              min={getMinRaise()}
              max={getCurrentUserChips() + (gameState?.players.find(p => p.userId === user?.id)?.currentBet || 0)}
              style={{
                padding: "14px",
                fontSize: "18px",
                borderRadius: "8px",
                border: "2px solid #fd7e14",
                background: "white",
                textAlign: "center",
                outline: "none",
                fontWeight: "bold",
              }}
              placeholder={`最小 ${getMinRaise()}`}
              autoFocus
              onKeyDown={handleRaiseKeyDown}
            />
            
            {/* 滑块控制 */}
            <input
              type="range"
              min={getMinRaise()}
              max={getCurrentUserChips() + (gameState?.players.find(p => p.userId === user?.id)?.currentBet || 0)}
              value={raiseAmount || getMinRaise()}
              onChange={(e) => setRaiseAmount(e.target.value)}
              style={{
                width: "100%",
                height: "6px",
                borderRadius: "3px",
                background: "#ddd",
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>
          
          {/* 快捷加注按钮 - 更多选项 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {[
              { label: "最小", value: getMinRaise() },
              { label: "1/2底池", value: Math.max(Math.floor((gameState?.pot || 0) * 0.5), getMinRaise()) },
              { label: "底池", value: Math.max(gameState?.pot || 0, getMinRaise()) },
              { label: "1.5倍底池", value: Math.max(Math.floor((gameState?.pot || 0) * 1.5), getMinRaise()) },
              { label: "2倍底池", value: Math.max((gameState?.pot || 0) * 2, getMinRaise()) },
              { label: "全下", value: getCurrentUserChips() + (gameState?.players.find(p => p.userId === user?.id)?.currentBet || 0) },
            ].map((option, index) => (
              <button
                key={index}
                onClick={() => setRaiseAmount(option.value.toString())}
                style={{
                  padding: "10px 8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  backgroundColor: parseInt(raiseAmount) === option.value ? "#fd7e14" : "#495057",
                  color: "white",
                  border: parseInt(raiseAmount) === option.value ? "2px solid #ff9500" : "1px solid #6c757d",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  if (parseInt(raiseAmount) !== option.value) {
                    e.currentTarget.style.backgroundColor = "#5a6268";
                  }
                }}
                onMouseOut={(e) => {
                  if (parseInt(raiseAmount) !== option.value) {
                    e.currentTarget.style.backgroundColor = "#495057";
                  }
                }}
              >
                {option.label}
                <div style={{ fontSize: "10px", opacity: 0.8 }}>
                  {option.value}
                </div>
              </button>
            ))}
          </div>
          
          {/* 快速调整按钮 */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
            <button
              onClick={() => {
                const current = parseInt(raiseAmount) || getMinRaise();
                const step = Math.max(10, Math.floor((gameState?.bigBlind || 20) / 2));
                setRaiseAmount(Math.max(current - step, getMinRaise()).toString());
              }}
              style={{
                padding: "8px 12px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              -
            </button>
            <button
              onClick={() => {
                const current = parseInt(raiseAmount) || getMinRaise();
                const step = Math.max(10, Math.floor((gameState?.bigBlind || 20) / 2));
                const maxAmount = getCurrentUserChips() + (gameState?.players.find(p => p.userId === user?.id)?.currentBet || 0);
                setRaiseAmount(Math.min(current + step, maxAmount).toString());
              }}
              style={{
                padding: "8px 12px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>
          
          {/* 确认和取消按钮 */}
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button
              onClick={cancelRaise}
              style={{
                flex: 1,
                padding: "14px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#5a6268"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#6c757d"}
            >
              取消
            </button>
            
            <button
              onClick={confirmRaise}
              style={{
                flex: 2,
                padding: "14px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: "#fd7e14",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(253, 126, 20, 0.3)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#e8690b";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#fd7e14";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              确认加注 {raiseAmount}
            </button>
          </div>
          </div>
        </div>
      )}
      

      
      {/* 摊牌结果显示 */}
      {gameState && gameState.gamePhase === "showdown" && (
        <div style={{
          position: "fixed",
          top: "0",
          left: "0",
          right: "0",
          bottom: "0",
          background: "rgba(0, 0, 0, 0.95)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
        }}>
          <div style={{
            background: "linear-gradient(135deg, #1a1a1a, #2d2d2d)",
            color: "white",
            padding: "40px",
            borderRadius: "20px",
            border: "3px solid #FFD700",
            maxWidth: "800px",
            maxHeight: "90vh",
            overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          }}>
            <div style={{ 
              textAlign: "center", 
              marginBottom: "30px",
            }}>
              <h1 style={{ 
                color: "#FFD700",
                fontSize: "32px",
                fontWeight: "bold",
                margin: "0 0 10px 0",
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
              }}>
                🎉 摊牌结果 🎉
              </h1>
              <div style={{
                fontSize: "18px",
                color: "#4CAF50",
                fontWeight: "500"
              }}>
                底池总额: {gameState.pot} 筹码
              </div>
            </div>
            
            {/* 获胜者区域 */}
            {(() => {
              const winners = gameState.players.filter(p => (p.winAmount || 0) > 0);
              if (winners.length > 0) {
                return (
                  <div style={{ marginBottom: "30px" }}>
                    <h2 style={{
                      color: "#FFD700",
                      fontSize: "24px",
                      textAlign: "center",
                      marginBottom: "20px",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                    }}>
                      🏆 获胜者 🏆
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                      {winners.map((player, index) => (
                        <div key={index} style={{
                          background: "linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.1))",
                          border: "2px solid #FFD700",
                          borderRadius: "15px",
                          padding: "20px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          boxShadow: "0 5px 15px rgba(255, 215, 0, 0.3)"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                            <div style={{
                              fontSize: "24px",
                              fontWeight: "bold",
                              color: "#FFD700"
                            }}>
                              👑 {player.name}
                            </div>
                            
                            {/* 显示手牌 */}
                            {player.holeCards && player.holeCards.length > 0 && (
                              <div style={{ display: "flex", gap: "5px" }}>
                                {player.holeCards.map((card, cardIndex) => (
                                  <div key={cardIndex} style={{
                                    width: "40px",
                                    height: "56px",
                                    background: "white",
                                    border: "2px solid #333",
                                    borderRadius: "6px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
                                  }}>
                                    {card.suit ? (
                                      <>
                                        <div style={{ color: (card.suit === 'hearts' || card.suit === 'diamonds') ? '#ff0000' : '#000000' }}>
                                          {card.rank}
                                        </div>
                                        <div style={{ 
                                          color: (card.suit === 'hearts' || card.suit === 'diamonds') ? '#ff0000' : '#000000',
                                          fontSize: "14px"
                                        }}>
                                          {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                                        </div>
                                      </>
                                    ) : (
                                      <div style={{ color: '#666', fontSize: "14px" }}>?</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {player.handRank && (
                              <div style={{
                                background: "rgba(76, 175, 80, 0.8)",
                                color: "white",
                                padding: "8px 16px",
                                borderRadius: "20px",
                                fontSize: "16px",
                                fontWeight: "bold",
                                boxShadow: "0 2px 8px rgba(76, 175, 80, 0.3)"
                              }}>
                                {getHandName(player.handRank.rank)}
                              </div>
                            )}
                          </div>
                          
                          <div style={{ textAlign: "right" }}>
                            <div style={{
                              fontSize: "24px",
                              fontWeight: "bold",
                              color: "#FFD700",
                              textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                            }}>
                              +{player.winAmount || 0}
                            </div>
                            <div style={{
                              fontSize: "14px",
                              color: "#ccc"
                            }}>
                              总筹码: {player.chips}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* 所有玩家详情 */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{
                color: "#ccc",
                fontSize: "18px",
                textAlign: "center",
                marginBottom: "20px"
              }}>
                所有玩家详情
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {gameState.players
                  .map((player, index) => ({ player, index }))
                  .filter(({ player }) => player.userId && player.status !== "empty")
                  .sort((a, b) => {
                    // 获胜者在前，然后按牌型排序
                    if ((a.player.winAmount || 0) > 0 && (b.player.winAmount || 0) === 0) return -1;
                    if ((a.player.winAmount || 0) === 0 && (b.player.winAmount || 0) > 0) return 1;
                    if (a.player.handRank && b.player.handRank) {
                      return b.player.handRank.rank - a.player.handRank.rank;
                    }
                    return 0;
                  })
                  .map(({ player, index }) => (
                    <div key={index} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "15px",
                      background: player.status === "folded" 
                        ? "rgba(255, 255, 255, 0.05)" 
                        : (player.winAmount || 0) > 0 
                          ? "rgba(255, 215, 0, 0.1)" 
                          : "rgba(255, 255, 255, 0.08)",
                      borderRadius: "10px",
                      border: (player.winAmount || 0) > 0 ? "1px solid #FFD700" : "1px solid #444",
                      opacity: player.status === "folded" ? 0.6 : 1
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <div style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: (player.winAmount || 0) > 0 ? "#FFD700" : "white",
                          minWidth: "100px"
                        }}>
                          {player.name}
                        </div>
                        
                        {/* 显示手牌（摊牌阶段显示所有玩家手牌） */}
                        {player.holeCards && player.holeCards.length > 0 && (
                          <div style={{ display: "flex", gap: "3px" }}>
                            {player.holeCards.map((card, cardIndex) => (
                              <div key={cardIndex} style={{
                                width: "30px",
                                height: "42px",
                                background: "white",
                                border: "1px solid #333",
                                borderRadius: "4px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                fontWeight: "bold",
                                opacity: player.status === "folded" ? 0.7 : 1
                              }}>
                                {card.suit ? (
                                  <>
                                    <div style={{ color: (card.suit === 'hearts' || card.suit === 'diamonds') ? '#ff0000' : '#000000' }}>
                                      {card.rank}
                                    </div>
                                    <div style={{ 
                                      color: (card.suit === 'hearts' || card.suit === 'diamonds') ? '#ff0000' : '#000000',
                                      fontSize: "12px"
                                    }}>
                                      {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ color: '#666', fontSize: "12px" }}>?</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* 显示牌型信息 */}
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {player.status === "folded" && (
                            <div style={{
                              background: "rgba(255, 68, 68, 0.8)",
                              color: "white",
                              padding: "4px 12px",
                              borderRadius: "15px",
                              fontSize: "14px",
                              fontWeight: "500"
                            }}>
                              已弃牌
                            </div>
                          )}
                          {player.handRank && (
                            <div style={{
                              background: player.status === "folded" 
                                ? "rgba(128, 128, 128, 0.6)" 
                                : "rgba(76, 175, 80, 0.6)",
                              color: "white",
                              padding: "4px 12px",
                              borderRadius: "15px",
                              fontSize: "14px",
                              fontWeight: "500"
                            }}>
                              {getHandName(player.handRank.rank)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: "right" }}>
                        {(player.winAmount || 0) > 0 && (
                          <div style={{
                            fontSize: "16px",
                            fontWeight: "bold",
                            color: "#FFD700"
                          }}>
                            +{player.winAmount || 0}
                          </div>
                        )}
                        <div style={{
                          fontSize: "12px",
                          color: "#ccc"
                        }}>
                          筹码: {player.chips}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            {/* 公共牌显示 */}
            {gameState.communityCards && gameState.communityCards.length > 0 && (
              <div style={{ marginBottom: "30px", textAlign: "center" }}>
                <h3 style={{
                  color: "#ccc",
                  fontSize: "16px",
                  marginBottom: "15px"
                }}>
                  公共牌
                </h3>
                <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                  {gameState.communityCards.map((card, index) => (
                    <div key={index} style={{
                      width: "50px",
                      height: "70px",
                      background: "white",
                      border: "2px solid #333",
                      borderRadius: "8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "bold",
                      boxShadow: "0 3px 6px rgba(0,0,0,0.3)"
                    }}>
                      <div style={{ color: (card.suit === 'hearts' || card.suit === 'diamonds') ? '#ff0000' : '#000000' }}>
                        {card.rank}
                      </div>
                      <div style={{ 
                        color: (card.suit === 'hearts' || card.suit === 'diamonds') ? '#ff0000' : '#000000',
                        fontSize: "18px"
                      }}>
                        {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 操作按钮 */}
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => wsService.endGame()}
                style={{
                  padding: "15px 40px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#45a049";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#4CAF50";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                开始新游戏
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 调试信息 */}
      {gameState && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          background: "rgba(0,0,0,0.8)",
          color: "white",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "12px",
          maxWidth: "300px",
        }}>
          <div>游戏状态: {gameState.gameStatus}</div>
          {gameState.gamePhase && <div>游戏阶段: {gameState.gamePhase}</div>}
          <div>在线玩家: {gameState.players.filter(p => p.status !== "empty").length}</div>
          {gameState.pot > 0 && <div>底池: {gameState.pot}</div>}
          {gameState.currentBet > 0 && <div>当前下注: {gameState.currentBet}</div>}
          {gameState.dealerPos >= 0 && <div>庄家位置: 座位{gameState.dealerPos + 1}</div>}
          {gameState.currentPlayer >= 0 && <div>当前玩家: 座位{gameState.currentPlayer + 1}</div>}
          {gameState.countdownTimer !== undefined && gameState.countdownTimer > 0 && <div>倒计时: {gameState.countdownTimer}秒</div>}
          <div>{getReadyStatusText()}</div>
        </div>
      )}
    </div>
  );
}

export default App;
