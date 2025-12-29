import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { AddOnImage } from '../services/api'

interface AddOnImageUploadProps {
  value: AddOnImage | null
  onChange: (image: AddOnImage | null) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function AddOnImageUpload({ value, onChange }: AddOnImageUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Only image files are allowed'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB'
    }
    return null
  }

  const fileToImageObject = (file: File): Promise<AddOnImage> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          path: `temp/${Date.now()}-${file.name}`,
        })
      }
      reader.readAsDataURL(file)
    })
  }

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    const image = await fileToImageObject(file)
    onChange(image)
  }

  const removeImage = () => {
    onChange(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleUpload(files[0])
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}

      {value ? (
        <div className="relative inline-block">
          <img
            src={value.url}
            alt="Add-on"
            className="w-40 h-40 object-cover rounded-lg border-2"
            style={{ borderColor: 'var(--border-color)' }}
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            borderColor: dragOver ? 'var(--text-primary)' : 'var(--border-color)',
            backgroundColor: dragOver ? 'var(--bg-tertiary)' : 'transparent'
          }}
          className="w-40 h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors hover:opacity-80"
        >
          <Upload style={{ color: 'var(--text-muted)' }} className="w-8 h-8 mb-2" />
          <span style={{ color: 'var(--text-muted)' }} className="text-sm">Upload image</span>
          <span style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">Max 5MB</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleUpload(e.target.files[0])
          }
        }}
      />
      <p style={{ color: 'var(--text-muted)' }} className="text-xs">
        Drag & drop or click to upload. This image will be shown to guests when selecting add-ons.
      </p>
    </div>
  )
}
