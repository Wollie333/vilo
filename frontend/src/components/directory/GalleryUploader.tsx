import { useState, useRef } from 'react'
import { Upload, X, Star, GripVertical } from 'lucide-react'

interface GalleryUploaderProps {
  images: string[]
  coverImage: string
  onChange: (images: string[]) => void
  onCoverChange: (url: string) => void
  maxImages?: number
  onUpload: (file: File) => Promise<string>
}

export default function GalleryUploader({
  images,
  coverImage,
  onChange,
  onCoverChange,
  maxImages = 20,
  onUpload
}: GalleryUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (images.length >= maxImages) break

        const url = await onUpload(file)
        const newImages = [...images, url]
        onChange(newImages)

        // Set as cover if it's the first image
        if (!coverImage && newImages.length === 1) {
          onCoverChange(url)
        }
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (urlToRemove: string) => {
    const newImages = images.filter(url => url !== urlToRemove)
    onChange(newImages)

    // If removing cover image, set the first remaining image as cover
    if (coverImage === urlToRemove) {
      onCoverChange(newImages[0] || '')
    }
  }

  const setAsFeatured = (url: string) => {
    onCoverChange(url)
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newImages = [...images]
    const draggedItem = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(index, 0, draggedItem)
    onChange(newImages)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-4">
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((url, index) => (
            <div
              key={url}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-move ${
                coverImage === url
                  ? 'border-accent-500 ring-2 ring-accent-200'
                  : 'border-gray-200 hover:border-gray-300'
              } ${draggedIndex === index ? 'opacity-50' : ''}`}
            >
              <img
                src={url}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Error'
                }}
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setAsFeatured(url)}
                  className={`p-2 rounded-full transition-colors ${
                    coverImage === url
                      ? 'bg-accent-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-accent-500 hover:text-white'
                  }`}
                  title="Set as featured image"
                >
                  <Star size={16} fill={coverImage === url ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="p-2 bg-white text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drag handle */}
              <div className="absolute top-2 left-2 p-1 bg-black/50 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={14} />
              </div>

              {/* Featured badge */}
              {coverImage === url && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-accent-500 text-white text-xs rounded-full">
                  Featured
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-accent-400 hover:bg-accent-50 cursor-pointer transition-colors"
        >
          <Upload size={48} className="text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">Click to upload images</p>
          <p className="text-gray-400 text-xs mt-1">JPEG, PNG, WebP or GIF (max 5MB each)</p>
        </div>
      )}

      {/* Upload button when there are images */}
      {images.length > 0 && images.length < maxImages && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-50 border border-accent-200 rounded-lg text-accent-700 hover:bg-accent-100 hover:border-accent-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-accent-300 border-t-accent-600 rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload More Images
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            {images.length} of {maxImages} images • Drag to reorder • Click star to set featured
          </p>
        </div>
      )}

      {/* Hidden file input for empty state */}
      {images.length === 0 && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      )}

      {/* Uploading overlay for empty state */}
      {uploading && images.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-4 text-accent-600">
          <div className="w-4 h-4 border-2 border-accent-300 border-t-accent-600 rounded-full animate-spin" />
          Uploading...
        </div>
      )}
    </div>
  )
}
