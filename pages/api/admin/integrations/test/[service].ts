import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdmin } from '@/lib/auth'
import { getIntegrationSecret } from '@/lib/config'
import { testEmailConnection } from '@/lib/email/delivery'
import crypto from 'crypto'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { service } = req.query
  const { method } = req

  if (!service || typeof service !== 'string') {
    return res.status(400).json({ error: 'Service name is required' })
  }

  const validServices = ['stripe', 'mapbox', 'email', 'webhook']
  if (!validServices.includes(service)) {
    return res.status(400).json({ error: 'Invalid service' })
  }

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${method} Not Allowed` })
  }

  try {
    switch (service) {
      case 'stripe':
        return await testStripe(req, res)
      case 'mapbox':
        return await testMapbox(req, res)
      case 'email':
        return await testEmail(req, res)
      case 'webhook':
        return await testWebhook(req, res)
      default:
        return res.status(400).json({ error: 'Invalid service' })
    }
  } catch (error) {
    console.error(`Integration test error for ${service}:`, error)
    return res.status(500).json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function testStripe(req: NextApiRequest, res: NextApiResponse) {
  try {
    const apiKey = await getIntegrationSecret('stripe', 'secret_key')
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Stripe API key not configured'
      })
    }

    // Test Stripe connectivity
    const stripe = require('stripe')(apiKey)
    const account = await stripe.accounts.retrieve()

    // Test a small transaction (optional)
    let testTransaction = null
    try {
      // Create a test payment intent for $1.00
      testTransaction = await stripe.paymentIntents.create({
        amount: 100, // $1.00 in cents
        currency: 'usd',
        payment_method: 'pm_card_visa',
        confirm: true,
        off_session: true,
      })
    } catch (error) {
      // Test transaction might fail, that's okay
      console.warn('Stripe test transaction failed:', error)
    }

    return res.status(200).json({
      success: true,
      data: {
        connected: true,
        accountId: account.id,
        country: account.country,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        testTransaction: testTransaction ? {
          id: testTransaction.id,
          status: testTransaction.status
        } : null
      }
    })

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Stripe connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function testMapbox(req: NextApiRequest, res: NextApiResponse) {
  try {
    const apiKey = await getIntegrationSecret('mapbox', 'api_key')
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Mapbox API key not configured'
      })
    }

    // Test geocoding request
    const geocodeResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/Los%20Angeles.json?access_token=${apiKey}`
    )

    if (!geocodeResponse.ok) {
      throw new Error(`Geocoding API returned ${geocodeResponse.status}`)
    }

    const geocodeData = await geocodeResponse.json()

    // Test static map request
    const mapResponse = await fetch(
      `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-118.243683,34.052235,14/600x400@2x?access_token=${apiKey}`
    )

    if (!mapResponse.ok) {
      throw new Error(`Static map API returned ${mapResponse.status}`)
    }

    return res.status(200).json({
      success: true,
      data: {
        connected: true,
        geocoding: {
          working: true,
          featuresFound: geocodeData.features?.length || 0
        },
        staticMaps: {
          working: true,
          contentType: mapResponse.headers.get('content-type')
        }
      }
    })

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Mapbox connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function testEmail(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { testEmail: recipient } = req.body

    if (!recipient) {
      return res.status(400).json({
        success: false,
        error: 'Test email address is required'
      })
    }

    // Test email connection
    const connectionTest = await testEmailConnection()
    if (!connectionTest) {
      return res.status(400).json({
        success: false,
        error: 'Email provider connection failed'
      })
    }

    // Send test email
    const { sendEmail } = await import('@/lib/email/delivery')

    const result = await sendEmail({
      to: recipient,
      subject: 'ParkingDirekt Email Test',
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email from ParkingDirekt to verify your email configuration is working correctly.</p>
        <p>If you received this email, your email settings are properly configured.</p>
        <hr>
        <p><small>Sent at: ${new Date().toISOString()}</small></p>
      `,
      text: `
        Email Configuration Test

        This is a test email from ParkingDirekt to verify your email configuration is working correctly.
        If you received this email, your email settings are properly configured.

        Sent at: ${new Date().toISOString()}
      `
    })

    return res.status(200).json({
      success: result.success,
      data: {
        connected: connectionTest,
        messageId: result.messageId,
        provider: result.provider
      },
      error: result.error
    })

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Email test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function testWebhook(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { webhookUrl, eventType = 'test' } = req.body

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL is required'
      })
    }

    // Validate webhook URL format
    try {
      new URL(webhookUrl)
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook URL format'
      })
    }

    // Create test payload
    const testPayload = {
      id: `test_${crypto.randomUUID()}`,
      type: eventType,
      created: Math.floor(Date.now() / 1000),
      data: {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'ParkingDirekt Control Center'
      }
    }

    const startTime = Date.now()

    // Send test webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ParkingDirekt-Webhook/1.0',
        'X-ParkingDirekt-Event': eventType,
        'X-ParkingDirekt-Signature': crypto
          .createHmac('sha256', 'test-secret')
          .update(JSON.stringify(testPayload))
          .digest('hex')
      },
      body: JSON.stringify(testPayload)
    })

    const responseTime = Date.now() - startTime
    let responseBody: any = {}

    try {
      responseBody = await response.text()
    } catch {
      responseBody = 'Could not read response body'
    }

    // Log the webhook delivery attempt
    await prisma?.webhookDeliveryLog?.create?.({
      data: {
        webhookUrl,
        eventType,
        payload: JSON.stringify(testPayload),
        responseCode: response.status,
        response: responseBody,
        status: response.ok ? 'delivered' : 'failed',
        createdAt: new Date()
      }
    }).catch(err => console.warn('Failed to log webhook test:', err))

    return res.status(200).json({
      success: response.ok,
      data: {
        statusCode: response.status,
        responseTime,
        headers: {
          contentType: response.headers.get('content-type'),
          server: response.headers.get('server')
        },
        responseBody: responseBody.length > 1000 ? responseBody.substring(0, 1000) + '...' : responseBody
      }
    })

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Webhook test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export default requireSuperAdmin(handler)