import { useCallback, useState, memo } from 'react'
import { GoogleMap as GoogleMapComponent, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { MapPin, Loader2 } from 'lucide-react'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

// Default map styles for a clean look
const mapStyles = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  }
]

const defaultMapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: mapStyles
}

interface MarkerData {
  id: string
  lat: number
  lng: number
  name: string
  slug?: string
  priceFrom?: number | null
  currency?: string
  image?: string
}

interface GoogleMapProps {
  // Single marker mode
  center?: { lat: number; lng: number }
  markerPosition?: { lat: number; lng: number }
  markerTitle?: string

  // Multi-marker mode
  markers?: MarkerData[]
  onMarkerClick?: (marker: MarkerData) => void

  // Common props
  zoom?: number
  height?: string | number
  className?: string
  showInfoWindow?: boolean
}

function GoogleMap({
  center,
  markerPosition,
  markerTitle,
  markers = [],
  onMarkerClick,
  zoom = 14,
  height = 400,
  className = '',
  showInfoWindow = true
}: GoogleMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null)
  const [, setMap] = useState<google.maps.Map | null>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places']
  })

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)

    // If multiple markers, fit bounds to show all
    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      markers.forEach(marker => {
        bounds.extend({ lat: marker.lat, lng: marker.lng })
      })
      map.fitBounds(bounds, 50)
    }
  }, [markers])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleMarkerClick = (marker: MarkerData) => {
    setSelectedMarker(marker)
    onMarkerClick?.(marker)
  }

  // Determine the map center
  const mapCenter = center ||
    (markerPosition ? markerPosition :
    (markers.length > 0 ? { lat: markers[0].lat, lng: markers[0].lng } :
    { lat: -33.9249, lng: 18.4241 })) // Default to Cape Town

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className={`bg-gray-100 rounded-xl flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center text-gray-500 p-4">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Google Maps API key not configured</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        className={`bg-gray-100 rounded-xl flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center text-red-500 p-4">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Error loading maps</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div
        className={`bg-gray-100 rounded-xl flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className={`rounded-xl overflow-hidden ${className}`} style={{ height }}>
      <GoogleMapComponent
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={defaultMapOptions}
      >
        {/* Single marker mode */}
        {markerPosition && (
          <Marker
            position={markerPosition}
            title={markerTitle}
          />
        )}

        {/* Multi-marker mode */}
        {markers.map(marker => (
          <Marker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            title={marker.name}
            onClick={() => handleMarkerClick(marker)}
          />
        ))}

        {/* Info window for selected marker */}
        {showInfoWindow && selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-1 min-w-[200px]">
              {selectedMarker.image && (
                <img
                  src={selectedMarker.image}
                  alt={selectedMarker.name}
                  className="w-full h-24 object-cover rounded-md mb-2"
                />
              )}
              <h3 className="font-semibold text-gray-900 text-sm">
                {selectedMarker.name}
              </h3>
              {selectedMarker.priceFrom != null && (
                <p className="text-sm text-emerald-600 mt-1">
                  From {selectedMarker.currency || 'R'}{selectedMarker.priceFrom.toLocaleString()}
                </p>
              )}
              {selectedMarker.slug && (
                <a
                  href={`/accommodation/${selectedMarker.slug}`}
                  className="text-xs text-emerald-600 hover:underline mt-2 inline-block"
                >
                  View details
                </a>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMapComponent>
    </div>
  )
}

export default memo(GoogleMap)
