import { ChevronDown } from 'lucide-react'

const FONT_OPTIONS = [
  { name: 'Inter', category: 'Sans-serif' },
  { name: 'Roboto', category: 'Sans-serif' },
  { name: 'Open Sans', category: 'Sans-serif' },
  { name: 'Lato', category: 'Sans-serif' },
  { name: 'Montserrat', category: 'Sans-serif' },
  { name: 'Poppins', category: 'Sans-serif' },
  { name: 'Raleway', category: 'Sans-serif' },
  { name: 'Source Sans Pro', category: 'Sans-serif' },
  { name: 'Nunito', category: 'Sans-serif' },
  { name: 'Playfair Display', category: 'Serif' },
  { name: 'Merriweather', category: 'Serif' },
  { name: 'Lora', category: 'Serif' },
  { name: 'Georgia', category: 'Serif' },
  { name: 'Times New Roman', category: 'Serif' },
]

interface FontSelectorProps {
  label: string
  value: string
  onChange: (font: string) => void
  disabled?: boolean
}

export default function FontSelector({ label, value, onChange, disabled = false }: FontSelectorProps) {
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            fontFamily: value,
          }}
          className="w-full px-3 py-2 pr-10 rounded-lg border appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
        >
          <optgroup label="Sans-serif">
            {FONT_OPTIONS.filter(f => f.category === 'Sans-serif').map((font) => (
              <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                {font.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Serif">
            {FONT_OPTIONS.filter(f => f.category === 'Serif').map((font) => (
              <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                {font.name}
              </option>
            ))}
          </optgroup>
        </select>
        <ChevronDown
          size={16}
          style={{ color: 'var(--text-secondary)' }}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      </div>
      <p
        style={{ color: 'var(--text-muted)', fontFamily: value }}
        className="text-sm mt-2"
      >
        The quick brown fox jumps over the lazy dog
      </p>
    </div>
  )
}
