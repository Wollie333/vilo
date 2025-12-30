interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}

export default function ColorPicker({ label, value, onChange, disabled = false }: ColorPickerProps) {
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div
          style={{ borderColor: 'var(--border-color)' }}
          className="relative w-10 h-10 rounded-lg border overflow-hidden"
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="absolute inset-0 w-full h-full cursor-pointer border-0"
            style={{ padding: 0 }}
          />
        </div>
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => {
            const val = e.target.value
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              onChange(val)
            }
          }}
          disabled={disabled}
          placeholder="#000000"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          className="w-24 px-3 py-2 rounded-lg border text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
      </div>
    </div>
  )
}
