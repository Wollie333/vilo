import { useState } from 'react'
import { X, Check, Palette, Type } from 'lucide-react'
import { COLOR_THEMES, ColorTheme } from '../../../data/colorThemes'
import { FONT_PAIRINGS, FontPairing } from '../../../data/fontPairings'

interface ThemeSelectorProps {
  isOpen: boolean
  onClose: () => void
  currentThemeId?: string
  currentFontPairingId?: string
  currentColors?: {
    primary: string
    secondary: string
    accent: string
  }
  currentFonts?: {
    heading: string
    body: string
  }
  onApplyTheme: (theme: ColorTheme) => void
  onApplyFontPairing: (pairing: FontPairing) => void
  onApplyCustomColors: (colors: { primary: string; secondary: string; accent: string }) => void
  onApplyCustomFonts: (fonts: { heading: string; body: string }) => void
}

type Tab = 'colors' | 'fonts'

export default function ThemeSelector({
  isOpen,
  onClose,
  currentThemeId,
  currentFontPairingId,
  currentColors,
  currentFonts,
  onApplyTheme,
  onApplyFontPairing,
  onApplyCustomColors,
  onApplyCustomFonts,
}: ThemeSelectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('colors')
  const [customPrimary, setCustomPrimary] = useState(currentColors?.primary || '#1f2937')
  const [customSecondary, setCustomSecondary] = useState(currentColors?.secondary || '#374151')
  const [customAccent, setCustomAccent] = useState(currentColors?.accent || '#3b82f6')
  const [customHeadingFont, setCustomHeadingFont] = useState(currentFonts?.heading || 'Inter')
  const [customBodyFont, setCustomBodyFont] = useState(currentFonts?.body || 'Inter')

  if (!isOpen) return null

  const handleThemeClick = (theme: ColorTheme) => {
    onApplyTheme(theme)
    setCustomPrimary(theme.primary)
    setCustomSecondary(theme.secondary)
    setCustomAccent(theme.accent)
  }

  const handleFontPairingClick = (pairing: FontPairing) => {
    onApplyFontPairing(pairing)
    setCustomHeadingFont(pairing.heading)
    setCustomBodyFont(pairing.body)
  }

  const handleApplyCustomColors = () => {
    onApplyCustomColors({
      primary: customPrimary,
      secondary: customSecondary,
      accent: customAccent,
    })
  }

  const handleApplyCustomFonts = () => {
    onApplyCustomFonts({
      heading: customHeadingFont,
      body: customBodyFont,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Choose Your Theme</h2>
            <p className="text-sm text-gray-500 mt-0.5">Select a pre-built theme or customize your colors</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('colors')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'colors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Palette size={18} />
            Color Schemes
          </button>
          <button
            onClick={() => setActiveTab('fonts')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'fonts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Type size={18} />
            Font Pairings
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'colors' && (
            <div className="space-y-6">
              {/* Theme Grid */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Pre-built Themes</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {COLOR_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeClick(theme)}
                      className={`relative group rounded-xl overflow-hidden transition-all hover:scale-105 ${
                        currentThemeId === theme.id
                          ? 'ring-2 ring-blue-500 ring-offset-2'
                          : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
                      }`}
                    >
                      <div
                        className="h-20 w-full"
                        style={{ background: theme.preview.gradient }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <span className="text-xs font-medium text-white truncate block">
                          {theme.name}
                        </span>
                      </div>
                      {currentThemeId === theme.id && (
                        <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Custom Colors</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Primary</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customPrimary}
                        onChange={(e) => setCustomPrimary(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={customPrimary}
                        onChange={(e) => setCustomPrimary(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Secondary</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customSecondary}
                        onChange={(e) => setCustomSecondary(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={customSecondary}
                        onChange={(e) => setCustomSecondary(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Accent</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customAccent}
                        onChange={(e) => setCustomAccent(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={customAccent}
                        onChange={(e) => setCustomAccent(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleApplyCustomColors}
                  className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Apply Custom Colors
                </button>
              </div>

              {/* Preview */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div
                    className="h-24 flex items-center justify-center"
                    style={{ backgroundColor: customPrimary }}
                  >
                    <span className="text-white font-semibold">Primary Background</span>
                  </div>
                  <div className="p-4 bg-white">
                    <button
                      className="px-4 py-2 rounded-lg text-white font-medium text-sm"
                      style={{ backgroundColor: customAccent }}
                    >
                      Accent Button
                    </button>
                    <p className="mt-3 text-sm" style={{ color: customSecondary }}>
                      Secondary text color for descriptions and subtitles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fonts' && (
            <div className="space-y-6">
              {/* Font Pairing Grid */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Font Pairings</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {FONT_PAIRINGS.map((pairing) => (
                    <button
                      key={pairing.id}
                      onClick={() => handleFontPairingClick(pairing)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all hover:border-gray-300 ${
                        currentFontPairingId === pairing.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <link href={pairing.googleFontsUrl} rel="stylesheet" />
                      <div
                        className="text-lg font-semibold text-gray-900 mb-1"
                        style={{ fontFamily: pairing.heading }}
                      >
                        {pairing.name}
                      </div>
                      <div
                        className="text-sm text-gray-600 mb-2"
                        style={{ fontFamily: pairing.body }}
                      >
                        {pairing.description}
                      </div>
                      <div className="text-xs text-gray-400">
                        {pairing.heading} + {pairing.body}
                      </div>
                      {currentFontPairingId === pairing.id && (
                        <div className="absolute top-3 right-3 bg-blue-500 rounded-full p-1">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Fonts */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Custom Fonts</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Heading Font</label>
                    <select
                      value={customHeadingFont}
                      onChange={(e) => setCustomHeadingFont(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      {['Inter', 'Poppins', 'Open Sans', 'Roboto', 'Lato', 'Montserrat', 'Playfair Display', 'Cormorant Garamond', 'Nunito', 'Oswald', 'Source Sans Pro', 'Raleway', 'Merriweather', 'Work Sans', 'DM Sans', 'Space Grotesk', 'Outfit', 'Manrope', 'Plus Jakarta Sans'].map((font) => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Body Font</label>
                    <select
                      value={customBodyFont}
                      onChange={(e) => setCustomBodyFont(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      {['Inter', 'Poppins', 'Open Sans', 'Roboto', 'Lato', 'Montserrat', 'Nunito', 'Source Sans Pro', 'Raleway', 'Work Sans', 'DM Sans', 'Manrope', 'Plus Jakarta Sans'].map((font) => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleApplyCustomFonts}
                  className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Apply Custom Fonts
                </button>
              </div>

              {/* Preview */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
                <div className="rounded-xl border border-gray-200 p-6 bg-white">
                  <h1
                    className="text-2xl font-bold text-gray-900 mb-2"
                    style={{ fontFamily: customHeadingFont }}
                  >
                    Welcome to Paradise Resort
                  </h1>
                  <p
                    className="text-gray-600"
                    style={{ fontFamily: customBodyFont }}
                  >
                    Experience luxury accommodation in our stunning beachfront property.
                    Book your perfect getaway today and create unforgettable memories with
                    your loved ones.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
