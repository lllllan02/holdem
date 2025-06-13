import { useState, useEffect } from 'react'
import './App.css'
import type { User } from './types/user'
import UserCard from './components/UserCard'
import PokerTable from './components/PokerTable'
import { wsService } from './services/websocket'

const demoPlayers = [
  { name: 'CO', chips: 126.5 },
  { name: 'BTN', chips: 670 },
  { name: 'SB', chips: 49 },
  { name: 'BB', chips: 132 },
  { name: 'UTG', chips: 670 },
  { name: 'UTG+1', chips: 968 },
  { name: 'UTG+2', chips: 670 },
  { name: 'HJ', chips: 260 },
  { name: 'LJ', chips: 269 },
  { name: 'MP', chips: 300 },
];
const demoCommunityCards = ['A♠', 'K♥', '', '', ''];

function App() {
  const [user, setUser] = useState<User | null>(null)

  // 获取用户信息
  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user')
      const data = await response.json()
      setUser(data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  // 更新用户名
  const updateUserName = async (name: string) => {
    try {
      const response = await fetch('/api/user/name', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })
      const data = await response.json()
      setUser(data)
    } catch (error) {
      console.error('Failed to update user name:', error)
    }
  }

  useEffect(() => {
    fetchUser()
    // 初始化 WebSocket 连接
    wsService
  }, [])

  if (!user) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="main-area">
      <PokerTable players={demoPlayers} communityCards={demoCommunityCards} />
      <div className="user-info-float">
        <UserCard user={user} onUpdateName={updateUserName} />
      </div>
    </div>
  )
}

export default App
