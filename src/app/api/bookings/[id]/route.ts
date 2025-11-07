import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateBookingSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
})

// GET /api/bookings/[id] - Get single booking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
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
        reviews: true,
      }
    })

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this booking
    const hasAccess =
      booking.userId === session.user.id ||
      booking.parkingSpace.ownerId === session.user.id ||
      ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: booking
    })

  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/bookings/[id] - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        parkingSpace: {
          select: { ownerId: true }
        }
      }
    })

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { status } = updateBookingSchema.parse(body)

    // Check permissions and validate status changes
    const isOwner = booking.parkingSpace.ownerId === session.user.id
    const isUser = booking.userId === session.user.id
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)

    let allowedStatuses: string[] = []

    if (isOwner) {
      // Owners can confirm, active, complete bookings
      allowedStatuses = ['CONFIRMED', 'ACTIVE', 'COMPLETED']
    } else if (isUser) {
      // Users can cancel their own bookings
      allowedStatuses = ['CANCELLED']
    } else if (isAdmin) {
      // Admins can change to any status
      allowedStatuses = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED']
    }

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'You cannot change the booking status to this value' },
        { status: 403 }
      )
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: { status },
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

    // Create notifications based on status change
    let notificationTitle = ''
    let notificationMessage = ''
    let notificationUserId = ''

    if (status === 'CONFIRMED' && isOwner) {
      notificationTitle = 'Booking Confirmed'
      notificationMessage = `Your booking for "${updatedBooking.parkingSpace.title}" has been confirmed`
      notificationUserId = updatedBooking.userId
    } else if (status === 'CANCELLED' && isUser) {
      notificationTitle = 'Booking Cancelled'
      notificationMessage = `${updatedBooking.user.name} cancelled their booking for "${updatedBooking.parkingSpace.title}"`
      notificationUserId = updatedBooking.parkingSpace.ownerId
    } else if (status === 'COMPLETED' && isOwner) {
      notificationTitle = 'Booking Completed'
      notificationMessage = `Your booking for "${updatedBooking.parkingSpace.title}" has been completed. Please leave a review.`
      notificationUserId = updatedBooking.userId
    }

    if (notificationTitle && notificationUserId) {
      await prisma.notification.create({
        data: {
          userId: notificationUserId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'booking',
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${status.toLowerCase()} successfully`,
      data: updatedBooking
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating booking:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/bookings/[id] - Delete booking (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only admins can delete bookings' },
        { status: 403 }
      )
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id }
    })

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      )
    }

    await prisma.booking.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting booking:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}