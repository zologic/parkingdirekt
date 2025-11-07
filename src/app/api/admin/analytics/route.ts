import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get overview stats
    const [
      totalUsers,
      totalSpaces,
      totalBookings,
      activeBookings,
      totalRevenue,
      monthlyRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.parkingSpace.count({ where: { isActive: true } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] } } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
        },
        _sum: { amount: true }
      }),
    ])

    // Get user growth data
    const userGrowth = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= ${startDate}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    ` as Array<{ date: string; count: bigint }>

    // Get booking trends
    const bookingTrends = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count,
        status
      FROM bookings
      WHERE created_at >= ${startDate}
      GROUP BY DATE_TRUNC('day', created_at), status
      ORDER BY date ASC
    ` as Array<{ date: string; count: bigint; status: string }>

    // Get revenue trends
    const revenueTrends = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE created_at >= ${startDate} AND status = 'COMPLETED'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    ` as Array<{ date: string; revenue: bigint }>

    // Get top performing spaces
    const topSpaces = await prisma.parkingSpace.findMany({
      include: {
        _count: {
          select: {
            bookings: true,
            reviews: true,
          }
        },
        reviews: {
          select: {
            rating: true,
          }
        }
      },
      orderBy: {
        bookings: {
          _count: 'desc'
        }
      },
      take: 10,
    })

    // Calculate average ratings for top spaces
    const topSpacesWithRatings = topSpaces.map(space => ({
      ...space,
      averageRating: space.reviews.length > 0
        ? space.reviews.reduce((acc, review) => acc + review.rating, 0) / space.reviews.length
        : 0,
      totalRevenue: space._count.bookings * space.hourlyRate, // Simplified calculation
    }))

    // Get user demographics
    const userByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    })

    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
      }
    })

    const newSpacesThisMonth = await prisma.parkingSpace.count({
      where: {
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
      }
    })

    // Get recent activity
    const recentBookings = await prisma.booking.findMany({
      include: {
        user: {
          select: { name: true }
        },
        parkingSpace: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const recentReviews = await prisma.review.findMany({
      include: {
        reviewer: {
          select: { name: true }
        },
        parkingSpace: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalSpaces,
          totalBookings,
          activeBookings,
          totalRevenue: totalRevenue._sum.amount || 0,
          monthlyRevenue: monthlyRevenue._sum.amount || 0,
          newUsersThisMonth,
          newSpacesThisMonth,
        },
        userGrowth: userGrowth.map(item => ({
          date: item.date,
          count: Number(item.count)
        })),
        bookingTrends: bookingTrends.reduce((acc, item) => {
          const existing = acc.find(x => x.date === item.date)
          if (existing) {
            existing[item.status.toLowerCase()] = Number(item.count)
          } else {
            acc.push({
              date: item.date,
              [item.status.toLowerCase()]: Number(item.count)
            })
          }
          return acc
        }, [] as any[]),
        revenueTrends: revenueTrends.map(item => ({
          date: item.date,
          revenue: Number(item.revenue)
        })),
        topSpaces: topSpacesWithRatings,
        userDemographics: userByRole,
        recentActivity: {
          bookings: recentBookings,
          reviews: recentReviews,
        }
      }
    })

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}