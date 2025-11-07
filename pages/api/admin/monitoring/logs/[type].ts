import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdmin } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { type } = req.query
  const { method } = req

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'Log type is required' })
  }

  const validTypes = ['email', 'webhooks', 'api', 'audit', 'system']
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid log type' })
  }

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${method} Not Allowed` })
  }

  try {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      status,
      search
    } = req.query

    const pageNum = parseInt(page as string) || 1
    const limitNum = parseInt(limit as string) || 50
    const offset = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}

    if (startDate && endDate) {
      const start = new Date(startDate as string)
      const end = new Date(endDate as string)

      // Different date fields for different log types
      switch (type) {
        case 'email':
          where.sentAt = { gte: start, lte: end }
          break
        case 'webhooks':
          where.createdAt = { gte: start, lte: end }
          break
        case 'api':
          where.createdAt = { gte: start, lte: end }
          break
        case 'audit':
          where.createdAt = { gte: start, lte: end }
          break
        case 'system':
          where.timestamp = { gte: start, lte: end }
          break
      }
    }

    // Add status filter
    if (status) {
      where.status = status
    }

    // Add search filter
    if (search) {
      const searchTerm = search as string
      switch (type) {
        case 'email':
          where.OR = [
            { to: { contains: searchTerm, mode: 'insensitive' } },
            { subject: { contains: searchTerm, mode: 'insensitive' } },
            { provider: { contains: searchTerm, mode: 'insensitive' } }
          ]
          break
        case 'webhooks':
          where.OR = [
            { webhookUrl: { contains: searchTerm, mode: 'insensitive' } },
            { eventType: { contains: searchTerm, mode: 'insensitive' } }
          ]
          break
        case 'api':
          where.OR = [
            { identifier: { contains: searchTerm, mode: 'insensitive' } },
            { endpoint: { contains: searchTerm, mode: 'insensitive' } }
          ]
          break
        case 'audit':
          where.OR = [
            { target: { contains: searchTerm, mode: 'insensitive' } },
            { action: { contains: searchTerm, mode: 'insensitive' } }
          ]
          break
      }
    }

    let logs: any[] = []
    let total = 0

    switch (type) {
      case 'email':
        [logs, total] = await Promise.all([
          prisma.emailDeliveryLog.findMany({
            where,
            orderBy: { sentAt: 'desc' },
            skip: offset,
            take: limitNum,
            include: {
              // Add any relations if needed
            }
          }),
          prisma.emailDeliveryLog.count({ where })
        ])
        break

      case 'webhooks':
        [logs, total] = await Promise.all([
          prisma.webhookDeliveryLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limitNum
          }),
          prisma.webhookDeliveryLog.count({ where })
        ])
        break

      case 'api':
        [logs, total] = await Promise.all([
          prisma.apiRateLimitLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limitNum
          }),
          prisma.apiRateLimitLog.count({ where })
        ])
        break

      case 'audit':
        [logs, total] = await Promise.all([
          prisma.adminAuditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limitNum,
            include: {
              admin: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }),
          prisma.adminAuditLog.count({ where })
        ])
        break

      case 'system':
        [logs, total] = await Promise.all([
          prisma.systemHealthMetric.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            skip: offset,
            take: limitNum
          }),
          prisma.systemHealthMetric.count({ where })
        ])
        break
    }

    // Format logs based on type
    const formattedLogs = logs.map(formatLogByType(type))

    return res.status(200).json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        },
        filters: {
          startDate,
          endDate,
          status,
          search
        }
      }
    })

  } catch (error) {
    console.error(`Failed to fetch ${type} logs:`, error)
    return res.status(500).json({ error: 'Failed to fetch logs' })
  }
}

function formatLogByType(type: string) {
  return (log: any) => {
    const baseLog = {
      id: log.id,
      createdAt: log.createdAt || log.sentAt || log.timestamp
    }

    switch (type) {
      case 'email':
        return {
          ...baseLog,
          to: log.to,
          subject: log.subject,
          provider: log.provider,
          status: log.status,
          error: log.error,
          messageId: log.messageId,
          retryCount: log.retryCount,
          deliveredAt: log.deliveredAt
        }

      case 'webhooks':
        return {
          ...baseLog,
          webhookUrl: log.webhookUrl,
          eventType: log.eventType,
          status: log.status,
          responseCode: log.responseCode,
          retryCount: log.retryCount,
          nextRetryAt: log.nextRetryAt,
          deliveredAt: log.deliveredAt
        }

      case 'api':
        return {
          ...baseLog,
          identifier: log.identifier,
          endpoint: log.endpoint,
          method: log.method,
          statusCode: log.statusCode,
          blocked: log.blocked,
          limitType: log.limitType,
          requestCount: log.requestCount
        }

      case 'audit':
        return {
          ...baseLog,
          admin: log.admin,
          action: log.action,
          category: log.category,
          target: log.target,
          oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
          newValue: log.newValue ? JSON.parse(log.newValue) : null,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent
        }

      case 'system':
        return {
          ...baseLog,
          metricType: log.metricType,
          value: log.value,
          unit: log.unit,
          environment: log.environment
        }

      default:
        return baseLog
    }
  }
}

export default requireSuperAdmin(handler)