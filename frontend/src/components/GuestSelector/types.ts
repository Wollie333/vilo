export interface GuestData {
  adults: number
  children: number
  childrenAges: number[]
}

export interface GuestSelectorProps {
  /** Current guest data (controlled component) */
  value: GuestData
  /** Callback when guest data changes */
  onChange: (data: GuestData) => void
  /** Display mode: 'full' shows all fields expanded, 'compact' shows summary with expandable details */
  mode?: 'full' | 'compact'
  /** Maximum number of adults allowed (default: 8) */
  maxAdults?: number
  /** Maximum number of children allowed (default: 6) */
  maxChildren?: number
  /** Maximum age for children (default: 17) */
  maxChildAge?: number
  /** Show labels above dropdowns (default: true) */
  showLabels?: boolean
  /** Custom class name for container */
  className?: string
  /** Whether the component is disabled */
  disabled?: boolean
  /** Error message to display */
  error?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

/** Creates default guest data with 2 adults, 0 children */
export const createDefaultGuestData = (): GuestData => ({
  adults: 2,
  children: 0,
  childrenAges: []
})

/** Formats guest data into a readable summary string */
export const formatGuestSummary = (data: GuestData): string => {
  const parts: string[] = []
  parts.push(`${data.adults} ${data.adults === 1 ? 'Adult' : 'Adults'}`)
  if (data.children > 0) {
    parts.push(`${data.children} ${data.children === 1 ? 'Child' : 'Children'}`)
  }
  return parts.join(', ')
}

/** Gets total guest count */
export const getTotalGuests = (data: GuestData): number => {
  return data.adults + data.children
}
