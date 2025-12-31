export interface ColorTheme {
  id: string
  name: string
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  preview: {
    gradient: string
  }
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    primary: '#0077b6',
    secondary: '#00b4d8',
    accent: '#90e0ef',
    background: '#ffffff',
    text: '#1a1a2e',
    preview: {
      gradient: 'linear-gradient(135deg, #0077b6 0%, #00b4d8 50%, #90e0ef 100%)'
    }
  },
  {
    id: 'forest',
    name: 'Forest Retreat',
    primary: '#2d6a4f',
    secondary: '#40916c',
    accent: '#95d5b2',
    background: '#f8f9fa',
    text: '#1b4332',
    preview: {
      gradient: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 50%, #95d5b2 100%)'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    primary: '#e85d04',
    secondary: '#f48c06',
    accent: '#ffba08',
    background: '#ffffff',
    text: '#370617',
    preview: {
      gradient: 'linear-gradient(135deg, #e85d04 0%, #f48c06 50%, #ffba08 100%)'
    }
  },
  {
    id: 'modern',
    name: 'Modern Dark',
    primary: '#1f2937',
    secondary: '#374151',
    accent: '#3b82f6',
    background: '#ffffff',
    text: '#111827',
    preview: {
      gradient: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #3b82f6 100%)'
    }
  },
  {
    id: 'luxury',
    name: 'Luxury Gold',
    primary: '#1a1a2e',
    secondary: '#16213e',
    accent: '#d4a574',
    background: '#0f0f0f',
    text: '#ffffff',
    preview: {
      gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #d4a574 100%)'
    }
  },
  {
    id: 'nature',
    name: 'Earth & Stone',
    primary: '#5c4033',
    secondary: '#8b7355',
    accent: '#a8c686',
    background: '#faf6f2',
    text: '#3d2914',
    preview: {
      gradient: 'linear-gradient(135deg, #5c4033 0%, #8b7355 50%, #a8c686 100%)'
    }
  },
  {
    id: 'minimal',
    name: 'Clean Minimal',
    primary: '#000000',
    secondary: '#525252',
    accent: '#737373',
    background: '#ffffff',
    text: '#171717',
    preview: {
      gradient: 'linear-gradient(135deg, #000000 0%, #525252 50%, #a3a3a3 100%)'
    }
  },
  {
    id: 'vibrant',
    name: 'Vibrant Pop',
    primary: '#7c3aed',
    secondary: '#a78bfa',
    accent: '#f472b6',
    background: '#ffffff',
    text: '#1e1b4b',
    preview: {
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #f472b6 100%)'
    }
  },
  {
    id: 'coastal',
    name: 'Coastal Living',
    primary: '#0ea5e9',
    secondary: '#38bdf8',
    accent: '#fbbf24',
    background: '#f0f9ff',
    text: '#0c4a6e',
    preview: {
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #fbbf24 100%)'
    }
  },
  {
    id: 'rustic',
    name: 'Rustic Charm',
    primary: '#92400e',
    secondary: '#b45309',
    accent: '#fcd34d',
    background: '#fffbeb',
    text: '#78350f',
    preview: {
      gradient: 'linear-gradient(135deg, #92400e 0%, #b45309 50%, #fcd34d 100%)'
    }
  },
  {
    id: 'nordic',
    name: 'Nordic Cool',
    primary: '#475569',
    secondary: '#64748b',
    accent: '#06b6d4',
    background: '#f8fafc',
    text: '#0f172a',
    preview: {
      gradient: 'linear-gradient(135deg, #475569 0%, #64748b 50%, #06b6d4 100%)'
    }
  },
  {
    id: 'tropical',
    name: 'Tropical Paradise',
    primary: '#047857',
    secondary: '#059669',
    accent: '#f59e0b',
    background: '#ECFDF5',
    text: '#064E3B',
    preview: {
      gradient: 'linear-gradient(135deg, #047857 0%, #059669 50%, #f59e0b 100%)'
    }
  }
]

export const getThemeById = (id: string): ColorTheme | undefined => {
  return COLOR_THEMES.find(theme => theme.id === id)
}

export const DEFAULT_THEME = COLOR_THEMES.find(t => t.id === 'modern')!
