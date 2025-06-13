import { useState, useEffect } from "react";
import "./App.css";
import type { User } from "./types/user";
import PokerTable from "./components/PokerTable";
import UserInfoCompact from "./components/UserInfoCompact";
import { wsService } from "./services/websocket";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [seatedPlayers, setSeatedPlayers] = useState<{
    [seat: string]: { name: string; chips: number };
  }>({});
  const [currentUserSeat, setCurrentUserSeat] = useState<string | null>(null); // 跟踪当前用户的座位

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

  // 落座功能
  const handleSit = (seat: string) => {
    if (user && !currentUserSeat) {
      // 只有当前没有坐在任何座位时才能落座
      setSeatedPlayers((prev) => ({
        ...prev,
        [seat]: { name: user.name, chips: 1000 }, // 默认给1000筹码
      }));
      setCurrentUserSeat(seat);
    }
  };

  // 离开座位功能
  const handleLeave = (seat: string) => {
    setSeatedPlayers((prev) => {
      const newSeatedPlayers = { ...prev };
      delete newSeatedPlayers[seat];
      return newSeatedPlayers;
    });
    setCurrentUserSeat(null);
  };

  useEffect(() => {
    fetchUser();
    // 初始化 WebSocket 连接
    wsService;
  }, []);

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="main-area">
      <PokerTable
        seatedPlayers={seatedPlayers}
        currentUserSeat={currentUserSeat}
        onSit={handleSit}
        onLeave={handleLeave}
      />
      <UserInfoCompact user={user} onUpdateName={updateUserName} />
    </div>
  );
}

export default App;
