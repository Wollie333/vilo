import { useState, useCallback } from 'react'
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
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  X,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { Menu, MenuItem, WebsitePage } from '../../services/websiteApi'

interface MenuManagerProps {
  menus: Menu[]
  pages: WebsitePage[]
  onChange: (menus: Menu[]) => void
}

// Generate unique ID
const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export default function MenuManager({ menus, pages, onChange }: MenuManagerProps) {
  const [selectedMenuId, setSelectedMenuId] = useState<string>(menus[0]?.id || 'main-nav')
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [newMenuName, setNewMenuName] = useState('')
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['pages'])
  const [selectedPages, setSelectedPages] = useState<string[]>([])
  const [customLinkUrl, setCustomLinkUrl] = useState('')
  const [customLinkLabel, setCustomLinkLabel] = useState('')
  const [customLinkNewTab, setCustomLinkNewTab] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const selectedMenu = menus.find(m => m.id === selectedMenuId) || menus[0]

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Toggle accordion panel
  const togglePanel = (panel: string) => {
    setExpandedPanels(prev =>
      prev.includes(panel) ? prev.filter(p => p !== panel) : [...prev, panel]
    )
  }

  // Toggle menu item expansion
  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }

  // Create new menu
  const handleCreateMenu = () => {
    if (!newMenuName.trim()) return
    const newMenu: Menu = {
      id: `menu-${Date.now()}`,
      name: newMenuName.trim(),
      location: 'header',
      items: []
    }
    onChange([...menus, newMenu])
    setSelectedMenuId(newMenu.id)
    setNewMenuName('')
    setShowCreateMenu(false)
  }

  // Delete menu
  const handleDeleteMenu = () => {
    if (menus.length <= 1) return
    const newMenus = menus.filter(m => m.id !== selectedMenuId)
    onChange(newMenus)
    setSelectedMenuId(newMenus[0].id)
  }

  // Add selected pages to menu
  const handleAddSelectedPages = () => {
    if (!selectedMenu || selectedPages.length === 0) return

    const newItems: MenuItem[] = selectedPages.map(pageType => {
      const page = pages.find(p => p.page_type === pageType)
      return {
        id: generateId(),
        label: page?.title || pageType,
        url: `/${pageType === 'home' ? '' : pageType}`,
        type: 'page' as const,
        pageId: pageType,
        children: []
      }
    })

    const updatedMenu = {
      ...selectedMenu,
      items: [...selectedMenu.items, ...newItems]
    }

    onChange(menus.map(m => m.id === selectedMenuId ? updatedMenu : m))
    setSelectedPages([])
  }

  // Add custom link
  const handleAddCustomLink = () => {
    if (!selectedMenu || !customLinkUrl.trim() || !customLinkLabel.trim()) return

    const newItem: MenuItem = {
      id: generateId(),
      label: customLinkLabel.trim(),
      url: customLinkUrl.trim(),
      type: 'custom',
      openInNewTab: customLinkNewTab,
      children: []
    }

    const updatedMenu = {
      ...selectedMenu,
      items: [...selectedMenu.items, newItem]
    }

    onChange(menus.map(m => m.id === selectedMenuId ? updatedMenu : m))
    setCustomLinkUrl('')
    setCustomLinkLabel('')
    setCustomLinkNewTab(false)
  }

  // Update menu item
  const handleUpdateItem = (itemId: string, updates: Partial<MenuItem>) => {
    if (!selectedMenu) return

    const updateItemRecursive = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, ...updates }
        }
        if (item.children.length > 0) {
          return { ...item, children: updateItemRecursive(item.children) }
        }
        return item
      })
    }

    const updatedMenu = {
      ...selectedMenu,
      items: updateItemRecursive(selectedMenu.items)
    }

    onChange(menus.map(m => m.id === selectedMenuId ? updatedMenu : m))
  }

  // Delete menu item
  const handleDeleteItem = (itemId: string) => {
    if (!selectedMenu) return

    const deleteItemRecursive = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter(item => item.id !== itemId)
        .map(item => ({
          ...item,
          children: deleteItemRecursive(item.children)
        }))
    }

    const updatedMenu = {
      ...selectedMenu,
      items: deleteItemRecursive(selectedMenu.items)
    }

    onChange(menus.map(m => m.id === selectedMenuId ? updatedMenu : m))
  }

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !selectedMenu) return

    const oldIndex = selectedMenu.items.findIndex(item => item.id === active.id)
    const newIndex = selectedMenu.items.findIndex(item => item.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const updatedMenu = {
        ...selectedMenu,
        items: arrayMove(selectedMenu.items, oldIndex, newIndex)
      }
      onChange(menus.map(m => m.id === selectedMenuId ? updatedMenu : m))
    }
  }, [selectedMenu, selectedMenuId, menus, onChange])

  // Update menu location
  const handleLocationChange = (location: 'header' | 'footer' | 'mobile') => {
    if (!selectedMenu) return
    const updatedMenu = { ...selectedMenu, location }
    onChange(menus.map(m => m.id === selectedMenuId ? updatedMenu : m))
  }

  // Update menu name
  const handleMenuNameChange = (name: string) => {
    if (!selectedMenu) return
    const updatedMenu = { ...selectedMenu, name }
    onChange(menus.map(m => m.id === selectedMenuId ? updatedMenu : m))
  }

  if (!selectedMenu) return null

  return (
    <div className="space-y-6">
      {/* Menu Selector */}
      <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Select a menu to edit:
          </label>
          <div className="flex items-center gap-3">
            <select
              value={selectedMenuId}
              onChange={(e) => setSelectedMenuId(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              {menus.map(menu => (
                <option key={menu.id} value={menu.id}>{menu.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowCreateMenu(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Create Menu
            </button>
          </div>
        </div>
      </div>

      {/* Create Menu Modal */}
      {showCreateMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Create a New Menu
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Menu Name
              </label>
              <input
                type="text"
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                placeholder="e.g., Footer Navigation"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateMenu(false)
                  setNewMenuName('')
                }}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMenu}
                disabled={!newMenuName.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Create Menu
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Add Menu Items */}
        <div className="space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Add Menu Items
          </h3>

          {/* Pages Accordion */}
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => togglePanel('pages')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} style={{ color: 'var(--text-secondary)' }} />
                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  Pages
                </span>
              </div>
              {expandedPanels.includes('pages') ? (
                <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
              ) : (
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              )}
            </button>
            {expandedPanels.includes('pages') && (
              <div className="p-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {['home', 'accommodation', 'reviews', 'blog', 'contact', 'book'].map(pageType => (
                    <label key={pageType} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPages.includes(pageType)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPages([...selectedPages, pageType])
                          } else {
                            setSelectedPages(selectedPages.filter(p => p !== pageType))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>
                        {pageType === 'home' ? 'Home' : pageType.charAt(0).toUpperCase() + pageType.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleAddSelectedPages}
                  disabled={selectedPages.length === 0}
                  className="mt-3 w-full px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Add to Menu
                </button>
              </div>
            )}
          </div>

          {/* Custom Links Accordion */}
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => togglePanel('custom')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div className="flex items-center gap-2">
                <ExternalLink size={16} style={{ color: 'var(--text-secondary)' }} />
                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  Custom Links
                </span>
              </div>
              {expandedPanels.includes('custom') ? (
                <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
              ) : (
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              )}
            </button>
            {expandedPanels.includes('custom') && (
              <div className="p-3 border-t space-y-3" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>URL</label>
                  <input
                    type="text"
                    value={customLinkUrl}
                    onChange={(e) => setCustomLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Link Text</label>
                  <input
                    type="text"
                    value={customLinkLabel}
                    onChange={(e) => setCustomLinkLabel(e.target.value)}
                    placeholder="My External Link"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customLinkNewTab}
                    onChange={(e) => setCustomLinkNewTab(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Open in new tab
                  </span>
                </label>
                <button
                  onClick={handleAddCustomLink}
                  disabled={!customLinkUrl.trim() || !customLinkLabel.trim()}
                  className="w-full px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Add to Menu
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Menu Structure */}
        <div className="space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Menu Structure
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Drag items to reorder. Click item to expand and edit.
          </p>

          {selectedMenu.items.length === 0 ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No menu items yet. Add items from the left panel.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={selectedMenu.items.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {selectedMenu.items.map((item) => (
                    <SortableMenuItem
                      key={item.id}
                      item={item}
                      isExpanded={expandedItems.includes(item.id)}
                      onToggle={() => toggleItemExpansion(item.id)}
                      onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Menu Settings */}
      <div
        className="border-t pt-6 mt-6 space-y-4"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Menu Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Menu Name
            </label>
            <input
              type="text"
              value={selectedMenu.name}
              onChange={(e) => handleMenuNameChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Display Location
            </label>
            <div className="flex gap-4">
              {(['header', 'footer', 'mobile'] as const).map(location => (
                <label key={location} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMenu.location === location}
                    onChange={() => handleLocationChange(location)}
                    className="rounded"
                  />
                  <span className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>
                    {location}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        {menus.length > 1 && (
          <button
            onClick={handleDeleteMenu}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Delete Menu
          </button>
        )}
      </div>
    </div>
  )
}

// Sortable Menu Item Component
function SortableMenuItem({
  item,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  depth = 0
}: {
  item: MenuItem
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<MenuItem>) => void
  onDelete: () => void
  depth?: number
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
    marginLeft: `${depth * 24}px`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg overflow-hidden"
    >
      {/* Item Header */}
      <div
        className="flex items-center gap-2 p-3"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical size={16} style={{ color: 'var(--text-muted)' }} />
        </button>

        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 text-left"
        >
          {isExpanded ? (
            <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
          )}
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {item.label}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {item.url}
          </span>
        </button>

        <button
          onClick={onDelete}
          className="p-1 hover:bg-red-100 rounded text-red-500"
        >
          <X size={16} />
        </button>
      </div>

      {/* Expanded Edit Form */}
      {isExpanded && (
        <div
          className="p-4 border-t space-y-3"
          style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Navigation Label
            </label>
            <input
              type="text"
              value={item.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              URL
            </label>
            <input
              type="text"
              value={item.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Title Attribute (tooltip)
            </label>
            <input
              type="text"
              value={item.titleAttribute || ''}
              onChange={(e) => onUpdate({ titleAttribute: e.target.value })}
              placeholder="Optional tooltip text"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          {item.type === 'custom' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.openInNewTab || false}
                onChange={(e) => onUpdate({ openInNewTab: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Open in new tab
              </span>
            </label>
          )}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {item.type === 'page' ? `Page: ${item.pageId}` : 'Custom Link'}
            </span>
            <button
              onClick={onDelete}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
