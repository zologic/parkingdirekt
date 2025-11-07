import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSpaceSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  address: z.string().min(5).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  hourlyRate: z.number().min(0).optional(),
  dailyRate: z.number().min(0).optional(),
  monthlyRate: z.number().min(0).optional(),
  spaceType: z.enum(['INDOOR', 'OUTDOOR', 'GARAGE', 'DRIVEWAY']).optional(),
  vehicleTypes: z.array(z.enum(['CAR', 'MOTORCYCLE', 'TRUCK', 'SUV'])).optional(),
  sizeDimensions: z.string().optional(),
  accessInstructions: z.string().optional(),
  photos: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

// GET /api/parking-spaces/[id] - Get single parking space
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parkingSpace = await prisma.parkingSpace.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            email: true,
          }
        },
        availability: {
          where: {
            date: {
              gte: new Date(),
            },
            isAvailable: true,
          },
          orderBy: {
            date: 'asc',
          }
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc',
          }
        },
        _count: {
          select: {
            reviews: true,
            bookings: true,
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

    return NextResponse.json({
      success: true,
      data: parkingSpace
    })

  } catch (error) {
    console.error('Error fetching parking space:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/parking-spaces/[id] - Update parking space
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

    const parkingSpace = await prisma.parkingSpace.findUnique({
      where: { id: params.id },
      select: { ownerId: true }
    })

    if (!parkingSpace) {
      return NextResponse.json(
        { success: false, error: 'Parking space not found' },
        { status: 404 }
      )
    }

    // Check if user is the owner or admin
    if (parkingSpace.ownerId !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateSpaceSchema.parse(body)

    const updatedSpace = await prisma.parkingSpace.update({
      where: { id: params.id },
      data: validatedData,
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

    return NextResponse.json({
      success: true,
      message: 'Parking space updated successfully',
      data: updatedSpace
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating parking space:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/parking-spaces/[id] - Delete parking space
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

    const parkingSpace = await prisma.parkingSpace.findUnique({
      where: { id: params.id },
      select: { ownerId: true }
    })

    if (!parkingSpace) {
      return NextResponse.json(
        { success: false, error: 'Parking space not found' },
        { status: 404 }
      )
    }

    // Check if user is the owner or admin
    if (parkingSpace.ownerId !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    await prisma.parkingSpace.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Parking space deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting parking space:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}