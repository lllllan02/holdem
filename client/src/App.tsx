import { useState, useEffect } from 'react'
import './App.css'
import type { User } from './types/user'
import PokerTable from './components/PokerTable'
import UserInfoCompact from './components/UserInfoCompact'
import { wsService } from './services/websocket'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [seatedPlayers, setSeatedPlayers] = useState<{ [seat: string]: { name: string; chips: number } }>({})

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

  // 落座功能
  const handleSit = (seat: string) => {
    if (user) {
      setSeatedPlayers(prev => ({
        ...prev,
        [seat]: { name: user.name, chips: 1000 } // 默认给1000筹码
      }))
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
      <PokerTable seatedPlayers={seatedPlayers} onSit={handleSit} />
      <UserInfoCompact user={user} onUpdateName={updateUserName} />
    </div>
  )
}

export default App
