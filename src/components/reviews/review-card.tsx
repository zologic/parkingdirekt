import { ReviewWithRelations } from '@/types'
import { Star, User } from 'lucide-react'

interface ReviewCardProps {
  review: ReviewWithRelations
  showBooking?: boolean
}

export default function ReviewCard({ review, showBooking = false }: ReviewCardProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {review.reviewer?.avatarUrl ? (
            <img
              src={review.reviewer.avatarUrl}
              alt={review.reviewer.name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
          )}
          <div>
            <div className="font-semibold">{review.reviewer?.name || 'Anonymous'}</div>
            <div className="text-sm text-gray-500">{formatDate(review.createdAt)}</div>
          </div>
        </div>
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
          <span className="ml-2 text-sm font-medium text-gray-700">
            {review.rating}.0
          </span>
        </div>
      </div>

      {review.comment && (
        <p className="text-gray-700 mb-3">{review.comment}</p>
      )}

      {showBooking && review.booking && (
        <div className="text-sm text-gray-500 border-t pt-3">
          <div>
            <span className="font-medium">Booking:</span> {review.booking.id}
          </div>
          <div>
            <span className="font-medium">Date:</span>{' '}
            {formatDate(review.booking.startTime)} - {formatDate(review.booking.endTime)}
          </div>
          {review.parkingSpace && (
            <div>
              <span className="font-medium">Space:</span> {review.parkingSpace.title}
            </div>
          )}
        </div>
      )}

      {review.parkingSpace && !showBooking && (
        <div className="text-sm text-blue-600 mt-2">
          <a href={`/parking-spaces/${review.parkingSpace.id}`}>
            → {review.parkingSpace.title}
          </a>
        </div>
      )}
    </div>
  )
}