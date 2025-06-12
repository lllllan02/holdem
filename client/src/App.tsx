import { useState, useEffect } from 'react'
import './App.css'
import type { User } from './types/user'
import UserCard from './components/UserCard'

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
  }, [])

  if (!user) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="container">
      <UserCard user={user} onUpdateName={updateUserName} />
    </div>
  )
}

export default App
