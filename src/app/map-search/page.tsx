'use client'

import { useState, useEffect } from 'react'
import { ParkingSpaceWithRelations } from '@/types'
import MapboxMap from '@/components/map/mapbox-map'
import ParkingSpaceCard from '@/components/parking/parking-space-card'
import { Search, Filter, MapPin, X } from 'lucide-react'

export default function MapSearchPage() {
  const [spaces, setSpaces] = useState<ParkingSpaceWithRelations[]>([])
  const [filteredSpaces, setFilteredSpaces] = useState<ParkingSpaceWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-74.5, 40])
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpaceWithRelations | null>(null)
  const [showList, setShowList] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    spaceType: '',
    minPrice: '',
    maxPrice: '',
  })

  const spaceTypes = [
    { value: '', label: 'All Types' },
    { value: 'INDOOR', label: 'Indoor' },
    { value: 'OUTDOOR', label: 'Outdoor' },
    { value: 'GARAGE', label: 'Garage' },
    { value: 'DRIVEWAY', label: 'Driveway' },
  ]

  const fetchSpaces = async (bounds?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (filters.search) params.append('search', filters.search)
      if (filters.spaceType) params.append('spaceType', filters.spaceType)
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
      if (bounds) params.append('bounds', bounds)

      const response = await fetch(`/api/parking-spaces?${params}`)
      const data = await response.json()

      if (data.success) {
        setSpaces(data.data)
        setFilteredSpaces(data.data)
      }
    } catch (error) {
      console.error('Error fetching parking spaces:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...spaces]

    if (filters.search) {
      filtered = filtered.filter(space =>
        space.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        space.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        space.address.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters.spaceType) {
      filtered = filtered.filter(space => space.spaceType === filters.spaceType)
    }

    if (filters.minPrice) {
      filtered = filtered.filter(space => space.hourlyRate >= parseFloat(filters.minPrice))
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(space => space.hourlyRate <= parseFloat(filters.maxPrice))
    }

    setFilteredSpaces(filtered)
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMapClick = (coordinates: [number, number]) => {
    setMapCenter(coordinates)
  }

  const handleMarkerClick = (space: ParkingSpaceWithRelations) => {
    setSelectedSpace(space)
    // Pan map to marker location
    if (space.latitude && space.longitude) {
      setMapCenter([
        parseFloat(space.longitude.toString()),
        parseFloat(space.latitude.toString()),
      ])
    }
  }

  const handleSearchLocation = async () => {
    if (!filters.search) return

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(filters.search)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      )

      if (response.ok) {
        const data = await response.json()
        if (data.features && data.features.length > 0) {
          const [longitude, latitude] = data.features[0].center
          setMapCenter([longitude, latitude])
        }
      }
    } catch (error) {
      console.error('Error searching location:', error)
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords
          setMapCenter([longitude, latitude])
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }

  useEffect(() => {
    fetchSpaces()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [filters, spaces])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by location, title, or address..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchLocation()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearchLocation}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Search Location
            </button>
            <button
              onClick={getCurrentLocation}
              className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700"
              title="Use my location"
            >
              <MapPin className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowList(!showList)}
              className="bg-gray-600 text-white p-2 rounded-md hover:bg-gray-700"
              title="Toggle list view"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-4 items-center">
            <select
              value={filters.spaceType}
              onChange={(e) => handleFilterChange('spaceType', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {spaceTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Min Price ($/hour)"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
            />

            <input
              type="number"
              placeholder="Max Price ($/hour)"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
            />

            <span className="text-sm text-gray-600">
              {filteredSpaces.length} spaces found
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Map */}
        <div className={`${showList ? 'w-1/2' : 'w-full'} relative`}>
          <MapboxMap
            parkingSpaces={filteredSpaces}
            center={mapCenter}
            height="100%"
            onMarkerClick={handleMarkerClick}
            onMapClick={handleMapClick}
            showUserLocation={true}
          />

          {/* Selected Space Popup */}
          {selectedSpace && (
            <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-md">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{selectedSpace.title}</h3>
                <button
                  onClick={() => setSelectedSpace(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 text-sm mb-2">{selectedSpace.address}</p>
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-semibold">${selectedSpace.hourlyRate}/hour</span>
                <a
                  href={`/parking-spaces/${selectedSpace.id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                >
                  View Details
                </a>
              </div>
            </div>
          )}
        </div>

        {/* List View */}
        {showList && (
          <div className="w-1/2 overflow-y-auto bg-gray-50 border-l">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Parking Spaces</h2>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading spaces...</p>
                </div>
              ) : filteredSpaces.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No parking spaces found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSpaces.map((space) => (
                    <div
                      key={space.id}
                      className={`cursor-pointer transition-all ${
                        selectedSpace?.id === space.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleMarkerClick(space)}
                    >
                      <ParkingSpaceCard space={space} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}