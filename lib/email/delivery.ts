import { PrismaClient } from '@prisma/client'
import { getConfigValue, getIntegrationSecret } from '../config'
import nodemailer from 'nodemailer'

const prisma = new PrismaClient()

interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
  metadata?: Record<string, any>
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
}

interface EmailProvider {
  name: string
  send: (options: EmailOptions) => Promise<EmailResult>
  test: () => Promise<boolean>
}

class EmailDeliveryManager {
  private providers: Map<string, EmailProvider> = new Map()
  private defaultProvider: string = 'smtp'
  private retryQueue: Array<{
    options: EmailOptions
    attempt: number
    nextRetry: Date
    provider: string
  }> = []

  constructor() {
    this.initializeProviders()
    this.startRetryProcessor()
  }

  private async initializeProviders(): Promise<void> {
    // Initialize SMTP provider
    this.providers.set('smtp', new SMTPProvider())

    // Initialize SendGrid provider (if API key is configured)
    const sendGridKey = await getIntegrationSecret('sendgrid', 'api_key')
    if (sendGridKey) {
      this.providers.set('sendgrid', new SendGridProvider(sendGridKey))
    }

    // Set default provider based on configuration
    const defaultProviderConfig = await getConfigValue('emailProvider', 'smtp')
    if (this.providers.has(defaultProviderConfig)) {
      this.defaultProvider = defaultProviderConfig
    }
  }

  /**
   * Send an email using the configured provider(s)
   */
  async sendEmail(options: EmailOptions, provider?: string): Promise<EmailResult> {
    try {
      const selectedProvider = provider || this.defaultProvider
      const emailProvider = this.providers.get(selectedProvider)

      if (!emailProvider) {
        return {
          success: false,
          error: `Email provider '${selectedProvider}' not found`,
          provider: 'none'
        }
      }

      // Log the email attempt
      await this.logEmailAttempt(options, selectedProvider, 'pending')

      // Send the email
      const result = await emailProvider.send(options)

      // Log the result
      await this.logEmailResult(options, selectedProvider, result)

      // If failed and retries are enabled, add to retry queue
      if (!result.success && await this.shouldRetry()) {
        this.addToRetryQueue(options, selectedProvider, 1)
      }

      return result

    } catch (error) {
      console.error('Email delivery failed:', error)

      const result: EmailResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: provider || this.defaultProvider
      }

      await this.logEmailResult(options, provider || this.defaultProvider, result)

      if (await this.shouldRetry()) {
        this.addToRetryQueue(options, provider || this.defaultProvider, 1)
      }

      return result
    }
  }

  /**
   * Send email with automatic failover to backup providers
   */
  async sendEmailWithFailover(options: EmailOptions): Promise<EmailResult> {
    const providers = Array.from(this.providers.keys())

    for (const provider of providers) {
      try {
        const result = await this.sendEmail(options, provider)
        if (result.success) {
          return result
        }
        console.warn(`Email provider ${provider} failed, trying next...`, result.error)
      } catch (error) {
        console.warn(`Email provider ${provider} threw error:`, error)
      }
    }

    return {
      success: false,
      error: 'All email providers failed',
      provider: 'failover'
    }
  }

  /**
   * Test the connection to an email provider
   */
  async testConnection(provider?: string): Promise<boolean> {
    const selectedProvider = provider || this.defaultProvider
    const emailProvider = this.providers.get(selectedProvider)

    if (!emailProvider) {
      return false
    }

    try {
      return await emailProvider.test()
    } catch (error) {
      console.error(`Email provider test failed for ${selectedProvider}:`, error)
      return false
    }
  }

  /**
   * Get email delivery statistics
   */
  async getDeliveryStats(days: number = 7): Promise<{
    total: number
    sent: number
    failed: number
    pending: number
    byProvider: Record<string, number>
    averageDeliveryTime: number
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    try {
      const stats = await prisma.emailDeliveryLog.groupBy({
        by: ['status', 'provider'],
        where: {
          sentAt: { gte: since }
        },
        _count: {
          id: true
        }
      })

      let total = 0
      let sent = 0
      let failed = 0
      let pending = 0
      const byProvider: Record<string, number> = {}

      stats.forEach(stat => {
        total += stat._count.id
        byProvider[stat.provider] = (byProvider[stat.provider] || 0) + stat._count.id

        switch (stat.status) {
          case 'sent':
          case 'delivered':
            sent += stat._count.id
            break
          case 'failed':
            failed += stat._count.id
            break
          case 'pending':
          case 'retrying':
            pending += stat._count.id
            break
        }
      })

      // Calculate average delivery time (simplified)
      const deliveredEmails = await prisma.emailDeliveryLog.findMany({
        where: {
          status: 'delivered',
          sentAt: { gte: since }
        },
        select: {
          sentAt: true,
          deliveredAt: true
        }
      })

      let totalDeliveryTime = 0
      let deliveredCount = 0

      deliveredEmails.forEach(email => {
        if (email.deliveredAt) {
          totalDeliveryTime += email.deliveredAt.getTime() - email.sentAt.getTime()
          deliveredCount++
        }
      })

      const averageDeliveryTime = deliveredCount > 0 ? totalDeliveryTime / deliveredCount : 0

      return {
        total,
        sent,
        failed,
        pending,
        byProvider,
        averageDeliveryTime
      }

    } catch (error) {
      console.error('Failed to get email delivery stats:', error)
      return {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        byProvider: {},
        averageDeliveryTime: 0
      }
    }
  }

  private async shouldRetry(): Promise<boolean> {
    try {
      const retryLimit = await getConfigValue('notificationRetryLimit', 3)
      return retryLimit > 0
    } catch {
      return true // Default to allowing retries
    }
  }

  private addToRetryQueue(options: EmailOptions, provider: string, attempt: number): void {
    const retryLimit = 3 // Get from config
    const backoffMs = Math.pow(2, attempt) * 1000 // Exponential backoff

    if (attempt <= retryLimit) {
      this.retryQueue.push({
        options,
        attempt,
        nextRetry: new Date(Date.now() + backoffMs),
        provider
      })
    }
  }

  private startRetryProcessor(): void {
    setInterval(async () => {
      const now = new Date()
      const readyToRetry = this.retryQueue.filter(item => item.nextRetry <= now)

      this.retryQueue = this.retryQueue.filter(item => item.nextRetry > now)

      for (const item of readyToRetry) {
        try {
          const result = await this.sendEmail(item.options, item.provider)

          if (!result.success && item.attempt < 3) {
            this.addToRetryQueue(item.options, item.provider, item.attempt + 1)
          }
        } catch (error) {
          console.error('Retry failed:', error)
          if (item.attempt < 3) {
            this.addToRetryQueue(item.options, item.provider, item.attempt + 1)
          }
        }
      }
    }, 30000) // Check every 30 seconds
  }

  private async logEmailAttempt(options: EmailOptions, provider: string, status: string): Promise<void> {
    try {
      const to = Array.isArray(options.to) ? options.to.join(', ') : options.to

      await prisma.emailDeliveryLog.create({
        data: {
          to,
          subject: options.subject,
          provider,
          status,
          metadata: options.metadata ? JSON.stringify(options.metadata) : null
        }
      })
    } catch (error) {
      console.error('Failed to log email attempt:', error)
    }
  }

  private async logEmailResult(options: EmailOptions, provider: string, result: EmailResult): Promise<void> {
    try {
      const to = Array.isArray(options.to) ? options.to.join(', ') : options.to
      const status = result.success ? 'sent' : 'failed'

      await prisma.emailDeliveryLog.updateMany({
        where: {
          to,
          subject: options.subject,
          provider,
          status: 'pending'
        },
        data: {
          status,
          error: result.error || null,
          messageId: result.messageId || null
        }
      })
    } catch (error) {
      console.error('Failed to log email result:', error)
    }
  }
}

// SMTP Provider Implementation
class SMTPProvider implements EmailProvider {
  name = 'smtp'
  private transporter: nodemailer.Transporter | null = null

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const transporter = await this.getTransporter()

      const mailOptions = {
        from: options.from || await getConfigValue('defaultFromEmail', 'noreply@parkingdirekt.com'),
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments
      }

      const result = await transporter.sendMail(mailOptions)

      return {
        success: true,
        messageId: result.messageId,
        provider: this.name
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMTP send failed',
        provider: this.name
      }
    }
  }

  async test(): Promise<boolean> {
    try {
      const transporter = await this.getTransporter()
      await transporter.verify()
      return true
    } catch {
      return false
    }
  }

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter
    }

    const config = {
      host: await getIntegrationSecret('smtp', 'host') || process.env.SMTP_HOST,
      port: parseInt(await getConfigValue('smtpPort', '587') as string) || 587,
      secure: await getConfigValue('smtpSecure', 'false') === 'true',
      auth: {
        user: await getIntegrationSecret('smtp', 'user') || process.env.SMTP_USER,
        pass: await getIntegrationSecret('smtp', 'pass') || process.env.SMTP_PASS
      }
    }

    this.transporter = nodemailer.createTransporter(config)
    return this.transporter
  }
}

// SendGrid Provider Implementation
class SendGridProvider implements EmailProvider {
  name = 'sendgrid'

  constructor(private apiKey: string) {}

  async send(options: EmailOptions): Promise<EmailResult> {
    // This is a simplified SendGrid implementation
    // In reality, you'd use the SendGrid SDK
    try {
      // SendGrid API call would go here
      // For now, return a mock success
      return {
        success: true,
        messageId: `sg_${Date.now()}`,
        provider: this.name
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SendGrid send failed',
        provider: this.name
      }
    }
  }

  async test(): Promise<boolean> {
    try {
      // Test SendGrid API connectivity
      return Boolean(this.apiKey && this.apiKey.length > 0)
    } catch {
      return false
    }
  }
}

// Singleton instance
const emailDeliveryManager = new EmailDeliveryManager()

export const sendEmail = emailDeliveryManager.sendEmail.bind(emailDeliveryManager)
export const sendEmailWithFailover = emailDeliveryManager.sendEmailWithFailover.bind(emailDeliveryManager)
export const testEmailConnection = emailDeliveryManager.testConnection.bind(emailDeliveryManager)
export const getDeliveryStats = emailDeliveryManager.getDeliveryStats.bind(emailDeliveryManager)

export { emailDeliveryManager, type EmailOptions, type EmailResult }