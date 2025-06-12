import { useState, useEffect } from 'react'

interface UserNameEditorProps {
  name: string
  isEditing: boolean
  onEdit: () => void
  onSave: (name: string) => Promise<void>
  onCancel: () => void
}

export default function UserNameEditor({
  name,
  isEditing,
  onEdit,
  onSave,
  onCancel
}: UserNameEditorProps) {
  const [newName, setNewName] = useState(name)

  useEffect(() => {
    setNewName(name)
  }, [name])

  if (isEditing) {
    return (
      <div className="edit-name">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="输入新的用户名"
        />
        <div className="button-group">
          <button onClick={() => onSave(newName)}>保存</button>
          <button onClick={() => {
            setNewName(name)
            onCancel()
          }}>取消</button>
        </div>
      </div>
    )
  }

  return (
    <div className="name-display">
      <span>用户名: {name}</span>
      <button onClick={onEdit}>修改</button>
    </div>
  )
} 