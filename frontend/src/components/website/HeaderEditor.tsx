import { HeaderConfig } from '../../services/websiteApi'

interface HeaderEditorProps {
  config: HeaderConfig
  logoUrl: string | null
  onChange: (config: HeaderConfig) => void
  onLogoChange: (url: string) => void
}

export default function HeaderEditor({ config, logoUrl, onChange, onLogoChange }: HeaderEditorProps) {
  const updateConfig = (updates: Partial<HeaderConfig>) => {
    onChange({ ...config, ...updates })
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div>
        <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-2">
          Logo
        </label>
        <div className="flex items-start gap-4">
          <div
            className="w-32 h-16 rounded-lg border flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
            ) : (
              <span style={{ color: 'var(--text-muted)' }} className="text-xs">No logo</span>
            )}
          </div>
          <div className="flex-1">
            <input
              type="url"
              value={logoUrl || ''}
              onChange={(e) => onLogoChange(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
            <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
              Enter a URL to your logo image (PNG, JPG, or SVG)
            </p>
          </div>
        </div>
      </div>

      {/* Logo Position */}
      <div>
        <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-2">
          Logo Position
        </label>
        <div className="flex gap-3">
          {(['left', 'center'] as const).map((position) => (
            <button
              key={position}
              onClick={() => updateConfig({ logo_position: position })}
              className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                config.logo_position === position
                  ? 'bg-black text-white border-black'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              style={config.logo_position !== position ? { color: 'var(--text-secondary)' } : {}}
            >
              {position.charAt(0).toUpperCase() + position.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sticky Header */}
      <div className="flex items-center justify-between">
        <div>
          <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
            Sticky Header
          </label>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs">
            Header stays fixed when scrolling
          </p>
        </div>
        <button
          onClick={() => updateConfig({ sticky: !config.sticky })}
          className={`w-12 h-6 rounded-full transition-colors ${
            config.sticky ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              config.sticky ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Transparent on Hero */}
      <div className="flex items-center justify-between">
        <div>
          <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
            Transparent on Hero
          </label>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs">
            Header is transparent over hero sections
          </p>
        </div>
        <button
          onClick={() => updateConfig({ transparent_on_hero: !config.transparent_on_hero })}
          className={`w-12 h-6 rounded-full transition-colors ${
            config.transparent_on_hero ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              config.transparent_on_hero ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* CTA Button Section */}
      <div
        className="p-4 rounded-lg border"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
            CTA Button
          </label>
          <button
            onClick={() => updateConfig({ show_cta_button: !config.show_cta_button })}
            className={`w-12 h-6 rounded-full transition-colors ${
              config.show_cta_button ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                config.show_cta_button ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {config.show_cta_button && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="text-xs block mb-1">
                  Button Text
                </label>
                <input
                  type="text"
                  value={config.cta_text}
                  onChange={(e) => updateConfig({ cta_text: e.target.value })}
                  placeholder="Book Now"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="text-xs block mb-1">
                  Button Link
                </label>
                <input
                  type="text"
                  value={config.cta_link}
                  onChange={(e) => updateConfig({ cta_link: e.target.value })}
                  placeholder="/book"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ color: 'var(--text-secondary)' }} className="text-xs block mb-2">
                Button Style
              </label>
              <div className="flex gap-2">
                {(['solid', 'outline', 'ghost'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => updateConfig({ cta_style: style })}
                    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      config.cta_style === style
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <label style={{ color: 'var(--text-secondary)' }} className="text-xs block mb-2">
                Preview
              </label>
              <div className="flex justify-center p-4 rounded bg-gray-100">
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    config.cta_style === 'solid'
                      ? 'bg-blue-500 text-white'
                      : config.cta_style === 'outline'
                      ? 'border-2 border-blue-500 text-blue-500 bg-transparent'
                      : 'text-blue-500 hover:bg-blue-50'
                  }`}
                >
                  {config.cta_text || 'Book Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
