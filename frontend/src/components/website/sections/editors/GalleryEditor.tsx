import { useState } from 'react'
import {
  Plus,
  Trash2,
  GripVertical,
  Image,
  X,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface GalleryImage {
  id: string
  url: string
  alt?: string
  caption?: string
}

interface GalleryEditorProps {
  images: GalleryImage[]
  onChange: (images: GalleryImage[]) => void
  maxImages?: number
}

const generateId = () => `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export default function GalleryEditor({
  images,
  onChange,
  maxImages = 12,
}: GalleryEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id)
      const newIndex = images.findIndex((img) => img.id === over.id)
      onChange(arrayMove(images, oldIndex, newIndex))
    }
  }

  const addImage = () => {
    if (images.length >= maxImages) return
    const newImage: GalleryImage = {
      id: generateId(),
      url: '',
      alt: '',
      caption: '',
    }
    onChange([...images, newImage])
    setEditingId(newImage.id)
  }

  const updateImage = (id: string, updates: Partial<GalleryImage>) => {
    onChange(images.map((img) => (img.id === id ? { ...img, ...updates } : img)))
  }

  const deleteImage = (id: string) => {
    onChange(images.filter((img) => img.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const editingImage = editingId ? images.find((img) => img.id === editingId) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Gallery Images ({images.length}/{maxImages})
        </label>
        <button
          onClick={addImage}
          disabled={images.length >= maxImages}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={14} />
          Add Image
        </button>
      </div>

      {images.length === 0 ? (
        <div
          className="text-center py-12 border-2 border-dashed rounded-lg"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Image size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No images yet. Click "Add Image" to start building your gallery.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-3 gap-3">
              {images.map((image) => (
                <SortableImage
                  key={image.id}
                  image={image}
                  onEdit={() => setEditingId(image.id)}
                  onDelete={() => deleteImage(image.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit Image Modal */}
      {editingImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setEditingId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Edit Image
              </h3>
              <button
                onClick={() => setEditingId(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Preview */}
              {editingImage.url ? (
                <img
                  src={editingImage.url}
                  alt={editingImage.alt || 'Preview'}
                  className="w-full h-40 object-cover rounded-lg"
                />
              ) : (
                <div
                  className="w-full h-40 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <Image size={40} className="text-gray-300" />
                </div>
              )}

              {/* URL */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Image URL
                </label>
                <input
                  type="text"
                  value={editingImage.url || ''}
                  onChange={(e) => updateImage(editingImage.id, { url: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ borderColor: 'var(--border-color)' }}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Alt Text <span className="text-gray-400">(for accessibility)</span>
                </label>
                <input
                  type="text"
                  value={editingImage.alt || ''}
                  onChange={(e) => updateImage(editingImage.id, { alt: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ borderColor: 'var(--border-color)' }}
                  placeholder="Describe the image..."
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Caption <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editingImage.caption || ''}
                  onChange={(e) => updateImage(editingImage.id, { caption: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ borderColor: 'var(--border-color)' }}
                  placeholder="Image caption..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SortableImage({
  image,
  onEdit,
  onDelete,
}: {
  image: GalleryImage
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-square rounded-lg overflow-hidden border"
      {...attributes}
    >
      {image.url ? (
        <img
          src={image.url}
          alt={image.alt || 'Gallery image'}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <Image size={24} className="text-gray-300" />
        </div>
      )}

      {/* Overlay with actions */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
        <button
          {...listeners}
          className="p-2 rounded-lg bg-white/90 hover:bg-white cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical size={16} className="text-gray-700" />
        </button>
        <button
          onClick={onEdit}
          className="p-2 rounded-lg bg-white/90 hover:bg-white transition-colors"
        >
          <Image size={16} className="text-gray-700" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg bg-white/90 hover:bg-white transition-colors"
        >
          <Trash2 size={16} className="text-red-500" />
        </button>
      </div>
    </div>
  )
}
