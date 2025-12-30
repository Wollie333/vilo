import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  Upload,
  Image as ImageIcon,
  Folder,
  Trash2,
  Loader2,
  Search,
  Grid,
  List,
  Check,
  FolderPlus,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'

interface MediaFile {
  id: string
  filename: string
  original_filename: string
  file_url: string
  file_size: number
  mime_type: string
  width: number | null
  height: number | null
  alt_text: string | null
  folder: string
  created_at: string
}

interface MediaFolder {
  name: string
  count: number
}

interface MediaLibraryProps {
  isOpen: boolean
  onClose: () => void
  onSelect?: (file: MediaFile) => void
  multiple?: boolean
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export default function MediaLibrary({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
}: MediaLibraryProps) {
  const { session } = useAuth()
  const [files, setFiles] = useState<MediaFile[]>([])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [editingFile, setEditingFile] = useState<MediaFile | null>(null)
  const [newAltText, setNewAltText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch media files
  const fetchMedia = useCallback(async () => {
    if (!session?.access_token) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedFolder !== 'all') {
        params.set('folder', selectedFolder)
      }

      const response = await fetch(
        `${API_URL}/media?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch media')
      const data = await response.json()
      setFiles(data)
    } catch (error) {
      console.error('Failed to fetch media:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.access_token, selectedFolder])

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    if (!session?.access_token) return

    try {
      const response = await fetch(`${API_URL}/media/folders`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch folders')
      const data = await response.json()
      setFolders(data)
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    }
  }, [session?.access_token])

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMedia()
      fetchFolders()
    }
  }, [isOpen, fetchMedia, fetchFolders])

  // Handle file upload
  const handleUpload = async (uploadFiles: FileList) => {
    if (!session?.access_token || uploadFiles.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(uploadFiles)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', selectedFolder === 'all' ? 'general' : selectedFolder)

        const response = await fetch(`${API_URL}/media/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        })

        if (!response.ok) throw new Error('Upload failed')
      }

      await fetchMedia()
      await fetchFolders()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  // Handle file deletion
  const handleDelete = async (file: MediaFile) => {
    if (!session?.access_token) return
    if (!confirm(`Delete "${file.original_filename}"?`)) return

    try {
      const response = await fetch(`${API_URL}/media/${file.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Delete failed')
      await fetchMedia()
      await fetchFolders()
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  // Handle alt text update
  const handleUpdateAltText = async () => {
    if (!session?.access_token || !editingFile) return

    try {
      const response = await fetch(`${API_URL}/media/${editingFile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ alt_text: newAltText }),
      })

      if (!response.ok) throw new Error('Update failed')
      await fetchMedia()
      setEditingFile(null)
    } catch (error) {
      console.error('Update failed:', error)
    }
  }

  // Handle file selection
  const handleFileClick = (file: MediaFile) => {
    if (multiple) {
      const isSelected = selectedFiles.some((f) => f.id === file.id)
      if (isSelected) {
        setSelectedFiles(selectedFiles.filter((f) => f.id !== file.id))
      } else {
        setSelectedFiles([...selectedFiles, file])
      }
    } else {
      setSelectedFiles([file])
    }
  }

  // Handle insert
  const handleInsert = () => {
    if (onSelect && selectedFiles.length > 0) {
      selectedFiles.forEach((file) => onSelect(file))
      onClose()
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleUpload(droppedFiles)
    }
  }

  // Filter files by search
  const filteredFiles = files.filter(
    (file) =>
      file.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.alt_text && file.alt_text.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{ backgroundColor: 'var(--bg-card)' }}
        className="relative w-[90vw] max-w-5xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border-color)' }}
          className="flex items-center justify-between px-6 py-4 border-b"
        >
          <h2 style={{ color: 'var(--text-primary)' }} className="text-xl font-semibold flex items-center gap-2">
            <ImageIcon size={24} />
            Media Library
          </h2>
          <div className="flex items-center gap-4">
            {selectedFiles.length > 0 && onSelect && (
              <button
                onClick={handleInsert}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Check size={16} />
                Insert {selectedFiles.length > 1 ? `(${selectedFiles.length})` : ''}
              </button>
            )}
            <button
              onClick={onClose}
              style={{ color: 'var(--text-muted)' }}
              className="p-2 rounded-lg hover:opacity-80"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Folders */}
          <div
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
            className="w-48 border-r p-4 flex-shrink-0"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">Folders</h3>
              <button
                style={{ color: 'var(--text-muted)' }}
                className="p-1 rounded hover:opacity-80"
                title="New folder (coming soon)"
              >
                <FolderPlus size={16} />
              </button>
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => setSelectedFolder('all')}
                style={{
                  backgroundColor: selectedFolder === 'all' ? 'var(--bg-tertiary)' : 'transparent',
                  color: selectedFolder === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:opacity-80"
              >
                <Folder size={16} />
                All Files
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.name}
                  onClick={() => setSelectedFolder(folder.name)}
                  style={{
                    backgroundColor: selectedFolder === folder.name ? 'var(--bg-tertiary)' : 'transparent',
                    color: selectedFolder === folder.name ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:opacity-80"
                >
                  <span className="flex items-center gap-2">
                    <Folder size={16} />
                    {folder.name}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }} className="text-xs">{folder.count}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div
              style={{ borderColor: 'var(--border-color)' }}
              className="flex items-center justify-between px-4 py-3 border-b"
            >
              {/* Search */}
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                  <button
                    onClick={() => setViewMode('grid')}
                    style={{
                      backgroundColor: viewMode === 'grid' ? 'var(--bg-tertiary)' : 'transparent',
                      color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                    className="p-2 rounded-l-lg"
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    style={{
                      backgroundColor: viewMode === 'list' ? 'var(--bg-tertiary)' : 'transparent',
                      color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                    className="p-2 rounded-r-lg"
                  >
                    <List size={16} />
                  </button>
                </div>

                {/* Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => e.target.files && handleUpload(e.target.files)}
                  className="hidden"
                />
              </div>
            </div>

            {/* Files Grid/List */}
            <div
              className={`flex-1 overflow-y-auto p-4 ${dragOver ? 'bg-blue-50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={32} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ImageIcon size={48} style={{ color: 'var(--text-muted)' }} className="mb-4" />
                  <p style={{ color: 'var(--text-secondary)' }} className="mb-2">
                    {searchQuery ? 'No files found' : 'No media files yet'}
                  </p>
                  <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                    Drag and drop files here or click Upload
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-4">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedFiles.some((f) => f.id === file.id)
                    const isImage = file.mime_type.startsWith('image/')
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleFileClick(file)}
                        style={{
                          borderColor: isSelected ? 'var(--accent-color, #3b82f6)' : 'var(--border-color)',
                        }}
                        className={`relative group cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                        }`}
                      >
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          {isImage ? (
                            <img
                              src={file.file_url}
                              alt={file.alt_text || file.original_filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-gray-400 text-xs text-center p-2">
                              {file.mime_type.split('/')[1].toUpperCase()}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingFile(file)
                              setNewAltText(file.alt_text || '')
                            }}
                            className="p-2 bg-white rounded-lg hover:bg-gray-100"
                            title="Edit"
                          >
                            <ImageIcon size={16} className="text-gray-700" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(file)
                            }}
                            className="p-2 bg-white rounded-lg hover:bg-gray-100"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </div>
                        <div className="p-2" style={{ backgroundColor: 'var(--bg-card)' }}>
                          <p
                            style={{ color: 'var(--text-primary)' }}
                            className="text-xs truncate"
                            title={file.original_filename}
                          >
                            {file.original_filename}
                          </p>
                          <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                            {formatSize(file.file_size)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedFiles.some((f) => f.id === file.id)
                    const isImage = file.mime_type.startsWith('image/')
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleFileClick(file)}
                        style={{
                          backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-card)',
                          borderColor: 'var(--border-color)',
                        }}
                        className="flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:opacity-90"
                      >
                        <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {isImage ? (
                            <img
                              src={file.file_url}
                              alt={file.alt_text || file.original_filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-gray-400">
                              {file.mime_type.split('/')[1].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: 'var(--text-primary)' }} className="text-sm truncate">
                            {file.original_filename}
                          </p>
                          <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                            {formatSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {isSelected && (
                          <Check size={20} className="text-blue-600 flex-shrink-0" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(file)
                          }}
                          style={{ color: 'var(--text-muted)' }}
                          className="p-2 rounded hover:bg-red-100 hover:text-red-600 flex-shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alt Text Edit Modal */}
        {editingFile && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div
              style={{ backgroundColor: 'var(--bg-card)' }}
              className="w-96 rounded-xl p-6 shadow-xl"
            >
              <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
                Edit Image Details
              </h3>
              <div className="mb-4">
                <img
                  src={editingFile.file_url}
                  alt=""
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
              <div className="mb-4">
                <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-1">
                  Alt Text
                </label>
                <input
                  type="text"
                  value={newAltText}
                  onChange={(e) => setNewAltText(e.target.value)}
                  placeholder="Describe the image..."
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full px-3 py-2 rounded-lg border"
                />
                <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
                  Alt text improves accessibility and SEO
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingFile(null)}
                  style={{ color: 'var(--text-secondary)' }}
                  className="px-4 py-2 rounded-lg hover:opacity-80"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAltText}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
