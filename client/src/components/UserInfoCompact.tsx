import { useState } from 'react'
import type { User } from '../types/user'

interface UserInfoCompactProps {
  user: User
  onUpdateName: (name: string) => Promise<void>
}

export default function UserInfoCompact({ user, onUpdateName }: UserInfoCompactProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingName, setEditingName] = useState('')

  // 开始编辑
  const startEditing = () => {
    setEditingName(user.name)
    setIsEditing(true)
  }

  // 保存编辑
  const saveEditing = async () => {
    if (editingName.trim()) {
      await onUpdateName(editingName.trim())
      setIsEditing(false)
    }
  }

  // 取消编辑
  const cancelEditing = () => {
    setEditingName('')
    setIsEditing(false)
  }

  return (
    <div className="user-info-compact">
      {isEditing ? (
        <>
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="username-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveEditing()
              } else if (e.key === 'Escape') {
                cancelEditing()
              }
            }}
            autoFocus
          />
          <button onClick={saveEditing} className="save-btn">保存</button>
          <button onClick={cancelEditing} className="cancel-btn">取消</button>
        </>
      ) : (
        <>
          <span className="username">{user.name}</span>
          <button onClick={startEditing} className="edit-btn">修改</button>
        </>
      )}
    </div>
  )
} 