import React, { useState, useEffect } from 'react'
import { MailIcon, PaperAirplaneIcon } from '@heroicons/react/outline'

interface EmailPanelProps {
  environment: string
}

export default function EmailPanel({ environment }: EmailPanelProps) {
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    fetchEmailSettings()
  }, [environment])

  const fetchEmailSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/control-center/email?environment=${environment}`)
      const data = await response.json()
      setSettings(data.data.configs || {})
    } catch (error) {
      console.error('Failed to fetch email settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }

    setSendingTest(true)
    try {
      const response = await fetch('/api/admin/integrations/test/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      })

      const result = await response.json()
      if (result.success) {
        alert('Test email sent successfully!')
      } else {
        alert(`Failed to send test email: ${result.error}`)
      }
    } catch (error) {
      alert('Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading email settings...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Email Configuration
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage SMTP settings and email delivery configuration.
              </p>
            </div>
            <MailIcon className="h-8 w-8 text-primary-500" />
          </div>

          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Default From Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={settings.defaultFromEmail?.value || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    defaultFromEmail: { ...prev.defaultFromEmail, value: e.target.value }
                  }))}
                />
              </div>
              <div>
                <label className="form-label">Support Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={settings.supportEmail?.value || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    supportEmail: { ...prev.supportEmail, value: e.target.value }
                  }))}
                />
              </div>
              <div>
                <label className="form-label">SMTP Host</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="form-label">SMTP Port</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="587"
                />
              </div>
              <div>
                <label className="form-label">SMTP Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="your-email@gmail.com"
                />
              </div>
              <div>
                <label className="form-label">SMTP Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableNotifications"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={settings.enablePushNotifications?.value || false}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  enablePushNotifications: { ...prev.enablePushNotifications, value: e.target.checked }
                }))}
              />
              <label htmlFor="enableNotifications" className="ml-2 text-sm text-gray-900">
                Enable push notifications
              </label>
            </div>

            <div>
              <label className="form-label">Notification Retry Limit</label>
              <select
                className="form-input"
                value={settings.notificationRetryLimit?.value || 3}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notificationRetryLimit: { ...prev.notificationRetryLimit, value: parseInt(e.target.value) }
                }))}
              >
                <option value={1}>1 attempt</option>
                <option value={3}>3 attempts</option>
                <option value={5}>5 attempts</option>
                <option value={10}>10 attempts</option>
              </select>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button className="btn-outline">Test Connection</button>
            <button className="btn-primary">Save Settings</button>
          </div>
        </div>
      </div>

      {/* Test Email */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Send Test Email
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Test your email configuration by sending a test email.
          </p>

          <div className="mt-6">
            <div className="flex space-x-3">
              <input
                type="email"
                className="form-input"
                placeholder="Enter test email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <button
                onClick={sendTestEmail}
                disabled={sendingTest || !testEmail}
                className="btn-primary disabled:opacity-50"
              >
                {sendingTest ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    Send Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}