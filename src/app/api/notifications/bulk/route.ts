import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/notifications/bulk - Bulk operations on notifications
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
    const { action, notificationIds } = body

    if (!action || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Verify all notifications belong to the user
    const notifications = await prisma.notification.findMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id,
      },
      select: { id: true }
    })

    const validIds = notifications.map(n => n.id)

    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid notifications found' },
        { status: 404 }
      )
    }

    let result

    switch (action) {
      case 'markAllRead':
        result = await prisma.notification.updateMany({
          where: {
            id: { in: validIds },
            userId: session.user.id,
          },
          data: { isRead: true }
        })
        break

      case 'markAllUnread':
        result = await prisma.notification.updateMany({
          where: {
            id: { in: validIds },
            userId: session.user.id,
          },
          data: { isRead: false }
        })
        break

      case 'deleteAll':
        result = await prisma.notification.deleteMany({
          where: {
            id: { in: validIds },
            userId: session.user.id,
          }
        })
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: {
        count: result.count,
        action,
      }
    })

  } catch (error) {
    console.error('Error performing bulk notification operation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}