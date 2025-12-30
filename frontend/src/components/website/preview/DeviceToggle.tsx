import { Monitor, Tablet, Smartphone } from 'lucide-react'

export type DeviceType = 'desktop' | 'tablet' | 'mobile'

interface DeviceToggleProps {
  selected: DeviceType
  onChange: (device: DeviceType) => void
}

const DEVICES = [
  { id: 'desktop' as DeviceType, icon: Monitor, label: 'Desktop', width: '100%' },
  { id: 'tablet' as DeviceType, icon: Tablet, label: 'Tablet', width: '768px' },
  { id: 'mobile' as DeviceType, icon: Smartphone, label: 'Mobile', width: '375px' },
]

export default function DeviceToggle({ selected, onChange }: DeviceToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100">
      {DEVICES.map((device) => {
        const Icon = device.icon
        const isSelected = selected === device.id
        return (
          <button
            key={device.id}
            onClick={() => onChange(device.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              isSelected
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title={device.label}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{device.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Helper to get preview width for device
export function getDeviceWidth(device: DeviceType): string {
  switch (device) {
    case 'mobile':
      return '375px'
    case 'tablet':
      return '768px'
    case 'desktop':
    default:
      return '100%'
  }
}
