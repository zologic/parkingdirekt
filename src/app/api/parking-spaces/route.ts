import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSpaceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  address: z.string().min(5, 'Address is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive'),
  dailyRate: z.number().min(0).optional(),
  monthlyRate: z.number().min(0).optional(),
  spaceType: z.enum(['INDOOR', 'OUTDOOR', 'GARAGE', 'DRIVEWAY']),
  vehicleTypes: z.array(z.enum(['CAR', 'MOTORCYCLE', 'TRUCK', 'SUV'])),
  sizeDimensions: z.string().optional(),
  accessInstructions: z.string().optional(),
  photos: z.array(z.string()).default([]),
})

// GET /api/parking-spaces - List all parking spaces with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const spaceType = searchParams.get('spaceType')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const latitude = searchParams.get('latitude')
    const longitude = searchParams.get('longitude')
    const radius = searchParams.get('radius') || '10'

    const skip = (page - 1) * limit

    const where: any = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (spaceType) {
      where.spaceType = spaceType
    }

    if (minPrice || maxPrice) {
      where.hourlyRate = {}
      if (minPrice) where.hourlyRate.gte = parseFloat(minPrice)
      if (maxPrice) where.hourlyRate.lte = parseFloat(maxPrice)
    }

    // If latitude and longitude are provided, add proximity filter
    if (latitude && longitude) {
      // Note: For production, you'd want to use PostGIS or a proper geospatial query
      // This is a simplified bounding box approach
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      const r = parseFloat(radius)

      // Rough degree conversion (1 degree ≈ 69 miles)
      const latRange = r / 69
      const lngRange = r / (Math.abs(Math.cos(lat * Math.PI / 180)) * 69)

      where.latitude = {
        gte: lat - latRange,
        lte: lat + latRange,
      }
      where.longitude = {
        gte: lng - lngRange,
        lte: lng + lngRange,
      }
    }

    const [spaces, total] = await Promise.all([
      prisma.parkingSpace.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            }
          },
          _count: {
            select: {
              reviews: true,
              bookings: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.parkingSpace.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: spaces,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })

  } catch (error) {
    console.error('Error fetching parking spaces:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/parking-spaces - Create new parking space
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Only owners can create parking spaces' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createSpaceSchema.parse(body)

    const parkingSpace = await prisma.parkingSpace.create({
      data: {
        ...validatedData,
        ownerId: session.user.id,
        // Generate QR code for the space
        qrCode: `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
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
      message: 'Parking space created successfully',
      data: parkingSpace
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating parking space:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}