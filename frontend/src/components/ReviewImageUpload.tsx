import { useState, useRef } from 'react'
import { X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { ReviewImage } from '../services/api'
import { supabase } from '../lib/supabase'

interface ReviewImageUploadProps {
  value: ReviewImage[]
  onChange: (images: ReviewImage[]) => void
  tenantId: string
  maxImages?: number
  disabled?: boolean
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const STORAGE_BUCKET = 'gallery-images'

export default function ReviewImageUpload({
  value,
  onChange,
  tenantId,
  maxImages = 4,
  disabled = false
}: ReviewImageUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Only image files are allowed'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB'
    }
    return null
  }

  const uploadToStorage = async (file: File): Promise<ReviewImage> => {
    // Generate unique filename in reviews subfolder
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const filePath = `${tenantId}/reviews/${fileName}`

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(uploadError.message || 'Failed to upload image')
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath
    }
  }

  const handleUpload = async (files: FileList) => {
    if (disabled) return

    const currentCount = value.length
    const remainingSlots = maxImages - currentCount

    if (remainingSlots <= 0) {
      setError(`Maximum ${maxImages} images allowed`)
      return
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots)
    const errors: string[] = []
    const newImages: ReviewImage[] = []

    setUploading(true)
    setError(null)

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i]
      setUploadProgress(`Uploading ${i + 1} of ${filesToProcess.length}...`)

      const validationError = validateFile(file)
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`)
        continue
      }

      try {
        const image = await uploadToStorage(file)
        newImages.push(image)
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`)
      }
    }

    setUploading(false)
    setUploadProgress(null)

    if (errors.length > 0) {
      setError(errors.join(', '))
    }

    if (newImages.length > 0) {
      onChange([...value, ...newImages])
    }
  }

  const removeImage = async (index: number) => {
    if (disabled) return

    const imageToRemove = value[index]
    // Optionally delete from storage
    if (imageToRemove?.path) {
      try {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([imageToRemove.path])
      } catch (err) {
        console.error('Failed to delete image from storage:', err)
      }
    }
    const newImages = [...value]
    newImages.splice(index, 1)
    onChange(newImages)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {/* Existing images */}
        {value.map((image, index) => (
          <div key={image.path || index} className="relative group">
            <img
              src={image.url}
              alt={`Review image ${index + 1}`}
              className="w-20 h-20 object-cover rounded-lg border border-gray-200"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* Upload button */}
        {value.length < maxImages && !disabled && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragOver ? 'border-accent-500 bg-accent-50' : 'border-gray-300 hover:border-gray-400'
            } ${uploading ? 'opacity-50 cursor-wait' : ''}`}
            style={dragOver ? { borderColor: 'var(--accent)', backgroundColor: 'var(--bg-secondary)' } : undefined}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
              <>
                <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Add</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Progress/help text */}
      <div className="text-xs text-gray-500">
        {uploadProgress ? (
          <span className="text-accent-600">{uploadProgress}</span>
        ) : (
          <span>
            {value.length}/{maxImages} photos • Drag & drop or click to upload • Max 5MB each
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) {
            handleUpload(e.target.files)
            e.target.value = ''
          }
        }}
      />
    </div>
  )
}
