import { useState } from 'react'
import { StickyNote, Plus, Edit2, Trash2, User, Check, X } from 'lucide-react'

interface Note {
  id: string
  content: string
  created_by: string
  created_at: string
  updated_at?: string
}

interface NotesSectionProps {
  notes: Note[]
  currentUserName?: string
  onAddNote?: (content: string) => Promise<void>
  onUpdateNote?: (id: string, content: string) => Promise<void>
  onDeleteNote?: (id: string) => Promise<void>
}

export default function NotesSection({
  notes,
  currentUserName: _currentUserName,
  onAddNote,
  onUpdateNote,
  onDeleteNote
}: NotesSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [saving, setSaving] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !onAddNote) return

    try {
      setSaving(true)
      await onAddNote(newNoteContent.trim())
      setNewNoteContent('')
      setIsAdding(false)
    } catch (error) {
      console.error('Failed to add note:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateNote = async (id: string) => {
    if (!editingContent.trim() || !onUpdateNote) return

    try {
      setSaving(true)
      await onUpdateNote(id, editingContent.trim())
      setEditingNoteId(null)
      setEditingContent('')
    } catch (error) {
      console.error('Failed to update note:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = async (id: string) => {
    if (!onDeleteNote) return

    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      await onDeleteNote(id)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id)
    setEditingContent(note.content)
  }

  const cancelEditing = () => {
    setEditingNoteId(null)
    setEditingContent('')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Internal Notes</h3>
        {onAddNote && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-sm text-accent-600 hover:text-accent-700 font-medium"
          >
            <Plus size={14} />
            Add Note
          </button>
        )}
      </div>

      {/* Add Note Form */}
      {isAdding && (
        <div className="p-4 bg-accent-50 border border-accent-100 rounded-xl">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Write a note about this customer..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => { setIsAdding(false); setNewNoteContent('') }}
              disabled={saving}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={saving || !newNoteContent.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-accent-600 hover:bg-accent-700 font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 && !isAdding ? (
        <div className="py-16 text-center">
          <StickyNote size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No notes yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Add internal notes about this customer
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-4 bg-amber-50 border border-amber-100 rounded-xl"
            >
              {editingNoteId === note.id ? (
                <>
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 resize-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={cancelEditing}
                      disabled={saving}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={saving || !editingContent.trim()}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-accent-600 hover:text-accent-700 font-medium disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-accent-600/30 border-t-accent-600 rounded-full animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-200/50">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User size={12} />
                      <span>{note.created_by}</span>
                      <span className="text-gray-300">•</span>
                      <span>{formatDate(note.created_at)}</span>
                      {note.updated_at && note.updated_at !== note.created_at && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="italic">edited</span>
                        </>
                      )}
                    </div>
                    {(onUpdateNote || onDeleteNote) && (
                      <div className="flex items-center gap-1">
                        {onUpdateNote && (
                          <button
                            onClick={() => startEditing(note)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-amber-100"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {onDeleteNote && (
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-amber-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
