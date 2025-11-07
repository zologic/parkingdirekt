'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { ParkingSpaceWithRelations } from '@/types'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface MapboxMapProps {
  parkingSpaces?: ParkingSpaceWithRelations[]
  center?: [number, number]
  zoom?: number
  onMarkerClick?: (space: ParkingSpaceWithRelations) => void
  onMapClick?: (coordinates: [number, number]) => void
  height?: string
  showUserLocation?: boolean
}

export default function MapboxMap({
  parkingSpaces = [],
  center = [-74.5, 40], // Default to NYC area
  zoom = 12,
  onMarkerClick,
  onMapClick,
  height = '400px',
  showUserLocation = false,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick([e.lngLat.lng, e.lngLat.lat])
      })
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Get user location
  useEffect(() => {
    if (!showUserLocation || !mapLoaded) return

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords
          const location: [number, number] = [longitude, latitude]
          setUserLocation(location)

          if (map.current) {
            map.current.flyTo({
              center: location,
              zoom: 14,
            })

            // Add user location marker
            new mapboxgl.Marker({
              color: '#3B82F6',
            })
              .setLngLat(location)
              .addTo(map.current)
          }
        },
        (error) => {
          console.error('Error getting user location:', error)
        }
      )
    }
  }, [showUserLocation, mapLoaded])

  // Update markers when parking spaces change
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add new markers
    parkingSpaces.forEach((space) => {
      if (!space.latitude || !space.longitude) return

      const coordinates: [number, number] = [
        parseFloat(space.longitude.toString()),
        parseFloat(space.latitude.toString()),
      ]

      // Create custom marker element
      const markerElement = document.createElement('div')
      markerElement.className = 'custom-marker'
      markerElement.innerHTML = `
        <div class="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-xs shadow-lg hover:bg-blue-700 cursor-pointer">
          $${space.hourlyRate}
        </div>
      `

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat(coordinates)
        .addTo(map.current)

      // Add popup
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      }).setHTML(`
        <div class="p-2">
          <h3 class="font-semibold text-sm">${space.title}</h3>
          <p class="text-xs text-gray-600">${space.spaceType}</p>
          <p class="text-xs text-green-600 font-semibold">$${space.hourlyRate}/hour</p>
          ${space.reviews.length > 0 ? `
            <div class="flex items-center text-xs text-gray-500">
              ⭐ ${space.reviews.reduce((acc, r) => acc + r.rating, 0) / space.reviews.length} (${space.reviews.length})
            </div>
          ` : ''}
        </div>
      `)

      marker.setPopup(popup)

      // Handle marker click
      if (onMarkerClick) {
        markerElement.addEventListener('click', () => {
          onMarkerClick(space)
        })
      }

      markersRef.current.push(marker)
    })
  }, [parkingSpaces, mapLoaded, onMarkerClick])

  // Fit map to show all markers
  useEffect(() => {
    if (!map.current || !mapLoaded || parkingSpaces.length === 0) return

    const bounds = new mapboxgl.LngLatBounds()

    parkingSpaces.forEach((space) => {
      if (space.latitude && space.longitude) {
        bounds.extend([
          parseFloat(space.longitude.toString()),
          parseFloat(space.latitude.toString()),
        ])
      }
    })

    if (userLocation) {
      bounds.extend(userLocation)
    }

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      })
    }
  }, [parkingSpaces, userLocation, mapLoaded])

  return (
    <div className="relative">
      <div
        ref={mapContainer}
        style={{ height }}
        className="w-full rounded-lg overflow-hidden"
      />
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}