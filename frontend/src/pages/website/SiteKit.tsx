import { useState, useEffect } from 'react'
import { ArrowLeft, Palette, Type, Square, Maximize, Save, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { websiteSettingsApi, GlobalStyles, GlobalColors, GlobalTypography, GlobalButtons, GlobalSpacing } from '../../services/websiteApi'

type TabType = 'colors' | 'typography' | 'buttons' | 'spacing'

const FONT_OPTIONS = [
  'Inter',
  'Playfair Display',
  'Poppins',
  'Open Sans',
  'Roboto',
  'Lato',
  'Montserrat',
  'Raleway',
  'Nunito',
  'Source Sans Pro',
  'Oswald',
  'Cormorant Garamond',
  'Merriweather',
  'DM Sans',
  'Work Sans'
]

const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#10b981',
    headingText: '#1f2937',
    bodyText: '#4b5563',
    mutedText: '#9ca3af',
    background: '#ffffff',
    sectionBg: '#f9fafb',
    cardBg: '#ffffff',
    borderColor: '#e5e7eb'
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseFontSize: 16,
    lineHeight: 1.6,
    headings: {
      h1: { size: 48, weight: 700, lineHeight: 1.2 },
      h2: { size: 36, weight: 600, lineHeight: 1.3 },
      h3: { size: 28, weight: 600, lineHeight: 1.4 },
      h4: { size: 22, weight: 500, lineHeight: 1.4 },
      h5: { size: 18, weight: 500, lineHeight: 1.5 },
      h6: { size: 16, weight: 500, lineHeight: 1.5 }
    }
  },
  buttons: {
    primary: {
      background: '#2563eb',
      text: '#ffffff',
      border: '#2563eb',
      hoverBg: '#1d4ed8',
      radius: 8,
      paddingY: 12,
      paddingX: 24
    },
    secondary: {
      background: 'transparent',
      text: '#2563eb',
      border: '#2563eb',
      hoverBg: '#eff6ff',
      radius: 8,
      paddingY: 12,
      paddingX: 24
    }
  },
  spacing: {
    sectionPaddingY: 80,
    containerMaxWidth: 1200,
    elementGap: 24,
    cardPadding: 24,
    cardRadius: 12
  }
}

export default function SiteKit() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('colors')
  const [globalStyles, setGlobalStyles] = useState<GlobalStyles>(DEFAULT_GLOBAL_STYLES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const settings = await websiteSettingsApi.get()
      if (settings.global_styles) {
        setGlobalStyles(settings.global_styles)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await websiteSettingsApi.update({ global_styles: globalStyles })
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setGlobalStyles(DEFAULT_GLOBAL_STYLES)
    setHasChanges(true)
  }

  const updateColors = (updates: Partial<GlobalColors>) => {
    setGlobalStyles(prev => ({
      ...prev,
      colors: { ...prev.colors, ...updates }
    }))
    setHasChanges(true)
  }

  const updateTypography = (updates: Partial<GlobalTypography>) => {
    setGlobalStyles(prev => ({
      ...prev,
      typography: { ...prev.typography, ...updates }
    }))
    setHasChanges(true)
  }

  const updateButtons = (updates: Partial<GlobalButtons>) => {
    setGlobalStyles(prev => ({
      ...prev,
      buttons: { ...prev.buttons, ...updates }
    }))
    setHasChanges(true)
  }

  const updateSpacing = (updates: Partial<GlobalSpacing>) => {
    setGlobalStyles(prev => ({
      ...prev,
      spacing: { ...prev.spacing, ...updates }
    }))
    setHasChanges(true)
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'colors', label: 'Colors', icon: <Palette size={18} /> },
    { id: 'typography', label: 'Typography', icon: <Type size={18} /> },
    { id: 'buttons', label: 'Buttons', icon: <Square size={18} /> },
    { id: 'spacing', label: 'Spacing', icon: <Maximize size={18} /> }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/website')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Site Kit - Global Styles
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Define global colors, typography, and spacing. Widgets automatically inherit these styles.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <RotateCcw size={16} />
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent hover:border-gray-300'
              }`}
              style={{ color: activeTab === tab.id ? undefined : 'var(--text-secondary)' }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-color)' }}>
        {activeTab === 'colors' && (
          <ColorsTab colors={globalStyles.colors} onChange={updateColors} />
        )}
        {activeTab === 'typography' && (
          <TypographyTab typography={globalStyles.typography} onChange={updateTypography} />
        )}
        {activeTab === 'buttons' && (
          <ButtonsTab buttons={globalStyles.buttons} onChange={updateButtons} />
        )}
        {activeTab === 'spacing' && (
          <SpacingTab spacing={globalStyles.spacing} onChange={updateSpacing} />
        )}
      </div>
    </div>
  )
}

// ============================================
// COLORS TAB
// ============================================

function ColorsTab({ colors, onChange }: { colors: GlobalColors; onChange: (c: Partial<GlobalColors>) => void }) {
  const colorGroups = [
    {
      title: 'Primary Colors',
      items: [
        { key: 'primary', label: 'Primary', description: 'Main brand color for buttons, links' },
        { key: 'secondary', label: 'Secondary', description: 'Supporting color for secondary elements' },
        { key: 'accent', label: 'Accent', description: 'Highlight color for badges, notifications' }
      ]
    },
    {
      title: 'Text Colors',
      items: [
        { key: 'headingText', label: 'Heading Text', description: 'Color for H1-H6 headings' },
        { key: 'bodyText', label: 'Body Text', description: 'Default paragraph text color' },
        { key: 'mutedText', label: 'Muted Text', description: 'Captions, placeholders, subtle text' }
      ]
    },
    {
      title: 'Background Colors',
      items: [
        { key: 'background', label: 'Page Background', description: 'Main page background' },
        { key: 'sectionBg', label: 'Section Background', description: 'Alternating section backgrounds' },
        { key: 'cardBg', label: 'Card Background', description: 'Cards, modals, dropdowns' },
        { key: 'borderColor', label: 'Border Color', description: 'Default border color' }
      ]
    }
  ]

  return (
    <div className="space-y-8">
      {colorGroups.map(group => (
        <div key={group.title}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {group.title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {group.items.map(item => (
              <div
                key={item.key}
                className="p-4 rounded-lg border"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="color"
                    value={colors[item.key as keyof GlobalColors]}
                    onChange={(e) => onChange({ [item.key]: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                    style={{ padding: 0 }}
                  />
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {item.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {colors[item.key as keyof GlobalColors]}
                    </p>
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// TYPOGRAPHY TAB
// ============================================

function TypographyTab({ typography, onChange }: { typography: GlobalTypography; onChange: (t: Partial<GlobalTypography>) => void }) {
  const updateHeading = (level: string, updates: { size?: number; weight?: number; lineHeight?: number }) => {
    onChange({
      headings: {
        ...typography.headings,
        [level]: { ...typography.headings[level as keyof typeof typography.headings], ...updates }
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Font Families */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Font Families
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Heading Font
            </label>
            <select
              value={typography.headingFont}
              onChange={(e) => onChange({ headingFont: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              {FONT_OPTIONS.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
            <p className="text-2xl mt-3" style={{ fontFamily: typography.headingFont }}>
              The quick brown fox
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Body Font
            </label>
            <select
              value={typography.bodyFont}
              onChange={(e) => onChange({ bodyFont: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              {FONT_OPTIONS.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
            <p className="text-base mt-3" style={{ fontFamily: typography.bodyFont }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
          </div>
        </div>
      </div>

      {/* Base Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Base Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Base Font Size (px)
            </label>
            <input
              type="number"
              value={typography.baseFontSize}
              onChange={(e) => onChange({ baseFontSize: parseInt(e.target.value) || 16 })}
              min={12}
              max={24}
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
              Line Height
            </label>
            <input
              type="number"
              value={typography.lineHeight}
              onChange={(e) => onChange({ lineHeight: parseFloat(e.target.value) || 1.6 })}
              min={1}
              max={2.5}
              step={0.1}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Heading Sizes */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Heading Sizes
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          These sizes are automatically applied when you add a Heading widget.
        </p>
        <div className="space-y-4">
          {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map(level => (
            <div
              key={level}
              className="flex items-center gap-4 p-4 rounded-lg border"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="w-12 font-bold text-gray-500 uppercase">
                {level}
              </div>
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Size (px)
                  </label>
                  <input
                    type="number"
                    value={typography.headings[level].size}
                    onChange={(e) => updateHeading(level, { size: parseInt(e.target.value) || 16 })}
                    min={12}
                    max={96}
                    className="w-full px-2 py-1 rounded border text-sm"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Weight
                  </label>
                  <select
                    value={typography.headings[level].weight}
                    onChange={(e) => updateHeading(level, { weight: parseInt(e.target.value) })}
                    className="w-full px-2 py-1 rounded border text-sm"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value={300}>300 - Light</option>
                    <option value={400}>400 - Normal</option>
                    <option value={500}>500 - Medium</option>
                    <option value={600}>600 - SemiBold</option>
                    <option value={700}>700 - Bold</option>
                    <option value={800}>800 - ExtraBold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Line Height
                  </label>
                  <input
                    type="number"
                    value={typography.headings[level].lineHeight}
                    onChange={(e) => updateHeading(level, { lineHeight: parseFloat(e.target.value) || 1.2 })}
                    min={1}
                    max={2}
                    step={0.1}
                    className="w-full px-2 py-1 rounded border text-sm"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
              <div
                className="w-48 truncate"
                style={{
                  fontFamily: typography.headingFont,
                  fontSize: `${Math.min(typography.headings[level].size, 32)}px`,
                  fontWeight: typography.headings[level].weight,
                  lineHeight: typography.headings[level].lineHeight,
                  color: 'var(--text-primary)'
                }}
              >
                Preview
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// BUTTONS TAB
// ============================================

function ButtonsTab({ buttons, onChange }: { buttons: GlobalButtons; onChange: (b: Partial<GlobalButtons>) => void }) {
  const updateButton = (type: 'primary' | 'secondary', updates: Partial<typeof buttons.primary>) => {
    onChange({
      [type]: { ...buttons[type], ...updates }
    })
  }

  const buttonTypes: ('primary' | 'secondary')[] = ['primary', 'secondary']

  return (
    <div className="space-y-8">
      {buttonTypes.map(type => (
        <div key={type}>
          <h3 className="text-lg font-semibold mb-4 capitalize" style={{ color: 'var(--text-primary)' }}>
            {type} Button
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={buttons[type].background === 'transparent' ? '#ffffff' : buttons[type].background}
                      onChange={(e) => updateButton(type, { background: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={buttons[type].background}
                      onChange={(e) => updateButton(type, { background: e.target.value })}
                      className="flex-1 px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={buttons[type].text}
                      onChange={(e) => updateButton(type, { text: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={buttons[type].text}
                      onChange={(e) => updateButton(type, { text: e.target.value })}
                      className="flex-1 px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Border Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={buttons[type].border}
                      onChange={(e) => updateButton(type, { border: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={buttons[type].border}
                      onChange={(e) => updateButton(type, { border: e.target.value })}
                      className="flex-1 px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Hover Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={buttons[type].hoverBg}
                      onChange={(e) => updateButton(type, { hoverBg: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={buttons[type].hoverBg}
                      onChange={(e) => updateButton(type, { hoverBg: e.target.value })}
                      className="flex-1 px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Border Radius (px)
                  </label>
                  <input
                    type="number"
                    value={buttons[type].radius}
                    onChange={(e) => updateButton(type, { radius: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={50}
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
                    Padding Y (px)
                  </label>
                  <input
                    type="number"
                    value={buttons[type].paddingY}
                    onChange={(e) => updateButton(type, { paddingY: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={50}
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
                    Padding X (px)
                  </label>
                  <input
                    type="number"
                    value={buttons[type].paddingX}
                    onChange={(e) => updateButton(type, { paddingX: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div
              className="flex items-center justify-center p-8 rounded-lg"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div className="space-y-4 text-center">
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Preview
                </p>
                <button
                  style={{
                    backgroundColor: buttons[type].background,
                    color: buttons[type].text,
                    border: `2px solid ${buttons[type].border}`,
                    borderRadius: `${buttons[type].radius}px`,
                    padding: `${buttons[type].paddingY}px ${buttons[type].paddingX}px`,
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = buttons[type].hoverBg
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = buttons[type].background
                  }}
                >
                  {type === 'primary' ? 'Book Now' : 'Learn More'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// SPACING TAB
// ============================================

function SpacingTab({ spacing, onChange }: { spacing: GlobalSpacing; onChange: (s: Partial<GlobalSpacing>) => void }) {
  const spacingItems = [
    {
      key: 'sectionPaddingY',
      label: 'Section Padding (Y)',
      description: 'Vertical padding for page sections',
      min: 20,
      max: 200,
      unit: 'px'
    },
    {
      key: 'containerMaxWidth',
      label: 'Container Max Width',
      description: 'Maximum width of content containers',
      min: 800,
      max: 1600,
      unit: 'px'
    },
    {
      key: 'elementGap',
      label: 'Element Gap',
      description: 'Default gap between elements',
      min: 8,
      max: 64,
      unit: 'px'
    },
    {
      key: 'cardPadding',
      label: 'Card Padding',
      description: 'Padding inside card components',
      min: 8,
      max: 48,
      unit: 'px'
    },
    {
      key: 'cardRadius',
      label: 'Card Radius',
      description: 'Border radius for card components',
      min: 0,
      max: 32,
      unit: 'px'
    }
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        These spacing values are used as defaults throughout your website.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {spacingItems.map(item => (
          <div
            key={item.key}
            className="p-4 rounded-lg border"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              {item.label}
            </label>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {item.description}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                value={spacing[item.key as keyof GlobalSpacing]}
                onChange={(e) => onChange({ [item.key]: parseInt(e.target.value) })}
                min={item.min}
                max={item.max}
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={spacing[item.key as keyof GlobalSpacing]}
                  onChange={(e) => onChange({ [item.key]: parseInt(e.target.value) || 0 })}
                  min={item.min}
                  max={item.max}
                  className="w-20 px-2 py-1 rounded border text-sm text-center"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {item.unit}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Preview
        </h3>
        <div
          className="border rounded-lg overflow-hidden"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div
            style={{
              maxWidth: `${spacing.containerMaxWidth}px`,
              margin: '0 auto',
              padding: `${spacing.sectionPaddingY}px 24px`,
              backgroundColor: '#f9fafb'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: `${spacing.elementGap}px`
              }}
            >
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: `${spacing.cardRadius}px`,
                    padding: `${spacing.cardPadding}px`,
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-1"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
