import { useState } from 'react'
import { Plus, Trash2, X, GripVertical } from 'lucide-react'
import { FooterConfig, FooterColumn, FooterLink } from '../../services/websiteApi'

interface FooterEditorProps {
  config: FooterConfig
  socialLinks: Record<string, string>
  onChange: (config: FooterConfig) => void
  onSocialLinksChange: (links: Record<string, string>) => void
}

const SOCIAL_PLATFORMS = [
  { id: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/your-page' },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/your-handle' },
  { id: 'twitter', label: 'X (Twitter)', placeholder: 'https://twitter.com/your-handle' },
  { id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/...' },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@your-channel' },
  { id: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@your-handle' },
]

export default function FooterEditor({
  config,
  socialLinks,
  onChange,
  onSocialLinksChange,
}: FooterEditorProps) {
  const [editingColumn, setEditingColumn] = useState<number | null>(null)

  const updateConfig = (updates: Partial<FooterConfig>) => {
    onChange({ ...config, ...updates })
  }

  const updateColumn = (index: number, updates: Partial<FooterColumn>) => {
    const newColumns = [...config.columns]
    newColumns[index] = { ...newColumns[index], ...updates }
    updateConfig({ columns: newColumns })
  }

  const addColumn = () => {
    const newColumn: FooterColumn = {
      title: 'New Column',
      links: [{ label: 'Link 1', url: '/' }],
    }
    updateConfig({ columns: [...config.columns, newColumn] })
  }

  const deleteColumn = (index: number) => {
    const newColumns = config.columns.filter((_, i) => i !== index)
    updateConfig({ columns: newColumns })
  }

  const addLink = (columnIndex: number) => {
    const newColumns = [...config.columns]
    newColumns[columnIndex].links.push({ label: 'New Link', url: '/' })
    updateConfig({ columns: newColumns })
  }

  const updateLink = (columnIndex: number, linkIndex: number, updates: Partial<FooterLink>) => {
    const newColumns = [...config.columns]
    newColumns[columnIndex].links[linkIndex] = {
      ...newColumns[columnIndex].links[linkIndex],
      ...updates,
    }
    updateConfig({ columns: newColumns })
  }

  const deleteLink = (columnIndex: number, linkIndex: number) => {
    const newColumns = [...config.columns]
    newColumns[columnIndex].links = newColumns[columnIndex].links.filter((_, i) => i !== linkIndex)
    updateConfig({ columns: newColumns })
  }

  const updateSocialLink = (platform: string, url: string) => {
    onSocialLinksChange({ ...socialLinks, [platform]: url })
  }

  return (
    <div className="space-y-6">
      {/* Show Logo */}
      <div className="flex items-center justify-between">
        <div>
          <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
            Show Logo in Footer
          </label>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs">
            Display your logo at the top of the footer
          </p>
        </div>
        <button
          onClick={() => updateConfig({ show_logo: !config.show_logo })}
          className={`w-12 h-6 rounded-full transition-colors ${
            config.show_logo ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              config.show_logo ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Footer Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
            Footer Description
          </label>
          <button
            onClick={() => updateConfig({ show_description: !config.show_description })}
            className={`w-12 h-6 rounded-full transition-colors ${
              config.show_description ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                config.show_description ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        {config.show_description && (
          <textarea
            value={config.description}
            onChange={(e) => updateConfig({ description: e.target.value })}
            placeholder="A brief description about your business..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        )}
      </div>

      {/* Footer Columns */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
            Footer Columns
          </label>
          <button
            onClick={addColumn}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
          >
            <Plus size={14} />
            Add Column
          </button>
        </div>

        <div className="space-y-4">
          {config.columns.map((column, colIndex) => (
            <div
              key={colIndex}
              className="p-4 rounded-lg border"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <GripVertical size={16} className="text-gray-400" />
                {editingColumn === colIndex ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={column.title}
                      onChange={(e) => updateColumn(colIndex, { title: e.target.value })}
                      className="flex-1 px-2 py-1 text-sm rounded border"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                      autoFocus
                      onBlur={() => setEditingColumn(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingColumn(colIndex)}
                    className="flex-1 text-left"
                  >
                    <span style={{ color: 'var(--text-primary)' }} className="font-medium text-sm">
                      {column.title}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => deleteColumn(colIndex)}
                  className="p-1.5 rounded hover:bg-red-100 transition-colors"
                  title="Delete column"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>

              {/* Links */}
              <div className="space-y-2 ml-6">
                {column.links.map((link, linkIndex) => (
                  <div key={linkIndex} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(colIndex, linkIndex, { label: e.target.value })}
                      placeholder="Label"
                      className="flex-1 px-2 py-1 text-sm rounded border"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => updateLink(colIndex, linkIndex, { url: e.target.value })}
                      placeholder="URL"
                      className="flex-1 px-2 py-1 text-sm rounded border"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      onClick={() => deleteLink(colIndex, linkIndex)}
                      className="p-1 rounded hover:bg-red-100"
                    >
                      <X size={14} className="text-red-500" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addLink(colIndex)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                >
                  <Plus size={12} />
                  Add link
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
              Social Media Links
            </label>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs">
              Add links to display social icons in footer
            </p>
          </div>
          <button
            onClick={() => updateConfig({ show_social_icons: !config.show_social_icons })}
            className={`w-12 h-6 rounded-full transition-colors ${
              config.show_social_icons ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                config.show_social_icons ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {config.show_social_icons && (
          <div className="grid grid-cols-2 gap-3">
            {SOCIAL_PLATFORMS.map((platform) => (
              <div key={platform.id}>
                <label style={{ color: 'var(--text-secondary)' }} className="text-xs block mb-1">
                  {platform.label}
                </label>
                <input
                  type="url"
                  value={socialLinks[platform.id] || ''}
                  onChange={(e) => updateSocialLink(platform.id, e.target.value)}
                  placeholder={platform.placeholder}
                  className="w-full px-2 py-1.5 rounded border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Copyright Text */}
      <div>
        <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-2">
          Copyright Text
        </label>
        <input
          type="text"
          value={config.copyright_text}
          onChange={(e) => updateConfig({ copyright_text: e.target.value })}
          placeholder="© 2024 Your Business Name. All rights reserved."
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
        <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
          Leave empty to auto-generate with your business name
        </p>
      </div>

      {/* Show Powered By */}
      <div className="flex items-center justify-between">
        <div>
          <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
            Show "Powered by Vilo"
          </label>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs">
            Display powered by badge in footer
          </p>
        </div>
        <button
          onClick={() => updateConfig({ show_powered_by: !config.show_powered_by })}
          className={`w-12 h-6 rounded-full transition-colors ${
            config.show_powered_by ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              config.show_powered_by ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
