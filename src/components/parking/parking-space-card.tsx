import { ParkingSpaceWithRelations } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { Star, MapPin, DollarSign } from 'lucide-react'

interface ParkingSpaceCardProps {
  space: ParkingSpaceWithRelations
}

export default function ParkingSpaceCard({ space }: ParkingSpaceCardProps) {
  const averageRating = space.reviews.length > 0
    ? space.reviews.reduce((acc, review) => acc + review.rating, 0) / space.reviews.length
    : 0

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image Gallery */}
      {space.photos && space.photos.length > 0 ? (
        <div className="relative h-48">
          <Image
            src={space.photos[0]}
            alt={space.title}
            fill
            className="object-cover"
          />
          {space.photos.length > 1 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              +{space.photos.length - 1} more
            </div>
          )}
        </div>
      ) : (
        <div className="h-48 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500">No photos available</span>
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
            {space.title}
          </h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
            {space.spaceType}
          </span>
        </div>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {space.description}
        </p>

        <div className="flex items-center text-sm text-gray-500 mb-2">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="line-clamp-1">{space.address}</span>
        </div>

        <div className="flex items-center text-sm text-gray-500 mb-3">
          <DollarSign className="w-4 h-4 mr-1" />
          <span className="font-semibold text-green-600">${space.hourlyRate}/hour</span>
          {space.dailyRate && <span className="ml-2">${space.dailyRate}/day</span>}
          {space.monthlyRate && <span className="ml-2">${space.monthlyRate}/month</span>}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="flex items-center mr-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(averageRating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {averageRating > 0 ? `${averageRating.toFixed(1)} (${space._count?.reviews || 0})` : 'No reviews'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {space._count?.bookings || 0} bookings
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {space.vehicleTypes.map((type) => (
            <span
              key={type}
              className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
            >
              {type}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Owner: {space.owner?.name || 'Unknown'}
          </div>
          <Link
            href={`/parking-spaces/${space.id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}