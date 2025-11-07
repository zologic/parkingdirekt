import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdmin } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import {
  getSystemConfig,
  updateMultipleConfigs,
  invalidateConfigCache,
  encrypt
} from '@/lib/config'

const prisma = new PrismaClient()

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { category } = req.query
  const { method } = req

  if (!category || typeof category !== 'string') {
    return res.status(400).json({ error: 'Category is required' })
  }

  const validCategories = [
    'financial', 'automation', 'platform', 'email', 'api', 'maintenance', 'feature', 'integrations'
  ]

  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' })
  }

  try {
    switch (method) {
      case 'GET':
        return await handleGet(req, res, category)
      case 'POST':
        return await handlePost(req, res, category)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${method} Not Allowed` })
    }
  } catch (error) {
    console.error(`API Error for category ${category}:`, error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, category: string) {
  try {
    const environment = req.query.environment as string || 'production'

    let data: any = {}

    switch (category) {
      case 'financial':
        data = await getFinancialSettings(environment)
        break
      case 'automation':
        data = await getAutomationSettings(environment)
        break
      case 'platform':
        data = await getPlatformSettings(environment)
        break
      case 'email':
        data = await getEmailSettings(environment)
        break
      case 'api':
        data = await getApiSettings(environment)
        break
      case 'integrations':
        data = await getIntegrationSettings(environment)
        break
      case 'monitoring':
        data = await getMonitoringData()
        break
      default:
        data = await getSystemConfig(category, environment)
    }

    return res.status(200).json({
      success: true,
      data,
      metadata: {
        category,
        environment,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error(`GET error for category ${category}:`, error)
    return res.status(500).json({ error: 'Failed to fetch settings' })
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, category: string) {
  try {
    const { settings, environment = 'production' } = req.body

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' })
    }

    const userId = (req as any).user?.id
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' })
    }

    // Validate settings based on category
    const validationResult = validateSettings(category, settings)
    if (!validationResult.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.errors
      })
    }

    // Get old values for audit logging
    const oldSettings = await getSystemConfig(category, environment)

    // Prepare updates array
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      category,
      type: getSettingType(category, key),
      description: getSettingDescription(category, key),
      isSecret: getSettingSecretStatus(category, key)
    }))

    // Update settings
    await updateMultipleConfigs(updates, userId, environment)

    // Create audit log entries
    await Promise.all(
      Object.entries(settings).map(async ([key, newValue]) => {
        const oldValue = oldSettings[key]?.value
        if (oldValue !== newValue) {
          await prisma.adminAuditLog.create({
            data: {
              adminId: userId,
              action: 'update',
              category: 'config',
              target: `${category}.${key}`,
              oldValue: oldValue ? JSON.stringify(oldValue) : null,
              newValue: JSON.stringify(newValue),
              environment,
              ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
              userAgent: req.headers['user-agent']
            }
          })
        }
      })
    )

    // Invalidate cache for this category
    invalidateConfigCache(category, environment)

    // Return updated settings
    const updatedData = await getSystemConfig(category, environment)

    return res.status(200).json({
      success: true,
      data: updatedData,
      message: 'Settings updated successfully'
    })

  } catch (error) {
    console.error(`POST error for category ${category}:`, error)
    return res.status(500).json({ error: 'Failed to update settings' })
  }
}

// Helper functions for each category
async function getFinancialSettings(environment: string) {
  const settings = await getSystemConfig('financial', environment)
  const revenue = await prisma.platformRevenue.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  return {
    settings,
    revenue: revenue.map(r => ({
      id: r.id,
      transactionId: r.transactionId,
      amount: Number(r.amount),
      commissionPercent: Number(r.commissionPercent),
      commissionAmount: Number(r.commissionAmount),
      ownerAmount: Number(r.ownerAmount),
      currency: r.currency,
      status: r.status,
      createdAt: r.createdAt
    }))
  }
}

async function getAutomationSettings(environment: string) {
  return await getSystemConfig('automation', environment)
}

async function getPlatformSettings(environment: string) {
  const configs = await getSystemConfig('platform', environment)
  const featureFlags = await prisma.featureFlag.findMany({
    where: { environment },
    orderBy: { key: 'asc' }
  })

  return {
    configs,
    featureFlags: featureFlags.map(f => ({
      key: f.key,
      name: f.name,
      enabled: f.enabled,
      rolloutPercentage: f.rolloutPercentage,
      updatedAt: f.updatedAt
    }))
  }
}

async function getEmailSettings(environment: string) {
  const configs = await getSystemConfig('email', environment)
  const deliveryStats = await prisma.emailDeliveryLog.groupBy({
    by: ['status', 'provider'],
    where: {
      sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    _count: { id: true }
  })

  return {
    configs,
    stats: deliveryStats
  }
}

async function getApiSettings(environment: string) {
  const configs = await getSystemConfig('api', environment)
  const rateLimitStats = await prisma.apiRateLimitLog.groupBy({
    by: ['limitType', 'blocked'],
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    _count: { id: true }
  })

  return {
    configs,
    rateLimitStats
  }
}

async function getIntegrationSettings(environment: string) {
  const integrations = await prisma.integrationSettings.findMany({
    where: { environment },
    orderBy: [{ name: 'asc' }, { key: 'asc' }]
  })

  return integrations.map(integration => ({
    id: integration.id,
    name: integration.name,
    key: integration.key,
    value: '••••••••', // Mask sensitive values
    isActive: integration.isActive,
    description: integration.description,
    updatedAt: integration.updatedAt
  }))
}

async function getMonitoringData() {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [
    totalBookings,
    activeBookings,
    totalRevenue,
    recentErrors,
    systemHealth
  ] = await Promise.all([
    prisma.booking.count({ where: { createdAt: { gte: yesterday } } }),
    prisma.booking.count({ where: { status: 'active' } }),
    prisma.platformRevenue.aggregate({
      where: { status: 'completed', createdAt: { gte: yesterday } },
      _sum: { amount: true }
    }),
    prisma.adminAuditLog.count({
      where: { createdAt: { gte: yesterday } }
    }),
    prisma.systemHealthMetric.findMany({
      where: { timestamp: { gte: yesterday } },
      orderBy: { timestamp: 'desc' },
      take: 100
    })
  ])

  return {
    overview: {
      totalBookings,
      activeBookings,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      recentErrors
    },
    healthMetrics: systemHealthMetrics,
    auditLogs: recentErrors
  }
}

// Validation functions
function validateSettings(category: string, settings: Record<string, any>) {
  const errors: string[] = []

  switch (category) {
    case 'financial':
      validateFinancialSettings(settings, errors)
      break
    case 'automation':
      validateAutomationSettings(settings, errors)
      break
    case 'email':
      validateEmailSettings(settings, errors)
      break
    case 'api':
      validateApiSettings(settings, errors)
      break
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

function validateFinancialSettings(settings: Record<string, any>, errors: string[]) {
  if ('platformCommissionPercent' in settings) {
    const value = parseFloat(settings.platformCommissionPercent)
    if (isNaN(value) || value < 0 || value > 50) {
      errors.push('platformCommissionPercent must be between 0 and 50')
    }
  }

  if ('serviceFeePercent' in settings) {
    const value = parseFloat(settings.serviceFeePercent)
    if (isNaN(value) || value < 0 || value > 10) {
      errors.push('serviceFeePercent must be between 0 and 10')
    }
  }

  if ('minimumPayoutThreshold' in settings) {
    const value = parseFloat(settings.minimumPayoutThreshold)
    if (isNaN(value) || value < 10) {
      errors.push('minimumPayoutThreshold must be at least 10.00')
    }
  }
}

function validateAutomationSettings(settings: Record<string, any>, errors: string[]) {
  if ('gracePeriod' in settings) {
    const value = parseInt(settings.gracePeriod)
    if (isNaN(value) || value < 0 || value > 60) {
      errors.push('gracePeriod must be between 0 and 60 minutes')
    }
  }

  if ('overstayRateMultiplier' in settings) {
    const value = parseFloat(settings.overstayRateMultiplier)
    if (isNaN(value) || value < 1.0 || value > 10.0) {
      errors.push('overstayRateMultiplier must be between 1.0 and 10.0')
    }
  }

  if ('bookingBuffer' in settings) {
    const value = parseInt(settings.bookingBuffer)
    if (isNaN(value) || value < 0 || value > 60) {
      errors.push('bookingBuffer must be between 0 and 60 minutes')
    }
  }
}

function validateEmailSettings(settings: Record<string, any>, errors: string[]) {
  if ('defaultFromEmail' in settings) {
    const email = settings.defaultFromEmail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.push('defaultFromEmail must be a valid email address')
    }
  }

  if ('notificationRetryLimit' in settings) {
    const value = parseInt(settings.notificationRetryLimit)
    if (isNaN(value) || value < 1 || value > 10) {
      errors.push('notificationRetryLimit must be between 1 and 10')
    }
  }
}

function validateApiSettings(settings: Record<string, any>, errors: string[]) {
  if ('maxRequestsPerMinute' in settings) {
    const value = parseInt(settings.maxRequestsPerMinute)
    if (isNaN(value) || value < 1 || value > 1000) {
      errors.push('maxRequestsPerMinute must be between 1 and 1000')
    }
  }

  if ('rateLimitMode' in settings) {
    const validModes = ['per_user', 'per_ip', 'global']
    if (!validModes.includes(settings.rateLimitMode)) {
      errors.push('rateLimitMode must be one of: per_user, per_ip, global')
    }
  }
}

// Helper functions for setting metadata
function getSettingType(category: string, key: string): 'string' | 'number' | 'boolean' | 'json' {
  const numberSettings = ['platformCommissionPercent', 'serviceFeePercent', 'gracePeriod', 'overstayRateMultiplier']
  const booleanSettings = ['enableAutoBilling', 'maintenanceMode', 'enableRateLimiting', 'enablePushNotifications']

  if (numberSettings.includes(key)) return 'number'
  if (booleanSettings.includes(key)) return 'boolean'
  return 'string'
}

function getSettingDescription(category: string, key: string): string {
  const descriptions: Record<string, string> = {
    'platformCommissionPercent': 'Platform commission percentage from transactions',
    'gracePeriod': 'Minutes before overstay charges apply',
    'overstayRateMultiplier': 'Multiplier for overstay rate calculation',
    'enableAutoBilling': 'Enable automatic billing for overstays',
    'maintenanceMode': 'Enable maintenance mode for the platform'
  }
  return descriptions[key] || `${category} setting: ${key}`
}

function getSettingSecretStatus(category: string, key: string): boolean {
  const secretKeys = ['apiKey', 'secretKey', 'password', 'token']
  return secretKeys.some(secretKey => key.toLowerCase().includes(secretKey.toLowerCase()))
}

export default requireSuperAdmin(handler)