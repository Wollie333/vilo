import { useState } from 'react'
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SectionItem } from '../../../../services/websiteApi'

interface ItemsEditorProps {
  items: SectionItem[]
  onChange: (items: SectionItem[]) => void
  itemType: 'feature' | 'faq' | 'stat'
  maxItems?: number
}

const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Icon options for features
const ICON_OPTIONS = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'car', label: 'Parking' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'utensils', label: 'Restaurant' },
  { value: 'pool', label: 'Pool' },
  { value: 'dumbbell', label: 'Gym' },
  { value: 'spa', label: 'Spa' },
  { value: 'tv', label: 'TV' },
  { value: 'air', label: 'AC' },
  { value: 'bed', label: 'Bed' },
  { value: 'bath', label: 'Bath' },
  { value: 'key', label: 'Security' },
  { value: 'clock', label: '24/7' },
  { value: 'star', label: 'Star' },
  { value: 'heart', label: 'Heart' },
  { value: 'check', label: 'Check' },
]

export default function ItemsEditor({
  items,
  onChange,
  itemType,
  maxItems = 10,
}: ItemsEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      onChange(arrayMove(items, oldIndex, newIndex))
    }
  }

  const addItem = () => {
    if (items.length >= maxItems) return
    const newItem: SectionItem = {
      id: generateId(),
      title: getDefaultTitle(itemType, items.length + 1),
      description: getDefaultDescription(itemType),
      icon: itemType === 'feature' ? 'star' : undefined,
    }
    onChange([...items, newItem])
    setExpandedId(newItem.id)
  }

  const updateItem = (id: string, updates: Partial<SectionItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const deleteItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {getItemLabel(itemType)} ({items.length}/{maxItems})
        </label>
        <button
          onClick={addItem}
          disabled={items.length >= maxItems}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <div
          className="text-center py-8 border-2 border-dashed rounded-lg"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No items yet. Click "Add" to create one.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  itemType={itemType}
                  isExpanded={expandedId === item.id}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onUpdate={(updates) => updateItem(item.id, updates)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// Sortable item component
function SortableItem({
  item,
  itemType,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  item: SectionItem
  itemType: 'feature' | 'faq' | 'stat'
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<SectionItem>) => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg overflow-hidden"
      {...attributes}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <button
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} className="text-gray-400" />
        </button>
        <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {item.title || 'Untitled'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Icon (for features) */}
          {itemType === 'feature' && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Icon
              </label>
              <select
                value={item.icon || 'star'}
                onChange={(e) => onUpdate({ icon: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {itemType === 'faq' ? 'Question' : 'Title'}
            </label>
            <input
              type="text"
              value={item.title || ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder={itemType === 'faq' ? 'Enter question...' : 'Enter title...'}
            />
          </div>

          {/* Description (for features and FAQ) */}
          {(itemType === 'feature' || itemType === 'faq') && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                {itemType === 'faq' ? 'Answer' : 'Description'}
              </label>
              <textarea
                value={item.description || ''}
                onChange={(e) => onUpdate({ description: e.target.value })}
                rows={itemType === 'faq' ? 4 : 2}
                className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ borderColor: 'var(--border-color)' }}
                placeholder={itemType === 'faq' ? 'Enter answer...' : 'Enter description...'}
              />
            </div>
          )}

          {/* Stat-specific: just title is used as the number, description as label */}
          {itemType === 'stat' && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Label
              </label>
              <input
                type="text"
                value={item.description || ''}
                onChange={(e) => onUpdate({ description: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ borderColor: 'var(--border-color)' }}
                placeholder="e.g., Happy Guests"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper functions
function getItemLabel(type: 'feature' | 'faq' | 'stat'): string {
  switch (type) {
    case 'feature': return 'Features'
    case 'faq': return 'Questions'
    case 'stat': return 'Stats'
  }
}

function getDefaultTitle(type: 'feature' | 'faq' | 'stat', index: number): string {
  switch (type) {
    case 'feature': return `Feature ${index}`
    case 'faq': return `Question ${index}?`
    case 'stat': return `${index * 100}+`
  }
}

function getDefaultDescription(type: 'feature' | 'faq' | 'stat'): string {
  switch (type) {
    case 'feature': return 'Feature description'
    case 'faq': return 'Answer to the question goes here.'
    case 'stat': return 'Stat Label'
  }
}
