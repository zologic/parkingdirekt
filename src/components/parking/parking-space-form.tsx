'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ParkingSpaceForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    latitude: 0,
    longitude: 0,
    hourlyRate: '',
    dailyRate: '',
    monthlyRate: '',
    spaceType: 'INDOOR' as 'INDOOR' | 'OUTDOOR' | 'GARAGE' | 'DRIVEWAY',
    vehicleTypes: [] as string[],
    sizeDimensions: '',
    accessInstructions: '',
    photos: [] as string[],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const vehicleTypes = [
    { id: 'CAR', label: 'Car' },
    { id: 'MOTORCYCLE', label: 'Motorcycle' },
    { id: 'TRUCK', label: 'Truck' },
    { id: 'SUV', label: 'SUV' },
  ]

  const spaceTypes = [
    { id: 'INDOOR', label: 'Indoor' },
    { id: 'OUTDOOR', label: 'Outdoor' },
    { id: 'GARAGE', label: 'Garage' },
    { id: 'DRIVEWAY', label: 'Driveway' },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleVehicleTypeChange = (vehicleType: string) => {
    setFormData(prev => ({
      ...prev,
      vehicleTypes: prev.vehicleTypes.includes(vehicleType)
        ? prev.vehicleTypes.filter(vt => vt !== vehicleType)
        : [...prev.vehicleTypes, vehicleType]
    }))
  }

  const handleAddressLookup = async () => {
    if (!formData.address) return

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(formData.address)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      )

      if (response.ok) {
        const data = await response.json()
        if (data.features && data.features.length > 0) {
          const [longitude, latitude] = data.features[0].center
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude
          }))
        }
      }
    } catch (error) {
      console.error('Error looking up address:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (formData.vehicleTypes.length === 0) {
      setError('Please select at least one vehicle type')
      setIsLoading(false)
      return
    }

    try {
      const payload = {
        ...formData,
        hourlyRate: parseFloat(formData.hourlyRate),
        dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : undefined,
        monthlyRate: formData.monthlyRate ? parseFloat(formData.monthlyRate) : undefined,
      }

      const response = await fetch('/api/parking-spaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Parking space created successfully! Redirecting...')
        setTimeout(() => {
          router.push('/owner/spaces')
        }, 2000)
      } else {
        setError(data.error || 'An error occurred while creating the parking space')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-md rounded-lg px-8 py-6">
        <h2 className="text-2xl font-bold mb-6">Add New Parking Space</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <div className="flex gap-2">
              <input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={handleAddressLookup}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Lookup
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="spaceType" className="block text-sm font-medium text-gray-700 mb-1">
              Space Type *
            </label>
            <select
              id="spaceType"
              name="spaceType"
              value={formData.spaceType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {spaceTypes.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Types *
            </label>
            <div className="space-y-2">
              {vehicleTypes.map(type => (
                <label key={type.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.vehicleTypes.includes(type.id)}
                    onChange={() => handleVehicleTypeChange(type.id)}
                    className="mr-2"
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Rate ($) *
              </label>
              <input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyRate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="dailyRate" className="block text-sm font-medium text-gray-700 mb-1">
                Daily Rate ($)
              </label>
              <input
                id="dailyRate"
                name="dailyRate"
                type="number"
                step="0.01"
                min="0"
                value={formData.dailyRate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="monthlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rate ($)
              </label>
              <input
                id="monthlyRate"
                name="monthlyRate"
                type="number"
                step="0.01"
                min="0"
                value={formData.monthlyRate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sizeDimensions" className="block text-sm font-medium text-gray-700 mb-1">
              Size Dimensions
            </label>
            <input
              id="sizeDimensions"
              name="sizeDimensions"
              type="text"
              value={formData.sizeDimensions}
              onChange={handleChange}
              placeholder="e.g., 10ft x 20ft"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="accessInstructions" className="block text-sm font-medium text-gray-700 mb-1">
              Access Instructions
            </label>
            <textarea
              id="accessInstructions"
              name="accessInstructions"
              value={formData.accessInstructions}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Parking Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}