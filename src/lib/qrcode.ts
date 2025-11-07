import QRCode from 'qrcode'

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

export function generateBookingQRCode(bookingId: string, userId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `BOOKING_${bookingId}_${userId}_${timestamp}_${random}`
}

export function generateParkingSpaceQRCode(spaceId: string, ownerId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `SPACE_${spaceId}_${ownerId}_${timestamp}_${random}`
}

export function parseQRCode(qrCode: string): {
  type: 'BOOKING' | 'SPACE'
  id: string
  userId?: string
  timestamp: number
  random: string
} | null {
  try {
    // Parse booking QR code format: BOOKING_bookingId_userId_timestamp_random
    if (qrCode.startsWith('BOOKING_')) {
      const parts = qrCode.split('_')
      if (parts.length >= 5) {
        return {
          type: 'BOOKING',
          id: parts[1],
          userId: parts[2],
          timestamp: parseInt(parts[3]),
          random: parts[4],
        }
      }
    }

    // Parse space QR code format: SPACE_spaceId_ownerId_timestamp_random
    if (qrCode.startsWith('SPACE_')) {
      const parts = qrCode.split('_')
      if (parts.length >= 5) {
        return {
          type: 'SPACE',
          id: parts[1],
          userId: parts[2], // ownerId in this case
          timestamp: parseInt(parts[3]),
          random: parts[4],
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error parsing QR code:', error)
    return null
  }
}

export function validateQRCodeTimestamp(timestamp: number, maxAge: number = 24 * 60 * 60 * 1000): boolean {
  const now = Date.now()
  const age = now - timestamp
  return age <= maxAge // QR code is valid for 24 hours by default
}