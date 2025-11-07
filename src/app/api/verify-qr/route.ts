import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseQRCode, validateQRCodeTimestamp } from '@/lib/qrcode'
import { z } from 'zod'

const verifyQRSchema = z.object({
  qrCode: z.string().min(1, 'QR code is required'),
  action: z.enum(['check-in', 'check-out', 'verify']).default('verify'),
})

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
    const { qrCode, action } = verifyQRSchema.parse(body)

    // Parse QR code
    const parsedQR = parseQRCode(qrCode)

    if (!parsedQR) {
      return NextResponse.json(
        { success: false, error: 'Invalid QR code format' },
        { status: 400 }
      )
    }

    // Validate QR code timestamp (prevent reuse of old QR codes)
    if (!validateQRCodeTimestamp(parsedQR.timestamp)) {
      return NextResponse.json(
        { success: false, error: 'QR code has expired' },
        { status: 400 }
      )
    }

    let result

    if (parsedQR.type === 'BOOKING') {
      result = await verifyBookingQR(parsedQR, session, action)
    } else if (parsedQR.type === 'SPACE') {
      result = await verifySpaceQR(parsedQR, session, action)
    } else {
      return NextResponse.json(
        { success: false, error: 'Unknown QR code type' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error verifying QR code:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function verifyBookingQR(
  parsedQR: { id: string; userId?: string },
  session: any,
  action: string
) {
  try {
    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: parsedQR.id },
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
        }
      }
    })

    if (!booking) {
      return {
        success: false,
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      }
    }

    // Verify user permissions
    const isOwner = booking.parkingSpace.ownerId === session.user.id
    const isBooker = booking.userId === session.user.id
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)

    if (!isOwner && !isBooker && !isAdmin) {
      return {
        success: false,
        error: 'You do not have permission to verify this booking',
        code: 'PERMISSION_DENIED'
      }
    }

    // Check booking status
    const now = new Date()
    const startTime = new Date(booking.startTime)
    const endTime = new Date(booking.endTime)

    let statusMessage = ''

    if (action === 'check-in') {
      // Check if it's time to check in
      if (now < startTime) {
        return {
          success: false,
          error: 'Too early to check in',
          code: 'EARLY_CHECK_IN',
          data: {
            booking,
            canCheckInAt: startTime,
          }
        }
      }

      if (now > endTime) {
        return {
          success: false,
          error: 'Booking period has ended',
          code: 'BOOKING_EXPIRED',
          data: { booking }
        }
      }

      // Update booking status to ACTIVE
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'ACTIVE' }
      })

      statusMessage = 'Check-in successful'

      // Create notification
      if (!isOwner) {
        await prisma.notification.create({
          data: {
            userId: booking.parkingSpace.ownerId,
            title: 'Check-in Confirmed',
            message: `${booking.user.name} has checked in for "${booking.parkingSpace.title}"`,
            type: 'booking',
          }
        })
      }

    } else if (action === 'check-out') {
      // Check if it's time to check out
      if (booking.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'Booking is not currently active',
          code: 'NOT_ACTIVE',
          data: { booking }
        }
      }

      // Update booking status to COMPLETED
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED' }
      })

      statusMessage = 'Check-out successful'

      // Create notification for review
      if (!isOwner) {
        await prisma.notification.create({
          data: {
            userId: booking.userId,
            title: 'Check-out Complete',
            message: `Your parking session at "${booking.parkingSpace.title}" has ended. Please leave a review!`,
            type: 'booking',
          }
        })
      }

    } else {
      // Just verify the QR code
      if (now < startTime) {
        statusMessage = `Valid booking - Check-in available at ${startTime.toLocaleString()}`
      } else if (now > endTime) {
        statusMessage = 'Booking has expired'
      } else {
        statusMessage = 'Valid booking - Ready for check-in/check-out'
      }
    }

    return {
      success: true,
      message: statusMessage,
      data: {
        booking,
        canCheckIn: now >= startTime && now <= endTime,
        canCheckOut: booking.status === 'ACTIVE',
        isActive: booking.status === 'ACTIVE',
        isExpired: now > endTime,
      }
    }

  } catch (error) {
    console.error('Error verifying booking QR:', error)
    return {
      success: false,
      error: 'Error verifying booking',
      code: 'VERIFICATION_ERROR'
    }
  }
}

async function verifySpaceQR(
  parsedQR: { id: string; userId?: string },
  session: any,
  action: string
) {
  try {
    // Get parking space details
    const parkingSpace = await prisma.parkingSpace.findUnique({
      where: { id: parsedQR.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    if (!parkingSpace) {
      return {
        success: false,
        error: 'Parking space not found',
        code: 'SPACE_NOT_FOUND'
      }
    }

    // Verify user permissions (owner or admin)
    const isOwner = parkingSpace.ownerId === session.user.id
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: 'Only the space owner can verify this QR code',
        code: 'PERMISSION_DENIED'
      }
    }

    return {
      success: true,
      message: 'Parking space verified successfully',
      data: {
        parkingSpace,
        spaceId: parkingSpace.id,
        title: parkingSpace.title,
        address: parkingSpace.address,
      }
    }

  } catch (error) {
    console.error('Error verifying space QR:', error)
    return {
      success: false,
      error: 'Error verifying parking space',
      code: 'VERIFICATION_ERROR'
    }
  }
}