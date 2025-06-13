import { useState, useEffect } from "react";
import "./App.css";
import type { User } from "./types/user";
import PokerTable from "./components/PokerTable";
import UserInfoCompact from "./components/UserInfoCompact";
import { wsService, type GameState, type Player as WSPlayer } from "./services/websocket";

// 将WebSocket的Player转换为本地Player格式
const convertWSPlayerToLocal = (wsPlayer: WSPlayer, seatIndex: number) => {
  // 检查是否为空座位
  if (!wsPlayer || wsPlayer.status === "empty" || !wsPlayer.name || wsPlayer.name === "") {
    return undefined;
  }
  
  return {
    name: wsPlayer.name,
    chips: wsPlayer.chips,
  };
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentUserSeat, setCurrentUserSeat] = useState<string | null>(null);

  // 获取用户信息
  const fetchUser = async () => {
    try {
      const response = await fetch("/api/user");
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
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

  useEffect(() => {
    fetchUser();
    
    // 注册WebSocket回调
    wsService.onGameState((newGameState: GameState) => {
      console.log("Received game state:", newGameState);
      setGameState(newGameState);
    });

    wsService.onError((error: string) => {
      console.error("WebSocket error:", error);
      alert(error); // 显示错误消息
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
      <PokerTable
        seatedPlayers={seatedPlayers}
        currentUserSeat={currentUserSeat}
        gameStatus={gameState?.gameStatus || "waiting"}
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
          <div>在线玩家: {gameState.players.filter(p => p.status !== "empty").length}</div>
        </div>
      )}
    </div>
  );
}

export default App;
