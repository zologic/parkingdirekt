import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createReviewSchema = z.object({
  bookingId: z.string().cuid('Invalid booking ID'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().optional(),
})

// GET /api/reviews - Get reviews with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const parkingSpaceId = searchParams.get('parkingSpaceId')
    const userId = searchParams.get('userId')
    const rating = searchParams.get('rating')
    const skip = (page - 1) * limit

    const where: any = {}

    if (parkingSpaceId) {
      where.parkingSpaceId = parkingSpaceId
    }

    if (userId) {
      where.reviewerId = userId
    }

    if (rating) {
      where.rating = parseInt(rating)
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            }
          },
          reviewee: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            }
          },
          parkingSpace: {
            select: {
              id: true,
              title: true,
            }
          },
          booking: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ])

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      : 0

    // Get rating distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: reviews.filter(review => review.rating === rating).length,
    }))

    return NextResponse.json({
      success: true,
      data: reviews,
      stats: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: total,
        ratingDistribution,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })

  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/reviews - Create new review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createReviewSchema.parse(body)

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: validatedData.bookingId },
      include: {
        user: true,
        parkingSpace: true,
        reviews: true,
      }
    })

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const isReviewer = booking.userId === session.user.id
    const isOwner = booking.parkingSpace.ownerId === session.user.id
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)

    if (!isReviewer && !isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'You can only review bookings you are involved in' },
        { status: 403 }
      )
    }

    // Check if booking is completed
    if (booking.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'You can only review completed bookings' },
        { status: 400 }
      )
    }

    // Check if review already exists
    const existingReview = booking.reviews.find(
      review => review.reviewerId === session.user.id
    )

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this booking' },
        { status: 409 }
      )
    }

    // Determine who is being reviewed
    let revieweeId: string
    if (isReviewer) {
      // User is reviewing the parking space owner
      revieweeId = booking.parkingSpace.ownerId
    } else {
      // Owner is reviewing the user
      revieweeId = booking.userId
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId: validatedData.bookingId,
        reviewerId: session.user.id,
        revieweeId,
        parkingSpaceId: booking.parkingSpaceId,
        rating: validatedData.rating,
        comment: validatedData.comment || '',
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          }
        },
        reviewee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          }
        },
        parkingSpace: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    })

    // Create notification for the person being reviewed
    await prisma.notification.create({
      data: {
        userId: revieweeId,
        title: 'New Review',
        message: `${review.reviewer.name} left you a ${review.rating}-star review for "${booking.parkingSpace.title}"`,
        type: 'review',
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Review created successfully',
      data: review
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating review:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}