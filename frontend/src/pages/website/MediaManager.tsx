import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Folder,
  Trash2,
  Loader2,
  Search,
  Grid,
  List,
  Edit2,
  ExternalLink,
  Copy,
  Check,
  FolderPlus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export default function MediaManager() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [files, setFiles] = useState<MediaFile[]>([])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [editingAltText, setEditingAltText] = useState(false)
  const [newAltText, setNewAltText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState(false)
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

  // Load data
  useEffect(() => {
    fetchMedia()
    fetchFolders()
  }, [fetchMedia, fetchFolders])

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
      if (selectedFile?.id === file.id) {
        setSelectedFile(null)
      }
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  // Handle alt text update
  const handleUpdateAltText = async () => {
    if (!session?.access_token || !selectedFile) return

    try {
      const response = await fetch(`${API_URL}/media/${selectedFile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ alt_text: newAltText }),
      })

      if (!response.ok) throw new Error('Update failed')
      await fetchMedia()
      setSelectedFile({ ...selectedFile, alt_text: newAltText })
      setEditingAltText(false)
    } catch (error) {
      console.error('Update failed:', error)
    }
  }

  // Copy URL to clipboard
  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  // Total storage used
  const totalStorage = files.reduce((acc, file) => acc + file.file_size, 0)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard/website')}
          style={{ color: 'var(--text-secondary)' }}
          className="p-2 rounded-lg hover:opacity-80 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon size={24} />
            Media Library
          </h1>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm mt-1">
            {files.length} files • {formatSize(totalStorage)} used
          </p>
        </div>
      </div>

      <div className="flex gap-6" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Sidebar - Folders */}
        <div
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          className="w-56 border rounded-lg p-4 flex-shrink-0"
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
              <span style={{ color: 'var(--text-muted)' }} className="ml-auto text-xs">{files.length}</span>
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
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className="flex items-center justify-between px-4 py-3 border rounded-t-lg"
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
                Upload Files
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
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className={`flex-1 border-x border-b rounded-b-lg overflow-y-auto p-4 ${
              dragOver ? 'ring-2 ring-blue-500 ring-inset' : ''
            }`}
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
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-4">
                  Drag and drop files here or click Upload Files
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Upload size={16} />
                  Upload Your First File
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {filteredFiles.map((file) => {
                  const isSelected = selectedFile?.id === file.id
                  const isImage = file.mime_type.startsWith('image/')
                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
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
                      <div className="p-2" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <p
                          style={{ color: 'var(--text-primary)' }}
                          className="text-xs truncate"
                          title={file.original_filename}
                        >
                          {file.original_filename}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => {
                  const isSelected = selectedFile?.id === file.id
                  const isImage = file.mime_type.startsWith('image/')
                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      style={{
                        backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
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
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Details Sidebar */}
        {selectedFile && (
          <div
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className="w-72 border rounded-lg p-4 flex-shrink-0 flex flex-col"
          >
            <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-medium mb-4">File Details</h3>

            {/* Preview */}
            <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
              {selectedFile.mime_type.startsWith('image/') ? (
                <img
                  src={selectedFile.file_url}
                  alt={selectedFile.alt_text || selectedFile.original_filename}
                  className="w-full h-40 object-contain"
                />
              ) : (
                <div className="w-full h-40 flex items-center justify-center text-gray-400">
                  {selectedFile.mime_type.split('/')[1].toUpperCase()}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4 flex-1">
              <div>
                <label style={{ color: 'var(--text-muted)' }} className="text-xs block mb-1">Filename</label>
                <p style={{ color: 'var(--text-primary)' }} className="text-sm break-all">
                  {selectedFile.original_filename}
                </p>
              </div>

              <div>
                <label style={{ color: 'var(--text-muted)' }} className="text-xs block mb-1">File size</label>
                <p style={{ color: 'var(--text-primary)' }} className="text-sm">
                  {formatSize(selectedFile.file_size)}
                </p>
              </div>

              {selectedFile.width && selectedFile.height && (
                <div>
                  <label style={{ color: 'var(--text-muted)' }} className="text-xs block mb-1">Dimensions</label>
                  <p style={{ color: 'var(--text-primary)' }} className="text-sm">
                    {selectedFile.width} × {selectedFile.height}
                  </p>
                </div>
              )}

              <div>
                <label style={{ color: 'var(--text-muted)' }} className="text-xs block mb-1">Uploaded</label>
                <p style={{ color: 'var(--text-primary)' }} className="text-sm">
                  {new Date(selectedFile.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Alt Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label style={{ color: 'var(--text-muted)' }} className="text-xs">Alt text</label>
                  {!editingAltText && (
                    <button
                      onClick={() => {
                        setEditingAltText(true)
                        setNewAltText(selectedFile.alt_text || '')
                      }}
                      style={{ color: 'var(--text-muted)' }}
                      className="p-1 rounded hover:opacity-80"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>
                {editingAltText ? (
                  <div className="space-y-2">
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
                      className="w-full px-2 py-1 text-sm rounded border"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateAltText}
                        className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingAltText(false)}
                        style={{ color: 'var(--text-muted)' }}
                        className="px-2 py-1 text-xs hover:opacity-80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: selectedFile.alt_text ? 'var(--text-primary)' : 'var(--text-muted)' }} className="text-sm">
                    {selectedFile.alt_text || 'No alt text'}
                  </p>
                )}
              </div>

              {/* URL */}
              <div>
                <label style={{ color: 'var(--text-muted)' }} className="text-xs block mb-1">URL</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={selectedFile.file_url}
                    readOnly
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                    }}
                    className="flex-1 px-2 py-1 text-xs rounded border-none"
                  />
                  <button
                    onClick={() => copyUrl(selectedFile.file_url)}
                    style={{ color: 'var(--text-muted)' }}
                    className="p-1 rounded hover:opacity-80"
                    title="Copy URL"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                  <a
                    href={selectedFile.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-muted)' }}
                    className="p-1 rounded hover:opacity-80"
                    title="Open in new tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t mt-4" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={() => handleDelete(selectedFile)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={16} />
                Delete File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
