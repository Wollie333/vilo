export interface FontPairing {
  id: string
  name: string
  heading: string
  body: string
  description: string
  googleFontsUrl: string
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: 'elegant',
    name: 'Elegant Classic',
    heading: 'Playfair Display',
    body: 'Inter',
    description: 'Sophisticated and timeless',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap'
  },
  {
    id: 'modern',
    name: 'Modern Clean',
    heading: 'Poppins',
    body: 'Open Sans',
    description: 'Contemporary and readable',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&display=swap'
  },
  {
    id: 'luxury',
    name: 'Luxury Feel',
    heading: 'Cormorant Garamond',
    body: 'Montserrat',
    description: 'High-end boutique vibe',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap'
  },
  {
    id: 'friendly',
    name: 'Warm & Friendly',
    heading: 'Nunito',
    body: 'Lato',
    description: 'Approachable and welcoming',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap'
  },
  {
    id: 'bold',
    name: 'Bold Statement',
    heading: 'Oswald',
    body: 'Source Sans Pro',
    description: 'Strong and impactful',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+Pro:wght@300;400;600;700&display=swap'
  },
  {
    id: 'minimal',
    name: 'Minimal Swiss',
    heading: 'Inter',
    body: 'Inter',
    description: 'Clean and professional',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
  }
]

export const getFontPairingById = (id: string): FontPairing | undefined => {
  return FONT_PAIRINGS.find(pairing => pairing.id === id)
}

export const DEFAULT_FONT_PAIRING = FONT_PAIRINGS.find(f => f.id === 'modern')!

// All available Google Fonts for custom selection
export const GOOGLE_FONTS = [
  'Inter',
  'Poppins',
  'Open Sans',
  'Roboto',
  'Lato',
  'Montserrat',
  'Playfair Display',
  'Cormorant Garamond',
  'Nunito',
  'Oswald',
  'Source Sans Pro',
  'Raleway',
  'Merriweather',
  'PT Sans',
  'PT Serif',
  'Roboto Slab',
  'Ubuntu',
  'Libre Baskerville',
  'Crimson Text',
  'Work Sans',
  'DM Sans',
  'Space Grotesk',
  'Outfit',
  'Manrope',
  'Plus Jakarta Sans'
]
