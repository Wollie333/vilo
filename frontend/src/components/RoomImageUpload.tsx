import { useState, useRef } from 'react'
import { Upload, X, Star, Image as ImageIcon } from 'lucide-react'
import { RoomImage, RoomImages } from '../services/api'

interface RoomImageUploadProps {
  value: RoomImages
  onChange: (images: RoomImages) => void
}

const MAX_GALLERY_IMAGES = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function RoomImageUpload({ value, onChange }: RoomImageUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const featuredInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Only image files are allowed'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB'
    }
    return null
  }

  const fileToImageObject = (file: File): Promise<RoomImage> => {
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

  const handleFeaturedUpload = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    const image = await fileToImageObject(file)
    onChange({ ...value, featured: image })
  }

  const handleGalleryUpload = async (files: FileList) => {
    const currentCount = value.gallery.length
    const remainingSlots = MAX_GALLERY_IMAGES - currentCount

    if (remainingSlots <= 0) {
      setError(`Gallery is full (max ${MAX_GALLERY_IMAGES} images)`)
      return
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots)
    const errors: string[] = []
    const newImages: RoomImage[] = []

    for (const file of filesToProcess) {
      const validationError = validateFile(file)
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`)
        continue
      }
      const image = await fileToImageObject(file)
      newImages.push(image)
    }

    if (errors.length > 0) {
      setError(errors.join(', '))
    } else {
      setError(null)
    }

    if (newImages.length > 0) {
      onChange({ ...value, gallery: [...value.gallery, ...newImages] })
    }
  }

  const removeFeatured = () => {
    onChange({ ...value, featured: null })
  }

  const removeGalleryImage = (index: number) => {
    const newGallery = [...value.gallery]
    newGallery.splice(index, 1)
    onChange({ ...value, gallery: newGallery })
  }

  const promoteToFeatured = (index: number) => {
    const imageToPromote = value.gallery[index]
    const newGallery = [...value.gallery]
    newGallery.splice(index, 1)

    // If there's a current featured image, move it to gallery
    if (value.featured) {
      newGallery.unshift(value.featured)
    }

    onChange({ featured: imageToPromote, gallery: newGallery })
  }

  const handleDrop = (e: React.DragEvent, target: 'featured' | 'gallery') => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      if (target === 'featured') {
        handleFeaturedUpload(files[0])
      } else {
        handleGalleryUpload(files)
      }
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Featured Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Featured Image (1)
        </label>
        {value.featured ? (
          <div className="relative inline-block">
            <img
              src={value.featured.url}
              alt="Featured"
              className="w-48 h-32 object-cover rounded-lg border-2 border-black"
            />
            <button
              type="button"
              onClick={removeFeatured}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black text-white text-xs rounded flex items-center gap-1">
              <Star className="w-3 h-3" /> Featured
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => handleDrop(e, 'featured')}
            onClick={() => featuredInputRef.current?.click()}
            className={`w-48 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragOver ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Upload featured</span>
          </div>
        )}
        <input
          ref={featuredInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFeaturedUpload(e.target.files[0])
            }
          }}
        />
      </div>

      {/* Gallery Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gallery Images ({value.gallery.length}/{MAX_GALLERY_IMAGES})
        </label>
        <div className="flex flex-wrap gap-3">
          {value.gallery.map((image, index) => (
            <div key={image.path} className="relative group">
              <img
                src={image.url}
                alt={`Gallery ${index + 1}`}
                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => promoteToFeatured(index)}
                  className="p-1 bg-white text-black rounded-full hover:bg-gray-100"
                  title="Set as featured"
                >
                  <Star className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeGalleryImage(index)}
                  className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {value.gallery.length < MAX_GALLERY_IMAGES && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => handleDrop(e, 'gallery')}
              onClick={() => galleryInputRef.current?.click()}
              className={`w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                dragOver ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Add</span>
            </div>
          )}
        </div>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleGalleryUpload(e.target.files)
            }
          }}
        />
        <p className="text-xs text-gray-500 mt-2">
          Drag & drop or click to upload. Max 5MB per image. Click star to set as featured.
        </p>
      </div>
    </div>
  )
}
