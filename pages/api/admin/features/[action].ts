import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdmin } from '@/lib/auth'
import {
  toggleFlag,
  updateRolloutPercentage,
  updateConditions,
  createFlag,
  getAllFlags,
  emergencyRollout,
  emergencyRollback,
  getUsageStats
} from '@/lib/featureFlags'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query
  const { method } = req

  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'Action is required' })
  }

  const validActions = ['toggle', 'rollout', 'conditions', 'create', 'list', 'emergency-rollback', 'stats']
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' })
  }

  try {
    switch (action) {
      case 'toggle':
        return await handleToggle(req, res)
      case 'rollout':
        return await handleRollout(req, res)
      case 'conditions':
        return await handleConditions(req, res)
      case 'create':
        return await handleCreate(req, res)
      case 'list':
        return await handleList(req, res)
      case 'emergency-rollback':
        return await handleEmergencyRollback(req, res)
      case 'stats':
        return await handleStats(req, res)
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error(`Feature flag ${action} error:`, error)
    return res.status(500).json({
      error: 'Feature flag operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleToggle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { flagKey, enabled } = req.body

  if (!flagKey || typeof enabled !== 'boolean') {
    return res.status(400).json({
      error: 'flagKey and enabled (boolean) are required'
    })
  }

  const userId = (req as any).user?.id
  if (!userId) {
    return res.status(401).json({ error: 'User authentication required' })
  }

  await toggleFlag(flagKey, enabled, userId)

  return res.status(200).json({
    success: true,
    message: `Feature flag ${flagKey} ${enabled ? 'enabled' : 'disabled'}`
  })
}

async function handleRollout(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { flagKey, percentage } = req.body

  if (!flagKey || typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
    return res.status(400).json({
      error: 'flagKey and percentage (0-100) are required'
    })
  }

  const userId = (req as any).user?.id
  if (!userId) {
    return res.status(401).json({ error: 'User authentication required' })
  }

  await updateRolloutPercentage(flagKey, percentage, userId)

  return res.status(200).json({
    success: true,
    message: `Feature flag ${flagKey} rollout updated to ${percentage}%`
  })
}

async function handleConditions(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { flagKey, conditions } = req.body

  if (!flagKey || !conditions) {
    return res.status(400).json({
      error: 'flagKey and conditions are required'
    })
  }

  const userId = (req as any).user?.id
  if (!userId) {
    return res.status(401).json({ error: 'User authentication required' })
  }

  await updateConditions(flagKey, conditions, userId)

  return res.status(200).json({
    success: true,
    message: `Feature flag ${flagKey} conditions updated`
  })
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const {
    flagKey,
    name,
    description,
    enabled = false,
    rolloutPercentage = 100,
    conditions
  } = req.body

  if (!flagKey || !name) {
    return res.status(400).json({
      error: 'flagKey and name are required'
    })
  }

  const userId = (req as any).user?.id
  if (!userId) {
    return res.status(401).json({ error: 'User authentication required' })
  }

  await createFlag(
    flagKey,
    name,
    description,
    enabled,
    rolloutPercentage,
    conditions,
    userId
  )

  return res.status(201).json({
    success: true,
    message: `Feature flag ${flagKey} created successfully`
  })
}

async function handleList(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { environment = 'production' } = req.query

  const flags = await getAllFlags(environment as string)

  return res.status(200).json({
    success: true,
    data: {
      flags,
      environment,
      total: flags.length
    }
  })
}

async function handleEmergencyRollback(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const userId = (req as any).user?.id
  if (!userId) {
    return res.status(401).json({ error: 'User authentication required' })
  }

  const { environment = 'production' } = req.body

  await emergencyRollback(userId, environment as string)

  return res.status(200).json({
    success: true,
    message: 'Emergency rollback completed - all feature flags disabled'
  })
}

async function handleStats(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { days = 7 } = req.query

  const stats = await getUsageStats(parseInt(days as string))

  return res.status(200).json({
    success: true,
    data: stats
  })
}

export default requireSuperAdmin(handler)