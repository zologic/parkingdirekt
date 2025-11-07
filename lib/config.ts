import { PrismaClient } from '@prisma/client'
import { decrypt } from './security/encryption'

const prisma = new PrismaClient()

interface CacheEntry {
  data: Record<string, any>
  timestamp: number
}

class ConfigManager {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds
  private readonly DEFAULT_ENVIRONMENT = 'production'

  async getSystemConfig(category?: string, environment: string = this.DEFAULT_ENVIRONMENT): Promise<Record<string, any>> {
    const cacheKey = `config_${category || 'all'}_${environment}`

    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    try {
      // Build where clause based on category filter
      const where = category
        ? { category, environment }
        : { environment }

      // Fetch from database
      const configs = await prisma.systemConfig.findMany({
        where,
        orderBy: [
          { category: 'asc' },
          { key: 'asc' }
        ]
      })

      // Transform configs into key-value pairs
      const result: Record<string, any> = {}

      for (const config of configs) {
        let value: any = config.value

        // Handle different types
        switch (config.type) {
          case 'number':
            value = parseFloat(config.value)
            break
          case 'boolean':
            value = config.value === 'true'
            break
          case 'json':
            try {
              value = JSON.parse(config.value)
            } catch (e) {
              console.warn(`Failed to parse JSON for config ${config.key}:`, e)
            }
            break
          // For encrypted values, decrypt them if not secret or if accessed securely
          case 'string':
          default:
            if (config.isSecret) {
              // Don't decrypt secrets in general config access
              value = '••••••••'
            }
            break
        }

        result[config.key] = {
          value,
          type: config.type,
          category: config.category,
          description: config.description,
          isSecret: config.isSecret,
          updatedAt: config.updatedAt
        }
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })

      return result

    } catch (error) {
      console.error('Failed to fetch system config:', error)

      // Return fallback defaults
      return this.getDefaultConfigs(category, environment)
    }
  }

  async getConfigValue(key: string, defaultValue: any = null, environment: string = this.DEFAULT_ENVIRONMENT): Promise<any> {
    const configs = await this.getSystemConfig(undefined, environment)
    const config = configs[key]

    if (!config) {
      return defaultValue
    }

    return config.value
  }

  async getIntegrationSecret(name: string, key: string, environment: string = this.DEFAULT_ENVIRONMENT): Promise<string | null> {
    try {
      const integration = await prisma.integrationSettings.findUnique({
        where: {
          name_key_environment: {
            name,
            key,
            environment
          }
        }
      })

      if (!integration || !integration.isActive) {
        return null
      }

      // Decrypt the secret value
      return decrypt(integration.value)

    } catch (error) {
      console.error(`Failed to fetch integration secret for ${name}.${key}:`, error)
      return null
    }
  }

  async updateConfig(
    key: string,
    value: any,
    category: string,
    updatedBy: string,
    type: 'string' | 'number' | 'boolean' | 'json' = 'string',
    environment: string = this.DEFAULT_ENVIRONMENT,
    description?: string,
    isSecret: boolean = false
  ): Promise<void> {
    try {
      // Convert value to string for storage
      let stringValue: string
      switch (type) {
        case 'json':
          stringValue = JSON.stringify(value)
          break
        case 'boolean':
          stringValue = String(value)
          break
        case 'number':
          stringValue = String(value)
          break
        default:
          stringValue = String(value)
      }

      // Update or create config
      await prisma.systemConfig.upsert({
        where: {
          category_key_environment: {
            category,
            key,
            environment
          }
        },
        update: {
          value: stringValue,
          type,
          description,
          isSecret,
          updatedBy
        },
        create: {
          category,
          key,
          value: stringValue,
          type,
          description,
          isSecret,
          environment,
          updatedBy
        }
      })

      // Invalidate cache for this category and environment
      this.invalidateCache(category, environment)

    } catch (error) {
      console.error(`Failed to update config ${key}:`, error)
      throw error
    }
  }

  async updateMultipleConfigs(
    updates: Array<{
      key: string
      value: any
      category: string
      type?: 'string' | 'number' | 'boolean' | 'json'
      description?: string
      isSecret?: boolean
    }>,
    updatedBy: string,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<void> {
    // Use transaction for atomic updates
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const { key, value, category, type = 'string', description, isSecret = false } = update

        // Convert value to string for storage
        let stringValue: string
        switch (type) {
          case 'json':
            stringValue = JSON.stringify(value)
            break
          case 'boolean':
            stringValue = String(value)
            break
          case 'number':
            stringValue = String(value)
            break
          default:
            stringValue = String(value)
        }

        await tx.systemConfig.upsert({
          where: {
            category_key_environment: {
              category,
              key,
              environment
            }
          },
          update: {
            value: stringValue,
            type,
            description,
            isSecret,
            updatedBy
          },
          create: {
            category,
            key,
            value: stringValue,
            type,
            description,
            isSecret,
            environment,
            updatedBy
          }
        })
      }
    })

    // Invalidate all relevant caches
    const categories = [...new Set(updates.map(u => u.category))]
    categories.forEach(category => this.invalidateCache(category, environment))
  }

  invalidateCache(category?: string, environment: string = this.DEFAULT_ENVIRONMENT): void {
    if (category) {
      const cacheKey = `config_${category}_${environment}`
      this.cache.delete(cacheKey)
    } else {
      // Clear all config caches
      for (const key of this.cache.keys()) {
        if (key.startsWith('config_')) {
          this.cache.delete(key)
        }
      }
    }
  }

  private getDefaultConfigs(category?: string, environment: string = this.DEFAULT_ENVIRONMENT): Record<string, any> {
    const defaults: Record<string, any> = {
      // Financial Settings
      'platformCommissionPercent': {
        value: 10.0,
        type: 'number',
        category: 'financial',
        description: 'Platform commission percentage'
      },
      'serviceFeePercent': {
        value: 2.5,
        type: 'number',
        category: 'financial',
        description: 'Service fee percentage'
      },
      'minimumPayoutThreshold': {
        value: 50.00,
        type: 'number',
        category: 'financial',
        description: 'Minimum payout amount'
      },
      'defaultCurrency': {
        value: 'EUR',
        type: 'string',
        category: 'financial',
        description: 'Default currency'
      },

      // Automation Settings
      'gracePeriod': {
        value: 10,
        type: 'number',
        category: 'automation',
        description: 'Minutes before overstay charges'
      },
      'overstayRateMultiplier': {
        value: 1.25,
        type: 'number',
        category: 'automation',
        description: 'Overstay rate multiplier'
      },
      'bookingBuffer': {
        value: 5,
        type: 'number',
        category: 'automation',
        description: 'Minutes gap between bookings'
      },
      'maxOverstayMinutes': {
        value: 120,
        type: 'number',
        category: 'automation',
        description: 'Maximum overstay duration'
      },
      'enableAutoBilling': {
        value: true,
        type: 'boolean',
        category: 'automation',
        description: 'Enable automatic billing'
      },

      // Platform Controls
      'maintenanceMode': {
        value: false,
        type: 'boolean',
        category: 'platform',
        description: 'Enable maintenance mode'
      },
      'maintenanceMessage': {
        value: 'System under maintenance',
        type: 'string',
        category: 'platform',
        description: 'Maintenance mode message'
      },
      'disableNewRegistrations': {
        value: false,
        type: 'boolean',
        category: 'platform',
        description: 'Disable user registrations'
      },

      // Email Settings
      'defaultFromEmail': {
        value: 'noreply@parkingdirekt.com',
        type: 'string',
        category: 'email',
        description: 'Default from email address'
      },
      'supportEmail': {
        value: 'support@parkingdirekt.com',
        type: 'string',
        category: 'email',
        description: 'Support email address'
      },
      'enablePushNotifications': {
        value: true,
        type: 'boolean',
        category: 'email',
        description: 'Enable push notifications'
      },
      'notificationRetryLimit': {
        value: 3,
        type: 'number',
        category: 'email',
        description: 'Max retry attempts'
      },

      // API Settings
      'enableRateLimiting': {
        value: true,
        type: 'boolean',
        category: 'api',
        description: 'Enable API rate limiting'
      },
      'maxRequestsPerMinute': {
        value: 60,
        type: 'number',
        category: 'api',
        description: 'Max requests per minute'
      },
      'rateLimitMode': {
        value: 'per_user',
        type: 'string',
        category: 'api',
        description: 'Rate limiting mode'
      },

      // Feature Flags
      'newDashboardEnabled': {
        value: true,
        type: 'boolean',
        category: 'feature',
        description: 'Enable new dashboard design'
      },
      'betaFeaturesEnabled': {
        value: false,
        type: 'boolean',
        category: 'feature',
        description: 'Enable beta features'
      }
    }

    if (category) {
      const filtered: Record<string, any> = {}
      Object.entries(defaults).forEach(([key, config]) => {
        if (config.category === category) {
          filtered[key] = config
        }
      })
      return filtered
    }

    return defaults
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      await prisma.systemConfig.findFirst()
      return true
    } catch (error) {
      console.error('Config health check failed:', error)
      return false
    }
  }

  // Method to warm up cache with frequently accessed configs
  async warmupCache(): Promise<void> {
    const categories = ['financial', 'automation', 'platform', 'email', 'api']

    await Promise.all(
      categories.map(category =>
        this.getSystemConfig(category, this.DEFAULT_ENVIRONMENT)
      )
    )
  }
}

// Singleton instance
const configManager = new ConfigManager()

export const getSystemConfig = configManager.getSystemConfig.bind(configManager)
export const getConfigValue = configManager.getConfigValue.bind(configManager)
export const getIntegrationSecret = configManager.getIntegrationSecret.bind(configManager)
export const updateConfig = configManager.updateConfig.bind(configManager)
export const updateMultipleConfigs = configManager.updateMultipleConfigs.bind(configManager)
export const invalidateConfigCache = configManager.invalidateCache.bind(configManager)
export const isConfigHealthy = configManager.isHealthy.bind(configManager)
export const warmupConfigCache = configManager.warmupCache.bind(configManager)

// Export the manager for advanced usage
export { configManager }