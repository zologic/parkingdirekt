import { getConfigValue } from '../config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface PaymentProcessingOptions {
  amount: number
  currency?: string
  bookingId?: string
  userId: string
  paymentMethodId?: string
  description?: string
  metadata?: Record<string, any>
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  platformFee?: number
  ownerAmount?: number
  commissionPercent?: number
  error?: string
  stripePaymentIntent?: any
}

/**
 * Process a payment using Stripe with dynamic commission calculation
 */
export async function processPayment(options: PaymentProcessingOptions): Promise<PaymentResult> {
  try {
    // Get commission settings from configuration
    const commissionPercent = await getConfigValue('platformCommissionPercent', 10.0)
    const defaultCurrency = await getConfigValue('defaultCurrency', 'EUR')

    // Calculate platform fee and owner amount
    const commissionDecimal = Number(commissionPercent) / 100
    const platformFee = options.amount * commissionDecimal
    const ownerAmount = options.amount - platformFee
    const finalCurrency = options.currency || defaultCurrency

    // Get Stripe secret key from integrations
    const stripe = await getStripeInstance()

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(options.amount * 100), // Convert to cents
      currency: finalCurrency.toLowerCase(),
      payment_method: options.paymentMethodId,
      confirmation_method: options.paymentMethodId ? 'manual' : 'automatic',
      confirm: options.paymentMethodId ? true : false,
      description: options.description || 'Parking booking payment',
      metadata: {
        bookingId: options.bookingId || '',
        userId: options.userId,
        commissionPercent: commissionPercent.toString(),
        platformFee: platformFee.toFixed(2),
        ownerAmount: ownerAmount.toFixed(2),
        ...options.metadata
      },
      // Add application fee for Connect accounts if using Stripe Connect
      application_fee_amount: Math.round(platformFee * 100) // Platform fee in cents
    })

    // Record transaction in database
    await recordTransaction({
      transactionId: paymentIntent.id,
      bookingId: options.bookingId,
      amount: options.amount,
      commissionPercent: commissionDecimal,
      commissionAmount: platformFee,
      ownerAmount,
      currency: finalCurrency,
      paymentMethod: 'stripe',
      status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
      metadata: options.metadata
    })

    return {
      success: paymentIntent.status !== 'failed',
      transactionId: paymentIntent.id,
      platformFee,
      ownerAmount,
      commissionPercent: Number(commissionPercent),
      stripePaymentIntent: paymentIntent
    }

  } catch (error) {
    console.error('Payment processing failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    }
  }
}

/**
 * Create a refund for a transaction
 */
export async function processRefund(transactionId: string, amount?: number): Promise<PaymentResult> {
  try {
    const stripe = await getStripeInstance()

    // Get original transaction from database
    const transaction = await prisma.platformRevenue.findUnique({
      where: { transactionId }
    })

    if (!transaction) {
      return {
        success: false,
        error: 'Transaction not found'
      }
    }

    // Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: transactionId,
      amount: amount ? Math.round(amount * 100) : undefined // Refund full amount if not specified
    })

    // Update transaction status
    await prisma.platformRevenue.update({
      where: { transactionId },
      data: {
        status: 'refunded',
        updatedAt: new Date()
      }
    })

    return {
      success: true,
      transactionId: refund.id
    }

  } catch (error) {
    console.error('Refund processing failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refund processing failed'
    }
  }
}

/**
 * Get Stripe instance with configuration from integrations
 */
async function getStripeInstance() {
  try {
    const { getIntegrationSecret } = await import('../config')
    const secretKey = await getIntegrationSecret('stripe', 'secret_key')

    if (!secretKey) {
      throw new Error('Stripe secret key not configured')
    }

    const stripe = require('stripe')(secretKey)
    return stripe

  } catch (error) {
    console.error('Failed to initialize Stripe:', error)
    throw new Error('Payment provider not available')
  }
}

/**
 * Record transaction in PlatformRevenue table
 */
async function recordTransaction(transactionData: {
  transactionId: string
  bookingId?: string
  amount: number
  commissionPercent: number
  commissionAmount: number
  ownerAmount: number
  currency: string
  paymentMethod: string
  status: string
  metadata?: Record<string, any>
}) {
  try {
    await prisma.platformRevenue.create({
      data: {
        transactionId: transactionData.transactionId,
        bookingId: transactionData.bookingId,
        amount: transactionData.amount,
        commissionPercent: transactionData.commissionPercent,
        commissionAmount: transactionData.commissionAmount,
        ownerAmount: transactionData.ownerAmount,
        currency: transactionData.currency,
        paymentMethod: transactionData.paymentMethod,
        status: transactionData.status,
        metadata: transactionData.metadata ? JSON.stringify(transactionData.metadata) : null
      }
    })

    console.log(`Transaction recorded: ${transactionData.transactionId}`)

  } catch (error) {
    console.error('Failed to record transaction:', error)
    // Don't throw here as payment was processed successfully
  }
}

/**
 * Get revenue analytics
 */
export async function getRevenueAnalytics(days: number = 30) {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const analytics = await prisma.platformRevenue.groupBy({
      by: ['status', 'currency'],
      where: {
        createdAt: { gte: startDate }
      },
      _sum: {
        amount: true,
        commissionAmount: true
      },
      _count: {
        id: true
      }
    })

    const totalRevenue = analytics.reduce((sum, item) => sum + Number(item._sum.amount || 0), 0)
    const totalCommission = analytics.reduce((sum, item) => sum + Number(item._sum.commissionAmount || 0), 0)
    const totalTransactions = analytics.reduce((sum, item) => sum + item._count.id, 0)

    return {
      totalRevenue,
      totalCommission,
      totalTransactions,
      averageTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      breakdown: analytics.map(item => ({
        status: item.status,
        currency: item.currency,
        revenue: Number(item._sum.amount || 0),
        commission: Number(item._sum.commissionAmount || 0),
        transactions: item._count.id
      }))
    }

  } catch (error) {
    console.error('Failed to get revenue analytics:', error)
    return {
      totalRevenue: 0,
      totalCommission: 0,
      totalTransactions: 0,
      averageTransactionValue: 0,
      breakdown: []
    }
  }
}

/**
 * Calculate platform fee for a given amount
 */
export async function calculatePlatformFee(amount: number): Promise<{
  platformFee: number
  ownerAmount: number
  commissionPercent: number
}> {
  try {
    const commissionPercent = await getConfigValue('platformCommissionPercent', 10.0)
    const commissionDecimal = Number(commissionPercent) / 100

    const platformFee = amount * commissionDecimal
    const ownerAmount = amount - platformFee

    return {
      platformFee,
      ownerAmount,
      commissionPercent: Number(commissionPercent)
    }

  } catch (error) {
    console.error('Failed to calculate platform fee:', error)
    // Fallback to default values
    const commissionPercent = 10
    const platformFee = amount * (commissionPercent / 100)
    return {
      platformFee,
      ownerAmount: amount - platformFee,
      commissionPercent
    }
  }
}