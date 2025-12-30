import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Copy,
  LayoutTemplate,
  Type,
  Image,
  Star,
  MessageSquare,
  Grid3X3,
  HelpCircle,
  BarChart3,
  Phone,
  MapPin,
  Calendar,
  Minus,
  MoveVertical,
  LucideIcon,
} from 'lucide-react'
import { Section, SectionType } from '../../../services/websiteApi'

interface SectionItemProps {
  section: Section
  onToggle: (id: string, enabled: boolean) => void
  onEdit: (section: Section) => void
  onDelete: (id: string) => void
  onDuplicate: (section: Section) => void
}

// Section type labels and icons
const SECTION_META: Record<SectionType, { label: string; icon: LucideIcon }> = {
  hero: { label: 'Hero Section', icon: LayoutTemplate },
  features: { label: 'Features Grid', icon: Grid3X3 },
  room_grid: { label: 'Room Grid', icon: Grid3X3 },
  room_carousel: { label: 'Room Carousel', icon: Grid3X3 },
  testimonials: { label: 'Testimonials', icon: MessageSquare },
  review_grid: { label: 'Reviews Grid', icon: Star },
  cta: { label: 'Call to Action', icon: Type },
  faq: { label: 'FAQ Accordion', icon: HelpCircle },
  gallery: { label: 'Image Gallery', icon: Image },
  stats: { label: 'Stats Counter', icon: BarChart3 },
  text_block: { label: 'Text Block', icon: Type },
  image_text: { label: 'Image + Text', icon: Image },
  contact_form: { label: 'Contact Form', icon: Phone },
  map: { label: 'Map', icon: MapPin },
  booking_widget: { label: 'Booking Widget', icon: Calendar },
  spacer: { label: 'Spacer', icon: MoveVertical },
  divider: { label: 'Divider', icon: Minus },
}

export default function SectionItem({
  section,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
}: SectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const meta = SECTION_META[section.type] || { label: section.type, icon: Grid3X3 }
  const Icon = meta.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
        isDragging ? 'shadow-lg' : 'hover:shadow-sm'
      } ${!section.enabled ? 'opacity-60' : ''}`}
      {...attributes}
    >
      {/* Drag Handle */}
      <button
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <GripVertical size={20} />
      </button>

      {/* Section Icon */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <Icon size={20} className="text-gray-500" />
      </div>

      {/* Section Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {section.config.title || meta.label}
          </h4>
          {!section.enabled && (
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">
              Hidden
            </span>
          )}
        </div>
        <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
          {meta.label}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Toggle Visibility */}
        <button
          onClick={() => onToggle(section.id, !section.enabled)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: section.enabled ? 'var(--text-secondary)' : 'var(--text-muted)' }}
          title={section.enabled ? 'Hide section' : 'Show section'}
        >
          {section.enabled ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>

        {/* Edit */}
        <button
          onClick={() => onEdit(section)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title="Edit section"
        >
          <Edit3 size={18} />
        </button>

        {/* Duplicate */}
        <button
          onClick={() => onDuplicate(section)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title="Duplicate section"
        >
          <Copy size={18} />
        </button>

        {/* Delete */}
        <button
          onClick={() => {
            if (confirm('Are you sure you want to delete this section?')) {
              onDelete(section.id)
            }
          }}
          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
          title="Delete section"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}
