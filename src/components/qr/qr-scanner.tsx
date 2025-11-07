'use client'

import { useState, useRef, useCallback } from 'react'
import { QrReader } from 'react-qr-reader'
import { useSession } from 'next-auth/react'

interface QrScannerProps {
  onScanComplete?: (result: any) => void
  action?: 'check-in' | 'check-out' | 'verify'
  showInstructions?: boolean
}

export default function QrScanner({
  onScanComplete,
  action = 'verify',
  showInstructions = true
}: QrScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { data: session } = useSession()

  const handleScan = useCallback(async (result: any) => {
    if (!result || !result.text || loading) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/verify-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCode: result.text,
          action,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
        onScanComplete?.(data)
        setScanning(false)
      } else {
        setError(data.error || 'Failed to verify QR code')
      }
    } catch (error) {
      setError('An error occurred while verifying the QR code')
    } finally {
      setLoading(false)
    }
  }, [action, loading, onScanComplete])

  const handleError = (error: any) => {
    console.error('QR Scanner Error:', error)
    setError('Camera error. Please check permissions and try again.')
  }

  const startScanning = () => {
    setScanning(true)
    setResult(null)
    setError('')
  }

  const stopScanning = () => {
    setScanning(false)
  }

  const getActionText = () => {
    switch (action) {
      case 'check-in':
        return 'Check In'
      case 'check-out':
        return 'Check Out'
      default:
        return 'Verify'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100'
      case 'COMPLETED':
        return 'text-blue-600 bg-blue-100'
      case 'CANCELLED':
        return 'text-red-600 bg-red-100'
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-bold text-center mb-4">
          {getActionText()} QR Code Scanner
        </h2>

        {showInstructions && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
            <p className="text-sm">
              {action === 'check-in' && 'Scan the QR code from the user\'s booking confirmation to check them in.'}
              {action === 'check-out' && 'Scan the QR code to complete the check-out process.'}
              {action === 'verify' && 'Scan any booking or parking space QR code to verify its authenticity.'}
            </p>
          </div>
        )}

        {!scanning ? (
          <div className="text-center">
            <button
              onClick={startScanning}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-semibold"
            >
              Start Scanning
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <QrReader
                onResult={handleScan}
                onError={handleError}
                constraints={{
                  facingMode: 'environment',
                }}
                containerStyle={{
                  width: '100%',
                  height: '300px',
                  overflow: 'hidden',
                  borderRadius: '8px',
                }}
                videoContainerStyle={{
                  paddingTop: '100%',
                }}
                videoStyle={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {loading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p>Verifying...</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={stopScanning}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Stop Scanning
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            <p className="font-semibold mb-2">Verification Successful!</p>

            {result.booking && (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Booking:</span> {result.booking.id}
                </div>
                <div>
                  <span className="font-medium">User:</span> {result.booking.user?.name}
                </div>
                <div>
                  <span className="font-medium">Space:</span> {result.booking.parkingSpace?.title}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(result.booking.status)}`}>
                    {result.booking.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Time:</span>{' '}
                  {new Date(result.booking.startTime).toLocaleString()} -{' '}
                  {new Date(result.booking.endTime).toLocaleString()}
                </div>

                {result.canCheckIn && (
                  <div className="mt-2">
                    <span className="inline-block bg-green-600 text-white px-3 py-1 rounded text-sm">
                      ✓ Ready for Check-in
                    </span>
                  </div>
                )}

                {result.canCheckOut && (
                  <div className="mt-2">
                    <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded text-sm">
                      ✓ Ready for Check-out
                    </span>
                  </div>
                )}
              </div>
            )}

            {result.parkingSpace && (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Space:</span> {result.parkingSpace.title}
                </div>
                <div>
                  <span className="font-medium">Address:</span> {result.parkingSpace.address}
                </div>
                <div>
                  <span className="font-medium">Owner:</span> {result.parkingSpace.owner?.name}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}