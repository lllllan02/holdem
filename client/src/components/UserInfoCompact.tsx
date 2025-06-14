import { useState } from 'react'
import type { User } from '../types/user'
import Avatar from './Avatar'

interface UserInfoCompactProps {
  user: User
  onUpdateName: (name: string) => Promise<void>
  onUpdateAvatar: (file: File) => Promise<void>
}

export default function UserInfoCompact({ user, onUpdateName, onUpdateAvatar }: UserInfoCompactProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState(user.name)

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newName.trim() === '') return
    try {
      await onUpdateName(newName)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update name:', error)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '12px 16px',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 10,
      }}
    >
      <Avatar userId={user.id} size={40} onUpload={onUpdateAvatar} />

      {isEditing ? (
        <form onSubmit={handleNameSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              padding: '4px 8px',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
            }}
            autoFocus
          />
          <button
            type="submit"
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false)
              setNewName(user.name)
            }}
            style={{
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </form>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
            }}
            onClick={() => setIsEditing(true)}
          >
            {user.name}
          </span>
        </div>
      )}
    </div>
  )
} 