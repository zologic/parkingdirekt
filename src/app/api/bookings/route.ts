import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createBookingSchema = z.object({
  parkingSpaceId: z.string().cuid('Invalid parking space ID'),
  startTime: z.string().datetime('Invalid start time'),
  endTime: z.string().datetime('Invalid end time'),
  totalPrice: z.number().min(0, 'Total price must be positive'),
})

// GET /api/bookings - Get user's bookings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const skip = (page - 1) * limit

    const where: any = {}

    // Filter based on user role
    if (session.user.role === 'OWNER') {
      // Owners see bookings for their parking spaces
      where.parkingSpace = {
        ownerId: session.user.id
      }
    } else {
      // Users see their own bookings
      where.userId = session.user.id
    }

    if (status) {
      where.status = status.toUpperCase()
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            }
          },
          parkingSpace: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })

  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/bookings - Create new booking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role === 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Owners cannot book their own spaces' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createBookingSchema.parse(body)

    // Check if parking space exists and is available
    const parkingSpace = await prisma.parkingSpace.findUnique({
      where: { id: validatedData.parkingSpaceId },
      include: {
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'ACTIVE']
            }
          }
        }
      }
    })

    if (!parkingSpace) {
      return NextResponse.json(
        { success: false, error: 'Parking space not found' },
        { status: 404 }
      )
    }

    if (!parkingSpace.isActive) {
      return NextResponse.json(
        { success: false, error: 'Parking space is not available' },
        { status: 400 }
      )
    }

    // Check for booking conflicts
    const startTime = new Date(validatedData.startTime)
    const endTime = new Date(validatedData.endTime)

    if (startTime >= endTime) {
      return NextResponse.json(
        { success: false, error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    const hasConflict = parkingSpace.bookings.some(booking => {
      const bookingStart = new Date(booking.startTime)
      const bookingEnd = new Date(booking.endTime)

      return (
        (startTime < bookingEnd && endTime > bookingStart)
      )
    })

    if (hasConflict) {
      return NextResponse.json(
        { success: false, error: 'Parking space is already booked for this time period' },
        { status: 409 }
      )
    }

    // Generate QR code for the booking
    const qrCode = `BOOKING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: session.user.id,
        parkingSpaceId: validatedData.parkingSpaceId,
        startTime,
        endTime,
        totalPrice: validatedData.totalPrice,
        status: 'PENDING',
        qrCode,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        parkingSpace: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      }
    })

    // Create notification for parking space owner
    await prisma.notification.create({
      data: {
        userId: parkingSpace.ownerId,
        title: 'New Booking Request',
        message: `${booking.user.name} wants to book your parking space "${parkingSpace.title}"`,
        type: 'booking',
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating booking:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}