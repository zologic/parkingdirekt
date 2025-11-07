import { PrismaClient } from '@prisma/client'
import { encrypt } from '../lib/security/encryption'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create default Super Admin user
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@parkingdirekt.com' },
    update: {},
    create: {
      email: 'admin@parkingdirekt.com',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
      image: null,
      emailVerified: new Date(),
    },
  })

  console.log('✅ Created Super Admin user')

  // Create regular admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
      image: null,
      emailVerified: new Date(),
    },
  })

  console.log('✅ Created Admin user')

  // Create default system configurations
  const defaultConfigs = [
    // Financial Settings
    { category: 'financial', key: 'platformCommissionPercent', value: '10.0', type: 'number', description: 'Platform commission percentage from transactions' },
    { category: 'financial', key: 'serviceFeePercent', value: '2.5', type: 'number', description: 'Service fee percentage per transaction' },
    { category: 'financial', key: 'minimumPayoutThreshold', value: '50.00', type: 'number', description: 'Minimum payout amount for partners' },
    { category: 'financial', key: 'defaultCurrency', value: 'EUR', type: 'string', description: 'Default currency for transactions' },

    // Automation Settings
    { category: 'automation', key: 'gracePeriod', value: '10', type: 'number', description: 'Minutes before overstay charges apply' },
    { category: 'automation', key: 'overstayRateMultiplier', value: '1.25', type: 'number', description: 'Multiplier for overstay rate calculation' },
    { category: 'automation', key: 'bookingBuffer', value: '5', type: 'number', description: 'Minutes gap between bookings' },
    { category: 'automation', key: 'maxOverstayMinutes', value: '120', type: 'number', description: 'Maximum overstay duration allowed' },
    { category: 'automation', key: 'enableAutoBilling', value: 'true', type: 'boolean', description: 'Enable automatic billing for overstays' },

    // Platform Controls
    { category: 'platform', key: 'maintenanceMode', value: 'false', type: 'boolean', description: 'Enable maintenance mode for the platform' },
    { category: 'platform', key: 'maintenanceMessage', value: 'System is currently under maintenance. Please try again later.', type: 'string', description: 'Message displayed during maintenance' },
    { category: 'platform', key: 'disableNewRegistrations', value: 'false', type: 'boolean', description: 'Disable new user registrations' },

    // Email Settings
    { category: 'email', key: 'defaultFromEmail', value: 'noreply@parkingdirekt.com', type: 'string', description: 'Default from email address' },
    { category: 'email', key: 'supportEmail', value: 'support@parkingdirekt.com', type: 'string', description: 'Customer support email address' },
    { category: 'email', key: 'enablePushNotifications', value: 'true', type: 'boolean', description: 'Enable push notifications' },
    { category: 'email', key: 'notificationRetryLimit', value: '3', type: 'number', description: 'Maximum retry attempts for failed notifications' },

    // API Settings
    { category: 'api', key: 'enableRateLimiting', value: 'true', type: 'boolean', description: 'Enable API rate limiting' },
    { category: 'api', key: 'maxRequestsPerMinute', value: '60', type: 'number', description: 'Maximum requests per minute per user/IP' },
    { category: 'api', key: 'rateLimitMode', value: 'per_user', type: 'string', description: 'Rate limiting mode: per_user, per_ip, or global' },
  ]

  for (const config of defaultConfigs) {
    await prisma.systemConfig.upsert({
      where: {
        category_key_environment: {
          category: config.category,
          key: config.key,
          environment: 'production'
        }
      },
      update: {
        value: config.value,
        type: config.type,
        description: config.description,
        updatedBy: superAdmin.id
      },
      create: {
        category: config.category,
        key: config.key,
        value: config.value,
        type: config.type,
        description: config.description,
        environment: 'production',
        updatedBy: superAdmin.id
      }
    })
  }

  console.log('✅ Created default system configurations')

  // Create default feature flags
  const defaultFeatureFlags = [
    {
      key: 'new_dashboard_ui',
      name: 'New Dashboard UI',
      description: 'Enable the new dashboard interface design',
      enabled: true,
      rolloutPercentage: 100,
      conditions: null,
      updatedBy: superAdmin.id
    },
    {
      key: 'real_time_availability',
      name: 'Real-time Availability',
      description: 'Show real-time parking availability',
      enabled: false,
      rolloutPercentage: 0,
      conditions: null,
      updatedBy: superAdmin.id
    },
    {
      key: 'mobile_app_support',
      name: 'Mobile App Support',
      description: 'Enable mobile app specific features',
      enabled: true,
      rolloutPercentage: 50,
      conditions: JSON.stringify({
        rules: [
          {
            type: 'custom',
            field: 'userAgent',
            operator: 'contains',
            value: 'Mobile'
          }
        ],
        operator: 'or'
      }),
      updatedBy: superAdmin.id
    },
    {
      key: 'advanced_analytics',
      name: 'Advanced Analytics',
      description: 'Enable advanced analytics dashboard',
      enabled: false,
      rolloutPercentage: 0,
      conditions: null,
      updatedBy: superAdmin.id
    }
  ]

  for (const flag of defaultFeatureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        conditions: flag.conditions,
        updatedBy: flag.updatedBy
      },
      create: flag
    })
  }

  console.log('✅ Created default feature flags')

  // Create sample integration settings (encrypted)
  const sampleIntegrations = [
    {
      name: 'stripe',
      key: 'publishable_key',
      value: encrypt('pk_test_sample_key'),
      description: 'Stripe publishable API key'
    },
    {
      name: 'stripe',
      key: 'secret_key',
      value: encrypt('sk_test_sample_secret_key'),
      description: 'Stripe secret API key'
    },
    {
      name: 'mapbox',
      key: 'api_key',
      value: encrypt('pk.sample_mapbox_api_key'),
      description: 'Mapbox public API key'
    },
    {
      name: 'sendgrid',
      key: 'api_key',
      value: encrypt('SG.sample_sendgrid_api_key'),
      description: 'SendGrid API key'
    }
  ]

  for (const integration of sampleIntegrations) {
    await prisma.integrationSettings.upsert({
      where: {
        name_key_environment: {
          name: integration.name,
          key: integration.key,
          environment: 'production'
        }
      },
      update: {
        value: integration.value,
        description: integration.description,
        isActive: true,
        updatedBy: superAdmin.id
      },
      create: {
        name: integration.name,
        key: integration.key,
        value: integration.value,
        description: integration.description,
        isActive: true,
        environment: 'production',
        updatedBy: superAdmin.id
      }
    })
  }

  console.log('✅ Created sample integration settings')

  // Create sample parking locations
  const sampleLocations = [
    {
      name: 'Downtown Parking Garage',
      address: '123 Main Street, Berlin, Germany',
      latitude: 52.5200,
      longitude: 13.4050,
      totalSpots: 150,
      isActive: true
    },
    {
      name: 'Airport Parking Lot A',
      address: 'Airport Boulevard, Berlin, Germany',
      latitude: 52.5588,
      longitude: 13.2884,
      totalSpots: 500,
      isActive: true
    },
    {
      name: 'Shopping Center Parking',
      address: '456 Commerce Avenue, Berlin, Germany',
      latitude: 52.5075,
      longitude: 13.3903,
      totalSpots: 200,
      isActive: true
    }
  ]

  for (const location of sampleLocations) {
    await prisma.parkingLocation.create({
      data: location
    })
  }

  console.log('✅ Created sample parking locations')

  // Create sample system health metrics
  const healthMetrics = [
    { metricType: 'uptime', value: 99.9, unit: 'percentage' },
    { metricType: 'response_time', value: 245, unit: 'milliseconds' },
    { metricType: 'error_rate', value: 0.1, unit: 'percentage' },
    { metricType: 'active_users', value: 1234, unit: 'count' }
  ]

  for (const metric of healthMetrics) {
    await prisma.systemHealthMetric.create({
      data: metric
    })
  }

  console.log('✅ Created system health metrics')

  // Create sample admin audit logs
  const sampleAuditLogs = [
    {
      adminId: superAdmin.id,
      action: 'update',
      category: 'config',
      target: 'financial.platformCommissionPercent',
      oldValue: '8.0',
      newValue: '10.0',
      metadata: JSON.stringify({ reason: 'Business requirement change' }),
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    {
      adminId: superAdmin.id,
      action: 'create',
      category: 'feature',
      target: 'feature.new_dashboard_ui',
      oldValue: null,
      newValue: JSON.stringify({ enabled: true, rollout: 100 }),
      metadata: JSON.stringify({ source: 'admin_panel' }),
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  ]

  for (const log of sampleAuditLogs) {
    await prisma.adminAuditLog.create({
      data: log
    })
  }

  console.log('✅ Created sample audit logs')

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📝 Default Credentials:')
  console.log('   Super Admin: admin@parkingdirekt.com / admin123')
  console.log('   Regular Admin: admin@company.com / password123')
  console.log('\n🔗 Access Control Center: http://localhost:3000/dashboard/superadmin/control-center')
}

main()
  .catch((e) => {
    console.error('❌ Database seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })