import { useState, useEffect } from "react";
import "./App.css";
import type { User } from "./types/user";
import PokerTable from "./components/PokerTable";
import UserInfoCompact from "./components/UserInfoCompact";
import { wsService, type GameState, type Player as WSPlayer } from "./services/websocket";

// 将WebSocket的Player转换为本地Player格式
const convertWSPlayerToLocal = (wsPlayer: WSPlayer, _: number) => {
  // 检查是否为空座位
  if (!wsPlayer || wsPlayer.status === "empty" || !wsPlayer.name || wsPlayer.name === "") {
    return undefined;
  }
  
  return {
    name: wsPlayer.name,
    chips: wsPlayer.chips,
    currentBet: wsPlayer.currentBet || 0,
    holeCards: wsPlayer.holeCards || [],
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

  // 开始游戏功能
  const handleStartGame = () => {
    wsService.startGame();
  };

  // 检查是否可以开始游戏
  const canStartGame = () => {
    if (!gameState) return false;
    const sittingPlayersCount = gameState.players.filter(p => p.status !== "empty").length;
    return gameState.gameStatus === "waiting" && sittingPlayersCount >= 2;
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
      return;
    }

    const minRaise = (gameState?.currentBet || 0) + (gameState?.bigBlind || 20);
    if (amount < minRaise) {
      setErrorMessage(`加注金额至少需要 ${minRaise}`);
      return;
    }

    // 检查玩家筹码是否足够
    if (gameState && user) {
      const userPlayerIndex = gameState.players.findIndex(player => player.userId === user.id);
      if (userPlayerIndex !== -1) {
        const userPlayer = gameState.players[userPlayerIndex];
        const raiseAmountNeeded = amount - userPlayer.currentBet;
        if (raiseAmountNeeded > userPlayer.chips) {
          setErrorMessage("筹码不足");
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
        });
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
            zIndex: 1000,
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
        currentUserId={user?.id}
        gameStatus={gameState?.gameStatus || "waiting"}
        communityCards={gameState?.communityCards || []}
        pot={gameState?.pot || 0}
        dealerPos={gameState?.dealerPos || -1}
        currentPlayer={gameState?.currentPlayer || -1}
        smallBlind={gameState?.smallBlind || 10}
        bigBlind={gameState?.bigBlind || 20}
        onSit={handleSit}
        onLeave={handleLeave}
      />
      <UserInfoCompact user={user} onUpdateName={updateUserName} />
      
      {/* 开始游戏按钮 */}
      {canStartGame() && (
        <button
          onClick={handleStartGame}
          style={{
            position: "fixed",
            bottom: "50%",
            left: "50%",
            transform: "translate(-50%, 50%)",
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            zIndex: 10,
            boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
          }}
        >
          开始游戏
        </button>
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
            top: "50%",
            left: "50%",
            transform: "translate(-50%, 80px)",
            background: "rgba(0, 0, 0, 0.9)",
            padding: "20px",
            borderRadius: "12px",
            border: "2px solid #fd7e14",
            zIndex: 15,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            minWidth: "280px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ color: "white", fontSize: "16px", fontWeight: "bold", textAlign: "center" }}>
            选择加注金额
          </div>
          
          <div style={{ color: "#ccc", fontSize: "12px", textAlign: "center" }}>
            最小加注: {getMinRaise()} | 您的筹码: {getCurrentUserChips()}
          </div>
          
          <input
            type="number"
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(e.target.value)}
            min={getMinRaise()}
            max={getCurrentUserChips() + (gameState?.players.find(p => p.userId === user?.id)?.currentBet || 0)}
            style={{
              padding: "12px",
              fontSize: "16px",
              borderRadius: "6px",
              border: "2px solid #fd7e14",
              background: "white",
              textAlign: "center",
              outline: "none",
            }}
            placeholder={`最小 ${getMinRaise()}`}
            autoFocus
            onKeyDown={handleRaiseKeyDown}
          />
          
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={cancelRaise}
              style={{
                flex: 1,
                padding: "10px",
                fontSize: "14px",
                fontWeight: "bold",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              取消
            </button>
            
            <button
              onClick={confirmRaise}
              style={{
                flex: 1,
                padding: "10px",
                fontSize: "14px",
                fontWeight: "bold",
                backgroundColor: "#fd7e14",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              确认加注
            </button>
          </div>
          
          {/* 快捷加注按钮 */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { label: "最小", value: getMinRaise() },
              { label: "2倍底池", value: (gameState?.pot || 0) * 2 },
              { label: "全下", value: getCurrentUserChips() + (gameState?.players.find(p => p.userId === user?.id)?.currentBet || 0) },
            ].map((option, index) => (
              <button
                key={index}
                onClick={() => setRaiseAmount(Math.max(option.value, getMinRaise()).toString())}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: "12px",
                  backgroundColor: "#495057",
                  color: "white",
                  border: "1px solid #6c757d",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
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
        </div>
      )}
    </div>
  );
}

export default App;
