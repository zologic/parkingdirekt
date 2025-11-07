import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

interface FeatureFlagContext {
  userId?: string
  role?: string
  email?: string
  environment?: string
  [key: string]: any
}

interface FeatureFlagRule {
  type: 'user_id' | 'role' | 'email_domain' | 'percentage' | 'custom'
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'regex'
  value: any
  percentage?: number
}

class FeatureFlagManager {
  private cache: Map<string, { flag: any; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 2 * 60 * 1000 // 2 minutes

  /**
   * Check if a feature flag is enabled for a given context
   */
  async isEnabled(
    flagKey: string,
    context: FeatureFlagContext = {},
    environment: string = 'production'
  ): Promise<boolean> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(flagKey, context, environment)
      const cached = this.cache.get(cacheKey)

      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.flag.enabled
      }

      // Fetch flag from database
      const flag = await prisma.featureFlag.findUnique({
        where: { key: flagKey }
      })

      if (!flag) {
        // Flag not found, default to disabled
        this.cache.set(cacheKey, { flag: { enabled: false }, timestamp: Date.now() })
        return false
      }

      // Check environment match
      if (flag.environment !== environment) {
        this.cache.set(cacheKey, { flag: { enabled: false }, timestamp: Date.now() })
        return false
      }

      let isEnabled = flag.enabled

      // If flag is enabled and has rollout conditions, evaluate them
      if (isEnabled && (flag.rolloutPercentage < 100 || flag.conditions)) {
        isEnabled = await this.evaluateConditions(flag, context)
      }

      // Cache the result
      this.cache.set(cacheKey, { flag: { enabled: isEnabled }, timestamp: Date.now() })

      return isEnabled

    } catch (error) {
      console.error(`Failed to check feature flag ${flagKey}:`, error)
      // Fail safe - return false if we can't determine the flag state
      return false
    }
  }

  /**
   * Get the complete configuration for a feature flag
   */
  async getFlagConfig(flagKey: string, environment: string = 'production'): Promise<any> {
    try {
      const flag = await prisma.featureFlag.findUnique({
        where: { key: flagKey }
      })

      if (!flag || flag.environment !== environment) {
        return null
      }

      return {
        key: flag.key,
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        conditions: flag.conditions ? JSON.parse(flag.conditions) : null,
        environment: flag.environment,
        updatedAt: flag.updatedAt
      }

    } catch (error) {
      console.error(`Failed to get feature flag config for ${flagKey}:`, error)
      return null
    }
  }

  /**
   * Toggle a feature flag on/off
   */
  async toggleFlag(flagKey: string, enabled: boolean, updatedBy: string, environment: string = 'production'): Promise<void> {
    try {
      await prisma.featureFlag.update({
        where: { key: flagKey },
        data: {
          enabled,
          updatedBy
        }
      })

      // Invalidate cache for this flag
      this.invalidateFlagCache(flagKey)

    } catch (error) {
      console.error(`Failed to toggle feature flag ${flagKey}:`, error)
      throw error
    }
  }

  /**
   * Update rollout percentage for a feature flag
   */
  async updateRolloutPercentage(
    flagKey: string,
    percentage: number,
    updatedBy: string,
    environment: string = 'production'
  ): Promise<void> {
    try {
      if (percentage < 0 || percentage > 100) {
        throw new Error('Rollout percentage must be between 0 and 100')
      }

      await prisma.featureFlag.update({
        where: { key: flagKey },
        data: {
          rolloutPercentage: percentage,
          updatedBy
        }
      })

      // Invalidate cache for this flag
      this.invalidateFlagCache(flagKey)

    } catch (error) {
      console.error(`Failed to update rollout percentage for ${flagKey}:`, error)
      throw error
    }
  }

  /**
   * Update targeting conditions for a feature flag
   */
  async updateConditions(
    flagKey: string,
    conditions: any,
    updatedBy: string,
    environment: string = 'production'
  ): Promise<void> {
    try {
      await prisma.featureFlag.update({
        where: { key: flagKey },
        data: {
          conditions: JSON.stringify(conditions),
          updatedBy
        }
      })

      // Invalidate cache for this flag
      this.invalidateFlagCache(flagKey)

    } catch (error) {
      console.error(`Failed to update conditions for ${flagKey}:`, error)
      throw error
    }
  }

  /**
   * Create a new feature flag
   */
  async createFlag(
    flagKey: string,
    name: string,
    description: string | null,
    enabled: boolean = false,
    rolloutPercentage: number = 100,
    conditions: any = null,
    updatedBy: string,
    environment: string = 'production'
  ): Promise<void> {
    try {
      await prisma.featureFlag.create({
        data: {
          key: flagKey,
          name,
          description,
          enabled,
          rolloutPercentage,
          conditions: conditions ? JSON.stringify(conditions) : null,
          environment,
          updatedBy
        }
      })

    } catch (error) {
      console.error(`Failed to create feature flag ${flagKey}:`, error)
      throw error
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(environment: string = 'production'): Promise<any[]> {
    try {
      const flags = await prisma.featureFlag.findMany({
        where: { environment },
        orderBy: { key: 'asc' }
      })

      return flags.map(flag => ({
        key: flag.key,
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        conditions: flag.conditions ? JSON.parse(flag.conditions) : null,
        environment: flag.environment,
        updatedAt: flag.updatedAt,
        createdAt: flag.createdAt
      }))

    } catch (error) {
      console.error('Failed to get all feature flags:', error)
      return []
    }
  }

  /**
   * Get active feature flags for a user
   */
  async getActiveFlags(context: FeatureFlagContext = {}, environment: string = 'production'): Promise<any[]> {
    try {
      const allFlags = await this.getAllFlags(environment)

      // Check each flag for the given context
      const activeFlags = await Promise.all(
        allFlags.map(async (flag) => {
          const isEnabled = await this.isEnabled(flag.key, context, environment)
          return isEnabled ? flag : null
        })
      )

      return activeFlags.filter(Boolean)

    } catch (error) {
      console.error('Failed to get active feature flags:', error)
      return []
    }
  }

  /**
   * Emergency rollback - disable all feature flags
   */
  async emergencyRollback(updatedBy: string, environment: string = 'production'): Promise<void> {
    try {
      await prisma.featureFlag.updateMany({
        where: { environment },
        data: {
          enabled: false,
          updatedBy
        }
      })

      // Clear entire cache
      this.cache.clear()

    } catch (error) {
      console.error('Failed to perform emergency rollback:', error)
      throw error
    }
  }

  /**
   * Evaluate targeting conditions for a feature flag
   */
  private async evaluateConditions(flag: any, context: FeatureFlagContext): Promise<boolean> {
    // Check rollout percentage first
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashUserForRollout(context.userId || context.email || 'anonymous')
      const userPercentage = (hash % 100) + 1 // 1-100
      if (userPercentage > flag.rolloutPercentage) {
        return false
      }
    }

    // Check custom conditions if they exist
    if (!flag.conditions) {
      return true
    }

    try {
      const conditions = JSON.parse(flag.conditions)
      return this.evaluateRule(conditions, context)
    } catch (error) {
      console.error('Failed to evaluate feature flag conditions:', error)
      return true // Default to enabled if conditions are malformed
    }
  }

  /**
   * Evaluate individual targeting rules
   */
  private evaluateRule(rule: any, context: FeatureFlagContext): boolean {
    if (!rule || typeof rule !== 'object') {
      return true
    }

    // Handle multiple rules (AND/OR logic)
    if (rule.rules && Array.isArray(rule.rules)) {
      const operator = rule.operator || 'and'
      const results = rule.rules.map((r: any) => this.evaluateRule(r, context))

      if (operator === 'and') {
        return results.every((r: boolean) => r)
      } else if (operator === 'or') {
        return results.some((r: boolean) => r)
      }
    }

    // Handle individual rule
    if (rule.type && rule.field && rule.value !== undefined) {
      return this.evaluateCondition(rule, context)
    }

    return true
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(rule: any, context: FeatureFlagContext): boolean {
    const { type, field, operator, value } = rule
    const contextValue = context[field]

    switch (type) {
      case 'user_id':
        return this.compareValues(contextValue, value, operator)

      case 'role':
        return this.compareValues(contextValue, value, operator)

      case 'email_domain':
        if (!contextValue || typeof contextValue !== 'string') return false
        const domain = contextValue.split('@')[1]
        return this.compareValues(domain, value, operator)

      case 'custom':
        // Custom JavaScript evaluation (use with caution)
        try {
          // Very limited custom evaluation for security
          if (operator === 'equals') {
            return contextValue === value
          } else if (operator === 'contains') {
            return String(contextValue || '').includes(String(value))
          }
        } catch (error) {
          console.warn('Custom rule evaluation failed:', error)
        }
        return false

      default:
        return true
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: any, expected: any, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected
      case 'not_equals':
        return actual !== expected
      case 'in':
        return Array.isArray(expected) && expected.includes(actual)
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual)
      case 'contains':
        return String(actual || '').includes(String(expected))
      default:
        return actual === expected
    }
  }

  /**
   * Hash user identifier for consistent rollout percentage assignment
   */
  private hashUserForRollout(identifier: string): number {
    const hash = crypto.createHash('md5').update(identifier).digest('hex')
    return parseInt(hash.substring(0, 8), 16)
  }

  /**
   * Generate cache key for feature flag
   */
  private getCacheKey(flagKey: string, context: FeatureFlagContext, environment: string): string {
    const contextKey = `${context.userId || 'no-user'}_${context.role || 'no-role'}_${environment}`
    return `flag_${flagKey}_${contextKey}`
  }

  /**
   * Invalidate cache for a specific flag
   */
  private invalidateFlagCache(flagKey: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`flag_${flagKey}_`)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all feature flag cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get feature flag usage statistics
   */
  async getUsageStats(days: number = 7): Promise<{
    totalFlags: number
    activeFlags: number
    flagsWithRollout: number
    recentChanges: number
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    try {
      const [totalFlags, activeFlags, flagsWithRollout, recentChanges] = await Promise.all([
        prisma.featureFlag.count(),
        prisma.featureFlag.count({ where: { enabled: true } }),
        prisma.featureFlag.count({
          where: { rolloutPercentage: { lt: 100 } }
        }),
        prisma.featureFlag.count({
          where: { updatedAt: { gte: since } }
        })
      ])

      return {
        totalFlags,
        activeFlags,
        flagsWithRollout,
        recentChanges
      }

    } catch (error) {
      console.error('Failed to get feature flag stats:', error)
      return {
        totalFlags: 0,
        activeFlags: 0,
        flagsWithRollout: 0,
        recentChanges: 0
      }
    }
  }
}

// Singleton instance
const featureFlagManager = new FeatureFlagManager()

export const isEnabled = featureFlagManager.isEnabled.bind(featureFlagManager)
export const getFlagConfig = featureFlagManager.getFlagConfig.bind(featureFlagManager)
export const toggleFlag = featureFlagManager.toggleFlag.bind(featureFlagManager)
export const updateRolloutPercentage = featureFlagManager.updateRolloutPercentage.bind(featureFlagManager)
export const updateConditions = featureFlagManager.updateConditions.bind(featureFlagManager)
export const createFlag = featureFlagManager.createFlag.bind(featureFlagManager)
export const getAllFlags = featureFlagManager.getAllFlags.bind(featureFlagManager)
export const getActiveFlags = featureFlagManager.getActiveFlags.bind(featureFlagManager)
export const emergencyRollback = featureFlagManager.emergencyRollback.bind(featureFlagManager)
export const clearFlagCache = featureFlagManager.clearCache.bind(featureFlagManager)
export const getUsageStats = featureFlagManager.getUsageStats.bind(featureFlagManager)

export { featureFlagManager, type FeatureFlagContext, type FeatureFlagRule }