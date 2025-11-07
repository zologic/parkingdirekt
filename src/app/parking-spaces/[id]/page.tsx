import { notFound } from 'next/navigation'
import { ParkingSpaceWithRelations } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star, MapPin, DollarSign, User, Calendar } from 'lucide-react'

async function getParkingSpace(id: string): Promise<ParkingSpaceWithRelations> {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/parking-spaces/${id}`, {
    cache: 'no-store'
  })

  if (!response.ok) {
    return notFound()
  }

  const data = await response.json()
  return data.data
}

export default async function ParkingSpacePage({ params }: { params: { id: string } }) {
  const space = await getParkingSpace(params.id)

  const averageRating = space.reviews.length > 0
    ? space.reviews.reduce((acc, review) => acc + review.rating, 0) / space.reviews.length
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              {space.photos && space.photos.length > 0 ? (
                <div className="relative h-96">
                  <img
                    src={space.photos[0]}
                    alt={space.title}
                    className="w-full h-full object-cover"
                  />
                  {space.photos.length > 1 && (
                    <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
                      +{space.photos.length - 1} more photos
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-96 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">No photos available</span>
                </div>
              )}
            </div>

            {/* Details */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl mb-2">{space.title}</CardTitle>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{space.address}</span>
                    </div>
                  </div>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {space.spaceType}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-gray-600">{space.description}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Pricing</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center text-green-600 font-semibold">
                        <DollarSign className="w-5 h-5" />
                        ${space.hourlyRate}/hour
                      </div>
                      {space.dailyRate && (
                        <div className="flex items-center text-gray-600">
                          <DollarSign className="w-5 h-5" />
                          ${space.dailyRate}/day
                        </div>
                      )}
                      {space.monthlyRate && (
                        <div className="flex items-center text-gray-600">
                          <DollarSign className="w-5 h-5" />
                          ${space.monthlyRate}/month
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Vehicle Types</h3>
                    <div className="flex flex-wrap gap-2">
                      {space.vehicleTypes.map((type) => (
                        <span
                          key={type}
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  {space.sizeDimensions && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Size Dimensions</h3>
                      <p className="text-gray-600">{space.sizeDimensions}</p>
                    </div>
                  )}

                  {space.accessInstructions && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Access Instructions</h3>
                      <p className="text-gray-600">{space.accessInstructions}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Availability</h3>
                    {space.availability && space.availability.length > 0 ? (
                      <div className="space-y-2">
                        {space.availability.slice(0, 5).map((avail) => (
                          <div key={avail.id} className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(avail.date).toLocaleDateString()} - {avail.startTime} to {avail.endTime}
                          </div>
                        ))}
                        {space.availability.length > 5 && (
                          <p className="text-sm text-blue-600">+{space.availability.length - 5} more time slots</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">No availability information</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Owner Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Owner Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  {space.owner?.avatarUrl ? (
                    <img
                      src={space.owner.avatarUrl}
                      alt={space.owner.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{space.owner?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">
                      {space._count?.bookings || 0} bookings
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  Rating & Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(averageRating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold">
                    {averageRating > 0 ? averageRating.toFixed(1) : 'No rating'}
                  </span>
                  <span className="text-gray-500">
                    ({space.reviews.length} review{space.reviews.length !== 1 ? 's' : ''})
                  </span>
                </div>

                <button className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-semibold">
                  Book This Space
                </button>
              </CardContent>
            </Card>

            {/* Reviews */}
            {space.reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {space.reviews.slice(0, 3).map((review) => (
                      <div key={review.id} className="border-b pb-3 last:border-b-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            {review.reviewer?.avatarUrl ? (
                              <img
                                src={review.reviewer.avatarUrl}
                                alt={review.reviewer.name}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                            )}
                            <span className="font-medium text-sm">{review.reviewer?.name}</span>
                          </div>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < review.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-600">{review.comment}</p>
                        )}
                      </div>
                    ))}
                    {space.reviews.length > 3 && (
                      <button className="text-blue-600 text-sm hover:text-blue-500">
                        View all {space.reviews.length} reviews
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}