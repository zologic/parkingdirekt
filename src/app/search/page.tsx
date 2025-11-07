'use client'

import { useState, useEffect } from 'react'
import { ParkingSpaceWithRelations } from '@/types'
import ParkingSpaceCard from '@/components/parking/parking-space-card'
import { Search, MapPin, Filter, DollarSign } from 'lucide-react'

export default function SearchPage() {
  const [spaces, setSpaces] = useState<ParkingSpaceWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    spaceType: '',
    minPrice: '',
    maxPrice: '',
    latitude: '',
    longitude: '',
    radius: '10',
  })
  const [showFilters, setShowFilters] = useState(false)

  const spaceTypes = [
    { value: '', label: 'All Types' },
    { value: 'INDOOR', label: 'Indoor' },
    { value: 'OUTDOOR', label: 'Outdoor' },
    { value: 'GARAGE', label: 'Garage' },
    { value: 'DRIVEWAY', label: 'Driveway' },
  ]

  const fetchSpaces = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (filters.spaceType) params.append('spaceType', filters.spaceType)
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
      if (filters.latitude) params.append('latitude', filters.latitude)
      if (filters.longitude) params.append('longitude', filters.longitude)
      if (filters.radius) params.append('radius', filters.radius)

      const response = await fetch(`/api/parking-spaces?${params}`)
      const data = await response.json()

      if (data.success) {
        setSpaces(data.data)
      }
    } catch (error) {
      console.error('Error fetching parking spaces:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSpaces()
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleFilterChange('latitude', position.coords.latitude.toString())
          handleFilterChange('longitude', position.coords.longitude.toString())
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSearch} className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by title, description, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </form>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Space Type
                  </label>
                  <select
                    value={filters.spaceType}
                    onChange={(e) => handleFilterChange('spaceType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {spaceTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Price ($/hour)
                  </label>
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Price ($/hour)
                  </label>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Radius (miles)
                  </label>
                  <input
                    type="number"
                    value={filters.radius}
                    onChange={(e) => handleFilterChange('radius', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <MapPin className="w-4 h-4" />
                  Use My Location
                </button>
                <span className="text-sm text-gray-500">
                  {filters.latitude && filters.longitude && (
                    <>Location set: {filters.latitude.substring(0, 6)}, {filters.longitude.substring(0, 6)}</>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Available Parking Spaces
          </h1>
          <p className="text-gray-600">
            {spaces.length} parking space{spaces.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading parking spaces...</p>
          </div>
        ) : spaces.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No parking spaces found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map((space) => (
              <ParkingSpaceCard key={space.id} space={space} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}