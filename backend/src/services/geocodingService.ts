import { Client, GeocodeResult } from '@googlemaps/google-maps-services-js'

const client = new Client({})
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

export interface GeocodingResult {
  formattedAddress: string
  placeId: string
  lat: number
  lng: number
  city?: string
  province?: string
  country?: string
  countryCode?: string
  postalCode?: string
}

/**
 * Geocode an address string to coordinates
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('GOOGLE_MAPS_API_KEY not configured')
    return null
  }

  try {
    const response = await client.geocode({
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY,
        // Bias results to Southern Africa
        region: 'za'
      }
    })

    if (response.data.status !== 'OK' || !response.data.results.length) {
      return null
    }

    const result = response.data.results[0]
    return parseGeocodeResult(result)
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Reverse geocode coordinates to an address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('GOOGLE_MAPS_API_KEY not configured')
    return null
  }

  try {
    const response = await client.reverseGeocode({
      params: {
        latlng: { lat, lng },
        key: GOOGLE_MAPS_API_KEY
      }
    })

    if (response.data.status !== 'OK' || !response.data.results.length) {
      return null
    }

    const result = response.data.results[0]
    return parseGeocodeResult(result)
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/**
 * Get place details by place ID
 */
export async function getPlaceDetails(placeId: string): Promise<GeocodingResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('GOOGLE_MAPS_API_KEY not configured')
    return null
  }

  try {
    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        key: GOOGLE_MAPS_API_KEY,
        fields: ['formatted_address', 'geometry', 'address_components']
      }
    })

    if (response.data.status !== 'OK' || !response.data.result) {
      return null
    }

    const result = response.data.result
    let city = ''
    let province = ''
    let country = ''
    let countryCode = ''
    let postalCode = ''

    result.address_components?.forEach(component => {
      // Cast types to string[] for compatibility with type checking
      const types = component.types as string[]
      if (types.includes('locality')) {
        city = component.long_name
      } else if (types.includes('administrative_area_level_1')) {
        province = component.long_name
      } else if (types.includes('country')) {
        country = component.long_name
        countryCode = component.short_name
      } else if (types.includes('postal_code')) {
        postalCode = component.long_name
      }
    })

    return {
      formattedAddress: result.formatted_address || '',
      placeId,
      lat: result.geometry?.location?.lat || 0,
      lng: result.geometry?.location?.lng || 0,
      city,
      province,
      country,
      countryCode,
      postalCode
    }
  } catch (error) {
    console.error('Place details error:', error)
    return null
  }
}

/**
 * Parse a Google geocode result into our format
 */
function parseGeocodeResult(result: GeocodeResult): GeocodingResult {
  let city = ''
  let province = ''
  let country = ''
  let countryCode = ''
  let postalCode = ''

  result.address_components?.forEach(component => {
    // Cast types to string[] for compatibility with type checking
    const types = component.types as string[]
    if (types.includes('locality')) {
      city = component.long_name
    } else if (types.includes('administrative_area_level_1')) {
      province = component.long_name
    } else if (types.includes('country')) {
      country = component.long_name
      countryCode = component.short_name
    } else if (types.includes('postal_code')) {
      postalCode = component.long_name
    }
  })

  return {
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    city,
    province,
    country,
    countryCode,
    postalCode
  }
}

export default {
  geocodeAddress,
  reverseGeocode,
  getPlaceDetails
}
