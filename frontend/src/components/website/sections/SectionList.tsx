import { useState } from 'react'
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
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import SectionItem from './SectionItem'
import SectionEditor from './SectionEditor'
import AddSectionModal from './AddSectionModal'
import { Section, SectionType } from '../../../services/websiteApi'

interface SectionListProps {
  sections: Section[]
  onChange: (sections: Section[]) => void
  pageType?: string
}

// Generate unique ID
const generateId = () => `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Default section configurations
const getDefaultConfig = (type: SectionType) => {
  switch (type) {
    case 'hero':
      return {
        title: 'Welcome',
        subtitle: 'Your perfect stay awaits',
        ctaText: 'Book Now',
        ctaLink: '/book',
        height: 'large' as const,
        alignment: 'center' as const,
      }
    case 'features':
      return {
        title: 'Why Choose Us',
        columns: 3,
        items: [
          { id: '1', icon: 'wifi', title: 'Free WiFi', description: 'High-speed internet' },
          { id: '2', icon: 'car', title: 'Free Parking', description: 'On-site parking' },
          { id: '3', icon: 'coffee', title: 'Breakfast', description: 'Daily breakfast included' },
        ],
      }
    case 'room_grid':
      return {
        title: 'Our Rooms',
        subtitle: 'Find your perfect stay',
        limit: 4,
        layout: 'grid' as const,
      }
    case 'testimonials':
      return {
        title: 'What Our Guests Say',
        limit: 3,
        layout: 'carousel' as const,
      }
    case 'cta':
      return {
        title: 'Ready to Book?',
        subtitle: 'Experience the perfect getaway',
        ctaText: 'Reserve Now',
        ctaLink: '/book',
        alignment: 'center' as const,
      }
    case 'faq':
      return {
        title: 'Frequently Asked Questions',
        items: [
          { id: '1', title: 'What are the check-in times?', description: 'Check-in is from 2 PM, check-out by 10 AM.' },
          { id: '2', title: 'Is breakfast included?', description: 'Yes, a complimentary breakfast is included with all rooms.' },
        ],
      }
    case 'gallery':
      return {
        title: 'Gallery',
        columns: 3,
        layout: 'masonry' as const,
      }
    case 'stats':
      return {
        columns: 4,
        items: [
          { id: '1', title: '500+', description: 'Happy Guests' },
          { id: '2', title: '4.9', description: 'Average Rating' },
          { id: '3', title: '10+', description: 'Years Experience' },
          { id: '4', title: '24/7', description: 'Support' },
        ],
      }
    case 'text_block':
      return {
        title: 'About Us',
        description: 'Write your content here...',
        alignment: 'left' as const,
      }
    case 'contact_form':
      return {
        title: 'Contact Us',
        subtitle: 'Get in touch with us',
      }
    case 'map':
      return {
        title: 'Our Location',
        height: 'medium' as const,
      }
    case 'spacer':
      return {
        height: 'medium' as const,
      }
    case 'divider':
      return {}
    default:
      return {}
  }
}

export default function SectionList({ sections, onChange, pageType }: SectionListProps) {
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id)
      const newIndex = sections.findIndex((s) => s.id === over.id)
      const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
        ...s,
        order: i + 1,
      }))
      onChange(reordered)
    }
  }

  const handleToggle = (id: string, enabled: boolean) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, enabled } : s)))
  }

  const handleEdit = (section: Section) => {
    setEditingSection(section)
  }

  const handleDelete = (id: string) => {
    onChange(sections.filter((s) => s.id !== id))
  }

  const handleDuplicate = (section: Section) => {
    const newSection: Section = {
      ...section,
      id: generateId(),
      order: sections.length + 1,
    }
    onChange([...sections, newSection])
  }

  const handleAddSection = (type: SectionType) => {
    const newSection: Section = {
      id: generateId(),
      type,
      enabled: true,
      order: sections.length + 1,
      config: getDefaultConfig(type),
    }
    onChange([...sections, newSection])
    setShowAddModal(false)
    // Open editor for the new section
    setEditingSection(newSection)
  }

  const handleSaveSection = (updatedSection: Section) => {
    onChange(sections.map((s) => (s.id === updatedSection.id ? updatedSection : s)))
    setEditingSection(null)
  }

  return (
    <div className="space-y-4">
      {/* Section List Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Page Sections
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Drag to reorder. Toggle visibility. Click to edit.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Section
        </button>
      </div>

      {/* Sortable Section List */}
      {sections.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sections
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <SectionItem
                    key={section.id}
                    section={section}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                  />
                ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div
          className="text-center py-12 border-2 border-dashed rounded-xl"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <p style={{ color: 'var(--text-muted)' }} className="mb-4">
            No sections yet. Add your first section to start building.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Section
          </button>
        </div>
      )}

      {/* Add Section Modal */}
      <AddSectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSection}
        pageType={pageType}
      />

      {/* Section Editor Modal */}
      {editingSection && (
        <SectionEditor
          section={editingSection}
          onSave={handleSaveSection}
          onClose={() => setEditingSection(null)}
        />
      )}
    </div>
  )
}
