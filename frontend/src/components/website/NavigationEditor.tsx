import { useState } from 'react'
import { GripVertical, Eye, EyeOff, Pencil, Plus, Trash2, X, Check } from 'lucide-react'
import { NavigationItem } from '../../services/websiteApi'

interface NavigationEditorProps {
  items: NavigationItem[]
  onChange: (items: NavigationItem[]) => void
}

export default function NavigationEditor({ items, onChange }: NavigationEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [showAddNew, setShowAddNew] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const handleToggleEnabled = (id: string) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    )
    onChange(updated)
  }

  const handleStartEdit = (item: NavigationItem) => {
    setEditingId(item.id)
    setEditLabel(item.label)
    setEditUrl(item.url)
  }

  const handleSaveEdit = () => {
    if (!editingId || !editLabel.trim()) return
    const updated = items.map(item =>
      item.id === editingId ? { ...item, label: editLabel.trim(), url: editUrl.trim() } : item
    )
    onChange(updated)
    setEditingId(null)
    setEditLabel('')
    setEditUrl('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditLabel('')
    setEditUrl('')
  }

  const handleDelete = (id: string) => {
    const updated = items.filter(item => item.id !== id)
    onChange(updated)
  }

  const handleAddNew = () => {
    if (!newLabel.trim()) return
    const newItem: NavigationItem = {
      id: `custom-${Date.now()}`,
      label: newLabel.trim(),
      url: newUrl.trim() || '/',
      enabled: true,
      order: items.length + 1,
    }
    onChange([...items, newItem])
    setNewLabel('')
    setNewUrl('')
    setShowAddNew(false)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...items]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    // Update order numbers
    updated.forEach((item, i) => {
      item.order = i + 1
    })
    onChange(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return
    const updated = [...items]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    // Update order numbers
    updated.forEach((item, i) => {
      item.order = i + 1
    })
    onChange(updated)
  }

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {sortedItems.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-lg border transition-colors"
            style={{
              backgroundColor: item.enabled ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
              borderColor: 'var(--border-color)',
              opacity: item.enabled ? 1 : 0.6,
            }}
          >
            {/* Drag Handle & Order */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 15l-6-6-6 6"/>
                </svg>
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === sortedItems.length - 1}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <GripVertical size={16} className="text-gray-400" />
            </div>

            {/* Content */}
            {editingId === item.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Label"
                  className="flex-1 px-2 py-1 text-sm rounded border"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  autoFocus
                />
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="URL"
                  className="flex-1 px-2 py-1 text-sm rounded border"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-1.5 rounded bg-green-500 text-white hover:bg-green-600"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <span style={{ color: 'var(--text-primary)' }} className="font-medium text-sm">
                    {item.label}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }} className="text-xs ml-2">
                    {item.url}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleEnabled(item.id)}
                    className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                    title={item.enabled ? 'Hide from menu' : 'Show in menu'}
                  >
                    {item.enabled ? (
                      <Eye size={16} className="text-green-500" />
                    ) : (
                      <EyeOff size={16} className="text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} className="text-gray-500" />
                  </button>
                  {item.id.startsWith('custom-') && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded hover:bg-red-100 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add New Item */}
      {showAddNew ? (
        <div
          className="flex items-center gap-2 p-3 rounded-lg border"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
        >
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Menu label"
            className="flex-1 px-2 py-1 text-sm rounded border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            autoFocus
          />
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="URL (e.g., /about)"
            className="flex-1 px-2 py-1 text-sm rounded border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={handleAddNew}
            disabled={!newLabel.trim()}
            className="px-3 py-1 text-sm rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowAddNew(false)
              setNewLabel('')
              setNewUrl('')
            }}
            className="p-1.5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddNew(true)}
          className="flex items-center gap-2 w-full p-3 rounded-lg border-2 border-dashed transition-colors hover:border-blue-400 hover:bg-blue-50/50"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
        >
          <Plus size={16} />
          <span className="text-sm">Add menu item</span>
        </button>
      )}
    </div>
  )
}
