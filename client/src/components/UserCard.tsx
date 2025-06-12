import type { User } from '../types/user'
import UserNameEditor from './UserNameEditor.tsx'
import { useState } from 'react'

interface UserCardProps {
  user: User
  onUpdateName: (name: string) => Promise<void>
}

export default function UserCard({ user, onUpdateName }: UserCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="user-card">
      <h2>用户信息</h2>
      <div className="user-info">
        <UserNameEditor
          name={user.name}
          isEditing={isEditing}
          onEdit={() => setIsEditing(true)}
          onSave={async (name: string) => {
            await onUpdateName(name)
            setIsEditing(false)
          }}
          onCancel={() => setIsEditing(false)}
        />
        <p>创建时间: {new Date(user.created_at).toLocaleString()}</p>
      </div>
    </div>
  )
} 